import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { emit, listen } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ShieldAlert, X, RotateCcw } from 'lucide-react'
import { useMonitor } from '../hooks/useMonitor'
import { formatGuardDuration } from '../hooks/monitorStats'
import { formatAppTime, t } from '../i18n'
import { loadConfig } from '../store/config'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'
import type { AppLanguage, MonitorAlertSnapshot } from '../types'

const ALERT_WINDOW_WIDTH = 380
const ALERT_WINDOW_MIN_HEIGHT = 540
const ALERT_WINDOW_MAX_SCREEN_PADDING = 48
const ALERT_BODY_VERTICAL_PADDING = 24

export function AlertModal() {
  const { state } = useMonitor()
  const win = useRef(getCurrentWebviewWindow())
  const titleBarRef = useRef<HTMLDivElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  const bodyContentRef = useRef<HTMLDivElement>(null)
  const [detectedAt, setDetectedAt] = useState(
    formatAppTime('en', new Date()),
  )
  const [alertSnapshot, setAlertSnapshot] = useState<MonitorAlertSnapshot | null>(null)
  const [language, setLanguage] = useState<AppLanguage>('en')
  const alertInfo = alertSnapshot?.currentIpInfo ?? state.currentIpInfo
  const alertLockedIp = alertSnapshot?.lockedIp ?? state.lockedIp

  useEffect(() => {
    loadConfig().then((config) => setLanguage(config.language))
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | null = null
    listen<MonitorAlertSnapshot>('monitor-alert-snapshot', ({ payload }) => {
      setAlertSnapshot(payload)
      setDetectedAt(payload.detectedAt)
    }).then((unlisten) => {
      cleanup = unlisten
    })
    return () => { cleanup?.() }
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | null = null
    listen<AppLanguage>('language-changed', ({ payload }) => {
      setLanguage(payload)
    }).then((unlisten) => {
      cleanup = unlisten
    })
    return () => { cleanup?.() }
  }, [])

  useEffect(() => {
    let frameId: number | null = null

    const resizeToContent = () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        frameId = null
        const titleBarHeight = titleBarRef.current?.offsetHeight ?? 0
        const bannerHeight = bannerRef.current?.offsetHeight ?? 0
        const bodyContentHeight = bodyContentRef.current?.scrollHeight ?? 0
        if (!titleBarHeight || !bannerHeight || !bodyContentHeight) return

        const maxHeight = Math.max(
          ALERT_WINDOW_MIN_HEIGHT,
          window.screen.availHeight - ALERT_WINDOW_MAX_SCREEN_PADDING,
        )
        const contentHeight = titleBarHeight + bannerHeight + bodyContentHeight + ALERT_BODY_VERTICAL_PADDING
        const nextHeight = Math.min(Math.max(Math.ceil(contentHeight), ALERT_WINDOW_MIN_HEIGHT), maxHeight)

        win.current.setSize(new LogicalSize(ALERT_WINDOW_WIDTH, nextHeight)).catch((error) => {
          console.warn('Failed to resize alert window to fit content.', error)
        })
      })
    }

    const observer = new ResizeObserver(resizeToContent)
    if (titleBarRef.current) observer.observe(titleBarRef.current)
    if (bannerRef.current) observer.observe(bannerRef.current)
    if (bodyContentRef.current) observer.observe(bodyContentRef.current)
    window.addEventListener('resize', resizeToContent)
    resizeToContent()

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      observer.disconnect()
      window.removeEventListener('resize', resizeToContent)
    }
  }, [alertSnapshot, alertInfo])

  useEffect(() => {
    if (state.status === 'alert') {
      setDetectedAt(formatAppTime(language, new Date()))
    }
  }, [language, state.status])

  const startDrag = () => { win.current.startDragging() }

  const handleClose = async () => {
    await win.current.hide()
  }

  const handleStopAndClose = async () => {
    await emit('alert-stop-monitoring', null)
    await handleClose()
  }

  const checkCount = alertSnapshot?.checkCount ?? state.checkCount
  const guardDurationMs = alertSnapshot?.guardDurationMs
    ?? (state.monitoringStartedAt ? Date.now() - state.monitoringStartedAt : 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="w-full h-full flex flex-col select-none rounded-xl overflow-hidden bg-red-50"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
    >
      {/* Title bar */}
      <div
        ref={titleBarRef}
        onMouseDown={startDrag}
        className="bg-gray-800 px-3 py-2 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-1.5 text-[9.5px] text-gray-500">
          <AlertTriangle size={10} strokeWidth={2.5} className="text-red-500" />
          {t(language, 'alertTitle')}
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          className="w-5 h-5 rounded-[5px] bg-white/10 flex items-center justify-center text-gray-500 hover:bg-white/20 hover:text-gray-300 transition-colors cursor-pointer"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      </div>

      {/* Red banner */}
      <div
        ref={bannerRef}
        onMouseDown={startDrag}
        className="px-4 py-4 text-center cursor-move"
        style={{ background: 'linear-gradient(135deg, #7f1d1d, #dc2626)' }}
      >
        <div className="w-12 h-12 rounded-[14px] bg-white/15 flex items-center justify-center mx-auto mb-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
          <ShieldAlert size={26} strokeWidth={2} className="text-white" />
        </div>
        <div className="text-[15px] font-extrabold text-white mb-0.5">{t(language, 'alertHeadline')}</div>
        <div className="text-[10px] text-white/70">{t(language, 'detectedTime', detectedAt)}</div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-left">
          <div className="rounded-[7px] bg-white/10 border border-white/10 px-2 py-1.5">
            <div className="text-[8px] text-white/55">{t(language, 'checked')}</div>
            <div className="mt-0.5 text-[12px] font-extrabold text-white">
              {t(language, 'checksUnit', checkCount)}
            </div>
          </div>
          <div className="rounded-[7px] bg-white/10 border border-white/10 px-2 py-1.5">
            <div className="text-[8px] text-white/55">{t(language, 'guarded')}</div>
            <div className="mt-0.5 text-[12px] font-extrabold text-white">
              {formatGuardDuration(guardDurationMs, language)}
            </div>
          </div>
        </div>
        <div className="mt-2 text-[9px] text-white/55 bg-black/20 rounded-[5px] px-2.5 py-[3px] inline-block">
          {t(language, 'alertStopped')}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-3.5 py-3 bg-red-50">
        <div ref={bodyContentRef}>
          {alertInfo && (
            <>
              <IpComparison lockedIp={alertLockedIp} currentIp={alertInfo.ip} language={language} />

              <div className="flex items-center gap-2 mb-2">
                <CountryFlag countryCode={alertInfo.country_code} size={20} />
                <div>
                  <div className="font-bold text-[12px] text-gray-900">{alertInfo.country || t(language, 'unknown')}</div>
                  <div className="text-[10px] text-slate-500">
                    {[alertInfo.city, alertInfo.region].filter(Boolean).join(', ')}
                    {alertInfo.asn ? ` · AS${alertInfo.asn}` : ''}
                  </div>
                </div>
              </div>

              <div className="mb-2.5">
                <IpInfoGrid info={alertInfo} isAlert language={language} />
              </div>
            </>
          )}

          <div className="flex">
            <button
              onClick={handleStopAndClose}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white border-none rounded-lg py-2.5 text-[12px] font-bold hover:bg-red-700 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} strokeWidth={2.5} />
              {t(language, 'resetAndClose')}
            </button>
          </div>

          <div className="mt-1.5 text-center text-[9px] text-slate-400">
            {t(language, 'strongAlertTip')}
          </div>
          <div className="mt-0.5 text-center text-[8px] font-medium uppercase tracking-[0.08em] text-slate-300">
            {t(language, 'poweredByAi')}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
