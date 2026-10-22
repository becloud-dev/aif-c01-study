# Contributing

This repository is the AWS Certified AI Practitioner (AIF-C01) study site. Read [AGENTS.md](AGENTS.md)
for the layout and the rules the code follows. The design decisions are in [docs/DESIGN.md](docs/DESIGN.md).

## The path of a change

1. **Issue.** Every change starts from a GitHub issue. The issue states the goal and what is out of scope.
2. **Plan.** A change that adds a route or touches a workflow gets a plan before code. The `dev-plan`
   workflow writes the plan on an issue labelled `RELEASE`. The plan is approved by replying `/approve`
   on that issue, after which the execution starts.
3. **Branch.** Work on a branch named `<type>/<issue#>-<slug>`, for example `feat/12-exam-timer`.
   The type is one of the commit types below.
4. **Pull request.** Open a pull request into `main` with the template: what changed, the checks run,
   and the bug class the change prevents. The pull request is merged by squash merge, so the pull
   request title becomes the commit on `main`.
5. **Release pull request.** On every push to `main`, the `release-please` workflow keeps one release
   pull request open. It collects the commits since the last release, sets the version and the changelog.
6. **Tag.** Merging the release pull request makes release-please tag the release.
7. **Deploy.** Releases deploy from the release pull request. Never deploy from a laptop.

## Commit types

Commits, and pull request titles, use Conventional Commits: `<type>(<scope>): <description>`, in English,
lower case, imperative, with no full stop. The type decides the release:

| Type       | Release                 |
| ---------- | ----------------------- |
| `feat`     | minor                   |
| `fix`      | patch                   |
| `perf`     | patch                   |
| `refactor` | patch                   |
| `revert`   | patch                   |
| `style`    | no release              |
| `test`     | no release              |
| `docs`     | no release              |
| `build`    | no release              |
| `ci`       | no release              |
| `chore`    | no release              |

The version is below 1.0.0, and `bump-minor-pre-major` in
[release-please-config.json](release-please-config.json) is set. A breaking change (a `!` after the type
or a `BREAKING CHANGE` footer) therefore bumps the minor version, not the major one, until the project
reaches 1.0.0.

The pull request title is the commit. The `pr-title` check rejects a title that is not a Conventional
Commit, so fix the title before the merge. The `commit-msg` hook in `.githooks/` does the same for local
commits. `npm install` sets the hooks path.

## Checks

Before you open a pull request, run:

- `npm run check`: lint, typecheck, the unit and route tests, and the Zola link check.
- `npm run e2e`: builds the site and runs the Playwright flows. The first run needs
  `npx playwright install chromium webkit`.

CI runs `npm run check` on every pull request. The end-to-end workflow runs when a path that changes the
site changes, and uploads the Playwright report when it fails.

## Rules

- Write the test first, see it fail, then change the code. A security-relevant change names its OWASP
  Top 10:2025 category in the plan.
- Static pages are built by Zola. Only the `/x/*` routes reach the Worker.
