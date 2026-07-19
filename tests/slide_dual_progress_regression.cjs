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
  "the paper-story checkpoints remain stage 2, 4, 6, and 8");
assert.match(html,
  /function getMotherStageStartProgress\(index\)[\s\S]*?MOTHER_CHAPTER_LEAD[\s\S]*?0\.25 \* 0\.65/,
  "the mother starts each new story chapter with a visible lead");
assert.match(html,
  /function getMotherStageEndProgress\(index\)[\s\S]*?chapterStart \+ 0\.25/,
  "the mother reaches each paper-story checkpoint without a stage-start jump");
assert.match(html,
  /const PONO_STORY_GAP = 0\.06;/,
  "intermediate paper stories keep one visible gap between Pono and mother");
assert.match(html,
  /function getPonoChapterWaypoint\(chapter\)[\s\S]*?chapter \* 0\.25 - PONO_STORY_GAP/,
  "Pono's chapter checkpoints stay behind the mother's story checkpoints");
assert.match(html,
  /function getPonoStageStartProgress\(index\)[\s\S]*?chapterStart[\s\S]*?chapterEnd/,
  "Pono begins each stage exactly where the previous stage ended");
assert.match(html,
  /function getPonoStagePlayEndProgress\(index\)[\s\S]*?1 - PONO_STORY_GAP/,
  "the final live timer cannot visually catch mother before the solved-route walk");
assert.match(html,
  /function getMotherIntroStartProgress\(index\)[\s\S]*?index === 0[\s\S]*?getMotherStageStartProgress\(index\)/,
  "the missing mother is already visibly ahead on the opening screen");
assert.match(html,
  /function resetStageClock\(index, preservedProgress\)[\s\S]*?getActivePonoPlayTarget\(index\)/,
  "a retry also clamps Pono to the safe live-play endpoint");
assert.match(html,
  /function updateStageClock\(now\)[\s\S]*?getActivePonoPlayTarget\(stageIdx\)/,
  "live progress uses the safe endpoint on every stage");
assert.match(html,
  /function getActivePonoPlayTarget\(index\)[\s\S]*?level\.checkpoint && !stageCheckpointReached[\s\S]*?getPonoCheckpointProgress/,
  "a two-part stage reserves the second half of Pono's bar for the second route leg");
assert.match(html,
  /const isTogether = gapSize === 0;[\s\S]*?classList\.toggle\('is-together', isTogether\)/,
  "only an exact shared endpoint announces the reunion");
assert.match(html,
  /function updateStageClock\(now\)[\s\S]*?ponoProgress[\s\S]*?motherProgress[\s\S]*?syncJourneyProgress/,
  "both travellers move during active puzzle time");
assert.match(html,
  /function updateJourneyPosition\(now\)[\s\S]*?JOURNEY_PHASE\.INTRO[\s\S]*?introMotherStart[\s\S]*?attemptMotherStart/,
  "the mother's new lead is visibly walked during the stage intro instead of jumping");
assert.match(html, /class="journey-progress-gap"[^>]*aria-hidden="true"/,
  "the exact distance between both faces has a non-semantic moving bridge");
assert.match(html, /\.journey-progress\.is-moving \.journey-progress-gap[\s\S]*?journeyGapFlow/,
  "the distance bridge visibly flows during the live chase");
assert.match(html,
  /\.game-rail \{[\s\S]*?position:\s*fixed;[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;/,
  "the journey rail spans the viewport rather than the narrower 16:9 canvas on wide phones");
assert.match(html,
  /function updateJourneyPosition\(now\)[\s\S]*?stageClock\.exitPonoStart[\s\S]*?stageClock\.exitMotherStart/,
  "the route-exit animation continues from both live positions without rewinding");
assert.match(html,
  /function finishExitWithDiscovery\(now\)[\s\S]*?if \(!journeyActor\.tutorial\)[\s\S]*?syncJourneyProgress[\s\S]*?JOURNEY_PHASE\.DISCOVERY/,
  "reduced motion and normal motion both snap Pono to the reached checkpoint");
const showCutsceneFunction = html.match(
  /function showCutscene\(\) \{[\s\S]*?\n\}/
);
assert.ok(showCutsceneFunction, "the paper-story function is present");
assert.match(showCutsceneFunction[0],
  /syncJourneyProgress\([\s\S]*?getPonoStageEndProgress\(stageIdx\)[\s\S]*?getMotherJourneyProgress\(stageIdx\)/,
  "the paper story keeps Pono behind the mother's checkpoint");
assert.match(showCutsceneFunction[0], /おかあさんは ポノより すこし さきに います/,
  "the intermediate story describes the continuing chase");
assert.doesNotMatch(showCutsceneFunction[0], /おいつきました/,
  "an intermediate story never announces a reunion");
assert.match(html,
  /type === 'gameclear'[\s\S]*?ポノが おかあさんに おいつきました/,
  "only the final reunion keeps the caught-up announcement");
assert.match(html,
  /body\.slide-cutscene-open \.game-rail[\s\S]*?z-index:\s*2[12]/,
  "the checkpoint bar remains readable above the paper-story scene");
assert.match(html, /role="progressbar"[^>]*aria-label="ポノ"/,
  "Pono's position is exposed without relying on colour");
assert.match(html, /role="progressbar"[^>]*aria-label="おかあさん"/,
  "the mother's position is exposed without relying on colour");
assert.match(html, /prefers-reduced-motion:[\s\S]*?journey-progress-fill--mother/,
  "journey-bar motion has a reduced-motion fallback");
assert.match(html, /#stage-num[\s\S]*?grid-column:\s*1 \/ -1[\s\S]*?width:\s*100%/,
  "the shared track receives the full second row of the HUD");

console.log("slide dual progress regression: ok");
