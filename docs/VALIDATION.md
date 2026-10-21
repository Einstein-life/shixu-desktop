# Shixu Desktop validation

Research workspace update validated on 2026-10-21 (Asia/Shanghai).

## Release 1.2.1

The requested public version is `1.2.1`, based on the latest English-first research-workspace implementation. Package metadata, installer names and the public release tag use the same version. The workspace directory and existing data location are retained. Windows publisher signing and macOS Developer ID signing/notarization are not configured.

## Beta.3 label update (2026-10-21)

- English example buttons now use the shorter **Load examples** label. Chinese uses **载入示例**. Behavior is unchanged: a fresh workspace is English and empty until the user clicks the button.
- CI run [39565016572](https://github.com/Einstein-life/shixu-desktop/actions/runs/39565016572), source commit `5af49ba339738c12ab074af450684b43ad85f96d`, completed successfully for Windows and macOS. Both platforms passed 58 tests, empty first-run checks, package verification, installation/startup/uninstallation or macOS signature/archive checks.
- Beta.3 artifacts are in `win/` and `mac/`; their SHA-256 manifests were verified after download. The user-facing software name remains unchanged.

## Beta.2 English-first defaults (2026-10-21)

- New installs use the English UI and an empty workspace. **Load examples** adds six English plant projects, 18 linked tasks and six experiments only after a user click. Switching the interface to Chinese preserves English example content.
- Existing data and saved language choices are retained. Loading fills missing English example studies without overwriting edited Chinese or English records.
- All 58 tests and script checks passed locally. Browser acceptance confirmed the empty English first view, six English studies after a click, and Chinese UI selection without altering study text.
- The explicit `?demo=1` preview still seeds isolated English demo data. Normal desktop and browser workspaces never seed example data automatically.
- CI run [39560102579](https://github.com/Einstein-life/shixu-desktop/actions/runs/39560102579), source commit `3c5625979c9c16d2a1d5b091f007907c5437a308`, passed on Windows and macOS. Both platforms passed 58 tests and package-source verification. Windows completed actual installation/startup/uninstallation; macOS passed strict deep ad-hoc signature checks for both architectures and apps mounted from both DMGs, DMG/ZIP integrity, and native arm64 startup. Fresh startup reports recorded zero projects, tasks and experiments. Intel native execution and interactive OS acceptance remain manual checks.
- Preview: [English plant projects after explicit loading](english-first-beta2.png). The beta.1 installers described below predate this behavior.

## Beta.1 installer validation (2026-10-21)

- Build branch: [`codex/build-v2-installers`](https://github.com/Einstein-life/shixu-desktop/tree/codex/build-v2-installers), commit `d0291cefd8b98d2a7dc5ff453da422189123700f`. The main branch was not changed and no release was published.
- GitHub Actions run [39549730875](https://github.com/Einstein-life/shixu-desktop/actions/runs/39549730875) completed successfully for Windows and macOS. Both platforms passed JavaScript checks and all 54 tests. The earlier successful run had not established macOS signature validity; its artifacts are superseded by this run.
- Windows output: x64 NSIS installer built on Windows Server 2022. Silent installation, installed-source verification, isolated startup and uninstallation passed. The app survived for five seconds and created version 4 data with six example projects, 18 tasks and six experiments. The installer is unsigned; Windows may show an unknown-publisher warning. Installer behavior on Windows 10/11 still needs an interactive acceptance pass.
- macOS output: x64 and arm64 DMG and ZIP archives. Both app architectures and their embedded source archives were checked. Each app passed strict deep code-signature validation; both DMGs were verified, mounted read-only and their contained apps passed signature validation. Both ZIPs passed archive integrity checks. The arm64 app passed native startup and isolated first-run persistence on the macOS runner. Intel native execution was not tested.
- The macOS signing hook seals the app and nested components with an ad-hoc signature before archive generation, fixing stale Electron bundle signatures. This is not Developer ID signing or notarization; normal macOS distribution approval remains a separate release requirement. The signature checks remain mandatory.
- SHA-256 manifests are included next to the downloaded artifacts. The package version remains `2.0.0-beta.1`; the user-facing product name remains **Shixu · Research & Lab Workflows** without a version suffix.

The checks establish successful builds, archive integrity, packaged source inclusion and first-run persistence in CI. They do not establish byte-for-byte reproducible builds or replace a live UI pass for display configurations, native notifications, login startup, macOS download approval, or upgrading an existing installation. No real research data was used in the CI smoke checks.

## English plant examples and floating panel expansion (2026-10-21)

- Added English-loadable maize heat/pollen, wheat leaf-rust and soybean nodulation projects. Existing Chinese samples remain unchanged; the action can be repeated safely without overwriting edited samples. The original three plant examples remain in the initial set.
- Floating-panel resize/reveal actions now run through a serialized geometry controller. The native handler also remembers expanded state so late edge-hide/hover events cannot apply ball or compact-panel bounds on top of a full panel. Cards scroll within the full panel instead of shrinking its flex container.
- `npm test`: 54/54 passed. Seven dock-layout regressions cover async edge reveal before resize, renderer hover/mode events, hide/show/expand races, late hide requests, small/negative-coordinate displays, and error recovery/rapid collapse. Example tests cover English additive loading and evidence links.
- English main and dock pages regenerated. English browser acceptance showed all six projects and the English-load button. Floating-panel geometry was validated through the native-handler/controller tests; an interactive Electron-window check was not available in this pass.

## Initial plant research examples (2026-10-20)

- New desktop/browser stores persist three localized projects, nine linked tasks and three experiments once. Existing, migrated, intentionally empty and corrupt/recovery stores are not replaced with examples. Existing users can add the examples from Projects; stable IDs prevent duplicate records and preserve edits.
- Examples cover Arabidopsis salt response with RNA-seq/qPCR, rice drought methylation/expression integration, and tomato rhizosphere/low-phosphorus amplicon analysis. Each has question, workflow, evidence, limitations, next actions, experimental records and placeholder file references. No sample timers or compute jobs are started. Demonstration completion states and observations are explicitly fictional.
- Browser acceptance: Chinese first-load projects and linked experiments; action schedule and completed experiment display; idempotent loading; editing a research question, saving, reloading and loading examples again without losing the edit; a separate English demo store with entirely English sample content; fresh Chinese first-load rendering. Preview: [plant projects](plant-examples-zh.png).
- `npm test`: 45/45 passed, including seven example tests for source integrity, action links, timer inactivity, bilingual data, stable IDs, round trips, additive loading, first-run persistence, empty/legacy/corrupt desktop stores and isolated demo browser storage. Desktop first-run tests use an in-memory filesystem; packaged/native launch was not exercised.
- English resources regenerated. Temporary preview servers and browser tabs were closed after acceptance. User desktop data was not modified.

### English additions (2026-10-21)

- Added a separate English-load action for maize heat stress/pollen viability, wheat leaf-rust interaction and soybean nodulation/rhizosphere studies. It creates separate English records alongside Chinese examples, leaves edited records intact, and skips these additions when the same English examples already exist.
- The default set now contains six plant projects, 18 linked tasks and six experiment records. Content remains explicitly fictional; all experiment timers are idle.
- `npm test`: 52/52 passed, including English additions after a Chinese first launch, independent project/experiment evidence links, and no duplicates on repeat. The browser preview previously verified the English six-project set; after the last small English-add button change, that action was validated by the unit test because the computer-use connection was unavailable.

## Floating panel edge expansion fix (2026-10-21)

- Reproducible failure: asynchronous edge reveal/hover geometry calls could arrive after the expand click and reset the dock to compact dimensions. Edge-mode mouse entry also forced a compact restore. A flex item without a zero minimum could further constrain scrolling content.
- Serialized resize/show/hide actions, restore the expanded native bounds after edge reveal, ignore late edge/hover ball requests while the native window is expanded, and let cards scroll inside the panel.
- Five regression tests simulate delayed native IPC and event races, late hide requests, rapid expand/collapse, small monitors and negative-coordinate displays. The native window was not interactively available for clicking through this turn; therefore this result is covered by renderer-controller and Electron geometry handler tests, not a live OS visual confirmation.

## Research evidence chain (2026-10-20)

- Workspaces and both Markdown exports follow question → workflow → evidence → conclusion → next step. Findings, limitations and actions have separate records and selectable source references.
- Browser acceptance on an isolated preview origin: create a Chinese RNA-seq project and linked experiment; save notes and a result URL; follow experiment → project and project → experiment links; add a sourced finding, limitation and next action; save/reload; update original experiment notes and verify live project evidence; create an action task twice and verify only one task; generate a weekly report; download and inspect the project Markdown; switch to English and check the five-stage form and experiment-result editor while preserving authored Chinese records.
- `npm test`: 38/38 passed. Coverage includes live deduplicated links, experiment files, source deletion/reassignment warnings, preservation of timers and original conclusions, JSON round trips, concurrent window merges, malformed import rejection, bilingual exports and ordered stages. Experiment file handler tests verify saved IDs, local-file reveal, web links, missing files and rejection of unsupported targets and untrusted frames with controlled Electron-shell mocks.
- Native Electron file pickers, operating-system file opening and packaged desktop execution were not exercised in this update. Browser acceptance establishes the renderer flows; mocked handler tests do not establish native integration success. Supplementary cross-project experiment association and missing-source conditions were covered by core tests; the browser flow used a directly assigned experiment.
- Validation data is marked as synthetic and stored only in the isolated preview browser; no scientific findings were asserted and no user desktop data was edited.
- Browser preview: [linked experiment evidence](research-evidence-zh.png). No browser console errors were captured in the final Chinese evidence view. English resources were regenerated and the JavaScript/HTML check passed.

## Launch-at-login fix (2026-10-20)

- Windows login-item writes and reads use the same executable and argument list. Development launches include the absolute project path; packaged launches use the installed executable without development arguments.
- System errors propagate to the interface; persisted preferences mirror the verified OS state. Startup no longer reapplies a saved preference over a setting changed in the OS.
- Chinese and English buttons show a pending state, prevent concurrent toggles, reread after failures, and distinguish system-disabled or macOS approval states from success. Returning focus refreshes the status.
- English pages regenerated. All 30 tests passed, including 8 regression tests for startup options, failed/ignored writes, Windows startup approval, macOS approval, bilingual controls, repeated clicks, persisted readback and unknown initial state.
- Native registry writes and a reboot/login cycle were not exercised. Tests use controlled Electron API responses and do not establish OS login execution.

## Research workspace update

- English resources regenerated; shared research modules load in both main pages and the floating panel.
- Browser checks on an isolated local preview origin: create English and Chinese projects with RNA-seq workflows; record QC status, notes, references and a step-linked file; save and reload; create an analysis task; include findings and result references in a weekly summary; download a research plan draft.
- The Chinese form was also saved with the optional reproducibility section collapsed, then reopened to verify notes were preserved.
- Browser screenshot: [research workspace](research-workspace-zh.jpg). The preview used test data only, separate from the desktop data directory.
- `npm run check` and all 22 automated tests passed. These include independent workflow templates, research migration, JSON round trips, record/proposal exports, preservation during floating-panel edits, malformed research imports and artifact target classification. Desktop handler tests use isolated Electron-shell mocks to check local-file reveal, web reports, missing files and rejected targets/frames.
- Native file/folder pickers and operating-system file-manager/browser integration have not been exercised in a running Electron window. Handler tests do not establish native integration success.

The entries below describe the earlier 2026-10-19 validation baseline.

## Passed

- `npm run localize`: generated English main and dock pages, and the translation resource.
- `npm run check`: parsed JavaScript in the main process, preload, shared modules, test scripts, and inline HTML scripts; checked linked local JavaScript/CSS files exist.
- `npm test`: 11 tests passed. Covers legacy data migration, preparation gate, timer restart semantics and overdue states, parallel-work window with return buffer, attention to overdue/hands-on work, independent field merges, deletion versus concurrent edit, dilution, master mix, malformed import rejection, and English labels preserving user-authored text.
- Package/lock metadata: matching name and version.
- Original Windows/macOS main process, index, and dock hashes match their pre-development values.

## Historical limits from the initial implementation (see installer validation above for updates)

- Native desktop rendering and end-to-end click flows. The existing Electron binary exited before a targetable window appeared in this execution environment. The existing npm Electron path file also contains a trailing newline; the new launcher trims it. These checks do not prove native startup now succeeds on a user's machine.
- A local-file preview was rejected by the in-app browser's protocol policy. No screenshot or browser visual pass is claimed.
- Windows notifications, sleep/resume delivery, tray behavior, login startup, high DPI and multiple displays.
- macOS native execution, Intel/Apple Silicon packaging, notification permissions, signing, and notarization.
- Windows installer generation and installed-app upgrade testing.

The i18n test uses an isolated DOM stub. It verifies text behavior, not browser layout. The shared data merge handles independent field edits; changes to the same field or array are last-writer wins and do not yet show a conflict dialog. Experiment history is an editable local record, not an immutable compliance audit trail. Legacy weekly-hour totals are approximate; dated work-log events are a follow-up item.
