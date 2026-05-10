---
name: ポノのもりのずかん 全画面フロー (SPA)
description: zukan/index.html を 5-screen SPA 化 (タイトル→マップ選択→エリア内マップ→探索→図鑑コレクション)。素材は assets/zukan/{title,map,innermap,collection,ui}/、データは zukan/data/zukan-data.js
type: feature
---

# ポノのもりのずかん — 全画面フロー (2026-05-10 SPA 化)

## 概要

`zukan/index.html` は元々「うさぎを 1 問だけ調査する画面」だったが、
タイトル→マップ選択→エリア内マップ→探索→図鑑コレクション の **5-screen SPA** に拡張済 (sw v895)。

## screen 構成

`body[data-screen="title|mapselect|innermap|search|collection"]` で切替。
`setScreen(name, payload)` がルータ。各 screen に `SCREEN_HOOKS[name].onEnter/onLeave`。

| screen | 主な素材 | 主な機能 |
|---|---|---|
| title | `assets/zukan/title/title_bg.png` + `title_logo.png` | 「はじめる」「ずかんを みる」 |
| mapselect | `assets/zukan/map/world_map.png` + 4 透明 hotspot + `sign_<area>.png` + `pono_full.png` + `pono_memo.png` + `banner_dokoni.png` + `assets/zukan/ui/map_decision_button.png` | 4 エリアからクリック→ハロー演出→けってい |
| innermap | `assets/zukan/innermap/spot_<area>.png` + `sign_<area>.png` + 半透明丸ピン (CSS) | スポット選択→search 起動 |
| search | 既存 Layer 1〜8 (`outer-bg`, `safe-area`, `field-bg`, `window-frame`, `progress-badge`, `hint-panel`, `pono-guide`, `discovery-overlay`) | データ駆動 (zukan-data.js) + 30s キラキラ + スタンプ演出 + owl コメント |
| collection | `assets/zukan/collection/book_open.png` + 4 タブ + 3×3 グリッド | localStorage 永続化、シルエット/カラー切替、全 36 匹で「すべて あつめたよ！」バッジ |

## screen-innermap 補足 (Phase 1 RPG ミニマップ)

- **Phase 1 (花の小道のみ実装済)**: 旧「Map_scenes 1 枚 + パルスピン 1 個」描画から、 SVG ベースの RPG ミニマップ風に刷新。 `area.innerMap` フィールド (baseColor / pathColor / pathSvg / pathStroke / ponoPos / hotspots[5]) を持つエリアは新描画 (`renderRpgInnermap`)、 持たないエリアは legacy 描画 (`renderLegacyInnermap`、 旧 `.im-*` 要素を温存) にフォールバック。
- **5 ピン構成**: 中央の main (spotIdx=0、 探索画面に遷移) + 上下左右の placeholder 4 個 (`spotIdx: null`、 タップで `そのうち あそべるように なるよ！` モーダル `.imrpg-comingsoon` を表示)。
- **Phase 2 残**: 残り 3 エリア (mushroom_forest / sunlit_forest / dew_pond) の `innerMap` 追加、 装飾アイコン (花/木/きのこ) SVG ビルダー、 ポノ顔の頭部クロップ (`pono_full.png` + clipPath circle)。 Phase 3 残: ポノ移動アニメ + 位置調整エディタ。
- **post-fix (2026-05-10 sw v900)**: SVG hotspot 生成を `innerHTML` から `createElementNS` 化 (Firefox 名前空間互換)、 `transformOrigin` を JS 側で px 値明示 (iOS 15 以下のパルス animation 原点ズレ対策)、 legacy 描画時の coming-soon モーダル防御リセット。

## screen-mapselect 補足

- **エリアハイライト**: world_map と同サイズの透過 PNG (`assets/zukan/map/highlight/<area>.png`) を `worldHighlight` フィールドで指定し、選択時に `<img class="ms-area-overlay">` を全画面オーバーレイ + brightness/drop-shadow パルスで発光。**4 エリア揃って実装済** (flower_path / mushroom_forest / sunlit_forest / dew_pond)。
- **撤去済の装飾**: ① 旧 hotspot 選択ハロー (`.ms-hotspot.selected` の `box-shadow` + `@keyframes msHalo`)、② `.ms-map-img` の `background: #cfe7d4` (water-blue 枠) — どちらも overlay 発光で表現が代替されたため不要に。
- **エリア情報パネル**: 選択中エリアの `<img class="ms-area-info-sign">` (sign プレート) と `<div class="ms-area-info-silhouettes">` (シルエット 3 体) を画像下中央 (`bottom: 6%`) に表示。`msUpdateAreaInfo()` が hotspot click と onEnter で同期更新。`pointer-events: none` で hotspot タップを遮らない。

