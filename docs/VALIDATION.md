# Validation for v1.0.2

## Source and floating-panel checks

Source checks and 91 automated tests passed locally before publication. The added regression verifies that the compact panel retains all unfinished task titles, including more than three ordinary tasks and more than two results-ready tasks, and excludes completed tasks. User text remains escaped.

The actual HTML, scripts and styles were rendered in Chromium with 32 unfinished synthetic tasks. Both English and Chinese interfaces, in always-visible and edge modes, supported wheel and scrollbar navigation to the final task. Scrolling retained the compact window height and did not trigger expansion. A data refresh retained the scroll position. The expanded card titles were checked for readable foreground/background contrast in normal, urgent, waiting and results-ready states.

## Platform package checks

The release workflow runs source checks and automated tests on Windows x64 and native Intel/Apple Silicon macOS runners. It verifies 19 packaged application files against the build source and starts the application for at least five seconds with an isolated empty profile, confirming that examples are not loaded automatically.

Windows additionally installs v1.0.1 into an isolated directory, starts it with synthetic project/task/experiment records, installs v1.0.2 over the same directory, verifies the installed version and source, and checks that the selected records and referenced synthetic file remain available. No real user profile is used in that check. macOS checks the native architecture, ad-hoc signature, DMG/ZIP integrity and startup with a synthetic retained-record profile.

A successful workflow and the attached platform JSON reports establish completion of those package checks. SHA-256 manifests identify the downloadable binaries. These checks do not replace full manual acceptance testing on every target device, including notifications and device-specific installation behavior.

Windows publisher signing is not configured. macOS packages use ad-hoc signatures and are not Developer ID signed or notarized.
