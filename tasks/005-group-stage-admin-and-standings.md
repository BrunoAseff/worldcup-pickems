# Task 005: Group Stage Admin Results And Standings Logic

## Goal

Enable admin result entry for the group stage and derive official standings correctly.

## Scope

- admin result-entry mode inside the shared group-stage route
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

- admin uses the same group-stage route as players
- admin content inside that route is different from the player prediction content
- admin enters real match results only
- group-stage results do not include penalties
- standings are derived exclusively from official results

## Deliverables

- admin result-entry flow inside the shared group-stage screen
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
