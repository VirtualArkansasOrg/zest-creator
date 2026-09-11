---
name: bridge-api
description: Zest Bridge API reference. Use when writing JavaScript that calls Zest.submitScore(), Zest.submitWork(), Zest.saveState(), Zest.loadState(), Zest.getConfig(), Zest.saveConfig(), or any other Zest.* method. Also use when building interactive content for Canvas LTI.
user-invocable: false
---

# Zest Bridge API

The Bridge API is a JavaScript library that content creators include in their interactive content. It provides a standard interface for communicating with the Zest LTI wrapper inside Canvas.

## Include

Every content file must include this script tag in `<head>`:

```html
<script src="/public/zest-bridge.js"></script>
```
The bridge URL comes from `zest.config.json` (`bridgeUrl`, default `/public/zest-bridge.js`). A root-relative URL works on every Zest server because the server serves the bridge next to the content; only change it if your institution hosts content on a different origin from the bridge.

## Critical Constraints

1. **`confirm()`, `alert()`, `prompt()` are BLOCKED** in cross-origin iframes (Canvas embeds from a different origin). They silently return `false`/`undefined`. Use two-click confirmation patterns instead.
2. **Canvas CSS prevents iframe resize** for assignment external tools. Content scrolls within the iframe. `setHeight()` only works for page embeds.
3. **Content must be self-contained** — all CSS and JS inline or bundled in the zip. The bridge script is the only external dependency.
4. **All methods require context** — most methods only work after `onReady()` fires. Always wrap initialization in `Zest.onReady()`.
5. **ES5 compatible** — the bridge and all content should use ES5 syntax (no arrow functions, no `let`/`const`, no template literals) for maximum browser compatibility.

---

## Core Methods

### Zest.version
Bridge API version string. Currently `"3.1.0"`.

### Zest.onReady(callback)
Fires when LTI context is received from the wrapper. If context is already available, fires immediately. **Always use this as your entry point.**
```javascript
Zest.onReady(function(ctx) {
  console.log('User:', ctx.name);
  console.log('Course:', ctx.courseTitle);
  // Initialize your content here
});
```

### Zest.getContext()
Returns the full context object, or `null` if not yet received.

### Zest.getUser()
Returns the current user's context. Returns `null` if not in an LTI context.
```javascript
var user = Zest.getUser();
// { id, name, email, roles, courseId, courseTitle }
```

### Zest.isStudent()
```javascript
if (Zest.isStudent()) { /* show student view */ }
```

### Zest.isTeacher()
```javascript
if (Zest.isTeacher()) { /* show teacher/admin view */ }
```

### Zest.isReady()
Returns `true` if context has been received.

### Zest.isExternalTab()
Returns `true` if the content is running in a standalone browser tab (not nested in an LTI iframe). In external tab mode, the bridge makes direct API calls to the server instead of relaying through postMessage.

### Zest.setHeight(pixels)
Reports content height for auto-resize. Sends `lti.frameResize` to Canvas.

**Note**: Only works for **page embeds** (deep link html mode). Has **no effect on assignment external tools** due to Canvas CSS `!important` limitation. For assignments, content scrolls within the iframe. No-op in external tab mode.

```javascript
Zest.setHeight(document.body.scrollHeight + 40);
```

---

## Grading Methods

### Zest.submitScore(score, options) — Auto-Graded

Submits a score that appears immediately in the Canvas gradebook. Use for quizzes, auto-checked exercises, and anything the content can grade itself.

```javascript
var result = await Zest.submitScore(85, {
  maxScore: 100,           // Optional, default 100
  artifacts: {             // Optional — arbitrary JSON stored for teacher review
    answers: { q1: 'A', q2: 'B', q3: 'C' },
    timing: { duration: 4444 }
  },
  comment: 'Scored 85%'   // Optional
});
// result: { success: true, agsStatus: 'ok' | 'failed' | 'skipped', submissionId, duplicate }
//      or { success: false, error: '...' }
```

