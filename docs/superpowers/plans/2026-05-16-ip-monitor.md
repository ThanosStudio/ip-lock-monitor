# IP Monitor macOS App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone macOS menu bar app (Tauri v2 + React) in `/monitor/` that monitors a user-locked IP every 60s and alerts on change via tray icon, system notification, and optional centered modal window.

**Architecture:** Two Tauri windows (`main` panel hidden at startup, `alert` modal always-on-top); Rust layer owns the tray (left-click toggle + right-click menu + icon updates); React frontend owns all monitor state via `useMonitor` hook and calls Rust commands to sync tray icon and menu. IP detection uses the same 6-service random-failover strategy as clash-verge.

**Tech Stack:** Tauri v2, React 18, TypeScript, Vite 5, Vitest, `@tauri-apps/plugin-http`, `@tauri-apps/plugin-store`, `@tauri-apps/plugin-autostart`, `@tauri-apps/plugin-notification`, `tauri-plugin-positioner`

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Frontend deps + tauri dev/build scripts |
| `vite.config.ts` | Vite + Vitest config |
| `tsconfig.json` | TypeScript config |
| `index.html` | HTML entry |
| `src/main.tsx` | React entry |
| `src/App.tsx` | Route to `MainPanel` or `AlertModal` by window label |
| `src/styles.css` | Global reset + CSS variables |
| `src/services/ip.ts` | `getIpInfo()` — 6-service failover, returns `IpInfo` |
| `src/services/ip.test.ts` | Tests for service response mapping |
| `src/store/config.ts` | `AppConfig` read/write via Tauri Store; `isValidIp()` |
| `src/store/config.test.ts` | Tests for `isValidIp` |
| `src/hooks/useMonitor.ts` | 60s loop, state machine, tray sync, alert trigger |
| `src/components/CountryFlag.tsx` | Unicode emoji flag from country code |
| `src/components/IpInfoGrid.tsx` | 2×2 grid: ISP / Org / Location / Timezone |
| `src/components/IpComparison.tsx` | Locked IP vs current IP diff card |
| `src/components/SettingsSection.tsx` | Auto-start + strong-alert toggles + locked IP input/readonly |
| `src/components/MainPanel.tsx` | Root panel: idle / safe / alert state |
| `src/components/AlertModal.tsx` | Always-on-top alert window (reuses IpComparison + IpInfoGrid) |
| `src-tauri/src/main.rs` | Binary entry |
| `src-tauri/src/lib.rs` | Plugin registration, setup hook, dock-hide |
| `src-tauri/src/tray.rs` | Tray init, `update_tray_icon` command, `update_tray_menu` command |
| `src-tauri/Cargo.toml` | Rust deps |
| `src-tauri/build.rs` | Tauri build script |
| `src-tauri/tauri.conf.json` | Two windows, DMG bundle |
| `src-tauri/capabilities/default.json` | Plugin permissions |
| `src-tauri/icons/tray-gray.png` | Tray icon: idle state (22×22) |
| `src-tauri/icons/tray-green.png` | Tray icon: safe state (22×22) |
| `src-tauri/icons/tray-red.png` | Tray icon: alert state (22×22) |

---

## Shared Types

These types are used across tasks. Define them in `src/types.ts` in Task 1.

```typescript
export interface IpInfo {
  ip: string
  country_code: string
  country: string
  region: string
  city: string
  organization: string
  asn: number
  asn_organization: string
  longitude: number
  latitude: number
  timezone: string
}

export interface AppConfig {
  lockedIp: string
  launchAtLogin: boolean
  strongAlertEnabled: boolean
}

export type MonitorStatus = 'idle' | 'safe' | 'alert'

export interface MonitorState {
  status: MonitorStatus
  currentIpInfo: IpInfo | null
  lockedIp: string
  countdown: number      // seconds until next check; 0 = currently checking
  isChecking: boolean
  error: string | null
}
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/types.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ip-monitor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-autostart": "^2",
    "@tauri-apps/plugin-http": "^2",
    "@tauri-apps/plugin-notification": "^2",
    "@tauri-apps/plugin-store": "^2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'chrome105',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IP Monitor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
.env
src-tauri/target/
src-tauri/gen/
.superpowers/
```

- [ ] **Step 6: Create `src/types.ts`** with the shared types defined in the "Shared Types" section above.

- [ ] **Step 7: Install dependencies**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html .gitignore src/types.ts
git commit -m "feat: frontend project scaffolding"
```

---

## Task 2: Rust Project Setup

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs` (skeleton)
- Create: `src-tauri/src/tray.rs` (skeleton)

- [ ] **Step 1: Create `src-tauri/Cargo.toml`**

