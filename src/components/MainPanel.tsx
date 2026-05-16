import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useEffect, useState } from 'react'
import type { AppConfig } from '../types'
import { loadConfig, isValidIp } from '../store/config'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'
import { SettingsSection } from './SettingsSection'

const BANNER_STYLES = {
  idle: { background: 'linear-gradient(135deg, #374151, #1f2937)', icon: '🛡️', title: 'IP 监控未启动', subtitle: '请配置锁定 IP 并开始监控' },
  safe: { background: 'linear-gradient(135deg, #065f46, #059669)', icon: '🛡️', title: 'IP 安全 · 正常', subtitle: null },
  alert: { background: 'linear-gradient(135deg, #7f1d1d, #dc2626)', icon: '🚨', title: 'IP 已变更！可能泄露', subtitle: null },
}

export function MainPanel() {
  const { state, startMonitoring, stopMonitoring } = useMonitor()
  const [config, setConfig] = useState<AppConfig>({ lockedIp: '', launchAtLogin: false, strongAlertEnabled: true })
  const [lockedIpInput, setLockedIpInput] = useState('')
  const [lockedIpError, setLockedIpError] = useState(false)
  const [detectedAt, setDetectedAt] = useState<string>('')

  useEffect(() => {
    loadConfig().then((c) => {
      setConfig(c)
      setLockedIpInput(c.lockedIp)
    })
  }, [])

  useEffect(() => {
    const win = getCurrentWebviewWindow()
    let unlisten: (() => void) | null = null
    win.onFocusChanged(({ payload: focused }) => {
      if (!focused) win.hide()
    }).then((fn) => { unlisten = fn })
    return () => { unlisten?.() }
  }, [])

  useEffect(() => {
    if (state.status === 'alert') {
      setDetectedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }
  }, [state.status])

  const handleStartMonitoring = () => {
    if (!isValidIp(lockedIpInput)) {
      setLockedIpError(true)
      return
    }
    setLockedIpError(false)
    startMonitoring(lockedIpInput)
  }

  const handleQuit = () => {
    import('@tauri-apps/api/core').then(({ invoke }) => invoke('exit_app'))
  }

  const isMonitoring = state.status !== 'idle'
  const banner = BANNER_STYLES[state.status]

  const countdownText = state.isChecking
    ? '检查中...'
    : state.countdown > 0
    ? `下次检查 ${state.countdown}s 后`
    : '检查中...'

  return (
    <div style={{ width: 340, fontFamily: 'system-ui, -apple-system, sans-serif', userSelect: 'none' }}>
      <div style={{ height: 3, background: isMonitoring ? (state.status === 'alert' ? 'linear-gradient(90deg,#7f1d1d,#dc2626)' : 'linear-gradient(90deg,#065f46,#059669)') : '#e2e8f0' }} />

      <div style={{ background: banner.background, color: '#fff', padding: '14px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 3 }}>{banner.icon}</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{banner.title}</div>
        <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
          {state.status === 'idle' && banner.subtitle}
          {state.status === 'safe' && countdownText}
          {state.status === 'alert' && `检测于 ${detectedAt}`}
        </div>
      </div>

      <div style={{ padding: '12px 14px', background: state.status === 'alert' ? '#fff7f7' : '#fff' }}>
        {state.currentIpInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CountryFlag countryCode={state.currentIpInfo.country_code} size={22} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{state.currentIpInfo.country || 'Unknown'}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                {[state.currentIpInfo.city, state.currentIpInfo.region].filter(Boolean).join(', ')}
                {state.currentIpInfo.asn ? ` · AS${state.currentIpInfo.asn}` : ''}
              </div>
            </div>
            {isMonitoring && state.status === 'safe' && (
              <div style={{ fontSize: 10, fontFamily: 'monospace', background: '#f0fdf4', color: '#065f46', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                IP 匹配 ✓
              </div>
            )}
          </div>
        )}

        {state.status === 'alert' && state.currentIpInfo && (
          <IpComparison
            lockedIp={state.lockedIp}
            currentIp={state.currentIpInfo.ip}
            detectedAt={detectedAt}
          />
        )}

        {state.currentIpInfo && (
          <div style={{ marginBottom: 10 }}>
            <IpInfoGrid info={state.currentIpInfo} isAlert={state.status === 'alert'} />
          </div>
        )}

        {state.error && (
          <div style={{ fontSize: 10, color: '#dc2626', background: '#fef2f2', padding: '5px 8px', borderRadius: 6, marginBottom: 8 }}>
            {state.error}
          </div>
        )}

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
          <SettingsSection
            lockedIp={state.lockedIp}
            isMonitoring={isMonitoring}
            launchAtLogin={config.launchAtLogin}
            strongAlertEnabled={config.strongAlertEnabled}
            onLaunchAtLoginChange={(v) => setConfig((c) => ({ ...c, launchAtLogin: v }))}
            onStrongAlertChange={(v) => setConfig((c) => ({ ...c, strongAlertEnabled: v }))}
            lockedIpInput={lockedIpInput}
            onLockedIpInputChange={(v) => { setLockedIpInput(v); setLockedIpError(false) }}
            onLockedIpConfirm={handleStartMonitoring}
            lockedIpError={lockedIpError}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {!isMonitoring ? (
            <button
              onClick={handleStartMonitoring}
              style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ▶ 开始监控
            </button>
          ) : (
            <button
              onClick={stopMonitoring}
              style={{ flex: 1, background: state.status === 'alert' ? '#dc2626' : '#ef4444', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ⏹ 停止监控
            </button>
          )}
          <button
            onClick={handleQuit}
            style={{ background: '#f1f5f9', color: '#ef4444', border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 11, cursor: 'pointer' }}
          >
            退出程序
          </button>
        </div>
      </div>
    </div>
  )
}
