---
description: Create new interactive content for Canvas with Zest. Builds quizzes, labs, simulations, and other activities that embed in Canvas pages with optional grading and state persistence.
---

# /zest-new — Create New Interactive Content

You are helping a teacher create interactive content for Canvas LMS using Zest. The teacher describes what they want, and you build it.

## Before You Start

Load these skills for reference (they will auto-invoke based on their descriptions, but ensure they are available):
- `zest:bridge-api` — The Zest Bridge API reference
- `zest:content-patterns` — Content structure conventions and patterns

If the content is graded, also load:
- `zest:review-viewer` — How to build review.html for SpeedGrader

If the content needs a teacher config editor, also load:
- `zest:editor` — How to build editor.html for per-zest configuration

## Conversation Flow

### 1. Understand What They Want

Ask the teacher to describe the activity. Get a clear picture of:
- **Topic and subject area** (e.g., "photosynthesis quiz for 9th grade biology")
- **Activity type** (quiz, lab, simulation, tutorial, interactive exercise)
- **Number of questions/tasks** (if applicable)

Keep it conversational. One or two questions at a time, not a wall of questions.

### 2. Determine Grading Mode

Ask about grading:
- **Auto-graded** — Scores appear immediately in Canvas gradebook. Best for: quizzes, multiple choice, fill-in-the-blank, auto-checked problems.
- **Teacher-graded** — Student submits work, teacher reviews and assigns grade in SpeedGrader. Best for: lab reports, essays, open-ended experiments, creative work.
- **No grading** — Informational or practice content with no grade submission. Best for: tutorials, reference materials, practice exercises.

### 3. Ask About State Persistence

Ask if students should be able to save their progress:
- **Yes** — Student can close the tab and return later; their work is preserved. Recommended for anything that takes more than a few minutes.
- **No** — Fresh start every time. Fine for short quizzes or quick activities.

### 4. Ask About Parameters (Optional)

If the content could benefit from teacher-configurable settings, offer parameters:
- **Difficulty level** — easy/medium/hard
- **Time limit** — minutes
- **Number of questions** — if the content is a quiz
- **Show hints** — yes/no

Parameters let teachers customize the same content for different assignments without creating multiple versions.

### 5. Ask About Assessment Config (Optional)

If the content wraps a simulation or interactive (like a PhET sim), ask if they want an assessment overlay:
- **Explore mode** — Predict/Explore/Explain text prompts (teacher-graded)
- **Quiz mode** — Multiple choice and True/False questions over the sim (auto-graded)
- **None** — No assessment, just the interactive content

If they want assessment, the content will need `editor.html` (teacher config editor) and `assessment.json` (default config).

### 6. Build the Content

Create the files in a new directory `content/<slug>/` (the `contentDir` from `zest.config.json`; the slug is a short lowercase name such as `photosynthesis-quiz`). One directory per activity; never mix two activities in one directory.

**Always create:**
- `index.html` — The student-facing interactive content
- `zest.json` — Spec manifest with metadata, grading mode, and configuration

**Create if graded (auto-graded or teacher-graded):**
- `review.html` — The SpeedGrader review view for teachers

**Create if auto-graded with separate answer key:**
- `answer-key.json` — Answer key file (referenced in `zest.json`, stored securely on upload)

**Create if assessment config is needed:**
- `assessment.json` — Default assessment configuration
- `editor.html` — Teacher config editor UI

### 7. Content Requirements

Follow these rules when building:

1. **Self-contained**: All CSS and JS inline in the HTML file. The only external script is the bridge, included with the `bridgeUrl` from `zest.config.json` (default `/public/zest-bridge.js`, which works on every Zest server):
   ```html
   <script src="/public/zest-bridge.js"></script>
   ```
   Read `zest.config.json` once at the start; if it is missing, use the default and do not ask.

2. **NEVER use `confirm()`, `alert()`, or `prompt()`**: These are silently blocked in Canvas cross-origin iframes. Use the two-click confirmation pattern instead.

3. **Use Canvas-compatible styling**: System fonts, card-based layouts, blue accent (#0770A2) for auto-graded, green accent (#2e7d32) for teacher-graded.

4. **Wrap all JS in an IIFE**:
   ```javascript
   (function() { 'use strict'; /* ... */ })();
   ```

5. **Initialize in `onReady`**:
   ```javascript
   Zest.onReady(function(ctx) { /* init here */ });
   ```

6. **State persistence** (if enabled): Implement `gatherState()` and `restoreState()` functions. Auto-save on input changes. Show sync indicator and restored banner.

7. **Error handling**: Always handle submission failures with retry capability.

8. **Responsive**: Content should work on various screen sizes. Use percentage widths or max-width containers.

9. **Always generate `zest.json`**: Include metadata, grading mode, and any parameters:
   ```json
   {
     "zestSpec": "1.0",
     "name": "Activity Title",
     "version": "1.0.0",
     "grading": "auto",
     "mainFile": "index.html",
     "reviewFile": "review.html"
   }
   ```

10. **Parameters** (if applicable): Use `Zest.getParameter(key, default)` to read teacher-set values. Never hardcode configurable values — make them parameters so teachers can customize per-placement.

11. **Answer keys** (for auto-graded): Store the answer key in a separate `answer-key.json` file and declare it in `zest.json` via `"answerKey": "answer-key.json"`. The server extracts it to `.secure/` — never accessible to students. In `review.html`, use `Zest.getAnswerKey()` to compare against student answers.

12. **ES5 syntax only**: Use `var` (not `let`/`const`), `function` (not arrow functions), string concatenation (not template literals).

### 8. After Building

After creating the files:
1. Run `node scripts/zest-build.js content/<slug> --check` and fix anything it reports (see `/zest-build` for what the checks mean).
2. Summarize what was built (files created, grading mode, features).
3. Tell the teacher to run `/zest-build` to package it as a `.zest` file for upload.

### 9. Security Scan

After content creation is complete, the `zest:security-reviewer` agent should scan the generated files for any security issues. This happens automatically.

## Tips for Great Content

- **Progressive difficulty**: Start easy, get harder
- **Immediate feedback**: Show correct/incorrect after each question (for auto-graded)
- **Visual engagement**: Use colored cards, icons, progress indicators
- **Clear instructions**: Students should know what to do without teacher explanation
- **Hint boxes**: Green-tinted boxes with helpful tips (`.hint` class)
- **Mobile-friendly**: Test that layouts work on narrow screens
