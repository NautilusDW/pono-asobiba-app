# acorn-modal-maze brief

> ## ⚠️ Phase 1.5 一時保留メモ (2026-06-28 追加)
>
> Phase 1.1 で maze の AcornModal デザイン方針が転換した:
>
> - 旧案 (= 本 brief 本文): 装飾 3 枚 (frame / leaves / burst glow) を新規生成し、 重ね合わせで maze 固有の絵本テイストを作る
> - 新案 (Phase 1.1 で staging 反映済): quizland 「フクロウ博士ウィンドウ」 のデザインを流用し、 Phase 0 base (cream パネル + amber 枠 + gold 数値) + owl_professor_guide.webp をパネル上端に重ねる軽量実装
>
> 新案で十分子供向けの「先生キャラ + 喜び表現 + 大きな数字」 構造が成立しているため、 本 brief の **3 素材 (maze_acorn_modal_frame.webp / maze_acorn_modal_leaves.webp / maze_acorn_burst_glow.webp) の発注は一旦保留**。
>
> ### Phase 1.2 訂正 (2026-06-28 v1722)
>
> - Phase 1.1 で誤って owl_professor_guide.webp (フクロウ博士キャラ) を maze panel::before に重畳していたが、 ユーザー指摘により撤去 (Phase 1.2 v1722)
> - ユーザーの真の要望は「quizland (フクロウ博士のなぞなぞ) で使われている問題提示ウィンドウの **枠デザイン** を流用」 = キャラではなく cream / 茶木枠 / 葉装飾の panel skin (ウィンドウ枠) のみ流用
> - Phase 1.2 では maze panel に quizland 互換の panel skin (枠のみ) を適用し、 フクロウ博士キャラは乗せない
>
> 復活トリガ (どれかが満たされたら本 brief を再起動):
>
> 1. quizland 流用版で 「maze の世界観 (森・どんぐり・冒険) が表現できていない」 とユーザー判断が出た場合
> 2. 他ゲーム (oto / bento / puzzle 等) のモーダルでも装飾レイヤー素材を共通発注することになり、 シリーズとして再設計する場合
> 3. Phase 1.5 で maze 専用のスペシャル演出 (stage クリア祝祭) が独立要件として立ち上がった場合
> 4. **フクロウ博士キャラを再度乗せる場合はユーザー明示確認必須 (今回の誤読は二度と起こさない)**
>
> 復活時の作業:
>
> - 本 brief をそのまま Claude Design に渡し、 3 素材 (案 a / 案 b) を並列生成
> - 採用案を `assets/ui/maze/acorn-modal/` に配置
> - `common/acorn-modal-shared.css` の `[data-game-id="maze"]` ブロックに `border-image` / `::before` (leaves) / `::after` (burst) を再追加
> - owl_professor_guide.webp 重畳を再導入する場合は、 ユーザー明示確認後に panel::before へ追加 (Phase 1.2 訂正の経緯を必ず引用)
>
> ---

> このファイルは Claude Design (Pono LP Brand Kit) で、 pono-asobiba-app の maze (めいろ) ゲーム ステージクリア時に表示する 「どんぐり獲得モーダル」 に使う 3 つの装飾画像を発注するための仕様書 (実画像は Claude Design 側で GPT Image 2 系の画像エンジンを呼んで作成、 ここはあくまで brief)。 Phase 0 共通基盤 (PonoAcornModal / acorn-modal-shared.css / acorn-copy.json) は完成済で、 本 brief はその BEM ベースの DOM 構造に **重ねる装飾レイヤー** の素材を発注する。 morito が採用案を選定 → Claude Code が `assets/ui/maze/acorn-modal/` に保存 → maze 側 hookup → `sw.js` の precache list 追加 + `CACHE_VERSION` バンプの流れ。

---

## context

- 対象画面: maze (めいろ) ステージクリア演出 → どんぐり獲得モーダル
- 役割: ステージクリアの 「ごほうび」 体験を絵本らしく装飾する 3 枚のレイヤー素材
- 既存基盤: `window.PonoAcornModal` (common/acorn-modal.js)、 `window.PonoAcornAudio` (common/acorn-audio.js)、 `window.PonoAcornCopy` (common/acorn-copy-loader.js) は実装済。 本 brief は **画像 3 種** のみ
- モーダルの中央には既存の `risu_relief.png` (リスのレリーフ) を配置済。 今回の 3 素材はそのリスを取り囲む 「フレーム / 葉飾り / 放射光」 の装飾レイヤー

