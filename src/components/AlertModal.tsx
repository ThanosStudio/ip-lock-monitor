import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useEffect, useState } from 'react'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'

export function AlertModal() {
  const { state, stopMonitoring } = useMonitor()
  const [detectedAt, setDetectedAt] = useState(
    new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  )

  useEffect(() => {
    if (state.status === 'alert') {
      setDetectedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }
  }, [state.status])

  const handleClose = async () => {
    const win = getCurrentWebviewWindow()
    await win.hide()
  }

  const handleStopAndClose = async () => {
    await stopMonitoring()
    await handleClose()
  }

  const info = state.currentIpInfo

  return (
    <div style={{ width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif', userSelect: 'none' }}>
      <div
        data-tauri-drag-region
        style={{ background: '#1f2937', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'move' }}
      >
        <span style={{ fontSize: 10, color: '#6b7280' }}>IP 泄露警告</span>
        <button
          onClick={handleClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9ca3af', borderRadius: 4, width: 18, height: 18, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ✕
        </button>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #7f1d1d, #dc2626)', color: '#fff', padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 4 }}>🚨</div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>IP 已变更！可能泄露</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3 }}>检测时间：{detectedAt}</div>
      </div>

      <div style={{ padding: '12px 14px', background: '#fff7f7' }}>
        {info && (
          <>
            <IpComparison lockedIp={state.lockedIp} currentIp={info.ip} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CountryFlag countryCode={info.country_code} size={20} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{info.country || 'Unknown'}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  {[info.city, info.region].filter(Boolean).join(', ')}
                  {info.asn ? ` · AS${info.asn}` : ''}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <IpInfoGrid info={info} isAlert />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleStopAndClose}
            style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            ⏹ 停止监控
          </button>
          <button
            onClick={handleClose}
            style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 11, cursor: 'pointer' }}
          >
            关闭
          </button>
        </div>

        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>可在设置中关闭强提醒弹窗</span>
        </div>
      </div>
    </div>
  )
}
