import { describe, it, expect, vi } from 'vitest'
import { isValidIp, DEFAULT_CONFIG } from './config'

// Mock the Tauri store to avoid runtime errors in tests
vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))

describe('isValidIp', () => {
  it('accepts valid IPv4', () => {
    expect(isValidIp('1.2.3.4')).toBe(true)
    expect(isValidIp('192.168.1.1')).toBe(true)
    expect(isValidIp('255.255.255.255')).toBe(true)
  })

  it('rejects invalid values', () => {
    expect(isValidIp('')).toBe(false)
    expect(isValidIp('256.0.0.1')).toBe(false)
    expect(isValidIp('1.2.3')).toBe(false)
    expect(isValidIp('1.2.3.4.5')).toBe(false)
    expect(isValidIp('abc.def.ghi.jkl')).toBe(false)
    expect(isValidIp('1.2.3.4 ')).toBe(false)
  })
})

describe('DEFAULT_CONFIG', () => {
  it('has correct defaults', () => {
    expect(DEFAULT_CONFIG.lockedIp).toBe('')
    expect(DEFAULT_CONFIG.launchAtLogin).toBe(false)
    expect(DEFAULT_CONFIG.strongAlertEnabled).toBe(true)
  })
})
