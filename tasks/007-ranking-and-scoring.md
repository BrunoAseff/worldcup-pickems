# Task 007: Ranking And Scoring

## Goal

Implement the scoring engine, manual recalculation pipeline, ranking page, and result-feedback UI.

## Scope

- scoring rules for group stage and knockout
- manual recalculation action for admin
- persistent score snapshots or equivalent simplified read model
- ranking page
- match-level correctness feedback for players
- post-final confetti

## Scoring Rules

Use the documented point system from `docs/BUSINESS-LOGIC.md`.

Important constraints:

- exact score does not stack with winner points
- exact full group order does not stack with qualification-only points
- tied users remain tied

## Requirements

- player screens must clearly show match outcome correctness and earned points
- standings prediction feedback must be intuitive
- ranking page must explain the scoring rules in Portuguese
- ranking medals are Ouro, Prata, Bronze, and Césio-137

## Recalculation Scope

The admin-triggered pipeline must deterministically recalculate:

- standings
- qualifiers
- knockout participants
- knockout progression
- user points
- ranking output

## Deliverables

- scoring engine
- admin recalculation action
- ranking page
- feedback UI for players
- confetti behavior after final official result

## Acceptance Criteria

- recalculation produces stable results from persisted data only
- ranking order reflects total points only
- tied users display as tied
- player feedback clearly distinguishes exact score, correct winner, and wrong prediction cases
- confetti appears only for players on ranking after the final official result exists

## Dependencies

- `005-group-stage-admin-and-standings`
- `006-knockout-predictions-and-progression`
