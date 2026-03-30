# Task 005: Group Stage Admin Results And Standings Logic

## Goal

Enable admin result entry for the group stage and derive official standings correctly.

## Scope

- admin group-stage result UI
- official result persistence
- standings calculation
- qualification calculation
- manual recalculation trigger entry point

## Rules Source

Use:

- `docs/RESEARCH-VALIDATION.md`
- `FWC26_Competition Regulations_EN.pdf`

Standings and best-third ranking must follow Article 13 exactly.

## Requirements

- admin UI is separate from player prediction UI
- admin enters real match results only
- group-stage results do not include penalties
- standings are derived exclusively from official results

## Deliverables

- admin result-entry flow
- standings calculation module
- qualification derivation module
- safe recalculation trigger foundation

## Acceptance Criteria

- entering official results updates derived standings after recalculation
- standings follow Article 13 rules, not assumptions
- qualification results are reproducible from persisted official results
- player predictions never affect official standings

## Dependencies

- `000-research-and-validation`
- `002-data-import-and-normalization`
- `003-auth-and-session`
- `004-group-stage-player`
