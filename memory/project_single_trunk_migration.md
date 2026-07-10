---
name: project-single-trunk-migration
description: develop (LP staging) / develop-app (App staging) の 2 ブランチ並行開発を develop-app 単一トランクへ統合 (2026-07-10 承認・同日 Phase 1-4 実装完了、Phase 5=本番のみ未実施) の正本メモ
metadata:
  type: project
---

# develop / develop-app 単一トランク統合 (2026-07-10 承認・同日実装完了)

## ステータス

**【実装完了 — Phase 5 (本番反映) のみ未実施】** 2026-07-10 にユーザー承認され、同日中に Phase 1〜4 の実装・検証まで完了した。**現行の運用: `develop-app` が唯一の開発トランク。push 1 回で App staging / LP staging の両方に自動デプロイ (deploy.yml の if ガード付き 3 step 直列)。`develop` は凍結済み（凍結コミット `0dacb4e4`、`BRANCH_FROZEN.md` 設置、以後 push しない）。** 出し分けはブランチではなく APP_BUILD (env 単位注入) / tier (`common/tier.js`) で行う。production への反映（Phase 5）は従来どおりユーザー明示指示時のみ。

⚠️ **未解決の別件**: webapp 本番 `https://pono-asobiba-app.ndw.workers.dev/` が全パス 404 再発中（error code: 1042、2026-07-10 実測）。一度ユーザーのダッシュボードトグル ON で 200 復旧したが同日中に再発。統合とは無関係（master 未デプロイ）だが、native の `PONO_API_BASE` がこの URL を指すため要再調査（計画書 Phase 0 参照）。

## 決定の要旨

同期コストと事故リスク（`src/worker.js` 丸ごとコピーで `develop` の wrangler ビルドを壊した実績あり）を解消するため、共通コードを 2 本のブランチで別々に保守する構造そのものをやめ、`develop-app` を唯一の開発トランクにした。tier（free/book/sub）出し分けは既存の `common/tier.js` の仕組みをそのまま使うため、ブランチ分割自体が本来不要だったという判断。**旧「両ブランチへ同期」ルール（AGENTS.md §1.1 の 2026-06-16〜2026-07-10 版）と D8 interim ルールはどちらも失効済み** — 「develop 同期待ち」「両ブランチへ反映」等の記述を古いドキュメント/メモリで見かけても従わないこと。

## 設計決定 (D1–D10)

正本は `docs/branch-unification-plan.md` §2。D1〜D6・D9 は実装済み、D7 は方針のみ、D8 は失効、D10 は引き続き有効:

- **D1** ✅実装済み: トランク = `develop-app`（ブランチ名は変えない）。`develop` は凍結済み。
- **D2** ✅実装済み: `deploy.yml` = トリガ `branches: [develop-app, master]`、if ガード付き 3 step（master→production / develop-app→App staging→LP staging 直列）。
- **D3** ✅実装済み: canonical/OG/JSON-LD/`sitemap.xml` は `https://pono.kodama-no-mori.com` 固定に統一済み。Amazon 文言も新版（「Amazonの商品ページへ」）採用済み。
- **D4** ✅実装済み: `sw.js` / `src/worker.js` + `src/` 一式 / `.assetsignore` は `develop-app` 版がそのまま統一トランクの内容に。
- **D5** ✅実装済み: `wrangler.toml` に `[env.staging.assets]` 追加済み（現物 L73-76）。
- **D6** （維持）: production に `APP_BUILD` var は追加しない。sub tier 入口は App staging と Native アプリの静的注入のみ。
- **D7** （方針のみ・未実装）: 「もじっこファーム」(`id: writing-mori`) と「コトコト もりのキッチン」(`id: cooking`) は `tier: 'sub' → 'book'` に変更予定。実装は各ゲームのローンチバッチで。
- **D8** （失効）: interim ルールは移行完了により失効。LP 緊急修正も今後は `develop-app` で行う。
- **D9** ✅実装済み: `.claude/settings.local.json` の DEPLOY-FACT 文言と Stop hook auto-push 判定を develop-app に更新済み。
- **D10** （有効）: ロールバックは `deploy.yml` 変更コミットの revert + `develop` 凍結解除で旧運用に戻せる。

## Phase 実績

