---
name: feedback_auto_push
description: git push自動化 — post-commitフックでNetlifyデプロイ自動実行済み
type: feedback
---

## git push 自動化設定

- `.git/hooks/post-commit` で develop ブランチのコミット時に自動で `netlify deploy` が実行される
- 手動デプロイ不要、git push もデプロイには不要（バックアップとしては推奨）
- master への反映はユーザー明示指示時のみ

**Why:** 以前デプロイ忘れが発生し、ユーザーに変更が届かなかった
**How to apply:** コミット後に手動デプロイを提案しない。pushはバックアップ目的で提案してよい
