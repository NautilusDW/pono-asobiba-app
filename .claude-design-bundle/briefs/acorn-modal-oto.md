# acorn-modal-oto brief

> このファイルは Claude Design (Pono LP Brand Kit) で、 pono-asobiba-app の oto (ポノのおとタッチ / リズムゲーム) の楽曲クリア時に表示する 「どんぐり獲得モーダル」 に使う 5 つの装飾画像 (+ 1 つのオプション光線) と 1 つの効果音を発注するための仕様書 (実画像は Claude Design 側で GPT Image 2 系の画像エンジンを呼んで作成、 音声は fal-ai 系の音声エンジン、 ここはあくまで brief)。 Phase 0 共通基盤 (PonoAcornModal / acorn-modal-shared.css / acorn-copy.json) と Phase 1 maze 実装は完成済で、 Phase 1.5 として oto 用の「DJ ケロックのコズミック・レコード盤」 海中ファンタジー世界観に **オーバーライドする装飾レイヤー** の素材を発注する。 morito が採用案を選定 → Claude Code が `assets/ui/oto/acorn-modal/` に保存 → oto 側 body に `data-game-id="oto"` 属性を付与 + override CSS 起動 → `sw.js` の precache list 追加 + `AcornAudioRegistry.register('oto', { impact: '...mp3' })` 登録 + `CACHE_VERSION` バンプの流れ。

---

## context

- 対象画面: oto (ポノのおとタッチ / リズム + DJ ケロック楽曲) 楽曲クリア演出 → どんぐり獲得モーダル
- 役割: 楽曲完奏の 「ごほうび」 体験を **海中ファンタジー (コズミック・レコード盤)** で装飾する 5 枚のレイヤー素材 + 効果音 1 種
- 既存基盤: `window.PonoAcornModal` (common/acorn-modal.js)、 `window.PonoAcornAudio` (common/acorn-audio.js)、 `window.PonoAcornCopy` (common/acorn-copy-loader.js) は実装済。 Phase 1 maze で `data-game-id` ベースの CSS オーバーライドが機能することを確認済。 本 brief は **画像 5 種 (+1 オプション) + 効果音 1 種** のみ
- oto はリズムゲームで、 DJ ケロック (カエル) が深海クラブで「コズミック・レコード盤」 を回す世界観。 maze の温かい絵本トーン (木目/葉/暖色) から **クールな深海 + サイケなネオンシアン** にトーン転換するのが本 brief の主眼
- maze と同じく中央には既存の `risu_relief.png` (リスのレリーフ) を配置するが、 周囲のレイヤーで「深海クラブ」 を演出する

---

## style guide

- 対象年齢: 子供向け 3-7 歳、 海中ファンタジー (DJ ケロックのコズミック・レコード盤)
- カラーパレット:
  - `#0d2547` deep navy (海底背景・最深部)
  - `#1d4a8f` mid blue (中層水・中間トーン)
  - `#66e9ff` cyan glow (リムライト・水中ネオン)
  - `#BEF5FF` pale cyan (泡ハイライト・水中光)
  - `#FFEF8A` gold acorn (どんぐり・差し色のみ)
  - `#f5a623` orange label (レコードラベル中央のみ)
- フォント: モーダル本文は **Zen Maru Gothic** (HTML 側で適用済)。 **画像内に文字は一切入れない** こと (DJ レコードラベル上に小さく `pono` のみ任意で許可)
- 質感: pono-asobiba シリーズの絵本タッチを継承しつつ、 oto だけは **深海クラブの幻想的なグロウ + 浮遊感** を強調。 水中の屈折光、 泡、 ふわっとした粒子感を意識
- タッチ: maze の紙繊維テクスチャは継承しない。 むしろ **滑らかな水中ガラス質感** + 淡い blur が支配的

---

## assets (5 種 + 1 オプション)

### 1. record_disc_underwater.png

