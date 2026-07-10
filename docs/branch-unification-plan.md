# develop / develop-app 単一トランク統合計画

## ステータス

> ⚠️ **【承認済み・実装未着手】** 本ドキュメントは 2026-07-10 にユーザー承認された移行計画の文書化のみを行うものです。**Phase 0〜5 のいずれもまだコードに反映されていません。** 2026-07-10 時点では `develop` (LP staging) / `develop-app` (App staging) の 2 ブランチ並行開発が現行どおり継続しており、[AGENTS.md §1.1 / §1.2](../AGENTS.md) の既存ルールがそのまま有効です。将来のセッションがこのファイルの存在だけを見て「もう統合済み」と誤解しないこと。

| 項目 | 内容 |
| --- | --- |
| 承認日 | 2026-07-10 |
| 承認者 | ユーザー |
| 実装状態 | **未着手**（本タスクは計画書作成のみ。コード変更は別タスクとして Phase 順に実施） |
| トランク（統合後の唯一の開発ブランチ） | `develop-app`（ブランチ名は変更しない） |
| 凍結対象 | `develop`（移行完了時に凍結。以後 push しない） |
| 正本ドキュメント | 本ファイル `docs/branch-unification-plan.md` |
| 関連ドキュメント | [`AGENTS.md` §1.1 / §1.2](../AGENTS.md) / [`CLAUDE.md`](../CLAUDE.md) / [`memory/project_single_trunk_migration.md`](../memory/project_single_trunk_migration.md) / [`memory/project_perf_batch_1210_cache_conventions.md`](../memory/project_perf_batch_1210_cache_conventions.md) |

### Phase 進捗チェックリスト

各 Phase 完了時にこのチェックボックスを更新すること。

- [ ] Phase 0 — 前提修理（webapp 本番 404 の原因確認・復旧）
- [ ] Phase 1 — 逆統合（develop → develop-app: canonical/OG/JSON-LD/sitemap URL・Amazon 文言）
- [ ] Phase 2 — 設定統一（`[env.staging.assets]` 追加）
- [ ] Phase 3 — CI 切替 + フック更新 + `develop` 凍結宣言
- [ ] Phase 4 — 検証（クロスレビュー体制）
- [ ] Phase 5 — 本番反映（ユーザー明示指示時のみ）

---

## 1. 背景と動機

このリポジトリは 2026-06-16 以降、「2系統 staging + 共通コード同期ルール」（[AGENTS.md §1.1](../AGENTS.md)）のもとで `develop`（LP staging）と `develop-app`（App staging）を並行運用してきた。共通ゲーム／共通 UI（OtoTouch / QuizLand / Maze / Bento / `play.html` / `sw.js` 等）を触った場合は両ブランチへ同じ修正を入れる前提だったが、実運用では以下の問題が繰り返し発生した。

- **同期漏れの常態化**: `develop` 独自のコンテンツは実質ゼロで、直近の調査では 61 件の変更ファイルすべてが `develop-app` 側で先行しており、`develop` 側だけの差分は 10 件程度の残骸のみだった。
- **同期作業そのものが事故を起こした実績**: `develop-app` の変更を `develop` にブランチ間コピーで同期しようとして `src/worker.js` を丸ごとコピーし、`develop` に存在しない依存ファイル（google-auth / savedata 等）の import を持ち込んで wrangler のビルドを壊した事故が発生済み（詳細は [`memory/project_perf_batch_1210_cache_conventions.md`](../memory/project_perf_batch_1210_cache_conventions.md) の「教訓」節を参照）。この事故は「batch 限定 diff の移植」に切り替えることで復旧したが、根本原因（2 ブランチで同じコードを別々に保守する構造）は残ったままだった。
- **2026-07-10 batch:1210c** で `develop-app` の perf 改善一式を `develop` に同期する作業（tip `3be9925e`）は完了したが、これも都度手動で行う必要があり、今後も同じ作業が発生し続けることが確実だった。

以上を踏まえ、ユーザーは 2026-07-10 に「2 ブランチ並行開発を廃止し、`develop-app` 単一トランク + 環境フラグ/tier による出し分けに統合する」方針を承認した。目的は **共通コードの同期コストと事故リスクをゼロにする** こと。tier（free / book / sub）による機能出し分けは既存の `common/tier.js` の仕組みをそのまま使うため、ブランチを分ける必然性がそもそも薄いという判断が背景にある。

---

## 2. 設計決定 (D1–D10)

オーケストレーターが確定した設計決定。実装時はこの表を正として作業する。

