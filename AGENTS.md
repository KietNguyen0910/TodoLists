# TodoApp Agent Rules

## Scope and architecture

- Keep the React client, Express routes under `server/routes`, and Vercel handlers under `api/tasks` behaviorally compatible whenever a task API contract changes.
- Preserve existing user-facing behavior and API shapes unless a migration is explicitly part of the work.
- Keep task server state in React Query. Reconcile mutations from affected task records rather than refetching the entire task list when possible.

## Web baseline

- Use semantic HTML and accessible native controls. Ensure keyboard operation, visible focus, labels, error messaging, loading/empty states, and responsive behavior.
- Validate all untrusted input and enforce authorization for server-side mutations. Do not expose secrets, tokens, or internal error detail.
- Avoid unnecessary requests and renders. Lazy-load heavy dependencies and infrequently used UI; keep spreadsheet work out of the initial bundle.

## Required verification

- Add or update focused tests for changed behavior.
- Before handoff, run the relevant test suite and a production build; fix compile and test failures.
- Report checks run and any limitation that prevents verification.
