# Zest Content Creator

Create interactive Canvas LMS content using Claude Code. Build quizzes, labs, simulations, and other activities that embed directly in Canvas pages with grading and state persistence.

## What is Zest?

[Zest](https://github.com/virtualarkansas/zest-server) is a self-hosted Canvas LTI 1.3 tool that lets you embed interactive HTML/JS/CSS content in Canvas pages. This template repo provides a Claude Code plugin that helps you create that content conversationally.

A **Zestable** is one self-contained content package — a `.zest` file (renamed zip) containing HTML, CSS, JS, and a `zest.json` manifest.

## Getting Started

### 1. Create Your Workspace

Click **"Use this template"** on GitHub to create your own copy of this repo.

### 2. Open in Claude Code

Open your new repo in [Claude Code](https://claude.ai/claude-code) (CLI or Web).

### 3. Create Content

Tell Claude what you want to build:

> "Make me a 10-question multiple choice quiz about the American Revolution for my 8th grade history class"

Or use the slash command:

> `/zest-new`

Claude will ask you about grading, state persistence, parameters, and other options, then build the content.

### 4. Package for Upload

When your content is ready:

> `/zest-build`

This validates your content and packages it as a `.zest` file.

### 5. Upload to Canvas

1. In Canvas, open the Rich Content Editor (edit any page or assignment)
2. Click the Zest toolbar button ("Embed Interactive Content")
3. Upload your `.zest` file
4. If the content has parameters, configure them in the picker UI
5. Choose **Interactive** mode (for graded content) or **Static** (for non-graded)
6. Save — your content appears as an interactive iframe in the Canvas page

## Features

- **Auto-Graded Content** — Quizzes, fill-in-the-blank, matching exercises with scores that appear instantly in the Canvas gradebook
- **Teacher-Graded Content** — Lab reports, essays, experiments where the teacher reviews and assigns grades in SpeedGrader
- **State Persistence** — Students can close the tab and return later; their work is automatically saved
- **SpeedGrader Integration** — Custom review view shows student work to teachers
- **Spec File (`zest.json`)** — Auto-configure content metadata, grading mode, and settings on upload
- **Secure Answer Keys** — Store answer keys server-side; never exposed to students
- **Per-Placement Parameters** — Same content, different settings per assignment (difficulty, time limits, etc.)
- **Configurable Sandbox** — Control iframe permissions per-content
- **Security Review** — IT admins can scan content for security issues before deployment

## Plugin Commands

| Command | Description |
|---------|-------------|
| `/zest-new` | Create new interactive content through conversation |
| `/zest-build` | Validate and package content as a `.zest` file for upload |

## Requirements

- A Zest instance deployed and connected to your Canvas LMS
- Claude Code (CLI or Web)

## License

MIT. See [LICENSE](LICENSE). The names "Zest" and "Zestable" are trademarks of Virtual Arkansas (applications pending); see [TRADEMARKS.md](TRADEMARKS.md).
