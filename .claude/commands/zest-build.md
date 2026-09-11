---
description: Validate and package Zest interactive content into a .zest file ready for upload. Runs the checker in scripts/zest-build.js, explains anything it finds, and reports what was packaged.
---

# /zest-build — Validate and Package Content

Package a content directory into a `.zest` file (a zip with the `.zest` extension) ready for upload to Zest in Canvas.

## Process

### 1. Find the content

Content lives in one subdirectory per activity under `content/` (the `contentDir` in `zest.config.json`). If the teacher named a directory, use it. If there is exactly one, use that. Otherwise list them and ask which one to build. `--all` builds every directory.

### 2. Run the checker

```bash
node scripts/zest-build.js content/<name>
```

The script validates and, if there are no errors, writes `dist/<name>.zest`. Use `--check` to validate without packaging and `--json` for a machine-readable report. It checks:

- `index.html` exists at the top level; no symlinks; no blocked file types (executables, installers, desktop scripts, nested archives, shortcuts); 50 MB per file and 100 MB total
- `zest.json` is valid JSON; `zestSpec` is `1.x`; `grading` is `none`, `auto` or `teacher` and matches what the code calls (`submitScore` for auto, `submitWork` for teacher); every declared file (`mainFile`, `reviewFile`, `editorFile`, `assessmentFile`, `answerKey`) exists and is a relative path with no `..`
- the answer key is valid JSON, is not pasted into `index.html`, and `review.html` reads it with `Zest.getAnswerKey()`
- `parameters` is an array of `{ key, type, label, default }` (with `options` for `select`) and each key is read with `Zest.getParameter()`
- `sandbox` uses known flags; `allowTopNavigation` is flagged
- the bridge is included with the URL from `zest.config.json` (`/public/zest-bridge.js` by default); code runs inside `Zest.onReady()`
- no `alert()`, `confirm()` or `prompt()` (Canvas blocks them inside the iframe)
- graded content has a `review.html`
- external URLs are listed so an administrator with a domain allowlist knows what to allow

### 3. Explain the results

Read the script's output and tell the teacher what it means in plain language.

- **Errors** block packaging. Fix them (or offer to) and run the script again.
- **Warnings** do not block packaging, but each one is a real problem in Canvas: for example a `confirm()` call silently does nothing, and missing `review.html` means SpeedGrader shows the student view instead of their work. Offer to fix them before packaging.
- **Notes** are informational (grading mode detected, external resources, file count).

Do not hand-edit the checks or skip the script; if a check seems wrong, say so and explain why.

### 4. Report

When the script prints `packaged`:

- **File**: `dist/<name>.zest` and its size
- **Files included**: count
- **Grading mode** and **state persistence** (from the notes)
- **External resources**, if any
- **Result**: PASS or PASS WITH WARNINGS (list them)

### 5. Next steps

Tell the teacher:

1. Download `dist/<name>.zest` (in Claude Code on the web, use the file panel; on the CLI it is already on disk).
2. In Canvas, open the Rich Content Editor on a page or assignment.
3. Click the Zest toolbar button ("Embed Interactive Content").
4. Upload the `.zest` file.
5. Choose **Interactive** for graded content or anything that saves student work; **Static** for a plain embed.
6. For a graded assignment, create the assignment with submission type External Tool and pick Zest, then choose the content.

The same `.zest` can be uploaded to any Zest server; nothing in it is tied to one institution.
