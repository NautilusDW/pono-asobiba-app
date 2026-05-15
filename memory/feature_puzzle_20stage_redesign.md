---
name: feature-puzzle-20stage-redesign
description: puzzle/ ゲームの難易度を3〜6歳向け20ステージ進行に再設計 (ピース数4→20、形状LevelA-F、snapAssist4段階、90度チャレンジ回転モード、横画面ピース左右ゾーン分配)
metadata:
  type: project
---

# パズル難易度 20ステージ再設計 (2026-05-15, sw v1001→v1002)

## 確定方針

- **対象年齢**: 3〜6歳。3〜4歳は序盤4-6ピースで遊べる、6歳は後半16-20ピースで歯ごたえ
- **ピース数進行**: 4→4→6→6→6→9→9→9→12→12→12→12→16→16→16→16→20→20→20→20
- **メインモードは回転なし**。難易度はピース数+形状+スナップ補助で調整
- **90度チャレンジ回転モードは実装済みだがデフォルト OFF**。Stage 09 以降のみ有効化候補
- **任意角度回転は不可** (0/90/180/270 のみ)
- **すべての難易度設定はステージ定義データで変更可能** (コード直書き禁止)

## ステージ定義スキーマ ([puzzle/main.js](../puzzle/main.js))

```js
{
  id: 17,
  title: 'もりの ピクニック',
  rows: 4, cols: 5, pieceCount: 20,
  image: '../assets/images/puzzle/stages/puzzle_stage_17_forest_picnic.jpg',
  rotationEnabled: false,             // 常に false (任意角度禁止)
  challengeRotationEnabled: true,     // Stage 09 以降 true (mode ON 時のみ作用)
  allowedRotations: [0, 90, 180, 270],
  pieceShapeStyle: 'advanced-jigsaw-v2',
  snapAssist: 'normal',
}
```

## ピース形状 (pieceShapeStyle)

| Level | Style | Stage | 戻り値 | dir / pos / hw |
|---|---|---|---|---|
| A | `soft-rounded` | 01-02 | number | `dir * 0.35` (ほぼ四角・凹凸ごく控えめ) |
| B | `large-jigsaw` | 03-05 | object | pos=0.5, hw=0.18-0.22 |
| C | `standard-jigsaw` | 06-08 | object | pos=0.5, hw=0.16 |
| D | `standard-jigsaw-v2` | 09-12 | object | pos=0.40-0.60, hw=0.15-0.18 |
| E | `advanced-jigsaw` | 13-16 | object | pos=0.32-0.68, hw=0.14-0.21 |
| F | `advanced-jigsaw-v2` | 17-20 | object | pos=0.28-0.72, hw=0.13-0.22 |

`makeEdge()` (puzzle/main.js) が `stagePieceShapeStyle` で switch する。

## スナップ補助 (snapAssist)

`SNAP_DIST = pieceW * ratio` で per-stage 動的計算 (`initPuzzle()` 内)。

| snapAssist | ratio | Stage |
|---|---|---|
| `very-strong` | 0.55 | 01-02 |
| `strong` | 0.45 | 03-08 |
| `medium-strong` | 0.38 | 09-12 |
| `normal` | 0.30 | 13-20 |

## チャレンジ回転モード

- **デフォルト OFF**。 有効化: `window.PUZZLE_CHALLENGE_ROTATION = true` または `localStorage.puzzle_challenge_rotation = 'on'`
- ピース初期回転: 0/90/180/270 を約75%確率でランダム付与 (`buildPieces()`)
- **タップ検出**: `pointerMoveDist < 8px && elapsed < 300ms` → 90度時計回り回転 (`onPointerUp()`)
- スナップ条件: `rotation === 0` の場合のみ受理 (`trySnap()`)
- 描画: `drawPiece()` で `translate + rotate + translate` の3変換、未スナップ時のみ中央に `↻` インジケータ表示
- ヒットテスト: `rebuildPath()` が `DOMMatrix.translate().rotate()` でローカル path を回転焼き付け

## ポノ特別枠 (Stage 05, 10, 15, 20)

新規発注せず既存 `puzzle_pono_*.jpg` を流用:
- Stage 05 → `puzzle_pono_sleep.jpg`
- Stage 10 → `puzzle_pono_water.jpg`
- Stage 15 → `puzzle_pono_sparkle.jpg`
- Stage 20 → `puzzle_pono_owl.jpg`

## 新ステージ画像 (16枚)

Codex 納品 (`tmp/alpha_pending/29/`) を `assets/images/puzzle/stages/` に配置・JPG最適化済 (合計5.27MB)。 ファイル名規則 `puzzle_stage_<NN>_<topic>.jpg`:
- 01 apple_leaf / 02 balloons / 03 flower_butterfly / 04 fish_waterplants
- 06 fruit_basket / 07 music_toy_box / 08 flower_field_bugs / 09 underwater_world
- 11 rainbow_after_rain / 12 dream_night_sky / 13 sweets_table / 14 animal_music_concert
- 16 vehicle_town / 17 forest_picnic / 18 magical_bookshelf / 19 puzzle_play_table

パス解決は `STAGE_IMAGES` マップ (puzzle/main.js) で直接 lookup。フォールバックなし。

## 横画面ピース配置 (本セッション要件)

- ボード幅 `canvasW * 0.60` → **`0.55`** に縮小し左右各約 22.5% の余白確保
- `shufflePieces()` を左右ゾーン分配方式に書き換え (`computePlacementZones()` + `placePieceInZone()` + `scatterPiece()`)
- 偶数 index → 左ゾーン、奇数 → 右ゾーン、各ゾーン内で y は全高ランダム
- ゾーン幅が極端に細い場合は `placePieceFallback()` で旧全域ランダムへ自動切替
- 「ヒント」ボタンの再散布も同ヘルパー (`scatterPiece`) を共有

## Stage 20 ピース数の可変化

`const STAGE_20_PIECE_COUNT = 20;` (main.js 冒頭)。 プレイテストで難しすぎる場合は **16** に下げると Stage 20 IIFE が自動的に 4×4 / `advanced-jigsaw` に縮退。

## 設計原則

- 旧 `advanced: true|false` 二分岐は廃止。 `pieceShapeStyle` の6段階に拡張
- 旧 `SNAP_DIST = 55` 固定値は廃止。 ピース実寸ベースの相対値に
- `loadDrawingStages()` (お絵描きパズル) も新スキーマ対応 (`pieceShapeStyle: 'large-jigsaw'`, `snapAssist: 'strong'`)
- 受け入れ条件「すべての難易度設定はステージ定義データで変更可」を厳守 — マジックナンバーは `BASE_STAGES` の各エントリへ集約

## 関連

- 過去の横画面化対応: [feature_puzzle_landscape.md](feature_puzzle_landscape.md) (sw v995-v997)
- パス解決バグ事例: 当初 Agent B が `resolveStageImage()` を `window.PUZZLE_STAGE_IMAGES` 拡張ポイント前提のフォールバック設計にしていたため実画像に届かない論理バグ → orchestrator が `STAGE_IMAGES` 直接マップへ修正
