# Prospectus Web App

Next.js app: frontend UI + API routes for prospectus draft generation.

- **Frontend**: `src/app/page.tsx`, `layout.tsx`, `globals.css`, `public/`
- **Backend**: `src/app/api/` (chat, files, progress), `src/lib/rag.ts`

Run: `npm install && npm run dev` (or from repo root: `npm run dev` after installing here once).

Env: see root [README](../../README.md#environment-appsweb).

## Developer Tools

Build the local, deployment-only prospectus dataset after the strict ground-truth
audit has passed:

```bash
conda run -n prospectus python scripts/audit_prospectus_ground_truth.py --fail-on-error
conda run -n prospectus python scripts/build_devtools_dataset.py
```

`frontend/web/devtools-data/` contains full prospectus text and is intentionally
excluded from the public GitHub repository. It is included in direct Vercel
deployments. Production builds validate the complete 125-company bundle before
they can replace the live deployment; a Git-triggered build without this private
directory fails closed. Use a direct deployment from the prepared workspace.

Prompt Management reads the current compiled runtime SectionSpec and Writer
template directly from the canonical prompt files, then shows the fully assembled
writer prompt as a live preview. Saving or accepting an RCA diff stores a
section-specific `developer_compiled_override` in
`ai-module/prompts/sections/requirements.json`; Agent2 consumes that override at
runtime. Configure the variables in
[`.env.example`](.env.example); the token must be a fine-grained repository token
with Contents read/write access and is never returned to the browser.
Successful saves and resets are re-read from GitHub before the UI reports that
they are synchronized. Agent2 also materializes the latest GitHub requirements
into a temporary runtime file, so an approved web edit does not wait for another
application deployment.

The authenticated `/api/developer-tools/health` endpoint checks the dataset,
GitHub Prompt read path, and availability of server-side RCA provider keys
without returning secret values.
