#!/bin/bash
# test_audit_logs.sh — Teste tous les audit logs (#58)

API="http://localhost"

# ============================================
# 1. SETUP — Données de test
# ============================================
echo "=========================================="
echo "1. SETUP — Données de test"
echo "=========================================="

docker compose exec -T backend python manage.py shell <<'PYEOF'
from django.contrib.auth import get_user_model
from chat.models import Channel, ChannelBan, ChannelMember, Message

User = get_user_model()

# Créer/récupérer les users
for username, email, pwd, role, staff, superuser in [
    ('admin', 'admin@test.com', 'Admin123!', 'ADMIN', True, True),
    ('alice', 'alice@test.com', 'pass1234', 'USER', False, False),
    ('bob', 'bob@test.com', 'pass1234', 'USER', False, False),
]:
    u, _ = User.objects.get_or_create(username=username, defaults={'email': email})
    u.set_password(pwd)
    u.role = role
    u.is_staff = staff
    u.is_superuser = superuser
    u.save()

alice = User.objects.get(username='alice')
admin = User.objects.get(username='admin')
bob = User.objects.get(username='bob')

# Channel
channel, _ = Channel.objects.get_or_create(
    name='general',
    defaults={'type': Channel.ChannelType.PUBLIC, 'created_by': alice}
)

# Nettoyer les anciens bans pour repartir propre
ChannelBan.objects.filter(channel=channel).delete()

# Ajouter les membres
for user in [alice, admin, bob]:
    ChannelMember.objects.get_or_create(channel=channel, user=user)

# Créer un message
message = Message.objects.create(
    channel=channel,
    sender=alice,
    content='Message de test pour audit',
)

print(f"CHANNEL_ID={channel.id}")
print(f"MESSAGE_ID={message.id}")
print(f"BOB_ID={bob.id}")
PYEOF

# Récupérer les IDs
CHANNEL_ID=$(docker compose exec -T backend python manage.py shell -c "from chat.models import Channel; print(Channel.objects.get(name='general').id)" 2>/dev/null | tail -1)
MESSAGE_ID=$(docker compose exec -T backend python manage.py shell -c "from chat.models import Message; print(Message.objects.filter(channel__name='general').last().id)" 2>/dev/null | tail -1)
BOB_ID=$(docker compose exec -T backend python manage.py shell -c "from django.contrib.auth import get_user_model; print(get_user_model().objects.get(username='bob').id)" 2>/dev/null | tail -1)

echo ""
echo "Channel : $CHANNEL_ID"
echo "Message : $MESSAGE_ID"
echo "Bob     : $BOB_ID"

# ============================================
# 2. TOKENS
# ============================================
echo ""
echo "=========================================="
echo "2. Tokens"
echo "=========================================="

TOKEN_ADMIN=$(curl -s -X POST $API/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access'])")

TOKEN_ALICE=$(curl -s -X POST $API/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass1234"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access'])")

echo "Token admin : ${TOKEN_ADMIN:0:30}..."
echo "Token alice : ${TOKEN_ALICE:0:30}..."

# ============================================
# 3. ACTIONS
# ============================================
echo ""
echo "=========================================="
echo "3. Déclenchement des actions"
echo "=========================================="

echo "→ 1. USER_PROMOTE"
curl -s -X POST $API/api/users/$BOB_ID/promote/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"role":"MODERATOR"}' > /dev/null

echo "→ 2. USER_DEMOTE"
curl -s -X POST $API/api/users/$BOB_ID/demote/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" > /dev/null

echo "→ 3. CHANNEL_BAN"
curl -s -X POST $API/api/channels/$CHANNEL_ID/ban-member/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$BOB_ID\",\"reason\":\"test_audit\"}" > /dev/null

echo "→ 4. CHANNEL_UNBAN"
curl -s -X POST $API/api/channels/$CHANNEL_ID/unban-member/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$BOB_ID\"}" > /dev/null

echo "→ 5. CHANNEL_KICK"
curl -s -X POST $API/api/channels/$CHANNEL_ID/add-member/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$BOB_ID\"}" > /dev/null
curl -s -X POST $API/api/channels/$CHANNEL_ID/remove-member/ \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$BOB_ID\"}" > /dev/null

echo "→ 6. MESSAGE_DELETE"
curl -s -X DELETE $API/api/channels/$CHANNEL_ID/messages/$MESSAGE_ID/ \
  -H "Authorization: Bearer $TOKEN_ALICE" > /dev/null

echo "→ 7. PASSWORD_CHANGE"
curl -s -X POST $API/api/users/change_password/ \
  -H "Authorization: Bearer $TOKEN_ALICE" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"pass1234","new_password":"NouveauMdp123!"}' > /dev/null

# Remettre le mdp d'origine
docker compose exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
u = get_user_model().objects.get(username='alice')
u.set_password('pass1234')
u.save()
" > /dev/null

echo "→ 8. LOGOUT"
curl -s -X POST $API/api/logout/ \
  -H "Authorization: Bearer $TOKEN_ALICE" > /dev/null

echo "→ 9. AVATAR_UPLOAD"
# Token frais
TOKEN_ALICE=$(curl -s -X POST $API/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass1234"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access'])")

# Créer une image
python3 -c "
from PIL import Image
Image.new('RGB', (50, 50), 'red').save('/tmp/audit_test.jpg')
" 2>/dev/null

if [ -f /tmp/audit_test.jpg ]; then
  curl -s -X POST $API/api/upload/avatar/ \
    -H "Authorization: Bearer $TOKEN_ALICE" \
    -F "avatar=@/tmp/audit_test.jpg" > /dev/null
  echo "   ✓ avatar uploadé"
else
  echo "   ⚠ PIL non installé, avatar skipped"
fi

# ============================================
# 4. RÉSULTAT
# ============================================
echo ""
echo "=========================================="
echo "4. RÉSULTAT — logs/audit.log"
echo "=========================================="
docker compose exec -T backend cat logs/audit.log

echo ""
echo "=========================================="
echo "5. RÉSUMÉ PAR ACTION"
echo "=========================================="
docker compose exec -T backend sh -c "cat logs/audit.log | grep -oP 'action=[A-Z_]+' | sort | uniq -c"