# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

# 项目概述

Standalone macOS menu bar app (Tauri v2 + React 18 + TypeScript) that monitors your external IP and alerts when it changes. Lives at `monitor/` inside the clash-verge-rev repo but is **completely independent** of it.

## Quick Start

```bash
cd monitor
npm install
npm run tauri dev      # starts Vite + Tauri dev build
cargo check            # Rust-only type check (fast)
npx tsc --noEmit       # TypeScript check
```

## Architecture

Two Tauri windows:
- **`main`** — the panel, shown/hidden by tray left-click. `alwaysOnTop` set at runtime in `tray.rs:toggle_main_window`.
- **`alert`** — always-on-top modal, opened by `useMonitor` when IP mismatch is detected.

`src/App.tsx` routes by `getCurrentWebviewWindow().label`: `'alert'` → `<AlertModal />`, else → `<MainPanel />`.

React state machine lives in `src/hooks/useMonitor.ts`. Status: `idle → safe ↔ alert`. Polling via `setInterval` every 30s.

IP info fetched from `https://ipinfo.io/{ip}/json` — requires http plugin URL scope (see Gotchas).

## File Map

```
monitor/
├── src/
│   ├── App.tsx                    # Routes by window label
│   ├── hooks/useMonitor.ts        # Core state machine + polling
│   ├── store/config.ts            # tauri-plugin-store wrapper
│   ├── types.ts                   # IpInfo, AppConfig, MonitorState
│   └── components/
│       ├── MainPanel.tsx          # Main panel UI
│       ├── AlertModal.tsx         # Alert window
│       ├── CountryFlag.tsx        # Unicode flag from country code
│       ├── IpInfoGrid.tsx         # 2×2 info grid
│       ├── IpComparison.tsx       # Locked vs current IP diff
│       └── SettingsSection.tsx    # IP input + toggles
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs                 # Plugin setup, command registration
│   │   └── tray.rs                # Tray icon, menu, toggle logic
│   ├── capabilities/default.json  # Permission declarations
│   ├── icons/                     # tray-gray.png, tray-green.png, tray-red.png
│   └── Cargo.toml                 # Has [workspace] to isolate from parent repo
└── package.json
```

## Critical Gotchas

### 1. positioner: `on_tray_event` MUST be called first

`tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event)` must be the **first line** inside `on_tray_icon_event`. If you skip it, calling `window.move_window(Position::TrayCenter)` panics with `Tray position not set`.

```rust
.on_tray_icon_event(|tray, event| {
    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event); // MUST be first
    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
        toggle_main_window(tray.app_handle());
    }
})
```

### 2. http plugin: URL scope must be explicit

`"http:default"` enables the Tauri commands but allows **no URLs by default**. You must declare the allow-list explicitly in `capabilities/default.json`:

```json
{
  "identifier": "http:default",
  "allow": [{ "url": "https://**" }]
}
```

Without this, every `fetch()` call fails silently or with a generic network error.

### 3. `set_always_on_top` before `show`

In `toggle_main_window`, call `set_always_on_top(true)` before `show()` so the panel appears above all other windows:

```rust
let _ = window.move_window(Position::TrayCenter);
let _ = window.set_always_on_top(true);
let _ = window.show();
// Do NOT call set_focus() — crashes/misbehaves on macOS Accessory apps
```

### 4. Do NOT call `set_focus()` on macOS Accessory mode apps

The app uses `ActivationPolicy::Accessory` (no Dock icon). Calling `window.set_focus()` causes issues. Omit it.

### 5. `tauri-plugin-store` — `defaults` is required

`load(path, { autoSave: false })` fails TypeScript because `defaults` is required in `StoreOptions`. Always pass it:

```typescript
load(STORE_FILE, { defaults: {}, autoSave: false })
```

### 6. `image-png` feature required in tauri

`Image::from_bytes(include_bytes!("../icons/tray-gray.png"))` requires the `image-png` feature:

```toml
[dependencies]
tauri = { version = "2", features = ["image-png"] }
```

### 7. Icon paths from `src/tray.rs`

Icons live at `src-tauri/icons/`. From `src-tauri/src/tray.rs`, the relative path is `../icons/`:

```rust
include_bytes!("../icons/tray-gray.png")
```

### 8. `[workspace]` in `src-tauri/Cargo.toml`

Without this, Cargo tries to merge with the parent repo's workspace and fails:

```toml
[workspace]
```

### 9. `tauri-plugin-positioner` needs `tray-icon` feature

```toml
tauri-plugin-positioner = { version = "2", features = ["tray-icon"] }
```

### 10. Race condition in `doCheck` after `startMonitoring`

`setState` is batched — `stateRef.current` won't reflect the new `lockedIp` immediately after `setState`. Pass it explicitly:

```typescript
const doCheck = useCallback(async (lockedIpOverride?: string) => {
  const lockedIp = lockedIpOverride ?? stateRef.current.lockedIp
  // ...
}, [])

// In startMonitoring:
await doCheck(lockedIp)  // pass directly, don't rely on stateRef
```

### 11. Toggle inline style computed key

React inline styles don't support computed property keys. Use spread instead:

```tsx
// ❌ Invalid:
style={{ [checked ? 'right' : 'left']: 2 }}

// ✅ Correct:
style={{ ...(checked ? { right: 2 } : { left: 2 }) }}
```

### 12. `use tauri::Emitter` required for `app.emit()`

The `Emitter` trait must be in scope for `app.emit("event", payload)` to compile:

```rust
use tauri::{App, AppHandle, Emitter, Manager};
```

## TypeScript Strictness

`tsconfig.json` has `"noUnusedLocals": true, "noUnusedParameters": true`. Remove any unused imports/vars — the build will fail otherwise.

## Tray Icon Colors

| Status | Icon file |
|--------|-----------|
| idle (not monitoring) | `tray-gray.png` |
| safe (IP matches) | `tray-green.png` |
| alert (IP changed) | `tray-red.png` |

Updated via `invoke('update_tray_icon', { status: 'green' | 'red' | 'gray' })` from `useMonitor.ts`.

## Vite Dev Port

Port `1420`. If it's in use: `lsof -ti:1420 | xargs kill -9`
