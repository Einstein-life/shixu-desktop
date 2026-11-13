# Shixu Desktop v1.0.6 — macOS transparency test build

This prerelease addresses the white rounded rectangle reported around the collapsed floating ball on an Intel Mac. Stable downloads remain at v1.0.5 while the author verifies the new build.

## Changes

- Explicit transparent native background: `#00000000`.
- Disable the native window shadow.
- Disable manual native window resizing on macOS, following Electron's transparent-window limitation. The application continues to switch between ball, compact and expanded sizes using its own controls.

## Downloads

- Intel Mac: `Shixu-Desktop-1.0.6-mac-x64.dmg` or `.zip`.
- Apple Silicon: `Shixu-Desktop-1.0.6-mac-arm64.dmg` or `.zip`.
- Test release: https://github.com/Einstein-life/shixu-desktop/releases/tag/v1.0.6.

## Author verification

1. Export a JSON backup. Quit Shixu fully, including any menu-bar/background instance.
2. Install the matching architecture, replacing the old app in its existing location. Project records use the same application data directory.
3. Switch to Edge mode and move the pointer away. Verify the collapsed ball is visible directly against the desktop with no white rounded rectangle around it.
4. Hover, click to expand, move the pointer away and drag the ball. Repeat expansion and collapse several times. Verify the background stays clear and the saved position remains usable.
5. Check both light and dark macOS appearances if available, and the display where the white box was originally observed.

Report the macOS version, processor type and whether the white box appears at first launch, after hovering or after resizing if it persists.

## Validation scope

109 automated tests and local renderer alpha checks passed before the build. Native macOS runners check architecture, source, ad-hoc signature, archives, isolated startup and retained synthetic records. A further native Electron check loads the packaged floating-window configuration, verifies native background and resize settings, switches sizes, and captures transparent corner pixels in both languages.

Offscreen alpha checks do not prove the desktop compositor appearance on the user's Mac. The white-box visual result remains pending the author's test. macOS packages are ad-hoc signed and are not Developer ID signed or notarized. This test build does not change Windows installer downloads or overwrite the stable release.
