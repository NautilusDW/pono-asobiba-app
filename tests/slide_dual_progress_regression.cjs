#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "slide/index.html"), "utf8");

assert.match(html, /id="stage-num"[^>]*class="journey-progress"[^>]*role="group"/,
  "the old stage dots become one grouped journey bar");
assert.match(html, /class="journey-progress-track"/,
  "the two travellers share one visual track");
assert.equal((html.match(/class="journey-progress-track"/g) || []).length, 1,
  "the HUD must contain exactly one visual journey track");
assert.match(html, /journey-progress-fill--mother/,
  "the mother has the wide red progress layer");
assert.match(html, /journey-progress-fill--pono/,
  "Pono has the narrower green progress layer above it");
assert.match(html, /mom_face_circle\.png/,
  "the mother marker uses the existing recognisable face");
assert.match(html, /pono_face_circle\.png/,
  "the Pono marker uses the existing recognisable face");
assert.equal((html.match(/journey-progress-checkpoint/g) || []).length, 5,
  "four story checkpoint notches are present (one class rule plus four nodes)");
assert.doesNotMatch(html, /index === stageIdx \? '●' : '•'/,
  "the ambiguous row of stage dots must not return");

assert.match(html,
  /function getMotherJourneyProgress\(index\)[\s\S]*?Math\.floor\(index \/ 2\)[\s\S]*?0\.25/,
  "the mother waits at the stage 2, 4, 6, and 8 story checkpoints");
assert.match(html,
  /function getPonoStageStartProgress\(index\)[\s\S]*?index \/ LEVELS\.length/,
  "Pono begins each stage at the place reached by the previous stage");
assert.match(html,
  /function updateJourneyPosition\(now\)[\s\S]*?JOURNEY_PHASE\.EXIT[\s\S]*?syncJourneyProgress/,
  "Pono's green layer follows the real route-exit animation");
assert.match(html,
  /function finishExitWithDiscovery\(now\)[\s\S]*?if \(!journeyActor\.tutorial\)[\s\S]*?syncJourneyProgress[\s\S]*?JOURNEY_PHASE\.DISCOVERY/,
  "reduced motion and normal motion both snap Pono to the reached checkpoint");
assert.match(html,
  /function showCutscene\(\)[\s\S]*?syncJourneyProgress/,
  "the paper-story scene explicitly shows both travellers at its checkpoint");
assert.match(html,
  /body\.slide-cutscene-open \.game-rail[\s\S]*?z-index:\s*2[12]/,
  "the checkpoint bar remains readable above the paper-story scene");
assert.match(html, /role="progressbar"[^>]*aria-label="ポノ"/,
  "Pono's position is exposed without relying on colour");
assert.match(html, /role="progressbar"[^>]*aria-label="おかあさん"/,
  "the mother's position is exposed without relying on colour");
assert.match(html, /prefers-reduced-motion:[\s\S]*?journey-progress-fill--mother/,
  "journey-bar motion has a reduced-motion fallback");

console.log("slide dual progress regression: ok");
