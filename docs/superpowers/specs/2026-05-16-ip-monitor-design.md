# IP 监控 macOS App 设计文档

**日期**: 2026-05-16  
**项目路径**: `/Users/pony/dev/ai/clash-verge-rev/monitor/`  
**状态**: 设计已确认，待实现

---

## 一、项目概述

一个独立的 macOS 菜单栏应用，用于实时监控代理 IP 是否发生变化。用户锁定一个目标 IP，应用每 60 秒检查一次当前 IP，若 IP 变更则立即告警，防止真实 IP 泄露。

**核心价值**: 长时间运行 clash 代理时，代理可能失效或 IP 漂移，本工具提供持续监控和及时告警。

---

## 二、技术栈

| 层 | 技术 |
|---|---|
| 框架 | Tauri v2 |
| 前端 | React + TypeScript + Vite |
| UI 组件 | 自定义组件（参考 clash-verge 风格，无需引入 MUI） |
| HTTP 请求 | `@tauri-apps/plugin-http` 的 `fetch` |
| 状态管理 | React useState / useEffect（轻量，无需 Redux） |
| 配置持久化 | Tauri Store plugin（`@tauri-apps/plugin-store`） |
| 开机自启 | `@tauri-apps/plugin-autostart` |
| 系统通知 | `@tauri-apps/plugin-notification` |
| 打包 | Tauri 内置 DMG 打包（macOS） |
| 平台 | macOS only |

---

## 三、应用架构

### 3.1 窗口结构

应用包含两个 Tauri 窗口，`App.tsx` 通过 `getCurrentWebviewWindow().label` 判断当前窗口，分别渲染 `<MainPanel>` 或 `<AlertModal>`：

**窗口 1：菜单栏弹出面板（`main` window）**
- 类型：无装饰窗口（`decorations: false`）
- 尺寸：340 × 自适应高度（约 420px）
- 显示方式：左键点击托盘图标后，定位在图标正下方弹出
- 焦点丢失自动隐藏（`on_blur` 事件触发隐藏）
- 初始状态：隐藏

**窗口 2：强提醒弹窗（`alert` window）**
- 类型：无装饰窗口，`always_on_top: true`
- 尺寸：360 × 自适应（约 440px）
- 显示方式：IP 变更时，若用户开启强提醒，居中显示
- 需用户主动关闭，不自动消失

### 3.2 系统托盘（Tray）

- 图标常驻 macOS 菜单栏
- **左键点击** → 切换显示/隐藏主面板窗口
- **右键点击** → 显示原生上下文菜单

右键菜单内容（根据状态动态切换）：
```
─────────────────
  🛡️ IP 监控
─────────────────
  ▶ 开始监控      ← 未监控时显示
  ⏹ 停止监控      ← 监控中时显示
─────────────────
  ✕ 退出程序
─────────────────
```

### 3.3 图标状态

| 状态 | 图标 | 说明 |
|---|---|---|
| 未启动 | 灰色盾牌 | App 启动但未开始监控 |
| 监控中·安全 | 绿色高亮盾牌 | IP 与锁定目标一致 |
| IP 变更告警 | 红色盾牌 + `!` | IP 不匹配，需用户处理 |

### 3.4 IP 检测服务

复用 clash-verge 的多服务轮询策略，随机打乱顺序，依次尝试直到成功：

1. `https://api.ip.sb/geoip`
2. `https://ipapi.co/json`
3. `https://api.ipapi.is/`
4. `https://ipwho.is/`
5. `https://ip.api.skk.moe/cf-geoip`
6. `https://get.geojs.io/v1/ip/geo.json`

每个服务超时 5000ms，最多重试 2 次。所有服务响应统一映射到 `IpInfo` 接口：

```typescript
interface IpInfo {
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
```

---

## 四、UI 设计

### 4.1 主面板三态

**状态一：未监控**（灰色横幅）
- 顶部：深灰色横幅，"IP 监控未启动"
- 中部：当前 IP 信息（国旗 + 国家 + 城市/AS + 2×2 信息网格：服务商/组织/位置/时区）
- 底部设置区：
  - 锁定 IP 输入框（可编辑，回车确认）
  - 「开机自动启动」toggle 开关
  - 「强提醒模式」toggle 开关
- 操作按钮：「▶ 开始监控」（绿色）+ 「退出程序」（浅色，红色文字）

**状态二：监控中·安全**（绿色横幅）
- 顶部：绿色渐变横幅，"IP 安全 · 正常" + 倒计时（检测中时显示"检查中..."，否则显示"下次检查 Xs 后"）
- 中部：当前 IP 信息网格（同上）+ 右上角 "IP 匹配 ✓" 徽章
- 底部设置区：
  - 锁定 IP 只读展示（黄色背景，标注"监控中不可修改"）
  - 「开机自动启动」toggle（可操作）
  - 「强提醒模式」toggle（可操作）
- 操作按钮：「⏹ 停止监控」（红色）+ 「退出程序」

