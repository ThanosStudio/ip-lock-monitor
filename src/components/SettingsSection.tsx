import { enable, disable } from '@tauri-apps/plugin-autostart'
import { useCallback } from 'react'
import { saveConfig } from '../store/config'

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <div>
        <div style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 9, color: '#94a3b8' }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 18,
          background: checked ? '#059669' : '#e2e8f0',
          borderRadius: 9, border: 'none', cursor: 'pointer',
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 14, height: 14, background: '#fff', borderRadius: '50%',
          position: 'absolute', top: 2,
          ...(checked ? { right: 2 } : { left: 2 }),
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
        }} />
      </button>
    </div>
  )
}

interface Props {
  lockedIp: string
  isMonitoring: boolean
  launchAtLogin: boolean
  strongAlertEnabled: boolean
  onLaunchAtLoginChange: (v: boolean) => void
  onStrongAlertChange: (v: boolean) => void
  lockedIpInput?: string
  onLockedIpInputChange?: (v: string) => void
  onLockedIpConfirm?: () => void
  lockedIpError?: boolean
}

export function SettingsSection({
  lockedIp,
  isMonitoring,
  launchAtLogin,
  strongAlertEnabled,
  onLaunchAtLoginChange,
  onStrongAlertChange,
  lockedIpInput,
  onLockedIpInputChange,
  onLockedIpConfirm,
  lockedIpError,
}: Props) {
  const handleLaunchAtLoginChange = useCallback(
    async (enabled: boolean) => {
      try {
        if (enabled) await enable()
        else await disable()
        await saveConfig({ launchAtLogin: enabled })
        onLaunchAtLoginChange(enabled)
      } catch (err) {
        console.error('Failed to toggle autostart:', err)
      }
    },
    [onLaunchAtLoginChange],
  )

  const handleStrongAlertChange = useCallback(
    async (enabled: boolean) => {
      await saveConfig({ strongAlertEnabled: enabled })
      onStrongAlertChange(enabled)
    },
    [onStrongAlertChange],
  )

  return (
    <div>
      {/* Locked IP */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
          🔒 锁定 IP{isMonitoring ? '（监控中不可修改）' : '（回车确认）'}
        </div>
        {isMonitoring ? (
          <div style={{
            background: '#fef9c3', border: '1px solid #fde68a',
            borderRadius: 6, padding: '5px 8px',
            fontSize: 11, fontFamily: 'monospace', color: '#78350f',
          }}>
            {lockedIp}
          </div>
        ) : (
          <input
            value={lockedIpInput ?? ''}
            onChange={(e) => onLockedIpInputChange?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLockedIpConfirm?.()}
            placeholder="输入要监控的 IP 地址..."
            style={{
              width: '100%', boxSizing: 'border-box',
              border: `1px solid ${lockedIpError ? '#f87171' : '#fcd34d'}`,
              borderRadius: 6, padding: '5px 8px',
              fontSize: 11, fontFamily: 'monospace',
              background: lockedIpError ? '#fef2f2' : '#fffbeb',
              outline: 'none',
            }}
          />
        )}
      </div>

      {/* Settings toggles */}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>设置</div>
        <Toggle
          label="开机自动启动"
          description="随系统启动常驻菜单栏"
          checked={launchAtLogin}
          onChange={handleLaunchAtLoginChange}
        />
        <div style={{ height: 1, background: '#f0f0f0', margin: '2px 0' }} />
        <Toggle
          label="IP 变更强提醒弹窗"
          description="IP 变更时在屏幕居中弹出警告窗口"
          checked={strongAlertEnabled}
          onChange={handleStrongAlertChange}
        />
      </div>
    </div>
  )
}
