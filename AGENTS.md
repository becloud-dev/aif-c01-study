# Agent notes

AWS Certified AI Practitioner (AIF-C01) study platform: a static course site built by Zola, with a
small Cloudflare Worker for the logic (progress, practice answers, the timed exam). English first.

## Commands
- `npm run dev` builds the site and serves it with the Worker on :8787 (`zola` must be on PATH).
- `npm run build` validates the content (`npm run content`) and runs `zola build` into `public/`.
- `npm test` runs the unit and route tests (Vitest, no Cloudflare runtime needed).
- `npm run typecheck` runs the content step, then `tsc` for `src`, `scripts`, `tests` and `e2e`.
- `npm run lint` / `npm run lint:fix` run Biome.
- `npm run check` runs lint, typecheck, tests and `zola check --skip-external-links`.
- `npm run e2e` builds and runs the Playwright flows (first run: `npx playwright install chromium webkit`).

## Layout
- `content/` Markdown with YAML front matter (study topics, one file per question); `data/domains.yaml`
  holds the exam blueprint (weights add up to 100). `scripts/content.ts` validates all of it and
  writes `src/generated/answers.json` (git-ignored) for the Worker.
- `templates/` Zola (Tera) templates; `static/` CSS and the vendored htmx.
- `src/domain/` pure logic (progress, practice, exam scoring); `src/resources/` the routes under
  `/x/*` as htmx fragments; `src/shared/` cookies and fragment components; `src/app.tsx` builds the
  app from injected content and clock; `src/index.tsx` is the Worker entry.
- `tests/` unit and route tests; `e2e/` browser flows against the real build.

## Rules
- Static pages are built by Zola and served by the assets layer; only `/x/*` reaches the Worker.
  Every Worker response is an htmx fragment, never a whole page.
- State lives in cookies (`progress`, `practice`, `exam`) in URL-safe compact formats; a value stays
  under 3000 characters. Do not add `localStorage` or application JavaScript.
- Never print the correct option of a question in a static page (`correct` stays in front matter).
- Tests first: add or extend a test, see it fail, then change the code. A security-relevant change
  names its OWASP Top 10:2025 category in the plan.
- Commits: Conventional Commits, lower case, imperative, no full stop. Never deploy from a laptop;
  releases deploy from the release PR.
