# Design

These are the decisions the site is built on, each with the reason it was made. The rules for working in
the code are in [AGENTS.md](../AGENTS.md); the contribution flow is in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Zola static pages

The course content is static, so Zola builds it into `public/` and the assets layer serves it without
running any code. Each page is a plain HTML file.

## The Worker only on `/x/*`

`wrangler.jsonc` sets `run_worker_first` to `/x/*`, so the Worker answers only the logic routes: progress,
practice answers and the timed exam. Every Worker response is an htmx fragment, never a whole page, so
htmx swaps it into the page that asked for it. Requests for any other path are served by the assets layer.

## Cookie state in compact URL-safe formats

There is no server-side store. The state lives in the cookies `progress`, `practice` and `exam`
(`src/shared/cookies.ts`), each in a compact format built from URL-safe characters, so no value needs URL
escaping. The progress and practice values are trimmed to stay under 3000 characters (`MAX_VALUE` in
`src/domain/progress.ts`). The exam session is `start~minutes~end~ids~answers~flags` in `src/domain/exam.ts`;
a 65-question exam stays near 1.5 KB.

## No application JavaScript

The only script is the vendored htmx library (`static/htmx.min.js`, loaded by `templates/base.html`). The
interactivity comes from htmx attributes on the page and fragments from the Worker. There is no
`localStorage` and no application code in the browser, so the logic is tested on the server.

## Markdown with YAML front matter

The questions and study topics are Markdown files with YAML front matter. `scripts/content.ts` validates
every file and the blueprint in `data/domains.yaml` before the build, so a broken file fails the build
rather than a visitor's page. The same script writes the facts the Worker needs into a git-ignored
generated file.

## Exam scoring

The score is a domain-weighted fraction scaled to 1000 (`SCALE` in `src/domain/exam.ts`). For each domain
the exam asked, the fraction of correct answers is weighted by the domain's weight in `data/domains.yaml`;
the weighted sum is divided by the total weight of those domains and multiplied by 1000. The pass mark is
700 (`PASS_MARK`).

This is the simulator's own scoring. It does not reproduce the provider's scaled scoring, so the 1000 scale
and the 700 pass mark are a local convention for practice. The report shows the total and a per-domain
table of correct answers and percentages (`src/shared/ui/fragments.tsx`).

## Configurable exam length

The exam size and length are `vars` in `wrangler.jsonc`: `EXAM_QUESTIONS` (65) and `EXAM_MINUTES` (90).
The Worker reads them on each request and falls back to its built-in defaults when a value is not a
positive whole number. A different length for a deployment is a configuration change, not a code change.