| ID | 決定内容 |
| --- | --- |
| **D1** | トランク = `develop-app`（ブランチ名は変えない）。`develop` は移行完了時に凍結（最終コミットに凍結宣言を残し、以後 push しない）。 |
| **D2** | `.github/workflows/deploy.yml` を変更し、`develop-app` への push で **`--env staging-app` と `--env staging` の両方**へデプロイ（2 step 直列）。`master` は従来どおり production のみ。`develop` トリガは削除。 |
| **D3** | canonical/OG/JSON-LD/`sitemap.xml` の URL は統一トランクで **`https://pono.kodama-no-mori.com` 固定**（現 `develop` 側の値を採用）。Amazon 評価文言も `develop` 側の新しい版（「Amazonの商品ページへ」）を採用。**これが唯一の「逆統合」（develop → develop-app）項目。** |
| **D4** | `sw.js` / `src/worker.js` + `src/` 一式（`google-auth.js`、`api/{savedata,validate,passcode,ratelimit}.js`）/ `.assetsignore` は **`develop-app` 版が正**（bindings 未設定の LP env でも savedata は 503 graceful に倒れる、`sw.js` の precache は同一リポジトリなので LP でも全 URL 実在、と調査済み）。 |
| **D5** | `wrangler.toml` に **`[env.staging.assets]` を明示追加**（`[env.staging-app.assets]` と対称に）。現在 `[env.staging]` にはこのブロックが欠落しており設定が非対称。 |
| **D6** | production に `APP_BUILD` var は追加しない。sub tier の入口は (i) App staging（env var 注入）と (ii) Native アプリ（`native/scripts/stage-www.mjs` の静的注入）のみ。絵本購入者（book tier）は `pono_premium` パスワード方式なのでどの URL でも機能する。 |
| **D7** | 「もじっこファーム」（`id: writing-mori`、`play.html` `GAMES` 配列で `comingSoon: true`）と「コトコト もりのキッチン」（`id: cooking`、実体未実装の新規ゲーム）は **`tier: 'sub'` → `'book'` に変更予定**（絵本購入者まで開放）。実装は各ゲームのローンチバッチで行い、本計画では方針のみ記載。 |
| **D8** | **interim ルール（移行完了まで有効）**: `develop` への手動 sync は原則停止（統合待ち）。LP 緊急修正のみ `develop` へ直接コミットしてよく、その内容は統合時に取り込む。新規共通機能はすべて `develop-app` で開発する。 |
| **D9** | フック更新は **Phase 3** で実施: `.claude/settings.local.json` の DEPLOY-FACT 文言（現在 LP 系の URL のみ記載で App staging への言及なし）と、Stop hook の auto-push 判定（`branch = "develop"` 固定チェック）を更新する。 |
| **D10** | ロールバック: `deploy.yml` の変更コミット 1 個を revert すれば旧 2 ブランチ運用に戻せる（`develop` の凍結を解除すれば復元可能）。 |

---

## 3. 実装フェーズ計画

各 Phase は完了ごとに本ファイル冒頭のチェックリストを更新する運用とする。

### Phase 0 — 前提修理（統合作業と並行して着手可）

- **作業項目**:
  - ⚠️⚠️ Web アプリ本番 `https://pono-asobiba-app.ndw.workers.dev/` が現在**全パス 404**（2026-07-10 実測。本計画書作成中にも `curl` で再確認済み、応答コード `404`）。
  - `wrangler.toml` の `workers_dev = true`（L19）は `master` の commit `a6bd30e2` で追加済みだが、それでもなお未復旧。原因は Cloudflare ダッシュボード側の workers.dev サブドメイン設定にある可能性が高い（ユーザー作業になり得る）。
  - `native/scripts/stage-www.mjs`（L52-55）の `PONO_API_BASE` が `https://pono-asobiba-app.ndw.workers.dev` を指しているため、Native アプリの savedata API はこの復旧が前提条件。
- **検証方法**: `curl -I https://pono-asobiba-app.ndw.workers.dev/` が 200 を返すこと。Cloudflare ダッシュボードで該当 Worker の workers.dev サブドメイン有効化状態を確認。
- **担当想定**: Cloudflare ダッシュボード操作が必要な場合はユーザー、コード側の確認は Claude/Codex どちらでも可。
- **ブロッカー**: Cloudflare 管理画面の設定はエージェントから直接操作できない可能性が高く、ユーザー確認待ちになる場合がある。

### Phase 1 — 逆統合（develop → develop-app）

