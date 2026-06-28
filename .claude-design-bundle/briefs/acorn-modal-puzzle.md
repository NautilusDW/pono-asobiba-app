# acorn-modal-puzzle brief

> このファイルは Claude Design (Pono LP Brand Kit) で、 pono-asobiba-app の puzzle (ジグソーパズル) のステージクリア時に表示する 「どんぐり獲得モーダル」 に使う 装飾画像を発注するための仕様書 (実画像は Claude Design 側で GPT Image 2 系の画像エンジンを呼んで作成、 ここはあくまで brief)。 Phase 0 共通基盤 (PonoAcornModal / acorn-modal-shared.css / acorn-copy.json) は完成済、 Phase 1 maze と Phase 1.5 oto で `data-game-id` 経由の override が確立済。 本 brief は puzzle 用の 「木製パズルピース枠」 世界観で **オーバーライドする装飾レイヤー** を発注する。 morito が採用案を選定 → Claude Code が `assets/ui/puzzle/acorn-modal/` に保存 → puzzle 側 body に `data-game-id="puzzle"` 属性を付与 + override CSS 起動 → `sw.js` の precache list 追加 + `CACHE_VERSION` バンプの流れ。

---

## context

- 対象画面: puzzle (ジグソーパズル) ステージクリア演出 → どんぐり獲得モーダル
- 役割: パズル完成の 「ごほうび」 体験を **木製パズルピース枠** で装飾する 2 枚 + オプション 1 枚のレイヤー素材
- 既存基盤: `window.PonoAcornModal` (common/acorn-modal.js)、 `window.PonoAcornAudio` (common/acorn-audio.js)、 `window.PonoAcornCopy` (common/acorn-copy-loader.js) は実装済。 Phase 1 maze / Phase 1.5 oto で `data-game-id` ベースの CSS オーバーライドが機能することを確認済
- puzzle はピース型 UI が世界観の主役 (ピースのはめ込み、 完成の達成感)、 maze の 「森・絵本ページ」 トーンに近いが、 装飾のメインモチーフは **絡み合うパズルピース + 木目フレーム** に置き換わる
- maze と同じく中央には既存の `risu_relief.png` (リスのレリーフ) を配置する想定

---

## style guide

- 対象年齢: 子供向け 3-7 歳、 やわらかい木のおもちゃ感 + 完成の祝祭感
- カラーパレット:
  - `#FFF6E0` cream (紙地ベース、 maze と共通)
  - `#6A8FBF` puzzle blue (puzzle UI 既存トーン、 ピースのアクセント色)
  - `#9DBDE0` puzzle pale blue (薄ハイライト)
  - `#C8965A` wood mid (木製ピース木目)
  - `#6E4520` wood dark (木枠輪郭・木目影)
  - `#F5A623` warm accent (完成時の差し色、 控えめ)
- フォント: モーダル本文は **Zen Maru Gothic** (HTML 側で適用済)。 **画像内に文字は一切入れない** こと
- 質感: pono-asobiba シリーズの絵本タッチを継承、 「木製おもちゃのパズル」 の手触り感 (角丸・木目・やわらかい影) を意識
- タッチ: maze の紙繊維感と oto の海中グロウの中間。 ベタ塗りではなく、 木目の細い線描 + 淡いハイライトで立体

---

## assets (2 種 + 1 オプション)

### 1. puzzle_acorn_modal_frame.webp

- **寸法**: 1024 × 1280 px (透過 WebP、 lossless 推奨)
- **中央くり抜き**: 720 × 900 px の矩形は **完全透明**、 装飾は外周のみ
- **モチーフ**:
  - 4 隅に **大きめの木製ジグソーピース** (突起の凸凹を持つ、 各隅 1 枚ずつ計 4 枚)
  - 4 辺の中央付近に **小ぶりのピース** が 1-2 枚ずつ、 軽くカチッとはめ込まれた状態
  - ピース間に細い「カチッと」ハイライト (淡シアン `#9DBDE0`)
