# Task 001: Project Setup

## Goal

Prepare the project foundation so later tasks can focus on business features instead of environment work.

## Scope

- install and configure core dependencies
- configure Tailwind and shadcn/ui baseline
- configure Drizzle
- prepare environment variable strategy
- add local development database workflow
- add consistent project scripts
- replace default starter README if useful

## Requirements

- use pnpm
- production database is Neon Postgres
- local development should support a local Postgres workflow
- deployment target is Vercel

## Notes

- if Docker is used for local Postgres, keep it development-only
- keep setup minimal
- do not add unnecessary infrastructure
- consult current Next.js docs in `node_modules/next/dist/docs/` before touching app-level behavior

## Deliverables

- dependency setup complete
- shadcn initialized
- Drizzle configured
- environment example documented
- local run commands documented
- add `Makefile`

## Acceptance Criteria

- project installs cleanly with pnpm
- app boots locally
- database connection path is defined for local and production
- no unresolved setup placeholders remain for later feature tasks

## Dependencies

- none