- **作業項目**（D3 の実装）:
  - `index.html` の canonical/OG/JSON-LD 6 箇所を `https://pono-asobiba-app.ndw.workers.dev` → `https://pono.kodama-no-mori.com` に統一。対象行（2026-07-10 実測）:
    - L10 `<link rel="canonical" ...>`
    - L14 `<meta property="og:url" ...>`
    - L18 `<meta property="og:image" ...>`
    - L25 `<meta name="twitter:image" ...>`
    - L34 JSON-LD `"url"`
    - L39 JSON-LD `"target"`
  - `sitemap.xml` の `<loc>` 7 件（トップ + `writing/` + `coloring/` + `puzzle/` + `drawing/` + `wordmatch/` 他）も同様に置換。
  - Amazon 訴求文言（`index.html` L2039-2145 付近、リンクの `aria-label`/`alt` 等）を `develop` 側の新しい版「Amazonの商品ページへ」に統一。現行の `develop-app` 側文言（例: L2047 `aria-label="Amazonで絵本『ありがとうって、うれしいね』を見る"`）から置き換える。
- **検証方法**: 統合後の HTML を curl 等で取得し、`pono-asobiba-app.ndw.workers.dev` の残存がゼロであることを grep 確認。sitemap.xml の 7 URL 全件が `pono.kodama-no-mori.com` 配下になっていることを確認。
- **担当想定**: Claude（テキスト置換中心）。
- **ブロッカー**: なし（純粋な文字列置換）。ただし全配信面が custom domain を canonical と宣言する設計になるため、SEO 影響（LP staging / App staging の重複解決）を意識して置換後に目視レビューする。

### Phase 2 — 設定統一

- **作業項目**（D5 の実装）:
  - `wrangler.toml` の `[env.staging]`（現状 L67-73、`[[env.staging.kv_namespaces]]` のみで `assets` ブロックが無い）に、`[env.staging-app.assets]`（L93-96: `directory = "./"` / `binding = "ASSETS"` / `run_worker_first = true`）と対称な `[env.staging.assets]` を追加する。
  - `wrangler deploy --dry-run --env staging` でビルド検証。
- **検証方法**: dry-run が成功すること。既存の `[env.staging-app]` 側の挙動（`run_worker_first` による no-cache ヘッダー注入等）と一致することを確認。
- **担当想定**: Claude。
- **ブロッカー / 注意**: KV `BENTO_MASK_CONFIG` は `staging`（id `0c58144b7fe9479e9781ddb1d9b44dc9`）と `staging-app`（同一 id）で **同一 namespace を共有**している。相互上書きの注意コメントが `wrangler.toml` L98-101 に既存あり、統合後もこの注意点は維持すること。

### Phase 3 — CI 切替 + フック更新

- **作業項目**（D2, D9 の実装）:
  - `.github/workflows/deploy.yml` を変更し、`develop-app` への push で `--env staging-app` → `--env staging` の 2 step 直列デプロイに変更。現状 L49 の三項分岐 `command: ${{ github.ref == 'refs/heads/master' && 'deploy' || (github.ref == 'refs/heads/develop-app' && 'deploy --env staging-app' || 'deploy --env staging') }}` を置き換える。`on.push.branches`（L7、現状 `[develop, develop-app, master]`）から `develop` を削除。`concurrency`（L19-21、`group: deploy-${{ github.ref }}`）は ref 単位のまま維持でよい（`develop-app` への push は 1 回の workflow 実行内で 2 env を順にデプロイするため）。`master` は現状の単一 deploy ステップのまま変更なし。
  - `.claude/settings.local.json` の DEPLOY-FACT 文言（現状 L87、LP 系 URL のみ記載で App staging への言及なし）を更新し、App staging の存在を明記する。
  - `.claude/settings.local.json` の Stop hook 自動 push 判定（現状 L110-119、L116 で `branch = "develop"` 固定チェック）を `develop-app` を見るように更新する。
  - `develop` ブランチに凍結宣言コミットを 1 つ入れる（「単一トランク統合により凍結。以後 push しない」等）。
- **検証方法**: `develop-app` への push 1 回で両 staging（App/LP）に同一コミットが反映されることを実機確認（Phase 4 で実施）。
- **担当想定**: Claude（YAML/JSON 編集）+ ユーザー承認（CI 変更は影響範囲が広いため）。
- **ブロッカー**: `.claude/settings.local.json` はローカル設定ファイルのため、リポジトリの正本と各開発者環境の同期漏れに注意。

### Phase 4 — 検証

- **作業項目**:
  - 両 staging が同一コミットを配信していることを実測で確認する:
    - `sw.js` の `CACHE_VERSION` が両 URL で一致すること。
    - `play/`, `quizland/` 等の主要ページが両 URL で 200 を返すこと。
    - App staging (`pono-asobiba-app-staging.ndw.workers.dev`) のみ `window.__APP_BUILD__ === 1` が注入されていること。LP staging (`pono-asobiba-staging.ndw.workers.dev`) には注入されていないこと。
    - tier 挙動: LP staging = `free`/`book`、App staging = `sub`（`common/tier.js` L121-139 `getTier()` の分岐どおり）。
