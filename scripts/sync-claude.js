#!/usr/bin/env node
// Generates the project-level .claude/ layout from the plugin layout so a
// checkout of this template loads the commands and skills with no install:
//
//   commands/<name>.md        ->  .claude/commands/<name>.md
//   skills/<name>/SKILL.md    ->  .claude/skills/<name>/SKILL.md
//   agents/<name>.md          ->  .claude/agents/<name>.md
//
// The generated files are byte copies (Claude Code reads both layouts the
// same way). Run after editing anything under commands/, skills/ or agents/.
//   node scripts/sync-claude.js          write
//   node scripts/sync-claude.js --check  exit 1 if anything is out of date
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
let stale = 0;

function copy(src, dst) {
  const want = fs.readFileSync(src);
  const have = fs.existsSync(dst) ? fs.readFileSync(dst) : null;
  if (have && have.equals(want)) return;
  stale++;
  if (check) { console.log(`out of date: ${path.relative(ROOT, dst)}`); return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, want);
  console.log(`wrote ${path.relative(ROOT, dst)}`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

for (const kind of ['commands', 'skills', 'agents']) {
  for (const src of walk(path.join(ROOT, kind))) {
    copy(src, path.join(ROOT, '.claude', path.relative(ROOT, src)));
  }
}

if (check && stale) { console.error(`${stale} file(s) out of date; run: node scripts/sync-claude.js`); process.exit(1); }
if (!stale) console.log(check ? '.claude/ is up to date' : 'nothing to do');
