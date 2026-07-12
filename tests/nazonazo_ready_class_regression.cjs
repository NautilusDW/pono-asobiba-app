"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "nazonazo-tunnel/index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");

assert.match(
  html,
  /#app\{visibility:hidden\}body\.pono-game-ready #app\{visibility:visible\}/,
  "the FOUC guard must still depend on pono-game-ready"
);

const applyStart = game.indexOf("function applySkin(");
const applyEnd = game.indexOf("\nfunction buildWorld", applyStart);
assert.ok(applyStart >= 0 && applyEnd > applyStart, "applySkin must be present");
const applySkin = game.slice(applyStart, applyEnd);

const preserveStart = applySkin.indexOf(
  'const wasGameReady=document.body.classList.contains("pono-game-ready");'
);
const preserveEnd = applySkin.indexOf("\n setDriverForStage", preserveStart);
assert.ok(preserveStart >= 0 && preserveEnd > preserveStart, "ready-class preservation must wrap the body class reset");
const preserveSnippet = applySkin.slice(preserveStart, preserveEnd);

function runSkinClassReset(initialClassName, iosDevice, portalEdit) {
  let classes = new Set(initialClassName.split(/\s+/).filter(Boolean));
  const body = {
    dataset: {},
    classList: {
      contains(name) { return classes.has(name); },
      add(name) { classes.add(name); }
    }
  };
  Object.defineProperty(body, "className", {
    get() { return [...classes].join(" "); },
    set(value) { classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
  });

  vm.runInNewContext(preserveSnippet, {
    document: { body },
    IOS_DEVICE: iosDevice,
    PORTAL_EDIT_ENABLED: portalEdit,
    weatherReady: true,
    weatherForStage() { return "rain"; },
    startStageWeather() { return "rain"; },
    st: { id: "town", veh: "train" }
  });
  return classes;
}

const started = runSkinClassReset("pono-game-ready st-old v-old tunnel-interior", false, false);
assert.deepEqual(
  [...started].sort(),
  ["pono-game-ready", "st-town", "v-train", "weather-rain"].sort(),
  "starting or changing a stage must preserve the ready class while replacing transient skin classes"
);

const beforeReady = runSkinClassReset("st-old v-old", true, true);
assert.deepEqual(
  [...beforeReady].sort(),
  ["ios-device", "portal-edit", "st-town", "v-train", "weather-rain"].sort(),
  "the initial pre-ready skin pass must not reveal the app early"
);

console.log("nazonazo ready-class regression: PASS");
