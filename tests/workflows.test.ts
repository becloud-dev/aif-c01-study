import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

// Policy tests over .github/workflows: pinned actions, least-privilege permissions, no secrets or
// pull_request_target in the PR workflows, and the PR template. They read the YAML, not a runner.
const DIR = '.github/workflows'
const NEW_FILES = ['ci.yml', 'e2e.yml', 'pr-title.yml']
const PR_TYPES = ['opened', 'synchronize', 'reopened']
const E2E_PATHS = [
  'src/**',
  'content/**',
  'templates/**',
  'static/**',
  'data/**',
  'e2e/**',
  'package.json',
  'package-lock.json',
  'wrangler.jsonc',
  'playwright.config.ts',
  'zola.toml',
  '.github/workflows/e2e.yml',
]
const TITLE_TYPES = ['feat', 'fix', 'perf', 'refactor', 'style', 'test', 'docs', 'build', 'ci', 'chore', 'revert']

// The exact commits from the issue, with the release each one is.
const PINS: Record<string, { sha: string; version: string }> = {
  'actions/checkout': { sha: '3d3c42e5aac5ba805825da76410c181273ba90b1', version: 'v7.0.1' },
  'actions/setup-node': { sha: '949feb2413d6458794dcd2491c4babbbce0c15c1', version: 'v7.1.0' },
  'actions/upload-artifact': { sha: 'cf430e030ddbb5b0abf93d22962f4752f3646cd9', version: 'v7.0.2' },
  'amannn/action-semantic-pull-request': { sha: '48f256284bd46cdaab1048c3721360e808335d50', version: 'v6.1.1' },
}

type Step = { uses?: string; run?: string; if?: string; with?: Record<string, unknown> }
type Job = { permissions?: Record<string, string>; uses?: string; steps?: Step[] }
type Workflow = {
  permissions?: Record<string, string>
  on: { pull_request?: { types?: string[]; paths?: string[] } }
  jobs: Record<string, Job>
}

function text(name: string) {
  return readFileSync(join(DIR, name), 'utf8')
}

function workflow(name: string): Workflow {
  return parse(text(name)) as Workflow
}

function allWorkflowFiles() {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.yml'))
    .sort()
}

function allSteps(wf: Workflow) {
  return Object.values(wf.jobs).flatMap((job) => job.steps ?? [])
}

function usesOf(wf: Workflow) {
  return Object.values(wf.jobs).flatMap((job) => [job.uses, ...(job.steps ?? []).map((s) => s.uses)])
}

function runsOf(wf: Workflow) {
  return allSteps(wf)
    .map((s) => s.run?.trim())
    .filter((r): r is string => r !== undefined)
}

