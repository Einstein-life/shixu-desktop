# Floating-ball white background on macOS: inspection and source fix

Date: 13 November 2026.

## Observation and diagnosis

The user's Intel Mac screenshot shows the basketball-shaped floating control inside a larger white rounded rectangle. The renderer already uses transparent backgrounds for html, body, the collapsed shell, and the ball container. There is no white background in the ball-mode CSS.

The native floating BrowserWindow was created with `transparent: true` and `resizable: true`, without an explicit `backgroundColor` or shadow setting. Electron 33.4.11's transparent-window documentation states that enabling resizing may make transparency stop working on some platforms. Window options document white as the default background color and enable shadows by default. This is a relevant native transparency configuration defect consistent with the reported appearance; the Intel macOS compositor was not available for a direct before/after reproduction in this Windows workspace.

## Change

In `electron/main.js`, the floating window now specifies `backgroundColor: '#00000000'` and `hasShadow: false`. On macOS, `resizable` is false, avoiding the documented transparent-window limitation. Application controls continue to resize the window using setBounds for the ball, compact panel, and expanded panel. Windows retains its existing resizable setting. No CSS palette, task records, startup registration, application identity, or data-directory changes were made for this fix.

## Checks completed

- Added constructor regression checks for macOS and Windows. The new assertions failed before the source change and pass afterward.
- Source validation and all 109 automated tests pass, including floating-ball dragging, position retention, repeated expansion/collapse and Edge-mode recovery.
- The real Chinese and English renderer pages were exercised in Chromium at device scale 2. After 12 expand/collapse cycles, every pixel outside the ball's rectangle had alpha 0, and the ball remained visible.
- A hidden Electron 33.4.11 test used the production macOS constructor options on Windows with an isolated profile. Programmatic size changes still worked with manual resizing disabled, and captured corner pixels had alpha 0. Windows added two pixels to non-resizable native bounds; that platform rounding is recorded in the native test report.

These checks validate configuration, renderer alpha and regression behavior. They do not establish that the white rectangle has disappeared on the user's Intel Mac. A rebuilt macOS package must be visually checked on that device, including return-to-ball, hover reveal, drag, repeated resize, and appearance under the user's display settings.

Evidence is saved in `.build/mac-ball-transparency-20261113/`: `renderer-alpha-verification.json`, `native-geometry-verification.json`, alpha PNGs, and pre-change source copies. The isolated tests did not read or modify the installed user's workspace.

This fix is prepared for the v1.0.6 macOS prerelease. The workflow records packaging, native-window configuration and alpha checks; the author's Intel Mac desktop appearance test remains pending. See `TEST-v1.0.6-MAC-TRANSPARENCY.md`. Stable v1.0.5 installers remain unchanged.

## Official references inspected

- [Electron 33.4.11 transparent-window limitations](https://github.com/electron/electron/blob/v33.4.11/docs/tutorial/custom-window-styles.md#transparent-windows)
- [Electron 33.4.11 window options](https://github.com/electron/electron/blob/v33.4.11/docs/api/structures/base-window-options.md): backgroundColor, transparent, resizable, and hasShadow.
- [Electron 33.4.11 macOS native-window implementation](https://github.com/electron/electron/blob/v33.4.11/shell/browser/native_window_mac.mm): transparent-window initialization, SetBackgroundColor and SetResizable.
