---
name: spec-file
description: Zest spec file (zest.json) schema and usage. Use when creating or editing a zest.json manifest for interactive content, configuring parameters, answer keys, sandbox permissions, or any metadata for a Zestable package.
user-invocable: false
---

# Zest Spec File (`zest.json`)

## Purpose

`zest.json` is an optional manifest at the root of a Zest content package (`.zest` file). When present, it auto-configures the content on upload — setting the title, grading mode, entry files, parameters, sandbox permissions, and answer key.

## Full Schema

```json
{
  "zestSpec": "1.0",
  "name": "Activity Title",
  "version": "1.0.0",
  "description": "Short description of the activity",
  "author": "Teacher Name",
  "grading": "auto",
  "mainFile": "index.html",
  "editorFile": "editor.html",
  "assessmentFile": "assessment.json",
  "reviewFile": "review.html",
  "answerKey": "answer-key.json",
  "embedType": "interactive",
  "width": 800,
  "height": 600,
  "autoHeight": false,
  "permissions": ["fullscreen"],
  "tags": ["biology", "quiz"],
  "allowedDomains": ["cdn.jsdelivr.net"],
  "parameters": [
    {
      "key": "difficulty",
      "type": "select",
      "label": "Difficulty Level",
      "options": ["easy", "medium", "hard"],
      "default": "medium"
    },
    {
      "key": "timeLimit",
      "type": "number",
      "label": "Time Limit (minutes)",
      "min": 1,
      "max": 120,
      "default": 30
    },
    {
      "key": "showHints",
      "type": "boolean",
      "label": "Show Hints",
      "default": true
    },
    {
      "key": "studentName",
      "type": "text",
      "label": "Custom Label",
      "default": ""
    }
  ],
  "sandbox": {
    "allowScripts": true,
    "allowSameOrigin": true,
    "allowPopups": true,
    "allowForms": true,
    "allowModals": false,
    "allowTopNavigation": false
  },
  "attribution": {
    "source": "Author or Organization Name",
    "license": "CC BY 4.0",
    "url": "https://example.com/original-source"
  }
}
```

## Fields Reference

### Metadata
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `zestSpec` | string | `"1.0"` | Spec version. Currently always `"1.0"`. |
| `name` | string | — | Display title for the content |
| `version` | string | — | Semantic version |
| `description` | string | — | Short description |
| `author` | string | — | Creator name |

### Content Configuration
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `grading` | string | `"none"` | `"auto"`, `"teacher"`, or `"none"` |
| `mainFile` | string | `"index.html"` | Student-facing entry file |
| `editorFile` | string | auto-detected | Teacher config editor (popup UI for per-zest settings). Served at `/editor/:contentId`. |
| `assessmentFile` | string | auto-detected | Default assessment config file (e.g., `assessment.json`). Provides baseline config before teacher overrides. |
| `reviewFile` | string | auto-detected | SpeedGrader review file |
| `answerKey` | string | — | Path to answer key JSON (stored in `.secure/`) |
| `embedType` | string | `"interactive"` | `"static"` (html embed, no grading) or `"interactive"` (LTI assignment, full grading/state) |
| `allowedDomains` | array | `[]` | External domains allowed in Content Security Policy. Merged with server-level `ZEST_ALLOWED_DOMAINS`. |

### Layout
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `width` | number | `800` | Suggested width in pixels (200-2000) |
| `height` | number | `600` | Suggested height in pixels (100-2000) |
| `autoHeight` | boolean | — | Auto-resize based on content |

### Categorization
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `permissions` | array | — | Requested browser permissions |
| `tags` | array | — | Tags for organizing content |

### Attribution
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `attribution.source` | string | — | Original author or organization |
| `attribution.license` | string | — | License identifier (e.g., `"CC BY 4.0"`) |
| `attribution.url` | string | — | URL to original source |

### Parameters

Parameters allow teachers to configure the content differently per-placement. Defined in `zest.json`, values are set by teachers during embedding and passed as Canvas custom variables (`zest_param_{key}`).

