# Shixu Desktop v1.0.5

This release fixes Windows launch-at-login registration and state reporting.

## Changes
- Fix the button remaining off and reporting that the setting was not applied after a custom startup entry was registered.
- Quote executable paths and development project paths containing spaces, so Windows launches the complete intended path.
- Verify Shixu's own per-user startup entry by name, executable, arguments and Windows enabled state.
- Keep other applications and unrelated or obsolete startup entries outside this setting.

## Downloads and upgrade
The Windows installer is unchanged from the local v1.0.5 package tested by the author (SHA-256: 4fb36f14b14b8369d7286ea99172d6ca6b849060b852ad772c1b5ab789b0a9aa). Intel and Apple Silicon macOS DMG/ZIP files are built from the same release commit.

Quit Shixu, including its tray/background instance, and install over v1.0.4 in the same location. On macOS replace the application after quitting it. The application identity and local data directory remain the same. Export a JSON backup before updating.

## Verification
Source checks and 107 automated tests passed. The author completed local Windows testing and requested publication. The Windows release job verifies the unchanged installer, source integrity, in-place upgrade from v1.0.4, fresh startup, preserved synthetic records and native startup registration with a temporary entry. Native Intel and Apple Silicon jobs verify packaged source, architecture, ad-hoc signature, DMG/ZIP integrity and isolated startup. Checksums and reports accompany the downloads.

Windows publisher signing is not configured. macOS apps use ad-hoc signatures and are not Developer ID signed or notarized.