- **配色**: `#C8965A` (wood mid) + `#6E4520` (wood dark) ベース、 一部のピースに `#6A8FBF` puzzle blue ベタ (青塗りピースを 2-3 枚混ぜる)
- **マージン**: border-image-slice 用に **上下左右マージン 152 px** 想定 (くり抜き矩形が中央寄せされ、 外周 152 px は装飾領域)
- **構図メモ**:
  - 中央くり抜きの形状は **既存 risu_relief.png に合わせた角丸矩形** (内側に納まる前提)
  - 4 隅のピースは互いに 5-10% 角度を振って、 完全シンメトリーは避ける (子供のおもちゃ感)
  - ピースの突起は外側に向ける (装飾領域内で完結、 くり抜き矩形を侵さない)
- **alternatives 案**:
  - 案 a: 木目色 (`#C8965A` / `#6E4520`) 主体、 青塗りピースは 2 枚のみ (落ち着き重視)
  - 案 b: 木目 + 青塗りピース半々、 角に小さい `#F5A623` 差し色ピースを 1 枚 (祝祭感寄り)

### 2. puzzle_acorn_complete_sparkle.webp

- **寸法**: 800 × 800 px (透過 WebP、 lossless 必須)
- **モチーフ**: パズル完成時の輝き (中央放射光 + 細かいキラッ星)
- **配色**:
  - 中央放射: 白 → `#FFEF8A` 黄金グラデ
  - 細かいキラッ星: 4-6 個、 `#9DBDE0` puzzle pale blue + `#FFEF8A` の二色を混在
- **構図**:
  - 中央半径 80 px はほぼ純白 (どんぐりのハイライト位置)
  - 半径 80 → 240 px は黄金 + シアンのソフトグラデ
  - 半径 240 → 400 px は周辺フェードアウト (ほぼ透明)
  - キラッ星は 4-6 個、 半径 200-380 px の範囲にランダム配置 (シンメトリー禁止)
  - 星の形は **4 辺の十字スパーク** (シャープすぎず、 角丸の十字)、 直径 30-60 px のバラつき
- **質感**: ふんわりした絵本のスポット光 + 木のおもちゃが完成したときのキラッ
- **alternatives 案**:
  - 案 a: 中央放射が強め、 キラッ星 4 個 (シンプル絵本)
  - 案 b: 中央放射控えめ、 キラッ星 6 個 (賑やか祝祭)

### 3. puzzle_piece_confetti.webp (オプション)

- **寸法**: 1024 × 320 px (透過 WebP、 lossless 推奨)
- **配置**: モーダル上端の装飾レイヤー (top: 0 重ね前提)
- **モチーフ**: 小さなパズルピース (各 40-80 px 程度) が 5-8 枚、 上端から軽く舞い落ちる構図
- **配色**: 木目 `#C8965A` + 青塗り `#6A8FBF` + 差し色 `#F5A623` のミックス
- **構図**:
  - 中央 5 割 (横 512 px 帯) は **空白** (中央のリスやテキストを邪魔しない)
  - 左右に分散、 各ピースの角度はバラバラ (-30度 〜 +30度)
  - 上から下にフェードアウト (上濃く下淡く)
- **質感**: maze の leaves と同じく上端装飾レイヤー、 maze leaves の puzzle 版替わり
- **alternatives 案**:
  - 案 a: ピース 5 枚 (左 2 右 3、 落ち着き)
  - 案 b: ピース 8 枚 (左 4 右 4、 賑やか)

---

## reference

- **既存 risu_relief.png** を中央に配置する前提。 frame の中央くり抜き形状はそれに合わせること (角丸矩形、 比 720:900)
- **既存 puzzle/ui/ の UI パーツ** (ピース形状のボタン装飾等) の puzzle blue トーンを継承
- **既存 Fukuro_frame_001.png** (maze で流用中の枠 PNG) の cream paper トーンを参考、 ただし葉装飾はパズルピースに置換
- **pono-asobiba LP の質感** (絵本タッチ、 やわらかい紙ベージュ + 焦茶手書き) を継承
- **NG リファレンス**: 写真合成のリアル木材、 ジグソーゲームの UI スクリーンショット、 ネオン蛍光色

