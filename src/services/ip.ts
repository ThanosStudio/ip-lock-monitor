import { fetch } from '@tauri-apps/plugin-http'
import type { IpInfo } from '../types'

export interface ServiceConfig {
  url: string
  mapping: (data: Record<string, unknown>) => IpInfo
}

export function mapServiceResponse(
  data: Record<string, unknown>,
  mapping: ServiceConfig['mapping'],
): IpInfo {
  return mapping(data)
}

export const SERVICE_CONFIGS: ServiceConfig[] = [
  {
    url: 'https://api.ip.sb/geoip',
    mapping: (d) => ({
      ip: String(d.ip ?? ''),
      country_code: String(d.country_code ?? ''),
      country: String(d.country ?? ''),
      region: String(d.region ?? ''),
      city: String(d.city ?? ''),
      organization: String(d.organization ?? d.isp ?? ''),
      asn: Number(d.asn ?? 0),
      asn_organization: String(d.asn_organization ?? ''),
      longitude: Number(d.longitude ?? 0),
      latitude: Number(d.latitude ?? 0),
      timezone: String(d.timezone ?? ''),
    }),
  },
  {
    url: 'https://ipapi.co/json',
    mapping: (d) => ({
      ip: String(d.ip ?? ''),
      country_code: String(d.country_code ?? ''),
      country: String(d.country_name ?? ''),
      region: String(d.region ?? ''),
      city: String(d.city ?? ''),
      organization: String(d.org ?? ''),
      asn: d.asn ? parseInt(String(d.asn).replace('AS', '')) : 0,
      asn_organization: String(d.org ?? ''),
      longitude: Number(d.longitude ?? 0),
      latitude: Number(d.latitude ?? 0),
      timezone: String(d.timezone ?? ''),
    }),
  },
  {
    url: 'https://api.ipapi.is/',
    mapping: (d) => {
      const loc = (d.location ?? {}) as Record<string, unknown>
      const asn = (d.asn ?? {}) as Record<string, unknown>
      const company = (d.company ?? {}) as Record<string, unknown>
      return {
        ip: String(d.ip ?? ''),
        country_code: String(loc.country_code ?? ''),
        country: String(loc.country ?? ''),
        region: String(loc.state ?? ''),
        city: String(loc.city ?? ''),
        organization: String(asn.org ?? company.name ?? ''),
        asn: Number(asn.asn ?? 0),
        asn_organization: String(asn.org ?? ''),
        longitude: Number(loc.longitude ?? 0),
        latitude: Number(loc.latitude ?? 0),
        timezone: String(loc.timezone ?? ''),
      }
    },
  },
  {
    url: 'https://ipwho.is/',
    mapping: (d) => {
      const conn = (d.connection ?? {}) as Record<string, unknown>
      const tz = (d.timezone ?? {}) as Record<string, unknown>
      return {
        ip: String(d.ip ?? ''),
        country_code: String(d.country_code ?? ''),
        country: String(d.country ?? ''),
        region: String(d.region ?? ''),
        city: String(d.city ?? ''),
        organization: String(conn.org ?? conn.isp ?? ''),
        asn: Number(conn.asn ?? 0),
        asn_organization: String(conn.isp ?? ''),
        longitude: Number(d.longitude ?? 0),
        latitude: Number(d.latitude ?? 0),
        timezone: String(tz.id ?? ''),
      }
    },
  },
  {
    url: 'https://ip.api.skk.moe/cf-geoip',
    mapping: (d) => ({
      ip: String(d.ip ?? ''),
      country_code: String(d.country ?? ''),
      country: String(d.country ?? ''),
      region: String(d.region ?? ''),
      city: String(d.city ?? ''),
      organization: String(d.asOrg ?? ''),
      asn: Number(d.asn ?? 0),
      asn_organization: String(d.asOrg ?? ''),
      longitude: Number(d.longitude ?? 0),
      latitude: Number(d.latitude ?? 0),
      timezone: String(d.timezone ?? ''),
    }),
  },
  {
    url: 'https://get.geojs.io/v1/ip/geo.json',
    mapping: (d) => ({
      ip: String(d.ip ?? ''),
      country_code: String(d.country_code ?? ''),
      country: String(d.country ?? ''),
      region: String(d.region ?? ''),
      city: String(d.city ?? ''),
      organization: String(d.organization_name ?? ''),
      asn: Number(d.asn ?? 0),
      asn_organization: String(d.organization_name ?? ''),
      longitude: Number(d.longitude ?? 0),
      latitude: Number(d.latitude ?? 0),
      timezone: String(d.timezone ?? ''),
    }),
  },
]

const SERVICE_TIMEOUT_MS = 5000
const MAX_RETRIES = 2

async function fetchWithTimeout(url: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    signal,
    connectTimeout: SERVICE_TIMEOUT_MS,
    headers: { 'User-Agent': 'ip-monitor/0.1.0' },
  })
}

async function tryService(service: ServiceConfig): Promise<IpInfo> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SERVICE_TIMEOUT_MS)
  try {
    let lastError: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetchWithTimeout(service.url, controller.signal)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as Record<string, unknown>
        if (!data.ip) throw new Error('No ip field in response')
        return mapServiceResponse(data, service.mapping)
      } catch (err) {
        lastError = err
        if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000))
      }
    }
    throw lastError
  } finally {
    clearTimeout(timer)
  }
}

export async function getIpInfo(): Promise<IpInfo> {
  const shuffled = [...SERVICE_CONFIGS].sort(() => Math.random() - 0.5)
  let lastError: unknown
  for (const service of shuffled) {
    try {
      return await tryService(service)
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(`All IP services failed: ${lastError}`)
}
