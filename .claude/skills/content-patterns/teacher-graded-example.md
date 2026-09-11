# Teacher-Graded Lab Pattern Reference

Based on `plant-growth-lab/index.html` — a 6-phase science experiment with simulation, analysis, and teacher grading.

## Structure Overview

- 6 phases: Hypothesis → Setup → Simulate → Compare → Analyze → Submit
- Step indicator bar showing progress
- Dropdowns for trial configuration, textareas for analysis
- Plant growth simulation with animated CSS
- SVG line chart comparing two trials
- `submitWork()` sends artifacts for teacher grading in SpeedGrader
- Full state persistence across all phases
- Two-click reset pattern (no `confirm()`)

## Multi-Phase Navigation

```javascript
var currentPhase = 1;
var TOTAL_PHASES = 6;

function goPhase(n) {
  for (var i = 1; i <= TOTAL_PHASES; i++) {
    document.getElementById('phase-' + i).classList.toggle('active', i === n);
    var step = document.getElementById('step-' + i);
    step.classList.remove('active', 'done');
    if (i < n) step.classList.add('done');
    else if (i === n) step.classList.add('active');
  }
  currentPhase = n;
  Zest.setHeight(document.body.scrollHeight + 40);
  if (n !== 3) autoSave(); // Don't save during animation
}
```

### Step Indicator HTML

```html
<div class="steps">
  <div class="step active" id="step-1">1. Hypothesis</div>
  <div class="step" id="step-2">2. Setup</div>
  <div class="step" id="step-3">3. Simulate</div>
  <div class="step" id="step-4">4. Compare</div>
  <div class="step" id="step-5">5. Analyze</div>
  <div class="step" id="step-6">6. Submit</div>
</div>
```

### Step Indicator CSS

```css
.steps { display: flex; margin-bottom: 20px; gap: 4px; }
.step {
  flex: 1; text-align: center; padding: 8px 4px;
  font-size: 11px; font-weight: 600; border-radius: 6px;
  background: #e0e0e0; color: #888; transition: all 0.3s;
}
.step.active { background: #2e7d32; color: white; }
.step.done { background: #a5d6a7; color: #1b5e20; }
.phase { display: none; }
.phase.active { display: block; }
```

## State Persistence for Multi-Phase Content

```javascript
function gatherState() {
  return {
    currentPhase: currentPhase,
    hypothesis: document.getElementById('hypothesis').value,
    variableChoice: document.getElementById('variable-choice').value,
    conditionsA: getConditions('a'),
    conditionsB: getConditions('b'),
    trialAData: trialA.data,       // Simulation results (array of day objects)
    trialBData: trialB.data,
    analysisPatterns: document.getElementById('analysis-patterns').value,
    analysisHypothesis: document.getElementById('analysis-hypothesis').value,
    analysisExplanation: document.getElementById('analysis-explanation').value,
    analysisConclusion: document.getElementById('analysis-conclusion').value,
    submitted: labSubmitted,
    startTime: startTime
  };
}

function restoreState(state) {
  if (!state) return false;
  var restored = false;

  // Restore form fields
  if (state.hypothesis) { document.getElementById('hypothesis').value = state.hypothesis; restored = true; }
  if (state.variableChoice) document.getElementById('variable-choice').value = state.variableChoice;
  if (state.conditionsA) setConditions('a', state.conditionsA);
  if (state.conditionsB) setConditions('b', state.conditionsB);

  // Restore simulation data (pre-computed, not re-simulated)
  if (state.trialAData && state.trialAData.length > 0) trialA.data = state.trialAData;
  if (state.trialBData && state.trialBData.length > 0) trialB.data = state.trialBData;

  // Restore analysis text
  if (state.analysisPatterns) document.getElementById('analysis-patterns').value = state.analysisPatterns;
  // ... (all textarea fields)

  if (state.submitted) labSubmitted = true;

  // Navigate to saved phase — with special cases
  if (state.currentPhase >= 4 && trialA.data.length > 0) {
    goPhaseNoSave(state.currentPhase);
    buildComparison();  // Rebuild chart and table from saved data
  } else if (state.currentPhase === 3) {
    // Simulation is ephemeral — go to compare if data exists, else setup
    if (trialA.data.length > 0) { goPhaseNoSave(4); buildComparison(); }
    else goPhaseNoSave(2);
  } else {
    goPhaseNoSave(state.currentPhase);
  }
  return restored;
}
```

