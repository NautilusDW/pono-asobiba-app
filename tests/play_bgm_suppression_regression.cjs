"use strict";

// batch:1242 regression: ガチャ/おみせ画面中にタイトル BGM (play-bgm) が
// タブ復帰 (visibilitychange) 等の無条件 resume 経路で二重再生される実機バグの根治確認。
//   1. 単一調停点 isTopBgmSuppressed() が存在し、フラグ + DOM 開閉の両方 (OR) を見る
//   2. tryPlay() 冒頭に抑止ガードがあり、抑止中は play() せず resume 予約フラグを立てる
//   3. visibilitychange 復帰経路が tryPlay() 経由 (= ガードを通る) のまま
//   4. pauseTopBgmFor* が data-pono-force-paused を立て、 PonoVisibilityAudioGuard の
//      safety-net replay (common/preload-helper.js) がそれを尊重する
//   5. 正当復帰 (resumeTopBgmAfter*) はガードを bypass して bgm.play() を直接呼ぶ構造が残る
// バージョン番号 (v21XX) には依存しない。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "play.html"), "utf8");
const helper = fs.readFileSync(path.join(root, "common", "preload-helper.js"), "utf8");

// ---------- helpers ----------
function extract(src, startMarker, endMarker, label) {
  const start = src.indexOf(startMarker);
  assert.ok(start >= 0, label + ": start marker not found (" + startMarker + ")");
  const end = src.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, label + ": end marker not found (" + endMarker + ")");
  return src.slice(start, end);
}

