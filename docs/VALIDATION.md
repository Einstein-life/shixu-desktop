# Validation for v1.0.4

## Source and floating-panel checks

Source checks and 103 automated tests passed before publication. Regressions cover compact-panel task visibility and dragging the ball while preserving click-to-expand. Repeated expand/collapse cycles followed by Edge mode now return to the ball, and the palette is checked in both language bundles. Dragged coordinates persist through panel size changes and are clamped to the work area on displays with negative origins.

The actual English renderer was exercised in Chromium. Pointer dragging moved the ball without expanding it; clicking without movement expanded it. In edge mode, hover revealed the panel after a short delay, while pressing and dragging the ball cancelled that reveal. Both language bundles are generated and syntax-checked.

## Platform package checks

The release workflow runs source checks and automated tests on Windows x64 and native Intel/Apple Silicon macOS runners. It verifies 19 packaged application files against the build source and starts the application for at least five seconds with an isolated empty profile, confirming that examples are not loaded automatically.

Windows additionally installs v1.0.3 into an isolated directory, starts it with synthetic project/task/experiment records and a saved floating-ball position, installs v1.0.4 over the same directory, verifies the installed version and source, and checks that records, settings and the referenced synthetic file remain available. No real user profile is used. macOS checks the native architecture, ad-hoc signature, DMG/ZIP integrity and startup with a synthetic retained-record profile.

A successful workflow and the attached platform JSON reports establish completion of those package checks. SHA-256 manifests identify the downloadable binaries. These checks do not replace full manual acceptance testing on every target device, including notifications and device-specific installation behavior.

Windows publisher signing is not configured. macOS packages use ad-hoc signatures and are not Developer ID signed or notarized.
