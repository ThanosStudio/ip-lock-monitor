import type { IpInfo } from '../types'

interface Props {
  info: IpInfo
  isAlert?: boolean
}

function Cell({ label, value, isAlert }: { label: string; value: string; isAlert?: boolean }) {
  return (
    <div style={{
      background: isAlert ? '#fff' : '#f8fafc',
      border: isAlert ? '1px solid #fee2e2' : 'none',
      borderRadius: 6,
      padding: '6px 8px',
    }}>
      <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#1e293b', wordBreak: 'break-word' }}>
        {value || 'Unknown'}
      </div>
    </div>
  )
}

export function IpInfoGrid({ info, isAlert }: Props) {
  const location = [info.city, info.region].filter(Boolean).join(', ') || 'Unknown'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
      <Cell label="服务商" value={info.organization} isAlert={isAlert} />
      <Cell label="组织" value={info.asn_organization} isAlert={isAlert} />
      <Cell label="位置" value={location} isAlert={isAlert} />
      <Cell label="时区" value={info.timezone} isAlert={isAlert} />
    </div>
  )
}
