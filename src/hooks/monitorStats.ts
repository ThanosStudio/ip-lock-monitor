import type { AppLanguage } from '../types'

export function formatGuardDuration(durationMs: number, language: AppLanguage = 'en') {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  if (totalSeconds < 60) return language === 'zh' ? `${totalSeconds} 秒` : `${totalSeconds}s`

  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return language === 'zh' ? `${totalMinutes} 分钟` : `${totalMinutes}m`

  const totalHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (totalHours < 24) {
    if (language === 'zh') return minutes > 0 ? `${totalHours} 小时 ${minutes} 分钟` : `${totalHours} 小时`
    return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`
  }

  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (language === 'zh') return hours > 0 ? `${days} 天 ${hours} 小时` : `${days} 天`
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}
