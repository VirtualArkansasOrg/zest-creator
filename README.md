# Zest Content Creator

Build interactive Canvas content with Claude Code. Quizzes, labs, simulations and other activities that run inside Canvas pages and assignments through [Zest](https://github.com/virtualarkansas/zest-server), with grades in the gradebook, student work in SpeedGrader and progress saved between sessions.

A **Zestable** is one self-contained content package: a `.zest` file (a zip) containing HTML, CSS, JavaScript and a `zest.json` manifest, as defined by the [Zest specification](https://github.com/virtualarkansas/zest-spec).

## Getting started

### 1. Make your own copy

Click **Use this template** on GitHub. Your copy is a private workspace; the content you build stays in it.

### 2. Open it in Claude Code

Open the repository in [Claude Code](https://claude.ai/claude-code) (the web app, the CLI or an IDE extension). The `/zest-new` and `/zest-build` commands and the supporting skills load automatically from the `.claude/` directory; there is nothing to install.

### 3. Describe what you want

> Make me a ten-question multiple choice quiz about the American Revolution for 8th grade history, auto-graded, with hints the teacher can turn off.

Or start with `/zest-new`. Claude asks about grading, saving progress and configurable settings, then writes the files into `content/<name>/`.

### 4. Build the package

> `/zest-build`

This runs `scripts/zest-build.js`, which checks the package (manifest, files, answer key, Canvas rules, bridge include) and writes `dist/<name>.zest`. Errors block the build; warnings are explained so you can decide.

### 5. Upload to Canvas

1. Edit a page or assignment in Canvas and open the Rich Content Editor.
2. Click the Zest toolbar button ("Embed Interactive Content").
3. Upload the `.zest` file and choose **Interactive** (graded content, saved work) or **Static** (a plain embed).
4. For a graded assignment, set the submission type to External Tool, choose Zest and pick the content.
5. Test it as a student in a test course.

## What you can build

- **Auto-graded** quizzes, fill-in-the-blank and matching exercises with scores that appear in the gradebook immediately
- **Teacher-graded** lab reports, essays and experiments reviewed in SpeedGrader through a custom `review.html`
- Activities that **save progress** so students can leave and come back on any device
- Content with **teacher-configurable settings** declared in `zest.json`
- Content with a **secure answer key** that students can never load
- Simulations with a **teacher config editor** (`editor.html`) for per-content assessment settings

## Workspace layout

```
zest.config.json        bridgeUrl (default /public/zest-bridge.js), contentDir, outDir
content/<name>/         one directory per activity
dist/                   built .zest files
scripts/zest-build.js   validator and packager (Node, no dependencies)
commands/ skills/ agents/   the Claude Code plugin; mirrored into .claude/ by scripts/sync-claude.js
```

`bridgeUrl` is the only setting most people never touch: the root-relative default works on every Zest server. Change it only if your institution serves content from a different origin than the bridge.

## Commands

| Command | Description |
|---------|-------------|
| `/zest-new` | Create a new activity through conversation |
| `/zest-build` | Validate and package an activity as `dist/<name>.zest` |

The skills (bridge API, content patterns, review viewer, editor, spec file, security review) are used by the commands and can be invoked directly by describing the task.

## Using it as an installed plugin

The repository is also laid out as a Claude Code plugin (`.claude-plugin/plugin.json` with `commands/`, `skills/` and `agents/`). Add it to a marketplace of your own or point Claude Code at a checkout to use the commands in another project. The template route above is the simplest.

## Requirements

- A Zest server connected to your Canvas (ask your Canvas administrator, or [run one](https://github.com/virtualarkansas/zest-server))
- Claude Code
- Node.js 18 or later for `scripts/zest-build.js` (Claude Code's environments have it)

## License

MIT. See [LICENSE](LICENSE). The names "Zest" and "Zestable" are trademarks of Virtual Arkansas (applications pending); see [TRADEMARKS.md](TRADEMARKS.md).
