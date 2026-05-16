# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all inline styles with TailwindCSS, swap Unicode/emoji icons with Lucide React, and add Framer Motion micro-animations across MainPanel and AlertModal.

**Architecture:** Pure UI layer change — no hooks, store, types, or Rust touched. Each component is rewritten file-by-file. Toolchain (Tailwind + PostCSS) is set up first so all subsequent tasks can use classes immediately.

**Tech Stack:** TailwindCSS v3, PostCSS, autoprefixer, lucide-react, framer-motion

---

## File Map

| File | Action | What changes |
|---|---|---|
| `package.json` | Modify | Add lucide-react, framer-motion deps; tailwindcss, postcss, autoprefixer devDeps |
| `tailwind.config.js` | Create | Content paths, font-family extension |
| `postcss.config.js` | Create | tailwindcss + autoprefixer plugins |
| `src/styles.css` | Modify | Replace with @tailwind directives + minimal custom rules |
| `src/components/IpComparison.tsx` | Rewrite | Tailwind classes, ArrowRight icon |
| `src/components/IpInfoGrid.tsx` | Rewrite | Tailwind classes, Building2/Globe/MapPin/Clock icons |
| `src/components/SettingsSection.tsx` | Rewrite | Tailwind classes, Lock/Monitor/Bell icons, Framer Motion toggle |
| `src/components/MainPanel.tsx` | Rewrite | Tailwind classes, all Lucide icons, AnimatePresence badge, motion buttons |
| `src/components/AlertModal.tsx` | Rewrite | Tailwind classes, AlertTriangle/ShieldAlert/X/RotateCcw icons, motion slide-in |
| `src/components/CountryFlag.tsx` | No change | Pure unicode emoji, no styling |
| `vite.config.ts` | No change | Vite 5 auto-detects postcss.config.js |

---

## Task 1: Install dependencies and configure Tailwind

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Install packages**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npm install lucide-react framer-motion
npm install -D tailwindcss postcss autoprefixer
```

Expected: no errors, `node_modules/lucide-react`, `node_modules/framer-motion`, `node_modules/tailwindcss` created.

- [ ] **Step 2: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 3: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 4: Replace `src/styles.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
  overflow: hidden;
  background: transparent;
}

#root {
  border-radius: 12px;
}

body {
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 5: Verify TypeScript still compiles**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tailwind.config.js postcss.config.js src/styles.css
git commit -m "feat(ui): add tailwindcss, lucide-react, framer-motion"
```

---

## Task 2: Rewrite IpComparison

**Files:**
- Modify: `src/components/IpComparison.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/IpComparison.tsx
git commit -m "feat(ui): rewrite IpComparison with Tailwind + Lucide ArrowRight"
```

---

## Task 3: Rewrite IpInfoGrid

**Files:**
- Modify: `src/components/IpInfoGrid.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { ReactNode } from 'react'
import { Building2, Globe, MapPin, Clock } from 'lucide-react'
import type { IpInfo } from '../types'

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
}

export function IpInfoGrid({ info, isAlert }: Props) {
  const location = [info.city, info.region].filter(Boolean).join(', ') || 'Unknown'
  const iconCls = `flex-shrink-0 ${isAlert ? 'text-red-400' : 'text-slate-400'}`
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Cell label="服务商" value={info.organization} isAlert={isAlert} icon={<Building2 className={iconCls} size={8} strokeWidth={2.5} />} />
      <Cell label="组织" value={info.asn_organization} isAlert={isAlert} icon={<Globe className={iconCls} size={8} strokeWidth={2.5} />} />
      <Cell label="位置" value={location} isAlert={isAlert} icon={<MapPin className={iconCls} size={8} strokeWidth={2.5} />} />
      <Cell label="时区" value={info.timezone} isAlert={isAlert} icon={<Clock className={iconCls} size={8} strokeWidth={2.5} />} />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/IpInfoGrid.tsx
git commit -m "feat(ui): rewrite IpInfoGrid with Tailwind + Lucide icons"
```

---

## Task 4: Rewrite SettingsSection (Toggle + Framer Motion)

**Files:**
- Modify: `src/components/SettingsSection.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import { enable, disable } from '@tauri-apps/plugin-autostart'
import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Lock, Monitor, Bell } from 'lucide-react'
import { saveConfig } from '../store/config'

