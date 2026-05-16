interface Props {
  lockedIp: string
  currentIp: string
  detectedAt?: string
}

export function IpComparison({ lockedIp, currentIp, detectedAt }: Props) {
  return (
    <div style={{
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
        ⚠️ IP 变更对比{detectedAt ? `（${detectedAt}）` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: '#dcfce7', borderRadius: 6 }}>
          <div style={{ fontSize: 9, color: '#166534', marginBottom: 2 }}>锁定 IP</div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#166534', fontWeight: 700 }}>
            {lockedIp}
          </div>
        </div>
        <div style={{ color: '#dc2626', fontSize: 18, fontWeight: 900 }}>≠</div>
        <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: '#fee2e2', borderRadius: 6 }}>
          <div style={{ fontSize: 9, color: '#991b1b', marginBottom: 2 }}>当前 IP</div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#991b1b', fontWeight: 700 }}>
            {currentIp}
          </div>
        </div>
      </div>
    </div>
  )
}
