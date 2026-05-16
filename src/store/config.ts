import { load } from '@tauri-apps/plugin-store'
import type { AppConfig } from '../types'

export const DEFAULT_CONFIG: AppConfig = {
  lockedIp: '',
  launchAtLogin: false,
  strongAlertEnabled: true,
}

export function isValidIp(ip: string): boolean {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false
  return ip.split('.').every((n) => parseInt(n, 10) <= 255)
}

const STORE_FILE = 'config.json'

let _store: Awaited<ReturnType<typeof load>> | null = null

async function getStore() {
  if (!_store) _store = await load(STORE_FILE, { autoSave: false })
  return _store
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const store = await getStore()
    return {
      lockedIp: (await store.get<string>('lockedIp')) ?? DEFAULT_CONFIG.lockedIp,
      launchAtLogin: (await store.get<boolean>('launchAtLogin')) ?? DEFAULT_CONFIG.launchAtLogin,
      strongAlertEnabled: (await store.get<boolean>('strongAlertEnabled')) ?? DEFAULT_CONFIG.strongAlertEnabled,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export async function saveConfig(config: Partial<AppConfig>): Promise<void> {
  const store = await getStore()
  for (const [key, value] of Object.entries(config)) {
    await store.set(key, value)
  }
  await store.save()
}
