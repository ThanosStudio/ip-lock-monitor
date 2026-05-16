import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

function readRepoFile(path: string) {
  return readFileSync(`${repoRoot}/${path}`, 'utf8')
}

describe('alert window layout', () => {
  test('uses enough window height for the full alert content', () => {
    const tauriConfig = JSON.parse(readRepoFile('src-tauri/tauri.conf.json'))
    const alertWindow = tauriConfig.app.windows.find(
      (window: { label: string }) => window.label === 'alert',
    )

    expect(alertWindow.height).toBeGreaterThanOrEqual(540)
  })

  test('enables macOS transparent window support', () => {
    const tauriConfig = JSON.parse(readRepoFile('src-tauri/tauri.conf.json'))

    expect(tauriConfig.app.macOSPrivateApi).toBe(true)
  })

  test('enables the matching Tauri private API feature', () => {
    const cargoToml = readRepoFile('src-tauri/Cargo.toml')

    expect(cargoToml).toMatch(/tauri\s*=\s*\{[^}]*"macos-private-api"/s)
  })

  test('allows runtime alert sizing and centering commands', () => {
    const capability = JSON.parse(readRepoFile('src-tauri/capabilities/default.json'))

    expect(capability.permissions).toContain('core:window:allow-set-size')
    expect(capability.permissions).toContain('core:window:allow-center')
  })

  test('clips transparent rounded corners at the root layer', () => {
    const styles = readRepoFile('src/styles.css')

    expect(styles).toContain('margin: 0;')
    expect(styles).toMatch(/#root\s*\{[^}]*overflow:\s*hidden;/s)
  })

  test('keeps alert content inside a rounded shell with scroll fallback', () => {
    const alertModal = readRepoFile('src/components/AlertModal.tsx')

    expect(alertModal).toContain('rounded-xl overflow-hidden bg-red-50')
    expect(alertModal).toContain('flex-1 overflow-y-auto')
  })

  test('resizes the main tray panel to fit its content without showing scrollbars', () => {
    const mainPanel = readRepoFile('src/components/MainPanel.tsx')
    const styles = readRepoFile('src/styles.css')

    expect(mainPanel).toContain('ResizeObserver')
    expect(mainPanel).toContain('setSize(new LogicalSize(MAIN_PANEL_WIDTH, nextHeight))')
    expect(mainPanel).toContain('flex-1 overflow-y-auto')
    expect(mainPanel).toContain('scrollbar-none')
    expect(styles).toContain('.scrollbar-none')
  })
})
