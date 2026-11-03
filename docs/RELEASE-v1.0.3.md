# Shixu Desktop v1.0.3

This patch lets users move the compact floating ball and remembers its chosen screen position.

## Changes
- Drag the ball to a preferred screen position; release to save it.
- Keep the selected position when the panel expands, collapses, returns from edge mode, or restarts.
- Preserve click-to-expand. In edge mode, delay hover reveal briefly so pressing the ball can begin a drag.
- Clamp the ball to the visible work area while dragging across monitors.

## Upgrade from v1.0.2
Quit Shixu, including its tray/background instance, then install the Windows package in the same location. On macOS, quit Shixu and replace the existing application. The application identity and local data directory are unchanged. Export a JSON backup before updating. The release workflow checks that synthetic project, task, experiment and ball-position settings survive an in-place Windows upgrade. Linked research files remain in their original locations.

## Downloads
- Windows x64: .exe installer.
- macOS Intel: mac-x64.dmg or .zip.
- macOS Apple Silicon: mac-arm64.dmg or .zip.

Source checks, 97 automated tests, packaged-source checks and platform startup checks run before release. Checksums and platform reports accompany the packages. The Windows workflow tests installation over v1.0.2 using isolated synthetic records and a saved ball position. These checks do not constitute a full manual acceptance test on every device.

The Windows package does not have a publisher certificate. macOS applications use ad-hoc signatures and are not Developer ID signed or notarized.
