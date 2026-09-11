---
name: editor
description: How to build editor.html for Zest content configuration. Use when creating a teacher-facing config editor that allows teachers to customize assessment settings, question sets, or other per-zest configuration for interactive content. Covers the editor pattern, Bridge API config methods, and UI conventions.
user-invocable: false
---

# Editor Pattern (editor.html)

## Purpose

`editor.html` is a teacher-facing configuration UI served at `/editor/:contentId`. When a content zip includes an `editorFile` declared in `zest.json`, the picker shows an "Edit" button that opens this editor in a popup. Teachers use it to customize assessment questions, modes, and settings per-zest.

## File Convention

Declare the editor in `zest.json`:

```json
{
  "editorFile": "editor.html",
  "assessmentFile": "assessment.json"
}
```

The picker automatically shows an "Edit" button for content that has an `editorFile`. The button opens `/editor/:contentId` in a new window.

## How Config Resolution Works

1. **Default config**: The `assessment.json` file bundled in the zip. This is the fallback when no teacher override exists.
2. **Server override**: A teacher-saved config stored in the `zest_content_config` database table, keyed by `contentId` only.
3. **Resolution**: The embed wrapper checks the DB first. If no override exists, it reads `assessment.json` from the zip. The resolved config is sent to the content iframe via `zest-context` postMessage.

Config is stored **per-zest** (by `contentId` only). If a teacher needs different config for the same content in two assignments, they duplicate the zest in the picker and configure each copy independently.

## Bridge API Methods for Editors

### Zest.getAssessmentConfig()
**Synchronous.** Returns the default assessment config that was provided at launch time (from `assessment.json`). Use this as the baseline/default values for the editor form.

```javascript
var defaults = Zest.getAssessmentConfig();
```

### Zest.getConfig()
**Async.** Loads the current server-side override config for this zest. Returns `{ success, config, source }` where `source` is `'override'`, `'default'`, or `'none'`.

```javascript
var result = await Zest.getConfig();
if (result.success && result.config) {
  // Teacher has previously saved config — use it
  loadConfigIntoForm(result.config);
} else {
  // No override — use defaults from assessment.json
  loadConfigIntoForm(defaults);
}
```

### Zest.saveConfig(configData)
**Async.** Saves the config object to the server. Instructor-only.

```javascript
var result = await Zest.saveConfig(formConfig);
if (result.success) {
  showToast('Configuration saved!', 'success');
}
```

### Zest.deleteConfig()
**Async.** Deletes the server override, reverting to the default `assessment.json`.

```javascript
var result = await Zest.deleteConfig();
if (result.success) {
  showToast('Reset to defaults', 'info');
  loadConfigIntoForm(defaults);
}
```

## Editor Architecture

### Initialization Flow

```javascript
(function() {
  'use strict';

  var defaults = null;   // From assessment.json (via getAssessmentConfig)
  var config = null;      // Active config being edited
  var hasOverride = false; // Whether server has a saved override

  function initEditor() {
    Zest.onReady(function(ctx) {
      // 1. Get the default config from assessment.json
      defaults = Zest.getAssessmentConfig();
      if (!defaults) {
        showError('No assessment config found for this content.');
        return;
      }

      // 2. Check if teacher has a saved override
      Zest.getConfig().then(function(result) {
        if (result.success && result.config) {
          config = result.config;
          hasOverride = true;
        } else {
          config = JSON.parse(JSON.stringify(defaults)); // Deep clone defaults
          hasOverride = false;
        }

        // 3. Populate the form
        loadConfigIntoForm(config);
        showEditor();
      });
    });
  }

  initEditor();
})();
```

### Save / Reset / Cancel Flow

```javascript
function handleSave() {
  var formConfig = gatherFormConfig();

  // Validate before saving
  if (!validateConfig(formConfig)) return;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  Zest.saveConfig(formConfig).then(function(result) {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
    if (result.success) {
      config = formConfig;
      hasOverride = true;
      showToast('Configuration saved!', 'success');
    } else {
      showToast('Save failed: ' + (result.error || 'Unknown error'), 'error');
    }
  });
}

function handleReset() {
  if (!hasOverride) {
    showToast('Already using defaults', 'info');
    return;
  }

  Zest.deleteConfig().then(function(result) {
    if (result.success) {
      config = JSON.parse(JSON.stringify(defaults));
      hasOverride = false;
      loadConfigIntoForm(config);
      showToast('Reset to defaults', 'info');
    }
  });
}

function handleCancel() {
  window.close(); // Editor runs in a popup
}
```

## UI Conventions

### Dark Theme

Editors use a dark theme to visually distinguish them from student content:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  padding: 24px;
  margin: 0;
}
.editor-card {
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
}
h1, h2, h3 { color: #e94560; }
```

### Form Elements

```css
input[type="text"], textarea, select {
  width: 100%;
  padding: 10px 14px;
  background: #0f3460;
  border: 1px solid #1a3a5c;
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 14px;
}
input[type="text"]:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #e94560;
  box-shadow: 0 0 0 2px rgba(233, 69, 96, 0.25);
}
input[type="checkbox"] {
  accent-color: #e94560;
  width: 18px;
  height: 18px;
}
```

### Buttons

```css
.btn-save {
  background: #e94560;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.btn-save:hover { background: #c23152; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-reset {
  background: transparent;
  color: #e94560;
  border: 1px solid #e94560;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
}
.btn-reset:hover { background: rgba(233, 69, 96, 0.1); }