---

## style guide

- 対象年齢: 子供向け 3-7 歳、 温かい木の風合い
- カラーパレット:
  - `#FFF6E0` cream (紙地ベース)
  - `#C8965A` wood mid (木目中間)
  - `#6B3E1F` wood shadow (木目影)
  - `#6C8E3F` leaf green (葉)
  - `#A4C76D` leaf light (葉ハイライト)
  - `#F5A623` autumn accent (紅葉点・差し色)
  - `#FFEF8A` glow gold (放射光の黄金)
- フォント: モーダル本文は **Zen Maru Gothic** (HTML 側で適用済)。 **画像内に文字は一切入れない** こと
- 質感: pono-asobiba シリーズ全体の絵本的なやわらかい質感を継承
- タッチ: 印刷の擦れ感や紙繊維のごく淡いテクスチャ可、 ただし汚れすぎない (kids 向けクリーン寄り)

---

## assets (3 種)

### 1. maze_acorn_modal_frame.webp

- **寸法**: 1024 × 1280 px (透過 WebP、 lossless 推奨)
- **中央くり抜き**: 720 × 900 px の矩形は **完全透明**、 装飾は外周のみ
- **モチーフ**:
  - 上半分: 太い切り株の枝の輪 (年輪、 太枝のシルエット)
  - 下半分: 根の表情 (根が地面に潜る描写、 やや力強く)
  - 全体: 切り株の断面 + 木目テクスチャ
- **配色**: `#C8965A` (wood mid) ベース、 `#6B3E1F` (wood shadow) で年輪・凹凸、 `#FFF6E0` でハイライト
- **マージン**: border-image-slice 用に **上下左右マージン 152 px** 想定 (くり抜き矩形が中央寄せされ、 外周 152 px は装飾領域)
- **構図メモ**:
  - 中央くり抜きの形状は **既存 risu_relief.png に合わせた角丸矩形** (内側に納まる前提)
  - 枝の輪と根が左右対称気味だと安定感が出る (完全シンメトリーは固すぎるので 5-10% 揺らし可)
- **alternatives 案**:
  - 案 a: 切り株断面の年輪を主役に、 枝・根は控えめ (温かさ重視)
  - 案 b: 太い枝が上下からアーチを描くように囲む (絵本ページ感、 風通し良い)

### 2. maze_acorn_modal_leaves.webp

- **寸法**: 1024 × 320 px (透過 WebP、 lossless 推奨)
- **配置**: モーダル上端の装飾レイヤー (top: 0 重ね前提)
- **モチーフ**: もみじ + カエデの葉 **4-5 枚**
- **配色**: `#6C8E3F` + `#A4C76D` ベース、 **一部に `#F5A623` 紅葉点** をアクセント
- **構図**:
  - 中央 5 割 (横 512 px 帯) は **空白** (中央のリスやテキストを邪魔しない)
  - 左右に葉が **垂れ下がる構図** (上端から下に向かって枝先のように)
  - 葉の重なりは自然に、 一部は中央寄りに長く伸びても良い (中央 5 割空白は維持)
- **質感**: 葉脈を細く焦茶 (`#6B3E1F`) でハンドドロー、 ベタ塗りでなくごく淡いグラデで立体感
- **alternatives 案**:
  - 案 a: 左右対称で 4 枚 (2+2)、 シンプル絵本タッチ
  - 案 b: 左 3 + 右 2 の非対称で 5 枚、 紅葉点を右側に集中 (秋らしさ強)

### 3. maze_acorn_burst_glow.webp

- **寸法**: 800 × 800 px (透過 WebP、 lossless 必須)
- **モチーフ**: 中央放射光 (どんぐり獲得の祝祭演出)
- **配色**: 黄金 `#FFEF8A`、 中心ホワイト → 周辺フェードアウト
- **構図**:
  - 完全透過 PNG/WebP、 CSS の `mix-blend-mode: lighten` で重畳可能
  - 中心半径 **80 px はほぼ純白** (どんぐりが置かれる位置のハイライト)
  - 半径 80 → 200 px までは黄金グラデ
  - 半径 200 → 400 px は周辺フェードアウト (ほぼ透明)
  - 放射状のスター・スパイクは入れない (柔らかい光のみ、 シャープ禁止)
