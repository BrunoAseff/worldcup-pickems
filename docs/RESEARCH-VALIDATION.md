# Research Validation

Date: 2026-03-30

## Goal

Validate official FIFA 2026 tournament rules and local CSV assumptions before implementation of rule-dependent logic.

Primary regulation source used in this update:

- `FWC26_Competition Regulations_EN.pdf` in the project root

## Confirmed Facts

### Tournament Format

Confirmed by FIFA:

- the tournament has 48 teams
- there are 12 groups of 4 teams
- the top 2 teams from each group advance
- the 8 best third-placed teams also advance
- the knockout phase starts in a round of 32
- the tournament has 104 matches total

Source links:

- https://inside.fifa.com/organisation/fifa-council/media-releases/fifa-council-approves-international-match-calendars
- https://www.fifa.com/en/articles/article-fifa-world-cup-2026-mexico-canada-usa-new-format-tournament-football-soccer
- local primary source: `FWC26_Competition Regulations_EN.pdf`

### Group Draw Confederation Constraints

Confirmed by FIFA final draw procedures:

- in principle, no group may contain more than one team from the same confederation
- UEFA is the exception because it has more teams
- each group must have at least 1 and no more than 2 UEFA teams

This is a group-draw rule, not a knockout rule.

Source link:

- https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/procedures-pots-final-draw

### Round-Of-32 Pairing Structure Is Fixed

Confirmed in the official regulations and also reflected by official FIFA hospitality listings.

The regulations state that:

- Annexe C includes the 495 different possible combinations of the eight best-ranked third-placed teams
- those combinations determine their next match-up for the round of 32 at the end of the group stage

Official FIFA hospitality listings also show fixed slot patterns, for example:

- `2A vs 2B`
- `1E vs 3ABCDF`
- `1A vs 3CEFHI`
- `1B vs 3EFGIJ`

This confirms that the third-placed-team paths are not random manual draws after the group stage. They map into fixed bracket slots.

Source links:

- https://fifaworldcup26.suites.fifa.com/games/
- https://fifaworldcup26.suites.fifa.com/events/M74-1E-vs-3ABCDF-111688/
- local primary source: `FWC26_Competition Regulations_EN.pdf`

## Confirmed Official Ranking Rules

### Group Ranking Tie-Breakers

Confirmed in Article 13 of the regulations.

If teams in the same group are level on points after the group stage:

Step 1:

- points in matches between the teams concerned
- goal difference in matches between the teams concerned
- goals scored in matches between the teams concerned

Step 2:

- if teams are still tied, apply step 1 again only to the remaining tied teams
- if still unresolved, apply:
  - superior goal difference in all group matches
  - greatest number of goals scored in all group matches
  - highest team conduct score

Team conduct score deductions:

- yellow card: `-1`
- indirect red card: `-3`
- direct red card: `-4`
- yellow card and direct red card: `-5`

Step 3:

- most recent FIFA/Coca-Cola Men's World Ranking
- then immediately preceding published editions until a decision is possible

### Best Third-Placed Teams Ranking

Also confirmed in Article 13.

The eight best third-placed teams are ranked by:

- greatest number of points in all group matches
- goal difference in all group matches
- greatest number of goals scored in all group matches
- highest team conduct score
- most recent FIFA/Coca-Cola Men's World Ranking
- then immediately preceding published editions until a decision is possible

## Strong Inference From Official Sources

### No First-Knockout-Round Confederation Restriction

I did not find any official FIFA source stating that round-of-32 pairings are adjusted by continent or federation restrictions.

Given that:

- FIFA explicitly documents confederation restrictions for the group draw
- FIFA also exposes fixed round-of-32 slot mappings in official schedule and hospitality material

the safest current reading is:

- there is no extra continent/federation restriction in the first knockout round
- the round-of-32 bracket is driven by fixed position mappings only

This is an inference from official sources, not a directly quoted FIFA regulation sentence.

## Confirmed Annex C Requirement

The regulations explicitly confirm that Annexe C contains:

- all 495 possible combinations of the eight best-ranked third-placed teams
- their corresponding round-of-32 match-ups

This means the correct implementation approach is:

