---
name: project-single-trunk-migration
description: develop (LP staging) / develop-app (App staging) の 2 ブランチ並行開発を develop-app 単一トランクへ統合する計画 (2026-07-10 承認・実装未着手) の正本メモ
metadata:
  type: project
---

# develop / develop-app 単一トランク統合計画 (2026-07-10 承認, 実装未着手)

## ステータス

**【承認済み・実装未着手】** 2026-07-10 にユーザーが「`develop` / `develop-app` の 2 ブランチ並行開発を廃止し、`develop-app` 単一トランク + 環境フラグ/tier による出し分けに統合する」方針を承認した。今回のタスクは**計画の文書化のみ**であり、コード変更（`deploy.yml` / `wrangler.toml` / `index.html` / `sitemap.xml` 等）は一切行っていない。実装は正本ドキュメント [`docs/branch-unification-plan.md`](../docs/branch-unification-plan.md) の Phase 0〜5 として別タスクで進める。

**このメモを読んだだけで「もう統合済み」と判断しないこと。** 2026-07-10 時点では `develop`（LP staging）/ `develop-app`（App staging）の 2 ブランチ並行運用が現行のまま継続しており、`AGENTS.md` §1.1 / §1.2 の既存ルールが有効。

## 決定の要旨

同期コストと事故リスク（`src/worker.js` 丸ごとコピーで `develop` の wrangler ビルドを壊した実績あり）を解消するため、共通コードを 2 本のブランチで別々に保守する構造そのものをやめ、`develop-app` を唯一の開発トランクにする。tier（free/book/sub）出し分けは既存の `common/tier.js` の仕組みをそのまま使うため、ブランチ分割自体が本来不要だったという判断。

## 設計決定 (D1–D10)

正本は `docs/branch-unification-plan.md` §2。要旨のみ再掲:

- **D1**: トランク = `develop-app`（ブランチ名は変えない）。`develop` は移行完了時に凍結。
- **D2**: `deploy.yml` を変更し、`develop-app` push で `--env staging-app` + `--env staging` の 2 step 直列デプロイ。`develop` トリガは削除。
- **D3**: canonical/OG/JSON-LD/`sitemap.xml` は `https://pono.kodama-no-mori.com` 固定（`develop` 側の値を採用）。Amazon 文言も `develop` 側の新版採用。**唯一の逆統合（develop → develop-app）項目。**
- **D4**: `sw.js` / `src/worker.js` + `src/` 一式 / `.assetsignore` は `develop-app` 版が正。
- **D5**: `wrangler.toml` に `[env.staging.assets]` を明示追加（`[env.staging-app.assets]` と対称に）。
- **D6**: production に `APP_BUILD` var は追加しない。sub tier 入口は App staging と Native アプリの静的注入のみ。
- **D7**: 「もじっこファーム」(`id: writing-mori`) と「コトコト もりのキッチン」(`id: cooking`) は `tier: 'sub' → 'book'` に変更予定（方針のみ、実装は別タスク）。
- **D8**: interim ルール（移行完了まで有効）。`develop` への手動 sync は原則停止。LP 緊急修正のみ `develop` へ直接コミット可（統合時に取り込む）。新規共通機能は `develop-app` のみで開発。
- **D9**: `.claude/settings.local.json` の DEPLOY-FACT 文言と Stop hook 自動 push 判定（`branch = "develop"` 固定）の更新は Phase 3 で実施。
- **D10**: ロールバックは `deploy.yml` 変更コミット 1 個の revert + `develop` 凍結解除で旧運用に戻せる。

## Phase 状況

| Phase | 内容 | 状態 |
| --- | --- | --- |
| Phase 0 | 前提修理（webapp 本番 `pono-asobiba-app.ndw.workers.dev` 全パス 404 の原因確認・復旧） | 未着手 |
| Phase 1 | 逆統合（`index.html` canonical/OG/JSON-LD 6 箇所 + `sitemap.xml` 7 URL + Amazon 文言） | 未着手 |
| Phase 2 | 設定統一（`wrangler.toml` に `[env.staging.assets]` 追加） | 未着手 |
| Phase 3 | CI 切替（`deploy.yml`）+ フック更新（`.claude/settings.local.json`）+ `develop` 凍結宣言 | 未着手 |
| Phase 4 | 検証（両 staging の同一コミット反映・tier 挙動をクロスレビューで実測） | 未着手 |
| Phase 5 | 本番反映（ユーザー明示指示時のみ `master` へマージ） | 未着手 |

進捗チェックボックスの正本は `docs/branch-unification-plan.md` 冒頭。

## 関連ファイル

- 計画書（正本）: [`docs/branch-unification-plan.md`](../docs/branch-unification-plan.md)
- ルール正本: [`AGENTS.md`](../AGENTS.md) §1.1（2026-07-10 改訂、interim ルール D8 を追記済み）/ §1.2（「移行後の姿」節を追加済み、現行と明確に区別）
- Claude 固有の短い参照: [`CLAUDE.md`](../CLAUDE.md)「⚠️ Staging / Production URL マトリクス」直後の注記
- 変更対象コード（未着手）: `.github/workflows/deploy.yml`, `wrangler.toml`, `index.html`, `sitemap.xml`, `.claude/settings.local.json`
- tier 判定ロジック: `common/tier.js` `getTier()`（L121-139）
- APP_BUILD 注入: `src/worker.js`（HTMLRewriter）/ `native/scripts/stage-www.mjs`（L52-55、静的注入）
- 同期事故と現行キャッシュ規約の詳細: [[project_perf_batch_1210_cache_conventions]]（[`memory/project_perf_batch_1210_cache_conventions.md`](./project_perf_batch_1210_cache_conventions.md)）— 「develop (LP staging) への同期」節に `src/worker.js` 丸ごとコピーで wrangler ビルドを壊した事故の教訓が記録されている。本統合計画はこの事故を根本的に無くすことが動機。
