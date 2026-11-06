# Shixu Desktop v1.0.4

This patch restores the original floating-panel palette and fixes Edge mode after repeated expansion and collapse.

## Changes
- Restore the warm dark expanded-panel background, light-pink ordinary task cards with red titles, and lavender waiting cards with blue titles.
- After repeated expand/collapse actions, selecting Edge mode reliably collapses the native window to the floating ball when the pointer leaves.
- Keep the expanded panel open while the pointer remains over it.
- Prevent stale asynchronous Edge/Always mode responses from undoing the latest user choice.
- Keep retry behavior available if a native collapse temporarily fails.

## Upgrade from v1.0.3
Quit Shixu, including its tray/background instance, then install the Windows package in the same location. On macOS, quit Shixu and replace the existing application. The application identity and local data directory are unchanged. Export a JSON backup before updating. The release workflow checks that synthetic research records and the saved floating-ball position survive an in-place upgrade.

## Downloads
- Windows x64: .exe installer.
- macOS Intel: mac-x64.dmg or .zip.
- macOS Apple Silicon: mac-arm64.dmg or .zip.

Source checks, 103 automated tests, palette checks and platform startup checks run before release. Checksums and platform reports accompany the packages. These checks do not constitute a full manual acceptance test on every device.

The Windows package does not have a publisher certificate. macOS applications use ad-hoc signatures and are not Developer ID signed or notarized.