interface ToggleProps {
  label: string
  description: string
  icon: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ label, description, icon, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-[5px]">
      <div className="flex items-center gap-2">
        <div className="w-[18px] h-[18px] rounded-[5px] bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-[11px] font-medium text-gray-700">{label}</div>
          <div className="text-[8.5px] text-slate-400 mt-px">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-8 h-[18px] rounded-full transition-colors duration-200 focus:outline-none"
        style={{ background: checked ? '#059669' : '#e2e8f0' }}
      >
        <motion.div
          className="absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm"
          animate={{ x: checked ? 14 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
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
      <div className="mb-2">
        <div className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500 mb-1.5">
          <Lock size={10} strokeWidth={2.5} />
          锁定 IP
          <span className="font-normal text-slate-400">
            {isMonitoring ? '（监控中不可修改）' : '（回车确认）'}
          </span>
        </div>
        {isMonitoring ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-[5px] text-[11px] font-mono text-amber-900">
            {lockedIp}
          </div>
        ) : (
          <input
            value={lockedIpInput ?? ''}
            onChange={(e) => onLockedIpInputChange?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLockedIpConfirm?.()}
            placeholder="输入要监控的 IP 地址..."
            className={`w-full border rounded-lg px-2.5 py-[5px] text-[11px] font-mono outline-none focus:ring-2 transition-all ${
              lockedIpError
                ? 'bg-red-50 border-red-400 text-red-900 focus:ring-red-300'
                : 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-amber-300'
            }`}
          />
        )}
      </div>

      {/* Toggles */}
      <div className="border-t border-slate-100 pt-1">
        <Toggle
          label="开机自动启动"
          description="随系统启动常驻菜单栏"
          icon={<Monitor size={10} strokeWidth={2.5} className="text-slate-500" />}
          checked={launchAtLogin}
          onChange={handleLaunchAtLoginChange}
        />
        <div className="h-px bg-slate-100" />
        <Toggle
          label="强提醒模式"
          description="IP 变更时在屏幕居中弹出警告窗口"
          icon={<Bell size={10} strokeWidth={2.5} className="text-slate-500" />}
          checked={strongAlertEnabled}
          onChange={handleStrongAlertChange}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsSection.tsx
git commit -m "feat(ui): rewrite SettingsSection with Tailwind + Lucide + Framer Motion toggle"
```

---

## Task 5: Rewrite MainPanel

**Files:**
- Modify: `src/components/MainPanel.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ShieldCheck, ShieldAlert, Pin, RefreshCw, Play, Square, RotateCcw, LogOut } from 'lucide-react'
import type { AppConfig } from '../types'
import { loadConfig, isValidIp } from '../store/config'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'
import { SettingsSection } from './SettingsSection'

const BANNER_CFG = {
  idle: {
    gradient: 'linear-gradient(135deg, #1e293b, #0f172a)',
    shieldBg: 'rgba(255,255,255,0.08)',
    shieldGlow: 'none',
    title: 'IP 监控',
  },
  safe: {
    gradient: 'linear-gradient(135deg, #1e293b, #0f172a)',
    shieldBg: 'linear-gradient(135deg, #10b981, #059669)',
    shieldGlow: '0 2px 10px rgba(16,185,129,0.45)',
    title: 'IP 安全',
  },
  alert: {
    gradient: 'linear-gradient(135deg, #450a0a, #7f1d1d)',
    shieldBg: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    shieldGlow: '0 2px 10px rgba(220,38,38,0.45)',
    title: 'IP 变更',
  },
}

function BannerShield({ status }: { status: 'idle' | 'safe' | 'alert' }) {
  if (status === 'safe') return <ShieldCheck size={18} strokeWidth={2.5} className="text-white" />
  if (status === 'alert') return <ShieldAlert size={18} strokeWidth={2.5} className="text-white" />
  return <Shield size={18} strokeWidth={2.5} className="text-white/40" />
}

export function MainPanel() {
  const { state, startMonitoring, stopMonitoring, refreshCheck } = useMonitor()
  const [config, setConfig] = useState<AppConfig>({ lockedIp: '', launchAtLogin: false, strongAlertEnabled: true })
  const [lockedIpInput, setLockedIpInput] = useState('')
  const [lockedIpError, setLockedIpError] = useState(false)
  const [detectedAt, setDetectedAt] = useState('')

  useEffect(() => {
    loadConfig().then((c) => { setConfig(c); setLockedIpInput(c.lockedIp) })
  }, [])

  useEffect(() => {
    const win = getCurrentWebviewWindow()
    let unlisten: (() => void) | null = null
    win.onFocusChanged(({ payload: focused }) => { if (!focused) win.hide() })
      .then((fn) => { unlisten = fn })
    return () => { unlisten?.() }
  }, [])

  useEffect(() => {
    if (state.status === 'alert')
      setDetectedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
  }, [state.status])

  const handleStart = () => {
    if (!isValidIp(lockedIpInput)) { setLockedIpError(true); return }
    setLockedIpError(false)
    startMonitoring(lockedIpInput)
  }

  const handleQuit = () => {
    import('@tauri-apps/api/core').then(({ invoke }) => invoke('exit_app'))
  }

  const isMonitoring = state.status !== 'idle'
  const cfg = BANNER_CFG[state.status]
  const info = state.currentIpInfo

  return (
    <div
      className="w-full min-h-full select-none bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
    >
      {/* ── Banner ── */}
      <div style={{ background: cfg.gradient }} className="px-3.5 py-[11px] flex items-center gap-2.5">
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.shieldBg, boxShadow: cfg.shieldGlow }}
        >
          <BannerShield status={state.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-slate-100 tracking-[-0.02em] leading-none">
            {cfg.title}
          </div>
          <div className="mt-0.5 text-[9px] text-white/40">
            {state.status === 'idle' && '配置锁定 IP，开始持续监控'}
            {state.status === 'safe' && (state.isChecking ? '正在检查...' : `下次检查 ${state.countdown}s 后`)}
            {state.status === 'alert' && `检测于 ${detectedAt}`}
          </div>
        </div>
        <AnimatePresence>
          {state.status === 'safe' && (
            <motion.span
              key="safe"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-[9px] font-bold text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 rounded-full px-2 py-0.5 whitespace-nowrap"
            >
              匹配 ✓
            </motion.span>
          )}
          {state.status === 'alert' && (
            <motion.span
              key="alert"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-[9px] font-bold text-red-300 bg-red-950/30 border border-red-800/40 rounded-full px-2 py-0.5 whitespace-nowrap"
            >
              变更!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Body ── */}
      <div className="px-3 pt-2.5 pb-3">

        {/* IP card */}
        {info && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-2.5 mb-2 ${
              state.status === 'alert'
                ? 'bg-red-50 border border-red-200'
                : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-[8px] text-slate-400 uppercase tracking-[0.07em] font-semibold pt-px">当前 IP</span>
              <div className="flex items-center gap-1">
                {!isMonitoring && (
                  <button
                    onClick={() => { setLockedIpInput(info.ip); setLockedIpError(false) }}
                    className="flex items-center gap-[3px] h-[20px] px-[7px] bg-blue-50 text-blue-500 border border-blue-200 rounded-[6px] text-[9px] font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <Pin size={9} strokeWidth={2.5} />
                    填入
                  </button>
                )}
                <button
                  onClick={refreshCheck}
                  disabled={state.isChecking}
                  className="flex items-center gap-[3px] h-[20px] px-[7px] bg-slate-100 text-slate-500 border border-slate-200 rounded-[6px] text-[9px] font-semibold hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <motion.span
                    animate={state.isChecking ? { rotate: 360 } : { rotate: 0 }}
                    transition={state.isChecking ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
                    className="flex items-center"
                  >
                    <RefreshCw size={9} strokeWidth={2.5} />
                  </motion.span>
                  刷新
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CountryFlag countryCode={info.country_code} size={18} />
              <div>
                <div className={`text-[17px] font-mono font-bold tracking-[0.01em] leading-none ${
                  state.status === 'alert' ? 'text-red-600' : 'text-slate-900'
                }`}>
                  {info.ip}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-[3px]">
                  {[info.country, info.city].filter(Boolean).join(' · ')}
                  {info.asn ? ` · AS${info.asn}` : ''}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {!info && !state.error && (
          <div className="text-center py-2.5 text-[10px] text-slate-400">
            正在检测当前 IP…
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-1.5">
            {state.error}
          </div>
        )}

        {/* Alert: IP comparison */}
        {state.status === 'alert' && info && (
          <IpComparison lockedIp={state.lockedIp} currentIp={info.ip} detectedAt={detectedAt} />
        )}

        {/* Info grid */}
        {info && (
          <div className="mb-2">
            <IpInfoGrid info={info} isAlert={state.status === 'alert'} />
          </div>
        )}

        {/* Settings */}
        <div className="border-t border-slate-100 pt-2">
          <SettingsSection
            lockedIp={state.lockedIp}
            isMonitoring={isMonitoring}
            launchAtLogin={config.launchAtLogin}
            strongAlertEnabled={config.strongAlertEnabled}
            onLaunchAtLoginChange={(v) => setConfig((c) => ({ ...c, launchAtLogin: v }))}
            onStrongAlertChange={(v) => setConfig((c) => ({ ...c, strongAlertEnabled: v }))}
            lockedIpInput={lockedIpInput}
            onLockedIpInputChange={(v) => { setLockedIpInput(v); setLockedIpError(false) }}
            onLockedIpConfirm={handleStart}
            lockedIpError={lockedIpError}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 mt-2">
          {state.status === 'idle' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white rounded-lg py-2 text-[12px] font-bold shadow-[0_2px_8px_rgba(5,150,105,0.35)] hover:bg-emerald-700 transition-colors"
            >
              <Play size={12} strokeWidth={2.5} />
              开始监控
            </motion.button>
          )}
          {state.status === 'safe' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={stopMonitoring}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white rounded-lg py-2 text-[12px] font-bold shadow-[0_2px_8px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-colors"
            >
              <Square size={12} strokeWidth={2.5} />
              停止监控
            </motion.button>
          )}
          {state.status === 'alert' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={stopMonitoring}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white rounded-lg py-2 text-[12px] font-bold shadow-[0_2px_8px_rgba(220,38,38,0.3)] hover:bg-red-700 transition-colors"
            >
              <RotateCcw size={12} strokeWidth={2.5} />
              重置监控
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleQuit}
            className="flex items-center justify-center gap-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg px-2.5 py-2 text-[10px] hover:bg-slate-100 transition-colors"
          >
            <LogOut size={11} strokeWidth={2.5} />
            退出
          </motion.button>
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MainPanel.tsx
git commit -m "feat(ui): rewrite MainPanel with Tailwind + Lucide + Framer Motion"
```

---

## Task 6: Rewrite AlertModal

**Files:**
- Modify: `src/components/AlertModal.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ShieldAlert, X, RotateCcw } from 'lucide-react'
import { useMonitor } from '../hooks/useMonitor'
import { CountryFlag } from './CountryFlag'
import { IpInfoGrid } from './IpInfoGrid'
import { IpComparison } from './IpComparison'

export function AlertModal() {
  const { state } = useMonitor()
  const win = useRef(getCurrentWebviewWindow())
  const [detectedAt, setDetectedAt] = useState(
    new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  )

  useEffect(() => {
    if (state.status === 'alert') {
      setDetectedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }
  }, [state.status])

  const startDrag = () => { win.current.startDragging() }

  const handleClose = async () => {
    await win.current.hide()
  }

  const handleStopAndClose = async () => {
    await emit('alert-stop-monitoring', null)
    await handleClose()
  }

  const info = state.currentIpInfo

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="w-full select-none"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
    >
      {/* Title bar */}
      <div
        onMouseDown={startDrag}
        className="bg-gray-800 px-3 py-2 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-1.5 text-[9.5px] text-gray-500">
          <AlertTriangle size={10} strokeWidth={2.5} className="text-red-500" />
          IP 泄露警告
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          className="w-5 h-5 rounded-[5px] bg-white/10 flex items-center justify-center text-gray-500 hover:bg-white/20 hover:text-gray-300 transition-colors"
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      </div>

      {/* Red banner */}
      <div
        onMouseDown={startDrag}
        className="px-4 py-4 text-center cursor-move"
        style={{ background: 'linear-gradient(135deg, #7f1d1d, #dc2626)' }}
      >
        <div className="w-12 h-12 rounded-[14px] bg-white/15 flex items-center justify-center mx-auto mb-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
          <ShieldAlert size={26} strokeWidth={2} className="text-white" />
        </div>
        <div className="text-[15px] font-extrabold text-white mb-0.5">IP 已变更！可能泄露</div>
        <div className="text-[10px] text-white/70">检测时间：{detectedAt}</div>
        <div className="mt-2 text-[9px] text-white/55 bg-black/20 rounded-[5px] px-2.5 py-[3px] inline-block">
          检测已停止，请处理后重新启动监控
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3 bg-red-50">
        {info && (
          <>
            <IpComparison lockedIp={state.lockedIp} currentIp={info.ip} />

            <div className="flex items-center gap-2 mb-2">
              <CountryFlag countryCode={info.country_code} size={20} />
              <div>
                <div className="font-bold text-[12px] text-gray-900">{info.country || 'Unknown'}</div>
                <div className="text-[10px] text-slate-500">
                  {[info.city, info.region].filter(Boolean).join(', ')}
                  {info.asn ? ` · AS${info.asn}` : ''}
                </div>
              </div>
            </div>

            <div className="mb-2.5">
              <IpInfoGrid info={info} isAlert />
            </div>
          </>
        )}

        <div className="flex gap-1.5">
          <button
            onClick={handleStopAndClose}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white border-none rounded-lg py-2.5 text-[12px] font-bold hover:bg-red-700 transition-colors"
          >
            <RotateCcw size={12} strokeWidth={2.5} />
            重置监控并关闭
          </button>
          <button
            onClick={handleClose}
            className="bg-slate-100 text-gray-700 border-none rounded-lg px-3 py-2.5 text-[11px] hover:bg-slate-200 transition-colors"
          >
            关闭
          </button>
        </div>

        <div className="mt-1.5 text-center text-[9px] text-slate-400">
          可在设置中关闭强提醒弹窗
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AlertModal.tsx
git commit -m "feat(ui): rewrite AlertModal with Tailwind + Lucide + Framer Motion"
```

---

## Task 7: Visual smoke test

**Files:** None (verification only)

- [ ] **Step 1: Run full type-check and build check**

```bash
cd /Users/pony/dev/ai/clash-verge-rev/monitor
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Start dev server**

```bash
npm run tauri dev
```

Expected: Vite compiles without errors, Tauri window opens.

- [ ] **Step 3: Test idle state**

Click the tray icon to open the MainPanel. Verify:
- Dark navy banner with translucent Shield icon (no green/red glow)
- "IP 监控" title, "配置锁定 IP，开始持续监控" subtitle (white/40 opacity)
- "填入" (blue chip) and "刷新" (gray chip) buttons visible next to "当前 IP"
- Lucide icons visible in the info grid cells (Building2, Globe, MapPin, Clock)
- Lock icon before "锁定 IP" label
- Monitor + Bell icons in toggle rows
- Toggle spring animation when clicked
- "▶ 开始监控" → "开始监控" with Play icon, green
- "退出" with LogOut icon, ghost style

- [ ] **Step 4: Test safe state**

Enter a valid IP in the locked IP field, press Enter. Verify:
- Banner: ShieldCheck icon with green gradient background + green glow
- "匹配 ✓" chip animates in (fade + scale)
- "填入" chip disappears (monitoring active)
- "刷新" chip remains; clicking it spins the RefreshCw icon
- "停止监控" button with Square icon, red

- [ ] **Step 5: Test alert state**

Temporarily change `lockedIp` to a wrong IP to trigger alert, or wait for IP change. Verify:
- Banner shifts to dark red gradient, ShieldAlert icon with red glow
- "变更!" chip animates in
- IP card turns red-tinted, IP address in red text
- IpComparison shows green box → ArrowRight → red box
- Grid cells red-tinted
- "重置监控" button with RotateCcw icon

- [ ] **Step 6: Test AlertModal**

With strong alert enabled and alert state triggered. Verify:
- Modal slides in from top (Framer Motion spring)
- Title bar: AlertTriangle (red) + X button (Lucide X)
- Banner: ShieldAlert icon in rounded white-translucent square
- "重置监控并关闭" with RotateCcw icon, red
- Dragging title bar moves the window

- [ ] **Step 7: Final commit**

```bash
git add -p  # review any leftover changes
git commit -m "feat(ui): complete UI redesign — Tailwind + Lucide + Framer Motion"
```
