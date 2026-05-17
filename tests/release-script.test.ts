import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

function readRepoFile(path: string) {
  return readFileSync(`${repoRoot}/${path}`, 'utf8')
}

describe('release script', () => {
  test('builds a dmg, writes sha256, pushes code, and publishes GitHub release assets', () => {
    const script = readRepoFile('scripts/release.sh')

    expect(script).toContain('npm run build')
    expect(script).toContain('npm run tauri -- build')
    expect(script).toContain('shasum -a 256')
    expect(script).toContain('release create')
    expect(script).toContain('git push')
  })

  test('supports dry-run mode and validates the ip-lock-monitor repository target', () => {
    const script = readRepoFile('scripts/release.sh')

    expect(script).toContain('DRY_RUN')
    expect(script).toContain('ip-lock-monitor')
    expect(script).toContain('GITHUB_REPOSITORY')
    expect(script).toContain('GIT_REMOTE_URL')
    expect(script).toContain('--remote-url')
  })

  test('is executable', () => {
    const mode = statSync(`${repoRoot}/scripts/release.sh`).mode

    expect(mode & 0o111).toBeGreaterThan(0)
  })
})
