.PHONY: install dev lint db-up db-down db-logs db-reset db-push db-studio fresh

install:
	pnpm install

dev:
	pnpm dev

lint:
	pnpm lint

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

db-logs:
	docker compose logs -f postgres

db-reset:
	docker compose down -v

db-push:
	pnpm db:push

db-studio:
	pnpm db:studio

fresh:
	docker compose down -v
	docker compose up -d postgres
	until docker compose exec -T postgres pg_isready -U postgres -d worldcup_pickems; do sleep 1; done
	pnpm db:migrate
	pnpm seed:teams
	pnpm seed:tournament
