# Shixu Desktop v1.2.1

Research scheduling and lab workflows for Windows and macOS.

## Highlights

- Organize research as **question → workflow → evidence → conclusion → next step**.
- Link wet-lab experiment results and file references to project analysis records; cite sources in findings, limitations and follow-up actions.
- Plan experiments with preparation checklists, hands-on/waiting steps, persistent timers and due-step notifications while the app is running.
- Use 12 editable bioinformatics planning scaffolds and export project records, research-plan drafts and weekly summaries as Markdown.
- Open in English by default, switch to Chinese when needed, and retain user-authored text in its original language.
- Start with an empty workspace. Click **Load examples** to add six fictional English plant projects, 18 tasks and six experiments. Repeated loading preserves edits and avoids duplicate projects.
- Includes fixes for launch-at-login status and edge-docked floating-panel expansion.
- Store records locally, with JSON import/export and rotating save backups. Linked files stay in place and are not included in JSON exports.

## Downloads

| Platform | Recommended download |
| --- | --- |
| Windows x64 (Intel/AMD) | `Shixu-Desktop-1.2.1-win-x64.exe` |
| macOS Apple Silicon (M-series) | `Shixu-Desktop-1.2.1-mac-arm64.dmg` |
| macOS Intel | `Shixu-Desktop-1.2.1-mac-x64.dmg` |

Architecture-specific macOS ZIP archives, SHA-256 checksums, and validation reports are also attached. Source code is available through GitHub's source archives.

## Validation and limits

The release workflow runs 58 automated tests, verifies packaged source files, tests Windows installation/startup/uninstallation, and validates macOS ad-hoc signatures, mounted DMGs, ZIP archives and native Apple Silicon startup. These checks do not replace interactive acceptance on every supported OS; native Intel Mac startup has not been tested.

Windows packages do not have a publisher certificate. macOS apps have ad-hoc signatures but are not Developer ID signed or Apple notarized; the operating system may request approval. Do not disable system security protections.

Existing records and saved language preferences are retained. Export a JSON backup before installing. Early `2.0.0-beta.*` development builds have a higher internal version number than this requested public release; automatic upgrade from those builds is not asserted. The data directory remains `Shixu Desktop 2 Beta` for compatibility.

Workflow scaffolds support planning and documentation, not automatic pipeline execution. Example findings are fictional; file paths are placeholders. Timers do not certify experimental success, and notifications require the app to be running.

## 中文说明

- 默认英文界面与空白工作区，点击 **Load examples / 载入示例** 后才加入六个英文植物课题。
- 研究问题、分析流程、实验证据、结论和下一步行动相互关联，可复用为项目记录及汇报草稿。
- 提供湿实验清单、步骤计时、分析记录、结果引用和中英文界面，并修复自启动状态与贴边悬浮窗展开问题。
- 更新前请导出 JSON 备份。软件保留已有记录、语言设置及原数据目录；不会自动翻译或清空中文记录。
- Windows 尚无发布者签名，Mac 尚未经过 Apple 公证；安装时请根据系统正式提示确认。
