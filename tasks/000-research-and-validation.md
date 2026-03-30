# Task 000: Research And Validation

## Goal

Validate the official tournament rules and data assumptions that later implementation tasks must not guess from memory.

## Scope

- research official FIFA 2026 group-stage tiebreak rules
- research official FIFA 2026 knockout qualification mapping
- research official knockout bracket progression rules
- confirm whether third-placed qualifiers follow a fixed mapping table
- inspect the project CSV for structural assumptions and mismatches

## Why This Task Exists

Several later features depend on official tournament rules that should not be implemented from memory:

- group standings and qualification
- knockout participant mapping
- bracket automation
- some schema decisions tied to bracket slots

This task reduces the chance of building the correct UI on top of incorrect tournament logic.

## Research Sources

Use authoritative sources whenever possible:

- FIFA official documentation
- official competition regulations
- official tournament format pages

For the CSV review, use the local project file:

- `copa_do_mundo_2026.csv`

## Required Outputs

Produce a short written validation note that confirms:

- official tiebreak order for group standings
- official rule for selecting knockout participants from groups
- official mapping logic for third-placed qualifiers if applicable
- whether any continent or federation restrictions apply in the first knockout round
- what parts of the local CSV are already reliable
- what parts of the local CSV still need normalization decisions

## Deliverables

- validated rule summary
- explicit list of implementation-safe assumptions
- explicit list of unresolved items, if any
- recommended schema implications for tasks `002`, `005`, and `006`
- documented result in `docs/RESEARCH-VALIDATION.md`

## Acceptance Criteria

- no official-rule-dependent logic remains based on memory alone
- later tasks can cite this task as the source of truth for tournament rules
- research findings clearly separate confirmed facts from local inference
- primary regulation source is linked explicitly when available

## Dependencies

- none
