import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useEffect, useState } from 'react'
import type { AppConfig } from '../types'
import { loadConfig, isValidIp } from '../store/config'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'
import { SettingsSection } from './SettingsSection'

const STATUS_CFG = {
  idle:  { bg: 'linear-gradient(135deg,#1e293b,#0f172a)', icon: '🛡️', title: 'IP 监控', sub: '未启动' },
  safe:  { bg: 'linear-gradient(135deg,#064e3b,#065f46)', icon: '🛡️', title: 'IP 安全', sub: '监控中' },
  alert: { bg: 'linear-gradient(135deg,#7f1d1d,#991b1b)', icon: '🚨', title: 'IP 变更', sub: '可能泄露' },
}

export function MainPanel() {
  const { state, startMonitoring, stopMonitoring } = useMonitor()
  const [config, setConfig] = useState<AppConfig>({ lockedIp: '', launchAtLogin: false, strongAlertEnabled: true })
  const [lockedIpInput, setLockedIpInput] = useState('')
  const [lockedIpError, setLockedIpError] = useState(false)
  const [detectedAt, setDetectedAt] = useState('')

  useEffect(() => {
    loadConfig().then((c) => { setConfig(c); setLockedIpInput(c.lockedIp) })
  }, [])

  useEffect(() => {
    const win = getCurrentWebviewWindow()
    let unlisten: (() => void) | null = null
    win.onFocusChanged(({ payload: focused }) => { if (!focused) win.hide() })
      .then((fn) => { unlisten = fn })
    return () => { unlisten?.() }
  }, [])

  useEffect(() => {
    if (state.status === 'alert')
      setDetectedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
  }, [state.status])

  const handleStart = () => {
    if (!isValidIp(lockedIpInput)) { setLockedIpError(true); return }
    setLockedIpError(false)
    startMonitoring(lockedIpInput)
  }

  const handleQuit = () => {
    import('@tauri-apps/api/core').then(({ invoke }) => invoke('exit_app'))
  }

  const isMonitoring = state.status !== 'idle'
  const cfg = STATUS_CFG[state.status]
  const info = state.currentIpInfo

  return (
    <div style={{ width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif', userSelect: 'none', background: '#fff' }}>

      {/* ── Banner ───────────────────────────────────────────── */}
      <div style={{ background: cfg.bg, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {cfg.title}
            <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.65, marginLeft: 5 }}>{cfg.sub}</span>
          </div>
          <div style={{ marginTop: 3, fontSize: 9.5, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em' }}>
            {state.status === 'idle' && '配置锁定 IP，开始持续监控'}
            {state.status === 'safe' && (state.isChecking ? '正在检查...' : `下次检查 ${state.countdown}s 后`)}
            {state.status === 'alert' && `检测于 ${detectedAt}`}
          </div>
        </div>
        {state.status === 'safe' && (
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.03em', background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}>
            匹配 ✓
          </div>
        )}
        {state.status === 'alert' && (
          <div style={{ fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>
            变更!
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ padding: '10px 12px 12px' }}>

        {/* Current IP card */}
        {info && (
          <div style={{
            background: state.status === 'alert' ? '#fff5f5' : '#f8fafc',
            border: `1px solid ${state.status === 'alert' ? '#fecaca' : '#e2e8f0'}`,
            borderRadius: 9, padding: '8px 10px', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CountryFlag countryCode={info.country_code} size={18} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8.5, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>当前 IP</div>
                <div style={{
                  fontSize: 16, fontFamily: '"SF Mono", ui-monospace, "Cascadia Mono", monospace',
                  fontWeight: 700, color: state.status === 'alert' ? '#dc2626' : '#0f172a',
                  letterSpacing: '0.02em', lineHeight: 1,
                }}>{info.ip}</div>
                <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 3 }}>
                  {[info.country, info.city].filter(Boolean).join(' · ')}
                  {info.asn ? ` · AS${info.asn}` : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {!info && !state.error && (
          <div style={{ textAlign: 'center', padding: '10px 0 6px', fontSize: 10, color: '#94a3b8' }}>
            正在检测当前 IP…
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div style={{ fontSize: 10, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '5px 9px', borderRadius: 6, marginBottom: 6 }}>
            {state.error}
          </div>
        )}

        {/* Alert: IP comparison */}
        {state.status === 'alert' && info && (
          <IpComparison lockedIp={state.lockedIp} currentIp={info.ip} detectedAt={detectedAt} />
        )}

        {/* Info grid */}
        {info && (
          <div style={{ marginBottom: 8 }}>
            <IpInfoGrid info={info} isAlert={state.status === 'alert'} />
          </div>
        )}

        {/* Settings */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
          <SettingsSection
            lockedIp={state.lockedIp}
            isMonitoring={isMonitoring}
            launchAtLogin={config.launchAtLogin}
            strongAlertEnabled={config.strongAlertEnabled}
            onLaunchAtLoginChange={(v) => setConfig((c) => ({ ...c, launchAtLogin: v }))}
            onStrongAlertChange={(v) => setConfig((c) => ({ ...c, strongAlertEnabled: v }))}
            lockedIpInput={lockedIpInput}
            onLockedIpInputChange={(v) => { setLockedIpInput(v); setLockedIpError(false) }}
            onLockedIpConfirm={handleStart}
            lockedIpError={lockedIpError}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
          {!isMonitoring ? (
            <button onClick={handleStart} style={{
              flex: 1, background: '#059669', color: '#fff', border: 'none',
              borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '-0.01em',
              boxShadow: '0 1px 4px rgba(5,150,105,0.35)',
            }}>▶ 开始监控</button>
          ) : (
            <button onClick={stopMonitoring} style={{
              flex: 1, background: state.status === 'alert' ? '#dc2626' : '#ef4444',
              color: '#fff', border: 'none', borderRadius: 8, padding: '7px 0',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em',
              boxShadow: `0 1px 4px ${state.status === 'alert' ? 'rgba(220,38,38,0.4)' : 'rgba(239,68,68,0.3)'}`,
            }}>⏹ 停止监控</button>
          )}
          <button onClick={handleQuit} style={{
            background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: '7px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 500,
          }}>退出</button>
        </div>

      </div>
    </div>
  )
}
