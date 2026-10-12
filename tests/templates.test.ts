import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The static pages (Zola templates) and the Worker's fragments name each other's URLs as strings. The
// Worker answers only /x/*; any other path is served by the assets layer, so a dynamic call that forgets
// the prefix gets the 404 page, silently. This test pins both sides.
// matches hx-get="/x/.." in templates and hx-put={`/x/${id}`} in JSX
const HX_URL = /hx-(?:get|post|put|patch|delete)=\{?[`"']([^`"']+)[`"']/g

const urlsIn = (text: string) =>
  [...text.matchAll(HX_URL)].map((m) => (m[1] as string).replace(/\{\{[^}]*\}\}|\$\{[^}]*\}/g, 'X'))

describe('dynamic URLs', () => {
  const templates = readdirSync('templates')
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f, readFileSync(join('templates', f), 'utf8')] as const)

  it('finds the islands in the templates', () => {
    expect(templates.flatMap(([, text]) => urlsIn(text)).length).toBeGreaterThanOrEqual(4)
  })

  it.each(templates)('%s calls the Worker only under /x/', (_name, text) => {
    for (const url of urlsIn(text)) expect(url, url).toMatch(/^\/x\//)
  })

  it('the Worker fragments call /x/ routes or static question pages', () => {
    const text = readFileSync('src/shared/ui/fragments.tsx', 'utf8')
    const urls = urlsIn(text)
    expect(urls.length).toBeGreaterThanOrEqual(8)
    for (const url of urls) expect(url, url).toMatch(/^\/(x|questions)\//)
  })
})
