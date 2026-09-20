---
name: review-viewer
description: How to build review.html for Zest SpeedGrader integration. Use when creating the teacher review view that displays student-submitted artifacts, scores, and work in Canvas SpeedGrader.
user-invocable: false
---

# Review Viewer Pattern (review.html)

## Purpose

When a teacher opens SpeedGrader to grade a student's submission, Canvas loads `review.html` from the content zip. This file displays the student's submitted data (artifacts) in a read-only, teacher-friendly format.

## File Convention

If the zip contains `review.html` at the same directory level as `index.html`, SpeedGrader automatically loads it instead of `index.html`.

```
my-content/
  index.html       # Student view
  review.html      # Teacher SpeedGrader view (this file)
```

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review — Activity Title</title>
  <script src="/public/zest-bridge.js"></script>
  <style>
    /* Same base styles as index.html */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      background: #f8f9fa;
      color: #2d3b45;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    h1 { font-size: 20px; color: #0770A2; margin-bottom: 16px; }
    h2 { font-size: 16px; margin-bottom: 12px; color: #394B58; }
    /* Additional review-specific styles */
  </style>
</head>
<body>
  <div class="card">
    <h1>Activity Title — Teacher Review</h1>
    <div id="student-info"></div>
  </div>
  <div id="review-content">
    <p>Loading submission...</p>
  </div>

  <script>
    (function() {
      'use strict';

      Zest.onReady(function(ctx) {
        if (!Zest.isReviewMode()) {
          document.getElementById('review-content').innerHTML =
            '<p>This page is only available in SpeedGrader review mode.</p>';
          return;
        }

        var sub = Zest.getSubmission();
        if (!sub) {
          document.getElementById('review-content').innerHTML =
            '<p>No submission data found.</p>';
          return;
        }

        // Display student info
        document.getElementById('student-info').innerHTML =
          '<strong>' + (sub.userName || 'Student') + '</strong>' +
          ' &mdash; Submitted ' + new Date(sub.submittedAt).toLocaleString();

        // Render the artifacts
        renderReview(sub);
      });

      function renderReview(sub) {
        // Build your review display here using sub.artifacts
        // sub = { score, maxScore, artifacts, comment, submittedAt, userId, userName }
      }
    })();
  </script>
</body>
</html>
```
The bridge URL comes from `zest.config.json` (`bridgeUrl`, default `/public/zest-bridge.js`). A root-relative URL works on every Zest server because the server serves the bridge next to the content; only change it if your institution hosts content on a different origin from the bridge.

## Submission Object

```javascript
var sub = Zest.getSubmission();
// {
//   score: 85,              // Number (auto-graded) or null (teacher-graded)
//   maxScore: 100,          // Number or null
//   artifacts: { ... },     // Whatever JSON the student submitted
//   comment: 'Scored 85%',  // Optional comment string
//   submittedAt: '2024-01-15T10:30:00.000Z',
//   userId: 'user-123',
//   userName: 'Jane Student'
// }
```

- `score` and `maxScore` are `null` for teacher-graded submissions (`submitWork`)
- `artifacts` contains whatever JSON was passed in the `artifacts` option of `submitScore()` or `submitWork()`

## Auto-Graded Review Pattern

For quizzes/auto-scored content, show the score and per-question breakdown:

```javascript
function renderReview(sub) {
  var a = sub.artifacts;
  var html = '<div class="card">';
  html += '<h2>Score: ' + sub.score + '/' + sub.maxScore + '</h2>';

  // Show each question's answer
  if (a.answers) {
    html += '<table class="review-table">';
    html += '<tr><th>Question</th><th>Selected</th><th>Correct</th><th>Result</th></tr>';
    for (var key in a.answers) {
      var q = a.answers[key];
      html += '<tr>';
      html += '<td>' + key + '</td>';
      html += '<td>' + (q.selected || 'No answer') + '</td>';
      html += '<td>' + q.correct + '</td>';
      html += '<td>' + (q.isCorrect ? '&#10003;' : '&#10007;') + '</td>';
      html += '</tr>';
    }
    html += '</table>';
  }

  html += '</div>';
  document.getElementById('review-content').innerHTML = html;
}
```

## Teacher-Graded Review Pattern

For labs/essays, display the student's work for teacher evaluation:

```javascript
function renderReview(sub) {
  var a = sub.artifacts;
  var html = '';

  // Show hypothesis
  if (a.hypothesis) {
    html += '<div class="card">';
    html += '<h2>Hypothesis</h2>';
    html += '<p>' + escapeHtml(a.hypothesis) + '</p>';
    html += '</div>';
  }

  // Show experiment data
  if (a.trialA && a.trialB) {
    html += '<div class="card">';
    html += '<h2>Experiment Results</h2>';
    html += '<table class="review-table">';
    html += '<tr><th>Metric</th><th>Trial A</th><th>Trial B</th></tr>';
    html += '<tr><td>Final Height</td><td>' + a.trialA.finalHeight + ' cm</td><td>' + a.trialB.finalHeight + ' cm</td></tr>';
    html += '<tr><td>Leaves</td><td>' + a.trialA.finalLeaves + '</td><td>' + a.trialB.finalLeaves + '</td></tr>';
    html += '</table>';
    html += '</div>';
  }

  // Show analysis responses
  if (a.analysis) {
    html += '<div class="card">';
    html += '<h2>Student Analysis</h2>';
    for (var key in a.analysis) {
      html += '<h3>' + formatLabel(key) + '</h3>';
      html += '<p>' + escapeHtml(a.analysis[key]) + '</p>';
    }
    html += '</div>';
  }

  document.getElementById('review-content').innerHTML = html;
}
```

## CSS for Review Tables

```css
.review-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 8px;
}
.review-table th {
  background: #f0f7fb;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #d6eaf4;
}
.review-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}
```

## Answer Key in Review Mode

If the content declared an `answerKey` in `zest.json`, the answer key is available in review mode via `Zest.getAnswerKey()`. This lets review.html highlight correct/incorrect answers without hardcoding the key in client-side code.

```javascript
Zest.onReady(function(ctx) {
  if (!Zest.isReviewMode()) return;

  var sub = Zest.getSubmission();
  var key = Zest.getAnswerKey();  // null if no answer key declared

  if (sub && key) {
    // Compare student answers against the key
    for (var q in sub.artifacts.answers) {
      var studentAnswer = sub.artifacts.answers[q].selected;
      var correct = key[q];
      // Render with checkmark/cross based on comparison
    }
  }
});
```

The answer key is **never sent to students** — it is only available in review mode (SpeedGrader). The file is stored in a `.secure/` directory on the server that returns 403 for all requests.

## Important Notes

1. **Read-only**: review.html should never have interactive inputs. It is a display-only view.
2. **Always check `isReviewMode()`**: Gate the entire review rendering behind this check. The file could theoretically be loaded outside SpeedGrader.
3. **Handle missing data**: Artifacts may have unexpected shapes if the student submitted from an older version of the content.
4. **Escape HTML**: Always escape user-generated text (hypothesis, analysis) to prevent XSS:
   ```javascript
   function escapeHtml(str) {
     var div = document.createElement('div');
     div.textContent = str;
     return div.innerHTML;
   }
   ```
5. **Same bridge script**: Include the same `zest-bridge.js` script tag.
6. **No state persistence needed**: review.html doesn't use `saveState`/`loadState` — it reads from the submission object.
7. **Data visualization**: If the student's artifacts include numerical data (growth data, timing, etc.), consider rendering SVG charts in the review view to help the teacher evaluate at a glance.
8. **Answer key**: Use `Zest.getAnswerKey()` instead of hardcoding answers — keeps the key secure and allows the same review.html to work with different answer key files.


## Record what the reviewer will need

A teacher can change the assessment config after students have submitted, and a
review page cannot know what a student saw unless the submission says so. Put
the values that shaped the attempt (the passage or question set, the settings,
the student's raw answers or typed text) into the `artifacts` of
`Zest.submitScore()` / `Zest.submitWork()`, and have `review.html` read them
from `Zest.getSubmission().artifacts` first, falling back to
`Zest.getAssessmentConfig()` (the item's current settings, available in review
mode from server 1.2.1) and only then to the package's defaults, saying which
one it is showing. Escape anything a student typed before putting it in HTML.
