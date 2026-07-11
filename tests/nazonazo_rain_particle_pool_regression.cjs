"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "nazonazo-tunnel/js/game.js"), "utf8");
const start = game.indexOf("/* ================= weather particles ================= */");
const end = game.indexOf("/* ================= audio & speech ================= */");
assert.ok(start >= 0 && end > start, "weather particle block must remain extractable for deterministic tests");
const particleBlock = game.slice(start, end);

class FakeStyle {
  constructor() { this.values = Object.create(null); }
  setProperty(name, value) { this.values[name] = String(value); }
  getPropertyValue(name) { return this.values[name] || ""; }
}

class FakeNode {
  constructor(fragment = false) {
    this.isFragment = fragment;
    this.children = [];
    this.dataset = Object.create(null);
    this.style = new FakeStyle();
    this.className = "";
    this.hidden = false;
  }
  appendChild(node) { this.children.push(node); return node; }
  replaceChildren(...nodes) {
    this.children = [];
    for (const node of nodes) {
      if (node && node.isFragment) this.children.push(...node.children);
      else if (node) this.children.push(node);
    }
  }
}

function createHarness({ width = 844, height = 390, ios = false, locked = false } = {}) {
  const layers = { far: new FakeNode(), mid: new FakeNode(), near: new FakeNode() };
  let nextTimer = 1;
  const timers = new Map();
  const windowObject = {
    innerWidth: width,
    innerHeight: height,
    __PONO_TIER_LOCKED__: locked,
    crypto: { getRandomValues(values) { values[0] = 0x7a11c0de; return values; } }
  };
  const context = {
    Math,
    Number,
    Object,
    Array,
    Date,
    Uint32Array,
    performance: { now: () => 123.456 },
    window: windowObject,
    document: {
      createElement() { return new FakeNode(); },
      createDocumentFragment() { return new FakeNode(true); }
    },
    rainLayerElements: layers,
    IOS_DEVICE: ios,
    setTimeout(fn) { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(
    particleBlock + "\nthis.__rain={profiles:RAIN_PARTICLE_PROFILES,build:buildRainParticles,update:updateRainParticleVisibility,schedule:scheduleRainParticleRebuild};",
    context,
    { filename: "nazonazo-rain-particles.js" }
  );
  return {
    api: context.__rain,
    layers,
    window: windowObject,
    flushTimers() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach(fn => fn());
      return callbacks.length;
    }
  };
}

function numberValue(node, name) {
  return Number.parseFloat(node.style.getPropertyValue(name));
}

function activeParticles(layer) {
  return layer.children.filter(node => !node.hidden);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function snapshot(harness) {
  return Object.fromEntries(Object.entries(harness.layers).map(([depth, layer]) => [
    depth,
    layer.children.map(node => ({ ...node.style.values }))
  ]));
}

const harness = createHarness();
harness.api.build(true, 0x12345678);

assert.deepEqual(
  JSON.parse(JSON.stringify(harness.api.profiles)),
  [
    { depth: "far", base: 30, max: 48, iosMax: 34, seed: 0x11f4a7c3, length: [8, 18], width: [.55, .9], duration: [1.55, 2.25], opacity: [.14, .3], drift: [-11, -6], angle: [5, 9] },
    { depth: "mid", base: 22, max: 36, iosMax: 25, seed: 0x65bd1e37, length: [18, 34], width: [.8, 1.35], duration: [.95, 1.48], opacity: [.26, .48], drift: [-18, -10], angle: [8, 14] },
    { depth: "near", base: 14, max: 24, iosMax: 15, seed: 0xa7c3e91d, length: [38, 72], width: [1.3, 2.2], duration: [.58, .98], opacity: [.38, .64], drift: [-28, -17], angle: [12, 19] }
  ],
  "particle safety envelopes must not drift toward synchronized sheets or oversized drops"
);

assert.deepEqual(
  Object.values(harness.layers).map(layer => layer.children.length),
  [48, 36, 24],
  "desktop must allocate each maximum particle pool only once"
);
assert.deepEqual(
  Object.values(harness.layers).map(layer => Number(layer.dataset.particleCount)),
  [30, 22, 14],
  "844x390 must use the intended far/mid/near perspective counts"
);

const medians = {};
for (const profile of harness.api.profiles) {
  const layer = harness.layers[profile.depth];
  const particles = activeParticles(layer);
  assert.equal(particles.length, Number(layer.dataset.particleCount), `${profile.depth} active count must match metadata`);
  assert.ok(layer.children.slice(particles.length).every(node => node.hidden), `${profile.depth} spare pool entries must stay hidden`);
  const bins = new Set();
  const combinations = new Set();
  const durations = [];
  const delays = [];
  const durationDelayPairs = new Set();
  const phaseBins = new Set();
  for (const particle of particles) {
    assert.equal(particle.className, "rain-particle");
    assert.equal(particle.dataset.depth, profile.depth);
    const left = numberValue(particle, "--rain-left");
    const restX = numberValue(particle, "--rain-rest-x");
    const restY = numberValue(particle, "--rain-rest-y");
    const length = numberValue(particle, "--rain-length");
    const width = numberValue(particle, "--rain-width");
    const duration = numberValue(particle, "--rain-duration");
    const delay = numberValue(particle, "--rain-delay");
    const opacity = numberValue(particle, "--rain-opacity");
    const drift = numberValue(particle, "--rain-drift");
    const angle = numberValue(particle, "--rain-angle");
    assert.ok(left >= -6 && left <= 106, `${profile.depth} x must cover the viewport with overscan`);
    assert.ok(restX >= -2 && restX <= 102 && restY >= 3 && restY <= 97, `${profile.depth} reduced-motion rest position must stay visible`);
    assert.ok(length >= profile.length[0] && length <= profile.length[1]);
    assert.ok(width >= profile.width[0] && width <= profile.width[1]);
    assert.ok(duration >= profile.duration[0] && duration <= profile.duration[1]);
    assert.ok(delay <= 0 && delay >= -duration - 0.001, `${profile.depth} delay must distribute particles across the first cycle`);
    assert.ok(opacity >= profile.opacity[0] && opacity <= profile.opacity[1]);
    assert.ok(drift >= profile.drift[0] && drift <= profile.drift[1]);
    assert.ok(angle >= profile.angle[0] && angle <= profile.angle[1]);
    bins.add(Math.max(0, Math.min(9, Math.floor(((left + 6) / 112) * 10))));
    combinations.add([duration, delay, length, width, drift].join("/"));
    durations.push(duration);
    delays.push(delay);
    durationDelayPairs.add(duration + "/" + delay);
    phaseBins.add(Math.max(0, Math.min(9, Math.floor((-delay / duration) * 10))));
  }
  assert.ok(bins.size >= 8, `${profile.depth} particles must cover at least eight horizontal bins`);
  assert.ok(combinations.size >= Math.ceil(particles.length * 0.8), `${profile.depth} trajectories must not synchronize`);
  assert.ok(new Set(durations).size >= Math.ceil(particles.length * 0.8), `${profile.depth} durations must vary independently`);
  assert.ok(new Set(delays).size >= Math.ceil(particles.length * 0.8), `${profile.depth} delays must vary independently`);
  assert.ok(durationDelayPairs.size >= Math.ceil(particles.length * 0.8), `${profile.depth} duration and phase pairs must not synchronize`);
  assert.ok(phaseBins.size >= 7, `${profile.depth} start phases must span most of the fall cycle`);
  medians[profile.depth] = {
    length: median(particles.map(node => numberValue(node, "--rain-length"))),
    width: median(particles.map(node => numberValue(node, "--rain-width"))),
    opacity: median(particles.map(node => numberValue(node, "--rain-opacity"))),
    duration: median(particles.map(node => numberValue(node, "--rain-duration")))
  };
}

for (const key of ["length", "width", "opacity"]) {
  assert.ok(medians.far[key] < medians.mid[key] && medians.mid[key] < medians.near[key], `${key} must increase toward the viewer`);
}
assert.ok(medians.far.duration > medians.mid.duration && medians.mid.duration > medians.near.duration, "fall duration must decrease toward the viewer");

const identities = Object.fromEntries(Object.entries(harness.layers).map(([depth, layer]) => [depth, layer.children.slice()]));
harness.api.build(false);
for (const depth of Object.keys(identities)) {
  assert.equal(harness.layers[depth].children.length, identities[depth].length, `${depth} repeated initialization must keep the exact pool size`);
  assert.ok(harness.layers[depth].children.every((node, index) => node === identities[depth][index]), `${depth} pool identity must survive repeated initialization`);
}

harness.window.innerWidth = 1366;
harness.window.innerHeight = 768;
harness.api.schedule();
harness.api.schedule();
harness.api.schedule();
assert.equal(harness.flushTimers(), 1, "resize debounce must leave exactly one pending visibility update");
assert.deepEqual(Object.values(harness.layers).map(layer => Number(layer.dataset.particleCount)), [48, 35, 22], "desktop resize must only reveal pooled particles");
for (const depth of Object.keys(identities)) {
  assert.equal(harness.layers[depth].children.length, identities[depth].length, `${depth} desktop resize must keep the exact pool size`);
  assert.ok(harness.layers[depth].children.every((node, index) => node === identities[depth][index]), `${depth} resize must not recreate particles`);
}

harness.window.innerWidth = 740;
harness.window.innerHeight = 320;
harness.api.schedule();
harness.flushTimers();
assert.deepEqual(Object.values(harness.layers).map(layer => Number(layer.dataset.particleCount)), [25, 19, 12], "short landscape must reduce active particle work");
for (const depth of Object.keys(identities)) {
  assert.equal(harness.layers[depth].children.length, identities[depth].length, `${depth} short resize must keep the exact pool size`);
  assert.ok(harness.layers[depth].children.every((node, index) => node === identities[depth][index]), `${depth} short resize must not recreate particles`);
}

const ipad = createHarness({ width: 1024, height: 768, ios: true });
ipad.api.build(true, 0x12345678);
assert.deepEqual(Object.values(ipad.layers).map(layer => layer.children.length), [34, 25, 15], "iOS pools must respect the safe compositor cap");
assert.deepEqual(Object.values(ipad.layers).map(layer => Number(layer.dataset.particleCount)), [34, 25, 15], "iPad active particles must never exceed 74 total");

const repeatA = createHarness();
const repeatB = createHarness();
const repeatC = createHarness();
repeatA.api.build(true, 0x2468ace0);
repeatB.api.build(true, 0x2468ace0);
repeatC.api.build(true, 0x13579bdf);
assert.deepEqual(snapshot(repeatA), snapshot(repeatB), "a fixed seed must reproduce the same particle field for regression screenshots");
assert.notDeepEqual(snapshot(repeatA), snapshot(repeatC), "a different seed must create a different random-looking field");

const locked = createHarness({ locked: true });
for (const layer of Object.values(locked.layers)) layer.appendChild(new FakeNode());
locked.api.build(true, 0x12345678);
assert.deepEqual(Object.values(locked.layers).map(layer => layer.children.length), [0, 0, 0], "LP tier lock must not retain hidden particle animations");

console.log("nazonazo rain particle pool regression: PASS");
