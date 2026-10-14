#!/bin/sh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Auto-reparation : docker compose (lance directement) cree les sources de
# bind mounts manquantes en tant que repertoires vides appartenant a root ;
# un `ca.crt` repertoire est l'etat typique d'un clone frais qui a vu
# `docker compose up` avant `make up`. On le supprime et on regenere.
for f in ca.crt ca.key server.crt server.key server.csr server.ext ca.srl; do
	if [ -e "$f" ] && [ ! -f "$f" ]; then
		echo "gen.sh: '$f' invalide (repertoire cree par docker ?) : reparation."
		rm -rf "$f"
	fi
done

if [ -f ca.crt ] && [ -f server.crt ] && [ -f server.key ]; then
	echo "Certificats TLS deja presents, rien a faire."
	exit 0
fi

openssl req -x509 -newkey rsa:4096 -sha256 -days 825 -nodes \
	-keyout ca.key -out ca.crt \
	-subj "/CN=transcendence-internal-ca"

cat > server.ext <<'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:vault,DNS:localhost,IP:127.0.0.1
EOF

openssl req -newkey rsa:2048 -nodes \
	-keyout server.key -out server.csr \
	-subj "/CN=vault"

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
	-out server.crt -days 825 -sha256 -extfile server.ext

rm -rf server.csr server.ext ca.srl
# 640 requis : le conteneur vault tourne en uid=100(vault) gid=1000(vault)
# et doit lire la cle via le groupe (gid 1000 sur l'hote = groupe vault du conteneur).
chmod 600 ca.key
chmod 644 ca.crt server.crt
# Meilleur effort : chgrp 1000 (fonctionne si membre du groupe),
# complement assure par fix-perms.sh (portable, sans sudo).
chgrp 1000 server.key 2>/dev/null || true
chmod 640 server.key
echo "Certificats TLS generes dans $DIR"
