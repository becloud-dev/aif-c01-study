import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Policy tests over the contribution docs: each file exists and starts with a level-1 heading, every
// relative Markdown link resolves from the file's own folder, and every backticked repository path
// resolves from the repository root. They read the Markdown, not a renderer.
const DOCS = ['CONTRIBUTING.md', 'GO_LIVE.md', 'docs/DESIGN.md']
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g
// A repository path: a file with a known extension, optionally in folders. Commands, placeholders and
// git-ignored generated files are left out, so the docs must not name them in backticks as files.
const PATH_TOKEN = /`([\w.@/-]+\.(?:md|ts|tsx|js|json|jsonc|yml|yaml|toml|html|css|sh))`/g

const text = (file: string) => readFileSync(file, 'utf8')

describe('contribution docs', () => {
  it('documents exist', () => {
    for (const file of DOCS) expect(existsSync(file), file).toBe(true)
  })

  it.each(DOCS)('%s starts with a level-1 heading', (file) => {
    const first = text(file)
      .split('\n')
      .find((line) => line.trim() !== '')
    expect(first, file).toMatch(/^# /)
  })

  it.each(DOCS)('%s: relative links resolve', (file) => {
    for (const m of text(file).matchAll(LINK)) {
      const target = m[1] as string
      if (/^(https?:|mailto:|#)/.test(target)) continue
      const path = target.split('#')[0] as string
      expect(existsSync(join(dirname(file), path)), `${file}: ${target}`).toBe(true)
    }
  })

  it.each(DOCS)('%s: backticked repository paths resolve', (file) => {
    for (const m of text(file).matchAll(PATH_TOKEN)) {
      const path = m[1] as string
      expect(existsSync(path), `${file}: \`${path}\``).toBe(true)
    }
  })
})
