import { invoke } from '@tauri-apps/api/core'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { listen } from '@tauri-apps/api/event'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getIpInfo } from '../services/ip'
import { loadConfig, saveConfig } from '../store/config'
import type { AppConfig, MonitorState, MonitorStatus } from '../types'

const CHECK_INTERVAL_S = 60
const ALERT_WINDOW_WIDTH = 380
const ALERT_WINDOW_HEIGHT = 540

const INITIAL_STATE: MonitorState = {
  status: 'idle',
  currentIpInfo: null,
  lockedIp: '',
  countdown: CHECK_INTERVAL_S,
  isChecking: false,
  error: null,
}

async function syncTray(status: MonitorStatus, isMonitoring: boolean) {
  const iconStatus = status === 'safe' ? 'green' : status === 'alert' ? 'red' : 'gray'
  await invoke('update_tray_icon', { status: iconStatus })
  await invoke('update_tray_menu', { isMonitoring })
}

async function triggerAlert(lockedIp: string, currentIp: string, config: AppConfig) {
  await sendNotification({
    title: '⚠️ IP 变更警告',
    body: `代理 IP 已从 ${lockedIp} 变更为 ${currentIp}，真实 IP 可能泄露！`,
  })
  if (config.strongAlertEnabled) {
    const alertWin = await WebviewWindow.getByLabel('alert')
    if (alertWin) {
      const visible = await alertWin.isVisible()
      try {
        await alertWin.setSize(new LogicalSize(ALERT_WINDOW_WIDTH, ALERT_WINDOW_HEIGHT))
      } catch (error) {
        console.warn('Failed to size alert window before showing it.', error)
      }
      if (!visible) {
        try {
          await alertWin.center()
        } catch (error) {
          console.warn('Failed to center alert window before showing it.', error)
        }
        await alertWin.show()
        await alertWin.setFocus()
      } else {
        await alertWin.setFocus()
      }
    }
  }
}

export function useMonitor() {
  const [state, setState] = useState<MonitorState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateRef = useRef<MonitorState>(INITIAL_STATE)
  // Signals in-flight doCheck to discard its result (set by stopMonitoring)
  const checkCancelledRef = useRef(false)

  // Keep ref in sync so interval callback reads fresh state
  stateRef.current = state

  // Load config and current IP on mount
  useEffect(() => {
    loadConfig().then((config) => {
      setState((s) => ({ ...s, lockedIp: config.lockedIp }))
    })
    getIpInfo()
      .then((info) => setState((s) => ({ ...s, currentIpInfo: info })))
      .catch(() => {})
  }, [])

  // Returns true if monitoring should continue, false if alert triggered or cancelled
  const doCheck = useCallback(async (lockedIpOverride?: string): Promise<boolean> => {
    checkCancelledRef.current = false
    setState((s) => ({ ...s, isChecking: true, countdown: 0, error: null }))
    try {
      const info = await getIpInfo()
      if (checkCancelledRef.current) return false
      const lockedIp = lockedIpOverride ?? stateRef.current.lockedIp
      const isMatch = info.ip === lockedIp
      const newStatus: MonitorStatus = isMatch ? 'safe' : 'alert'
      setState((s) => ({
        ...s,
        currentIpInfo: info,
        status: newStatus,
        isChecking: false,
        countdown: CHECK_INTERVAL_S,
        error: null,
      }))
      if (!isMatch) {
        // Stop further polling immediately
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        await syncTray('alert', false)
        const config = await loadConfig()
        await triggerAlert(lockedIp, info.ip, config)
        return false
      }
      await syncTray('safe', true)
      return true
    } catch {
      if (checkCancelledRef.current) return false
      setState((s) => ({
        ...s,
        isChecking: false,
        countdown: CHECK_INTERVAL_S,
        error: '网络错误，无法检测 IP',
      }))
      return true // keep interval running so it retries
    }
  }, [])

  const startMonitoring = useCallback(
    async (lockedIp: string) => {
      checkCancelledRef.current = false
      await saveConfig({ lockedIp })
      setState((s) => ({
        ...s,
        lockedIp,
        status: 'safe',
        countdown: CHECK_INTERVAL_S,
        error: null,
      }))
      await syncTray('safe', true)

      // Immediate first check — pass lockedIp directly; stateRef not yet updated (batched setState)
      const ok = await doCheck(lockedIp)

      // Only start interval if first check passed and monitoring was not cancelled
      if (ok && !checkCancelledRef.current) {
        intervalRef.current = setInterval(() => {
          setState((s) => {
            const next = s.countdown - 1
            if (next <= 0 && !s.isChecking) {
              doCheck()
              return { ...s, countdown: 0 }
            }
            return { ...s, countdown: Math.max(0, next) }
          })
        }, 1000)
      }
    },
    [doCheck],
  )

  const stopMonitoring = useCallback(async () => {
    checkCancelledRef.current = true
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // Preserve currentIpInfo and lockedIp so the panel doesn't show the loading spinner
    setState((s) => ({
      ...INITIAL_STATE,
      currentIpInfo: s.currentIpInfo,
      lockedIp: s.lockedIp,
    }))
    await syncTray('idle', false)
    const alertWin = await WebviewWindow.getByLabel('alert')
    if (alertWin) await alertWin.hide()
  }, [])

  // Listen for right-click tray menu "toggle_monitor" event
  useEffect(() => {
    let cleanup: (() => void) | null = null
    listen<void>('tray-toggle-monitor', () => {
      const { status, lockedIp } = stateRef.current
      if (status === 'idle') {
        if (lockedIp) startMonitoring(lockedIp)
      } else {
        stopMonitoring()
      }
    }).then((unlisten) => {
      cleanup = unlisten
    })
    return () => { cleanup?.() }
  }, [startMonitoring, stopMonitoring])

  // Listen for "stop monitoring" command emitted by the alert window
  useEffect(() => {
    let cleanup: (() => void) | null = null
    listen<void>('alert-stop-monitoring', () => {
      stopMonitoring()
    }).then((unlisten) => {
      cleanup = unlisten
    })
    return () => { cleanup?.() }
  }, [stopMonitoring])

  const refreshCheck = useCallback(async () => {
    const { status, lockedIp } = stateRef.current
    if (status !== 'idle' && lockedIp) {
      // Active monitoring: full check with comparison
      await doCheck()
    } else {
      // Idle: just refresh the IP display, no alert triggered
      setState((s) => ({ ...s, isChecking: true, error: null }))
      try {
        const info = await getIpInfo()
        if (!checkCancelledRef.current) {
          setState((s) => ({ ...s, currentIpInfo: info, isChecking: false }))
        }
      } catch {
        if (!checkCancelledRef.current) {
          setState((s) => ({ ...s, isChecking: false, error: '网络错误，无法检测 IP' }))
        }
      }
    }
  }, [doCheck])

  return { state, startMonitoring, stopMonitoring, refreshCheck }
}