- **質感**: ふんわりした絵本のスポット光、 ガウスぼかし強め
- **alternatives 案**:
  - 案 a: 完全に等方放射 (シンプル)
  - 案 b: ごく僅かな縦長 (上下にやや伸びる、 6:5 比率)、 絵本の挿絵風

---

## reference

- **既存 risu_relief.png** を中央に配置する前提。 frame の中央くり抜き形状はそれに合わせること (角丸矩形、 比 720:900)
- **pono-asobiba LP の質感** (絵本タッチ、 やわらかい紙ベージュ + 焦茶手書き) を継承
- **既存の brand kit** にある「絵本ページ」 系の質感を強く参考にして良い
- **NG リファレンス**: ゲームっぽい派手なエフェクト、 ネオン、 蛍光色、 写真合成のリアル木目

---

## delivery

- **出力先 (Claude Code 配置先)**: `assets/ui/maze/acorn-modal/`
- **命名 (リネーム禁止)**:
  - `maze_acorn_modal_frame.webp`
  - `maze_acorn_modal_leaves.webp`
  - `maze_acorn_burst_glow.webp`
- **形式**: WebP、 lossless 推奨、 **透過必須**
- **採用後**:
  1. Claude Code が `assets/ui/maze/acorn-modal/` に保存
  2. maze 側 (maze/index.html) で PonoAcornModal の装飾レイヤーとして hookup
  3. `sw.js` の **precache list に 3 ファイル追加** + `CACHE_VERSION` バンプ (SW update 検知のため +2 推奨)
  4. `develop-app` ブランチで push → App staging (`https://pono-asobiba-app-staging.ndw.workers.dev/`) で実機確認
  5. iPhone / iPad / PC の 3 BP で重畳具合 (frame くり抜き + 中央 risu + 上端 leaves + glow lighten) を確認

---

## NG (3 案共通・絶対やらない)

- **画像内に文字を入れる** (本文は HTML 側 Zen Maru Gothic で描画)
- **emoji の埋め込み**
- **ネオン・蛍光色** (style guide 配色から逸脱)
- **キャラクター描画** (ポノ / ハリネズミ / リス本体は別素材で別配置、 本 3 素材は装飾レイヤー専任)
- **背景色付き** (透過必須)
- **JPEG 出力** (透過必須のため WebP 一択)
- **シャープな放射スター/スパイク** (glow は柔らかい光のみ)
- **frame 中央くり抜き矩形に装飾を被せる** (完全透明厳守、 risu_relief.png 配置領域を侵さない)
- **leaves の中央 5 割帯に葉を被せる** (中央テキスト・risu を隠してはいけない)
- **過度な紙焼け・シミ** (kids 向けクリーン寄り)

---

## メモ (morito / 実装者向け)

- Phase 0 共通基盤 (PonoAcornModal API, `--acorn-z=99997`, BEM クラス) の挙動は逸脱しない
- 本 3 素材は **装飾レイヤー** で、 機能 DOM (ボタン / テキスト / risu) は HTML 側で別管理
- frame の border-image-slice 152 px は CSS 側で `border-image: url(...) 152 fill / 152px stretch` 想定。 厳守
- leaves は `position: absolute; top: -32px; left: 0; right: 0` で上端からはみ出し配置を想定
- glow は `mix-blend-mode: lighten` でリス上に重ねる前提。 黒背景にならない透過で出力すること
- 3 素材は **セットで採用** (案単位)、 mix-and-match は質感ズレを生む可能性があるため非推奨
- 過去事故 (hero-labels 案件で MCP 直接生成 → ce557cf push → revert) を踏まえ、 本素材も Claude Design 経由で並列生成 → morito 選定 → Claude Code 実装の正規フローを厳守

---

*このブリーフは maze ステージクリア時のどんぐり獲得モーダル装飾素材 3 種のみが対象。 モーダル本文 / ボタン / 中央リス / 音声 / 他ゲームのモーダル流用は対象外。*
