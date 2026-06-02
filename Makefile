# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: rbaticle <rbaticle@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/06/02 14:23:54 by rbaticle          #+#    #+#              #
#    Updated: 2026/06/02 19:47:49 by rbaticle         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

all: up

up:
	docker compose up --build -d

down:
	docker compose down

debug:
	docker compose up --build

logs:
	docker compose logs -f

clean:
	docker compose down -v

fclean:
	docker compose down -v --rmi all --remove-orphans

re: fclean
	@make up --no-print-directory