- **寸法**: 1024 × 1024 px (透過 PNG、 lossless 必須)
- **モチーフ**: 深海に浮遊する DJ レコード盤 (コズミック・レコード盤の主役)
- **配色**:
  - 盤面: 黒 → 深海ネイビー `#0d2547` のグラデ
  - グルーヴ (溝): 細密な同心円 (約 60-80 本)、 微かに `#1d4a8f` ハイライト
  - 中央ラベル: 直径 320 px、 オレンジ `#f5a623` ベタ、 中央に十字穴 (直径 24 px)
  - ラベル上部に小さく `pono` の白文字 (任意、 小さければ可)
  - 盤の外周リムに **`#66e9ff` 30% alpha** の水中ネオン rim light
  - 全体にほのかな glow (周囲 50 px 程度に `#66e9ff` 10-15% alpha)
- **構図**:
  - 中央寄せ、 円盤は正円 (透視・傾け禁止、 maze で frame と重ねる前提)
  - 円盤は **キャンバスの 80%** (約 820 px 直径) を占める
  - 円盤の外側に約 100 px の透過マージン (glow 用)
- **質感**: 深海の水圧で わずかに屈折光が走るイメージ、 ベタすぎず ふんわり立体
- **alternatives 案**:
  - 案 a: グルーヴ細密 (80 本)、 リムライトくっきり (絵本らしいシャープさ)
  - 案 b: グルーヴ粗め (50 本)、 リムライトぼんやり (より幻想的・深海感強)

### 2. bubble_s.png

- **寸法**: 256 × 256 px (透過 PNG、 lossless 必須)
- **モチーフ**: 小さな海中泡 (パーティクル散布用)
- **配色**: 縁 `#BEF5FF` (淡シアン)、 中央ハイライト白 `#FFFFFF`、 内部はほぼ透明
- **構図**:
  - 直径約 180 px (キャンバスの 70%) の球形泡、 中央寄せ
  - 上方 30 度の位置に **三日月型の白ハイライト** (直径 40 px 程度)
  - 縁は虹色 (シアン → 淡紫) の薄いリム、 1-2 px のみ
- **質感**: マンガ的ではなく リアル寄りの石鹸泡 + 水中泡のハイブリッド、 軽やかさ重視
- **alternatives 案**:
  - 案 a: 縁がはっきりした「絵本タッチ」 泡
  - 案 b: 縁がほぼ見えない「フォト寄り」 泡

### 3. bubble_m.png

- **寸法**: 256 × 256 px (透過 PNG、 lossless 必須)
- **モチーフ**: 中サイズ海中泡 (主役パーティクル)
- **配色**: 上 25% に白ハイライト、 下 75% は ほぼ透明、 縁は `#BEF5FF` 20% alpha
- **構図**:
  - 直径約 200 px の球形泡、 中央寄せ
  - 上方 1/4 にぼんやり広い白ハイライト (光源は上)
  - 下方 3/4 はほぼ透明、 内部に微かなシアン rim
- **質感**: bubble_s より落ち着いた、 浮遊感のある中型泡
- **alternatives 案**:
  - 案 a: ハイライトくっきり (ポップ寄り)
  - 案 b: ハイライト淡い (深海の静寂感)

### 4. bubble_l.png

- **寸法**: 256 × 256 px (透過 PNG、 lossless 必須)
- **モチーフ**: 大サイズ海中泡 (背景レイヤー用、 リアル感重視)
- **配色**: 縁 virtually invisible (`#BEF5FF` 5% alpha)、 内部に淡い屈折光のみ
- **構図**:
  - 直径約 230 px の球形、 縁はほぼ見えない
  - 内部に **「8 時方向の縁取り淡シアン」 + 「2 時方向の白ハイライト」** で球体感を出す
  - 中心は透明、 球の存在感は屈折光のみで表現
- **質感**: 一番リアル寄り、 水中で大きく漂う泡の感じ
- **alternatives 案**:
  - 案 a: 屈折光がやや強め (存在感あり)
  - 案 b: 屈折光が極淡 (背景に溶ける)

### 5. kerokku_dj_cheer_mini.png

- **寸法**: 256 × 256 px (透過 PNG、 lossless 必須)
- **モチーフ**: DJ ヘッドホン姿勢の カエル (ケロック) bust ショット
- **配色**:
  - 体色: oto 既存ケロックの緑系 (黄緑 → 深緑のグラデ)
  - ヘッドホン: 黒 + シアン `#66e9ff` 発光リング
  - 目: 大きな丸瞳、 ハイライト白で「やったね！」 のキラキラ感
