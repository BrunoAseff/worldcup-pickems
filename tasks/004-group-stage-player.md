# Task 004: Group Stage Player Experience

## Goal

Implement the player-facing group-stage screen for viewing standings and entering predictions.

## Scope

- group-stage route
- standings presentation
- round tabs and default round selection
- score input UX
- prediction persistence
- lock handling by match kickoff
- player header summary with points, position, and logout

## Requirements

- UI in Portuguese
- standings on the left
- round matches on the right
- default round is the latest round already started
- inputs allow only non-negative integers with at most 2 digits
- no layout shift while typing or after result feedback appears

## Persistence Rules

- save behavior should feel immediate
- short debounce is allowed and preferred
- validate on frontend and backend
- reject invalid payloads with treated messages

## Locking Rules

- each group-stage match locks exactly at kickoff
- display and comparison logic must use `America/Sao_Paulo`

## Deliverables

- player group-stage page
- standings UI
- round selector behavior
- prediction mutation path
- lock-state UI

## Acceptance Criteria

- users can predict editable matches only
- locked matches cannot be edited after kickoff
- invalid values never produce raw backend errors
- the default round logic matches the documented examples
- no interaction causes visible layout jumping

## Dependencies

- `002-data-import-and-normalization`
- `003-auth-and-session`
