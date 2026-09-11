# Auto-Graded Quiz Pattern Reference

Based on `grade-test/index.html` — a multiple-choice quiz with auto-scoring.

## Structure Overview

- 3 radio-button questions
- Auto-scoring against an answer key
- `submitScore()` sends grade to Canvas gradebook immediately
- State persistence: saves selected answers + submitted status
- Sync indicator, restored banner, reset button

## Key Patterns

### Answer Key + Scoring

```javascript
var answers = { q1: 'b', q2: 'b', q3: 'c' };
var submitted = false;

// Grade each question
var score = 0;
var total = 3;
var studentAnswers = {};
for (var i = 1; i <= total; i++) {
  var selected = document.querySelector('input[name="q' + i + '"]:checked');
  var answer = selected ? selected.value : null;
  studentAnswers['q' + i] = {
    selected: answer,
    correct: answers['q' + i],
    isCorrect: answer === answers['q' + i]
  };
  if (answer === answers['q' + i]) score++;
}
var pct = Math.round((score / total) * 100);
```

### Submit Score

```javascript
submitted = true;
submitBtn.disabled = true;
submitBtn.textContent = 'Submitting...';

Zest.saveState(gatherState());

Zest.submitScore(pct, {
  maxScore: 100,
  artifacts: {
    answers: studentAnswers,
    score: score,
    total: total,
    percentage: pct,
    completedAt: new Date().toISOString()
  },
  comment: 'Scored ' + score + '/' + total + ' (' + pct + '%)'
}).then(function(result) {
  if (result.success) {
    submitBtn.textContent = 'Already Submitted';
  } else {
    submitted = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Retry Submit';
    Zest.saveState(gatherState());
  }
}).catch(function(err) {
  submitted = false;
  submitBtn.disabled = false;
  submitBtn.textContent = 'Retry Submit';
  Zest.saveState(gatherState());
});
```

### State Persistence for Quiz

```javascript
function gatherState() {
  var state = { answers: {} };
  for (var i = 1; i <= 3; i++) {
    var selected = document.querySelector('input[name="q' + i + '"]:checked');
    state.answers['q' + i] = selected ? selected.value : null;
  }
  state.submitted = submitted;
  return state;
}

function restoreState(state) {
  if (!state || !state.answers) return false;
  var restored = false;
  for (var i = 1; i <= 3; i++) {
    var val = state.answers['q' + i];
    if (val) {
      var radio = document.querySelector('input[name="q' + i + '"][value="' + val + '"]');
      if (radio) { radio.checked = true; restored = true; }
    }
  }
  if (state.submitted) {
    submitted = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Already Submitted';
    // Recalculate and show score
    var score = 0;
    for (var j = 1; j <= 3; j++) {
      if (state.answers['q' + j] === answers['q' + j]) score++;
    }
    var pct = Math.round((score / 3) * 100);
    resultEl.className = 'result success';
    resultEl.innerHTML = '<strong>Previously submitted:</strong> ' + pct + '% (' + score + '/3)';
    resultEl.style.display = 'block';
  }
  return restored;
}
```

### Auto-Save on Radio Change

```javascript
var radios = document.querySelectorAll('input[type="radio"]');
for (var r = 0; r < radios.length; r++) {
  radios[r].addEventListener('change', function() {
    Zest.saveState(gatherState());
  });
}
```

## Question HTML Pattern

```html
<div class="question">
  <p>1. What does LTI stand for?</p>
  <label><input type="radio" name="q1" value="a"> Learning Tools Integration</label>
  <label><input type="radio" name="q1" value="b"> Learning Tools Interoperability</label>
  <label><input type="radio" name="q1" value="c"> Linked Teaching Interface</label>
</div>
```

## Question CSS Pattern

```css
.question {
  margin-bottom: 16px;
  padding: 16px;
  background: #f0f7fb;
  border-radius: 8px;
  border-left: 3px solid #0770A2;
}
.question p { font-weight: 600; margin-bottom: 8px; }
.question label {
  display: block;
  padding: 6px 12px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s;
}
.question label:hover { background: #e0f0fa; }
```

## Result Display Pattern

```css
.result { margin-top: 16px; padding: 16px; border-radius: 8px; font-size: 14px; display: none; }
.result.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.result.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
```

## Key Design Notes

- **Blue accent** (`#0770A2`) for auto-graded content
- Submit button disabled until LTI context loads
- On failed submit: re-enable button with "Retry Submit" text, un-set `submitted` flag
- Save state includes `submitted` boolean so restoring a completed quiz shows the result without re-submitting
- `setHeight()` called for page-embed auto-resize (no effect on assignment tools)
