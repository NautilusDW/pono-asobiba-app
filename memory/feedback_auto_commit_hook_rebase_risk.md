---
name: auto-commit hook + 自動 git pull --rebase が rebase paused 状態を巻き込む事故の防止策 (2026-05-12 大事故から導出)
description: post-commit hook が auto push + pull --rebase --autostash を走らせる構成のため、 rebase 中の paused 状態で working tree が変わると hook が git add -A && git commit で意図しないファイルを巻き込んでコミットしてしまう。 2026-05-12 に別チャット (chip-label v969) と本チャット (ナレーション漢字化 Phase 2) が同時走行で 2 回連続大規模混乱を起こした
type: feedback
---

# auto-commit hook + rebase paused 巻き込み事故の防止策

## ルール (恒久運用)
**rebase / merge / cherry-pick / pull --rebase が paused 状態の間、 ファイル編集と auto-commit hook の発火を一切起こさない**。

## Why (2026-05-12 大事故)
1. 別チャット側で `git pull --rebase --autostash` を実行 → コンフリクトで paused 状態に入る
2. ユーザーは別チャットの状態を知らずに本チャット (ナレーション側) で作業継続を Claude に指示
3. 本チャット Claude が Phase 2A/B/C で 3 commits を **paused rebase の上に積層**
4. ナレーション側の編集と無関係な layout/sw v969 関連変更まで **auto-commit hook が `git add -A && git commit` で巻き込み**
5. ユーザーが「rebase --abort したい」 と発覚 → backup branch で保護してから --abort → 復旧に ~2 時間
6. その後さらに新規 rebase をかけたところ saved-layout.json でコンフリクト → 2 回目の混乱

事故の連鎖の根本: **auto-commit hook が working tree 全体をスイープすること** + **rebase paused 中も hook が active であること** の組み合わせ。

## How to apply (次回作業時)

### 重要 git 操作前のチェックリスト
重要操作 = `pull --rebase` / `rebase -i` / `cherry-pick` / `merge` / `revert` 等の HEAD を移動する操作の前に:

1. **`git status` で別の操作が paused でないことを確認**
   - `.git/rebase-merge` / `.git/rebase-apply` / `.git/MERGE_HEAD` / `.git/CHERRY_PICK_HEAD` が無いこと
2. **working tree が clean であることを確認** (staged も含む)
3. **可能なら post-commit hook を一時停止** (例: `chmod -x .git/hooks/post-commit` or `mv .git/hooks/post-commit .git/hooks/post-commit.disabled`)
4. **必ずバックアップブランチを切る**: `git branch backup-pre-OP-YYYY-MM-DD-HHMM`
5. 操作完了後、 hook を復帰させる

### 別チャット並走時の運用
- **同一リポジトリで複数 Claude チャット (ナレーション系 + chip-label 系等) を並走させる時は、 双方の作業範囲を事前にユーザーが整理する**
  - ファイル namespace (ナレーション系 = `tools/voicepeak/` + `docs/quizland-voicevox-order/`、 chip-label 系 = `common/layout/` + `quizland/saved-layout.json` + `sw.js`) で分離
  - CLAUDE.md / MEMORY.md の自動追記で双方が触る箇所は事故源 → orchestrator.py の自動 commit 動作も含めて運用ルールを別途整理
- **片方で rebase / merge / cherry-pick を実行中は、 もう片方は休止**
- **異常を検出したら即座に止まる** = ファイル編集を続行しない、 必ずユーザーに状況報告

### 根本治療オプション (別タスク化推奨)
本フィードバックは事故防止策。 根本治療として以下のいずれかを別タスクで検討:
- `.git/hooks/post-commit` で `git status` を参照し、 paused 状態なら hook 自身が no-op で抜ける
- post-commit hook の auto `pull --rebase` を止めて、 staging deploy 同期は別 mechanism (= GH Actions trigger のみ) に切り替える
- post-commit hook 全停止 + 手動 commit + 手動 push 運用に切り替える

## 関連
- [project_develop_origin_divergence_pending.md] (作成中、 同期残課題)
- [project_chip_label_v968_residual.md] (作成中、 chip-label 残バグ)
- 関連 hook: `.git/hooks/post-commit` (auto push + pull --rebase --autostash)
- 過去の発火履歴: reflog `pull --rebase --autostash` を検索すれば追える
