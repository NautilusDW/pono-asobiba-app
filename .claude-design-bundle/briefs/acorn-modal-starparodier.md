# acorn-modal-starparodier brief

> このファイルは Claude Design (Pono LP Brand Kit) で、 pono-asobiba-app の starparodier (ほしのポノディア / 縦シューティング) のステージクリア時に表示する 「どんぐり獲得モーダル」 に使う 装飾画像を発注するための仕様書 (実画像は Claude Design 側で GPT Image 2 系の画像エンジンを呼んで作成、 ここはあくまで brief)。 Phase 0 共通基盤 (PonoAcornModal / acorn-modal-shared.css / acorn-copy.json) は完成済、 Phase 1 maze と Phase 1.5 oto で `data-game-id` 経由の override が確立済。 本 brief は starparodier 用の 「宇宙船コックピット ビューファインダー」 世界観で **オーバーライドする装飾レイヤー** を発注する。 morito が採用案を選定 → Claude Code が `assets/ui/starparodier/acorn-modal/` に保存 → starparodier 側 body に `data-game-id="starparodier"` 属性を付与 + override CSS 起動 → `sw.js` の precache list 追加 + `CACHE_VERSION` バンプの流れ。

---

## context

- 対象画面: starparodier (ほしのポノディア / 縦スクロール STG) ステージクリア演出 → どんぐり獲得モーダル
- 役割: ステージクリアの 「ごほうび」 体験を **コックピットのビューファインダー (HUD 風)** で装飾する 3 枚 + オプション 1 枚のレイヤー素材
- 既存基盤: `window.PonoAcornModal` (common/acorn-modal.js)、 `window.PonoAcornAudio` (common/acorn-audio.js)、 `window.PonoAcornCopy` (common/acorn-copy-loader.js) は実装済。 Phase 1 maze / Phase 1.5 oto で `data-game-id` ベースの CSS オーバーライドが機能することを確認済
- starparodier は宇宙シューティング (player_ship_pono が主役、 月パララックス背景、 ボス stargbrain 等)。 maze 「森」 と oto 「深海」、 bento 「和食卓」 とは別の **「宇宙コックピット・サイバー」** トーンを担う。 深宇宙ネイビー + シアンスキャナー + バイオレットエネルギーの近未来 HUD
- maze と同じく中央には既存の `risu_relief.png` (リスのレリーフ) を配置する想定 (宇宙服を着ているような演出を周囲フレームで暗示)

---

## style guide

- 対象年齢: 子供向け 3-7 歳、 ワクワクする宇宙の冒険トーン (怖くない、 ポップな宇宙)
- カラーパレット:
  - `#101545` deep space (深宇宙ネイビー、 背景最深部)
  - `#1d2a7a` mid space (中層宇宙)
  - `#66e9ff` cyan scanner (HUD ライン・スキャナー光)
  - `#c77dff` violet energy (エネルギーグロウ・差し色)
  - `#7effc7` mint accent (達成のキラ感、 控えめ)
  - `#FFEF8A` gold acorn (どんぐり中央のみ、 oto と共通)
- フォント: モーダル本文は **Zen Maru Gothic** (HTML 側で適用済)。 **画像内に文字は一切入れない** こと
- 質感: pono-asobiba シリーズの絵本タッチを維持しつつ、 starparodier だけは **コックピットの計器パネル感 + サイバーグロウ** を強調。 線が細く幾何的、 ベタは少なくグロウが多い
- タッチ: maze の紙繊維、 oto の水中ガラス、 bento の漆器、 のいずれとも違う。 **薄い金属パネル + 発光リング + 細かい計器ライン** の質感

---

## assets (3 種 + 1 オプション)

### 1. starparodier_acorn_modal_frame.webp

- **寸法**: 1024 × 1280 px (透過 WebP、 lossless 推奨)
- **中央くり抜き**: 720 × 900 px の矩形は **完全透明**、 装飾は外周のみ (ビューファインダー越しに risu が見える)
- **モチーフ**:
  - 宇宙船のコックピット計器パネル風の外枠
  - 上辺中央に **小さな丸窓 (レーダー / オーディオメーター)** を 2-3 個
  - 下辺中央にコックピットボタン列 (発光する丸ボタンを 3-5 個、 凹凸控えめ)
  - 4 隅に **リベット (六角ボルト)** 各 1 個 (金属パネル感)
  - 内側 (くり抜き矩形の縁) に **シアンスキャナーライン** (`#66e9ff` 80% alpha、 細幅 2-3 px)
