# acorn-modal-bento brief

> このファイルは Claude Design (Pono LP Brand Kit) で、 pono-asobiba-app の bento (お弁当づくり) のクリア時に表示する 「どんぐり獲得モーダル」 に使う 装飾画像を発注するための仕様書 (実画像は Claude Design 側で GPT Image 2 系の画像エンジンを呼んで作成、 ここはあくまで brief)。 Phase 0 共通基盤 (PonoAcornModal / acorn-modal-shared.css / acorn-copy.json) は完成済、 Phase 1 maze と Phase 1.5 oto で `data-game-id` 経由の override が確立済。 本 brief は bento 用の 「漆塗り重箱 (うるしぬり じゅうばこ)」 世界観で **オーバーライドする装飾レイヤー** を発注する。 morito が採用案を選定 → Claude Code が `assets/ui/bento/acorn-modal/` に保存 → bento 側 body に `data-game-id="bento"` 属性を付与 + override CSS 起動 → `sw.js` の precache list 追加 + `CACHE_VERSION` バンプの流れ。

---

## context

- 対象画面: bento (お弁当づくり) クリア演出 → どんぐり獲得モーダル
- 役割: 完成お弁当の 「ごほうび」 体験を **漆塗り重箱 + 金箔装飾** で装飾する 3 枚のレイヤー素材
- 既存基盤: `window.PonoAcornModal` (common/acorn-modal.js)、 `window.PonoAcornAudio` (common/acorn-audio.js)、 `window.PonoAcornCopy` (common/acorn-copy-loader.js) は実装済。 Phase 1 maze / Phase 1.5 oto で `data-game-id` ベースの CSS オーバーライドが機能することを確認済
- bento はお弁当箱・おかず・のり・ふりかけが世界観の主役。 maze の 「森」 と oto の 「深海」 とは別の **「和の食卓・お祝い箱」** トーンを担う。 漆塗りの濃赤茶 (`#d96f49`) + 金箔 (`#ffd56a`) + 黒木目 (`#3d2817`) の和テイストで、 完成お弁当のハレ感を演出
- maze と同じく中央には既存の `risu_relief.png` (リスのレリーフ) を配置する想定

---

## style guide

- 対象年齢: 子供向け 3-7 歳、 和のお祝い箱のハレ感 + 食卓のあたたかさ
- カラーパレット:
  - `#d96f49` lacquer red-brown (漆塗りの濃赤茶、 重箱メイン色)
  - `#a64a2e` lacquer deep (漆塗りの影・深部)
  - `#3d2817` dark wood (黒木目・木枠の輪郭)
  - `#ffd56a` gold accent (金箔・差し色)
  - `#FFF6E0` cream (敷紙・和紙の地)
  - `#6c8e3f` leaf green (笹の葉装飾、 控えめに)
- フォント: モーダル本文は **Zen Maru Gothic** (HTML 側で適用済)。 **画像内に文字は一切入れない** こと
- 質感: pono-asobiba シリーズの絵本タッチを継承、 漆器の艶 (淡いハイライト) + 金箔のキラ感 + 和紙の繊維感
- タッチ: maze の紙繊維よりやや濃く、 oto の深海ガラスよりは温かい。 漆器のしっとりした光沢 + 金箔の細粒感

---

## assets (3 種)

### 1. bento_acorn_modal_frame.webp

- **寸法**: 1024 × 1280 px (透過 WebP、 lossless 推奨)
- **中央くり抜き**: 720 × 900 px の矩形は **完全透明**、 装飾は外周のみ
- **モチーフ**:
  - 漆塗り重箱の外枠 (角は丸み、 四隅に小さな金箔の角金具)
  - 上辺・下辺に **金箔の和柄ボーダー** (波文 or 七宝つなぎを薄く、 控えめ)
  - 内側 (くり抜き矩形の縁) に細い金色のライン (`#ffd56a` 60% alpha)