```toml
[package]
name = "ip-monitor"
version = "0.1.0"
description = "IP Monitor macOS App"
authors = []
edition = "2021"

[lib]
name = "ip_monitor_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[[bin]]
name = "ip-monitor"
path = "src/main.rs"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-http = "2"
tauri-plugin-store = "2"
tauri-plugin-autostart = "2"
tauri-plugin-notification = "2"
tauri-plugin-positioner = { version = "2", features = ["tray-icon"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 2: Create `src-tauri/build.rs`**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 3: Create `src-tauri/src/main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ip_monitor_lib::run()
}
```

- [ ] **Step 4: Create `src-tauri/src/tray.rs` (skeleton)**

```rust
use tauri::{App, AppHandle, Manager, Runtime};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::image::Image;

pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // TODO: implement in Task 13
    Ok(())
}

#[tauri::command]
pub fn update_tray_icon(_app: AppHandle, _status: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn update_tray_menu(_app: AppHandle, _is_monitoring: bool) -> Result<(), String> {
    Ok(())
}
```

- [ ] **Step 5: Create `src-tauri/src/lib.rs` (skeleton)**

```rust
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_positioner::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            tray::update_tray_icon,
            tray::update_tray_menu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 6: Verify Rust compiles**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor/src-tauri
cargo check
```

Expected: compiles without errors (warnings about unused imports in stubs are OK).

- [ ] **Step 7: Commit**

```bash
git add src-tauri/
git commit -m "feat: rust project skeleton"
```

---

## Task 3: Tauri Configuration

**Files:**
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Create `src-tauri/tauri.conf.json`**

```json
{
  "productName": "IP Monitor",
  "version": "0.1.0",
  "identifier": "com.ipmonitor.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "bundle": {
    "active": true,
    "targets": ["dmg"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "minimumSystemVersion": "13.0"
    }
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "IP Monitor",
        "width": 340,
        "height": 500,
        "resizable": false,
        "decorations": false,
        "visible": false,
        "skipTaskbar": true,
        "shadow": true,
        "alwaysOnTop": false
      },
      {
        "label": "alert",
        "title": "IP 泄露警告",
        "width": 380,
        "height": 520,
        "resizable": false,
        "decorations": false,
        "visible": false,
        "alwaysOnTop": true,
        "center": true,
        "shadow": true,
        "skipTaskbar": false
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

- [ ] **Step 2: Create `src-tauri/capabilities/default.json`**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for IP Monitor",
  "windows": ["main", "alert"],
  "permissions": [
    "core:default",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-is-visible",
    "core:window:allow-set-focus",
    "http:default",
    "store:allow-get",
    "store:allow-set",
    "store:allow-save",
    "store:allow-load",
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled",
    "notification:default",
    "positioner:allow-move-window"
  ]
}
```

- [ ] **Step 3: Run `cargo check` again to verify the schema is generated**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npm run tauri dev -- --no-watch 2>&1 | head -20
```

(Ctrl-C after a few seconds; just verifying config parses correctly.)

- [ ] **Step 4: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/capabilities/
git commit -m "feat: tauri config and capabilities"
```

---

## Task 4: App Icon + Tray Icons

**Files:**
- Create: `assets/app-icon.png` (1024×1024 source)
- Create: `src-tauri/icons/tray-gray.png` (22×22)
- Create: `src-tauri/icons/tray-green.png` (22×22)
- Create: `src-tauri/icons/tray-red.png` (22×22)
- Create: `src-tauri/icons/` (all app icon sizes via CLI)

- [ ] **Step 1: Create tray icon SVGs and convert to PNG**

Save the following three SVGs then convert with `rsvg-convert` (install via `brew install librsvg` if needed).

`/tmp/tray-gray.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <path d="M11 2L4 5v5c0 4.5 3 8.7 7 9.9 4-1.2 7-5.4 7-9.9V5L11 2z" fill="#888888"/>
</svg>
```

`/tmp/tray-green.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <path d="M11 2L4 5v5c0 4.5 3 8.7 7 9.9 4-1.2 7-5.4 7-9.9V5L11 2z" fill="#22c55e"/>
  <path d="M8.5 11l2 2 3.5-3.5" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

`/tmp/tray-red.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <path d="M11 2L4 5v5c0 4.5 3 8.7 7 9.9 4-1.2 7-5.4 7-9.9V5L11 2z" fill="#ef4444"/>
  <text x="11" y="14" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="Arial">!</text>
</svg>
```

Convert to PNG:
```bash
mkdir -p /Users/pony/dev/ai/clash-verge-rev/monitor/src-tauri/icons
rsvg-convert -w 44 -h 44 /tmp/tray-gray.svg  -o /Users/pony/dev/ai/clash-verge-rev/monitor/src-tauri/icons/tray-gray.png
rsvg-convert -w 44 -h 44 /tmp/tray-green.svg -o /Users/pony/dev/ai/clash-verge-rev/monitor/src-tauri/icons/tray-green.png
rsvg-convert -w 44 -h 44 /tmp/tray-red.svg   -o /Users/pony/dev/ai/clash-verge-rev/monitor/src-tauri/icons/tray-red.png
```

(44px = 22pt @2x for Retina)

- [ ] **Step 2: Create app icon source and generate all sizes**

```bash
# Create a simple 1024×1024 app icon (gray shield on white bg)
cat > /tmp/app-icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#f8fafc" rx="200"/>
  <path d="M512 100L200 230v230c0 210 140 406 312 462 172-56 312-252 312-462V230L512 100z" fill="#3b82f6"/>
  <path d="M380 512l100 100 180-180" stroke="white" stroke-width="60" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
EOF
mkdir -p /Users/pony/dev/ai/clash-verge-rev/monitor/assets
rsvg-convert -w 1024 -h 1024 /tmp/app-icon.svg -o /Users/pony/dev/ai/clash-verge-rev/monitor/assets/app-icon.png
```

Generate all Tauri icon sizes:
```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npx @tauri-apps/cli icon assets/app-icon.png
```

Expected: `src-tauri/icons/` populated with `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, etc.

- [ ] **Step 3: Verify all icon files exist**

```bash
ls /Users/pony/dev/ai/clash-verge-rev/monitor/src-tauri/icons/
```

Expected output includes: `tray-gray.png`, `tray-green.png`, `tray-red.png`, `32x32.png`, `128x128.png`, `icon.icns`.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/icons/ assets/
git commit -m "feat: app and tray icons"
```

---

## Task 5: IP Detection Service

**Files:**
- Create: `src/services/ip.ts`
- Create: `src/services/ip.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/services/ip.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { SERVICE_CONFIGS, mapServiceResponse } from './ip'

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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npm test -- --run src/services/ip.test.ts
```

Expected: FAIL — `mapServiceResponse` and `SERVICE_CONFIGS` not found.

- [ ] **Step 3: Implement `src/services/ip.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run src/services/ip.test.ts
```

Expected: PASS (3 test suites, all green).

- [ ] **Step 5: Commit**

```bash
git add src/services/
git commit -m "feat: ip detection service with 6-service failover"
```

---

## Task 6: Config Store

**Files:**
- Create: `src/store/config.ts`
- Create: `src/store/config.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/store/config.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { isValidIp, DEFAULT_CONFIG } from './config'

describe('isValidIp', () => {
  it('accepts valid IPv4', () => {
    expect(isValidIp('1.2.3.4')).toBe(true)
    expect(isValidIp('192.168.1.1')).toBe(true)
    expect(isValidIp('255.255.255.255')).toBe(true)
  })

  it('rejects invalid values', () => {
    expect(isValidIp('')).toBe(false)
    expect(isValidIp('256.0.0.1')).toBe(false)
    expect(isValidIp('1.2.3')).toBe(false)
    expect(isValidIp('1.2.3.4.5')).toBe(false)
    expect(isValidIp('abc.def.ghi.jkl')).toBe(false)
    expect(isValidIp('1.2.3.4 ')).toBe(false)
  })
})

describe('DEFAULT_CONFIG', () => {
  it('has correct defaults', () => {
    expect(DEFAULT_CONFIG.lockedIp).toBe('')
    expect(DEFAULT_CONFIG.launchAtLogin).toBe(false)
    expect(DEFAULT_CONFIG.strongAlertEnabled).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run src/store/config.test.ts
```

Expected: FAIL — `isValidIp` and `DEFAULT_CONFIG` not found.

- [ ] **Step 3: Implement `src/store/config.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --run src/store/config.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: config store with isValidIp validation"
```

---

## Task 7: Monitor Hook

**Files:**
- Create: `src/hooks/useMonitor.ts`

- [ ] **Step 1: Create `src/hooks/useMonitor.ts`**

```typescript
import { invoke } from '@tauri-apps/api/core'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getIpInfo } from '../services/ip'
import { loadConfig, saveConfig } from '../store/config'
import type { AppConfig, IpInfo, MonitorState, MonitorStatus } from '../types'

const CHECK_INTERVAL_S = 60

const INITIAL_STATE: MonitorState = {
  status: 'idle',
  currentIpInfo: null,
  lockedIp: '',
  countdown: CHECK_INTERVAL_S,
  isChecking: false,
  error: null,
}

async function syncTray(status: MonitorStatus, isMonitoring: boolean) {
  const iconStatus = status === 'safe' ? 'green' : status === 'alert' ? 'red' : 'gray'
  await invoke('update_tray_icon', { status: iconStatus })
  await invoke('update_tray_menu', { isMonitoring })
}

async function triggerAlert(lockedIp: string, currentIp: string, config: AppConfig) {
  await sendNotification({
    title: '⚠️ IP 变更警告',
    body: `代理 IP 已从 ${lockedIp} 变更为 ${currentIp}，真实 IP 可能泄露！`,
  })
  if (config.strongAlertEnabled) {
    const alertWin = await WebviewWindow.getByLabel('alert')
    if (alertWin) {
      const visible = await alertWin.isVisible()
      if (!visible) {
        await alertWin.show()
        await alertWin.setFocus()
      } else {
        await alertWin.setFocus()
      }
    }
  }
}

export function useMonitor() {
  const [state, setState] = useState<MonitorState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stateRef = useRef<MonitorState>(INITIAL_STATE)

  // Keep ref in sync so interval callback reads fresh state
  stateRef.current = state

  // Load config and current IP on mount
  useEffect(() => {
    loadConfig().then((config) => {
      setState((s) => ({ ...s, lockedIp: config.lockedIp }))
    })
    getIpInfo()
      .then((info) => setState((s) => ({ ...s, currentIpInfo: info })))
      .catch(() => {})
  }, [])

  const doCheck = useCallback(async () => {
    setState((s) => ({ ...s, isChecking: true, countdown: 0, error: null }))
    try {
      const info = await getIpInfo()
      const { lockedIp } = stateRef.current
      const isMatch = info.ip === lockedIp
      const newStatus: MonitorStatus = isMatch ? 'safe' : 'alert'
      setState((s) => ({
        ...s,
        currentIpInfo: info,
        status: newStatus,
        isChecking: false,
        countdown: CHECK_INTERVAL_S,
        error: null,
      }))
      await syncTray(newStatus, true)
      if (!isMatch) {
        const config = await loadConfig()
        await triggerAlert(lockedIp, info.ip, config)
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        isChecking: false,
        countdown: CHECK_INTERVAL_S,
        error: '网络错误，无法检测 IP',
      }))
    }
  }, [])

  const startMonitoring = useCallback(
    async (lockedIp: string) => {
      await saveConfig({ lockedIp })
      setState((s) => ({
        ...s,
        lockedIp,
        status: 'safe',
        countdown: CHECK_INTERVAL_S,
        error: null,
      }))
      await syncTray('safe', true)

      // Immediate first check
      await doCheck()

      // Start countdown + periodic check
      intervalRef.current = setInterval(() => {
        setState((s) => {
          const next = s.countdown - 1
          if (next <= 0 && !s.isChecking) {
            doCheck()
            return { ...s, countdown: 0 }
          }
          return { ...s, countdown: Math.max(0, next) }
        })
      }, 1000)
    },
    [doCheck],
  )

  const stopMonitoring = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setState({ ...INITIAL_STATE })
    await syncTray('idle', false)
    // Close alert window if open
    const alertWin = await WebviewWindow.getByLabel('alert')
    if (alertWin) await alertWin.hide()
  }, [])

  // Listen for right-click tray menu "toggle_monitor" event
  useEffect(() => {
    let cleanup: (() => void) | null = null
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<void>('tray-toggle-monitor', () => {
        const { status, lockedIp } = stateRef.current
        if (status === 'idle') {
          if (lockedIp) startMonitoring(lockedIp)
        } else {
          stopMonitoring()
        }
      }).then((unlisten) => {
        cleanup = unlisten
      })
    })
    return () => { cleanup?.() }
  }, [startMonitoring, stopMonitoring])

  return { state, startMonitoring, stopMonitoring }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/
git commit -m "feat: useMonitor hook — 60s loop, tray sync, alert trigger"
```

---

## Task 8: Base UI Components

**Files:**
- Create: `src/components/CountryFlag.tsx`
- Create: `src/components/IpInfoGrid.tsx`
- Create: `src/components/IpComparison.tsx`

- [ ] **Step 1: Create `src/components/CountryFlag.tsx`**

```tsx
interface Props {
  countryCode: string | undefined
  size?: number
}

export function CountryFlag({ countryCode, size = 22 }: Props) {
  if (!countryCode) return <span style={{ fontSize: size }}>🌐</span>
  const flag = countryCode
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
  return <span style={{ fontSize: size, fontFamily: '"Apple Color Emoji", sans-serif' }}>{flag}</span>
}
```

- [ ] **Step 2: Create `src/components/IpInfoGrid.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `src/components/IpComparison.tsx`**

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CountryFlag.tsx src/components/IpInfoGrid.tsx src/components/IpComparison.tsx
git commit -m "feat: CountryFlag, IpInfoGrid, IpComparison components"
```

---

## Task 9: SettingsSection Component

**Files:**
- Create: `src/components/SettingsSection.tsx`

- [ ] **Step 1: Create `src/components/SettingsSection.tsx`**

```tsx
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'
import { useCallback, useState } from 'react'
import { saveConfig } from '../store/config'

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
      <div>
        <div style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 9, color: '#94a3b8' }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 32, height: 18,
          background: checked ? '#059669' : '#e2e8f0',
          borderRadius: 9, border: 'none', cursor: 'pointer',
          position: 'relative', flexShrink: 0, transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 14, height: 14, background: '#fff', borderRadius: '50%',
          position: 'absolute', top: 2,
          [checked ? 'right' : 'left']: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
        }} />
      </button>
    </div>
  )
}

interface Props {
  lockedIp: string
  isMonitoring: boolean
  launchAtLogin: boolean
  strongAlertEnabled: boolean
  onLaunchAtLoginChange: (v: boolean) => void
  onStrongAlertChange: (v: boolean) => void
  // Idle state only props
  lockedIpInput?: string
  onLockedIpInputChange?: (v: string) => void
  onLockedIpConfirm?: () => void
  lockedIpError?: boolean
}

export function SettingsSection({
  lockedIp,
  isMonitoring,
  launchAtLogin,
  strongAlertEnabled,
  onLaunchAtLoginChange,
  onStrongAlertChange,
  lockedIpInput,
  onLockedIpInputChange,
  onLockedIpConfirm,
  lockedIpError,
}: Props) {
  const handleLaunchAtLoginChange = useCallback(
    async (enabled: boolean) => {
      try {
        if (enabled) await enable()
        else await disable()
        await saveConfig({ launchAtLogin: enabled })
        onLaunchAtLoginChange(enabled)
      } catch (err) {
        console.error('Failed to toggle autostart:', err)
      }
    },
    [onLaunchAtLoginChange],
  )

  const handleStrongAlertChange = useCallback(
    async (enabled: boolean) => {
      await saveConfig({ strongAlertEnabled: enabled })
      onStrongAlertChange(enabled)
    },
    [onStrongAlertChange],
  )

  return (
    <div>
      {/* Locked IP */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
          🔒 锁定 IP{isMonitoring ? '（监控中不可修改）' : '（回车确认）'}
        </div>
        {isMonitoring ? (
          <div style={{
            background: '#fef9c3', border: '1px solid #fde68a',
            borderRadius: 6, padding: '5px 8px',
            fontSize: 11, fontFamily: 'monospace', color: '#78350f',
          }}>
            {lockedIp}
          </div>
        ) : (
          <input
            value={lockedIpInput ?? ''}
            onChange={(e) => onLockedIpInputChange?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLockedIpConfirm?.()}
            placeholder="输入要监控的 IP 地址..."
            style={{
              width: '100%', boxSizing: 'border-box',
              border: `1px solid ${lockedIpError ? '#f87171' : '#fcd34d'}`,
              borderRadius: 6, padding: '5px 8px',
              fontSize: 11, fontFamily: 'monospace',
              background: lockedIpError ? '#fef2f2' : '#fffbeb',
              outline: 'none',
            }}
          />
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>设置</div>
        <Toggle
          label="开机自动启动"
          description="随系统启动常驻菜单栏"
          checked={launchAtLogin}
          onChange={handleLaunchAtLoginChange}
        />
        <div style={{ height: 1, background: '#f0f0f0', margin: '2px 0' }} />
        <Toggle
          label="强提醒模式"
          description="IP 变更时在屏幕居中弹出警告窗口"
          checked={strongAlertEnabled}
          onChange={handleStrongAlertChange}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SettingsSection.tsx
git commit -m "feat: SettingsSection with autostart and strong-alert toggles"
```

---

## Task 10: MainPanel Component

**Files:**
- Create: `src/components/MainPanel.tsx`

- [ ] **Step 1: Create `src/components/MainPanel.tsx`**

```tsx
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useEffect, useState } from 'react'
import type { AppConfig } from '../types'
import { loadConfig, isValidIp } from '../store/config'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'
import { SettingsSection } from './SettingsSection'

const BANNER_STYLES = {
  idle: { background: 'linear-gradient(135deg, #374151, #1f2937)', icon: '🛡️', title: 'IP 监控未启动', subtitle: '请配置锁定 IP 并开始监控' },
  safe: { background: 'linear-gradient(135deg, #065f46, #059669)', icon: '🛡️', title: 'IP 安全 · 正常', subtitle: null },
  alert: { background: 'linear-gradient(135deg, #7f1d1d, #dc2626)', icon: '🚨', title: 'IP 已变更！可能泄露', subtitle: null },
}

export function MainPanel() {
  const { state, startMonitoring, stopMonitoring } = useMonitor()
  const [config, setConfig] = useState<AppConfig>({ lockedIp: '', launchAtLogin: false, strongAlertEnabled: true })
  const [lockedIpInput, setLockedIpInput] = useState('')
  const [lockedIpError, setLockedIpError] = useState(false)
  const [detectedAt, setDetectedAt] = useState<string>('')

  // Load config on mount
  useEffect(() => {
    loadConfig().then((c) => {
      setConfig(c)
      setLockedIpInput(c.lockedIp)
    })
  }, [])

  // Hide panel on blur
  useEffect(() => {
    const win = getCurrentWebviewWindow()
    let unlisten: (() => void) | null = null
    win.onFocusChanged(({ payload: focused }) => {
      if (!focused) win.hide()
    }).then((fn) => { unlisten = fn })
    return () => { unlisten?.() }
  }, [])

  // Record alert time
  useEffect(() => {
    if (state.status === 'alert') {
      setDetectedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }
  }, [state.status])

  const handleStartMonitoring = () => {
    if (!isValidIp(lockedIpInput)) {
      setLockedIpError(true)
      return
    }
    setLockedIpError(false)
    startMonitoring(lockedIpInput)
  }

  const handleQuit = () => {
    import('@tauri-apps/api/core').then(({ invoke }) => invoke('exit_app'))
  }

  const isMonitoring = state.status !== 'idle'
  const banner = BANNER_STYLES[state.status]

  const countdownText = state.isChecking
    ? '检查中...'
    : state.countdown > 0
    ? `下次检查 ${state.countdown}s 后`
    : '检查中...'

  return (
    <div style={{ width: 340, fontFamily: 'system-ui, -apple-system, sans-serif', userSelect: 'none' }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: isMonitoring ? (state.status === 'alert' ? 'linear-gradient(90deg,#7f1d1d,#dc2626)' : 'linear-gradient(90deg,#065f46,#059669)') : '#e2e8f0' }} />

      {/* Banner */}
      <div style={{ background: banner.background, color: '#fff', padding: '14px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 3 }}>{banner.icon}</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{banner.title}</div>
        <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
          {state.status === 'idle' && banner.subtitle}
          {state.status === 'safe' && countdownText}
          {state.status === 'alert' && `检测于 ${detectedAt}`}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', background: state.status === 'alert' ? '#fff7f7' : '#fff' }}>
        {/* IP info header */}
        {state.currentIpInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CountryFlag countryCode={state.currentIpInfo.country_code} size={22} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{state.currentIpInfo.country || 'Unknown'}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                {[state.currentIpInfo.city, state.currentIpInfo.region].filter(Boolean).join(', ')}
                {state.currentIpInfo.asn ? ` · AS${state.currentIpInfo.asn}` : ''}
              </div>
            </div>
            {isMonitoring && state.status === 'safe' && (
              <div style={{ fontSize: 10, fontFamily: 'monospace', background: '#f0fdf4', color: '#065f46', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                IP 匹配 ✓
              </div>
            )}
          </div>
        )}

        {/* Alert: IP comparison */}
        {state.status === 'alert' && state.currentIpInfo && (
          <IpComparison
            lockedIp={state.lockedIp}
            currentIp={state.currentIpInfo.ip}
            detectedAt={detectedAt}
          />
        )}

        {/* IP info grid */}
        {state.currentIpInfo && (
          <div style={{ marginBottom: 10 }}>
            <IpInfoGrid info={state.currentIpInfo} isAlert={state.status === 'alert'} />
          </div>
        )}

        {/* Network error */}
        {state.error && (
          <div style={{ fontSize: 10, color: '#dc2626', background: '#fef2f2', padding: '5px 8px', borderRadius: 6, marginBottom: 8 }}>
            {state.error}
          </div>
        )}

        {/* Settings */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
          <SettingsSection
            lockedIp={state.lockedIp}
            isMonitoring={isMonitoring}
            launchAtLogin={config.launchAtLogin}
            strongAlertEnabled={config.strongAlertEnabled}
            onLaunchAtLoginChange={(v) => setConfig((c) => ({ ...c, launchAtLogin: v }))}
            onStrongAlertChange={(v) => setConfig((c) => ({ ...c, strongAlertEnabled: v }))}
            lockedIpInput={lockedIpInput}
            onLockedIpInputChange={(v) => { setLockedIpInput(v); setLockedIpError(false) }}
            onLockedIpConfirm={handleStartMonitoring}
            lockedIpError={lockedIpError}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {!isMonitoring ? (
            <button
              onClick={handleStartMonitoring}
              style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ▶ 开始监控
            </button>
          ) : (
            <button
              onClick={stopMonitoring}
              style={{ flex: 1, background: state.status === 'alert' ? '#dc2626' : '#ef4444', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ⏹ 停止监控
            </button>
          )}
          <button
            onClick={handleQuit}
            style={{ background: '#f1f5f9', color: '#ef4444', border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 11, cursor: 'pointer' }}
          >
            退出程序
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MainPanel.tsx
git commit -m "feat: MainPanel with idle/safe/alert three-state UI"
```

---

## Task 11: AlertModal Component

**Files:**
- Create: `src/components/AlertModal.tsx`

- [ ] **Step 1: Create `src/components/AlertModal.tsx`**

```tsx
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useEffect, useState } from 'react'
import { loadConfig } from '../store/config'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'

export function AlertModal() {
  const { state, stopMonitoring } = useMonitor()
  const [detectedAt, setDetectedAt] = useState(
    new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  )

  useEffect(() => {
    if (state.status === 'alert') {
      setDetectedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }
  }, [state.status])

  const handleClose = async () => {
    const win = getCurrentWebviewWindow()
    await win.hide()
  }

  const handleStopAndClose = async () => {
    await stopMonitoring()
    await handleClose()
  }

  const info = state.currentIpInfo

  return (
    <div style={{ width: 380, fontFamily: 'system-ui, -apple-system, sans-serif', userSelect: 'none' }}>
      {/* Drag + close bar */}
      <div
        data-tauri-drag-region
        style={{ background: '#1f2937', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'move' }}
      >
        <span style={{ fontSize: 10, color: '#6b7280' }}>IP 泄露警告</span>
        <button
          onClick={handleClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9ca3af', borderRadius: 4, width: 18, height: 18, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ✕
        </button>
      </div>

      {/* Alert banner */}
      <div style={{ background: 'linear-gradient(135deg, #7f1d1d, #dc2626)', color: '#fff', padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 4 }}>🚨</div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>IP 已变更！可能泄露</div>
        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3 }}>检测时间：{detectedAt}</div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px', background: '#fff7f7' }}>
        {info && (
          <>
            <IpComparison lockedIp={state.lockedIp} currentIp={info.ip} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CountryFlag countryCode={info.country_code} size={20} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{info.country || 'Unknown'}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>
                  {[info.city, info.region].filter(Boolean).join(', ')}
                  {info.asn ? ` · AS${info.asn}` : ''}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <IpInfoGrid info={info} isAlert />
            </div>
          </>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleStopAndClose}
            style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            ⏹ 停止监控
          </button>
          <button
            onClick={handleClose}
            style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 11, cursor: 'pointer' }}
          >
            关闭
          </button>
        </div>

        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>可在设置中关闭强提醒弹窗</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AlertModal.tsx
git commit -m "feat: AlertModal always-on-top alert window"
```

---

## Task 12: App Entry + Styles

**Files:**
- Create: `src/styles.css`
- Create: `src/App.tsx`
- Create: `src/main.tsx`

- [ ] **Step 1: Create `src/styles.css`**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: transparent;
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: inherit;
}

