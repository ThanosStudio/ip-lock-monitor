import { ArrowRight } from 'lucide-react'

interface Props {
  lockedIp: string
  currentIp: string
  detectedAt?: string
}

export function IpComparison({ lockedIp, currentIp, detectedAt }: Props) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] font-bold text-red-800 uppercase tracking-wide">
          IP 变更对比{detectedAt ? `（${detectedAt}）` : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-center py-1.5 px-1 bg-green-100 rounded-lg">
          <div className="text-[8px] text-green-700 font-semibold mb-0.5">锁定 IP</div>
          <div className="text-[11px] font-mono font-bold text-green-800">{lockedIp}</div>
        </div>
        <ArrowRight className="text-red-500 flex-shrink-0" size={16} strokeWidth={2.5} />
        <div className="flex-1 text-center py-1.5 px-1 bg-red-100 rounded-lg">
          <div className="text-[8px] text-red-700 font-semibold mb-0.5">当前 IP</div>
          <div className="text-[11px] font-mono font-bold text-red-800">{currentIp}</div>
        </div>
      </div>
    </div>
  )
}
