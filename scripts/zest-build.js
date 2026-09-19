#!/usr/bin/env node
// Validate a Zest content directory and package it as dist/<name>.zest.
//
//   node scripts/zest-build.js content/my-quiz          validate and package
//   node scripts/zest-build.js content/my-quiz --check  validate only
//   node scripts/zest-build.js --all                    every directory under contentDir
//   node scripts/zest-build.js --json ...               machine-readable report
//
// Exit code 0 = packaged (or valid), 1 = errors found, 2 = usage error.
// No dependencies: the zip is written with zlib (deflate) directly.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_CONFIG = { bridgeUrl: '/public/zest-bridge.js', contentDir: 'content', outDir: 'dist' };
const GRADING = ['none', 'auto', 'teacher'];
const PARAM_TYPES = ['text', 'select', 'number', 'boolean'];
const SANDBOX_KEYS = ['allowScripts', 'allowSameOrigin', 'allowPopups', 'allowForms', 'allowModals', 'allowTopNavigation', 'allowPresentation', 'allowDownloads'];
const BLOCKED_EXT = new Set(['.exe', '.msi', '.dll', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1', '.psm1', '.jar', '.war', '.ear', '.lnk', '.url', '.scf', '.app', '.dmg', '.pkg', '.elf', '.bin', '.run', '.deb', '.rpm']);
const SKIP = [/(^|\/)\.(?!secure\/)[^/]*$/, /(^|\/)__MACOSX(\/|$)/, /(^|\/)node_modules(\/|$)/, /\.zest$/, /\.zip$/];
const MAX_FILE = 50 * 1024 * 1024;
const MAX_TOTAL = 100 * 1024 * 1024;

function loadConfig() {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(path.join(ROOT, 'zest.config.json'), 'utf8')) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (SKIP.some(re => re.test(rel))) continue;
    if (entry.isSymbolicLink()) { out.push({ rel, abs, symlink: true }); continue; }
    if (entry.isDirectory()) walk(abs, base, out);
    else out.push({ rel, abs, size: fs.statSync(abs).size });
  }
  return out;
}

// Remove HTML, block and line comments so a comment that mentions alert() is
// not reported as a call. Strings are left alone; a false positive there is
// rare and worth a look anyway.
function stripComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\'"`])\/\/[^\n]*/g, '$1');
}

function safeRelative(p) {
  return typeof p === 'string' && p.length > 0 && !path.isAbsolute(p) && !p.includes('\\') && !p.includes('\0') && !p.split('/').includes('..');
}

