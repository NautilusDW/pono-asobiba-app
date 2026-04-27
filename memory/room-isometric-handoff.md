---
name: room-isometric-handoff
description: アイソメトリック部屋機能 — 現在の状態と残タスク（2026-03-15更新）
type: project
---

# アイソメトリック部屋 — 引き継ぎ文（2026-03-15更新）

## 完了済み

- **家具A/B回転機能**: angleBプロパティで角度別のcellSize/pivotX/pivotY/配置範囲を管理。回転ボタン（🔄）で切替、stateに永続化
- **マルチセル衝突防止**: getFootprint()でceil(cellSize)²セルのフットプリント計算、isOverlapping()/findNearestEmpty()で衝突回避
- **items.js整理**: ベクター6アイテム＋新規15アイテム。くまをdeco移動
- **壁紙デフォルトリセット**: 「かう」「てもち」両モードで壁/床カテゴリに「デフォルトにもどす」カード表示
- **デフォルト背景変更**: base.jpg → Room_Base_grid.png（ブルーグリッド付き）
- **ISO_GRID頂点更新**: back(0.5, 0.407), right(0.762, 0.675), left(0.239, 0.674), front(0.5, 0.944)
- **アジャスター強化**: グリッド4頂点スライダー、Undo/初期値リセット、不透明床塗り、グリッド値コピー、surfaceYスライダー＋くまプレビュー、個別リセット
- **CSS mask問題解決済み**: PNG直接参照 + mask-mode: luminance
- **Room_Base圧縮済み**: 17MB PNG → JPEG/WebP
- **巾木JS上書き問題修正済み**
- **z-index修正**: 家具z=20+depth*3、ピンクラグz=18、デコz=100+depth
- **スタッキング衝突ルール**: PASSTHROUGH_IDS（ラグ）は衝突なし、SURFACE_IDS家具の上にデコ配置許可（複数OK）、デコ同士も衝突なし
- **1-per-surface制限撤廃**: hasSurfaceOccupant関数を削除し、デコは何個でもSURFACE家具上に配置可能に
- **デコ同士の衝突スキップ**: `iAmStackable && isStackableItem(other)` → continue
- **アジャスター第2弾エクスポート反映済み**: furn_shelf2 (cellSize 1.9, surfaceY -128.5/-131.5), furn_chest_pink (surfaceY -149/-145), deco_bear_ribbon (pivotY 23.3)

## 🔴 最優先バグ: surfaceYが適用されない

**症状**: デコを家具の上にドラッグしても、surfaceYオフセットが一切適用されずデコが床レベルに留まる。

**原因特定済み**: `_applyGridPos()` → `_getSurfaceOffset()` のパスで2箇所failしている:

1. **初回レンダリング時**: `document.querySelector('.room-area')` が null を返す
   - ログ: `[OFFSET] no .room-area`
   - `_makeGridItem()` → `_applyGridPos()` の時点でDOM未追加のため `.room-area` が見つからない

2. **ドラッグ中**: `el.closest('.room-area')` が null を返し、areaId が undefined になる
   - ログ: `[OFFSET] no cfg for undefined`
   - areaId=undefined → `state.config[undefined]` → undefined → return 0

**修正方針**:
- `_applyGridPos` に areaId を引数として明示的に渡す（DOMクエリに頼らない）
- `_makeGridItem(p, areaId, locked)` は既に areaId を持っているので、そこから渡す
- `_addDragHandlers(el, areaId)` → `onMove` → `_applyGridPos(el, row, col, areaId)` に変更
- `_getSurfaceOffset(areaId, ...)` で `.room-area` のDOM検索をフォールバックにする

**デバッグログ残存**: 現在のindex.htmlには `[APPLY]` と `[OFFSET]` のconsole.logが残っている。修正時に削除すること。

## 残タスク

1. **surfaceYバグ修正**（上記）
2. **残り家具のsurfaceY値調整** — beds, desks, toyshelf等のsurfaceYはまだ仮値（-30〜-50）。アジャスターで調整後にitems.jsに反映が必要
3. **残りアイテムのピボット調整** — 一部アイテムはpivotX:0, pivotY:0のまま。アジャスターで手動調整中

## 主要ファイル構成

| ファイル | 役割 |
|---------|------|
| room/index.html | メインのお部屋アプリ（ISO_GRID, 衝突判定, A/B回転, スタッキング, ショップUI） |
| room/items.js | 全アイテム定義（wall/floor/furn/deco、angleB, surfaceY/surfaceYB含む） |
| room/furniture_adjuster.html | ピボット＆グリッド＆surfaceY調整ツール（Cloudflare Workers staging に反映済み） |
| assets/images/Rooms/furnitures_final/ | 全家具PNG（_A/_B命名） |
| assets/images/Rooms/Room_Base_grid.png | デフォルト背景（ブルーグリッド） |

## 技術メモ

- **高さベースサイジング**: `.slot-img { height:100%; width:auto; }` + `GRID_CELL_PCT = (right.x - left.x) / cells * 100 * (16/9)`
- **衝突フットプリント**: アンカーセルから奥方向（row--, col--）にceil(cellSize)セル分占有
- **スタッキング**: SURFACE_IDS家具の上にcat='deco'アイテムを配置可能。surfaceYで垂直オフセット
- **衝突スキップ優先順位**: PASSTHROUGH(ラグ) → デコ同士 → デコ on SURFACE → SURFACE上のデコ側
- **アジャスターのグリッド値**: localStorageのfurniture_adjuster_gridキーに保存
- **デプロイ**: developブランチコミットで post-commit が自動 push → GitHub Actions が `wrangler deploy --env staging` → https://pono-asobiba-staging.ndw.workers.dev/room/

## isOverlapping衝突ルール（現在のコード）

```javascript
// ラグは衝突しない
if (PASSTHROUGH_IDS.has(other.id)) continue;
if (PASSTHROUGH_IDS.has(item.id)) continue;
// ... collides check ...
// デコ同士は衝突しない
if (iAmStackable && isStackableItem(other)) continue;
// デコをSURFACE家具の上に乗せる（複数許可）
if (iAmStackable && SURFACE_IDS.has(other.id)) continue;
// 家具をデコの上に置く場合も許可
if (isStackableItem(other) && SURFACE_IDS.has(item.id)) continue;
return true;
```

## SURFACE_IDS（デコを乗せられる家具）

```
furn_bed_wood, furn_desk, furn_toyshelf, furn_shelf2,
furn_toyshelf2, furn_desk2, furn_bed_pink, furn_desk_pink, furn_chest_pink
```
※ 3段本棚（furn_bookshelf_w, furn_bookshelf2, furn_bookshelf_pink）は除外
