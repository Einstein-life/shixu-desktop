# macOS floating-ball white backing: actual packaged-app reproduction

The author reported that v1.0.6 Intel still showed a white rounded rectangle on a 2020 Intel Mac Pro running macOS Sequoia 15.7.9, with Reduce Transparency disabled. The v1.0.6 hidden/offscreen pixel tests did not establish the visible desktop result.

## Reproduction and differential result

A dedicated `macos-15-intel` runner reported macOS 15.7.9 (24G830), matching the author's OS version. Diagnostic work used only a synthetic blue backdrop and isolated records. Normal signed application processes were captured with `/usr/sbin/screencapture`; no DevTools or remote debugger was connected to the decisive experiment. Disposable application copies contained a capture synchronization hook. The distributed application and user data were not modified by that diagnostic.

| Native startup configuration | Normal startup screenshot | After six expansion/collapse cycles |
| --- | --- | --- |
| v1.0.6: surface shown at construction | White outside the ball | White outside the ball |
| Native rounded corners disabled | White | White |
| Panel window | White | White |
| Workspace process transformation skipped | White | White |
| Reset clear background after load/show | White | White |
| Window hidden until ready-to-show | Synthetic backdrop visible outside ball | Synthetic backdrop visible outside ball |

The diagnostic logs and desktop screenshots are archived at https://github.com/Einstein-life/shixu-desktop/actions/runs/43397184031. This provides evidence for a first-visible-frame timing fix; it does not establish every internal AppKit/Chromium mechanism or represent the author's GPU configuration.

## v1.0.7 change

The macOS floating BrowserWindow is created with `show: false`. A one-time `ready-to-show` handler reveals it after the first frame using `showInactive()`. Visibility requested by the tray/menu or hide control is tracked during that wait, so a user-hidden window is not reopened by a delayed event. Windows retains its existing startup visibility. Transparent background, disabled native shadow and macOS manual-resize settings from v1.0.6 are retained.

Three new lifecycle tests cover delayed reveal, hide-before-ready and repeated visibility toggles while first-frame rendering is pending. All 112 automated tests pass before packaging. The v1.0.7 Mac workflow also launches a signed disposable copy of the packaged application normally, captures the real desktop over a synthetic backdrop and requires the backdrop to remain visible outside the ball in both languages, before and after six size cycles. Package-source, signature, archive, startup and record-retention checks remain required.

The Intel job of run https://github.com/Einstein-life/shixu-desktop/actions/runs/43403581640 passed all checks on Sequoia 15.7.9 (24G830), including both languages and startup/after-six-resizes desktop screenshots. All four samples outside the ball matched the blue backdrop exactly in each of the four screenshots. The Apple Silicon job passed packaging and offscreen checks but failed the visible screenshot comparison on Sequoia 15.8.2; its screenshots showed a dark panel background rather than the expected blue backdrop. That failure is unresolved, and no v1.0.7 Apple Silicon package is distributed. The matrix run as a whole therefore failed; only the successful Intel job supports this prerelease.

On 17 November 2026, the author confirmed that the tested Mac version works normally and requested official publication. The exact Intel DMG and ZIP from this test distribution are promoted to stable v1.0.7 without rebuilding. This general user confirmation does not add claims about individual operations that the author did not enumerate. The prior automated checks remain as recorded. Windows and Apple Silicon stable packages remain at v1.0.5; the unresolved Apple Silicon screenshot result is not covered by the Intel confirmation. See [official release notes](RELEASE-v1.0.7.md).
