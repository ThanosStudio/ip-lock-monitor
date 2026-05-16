import { enable, disable } from '@tauri-apps/plugin-autostart'
import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Lock, Monitor, Bell } from 'lucide-react'
import { saveConfig } from '../store/config'

interface ToggleProps {
  label: string
  description: string
  icon: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, description, icon, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-[5px]">
      <div className="flex items-center gap-2">
        <div className="w-[18px] h-[18px] rounded-[5px] bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-[11px] font-medium text-gray-700">{label}</div>
          <div className="text-[8.5px] text-slate-400 mt-px">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-8 h-[18px] rounded-full transition-colors duration-200 focus:outline-none cursor-pointer"
        style={{ background: checked ? '#059669' : '#e2e8f0' }}
      >
        <motion.div
          className="absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm"
          animate={{ x: checked ? 14 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
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
      <div className="mb-2">
        <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500 mb-1.5">
          <Lock size={10} strokeWidth={2.5} />
          锁定 IP
          <span className="font-normal text-slate-400">
            {isMonitoring ? '（监控中不可修改）' : '（回车确认）'}
          </span>
        </div>
        {isMonitoring ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-[5px] text-[11px] font-mono text-amber-900">
            {lockedIp}
          </div>
        ) : (
          <input
            value={lockedIpInput ?? ''}
            onChange={(e) => onLockedIpInputChange?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLockedIpConfirm?.()}
            placeholder="输入要监控的 IP 地址..."
            className={`w-full border rounded-lg px-2.5 py-[5px] text-[11px] font-mono outline-none focus:ring-2 transition-all ${
              lockedIpError
                ? 'bg-red-50 border-red-400 text-red-900 focus:ring-red-300'
                : 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-amber-300'
            }`}
          />
        )}
      </div>

      {/* Toggles */}
      <div className="border-t border-slate-100 pt-1">
        <Toggle
          label="开机自动启动"
          description="随系统启动常驻菜单栏"
          icon={<Monitor size={10} strokeWidth={2.5} className="text-slate-500" />}
          checked={launchAtLogin}
          onChange={handleLaunchAtLoginChange}
        />
        <div className="h-px bg-slate-100" />
        <Toggle
          label="强提醒模式"
          description="IP 变更时在屏幕居中弹出警告窗口"
          icon={<Bell size={10} strokeWidth={2.5} className="text-slate-500" />}
          checked={strongAlertEnabled}
          onChange={handleStrongAlertChange}
        />
      </div>
    </div>
  )
}
