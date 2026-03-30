# Data Model Direction

This file does not lock the exact schema yet. It defines the intended shape and constraints so implementation tasks stay aligned.

## General Rules

- use English table and column names
- use UUID primary keys
- use `created_at` and `updated_at` on major tables
- store timestamps as `timestamptz`
- persist in UTC
- interpret imported fixture times as `America/Sao_Paulo`

## Likely Core Tables

### users

- `id`
- `username`
- `password_hash`
- `full_name`
- `role` as enum: `player | admin`
- timestamps

### sessions

- `id`
- `user_id`
- `token_hash` or equivalent session secret representation
- `expires_at`
- timestamps

### teams

- `id`
- `code`
- `name_en`
- `name_pt`
- `flag_code`
- `federation` or equivalent if needed by official rules
- `is_placeholder`
- timestamps

### groups

- `id`
- `code`
- timestamps

### group_teams

- `id`
- `group_id`
- `team_id`
- timestamps

This join table is important because placeholder teams may later be reseeded and synced.

### matches

- `id`
- `stage`
- `round`
- `group_id` nullable
- `home_team_id` nullable
- `away_team_id` nullable
- `scheduled_at`
- `venue_name`
- `source_label`
- `bracket_code` or equivalent stable match identifier where needed
- metadata for bracket slot mapping where needed
- timestamps

### round_of_32_best_third_place_allocations

- `id`
- `option_code`
- `group_winner_slot`
- `assigned_third_place_group_code`
- timestamps

This table or equivalent static dataset should represent the official round-of-32 allocation matrix for the eight best third-placed teams.

Preferred approach:

- extract the matrix from Annexe C into a versioned project dataset with a descriptive name such as `round-of-32-best-third-place-allocations`
- use that dataset as the source of truth in code
- only persist it in the database if that materially simplifies recalculation or querying

Default recommendation:

- keep it as project data first
- avoid storing it in the database unless implementation proves it useful

### official_results

- `id`
- `match_id`
- `home_score`
- `away_score`
- `advancing_team_id` nullable for group stage
- `entered_by_user_id`
- timestamps

### match_predictions

- `id`
- `user_id`
- `match_id`
- `predicted_home_team_id` nullable in group stage if redundant
- `predicted_away_team_id` nullable in group stage if redundant
- `predicted_home_score`
- `predicted_away_score`
- `predicted_advancing_team_id` nullable unless draw in knockout
- timestamps

For knockout predictions, predicted team fields are important because the player may forecast future participants before the official match participants are final.

### user_score_snapshots

- `id`
- `user_id`
- `total_points`
- optional breakdown columns if useful
- `calculated_at`

This can be materialized by the admin recalculation pipeline for simple ranking reads.

## Derived Data

These may stay computed instead of fully persisted unless implementation proves otherwise:

- group standings
- recent form markers
- ranking positions
- match-by-match scoring breakdown

## Seeder Expectations

- one seed path for teams
- one seed path for tournament structure and matches
- one seed path or static import path for the round-of-32 best-third allocation dataset
- team seed must be rerunnable independently
- updating placeholder teams must not break existing relations

## Regulation-Driven Schema Areas

These parts should follow the regulation source directly:

- Article 13 ranking logic inputs
- round-of-32 best-third allocation lookup structure
- bracket slot metadata for official round-of-32 allocation
