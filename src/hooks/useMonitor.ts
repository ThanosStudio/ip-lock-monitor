import { invoke } from '@tauri-apps/api/core'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getIpInfo } from '../services/ip'
import { loadConfig, saveConfig } from '../store/config'
import type { AppConfig, MonitorState, MonitorStatus } from '../types'

const CHECK_INTERVAL_S = 60

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
      if (!visible) {
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

  const doCheck = useCallback(async (lockedIpOverride?: string) => {
    setState((s) => ({ ...s, isChecking: true, countdown: 0, error: null }))
    try {
      const info = await getIpInfo()
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
      await syncTray(newStatus, true)
      if (!isMatch) {
        const config = await loadConfig()
        await triggerAlert(lockedIp, info.ip, config)
      }
    } catch {
      setState((s) => ({
        ...s,
        isChecking: false,
        countdown: CHECK_INTERVAL_S,
        error: '网络错误，无法检测 IP',
      }))
    }
  }, [])

  const startMonitoring = useCallback(
    async (lockedIp: string) => {
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
      await doCheck(lockedIp)

      // Start countdown + periodic check
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
    },
    [doCheck],
  )

  const stopMonitoring = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setState({ ...INITIAL_STATE })
    await syncTray('idle', false)
    // Close alert window if open
    const alertWin = await WebviewWindow.getByLabel('alert')
    if (alertWin) await alertWin.hide()
  }, [])

  // Listen for right-click tray menu "toggle_monitor" event
  useEffect(() => {
    let cleanup: (() => void) | null = null
    import('@tauri-apps/api/event').then(({ listen }) => {
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
    })
    return () => { cleanup?.() }
  }, [startMonitoring, stopMonitoring])

  return { state, startMonitoring, stopMonitoring }
}
