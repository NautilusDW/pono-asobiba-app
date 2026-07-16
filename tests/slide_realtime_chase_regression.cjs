#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "slide/index.html"), "utf8");

assert.match(html,
  /function calculateStageTimeBudgetSeconds\(level\)[\s\S]*?shuffleMoves[\s\S]*?pickup[\s\S]*?magicCross/,
  "each limit is derived from board complexity and its special rule");
assert.match(html, /const STAGE_TIME_BUDGETS = LEVELS\.map\(calculateStageTimeBudgetSeconds\)/,
  "all eight stages receive a derived time budget");
assert.match(html, /30\s*\+\s*level\.shuffleMoves\s*\*\s*8/,
  "the guaranteed reverse-shuffle move count is the main time input");
assert.match(html, /Math\.min\(1\.75,\s*1\s*\+\s*retryCount\s*\*\s*0\.25\)/,
  "retries receive a bounded child-friendly time allowance");
assert.match(html, /stageClock\.unlimited = stageRetryCount > 0/,
  "after the first timeout, the same-board retry removes the hard deadline");
assert.match(html, /if \(!stageClock\.unlimited && stageClock\.elapsedMs >= stageClock\.budgetMs/,
  "the slower retry keeps realtime movement without another timeout loop");

assert.match(html, /id="hud-time"[^>]*>あと/,
  "the real limit is visible instead of surprising the child");
assert.match(html, /function updateStageClock\(now\)/,
  "the rAF game loop owns one accumulated active-time clock");
assert.match(html,
  /function loop\(ts\)[\s\S]*?updateAnim\(ts\);[\s\S]*?updateJourney\(ts\);[\s\S]*?updateStageClock\(ts\);/,
  "an accepted final slide and its clear state are processed before timeout");
const suspensionFunction = html.match(
  /function isStageClockEnvironmentSuspended\(now\) \{[\s\S]*?\n\}/
);
assert.ok(suspensionFunction, "the clock has an explicit suspension contract");
for (const signal of ["_slideTutActive", "document.hidden", "slideWindowFocused",
  "pono-dropdown.show", "pono-confirm-overlay.show", "journeyHudMessageHideAt"]) {
  assert.ok(suspensionFunction[0].includes(signal), `${signal} suspends active time`);
}
assert.match(html, /window\.innerHeight\s*>=\s*window\.innerWidth/,
  "portrait guidance also suspends time");
assert.match(html,
  /id="journey-hud-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
  "board-safe HUD guidance keeps an equivalent polite live announcement");
assert.match(html,
  /function showJourneyToast\(message, discovery, retry\)[\s\S]*?hudStatus\.textContent = String\(message\)/,
  "each visual HUD guide is mirrored to the live status region");

assert.match(html,
  /function getMotherStageStartProgress\(index\)[\s\S]*?function getMotherStageEndProgress\(index\)/,
  "the mother has continuous per-stage bounds rather than checkpoint jumps");
assert.match(html,
  /function updateStageClock\(now\)[\s\S]*?syncJourneyProgress\(ponoProgress, motherProgress/,
  "both faces advance continuously during active play");
assert.match(html,
  /function onStageClear\(\)[\s\S]*?stageClock\.exitPonoStart[\s\S]*?stageClock\.exitMotherStart/,
  "clear captures both live positions for a non-reversing route exit");
assert.match(html,
  /function updateJourneyPosition\(now\)[\s\S]*?stageClock\.exitPonoStart[\s\S]*?stageClock\.exitMotherStart/,
  "the real walking animation continues from those live positions");

assert.match(html,
  /function captureStageAttemptSnapshot\(\)[\s\S]*?grid:\s*grid\.slice\(\)[\s\S]*?pickupTileIdx[\s\S]*?suggestedMoveIdx/,
  "the first solvable arrangement and its tracked mechanics are saved");
assert.match(html,
  /function restartTimedOutStage\(now\)[\s\S]*?stageIdx\s*=\s*stageAttemptSnapshot\.stageIdx[\s\S]*?moveCount\s*=\s*0/,
  "timeout restores the same stage instead of returning to stage one");
assert.match(html, /const RETRY_MESSAGE_TEXT = `この みちを もういちど！\nこんどは ゆっくり つなごう`/,
  "timeout language is short, gentle, explanatory, and kana-only");
assert.doesNotMatch(html, /じかんぎれ|ゲームオーバー|しっぱい/,
  "the child-facing timeout does not use failure language");

assert.match(html,
  /function updateHUD\(options\)[\s\S]*?if \(options && options\.resetProgress\)[\s\S]*?syncJourneyProgress/,
  "ordinary move-count refreshes cannot rewind the live journey bar");
assert.match(html,
  /function showTutorial\(\)[\s\S]*?stopStageClock\(performance\.now\(\)\)/,
  "practice explicitly owns no time limit");
assert.match(html,
  /function showTutorial\(\)[\s\S]*?stageClock\.timeoutPending = false;[\s\S]*?stageClock\.restartAt = 0;/,
  "practice cancels a pending same-stage retry before replacing the board");
assert.match(html,
  /if \(stageClock\.timeoutPending\)[\s\S]*?isStageClockEnvironmentSuspended\(now\)[\s\S]*?resetStageClockTick\(now\)/,
  "a pending retry also waits behind menus, app background, and portrait guidance");
assert.match(html,
  /function resetStageClockTick\(now\)[\s\S]*?if \(stageClock\.timeoutPending\) renewPendingRetryBeat\(stageClock\.lastTick\)/,
  "visibility and focus recovery restart both the retry explanation and its message after rAF suspension");
assert.match(html,
  /function renewPendingRetryBeat\(now\)[\s\S]*?stageClock\.restartAt = beatNow \+ RETRY_MESSAGE_MS;[\s\S]*?toast\.classList\.add\('show', 'retry'\);[\s\S]*?journeyToastHideAt = stageClock\.restartAt \+ 400/,
  "pending menus and app recovery keep the retry message visible for the whole renewed beat");

console.log("slide realtime chase regression: ok");
