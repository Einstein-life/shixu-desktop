# 时序调度 · Shixu Desktop

**Windows / macOS 桌面效率工具**：帮你排清「今天先做什么」，并跟踪长期项目进度。

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

- **调度**：自动分档、记工时、关联项目
- **项目进度**：里程碑、工时对比、阻塞、下一步
- **分析等待**：提交等待 / 结果已到 / 可并行
- **周报**：完成时间线 + Markdown 导出
- **桌面**：置顶悬浮窗、托盘、开机自启、一键导入导出

---

## 下载安装

前往 **[Releases](../../releases)** 获取安装包：

### Windows

| 包 | 说明 |
|----|------|
| `时序调度-Setup-x.x.x.exe` | 正式安装包（推荐） |
| `shixu-Portable.zip` | 绿色版 |

要求：Windows 10 / 11（64 位）。未签名时 SmartScreen：**更多信息 → 仍要运行**。

### macOS

| 包 | 说明 |
|----|------|
| `Shixu-Desktop-x.x.x-mac-arm64.dmg` | Apple Silicon（M 系列） |
| `Shixu-Desktop-x.x.x-mac-x64.dmg` | Intel |
| 对应 `.zip` | 免安装压缩包 |

要求：macOS 11+。未签名 / 未公证时首次打开：

1. 右键 App → **打开**（不要直接双击）  
2. 或在「系统设置 → 隐私与安全性」中仍要打开  

> 未购买 Apple Developer 证书前，Gatekeeper 会拦截直接双击，属预期行为。

数据文件：

- Windows：`%APPDATA%\时序调度\shixu-data.json`
- macOS：`~/Library/Application Support/时序调度/shixu-data.json`

---

## 快速上手

1. 录入事项或导入 JSON  
2. 选择当前连续时间（≤15 分 / 30 分 / 1 小时 / 2 小时+）  
3. 从「立刻处理」开始；深度工作放进整块时间  
4. 跑程序点 **提交等待**，空档做可并行事项  
5. 结果到了点 **结果已到**  
6. 每周 **生成本周总结** 并导出  

---

## 从源码运行

```bash
git clone https://github.com/Einstein-life/shixu-desktop.git
cd shixu-desktop
npm install
npm start
```

依赖：Node.js 20+。

网络较慢时可使用镜像：

```bash
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
npm install
```

---

## 打包

### Windows

```bash
python scripts/sync_and_fix.py
npm run dist:win
```

### macOS（需在 macOS 上执行）

```bash
node scripts/make-icns.js
npm run dist:mac
```

产物在 `release/`。

### 自动构建

推送 `v*` 标签后，GitHub Actions 会在 **Windows + macOS** 双平台出包并挂到 Release：

```bash
git tag v1.0.1
git push origin v1.0.1
```

---

## 项目结构

```text
electron/       主进程：窗口、托盘、自启、导入导出
renderer/       主窗口 + 悬浮窗
assets/         图标
scripts/        打包与图标脚本
build-*.js      各平台构建入口
```

---

## 隐私

任务、项目、周报仅存本机；导入导出由你手动触发；不收集使用数据。

---

## License

[MIT](./LICENSE) © 时序调度 contributors
