---
name: feedback_auto_push
description: デプロイは Cloudflare Workers (wrangler)。Netlify は完全廃止。post-commit が develop 自動 push、GH Actions が wrangler deploy する
type: feedback
---

## デプロイ自動化 (Cloudflare Workers)

このプロジェクトは Cloudflare Workers で配信されている。

**Netlify は完全に廃止。Netlify という単語を提案・コマンド・回答に出さない。**

### 自動化フロー (develop)
1. `.git/hooks/post-commit` が develop ブランチで `git push origin develop` を実行 (バックグラウンド・flock ガード付き)
2. GitHub Actions (`.github/workflows/deploy.yml`) が `wrangler deploy --env staging` を実行
3. `https://pono-asobiba-staging.ndw.workers.dev/` に反映

### Production
- master ブランチ → `wrangler deploy` (env なし) → `https://pono.kodama-no-mori.com/`
- 必ずユーザー明示指示時のみマージ

### 設定ファイル
- [wrangler.toml](../wrangler.toml) — `name = "pono-asobiba-app"`, staging env, custom_domain pono.kodama-no-mori.com
- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) — wrangler deploy を実行
- `.git/hooks/post-commit` — develop の自動 push のみ

**Why:** 過去に何度も古いメモリの「Netlify」記述に引きずられ、ユーザーに `netlify deploy` を提案・コマンド表示してしまうミスを繰り返した。デプロイ手段は **常に Cloudflare Workers via wrangler** が正解。
**How to apply:**
- デプロイ・反映関連の発言で `netlify` という単語を使わない
- 古い ハンドオフドキュメントに Netlify 記述があっても無視し、現在の真実 (Cloudflare) を優先
- 手動デプロイ提案も `wrangler deploy --env staging` (staging) または `wrangler deploy` (prod)
- staging URL は `pono-asobiba-staging.ndw.workers.dev`、prod URL は `pono.kodama-no-mori.com`