| Phase | 内容 | 状態 |
| --- | --- | --- |
| Phase 0 | 前提修理（webapp 本番 `pono-asobiba-app.ndw.workers.dev` 全パス 404） | ✅ **根治 (2026-07-10)** — 真犯人 = **Cloudflare Workers Builds の Git 連携** (本番 worker に接続、Production branch=develop、全 push を本番 `npx wrangler deploy`)。develop の toml に workers_dev が無く、デプロイごとに workers.dev URL が無効化されていた。ユーザーが **Disconnect** して根治 + develop 凍結で二重遮断。副作用の「本番が develop 系統 (sw v1277) に置換」は**ユーザー判断 B で容認、近日中の正式 master 更新 (Phase 5) で追認**。⚠️ それまで master へ push すると本番が 7/6 の旧内容に巻き戻る罠あり。再発検知 = prod-url-monitor.yml (6h cron)、default branch は develop-app へ変更済み |
| Phase 1 | 逆統合（`index.html` canonical/OG/JSON-LD 6 箇所 + Amazon 文言 + `sitemap.xml` 7 URL → `pono.kodama-no-mori.com`） | ✅ 完了 (2026-07-10)。origin/develop 版と byte 一致をレビューで確認 |
| Phase 2 | 設定統一（`wrangler.toml` に `[env.staging.assets]` 追加） | ✅ 完了 (2026-07-10)。3 env（production/staging/staging-app）全て dry-run ビルド成功 |
| Phase 3 | CI 切替（`deploy.yml`）+ フック更新（`.claude/settings.local.json`）+ `develop` 凍結宣言 | ✅ 完了 (2026-07-10)。凍結コミット `0dacb4e4` を `[skip deploy]` で push（デプロイ発火ゼロ確認）、develop 側 deploy.yml は `branches: [master]` のみ、`BRANCH_FROZEN.md` 設置 |
| Phase 4 | 検証（両 staging の同一コミット反映・tier 挙動をクロスレビューで実測） | ✅ 完了・全項目 PASS (2026-07-10)。両 staging が sw.js v2078 を byte 一致で配信、APP_BUILD 注入は App staging のみ、LP canonical 正常、GitHub Actions run `29098446114` で production=skipped / App staging=success / LP staging=success |
| Phase 5 | 本番反映（ユーザー明示指示時のみ `master` へマージ） | **未実施**（ユーザー明示指示待ち） |

進捗チェックボックスの正本は `docs/branch-unification-plan.md` 冒頭。

## 関連ファイル

- 計画書（正本・実装記録込み）: [`docs/branch-unification-plan.md`](../docs/branch-unification-plan.md)
- ルール正本: [`AGENTS.md`](../AGENTS.md) §1.1（「単一トランク運用ルール」に全面改訂済み）/ §1.2（URL マトリクスを統合後の現行運用に更新済み）
- Claude 固有の短い参照: [`CLAUDE.md`](../CLAUDE.md)「⚠️ Staging / Production URL マトリクス」（統合後の表に更新済み）+ 直後の「【単一トランク統合 実装済み 2026-07-10】」注記
- 実装済みコード: `.github/workflows/deploy.yml`（トリガ L9、3 step L51-76）、`wrangler.toml`（`[env.staging.assets]` L73-76）、`index.html` / `sitemap.xml`（canonical 統一済み）、`.claude/settings.local.json`（DEPLOY-FACT + Stop auto-push を develop-app 対応済み）
- 凍結ブランチ: `develop`（`BRANCH_FROZEN.md` は develop ブランチ側に設置。develop-app 側の作業ツリーには存在しない）
- tier 判定ロジック: `common/tier.js` `getTier()`（L121-139）
- APP_BUILD 注入: `src/worker.js`（HTMLRewriter）/ `native/scripts/stage-www.mjs`（L52-55、静的注入 + `PONO_API_BASE`）
- 同期事故と現行キャッシュ規約の詳細: [[project_perf_batch_1210_cache_conventions]]（[`memory/project_perf_batch_1210_cache_conventions.md`](./project_perf_batch_1210_cache_conventions.md)）— 「develop (LP staging) への同期」節に `src/worker.js` 丸ごとコピーで wrangler ビルドを壊した事故の教訓が記録されている。本統合はこの事故を根本的に無くすために実施され、**同ファイル記載の「develop への同期」運用は本統合により終了した**（sw.js のブランチ間コピー禁止等の記述は歴史的経緯として参照可）。