input {
  font-family: inherit;
}
```

- [ ] **Step 2: Create `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { MainPanel } from './components/MainPanel'
import { AlertModal } from './components/AlertModal'

export function App() {
  const [windowLabel, setWindowLabel] = useState<string>('')

  useEffect(() => {
    setWindowLabel(getCurrentWebviewWindow().label)
  }, [])

  if (windowLabel === 'alert') return <AlertModal />
  if (windowLabel === 'main') return <MainPanel />
  return null
}
```

- [ ] **Step 3: Create `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 4: Commit**

```bash
git add src/styles.css src/App.tsx src/main.tsx
git commit -m "feat: app entry, styles, window-label routing"
```

---

## Task 13: Rust Tray Implementation

**Files:**
- Modify: `src-tauri/src/tray.rs` (replace skeleton)
- Modify: `src-tauri/src/lib.rs` (add exit_app command)

- [ ] **Step 1: Replace `src-tauri/src/tray.rs` with full implementation**

```rust
use tauri::{App, AppHandle, Manager};
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_positioner::{Position, WindowExt};

pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let toggle_item = MenuItem::with_id(app, "toggle_monitor", "▶ 开始监控", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle_item, &quit_item])?;

    TrayIconBuilder::with_id("main")
        .icon(Image::from_bytes(include_bytes!("../../icons/tray-gray.png"))?)
        .menu(&menu)
        .tooltip("IP 监控")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                toggle_main_window(app);
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "toggle_monitor" => {
                let _ = app.emit("tray-toggle-monitor", ());
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
        } else {
            let _ = window.move_window(Position::TrayCenter);
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

#[tauri::command]
pub fn update_tray_icon(app: AppHandle, status: String) -> Result<(), String> {
    let icon_bytes: &[u8] = match status.as_str() {
        "green" => include_bytes!("../../icons/tray-green.png"),
        "red" => include_bytes!("../../icons/tray-red.png"),
        _ => include_bytes!("../../icons/tray-gray.png"),
    };
    if let Some(tray) = app.tray_by_id("main") {
        let icon = Image::from_bytes(icon_bytes).map_err(|e| e.to_string())?;
        tray.set_icon(Some(icon)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn update_tray_menu(app: AppHandle, is_monitoring: bool) -> Result<(), String> {
    let label = if is_monitoring { "⏹ 停止监控" } else { "▶ 开始监控" };
    if let Some(tray) = app.tray_by_id("main") {
        let toggle_item =
            MenuItem::with_id(&app, "toggle_monitor", label, true, None::<&str>)
                .map_err(|e| e.to_string())?;
        let quit_item =
            MenuItem::with_id(&app, "quit", "退出程序", true, None::<&str>)
                .map_err(|e| e.to_string())?;
        let menu = Menu::with_items(&app, &[&toggle_item, &quit_item])
            .map_err(|e| e.to_string())?;
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

- [ ] **Step 2: Update `src-tauri/src/lib.rs`** — call `setup_tray` and add `exit_app` command

```rust
mod tray;

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_positioner::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            tray::setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            tray::update_tray_icon,
            tray::update_tray_menu,
            exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Verify Rust compiles**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor/src-tauri
