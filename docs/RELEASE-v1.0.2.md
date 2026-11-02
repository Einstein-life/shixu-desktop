# Shixu Desktop v1.0.2

This patch improves the floating task panel.

## Changes
- Scroll through all unfinished tasks in the compact floating panel instead of showing only the first three actionable tasks.
- Include individual results-ready and waiting tasks in the compact list, ordered by the existing state and priority rules.
- Add a visible scrollbar and keep the compact window size while scrolling. Clicking a task or the + button still opens the expanded panel.
- Fix low-contrast task titles on dark cards in the expanded panel, for both English and Chinese interfaces.

## Upgrade from v1.0.1
Quit Shixu, including its tray/background instance, then run the Windows installer in the same location. On macOS, quit Shixu and replace the existing app in Applications. The application identity, data format and local data directory are unchanged. Export a JSON backup before updating. Linked research files remain in their original locations.

## Downloads
- Windows x64: .exe installer.
- macOS Intel: mac-x64.dmg or .zip.
- macOS Apple Silicon: mac-arm64.dmg or .zip.

Source checks, automated tests, packaged-source verification and isolated startup checks are run before release. Windows also checks installation over v1.0.1 with synthetic records. Checksums and platform reports accompany the packages. These checks do not constitute a full manual acceptance test on every device.

The Windows package does not have a publisher certificate. macOS applications use ad-hoc signatures and are not Developer ID signed or notarized.