function validate(dir, config) {
  const errors = [], warnings = [], notes = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m), note = (m) => notes.push(m);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return { errors: [`${dir} is not a directory`], warnings, notes, files: [] };

  const files = walk(dir);
  const has = (rel) => files.some(f => f.rel === rel);
  const read = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

  if (!has('index.html')) err('index.html is missing at the top level of the content directory');
  for (const f of files) {
    if (f.symlink) err(`${f.rel} is a symlink (the server removes symlinks; include the real file)`);
    if (BLOCKED_EXT.has(path.extname(f.rel).toLowerCase())) err(`${f.rel}: blocked file type (the server rejects the whole upload)`);
    if (f.size > MAX_FILE) err(`${f.rel} is ${(f.size / 1048576).toFixed(1)} MB; the per-file limit is 50 MB`);
  }
  const total = files.reduce((n, f) => n + (f.size || 0), 0);
  if (total > MAX_TOTAL) err(`content is ${(total / 1048576).toFixed(1)} MB uncompressed; the limit is 100 MB`);

  // Manifest
  let spec = null;
  if (has('zest.json')) {
    try { spec = JSON.parse(read('zest.json')); }
    catch (e) { err(`zest.json is not valid JSON: ${e.message}`); }
  } else {
    warn('zest.json is missing; the server will use defaults (title from the upload form, grading "none")');
  }
  const html = { index: has('index.html') ? read('index.html') : '', review: has('review.html') ? read('review.html') : '', editor: has('editor.html') ? read('editor.html') : '' };
  const usesGrading = /Zest\.(submitScore|submitWork)\s*\(/.test(html.index);
  const usesState = /Zest\.(saveState|loadState)\s*\(/.test(html.index);
  const usesParams = /Zest\.getParameter(s)?\s*\(/.test(html.index);

  if (spec && typeof spec === 'object') {
    if (spec.zestSpec !== undefined && !/^1\.\d+$/.test(String(spec.zestSpec))) err(`zest.json: zestSpec "${spec.zestSpec}" is not a 1.x version`);
    if (spec.zestSpec === undefined) warn('zest.json: add "zestSpec": "1.0" so servers can check compatibility');
    if (spec.grading !== undefined && !GRADING.includes(spec.grading)) err(`zest.json: grading must be one of ${GRADING.join(', ')}`);
    if (spec.grading && spec.grading !== 'none' && !usesGrading) warn(`zest.json says grading "${spec.grading}" but index.html never calls Zest.submitScore() or Zest.submitWork()`);
    if ((!spec.grading || spec.grading === 'none') && usesGrading) warn('index.html submits grades but zest.json does not declare "grading": "auto" or "teacher"');
    if (spec.grading === 'auto' && /Zest\.submitWork\s*\(/.test(html.index) && !/Zest\.submitScore\s*\(/.test(html.index)) warn('grading is "auto" but the content calls submitWork() (teacher-graded)');
    if (spec.grading === 'teacher' && /Zest\.submitScore\s*\(/.test(html.index)) warn('grading is "teacher" but the content calls submitScore() (auto-graded)');
    for (const key of ['mainFile', 'reviewFile', 'editorFile', 'assessmentFile', 'answerKey']) {
      const v = spec[key];
      if (v === undefined || v === null) continue;
      if (!safeRelative(v)) { err(`zest.json: ${key} "${v}" must be a relative path inside the package with no ".."`); continue; }
      if (!has(v)) err(`zest.json: ${key} points to "${v}" but that file does not exist`);
    }
    if (spec.answerKey && has(spec.answerKey)) {
      try { JSON.parse(read(spec.answerKey)); } catch (e) { err(`${spec.answerKey} is not valid JSON: ${e.message}`); }
      const keyText = has(spec.answerKey) ? read(spec.answerKey) : '';
      let parsed = null; try { parsed = JSON.parse(keyText); } catch { /* reported above */ }
      const values = parsed ? JSON.stringify(parsed) : '';
      if (values && html.index && values.length > 20 && html.index.includes(values)) err('index.html contains the answer key verbatim; students can read it');
      if (html.review && !/Zest\.getAnswerKey\s*\(/.test(html.review)) warn('review.html does not call Zest.getAnswerKey() although an answer key is declared');
    }
    if (spec.parameters !== undefined) {
      if (!Array.isArray(spec.parameters)) err('zest.json: parameters must be an array of { key, type, label, default }');
      else spec.parameters.forEach((p, i) => {
        if (!p || typeof p !== 'object') return err(`zest.json: parameters[${i}] is not an object`);
        if (!p.key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.key)) err(`zest.json: parameters[${i}] needs a key (letters, digits, underscore)`);
        if (!PARAM_TYPES.includes(p.type)) err(`zest.json: parameters[${i}] (${p.key}) type must be one of ${PARAM_TYPES.join(', ')}`);
        if (p.type === 'select' && (!Array.isArray(p.options) || p.options.length === 0)) err(`zest.json: parameters[${i}] (${p.key}) is a select without options`);
        if (p.label === undefined) warn(`zest.json: parameters[${i}] (${p.key}) has no label`);
        if (p.default === undefined) warn(`zest.json: parameters[${i}] (${p.key}) has no default`);
        if (p.key && html.index && !new RegExp(`getParameter\\(\\s*['"]${p.key}['"]`).test(html.index) && !usesParams) warn(`parameter "${p.key}" is declared but index.html never reads it`);
      });
    }
    if (spec.sandbox !== undefined) {
      if (typeof spec.sandbox !== 'object' || spec.sandbox === null || Array.isArray(spec.sandbox)) err('zest.json: sandbox must be an object of booleans');
      else {
        for (const k of Object.keys(spec.sandbox)) if (!SANDBOX_KEYS.includes(k)) warn(`zest.json: sandbox.${k} is not a known flag (${SANDBOX_KEYS.join(', ')})`);
        if (spec.sandbox.allowTopNavigation) warn('sandbox.allowTopNavigation lets the content navigate the Canvas page; remove it unless there is a reason');
        if (spec.sandbox.allowModals) note('sandbox.allowModals does not make alert()/confirm() work inside Canvas');
        if (spec.sandbox.allowScripts === false || spec.sandbox.allowScripts === undefined) warn('sandbox.allowScripts is not true; the bridge will not run');
      }
    }
    if (spec.tags !== undefined && !Array.isArray(spec.tags)) err('zest.json: tags must be an array of strings');
    if (spec.allowedDomains !== undefined && !Array.isArray(spec.allowedDomains)) err('zest.json: allowedDomains must be an array of hostnames');
    if (!spec.name) warn('zest.json: name is missing; the upload form title will be used');
  }

  // Bridge include and Canvas rules
  const bridgeRe = /<script[^>]+src=["']([^"']*zest-bridge\.js)["']/i;
  for (const [name, text] of Object.entries(html)) {
    if (!text) continue;
    const m = text.match(bridgeRe);
    if (!m) { if (name === 'index' && (usesGrading || usesState || /\bZest\./.test(text))) err(`${name}.html uses Zest.* but does not include the bridge script`); continue; }
    if (m[1] !== config.bridgeUrl) {
      if (/^https?:\/\//.test(m[1])) warn(`${name}.html loads the bridge from ${m[1]}; use "${config.bridgeUrl}" so the package works on any Zest server`);
      else if (m[1] !== '/public/zest-bridge.js') warn(`${name}.html loads the bridge from ${m[1]}; zest.config.json says ${config.bridgeUrl}`);
    }
    const code = stripComments(text);
    for (const fn of ['alert', 'confirm', 'prompt']) {
      const re = new RegExp(`(^|[^\\w.])${fn}\\s*\\(`, 'g');
      const n = (code.match(re) || []).length;
      if (n) warn(`${name}.html calls ${fn}() ${n} time(s); Canvas blocks it inside the iframe. Use an in-page message or the two-click pattern.`);
    }
    if (/\bZest\./.test(text) && !/Zest\.onReady\s*\(/.test(text)) warn(`${name}.html uses Zest.* without Zest.onReady(); the context, config and submission are not available before it fires`);
    if (/Zest\.submit(?:Score|Work)\s*\([\s\S]{0,400}?\bsubmission\s*:/.test(text)) warn(`${name}.html passes "submission" to Zest.submitScore/submitWork; the bridge forwards only artifacts and comment, so the data never reaches the server (use artifacts)`);
    const external = [...text.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)["']/gi)].map(x => x[1]).filter(u => !u.includes('zest-bridge.js'));
    if (external.length) note(`${name}.html references external URLs: ${[...new Set(external.map(u => new URL(u).host))].join(', ')} (allowed by default; a server with a domain allowlist must include them)`);
  }
  if (usesGrading && !has('review.html') && !(spec && spec.reviewFile)) warn('graded content has no review.html; SpeedGrader will show index.html instead of the student\'s work');
  if (usesState && !/Zest\.onSyncStatus\s*\(/.test(html.index)) note('state is saved but no sync indicator (Zest.onSyncStatus) is shown');

  note(`grading: ${(spec && spec.grading) || (usesGrading ? 'inferred from code' : 'none')}; state persistence: ${usesState ? 'yes' : 'no'}; files: ${files.length}; size: ${(total / 1024).toFixed(0)} KB`);
  return { errors, warnings, notes, files, spec };
}

// --- minimal zip writer (deflate) ---------------------------------------
const CRC_TABLE = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function dosTime(d) { return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff; }
function dosDate(d) { return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff; }

function writeZip(files, dir, outFile) {
  const parts = [], central = [];
  let offset = 0;
  const now = new Date();
  for (const f of files) {
    const name = Buffer.from(f.rel, 'utf8');
    const data = fs.readFileSync(f.abs);
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime(now), 10); local.writeUInt16LE(dosDate(now), 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    parts.push(local, name, body);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(dosTime(now), 12); cd.writeUInt16LE(dosDate(now), 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32); cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38); cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += local.length + name.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6); end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.concat([...parts, cdBuf, end]));
  return fs.statSync(outFile).size;
}

// --- cli -------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const targets = args.filter(a => !a.startsWith('--'));
  const config = loadConfig();
  const json = flags.has('--json');
  let dirs = targets.map(t => path.resolve(t));
  if (flags.has('--all') || dirs.length === 0) {
    const base = path.join(ROOT, config.contentDir);
    if (fs.existsSync(base)) dirs = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(base, d.name));
    if (dirs.length === 0) { console.error(`usage: zest-build.js <content-dir> [--check] [--json]\n(no directories found under ${config.contentDir}/)`); process.exit(2); }
  }
  let failed = false;
  const results = [];
  for (const dir of dirs) {
    const name = path.basename(dir);
    const r = validate(dir, config);
    let out = null;
    if (r.errors.length === 0 && !flags.has('--check')) {
      out = path.join(ROOT, config.outDir, `${name}.zest`);
      r.size = writeZip(r.files, dir, out);
    }
    if (r.errors.length) failed = true;
    results.push({ name, dir, out, ...r, files: r.files.map(f => f.rel) });
    if (!json) {
      console.log(`\n${name}  (${path.relative(process.cwd(), dir) || '.'})`);
      for (const m of r.errors) console.log(`  ERROR    ${m}`);
      for (const m of r.warnings) console.log(`  warning  ${m}`);
      for (const m of r.notes) console.log(`  note     ${m}`);
      if (out) console.log(`  packaged ${path.relative(process.cwd(), out)} (${(r.size / 1024).toFixed(0)} KB, ${r.files.length} files)`);
      else if (r.errors.length) console.log('  FAIL: fix the errors above and run again');
      else console.log('  PASS');
    }
  }
  if (json) console.log(JSON.stringify(results, null, 2));
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main();
module.exports = { validate, writeZip, loadConfig };
