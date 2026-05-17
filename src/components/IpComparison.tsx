import { ArrowRight } from 'lucide-react'
import { t } from '../i18n'
import type { AppLanguage } from '../types'

interface Props {
  lockedIp: string
  currentIp: string
  detectedAt?: string
  language: AppLanguage
}

export function IpComparison({ lockedIp, currentIp, detectedAt, language }: Props) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] font-bold text-red-800 uppercase tracking-wide">
          {t(language, 'ipChangeComparison', detectedAt ?? '')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-center py-1.5 px-1 bg-green-100 rounded-lg">
          <div className="text-[8px] text-green-700 font-semibold mb-0.5">{t(language, 'lockedIp')}</div>
          <div className="text-[11px] font-mono font-bold text-green-800">{lockedIp}</div>
        </div>
        <ArrowRight className="text-red-500 flex-shrink-0" size={16} strokeWidth={2.5} />
        <div className="flex-1 text-center py-1.5 px-1 bg-red-100 rounded-lg">
          <div className="text-[8px] text-red-700 font-semibold mb-0.5">{t(language, 'currentIp')}</div>
          <div className="text-[11px] font-mono font-bold text-red-800">{currentIp}</div>
        </div>
      </div>
    </div>
  )
}