- **配色**: `#d96f49` (lacquer red-brown) ベース、 `#a64a2e` で漆の影、 `#3d2817` で木枠の輪郭、 `#ffd56a` で金箔ライン・角金具
- **マージン**: border-image-slice 用に **上下左右マージン 152 px** 想定 (くり抜き矩形が中央寄せされ、 外周 152 px は装飾領域)
- **構図メモ**:
  - 中央くり抜きの形状は **既存 risu_relief.png に合わせた角丸矩形** (内側に納まる前提)
  - 漆器らしい艶ハイライト (`#FFF6E0` 20% alpha) を 4 隅にごく淡く入れる
  - 角金具は左右対称、 重箱らしい「正面性」 を尊重
- **alternatives 案**:
  - 案 a: 漆赤茶ベタ、 金箔ボーダーは細め (落ち着いた和)
  - 案 b: 漆赤茶 + 金箔ボーダー太め + 角金具大きめ (ハレ祝祭、 お正月感)

### 2. bento_acorn_sasa_leaves.webp

- **寸法**: 1024 × 320 px (透過 WebP、 lossless 推奨)
- **配置**: モーダル上端の装飾レイヤー (top: 0 重ね前提)
- **モチーフ**: 笹の葉 + 南天の実 (お弁当の仕切りや祝箸の装飾モチーフ)
- **配色**: `#6c8e3f` (leaf green) + `#a4c76d` (薄緑) ベース、 南天の実は赤系 `#d96f49` で 2-3 粒のみアクセント
- **構図**:
  - 中央 5 割 (横 512 px 帯) は **空白** (中央のリスやテキストを邪魔しない)
  - 左右に笹の葉が **垂れ下がる構図** (3-4 枚ずつ、 葉脈は焦茶細線)
  - 南天の実は左右どちらかの葉の根本に 2-3 粒、 控えめ
- **質感**: 笹の葉は淡いグラデで立体感、 ベタ塗りせず葉脈を細く描く
- **alternatives 案**:
  - 案 a: 左右対称で 笹 3+3 枚 + 南天 0 粒 (シンプル和)
  - 案 b: 左 4 + 右 3 の非対称、 南天 3 粒を右下に集中 (祝祭和)

### 3. bento_acorn_gold_kira.webp

- **寸法**: 800 × 800 px (透過 WebP、 lossless 必須)
- **モチーフ**: 金箔のキラキラ放射 (どんぐり獲得の祝祭演出)
- **配色**: 金 `#ffd56a` + 白ハイライト、 周辺フェードアウト
- **構図**:
  - 中央放射: 完全透過 WebP、 CSS の `mix-blend-mode: lighten` で重畳可能
  - 中央半径 80 px はほぼ純白
  - 半径 80 → 220 px は金箔グラデ (`#ffd56a`)
  - 半径 220 → 400 px は周辺フェードアウト (ほぼ透明)
  - 細かい金粉のキラッ星 5-7 個を半径 180-380 px にランダム配置
  - 星の形は **菱形 or 4 辺の十字** (和の意匠を意識、 シャープすぎない)
- **質感**: ふんわりした絵本のスポット光 + 金箔のキラ感、 西洋のグリッターではなく和の金箔
- **alternatives 案**:
  - 案 a: 中央放射主体、 キラッ星 5 個 (控えめ和)
  - 案 b: 中央放射控えめ、 キラッ星 7 個 (賑やかな祝祭)

---

## reference

- **既存 risu_relief.png** を中央に配置する前提。 frame の中央くり抜き形状はそれに合わせること (角丸矩形、 比 720:900)
- **既存 bento/ui/ の重箱・お弁当箱 UI** (rect_bento_box_coral.webp 等) の和テイストを継承
- **pono-asobiba LP の質感** (絵本タッチ、 やわらかい筆致) を継承しつつ、 トーンは「和の祝い箱」 寄り
- **NG リファレンス**: 写真合成のリアル漆器、 安っぽい金ピカ、 ネオン蛍光、 西洋風グリッター

