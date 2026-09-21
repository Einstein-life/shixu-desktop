# 时序调度 · Shixu Desktop

**Windows 桌面效率工具**：帮你排清「今天先做什么」，并跟踪长期项目进度。

适合分析、科研、写作、项目等多线工作：任务容易碎片化，既要推进深度工作，又要处理会议、沟通与等待程序出结果的空档。

[![Release](https://img.shields.io/badge/download-Releases-blue)](../../releases)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 为什么需要它

| 常见困境 | 时序怎么帮 |
|----------|------------|
| 待办很多，不知道先做哪件 | 按截止日、后果、是否深度工作自动分档：立刻 / 今日 / 本周 / 可延后 |
| 长期论文、课题进度说不清 | 项目 + 里程碑，进度环一眼可见，标出「下一步」 |
| 分析程序在跑，人干等 | 「提交等待 → 可并行 → 结果已到」，机器跑机器的，人做人该做的 |
| 周五想复盘却凑不齐内容 | 完成事项自动进时间线，一键生成周报 Markdown |
| 切窗口时看不到优先级 | 置顶悬浮窗：收起看摘要，点击展开，可拖到任意位置 |

数据保存在本机用户目录，**不会上传到服务器**。

---

## 功能一览

### 调度
- 录入事项：类型、截止、后果、连续时间需求、关联项目
- 自动分档，支持快捷记工时（+15 分 / +30 分 / +1 小时）
- 分析类任务可标记 **提交等待 / 结果已到**

### 项目进度
- 里程碑清单与完成比例
- 计划工时 vs 已投入工时
- 阻塞、目标日期、下一步
- 一键把「下一步」生成为今日事项

### 回看与周报
- 已完成事项时间线
- 周总结草稿：完成情况、项目进度、下周重点、阻塞、产出提示
- 导出 Markdown / JSON

### 桌面体验
- 主窗口（调度 / 项目 / 回看）
- 置顶悬浮窗（托盘可显示隐藏）
- 开机自启开关
- 一键导入 / 导出 JSON

---

## 下载安装

前往 **[Releases](../../releases)** 获取最新安装包：

| 包 | 适合 |
|----|------|
| `时序调度-Setup-x.x.x.exe` | 正式安装（推荐），创建桌面与开始菜单快捷方式 |
| `时序调度-绿色版-x.x.x.zip` | 免安装：解压后运行「一键安装到桌面.bat」或 `时序调度.exe` |

**系统要求**：Windows 10 / 11（64 位）

**SmartScreen 提示**：若未购买代码签名证书，首次运行可能提示「已保护你的电脑」→ 选择 **更多信息 → 仍要运行**。

数据文件位置：

```text
%APPDATA%\时序调度\shixu-data.json
```

每人独立存放，首次启动为空，可在应用内录入，或用「一键导入」加载 JSON。

---

## 快速上手

1. **录入事项**（或导入 JSON）  
2. 顶部选择当前连续时间：≤15 分 / 30 分 / 1 小时 / 2 小时+  
3. 按「立刻处理」开始做事；深度工作尽量放进整块时间  
4. 管线、跑数等点 **提交等待**，利用空档做可并行事项  
5. 结果出来点 **结果已到**，处理完再标记完成  
6. 每周点 **生成本周总结**，导出 Markdown 备用  

### 推荐工作节奏（示例）

| 时段 | 做什么 |
|------|--------|
| 上午整块 | 1–2 个深度主线（分析 / 写作） |
| 会前、等待结果 | ≤15–30 分碎片任务 |
| 会后 15 分钟 | 写下行动项与截止日 |
| 周五 | 生成周报，归档已完成事项 |

---

## 从源码运行

```bash
git clone https://github.com/Einstein-life/shixu-desktop.git
cd shixu-desktop
npm install
npm start
```

依赖：[Node.js](https://nodejs.org/) 20+、Git。

**网络较慢时**（如国内）可使用镜像后再安装：

```powershell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
npm install
```

> 若出现 Electron 未正确安装：确认 `node_modules/electron/path.txt` 内容为一行 `electron.exe`。

---

## 打包 Windows 安装包

```bash
# 同步界面资源到 portable（修改 renderer/electron 后建议执行）
python scripts/sync_and_fix.py
# 或
powershell -ExecutionPolicy Bypass -File scripts/sync-portable.ps1

npm run dist
```

产物目录：`release/时序调度-Setup-*.exe`

### 代码签名（可选）

```powershell
$env:SHIXU_CERT_FILE   = "C:\path\to\your.pfx"
$env:SHIXU_CERT_PASSWORD = "your-password"
npm run dist
```

对外正式分发建议购买 **OV / EV** 代码签名证书；自签名仅适合本地测试。

### CI

仓库自带 GitHub Actions（`.github/workflows/build-windows.yml`）：  
推送形如 `v1.0.0` 的标签后，可在 Actions 中自动构建 Windows 安装包。

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 项目结构

```text
electron/       主进程：窗口、托盘、开机自启、导入导出、数据存储
renderer/       界面：主窗口 index.html、悬浮窗 dock.html
assets/         应用图标
scripts/        打包同步、本地证书脚本
```

技术栈：Electron · 原生 HTML/CSS/JS · electron-builder（NSIS）· 本地 JSON

---

## 数据与隐私

- 任务、项目、周报仅存本机  
- 导入 / 导出由你自己触发，使用系统文件对话框  
- 本仓库 **不会** 收集使用数据  

---

## 贡献

欢迎 Issue 与 Pull Request：

1. Fork 本仓库  
2. 创建分支：`git checkout -b feature/your-idea`  
3. 提交并推送  
4. 发起 Pull Request  

请勿提交：个人任务数据、证书与密钥、`node_modules/`、`release/` 安装包。

---

## License

[MIT](./LICENSE) © 时序调度 contributors
