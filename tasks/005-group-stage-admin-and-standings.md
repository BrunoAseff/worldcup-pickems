# Task 005: Group Stage Admin Results And Standings Logic

## Goal

Enable admin result entry for the group stage and derive official standings correctly.

## Scope

- admin result-entry mode inside the shared group-stage route
- official result persistence
- standings calculation
- group-stage qualification status inside each group
- manual recalculation trigger entry point and persisted standings foundation

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
- persisted group standings snapshot after manual recalculation
- safe recalculation trigger foundation

## Acceptance Criteria

- entering official results updates derived standings after recalculation
- standings follow Article 13 rules, not assumptions
- group standings are reproducible from persisted official results
- player predictions never affect official standings

## Notes

- exact ranking of the 12 third-placed teams and selection of the best 8 is completed in the knockout-stage pipeline task
- round-of-32 allocation from Annexe C belongs to Task `006`

## Dependencies

- `000-research-and-validation`
- `002-data-import-and-normalization`
- `003-auth-and-session`
- `004-group-stage-player`
