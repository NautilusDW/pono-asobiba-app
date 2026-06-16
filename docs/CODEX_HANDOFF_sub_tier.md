# pono-asobiba-app: sub-tier 振り分け 引き継ぎ依頼 (Codex 向け)

> このファイルは Claude セッションから Codex セッションへの handoff です。 そのまま読んで作業を再開してください。

## プロジェクト概要

`d:\AppDevelopment\pono-asobiba-app` — 子供向け Web 知育アプリ。 Cloudflare Workers で配信、 develop 自動デプロイ → staging、 master 明示時のみ → production。

## 直近のあらすじ (Claude セッション)

ここ数時間で sub-tier の振り分けを再設計し、 sw v1190 → v1196 の連続パッチを develop と develop-app の両ブランチに反映：

| 版 | 内容 |
|---|---|
| v1191 | SW navigation を完全 bypass（redirect ループ修正） |
| v1192 | `common/tier.js` の `getTier()` を APP_BUILD-driven に書き換え。 アプリ版 (window.__APP_BUILD__=1) は無条件で `'sub'`、 本版は localStorage `pono_premium='1'` で `'book'` else `'free'`。 `pono_sub_active` の読み書きは完全廃止 |
| v1193 | breakout/stacking/slide/promo.js/acorns.js/writing の 6 ファイルで raw `localStorage.pono_premium` 読みを PonoTier 経由に変更 |
| v1194 | play-all.html の 4 箇所で同様の PonoTier propagation |
| v1195 | play.html の MENU_GAMES 生成時に `tier === 'sub' && !isAppBuild()` のカードを Array.filter で除外 |
| v1196 | starparodier / undersea-cave / sea-album を tier:'sub' に再分類 (docs/TIER_POLICY.md §2.1 の MVP 本命 5 本: quizland / maze / oto / puzzle / bento 以外は全て sub) |

## 現在のブランチ状態

- `develop @ 917a3ccd08f603446cb075c1645913e8a8ad7607`
- `develop-app @ 7ff8aa98aea85591cd39a14ca7094a23868953a1`
- 両ブランチ sw.js CACHE_VERSION = 1196
- master は今回の一連の変更を受けていない (production 不変)

## 報告された不具合

