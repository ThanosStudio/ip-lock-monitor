import { describe, expect, it } from 'vitest'
import { formatGuardDuration } from './monitorStats'

describe('formatGuardDuration', () => {
  it('formats short guard durations in seconds', () => {
    expect(formatGuardDuration(0)).toBe('0 秒')
    expect(formatGuardDuration(59_000)).toBe('59 秒')
  })

  it('formats minute and hour guard durations compactly', () => {
    expect(formatGuardDuration(60_000)).toBe('1 分钟')
    expect(formatGuardDuration(3_660_000)).toBe('1 小时 1 分钟')
  })
})
