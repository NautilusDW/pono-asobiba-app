---
name: Quizland per-question layout 機構
description: ステージ絵・形/数系・質問バナー等を問題ごと別座標で保存する仕様。whitelist + qid suffix + fallback 多重防御 + 保存範囲トグル (🌐/🎯)。フクロウは共通維持
type: project
---

# Quizland per-question layout

## 仕様
- saved-layout.json のキー命名:
  - per-Q 用: `${sel}|${i}@${qid}` 例: `.emoji-display|0@body_lv1_002`
  - 共通用: `${sel}|${i}` (従来形式、フォールバック)
- `qid` フォーマット: `${cat}_lv${level}_${pad3(idx)}` (`formatQuizQid(q)` in `quizland/index.html`)
- per-Q 対象は **whitelist 方式**: `QZ_PER_QUESTION_SELECTORS` (quizland/index.html L4138 付近) → `EditorBootstrapConfig.perQuestionSelectors`。内訳:
  - ステージ絵系: `.emoji-display` / `.stage-img-wrap` / `.emoji-main-img` (各 `.phase-question` / `.phase-answer` 付き含む = 出題中と答え合わせ中で別位置を保存可、未保存なら question 値に fallback)
  - 形・数系: `.shape-display` `.shape-img` `.count-stack` `.number-display` `.count-item` `.item-row` `.color-chip` `.chip .chip-illust-wrap`
  - **質問バナー系 (2026-06-11 追加)**: `.q-text-card` / `.q-text-card .audio` — ただし下記トグル制
- **保存範囲トグル (2026-06-11, sw v1016)**: `.q-text-card` / `.q-text-card .audio` は「常時 per-Q」ではなく `QZ_PER_QUESTION_SCOPE_TOGGLE` (L4164) → `EditorBootstrapConfig.perQuestionScopeToggleSelectors` でトグル制。`?edit=1` ツールバーの `#le-perq-scope`「🌐 すべての質問」⇔「🎯 この質問だけ」が**書き込みキー形式だけ**を切替 (🎯 = `@qid` キー / 🌐 既定 = 従来の共通キー)。読み取り (applier) は常に per-Q → 共通の 2 段 lookup。トグルは対象セレクタ未設定のページでは非表示 (= 実質 quizland 専用)、enable/disable 毎に 🌐 へリセット
- フクロウ (`.character`) は whitelist に **絶対含めない** = 全問題共通維持

## エディター操作（トグル対象 = 質問バナー / 音声ボタン）
- 🎯 に切替えて編集 → 💾 保存 = `セレクタ|i@qid` キーに保存。他の問題は共通位置のまま
- **🧹 この質問の個別設定を削除** (`#le-perq-clear`): 現在 qid の `@qid` キーを全列挙して削除 → inline style を wipe して共通値を再適用 → 🌐 に戻して即 save()。個別設定の無い質問では disabled
- 可視化: トグルボタンに「⚠個別あり」バッジ (save:success にも追従) / 要素一覧行に 🎯 バッジ / 選択枠は `.le-individual-override` (赤枠) を流用 / 🌐 のまま個別設定済み要素を選択すると qid 毎 1 回 toast 警告 (`_perQWarnedQid`)

## 設計判断（非自明）
- **自動マイグレーションしない**: 「最初に開いた問題で save → 全 169 問にコピー」事故を完全回避するため、旧 `|0` キーは fallback としてだけ残す。明示的な per-Q 化はユーザが各問題で 1 度 save するまで行われない。
- **🌐 snapshot 汚染防止 (critical fix)**: トグル対象 (sel, i) に現在 qid の `@qid` キーが存在する場合、🌐 モードの `snapshot()` は base キー出力を skip (`_perQOverrideKeyIfAny`, layout-editor.js L591 付近)。applier が per-Q 値を DOM に当てているため、そのまま共通キーで snapshot すると save の merge / 動的再スキャン (mergeSnapshotOver) 経由で**全質問の共通値が個別値に汚染**される。skip しても既存の共通キーは merge で保持される。
- **削除の merge 復活防止**: save() は GET→merge→PUT のため、snapshot に無いキーは merge で復活する。🧹 の削除キーは `state._perQDeletedKeys` (Set) に予約し、`_applyPendingPerQDeletions()` を merge **後**・PUT **前**に適用 (local fallback / remote 両経路)。保存成功で Set クリア、disable で破棄。
- **race 対策**: snapshot 開始時に `frozenQid` を 1 度キャプチャ、apply 時の MutationObserver は **毎回** `window.QUIZLAND_GET_CURRENT_QID()` を再評価（クロージャ禁止）
- **dirty 誤検知防止**: `state.lastSavedQid` を導入、qid 切替検知時は baseline を新 qid で再計算して `_dirty=false` 維持。同 qid 内の編集は通常通り dirty 化。🎯/🌐 トグルもキー形式が変わるため、未編集時は baseline を取り直す
- **GH 一時 404 でデータロス防止**: `ghGetContentsWithRetry` で 500ms 後に 1 度リトライ。2 度連続 null = 真の未作成 (`transient:false`)、5xx 例外 = 一時障害 (`transient:true`)。後者だけ `existingLocal` を merge ベースにフォールバック
- **PUT 後再同期**: `window._currentLayoutData = mergedRemote` (PUT 成功時のみ) で別タブ書き込み込みを反映

## 関連ファイル
- common/layout/layout-editor.js: `_isPerQSelector` / `_perQOverrideKeyIfAny` / `_collectPerQOverrideKeysForCurrentQ` / `updatePerQScopeUI` / `snapshot` (frozenQid + 🌐 skip ガード) / `_applyPendingPerQDeletions` / `save` (mergeSnapshotOver + retry + 削除予約適用) / `confirmDiscardIfDirty`
- common/layout/layout-applier.js: 二段階 lookup `data[perQKey] !== undefined ? data[perQKey] : data[baseKey]`
- common/layout/layout-system.js: `buildApplyCfg()` で qid 毎回再評価
- quizland/index.html: `formatQuizQid`, `QZ_PER_QUESTION_SELECTORS`, `QZ_PER_QUESTION_SCOPE_TOGGLE`, navigation 4 箇所の dirty hook

## 拡張ポイント
- 他ページ（math/, writing/, etc.）で per-Q 化が必要になったら、同じ `EditorBootstrapConfig.perQuestionSelectors` パターンで opt-in 可能
- 「常時 per-Q 化は危険だが問題別調整もしたい」要素 (全問題共通がデフォルトであるべきもの) は `perQuestionScopeToggleSelectors` に入れてトグル制にする
