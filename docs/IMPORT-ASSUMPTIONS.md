# Import Assumptions

## Source Files

- `data/copa_do_mundo_2026.csv`
- `data/matches.csv`
- `FWC26_Competition Regulations_EN.pdf`

## Current Normalization Decisions

- CSV stage labels in Portuguese are mapped to canonical English stage values.
- Official match numbers are derived from CSV row order and treated as `1` through `104`.
- `Playoff Europeu A-D` and `Playoff Intercontinental 1-2` are treated as placeholder teams.
- Bracket references such as `1º A`, `3º CEFHI`, `Venc. Oitavas 1` and `Perd. Semifinal 1` are not treated as teams.
- Knockout participant references are stored as source metadata on matches.
- Group-stage round number is derived from group match labels:
  - matches `1-2` are round `1`
  - matches `3-4` are round `2`
  - matches `5-6` are round `3`
- Kickoff strings like `16h` and `20h30` are parsed as `America/Sao_Paulo` and converted to UTC `timestamptz`.
- Venue identity is normalized from venue, city and host-country strings.

## Round Of 32 Best-Third Allocation

- The source of truth is `FWC26_Competition Regulations_EN.pdf`, Annexe C.
- The project dataset should be `data/round-of-32-best-third-place-allocations.json`.
- `data/matches.csv` is treated as helper input only.

## Team Normalization Scope

- Team normalization currently covers all 48 team-like entries found in `data/copa_do_mundo_2026.csv`.
- This includes real qualified teams and placeholder playoff entrants.
- Flag codes and federation values are included where useful for future UI and logic, but the bracket logic does not depend on them.