- **構図**:
  - 顔のみアップ (bust shot、 肩から上)、 中央寄せ
  - 手は **どちらか片手だけ** 軽く挙げて 「やったね！」 ジェスチャ (両手ピースは過剰)
  - キャンバスの 85% (約 220 px) を占めて余白少なめ
  - 顔の向きは **正面 5-10 度右寄せ** (完全正面は固い)
- **質感**: 既存 oto/index.html の DJ ケロック関連アセットの絵本タッチを継承、 線画は焦茶細め
- **alternatives 案**:
  - 案 a: 片手を頭上に挙げて元気にジェスチャ (祝祭感)
  - 案 b: 両手をヘッドホンに添えて「いい音聞こえた」 ニヤリ顔 (DJ らしさ)

### 6. underwater_light_shaft.png (オプション)

- **寸法**: 1024 × 512 px (透過 PNG、 lossless 必須)
- **モチーフ**: 上から差し込む海中光の柱 2-3 本
- **配色**: `#BEF5FF` 30% alpha (上端) → 透明 (下端) の縦グラデ
- **構図**:
  - キャンバス上端から斜め下方向に **2-3 本の細長い光柱** (幅 60-120 px、 長さ 500 px)
  - 光柱の角度はそれぞれ違う (左 -10度、 中央 0度、 右 +10度 等)
  - 下方向にフェードアウト、 下半分は ほぼ透明
- **質感**: ガウスぼかし強め、 シャープなエッジ禁止
- **重畳モード**: CSS の `mix-blend-mode: lighten` または `screen` で重ねる前提
- **alternatives 案**:
  - 案 a: 3 本 (左中右、 シンメトリー寄り)
  - 案 b: 2 本 (左寄せ、 非対称、 動きあり)

---

## audio (Phase 1.5、 1 種)

### oto_acorn_receive.mp3

- **再生時間**: 0.6 秒
- **音量**: 0.45 (master volume base)
- **形式**: MP3 (44.1kHz / 128kbps / stereo)
- **音色**:
  - 水中浮上感 (前半 0.2 秒) → 軽快な「ぽこっ」 弾ける音 (後半 0.4 秒)
  - 8bit ニュアンス (DJ ケロックのコズミック・レコード盤に呼応)
  - マスタリングで **low-mid 強調** (海底の深み)、 **high freq は耳に優しく丸める** (kids 向け)
- **NG**:
  - シャープなアタック (耳に刺さる)
  - 0.6 秒超過 (テンポを崩す)
  - 通常のコイン音・ピコ音 (oto らしさが消える)
- **配置先**: `assets/audio/sfx/oto/oto_acorn_receive.mp3`
- **alternatives 案**:
  - 案 a: 水中の bubble pop + 8bit pluck (祝祭感)
  - 案 b: 海中シンセ pad + 短い ding (深海クラブ感)

---

## reference

- **既存 oto/index.html の DJ ケロック関連アセット** (体色・線画タッチを継承)
- **既存 sea-album 系の水中演出** (色味の継承、 深海ネイビー + シアン グロウ)
- **既存 risu_relief.png** を中央に配置する前提 (これは maze と同一素材)
- **pono-asobiba LP の質感** (絵本タッチ・やわらかい筆致) を継承しつつ、 トーンは「深海クラブ」 寄り
- **NG リファレンス**:
  - リアル写真合成の海中
  - ネオン蛍光のキツい彩度
  - 大人向け EDM クラブのライブ会場 (kids 向けから逸脱)
  - 深海の魚・サンゴ等の追加モチーフ (本 brief は DJ レコード + 泡 + ケロックのみ)

---

## delivery

- **出力先 (Claude Code 配置先)**:
  - 画像: `assets/ui/oto/acorn-modal/`
  - 効果音: `assets/audio/sfx/oto/`
- **命名 (リネーム禁止)**:
  - `record_disc_underwater.png`
  - `bubble_s.png`
  - `bubble_m.png`
  - `bubble_l.png`
  - `kerokku_dj_cheer_mini.png`
  - `underwater_light_shaft.png` (オプション)
  - `oto_acorn_receive.mp3`
