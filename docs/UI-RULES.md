# UI Rules

## General Direction

- light mode only
- visual tone inspired by Duolingo simplicity, but not a clone
- modern and clean
- primary color centered on green
- no gradients on buttons or page backgrounds
- no long or distracting animations

## Navigation

- use a small floating top navigation
- do not use a sidebar
- routes should prioritize:
  - fase de grupos
  - mata-mata
  - ranking

## Global Player Header Info

For player views except ranking:

- show current total points in the top-right area
- show current ranking position near it
- show logout as icon-only action nearby

## Language

- all UI copy in Portuguese
- labels, validation messages, helper text, empty states, and admin screens must also stay in Portuguese

## Group Stage Screen

- standings on the left
- round matches on the right
- current round tab should default to the latest round already started
- match prediction UI must not cause layout shift while typing or after result evaluation

### Score Inputs

- always reserve space for borders, validation states, and result feedback
- inputs must allow only positive integer characters and at most 2 digits
- changing values should not move surrounding content

## Result Feedback UI

When official results exist, player screens should make these states intuitive:

- whether the winner/draw was correct
- whether the exact score was correct
- how many points were earned for that match
- whether the group qualification/order prediction was correct

Possible UI patterns are acceptable if they remain subtle and consistent:

- green/red borders
- strikethrough on wrong prediction
- bold/highlight on correct prediction
- compact point chips
- row color coding for standings evaluation

Reserve all visual space ahead of time to avoid layout shift.

## Knockout Screen

- use a proper cascade/bracket layout
- bracket connections must be visually explicit
- include third-place match
- keep the layout readable on desktop and mobile

The bracket should support:

- showing official teams when known
- showing player-projected teams for future rounds
- selecting an advancing team on penalties when regular-time score is tied

## Ranking Screen

- use card-based ranking presentation
- first place should be visually larger than second
- second larger than third
- third larger than fourth
- size differences should be subtle, not exaggerated
- include a simple explanation of the scoring system below the ranking

## Confetti

- only on ranking
- only for players
- only after final official result exists

## Design References

Reference assets are inspiration, not reproduction targets:

- `references/globo_group_stage.png`
- `references/knockout_stage.webp`
- `references/knockout_stage_2.webp`
- `references/lol_worlds_knockout.png`
