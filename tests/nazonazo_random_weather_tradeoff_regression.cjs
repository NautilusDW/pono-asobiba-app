"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "nazonazo-tunnel/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "nazonazo-tunnel/styles.css"), "utf8");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");

const start = game.indexOf("/* ================= weather gameplay ================= */");
const end = game.indexOf("/* ================= device & portal ================= */", start);
assert.ok(start >= 0 && end > start, "weather gameplay must remain an independently testable block");
const weatherBlock = game.slice(start, end);

function createHarness({ fast = 1, forced = "" } = {}) {
  const context = {
    FAST: fast,
    Math,
    Uint32Array,
    URLSearchParams,
    location: { search: forced ? `?weather=${forced}` : "" },
    window: {
      PonoDebugMode: { isAllowed: () => Boolean(forced) },
      crypto: { getRandomValues(values) { values[0] = 0x80000000; return values; } }
    }
  };
  vm.runInNewContext(weatherBlock + `
    this.__weather = {
      roll: rollJourneyWeather,
      start: startStageWeather,
      advance: advanceStageWeather,
      stop: stopStageWeather,
      forStage: weatherForStage,
      rareChance: rareSpawnChance,
      speed: rainTrainSpeedMultiplier,
      state: () => ({
        journeyWeatherPlan,
        currentStageWeather,
        showerSchedulerActive,
        showerPhaseElapsedMs,
        showerPhaseDurationMs
      }),
      setCurrent: value => { currentStageWeather = value; }
    };`, context, { filename: "nazonazo-weather-gameplay.js" });
  return context.__weather;
}

const weather = createHarness();
let draws = 0;
assert.equal(weather.roll(() => { draws++; return .249999; }), "showers", "values below .25 must select a shower journey");
assert.equal(draws, 1, "one journey must consume exactly one weather draw");
assert.equal(weather.roll(() => { draws++; return .25; }), "clear", "the .25 boundary must draw a clear journey");
assert.equal(draws, 2);

weather.roll(() => .249999);
weather.start({ id: "town", veh: "train" }, () => 0);
let showerState = weather.state();
assert.equal(showerState.journeyWeatherPlan, "showers");
assert.equal(showerState.currentStageWeather, "clear", "a shower journey must still begin clear");
assert.equal(showerState.showerSchedulerActive, true, "town must arm its shower scheduler");
assert.equal(showerState.showerPhaseElapsedMs, 0);
assert.equal(showerState.showerPhaseDurationMs, 2500, "the minimum first-shower delay must be 2.5 seconds");
assert.equal(weather.forStage({ id: "town" }), "clear", "stage reads must expose the current phase without redrawing");
assert.equal(weather.forStage({ id: "jungle" }), "clear", "showers must never leak into another stage");

const exteriorDrive = { playing: true, driving: true, tunnelRun: false };
const stoppedAtQuiz = { playing: true, driving: false, tunnelRun: false };
weather.advance(2499, exteriorDrive, () => 0);
assert.equal(weather.state().currentStageWeather, "clear", "rain must not begin before the sampled delay");
weather.advance(1, exteriorDrive, () => 0);
showerState = weather.state();
assert.equal(showerState.currentStageWeather, "rain", "rain must begin at the sampled delay while driving outside");
assert.equal(showerState.showerPhaseDurationMs, 6000, "the minimum shower duration must be six seconds");

weather.advance(5999, stoppedAtQuiz, () => 0);
assert.equal(weather.state().currentStageWeather, "rain", "an active shower must continue through its sampled duration");
weather.advance(1, stoppedAtQuiz, () => 0);
showerState = weather.state();
assert.equal(showerState.currentStageWeather, "clear", "an active shower may end while the train is stopped at a town quiz");
assert.equal(showerState.showerPhaseDurationMs, 12000, "the minimum clear gap must be twelve seconds");

weather.advance(20000, stoppedAtQuiz, () => 0);
assert.equal(weather.state().showerPhaseElapsedMs, 0, "a clear gap must not advance while the train is stopped");
weather.advance(12000, exteriorDrive, () => 0);
assert.equal(weather.state().currentStageWeather, "rain", "another shower may begin only after enough exterior driving");

