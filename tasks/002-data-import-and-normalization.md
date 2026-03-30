# Task 002: Data Import And Normalization

## Goal

Transform `copa_do_mundo_2026.csv` into a normalized database model with rerunnable seeds.

## Scope

- inspect and normalize CSV data
- define schema for teams, groups, matches, and related metadata
- create seeders
- extract the official round-of-32 best-third allocation matrix into a project dataset
- support placeholders for still-unknown teams
- ensure team seed can be rerun independently later

## Requirements

- all schema names in English
- persist timestamps as `timestamptz`
- parse source fixture times as `America/Sao_Paulo`
- save canonical values in UTC
- major tables must include `id`, `created_at`, and `updated_at`
- model round-of-32 third-place allocation so it can be driven by official allocation data extracted from Annexe C

## Important Constraints

- do not treat CSV columns as final schema
- normalize names and stage structure
- support future replacement of placeholder teams without breaking relations
- keep the seeding pipeline deterministic
- do not invent procedural logic for third-place allocation when the official allocation matrix can be represented as data
- prefer a versioned project dataset with a descriptive name over a vague `annex-c` artifact name
- do not store that dataset in the database by default unless it clearly simplifies the implementation

## Research Work

- inspect CSV inconsistencies and document them
- identify which parts of the tournament structure are safe to model immediately
- use `docs/RESEARCH-VALIDATION.md` and `FWC26_Competition Regulations_EN.pdf` as the rule source

## Deliverables

- Drizzle schema for import-related tables
- seeds for teams and tournament structure
- extracted project dataset for the round-of-32 best-third allocation matrix
- data loading strategy for that allocation matrix
- documented import assumptions
- rerunnable team seed strategy

## Acceptance Criteria

- a clean database can be seeded from CSV
- placeholder teams can later be replaced through the team seed only
- imported matches have normalized stage and scheduling fields
- third-place allocation is representable from official allocation data extracted from Annexe C
- the extracted allocation dataset has a descriptive project-facing name and is understandable without opening the regulation PDF

## Dependencies

- `000-research-and-validation`
- `001-project-setup`
