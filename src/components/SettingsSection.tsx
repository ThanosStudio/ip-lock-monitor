import { enable, disable } from '@tauri-apps/plugin-autostart'
import { emit } from '@tauri-apps/api/event'
import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Languages, Lock, Monitor, Bell } from 'lucide-react'
import { saveConfig } from '../store/config'
import { t } from '../i18n'
import type { AppLanguage } from '../types'

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
  language: AppLanguage
  onLaunchAtLoginChange: (v: boolean) => void
  onStrongAlertChange: (v: boolean) => void
  onLanguageChange: (v: AppLanguage) => void
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
  language,
  onLaunchAtLoginChange,
  onStrongAlertChange,
  onLanguageChange,
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

  const handleLanguageChange = useCallback(
    async (nextLanguage: AppLanguage) => {
      await saveConfig({ language: nextLanguage })
      onLanguageChange(nextLanguage)
      await emit('language-changed', nextLanguage)
    },
    [onLanguageChange],
  )

  return (
    <div>
      {/* Locked IP */}
      <div className="mb-2">
        <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500 mb-1.5">
          <Lock size={10} strokeWidth={2.5} />
          {t(language, 'lockedIp')}
          <span className="font-normal text-slate-400">
            {isMonitoring ? t(language, 'lockedIpMonitoringHint') : t(language, 'lockedIpEnterHint')}
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
            placeholder={t(language, 'lockedIpPlaceholder')}
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
        <div className="flex items-center justify-between py-[5px]">
          <div className="flex items-center gap-2">
            <div className="w-[18px] h-[18px] rounded-[5px] bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
              <Languages size={10} strokeWidth={2.5} className="text-slate-500" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-gray-700">{t(language, 'language')}</div>
              <div className="text-[8.5px] text-slate-400 mt-px">{t(language, 'languageDesc')}</div>
            </div>
          </div>
          <div className="flex h-[20px] rounded-[6px] border border-slate-200 bg-slate-50 p-px">
            {(['en', 'zh'] as const).map((option) => (
              <button
                key={option}
                onClick={() => handleLanguageChange(option)}
                className={`px-1.5 rounded-[5px] text-[8.5px] font-semibold transition-colors cursor-pointer ${
                  language === option ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {option === 'en' ? t(language, 'english') : t(language, 'chinese')}
              </button>
            ))}
          </div>
        </div>
        <div className="h-px bg-slate-100" />
        <Toggle
          label={t(language, 'launchAtLogin')}
          description={t(language, 'launchAtLoginDesc')}
          icon={<Monitor size={10} strokeWidth={2.5} className="text-slate-500" />}
          checked={launchAtLogin}
          onChange={handleLaunchAtLoginChange}
        />
        <div className="h-px bg-slate-100" />
        <Toggle
          label={t(language, 'strongAlert')}
          description={t(language, 'strongAlertDesc')}
          icon={<Bell size={10} strokeWidth={2.5} className="text-slate-500" />}
          checked={strongAlertEnabled}
          onChange={handleStrongAlertChange}
        />
      </div>
    </div>
  )
}
