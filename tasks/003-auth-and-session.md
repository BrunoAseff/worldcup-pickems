# Task 003: Auth And Session

## Goal

Implement a small, secure authentication system suitable for a private 4-user app.

## Scope

- login flow
- logout flow
- session persistence
- role-aware auth checks
- route protection

## Requirements

- no signup flow
- no password reset flow
- username + password only
- support `player` and `admin` roles
- use secure cookies
- persist sessions in the database

## Preferred Approach

- implement simple custom session auth first
- if this becomes risky or unnecessarily complex, adopt a library

## Deliverables

- user and session schema
- password hashing
- login UI in Portuguese
- protected backend access pattern
- middleware or equivalent route protection

## Acceptance Criteria

- unauthenticated users cannot access business routes
- authenticated sessions survive normal page navigation and reloads
- admin-only actions are inaccessible to players
- user-facing auth errors are treated and clear

## Dependencies

- `001-project-setup`
- `002-data-import-and-normalization`