function makeBgmMock(initial) {
  const bgm = {
    paused: initial && initial.paused !== undefined ? initial.paused : true,
    preload: "none",
    playCalls: 0,
    pauseCalls: 0,
    attrs: {},
    play() {
      this.playCalls++;
      this.paused = false;
      // play 成功を同期 resolve 相当で通知 (markUnlocked / markTopBgmUnlocked 検証用)
      return {
        then(fn) { if (typeof fn === "function") fn(); return this; },
        catch() { return this; }
      };
    },
    pause() { this.pauseCalls++; this.paused = true; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    removeAttribute(k) { delete this.attrs[k]; },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  };
  return bgm;
}

// ---------- 1. 静的構造 assert ----------

// 単一調停点の存在 + フラグと DOM の両方を見ている
const suppressedFn = extract(html, "function isTopBgmSuppressed()", "\n    }", "isTopBgmSuppressed") + "\n    }";
assert.match(suppressedFn, /dailyGachaAudio\.pausedTopBgm\s*\|\|\s*donguriShopAudio\.pausedTopBgm/,
  "isTopBgmSuppressed must check both suppressor flags");
assert.match(suppressedFn, /dailyGachaModal\s*&&\s*!dailyGachaModal\.hidden/,
  "isTopBgmSuppressed must also check the gacha modal DOM open state (flag-drift defense)");
assert.match(suppressedFn, /getElementById\(\s*['"]donguriShop['"]\s*\)/,
  "isTopBgmSuppressed must also check the shop DOM open state (flag-drift defense)");

// tryPlay 冒頭ガード: play() より前に isTopBgmSuppressed を見る
const tryPlaySrc = extract(html, "function tryPlay() {", "\n      }", "tryPlay") + "\n      }";
const guardIdx = tryPlaySrc.indexOf("isTopBgmSuppressed");
const playIdx = tryPlaySrc.indexOf("bgm.play()");
assert.ok(guardIdx >= 0, "tryPlay must consult isTopBgmSuppressed");
assert.ok(playIdx > guardIdx, "tryPlay guard must run before bgm.play()");

// visibilitychange 復帰経路は tryPlay() 経由のまま (= ガードを通る)
assert.match(html,
  /document\.addEventListener\('visibilitychange',\s*\(\)\s*=>\s*\{\s*if\s*\(document\.hidden\)\s*bgm\.pause\(\);\s*else if\s*\(isUnlocked\(\)\)\s*tryPlay\(\);\s*\}\);/,
  "the top-BGM visibilitychange resume path must go through the guarded tryPlay()");

// pause 側: guard の safety-net replay を封鎖する data-pono-force-paused を立てる
const pauseGacha = extract(html, "function pauseTopBgmForDailyGacha()", "\n    }", "pauseTopBgmForDailyGacha");
assert.match(pauseGacha, /setAttribute\(\s*['"]data-pono-force-paused['"]\s*,\s*['"]1['"]\s*\)/,
  "pauseTopBgmForDailyGacha must set data-pono-force-paused");
const pauseShop = extract(html, "function pauseTopBgmForDonguriShop()", "\n    }", "pauseTopBgmForDonguriShop");
assert.match(pauseShop, /setAttribute\(\s*['"]data-pono-force-paused['"]\s*,\s*['"]1['"]\s*\)/,
  "pauseTopBgmForDonguriShop must set data-pono-force-paused");

// resume 側 (正当復帰) は bgm.play() を直接呼びガードを bypass、 attr も解除する
const resumeGacha = extract(html, "function resumeTopBgmAfterDailyGacha()", "\n    }", "resumeTopBgmAfterDailyGacha");
assert.match(resumeGacha, /removeAttribute\(\s*['"]data-pono-force-paused['"]\s*\)/,
  "resumeTopBgmAfterDailyGacha must clear data-pono-force-paused");
assert.match(resumeGacha, /bgm\.play\(\)/, "resumeTopBgmAfterDailyGacha must keep the direct play() bypass");
const resumeShop = extract(html, "function resumeTopBgmAfterDonguriShop()", "\n    }", "resumeTopBgmAfterDonguriShop");
assert.match(resumeShop, /removeAttribute\(\s*['"]data-pono-force-paused['"]\s*\)/,
  "resumeTopBgmAfterDonguriShop must clear data-pono-force-paused");
assert.match(resumeShop, /bgm\.play\(\)/, "resumeTopBgmAfterDonguriShop must keep the direct play() bypass");

// 閉時の正当復帰経路は温存されている
const closeGacha = extract(html, "function closeDailyGacha()", "\n    }", "closeDailyGacha");
assert.match(closeGacha, /resumeTopBgmAfterDailyGacha\(\)/, "closeDailyGacha must still resume the top BGM");
const hideShopSrc = extract(html, "function hideShop()", "\n    }", "hideShop");
assert.match(hideShopSrc, /resumeTopBgmAfterDonguriShop\(\)/, "hideShop must still resume the top BGM");

// review fix (1): resume 直接 play() 成功時の解禁記録 — 共通ヘルパーが存在し、両 resume が使う
assert.match(html, /function markTopBgmUnlocked\(\)/,
  "the shared unlock-recording helper markTopBgmUnlocked must exist");
assert.match(resumeGacha, /p\.then\(markTopBgmUnlocked\)/,
  "resumeTopBgmAfterDailyGacha must record audio unlock on successful direct play()");
assert.match(resumeShop, /p\.then\(markTopBgmUnlocked\)/,
  "resumeTopBgmAfterDonguriShop must record audio unlock on successful direct play()");

// cross-file 契約: preload-helper.js の safety-net replay は data-pono-force-paused を尊重する
assert.match(helper, /data-pono-force-paused/,
  "preload-helper.js must keep honoring the data-pono-force-paused contract");
assert.ok((helper.match(/getAttribute\(\s*['"]data-pono-force-paused['"]\s*\)\s*===\s*['"]1['"]/g) || []).length >= 1,
  "tryReplayMedia must skip elements tagged data-pono-force-paused=1");

// ---------- 2. 挙動 assert (vm 実行) ----------

// pause/resume/isTopBgmSuppressed 一式を抜き出して sandbox で駆動
const blockStart = "function topBgmForDailyGacha() {";
const blockEnd = "// v1699: shop 専用 BGM";
const bgmBlock = extract(html, blockStart, blockEnd, "top-BGM control block");

function runBlock(setup) {
  const bgm = makeBgmMock({ paused: setup.bgmPaused });
  const shopEl = { hidden: setup.shopHidden !== undefined ? setup.shopHidden : true };
  const session = {};
  const ctx = {
    dailyGachaAudio: Object.assign({ pausedTopBgm: false, resumeTopBgm: false }, setup.gachaAudio),
    dailyGachaModal: { hidden: setup.gachaModalHidden !== undefined ? setup.gachaModalHidden : true },
    dailyGachaSoundMuted: () => !!setup.muted,
    // review fix (b): shop 側 resume が参照する mute 判定の stub。 抽出ブロック外で
    // 定義される関数のため、 供給しないと将来の評価順変更で ReferenceError になる。
    _shopBgmIsMuted: () => !!setup.muted,
    localStorage: { getItem: () => (setup.muted ? "1" : null) },
    sessionStorage: {
      setItem(k, v) { session[k] = String(v); },
      getItem(k) { return k in session ? session[k] : null; }
    },
    __session: session,
    document: {
      getElementById(id) {
        if (id === "play-bgm") return bgm;
        if (id === "donguriShop") return shopEl;
        return null;
      }
    }
  };
  const api = vm.runInNewContext(
    bgmBlock +
    "\n;({ pauseTopBgmForDailyGacha, resumeTopBgmAfterDailyGacha, pauseTopBgmForDonguriShop," +
    " resumeTopBgmAfterDonguriShop, isTopBgmSuppressed, markTopBgmUnlocked, donguriShopAudio });",
    ctx
  );
  if (setup.shopAudio) Object.assign(api.donguriShopAudio, setup.shopAudio);
  return { api, bgm, ctx, shopEl };
}

// 2a. フラグ経由の抑止判定
{
  const { api } = runBlock({ gachaAudio: { pausedTopBgm: true } });
  assert.equal(api.isTopBgmSuppressed(), true, "gacha flag alone must suppress");
}
{
  const { api } = runBlock({ shopAudio: { pausedTopBgm: true } });
  assert.equal(api.isTopBgmSuppressed(), true, "shop flag alone must suppress");
}
// 2b. フラグ drift (フラグ false でも DOM が開いていれば抑止)
{
  const { api } = runBlock({ gachaModalHidden: false });
  assert.equal(api.isTopBgmSuppressed(), true, "open gacha modal DOM must suppress even if flags drifted");
}
{
  const { api } = runBlock({ shopHidden: false });
  assert.equal(api.isTopBgmSuppressed(), true, "open shop DOM must suppress even if flags drifted");
}
// 2c. 全部閉じていれば非抑止
{
  const { api } = runBlock({});
  assert.equal(api.isTopBgmSuppressed(), false, "no suppressor -> not suppressed");
}
// 2d. pause -> force-paused attr、 resume -> attr 解除 + play (正当復帰)
{
  const { api, bgm, ctx } = runBlock({ bgmPaused: false });
  api.pauseTopBgmForDailyGacha();
  assert.equal(bgm.paused, true, "gacha open must pause the top BGM");
  assert.equal(bgm.getAttribute("data-pono-force-paused"), "1",
    "gacha open must tag force-paused so the visibility guard cannot revive the top BGM");
  ctx.dailyGachaModal.hidden = true; // closeDailyGacha は resume 前に hidden=true する実装順
  api.resumeTopBgmAfterDailyGacha();
  assert.equal(bgm.getAttribute("data-pono-force-paused"), null, "gacha close must clear force-paused");
  assert.equal(bgm.playCalls, 1, "gacha close must resume the top BGM (bypassing the guard)");
  assert.equal(ctx.dailyGachaAudio.pausedTopBgm, false, "flags must be cleared after resume");
}
// 2e. gacha 内から shop を開閉しても、 gacha が開いている限り resume されない
{
  const { api, bgm, ctx } = runBlock({ bgmPaused: false, gachaModalHidden: false });
  api.pauseTopBgmForDailyGacha();
  api.pauseTopBgmForDonguriShop(); // gacha 内オーバーレイで shop open
  api.resumeTopBgmAfterDonguriShop(); // shop close (gacha はまだ開いている)
  assert.equal(bgm.playCalls, 0, "closing the shop inside the gacha must NOT resume the top BGM");
  assert.equal(bgm.getAttribute("data-pono-force-paused"), "1",
    "force-paused must survive while another suppressor is active");
  ctx.dailyGachaModal.hidden = true;
  api.resumeTopBgmAfterDailyGacha();
  assert.equal(bgm.playCalls, 1, "closing the gacha afterwards must resume the top BGM");
}
// 2f. muted 中は resume しない (既存挙動の非破壊)
{
  const muted = runBlock({ bgmPaused: false, muted: true });
  muted.api.pauseTopBgmForDailyGacha();
  muted.ctx.dailyGachaModal.hidden = true;
  muted.api.resumeTopBgmAfterDailyGacha();
  assert.equal(muted.bgm.playCalls, 0, "muted close must not resume the top BGM");
}

// 2h. review fix (a): open 前から BGM 停止 (非ミュート) なら close で復帰しない
{
  const { api, bgm, ctx } = runBlock({ bgmPaused: true, muted: false });
  api.pauseTopBgmForDailyGacha(); // resumeTopBgm = !paused = false が捕捉される
  ctx.dailyGachaModal.hidden = true;
  api.resumeTopBgmAfterDailyGacha();
  assert.equal(bgm.playCalls, 0,
    "BGM already stopped before open (unmuted) must NOT auto-start on close");
  assert.equal(bgm.getAttribute("data-pono-force-paused"), null,
    "force-paused must still be cleared on close even when not resuming");
}
// 2i. review fix (2): クロス順序 close (ガチャ→おみせと開き、 ガチャを先に閉じる)
//     でも resume 意図が残存抑止者へ引き継がれ、 最後の close で復帰する
{
  const { api, bgm, ctx } = runBlock({ bgmPaused: false, gachaModalHidden: false });
  api.pauseTopBgmForDailyGacha(); // BGM 再生中に gacha open -> resumeTopBgm=true
  api.pauseTopBgmForDonguriShop(); // shop open (BGM は既に停止 -> shop 側 resumeTopBgm=false)
  ctx.dailyGachaModal.hidden = true; // ガチャを先に閉じる
  api.resumeTopBgmAfterDailyGacha();
  assert.equal(bgm.playCalls, 0, "closing the gacha first must not resume while the shop is open");
  assert.equal(api.donguriShopAudio.resumeTopBgm, true,
    "the gacha's resume intent must be handed off to the still-open shop");
  api.resumeTopBgmAfterDonguriShop(); // 最後におみせを閉じる
  assert.equal(bgm.playCalls, 1, "closing the last suppressor must resume the top BGM (handed-off intent)");
}
//     対称ケース: shop 側の意図をガチャへ引き継ぐ
{
  const { api, bgm, ctx } = runBlock({ bgmPaused: false });
  api.pauseTopBgmForDonguriShop(); // BGM 再生中に shop open -> shop resumeTopBgm=true
  ctx.dailyGachaModal.hidden = false; // その上に gacha open (DOM)
  api.pauseTopBgmForDailyGacha(); // gacha 側 resumeTopBgm=false (既に停止中)
  api.resumeTopBgmAfterDonguriShop(); // shop を先に閉じる (gacha はまだ開いている)
  assert.equal(bgm.playCalls, 0, "closing the shop first must not resume while the gacha is open");
  assert.equal(ctx.dailyGachaAudio.resumeTopBgm, true,
    "the shop's resume intent must be handed off to the still-open gacha");
  ctx.dailyGachaModal.hidden = true;
  api.resumeTopBgmAfterDailyGacha();
  assert.equal(bgm.playCalls, 1, "closing the gacha last must resume the top BGM (handed-off intent)");
}
// 2j. review fix (1): resume の直接 play() が成功したら音声解禁が記録される
//     (ミュート開始→ガチャ中 unmute→close で tryPlay の markUnlocked に届かない穴の補完)
{
  const { api, bgm, ctx } = runBlock({ bgmPaused: false });
  api.pauseTopBgmForDailyGacha();
  ctx.dailyGachaModal.hidden = true;
  api.resumeTopBgmAfterDailyGacha();
  assert.equal(bgm.playCalls, 1, "sanity: resume must play");
  assert.equal(ctx.__session["pono_audio_unlocked"], "1",
    "successful direct resume play() must record the audio unlock (markTopBgmUnlocked)");
}
{
  const { api, bgm, ctx } = runBlock({ bgmPaused: false });
  api.pauseTopBgmForDonguriShop();
  api.resumeTopBgmAfterDonguriShop();
  assert.equal(bgm.playCalls, 1, "sanity: shop resume must play");
  assert.equal(ctx.__session["pono_audio_unlocked"], "1",
    "successful direct shop resume play() must record the audio unlock (markTopBgmUnlocked)");
}

// 2g. tryPlay: 抑止中は play せず resume 予約、 非抑止では play する
{
  const tryPlayBody = extract(html, "function tryPlay() {", "\n      }", "tryPlay body") + "\n      }";
  function runTryPlay(suppressed, gachaFlag, shopFlag) {
    const bgm = makeBgmMock({ paused: true });
    const ctx = {
      bgm,
      isMuted: () => false,
      markUnlocked: () => {},
      isTopBgmSuppressed: () => suppressed,
      dailyGachaAudio: { pausedTopBgm: gachaFlag, resumeTopBgm: false },
      donguriShopAudio: { pausedTopBgm: shopFlag, resumeTopBgm: false }
    };
    vm.runInNewContext(tryPlayBody + "\n;tryPlay();", ctx);
    return { bgm, ctx };
  }
  const blocked = runTryPlay(true, true, false);
  assert.equal(blocked.bgm.playCalls, 0, "tryPlay must NOT start the top BGM while suppressed");
  assert.equal(blocked.ctx.dailyGachaAudio.resumeTopBgm, true,
    "suppressed tryPlay must arm the resume intent for the active suppressor");
  assert.equal(blocked.ctx.donguriShopAudio.resumeTopBgm, false,
    "inactive suppressor must not be armed");
  const open = runTryPlay(false, false, false);
  assert.equal(open.bgm.playCalls, 1, "unsuppressed tryPlay must still start the top BGM");
}

console.log("play top-BGM suppression regression: PASS");
