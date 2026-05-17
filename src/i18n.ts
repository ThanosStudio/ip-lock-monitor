import type { AppLanguage, MonitorStatus } from './types'

type TranslationKey =
  | 'appTitle'
  | 'statusIdle'
  | 'statusSafe'
  | 'statusAlert'
  | 'subtitleIdle'
  | 'checking'
  | 'nextCheck'
  | 'detectedAt'
  | 'matched'
  | 'changed'
  | 'currentIp'
  | 'fill'
  | 'refresh'
  | 'loadingCurrentIp'
  | 'startMonitoring'
  | 'stopMonitoring'
  | 'resetMonitoring'
  | 'quit'
  | 'lockedIp'
  | 'lockedIpMonitoringHint'
  | 'lockedIpEnterHint'
  | 'lockedIpPlaceholder'
  | 'launchAtLogin'
  | 'launchAtLoginDesc'
  | 'strongAlert'
  | 'strongAlertDesc'
  | 'language'
  | 'languageDesc'
  | 'english'
  | 'chinese'
  | 'provider'
  | 'organization'
  | 'location'
  | 'timezone'
  | 'unknown'
  | 'ipChangeComparison'
  | 'alertTitle'
  | 'alertHeadline'
  | 'detectedTime'
  | 'checked'
  | 'guarded'
  | 'checksUnit'
  | 'alertStopped'
  | 'resetAndClose'
  | 'strongAlertTip'
  | 'poweredByAi'
  | 'networkError'
  | 'notificationTitle'
  | 'notificationBody'

type TranslationValue = string | ((...args: Array<string | number>) => string)

const translations: Record<AppLanguage, Record<TranslationKey, TranslationValue>> = {
  en: {
    appTitle: 'IP Monitor',
    statusIdle: 'IP Monitor',
    statusSafe: 'IP Safe',
    statusAlert: 'IP Changed',
    subtitleIdle: 'Set a locked IP to start monitoring',
    checking: 'Checking...',
    nextCheck: (seconds) => `Next check in ${seconds}s`,
    detectedAt: (time) => `Detected at ${time}`,
    matched: 'Matched ✓',
    changed: 'Changed!',
    currentIp: 'Current IP',
    fill: 'Fill',
    refresh: 'Refresh',
    loadingCurrentIp: 'Checking current IP...',
    startMonitoring: 'Start Monitoring',
    stopMonitoring: 'Stop Monitoring',
    resetMonitoring: 'Reset Monitoring',
    quit: 'Quit',
    lockedIp: 'Locked IP',
    lockedIpMonitoringHint: '(locked while monitoring)',
    lockedIpEnterHint: '(press Enter)',
    lockedIpPlaceholder: 'Enter the IP address to monitor...',
    launchAtLogin: 'Launch at Login',
    launchAtLoginDesc: 'Keep running in the menu bar after login',
    strongAlert: 'Strong Alert',
    strongAlertDesc: 'Show a centered warning window when IP changes',
    language: 'Language',
    languageDesc: 'Switch app interface language',
    english: 'English',
    chinese: '中文',
    provider: 'Provider',
    organization: 'Organization',
    location: 'Location',
    timezone: 'Timezone',
    unknown: 'Unknown',
    ipChangeComparison: (time) => `IP Change Comparison${time ? ` (${time})` : ''}`,
    alertTitle: 'IP Leak Warning',
    alertHeadline: 'IP changed. Possible leak.',
    detectedTime: (time) => `Detected: ${time}`,
    checked: 'Checked',
    guarded: 'Guarded',
    checksUnit: (count) => `${count} ${Number(count) === 1 ? 'time' : 'times'}`,
    alertStopped: 'Monitoring stopped. Fix the issue, then restart monitoring.',
    resetAndClose: 'Reset Monitoring and Close',
    strongAlertTip: 'You can disable strong alerts in settings',
    poweredByAi: 'Powered by AI',
    networkError: 'Network error. Unable to check IP.',
    notificationTitle: '⚠️ IP Change Warning',
    notificationBody: (lockedIp, currentIp) => (
      `Proxy IP changed from ${lockedIp} to ${currentIp}. Your real IP may be exposed.`
    ),
  },
  zh: {
    appTitle: 'IP 监控',
    statusIdle: 'IP 监控',
    statusSafe: 'IP 安全',
    statusAlert: 'IP 变更',
    subtitleIdle: '配置锁定 IP，开始持续监控',
    checking: '正在检查...',
    nextCheck: (seconds) => `下次检查 ${seconds}s 后`,
    detectedAt: (time) => `检测于 ${time}`,
    matched: '匹配 ✓',
    changed: '变更!',
    currentIp: '当前 IP',
    fill: '填入',
    refresh: '刷新',
    loadingCurrentIp: '正在检测当前 IP...',
    startMonitoring: '开始监控',
    stopMonitoring: '停止监控',
    resetMonitoring: '重置监控',
    quit: '退出',
    lockedIp: '锁定 IP',
    lockedIpMonitoringHint: '（监控中不可修改）',
    lockedIpEnterHint: '（回车确认）',
    lockedIpPlaceholder: '输入要监控的 IP 地址...',
    launchAtLogin: '开机自动启动',
    launchAtLoginDesc: '随系统启动常驻菜单栏',
    strongAlert: '强提醒模式',
    strongAlertDesc: 'IP 变更时在屏幕居中弹出警告窗口',
    language: '语言',
    languageDesc: '切换应用界面语言',
    english: 'English',
    chinese: '中文',
    provider: '服务商',
    organization: '组织',
    location: '位置',
    timezone: '时区',
    unknown: 'Unknown',
    ipChangeComparison: (time) => `IP 变更对比${time ? `（${time}）` : ''}`,
    alertTitle: 'IP 泄露警告',
    alertHeadline: 'IP 已变更！可能泄露',
    detectedTime: (time) => `检测时间：${time}`,
    checked: '已检查',
    guarded: '已护航',
    checksUnit: (count) => `${count} 次`,
    alertStopped: '检测已停止，请处理后重新启动监控',
    resetAndClose: '重置监控并关闭',
    strongAlertTip: '可在设置中关闭强提醒弹窗',
    poweredByAi: 'Powered by AI',
    networkError: '网络错误，无法检测 IP',
    notificationTitle: '⚠️ IP 变更警告',
    notificationBody: (lockedIp, currentIp) => (
      `代理 IP 已从 ${lockedIp} 变更为 ${currentIp}，真实 IP 可能泄露！`
    ),
  },
}

export function t(language: AppLanguage, key: TranslationKey, ...args: Array<string | number>): string {
  const value = translations[language][key]
  return typeof value === 'function' ? value(...args) : value
}

export function getStatusTitle(language: AppLanguage, status: MonitorStatus): string {
  if (status === 'safe') return t(language, 'statusSafe')
  if (status === 'alert') return t(language, 'statusAlert')
  return t(language, 'statusIdle')
}

export function formatAppTime(language: AppLanguage, date: Date): string {
  return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })
}
