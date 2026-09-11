---
name: security-review
description: Review Zest interactive content for security vulnerabilities and data exfiltration risks. Use when an IT admin asks to review, audit, or check the security of uploaded Zest content, HTML embeds, or interactive activities. Checks for external network calls, PII exposure, unauthorized postMessage usage, and tracking pixels.
---

# Zest Security Review

## Purpose

IT admins use this skill to review interactive content created by teachers before deployment. Content runs inside Canvas iframes with `allow-scripts allow-same-origin` sandbox, so it has significant capabilities. This review checks for data exfiltration, unauthorized network access, and browser API abuse.

## Context

Zest content runs inside a sandboxed iframe embedded in Canvas. The content can:
- Execute JavaScript
- Access `localStorage` and `sessionStorage`
- Send `postMessage` to the parent window (the Zest embed wrapper)
- Make network requests via `fetch`, `XMLHttpRequest`, etc.
- Access some browser APIs (geolocation, camera, etc. if permissions are granted)

The **only legitimate external communication** is:
- Loading the bridge script from the Zest server's `/public/zest-bridge.js` path
- Sending `postMessage` messages to the Zest wrapper (same origin as the Zest server)
- CDN resources for libraries (e.g., fonts, CSS frameworks) — allowed but should be noted

## Security Checklist

### 1. External Network Calls (Critical)

Scan for any code that makes requests to external servers:

**Patterns to search for:**
- `fetch(` — check URL argument for external domains
- `XMLHttpRequest` / `new XMLHttpRequest()` — check `.open()` URL
- `navigator.sendBeacon(` — check URL argument
- `new WebSocket(` — any WebSocket connection
- `new EventSource(` — Server-Sent Events
- `<img src="` / `new Image()` — tracking pixels (especially 1x1 images)
- `<script src="` — external scripts beyond the bridge
- `<link href="` — external stylesheets
- `<iframe src="` — nested iframes to external sites
- `<object>`, `<embed>` — plugin embeds

**Legitimate exceptions:**
- The Zest server's `/public/zest-bridge.js` path (required)
- CDN libraries (Google Fonts, cdnjs, unpkg) — note but don't flag as critical
- `data:` URLs — safe, no network call

### 2. Data Exposure (High)

Scan for code that could leak student PII:

**Patterns to search for:**
- `localStorage.setItem` / `sessionStorage.setItem` — check if storing user names, emails, IDs
- `document.cookie` — any cookie access
- `postMessage(` — check target origin; should only send to `*` or the Zest server domain
- URL construction with user data (e.g., `'?user=' + userId`)
- `encodeURIComponent` with user fields in URL context

**What to check in postMessage:**
- Message type should match Zest protocol: `zest-submit`, `zest-resize`, `zest-state-save`, etc.
- Target origin should be `'*'` (the bridge uses `*` because the wrapper origin varies)
- Non-Zest postMessage calls are suspicious

### 5. Answer Key Exposure (Critical)

If the content includes an answer key, verify it is NOT accessible to students:

- Answer keys should be declared in `zest.json` via `"answerKey"` field — NOT hardcoded in `index.html`
- The server extracts answer keys to a `.secure/` directory that returns 403 for all requests
- `Zest.getAnswerKey()` only works in review mode (SpeedGrader) — never in student mode
- Check that `index.html` does not contain hardcoded answer values or load answer key files directly
- Search for patterns like `answers = {`, `correctAnswers`, `answerKey` in student-facing code

### 6. Sandbox Configuration (Medium)

If `zest.json` declares a `sandbox` section, verify the permissions are appropriate:

- `allowModals: true` is unusual — content should use two-click patterns instead of `alert()`/`confirm()`
- `allowTopNavigation: true` is dangerous — allows content to navigate the parent Canvas page
- `allowPopups: true` is acceptable for content that opens external resources
- Default sandbox is `allow-scripts allow-same-origin allow-popups allow-forms` — relaxing beyond this needs justification

### 3. Code Execution (Medium)

Scan for dynamic code execution that could hide malicious behavior:

**Patterns to search for:**
- `eval(` — arbitrary code execution
- `new Function(` — dynamic function creation
- `setTimeout(` / `setInterval(` with string argument (acts like eval)
- `document.write(` — can rewrite the page
- `innerHTML` with unsanitized user input (XSS risk)
- `document.createElement('script')` — dynamic script injection
- `import(` — dynamic module loading

### 4. Browser API Abuse (Low)

Scan for browser APIs that may not match the content's educational purpose:

**Patterns to search for:**
- `navigator.geolocation` — location tracking
- `navigator.mediaDevices` — camera/microphone access
- `navigator.userAgent` — browser fingerprinting
- `canvas.toDataURL()` / `canvas.getImageData()` — canvas fingerprinting
- `navigator.connection` — network information
- `navigator.getBattery()` — battery status (fingerprinting)
- `window.screen` properties — screen fingerprinting
- `AudioContext` / `OfflineAudioContext` — audio fingerprinting
- `WebGL` getParameter calls — GPU fingerprinting
- `Notification.requestPermission` — push notification request
- `navigator.clipboard` — clipboard access

## Report Format

Present findings organized by severity:

```
## Security Review: [Content Name]

### Critical Issues
- [File:line] Description of issue and why it's dangerous

### High Issues
- [File:line] Description of issue

### Medium Issues
- [File:line] Description of issue

### Low Issues / Notes
- [File:line] Description of observation

### Summary
- Total files scanned: N
- Critical: N | High: N | Medium: N | Low: N
- Recommendation: SAFE / REVIEW NEEDED / BLOCK
```

**Recommendation levels:**
- **SAFE**: No critical or high issues. Content is safe for deployment.
- **REVIEW NEEDED**: Has high or medium issues that may be legitimate but need human verification.
- **BLOCK**: Has critical issues (data exfiltration, unauthorized network calls). Do not deploy.

## How to Run

When an IT admin asks to review content, scan all HTML/JS/CSS files in the content directory using the patterns above. Report findings with specific file paths, line numbers, and the actual code that triggered the finding.

For thorough automated scanning, use the `zest:security-reviewer` agent which systematically searches for all patterns using Grep.
