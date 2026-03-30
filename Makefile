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
