# 时序调度 · Shixu Desktop

面向**分析 / 科研 / 多线办公**场景的 Windows 桌面优先级与项目进度工具。

- **调度**：按截止日、后果、深度工作自动排序  
- **项目进度**：里程碑 + 进度环 + 计划/已投入工时 + 阻塞  
- **分析等待**：提交等待 / 结果已到，机器跑任务时人可并行  
- **回看周报**：完成时间线，一键生成周总结 Markdown  
- **桌面体验**：置顶悬浮窗、托盘、开机自启、一键导入/导出  

数据保存在本机用户目录，**不会**上传到网络。

## 功能截图说明

| 模块 | 说明 |
|------|------|
| 调度 | 立刻处理 / 待深度块 / 今日 / 本周 / 可延后 / 等待结果 |
| 项目 | 里程碑完成比例、下一步、工时对比 |
| 周报 | 本周完成、进行中项目、阻塞、可写材料产出 |
| 悬浮窗 | 点击展开、记工时、提交等待 |

## 下载安装

到 [Releases](../../releases) 下载：

- `时序调度-Setup-x.x.x.exe` — 正式安装包  
- `时序调度-绿色版-x.x.x.zip` — 解压后运行「一键安装到桌面.bat」或 `时序调度.exe`

> 未购买代码签名证书时，Windows SmartScreen 可能提示：点 **更多信息 → 仍要运行**。

数据文件：`%APPDATA%\时序调度\shixu-data.json`

## 本地开发

```bash
npm install
npm start
```

国内网络建议镜像：

```powershell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
```

若 `node_modules/electron/path.txt` 缺失，写入一行：

```text
electron.exe
```

## 打包 Windows 安装包

```bash
# 可选：准备 portable 目录（修改界面后）
powershell -ExecutionPolicy Bypass -File scripts/sync-portable.ps1
# 或
python scripts/sync_and_fix.py

npm run dist
```

产物：`release/时序调度-Setup-*.exe`

### 代码签名（可选）

```powershell
$env:SHIXU_CERT_FILE = "C:\path\to\your.pfx"
$env:SHIXU_CERT_PASSWORD = "your-password"
npm run dist
```

自签名仅适合自测，**对外分发请购买 OV/EV 代码签名证书**。

## 使用建议（高效工作流）

1. 早上锁定 1–2 个**深度主线**（分析 / 写作）  
2. 管线提交后点 **提交等待**，人去做可并行事项  
3. 结果到了点 **结果已到**，再深度处理  
4. 周五点 **生成本周总结**，导出 Markdown  

## 技术栈

- Electron 33  
- 原生 HTML/CSS/JS（无框架）  
- electron-builder（NSIS）  
- 数据：本地 JSON  

## 仓库结构

```text
electron/          主进程、托盘、IPC、自启、导入导出
renderer/          主界面 index.html + 悬浮窗 dock.html
assets/            应用图标
scripts/           同步 portable、自签名测试证书脚本
build-prepackaged.js  打包入口
```

## License

MIT — 见 [LICENSE](./LICENSE)
