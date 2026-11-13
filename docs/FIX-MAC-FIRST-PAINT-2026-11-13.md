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

The author's Intel desktop result remains pending v1.0.7 retesting. Stable latest remains v1.0.5 until that confirmation.
