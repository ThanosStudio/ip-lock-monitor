import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ShieldCheck, ShieldAlert, Pin, RefreshCw, Play, Square, RotateCcw, LogOut } from 'lucide-react'
import type { AppConfig } from '../types'
import { loadConfig, isValidIp } from '../store/config'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'
import { SettingsSection } from './SettingsSection'

const BANNER_CFG = {
  idle: {
    gradient: 'linear-gradient(135deg, #1e293b, #0f172a)',
    shieldBg: 'rgba(255,255,255,0.08)',
    shieldGlow: 'none',
    title: 'IP 监控',
  },
  safe: {
    gradient: 'linear-gradient(135deg, #1e293b, #0f172a)',
    shieldBg: 'linear-gradient(135deg, #10b981, #059669)',
    shieldGlow: '0 2px 10px rgba(16,185,129,0.45)',
    title: 'IP 安全',
  },
  alert: {
    gradient: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
    shieldBg: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    shieldGlow: '0 2px 10px rgba(220,38,38,0.45)',
    title: 'IP 变更',
  },
}

function BannerShield({ status }: { status: 'idle' | 'safe' | 'alert' }) {
  if (status === 'safe') return <ShieldCheck size={18} strokeWidth={2.5} className="text-white" />
  if (status === 'alert') return <ShieldAlert size={18} strokeWidth={2.5} className="text-white" />
  return <Shield size={18} strokeWidth={2.5} className="text-white/40" />
}

export function MainPanel() {
  const { state, startMonitoring, stopMonitoring, refreshCheck } = useMonitor()
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
  const cfg = BANNER_CFG[state.status]
  const info = state.currentIpInfo

  return (
    <div
      className="w-full min-h-full select-none bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
    >
      {/* ── Banner ── */}
      <div style={{ background: cfg.gradient }} className="px-3.5 py-[11px] flex items-center gap-2.5">
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.shieldBg, boxShadow: cfg.shieldGlow }}
        >
          <BannerShield status={state.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-slate-100 tracking-[-0.02em] leading-none">
            {cfg.title}
          </div>
          <div className="mt-0.5 text-[9px] text-white/40">
            {state.status === 'idle' && '配置锁定 IP，开始持续监控'}
            {state.status === 'safe' && (state.isChecking ? '正在检查...' : `下次检查 ${state.countdown}s 后`)}
            {state.status === 'alert' && `检测于 ${detectedAt}`}
          </div>
        </div>
        <AnimatePresence>
          {state.status === 'safe' && (
            <motion.span
              key="safe"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-[9px] font-bold text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 rounded-full px-2 py-0.5 whitespace-nowrap"
            >
              匹配 ✓
            </motion.span>
          )}
          {state.status === 'alert' && (
            <motion.span
              key="alert"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-[9px] font-bold text-red-300 bg-red-950/30 border border-red-800/40 rounded-full px-2 py-0.5 whitespace-nowrap"
            >
              变更!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Body ── */}
      <div className="px-3 pt-2.5 pb-3">

        {/* IP card */}
        {info && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-2.5 mb-2 ${
              state.status === 'alert'
                ? 'bg-red-50 border border-red-200'
                : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-[8px] text-slate-400 uppercase tracking-[0.07em] font-semibold pt-px">当前 IP</span>
              <div className="flex items-center gap-1">
                {!isMonitoring && (
                  <button
                    onClick={() => { setLockedIpInput(info.ip); setLockedIpError(false) }}
                    className="flex items-center gap-[3px] h-[20px] px-[7px] bg-blue-50 text-blue-500 border border-blue-200 rounded-[6px] text-[9px] font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Pin size={9} strokeWidth={2.5} />
                    填入
                  </button>
                )}
                <button
                  onClick={refreshCheck}
                  disabled={state.isChecking}
                  className="flex items-center gap-[3px] h-[20px] px-[7px] bg-slate-100 text-slate-500 border border-slate-200 rounded-[6px] text-[9px] font-semibold hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <motion.span
                    animate={state.isChecking ? { rotate: 360 } : { rotate: 0 }}
                    transition={state.isChecking ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
                    className="flex items-center"
                  >
                    <RefreshCw size={9} strokeWidth={2.5} />
                  </motion.span>
                  刷新
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CountryFlag countryCode={info.country_code} size={18} />
              <div>
                <div className={`text-[17px] font-mono font-bold tracking-[0.01em] leading-none ${
                  state.status === 'alert' ? 'text-red-600' : 'text-slate-900'
                }`}>
                  {info.ip}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-[3px]">
                  {[info.country, info.city].filter(Boolean).join(' · ')}
                  {info.asn ? ` · AS${info.asn}` : ''}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {!info && !state.error && (
          <div className="text-center py-2.5 text-[10px] text-slate-400">
            正在检测当前 IP…
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-1.5">
            {state.error}
          </div>
        )}

        {/* Alert: IP comparison */}
        {state.status === 'alert' && info && (
          <IpComparison lockedIp={state.lockedIp} currentIp={info.ip} detectedAt={detectedAt} />
        )}

        {/* Info grid */}
        {info && (
          <div className="mb-2">
            <IpInfoGrid info={info} isAlert={state.status === 'alert'} />
          </div>
        )}

        {/* Settings */}
        <div className="border-t border-slate-100 pt-2">
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
        <div className="flex gap-1.5 mt-2">
          {state.status === 'idle' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white rounded-lg py-2 text-[12px] font-bold shadow-[0_2px_8px_rgba(5,150,105,0.35)] hover:bg-emerald-700 transition-colors"
            >
              <Play size={12} strokeWidth={2.5} />
              开始监控
            </motion.button>
          )}
          {state.status === 'safe' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={stopMonitoring}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white rounded-lg py-2 text-[12px] font-bold shadow-[0_2px_8px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-colors"
            >
              <Square size={12} strokeWidth={2.5} />
              停止监控
            </motion.button>
          )}
          {state.status === 'alert' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={stopMonitoring}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white rounded-lg py-2 text-[12px] font-bold shadow-[0_2px_8px_rgba(220,38,38,0.3)] hover:bg-red-700 transition-colors"
            >
              <RotateCcw size={12} strokeWidth={2.5} />
              重置监控
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleQuit}
            className="flex items-center justify-center gap-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg px-2.5 py-2 text-[10px] hover:bg-slate-100 transition-colors"
          >
            <LogOut size={11} strokeWidth={2.5} />
            退出
          </motion.button>
        </div>

      </div>
    </div>
  )
}
