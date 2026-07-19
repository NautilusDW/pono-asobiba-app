# acorn-modal-undersea-cave brief

> このファイルは Claude Design (Pono LP Brand Kit) で、 pono-asobiba-app の undersea-cave (海底の洞窟探検) のクリア時に表示する 「どんぐり獲得モーダル」 に使う 装飾画像を発注するための仕様書 (実画像は Claude Design 側で GPT Image 2 系の画像エンジンを呼んで作成、 ここはあくまで brief)。 Phase 0 共通基盤 (PonoAcornModal / acorn-modal-shared.css / acorn-copy.json) は完成済、 Phase 1 maze と Phase 1.5 oto で `data-game-id` 経由の override が確立済。 本 brief は undersea-cave 用の 「真珠貝の宝箱」 世界観で **オーバーライドする装飾レイヤー** を発注する。 morito が採用案を選定 → Claude Code が `assets/ui/undersea-cave/acorn-modal/` に保存 → undersea-cave 側 body に `data-game-id="undersea-cave"` 属性を付与 + override CSS 起動 → `sw.js` の precache list 追加 + `CACHE_VERSION` バンプの流れ。

---

## context

- 対象画面: undersea-cave (海底の洞窟探検) クリア演出 → どんぐり獲得モーダル
- 役割: 海底探検の 「ごほうび」 体験を **真珠貝のお宝箱** で装飾する 3 枚 + オプション 1 枚のレイヤー素材
- 既存基盤: `window.PonoAcornModal` (common/acorn-modal.js)、 `window.PonoAcornAudio` (common/acorn-audio.js)、 `window.PonoAcornCopy` (common/acorn-copy-loader.js) は実装済。 Phase 1 maze / Phase 1.5 oto で `data-game-id` ベースの CSS オーバーライドが機能することを確認済
- undersea-cave は海底洞窟が世界観の主役 (海底の砂、 洞窟の天井、 タコ・クジラ、 真珠貝)。 oto の「深海クラブ」 とは別軸で、 こちらは **「海底の砂浜 + 真珠貝 + やわらかい水中光」** の宝物発見トーン。 oto はネオン的だが、 undersea-cave は穏やかな海底
- maze と同じく中央には既存の `risu_relief.png` (リスのレリーフ) を配置する想定 (海底でお宝の貝殻からどんぐりが出てくる演出)

---

## style guide

- 対象年齢: 子供向け 3-7 歳、 やさしい海底探検 + 宝物発見のワクワク感
- カラーパレット:
  - `#0c75a5` water blue (海中の水色、 中層)
  - `#1a4a78` deep water (海底の深部、 やや濃い水色)
  - `#f2d48b` sand beige (海底の砂)
  - `#ffd56a` pearl gold (真珠の金色グロウ、 差し色 + 中央光)
  - `#FFF6E0` cream pearl (真珠ハイライト・貝の内側)
  - `#e8a0bf` pearl pink (真珠のピンク玉虫色)
- フォント: モーダル本文は **Zen Maru Gothic** (HTML 側で適用済)。 **画像内に文字は一切入れない** こと
- 質感: pono-asobiba シリーズの絵本タッチを継承。 oto の深海ガラスより**やわらかい・あたたかい海底**。 砂粒のごく淡い質感、 貝の真珠光沢 (玉虫色のグラデ)、 水中のフワッとした光
- タッチ: oto の「深海ナイトクラブ」 とは別人格。 こちらは「砂浜のとなりの浅瀬・宝物発見」 のような穏やかさ

---

## assets (3 種 + 1 オプション)

### 1. undersea_cave_acorn_modal_frame.webp

- **寸法**: 1024 × 1280 px (透過 WebP、 lossless 推奨)
- **中央くり抜き**: 720 × 900 px の矩形は **完全透明**、 装飾は外周のみ
- **モチーフ**:
  - 上半分: **大きく開いた真珠貝** (帆立貝風の扇形、 内側が中央くり抜きを覗き込む構図)
  - 下半分: **砂浜 + 小さな珊瑚・海藻** (砂の盛り上がり、 海藻 2-3 株)
  - 4 隅に **小さな真珠玉** (`#FFF6E0` 中心 + `#e8a0bf` リム玉虫色)
- **配色**: `#f2d48b` (sand beige) で砂、 `#FFF6E0` で貝の内側、 `#e8a0bf` で貝の縁グラデ、 `#0c75a5` で海藻、 `#ffd56a` で貝のリムグロウ
- **マージン**: border-image-slice 用に **上下左右マージン 152 px** 想定
- **構図メモ**:
  - 中央くり抜きの形状は **既存 risu_relief.png に合わせた角丸矩形** (内側に納まる前提)
  - 上の真珠貝は「開いた口」 が中央くり抜き矩形に被らないように外周に納める
  - 砂浜は下辺全体に広がる感じ、 左右の海藻はやさしくゆらぐシルエット
