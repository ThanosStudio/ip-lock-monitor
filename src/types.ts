export interface IpInfo {
  ip: string
  country_code: string
  country: string
  region: string
  city: string
  organization: string
  asn: number
  asn_organization: string
  longitude: number
  latitude: number
  timezone: string
}

export interface AppConfig {
  lockedIp: string
  launchAtLogin: boolean
  strongAlertEnabled: boolean
}

export type MonitorStatus = 'idle' | 'safe' | 'alert'

export interface MonitorState {
  status: MonitorStatus
  currentIpInfo: IpInfo | null
  lockedIp: string
  countdown: number      // seconds until next check; 0 = currently checking
  isChecking: boolean
  error: string | null
  checkCount: number
  monitoringStartedAt: number | null
}

export interface MonitorAlertSnapshot {
  lockedIp: string
  currentIp: string
  currentIpInfo: IpInfo
  checkCount: number
  guardDurationMs: number
  detectedAt: string
}
