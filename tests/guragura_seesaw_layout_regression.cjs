#!/usr/bin/env node
"use strict";

// guragura-seesaw: シーソー板/右皿レイアウト崩れ修正の静的回帰テスト。
//
// 背景: #plank (styles.css) は `left:50%; width:58%;` のみでセンタリング補正
// (translateX(-50%) 等) が無く、必ず右へオーバーフローして右皿が不可視になっていた
// (初回コミット e46006e77 から存在)。修正は #plankPivot という位置決め専用ラッパーを
// 新設し、#plank から centering を分離する二層構造 (game.js の rAF ループが #plank の
// transform を rotate(θ) で毎フレーム上書きするため、CSS 単体の translateX(-50%) 追加
// では JS 起動直後に消えて修正にならない)。
//
// 実ブラウザでの幾何学的収容検証 (静止/±14度/3ビューポート) は
// tests/e2e/guragura/layout-containment.spec.ts が担当する。本ファイルは Playwright が
// 動かせない CI 経路の保険として、構造上の前提条件をソース静的解析で確認する。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const indexHtml = read("guragura-seesaw/index.html");
const stylesCss = read("guragura-seesaw/styles.css");
const gameJs = read("guragura-seesaw/js/game.js");

let passCount = 0;
function section(name, fn) {
  fn();
  passCount++;
  console.log(`  [OK] ${name}`);
}

console.log("── guragura-seesaw レイアウト回帰テスト ──");

section("index.html: #plankPivot が存在し #plank がその子である", () => {
  const pivotIdx = indexHtml.indexOf('id="plankPivot"');
  assert.ok(pivotIdx !== -1, "#plankPivot が index.html に存在しません");
  const plankIdx = indexHtml.indexOf('id="plank"', pivotIdx);
  assert.ok(plankIdx !== -1 && plankIdx > pivotIdx, "#plank が #plankPivot より後 (= 子) に出現しません");
  // #plank の開始タグと #plankPivot の閉じタグの間に他のトップレベル div 閉じが
  // 挟まらないこと (= 直接の親子関係) を簡易チェックする。
  const between = indexHtml.slice(pivotIdx, plankIdx);
  assert.ok(!/<\/div>\s*<\/div>/.test(between), "#plankPivot と #plank の間に余分な閉じタグがあります (兄弟関係の疑い)");
});

section("styles.css: #plankPivot ブロックに transform: translateX(-50%) が含まれる", () => {
  const m = stylesCss.match(/#plankPivot\s*\{[^}]*\}/);
  assert.ok(m, "#plankPivot ブロックが styles.css に見つかりません");
  assert.ok(/transform:\s*translateX\(-50%\)/.test(m[0]), "#plankPivot に transform: translateX(-50%) がありません");
  assert.ok(/left:\s*50%/.test(m[0]), "#plankPivot に left: 50% がありません");
  assert.ok(/width:\s*58%/.test(m[0]), "#plankPivot の width が 58% ではありません (MAX_ANGLE=14 の収容保証前提が崩れます)");
});

section("styles.css: #plank ブロックに static な translateX / left: 指定が無い (JS rotate 上書きとの衝突防止)", () => {
  const m = stylesCss.match(/(?:^|\n)#plank\s*\{[^}]*\}/);
  assert.ok(m, "#plank ブロックが styles.css に見つかりません");
  assert.ok(!/translateX/.test(m[0]), "#plank ブロックに translateX が混入しています (game.js の rotate(θ) 上書きと衝突し同型バグを再発させます)");
  assert.ok(!/left:\s*50%/.test(m[0]), "#plank ブロックに left:50% が混入しています (centering は親 #plankPivot が担うべきです)");
  assert.ok(/inset:\s*0/.test(m[0]), "#plank は inset:0 で親 (#plankPivot) いっぱいに広がる必要があります");
});

section("game.js: transform 書き込みが 'rotate(' + sim.angle + 'deg)' 単独形式のまま (translateX 合成混入防止)", () => {
  assert.ok(
    /plankEl\.style\.transform\s*=\s*'rotate\(' \+ sim\.angle \+ 'deg\)'/.test(gameJs),
    "game.js の plankEl.style.transform 代入が単独 rotate(...) 形式ではありません (translateX 合成案は仕様書で不採用)"
  );
});

section("game.js: TUT_SEEN_KEY による初回自動チュートリアル起動ロジックが存在する", () => {
  assert.ok(/pono_guragura_tut_seen_v1/.test(gameJs), "TUT_SEEN_KEY 'pono_guragura_tut_seen_v1' が見つかりません");
  assert.ok(/showTutorial\(\)/.test(gameJs), "showTutorial() 呼び出しが見つかりません");
  // startGame 関数の中に TUT_SEEN_KEY 参照があることを確認 (呼び出しタイミングの検証)
  const startGameMatch = gameJs.match(/function startGame\s*\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(startGameMatch, "startGame() 関数本体が見つかりません");
  assert.ok(/TUT_SEEN_KEY/.test(startGameMatch[0]), "startGame() 内に TUT_SEEN_KEY 参照がありません (初回自動表示の実装漏れ)");
});

section("game.js: ドロップ先ハイライト (is-drop-target) が beginDrag/endDrag に実装されている", () => {
  assert.ok(/is-drop-target/.test(gameJs), "is-drop-target クラス操作が見つかりません");
  assert.ok(/panRightEl\.classList\.add\('is-drop-target'\)/.test(gameJs), "beginDrag での is-drop-target 付与が見つかりません");
  assert.ok(/panRightEl\.classList\.remove\('is-drop-target'\)/.test(gameJs), "endDrag での is-drop-target 除去が見つかりません");
});

section("styles.css: .pan-right.is-drop-target / #dragHint のスタイルが定義されている", () => {
  assert.ok(/\.pan-right\.is-drop-target/.test(stylesCss), ".pan-right.is-drop-target ルールが見つかりません");
  assert.ok(/#dragHint/.test(stylesCss), "#dragHint ルールが見つかりません");
});

section("styles.css: .tut-bubble b の強調スタイルが定義されている (TUT_STEPS の <b> 表示用)", () => {
  assert.ok(/\.tut-bubble\s+b\s*\{/.test(stylesCss), ".tut-bubble b ルールが見つかりません");
});

section("game.js: TUT_STEPS が視覚的対応の取れた文言に更新されている", () => {
  assert.ok(/みぎの おさら/.test(gameJs), "「みぎの おさら」を含む文言ステップが見つかりません");
  assert.ok(/<b>みぎの おさら<\/b>/.test(gameJs), "<b>みぎの おさら</b> の強調マークアップが見つかりません");
});

console.log(`\n全 ${passCount} セクション green.`);
