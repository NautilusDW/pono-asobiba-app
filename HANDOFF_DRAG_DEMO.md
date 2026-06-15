# HANDOFF: Bento Tutorial Drag Demo (Hand Emoji) Not Visible

> 別エージェント (Codex) 向けの自己完結ハンドオフ。 このドキュメントだけ読めば作業開始できる。

## 1. 問題定義

[bento/index.html](bento/index.html) の「お弁当ゲーム」チュートリアル v3.3.1 (sw1142) で、 以下 4 ステップの **`✊✋` 絵文字によるドラッグ操作デモが実機画面で完全に見えない**。

- `rice-place` — ごはんパレット → ステージ左半分
- `okazu-red` — おかずパレット → ステージ右半分
- `small-place` — ちいさいおかずパレット → ステージ右半分
- `decor` — のりパレット → ステージ左半分

**他の演出は正常に表示されている**:

- 青いトリムパス点滅 (`#1E7FD8`) → 出る
- 吹き出し (`.tut-bubble`) → 出る
- ステップ遷移 (rice-place → tab-okazu → ...) → 進む
- ユーザー報告: 「LINE が青に変わってる」 = `tutorialRenderStep` は呼ばれている確証あり

**`✊✋` だけが画面に出てこない**。これが本タスクのスコープ。

## 2. 環境

- スタック: 純 JS + HTML + CSS (フレームワーク無し)
- 配信: Cloudflare Workers (Netlify は使っていない)
- 主要ファイル: [bento/index.html](bento/index.html) (約 12,246 行の単一ファイル)
- PWA: [sw.js](sw.js) (CACHE_VERSION バンプ必須、 現状 `1144`)
- ローカル: `d:\AppDevelopment\pono-asobiba-app`
- staging URL: https://pono-asobiba-staging.ndw.workers.dev/ (`develop` ブランチ自動デプロイ)
- 再表示方法: 設定 ⚙ → 「いま みる」、 または URL に `?tutreset=1` を付与

## 3. 該当コードの場所 (行番号は 2026-06-15 時点)

### CSS

| 要素 | ファイル | 行番号 |
|---|---|---|
| `.tut-finger` ルート | bento/index.html | 2964–2973 |
| `.tut-hand` 共通 | bento/index.html | 2974–2992 |
| `.tut-hand--open` | bento/index.html | 2993–2996 |
| `.tut-hand--grip` | bento/index.html | 2997–2999 |
| `@keyframes tutHandOpen` | bento/index.html | 3000–3013 |
| `@keyframes tutHandGrip` | bento/index.html | 3014–3022 |
| `.tut-finger--fast` 修飾 | bento/index.html | 3023–3027 |
| `.tut-finger--tap` 修飾 | bento/index.html | 3028–3038 |
| `@keyframes tutFingerTap` | bento/index.html | 3039–3043 |

### JS

| 関数 | 行番号 |
|---|---|
| `tutorialEnsureLayer` | 11211 |
| `tutorialHideFinger` | 11240 |
| `tutorialAnimateDrag` | 11295 |
| `tutorialAnimateDragFromEl` | 11320 |
| `tutorialAnimateDragFromElWithRetry` | 11339 |
| `tutorialAnimateTap` | 11380 |
| `tutorialFirstPaletteItem` | 11419 |
| `tutorialStageCenter` | 11432 |
| `tutorialFindRicePaletteEl` | 11544 |
| `tutorialFindFoodPaletteEl` | 11549 |
| `tutorialFindNoriPaletteEl` | 11554 |
| `tutorialRenderStep` | 11796 |
| `case 'rice-place'` (実体は if 文) | 11887–11896 |
| `case 'okazu-red'` | 11918–11931 |
| `case 'small-place'` | 11953–11962 |
| `case 'decor'` | 11965–11979 |

## 4. これまでの試行履歴 (繰り返さないため)

### v3.2 (sw1133–1134)
- retry メカニズム導入 (palette/target が null なら `50ms × 20回` retry)
- `MutationObserver` で `.free-item-list` を監視
- hand サイズ `56→72px`、 z-index `9100→9200`
- アニメ速度 `2.4s→2.8s`、 fast `1.2s→1.4s`

### v3.2.1 (sw1135)
- retry timer のリーク修正 (`_retryTimer` ID 保存、 advance/teardown で clear)
- MutationObserver スコープ縮小 (body subtree → palette container)
- トリム色 緑 → 青 `#1E7FD8`