- **alternatives 案**:
  - 案 a: 真珠貝メイン (上半分の主役)、 砂浜は控えめ (宝物発見寄り)
  - 案 b: 真珠貝 + 砂浜 + 海藻バランス (海底ジオラマ寄り)

### 2. undersea_cave_pearl_glow.webp

- **寸法**: 800 × 800 px (透過 WebP、 lossless 必須)
- **モチーフ**: 真珠の輝き (どんぐり獲得の祝祭演出)
- **配色**: 中央純白 → `#FFF6E0` cream → `#ffd56a` pearl gold → `#e8a0bf` pearl pink → 透明
- **構図**:
  - 中央放射: 完全透過 WebP、 CSS の `mix-blend-mode: lighten` で重畳可能
  - 中央半径 80 px はほぼ純白
  - 半径 80 → 180 px はクリーム + 金グラデ
  - 半径 180 → 280 px はピンク玉虫色 (`#e8a0bf` 30% alpha)
  - 半径 280 → 400 px は周辺フェードアウト (ほぼ透明)
  - 細かい泡粒 4-6 個を半径 200-380 px にランダム配置 (oto と差別化するため極小・控えめ)
- **質感**: 真珠の玉虫色グロウ、 oto の `#66e9ff` シアンとは違い、 こちらは温かい金 + ピンク
- **alternatives 案**:
  - 案 a: 金主体の真珠グロウ (王道の宝物発見)
  - 案 b: ピンク玉虫色をやや強めに (やさしい・夢っぽい)

### 3. undersea_cave_kelp_drift.webp

- **寸法**: 1024 × 320 px (透過 WebP、 lossless 推奨)
- **配置**: モーダル上端の装飾レイヤー (top: 0 重ね前提)
- **モチーフ**: 海藻 + 小さな泡 (上端から下に垂れ下がる構図、 maze の leaves の undersea 版)
- **配色**: `#0c75a5` water blue + 海藻緑 `#3a7a5a` 控えめ、 泡は `#FFF6E0` + `#e8a0bf` リム
- **構図**:
  - 中央 5 割 (横 512 px 帯) は **空白** (中央のリスやテキストを邪魔しない)
  - 左右に海藻が **垂れ下がる構図** (片側 2-3 株、 ゆらゆらシルエット)
  - 海藻の合間に小さな泡を 2-3 個ずつ
- **質感**: 葉脈は描かず、 海藻のシルエットを淡いグラデで表現
- **alternatives 案**:
  - 案 a: 左右対称 海藻 2+2 株 + 泡 4 個 (落ち着き海底)
  - 案 b: 左 3 + 右 2 株 非対称 + 泡 6 個 (動きある海底)

### 4. undersea_cave_water_caustics.webp (オプション)

- **寸法**: 1024 × 512 px (透過 WebP、 lossless 推奨)
- **モチーフ**: 水中の caustics 模様 (天井から差し込む光の網目)
- **配色**: `#FFF6E0` 25% alpha (上端) → 透明 (下端) の縦グラデ
- **構図**:
  - キャンバス上端から **波打つ網目模様** (caustics)
  - 模様の幅は緩やかに動く有機的な曲線、 メッシュ風
  - 下方向にフェードアウト
- **質感**: ガウスぼかし強め、 シャープなエッジ禁止 (oto の underwater_light_shaft とは違う「網目」 質感)
- **重畳モード**: CSS の `mix-blend-mode: lighten` または `screen` で重ねる前提
- **alternatives 案**:
  - 案 a: 網目密 (くっきり海底感)
  - 案 b: 網目粗 (やわらかい水中光感)

---

## reference

- **既存 risu_relief.png** を中央に配置する前提 (これは maze / oto と同一素材)
- **既存 undersea-cave/ の素材** (`assets/images/undersea-cave/item_pearl_shell.png` 真珠貝のアイコン、 `bg_ceiling.png` / `bg_floor_sand.png` 海底背景パーツ) の色味とタッチを継承
- **既存 oto の深海素材** とは **明確に違うトーン** (oto はネオン深海クラブ、 undersea-cave は穏やかな砂浜の海底)
- **pono-asobiba LP の質感** (絵本タッチ・やわらかい筆致) を継承しつつ、 トーンは「やさしい海底探検」 寄り
- **NG リファレンス**:
  - リアル写真の海底合成
  - oto と同じネオンシアン グロウ (色味かぶり禁止)
  - 深海の暗さ・怖さ (kids 向けやさしい海底)
  - 魚・タコ等の生き物追加 (本素材は貝 + 砂 + 海藻 + 泡のみ、 NPC キャラは別管理)

