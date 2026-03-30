# World Cup Pick'ems

Bolão privado da Copa do Mundo 2026 feito com Next.js, shadcn/ui e Drizzle.

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- shadcn/ui
- Drizzle ORM
- Postgres 17
- Zod
- pnpm

## Requisitos

- Node.js 20+
- pnpm 10+
- Docker

## Setup

1. Instale as dependências:

```bash
pnpm install
```

2. Crie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

Os comandos do Drizzle CLI leem `.env.local` primeiro e depois `.env`.

3. Suba o banco local:

```bash
make db-up
```

4. Rode a aplicação:

```bash
pnpm dev
```

## Banco local

O ambiente local usa Postgres 17 via Docker com esta URL padrão:

```bash
postgres://postgres:postgres@localhost:5432/worldcup_pickems
```

Para produção, a Vercel deve fornecer `DATABASE_URL` apontando para o Neon.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

Se `pnpm db:studio` falhar, os dois problemas mais comuns sao:
- `DATABASE_URL` ausente: confirme que `.env.local` existe.
- banco local desligado: rode `make db-up`.

## Makefile

```bash
make install
make dev
make lint
make db-up
make db-down
make db-logs
make db-reset
make db-push
make db-studio
```

## Documentação

Leia nesta ordem:

1. `docs/RESEARCH-VALIDATION.md`
2. `docs/PROJECT-SPEC.md`
3. `docs/BUSINESS-LOGIC.md`
4. `docs/DATA-MODEL.md`
5. `docs/IMPORT-ASSUMPTIONS.md`
6. `docs/UI-RULES.md`
7. `docs/IMPLEMENTATION-RULES.md`

## Dados locais

- `data/copa_do_mundo_2026.csv`
- `data/matches.csv`
- `FWC26_Competition Regulations_EN.pdf` e `references/` ficam locais e não devem ser versionados
