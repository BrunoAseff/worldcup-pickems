# Business Logic

## Roles

### Player

- can log in
- can submit and edit predictions within allowed windows
- can view standings, knockout bracket, and ranking
- can see personal position and total points outside the ranking page

### Admin

- can log in
- uses the same 3 product routes as players
- can enter official results
- can trigger recalculation
- does not use separate admin routes for prediction entry

## Domain Concepts

### Team

- canonical selection/country entity
- may temporarily exist as a placeholder until a real team is known

### Group

- World Cup group container
- used for standings and qualification

### Match

- official tournament match
- belongs to either group stage or knockout stage
- has schedule and status

### Prediction

- a player-submitted guess for an official match
- group-stage and knockout predictions follow different locking rules

### Official Result

- the true result entered by admin
- drives standings, progression, and points

## Group Stage Logic

- standings derive only from official results
- player predictions never affect official standings
- standings and qualification rules must follow Article 13 of `FWC26_Competition Regulations_EN.pdf`
- all derived standings must be reproducible from persisted official results

## Knockout Logic

- official knockout matches belong to the real tournament bracket
- round-of-32 allocation for the eight best third-placed teams must follow Annexe C of `FWC26_Competition Regulations_EN.pdf`
- player knockout predictions must support future-round guessing before official teams are fully known
- a knockout prediction stores:
  - predicted teams for that match from the player's own bracket path
  - predicted regular-time score
  - predicted advancing team when regular time is tied
- if regular time is not tied, advancing team is implied by score
- if regular time is tied, advancing team is mandatory

## Prediction Persistence Rules

### Group Stage

- prediction writes should feel immediate
- short debounce is allowed and preferred
- frontend validation prevents obvious invalid input
- backend validation is authoritative

### Knockout Stage

- players can fill all knockout predictions before knockout kickoff
- players are not forced to wait for official participants of future rounds
- frontend may limit what can be edited based on the player's own prior picks to keep bracket flow coherent

## Locking Rules

### Group Stage

- a prediction locks at kickoff
- if kickoff is `2026-06-12 16:00` in Sao Paulo time, editability ends at `15:59`

### Knockout Stage

- all knockout predictions lock when the first knockout match starts

## Result Entry Rules

- admin enters only official results
- group-stage official results never include penalties
- knockout official results may include advancing team on penalties

## Points Logic

Points are recalculated manually by admin after result entry.

### Group Stage Match Points

- correct winner or draw: `+5`
- exact score: `+10` and does not stack with winner/draw points

### Group Qualification Points

These are evaluated only after all matches in the group have official results.

- correct teams that qualify: `+15`
- exact full group order: `+30` and does not stack with qualification-only points

### Knockout Match Points

- round of 32 / 16-avos: winner `+10`, exact score `+20`
- round of 16 / oitavas: winner `+15`, exact score `+30`
- quarterfinals / quartas: winner `+20`, exact score `+40`
- semifinals: winner `+25`, exact score `+50`
- third-place match: winner `+25`, exact score `+50`
- final: winner `+50`, exact score `+100`

Exact score never stacks with winner points for the same match.

## Penalty Rules

- only regular-time score is predicted
- penalties are represented only by the advancing team
- if the official regular-time result is a draw, a player only scores if the predicted advancing team is also correct
- predicting `0 x 0` with the wrong advancing team scores zero

## Ranking Logic

- ranking order uses only total points
- ties remain ties
- medal assignment is presentation-only and based on displayed rank bucket, not on a forced tiebreak

## Rules Source

- [RESEARCH-VALIDATION.md](/home/bruno-aseff/Repos/dont-care/worldcup-pickems/docs/RESEARCH-VALIDATION.md)
- `FWC26_Competition Regulations_EN.pdf`
