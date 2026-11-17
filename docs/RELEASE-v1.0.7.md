# Shixu Desktop v1.0.7

Stable Intel Mac release, confirmed by the author on 17 November 2026.

## Changes

- Fix the opaque white rounded rectangle around the Intel Mac floating ball by waiting for the first rendered frame before displaying the floating window.
- Respect hide/show requests made while the first frame is being prepared.
- Preserve the exact DMG and ZIP distributed for testing, with the existing application identity and data directory.

## Downloads

| Platform | Stable version | Installer |
| --- | --- | --- |
| macOS Intel | v1.0.7 | [DMG](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.0.7/Shixu-Desktop-1.0.7-mac-x64.dmg) or [ZIP](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.0.7/Shixu-Desktop-1.0.7-mac-x64.zip) |
| Windows x64 | v1.0.5 | [EXE](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.0.5/Shixu-Desktop-1.0.5-win-x64.exe) |
| macOS Apple Silicon | v1.0.5 | [DMG](https://github.com/Einstein-life/shixu-desktop/releases/download/v1.0.5/Shixu-Desktop-1.0.5-mac-arm64.dmg) |

v1.0.7 assets contain the Intel packages. The Windows and Apple Silicon links point to their existing stable v1.0.5 packages. Apple Silicon v1.0.7 remains withheld because its visible desktop verification did not pass.

## Verification

The author reported normal use after testing the Mac version and authorized official release. The previously reported test environment was a 2020 Intel Mac Pro, macOS Sequoia 15.7.9, with Reduce Transparency disabled. This is a general user confirmation; no additional itemized user test results are inferred.

The native Intel build passed 112 automated tests, packaged-source and architecture checks, ad-hoc-signature verification, DMG/ZIP integrity, startup and isolated record/settings-retention checks. Actual desktop screenshots passed in English and Chinese at startup and after six expansion/collapse cycles on Sequoia 15.7.9 (24G830). Those captures used a disposable signed app copy with a capture synchronization hook; the distributed app was not modified. [Intel build and validation](https://github.com/Einstein-life/shixu-desktop/actions/runs/43403581640/job/131812252430).

The matrix run includes a failed Apple Silicon visible-desktop check on Sequoia 15.8.2. Only the verified Intel packages are promoted here.

## Upgrade

Export a JSON backup, completely quit Shixu including the menu-bar/background instance, then replace the existing application in the same Applications location. If already running the v1.0.7 Intel test package, you already have the official release binaries.

## SHA-256

```text
102df686ee098497d3de80bdb0f7f202170476e04d44c7407c0aeaa6e459b967  Shixu-Desktop-1.0.7-mac-x64.dmg
f61b48c183e3d2496837990cfb462997dd4bd646b4b80610f950ef50eda117fd  Shixu-Desktop-1.0.7-mac-x64.zip
```

macOS packages use ad-hoc signatures and are not Developer ID signed or notarized.
