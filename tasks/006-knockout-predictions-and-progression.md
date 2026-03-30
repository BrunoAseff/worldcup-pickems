# Task 006: Knockout Predictions And Progression

## Goal

Implement the knockout bracket for players and the official progression pipeline for admin-controlled results.

## Scope

- knockout bracket UI
- player full-bracket prediction flow
- penalty-advancer selection
- knockout lock behavior
- admin official knockout result entry
- official bracket progression

## Rules Source

Use:

- `docs/RESEARCH-VALIDATION.md`
- `FWC26_Competition Regulations_EN.pdf`

Round-of-32 allocation for the eight best third-placed teams must follow Annexe C explicitly.

## Player Prediction Rules

- player can predict the full knockout bracket before knockout kickoff
- knockout predictions are not entered phase by phase
- all knockout predictions lock when the first knockout match starts
- future-round predictions may use player-projected teams before official participants are fully known

## Frontend Behavior Rules

- bracket should remain coherent with the player's own earlier picks
- frontend may restrict editing when an earlier player prediction needed for the cascade is missing
- no layout shift when showing correctness feedback later

## Backend Modeling Rules

- knockout predictions stay linked to official matches
- predictions must also store player-projected teams for that match
- draw predictions require a predicted advancing team

## Deliverables

- knockout player route
- bracket UI with third-place match
- knockout prediction persistence
- admin knockout result entry
- official progression logic
- Annexe C-driven third-place allocation logic or lookup integration

## Acceptance Criteria

- a player can fill the full bracket before knockout kickoff
- knockout predictions become globally locked at first knockout kickoff
- official winners propagate deterministically through the real bracket
- penalty cases are scored using regular-time score plus advancing team
- round-of-32 third-place allocation is resolved from Annexe C data, not ad hoc branching

## Dependencies

- `000-research-and-validation`
- `003-auth-and-session`
- `004-group-stage-player`
- `005-group-stage-admin-and-standings`
