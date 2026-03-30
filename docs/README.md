# Documentation Index

Read these files in this order:

1. `docs/RESEARCH-VALIDATION.md`
2. `docs/PROJECT-SPEC.md`
3. `docs/BUSINESS-LOGIC.md`
4. `docs/DATA-MODEL.md`
5. `docs/UI-RULES.md`
6. `docs/IMPLEMENTATION-RULES.md`

## Purpose Of Each File

- `RESEARCH-VALIDATION.md`: official-rule validation and implementation-safe assumptions
- `PROJECT-SPEC.md`: product scope, hard rules, and high-level decisions
- `BUSINESS-LOGIC.md`: prediction, scoring, locking, and role behavior
- `DATA-MODEL.md`: intended schema direction and modeling constraints
- `UI-RULES.md`: layout, interaction, and feedback rules
- `IMPLEMENTATION-RULES.md`: engineering constraints and agent execution boundaries

## Primary Sources

- `FWC26_Competition Regulations_EN.pdf`: primary competition rules source kept locally and not versioned
- `data/copa_do_mundo_2026.csv`: local fixture/source data
- `data/matches.csv`: local helper mapping for round-of-32 third-place candidate slots

## Tasks

Execution roadmap lives in `tasks/`:

0. `000-research-and-validation.md`
1. `001-project-setup.md`
2. `002-data-import-and-normalization.md`
3. `003-auth-and-session.md`
4. `004-group-stage-player.md`
5. `005-group-stage-admin-and-standings.md`
6. `006-knockout-predictions-and-progression.md`
7. `007-ranking-and-scoring.md`

## Important Rule

If a task depends on official FIFA 2026 rules, the implementing agent must use `docs/RESEARCH-VALIDATION.md` and `FWC26_Competition Regulations_EN.pdf` as the default source of truth before coding the affected logic.
