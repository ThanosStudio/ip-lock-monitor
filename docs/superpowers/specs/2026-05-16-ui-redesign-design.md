# UI Redesign — Tailwind + Lucide + Framer Motion

**Date:** 2026-05-16  
**Status:** Approved

## Summary

Full UI/UX overhaul of the IP monitor macOS menu bar app. Replace all inline styles with TailwindCSS, replace Unicode/emoji icons with Lucide React, and add Framer Motion micro-animations. Goal: premium, high-quality feel — not cheap.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Color theme | Dark banner + light content body | Preserves existing visual identity while making content cleaner |
| Icon buttons | Text+icon chip (always visible) | Original ⊙ / ↻ Unicode were too ambiguous; labeled chips are immediately legible |
| Animation library | Framer Motion | Spring animations on toggles, rotation on refresh, fade/slide on status changes |
| Icon library | Lucide React | Consistent stroke weight, tree-shakeable, MIT licensed |
| CSS framework | TailwindCSS v3 + PostCSS | Replaces all 100+ inline style objects |

## Tech Stack Changes

### New dependencies
```
lucide-react        — icon components
framer-motion       — animation
tailwindcss         — CSS framework (devDep)
postcss             — CSS processing (devDep)
autoprefixer        — vendor prefixes (devDep)
```

### New config files
- `tailwind.config.js` — content paths pointing to `src/**/*.{ts,tsx}`
- `postcss.config.js` — tailwindcss + autoprefixer plugins
- `src/styles.css` — replace current rules with Tailwind `@tailwind` directives (keep reset rules)
- `vite.config.ts` — no changes needed (Vite auto-detects PostCSS config)

## Component Designs

### Banner (top of MainPanel)

Dark gradient `#1e293b → #0f172a`. Three visual states:

| State | Shield icon | Badge |
|---|---|---|
| `idle` | Shield outline, `rgba(255,255,255,0.4)` stroke, translucent bg | none |
| `safe` | ShieldCheck, white stroke, `#10b981→#059669` bg + green glow | "匹配 ✓" green chip |
| `alert` | ShieldAlert, white stroke, `#dc2626→#b91c1c` bg + red glow | "变更!" red chip |

Framer Motion: `AnimatePresence` on the status badge so it fades/scales in when status changes.

### IP Card

White card (`bg-slate-50 border border-slate-200 rounded-xl`).

Top row:
- Left: "当前 IP" label (8px uppercase slate-400)
- Right: chip button cluster — only shown when not monitoring for "填入", always shown for "刷新"
  - **填入** chip: `bg-blue-50 text-blue-500 border-blue-200` + Pin icon (Lucide)
  - **刷新** chip: `bg-slate-100 text-slate-500 border-slate-200` + RefreshCw icon (Lucide)
  - RefreshCw spins via Framer Motion `animate={{ rotate: 360 }}` while `isChecking`

IP address: `font-mono font-bold text-[17px] text-slate-900` (red `text-red-600` in alert state)

Framer Motion: card fades in with `initial={{ opacity: 0, y: 4 }}` on mount.

### Info Grid (IpInfoGrid)

2×2 grid. Each cell gets a Lucide icon next to the label:

| Cell | Icon |
|---|---|
| 服务商 | `Building2` |
| 组织 | `Globe` |
| 位置 | `MapPin` |
| 时区 | `Clock` |

Alert state: red-tinted background + red text.

### Settings Section (SettingsSection)

**Locked IP label:** `Lock` icon (Lucide) + "锁定 IP" text.

**Input field:** `bg-amber-50 border-amber-300` with `focus:ring-2 focus:ring-amber-400` Tailwind focus ring. Error state: `bg-red-50 border-red-400`.

**When monitoring (read-only):** `bg-amber-50 border-amber-200 text-amber-900 font-mono` display box.

**Toggle rows:** Each row gets a small icon in a rounded square (`bg-slate-100 border border-slate-200`):
- 开机自动启动 → `Monitor` icon
- 强提醒模式 → `Bell` icon

**Toggle component:** Framer Motion `layout` transition on the dot for spring animation. `transition={{ type: 'spring', stiffness: 500, damping: 30 }}`.

### Action Buttons

| State | Primary button | Secondary |
|---|---|---|
| `idle` | `Play` + "开始监控" (green) | `LogOut` + "退出" (ghost) |
| `safe` | `Square` + "停止监控" (red) | `LogOut` + "退出" (ghost) |
| `alert` | `RotateCcw` + "重置监控" (red) | `LogOut` + "退出" (ghost) |

All buttons: `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.97 }}` via Framer Motion.

### IpComparison

Same layout: green box (locked IP) → Arrow icon (`ArrowRight` Lucide, red) → red box (current IP). Replace "≠" unicode with the Lucide arrow.

### AlertModal

**Title bar:** Drag region. `AlertTriangle` icon (red, small) + "IP 泄露警告" text. `X` icon button (Lucide) for close.

**Red banner:** `ShieldAlert` icon in a rounded square with translucent white background, replacing the 🚨 emoji. Title + detection time + notice chip.

**Body:** Same IpComparison + flag row + IpInfoGrid (all alert-tinted). Two buttons:
- `RotateCcw` + "重置监控并关闭" (red primary)  
- "关闭" (ghost)

**Animation:** AlertModal window slides in from top: `initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}`.

## File Change Map

| File | Change |
|---|---|
| `package.json` | Add `lucide-react`, `framer-motion`; add `tailwindcss`, `postcss`, `autoprefixer` as devDeps |
| `tailwind.config.js` | New file |
| `postcss.config.js` | New file |
| `src/styles.css` | Replace with Tailwind directives + minimal reset |
| `src/components/MainPanel.tsx` | Full rewrite with Tailwind + Lucide + Motion |
| `src/components/AlertModal.tsx` | Full rewrite with Tailwind + Lucide + Motion |
| `src/components/SettingsSection.tsx` | Full rewrite with Tailwind + Lucide + Motion |
| `src/components/IpInfoGrid.tsx` | Full rewrite with Tailwind + Lucide + Motion |
| `src/components/IpComparison.tsx` | Full rewrite with Tailwind + Lucide + Motion |
| `src/components/CountryFlag.tsx` | No change (pure unicode emoji, no styling) |
| `src/hooks/useMonitor.ts` | No change |
| `src/store/config.ts` | No change |
| `src/types.ts` | No change |
| `vite.config.ts` | No change (auto-detects postcss.config.js) |

## Constraints

- Window size unchanged (Tauri config untouched)
- All Tauri API calls, hooks, and state machine unchanged — pure UI layer changes
- TypeScript strict mode: no unused imports (tailwind class strings are fine)
- `userSelect: 'none'` preserved on root elements (drag region behavior)
- `onFocusChanged` hide-on-blur logic in MainPanel unchanged
- All Chinese strings preserved as-is
