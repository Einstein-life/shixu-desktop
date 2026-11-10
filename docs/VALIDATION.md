# Validation for v1.0.5

Source validation and 107 automated tests passed before publication. Windows startup tests reproduce Electron 33's custom-name/default-AppUserModelID distinction, require correct quoting, match the exact per-user executable and arguments, and recognize disabled items. Existing floating-panel and research-record checks remain in the suite.

The published Windows installer reuses the author-tested binary without rebuilding it. SHA-256: 4fb36f14b14b8369d7286ea99172d6ca6b849060b852ad772c1b5ab789b0a9aa. The author reported testing complete and requested publication; a step-by-step manual log or reboot measurement was not collected.

The release job checks this hash, installs v1.0.4 into a clean Windows runner, starts it using synthetic records, installs the tested v1.0.5 file in the same directory, checks the installed version and packaged source, verifies retained records/settings/linked files, and checks fresh startup. When comparing the reused Windows package with a Git checkout, only CRLF/LF conversions are allowed and reported per file; all other source differences fail verification. The installed startup module is then exercised using a random temporary startup entry, covering enable/read/disable/re-enable/remove and path parsing. The temporary entry is removed automatically. A Windows logoff or reboot is outside that automated check.

Native Intel and Apple Silicon macOS runners build from the same commit and verify source integrity, architecture, ad-hoc signatures, DMG/ZIP integrity and isolated startup with synthetic records. macOS launch-at-login behavior is unchanged; these checks do not establish a new native macOS login-item acceptance test.

The application identity and local data directory remain unchanged. Successful workflow results and attached reports record the platform outcomes. SHA-256 manifests identify each downloadable binary. These checks cover the specified behavior and do not replace manual acceptance testing on every target device.

Windows publisher signing is not configured. macOS packages use ad-hoc signatures and are not Developer ID signed or notarized.
