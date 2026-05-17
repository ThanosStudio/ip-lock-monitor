# IP Monitor

IP Monitor 是一个独立的 macOS 菜单栏应用，用来持续检查当前出口 IP 是否仍然等于你锁定的代理 IP。它适合在使用代理、VPN、远程办公网络或需要避免真实 IP 暴露的场景中作为本地提醒工具。

## 功能亮点

- 菜单栏常驻监控：通过托盘图标显示空闲、安全、告警三种状态。
- 锁定出口 IP：一键把当前 IP 填入锁定值，开始持续监控。
- 周期检查：默认每 60 秒检查一次当前公网 IP。
- 强提醒弹窗：发现 IP 变化后弹出置顶告警窗口，并停止后续轮询。
- 告警信息对比：展示锁定 IP、当前 IP、国家/地区、城市、ASN 和运营商信息。
- 监控统计：告警窗口顶部显示本次监控已检查次数和已护航时长。
- 开机启动：可在设置中开启 macOS 登录后自动启动。

## 截图说明

应用包含两个核心界面：

- 菜单栏面板：配置锁定 IP、查看当前 IP、控制监控开关。

![](./screenshots/main.png)

- 告警弹窗：当出口 IP 变化时置顶提示，并给出 IP 差异和监控统计。

![](./screenshots/dialog.png)


## 开发

```bash
npm install
npm run tauri dev
```

常用检查：

```bash
npm test -- --run
npx tsc --noEmit
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## 发布

发布脚本会执行测试、前端构建、Tauri DMG 打包、生成 sha256 文件、推送当前分支和 tag，并创建 GitHub Release。

```bash
npm run release -- \
  --repo ThanosStudio/ip-lock-monitor \
  --remote-url git@github.com:ThanosStudio/ip-lock-monitor.git
```

Dry-run：

```bash
DRY_RUN=1 npm run release -- \
  --repo ThanosStudio/ip-lock-monitor \
  --remote-url git@github.com:ThanosStudio/ip-lock-monitor.git
```

## 技术栈

- Tauri v2
- React 18
- TypeScript
- Vite
- Tailwind CSS utility classes

## 许可

MIT License. See [LICENSE](LICENSE).