---

## delivery

- **出力先 (Claude Code 配置先)**: `assets/ui/puzzle/acorn-modal/`
- **命名 (リネーム禁止)**:
  - `puzzle_acorn_modal_frame.webp`
  - `puzzle_acorn_complete_sparkle.webp`
  - `puzzle_piece_confetti.webp` (オプション)
- **形式**: WebP、 lossless 推奨、 **透過必須**
- **採用後**:
  1. Claude Code が `assets/ui/puzzle/acorn-modal/` に保存
  2. puzzle/index.html の `<body>` に `data-game-id="puzzle"` 属性を追加
  3. acorn-modal-shared.css に `body[data-game-id="puzzle"] .pono-acorn-modal { ... }` の override セクションを追加 (frame border-image + sparkle ::after + confetti ::before)
  4. `sw.js` の **precache list に 2-3 ファイル追加** + `CACHE_VERSION` バンプ (SW update 検知のため +2 推奨)
  5. `develop-app` ブランチで push → App staging (`https://pono-asobiba-app-staging.ndw.workers.dev/`) で実機確認
  6. iPhone / iPad / PC の 3 BP で重畳具合 (frame くり抜き + 中央 risu + sparkle 重畳 + confetti 上端) を確認

---

## NG (絶対やらない)

- **画像内に文字を入れる** (本文は HTML 側 Zen Maru Gothic で描画)
- **emoji の埋め込み**
- **ネオン・蛍光色** (style guide 配色から逸脱)
- **キャラクター描画** (ポノ / ハリネズミ / リス本体は別素材で別配置、 本素材は装飾レイヤー専任)
- **背景色付き** (透過必須)
- **JPEG 出力** (透過必須のため WebP 一択)
- **frame 中央くり抜き矩形に装飾を被せる** (完全透明厳守、 risu_relief.png 配置領域を侵さない)
- **confetti の中央 5 割帯にピースを被せる** (中央テキスト・risu を隠してはいけない)
- **写真合成のリアル木材** (絵本タッチ厳守)
- **画像 AR を歪める前提のサイズ指定** (background-size:100% 100% / object-fit:fill は CSS 実装時も永久 NG、 contain ベースで配置)

---

## メモ (morito / 実装者向け)

- Phase 0 共通基盤 (PonoAcornModal API, `--acorn-z=99997`, BEM クラス) の挙動は逸脱しない
- 本素材は **装飾レイヤー** で、 機能 DOM (ボタン / テキスト / risu) は HTML 側で別管理
- `data-game-id="puzzle"` ベースの CSS override で puzzle トーンに切り替える (Phase 1 maze で動作確認済)
- frame の border-image-slice 152 px は CSS 側で `border-image: url(...) 152 fill / 152px stretch` 想定。 厳守
- sparkle は `mix-blend-mode: lighten` でリス上に重ねる前提
- confetti は `position: absolute; top: -32px; left: 0; right: 0` で上端からはみ出し配置を想定
- maze の Fukuro_frame_001.png 流用方式 (panel aspect-ratio + contain 配置) と同じ実装パターンが取れるなら、 frame.webp も AR 維持で配置する
- 素材は **セットで採用** (案単位)、 mix-and-match は質感ズレを生む可能性があるため非推奨
- 過去事故 (hero-labels 案件で MCP 直接生成 → ce557cf push → revert) を踏まえ、 本素材も Claude Design 経由で並列生成 → morito 選定 → Claude Code 実装の正規フローを厳守

---

*このブリーフは puzzle ステージクリア時のどんぐり獲得モーダル装飾素材 2 種 (+ オプション 1 種) のみが対象。 モーダル本文 / ボタン / 中央リス / 音声 / 他ゲームのモーダル流用 / puzzle 本編のピース素材は対象外。*
