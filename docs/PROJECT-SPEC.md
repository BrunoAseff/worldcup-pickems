# World Cup Pick'ems 2026

## Goal

Build a small private World Cup 2026 pick'em app for one family with 4 players.

The product must prioritize:

- simplicity over extensibility
- clear UX over feature density
- deterministic business logic
- small components and low code volume

## Product Scope

The app has 3 main user-facing areas:

- group stage
- knockout stage
- ranking

There are 2 user roles:

- `player`: submits predictions and sees ranking
- `admin`: enters official match results and triggers recalculation

There is no public signup, password reset, or account recovery flow. Users are inserted manually in the database.

## Technical Direction

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Drizzle ORM
- Zod
- Neon Postgres 17
- Vercel
- Flagpack

## Global Product Rules

- UI text must always be in Portuguese.
- Source code must always be in English.
- Use shadcn/ui components whenever applicable.
- Prefer existing libraries over custom reinvention.
- Error messages shown to users must be treated and human-readable.
- Never expose raw backend errors in the UI.
- Keep implementation intentionally small and understandable.
- Avoid repetition aggressively.
- Do not build speculative features.

## Time Rules

- Source fixture dates come from CSV in Brazil time.
- Persist match timestamps as `timestamptz` in UTC.
- Parse imported schedule values as `America/Sao_Paulo`.
- Display all dates and locking behavior in `America/Sao_Paulo`.

## Prediction Locking Rules

### Group Stage

- A group-stage prediction can be edited until the minute before kickoff.
- Example: if kickoff is `16:00`, the prediction is editable until `15:59`.
- Once kickoff is reached, that match prediction is locked.

### Knockout Stage

- The knockout route is visible before the knockout stage starts.
- A player can fill the full knockout bracket before the first knockout match starts.
- Once the first knockout match starts, all knockout predictions become locked at once.

## Group Stage Rules

- The initial route is the group-stage screen.
- Players see standings and round match cards side by side.
- Standings must include at least:
  - position
  - team
  - points
  - matches played
  - wins
  - draws
  - losses
  - goals for
  - goals against
  - goal difference
  - recent form
- The default visible round for a group is the latest round already started.
- Predictions are score inputs.
- Inputs accept only non-negative integers with at most 2 digits.
- Prediction persistence should feel immediate while still being technically safe.
- Validation must exist in both frontend and backend.

## Knockout Stage Rules

- Knockout UI must use a bracket/cascade layout.
- Third-place match must exist.
- Players predict the full bracket in one pass, from round of 32/16-avos through final.
- Knockout predictions are not meant to be entered phase by phase.
- This is intentional because later rounds are worth more points and should reward long-range accuracy.
- Knockout predictions may need to reference player-projected teams before official teams are fully resolved.
- For knockout matches decided after a draw in regular time, the player must also choose who advances on penalties.
- Penalty score is never predicted, only the advancing team.

## Visibility and Editability Rules

- Group-stage matches are editable if the individual match has not started.
- Knockout matches are editable only before the first knockout match starts.
- In the knockout UI, editability can additionally depend on the player's own prediction cascade in the frontend.
- Backend must still support storing full-bracket predictions tied to knockout matches.

## Admin Rules

- Admin routes are separate from player routes.
- Admin does not place predictions through admin result routes.
- Admin enters official match results.
- Admin triggers a deterministic recalculation pipeline manually.

## Recalculation Pipeline

The recalculation action must be deterministic and cover all dependent state:

- group standings
- qualified teams
- knockout participants
- knockout progression derived from official results
- player points
- ranking positions

The tournament logic used by this pipeline must follow:

- Article 13 of `FWC26_Competition Regulations_EN.pdf` for group ranking and best third-placed team ranking
- Annexe C of `FWC26_Competition Regulations_EN.pdf` for round-of-32 allocation of the eight best third-placed teams

## Ranking Rules

- Ranking is ordered only by total points.
- If players tie on points, they remain tied. There is no tiebreaker.
- Ranking medals are:
  - 1st: Ouro
  - 2nd: Prata
  - 3rd: Bronze
  - 4th: Césio-137
- The ranking page must explain the scoring system in simple Portuguese.
- After the final result is entered, the ranking page should show confetti for players only.

## Rules Source

Official tournament-rule implementation must follow:

- [RESEARCH-VALIDATION.md](/home/bruno-aseff/Repos/dont-care/worldcup-pickems/docs/RESEARCH-VALIDATION.md)
- `FWC26_Competition Regulations_EN.pdf`

No agent should implement tournament rules from memory when those documents already define them.
