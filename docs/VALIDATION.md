# Validation for v1.0.1

Source checks and 90 automated tests passed on Windows. Nine actual Electron project-deletion UI checks passed, covering normal and archived projects, linked records, shared experiments, backup failure, and stale floating-panel updates.

The Windows x64 package passed source integrity verification against 19 application files and a startup check lasting at least five seconds with an isolated empty workspace. English examples were absent on first run. These checks do not constitute full install/uninstall, visual, notification, or manual OS acceptance testing.

The macOS release workflow runs on native Intel and Apple Silicon runners, executes source checks and automated tests, verifies packaged source, and performs the same isolated startup check before uploading packages to a draft release. Its run and attached JSON reports record whether those checks passed.

SHA-256 manifests identify downloadable binaries. Windows publisher signing is not configured. macOS packages use ad-hoc signing and are not Developer ID signed or notarized.
