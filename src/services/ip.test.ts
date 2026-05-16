import { describe, it, expect, vi } from 'vitest'
import { SERVICE_CONFIGS, mapServiceResponse } from './ip'

vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }))

describe('mapServiceResponse', () => {
  it('maps ip.sb response correctly', () => {
    const raw = {
      ip: '1.2.3.4', country_code: 'US', country: 'United States',
      region: 'California', city: 'Los Angeles', organization: 'Acme ISP',
      asn: 979, asn_organization: 'NetLab', longitude: -118.27, latitude: 34.05,
      timezone: 'America/Los_Angeles',
    }
    const result = mapServiceResponse(raw, SERVICE_CONFIGS[0].mapping)
    expect(result.ip).toBe('1.2.3.4')
    expect(result.country_code).toBe('US')
    expect(result.asn).toBe(979)
    expect(result.timezone).toBe('America/Los_Angeles')
  })

  it('maps ipapi.co response (ASN as string) correctly', () => {
    const raw = {
      ip: '1.2.3.4', country_code: 'US', country_name: 'United States',
      region: 'California', city: 'Los Angeles', org: 'AS979 NetLab',
      asn: 'AS979', longitude: -118.27, latitude: 34.05, timezone: 'America/Los_Angeles',
    }
    const result = mapServiceResponse(raw, SERVICE_CONFIGS[1].mapping)
    expect(result.ip).toBe('1.2.3.4')
    expect(result.asn).toBe(979)
    expect(result.country).toBe('United States')
  })

  it('returns zero/empty for missing fields', () => {
    const result = mapServiceResponse({}, SERVICE_CONFIGS[0].mapping)
    expect(result.ip).toBe('')
    expect(result.asn).toBe(0)
    expect(result.longitude).toBe(0)
  })
})

describe('SERVICE_CONFIGS', () => {
  it('has 6 services', () => {
    expect(SERVICE_CONFIGS).toHaveLength(6)
  })

  it('each service has url and mapping', () => {
    for (const svc of SERVICE_CONFIGS) {
      expect(typeof svc.url).toBe('string')
      expect(svc.url).toMatch(/^https:\/\//)
      expect(typeof svc.mapping).toBe('function')
    }
  })
})
