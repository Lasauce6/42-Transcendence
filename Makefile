# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: rbaticle <rbaticle@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/06/02 14:23:54 by rbaticle          #+#    #+#              #
#    Updated: 2026/10/15 16:37:05 by rbaticle         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all: up

vault-prepare:
	@sh vault/tls/gen.sh
	@sh vault/fix-perms.sh

up: vault-prepare
	docker compose up --build -d 
	@sh vault/init.sh

down:
	docker compose down

debug: vault-prepare
	docker compose up --build -d
	@sh vault/init.sh
	docker compose logs -f
	@docker compose attach backend frontend nginx vault

logs:
	docker compose logs -f

waf-test:
	./nginx/scripts/test-waf.sh

clean:
	docker compose down -v

fclean:
	docker compose down -v --rmi all --remove-orphans
	rm -fr vault/keys vault/logs vault/tls/ca.crt vault/tls/ca.key vault/tls/server.crt vault/tls/server.key
	docker run --rm -v "$(shell pwd)/vault:/vw" alpine:3 sh -c 'rm -fr /vw/data'
	sed -i '/^VAULT_ROLE_ID=/d; /^VAULT_SECRET_ID=/d' .env # Delete approle env vars
	sed -e :a -e '/^\n*$$/{$$d;N;ba' -e '}' -i .env # Delete last .env blank lines

re: fclean
	@make up --no-print-directory

test: up waf-test
