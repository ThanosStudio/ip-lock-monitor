import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ShieldAlert, X, RotateCcw } from 'lucide-react'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'

export function AlertModal() {
  const { state } = useMonitor()
  const win = useRef(getCurrentWebviewWindow())
  const [detectedAt, setDetectedAt] = useState(
    new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  )

  useEffect(() => {
    if (state.status === 'alert') {
      setDetectedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }
  }, [state.status])

  const startDrag = () => { win.current.startDragging() }

  const handleClose = async () => {
    await win.current.hide()
  }

  const handleStopAndClose = async () => {
    await emit('alert-stop-monitoring', null)
    await handleClose()
  }

  const info = state.currentIpInfo

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="w-full select-none"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
    >
      {/* Title bar */}
      <div
        onMouseDown={startDrag}
        className="bg-gray-800 px-3 py-2 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-1.5 text-[9.5px] text-gray-500">
          <AlertTriangle size={10} strokeWidth={2.5} className="text-red-500" />
          IP 泄露警告
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          className="w-5 h-5 rounded-[5px] bg-white/10 flex items-center justify-center text-gray-500 hover:bg-white/20 hover:text-gray-300 transition-colors"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      </div>

      {/* Red banner */}
      <div
        onMouseDown={startDrag}
        className="px-4 py-4 text-center cursor-move"
        style={{ background: 'linear-gradient(135deg, #7f1d1d, #dc2626)' }}
      >
        <div className="w-12 h-12 rounded-[14px] bg-white/15 flex items-center justify-center mx-auto mb-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
          <ShieldAlert size={26} strokeWidth={2} className="text-white" />
        </div>
        <div className="text-[15px] font-extrabold text-white mb-0.5">IP 已变更！可能泄露</div>
        <div className="text-[10px] text-white/70">检测时间：{detectedAt}</div>
        <div className="mt-2 text-[9px] text-white/55 bg-black/20 rounded-[5px] px-2.5 py-[3px] inline-block">
          检测已停止，请处理后重新启动监控
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3 bg-red-50">
        {info && (
          <>
            <IpComparison lockedIp={state.lockedIp} currentIp={info.ip} />

            <div className="flex items-center gap-2 mb-2">
              <CountryFlag countryCode={info.country_code} size={20} />
              <div>
                <div className="font-bold text-[12px] text-gray-900">{info.country || 'Unknown'}</div>
                <div className="text-[10px] text-slate-500">
                  {[info.city, info.region].filter(Boolean).join(', ')}
                  {info.asn ? ` · AS${info.asn}` : ''}
                </div>
              </div>
            </div>

            <div className="mb-2.5">
              <IpInfoGrid info={info} isAlert />
            </div>
          </>
        )}

        <div className="flex gap-1.5">
          <button
            onClick={handleStopAndClose}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white border-none rounded-lg py-2.5 text-[12px] font-bold hover:bg-red-700 transition-colors"
          >
            <RotateCcw size={12} strokeWidth={2.5} />
            重置监控并关闭
          </button>
          <button
            onClick={handleClose}
            className="bg-slate-100 text-gray-700 border-none rounded-lg px-3 py-2.5 text-[11px] hover:bg-slate-200 transition-colors"
          >
            关闭
          </button>
        </div>

        <div className="mt-1.5 text-center text-[9px] text-slate-400">
          可在设置中关闭强提醒弹窗
        </div>
      </div>
    </motion.div>
  )
}