weather.stop();
showerState = weather.state();
assert.equal(showerState.currentStageWeather, "clear", "stopping a stage scheduler must clear active rain");
assert.equal(showerState.showerSchedulerActive, false);
assert.equal(showerState.showerPhaseElapsedMs, 0);
assert.equal(showerState.showerPhaseDurationMs, 0);

weather.roll(() => .249999);
weather.start({ id: "town", veh: "train" }, () => 0);
weather.advance(6000, { playing: true, driving: true, tunnelRun: true }, () => 0);
assert.equal(weather.state().showerPhaseElapsedMs, 0, "the clear-phase clock must pause during tunnel travel");
weather.start({ id: "jungle", veh: "train" }, () => 0);
assert.equal(weather.state().currentStageWeather, "clear", "starting another stage must reset the visible weather");
assert.equal(weather.state().showerSchedulerActive, false, "non-town stages must never retain the scheduler");

let fastDraws = 0;
const fastWeather = createHarness({ fast: 6 });
assert.equal(fastWeather.roll(() => { fastDraws++; return 0; }), "clear", "fast regression runs must stay deterministic without an override");
assert.equal(fastDraws, 0, "fast mode must not consume the weather draw");
fastWeather.start({ id: "town", veh: "train" }, () => 0);
assert.equal(fastWeather.state().currentStageWeather, "clear");
assert.equal(fastWeather.state().showerSchedulerActive, false, "fast mode must not arm random shower work");

for (const forced of ["rain", "clear"]) {
  let forcedDraws = 0;
  const forcedWeather = createHarness({ forced });
  forcedWeather.roll(() => { forcedDraws++; return forced === "rain" ? 1 : 0; });
  assert.equal(forcedDraws, 0, "debug overrides must not consume the random draw");
  forcedWeather.start({ id: "town", veh: "train" }, () => { forcedDraws++; return 0; });
  assert.equal(forcedDraws, 0, "fixed debug weather must not consume scheduler timing draws");
  assert.equal(forcedWeather.state().currentStageWeather, forced);
  assert.equal(forcedWeather.state().showerSchedulerActive, false, `forced ${forced} must stay fixed rather than cycle`);
  forcedWeather.advance(60000, exteriorDrive, () => { forcedDraws++; return 0; });
  assert.equal(forcedWeather.state().currentStageWeather, forced, `forced ${forced} must remain fixed over time`);
  assert.equal(forcedDraws, 0);
  assert.equal(forcedWeather.forStage({ id: "jungle" }), "clear", "debug weather must not leak past the town scenery");
}

weather.setCurrent("clear");
assert.equal(weather.rareChance(), .25, "clear weather must retain the original per-attempt rare chance");
assert.equal(weather.speed({ veh: "train" }, false), 1, "clear train travel must retain full speed");
weather.setCurrent("rain");
assert.equal(weather.rareChance(), .4, "rain must raise the per-attempt rare chance to forty percent");
assert.equal(weather.speed({ veh: "train" }, false), .92, "rain must slow only exterior train travel by eight percent");
assert.equal(weather.speed({ veh: "train" }, true), 1, "tunnel travel must keep its tuned speed");
assert.equal(weather.speed({ veh: "sub" }, false), 1, "other vehicles must not inherit the rain slowdown");
assert.ok(1 - Math.pow(1 - .4, 5) > 1 - Math.pow(1 - .25, 5), "rain must materially improve the five-attempt encounter chance");