cargo check
```

Expected: compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/tray.rs src-tauri/src/lib.rs
git commit -m "feat: rust tray — left-click toggle, right-click menu, icon/menu update commands"
```

---

## Task 14: Dev Run + Manual Smoke Test

- [ ] **Step 1: Start dev server**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npm run tauri dev
```

Expected: Tauri app starts, shield icon appears in macOS menu bar, no console errors.

- [ ] **Step 2: Smoke test — main panel**

- Left-click the menu bar icon → main panel appears below icon
- Click outside panel → panel hides
- Panel shows current IP info (may take a few seconds while fetching)

- [ ] **Step 3: Smoke test — idle state**

- Enter a valid IP in the locked IP field → no red border
- Enter an invalid IP (e.g. `999.x.x.x`) → red border, "开始监控" blocked
- Toggle "开机自动启动" → toggle visually changes
- Toggle "强提醒模式" → toggle visually changes

- [ ] **Step 4: Smoke test — monitoring**

- Enter your real IP (check `https://api.ip.sb/geoip`) and click "▶ 开始监控"
- Tray icon turns green
- Right-click tray → menu shows "⏹ 停止监控"
- Countdown ticks down from 60
- Click "⏹ 停止监控" → tray turns gray, right-click menu shows "▶ 开始监控"

