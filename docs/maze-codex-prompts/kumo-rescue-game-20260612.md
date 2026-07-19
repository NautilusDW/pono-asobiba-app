# Codex 指示文書: クモの巣 (web_sweep) ミニゲームを「救出物語」にリメイク

作成日: 2026-06-12 (改訂: 前回レビュー指摘の blocker 4 / major 7 / minor 4 を反映)
対象ブランチ: develop
配信: Cloudflare Workers (`wrangler deploy --env staging` → https://pono-asobiba-staging.ndw.workers.dev/)
本番: https://pono.kodama-no-mori.com/

---

## 1. メタ情報

- **採用案**: 案A 救出系の確定物語
- **対象ファイル**:
  - `d:\AppDevelopment\pono-asobiba-app\maze\index.html`
  - `d:\AppDevelopment\pono-asobiba-app\sw.js` (CACHE_VERSION bump 必須)
- **検証 URL (staging)**: `https://pono-asobiba-staging.ndw.workers.dev/maze/`
- **検証手順**:
  1. `wrangler deploy --env staging` (staging 専用、 production は触らない)
  2. staging URL を開く → maze に進入
  3. ほうき取得 → クモの巣に進入 → ミニゲーム開始 → クリアまで再現
  4. DevTools で `sw.js` の `CACHE_VERSION` 更新確認
  5. `prefers-reduced-motion: reduce` ON で振動・粒子・蝶アニメが無効化されることを確認

---

## 2. ストーリー (整合性のため厳守)

> クモが自分で張った巣に絡まっちゃった。 通りすがりのポノに「たすけて〜」 と聞こえてくる。
> ほうきで 3 層 (絡まり方が強い順) を順にやさしく払う → クモが解放されて
> 「ありがとう、 ちょうど さんぽに いきたかったの!」 → 空の蝶のお友達のところへ飛んでいく。

**整合性ポイント (厳守):**
- クモは敵じゃない、 困ってる住人 (defeat ではなく rescue)
- ほうき = クモを傷つけない、 絡まりだけ払う
- 蝶は最初から画面端 (空) にいる背景キャラとして導入、 突然湧かない
- 失敗概念ゼロ (タイマー無し、 詰まない、 ストローク数制限無し)

---

## 3. 改修対象ファイル (詳細)

| ファイル | 改修箇所概要 |
| --- | --- |
| `maze/index.html` | 定数 (L6451-L6489)、 ダイアログ (L3844-L3846, L3904-L3907, L4656-L4657, L4923-L4925, L5076-L5077, L5183, L5195, L6498, L6501, L6527, L6564, L6582-L6595, L6782-L6783)、 関数 (L6491-L7088 一帯)、 CSS (L1712-L2017 内 `.enc-result` 拡張) |
| `sw.js` | `CACHE_VERSION` を現状値 +1 |

---

## 4. 現状把握 (前段調査結果サマリ)

### 4.1 定数
- `WEB_SWEEP_THREAD_BLUEPRINTS` (L6451-L6487): IIFE で生成、 内側→外側スポーク 11 本 + リング 5 段 × 11 本 = **66 本**
- `WEB_SWEEP_CLEAR_TARGET = 16` (L6488) — **撤廃対象**
- `WEB_SWEEP_MAX_DETACH_PER_STROKE = 2` (L6489) — **撤廃対象**

### 4.2 主要関数 (行番号引用)
- `_showWebSweepGame()` (L6491): DOM 構築 + state 生成 + pointer イベント登録 (handler はインライン)
- `_resizeWebSweepCanvas` (L6617) / `_layoutWebSweepThreads` (L6636) / `_setWebSweepStatus` (L6650)
- `_startWebSweepLoop(gs)` (L6656): RAF ループ
- `_updateWebSweepPhysics(gs, dt)` (L6672): broom 追従 + spring + particle 更新
- `_applyWebBroomSweep(gs, x, y, dx, dy, dt)` (L6744): sweep 加算 + threshold 超で detach
- `_detachWebThread` (L6787): 糸切離 + particle + SFX + `CLEAR_TARGET` 到達で `_finishWebSweepGame`
- `_drawWebSweepGame(gs, now)` (L6821) / `_drawWebSweepThread` (L6869)
- `_drawWebSpider(g, w, h, now)` (L6926): クモ手描き (PNG 不使用)
- `_drawWebBroom(g, x, y, angle, minDim)` (L6960): ほうき手描き
- `_playWebStickySfx(kind)` (L7003): Web Audio SFX
- `_finishWebSweepGame` (L7023, 現状内部 `_webGimmickSetTimeout(_resolveWebSweepGame, 720)` L7038): locked + 残糸 detach + `correct.mp3` 再生
- `_resolveWebSweepGame` (L7041, 結果 DOM 注入 L7050-L7054): 結果モーダル + `_closeEncounter(true)`

### 4.3 State 構造 (`_webGameState` L6509-L6546)
```
{ stageEl, canvas, ctx, statusEl, w, h, dpr,
  dragging, locked, pointerId, lastPointer,
  strokeDistance, strokeDetachCount, detachedCount,
  lastSfxAt, lastTs, rafId, status,
  broom:{x,y,tx,ty,vx,vy,angle},
  threads:[{index,def,ax,ay,bx,by,cx,cy,pullX,pullY,vx,vy,sweep,tension,stick,detached,detachAge,opacity,phase,thickness?,threshold?}],
  particles:[...], ripples:[...] }
```

### 4.4 物理 ratio (ハードコード現状値)
- broom 追従: `dt/62` (L6674-L6675)
- 糸復元バネ: `gs.dragging ? 7.5 : 12.5`、 減衰 `0.72^(dt/16)` (L6686-L6694)
- sweep ヒット半径: `max(30, min(w,h)*0.105)` (L6749)
- sweep 増分: `min(0.055, (drag/190 + speed/9300)*weight)` (L6769)
- particle 上限 80 (L6814)

### 4.5 既存アセット (流用可能)
- `assets/images/word/kumo.png` `kumo_s1.png` `kumo_s2.png` — 絵本タッチクモ (web_sweep 内では未参照、 表情拡張は手描き Canvas で行う)
- `assets/images/quizland/illust/choice/chocho.png` — 蝶 PNG (1 種のみ存在、 3 匹の蝶演出はすべて同一アセットを使い、 位置と sway phase で個性付け)

---

## 5. 改修要件

### 5.A. 物語・ダイアログ刷新

#### A-1. 上流側 (エンカウンタ前) ダイアログ更新
| 行 | 現状 | 改修後 |
| --- | --- | --- |
| L3844 (creature 名) | `'クモムシ'` | `'クモさん'` (敵感を消す) |
| L3845 (`CREATURE_KIND_DATA.kumo.dialog`) | `'くものすで とおせんぼ！<br>ほうきで いとを ほどけるかな？'` | `'あ、 クモさんが じぶんで はった<br>くものすに からまっちゃった！<br>ほうきで そっと はらって、 たすけてあげよう。'` |
| L3846 (`defeatDialog`) | `'いとが ほどけたね！\nとおって いいよ。'` | `'たすけてくれて ありがとう！\nちょうど さんぽに いきたかったの！'` |
| L4923-L4925 (障害物バウンス) | `'くものすが からまって とおれないよ！'` / `'🧹 いとを はらえる どうぐが あれば、とおれるかも。'` | `'クモさんが くものすに からまって こまってる！'` / `'🧹 ほうきが あれば たすけられるかも。'` |
| L5076 (`_triggerWebGimmickEncounter`) | `'くものすで とおせんぼ！<br>ほうきを もってるね。<br>いとを ほどけたら とおしてあげる！'` | `'クモさんが じぶんの くものすに からまっちゃった！<br>ほうきが あるね。<br>そっと はらって たすけてあげよう！'` |
| L5077 | `'いとが ほどけたね！<br>とおって いいよ。'` | `'たすけてくれて ありがとう！<br>ちょうど さんぽに いきたかったの！'` |
| L5195 (`_GAME_DIALOGS.web_sweep`) | `'からまった いとを<br>ほうきで やさしく はらおう'` | `'クモさんを たすけよう！<br>ほうきで そっと はらってね'` |
| L5183 (`_GAME_LABELS.web_sweep`) | `'くものすはらい'` | `'クモさん きゅうしゅつ'` |
| L6498 (ゲーム title) | `'くものすを はらおう！'` | `'クモさんを たすけよう！'` |
| L6501 (stage-note) | `'ほうきを すーっと うごかしてね'` | `'ほうきを ひだり みぎに うごかして いとを はらってね'` |

> **作業手順 (minor 14):** ダイアログ書き換え後、 `Grep "クモムシ"` を `maze/index.html` 全体に対して実行し、 ヒットが 0 件であることを確認。 1 件でも残っている場合はすべて `'クモさん'` に置換する。

#### A-2. 進行ステータス文字列 (state.currentLayer 連動) — 既存 5 文字列を確実に置換

下表は **既存行の置換マップ**。 Codex は該当行番号を直接 Edit すること (該当文字列が見当たらない場合は前後の文脈を頼りに探索)。

| 行 | 旧文字列 | 新文字列 | コンテキスト |
| --- | --- | --- | --- |
| L6527 (init) | `'クモさんの まわりを やさしく はらってね'` (B-1 のダイアログ刷新後の値、 既に A-1 で適用済み想定) | そのまま (init 用) | state 初期化時 |
| L6564 (endDrag 完了系) | `'そのまま すーっと はらってね'` | `'やさしく ふきとって あげて、 そう、 そのまま すーっと'` | ストローク終了直後フォロー |
| L6592 (短ストローク警告) | `'タップより、ほうきを うごかしてね'` | `'ちょんちょんじゃなくて、 すーっと はらってね'` | endDrag 内 strokeDistance < 18 判定 (この判定行は残置、 文言だけ救出物語版に) |
| L6595 (絡まり再試行) | `'からまった ところを もういちど'` | `'もう いちど やさしく ふきとってあげて'` | 進行が止まっている時のヒント |
| L6782 (層ほぼ終了) | `'あと すこし！ びよーんとはらおう'` | `'あと すこし！ クモさん もう ちょっとだよ'` | _applyWebBroomSweep 内 status 更新 (本ファイルでは別ハンドラに移植、 旧行は削除) |
| L6783 (糸進行) | `'いいね！ いとが のびてるよ'` | `'そう、 そのちょうし! いとが ゆるんできた'` | 同上 |

#### A-2 補足: 層別 status 上書き (新規 pointermove ハンドラから呼び出し)
| トリガ | 文字列 |
| --- | --- |
| 層 0 進行中 | `'クモさんの まわりを やさしく はらってね'` |
| 層 0 クリア時 | `'いいね！ ふとい いとが ほどけた'` |
| 層 1 進行中 | `'もう ちょっと! キラキラ のこってる'` (前回 minor 16 適用、 短縮版) |
| 層 1 クリア時 | `'あと すこし！ クモさん もう ちょっとだよ'` (L6782 の新文言を再利用) |
| 層 2 進行中 | `'そう、 そのちょうし! いとが ゆるんできた'` (L6783 の新文言を再利用) |
| 層 2 クリア (最終) | `'クモさん、 でられたよ！'` |

#### A-3. 結果モーダル DOM 仕様 (`_resolveWebSweepGame` L7050-L7054)
現状の単一テキスト innerHTML 注入を **title / body / meta 三段構造** に置換。 Codex は以下の HTML をそのまま innerHTML に代入すること:

```html
<div class="enc-result win">
  <div class="enc-result-title">クモさん、たすかった！</div>
  <div class="enc-result-emoji">🕷️</div>
  <div class="enc-result-body">「ありがとう、 ちょうど さんぽに いきたかったの！」</div>
  <div class="enc-result-meta">クモの おともだち (蝶) が むかえに きたよ</div>
</div>
```

#### A-4. CSS 追加 (`.enc-result` 既存 class 内、 L1712-L2017 帯)
既存 `.enc-result` セレクタの直後 (または同 class 群の末尾) に以下を追記:

```css
.enc-result-title {
  font-size: clamp(1.1rem, 4vw, 1.4rem);
}
.enc-result-body {
  font-size: clamp(0.9rem, 3vw, 1.05rem);
  margin-top: 8px;
}
.enc-result-meta {
  font-size: 0.78rem;
  opacity: 0.8;
  margin-top: 6px;
}
```

#### A-5. ほうきヒント (L3904-L3907) は維持で OK
title `'ほうきを てにいれた！'` / body はそのまま。

---

### 5.B. ゲームメカニクス (3 層構造)

#### B-1. 定数の置換 (L6451-L6489)
- `WEB_SWEEP_THREAD_BLUEPRINTS` の生成ロジックを **3 層構造** に変更:
  ```js
  // 層 0: 太い灰糸 8 本 (絡まり強)
  // 層 1: 細い白糸 6 本 (中)
  // 層 2: キラキラ薄膜 4 本 (弱)
  const WEB_SWEEP_LAYERS = [
    { layer: 0, count: 8, color: '#8a8a8a', thickRatio: 0.020, threshold: 1.1, sparkleColor: '#bbb' },
    { layer: 1, count: 6, color: '#ffffff', thickRatio: 0.014, threshold: 1.0, sparkleColor: '#e8e8ff' },
    { layer: 2, count: 4, color: '#fff6c8', thickRatio: 0.008, threshold: 0.9, sparkleColor: '#ffe89a' },
  ];
  // 各層内は等間隔で配置 (放射状、 cx=0.5 cy=0.5 中心)
  // 各糸の def には layer プロパティを必ず含める
  // 層別 spring 定数は B-2 / G-1 の LAYER_SPRING_DRAG / LAYER_SPRING_REST を別途参照
  const LAYER_SPRING_DRAG = [6.5, 8.5, 10.5];  // 層が進むほど追従キビキビ
  const LAYER_SPRING_REST = [8.5, 10.5, 12.5]; // 同上 (静止時の戻り)
  ```
- `WEB_SWEEP_CLEAR_TARGET = 16` を **削除** (層単位進行に変更)
- `WEB_SWEEP_MAX_DETACH_PER_STROKE = 2` を **削除**
- 半径 ratio: `0.105` (L6749) → **`0.13`** に拡大 (子供向け緩和)
- `_layoutWebSweepThreads` (L6636) で各糸の `def.layer` を以下基準で付与:
  - `i < 8` → layer 0
  - `8 <= i < 14` → layer 1
  - `i >= 14` → layer 2

#### B-2. State 拡張 (L6509-L6546 内、 既存プロパティは削除しない)
追加プロパティ:
```js
{
  // ↓ 既存 (strokeDistance / strokeDetachCount / detachedCount / lastSfxAt) は
  //   互換のため残置。 新しい layer ベースロジックでは参照しない (旧コード互換用)。
  currentLayer: 0,           // 現在処理中の層 (0..2)
  strokeCounter: [0, 0, 0],  // 各層の左右往復累積カウント
  lastDirX: null,            // 直前 pointermove の dx 符号 (反転検知用、 0 でなく null 初期化で初回 NaN を回避)
  butterflies: [             // クリア演出用、 最初から画面端に配置
    { asset: 'chocho.png', initX: -0.08, targetX: 0.25, scale: 0.9,  sway: 0.0, visible: true },
    { asset: 'chocho.png', initX:  1.08, targetX: 0.55, scale: 1.0,  sway: 1.2, visible: true },
    { asset: 'chocho.png', initX: -0.05, targetX: 0.78, scale: 0.85, sway: 2.4, visible: true },
  ],
  spiderEmotion: 0,          // 0=困り, 1=ほっ, 2=笑顔
  layerClearAt: [0, 0, 0],   // 層クリア時刻 (演出用)
  lastVibrateAt: 0,          // ハプティック throttle 用 (E-4 / major 10)
  pointerTrail: [],          // 軌跡描画 (max 12)
}
```

> **major 7 互換注意:** state の `strokeDistance` / `strokeDetachCount` / `detachedCount` / `lastSfxAt` は **削除しない**。 新ロジックは参照しないことを `// (legacy, not used in layer logic)` コメントで明記して残置する。 endDrag 内 L6591 の `if (strokeDistance < 18) {...}` 判定は **残置**、 内側の status 文言だけ A-2 表に従って置換 (`'ちょんちょんじゃなくて、 すーっと はらってね'`)。

#### B-3. 進行ロジック差し替え (`_applyWebBroomSweep` L6744 改造) — blocker 4
**現行ロジックの撤廃手順:**
- L6772 周辺の以下行を **削除**:
  ```js
  if (gs.strokeDetachCount >= WEB_SWEEP_MAX_DETACH_PER_STROKE) return;
  ```
- L6781-L6783 周辺の `remain` ベース status 文字列更新 (旧 `'あと すこし！ びよーんとはらおう'` / `'いいね！ いとが のびてるよ'` セットしている分岐) を **削除**。 status 更新は別の pointermove ハンドラ (層別文言) で行う。
- 糸対象フィルタを以下に置換:
  ```js
  const targets = gs.threads.filter(t => !t.detached && t.def.layer === gs.currentLayer);
  // 以下 sweep 加算は targets に対してのみ
  ```
  `t.def.layer` は `_layoutWebSweepThreads` (L6636) で B-1 の i<8 / 8<=i<14 / i>=14 ルールに従い付与済み。

**pointermove ハンドラ内の strokeCounter 追加コード (major 9 — 正確版):**
挿入位置: `_showWebSweepGame` 内のインライン pointermove ハンドラ、 **`gs.lastPointer` を更新する直前**。

```js
const p = _webSweepPointer(canvas, e);
const prev = gs.lastPointer || p;
const dx = p.x - prev.x;
const currentDir = dx > 0.3 ? 1 : dx < -0.3 ? -1 : 0;
if (currentDir !== 0 && gs.lastDirX !== null && currentDir !== gs.lastDirX) {
  gs.strokeCounter[gs.currentLayer] = (gs.strokeCounter[gs.currentLayer] || 0) + 1;
  if (gs.strokeCounter[gs.currentLayer] >= 5) _onWebSweepLayerCleared(gs);
}
if (currentDir !== 0) gs.lastDirX = currentDir;
// ↓ ここから既存の broom 追従と _applyWebBroomSweep 呼び出しはそのまま続行
```

**`_onWebSweepLayerCleared(gs)` (新規関数):**
- 該当層 (`gs.currentLayer`) の糸を 300ms フェードアウト → detach (`t.detached = true; t.detachAge = 0;`)
- `_spawnLayerSparkle(gs, gs.currentLayer)` で sparkle 粒子 8 個放射 (E-2)
- `gs.spiderEmotion = Math.min(2, gs.spiderEmotion + 1)` (進行 0→1→2)
- `_playMzSePitch('correct', 2 * gs.currentLayer)` (+200cent × layer、 E-1 / minor 13)
- `_vibrate(30)` (E-4 / major 10)
- status 文字列を A-2 補足表に従って更新 (`_setWebSweepStatus(gs, '...クリア時文言...')`)
- `gs.layerClearAt[gs.currentLayer] = performance.now()`
- `gs.currentLayer++`
- `gs.currentLayer >= 3` で `_finishWebSweepGame(gs)` 呼び出し

`_detachWebThread` (L6787) の `CLEAR_TARGET` 判定 (L6800 前後想定) は削除し、 層単位完了に置換。

---

### 5.C. クモの表情 3 段階 (procedural) — minor 12

`_drawWebSpider(g, w, h, now)` (L6926) を表情パラメータ対応に拡張。 **呼び出し側 L6865 の修正も明示:**

```js
// 旧: _drawWebSpider(g, w, h, now)
// 新: _drawWebSpider(g, w, h, now, gs.spiderEmotion)
// 注: state ではなく gs (関数引数で受けている current state) を渡す
```

| spiderEmotion | 状態 | 描画パラメータ |
| --- | --- | --- |
| 0 | 困り | 眉八の字 (内側下がり)、 口は `-` 状 (small downward arc)、 涙 1 滴 (右目下) |
| 1 | ほっ | 眉 水平、 口は `~` 状 (slight smile)、 涙無し |
| 2 | 笑顔 | 眉 上がり、 口は `U` 状 (open smile)、 頬に薄ピンク `rgba(255,180,200,0.4)` 円 2 個 |

実装:
```js
function _drawWebSpider(g, w, h, now, emotion = 0) {
  // 既存の体描画は維持
  // ...
  switch (emotion) {
    case 0: _drawSpiderEyebrows(g, 'worry'); _drawSpiderMouth(g, 'frown'); _drawSpiderTear(g); break;
    case 1: _drawSpiderEyebrows(g, 'flat');  _drawSpiderMouth(g, 'small_smile'); break;
    case 2: _drawSpiderEyebrows(g, 'up');    _drawSpiderMouth(g, 'open_smile'); _drawSpiderBlush(g); break;
  }
}
```
呼び出し側 `_drawWebSweepGame` (L6821) で `gs.spiderEmotion` を渡す。

---

### 5.D. クリア演出 (蝶飛び込み) — blocker 2 / major 6

`_finishWebSweepGame` (L7023) を以下のタイムラインで再構成。
**現行 `_webGimmickSetTimeout(_resolveWebSweepGame, 720)` (L7038) を `_webGimmickSetTimeout(_resolveWebSweepGame, 2500)` に変更。**

#### タイムライン (内訳明示)
| 時刻 | イベント |
| --- | --- |
| t = 0ms | 層 2 クリア → `_finishWebSweepGame(gs)` 呼び出し / `gs.locked = true` / `gs.spiderEmotion = 2` |
| t = 0..800ms | クモが飛び立つアニメ (ease-out): `scale: 1.0 → 1.4` + `translateY: 0 → -120px` |
| t = 200..1000ms | 蝶 3 匹が画面端から中央へ ease-in-out で移動 (`initX → targetX`) |
| t = 1100ms | `_playMzSePitch('correct', 2)` (+200cent ピッチ correct.mp3) |
| t = 2500ms | `_resolveWebSweepGame(gs)` 発火 (結果モーダル A-3 表示) |
| t = 2500 + 950ms | 既存の `_closeEncounter(true)` 呼び出し (既存ロジック維持) |

#### 蝶 3 匹の仕様 (major 6)
3 匹はすべて **同じ `chocho.png` アセット** を使用 (`chocho_2.png` 等は存在しないため)。 位置・スケール・sway phase で個性を出す:
```js
butterflies = [
  { asset: 'chocho.png', initX: -0.08, targetX: 0.25, scale: 0.9,  sway: 0.0 },
  { asset: 'chocho.png', initX:  1.08, targetX: 0.55, scale: 1.0,  sway: 1.2 },
  { asset: 'chocho.png', initX: -0.05, targetX: 0.78, scale: 0.85, sway: 2.4 },
];
```
描画は `drawImage` で行い、 y は `targetY + Math.sin(now * 0.006 + sway) * 4` の sin 波で羽ばたかせる。

#### reduced-motion 環境 (minor 15)
`window.matchMedia('(prefers-reduced-motion: reduce)').matches === true` の場合:
- 蝶の transition は `transition: none;` で無効化
- 蝶の `opacity = 0` で **完全非表示** (描画コスト削減のため `drawImage` 自体をスキップ)
- クモ飛び立ちアニメも `scale/translateY` を初期値固定にし、 spiderEmotion 切り替えのみ反映

---

### 5.E. Quick Wins 統合 (5 件)

#### E-1. SE ピッチ可変 (`_playMzSePitch` 新設、 既存 `_playMzSe` は変更しない) — minor 13
`_playMzSe` の隣に以下ヘルパーを新設:
```js
function _playMzSePitch(name, semitones) {
  try {
    const url = MZ_SE_URLS[name]; if (!url) return _playMzSe(name);
    const ctx = _mzAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    _mzAudioCtx = ctx;
    fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => {
      const src = ctx.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = Math.pow(2, semitones / 12);
      src.connect(ctx.destination); src.start();
    });
  } catch (_) { _playMzSe(name); }
}
```
呼び出し例: `_playMzSePitch('correct', 2)` で +200cent (半音 2 つ)。 層クリアごとに `2 * gs.currentLayer` を渡し、 層が進むほど高音化。

`_playWebStickySfx` (L7003) 内の `'snap'` 系も同様に speed 連動 freq に:
```js
const speed = Math.min(1.0, (gs.speed || 0) / 1.5);
oscillator.frequency.value = 220 + speed * 660;
```

#### E-2. sparkle 粒子 (層クリア時 8 個放射) — major 8
`_spawnWebGlob` (L6804) を拡張し、 particle に `color` プロパティを追加:
```js
// particle 生成時 (既存 _spawnWebGlob 内 & 新規 _spawnLayerSparkle 内)
particles.push({ x, y, vx, vy, life: 600, age: 0, color: 'rgba(R,G,B,0.85)' });
```
描画側 `_drawWebSweepGame` L6852-L6863 の particle 描画を:
```js
g.fillStyle = p.color || 'rgba(240,255,246,0.82)';
```
に変更 (デフォルト白でフォールバック)。

`_spawnLayerSparkle(gs, layerIdx)` 新設:
- 中心 (0.5, 0.5) から 360° 等間隔 8 方向に放射
- `vx = cos(angle) * 4, vy = sin(angle) * 4`
- 色は `WEB_SWEEP_LAYERS[layerIdx].sparkleColor` を `rgba(...)` に変換
- life 600ms

#### E-3. スワイプ軌跡 (最後 12 点 fade ライン)
state に `pointerTrail: []` (max 12 点) を追加 (B-2 で定義済み):
- pointermove で `gs.pointerTrail.push({x, y, t: now})` → 12 超で `shift()`
- `_drawWebSweepGame` 内で軌跡を `globalAlpha = (i / 12) * 0.4` でグラデ描画
- 線幅 8px、 色 `rgba(255, 240, 180, 0.5)`
- reduced-motion では描画スキップ

#### E-4. ハプティック振動 (throttle 100ms) — major 10
`_showWebSweepGame` 内に **local 関数** として定義 (`gs.lastVibrateAt` を参照):
```js
function _vibrate(ms) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const now = performance.now();
  if (now - gs.lastVibrateAt < 100) return;
  gs.lastVibrateAt = now;
  if (navigator.vibrate) navigator.vibrate(ms);
}
```
- `_detachWebThread` 内: `_vibrate(8)` (通常スワイプ相当の弱)
- `_onWebSweepLayerCleared` 内: `_vibrate(30)` (層クリアの強)

#### E-5. reduced-motion 対応
- 振動と粒子の両方で `prefers-reduced-motion` チェック
- 粒子: `if (reducedMotion) particleCount = 0`
- 蝶アニメ: D セクション minor 15 参照

---

### 5.F. SE / 触覚 (まとめ)

- `_playWebStickySfx` の `'snap'` を E-1 の pitch 可変版に
- 層クリア時: `_playMzSePitch('correct', 2 * gs.currentLayer)` (+200cent × layer)
- 通常スワイプ: `_vibrate(8)` (throttle 100ms)
- 層クリア: `_vibrate(30)`
- 最終クリア (蝶演出後 t=1100ms): `_playMzSePitch('correct', 2)`

---

### 5.G. 物理パラ調整 (3 層構造に対応) — major 11

| 値 | 旧 | 新 |
| --- | --- | --- |
| 糸太さ ratio (層 0) | `0.0056` 共通 | `0.020` (3.6x) |
| 糸太さ ratio (層 1) | - | `0.014` |
| 糸太さ ratio (層 2) | - | `0.008` |
| spring drag (L6686-L6694, dragging 中) | `7.5` 共通 | `LAYER_SPRING_DRAG[gs.currentLayer]` = `[6.5, 8.5, 10.5]` |
| spring rest (同上、 静止時) | `12.5` 共通 | `LAYER_SPRING_REST[gs.currentLayer]` = `[8.5, 10.5, 12.5]` |
| threshold (糸ごと) | `1.0+(i%3)*0.08` | 層 0: `1.1`、 層 1: `1.0`、 層 2: `0.9` (B-1 `WEB_SWEEP_LAYERS` 参照) |
| sweep 半径 ratio (L6749) | `0.105` | `0.13` |

#### G-1. spring 計算行の書き換え (L6686-L6694)
旧:
```js
const k = gs.dragging ? 7.5 : 12.5;
```
新:
```js
const k = gs.dragging
  ? LAYER_SPRING_DRAG[gs.currentLayer]
  : LAYER_SPRING_REST[gs.currentLayer];
```
> **意図 (major 11):** dragging 分岐は保持しつつ層別化。 層が進む (薄膜層) ほど spring が硬く、 動きがキビキビする。

---

### 5.H. sw.js bump

`d:\AppDevelopment\pono-asobiba-app\sw.js` の `CACHE_VERSION` を **現状値 +1** に。
コミットメッセージ例: `web_sweep: rescue story remake (sw v<新値>)`

---

## 6. 受け入れ条件 (5 個、 検証可能)

- [ ] **C1. 3-6 歳が 30 秒〜2 分で必ずクリアできる**
  最大ストローク数 = 5 往復 × 3 層 = 15 往復 (1 往復 ≒ 4-8 秒)。 計算上 60-120 秒で完了。 タイマー・失敗条件のロジックが残っていないことを確認。

- [ ] **C2. 失敗・タイマー切れの概念ゼロ** — major 5
  ソース内 web_sweep 範囲 (L6491-L7088) に対し以下の **正規表現** でヒット 0 件であることを確認:
  ```
  (?<!_webGimmickSet)timeout|timeUp|gameOver|failed
  ```
  - lookbehind により `_webGimmickSetTimeout` は許容
  - `setTimeout` (アニメ用) は **許容語**として除外 (このゲームでは原則 `_webGimmickSetTimeout` 経由だが、 万一純 `setTimeout` が残っても許容)
  - `WEB_SWEEP_CLEAR_TARGET` / `WEB_SWEEP_MAX_DETACH_PER_STROKE` が **撤廃済み** であることを併せて確認 (`Grep` で 0 件)

- [ ] **C3. 物語が一貫: 救出 → 感謝 → 蝶と共に飛び立つ**
  ダイアログ文字列が A-1, A-2 表と完全一致。 `クモムシ` / `とおせんぼ` / `defeat` 系の旧文言が残っていないこと (minor 14 の Grep 確認手順を完了)。

- [ ] **C4. クモの表情 3 段階が進行に応じて変化**
  `gs.spiderEmotion` が 0→1→2 と切り替わり、 `_drawWebSpider` の描画パラメータが各層クリア時に切り替わることを実機確認。 呼び出し側が `gs.spiderEmotion` を渡していること (minor 12)。

- [ ] **C5. 蝶 3 匹は画面端から自然に登場**
  `gs.butterflies` の初期 `initX` が `< 0` または `> 1` (画面外)、 クリア時に `targetX` (画面内) へ ease-in-out 800ms で移動。 突然 `opacity 0→1` で湧かないこと。 reduced-motion 時は完全非表示 (描画スキップ)。

---

## 7. staging 確認手順

1. `wrangler deploy --env staging` (staging 専用)
2. `https://pono-asobiba-staging.ndw.workers.dev/maze/` を開く
3. スマホ実機 (iOS Safari / Android Chrome) で:
   - ほうきを拾う → クモの巣に進入 → A-1 のエンカウンタ文言を確認
   - 左右に「ふわー」とスワイプ → 5 往復で層 0 が灰色 sparkle と共にフェード (status `'いいね！ ふとい いとが ほどけた'`)
   - 続けて 5 往復で層 1 が銀 sparkle、 さらに 5 往復で層 2 が金 sparkle
   - クモが笑顔 (`spiderEmotion=2`) になり 上方向に飛び立ち (800ms)、 蝶 3 匹が画面端から飛び込む (200-1000ms)
   - t=1100ms で correct.mp3 (+200cent) 再生
   - t=2500ms で結果モーダル `'クモさん、 たすかった！'` 表示 (A-3 三段 DOM) → 950ms 後にエンカウンタ閉じる
4. DevTools Network で `sw.js` の `CACHE_VERSION` 更新確認
5. DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce` を ON にして:
   - 振動が発火しないこと
   - sparkle 粒子が描画されないこと
   - 蝶 3 匹が完全非表示であること
6. `Grep "クモムシ"` / `Grep "WEB_SWEEP_CLEAR_TARGET"` / `Grep "WEB_SWEEP_MAX_DETACH_PER_STROKE"` が全てヒット 0 件であること

---

## 8. コミット規約 (参考)

```
web_sweep: rescue story remake — 3 layers + spider emotions + butterfly resolution (sw v<新値>)
```

---

## 9. 改訂履歴

- **2026-06-12 初版**: 案A 救出物語、 3 層構造、 蝶演出、 Quick Wins 5 件
- **2026-06-12 改訂**: 前回レビュー指摘の blocker 4 / major 7 / minor 4 を反映
  - blocker 1: A-2 に既存 5 文字列の置換マップ (L6564 / L6592 / L6595 / L6782 / L6783) を追加
  - blocker 2: D セクションに `_webGimmickSetTimeout` を 720→2500ms 変更とタイムライン内訳を明示
  - blocker 3: A-3 に結果モーダルの具体 HTML、 A-4 に `.enc-result-title/body/meta` CSS を追加
  - blocker 4: B-3 に `WEB_SWEEP_MAX_DETACH_PER_STROKE` 参照行削除、 remain status 更新削除、 `t.def.layer` フィルタを明示
  - major 5: C2 検証を正規表現 `(?<!_webGimmickSet)timeout|...` に明確化
  - major 6: 蝶 3 匹を `chocho.png` 統一、 位置・scale・sway phase で個性化
  - major 7: 既存 state プロパティ (strokeDistance 等) 残置 + L6591 短ストローク判定残置を明記
  - major 8: particle に `color` プロパティ追加、 描画側で `p.color` 参照を明示
  - major 9: pointermove の strokeCounter コードを `currentDir` 方式で正確に
  - major 10: ハプティック throttle を local 関数 `_vibrate` (`gs.lastVibrateAt` 参照) で実装
  - major 11: spring を `LAYER_SPRING_DRAG/REST[currentLayer]` で層別化 (dragging 分岐は保持)
  - minor 12: `_drawWebSpider` 呼び出し側 L6865 を `gs.spiderEmotion` 渡しに修正
  - minor 13: `_playMzSePitch` 新ヘルパー追加 (既存 `_playMzSe` は変更しない)
  - minor 14: `Grep "クモムシ"` の参照箇所確認手順を追加
  - minor 15: reduced-motion で蝶を完全非表示にする条件を明示