**Canvas behavior**: Score appears immediately in gradebook as 85/100 (the server scales it to the assignment's points, so a 10-point assignment shows 8.5/10). Teacher can view artifacts in SpeedGrader via review.html.

**Always look at `agsStatus`.** `success: true` means the server saved the work; `agsStatus: 'failed'` means Canvas did not accept the grade yet (the server keeps retrying for 24 hours). Tell the student their work is saved and the grade will appear shortly, and do not offer a "try again" that resubmits the same answers. `'skipped'` means there is no gradebook line for this placement (a page embed rather than an assignment).

**Retries are safe.** Bridge 3.1 tags every submission with an id derived from its payload, so calling `submitScore` again with the same answers (after a timeout or network error) returns the first submission (`duplicate: true`) instead of creating a second gradebook entry. A different set of answers is a new attempt.

### Zest.submitWork(options) — Teacher-Graded

Submits student work without a score. Gradebook shows "Submitted" and the teacher assigns a grade manually in SpeedGrader.

```javascript
var result = await Zest.submitWork({
  artifacts: {             // Arbitrary JSON — teacher sees this in review.html
    hypothesis: 'Plants grow faster with more light',
    data: [/* experiment results */],
    analysis: 'The results show...'
  },
  comment: 'Lab completed'  // Optional
});
// result: { success: true } or { success: false, error: '...' }
```

**Canvas behavior**: Gradebook shows "Submitted" with no score. Teacher opens SpeedGrader, sees artifacts in review.html, enters grade manually.

### Grading Mode Comparison

| | submitScore() | submitWork() |
|---|---|---|
| Score | Required (number) | None (null) |
| Gradebook | Score appears immediately | Shows "Submitted" |
| Teacher action | Can review artifacts | Must assign grade |
| Use case | Quiz, auto-check | Lab report, essay, experiment |

---

## Review Mode Methods

### Zest.isReviewMode()
Returns `true` when the teacher is viewing this content in SpeedGrader.
```javascript
if (Zest.isReviewMode()) {
  var sub = Zest.getSubmission();
  // Render student's submitted data for teacher review
}
```

### Zest.getSubmission()
In review mode, returns the student's submitted data.
```javascript
var sub = Zest.getSubmission();
// { score, maxScore, artifacts, comment, submittedAt, userId, userName }
// score/maxScore are null for teacher-graded (submitWork) submissions
```

---

## Answer Key Methods (Review Mode Only)

### Zest.getAnswerKey()
Returns the answer key data from the content's `.secure/` directory, if one was declared in `zest.json`. Only available in **review mode** (SpeedGrader). Returns `null` in student mode or if no answer key exists.

```javascript
if (Zest.isReviewMode()) {
  var key = Zest.getAnswerKey();
  if (key) {
    // key is the parsed JSON from the answer key file
    highlightCorrectAnswers(key);
  }
}
```

---

## State Persistence Methods

Three-tier storage: Memory (undo/redo) -> localStorage (fast/offline) -> Server/PostgreSQL (durable/cross-device).

State is keyed by `contentId + assignmentId + userId` — same content in two different assignments = independent saves.

### Zest.saveState(data)
Save work-in-progress. Writes to localStorage immediately, marks state as dirty for server sync (every 60 seconds). Pushes current state to undo stack and clears redo stack.

```javascript
Zest.saveState({
  currentPhase: 3,
  answers: { q1: 'a', q2: 'b' },
  hypothesis: 'Plants grow faster with more light'
});
// No return value — fire and forget
```

### Zest.loadState()
Load saved state. First call fetches from server and compares with localStorage — uses the newer one. Subsequent calls return from localStorage (fast).

```javascript
var state = await Zest.loadState();
if (state) {
  restoreForm(state);  // Rebuild UI from saved state
}
// Returns: data object or null (no saved state)
```

### Zest.clearState()
Clear all saved state (localStorage, undo/redo stacks, and server). Used for "Start Over" / reset functionality.

```javascript
await Zest.clearState();
```

### Zest.syncNow()
Force immediate server sync instead of waiting for the 60-second timer.

```javascript
await Zest.syncNow();
```

### Zest.undo() / Zest.redo()
In-memory only, per session. Max 50 entries.

```javascript
var prev = Zest.undo();   // Previous state or null
var next = Zest.redo();   // Next state or null
```

### Zest.hasUnsyncedChanges()
Returns `true` if localStorage state differs from server.

### Sync status values

`'synced'`, `'dirty'` (saved locally, not yet on the server), `'syncing'`, `'error'` (server unreachable; will retry), `'expired'` (the Canvas session is gone, typically after many hours; the draft stays in localStorage and is sent on the next launch). Show `'expired'` as "Reopen this activity from Canvas to keep saving"; do not treat it as an error the student can fix in place. `Zest.getSyncStatus()` returns the current value.

Since bridge 3.1 a sync also runs 5 seconds after each `saveState()` and whenever the tab is hidden, so students rarely lose more than a few seconds of work. A save result may carry `conflict: true` when the same student changed the state from another device in the meantime; the most recent save wins, so content should not need to handle it.

### Zest.onSyncStatus(callback)
Fires with sync status changes. Use this to show a save indicator.

```javascript
Zest.onSyncStatus(function(status) {
  // status: 'synced' | 'dirty' | 'syncing' | 'error'
  var labels = {
    synced: 'Saved',
    dirty: 'Unsaved changes',
    syncing: 'Saving...',
    error: 'Save failed'
  };
  document.getElementById('save-indicator').textContent = labels[status];
});
```

---

## State Persistence Internals

- **Sync timer**: 60-second interval syncs dirty state to server via the embed wrapper
- **MD5 hash**: Server compares hash to skip redundant writes
- **beforeunload**: On tab close, bridge sends state to wrapper which fires `navigator.sendBeacon`
- **localStorage key**: `zest-state-{contentId}-{assignmentId}-{userId}`
- **Size limit**: 10 MB per state
- **Undo/redo**: In-memory only, max 50 entries, cleared on page reload

---

## Content Config Methods

Config is stored per-zest (by `contentId` only). If a teacher needs different config for the same content in two assignments, they duplicate the zest in the picker and configure each copy independently.

### Zest.getAssessmentConfig()
Returns the assessment config that was provided at launch time (synchronous). This is the resolved config sent via the `zest-context` postMessage. Returns `null` if no config is available.

```javascript
Zest.onReady(function(ctx) {
  var config = Zest.getAssessmentConfig();
  if (config) {
    console.log('Assessment mode:', config.mode);  // 'explore' or 'quiz'
  }
});
```

**How it works**: When the embed wrapper loads, it resolves the config by checking the `zest_content_config` table for the contentId. If no override exists, it falls back to the `assessment.json` file from the zip. The resolved config is included in the `zest-context` postMessage to the content iframe.

### Scope (assignmentId)

`getConfig`, `saveConfig` and `deleteConfig` take an optional `assignmentId`. Omit it (or pass `''`) for the content-level config every placement shares, as in bridge 3.0. Pass an assignment id for a per-assignment override; the server refuses those with `{ success: false, code: 'PER_ASSIGNMENT_DISABLED' }` until the administrator enables them, so editors should fall back to the content-level save when they see that code. When the editor is opened from an assignment and overrides are enabled, the wrapper shows an "Apply settings to" bar and applies the teacher's choice automatically; an explicit `assignmentId` argument always wins over the bar.

### Zest.getConfig(assignmentId?)
Load config for this zest from the server. Returns a Promise.

```javascript
var result = await Zest.getConfig();
// { success: true, config: {...}, source: 'override' | 'default' | 'none' }
// { success: false, error: '...' }
```

The `source` field indicates where the config was found:
- `"override"` — teacher-customized config from the database
- `"default"` — default config from the `assessment.json` file in the zip
- `"none"` — no config available

### Zest.saveConfig(configData, assignmentId?)
Save config for this zest to the server. Instructor-only. Creates or updates the config record.

```javascript
var result = await Zest.saveConfig({
  version: '1.0.0',
  mode: 'quiz',
  quiz: { questions: [...], maxScore: 100 }
});
// { success: true } or { success: false, error: '...' }
```

### Zest.deleteConfig(assignmentId?)
Delete config for this zest from the server. Reverts to the default `assessment.json` from the zip.

```javascript
var result = await Zest.deleteConfig();
// { success: true } or { success: false, error: '...' }
```

---

## Parameter Methods

Parameters are defined in `zest.json` and set per-placement by teachers during embedding. They allow the same content to behave differently in different assignments (e.g., different difficulty levels, time limits, or question sets).

### Zest.getParameters()
Returns the full parameters object for this placement, or `null` if no parameters were set.

```javascript
Zest.onReady(function(ctx) {
  var params = Zest.getParameters();
  if (params) {
    console.log('Difficulty:', params.difficulty);
    console.log('Time limit:', params.timeLimit);
  }
});
```

### Zest.getParameter(key, defaultValue)
Get a single parameter value with a fallback default.

```javascript
var difficulty = Zest.getParameter('difficulty', 'medium');
var timeLimit = Zest.getParameter('timeLimit', 30);
var showHints = Zest.getParameter('showHints', true);
```

**How parameters are set**: Teachers configure parameter values when embedding content via the picker UI. Values are stored as LTI custom variables (`zest_param_<key>`) so each placement (assignment) can have different values for the same content.

**Type coercion**: Parameter values are automatically coerced based on the type declared in `zest.json`:
- `"select"` -> string
- `"number"` -> number (parseFloat)
- `"boolean"` -> boolean
- `"text"` -> string

---

## Server Info Methods

### Zest.getServerInfo()
Fetch server capabilities and version info. Results are cached after the first call.

```javascript
var info = await Zest.getServerInfo();
// { specVersion: '1.0', bridgeVersion: '3.0.0', serverVersion: '...', capabilities: [...] }
```

### Zest.supportsCapability(name)
Check if the server supports a named capability. Requires `getServerInfo()` to have been called first to populate the cache.

```javascript
await Zest.getServerInfo();
if (Zest.supportsCapability('assessment.config')) {
  // Server supports config CRUD API
}
```

**Known capabilities**: `grading.auto`, `grading.teacher`, `state.persistence`, `state.sync`, `review.speedgrader`, `review.answerkey`, `parameters`, `sandbox.configurable`, `domains.allowlist`, `fullscreen`, `external.tab`, `assessment.config`

---

## Error Handling Pattern

Always handle submission failures with retry capability:

```javascript
Zest.submitScore(score, { artifacts: data })
  .then(function(result) {
    if (result.success) {
      submitBtn.textContent = 'Submitted!';
      submitBtn.disabled = true;
    } else {
      submitBtn.textContent = 'Retry Submit';
      submitBtn.disabled = false;
    }
  })
  .catch(function(err) {
    submitBtn.textContent = 'Retry Submit';
    submitBtn.disabled = false;
  });
```