- **検証方法**: クロスレビュー体制（複数エージェントによる相互検証）で実施。
- **担当想定**: Claude + Codex のクロスレビュー。
- **ブロッカー**: Phase 0（本番 404）が未解決でも staging 検証自体は独立して実施可能。

### Phase 5 — 本番反映

- **作業項目**: 従来どおりユーザー明示指示で `master` へマージ。production は 1 つの Worker が custom domain (`pono.kodama-no-mori.com`) と workers.dev (`pono-asobiba-app.ndw.workers.dev`) の両方を serve する構成を維持し、`APP_BUILD` 注入は行わない（D6）。
- **検証方法**: production マージ後の通常デプロイ確認フローに準拠。
- **担当想定**: ユーザー明示指示時のみ Claude/Codex が実行。
- **ブロッカー**: [AGENTS.md 絶対禁止ルール §2-2](../AGENTS.md) により、ユーザーの明示指示なしに `master` へは絶対にマージしない。

---

## 4. 障害リスト / リスク一覧

| # | リスク | 影響 | 対応方針 |
| --- | --- | --- | --- |
| 1 | Web アプリ本番 404（Phase 0） | Native アプリの savedata API が機能しない可能性 | Cloudflare ダッシュボード確認（ユーザー作業になり得る） |
| 2 | canonical URL 統合による SEO 影響（Phase 1） | 全配信面が同一 canonical を宣言する設計変更 | 意図的な設計（重複解決として正しい）である旨を記録済み、置換後に目視レビュー |
| 3 | `wrangler.toml` の env 非対称設定（Phase 2） | `[env.staging]` に `assets` ブロックが無く、静的ファイル配信が worker を経由しない可能性 | `[env.staging.assets]` 追加 + dry-run 検証 |
| 4 | `.claude/settings.local.json` のフック未更新（Phase 3） | DEPLOY-FACT が古い情報のまま/自動 push が `develop` のみを見て `develop-app` を見落とす | Phase 3 で確実に更新（本計画に明記） |
| 5 | `BENTO_MASK_CONFIG` KV の staging/staging-app 間共有 | 相互上書きリスクは統合後も残存（構造は変わらない） | 既存の注意コメントを維持、将来的な namespace 分離は別タスク |
| 6 | LP トップ `index.html` が `/sw.js` を register している（`common/sw-update.js` 経由） | `develop-app` 版 `sw.js` の precache は LP 初回訪問者に ~10MB 級の帯域コストを発生させる | 障害ではないが将来最適化候補として記録。本計画のスコープ外 |
| 7 | 同期の歴史的事故（`src/worker.js` 丸ごとコピーで build 破壊） | 統合完了までの interim 期間（D8）に旧来の「丸ごとコピー」同期を再度行うと同じ事故が起きうる | D8 の interim ルール（新規共通機能はすべて `develop-app` で開発、`develop` への sync は原則停止）を厳守 |

---

## 5. ロールバック手順（D10）

`deploy.yml` の変更は 1 コミットにまとめて行うこと。ロールバックが必要になった場合:

1. `deploy.yml` の変更コミットを `git revert` する。
2. `develop` ブランチの凍結を解除する（凍結宣言コミット以降の push を再開してよい旨を関係者に周知）。
3. Phase 1 で行った canonical URL / Amazon 文言の変更は、旧 2 ブランチ運用に戻すだけであれば据え置いてよい（`develop-app` の canonical が `pono.kodama-no-mori.com` になっていても、旧運用上は問題にならない）。据え置かず旧値に戻す場合は Phase 1 の変更を個別に revert する。
4. `wrangler.toml` の `[env.staging.assets]` 追加（Phase 2）は非破壊的な追加のため、ロールバック時に戻す必要はない。

---

## 6. 移行完了の定義

以下をすべて満たした時点で「移行完了」とする。

- [ ] Phase 0〜4 が完了し、本ファイル冒頭のチェックリストが全てチェック済み
- [ ] `develop` ブランチに凍結宣言コミットが入っている
- [ ] `develop-app` への 1 回の push で App staging / LP staging の両方に同一コミットが反映されることを実機確認済み
- [ ] `.claude/settings.local.json` の DEPLOY-FACT / Stop hook が更新済み
- [ ] `AGENTS.md` §1.1 / §1.2 が「移行後の姿」を正として更新されている（本計画書の「現行」記述は歴史的経緯として残置）

---

## 変更履歴

- 2026-07-10: 初版作成。計画確定・文書化のみ（実装 Phase は未着手）。