- do not invent pairing logic procedurally from scratch
- model the official mapping as a lookup table derived from Annexe C
- use the ranked set of eight third-placed teams to resolve the correct option row

## CSV Review

File reviewed:

- `copa_do_mundo_2026.csv`
- `matches.csv`
- `FWC26_Competition Regulations_EN.pdf`

### Reliable Structure

These parts look structurally reliable:

- 104 rows total
- stage counts match the expected tournament structure:
  - 72 group-stage matches
  - 16 round-of-32 matches
  - 8 round-of-16 matches
  - 4 quarter-finals
  - 2 semi-finals
  - 1 third-place match
  - 1 final
- 12 groups from `A` to `L`
- 6 group-stage matches per group
- placeholder team rows already encode important tournament slots such as:
  - `Playoff Europeu A-D`
  - `Playoff Intercontinental 1-2`
  - `1º A`, `2º B`, `3º CEFHI`
  - `Venc. Oitavas 1`, `Perd. Semifinal 2`
- `matches.csv` confirms which round-of-32 slots are reserved for group winners that will face one of several possible third-placed teams

### Normalization Still Required

These parts still need normalization decisions:

- stage names are in Portuguese and should become canonical English enums in the database
- match labels such as `Grupo A - Jogo 1` and `Segunda fase 3` should not be the only identifier for bracket logic
- team names are in Portuguese and need canonical English-code-friendly storage
- placeholder names need stable internal keys, not raw display strings
- stadium names are inconsistent in accents and spelling, for example `Estádio` vs `Estadio`
- kickoff values use strings like `16h` and `20h30` and need proper parsing
- city and venue names should be stored separately from display labels if future formatting matters

### Important Modeling Implication

The CSV mixes three different concepts in team columns:

- real teams
- qualification placeholders
- bracket references

Those should not all be stored as the same kind of raw team record.

Recommended separation:

- canonical `teams`
- bracket slot reference metadata on `matches`
- optional placeholder teams only where a future real team truly replaces the placeholder identity

### What `matches.csv` Adds

`matches.csv` is useful because it makes 8 specific round-of-32 winner slots explicit:

- Match 74: `1º Grupo E` vs a third-placed qualifier from `A/B/C/D/F`
- Match 77: `1º Grupo I` vs a third-placed qualifier from `C/D/F/G/H`
- Match 79: `1º Grupo A` vs a third-placed qualifier from `C/E/F/H/I`
- Match 80: `1º Grupo L` vs a third-placed qualifier from `E/H/I/J/K`
- Match 81: `1º Grupo D` vs a third-placed qualifier from `B/E/F/I/J`
- Match 82: `1º Grupo G` vs a third-placed qualifier from `A/E/H/I/J`
- Match 85: `1º Grupo B` vs a third-placed qualifier from `E/F/G/I/J`
- Match 87: `1º Grupo K` vs a third-placed qualifier from `D/E/I/J/L`

This is valuable seed input for bracket-slot metadata.

However, this file still does not encode the full Annex C allocation table.
The PDF regulations do encode that table formally, so `matches.csv` should be treated as helpful reference data, not the source of truth for the full mapping.

## Safe Assumptions For Implementation

These are safe to implement now:

- tournament shape is 12 groups of 4, then round of 32
- knockout pairing slots are fixed, not manually drawn after the groups
- group-stage tie-breakers can be implemented from Article 13
- best-third-team ranking can be implemented from Article 13
- Annex C should be modeled as a lookup table for the 495 combinations
- no extra knockout continent restriction should be assumed
- timestamps should be parsed from Brazil time and persisted as UTC `timestamptz`
- the CSV requires normalization before seeding

## Recommended Schema Implications

### For Task 002

- store canonical stages and rounds as enums or controlled values
- add explicit bracket-slot metadata to knockout matches
- do not depend on raw CSV strings to derive progression later
- support placeholder identities cleanly

### For Task 005

- implement standings calculation in an isolated module
- implement Article 13 exactly
- isolate comparison logic for readability and testability

### For Task 006

- model knockout matches as fixed bracket nodes
- allow player predictions to attach projected teams to those fixed nodes
- map third-placed qualifiers into official slots through an explicit Annex C lookup table