### v3.3 (sw1140)
- セレクタ 7段 fallback (下記コード参照)
- retry `1000ms → 1800ms` (30回 × 60ms)
- `Number.isFinite` ガード
- トリムパス強化 (太く、 速く、 初回 1.4s 一周描画)

### v3.3.1 (sw1142、 直近)
- forensic 仮説1: 「`.tut-hand--open/grip` の display 指定欠落」 → **誤り** (子 span は同要素に複数 class が当たっていた)
- 実際の修正: keyframes の `translate(var(--from-x), var(--from-y))` を `translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%))` に変更 (auto-center 化)
- JS から hard-coded `-36px` center offset 撤廃
- `.tut-finger` display `'block' → 'flex'` (防御的)
- **✗ それでもユーザー実機で見えない**

## 5. 現状コード抜粋

### `.tut-finger` (2964–2973)

```css
.tut-finger {
  position: fixed;
  left: 0; top: 0;
  width: 64px; height: 64px;
  z-index: 9200;
  pointer-events: none;
  user-select: none;
  display: none;
}
```

### `.tut-hand` (2974–2992)

```css
.tut-hand {
  position: absolute;
  left: 0; top: 0;
  width: clamp(48px, 12vw, 80px); height: clamp(48px, 12vw, 80px);
  display: flex; align-items: center; justify-content: center;
  font-size: clamp(40px, 10vw, 64px);
  line-height: 1;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
  text-shadow: 0 2px 6px rgba(0,0,0,0.25);
  pointer-events: none;
  user-select: none;
  will-change: transform, opacity;
  --from-x: 0px; --from-y: 0px;
  --to-x: 0px; --to-y: 0px;
}
.tut-hand--open { animation: tutHandOpen 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
.tut-hand--grip { animation: tutHandGrip 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
```

### `@keyframes tutHandOpen / tutHandGrip` (3000–3022)

```css
@keyframes tutHandOpen {
  0%    { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 1; }
  8%    { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 1; }
  9%    { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 0; }
  66%   { transform: translate(calc(var(--to-x) - 50%),   calc(var(--to-y) - 50%));   opacity: 0; }
  67%   { transform: translate(calc(var(--to-x) - 50%),   calc(var(--to-y) - 50%));   opacity: 1; }
  75%   { transform: translate(calc(var(--to-x) - 50%),   calc(var(--to-y) - 50%));   opacity: 1; }
  92%   { transform: translate(calc(var(--to-x) - 50%),   calc(var(--to-y) - 50%));   opacity: 0.2; }
  93%   { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 0; }
  100%  { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 1; }
}
@keyframes tutHandGrip {
  0%    { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 0; }
  8%    { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 0; }
  9%    { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 1; }
  66%   { transform: translate(calc(var(--to-x) - 50%),   calc(var(--to-y) - 50%));   opacity: 1; }
  67%   { transform: translate(calc(var(--to-x) - 50%),   calc(var(--to-y) - 50%));   opacity: 0; }
  100%  { transform: translate(calc(var(--from-x) - 50%), calc(var(--from-y) - 50%)); opacity: 0; }
}
```

### `tutorialEnsureLayer` (11211–11239)

```javascript
function tutorialEnsureLayer() {
  if (!tutorialState.fingerEl) {
    const finger = document.createElement('div');
    finger.className = 'tut-finger';
    finger.id = 'tut-finger';
    const open = document.createElement('span');
    open.className = 'tut-hand tut-hand--open';
    open.setAttribute('aria-hidden', 'true');
    open.textContent = '✋';
    const grip = document.createElement('span');
    grip.className = 'tut-hand tut-hand--grip';
    grip.setAttribute('aria-hidden', 'true');
    grip.textContent = '✊';
    finger.appendChild(open);
    finger.appendChild(grip);
    finger.style.display = 'none';
    document.body.appendChild(finger);
    tutorialState.fingerEl = finger;
  }
  // bubbleEl 初期化省略
}
```

### `tutorialAnimateDrag` (11295–11319)