**状态三：IP 变更告警**（红色横幅）
- 顶部：红色渐变横幅，"IP 已变更！可能泄露" + 检测时间
- 中部：IP 对比区（锁定 IP vs 当前 IP，绿色 vs 红色对比展示）+ 当前 IP 信息网格
- 底部设置区：同监控中状态（锁定 IP 只读 + 两个 toggle）
- 操作按钮：「⏹ 停止监控」（深红色）+ 「退出程序」

### 4.2 强提醒弹窗

- 独立 Tauri 窗口，无原生标题栏，always-on-top，屏幕居中
- 顶部有细拖拽条（可拖拽移动）+ 右侧「✕」关闭按钮
- 内容与面板告警状态完全一致（复用同一 React 组件）
- 不自动消失，需用户点击「关闭」或「⏹ 停止监控」
- 弹窗底部小字提示："可在设置中关闭强提醒弹窗"

### 4.3 国旗显示

使用 Unicode emoji 区域指示符生成国旗，与 clash-verge 方案一致：

```typescript
const getCountryFlag = (countryCode: string) => {
  return countryCode.toUpperCase().split('').map(
    char => String.fromCodePoint(127397 + char.charCodeAt(0))
  ).join('')
}
```

---

## 五、核心功能逻辑

### 5.1 监控循环

```
开始监控
  → 记录当前 IP 为锁定 IP（用户输入）
  → 启动 60s 倒计时
  → 每 60s: 调用 getIpInfo()
      → 成功: 比较 ip 字段与锁定 IP
          → 一致: 更新面板，重置倒计时，状态保持绿色
          → 不一致: 触发告警流程
      → 失败: 显示网络错误提示，继续倒计时（不误报）
停止监控
  → 清除定时器，清除告警状态，图标恢复灰色
```

### 5.2 告警流程

```
检测到 IP 变更
  → 更新面板状态为"告警"（红色横幅）
  → 更新托盘图标为红色 + !
  → 发送 macOS 系统通知（始终触发）
  → 若「强提醒弹窗」开关开启 → 显示 alert 窗口（居中，always-on-top）
```

### 5.3 配置持久化

使用 Tauri Store plugin 持久化以下配置（保存到 `~/.config/ip-monitor/config.json`）：

```typescript
interface AppConfig {
  lockedIp: string            // 锁定的目标 IP
  launchAtLogin: boolean      // 开机自启
  strongAlertEnabled: boolean // 强提醒弹窗开关
}
```

### 5.4 开机自启

使用 `@tauri-apps/plugin-autostart`：
- 开启时：注册 Login Item，随系统启动后仅显示托盘图标，不弹出面板
- 关闭时：注销 Login Item

---

## 六、文件结构

```
monitor/
├── src/
│   ├── main.tsx                   # React 入口
│   ├── App.tsx                    # 根组件，根据窗口 label 渲染不同内容
│   ├── components/
│   │   ├── MainPanel.tsx          # 主面板（三态）
│   │   ├── AlertModal.tsx         # 强提醒弹窗内容（复用组件）
│   │   ├── IpInfoGrid.tsx         # IP 信息 2×2 网格
│   │   ├── IpComparison.tsx       # IP 对比展示（告警态）
│   │   ├── SettingsSection.tsx    # 设置区（两个 toggle）
│   │   └── CountryFlag.tsx        # 国旗 emoji 组件
│   ├── services/
│   │   └── ip.ts                  # getIpInfo()，复用 clash-verge 逻辑
│   ├── store/
│   │   └── config.ts              # AppConfig 读写（Tauri Store）
│   └── hooks/
│       └── useMonitor.ts          # 监控循环核心 hook
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   └── tray.rs                # 托盘图标、菜单、左右键事件
│   ├── icons/                     # 三态托盘图标（灰/绿/红）
│   ├── Cargo.toml
│   └── tauri.conf.json            # 两个窗口配置，DMG 打包配置
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 七、打包配置

`tauri.conf.json` 关键配置：

- `bundle.targets`: `["dmg"]`
- `bundle.identifier`: `com.ipmonitor.app`
- `bundle.macOS.minimumSystemVersion`: `"13.0"`（Ventura+）
- 两个窗口配置：`main`（面板）和 `alert`（强提醒）
- 托盘图标：`bundle.resources` 包含三态图标文件

---

## 八、错误处理

| 场景 | 处理 |
|---|---|
| 所有 IP 服务请求失败 | 面板显示网络错误提示，不触发告警，继续下一轮检测 |
| 检测到 IP 变更但随后恢复 | 状态立即更新为安全（不保留历史告警） |
| 开机自启注册失败 | toast 提示用户，toggle 回滚，不崩溃 |
| 锁定 IP 格式无效 | 输入框红色边框提示，阻止开始监控 |
| 强提醒弹窗已打开时再次触发 | 不重复打开，聚焦已存在的弹窗 |

---

## 九、不在范围内

- Windows / Linux 支持（macOS only）
- 多 IP 监控（单一锁定 IP）
- 历史记录 / 日志
- 代理配置（仅监控，不控制代理）
- 自定义检测间隔（固定 60s）