---

## delivery

- **出力先 (Claude Code 配置先)**: `assets/ui/undersea-cave/acorn-modal/`
- **命名 (リネーム禁止)**:
  - `undersea_cave_acorn_modal_frame.webp`
  - `undersea_cave_pearl_glow.webp`
  - `undersea_cave_kelp_drift.webp`
  - `undersea_cave_water_caustics.webp` (オプション)
- **形式**: WebP、 lossless 推奨、 **透過必須**
- **採用後**:
  1. Claude Code が `assets/ui/undersea-cave/acorn-modal/` に保存
  2. undersea-cave/index.html の `<body>` に `data-game-id="undersea-cave"` 属性を追加
  3. acorn-modal-shared.css に `body[data-game-id="undersea-cave"] .pono-acorn-modal { ... }` の override セクションを追加 (frame border-image + pearl glow ::after + kelp ::before + caustics option)
  4. `sw.js` の **precache list に 3-4 ファイル追加** + `CACHE_VERSION` バンプ (SW update 検知のため +2 推奨)
  5. `develop-app` ブランチで push → App staging (`https://pono-asobiba-app-staging.ndw.workers.dev/`) で実機確認
  6. iPhone / iPad / PC の 3 BP で重畳具合 (frame くり抜き + 中央 risu + pearl glow lighten + kelp 上端 + caustics option) を確認

---

## NG (絶対やらない)

- **画像内に文字を入れる** (本文は HTML 側 Zen Maru Gothic で描画)
- **emoji の埋め込み**
- **ネオン蛍光のキツい彩度** (style guide パレットから逸脱)
- **oto と同じネオンシアン トーン** (`#66e9ff` 主体は禁止、 undersea-cave は温色寄り)
- **深海の暗さ・怖さ** (kids 向けやさしい海底)
- **キャラクター描画** (ポノ / ハリネズミ / リス / タコ / クジラは別素材で別配置、 本素材は装飾レイヤー専任)
- **背景色付き** (透過必須)
- **JPEG 出力** (透過必須のため WebP 一択)
- **frame 中央くり抜き矩形に装飾を被せる** (完全透明厳守、 risu_relief.png 配置領域を侵さない)
- **kelp drift の中央 5 割帯に海藻・泡を被せる** (中央テキスト・risu を隠してはいけない)
- **写真合成のリアル海底** (絵本タッチ厳守)
- **maze の森・oto の深海クラブ・bento の和食卓モチーフ混入** (undersea-cave は穏やか海底限定、 トーン混在禁止)
- **画像 AR を歪める前提のサイズ指定** (background-size:100% 100% / object-fit:fill は CSS 実装時も永久 NG)

---

## メモ (morito / 実装者向け)

- Phase 0 共通基盤 (PonoAcornModal API, `--acorn-z=99997`, BEM クラス) の挙動は逸脱しない
- 本素材は **装飾レイヤー** で、 機能 DOM (ボタン / テキスト / risu) は HTML 側で別管理
- `data-game-id="undersea-cave"` ベースの CSS override でやさしい海底トーンに切り替える (Phase 1 maze で動作確認済)
- frame の border-image-slice 152 px は CSS 側で `border-image: url(...) 152 fill / 152px stretch` 想定。 厳守
- pearl glow は `mix-blend-mode: lighten` でリス上に重ねる前提
- kelp drift は `position: absolute; top: -32px; left: 0; right: 0` で上端配置を想定
- caustics はオプション、 採用時は上端から `mix-blend-mode: screen` で重畳
- maze の Fukuro_frame_001.png 流用方式 (panel aspect-ratio + contain 配置) と同じ実装パターンが取れるなら、 frame.webp も AR 維持で配置する
- **oto と色味が被らないよう** 真珠の温色グロウ (金 + ピンク + クリーム) を主軸にする (oto はシアン主体、 undersea-cave は温色主体)
- 素材は **セットで採用** (案単位)、 mix-and-match は質感ズレを生む可能性があるため非推奨
- 過去事故 (hero-labels 案件で MCP 直接生成 → ce557cf push → revert) を踏まえ、 本素材も Claude Design 経由で並列生成 → morito 選定 → Claude Code 実装の正規フローを厳守

---

*このブリーフは undersea-cave クリア時のどんぐり獲得モーダル装飾素材 3 種 (+ オプション 1 種) のみが対象。 モーダル本文 / ボタン / 中央リス / 音声 / 他ゲームのモーダル流用 / undersea-cave 本編の NPC (タコ・クジラ等) ・背景素材は対象外。*