- **配色**: `#101545` (deep space) ベース、 `#1d2a7a` (mid space) で金属パネル、 `#66e9ff` (cyan scanner) でスキャナーライン、 `#c77dff` (violet energy) で丸ボタンのうち 1-2 個のグロウ
- **マージン**: border-image-slice 用に **上下左右マージン 152 px** 想定
- **構図メモ**:
  - 中央くり抜きの形状は **既存 risu_relief.png に合わせた角丸矩形** (内側に納まる前提)
  - 計器パネルらしい「左右対称性」 を 80% 守りつつ、 ボタン配色のバリエーションで遊ぶ
  - サイバー演出だが**怖くない**、 ポップ寄り
- **alternatives 案**:
  - 案 a: シアン主体 (HUD 寄り、 計器メイン)、 violet は 1 個のみアクセント
  - 案 b: シアン + violet 半々 (エネルギー寄り、 祝祭感)

### 2. starparodier_acorn_warp_burst.webp

- **寸法**: 800 × 800 px (透過 WebP、 lossless 必須)
- **モチーフ**: ワープ突入の放射光 (どんぐり獲得の祝祭演出 = 「やった！ ステージクリア！」)
- **配色**: 白中心 → シアン `#66e9ff` → violet `#c77dff` → 透明、 グラデ
- **構図**:
  - 中央放射: 完全透過 WebP、 CSS の `mix-blend-mode: lighten` または `screen` で重畳
  - 中央半径 80 px はほぼ純白 (どんぐりのハイライト)
  - 半径 80 → 160 px はシアングラデ
  - 半径 160 → 260 px は violet グラデ
  - 半径 260 → 400 px は周辺フェードアウト (ほぼ透明)
  - 細い放射ライン (8-12 本) を中心から外に向けて、 線幅 1-2 px の細さ (シャープすぎず角丸)
  - ワープ突入の「線が伸びる」感じ
- **質感**: maze の glow のような「ふんわり」 と違い、 サイバーの「シャキッと細いライン」 を許容。 ただし子供向けにエッジは丸める
- **alternatives 案**:
  - 案 a: 放射ライン 8 本 (シンプルワープ)
  - 案 b: 放射ライン 12 本 + 細かい星粒 4-6 個追加 (賑やかワープ)

### 3. starparodier_starfield_top.webp

- **寸法**: 1024 × 320 px (透過 WebP、 lossless 推奨)
- **配置**: モーダル上端の装飾レイヤー (top: 0 重ね前提)
- **モチーフ**: 星雲 + 散布する星 (上端から下に向けて深宇宙が広がる感じ)
- **配色**: `#101545` の薄いベース (10-20% alpha) + 星粒は白 + シアン + violet のミックス、 星雲は violet と シアン の淡いグラデ
- **構図**:
  - 中央 5 割 (横 512 px 帯) は **空白 or 極淡** (中央のリスやテキストを邪魔しない)
  - 左右に星雲のかすみ + 散布星 (片側 8-12 個)
  - 上から下にフェードアウト (上濃く下淡く)
- **質感**: maze の leaves と同じく上端装飾、 starparodier 版の宇宙星雲リプレース
- **alternatives 案**:
  - 案 a: 星雲シアン寄り、 星粒 16 個 (静かな宇宙)
  - 案 b: 星雲 violet 寄り、 星粒 22 個 (賑やか宇宙)

### 4. starparodier_scanner_sweep.webp (オプション)

- **寸法**: 1024 × 512 px (透過 WebP、 lossless 推奨)
- **モチーフ**: HUD スキャナースイープライン 2-3 本 (oto の underwater_light_shaft の宇宙版)
- **配色**: `#66e9ff` 40% alpha (上端) → 透明 (下端) の縦グラデ
- **構図**:
  - キャンバス上端から斜め下方向に **2-3 本の細長いスキャナー光** (幅 60-120 px、 長さ 500 px)
  - 光柱の角度はそれぞれ違う (左 -10度、 中央 0度、 右 +10度 等)
  - 下方向にフェードアウト
- **質感**: ガウスぼかし強め、 シャープなエッジ禁止 (oto と同じ運用思想)
- **重畳モード**: CSS の `mix-blend-mode: lighten` または `screen` で重ねる前提
- **alternatives 案**:
  - 案 a: 3 本シンメトリー寄り
  - 案 b: 2 本非対称 (動きあり)

---

## reference

- **既存 starparodier/ の player_ship_pono.png** (宇宙船キャラ) の絵本タッチ + ポップ宇宙トーンを継承
- **既存 moon_far_loop.png / moon_mid_loop.png / moon_near_loop.png** (月パララックス背景) の深宇宙ネイビー色味を継承
- **既存 risu_relief.png** を中央に配置する前提 (これは maze / oto と同一素材)
- **pono-asobiba LP の質感** (絵本タッチ・やわらかい筆致) を継承しつつ、 トーンは「ポップな宇宙コックピット」 寄り
- **NG リファレンス**:
  - リアル写真の宇宙写真合成
  - ハードコアシューティングのメカニック計器 (大人向けに振り切らない)
  - ホラー宇宙 (怖さ NG)
  - ネオン蛍光のキツい彩度