```javascript
function tutorialAnimateDrag(fromPoint, toPoint, opts = {}) {
  tutorialEnsureLayer();
  if (tutorialIsRecallBlocking()) { tutorialHideFinger(); return; }
  const f = tutorialState.fingerEl;
  if (!fromPoint || !toPoint) { tutorialHideFinger(); return; }
  const fx = fromPoint.x;
  const fy = fromPoint.y;
  const tx = toPoint.x;
  const ty = toPoint.y;
  f.style.display = 'flex';
  f.classList.remove('tut-finger--tap');
  f.classList.toggle('tut-finger--fast', !!opts.fast);
  f.style.setProperty('--from-x', fx + 'px');
  f.style.setProperty('--from-y', fy + 'px');
  f.style.setProperty('--to-x', tx + 'px');
  f.style.setProperty('--to-y', ty + 'px');
  const hands = f.querySelectorAll('.tut-hand');
  hands.forEach(h => { h.style.animation = 'none'; });
  void f.offsetWidth;
  hands.forEach(h => { h.style.animation = ''; });
}
```

### `tutorialAnimateDragFromEl` (11320–11332)

```javascript
function tutorialAnimateDragFromEl(fromEl, toPointOrEl, opts = {}) {
  if (!fromEl) { tutorialHideFinger(); return; }
  const fr = fromEl.getBoundingClientRect();
  const from = { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 };
  let to;
  if (toPointOrEl && typeof toPointOrEl.getBoundingClientRect === 'function') {
    const tr = toPointOrEl.getBoundingClientRect();
    to = { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2 };
  } else {
    to = toPointOrEl;
  }
  tutorialAnimateDrag(from, to, opts);
}
```

### `tutorialAnimateDragFromElWithRetry` (11339–11379)

```javascript
function tutorialAnimateDragFromElWithRetry(paletteSelectorOrEl, targetSelectorOrEl, opts = {}, retries = 30) {
  if (tutorialState._retryTimer) {
    clearTimeout(tutorialState._retryTimer);
    tutorialState._retryTimer = null;
  }
  const originalStep = tutorialState && tutorialState.step;
  function resolveFrom(x) { /* string→querySelector / function→call / else passthrough */ }
  function resolveTo(x)   { /* 同上 */ }
  function attempt(remaining) {
    if (!tutorialState || !tutorialState.active) return;
    if (tutorialState.step !== originalStep) return;
    const palette = resolveFrom(paletteSelectorOrEl);
    const target  = resolveTo(targetSelectorOrEl);
    if ((!palette || !target) && remaining > 0) {
      tutorialState._retryTimer = setTimeout(() => {
        tutorialState._retryTimer = null;
        attempt(remaining - 1);
      }, 60);
      return;
    }
    if (!palette || !target) { tutorialHideFinger(); return; }
    tutorialAnimateDragFromEl(palette, target, opts);
  }
  attempt(retries);
}
```

### `tutorialFirstPaletteItem` (11419–11431)

```javascript
function tutorialFirstPaletteItem() {
  return document.querySelector('.free-item-list .free-palette-item')
      || document.querySelector('.right-panel.free-layout-panel .free-palette-item')
      || document.querySelector('.free-palette-item')
      || document.querySelector('.free-item-list > button')
      || document.querySelector('.free-item-list > *:not(button)')
      || document.querySelector('.right-panel.free-layout-panel [class*="palette-item"]')
      || null;
}
```

### `tutorialStageCenter` (11432–11442)

```javascript
function tutorialStageCenter() {
  return document.getElementById('free-layout-stage')
      || document.querySelector('.free-layout-stage')
      || document.querySelector('.free-bento-shape')
      || document.querySelector('#bento-stage')
      || document.querySelector('.bento-stage')
      || document.querySelector('.free-stage')
      || null;
}
```

### `rice-place` 分岐 (11887–11896)

```javascript
if (step === 'rice-place') {
  tutorialShowBubble('ごはんを つかんで ひだりがわに のせよう', { topVh: '20' });
  tutorialAnimateDragFromElWithRetry(
    () => tutorialFindRicePaletteEl(),
    () => tutorialStageLeftHalfPoint(),
    { fast }
  );
  return;
}
```

(`okazu-red` / `small-place` / `decor` も同構造。 セレクタ関数が違うだけ。)

## 6. デバッグ手順 (Codex がやるべき手順)

1. staging を **Chrome DevTools** で開き、 `?tutreset=1` を付けて `rice-place` ステップに到達した時に:
   - `document.querySelector('.tut-finger')` で要素が存在するか確認
   - `getComputedStyle(...)` で `display`/`opacity`/`transform`/`position`/`z-index` を確認
   - Elements パネルで実際の DOM 位置 (`<body>` 直下か) を確認
   - **Animations タブで keyframes が走っているか確認**
