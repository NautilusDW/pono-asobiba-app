---
name: develop / origin/develop divergence 同期残課題 (2026-05-12 発生、 未対処)
description: develop ブランチが origin/develop と divergence (19 behind / 5 ahead) のまま残っている。 単純な git pull --rebase は今回の混乱の根本原因となったので NG。 落ち着いた時間に origin の 19 commits の中身を手動確認してから慎重に同期する必要がある
type: project
---

# develop / origin/develop divergence 同期残課題

## 確定事実 (2026-05-12 時点)
- ローカル develop: HEAD 周辺で 5 ahead / 19 behind
- 4daacbe (= 復旧完了時点の HEAD) が起点
- backup branches 3 本温存: `backup-narration-2026-05-12` / `backup-state-2026-05-12-19-09` / `backup-state-2026-05-12-19-17`

## やってはいけないこと
- **単純な `git pull --rebase` 即時実行 NG** (今回の auto-commit hook + rebase paused 状態の巻き込み混乱の根本原因)
- post-commit hook が auto push をかける状態で develop に rebase をかけると、 paused 中の working tree が次の自動 commit に巻き込まれる事故が再発する
- 19 behind の commits の中身を未確認のまま merge / rebase で取り込まない

## やるべきこと (落ち着いた時間に)
1. origin の 19 commits の中身を `git log --oneline origin/develop` + `git log -p` で内容確認
2. ローカル 5 ahead の commits との衝突可能性を予測
3. **post-commit hook を一時停止** してから rebase or merge を実行 (重要)
4. 同期完了後 hook を復帰
5. 同期前にバックアップブランチを 1 本切る (= `git branch backup-pre-sync-YYYY-MM-DD`)

## Why
- 別チャット (chip-label v969) と本チャット (ナレーション漢字混じり化 Phase 2) が同時に走り、 auto-commit hook が rebase paused 状態に commit を巻き込み 2 回連続で大規模混乱が発生
- divergence を放置すると次回の作業で同じ事故が再発する高リスク
- backup branches は健全なので最悪復旧可能だが、 復旧コストが大きい (~2 時間)

## How to apply (次回セッション開始時)
- MEMORY.md インデックスから本ファイルを認識したら、 「未対処の divergence 同期残課題があります。 落ち着いた時間に手動同期しますか？」 と Claude から能動的に提案
- ユーザーが「今やる」 と判断したら 上記「やるべきこと」 1〜5 を順次実行
- ユーザーが「あとで」 と言ったら本ファイルを残して次回再提案

## 関連
- [feedback_auto_commit_hook_rebase_risk.md] (作成中、 hook + rebase 危険性の運用ルール)
- [project_chip_label_v968_residual.md] (作成中、 chip-label 残バグ)
- backup branches (3 本) のうち `backup-narration-2026-05-12` はナレーション Phase 2 成果保護用、 残り 2 本は復旧 state の保険
