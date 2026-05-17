import type { ReactNode } from 'react'
import { Building2, Globe, MapPin, Clock } from 'lucide-react'
import { t } from '../i18n'
import type { AppLanguage, IpInfo } from '../types'

interface CellProps {
  label: string
  value: string
  icon: ReactNode
  isAlert?: boolean
}

function Cell({ label, value, icon, isAlert }: CellProps) {
  return (
    <div className={`rounded-lg p-2 ${isAlert ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[7.5px] uppercase tracking-[0.06em] font-semibold text-slate-400">{label}</span>
      </div>
      <div className={`text-[10.5px] font-medium truncate ${isAlert ? 'text-red-600' : 'text-slate-800'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

interface Props {
  info: IpInfo
  isAlert?: boolean
  language: AppLanguage
}

export function IpInfoGrid({ info, isAlert, language }: Props) {
  const location = [info.city, info.region].filter(Boolean).join(', ') || t(language, 'unknown')
  const iconCls = `flex-shrink-0 ${isAlert ? 'text-red-400' : 'text-slate-400'}`
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Cell label={t(language, 'provider')} value={info.organization} isAlert={isAlert} icon={<Building2 className={iconCls} size={8} strokeWidth={2.5} />} />
      <Cell label={t(language, 'organization')} value={info.asn_organization} isAlert={isAlert} icon={<Globe className={iconCls} size={8} strokeWidth={2.5} />} />
      <Cell label={t(language, 'location')} value={location} isAlert={isAlert} icon={<MapPin className={iconCls} size={8} strokeWidth={2.5} />} />
      <Cell label={t(language, 'timezone')} value={info.timezone} isAlert={isAlert} icon={<Clock className={iconCls} size={8} strokeWidth={2.5} />} />
    </div>
  )
}
