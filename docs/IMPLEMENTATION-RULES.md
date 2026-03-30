# Implementation Rules

## Core Principles

- keep code small
- optimize for readability
- avoid speculative abstractions
- avoid duplication aggressively
- use libraries when they reduce risk or code volume

## Code Conventions

- UI copy in Portuguese
- code identifiers in English
- small components only
- move reusable constants, types, and helpers out of component bodies when appropriate
- keep folder names and schema names in English
- normalize data model names in English

## Error Handling

- never expose raw backend errors to the user
- all user-facing errors must be translated into intentional messages
- validation errors should be explicit and actionable

## Styling Conventions

- define global design tokens in `globals.css`
- add new colors there before using them broadly
- preserve spacing required to avoid layout shift

## Component Policy

- prefer shadcn/ui components
- choose components based on current shadcn docs, not memory
- if shadcn offers multiple similar components, pick the simplest one that fits

## Validation Policy

- frontend validation improves UX
- backend validation is mandatory and authoritative
- Zod should validate all mutation payloads

## Authentication Policy

- all backend routes are authenticated
- there are no public business routes
- use a simple session-based approach first
- persist sessions in the database
- use secure cookies
- if custom auth starts creating risk or friction, switching to a library is allowed

## Data and Seeding Policy

- imported tournament data must be normalized before persistence
- source CSV values are not final schema shape
- teams, groups, matches, and stage metadata should be separated cleanly
- every major table should include:
  - `id` as UUID v4
  - `created_at`
  - `updated_at`
- selection placeholders must support later replacement through a dedicated team seed

## Research Policy

- do not assume Next.js behavior from memory
- do not assume shadcn behavior from memory
- do not assume FIFA tournament rules from memory
- when uncertain, verify through official documentation before implementation
- for tournament logic, default first to `docs/RESEARCH-VALIDATION.md` and `FWC26_Competition Regulations_EN.pdf`

## Recalculation Policy

- recalculation should be explicit, manual, and deterministic
- no hidden background jobs are required for this project
- no attempt should be made to live-sync official real-world results

## Task Execution Policy For Agents

- each task should state dependencies and acceptance criteria
- agents should not broaden scope beyond the current task
- agents should not implement unresolved research-dependent rules from memory
- if a task conflicts with the regulation PDF, the regulation PDF wins
