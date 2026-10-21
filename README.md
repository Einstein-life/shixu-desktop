# Shixu Desktop — research scheduling and lab workflows

Shixu extends the existing research scheduler with a local-first experiment bench for wet-lab workflows. Version 2.0 adds a bilingual interface, step timers, readiness checks, waiting-time suggestions, experiment notes, and small preparation calculators.

## Start

Requires Node.js 20+.

```bash
npm ci
npm run localize
npm start
```

Select **English** or **简体中文** in the main window. The floating panel and tray menu use the same saved language.

The interface defaults to English and a new research workspace starts empty. Click **Projects → Load six English plant examples** to add six fictional plant studies, 18 linked tasks and six experiments: Arabidopsis salt response, rice drought methylation/expression integration, tomato rhizosphere response to low phosphorus, maize heat stress, wheat leaf rust, and soybean nodulation. Switching the interface to Chinese does not change these English examples. Loading preserves existing records and edits. All results are fictional, paths are placeholders, and timers never start automatically. See the [plant example guide](docs/PLANT-EXAMPLES-ZH-CN.md).

To preview the main window with separate sample data, open `renderer/index.html?demo=1`. Demo edits persist in their own browser store. The optional planning scaffolds are editable examples; use your laboratory's current approved SOP and verify all units and steps before use.

## Wet-lab bench

Create an experiment, add a preparation checklist, and define hands-on or waiting steps in order. Start a step when you begin it, then confirm completion yourself before starting the next. Timers do not mark an experiment successful. Running steps persist across restarts; notifications require the app to be running, and sleep can delay delivery. Overdue steps are shown on resume.

The dilution and master-mix helpers calculate only from values entered by the user. They do not provide assay conditions, select concentrations, or replace protocol review.

## Research projects and analysis records

Choose from 12 editable bioinformatics planning workflows when creating or editing a project. Open **Analysis & results** on a project card to record study design, references, software versions, parameters, step progress, QC decisions and findings. Link local files/folders, web reports and server paths to the project or an analysis step. Desktop file selection records references only; files stay in place. Create a task from a step, include findings and result references in the weekly summary, or export a project record / research plan draft as Markdown. Workflows plan and document analyses; execution remains in your analysis environment.

Read [the research workspace guide and improvement priorities](docs/RESEARCH-WORKSPACE-ZH-CN.md) for usage, workflow coverage, sources and current limits.

The workspace follows **research question → analysis workflow → result evidence → conclusion → next step**. In **Lab bench → Record results**, choose a project and attach result file references. They appear live in that project's **Analysis & results**. Link findings, limitations and next actions to analysis steps, files and experiment records; turn actions into today's tasks without duplicating open tasks. Project records, research plan drafts and weekly summaries reuse these records. Linked evidence stays current; it is not a frozen historical version.

## Data and privacy

Experiment notes, projects, tasks, and settings are stored locally. First launch migrates the previous desktop app's data into a separate Shixu 2.0 folder and keeps a copy of the original. Desktop saves keep a rotating backup; imports require confirmation and preserve the current file. JSON export/import is available for manual backup and transfer.

The browser preview keeps data in browser storage and does not connect to the older localhost bridge. Do not put sensitive identifiers into unencrypted notes on a shared computer.

## Checks and builds

```bash
npm test
npm run check
npm run localize
npm run dist:win
npm run dist:mac
```

Package macOS releases on macOS. Read [the wet-lab improvement plan](docs/ROADMAP-ZH-CN.md) for the user-needs summary, interaction rules, proposed phases, and adoption measures.

Installer output is written to `win/` and `mac/`. The Windows package is an x64 NSIS installer; macOS provides separate Intel (`x64`) and Apple Silicon (`arm64`) DMG/ZIP files. The current package version is `2.0.0-beta.2`. See [validation evidence](docs/VALIDATION.md) and [the installation acceptance guide](docs/INSTALLER-ACCEPTANCE-ZH-CN.md). Windows publisher signing and macOS Developer ID signing/notarization are not configured; macOS test artifacts use valid ad-hoc signatures.