.btn-cancel {
  background: transparent;
  color: #888;
  border: 1px solid #333;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
}
```

### Toast Notifications

```javascript
function showToast(message, type) {
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { toast.classList.add('visible'); }, 10);
  setTimeout(function() {
    toast.classList.remove('visible');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}
```

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s;
  z-index: 9999;
}
.toast.visible { opacity: 1; transform: translateY(0); }
.toast-success { background: #2e7d32; color: white; }
.toast-error { background: #c62828; color: white; }
.toast-info { background: #1565c0; color: white; }
```

## Assessment Config Schema

The editor reads and writes an assessment config object. See the `zest:spec-file` skill for the full `zest.json` schema. The assessment config has this structure:

```json
{
  "version": "1.0.0",
  "mode": "explore",
  "explore": {
    "steps": [
      {
        "id": "predict",
        "title": "Predict",
        "prompt": "Before exploring, predict what will happen...",
        "type": "text",
        "required": true,
        "minLength": 20
      }
    ]
  },
  "quiz": {
    "questions": [
      {
        "id": "q1",
        "type": "multiple_choice",
        "prompt": "What happens to an object at rest with no net force?",
        "options": ["It accelerates", "It remains at rest", "It moves at constant speed", "It decelerates"],
        "correctIndex": 1,
        "points": 20
      },
      {
        "id": "q2",
        "type": "true_false",
        "prompt": "Friction always opposes the direction of motion.",
        "correctAnswer": true,
        "points": 20
      }
    ],
    "maxScore": 100,
    "shuffleQuestions": false,
    "shuffleOptions": true,
    "showFeedback": true
  }
}
```

### Key Fields

- **`mode`**: `"explore"` or `"quiz"` — determines which section is active
- **`explore.steps[]`**: Guided text-response steps (Predict -> Explore -> Explain pattern). Teacher-graded via `submitWork()`.
- **`quiz.questions[]`**: Auto-graded multiple choice and true/false questions. Auto-graded via `submitScore()`.

### Editor UI Sections

A typical editor has these sections:

1. **Mode Toggle** — Switch between Explore and Quiz modes
2. **Explore Steps Editor** — Add/remove/reorder text prompt steps with title, prompt, required toggle, min length
3. **Quiz Questions Editor** — Add/remove MC and T/F questions, set correct answers, point values
4. **Quiz Settings** — Shuffle questions, shuffle options, show feedback toggles
5. **Action Buttons** — Save, Reset to Defaults, Cancel

### Validation Rules

Before saving, validate the config:

```javascript
function validateConfig(cfg) {
  if (!cfg.mode) return showError('Mode is required');

  if (cfg.mode === 'explore') {
    if (!cfg.explore || !cfg.explore.steps || cfg.explore.steps.length === 0) {
      return showError('At least one explore step is required');
    }
    for (var i = 0; i < cfg.explore.steps.length; i++) {
      var step = cfg.explore.steps[i];
      if (!step.id || !step.title || !step.prompt) {
        return showError('Step ' + (i + 1) + ' is missing required fields');
      }
    }
  }

  if (cfg.mode === 'quiz') {
    if (!cfg.quiz || !cfg.quiz.questions || cfg.quiz.questions.length === 0) {
      return showError('At least one quiz question is required');
    }
    for (var i = 0; i < cfg.quiz.questions.length; i++) {
      var q = cfg.quiz.questions[i];
      if (!q.id || !q.prompt || !q.type) {
        return showError('Question ' + (i + 1) + ' is missing required fields');
      }
      if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
        return showError('Question ' + (i + 1) + ' needs at least 2 options');
      }
    }
  }

  return true;
}
```

## Complete HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Editor</title>
  <script src="/public/zest-bridge.js"></script>
  <style>
    /* Dark theme styles (see UI Conventions above) */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e; color: #e0e0e0; padding: 24px;
    }
    /* ... rest of styles ... */
  </style>
</head>
<body>
  <div id="loading">Loading editor...</div>
  <div id="editor" style="display:none;">
    <h1>Assessment Configuration</h1>

    <!-- Mode Toggle -->
    <div class="editor-card">
      <h2>Assessment Mode</h2>
      <div class="mode-toggle">
        <button id="mode-explore" onclick="setMode('explore')">Explore</button>
        <button id="mode-quiz" onclick="setMode('quiz')">Quiz</button>
      </div>
    </div>

    <!-- Explore Steps (shown when mode=explore) -->
    <div id="explore-section" style="display:none;">
      <!-- Dynamic step editors -->
    </div>

    <!-- Quiz Questions (shown when mode=quiz) -->
    <div id="quiz-section" style="display:none;">
      <!-- Dynamic question editors -->
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="btn-save" onclick="handleSave()">Save</button>
      <button class="btn-reset" onclick="handleReset()">Reset to Defaults</button>
      <button class="btn-cancel" onclick="handleCancel()">Cancel</button>
    </div>
  </div>

  <script>
    (function() {
      'use strict';
      // Editor initialization and logic (see Architecture above)
    })();
  </script>
</body>
</html>
```

## Important Notes

1. **ES5 only** — Use `var`, `function`, no arrow functions, no template literals. Must work in all browsers.
2. **Self-contained** — All CSS and JS inline. Only external script is the bridge.
3. **Dark theme** — Editors use dark styling to distinguish from student content.
4. **IIFE wrapper** — All JavaScript in an immediately-invoked function expression.
5. **Popup context** — The editor opens in a popup window via the picker's "Edit" button. `window.close()` closes it.
6. **No state persistence** — Editors don't use `saveState()`/`loadState()`. They read/write config via `getConfig()`/`saveConfig()`.
7. **Instructor-only** — The `/editor/:contentId` route requires instructor LTI role. Config save/delete methods are instructor-only.
8. **Per-zest config** — Config is stored by `contentId` only. No `assignmentId` in the config methods.