**Format:** Array of parameter objects, each with a `key` property:

```json
"parameters": [
  { "key": "difficulty", "type": "select", "label": "Difficulty", "options": ["easy", "hard"], "default": "easy" },
  { "key": "timeLimit", "type": "number", "label": "Time (min)", "min": 1, "max": 120, "default": 30 }
]
```

**Parameter types:**

| Type | Value | Bridge returns |
|------|-------|---------------|
| `select` | One of `options` array | string |
| `number` | Numeric value within `min`/`max` | number |
| `boolean` | `true` or `false` | boolean |
| `text` | Freeform string | string |

Each parameter must have:
- `key` — unique identifier, used as the Canvas custom variable name
- `type` — one of the types above
- `label` — human-readable label shown in picker UI
- `default` — value used if teacher doesn't set one

Optional fields:
- `options` — array of choices (required for `select` type)
- `min`, `max` — numeric bounds (for `number` type)

**Reading parameters in content:**
```javascript
var difficulty = Zest.getParameter('difficulty');
var timeLimit = Zest.getParameter('timeLimit');
var params = Zest.getParameters(); // all parameters as object
```

### Sandbox

Controls the iframe sandbox permissions for the content. The server builds the `sandbox` attribute from these flags.

| Flag | Default | Sandbox Token |
|------|---------|---------------|
| `allowScripts` | `true` | `allow-scripts` |
| `allowSameOrigin` | `true` | `allow-same-origin` |
| `allowPopups` | `true` | `allow-popups` |
| `allowForms` | `true` | `allow-forms` |
| `allowModals` | `false` | `allow-modals` |
| `allowTopNavigation` | `false` | `allow-top-navigation` |

Default sandbox (when no `sandbox` field): `allow-scripts allow-same-origin allow-popups allow-forms`

## Answer Key

The `answerKey` field points to a JSON file in the content zip. During upload:

1. The file is moved to a `.secure/` subdirectory
2. The `.secure/` directory is blocked from public access (returns 403)
3. Students cannot access the answer key
4. Teachers can access it via `Zest.getAnswerKey()` in `review.html` (SpeedGrader only)

**Example answer key file (`answer-key.json`):**
```json
{
  "q1": "b",
  "q2": "c",
  "q3": "a",
  "q4": "d"
}
```

## Minimal Examples

### Auto-graded quiz
```json
{
  "name": "Chapter 3 Quiz",
  "grading": "auto",
  "answerKey": "answer-key.json"
}
```

### Teacher-graded lab
```json
{
  "name": "Plant Growth Experiment",
  "grading": "teacher",
  "parameters": [
    { "key": "difficulty", "type": "select", "label": "Difficulty", "options": ["basic", "advanced"], "default": "basic" }
  ]
}
```

### Content with editor and assessment
```json
{
  "zestSpec": "1.0",
  "name": "Forces and Motion: Basics",
  "version": "3.0.0",
  "grading": "auto",
  "editorFile": "editor.html",
  "assessmentFile": "assessment.json",
  "reviewFile": "review.html",
  "parameters": [
    { "key": "defaultScreen", "type": "select", "default": "", "options": ["", "net-force", "motion", "friction", "acceleration"], "label": "Starting Screen" },
    { "key": "locale", "type": "text", "default": "", "label": "Language Code (e.g. es, fr, de)" }
  ],
  "sandbox": { "allowScripts": true, "allowSameOrigin": true, "allowPopups": false, "allowForms": false },
  "tags": ["physics", "forces", "phet"],
  "allowedDomains": [],
  "width": 900,
  "height": 700,
  "attribution": {
    "source": "PhET Interactive Simulations, University of Colorado Boulder",
    "license": "CC BY 4.0",
    "url": "https://phet.colorado.edu/en/simulations/forces-and-motion-basics"
  }
}
```

### Ungraded tutorial
```json
{
  "name": "Periodic Table Explorer",
  "grading": "none",
  "tags": ["chemistry", "reference"]
}
```