---

## delivery

- **出力先 (Claude Code 配置先)**: `assets/ui/starparodier/acorn-modal/`
- **命名 (リネーム禁止)**:
  - `starparodier_acorn_modal_frame.webp`
  - `starparodier_acorn_warp_burst.webp`
  - `starparodier_starfield_top.webp`
  - `starparodier_scanner_sweep.webp` (オプション)
- **形式**: WebP、 lossless 推奨、 **透過必須**
- **採用後**:
  1. Claude Code が `assets/ui/starparodier/acorn-modal/` に保存
  2. starparodier/index.html の `<body>` に `data-game-id="starparodier"` 属性を追加
  3. acorn-modal-shared.css に `body[data-game-id="starparodier"] .pono-acorn-modal { ... }` の override セクションを追加 (frame border-image + warp ::after + starfield ::before + scanner option)
  4. `sw.js` の **precache list に 3-4 ファイル追加** + `CACHE_VERSION` バンプ (SW update 検知のため +2 推奨)
  5. `develop-app` ブランチで push → App staging (`https://pono-asobiba-app-staging.ndw.workers.dev/`) で実機確認
  6. iPhone / iPad / PC の 3 BP で重畳具合 (frame くり抜き + 中央 risu + warp 重畳 + starfield 上端 + scanner option) を確認

---

## NG (絶対やらない)

- **画像内に文字を入れる** (本文は HTML 側 Zen Maru Gothic で描画)
- **emoji の埋め込み**
- **ネオン蛍光のキツい彩度** (style guide パレットから逸脱)
- **怖い宇宙・ホラー演出** (kids 向けポップ宇宙を厳守)
- **キャラクター描画** (ポノ / ハリネズミ / リス本体は別素材で別配置、 本素材は装飾レイヤー専任)
- **背景色付き** (透過必須)
- **JPEG 出力** (透過必須のため WebP 一択)
- **frame 中央くり抜き矩形に装飾を被せる** (完全透明厳守、 risu_relief.png 配置領域を侵さない)
- **starfield の中央 5 割帯に星雲・星粒を濃く被せる** (中央テキスト・risu を隠してはいけない)
- **大人向け SF メカニック計器の質感** (リアル金属感は控えめに、 絵本タッチ寄り)
- **maze の森・oto の海中・bento の和食卓モチーフ混入** (starparodier は宇宙限定、 トーン混在禁止)
- **画像 AR を歪める前提のサイズ指定** (background-size:100% 100% / object-fit:fill は CSS 実装時も永久 NG)
- **シャープなレーザーエッジ** (warp burst / scanner sweep は柔らかい blur 必須)

---

## メモ (morito / 実装者向け)

- Phase 0 共通基盤 (PonoAcornModal API, `--acorn-z=99997`, BEM クラス) の挙動は逸脱しない
- 本素材は **装飾レイヤー** で、 機能 DOM (ボタン / テキスト / risu) は HTML 側で別管理
- `data-game-id="starparodier"` ベースの CSS override で宇宙トーンに切り替える (Phase 1 maze で動作確認済)
- frame の border-image-slice 152 px は CSS 側で `border-image: url(...) 152 fill / 152px stretch` 想定。 厳守
- warp burst は `mix-blend-mode: lighten` でリス上に重ねる前提
- starfield は `position: absolute; top: -32px; left: 0; right: 0` で上端配置を想定
- scanner sweep はオプション、 採用時は上端から `mix-blend-mode: screen` で重畳
- maze の Fukuro_frame_001.png 流用方式 (panel aspect-ratio + contain 配置) と同じ実装パターンが取れるなら、 frame.webp も AR 維持で配置する
- 素材は **セットで採用** (案単位)、 mix-and-match は質感ズレを生む可能性があるため非推奨
- 過去事故 (hero-labels 案件で MCP 直接生成 → ce557cf push → revert) を踏まえ、 本素材も Claude Design 経由で並列生成 → morito 選定 → Claude Code 実装の正規フローを厳守

---

*このブリーフは starparodier ステージクリア時のどんぐり獲得モーダル装飾素材 3 種 (+ オプション 1 種) のみが対象。 モーダル本文 / ボタン / 中央リス / 音声 / 他ゲームのモーダル流用 / starparodier 本編の宇宙船・敵キャラ素材は対象外。*
