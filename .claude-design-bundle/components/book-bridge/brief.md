# Claude Design 並列ブリーフ: 「えほん × あそびば」橋渡しセクション 3 案

## 0. プロジェクト概要

- 対象 LP: `index.html` (ポノのあそびば / こだまのもり出版)
- 戦略: 絵本販売 LP / 遊び場は世界観体験の入口 → このセクションは **絵本 ⇄ あそびば 双方向送客** の核
- ゴール: 「同じポノが絵本にもあそびばにもいる」を一目で体感させる
- 挿入位置 (採用後): `body > .page` 直下、`a.hero-amazon` の直後・`section.video-section` の直前。`.page` の `gap:16px` / `max-width:540px` の中央寄せカラム内に収める (Amazon バナーだけがフルブリード、その下で width が絞られる構造に注意)
- 代替挿入位置: `section.video-section` と `a.enter-btn#enter-btn` の間 (動画で世界観 → 並置カード → 入口ボタンの導線)。どちらでも動くよう左右余白を `clamp()` で持たせる

## 共通要件

### viewport (3 ブレークポイント)

- **mobile**: 〜480px (1 カラム、縦積み、矢印は ↓ で下向き)
- **tablet**: 481〜900px (横並び、中央矢印は →、画像幅は 44vw 上限 280px)
- **desktop**: 901px〜 (max-width 540px の中央カラム内で 2 カラム、画像 240px × 240px)

### 使う既存アセット

- `assets/images/Amazon_pc.webp` / `Amazon_mobile.webp` (絵本書影として `<picture>` で出し分け、新規撮影なし)
- `assets/images/og-card.jpg` (A+ 用ヘッダーを ASCII リネーム済み想定。世界観背景に薄く `opacity:.18` で敷いてもよい)
- `play.html` のスクリーンショット (新規必要 / 暫定は 1080×1350 PNG、ファイル名 `play-screenshot.webp` で `assets/images/` に置く想定でモック)
- フォント: `Zen Maru Gothic` 700/900 (既存読み込み済み)
- 配色: 背景 `#FFF8F0` / アクセント `#F2915A` / 文字 `#5D4E37` / 影 `rgba(93,78,55,.12)`

### 「同じ世界を行き来する」トランジション (CSS のみ、JS 不要)

- ホバー/タップで左右の画像が **互いに 4〜6px 寄る** (`transform: translateX()`) → 距離が縮む感覚
- 中央の矢印・ふきだしは `@keyframes` で 2.8s ループの ゆっくり脈動 (`scale(1) → scale(1.06)`)
- `prefers-reduced-motion: reduce` で全アニメ停止
- `transition: transform .6s cubic-bezier(.22,.61,.36,1)` を共通に。商業バナー的なスナップは禁止

### コピー (brand_voice)

- 見出し: 「えほんの ポノは ここにも いるよ」 (ひらがな多め、丁寧語は最小限)
- 補足: 「おなじ もりで、いっしょに あそぼう」
- CTA は強要しない。「みてね」「きてね」「あそべるよ」など低圧の語尾

---

## 案A: 並置型 (Side-by-Side)

### レイアウト

- 2 カラム + 中央矢印。desktop は `display:grid; grid-template-columns:1fr auto 1fr;`、mobile は `grid-template-columns:1fr; grid-template-rows: auto auto auto;` で縦積み
- 左カード: 絵本書影 (角丸 14px、影 `0 6px 20px rgba(93,78,55,.18)`、下に小さく「えほん」ラベル)
- 右カード: あそびばスクショ (端末枠 angle なし、角丸 22px、下に「あそびば」ラベル)
- 中央: 円形バッジ (直径 56px、`#F2915A`、白矢印 → / mobile では ↓)。バッジ上に小さく「おなじ ポノが ここにも いるよ」

### トランジション

- `:hover` / `:focus-within` で **左カードは右へ +4px、右カードは左へ -4px**、中央バッジは `scale(1.06)` + 矢印 8px の左右シェイク (`@keyframes nudge`)
- タップで `.is-tapped` を付与 (CSS の `:active` で代用 / JS 不要)

### 注意

- 絵本書影とスクショの **明度差を揃える** (スクショ側は `filter:saturate(.92)` で絵本側にトーンを合わせる)
- ラベル「えほん」「あそびば」のフォントは 900、サイズ `clamp(14px,3.6vw,18px)`

---

## 案B: ストーリーカルーセル (Horizontal Scroll)

### レイアウト