describe('workflow policy', () => {
  it('every action `uses:` is pinned to a 40-character SHA', () => {
    for (const name of NEW_FILES) expect(existsSync(join(DIR, name)), name).toBe(true)
    for (const name of allWorkflowFiles()) {
      for (const uses of usesOf(workflow(name))) {
        if (uses === undefined) continue
        if (uses.startsWith('./')) continue
        if (uses.startsWith('becloud-dev/workflows/') && uses.endsWith('@v0')) continue
        expect(uses, `${name}: ${uses}`).toMatch(/@[0-9a-f]{40}$/)
      }
    }
  })

  it('every workflow declares permissions', () => {
    for (const name of NEW_FILES) expect(existsSync(join(DIR, name)), name).toBe(true)
    for (const name of allWorkflowFiles()) {
      const wf = workflow(name)
      const topLevel = wf.permissions !== undefined
      const everyJob = Object.values(wf.jobs).every((job) => job.permissions !== undefined)
      expect(topLevel || everyJob, name).toBe(true)
    }
  })

  it('ci.yml and e2e.yml use no secrets', () => {
    for (const name of ['ci.yml', 'e2e.yml']) {
      const source = text(name)
      expect(source, name).not.toContain('secrets.')
      expect(source, name).not.toContain('pull_request_target')
    }
  })

  it('ci.yml runs npm run check on pull_request', () => {
    const wf = workflow('ci.yml')
    expect(wf.on.pull_request?.types).toEqual(PR_TYPES)
    expect(Object.keys(wf.jobs)).toEqual(['checks'])
    expect(wf.jobs.checks.permissions).toEqual({ contents: 'read' })
    const runs = runsOf(wf)
    const order = ['npm ci', 'sh scripts/install-zola.sh', 'npm run check'].map((cmd) => runs.indexOf(cmd))
    for (const i of order) expect(i).toBeGreaterThanOrEqual(0)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    const setup = allSteps(wf).find((s) => s.uses?.startsWith('actions/setup-node@'))
    expect(String(setup?.with?.['node-version'])).toBe('24')
    expect(setup?.with?.cache).toBe('npm')
  })

  it('e2e.yml is path-limited and uploads the report on failure', () => {
    const wf = workflow('e2e.yml')
    expect(wf.on.pull_request?.types).toEqual(PR_TYPES)
    expect(wf.on.pull_request?.paths).toEqual(E2E_PATHS)
    expect(Object.keys(wf.jobs)).toHaveLength(1)
    const job = Object.values(wf.jobs)[0]
    expect(job.permissions).toEqual({ contents: 'read' })
    const runs = runsOf(wf)
    expect(runs).toContain('npm ci')
    expect(runs).toContain('sh scripts/install-zola.sh')
    expect(runs).toContain('npx playwright install --with-deps chromium webkit')
    expect(runs).toContain('npm run e2e')
    const upload = allSteps(wf).find((s) => s.uses?.startsWith('actions/upload-artifact@'))
    expect(upload?.if).toBe('failure()')
    expect(upload?.with?.path).toBe('playwright-report/')
    expect(String(upload?.with?.['retention-days'])).toBe('14')
  })

  it('pr-title.yml validates Conventional Commit titles', () => {
    const wf = workflow('pr-title.yml')
    expect(wf.on.pull_request?.types).toEqual(['opened', 'edited', 'synchronize', 'reopened'])
    expect(Object.values(wf.jobs)[0].permissions).toEqual({ 'pull-requests': 'read' })
    const step = allSteps(wf).find((s) => s.uses?.startsWith('amannn/action-semantic-pull-request@'))
    expect(step).toBeDefined()
    const types = String(step?.with?.types)
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
    expect(types).toEqual(TITLE_TYPES)
    expect(String(step?.with?.headerPattern)).toContain('[a-z0-9-]+')
  })

  it('pr-checks.yml is gone and the PR template has its sections', () => {
    expect(existsSync(join(DIR, 'pr-checks.yml'))).toBe(false)
    const template = readFileSync('.github/pull_request_template.md', 'utf8')
    expect(template).toContain('Closes #')
    expect(template).toMatch(/what changed/i)
    expect(template).toMatch(/checks run/i)
    expect(template).toContain('Bug class')
  })

  it('A08: checkout never persists credentials', () => {
    for (const name of ['ci.yml', 'e2e.yml']) {
      const checkouts = allSteps(workflow(name)).filter((s) => s.uses?.startsWith('actions/checkout@'))
      expect(checkouts.length, name).toBeGreaterThan(0)
      for (const step of checkouts) expect(step.with?.['persist-credentials'], name).toBe(false)
    }
  })

  it('A01: no pull_request_target and read-only permissions', () => {
    for (const name of NEW_FILES) {
      const source = text(name)
      expect(source, name).not.toContain('pull_request_target')
      const wf = workflow(name)
      for (const job of Object.values(wf.jobs)) {
        const perms = job.permissions ?? {}
        for (const [scope, level] of Object.entries(perms)) {
          expect(`${scope}: ${level}`, name).toMatch(/^(contents: read|pull-requests: read)$/)
        }
      }
    }
  })

  it('A03: pinned actions with the issue exact SHAs', () => {
    const used = new Set<string>()
    for (const name of NEW_FILES) {
      for (const uses of usesOf(workflow(name))) {
        if (uses === undefined) continue
        const action = uses.split('@')[0]
        const pin = PINS[action]
        expect(pin, `${name}: ${uses}`).toBeDefined()
        expect(uses, name).toBe(`${action}@${pin.sha}`)
        expect(text(name), name).toContain(`${pin.sha} # ${pin.version}`)
        used.add(action)
      }
    }
    expect([...used].sort()).toEqual(Object.keys(PINS).sort())
  })
})