user が両 staging URL を開いたところ、 **本版 (https://pono-asobiba-staging.ndw.workers.dev/) もアプリ版 (https://pono-asobiba-app-staging.ndw.workers.dev/) も「本を買った人用」 と同じメニュー** が表示される、 と報告。

期待される挙動:
- **本版**: MVP 5 本のみ表示 (quizland / maze / oto / puzzle / bento)
- **アプリ版**: MVP 5 本 + 非 MVP 5 本 (starparodier / undersea-cave / sea-album / writing-mori / zukan) = 合計 8 本

実際: 両方とも 5 本のみ (= アプリ版で APP_BUILD が効いていない)

## 推定原因 (要検証)

1. **APP_BUILD 注入失敗**: `wrangler.toml [env.staging-app.assets].run_worker_first = true` で worker が起動するはずだが、 CF エッジで HIT 返してて worker が動いていない可能性
2. **HTMLRewriter ロジック不発**: `src/worker.js` の `injectAppBuildFlag` が text/html レスポンスに `<script>window.__APP_BUILD__=1;</script>` を prepend するが、 何かの条件で発火していない
3. **SW キャッシュ滞留**: user ブラウザに旧 SW / 旧 play.html が残っていて、 ハードリロード + DevTools→Application→Service workers→Unregister が必要
4. **PonoTier.isAppBuild() バグ**: `common/tier.js` の判定式 `window.__APP_BUILD__ === 1 || === '1'` で読み損ねている

## 最初の診断手順 (推奨)

```bash
# 1) サーバ側の APP_BUILD 注入が効いているか確認
curl -s https://pono-asobiba-app-staging.ndw.workers.dev/ | grep -o "window.__APP_BUILD__=[0-9'\"]*"
curl -s https://pono-asobiba-staging.ndw.workers.dev/ | grep -o "window.__APP_BUILD__=[0-9'\"]*"

# 期待値:
#   pono-asobiba-app-staging → window.__APP_BUILD__=1 が出力される
#   pono-asobiba-staging     → 何も出力されない (注入されない)

# 2) CF-Cache-Status を確認 (worker が動いてるか)
curl -sI https://pono-asobiba-app-staging.ndw.workers.dev/ | grep -iE "cf-cache-status|cache-control"

# 期待値: CF-Cache-Status: DYNAMIC または MISS (HIT だと worker 不発)
# Cache-Control: no-cache, no-store, must-revalidate (applyCacheHeaders が動いている証拠)
```

もし (1) で APP_BUILD が注入されていないなら、 wrangler.toml の `[env.staging-app.assets]` セクション (`d:\AppDevelopment\pono-asobiba-app\wrangler.toml`、 直近 commit で追加) を確認し、 `run_worker_first = true` が boolean のままか、 `directory = "./"` / `binding = "ASSETS"` が正しく書かれているか確認。

もし (1) では注入されているが user 環境で動かないなら SW キャッシュ問題なので、 user に DevTools → Application → Service workers → Unregister + Clear site data + タブ閉じて再オープン を案内。

## 関連ファイル

- `d:\AppDevelopment\pono-asobiba-app\common\tier.js` — PonoTier API、 getTier() / isAppBuild() / isXxxUnlocked() 群
- `d:\AppDevelopment\pono-asobiba-app\play.html` — MENU_GAMES 配列 (L1685-1843) + MENU_GAMES filter (L1844-1860) + renderCards (L1951-1958) + GAMES startGame (L2157)
- `d:\AppDevelopment\pono-asobiba-app\src\worker.js` — HTMLRewriter による APP_BUILD 注入 (`injectAppBuildFlag`, L81-L99) と ALLOWED_GH_ORIGINS (L640 付近)
- `d:\AppDevelopment\pono-asobiba-app\wrangler.toml` — [env.staging-app] (L52-L70 付近) と root [assets] (L29 付近)
- `d:\AppDevelopment\pono-asobiba-app\sw.js` — CACHE_VERSION (L4) と navigation handler (L62-)
- `d:\AppDevelopment\pono-asobiba-app\.github\workflows\deploy.yml` — `develop-app` → `wrangler deploy --env staging-app` のフロー

## 参照すべき memory

`C:\Users\surfe\.claude\projects\d--AppDevelopment-pono-asobiba-app\memory\`:
- `app_staging_environment.md` — staging-app worker の仕様
- `tier_system_policy.md` — **MVP 以外は全部 tier:'sub' (アプリ版限定)** という user 確定ルール。 MVP id: quizland / maze / oto / puzzle / bento
- `tech_deploy_pipeline_sw_update.md` — sw.js 更新 UX、 `run_worker_first` の罠
- `feedback_ponotier_propagation.md` — tier 系を変えたら raw localStorage 読み箇所も全部洗えという教訓
- `feedback_high_warning_browser_spec.md` — クロスレビュー HIGH 警告の扱いルール

## 制約 (絶対遵守)

- destructive git 禁止: `--force` / `reset --hard` / `clean -f` / `branch -D` / `checkout .` / `restore .` / `rebase -i` / `--no-verify`
- production (master) には触れない。 develop と develop-app のみ
- sw.js / common/ / index.html / play.html / 各ゲーム index.html を編集したら CACHE_VERSION を必ず +1 (現状 1196 → 1197 以降)
- 配信は Cloudflare Workers のみ。 staging URL は固定で、 本版=https://pono-asobiba-staging.ndw.workers.dev/、 アプリ版=https://pono-asobiba-app-staging.ndw.workers.dev/、 production=https://pono.kodama-no-mori.com/
- 編集の前に必ず対象ファイルを Read

## 推奨アプローチ

1. **診断**: 上記 curl 2 本を実行し、 サーバ側の APP_BUILD 注入が機能しているか即確認
2. **原因に応じた分岐**:
   - サーバ側 NG → wrangler.toml の `[env.staging-app.assets]` 設定の見直し、 必要なら redeploy
   - サーバ側 OK だが user 環境 NG → SW unregister 手順を user に案内
   - 両方 OK だが symptom 継続 → PonoTier.isAppBuild() / MENU_GAMES filter のロジックを再確認
3. **修正実装**: 必要なら 1 commit / 1 push にまとめて develop + develop-app の両方に同じ変更を反映
4. **検証**: クロスレビュー (別エージェントが adversarial に completeness check) を回してから user に結果報告

## user の期待

「結果を出すこと」。 言い訳や中間進捗の連発は NG。 修正完了 + テスト手順 を 1 度の応答にまとめて出す形が望ましい。
