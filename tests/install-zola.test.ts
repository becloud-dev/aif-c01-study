import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// scripts/install-zola.sh installs the pinned Zola release after checking its SHA-256. The tests use a
// fake release (a tarball holding a script named zola) served from a file:// URL.
const SCRIPT = 'scripts/install-zola.sh'
const VERSION = '0.23.6'

function fakeRelease(printed = `zola ${VERSION}`) {
  const dir = mkdtempSync(join(tmpdir(), 'zola-'))
  const bin = join(dir, 'zola')
  writeFileSync(bin, `#!/bin/sh\necho "${printed}"\n`)
  chmodSync(bin, 0o755)
  const tarball = join(dir, 'zola.tar.gz')
  execFileSync('tar', ['-czf', tarball, '-C', dir, 'zola'])
  const sha = createHash('sha256').update(readFileSync(tarball)).digest('hex')
  return { dir, tarball, sha }
}

function run(env: Record<string, string>) {
  const dest = mkdtempSync(join(tmpdir(), 'dest-'))
  const githubPath = join(dest, 'github-path')
  const r = spawnSync('sh', [SCRIPT], {
    env: { PATH: process.env.PATH ?? '', ZOLA_DEST: dest, GITHUB_PATH: githubPath, ...env },
    encoding: 'utf8',
  })
  return { ...r, dest, githubPath }
}

describe('install-zola.sh', () => {
  it('installs a release whose checksum matches', () => {
    const rel = fakeRelease()
    const r = run({ ZOLA_URL: `file://${rel.tarball}`, ZOLA_SHA256: rel.sha })
    expect(r.status).toBe(0)
    expect(existsSync(join(r.dest, 'zola'))).toBe(true)
    expect(execFileSync(join(r.dest, 'zola'), ['--version'], { encoding: 'utf8' }).trim()).toBe(`zola ${VERSION}`)
  })

  it('adds the directory to GITHUB_PATH for later steps', () => {
    const rel = fakeRelease()
    const r = run({ ZOLA_URL: `file://${rel.tarball}`, ZOLA_SHA256: rel.sha })
    expect(readFileSync(r.githubPath, 'utf8').trim()).toBe(r.dest)
  })

  it('refuses a release whose checksum does not match and installs nothing', () => {
    const rel = fakeRelease()
    const r = run({ ZOLA_URL: `file://${rel.tarball}`, ZOLA_SHA256: '0'.repeat(64) })
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/checksum/i)
    expect(existsSync(join(r.dest, 'zola'))).toBe(false)
  })

  it('refuses a binary that reports another version', () => {
    const rel = fakeRelease('zola 9.9.9')
    const r = run({ ZOLA_URL: `file://${rel.tarball}`, ZOLA_SHA256: rel.sha })
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/version/i)
  })

  it('fails when the download fails', () => {
    const r = run({ ZOLA_URL: 'file:///nonexistent/zola.tar.gz', ZOLA_SHA256: '0'.repeat(64) })
    expect(r.status).not.toBe(0)
    expect(existsSync(join(r.dest, 'zola'))).toBe(false)
  })

  it('pins the real release: version and a 64-hex checksum are in the script', () => {
    const text = readFileSync(SCRIPT, 'utf8')
    expect(text).toContain(`VERSION=${VERSION}`)
    expect(text).toMatch(/SHA256=[0-9a-f]{64}/)
  })
})