- **形式**: PNG (lossless、 透過必須) + MP3 (44.1kHz / 128kbps)
- **採用後**:
  1. Claude Code が `assets/ui/oto/acorn-modal/` + `assets/audio/sfx/oto/` に保存
  2. oto/index.html の `<body>` に `data-game-id="oto"` 属性を追加
  3. acorn-modal-shared.css に `body[data-game-id="oto"] .acorn-modal { ... }` の override セクションを追加 (深海背景 + bubble パーティクル + record_disc 配置)
  4. `common/acorn-audio.js` の AcornAudioRegistry に `register('oto', { impact: 'assets/audio/sfx/oto/oto_acorn_receive.mp3' })` を追加
  5. `sw.js` の **precache list に 6 画像 + 1 音声 = 7 ファイル追加** + `CACHE_VERSION` バンプ (SW update 検知のため +2 推奨)
  6. `develop-app` ブランチで push → App staging (`https://pono-asobiba-app-staging.ndw.workers.dev/`) で実機確認
  7. iPhone / iPad / PC の 3 BP で重畳具合 (深海背景 + record_disc + bubble 散布 + 中央 risu + DJ ケロック cheer) を確認

---

## NG (5 案共通・絶対やらない)

- **画像内に文字を入れる** (本文は HTML 側 Zen Maru Gothic で描画、 レコードラベル上の小さな `pono` のみ任意で許可)
- **emoji の埋め込み**
- **ネオン蛍光のキツい彩度** (style guide パレットから逸脱)
- **大人向け EDM クラブのライブ会場** (kids 向けから逸脱)
- **背景色付き** (透過必須、 全 5 + オプション 1 素材)
- **JPEG 出力** (透過必須のため PNG 一択)
- **泡の中に魚や水草** (本 brief は DJ レコード + 泡 + ケロックのみ、 別モチーフ追加禁止)
- **record_disc を傾けて描く** (CSS で transform 制御するため、 素材は正円・正面のみ)
- **kerokku の体全身描写** (bust ショット限定、 足や下半身は描かない)
- **オプション光線をシャープなエッジで描く** (柔らかい blur 必須)
- **maze の木目・葉モチーフを混入** (oto は完全に海中ファンタジー、 トーン混在禁止)
- **効果音のシャープなアタック** (耳に刺さる音は kids NG、 high freq は丸める)

---

## メモ (morito / 実装者向け)

- Phase 0 共通基盤 (PonoAcornModal API, `--acorn-z=99997`, BEM クラス) の挙動は逸脱しない
- 本 5 素材 + オプション 1 + 効果音 1 は **装飾レイヤー** で、 機能 DOM (ボタン / テキスト / risu) は HTML 側で別管理
- `data-game-id="oto"` ベースの CSS override で深海背景に切り替える設計 (Phase 1 maze で動作確認済)
- bubble_s/m/l はパーティクル散布用、 同一 PNG を multiple instance で `position: absolute` + CSS animation で浮遊させる前提
- record_disc は中央背景レイヤーで slow rotate (CSS animation) 想定、 risu はその上に重なる
- kerokku_dj_cheer_mini は左下または右下に小さく配置、 「楽曲クリアおめでとう」 のリアクションキャラ
- underwater_light_shaft はオプション、 採用時は上端から `mix-blend-mode: lighten` で重畳
- 効果音は acorn 獲得モーダル表示時に `AcornAudioRegistry.play('oto', 'impact')` で再生
- 6 素材 (画像 5 + オプション 1) は **セットで採用** (案単位)、 mix-and-match は質感ズレを生む可能性があるため非推奨
- 過去事故 (hero-labels 案件で MCP 直接生成 → ce557cf push → revert) を踏まえ、 本素材も Claude Design 経由で並列生成 → morito 選定 → Claude Code 実装の正規フローを厳守
- 効果音検証は faster-whisper では検出できないので、 staging で実機再生 + 0.6 秒以内 + 0.45 volume を耳で確認 (TTS 系 whisper 検証ルールは本件対象外)

---

*このブリーフは oto 楽曲クリア時のどんぐり獲得モーダル装飾素材 5 種 + オプション 1 種 + 効果音 1 種のみが対象。 モーダル本文 / ボタン / 中央リス / 他ゲームのモーダル流用 / oto 本編のリズムゲーム素材は対象外。*