assert.match(weatherBlock, /const JOURNEY_SHOWER_CHANCE=\.25;/, "a journey must have exactly a twenty-five percent shower-plan chance");
assert.match(weatherBlock, /const SHOWER_FIRST_DELAY_MS=\[2500,6000\];/, "first rain must wait between 2.5 and 6 seconds of exterior driving");
assert.match(weatherBlock, /const SHOWER_RAIN_DURATION_MS=\[6000,10000\];/, "one shower must last between 6 and 10 seconds");
assert.match(weatherBlock, /const SHOWER_CLEAR_DURATION_MS=\[12000,20000\];/, "showers must be separated by 12 to 20 seconds of exterior driving");
assert.doesNotMatch(weatherBlock, /setTimeout|setInterval/, "the weather state machine must use the existing animation clock without owning timers");
assert.match(game, /if\(!FORCERARE&&Math\.random\(\)>rareSpawnChance\(\)\)return;/, "rare spawning must use the resolved weather chance");
assert.match(game, /const tunnelGameRun=pending==="tunnelExit";[\s\S]*?advanceStageWeather\([\s\S]*?const rainSpeed=rainTrainSpeedMultiplier\(STAGES\[stg\],tunnelRun\);[\s\S]*?const maxV=tunnelGameRun\?TUNNEL_GAME_MAX_V:\(tunnelRun\?TUNNEL_TRANSIT_MAX_V:\(swapReady\?52:38\)\*rainSpeed\);/, "weather must advance before the game loop resolves the active exterior speed");
assert.equal((game.match(/rollJourneyWeather\(\);/g) || []).length, 3, "only title start, retry, and loop-two start may redraw weather");
assert.doesNotMatch(game.match(/bindTap\(\$\("goBtn"\)[^\n]+/)?.[0] || "", /rollJourneyWeather/, "map resume must keep the current journey weather");
for (const [name, expectation] of [
  ["startJourneyAt", /stopStageWeather\([\s\S]*?startStageWeather/],
  ["openMap", /stopStageWeather/],
  ["beginStageTransit", /stopStageWeather/],
  ["enterTunnelInterior", /stopStageWeather/],
  ["ending", /stopStageWeather/]
]) {
  const functionStart = game.indexOf(`function ${name}(`);
  const functionEnd = game.indexOf("\nfunction ", functionStart + 1);
  assert.ok(functionStart >= 0, `${name} must remain present`);
  assert.match(game.slice(functionStart, functionEnd < 0 ? game.length : functionEnd), expectation, `${name} must reset shower state at its lifecycle boundary`);
}
assert.match(game, /function scheduleRareSpawn\(\)\{[\s\S]*?const scheduledStage=stg,scheduledLoop=loop;[\s\S]*?if\(!playing\|\|!driving\|\|stg!==scheduledStage\|\|loop!==scheduledLoop\)return;/, "delayed rare draws must stay inside the active journey and stage");
assert.match(game, /function maybeSpawnRare\(\)\{\s*if\(!playing\|\|!driving\|\|rareEl\)return;/, "rare friends must never appear over maps or stopped screens");
assert.match(game, /function startJourneyAt\(s\)\{\s*hideWeatherNotice\(\);\s*resetNumberCargoGame\(\);\s*clearFutureRailGame\(\);\s*clearSpaceConstellationGame\(\);\s*clearRareEvent\(\);/, "new journeys must clear delayed and flying rare friends after resetting stage-specific answer activities");
assert.match(game, /function openMap\(msg\)\{\s*hideWeatherNotice\(\);\s*resetNumberCargoGame\(\);\s*clearFutureRailGame\(\);\s*clearSpaceConstellationGame\(\);\s*clearRareEvent\(\);/, "opening the map must clear delayed and flying rare friends after resetting stage-specific answer activities");
assert.match(game, /function beginStageTransit\(\)\{\s*if\(!coverEl\)return;\s*clearRareEvent\(\);/, "stage transit must clear the previous stage's rare event");

const rareGuardStart = game.indexOf("function clearRareEvent(){");
const rareGuardEnd = game.indexOf("function maybeSpawnRare(){", rareGuardStart);
assert.ok(rareGuardStart >= 0 && rareGuardEnd > rareGuardStart, "rare timer guards must remain independently testable");
const rareGuardBlock = game.slice(rareGuardStart, rareGuardEnd);
function createRareGuardHarness() {
  let nextTimer = 1;
  const timers = new Map();
  let spawnCalls = 0;
  const context = {
    setTimeout(fn) { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    maybeSpawnRare() { spawnCalls++; }
  };
  vm.runInNewContext(`
    let rareSpawnTimer=0,rareEl=null,stg=0,loop=0,playing=true,driving=true;
    ${rareGuardBlock}
    this.__rareGuard={
      schedule:scheduleRareSpawn,
      clear:clearRareEvent,
      state:()=>({rareSpawnTimer,rareEl,stg,loop,playing,driving}),
      setState:value=>{if("stg" in value)stg=value.stg;if("loop" in value)loop=value.loop;if("playing" in value)playing=value.playing;if("driving" in value)driving=value.driving;},
      setRare:value=>{rareEl=value;}
    };`, context, { filename: "nazonazo-rare-timer-guard.js" });
  return {
    api: context.__rareGuard,
    timerCount: () => timers.size,
    spawnCalls: () => spawnCalls,
    flush() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); }
  };
}

let rareGuard = createRareGuardHarness();
rareGuard.api.schedule();
rareGuard.api.setState({ playing: false });
rareGuard.flush();
assert.equal(rareGuard.spawnCalls(), 0, "a delayed rare draw must not fire after opening a stopped map");

rareGuard = createRareGuardHarness();
rareGuard.api.schedule();
rareGuard.api.setState({ stg: 1 });
rareGuard.flush();
assert.equal(rareGuard.spawnCalls(), 0, "a delayed rare draw must not cross into another stage");

rareGuard = createRareGuardHarness();
rareGuard.api.schedule();
rareGuard.flush();
assert.equal(rareGuard.spawnCalls(), 1, "an active matching journey may still perform its rare draw");

rareGuard = createRareGuardHarness();
const flyingRare = { removed: false, remove() { this.removed = true; } };
rareGuard.api.setRare(flyingRare);
rareGuard.api.schedule();
rareGuard.api.clear();
assert.equal(rareGuard.timerCount(), 0, "map and journey boundaries must cancel the pending rare timer");
assert.equal(flyingRare.removed, true, "map and journey boundaries must remove a flying rare friend");
assert.equal(rareGuard.api.state().rareEl, null);

const notice = html.match(/<div id="weatherNotice"[\s\S]*?<\/div>/)?.[0] || "";
assert.match(notice, /role="status"[^>]+aria-live="polite"[^>]+hidden/, "the rain explanation must start hidden and use a polite live region");
assert.match(game, /slow\.textContent="☔ あめだ！ ゆっくり はしるよ"/, "the slowdown must be explained in child-facing language");
assert.match(game, /benefit\.textContent="🌟 めずらしい ともだちに あえるかも"/, "the encounter benefit must be explained in child-facing language");
const weatherCopy = ["あめだ！ ゆっくり はしるよ", "めずらしい ともだちに あえるかも"].join("");
assert.doesNotMatch(weatherCopy, /[一-龯々〆ヵヶ]/, "the child-facing weather explanation must not contain kanji");
assert.match(game, /weatherNotice\.hidden=true;weatherNotice\.replaceChildren\(\);[\s\S]*?weatherNotice\.replaceChildren\(\);weatherNotice\.hidden=false;[\s\S]*?requestAnimationFrame/, "the live notice must repopulate after becoming active so repeat journeys are announced");
assert.match(css, /#weatherNotice\{[^}]*z-index:10[^}]*pointer-events:none/, "the notice must sit below the quiz and never block input");
const showNoticeStart = game.indexOf("function showRainNotice(){");
const showNoticeEnd = game.indexOf("\n}", showNoticeStart);
const showNotice = game.slice(showNoticeStart, showNoticeEnd + 2);
assert.doesNotMatch(showNotice, /showStamp|speak/, "the rain explanation must not compete with quiz stamps or narration");
assert.match(game, /function showQuiz\(\)\{\s*hideWeatherNotice\(\);/, "the notice must be gone before any question appears");
assert.match(game, /addEventListener\("pagehide",\(\)=>\{[^}]*hideWeatherNotice\(\);[^}]*clearTimeout\(rainParticleResizeTimer\);/, "pagehide must cancel the only weather-owned timeout before BFCache or navigation");

console.log("nazonazo random weather tradeoff regression: PASS");
