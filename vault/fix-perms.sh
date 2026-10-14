#!/bin/sh
# Rend le contenu de vault/ utilisable par le conteneur vault (uid 100,
# dossiers crees par docker en root lors d'un `docker compose up` direct).
set -eu
cd "$(dirname "$0")/.."

mkdir -p vault/data vault/logs

need_helper=0
# Dossiers crees par docker (root)
for d in vault/data vault/logs; do
	[ -w "$d" ] || need_helper=1
done
# Le conteneur lit la cle via son groupe (gid 1000) ; chgrp echoue si on
# n'est pas membre du groupe 1000 -> conteneur root jetable.
chgrp 1000 vault/tls/server.key 2>/dev/null || need_helper=1

if [ "$need_helper" -eq 1 ]; then
	echo "fix-perms: ajustement des permissions via conteneur jetable..."
	if docker run --rm \
		-v "$PWD/vault:/vw" \
		-e HOST_UID="$(id -u)" \
		alpine:3 \
		sh -c 'chown "$HOST_UID":1000 /vw/data /vw/logs 2>/dev/null || true
			chgrp 1000 /vw/data /vw/logs /vw/tls/server.key 2>/dev/null || true' \
		2>/dev/null
	then
		:
	else
		# Dernier recours (docker indisponible) : bits "other".
		# Dev : secrets locaux jetables uniquement.
		echo "fix-perms: docker indisponible, passage en permissions larges (777/644)" >&2
		chmod 777 vault/data vault/logs
		chmod 644 vault/tls/server.key
		exit 0
	fi
fi

chmod 770 vault/data vault/logs
chmod 640 vault/tls/server.key
