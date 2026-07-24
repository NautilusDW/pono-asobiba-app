"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const MACHIGAI_ROOT = path.join(ROOT, "machigai");
const STAGES_PATH = path.join(MACHIGAI_ROOT, "data", "stages.js");
const NARRATION_PATH = path.join(MACHIGAI_ROOT, "data", "narration.js");
const SPEECH_PATH = path.join(MACHIGAI_ROOT, "js", "speech.js");
const INDEX_PATH = path.join(MACHIGAI_ROOT, "index.html");
const SW_PATH = path.join(ROOT, "sw.js");
const PLAY_PATH = path.join(ROOT, "play.html");
const COMPLETION_TEXT = "ぜんぶ みつけた！すごい！";

function runBrowserScript(filePath, windowObject, extraGlobals = {}) {
  const sandbox = Object.assign(
    {
      window: windowObject,
      Promise,
      console
    },
    extraGlobals
  );
  vm.runInNewContext(fs.readFileSync(filePath, "utf8"), sandbox, {
    filename: path.relative(ROOT, filePath)
  });
  return sandbox.window;
}

function sortedStrings(values) {
  return Array.from(values, String).sort((a, b) => a.localeCompare(b, "ja"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assertManifestCoverage() {
  const stageWindow = runBrowserScript(STAGES_PATH, {});
  const stages = stageWindow.STAGE_DATA && stageWindow.STAGE_DATA.stages;
  assert.ok(Array.isArray(stages), "stages.js must expose STAGE_DATA.stages");
  assert.equal(stages.length, 15, "all 15 machigai stages must remain present");

  const occurrenceLabels = stages.flatMap((stage) =>
    Array.from(stage.differences || [], (difference) => String(difference.label || ""))
  );
  assert.equal(occurrenceLabels.length, 60, "the 15 stages must contain 60 spoken difference occurrences");

  const uniqueLabels = new Set(occurrenceLabels);
  assert.equal(uniqueLabels.size, 58, "the runtime stage data must contain 58 unique difference labels");
  assert.equal(
    occurrenceLabels.filter((label) => label === "ほしの かたち").length,
    3,
    "the one intentionally shared label must occur on three stages"
  );

  const narrationWindow = runBrowserScript(NARRATION_PATH, {});
  const catalog = narrationWindow.MACHIGAI_NARRATION;
  assert.ok(catalog && catalog.entries, "narration.js must synchronously expose MACHIGAI_NARRATION.entries");

  assert.equal(catalog.version, "tts31-leda-v1", "narration version");
  assert.equal(catalog.model, "gemini-3.1-flash-tts-preview", "all clips must use Gemini TTS 3.1");
  assert.equal(catalog.voice, "Leda", "all clips must use the approved female narrator Leda");
  assert.equal(catalog.bakedSpeed, 1.15, "the approved 1.15x speed must be baked into every clip");
  assert.equal(catalog.playbackRate, 1, "runtime playback must not apply the 1.15x speed twice");
  assert.equal(catalog.volume, 0.92, "the game-local narration volume must stay explicit");
  assert.equal(catalog.completionText, COMPLETION_TEXT, "completion narration text");
  assert.equal(catalog.expectedCount, 59, "catalog self-check count");

  const expectedTexts = new Set(uniqueLabels);
  expectedTexts.add(COMPLETION_TEXT);
  const actualTexts = Object.keys(catalog.entries);
  assert.equal(actualTexts.length, 59, "58 unique labels plus one completion clip must be bundled");
  assert.deepEqual(
    sortedStrings(actualTexts),
    sortedStrings(expectedTexts),
    "manifest keys must exactly cover every runtime phrase, with no missing or orphaned narration"
  );

  const referencedFiles = new Set();
  for (const text of actualTexts) {
    const entry = catalog.entries[text];
    assert.ok(entry && typeof entry === "object", `${text}: manifest entry`);
    assert.match(
      entry.file,
      /^assets\/audio\/narration\/tts31-leda-v1\/[a-z0-9_]+\.mp3$/,
      `${text}: immutable, safe narration path`
    );
    assert.ok(Number.isFinite(entry.durationSec) && entry.durationSec > 0 && entry.durationSec < 10,
      `${text}: plausible durationSec`);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/, `${text}: sha256 metadata`);
    assert.equal(referencedFiles.has(entry.file), false, `${text}: each unique phrase has one dedicated file`);
    referencedFiles.add(entry.file);

    const audioPath = path.resolve(MACHIGAI_ROOT, entry.file);
    assert.ok(audioPath.startsWith(`${MACHIGAI_ROOT}${path.sep}`), `${text}: audio path cannot escape machigai`);
    assert.ok(fs.existsSync(audioPath), `${text}: narration asset exists`);
    const stat = fs.statSync(audioPath);
    assert.ok(stat.isFile(), `${text}: narration asset is a file`);
    assert.ok(stat.size > 1000, `${text}: narration asset is not empty`);
    assert.ok(stat.size < 3 * 1024 * 1024, `${text}: narration asset stays below repository limit`);
    assert.equal(fs.readFileSync(audioPath, { encoding: null }).subarray(0, 3).toString("ascii"), "ID3",
      `${text}: narration asset is an MP3 with an ID3 header`);
    assert.equal(sha256(audioPath), entry.sha256, `${text}: manifest sha256 matches the shipped bytes`);
  }

  const audioDir = path.join(MACHIGAI_ROOT, "assets", "audio", "narration", catalog.version);
  const diskFiles = fs.readdirSync(audioDir).filter((name) => name.endsWith(".mp3")).sort();
  assert.equal(diskFiles.length, 59, "the versioned narration directory must contain exactly 59 MP3 files");
  assert.deepEqual(
    diskFiles,
    Array.from(referencedFiles, (file) => path.basename(file)).sort(),
    "every shipped MP3 must be referenced exactly once by the manifest"
  );

  return catalog;
}

function assertScriptContract() {
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const scriptSources = Array.from(
    html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/g),
    (match) => match[1]
  );
  const requiredOrder = [
    "data/stages.js",
    "data/narration.js",
    "js/audio.js",
    "js/speech.js",
    "js/fx.js",
    "js/game.js",
    "js/scenes.js",
    "js/main.js"
  ];
  let previousIndex = -1;
  for (const source of requiredOrder) {
    const index = scriptSources.indexOf(source);
    assert.ok(index > previousIndex, `${source} must load in dependency order`);
    assert.equal(scriptSources.lastIndexOf(source), index, `${source} must load exactly once`);
    previousIndex = index;
  }

  assert.match(
    html,
    /<script src=["']data\/narration\.js["']><\/script>/,
    "the synchronous narration manifest must load without async/defer"
  );

  const speechSource = fs.readFileSync(SPEECH_PATH, "utf8");
  assert.doesNotMatch(
    speechSource,
    /speechSynthesis|SpeechSynthesisUtterance/,
    "the prerecorded TTS implementation must never fall back to browser Web Speech"
  );
  assert.match(speechSource, /window\.MACHIGAI_NARRATION/, "speech.js must consume the versioned manifest");
  assert.match(speechSource, /window\.MSL\.Speech\s*=/, "speech.js must preserve the game-facing API");

  const swSource = fs.readFileSync(SW_PATH, "utf8");
  const playSource = fs.readFileSync(PLAY_PATH, "utf8");
  assert.match(
    swSource,
    /event\.request\.url\.includes\(['"]\/machigai\/assets\/audio\/narration\/['"]\)/,
    "service worker must cache-first the versioned machigai narration"
  );
  const swVersion = swSource.match(/const CACHE_VERSION = (\d+);/);
  const pageVersion = playSource.match(/const PAGE_CACHE_VERSION = (\d+);/);
  const exposedVersion = playSource.match(/window\.PONO_SW_VERSION = ['"]v(\d+)['"];/);
  assert.ok(swVersion && pageVersion && exposedVersion, "all cache version declarations must exist");
  assert.equal(pageVersion[1], swVersion[1], "play.html PAGE_CACHE_VERSION must match sw.js");
  assert.equal(exposedVersion[1], swVersion[1], "play.html PONO_SW_VERSION must match sw.js");
}

class FakeAudio {
  static instances = [];
  static rejectNextPlay = false;

  constructor() {
    this._src = "";
    this.preload = "";
    this.volume = 1;
    this.currentTime = 0;
    this.defaultPlaybackRate = 1;
    this.playbackRate = 1;
    this.paused = true;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.loadCalls = 0;
    this.listeners = new Map();
    this.emittedEvents = [];
    FakeAudio.instances.push(this);
  }

  get src() {
    return this._src;
  }

  set src(value) {
    const previous = this._src;
    this._src = String(value || "");
    if (previous && previous !== this._src) {
      // Chromium / WebKit は旧音源の abort を、src 差し替え後の次tickで発火する。
      queueMicrotask(() => this.emit("abort"));
    }
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type);
    if (listeners) listeners.delete(listener);
  }

  load() {
    this.loadCalls += 1;
  }

  play() {
    this.playCalls += 1;
    this.paused = false;
    if (FakeAudio.rejectNextPlay) {
      FakeAudio.rejectNextPlay = false;
      return Promise.reject(new Error("NotAllowedError"));
    }
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }

  emit(type) {
    this.emittedEvents.push(type);
    const listeners = this.listeners.get(type);
    if (!listeners) return;
    Array.from(listeners).forEach((listener) => listener.call(this, { type, target: this }));
  }
}

function findAudioBySuffix(suffix) {
  return FakeAudio.instances.find((audio) => audio.src.endsWith(suffix));
}

function createFakeDocument() {
  const head = {
    children: [],
    appendChild(node) {
      node.parentNode = this;
      this.children.push(node);
      return node;
    },
    removeChild(node) {
      const index = this.children.indexOf(node);
      if (index >= 0) this.children.splice(index, 1);
      node.parentNode = null;
      return node;
    }
  };
  return {
    head,
    createElement(tagName) {
      return { tagName: String(tagName).toUpperCase(), parentNode: null };
    }
  };
}

function assertSpeechResult(actual, status, text, message) {
  assert.ok(actual && typeof actual === "object", `${message}: result object`);
  assert.equal(actual.status, status, `${message}: status`);
  assert.equal(actual.text, text, `${message}: text`);
}

async function assertSpeechBehavior(catalog) {
  FakeAudio.instances = [];
  FakeAudio.rejectNextPlay = false;
  const fakeDocument = createFakeDocument();

  const windowObject = {
    MACHIGAI_NARRATION: catalog,
    Audio: FakeAudio,
    document: fakeDocument,
    MSL: {},
    setTimeout,
    clearTimeout
  };
  runBrowserScript(SPEECH_PATH, windowObject);
  const speech = windowObject.MSL.Speech;

  assert.ok(speech, "speech.js must expose MSL.Speech");
  assert.equal(speech.isSupported(), true, "manifest plus HTMLAudio support must enable narration");
  ["setMuted", "preload", "speak", "cancel", "getActiveText"].forEach((method) => {
    assert.equal(typeof speech[method], "function", `MSL.Speech.${method} API`);
  });

  const firstText = "ふうせん";
  const secondText = "ことり";
  speech.preload([firstText, secondText, "みとうろく"]);
  assert.equal(FakeAudio.instances.length, 0, "preload must not create competing playback elements");
  assert.deepEqual(
    fakeDocument.head.children.map((link) => link.href).sort(),
    [
      catalog.entries[firstText].file,
      catalog.entries[secondText].file
    ].sort(),
    "preload must only prepare registered phrases"
  );

  const firstPromise = speech.speak(firstText);
  const firstAudio = findAudioBySuffix("park2_01.mp3");
  assert.ok(firstAudio, "the first prepared clip is selected");
  assert.equal(firstAudio.playCalls, 1, "the first clip starts once");
  assert.equal(FakeAudio.instances.length, 1, "the first phrase creates the reusable player");
  assert.equal(speech.getActiveText(), firstText, "the first phrase becomes active");

  const secondPromise = speech.speak(secondText);
  const firstResult = await firstPromise;
  const secondAudio = findAudioBySuffix("park2_02.mp3");
  assertSpeechResult(firstResult, "cancelled", firstText, "a newer phrase cancels the older phrase");
  assert.ok(firstAudio.pauseCalls >= 1, "latest-wins must pause the older audio");
  assert.equal(firstAudio.currentTime, 0, "latest-wins must rewind the older audio");
  assert.equal(secondAudio, firstAudio, "all phrases must reuse one HTMLAudio player");
  assert.equal(secondAudio.playCalls, 2, "the reusable player starts the latest phrase");
  assert.equal(FakeAudio.instances.length, 1, "latest-wins must not create a second playback element");
  assert.ok(
    secondAudio.emittedEvents.includes("abort"),
    "the regression fixture must reproduce the stale abort emitted by the replaced source"
  );
  assert.equal(speech.getActiveText(), secondText, "only the latest phrase remains active");

  secondAudio.emit("ended");
  assertSpeechResult(await secondPromise, "ended", secondText, "ended settles the active phrase");
  assert.equal(speech.getActiveText(), "", "ended clears active narration");

  const muteText = "ちょうちょ";
  const mutePromise = speech.speak(muteText);
  const muteAudio = findAudioBySuffix("park2_03.mp3");
  assert.equal(speech.getActiveText(), muteText, "mute test phrase starts");
  speech.setMuted(true);
  assertSpeechResult(await mutePromise, "cancelled", muteText,
    "turning mute on cancels active narration");
  assert.ok(muteAudio.pauseCalls >= 1, "turning mute on pauses active audio immediately");
  assert.equal(speech.getActiveText(), "", "mute leaves no active narration");

  const beforeMutedSpeak = FakeAudio.instances.length;
  assertSpeechResult(await speech.speak("ひとで"), "muted", "ひとで",
    "muted narration resolves without playback");
  assert.equal(FakeAudio.instances.length, beforeMutedSpeak, "muted narration creates no media element");
  speech.setMuted(false);
  assert.equal(speech.getActiveText(), "", "unmuting never resumes stale narration");

  const cancelText = "たからばこ";
  const cancelPromise = speech.speak(cancelText);
  const cancelAudio = findAudioBySuffix("ocean2_02.mp3");
  speech.cancel();
  assertSpeechResult(await cancelPromise, "cancelled", cancelText,
    "explicit cancel settles active narration");
  assert.ok(cancelAudio.pauseCalls >= 1, "explicit cancel pauses active audio");
  assert.equal(cancelAudio.currentTime, 0, "explicit cancel rewinds active audio");
  assert.equal(speech.getActiveText(), "", "explicit cancel clears active narration");

  const beforeUnknown = FakeAudio.instances.length;
  assertSpeechResult(await speech.speak("みとうろく"), "unavailable", "みとうろく",
    "an unknown phrase silently reports unavailable");
  assert.equal(FakeAudio.instances.length, beforeUnknown, "an unknown phrase performs no audio fetch");

  FakeAudio.rejectNextPlay = true;
  const blockedText = "さかな";
  assertSpeechResult(await speech.speak(blockedText), "blocked", blockedText,
    "an autoplay/play rejection is contained and reported");
  const blockedAudio = findAudioBySuffix("ocean2_03.mp3");
  assert.ok(blockedAudio.pauseCalls >= 1, "a rejected player is stopped");
  assert.equal(blockedAudio.currentTime, 0, "a rejected player is rewound");
  assert.equal(speech.getActiveText(), "", "a rejected player cannot remain active");

  const recoveryText = "とらくたー";
  const recoveryPromise = speech.speak(recoveryText);
  const recoveryAudio = findAudioBySuffix("farm2_01.mp3");
  assert.equal(recoveryAudio, firstAudio, "recovery keeps using the unlocked player");
  assert.ok(recoveryAudio.playCalls >= 6, "playback can recover after a rejected clip");
  recoveryAudio.emit("ended");
  assertSpeechResult(await recoveryPromise, "ended", recoveryText,
    "the post-rejection phrase completes normally");

  speech.cancel();
  assert.equal(FakeAudio.instances.length, 1, "the full session uses exactly one playback element");
}

async function main() {
  const catalog = assertManifestCoverage();
  assertScriptContract();
  await assertSpeechBehavior(catalog);
  console.log("machigai narration regression: PASS (59 clips, manifest/SHA/API behavior verified)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
