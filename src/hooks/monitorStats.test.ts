import { describe, expect, it } from 'vitest'
import { formatGuardDuration } from './monitorStats'

describe('formatGuardDuration', () => {
  it('formats short guard durations in English by default', () => {
    expect(formatGuardDuration(0)).toBe('0s')
    expect(formatGuardDuration(59_000)).toBe('59s')
  })

  it('formats minute and hour guard durations compactly in English', () => {
    expect(formatGuardDuration(60_000)).toBe('1m')
    expect(formatGuardDuration(3_660_000)).toBe('1h 1m')
  })

  it('formats guard durations in Chinese when requested', () => {
    expect(formatGuardDuration(59_000, 'zh')).toBe('59 秒')
    expect(formatGuardDuration(3_660_000, 'zh')).toBe('1 小时 1 分钟')
  })
})
