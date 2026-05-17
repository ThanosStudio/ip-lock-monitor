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

  test('resizes the alert window to fit its content instead of showing a scrollbar', () => {
    const alertModal = readRepoFile('src/components/AlertModal.tsx')

    expect(alertModal).toContain('rounded-xl overflow-hidden bg-red-50')
    expect(alertModal).toContain('ResizeObserver')
    expect(alertModal).toContain('setSize(new LogicalSize(ALERT_WINDOW_WIDTH, nextHeight))')
    expect(alertModal).toContain('scrollbar-none')
  })

  test('shows guard metrics in the alert banner', () => {
    const alertModal = readRepoFile('src/components/AlertModal.tsx')

    expect(alertModal).toContain("t(language, 'checked')")
    expect(alertModal).toContain("t(language, 'guarded')")
  })

  test('renders alert details from the alert snapshot instead of the alert window local monitor state', () => {
    const types = readRepoFile('src/types.ts')
    const useMonitor = readRepoFile('src/hooks/useMonitor.ts')
    const alertModal = readRepoFile('src/components/AlertModal.tsx')

    expect(types).toContain('currentIpInfo: IpInfo')
    expect(useMonitor).toContain('currentIpInfo: info')
    expect(alertModal).toContain('const alertInfo = alertSnapshot?.currentIpInfo ?? state.currentIpInfo')
    expect(alertModal).toContain('const alertLockedIp = alertSnapshot?.lockedIp ?? state.lockedIp')
    expect(alertModal).toContain('IpComparison lockedIp={alertLockedIp} currentIp={alertInfo.ip} language={language}')
  })

  test('does not duplicate the title bar close action in the alert footer', () => {
    const alertModal = readRepoFile('src/components/AlertModal.tsx')

    expect(alertModal).not.toContain('bg-slate-100 text-gray-700')
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