- 1 行 5 コマの横スクロール (`overflow-x:auto; scroll-snap-type:x mandatory;`、各コマ `scroll-snap-align:center; min-width:78vw; max-width:320px;`)
- 1: 絵本表紙 / 2: 絵本の中のポノ (書影の一部をクロップ) / 3: テキストコマ「もりの おくへ とびこむよ」 (オレンジ背景 `#F2915A`、白文字 900) / 4: あそびばのポノ (スクショ) / 5: テキストコマ「いっしょに あそぼう」+ ちいさく ↳ アイコン
- スクロールバーは `scrollbar-width:none; ::-webkit-scrollbar{display:none}` で隠す
- 下にドットインジケータ 5 個 (CSS `:has(scroll-snap)` ベース、視覚的ヒントのみ。**動的ハイライトは JS 必要なので静的でよい**)

### トランジション

- 各コマ間に `gap:16px`
- 3 コマ目 (テキスト「とびこむよ」) は `@keyframes` で 木漏れ日風の `background-position` を 6s ループ
- 1↔2、4↔5 のコマは並ぶと **わずかに重なる演出** (`margin-left:-8px` を nth で適用) → 連続性

### 注意

- mobile: スワイプヒントとして最初の 1.4s だけ `scroll-behavior:smooth` で 24px 右に自動スクロール → 戻す `@keyframes` (※ JS 不要、`animation` で `scrollLeft` は動かせないので **2 コマ目を少しはみ出させる視覚ヒント** に切り替え)
- desktop で 5 コマ全部が見える場合は snap を解除 (`@media (min-width:901px) { scroll-snap-type:none }`)

---

## 案C: 重ね合わせ型 (Overlay / Speech Bubble)

### レイアウト

- 中央に絵本見開き 1 枚 (`max-width:380px; aspect-ratio:4/3;` 角丸 18px、紙の質感は `box-shadow: inset 0 0 0 1px rgba(93,78,55,.08), 0 8px 24px rgba(93,78,55,.18)`)
- 絵本の右上に **ポノの吹き出し** を重ねる: `position:absolute; top:-12px; right:-8px;` の角丸 24px の白カード、しっぽは CSS の `clip-path` で三角作成。中に「あそびばに あそびに きてね」 (`clamp(13px,3.4vw,16px)`)
- 絵本の下に小さく 2 リンクを横並び:
  - `a.book-link` → Amazon (📕 アイコン + 「えほんを みる」)
  - `a.play-link` → `play.html` (🌳 アイコン + 「あそびばへ」)
- リンクは `display:inline-flex; gap:6px; padding:10px 14px; border-radius:999px; background:#FFF; border:2px solid #F2915A; color:#5D4E37;` のピル形

### トランジション

- ふきだしは `@keyframes float` で `translateY(0 → -4px → 0)` を 3.2s ループ
- 絵本ページに ホバーで `transform: rotate(-1deg) scale(1.02)` (タッチデバイスは `:active`)
- ふきだしの「あそびばに〜」テキストは初回表示時 `@keyframes typeIn` で `clip-path:inset(0 100% 0 0)` → `inset(0 0 0 0)` (1.6s, ease-out)

### 注意

- ふきだしが小画面で絵本からはみ出さないよう mobile では `right:8px` に押し戻す
- 2 リンクは **どちらも同等の重み** にする (絵本だけ強調しない / 遊び場だけ強調しない)

---

## NG

- ❌ 「今すぐ買う」「無料で遊ぶ」など広告色の強い CTA 文言
- ❌ 赤・黄色の警告色、グラデーション多用、ネオン系
- ❌ 角丸 8px 未満のシャープなカード、影 `0 2px 4px` 以下の薄すぎる平面
- ❌ Zen Maru Gothic 以外のフォント、漢字主体のコピー
- ❌ JavaScript 必須のインタラクション (本セクションは CSS のみで完結)
- ❌ 絵本書影を切り抜いてキャラだけ抽出する加工 (著作物の改変)
- ❌ ポノ以外のキャラ (キツネ / ハリネズミ) を主役級に出す → 「ポノが両方にいる」が薄まる
- ❌ 自動再生される音、強い点滅 (3〜6 歳向け)
- ❌ `position:fixed` / モーダル / オーバーレイで他要素を覆う構造

## 採用後のフロー

1. 採用案の HTML/CSS を `index.html` の **`a.hero-amazon` 直後・`section.video-section` 直前** に挿入 (代替: video-section と `a.enter-btn#enter-btn` の間)
2. CSS は `index.html` 内の既存 `<style>` ブロック末尾に追記 (外部化は次フェーズ)
3. 新規アセット `assets/images/play-screenshot.webp` を追加 (案 A/B で使用)
4. `sw.js` の `CACHE_VERSION` を 1 バンプ (例: `v1316` → `v1317`)。`PRECACHE_URLS` に `play-screenshot.webp` を追加
5. `common/sw-update.js` のトースト型更新 UX で配信、`run_worker_first:true` (boolean) を `wrangler.toml` で確認
6. staging (`pono-asobiba-app-staging.ndw.workers.dev`) で 3 ブレークポイント実機確認 → develop-app → master
