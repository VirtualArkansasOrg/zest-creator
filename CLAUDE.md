# Zest Content Creator

This repository is a workspace for building Zest content (Zestables) with Claude Code: interactive HTML/JS/CSS activities that run inside Canvas through the Zest LTI tool, with grading, SpeedGrader review and saved student work.

## Quick Start

- `/zest-new` creates a new activity through conversation
- `/zest-build` validates it and writes `dist/<name>.zest` for upload

Both commands and the supporting skills load automatically from `.claude/` when this repository is opened in Claude Code. The same files under `commands/`, `skills/` and `agents/` are the plugin layout; `node scripts/sync-claude.js` keeps the two in step (edit the plugin layout, then run it).

## Layout

```
zest.config.json      workspace settings: bridgeUrl, contentDir, outDir
content/<slug>/       one directory per activity (index.html, zest.json, review.html, answer-key.json ...)
dist/<slug>.zest      built packages (ignored by git)
scripts/zest-build.js validator and packager, no dependencies
commands/, skills/, agents/   plugin sources; mirrored into .claude/
```

## Conventions

- Every activity has `index.html` at the top level of its directory and a `zest.json` manifest with `zestSpec`, `name`, `version` and `grading`.
- Graded content also has `review.html` for SpeedGrader. Auto-graded content keeps its answers in `answer-key.json`, declared as `answerKey` in `zest.json`, never in `index.html`.
- All CSS and JS is inline. The only external script is the bridge, included with the `bridgeUrl` from `zest.config.json` (default `/public/zest-bridge.js`, which works on any Zest server).
- ES5 syntax in content (`var`, `function`, string concatenation) so it runs on every browser a school might have.
- Wrap code in an IIFE and initialise in `Zest.onReady()`.

## Canvas constraints

- **Never use `confirm()`, `alert()` or `prompt()`.** Canvas blocks them inside the iframe without any error. Use the two-click confirmation pattern and in-page messages (content-patterns skill).
- Canvas prevents assignment iframes from resizing; content scrolls inside the frame. Design for a fixed height.
- Scores are computed in the browser and trusted by the server. For high-stakes work use teacher grading.

## Grading modes

- **Auto-graded**: `Zest.submitScore(score, options)` puts the score in the gradebook immediately. Check `result.agsStatus`: `'failed'` means the server saved the work but Canvas did not receive the grade, and the student should be told.
- **Teacher-graded**: `Zest.submitWork(options)` sends the work; the teacher grades in SpeedGrader using `review.html`.
- **None**: no submission calls.

## State persistence

For anything that takes more than a few minutes: `Zest.saveState(data)` on every change, `Zest.loadState()` in `onReady`, `Zest.clearState()` behind a two-click "Start over", and `Zest.onSyncStatus()` to show a saved/unsaved indicator.

## Manifest features

- `parameters`: teacher-configurable values (`type` text, number, boolean, select) read with `Zest.getParameter(key, default)`. The reference picker does not yet show a form for them, so defaults must be sensible.
- `sandbox`: iframe permissions the content needs; `allowScripts` and `allowSameOrigin` are the norm, `allowTopNavigation` needs a reason.
- `editorFile` and `assessmentFile`: a teacher config editor and its default config (editor skill).
- `allowedDomains`: external hosts the content loads from, for servers that enforce a domain allowlist.

## Workflow

1. Describe the activity; Claude asks about grading, saving progress and parameters.
2. Claude creates the files in `content/<slug>/` and runs the checker.
3. `/zest-build` writes `dist/<slug>.zest`.
4. Upload it in Canvas through the Zest button in the Rich Content Editor (Interactive mode for graded content), or as an External Tool assignment.
5. Test as a student in a test course before assigning it.

The package format and the Bridge API are defined by the [Zest specification](https://github.com/virtualarkansas/zest-spec); the server is [zest-server](https://github.com/virtualarkansas/zest-server).
