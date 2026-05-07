---
name: Quizland per-question layout 機構
description: ステージ絵 (.emoji-display / .emoji-main-img) を問題ごと別座標で保存する仕様。フクロウは共通維持。whitelist + qid suffix + fallback 多重防御
type: project
---

# Quizland per-question layout

## 仕様
- saved-layout.json のキー命名:
  - per-Q 用: `${sel}|${i}@${qid}` 例: `.emoji-display|0@body_lv1_002`
  - 共通用: `${sel}|${i}` (従来形式、フォールバック)
- `qid` フォーマット: `${cat}_lv${level}_${pad3(idx)}` (`formatQuizQid(q)` in `quizland/index.html`)
- per-Q 対象は **whitelist 方式**: `EditorBootstrapConfig.perQuestionSelectors = ['.emoji-display', '.emoji-main-img']`
- フクロウ (`.character`) は whitelist に **絶対含めない** = 全問題共通維持

## 設計判断（非自明）
- **自動マイグレーションしない**: 「最初に開いた問題で save → 全 169 問にコピー」事故を完全回避するため、旧 `|0` キーは fallback としてだけ残す。明示的な per-Q 化はユーザが各問題で 1 度 save するまで行われない。
- **race 対策**: snapshot 開始時に `frozenQid` を 1 度キャプチャ、apply 時の MutationObserver は **毎回** `window.QUIZLAND_GET_CURRENT_QID()` を再評価（クロージャ禁止）
- **dirty 誤検知防止**: `state.lastSavedQid` を導入、qid 切替検知時は baseline を新 qid で再計算して `_dirty=false` 維持。同 qid 内の編集は通常通り dirty 化
- **GH 一時 404 でデータロス防止**: `ghGetContentsWithRetry` で 500ms 後に 1 度リトライ。2 度連続 null = 真の未作成 (`transient:false`)、5xx 例外 = 一時障害 (`transient:true`)。後者だけ `existingLocal` を merge ベースにフォールバック
- **PUT 後再同期**: `window._currentLayoutData = mergedRemote` (PUT 成功時のみ) で別タブ書き込み込みを反映

## 関連ファイル
- common/layout/layout-editor.js: `getCurrentQid` / `makeElKey` / `snapshot` (frozenQid) / `save` (mergeSnapshotOver + retry) / `confirmDiscardIfDirty`
- common/layout/layout-applier.js: 二段階 lookup `data[perQKey] !== undefined ? data[perQKey] : data[baseKey]`
- common/layout/layout-system.js: `buildApplyCfg()` で qid 毎回再評価
- quizland/index.html: `formatQuizQid`, `EditorBootstrapConfig.perQuestionSelectors`, navigation 4 箇所の dirty hook

## 拡張ポイント
- 他ページ（math/, writing/, etc.）で per-Q 化が必要になったら、同じ `EditorBootstrapConfig.perQuestionSelectors` パターンで opt-in 可能