## データ層

`zukan/data/zukan-data.js` (window.ZUKAN_DATA + ヘルパ):

- `ZUKAN_DATA.areas[]`: 4 エリア (`flower_path`, `mushroom_forest`, `sunlit_forest`, `dew_pond`)
  - 各エリアに 1 spot × 1 animal の seed (rabbit / hedgehog / squirrel / duck)
  - `worldHotspot` (world_map 内 ratio), `mapPin` (innermap 内 ratio), `hotspot` (field_bg 内 ratio), `hiddenPartStyle` (field_bg 内 ratio) はすべて **暫定値** — `?edit=1` のエディタで詰める
- `ZUKAN_DATA.collectionRoster[areaId][9]`: 4×9=36 匹のロスター (動物画像は既存 `assets/zukan/animals/<area>/<id>.png` 流用)
- `ZUKAN_STATE_KEY = "zukan.state.v1"`
- ヘルパ: `loadZukanState()`, `saveZukanState(state)`, `markZukanCollected(animalId, areaId)`

## 表示名 ⇄ 内部 ID マッピング (重要)

UI 表示名と既存ファイルの内部 ID は不一致 (素材移行時に判明)。**内部 ID は触らない** (既に 36 匹分の動物画像が `assets/zukan/animals/<id>/` 規約で配備されている)。

| 表示名 (UI) | 内部 ID | 16:9 search 背景 |
|---|---|---|
| 花の小道 | `flower_path` | `flower_path_field_16x9.png` |
| きのこの森 | `mushroom_forest` | `mushroom_forest_field_16x9.png` |
| こもれびの森 | `sunlit_forest` | `leaf_glow_forest_field_16x9.png` |
| しずくの池 | `dew_pond` | `dew_pond_field_16x9.png` |

## 位置調整エディタ

- 探索画面: `zukan/preview/investigation/?edit=1` (既存)
- エリア内マップ: `zukan/preview/innermap/?edit=1&area=<area>` (新規)
  - `?area=flower_path|mushroom_forest|sunlit_forest|dew_pond` でエリア切替
  - common/layout の WYSIWYG パターン (drag/resize/snap/save) → `saved-layout.json`
- 図鑑コレクション: `zukan/preview/full/?edit=1` (既存)

## 「面白い要素」3 件 (実装済)

1. **図鑑コレクション画面** (screen-collection): 36 匹を 4 エリア × 9 マスで表示、未発見はシルエット (`filter: brightness(0); opacity: 0.45`)
2. **ヒントのレベル化 + キラキラ**: search 入場 30 秒経過で hotspot に `.hint-twinkle` (radial-gradient pulse)。`data-hint-level` 1/2/3 で強度切替 (`revealedHints` と連動)
3. **ふくろう博士コメント**: 発見 popup 下部に `owlComment` を 1 行表示、エリア完成時に博士バブル

## 発見スタンプ演出 (素材ありなので採用)

- 発見時: `assets/zukan/ui/stamp_mitsuketa.png` を popup 上に 600ms スプリングアニメ
- 登録時: `assets/zukan/ui/stamp_touroku.png` を同様に重ねる
- 効果音は無し (Web Audio 依存禁止のため)

## sw.js CACHE_VERSION 履歴

- 894 → 895 (この変更)
- precache 静的列挙はプロジェクト全体で**未使用** (動的 fetch + activate cleanup スタイル)
- 数字バンプのみで cache invalidation が効く

## 残タスク (本実装スコープ外)

- 各エリアに**追加スポット**を増やす (素材未着手 — 後日 Codex 発注)
- 各エリアに**追加動物**を増やす (現状の hidden_parts は rabbit_ears / cat_tail / bird_shadow の 3 つのみ。flower_path 以外は hidden_part を流用してダミー配置中)
  - mushroom_forest: hedgehog → bird_shadow 流用
  - sunlit_forest: squirrel → cat_tail 流用
  - dew_pond: duck → bird_shadow 流用
- 動物詳細ページ (年齢別なまえ / 鳴き声 / 生態) — 現状は名前 + owl 一言のみ
- 全コンプリート時のごほうび (花マル等)
- zukan 専用 BGM
