import { describe, expect, it } from 'vitest'
import { getStatusTitle, t } from './i18n'

describe('i18n', () => {
  it('returns English interface copy', () => {
    expect(t('en', 'startMonitoring')).toBe('Start Monitoring')
    expect(t('en', 'nextCheck', 12)).toBe('Next check in 12s')
    expect(t('en', 'poweredByAi')).toBe('Powered by AI')
    expect(getStatusTitle('en', 'safe')).toBe('IP Safe')
  })

  it('returns Chinese interface copy', () => {
    expect(t('zh', 'startMonitoring')).toBe('开始监控')
    expect(t('zh', 'nextCheck', 12)).toBe('下次检查 12s 后')
    expect(t('zh', 'poweredByAi')).toBe('Powered by AI')
    expect(getStatusTitle('zh', 'safe')).toBe('IP 安全')
  })
})
