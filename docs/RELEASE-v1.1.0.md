# Shixu Desktop v1.1.0

A unified stable release for Windows x64, Intel Mac and Apple Silicon Mac. All installers and application metadata use version 1.1.0.

## Included behavior

- The macOS floating window waits for its first rendered frame before appearing, fixing the white backing observed around the Intel Mac floating ball.
- Startup hide/show requests are respected while the floating window is being prepared.
- The floating ball supports dragging, persistent positioning, hover reveal and expanded task views, including compact-view scrolling.
- Projects connect research questions, analysis plans, experiment records, linked evidence, conclusions and next actions.
- A fresh installation opens in English with an empty workspace. English plant examples are added through Projects → Load examples.
- Windows launch at login uses the application's verified startup entry.

The application name remains Shixu Desktop. The application identity and local data directory are retained when upgrading.

## Downloads

| Platform | Installer |
| --- | --- |
| Windows 10/11 x64 | [EXE](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.1.0/Shixu-Desktop-1.1.0-win-x64.exe) |
| macOS Intel | [DMG](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.1.0/Shixu-Desktop-1.1.0-mac-x64.dmg) or [ZIP](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.1.0/Shixu-Desktop-1.1.0-mac-x64.zip) |
| macOS Apple Silicon | [DMG](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.1.0/Shixu-Desktop-1.1.0-mac-arm64.dmg) or [ZIP](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.1.0/Shixu-Desktop-1.1.0-mac-arm64.zip) |

The release includes SHA-256 checksums and platform validation reports.

## Upgrade

Export a JSON backup and completely quit Shixu, including its tray or menu-bar/background instance. Install the Windows application in the same location or replace the existing macOS application. Existing research files remain in their original locations.

These are rebuilt installers with the internal version changed to 1.1.0. Functional application sources retain the previously verified behavior.

## Validation

The release workflow runs automated tests and checks packaged sources, internal version, native architecture, startup and isolated record/settings retention. Windows additionally checks the installed executable and launch-at-login behavior. Both Mac architectures require DMG/ZIP integrity, ad-hoc signature, native geometry and renderer transparency checks, plus real desktop captures in English and Chinese before and after repeated expansion/collapse.

Desktop captures use a disposable signed application copy with a capture synchronization hook. The controlled background is kept above normal windows and below Shixu's floating window, including on small displays; renderer initialization completes before the capture sequence. The distributed application is unchanged by this verification.

The author confirmed normal use of the preceding Intel Mac build. v1.1.0 has a new build and its own automated validation reports; an itemized user test of the rebuilt packages is not inferred.

Windows installers do not have a publisher certificate. macOS packages use ad-hoc signatures and are not Developer ID signed or notarized.
