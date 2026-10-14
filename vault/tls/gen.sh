#!/bin/sh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

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

rm -f server.csr server.ext ca.srl
# 640 requis : le conteneur vault tourne en uid=100(vault) gid=1000(vault)
# et doit lire la cle via le groupe (gid 1000 sur l'hote = groupe vault du conteneur).
chmod 600 ca.key
chmod 640 server.key
echo "Certificats TLS generes dans $DIR"