### goPhaseNoSave — Used During Restore

```javascript
// Same as goPhase but without triggering autoSave (prevents overwrite during restore)
function goPhaseNoSave(n) {
  for (var i = 1; i <= TOTAL_PHASES; i++) {
    document.getElementById('phase-' + i).classList.toggle('active', i === n);
    var step = document.getElementById('step-' + i);
    step.classList.remove('active', 'done');
    if (i < n) step.classList.add('done');
    else if (i === n) step.classList.add('active');
  }
  currentPhase = n;
}
```

## Debounced Auto-Save for Text Inputs

```javascript
var saveTimeout = null;
function debouncedAutoSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(autoSave, 1000);
}

// Text inputs: debounced (1 second)
['hypothesis', 'analysis-patterns', 'analysis-hypothesis'].forEach(function(id) {
  document.getElementById(id).addEventListener('input', debouncedAutoSave);
});

// Selects: immediate save
['variable-choice', 'a-sunlight', 'a-water'].forEach(function(id) {
  document.getElementById(id).addEventListener('change', autoSave);
});
```

## Submit Work (Teacher-Graded)

```javascript
var artifacts = {
  hypothesis: document.getElementById('hypothesis').value.trim(),
  independentVariable: document.getElementById('variable-choice').value,
  trialA: {
    conditions: trialA.conditions,
    growthData: trialA.data,
    finalHeight: trialA.data[10].height,
    finalLeaves: trialA.data[10].leaves,
    finalHealth: trialA.data[10].health
  },
  trialB: { /* same structure */ },
  analysis: {
    patterns: document.getElementById('analysis-patterns').value.trim(),
    hypothesisResult: document.getElementById('analysis-hypothesis').value.trim(),
    explanation: document.getElementById('analysis-explanation').value.trim(),
    conclusion: document.getElementById('analysis-conclusion').value.trim()
  },
  timeSpentMs: Date.now() - startTime
};

Zest.submitWork({
  artifacts: artifacts,
  comment: 'Plant Growth Lab completed'
}).then(function(result) {
  if (result.success) {
    goPhase(6);  // Show completion screen
  } else {
    labSubmitted = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Retry Submit';
  }
  autoSave();
});
```

## Two-Click Reset (Full Pattern)

```javascript
var resetPending = false;
function doReset() {
  if (!resetPending) {
    resetPending = true;
    var allBtns = document.querySelectorAll('.btn-reset, .btn-reset-all');
    for (var i = 0; i < allBtns.length; i++) {
      allBtns[i].textContent = 'Click again to confirm reset';
      allBtns[i].style.background = '#fdf0ef';
      allBtns[i].style.borderColor = '#c0392b';
      allBtns[i].style.color = '#c0392b';
    }
    setTimeout(function() {
      resetPending = false;
      for (var j = 0; j < allBtns.length; j++) {
        allBtns[j].textContent = 'Start Over';
        allBtns[j].style.background = '';
        allBtns[j].style.borderColor = '';
        allBtns[j].style.color = '';
      }
    }, 4000);
    return;
  }
  resetPending = false;

  // 1. Clear all form fields
  // 2. Reset UI state variables
  // 3. Navigate to phase 1
  goPhaseNoSave(1);

  // 4. Clear saved state
  Zest.clearState();
}
```

## Key Design Notes

- **Green accent** (`#2e7d32`) for teacher-graded content
- Two-column grid layout for side-by-side trial panels (`grid-template-columns: 1fr 1fr`)
- Simulation data is pre-computed then animated — on restore, skip to comparison phase
- `goPhaseNoSave()` avoids triggering auto-save during state restore
- Hint boxes guide students through each phase
- Analysis textareas have placeholder text with specific prompts
- Completion phase shows a centered celebration with emoji and message
- Reset buttons appear on every phase (`.btn-reset-all` class)
- All analysis fields validated before allowing submit
