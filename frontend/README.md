# Frontend

Browser-facing applications live here.

- `web/` - Next.js app, including the current HTTP API route adapters under `src/app/api/`

The API routes are intentionally still colocated with Next.js for now. Shared backend logic can be extracted into a future top-level `backend/` package without changing the UI routes all at once.