---

## delivery

- **出力先 (Claude Code 配置先)**: `assets/ui/bento/acorn-modal/`
- **命名 (リネーム禁止)**:
  - `bento_acorn_modal_frame.webp`
  - `bento_acorn_sasa_leaves.webp`
  - `bento_acorn_gold_kira.webp`
- **形式**: WebP、 lossless 推奨、 **透過必須**
- **採用後**:
  1. Claude Code が `assets/ui/bento/acorn-modal/` に保存
  2. bento/index.html の `<body>` に `data-game-id="bento"` 属性を追加
  3. acorn-modal-shared.css に `body[data-game-id="bento"] .pono-acorn-modal { ... }` の override セクションを追加 (frame border-image + sasa ::before + gold kira ::after)
  4. `sw.js` の **precache list に 3 ファイル追加** + `CACHE_VERSION` バンプ (SW update 検知のため +2 推奨)
  5. `develop-app` ブランチで push → App staging (`https://pono-asobiba-app-staging.ndw.workers.dev/`) で実機確認
  6. iPhone / iPad / PC の 3 BP で重畳具合 (frame くり抜き + 中央 risu + sasa 上端 + gold kira lighten) を確認

---

## NG (3 案共通・絶対やらない)

- **画像内に文字を入れる** (本文は HTML 側 Zen Maru Gothic で描画)
- **emoji の埋め込み**
- **ネオン・蛍光色** (style guide 配色から逸脱)
- **キャラクター描画** (ポノ / ハリネズミ / リス本体は別素材で別配置、 本素材は装飾レイヤー専任)
- **背景色付き** (透過必須)
- **JPEG 出力** (透過必須のため WebP 一択)
- **写真合成のリアル漆器** (絵本タッチ厳守)
- **frame 中央くり抜き矩形に装飾を被せる** (完全透明厳守、 risu_relief.png 配置領域を侵さない)
- **sasa の中央 5 割帯に葉を被せる** (中央テキスト・risu を隠してはいけない)
- **西洋風グリッター・ラメ** (和の金箔と異なる質感)
- **maze の森モチーフ・oto の海中モチーフ混入** (bento は和の食卓・祝い箱限定、 トーン混在禁止)
- **画像 AR を歪める前提のサイズ指定** (background-size:100% 100% / object-fit:fill は CSS 実装時も永久 NG)

---

## メモ (morito / 実装者向け)

- Phase 0 共通基盤 (PonoAcornModal API, `--acorn-z=99997`, BEM クラス) の挙動は逸脱しない
- 本 3 素材は **装飾レイヤー** で、 機能 DOM (ボタン / テキスト / risu) は HTML 側で別管理
- `data-game-id="bento"` ベースの CSS override で和テイストに切り替える (Phase 1 maze で動作確認済)
- frame の border-image-slice 152 px は CSS 側で `border-image: url(...) 152 fill / 152px stretch` 想定。 厳守
- sasa は `position: absolute; top: -32px; left: 0; right: 0` で上端からはみ出し配置を想定
- gold kira は `mix-blend-mode: lighten` でリス上に重ねる前提。 黒背景にならない透過で出力すること
- maze の Fukuro_frame_001.png 流用方式 (panel aspect-ratio + contain 配置) と同じ実装パターンが取れるなら、 frame.webp も AR 維持で配置する
- 3 素材は **セットで採用** (案単位)、 mix-and-match は質感ズレを生む可能性があるため非推奨
- 過去事故 (hero-labels 案件で MCP 直接生成 → ce557cf push → revert) を踏まえ、 本素材も Claude Design 経由で並列生成 → morito 選定 → Claude Code 実装の正規フローを厳守

---

*このブリーフは bento クリア時のどんぐり獲得モーダル装飾素材 3 種のみが対象。 モーダル本文 / ボタン / 中央リス / 音声 / 他ゲームのモーダル流用 / bento 本編のお弁当箱素材は対象外。*