- [ ] **Step 5: Smoke test — alert**

- Enter a fake IP (e.g. `1.2.3.4`) that doesn't match current IP → click "▶ 开始监控"
- Panel turns red immediately (IP mismatch)
- System notification appears
- If strong alert enabled: centered `alert` window appears above all windows
- Close alert window with ✕ or "关闭"
- "⏹ 停止监控" in alert window → stops monitoring and closes window

- [ ] **Step 6: Smoke test — right-click menu**

- Right-click tray → context menu appears (no main panel opens)
- Click "停止监控" / "开始监控" in menu → state changes match panel

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: verified dev smoke test passes"
```

---

## Task 15: DMG Build

**Files:**
- No new files; verify existing `tauri.conf.json` bundle config

- [ ] **Step 1: Build the app**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npm run tauri build
```

Expected: `src-tauri/target/release/bundle/dmg/IP Monitor_0.1.0_aarch64.dmg` created.

- [ ] **Step 2: Mount and install from DMG**

```bash
open "src-tauri/target/release/bundle/dmg/IP Monitor_0.1.0_aarch64.dmg"
```

Drag "IP Monitor" to Applications folder, launch it.

- [ ] **Step 3: Verify installed app**

- Shield icon appears in menu bar
- All smoke test behaviors from Task 14 work in the installed build
- App does NOT appear in the Dock (menu-bar-only)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: ip-monitor v0.1.0 — complete macOS menu bar app"
```

---

## Self-Review Checklist

| Requirement | Covered By |
|---|---|
| macOS menu bar icon, 3 states (gray/green/red) | Task 13 `tray.rs` + `update_tray_icon` |
| Left-click → show/hide panel | Task 13 `toggle_main_window` |
| Right-click → context menu only | Task 13 `show_menu_on_left_click(false)` |
| Right-click menu: start/stop + quit | Task 13 `on_menu_event` |
| Panel: 3 states (idle/safe/alert) | Task 10 `MainPanel.tsx` |
| Locked IP input (editable only when idle) | Task 9 `SettingsSection.tsx` |
| IP validation before start | Task 6 `isValidIp` + Task 10 |
| 60s countdown with "检查中..." state | Task 7 `useMonitor.ts` |
| IP info: flag, country, ISP, org, location, timezone | Task 8 `IpInfoGrid`, `CountryFlag` |
| IP comparison display on alert | Task 8 `IpComparison` |
| macOS system notification on IP change | Task 7 `triggerAlert` |
| Strong alert centered modal (configurable) | Task 7 + Task 11 `AlertModal` |
| Auto-start toggle | Task 9 `SettingsSection` + `plugin-autostart` |
| Config persistence across restarts | Task 6 `loadConfig/saveConfig` |
| "退出程序" button quits completely | Task 10 + `exit_app` Tauri command |
| Panel hides on blur (click outside) | Task 10 `onFocusChanged` |
| Alert window: drag-to-move, always-on-top | Task 11 `data-tauri-drag-region` + tauri.conf |
| Alert window not auto-dismissed | Task 11 (no auto-hide logic) |
| Panel reuses same components in alert window | Task 8 components used in both Task 10 + 11 |
| DMG packaging for macOS | Task 3 config + Task 15 |
| No Dock icon (menu-bar-only) | Task 13 `ActivationPolicy::Accessory` |
