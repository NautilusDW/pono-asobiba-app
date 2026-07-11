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
      forStage: weatherForStage,
      rareChance: rareSpawnChance,
      speed: rainTrainSpeedMultiplier,
      state: () => ({ journeyWeather, currentStageWeather, rainNoticePending }),
      setCurrent: value => { currentStageWeather = value; }
    };`, context, { filename: "nazonazo-weather-gameplay.js" });
  return context.__weather;
}

const weather = createHarness();
let draws = 0;
assert.equal(weather.roll(() => { draws++; return .499999; }), "rain", "values below .5 must draw rain");
assert.equal(draws, 1, "one journey must consume exactly one weather draw");
for (let i = 0; i < 12; i++) assert.equal(weather.forStage({ id: "town" }), "rain", "weather must not redraw during a journey");
assert.equal(draws, 1, "stage reads must never consume random values");
assert.equal(weather.forStage({ id: "jungle" }), "clear", "non-town scenery must remain clear");
assert.equal(weather.state().rainNoticePending, true, "a rainy departure must queue exactly one explanation");
assert.equal(weather.roll(() => { draws++; return .5; }), "clear", "the .5 boundary must draw clear");
assert.equal(draws, 2);
assert.equal(weather.state().rainNoticePending, false, "clear departures must not queue a rain explanation");

let fastDraws = 0;
const fastWeather = createHarness({ fast: 6 });
assert.equal(fastWeather.roll(() => { fastDraws++; return 0; }), "clear", "fast regression runs must stay deterministic without an override");
assert.equal(fastDraws, 0, "fast mode must not consume the weather draw");

for (const forced of ["rain", "clear"]) {
  let forcedDraws = 0;
  const forcedWeather = createHarness({ forced });
  assert.equal(forcedWeather.roll(() => { forcedDraws++; return forced === "rain" ? 1 : 0; }), forced, `forced ${forced} must win over the random source`);
  assert.equal(forcedDraws, 0, "debug overrides must not consume the random draw");
  assert.equal(forcedWeather.forStage({ id: "town" }), forced);
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

assert.match(game, /if\(!FORCERARE&&Math\.random\(\)>rareSpawnChance\(\)\)return;/, "rare spawning must use the resolved weather chance");
assert.match(game, /const rainSpeed=rainTrainSpeedMultiplier\(STAGES\[stg\],tunnelRun\);[\s\S]*?const maxV=tunnelRun\?58:\(swapReady\?52:38\)\*rainSpeed;/, "the game loop must apply rain only to exterior cruising speed");
assert.match(game, /const weather=weatherForStage\(st\);\s*currentStageWeather=weather;/, "the applied scene weather must feed both speed and rare encounter effects");
assert.equal((game.match(/rollJourneyWeather\(\);/g) || []).length, 3, "only title start, retry, and loop-two start may redraw weather");
assert.doesNotMatch(game.match(/bindTap\(\$\("goBtn"\)[^\n]+/)?.[0] || "", /rollJourneyWeather/, "map resume must keep the current journey weather");
assert.match(game, /function scheduleRareSpawn\(\)\{[\s\S]*?const scheduledStage=stg,scheduledLoop=loop;[\s\S]*?if\(!playing\|\|!driving\|\|stg!==scheduledStage\|\|loop!==scheduledLoop\)return;/, "delayed rare draws must stay inside the active journey and stage");
assert.match(game, /function maybeSpawnRare\(\)\{\s*if\(!playing\|\|!driving\|\|rareEl\)return;/, "rare friends must never appear over maps or stopped screens");
assert.match(game, /function startJourneyAt\(s\)\{\s*hideWeatherNotice\(\);\s*clearRareEvent\(\);/, "new journeys must clear delayed and flying rare friends");
assert.match(game, /function openMap\(msg\)\{\s*hideWeatherNotice\(\);\s*clearRareEvent\(\);/, "opening the map must clear delayed and flying rare friends");
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

console.log("nazonazo random weather tradeoff regression: PASS");