2. console で `tutorialState` を読んで `step` `active` `_retryTimer` を確認
3. **`tutorialAnimateDrag` 関数頭にブレークポイント** を貼り、 実際に呼ばれているか確認
4. もし呼ばれていなければ → `tutorialAnimateDragFromElWithRetry` 内の `attempt()` が `palette` か `target` 解決失敗で諦めている。 retry 中の `palette` / `target` を console.log で出力
5. もし呼ばれていれば → 描画は走っているが視覚化されていない (= CSS 競合 / overlay 被さり / transform 計算失敗)
6. localStorage に `bento_tutorial_done_v1` があったら削除してリロード
7. **iPhone Safari** でも同手順 (Mac の Safari Web Inspector でリモート debug)

## 7. ありうる根本原因の候補 (これまでで潰せていないもの)

- (a) `.free-item-list` セレクタは合うが、 `.free-palette-item` がパレット個別ボタンに付与されていない/動的タイミング問題
- (b) animation 再起動 trick (`void f.offsetWidth`) が実機 Safari で効かない
- (c) z-index 9200 でも他の overlay (`recall-modal` / `portrait-notice` / mask) が透明で被さって視覚的に手を隠している
- (d) `tutorialIsRecallBlocking` / `tutorialIsPortraitBlocking` が常時 `true` を返している (orientation 判定誤動作)
- (e) `transform: translate(calc(... - 50%))` が iOS Safari (特に古いバージョン) で正しく解釈されない → 旧来の translate3d 等に戻す検討
- (f) `.tut-hand` が `position: absolute` で親 `.tut-finger` が `position: fixed`、 `left/top = 0` 固定。 親の transform で動かしてないため keyframes の transform が両 span に同時適用される ... 視覚的に重なる/相殺するパターンの再確認
- (g) `clamp(48px, 12vw, 80px)` が 0 になるレアケース (viewport vw が 0 の縦長すぎる画面、 split view 等)
- (h) `getBoundingClientRect()` が initial fold で `{0,0,0,0}` を返している (display:none の祖先がある / `visibility:hidden`)
- (i) `tut-finger` 要素自体は `display:flex` になるが、 keyframes が 0% 時点で `opacity:1` なのに **直前まで opacity:0 の他 class** が当たっていて、 アニメーション初回フレームと CSS 競合
- (j) animation が `infinite` だが、 `firstRender` 以外で `tutorialAnimateDragFromElWithRetry` が呼ばれ続けて毎回 `animation: none → ''` を繰り返し、 結果ずっと最初のフレームに戻され続けて視覚的に止まっている (= MutationObserver による resync 起因の race)

## 8. 成功条件

- staging で `rice-place` ステップ到達時、 `✊✋` がパレットアイテム上 → お弁当箱左半分 への移動アニメが **目視できる**
- iPhone Safari でも見える
- 4 ステップ (`rice-place` / `okazu-red` / `small-place` / `decor`) すべてで動く
- 修正完了したら [sw.js](sw.js) の `CACHE_VERSION` を `1144` → `1145` 以上にバンプ + コミット (auto-commit hook が回収)

## 9. 触ってはいけない領域

- 他のチュートリアル機能 (`greet` / `box` / `tab-rice` / トリムパス / マスク明滅 / settings モーダル等) は動作確認済 → 壊さない
- NPC editor (`admin/index.html`) は別機能 → 触らない
- 他ゲーム (`maze/` `quizland/` `breakout/` 等) → 触らない
- `localStorage` キー `bento_tutorial_done_v1` の名前変更禁止 (互換性)
- [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) のルール準拠 (Cloudflare Workers のみ、 Netlify 言及禁止)

## 10. 完了報告フォーマット

```
## 根本原因
<どこで何が起きていたか 2–4 行>

## 最小修正の差分
<bento/index.html および sw.js の diff サマリ>

## 動作確認結果
- staging URL: <hit したか>
- Device A (Chrome desktop): <pass/fail>
- Device B (iPhone Safari): <pass/fail>
- 4 step 全通り目視確認: <yes/no>

## CACHE_VERSION バンプ
1144 → <new>  // 例: 1145: bento tutorial drag demo visibility fix
```

---

**作業ブランチ**: `develop` (auto-deploy to staging)
**ローカル CWD**: `d:\AppDevelopment\pono-asobiba-app`
**直前の touch**: v3.3.1 (sw1142) by Claude Code session 2026-06-15
