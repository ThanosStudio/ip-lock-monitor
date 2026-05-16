import type { IpInfo } from '../types'

interface Props {
  info: IpInfo
  isAlert?: boolean
}

function Cell({ label, value, isAlert }: { label: string; value: string; isAlert?: boolean }) {
  return (
    <div style={{
      background: isAlert ? '#fff5f5' : '#f8fafc',
      border: `1px solid ${isAlert ? '#fecaca' : '#e8eef4'}`,
      borderRadius: 6,
      padding: '5px 8px',
    }}>
      <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: isAlert ? '#dc2626' : '#1e293b', wordBreak: 'break-word' }}>
        {value || '—'}
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
