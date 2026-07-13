# データ分析基盤 導入計画

作成日: 2026-07-13 ／ status: draft (レビュー済み)

> **本計画の正本。実装時は本書を参照すること。** 現状棚卸し・マーケ活用分析・技術基盤設計・ネイティブアプリ対応の4系統の調査/分析ワークフロー成果物を、オーケストレーター(Fable)が確定した設計方針に統合したもの。個別分析の詳細根拠(file:line)は本文中に残しているが、ワークフロー生ログの正本パスは [§11 出典](#11-出典) を参照。

---

## 1. エグゼクティブサマリ

「ポノの遊び場」の行動データは、現状**ほぼ全てが子供の端末 localStorage に閉じており**、運営側がサーバーで横断集計できる形で到達しているのは (a) ★評価/`survey.html` アンケートが Google Apps Script (GAS) 経由で Google Sheets へ送る定性データ (週次 KPI K1-K12 運用が既に稼働中)、(b) Umami の素の pageview (33 ゲーム中 15 個のみ、LP/`play.html` は未計装) の2つだけである。人気ゲーム比較・継続率・エンゲージメント深度・LP→アプリ転換・課金コンバージョンはサーバー側から見る手段が現状ゼロで、さらに `pono_stats`/`pono_achievements` 等の主要進捗キーは MVP フラグにより実質書き込み停止中という「取れているようで取れていない」罠が複数存在する(§3)。

本計画は、UI タップ系のような個人継続性が不要な計測は既存 Umami に寄せ、リテンション・ファネル・tier 結合が必要な計測は新設の first-party パイプライン (`POST /api/e` → Cloudflare Workers Analytics Engine (WAE) → cron ロールアップ → D1 → `admin/` 可視化) に寄せる、ハイブリッド構成を採用する。ネイティブ (Capacitor/Android→iOS) 対応は後付けせず、Phase 1 の Web 実装設計に絶対URLイディオム・POST 強制・バッチ上限・IndexedDB キューを最初から織り込む。プライバシー面は COPPA「内部運用支援」例外の3制約(目的外利用禁止・第三者非開示・プライバシーポリシー明記)を満たす設計とし、収集開始前のゲートとして扱う。

---

## 2. 現状棚卸し

### 2.1 クライアント側データ(localStorage / sessionStorage) — 6系統

126種超ある `pono_*` キーのうち、代表的な6系統に圧縮する(全量は `common/data-export.js` のexport allowlistが実質的な正本)。

| 系統 | 代表キー | file:line | 概要 | 現状の留意点 |
|---|---|---|---|---|
| A. 汎用統計 | `pono_stats` | `common/achievements.js:83,100-127`(30種超のカウンタ、maze/quizland/bowling/writing/fossil/egg 等30ファイル超から書込) | ゲーム別プレイ回数/正解数/クリア数の万能カウンタ。実績判定にも使用 | **MVPフラグで凍結中**(§3-1) |
| B. どんぐり経済 | `pono_acorns`, `pono_acorns_daily_<gameId>_<date>` | `common/acorns.js:6-10,33-116,121-155` | 仮想通貨残高・日次上限(無料25/有料35) | MVPでも唯一のcarve-out、現役で稼働中 |
| C. デイリーログイン | `pono_stickers`, `pono_login_days`, `pono_login_streak`, `pono_streak_bonus_count` | `common/stickers.js:78-83,94-236,247-284` | ログインボーナス・連続日数管理 | **MVPフラグで凍結 かつ `checkDailyLogin()` の呼び出し元が `play-all.html:2193-2194` のみで現行ハブ `play.html` から未呼出**(二重の理由で機能停止、architecture分析確認済み) |
| D. 実績/コレクション | `pono_achievements`, `pono_unlocked_sea/furn/wall/floor/bg` | `common/achievements.js:84-89,130-196` | 実績56件(review監査で実測、当初「71種」表記は過大)＋報酬解放IDの配列 | **MVPフラグで凍結中** |
| E. プロフィール | `pono_player_profile_v1`(play.html本流) / `pono_profile`(旧ゲーム群) | `play.html:15806,16623-16637` | name/age/gender/avatar。自由入力(実名可) | cloud-sync/export双方で氏名系4キーは常時stripされサーバー未送信 |
| F. 評価/匿名ID | `pono_anon_sid`(sessionStorage), `pono_rating_dfp`, `pono_first_visit_at`, `pono_rating_history` | `common/rating-modal.js:35-41,77-129,132-190` | 匿名セッションID＋端末指紋(dfp)＋星評価履歴 | dfpは計算・localStorage永続のみで**未送信**(§3-2) |

他に確認された注目キー(全量ではなく代表例): `pono_donguri_shop_v1`(ガチャ購入履歴、時刻・金額付き、`js/donguri-shop.js:9-12,94-100,449-468`)、`pono_game_stickers_v1`(ゲーム別シール帳、`firstAt`/`lastAt` ms epoch付き、`js/game-stickers.js:7-8,62-77`)、`pono_hiscore_<gameId>`(TOP5スコア履歴、`common/highscore.js:15,118,147-169`)、`pono_mmath_progress_v1`(ステージ別星3段階の習熟度、`monster-math/engine.js:69-97`)、`pono_drawings`(お絵かきdataURL実体、最大15件、`drawing/index.html:1079-1108`)、`pono_played_<Date.toDateString()>`(日次マルチゲーム利用ログ、9ゲームから書込)。

**設計上の穴**: `writing-mori/care.html` の `mojikkoFarmCareStateV1`(もじかきの森ペット育成状態)は `pono_` プレフィックスを持たないため `data-export.js`/`cloud-sync.js` の `KEY_ALLOW_PATTERN=/^pono_[a-z0-9_]+$/`(`data-export.js:31`)にマッチせず、バックアップ/クラウド同期の対象外(`writing-mori/care.html:2111-2150`)。

### 2.2 サーバー側(Cloudflare Worker)

| エンドポイント/系統 | 認証 | 概要 | file:line | マーケ的価値 |
|---|---|---|---|---|
| GAS フィードバック/アンケート | なし(no-cors POST) | ★評価ping + `survey.html` 詳細アンケート。Cloudflare Workerを経由せず直接 `script.google.com` へ | `common/rating-modal.js:215-255`, `survey.html:306-328` | **唯一の定性リサーチ経路**。週次KPI(K1-K12)運用が既に稼働(`docs/SURVEY_WEEKLY_CHECKLIST.md`) |
| `POST/GET /api/savedata` | passcode(HMACキー化) | 合言葉型クラウド同期。氏名4キーを保存前にstrip | `src/api/savedata.js:128,154-324` | ほぼゼロ。**production/LP stagingでは `SAVEDATA_KV` 未バインドで常時503**、`env.staging-app` のみ有効(`wrangler.toml:50-52,121-123`) |
| レート制限KVカウンタ | - | グローバル/IP別/失敗回数、TTL 60秒〜24時間 | `src/api/ratelimit.js:22-161` | ゼロ(攻撃抑止専用のephemeralカウンタ) |
| Bentoマスク/NPC配置API | Basic Auth(POST) | ゲームデザイン設定のKV保存(履歴付き) | `src/worker.js:93-123` | ゼロ(ユーザーデータでない) |
| `/api/gh/*` | Basic Auth | GitHub Contents APIプロキシ、`admin/index.html` のコンテンツ管理コンソールが利用 | `src/worker.js:132-135,1574-1716` | ゼロ。ただし `GH_BRANCH='develop'` が凍結済みブランチと同名という**運用リスク**あり(§9) |
| `/api/gemini/*`, `/api/ai-tts`, `/api/ai-name` | Basic Auth(`/api/ai-name`のみ無認証) | AIプロキシ(命名/TTS)、コンテンツ制作の裏方 | `src/worker.js:84-139` | ゼロ |
| Basic Auth 管理者ゲート | 共有パスワード | `/admin/`, `/tools/` 等を保護、ユーザー単位の権限分離なし | `src/worker.js:11-45` | ゼロ(運営側識別のみ) |
| Cloudflare Workers Observability | - | 生アクセスログ(パス/ステータス/レイテンシ)、独自集計DBは無し | `wrangler.toml:32-33`(トップレベルのみ、env.staging/env.staging-appへの再宣言なし) | 粗いインフラ健全性のみ、アプリレベルの意味付けなし |

### 2.3 既存テレメトリ(Umami / Sheets / Observability)

- **Umami**(`https://cloud.umami.is/script.js`, `data-website-id=89d02cb9-6bec-4f30-a21a-65321374dbdc`): 33ゲームディレクトリ中**15個**にのみ埋め込み済み(aquarium/bento/bowling/breakout/bubble/coloring/drawing/egg/message/play-all/puzzle/room/slide/stacking/writing、代表: `aquarium/index.html:401`)。カスタムイベント(`data-umami-event`/`umami.track()`)は**リポジトリ全体で0件**、素のpageviewのみ。**LP(`index.html`)とハブ(`play.html`)、及び maze/quizland/zukan/collection等18ゲームは未計装**。
- **survey.html / ★評価アンケート**: 既に週次KPI運用(Weekly_Summary/Dashboard/Game_DeepDive/Trend_Weekly/Decision_Logの5タブ+AI要約メール、`docs/SURVEY_WEEKLY_CHECKLIST.md:1-40`)が回っている本アプリ最成熟の計測基盤。ただし★評価表示自体が「同ゲーム累積3回プレイ+7日クールダウン+50%抽選」の4ゲートを通過した一部ユーザーのみに表示される生存者バイアス構造(`common/rating-modal.js:787-812`)、survey.htmlは完全オプトイン。
- **Cloudflare Workers Observability**: `[observability] enabled=true` はダッシュボード上の生ログを有効化するのみで独自集計DBではない(`wrangler.toml:32-33`)。`sw.js` はHTML/documentリクエストをinterceptしないためページ遷移は毎回エッジに届く一方、画像/動画/BGM/音声は2026-07-10からcache-first化されており2回目以降はエッジに届かない(`sw.js:483-552`)。
- **PWAインストール計測**: `beforeinstallprompt`/`appinstalled` リスナーはリポジトリ全体で0件、`manifest.json` の `start_url` も `"/"` 固定でクエリ判別不可。
- **SEO**: `robots.txt` は `Sitemap:` 行が未実体化(コメントのみ)、`sitemap.xml` は7URLのみで30以上あるゲームディレクトリの大半が未掲載。

### 2.4 識別モデル(identityModel)

アカウント/ログインは存在しない。個体識別は端末ローカルの匿名識別子に依存する「サイレント識別」モデルである。

- **`pono_anon_sid`**(`common/rating-modal.js:41,78-92`): `sessionStorage` 保存の8文字ランダムID。タブ/セッション単位で使い捨て、複数訪問・複数タブの名寄せ不可。
- **`pono_rating_dfp`**(`common/rating-modal.js:39,94-122`): UA+画面解像度+タイムゾーンのSHA-256先頭12文字、`localStorage` に永続キャッシュ。**計算・保存(`ensureDfp()`、rating-modal.js:788,829,841,853の4箇所)は現在も実行され続けているが、実際にGASへ送信するFormData構築(`postStarToAppsScript()`:236-244、`survey.html`:306-321)のいずれにも `dfp` は含まれておらず未送信**(`getDfpSync()` の呼び出し箇所は0件)。「送信されている」という初期棚卸しの記述は誤りで、監査で訂正済み(§3-2)。
- **`pono_first_visit_at`**(`common/rating-modal.js:40,125-129`): 初回訪問msタイムスタンプ、localStorage永続。
- **プロフィール(name/age/gender)**: `common/cloud-sync.js:18-24,43-63` と `src/api/validate.js:20-77` の二重実装で、SAVE/LOAD双方向・サーバー検証の両方から常時strip。「サーバーに送らない」設計が明示的に貫かれている。
- **合言葉クラウド同期**: `passcode` はHMAC-SHA256でハッシュ化されKVキーになり、生の合言葉やIPはKVに残らない(`src/api/passcode.js:114-132`)。追跡キーとしては機能しない。
- 結論として、氏名・年齢・性別は「送らない」設計が徹底されている一方、**同一端末の継続識別に使える永続識別子は現状存在しない**(dfpは未送信、anonSidはタブ単位)。これが本計画で新設 `pono_client_id` を導入する直接の理由(§5-3)。

---

## 3. 「取れているようで取れていない」罠一覧

| # | 罠 | 実態 | 根拠 |
|---|---|---|---|
| 1 | **`pono_stats`/`pono_achievements`/ログインボーナス系が現在ほぼ書き込み停止中** | `window.PONO_MVP_NO_REWARDS = true` により `incrementStat` は本体処理前に `return 0`。実績40件超・統計30種超という「豊富な定義」から日々蓄積されていると誤解しやすいが、実際に生きているのは `PonoGameStickerGranted`(シール/ガチャ)と `pono-acorns-changed`(どんぐり)のcarve-out分のみ。`checkDailyLogin()` も同様に凍結+現行ハブ`play.html`から未呼出という二重停止 | `common/mvp-flags.js:39-42`、`common/achievements.js:100-109`、`common/stickers.js:97`、`js/game-stickers.js`にMVP分岐0件(rg確認) |
| 2 | **dfp(端末フィンガープリント)は「送信されている」と誤解されやすい死んだ値** | `localStorage`に計算・永続化されているため一見送信されていそうだが、GAS宛FormData構築のいずれにも含まれず未送信。当初の棚卸しレポート(client-data)はこの点で誤りがあり、監査(verification)で訂正済み | `common/rating-modal.js:236-244`, `survey.html:306-321`(fd.appendにdfpなし)、`getDfpSync()`呼び出し0件 |
| 3 | **`anonSid`という名前から永続識別子を連想しがちだが実装はタブ単位の使い捨て** | `sessionStorage`保存のため同一ユーザーの複数訪問・複数タブを名寄せできない。日をまたいだリテンション計測に使うことは原理的に不可能 | `common/rating-modal.js:41,78-92` |
| 4 | **`playDurationSec`は字面上「プレイ時間」に見えるが実際は「評価モーダルが開いてからの経過秒数」** | ゲーム起動からの真のプレイ時間ではない。誤読すると実態と乖離した短い/長いプレイ時間として解釈するリスクが大きい | `common/rating-modal.js:242-245` |
| 5 | **admin/index.htmlの「実績/統計」タブは「全ユーザー横断ダッシュボード」に見えるが、実際は操作者自身の端末データのみ** | そのadminページを開いているブラウザのlocalStorage(`pono_stats`, `pono_stamp_log`)をその場で読んで表示するだけの疑似ダッシュボード | `admin/index.html:9944-9995` |
| 6 | **`/api/savedata`(合言葉クラウド同期)というAPIの存在から「サーバー側にユーザーデータDBがある」と誤解しやすい** | production/LP stagingでは`SAVEDATA_KV`が未バインドで常時503を返す設計であり機能自体が動いていない。App staging限定 | `wrangler.toml:50-52,121-123`、`src/api/savedata.js:134-136` |
| 7 | **Umamiの計装は「サイト全体をカバーしている」ように見えるが実際は33ゲーム中15個のみ** | LP(index.html)とハブ(play.html)、maze/quizland/zukan/collection等の人気ゲーム群を含む18ゲームが計装対象外。導入が場当たり的で全体方針のドキュメント化もされていない | 15ファイルへのUmamiタグ埋込を実測確認、LP/play.htmlは0件 |
| 8 | **LP(index.html)→アプリ(play.html)の転換ファネルは現状計測ゼロ** | LP上の3つのCTA(`#enter-btn`/`.pc-cta`/`#game-modal-cta`)は全て計測コードなしの静的`<a>`。閲覧→CTAクリック→ゲーム起動→app_onlyタイルタップ→アップグレード遷移という課金ファネルの各段が1つも記録されない | `index.html:1948,2046,2286`、`play.html:11767-11789,15082-15179` |
| 9 | **`admin/index.html`のGitHubコミット先ブランチ`GH_BRANCH='develop'`が凍結済みブランチと同名**(監査missed項目) | CLAUDE.md記載の「developは2026-07-10凍結・push禁止」ブランチと同名であり、`rewards.json`/`creatures.json`/room/quizland等のコンテンツ編集が実際にこの凍結ブランチへコミットされ続けている疑いがある。本計画の主題(データ分析)そのものではないが、どんぐりショップ/ガチャの品揃え(rewards.json由来)データと連動するため運用リスクとして申し送る | `admin/index.html:1656,1692,1712,1789,2208` |
| 10 | **`[observability] enabled=true`を見て「本番もstagingも自動でログが取れている」と思いがちだが継承有無が未確認** | 宣言はトップレベル(production)の1箇所のみで、`env.staging`/`env.staging-app`側の継承有無はwrangler.tomlの記述だけでは断定できない(`[assets]`が同プロジェクトのコメントで明示的に非継承とされている前例から類推される懸念) | `wrangler.toml:32-33,71-72,95-98` |

---

## 4. 現状データ → マーケ活用マップ

凡例: **○今すぐ使える**(サーバー側で構造化データとして取得済み) / **△条件付き**(取得範囲限定・バイアスあり・実装追加要) / **×使えない**(クライアント完結、フック自体が存在しない)

| ユースケース | 使えるデータ源(根拠) | 判定 | 理由・条件 |
|---|---|---|---|
| **リテンション分析**(継続率・DAU) | `pono_login_days`/`pono_login_streak`(`common/stickers.js:78-236`)、`PonoDailyQuestCleared`(`js/daily-quest.js:93-151`) | **×** | 全てクライアント`localStorage`のみでサーバー送信経路が無い。加えて罠#1によりほぼ更新停止中 |
| **人気コンテンツ特定**(訪問数) | Umami pageview(15/33ゲーム) | **△** | 導入済み15ゲームは今日から見られるが、LP・play.html・残り18ゲームは比較不能。カスタムイベント0件で「訪問」以上の粒度なし |
| **人気コンテンツ特定**(自己申告) | `survey.html`の`favoriteGames`項目→Sheets、K1-K12運用 | **△** | サーバー到達済みで週次集計運用済みだが、オプトイン回答者のみでN数閾値(≥80)未達だと判定不能 |
| **エンゲージメント深度**(プレイ時間) | `playDurationSec`(`common/rating-modal.js:242-245`) | **△** | 実態は「評価モーダルが開いてからの経過秒数」(罠#4)。表示自体が4ゲート通過者のみ |
| **エンゲージメント深度**(到達度・クリア深度) | `pono_game_stickers_v1`のfirstAt/lastAt、`pono_stats`/`pono_achievements` | **×** | クライアントのみ。加えて`pono_stats`/`pono_achievements`は罠#1で書込停止中 |
| **LP→アプリ転換** | index.htmlの3CTA、`startGame()`/`openAppZonePromo()` | **×** | 3CTAとも計測コードなしの静的`<a>`(罠#8)。UmamiもLP/play.html未導入 |
| **報酬経済の健全性**(どんぐり・ガチャ) | `pono_acorns`系、`PonoDonguriShopPurchased`、購入履歴 | **×** | acornsはクライアント側で日々生成されているがサーバーへ未送信。`/api/savedata`経由で覗けるがproduction/LP stagingでは503(罠#6) |
| **アンケート/評価**(満足度・価格受容性) | ★評価モーダル+survey.html→GAS→Sheets、K1-K12運用 | **○** | 唯一サーバー側に構造化データとして到達し週次運用が稼働中。ただしfire-and-forget送信で取りこぼし率不明、★評価は生存者バイアス、survey.htmlは完全オプトイン |
| **年齢・性別プロファイル分布** | `pono_player_profile_v1`(age/gender)、survey.htmlの年齢帯 | **△** | プロフィール本体はcloud-sync.jsで意図的にstripされ未送信。今すぐ使えるのはsurvey.html回答者の自己申告年齢帯のみ(オプトインバイアス) |
| **絵本購入(book tier)コンバージョン** | `pono_premium`/`pono_book_unlock_method`/`pono_book_unlock_at` | **×** | クライアントのみ保存、サーバー未送信、判定もクライアント完結(サーバー検証なし) |
| **PWAインストール率** | なし | **×** | `beforeinstallprompt`/`appinstalled`が0件、フック自体が存在しない |
| **SEO/オーガニック流入** | robots.txt、sitemap.xml | **×** | sitemapは7URLのみ、robotsからの自動発見経路も欠落 |

**現状の構造的限界(要点)**: ほぼ全指標がクライアント`localStorage`に閉じている / UU数が把握不可能(永続識別子が実質存在しない) / 計測導入にムラがある / 主要進捗指標がMVPフラグで実質凍結中 / サーバー到達データにも生存者バイアス・オプトインバイアスが強い / fire-and-forget送信で送達率不明 / 唯一の定性データ基盤(Sheets)が本リポジトリ管理外。**ゼロ実装で今日から得られるもの**は (a) Cloudflare Observabilityの生ログ、(b) Umamiの15ゲームpageview、(c) 既存Sheets週次KPI運用の3つに限られる。

---

## 5. 追加取得データ設計

### 5-0. パイプライン使い分けの原則(オーケストレーター確定方針)

イベントの性質で計測基盤を使い分ける。**個人継続性が不要な単純UIタップ計測は Umami**、**tier/client_id等アプリ固有ディメンションとの結合が必要、または日をまたいだ継続性(リテンション/ファネル)を見る必要があるイベントは新設 `POST /api/e` → WAE パイプライン**とする。既存の GAS(Google Apps Script)パイプラインは ★評価/`survey.html` の**現行フローとしてのみ**維持し、新規イベントの主経路にはしない(元分析の一部ドラフトに「GASパイプライン」という表記が残っているが、本書では architecture 分析の `/api/e` + WAE 案に統一して読み替えている。矛盾があった箇所は下記表で訂正済み)。

| 判断基準 | 採用パイプライン |
|---|---|
| tier/client_id/acorn残高等との結合が必要、または日をまたいだ継続性(リテンション/ファネル)が必要 | 新設 `POST /api/e` → WAE (§6) |
| 単純な「どのUIが何回叩かれたか」の集計で足り、個人の継続性を追う必要がない | Umamiの`data-umami-event`属性(コード不要、HTML属性1行) |
| ★評価/アンケートの**既存**GASフローへの項目追加(client_id同梱化等) | 既存GASパイプライン(現状維持) |

### 5-1. P0イベント(最初に実装する8個)

全イベント共通プロパティ(Umami計測の#3を除く): `client_id`(§5-3) / `session_id` / `ts`(ms epoch) / `tier`(free\|book\|app、`common/tier.js:124-145 getTier()`) / `environment`(prod\|staging) / `sw_version` / `platform`(§7-2、`__NATIVE_BUILD__`由来)。

| # | イベント名 | 固有プロパティ | 発火箇所 | パイプライン | 答えられる問い |
|---|---|---|---|---|---|
| 1 | `session_start` | `platform`(pwa\|browser、`matchMedia('(display-mode: standalone)')`) | 新規: play.html起動時、DOMContentLoaded直後 | `/api/e`(WAE) | DAU/WAU、起動頻度、tier別内訳 |
| 2 | `game_launch` | `game_id`, `zone`(playable\|app_only\|coming_soon) | `play.html:11767-11789` `startGame(idx)` 内、`location.href=game.href` 直前 | `/api/e`(WAE) | ゲーム別起動数=人気ランキング、tier別起動率 |
| 3 | `game_title_tap` | (共通プロパティなし。UmamiはSaaS側でURL単位に集計するため) | `maze/index.html:14866`(#title-screen)、`quizland/index.html:9095`、`oto/index.html:15360`、`bento/index.html:24693`、`puzzle/main.js:8152`相当 | **Umami**(`data-umami-event="game_title_tap"`) | `game_launch`との差分で「起動したがロード待ちで離脱した率」(集計レベル) |
| 4 | `game_clear` | `game_id`, `clear_event`(clear\|stage_clear\|perfect\|complete) | `js/game-stickers.js:229-233` `PonoGameStickerGranted`を新設購読モジュールが購読(grant()自体の改修は不要) | `/api/e`(WAE) | ゲーム別完了率、到達深度 |
| 5 | `paywall_hit` | `game_id`, `tier`(free\|book) | `play.html:15082` `openAppZonePromo()`呼び出し直後 | `/api/e`(WAE) | アプリ限定ゾーンへの興味の強さ |
| 6 | `upgrade_cta_click` | `game_id`, `tier` | `play.html`の`openAppZonePromo()`内、`dataset.action==='goapp'`クリックハンドラ(:15082-15179付近) | `/api/e`(WAE) | paywall_hit→クリックのCVR |
| 7 | `daily_return` | `date_jst`(YYYY-MM-DD) | 新規: 当日最初の`session_start`をJST日付でdedup(`js/daily-quest.js`の`todayKeyJST`:25-28を流用) | `/api/e`(WAE) | 継続率・リテンションカーブ(D1/D7/D30相当) |
| 8 | `acorn_earned` | `game_id`(reasonから抽出), `delta`, `reached_daily_cap`(bool) | `common/acorns.js`の`add()`内、`dispatchEvent('pono-acorns-changed')`直後を#4と同一購読モジュールが拾う | `/api/e`(WAE) | エンゲージメント経済の温度感、日次上限への張り付き率 |

この8個で「どのゲームが人気か」「どこで離脱しているか」「継続して遊ばれているか」「課金導線への興味度」の最重要4問に答えられる。実装コストは「ゲーム側のビジネスロジック改修は不要、ただし発火ページごとに購読モジュールの`<script>`タグ1行が要る」点に注意(CustomEventは同一ドキュメント内でしか届かず、`startGame()`はフルページ遷移のため)。P0で実際に触るファイルは `play.html` + `maze/quizland/oto/bento/puzzle(main.js)` の計6本(うち maze/quizland/oto はUmamiタグ自体も新規導入が必要)。`acorn_earned`の`delta`/`after`残高は丸め処理を行わない(仮想ポイントで小さい整数のため丸めが機能せず、他イベントにも同様の変換を課していない)。

### 5-2. P1 / P2 概要

**P1(P0の反応を見て2巡目、5〜7個目安)**

| イベント名 | 固有プロパティ | 発火箇所 | パイプライン | 答えられる問い |
|---|---|---|---|---|
| `donguri_shop_purchase` | `game_id`, `sticker_id`, `cost_acorns` | `js/donguri-shop.js:456-500`、`PonoDonguriShopPurchased`購読 | `/api/e`(WAE、tier結合が必要なため) | 疑似課金の人気対象、ローテーション施策の効果 |
| `rating_submitted` | `game_id`, `star_score`(1-5) | `common/rating-modal.js:215-255` `postStarToAppsScript`成功パスに相乗り | **既存GAS**(client_id/session_id同梱化のみ追加)⚠️A-4 | ゲーム別満足度スコア |
| `survey_submitted` | `game_id`, `star_score`(自由記述等は既存フローのまま) | `survey.html:305-328` | **既存GAS**(同上)⚠️A-4 | 年齢帯・価格受容感・つまずき(既存運用の拡張) |
| `book_bonus_claimed` | `sticker_count` | `js/game-stickers.js:680-746` `grantBookBonus`、`pono-game-sticker-bonus-granted`購読 | `/api/e`(WAE、tier結合が必要) | 絵本購入者が実際にWeb特典を受け取ったか |
| `lp_cta_click` | `cta_id`(hero\|pc_cta\|modal) | `index.html:1948,2046,2286`の3箇所 | **Umami**(`data-umami-event="lp_cta_click"`+`data-umami-event-cta_id`。index.html自体にUmamiタグ新規導入が必要) | LP→アプリのファネル、CTA別転換率比較 |
| `lp_feature_card_tap` | `game_id` | `index.html:2480-2496` `bindCards`が処理する要素 | **Umami**(同上属性方式) | LP内アトリビューション |
| `sticker_museum_enter` | `game_id`, `first_ever`(bool) | `Prototypes/StickerBookThreeJS/main.js:10922` `startCoverOpen` | `/api/e`(WAE、client_id結合が必要) | 報酬受け取り後にミュージアムを開いたか=エンゲージメントの深さ |

> ⚠️ **A-4(第10章)**: `survey.html`の任意メール欄と同一GASエンドポイントに`client_id`が同梱されると再識別リスク。GASパイプライン分離(推奨)か開示強化かをオーナー判断の上で実装すること。**P1実装前の必須確認事項**(詳細は§10-1 A-4/§10-5)。

**P2(需要が明確になってから、または再設計コストが高いもの)**

| イベント名 | 理由 |
|---|---|
| `zukan_discovery`(`zukan/index.html markZukanCollected`) | `comingSoon:true`で未リリース、優先度低 |
| `nazonazo_stage_clear`/`nazonazo_ending`(`nazonazo-tunnel/js/game.js:3723-3781`) | 共通報酬バス`PonoGameStickerGranted`に未接続。個別instrumentation必要でコスト高 |
| `app_session_abandon`(離脱/中断) | `visibilitychange`/`beforeunload`系リスナーは全てBGM停止・SW更新用途でゼロから実装要。誤爆リスクもあり後回し |
| `pwa_install`(`beforeinstallprompt`/`appinstalled`) | リスナー0件で新規実装、優先度中 |
| `adaptive_difficulty_event`(`monster-math/engine.js` missStreak等) | 難易度自動調整の効き目測定は分析設計が複雑、後回し |

### 5-3. 匿名ID設計

**新設: `pono_client_id`(端末永続・匿名)**
- 生成: 初回起動時に `crypto.randomUUID()` で自動生成(ユーザー入力なし)。共有モジュール `common/device-id.js` に切り出し、`common/telemetry.js` から参照する(index.htmlは`rating-modal.js`を読み込んでいないため、telemetry.js単独でIDを扱える必要がある)。
- 保存: `localStorage`、氏名・年齢・性別(`pono_player_profile_v1`等)とは物理的に別キーで管理し、送信ペイロードにもプロフィール情報を同梱しない(`common/cloud-sync.js:18-24`の「名前系4キーを常にstripする」設計思想をテレメトリにも横展開)。
- 既存の`pono_rating_dfp`(端末フィンガープリント)は転用せず、`client_id`に一本化する。フィンガープリント方式は再現性ゆえ「個人に関連しうる識別子」と整理されるリスクがあり、真にランダムでリセット可能な`client_id`の方がプライバシー特性が良いため(§5-4のCOPPA整理とも整合)。**将来dfpを完全撤去する場合、`ensureDfp()`の4呼び出し箇所(`common/rating-modal.js:788,829,841,853`)も合わせて削除する必要がある**。

**新設: `pono_telemetry_sid`(セッション単位・匿名)**
- 生成: タブロード時、`sessionStorage`に既存IDが無ければ新規ランダムID発行(同一タブ内のページ遷移——play.html→各ゲームページ等——では既存IDを再利用)。タブクローズ、または30分無操作でセッション終了とみなす。
- 既存`pono_anon_sid`(rating-modal.js専用、フィードバック重複送信抑止用)とは責務を分離して新設する(用途混在を避けるため)。

**ローテーション**: `client_id`はデフォルト永続。合言葉クラウド同期(`/api/savedata`)の発行・読込では変更しない。保護者操作による明示リセットボタンを、既存の設定モーダル「データかんり(保護者の方へ)」(`play.html:9712-9719` `settingsDataManageBtn`)配下に追加する(新規ポップアップは増やさない)。

**オプトアウト**: 同モーダルにトグル「あそびの記録を送らない」を追加。ONで`localStorage['pono_telemetry_opt_out']='1'`を立て、全送信関数の先頭で早期return(`window.PONO_MVP_NO_REWARDS`ガードと同一パターン)。**初期状態はOFF、すなわちテレメトリ収集はデフォルトで有効(default-on)**。

**default-onという判断の理由**: P0イベント8個が実現する最重要4問(§5-1)は、一定数のユーザーがdefault-onで参加しない限り統計的に意味のあるサンプルサイズに到達しない。survey.htmlの自己申告アンケート(既存)がまさにopt-inで、回答者バイアス・低いN数(K1-K12のN≥80閾値)に悩まされている実例が既にあり、同じ轍を踏まないためdefault-onを維持する。その代替として「目立つ告知」要件(§5-4)を満たすため初回起動時の非ブロッキング告知バナーを新設する。

### 5-4. 法的根拠と告知(COPPA「内部運用支援」例外)

「匿名でランダムなclient_id」であることは、それだけでCOPPA上「個人情報でない」ことを意味しない。COPPA(16 CFR 312.2 item 7)は実名の有無に関わらず「時間を超えてユーザーを認識できる永続識別子」を個人情報として扱う。本設計がこの収集を検証済み保護者同意なしに適法に行う根拠は、「内部運用のサポート(support for internal operations)」例外(16 CFR 312.5(c)(7))であり、以下の3条件を**すべて**満たすことをハードな制約としてコミットする(いずれも要確認: 最新のCOPPA Rule/FTC guidanceを参照。EU居住児童向けGDPR-K等は範囲外)。

1. **識別子を他の目的に転用しない**: `client_id`/`session_id`は本計画に列挙されたイベント計測以外(行動ターゲティング広告、子供本人への直接連絡、識別子に基づく差別的取り扱い等)には一切使用しない。
2. **第三者への開示を行わない**: `client_id`/`session_id`および紐づくイベントデータは運営者自身が管理するパイプラインの外には開示しない。当該パイプラインの識別子が到達するインフラ提供者は **Cloudflare(WAE/D1)と Google(Apps Script / Sheets — ★評価・アンケートの既存フロー、P1で`client_id`同梱化)** の2社であり、いずれも「サービスプロバイダーへの処理委託」として扱う。Umami(SaaS)には`client_id`/`session_id`等の永続識別子を一切渡さない(渡すのは`data-umami-event`のraw属性値のみ)。
3. **この慣行をプライバシーポリシーに明記する**: 永続識別子の種類・内部運用目的の範囲内でのみ利用する旨・**Cloudflare および Google(Apps Script / Sheets)** 等のインフラ提供者が当該識別子を扱う場合はその開示、をプライバシーポリシー文書(未整備なら本計画の実装と同時に新設)に明記する。**収集開始前の必須ゲート**として扱う(Phase 1完了条件、§8)。

**設計注記(識別子の外部到達の最小化)**: 識別子の外部到達を最小化したい場合は、GAS側には`client_id`を送らず`session_id`のみ(または既存`anonSid`のまま)とする代替案があり、採否はPhase 1実装レビューで最終決定する。

**初回起動時の告知バナー**: 初回`session_start`発火時、画面下部に1回だけ非ブロッキングの小さいバナーを表示: 「あそびかたの記録を、名前と結びつけない符号だけで記録しています。[くわしく]」+閉じるボタン(「わかった」)。表示は`localStorage['pono_telemetry_notice_shown']`で1回のみに制限。「くわしく」タップで`help.html`の該当セクションへ遷移。

**保護者向け説明文言案(そのまま収録)**:
> 「ポノのあそびばは、お子さまがどのゲームをどれくらい遊んだか(例: 『めいろで3回あそんだ』)を、名前や生まれた日と結びつけない、ランダムな符号だけを使って記録しています。この符号は、あそび方に合わせてより楽しく遊べるようにする目的だけに使われ、お子さまを特定するためや広告のためには使いません。記録用の符号はいつでもリセットしたり、記録の送信自体をやめたりできます。詳しくは『⚙ 設定 → データかんり』からご確認・変更いただけます。」

### 5-5. 集めない things リスト(明示的な非収集宣言)

- 氏名、生年月日、住所、電話番号(`pono_player_profile_v1`のname/age/genderは現行どおりサーバーに送らない。既存denylist設計を踏襲)
- メールアドレス(survey.htmlの任意メール欄は既存運用のまま維持するが、新設のP0/P1イベントには一切含めない)
- 正確な位置情報(GPS/ジオロケーションAPI、そもそも未使用)
- 端末の永続ハードウェア識別子(IDFA/AAID/MACアドレス/IMEI等の広告ID・端末ID)
- デバイスフィンガープリンティングの新規拡張(既存dfpはこれ以上強化せず`client_id`に一本化)
- 生のIPアドレス(既存の`src/api/ratelimit.js`のSHA-256ハッシュ化のみ継続)
- 音声入力・カメラ入力の内容そのもの(マイク/カメラ機能はそもそも存在しない)
- 子供が作成したコンテンツ本体(`pono_drawings`のお絵かきdataURL等)を無断でサーバー送信すること(「保存枚数」等の集計値のみ将来検討可)
- 第三者広告SDK・トラッキングピクセル・リターゲティングタグ
- クロスサイト/クロスアプリの行動横断トラッキング
- プロフィールの実年齢・性別と行動ログの直接結合(必要な場合も「年齢帯」等の粗い区分に丸める)
- 星評価・アンケートの自由記述と行動ログの機械的な個人特定用途への転用
- **`client_id`/`session_id`を用いた行動ターゲティング広告、および子供本人への直接連絡**(§5-4のCOPPA例外を成立させる前提条件そのもの)
- **Umami(SaaS)への`client_id`/`session_id`/`tier`等アプリ固有識別子の送信**(渡すのは非識別的な分類ラベルのみ)

---

## 6. 分析基盤アーキテクチャ

> **識別子名の統一についての注記**: architecture分析の当初ドラフトは既存`dfp`(未送信)を`did`として`/api/e`ペイロードに新規採用する案だったが、確定設計(§5-3)は新規生成の`pono_client_id`(`crypto.randomUUID`)を採用する。以下の設計は`did`/`dfp`という語をすべて`client_id`に読み替えて記載する(技術的な論点——sidがクロスデイ集計に使えない、WAEのCOUNT DISTINCTのサンプリング補正手法が無い、等——はそのまま有効)。

### 6-1. 技術選定比較

| 軸 | Workers Analytics Engine (WAE) | D1 | KV | 外部SaaS (CF Web Analytics / Plausible) |
|---|---|---|---|---|
| 書込方式・レート | `env.BINDING.writeDataPoint({blobs,doubles,indexes})`。非ブロッキング。1 invocationあたり**最大250 data points**、1データポイントのblob合計**16KB上限** | Worker内prepared statementで同期書込み。シングルライター特性、安全な書込QPS目安は**要確認** | 既存`BENTO_MASK_CONFIG`/`SAVEDATA_KV`と同じ運用実績。同一キー高頻度書込みは苦手 | 自前実装ゼロ |
| SQL API | **Worker bindingから直接SELECT不可**。読み出しは別途Cloudflare REST API(`/accounts/{id}/analytics_engine/sql`)をAPIトークン付きHTTPで叩く | Worker bindingから通常のSQL(JOIN/GROUP BY/INDEX)が直接叩ける | なし(GROUP BY不可) | Web Analyticsはダッシュボード閲覧のみ |
| 制約 | blob最大20本・1データポイント合計16KB上限、double最大20本、index(サンプリング主キー)1本/呼び出し最大96バイト(公式ドキュメント確認済み) | スキーマ自由 | 1キー最大サイズ目安25MB(要確認) | N/A |
| 保持期間 | **生データ保持は3ヶ月固定**(公式ドキュメント原文確認済み) | 自分でTTL/削除ポリシーを設計しない限り無期限 | `expirationTtl`で自由設定 | ベンダー依存 |
| Sampling | 書込量が多いと自動間引き(adaptive sampling)、結果に`_sample_interval`列。count系集計は`SUM(_sample_interval)`で補正可能だが、**`COUNT(DISTINCT ...)`にはサンプリング補正の公式手法が存在しない**(要確認のまま) | なし(全件保持) | なし | ベンダー仕様次第 |
| 無料枠・コスト | **Workers Freeプランでも利用可能**。無料枠は1日10万 data points書込/1日1万 read query。Paidだと月1000万書込+月100万読取、超過は書込$0.25/百万・読取$1.00/百万(公式ドキュメント確認済み) | Freeプランでも一定の無料枠あり(現行値は要確認) | 既存プロジェクトで運用中 | Web Analyticsは無料。Plausibleは月額課金 |
| 実装工数 | 小(binding追加+`writeDataPoint`数行) | 中(スキーマ設計+migration) | 最小 | 最小だがカスタムイベント対応薄い |

**推奨**: WAEを生イベントのランディングゾーンとして採用し、cron Workerが日次でD1へロールアップする。D1は`admin/`の可視化ソースとして採用。**ユニーク系KPI(UU/リテンション)はWAEのCOUNT DISTINCTに頼らず、D1に生のclient_id×dateレコードを保持する自前設計にする**(6-3参照)。想定イベント量(全ゲーム合計でも1日数千〜数万件程度と推定)なら無料枠内に収まる可能性が高く、Phase1/2でPaidプラン契約を前提条件にする必要はない。

### 6-2. 収集エンドポイント設計

**エンドポイント**: `POST /api/e` を`src/worker.js`のルーティングに追加し、`src/api/events.js`を新設。GETは提供しない(§7-1の「必ずPOST」要件と共通)。

**クライアント送信**: 主経路は `fetch(url, {method:'POST', keepalive:true, ...})`。`navigator.sendBeacon`はページ離脱直前の最終フラッシュ用の補助経路として`text/plain` Blob形式・小サイズ限定で併用する(cross-origin+JSON送信でのpreflight未対応という既知の落とし穴があるため主経路にしない、§7-1参照)。

**ペイロード設計**:
```
{
  t: 'game_clear'|'game_launch'|'paywall_hit'|...,
  g: gameId(省略可),
  e: サブイベント,
  tier: 'free'|'book'|'app',
  sid: session_id,      // sessionStorage 由来、タブ/セッション単位
  cid: client_id,       // localStorage 永続、crypto.randomUUID (§5-3)
  platform: '__NATIVE_BUILD__由来(§7-2)',
  v, env
}
```

**識別子の役割分離**: `session_id`は同一訪問内のファネル計測(LP→play.html→タイトルタップ→クリア)専用であり、日をまたいだ一意性指標(週間/月間アクティブ端末数、リテンション、コホート)には原理的に使用できない。**クロスデイ集計は必ず`client_id`を使う**。両者を同じKPIカードやテーブルで混在させないことをUIレビュー時のチェック項目とする(6-4参照)。

**ペイロード最小化・PII除外**: タイムスタンプはサーバーの`Date.now()`を正とする。氏名・年齢・性別・emailはallowlist方式で受理しない(`cloud-sync.js`のCLOUD_PROFILE_STRIPおよび`src/api/validate.js`のdenylistと同じ多層防御思想)。bot/自分たち除外は`internal=1`フラグ・env判定・UA判定・`window.__PONO_DISABLE_TELEMETRY__`・`src/api/ratelimit.js`のIPハッシュ化パターンを再利用。

**sw.jsとの関係**: `sw.js`の`if (event.request.method !== 'GET') return;`(`sw.js:451`相当、全パスに無条件適用)により、POSTリクエストはこれだけで既にService Workerのfetchハンドラを素通りする。パスベースbypass(`/admin/`, `/tools/`, `/api/gh/`, `/api/gemini/`等の個別パス列挙、`sw.js:454-462`)には汎用的な`/api/`プレフィックスマッチは存在しないため、`/api/e`が素通りする根拠は**非GETバイパスのみ**である。将来`/api/e`にGET variantを新設する場合、このbypass listに自動的には含まれないため個別追記が必要。レスポンスは`ctx.waitUntil()`でWAE書込みを非同期化し、204 No Contentを即返す。

**オフラインキュー/バッチ設計**: `common/telemetry.js`にIndexedDB write-aheadキューを実装し、共通モジュールとしてネイティブとも共有する。設計の詳細(バッチサイズ上限・チャンク分割・フラッシュトリガ)は§7-1に集約して記載する(Web版から同じ制約——`fetch keepalive`のChromium系約64KiB上限——が適用されるため)。

### 6-3. 集計層設計(cron Worker → D1)

**cron定義**: Cloudflare公式ドキュメント確認により、`[triggers]`は`vars`/`kv_namespaces`等のbindings系とは異なり**inheritableキー**であり、トップレベルの`[triggers]`は`env.staging`/`env.staging-app`へ自動継承される。放置すると`--env staging-app`と`--env staging`がそれぞれ同じcronスケジュールを別Worker名に登録し、集計が3重に走る事故になる。

```toml
# --- production (トップレベル) ---
[triggers]
crons = ["0 18 * * *"]  # UTC18:00 = JST翌03:00

# --- env.staging (LP staging) ---
[env.staging.triggers]
crons = []  # production の継承を明示的に上書きして無効化

# --- env.staging-app (App staging) ---
[env.staging-app.triggers]
crons = []  # 同上。App staging は手動トリガー POST /api/admin/rollup-run のみで確認
```

過去に`crons=[]`が継承を打ち消せなかったバグ(`cloudflare/workers-sdk#5450`)はresolved済みだが、**デプロイ後に必ずCloudflare dashboardのTriggersタブで`pono-asobiba-staging`/`pono-asobiba-app-staging`側にcronが0件であることを目視確認する**手順をPhase2の受け入れ条件に追加する(このプロジェクトの`wrangler.toml`コメントは`[assets]`/`[observability]`を非継承と明記しており、公式ドキュメントの一般論と食い違う実例が既にあるため、ドキュメントを鵜呑みにせず目視確認を省略しない)。

**scheduledハンドラ処理**:
1. 対象日を「昨日(JST)」+「一昨日」の2日分再集計(遅延書込みのカバー)。
2. Analytics Engine SQL APIへ`Authorization: Bearer <CF_ANALYTICS_API_TOKEN>`でPOSTし、`game_id, event, tier, env`単位で集計。**`COUNT(*)`ではなく`SUM(_sample_interval)`を使用**してサンプリングによる過小カウントを補正する。
3. **ユニーク系(UU/リテンション)はWAEのSQLに頼らない**: `COUNT(DISTINCT client_id)`にはサンプリング補正の公式手法が存在しないため、WAEから「その日に観測された`client_id`の一覧」を取得し、D1側に新設する`active_devices_daily(date, client_id, tier, env)`テーブルへ`INSERT OR IGNORE`で書き込む。D1側では常に厳密なdistinct行(同一client_idが同日に何度書かれても1行)となり、サンプリング補正問題そのものを回避できる(ただしWAE側のサンプリングで生ログが最初から欠落した場合はこの限りではない、要確認)。この`(date, client_id)`を自己結合すれば「前日も遊んで今日も遊んだclient_idの数」というリテンション/WAUが直接計算できる。
4. 通常のカウント系ロールアップは`daily_rollup(date, game_id, event, tier, env, cnt, uniq_client_id)`へ`INSERT OR REPLACE`(冪等設計)。
5. 失敗時は`console.error`に記録し次回cronのリトライに任せる。

**シークレット/DB分離**: `CF_ANALYTICS_API_TOKEN`は「Account Analytics: Read」限定、production/staging-appでD1を別々に作成。

### 6-4. 可視化: admin/分析タブ

既存`admin/index.html`のタブ機構(`.tabs`/`panel-*`/`switchTab()`、`admin/index.html:471-489,1757`)に新規「📈 分析」タブを追加(既存の「📊 統計/状態」タブは操作者自身のlocalStorage表示のまま現状維持)。`env.ADMIN_PASSWORD`によるBasic Authで保護。

**画面構成**:
- 上段: 日付レンジピッカー(既定 直近7日/30日)+ env切替(production既定、staging-app確認用に切替可)
- KPIカード列: 「週間アクティブ端末数」→ **`client_id`ベースの実数**として表示し、「ブラウザ/端末の粗い識別子であり厳密な物理端末数ではない」旨のツールチップを添える。ゲーム起動数合計/アップグレードCTAクリック数(`upgrade_cta_click`)/paywall到達数/ガチャ・ショップ購入回数/★評価平均。
- **画面設計上の鉄則**: `session_id`由来の数値は**同一訪問内のファネルにのみ**使用可。日次/週次アクティブ端末数・リテンション曲線・コホート分析には**必ず`client_id`を使う**。この2つの識別子を同じKPIカードやテーブルの中で混在させない。
- ゲーム別テーブル: `gameId × 起動数 × クリア数 × クリア率 × 平均★評価`(既存rating-modal.jsデータとの突合)
- ファネルビュー: `/api/e`系イベントのみで構成できる段に限定した2本を描画する — (i) `session_start`→`game_launch`→`game_clear`、(ii) `paywall_hit`→`upgrade_cta_click`(いずれも`session_id`で正しく結合可能)。`lp_cta_click`と`game_title_tap`はUmamiパイプラインに割り当てられており(§5-1/§5-2)、Umamiイベントは`client_id`/`session_id`を一切持たず(§5-5の非収集宣言と整合)データもUmami SaaS側にあってWAE/D1に流入しないため、adminのファネルには組み込めない。LP CTAクリック率・タイトルタップ率はUmami側ダッシュボードで集計レベルの近似として別途確認する運用とする。**パイプライン混在により、エンドツーエンド(LP→クリア)の単一ファネルは描けないという設計上の限界がある。**
- 課金導線パネル: `openAppZonePromo()`表示回数→「アプリへ進む」クリック回数
- リテンション/コホートビュー: `active_devices_daily`テーブルを自己結合した「N日後継続率」曲線(`client_id`ベースでのみ意味を持つ)
- CSVエクスポート: D1該当rollupをブラウザ側Blobダウンロード

### 6-5. 環境分離(staging-app先行導入)

1. **実装**: `develop-app`ブランチでPhase1コード(`src/worker.js`/`src/api/events.js`/`common/telemetry.js`/`common/device-id.js`/`wrangler.toml`へのWAE binding追加)を実装。`env.staging-app`側にも明示的にWAE binding(`[[env.staging-app.analytics_engine_datasets]]`)を追加する(このプロジェクトの`[env.XXX]`のbindings系は非継承パターンに従う。ただし`[triggers]`はbindingsではなくinheritableキーのため同じ理屈は通用しない、明示的な空配列上書きが必須)。
2. **push**: `develop-app`へのpushでApp staging・LP stagingの両方が同一コミットで自動デプロイされる。WAE bindingを`env.staging-app`にのみ追加する場合、LP staging側では`env.ANALYTICS`(binding名)の存在チェックでガードし黙ってno-opにする。
3. **検証**: App stagingで実機/Playwright確認。`/api/e`にイベントが届くか、sw.jsのbypassが機能しているか、`client_id`が正しく送信されているか(空文字でないか)、Basic Auth利用者のイベントが除外されているかを確認。Cloudflare dashboardのTriggersタブで両stagingにcronが登録されていない(0件)ことを確認。
4. **Phase2も同様に先行導入**: cron/D1/admin可視化をdevelop-appでstaging-app先行実装→確認。cronはproduction一本化方針のため、staging-appでは手動トリガーエンドポイント(`POST /api/admin/rollup-run`)で動作確認。D1データベースはstaging-app用を別途作成。
5. **本番反映**: 十分な検証後、ユーザーの明示指示を得てから`master`への明示マージ。
6. **本番用リソースの新規発行**: production用のWAE dataset/D1データベース/`CF_ANALYTICS_API_TOKEN`はstaging用と共有せず別途新規作成・登録。
7. **既知の留意点**: webapp本番(`pono-asobiba-app.ndw.workers.dev`)は現在`error 1042`による404が再発中(本計画とは無関係の既知課題、Phase 3のnative実機検証の前提ブロッカー)。
8. **運用サイクル**: Umami/サーベイ運用とD1ロールアップの定量指標を週次で突き合わせるレビューサイクルを設ける。

---

## 7. ネイティブアプリ対応

Capacitor native shell(Android のみ scaffold 済み、iOS 未着手)は `server.url` を持たないローカル bundle 方式で、WebView origin は既定値の `https://localhost`(Android)。`native/scripts/stage-www.mjs:53-55` が各HTMLの`<head>`直後に `window.__APP_BUILD__=1; window.__NATIVE_BUILD__=1; window.PONO_API_BASE='https://pono-asobiba-app.ndw.workers.dev';` をビルド時注入しており、この`PONO_API_BASE`の有無が「相対パスfetchがローカルbundle内で完結するか、絶対URLで本番Workerに到達させる必要があるか」を分岐させる唯一の仕組み。

### 7-1. 技術要件

**絶対URL化**: 既存パターン `common/cloud-sync.js:34-38`(`API_BASE = (window.PONO_API_BASE || '') + '/api/savedata'`)を`/api/e`にも流用する(新規グローバル変数`PONO_ANALYTICS_BASE`は増やさず`PONO_API_BASE`を再利用)。**ただし`PONO_API_BASE`は現状production Workerにハードコード固定**(`stage-www.mjs:55`)であり、staging切替口が無いため、分析エンドポイントをstaging-app実機ビルドで検証したい場合はこの1行のビルド時テンプレート化(環境変数/CLIフラグでproduction/staging-appを選択)が前提になる。

**CORS**: `mode:'no-cors'`は応答が読めず再送制御に使えないため、`/api/e`は**通常CORS + `keepalive:true`を推奨**。CORS実装は`src/api/savedata.js:39-60`の`allowedOrigins(env)`関数がそのまま転用できる(`https://localhost`と`capacitor://localhost`は既にallowlist済み)。同一Workerに相乗りさせ、この関数を共有する(実装が2箇所に分岐するとallowlist同期漏れのリスク)。

**Capacitorのorigin**: Android=`https://localhost`(`native/capacitor.config.json:1-5`にserver/androidScheme上書きなし)。iOS=`capacitor://localhost`(未scaffold、`src/api/savedata.js:39-60`のコメントが先回り追加済みだが到達性は**要確認**)。

**オフライン時のイベントキューと再送**: `localStorage`は容量制限が厳しいため**IndexedDB**を推奨(write-ahead queue)。共通モジュール(`common/telemetry.js`)としてweb/native共通化必須。フラッシュトリガ: (a)ページロード時、(b)`online`イベント、(c)一定間隔タイマー(例30秒)、(d)`visibilitychange`で`hidden`→`visible`。接続状態検知は`native/package.json`に`@capacitor/network`が未導入のため`navigator.onLine`に頼るしかない(より正確な検知が要件なら追加導入が必要、スコープ判断事項)。キューの上限・TTL(例: 7日以上未送信は破棄)を設定し無制限蓄積を避ける。

**バッチ送信のサイズ上限(必須要件)**: `fetch(...,{keepalive:true})`はFetch仕様上、合計送信ボディに実装上の上限(Chromium系ブラウザ/WebViewで**概ね64KiB相当**、keepalive quota)がある。長期間オフラインだった端末が復帰時に蓄積イベントを一括フラッシュするとこの上限を超え、`keepalive`フラグが無効化されリクエストが失敗しうる。フラッシュロジックは以下のいずれかを**必須**とする: (a)1リクエストあたりのイベント件数/推定バイト数に上限(例: 50件 or 32KiB相当)を設けて分割送信、(b)上限超過バッチは`keepalive:false`の通常`fetch`でチャンク送信。サーバー側の重複排除(`client_id`+client生成`event_id`のUUID)も検討。

**sendBeaconのWebView対応**: 要確認(WebView実装依存)。cross-origin送信時、Content-Typeが「simple request」条件を満たさないとpreflightが必要になるが`sendBeacon`はpreflight完了を待てない仕様のため、JSONをそのまま渡すと失敗しうる(`text/plain`のBlobで送るか要回避)。native では送信先が常にcross-originになるためこの制約の影響を受けやすい。**推奨: 主経路は`fetch keepalive`、`sendBeacon`はページ離脱直前の最終フラッシュ用補助経路に限定**(バッチサイズ上限は共通で適用)。

**アプリ終了時のイベント欠損対策**: `@capacitor/app`未導入のため「バックグラウンド化/終了」の確実な捕捉手段が無い。本質的対策は「イベント発生と同時にIndexedDBへ同期的に書き込み、ネットワーク送信は非同期ベストエフォート」というdurable-log-first設計に置く。より確実性を上げるには`@capacitor/app`追加導入(Gradle sync要、スコープ判断事項)。

### 7-2. ディメンション設計

**platform**: `window.Capacitor`ランタイム検出コードはアプリコード側に存在しないため、判定は**ビルド時静的フラグ(`window.__NATIVE_BUILD__`)を正とする**。
- `__NATIVE_BUILD__===1` → `platform='native-android'`
- 未定義かつ`__APP_BUILD__===1` → `platform='web-staging-app'`
- どちらも未定義 → `platform='web'`

iOS scaffold時は`__NATIVE_BUILD__`だけではAndroid/iOSを区別できないため、`stage-www.mjs`の`INJECT_SCRIPT`に`window.PONO_NATIVE_OS='android'|'ios'`を追加する(既存の「ビルド時静的注入」哲学と一貫)。代替として`Capacitor.getPlatform()`の利用も考えられるが、コードベースで一度も呼ばれていない未検証APIのため、静的注入を主・`getPlatform()`を補助的クロスチェックとする二段構えを推奨。

**app_version**: Androidは`native/android/app/build.gradle:10-11`の`versionCode`/`versionName`だがJS側から直接読めない。`@capacitor/app`の`App.getInfo()`導入、または`stage-www.mjs`がbuild.gradleの値を読んで`window.PONO_APP_VERSION`として静的注入する新規実装が必要(現状どちらも未実装)。Webは`sw.js`の`CACHE_VERSION`を代替指標にできるが、ファイル毎手打ち同期のためドリフトが既知の運用リスク。

**tier/native/webの掛け合わせ**: `common/tier.js`の`isAppBuild()`は`window.__APP_BUILD__`のみを見るため、**tierだけではnativeとstaging-app webを判別できない**。分析イベントには`platform`(`__NATIVE_BUILD__`由来)と`tier`(free/book/app)を**独立ディメンション**として両方記録すること。`env`はクライアント側hostname sniffing(`common/rating-modal.js:198-205`の`detectEnvironment()`、Capacitor Android既定origin=`https://localhost`のためnative本番トラフィックが軒並み「ローカル開発環境」と誤判定される既知バグを持つ)を転用禁止とし、サーバー側でOriginヘッダ等から判定する。D6設計(production では`APP_BUILD`が立たない前提)により「productionかつtier=app」は運用上ほぼnative由来と推測できるが、これは推測でありDevToolsでの手動改ざんが可能なため`platform`を明示フラグとして必ず送ること。

### 7-3. ストア審査・ポリシー要件

以下は一般的な政策知識に基づく分析であり、**実際の申請前に必ず最新の公式ガイドラインを確認すること**(該当箇所は「要確認」を維持)。

**Google Play ファミリー ポリシー + Data Safety フォーム**: 広告SDK(Families Ads Program)は「Google Play Families 自己証明済みSDKリスト」への限定という明確な公式リスト方式が存在する一方、**非広告の一般的な分析SDK全般は同種の公式リスト方式ではなく、Families Policy Requirements(デベロッパーによる自己申告・コンプライアンス確認)の対象**という管理方式の違いがある(要確認: 最新のFamilies Self-Certified SDKs一覧)。**自前(1st-party)のCloudflare Workerへの計測は「第三者SDK」に該当しないため、上記いずれの制約の対象外に位置づけられる可能性が高い**——これが自前計測が制約下の最適解になる核。ただしCloudflareを「データ処理者」としてData Safetyフォーム上で開示対象になりうる点は正確に申告する必要がある(区分の正確な要件は要確認)。広告目的の識別子(Advertising ID)を一切収集しない設計であれば、ファミリーポリシーの最も厳しい制約カテゴリを回避できる。

**Apple Kids カテゴリ + App Privacy ラベル + ATT**: App Store Review Guideline 1.3(Kids Category)は第三者アナリティクス・第三者広告の使用を原則禁止する。**この例外運用はGoogleのような公式certifiedリスト方式とは異なり、Appleは「データを他目的やクロスアプリ識別に転用しない」等の契約上・挙動上の条件を満たす分析ツールに限り例外的な使用を認める、契約・自己申告ベースの基準に近い**(固定の承認プロバイダー一覧は存在しない、要確認: 最新のApple Developer/App Review Guidelines 1.3)。自前バックエンドへの直接送信は「第三者アナリティクスSDK」の定義に該当しないと解釈できる可能性が高いが、「第三者」の定義がインフラ提供者(Cloudflare)まで含むか等は申請前に最終確認すべき。第三者データと突合しない・広告目的で使わない設計であれば「Track」に該当しないと説明しやすく、ATTプロンプトも不要になる可能性が高い。

**COPPA(米国)内部運用目的の分析**: 「Support for Internal Operations」例外は保護者同意不要だが**「無通知でよい」わけではない**。適用条件として、事業者はプライバシーポリシー上に(a)収集する永続識別子の種類、(b)内部運用目的の範囲内でのみ利用する旨、(c)**Cloudflare および Google(Apps Script / Sheets — ★評価・アンケートの既存フロー、P1で`client_id`同梱化)** 等のインフラ提供者が識別子を扱う場合はその開示、を明記する必要がある(16 CFR §312.4(d)(3)相当、要確認)。この開示を欠いたまま技術実装のみを完了すると「設計は例外に合致しているがプライバシーポリシー未整備のため実運用上非準拠」という状態に陥りうる。**ストア審査固有の要件ではなく米国の子供向けサービスとしての一般要件のため、ストア申請(Phase 2扱いのAndroid/Phase 3扱いのiOS)を待たず、production環境でのイベント収集開始(Phase 1)までに満たす**(§5-4と同一のゲート)。

### 7-4. Web版設計への逆流要件(チェックリスト、全項目)

- [ ] **エンドポイントの絶対URL化**: `(window.PONO_API_BASE || '') + '/api/...'`パターンを分析イベント送信にも採用する。相対パス直書きを避け、必ずこの1行のイディオムを経由させる。
- [ ] **`PONO_API_BASE`の環境切替をビルド時テンプレート化**: 現状production Worker URLを文字列ハードコード。staging-app検証用ビルドを作れるよう、ビルド引数/環境変数で切替可能にしておく。
- [ ] **`client_id`の保存場所を明確化**: `sessionStorage`起点の揮発性IDではなく、`localStorage`に永続化した端末単位の匿名ID(`pono_client_id`)を新設する。長期不変の広告向け識別子にはしない(アプリ再インストールでリセットされる程度の粒度で十分)。
- [ ] **SWのバイパス設計を明文化**: SWは`GET`以外を素通しするため、分析イベントは必ずPOSTで送る(GETベースの1x1ピクセルビーコン等は禁止)。将来GET系が必要になった場合はパスベースbypassへの明示的追加が必要。
- [ ] **リトライキューの共通モジュール化**: `common/telemetry.js`としてIndexedDBベースの永続キュー+フラッシュロジックをweb/native共通で1本化する。
- [ ] **送信バッチサイズの上限設計**: `fetch keepalive`の合計送信量上限(概ね64KiB相当)を超えないよう、共通キューモジュールに「1リクエストあたりの件数/推定バイト数上限」と「上限超過時のチャンク分割(または`keepalive:false`フォールバック)」を組み込む。
- [ ] **`native/content-manifest.json`への新規ファイル登録を運用手順に明記**: `common/`は`type: file-list`の明示allowlist方式のため、新規追加する`common/telemetry.js`/`common/device-id.js`を`filesリスト`に追記しない限りnativeビルドに同梱されない(過去に`oto/color-fluid.js`等で同種の同梱漏れ実績あり)。
- [ ] **`native/www`の再同期を運用フローに組み込む**: `.gitignore`対象のスナップショットであり`npm run stage-www`実行時のみ更新される(過去複数回のstale事故実績あり)。分析コード変更後は必ずnative側で再ビルド・実機/エミュレータ確認を行う。
- [ ] **hostname sniffingベースの環境判定を新規実装で使わない**: `detectEnvironment()`はnativeでは`localhost`に誤判定する既知バグを持つ。環境判定は`__APP_BUILD__`/`__NATIVE_BUILD__`ベース、または可能ならサーバー側に寄せる。
- [ ] **CORS allowlistの一元管理**: `src/api/savedata.js:39-60`の`allowedOrigins(env)`を分析APIとも共有する。
- [ ] **プライバシーポリシー文言の追加/更新**: COPPA internal operations例外の適用条件(§5-4/§7-3)として、収集する永続識別子の種類・利用目的・インフラ提供者(**Cloudflare、および Google(Apps Script / Sheets — ★評価・アンケートの既存フロー、P1で`client_id`同梱化)**)開示をプライバシーポリシーに明記する。production環境でのイベント収集開始(Phase 1)までに完了させる。

### 7-5. 段階導入ロードマップ(ネイティブ視点)

- **Phase 0(前提解消)**: production webapp Workerのerror 1042 404を解消(`PONO_API_BASE`がこのURLに固定されているため、この障害が残る限りnativeからの計測は実機で全滅する)。`PONO_API_BASE`のビルド時切替テンプレート化。
- **Phase 1: Web先行実装**: `/api/e`エンドポイント新設+CORS allowlist共有、`fetch keepalive`+IndexedDB永続キューをWebから先に投入しstaging-app/LP staging/productionの3環境で実挙動検証。バッチ上限の実測検証(長時間オフライン端末を想定した大量キュー蓄積→復帰時一括フラッシュのシナリオ含む)。プライバシーポリシー整備をこの段階で完了。
- **Phase 2: Android native**: `content-manifest.json`登録・`stage-www.mjs`注入拡張(`PONO_NATIVE_OS`等)・`native/www`再同期を実施。CORS allowlist越しに実機/エミュレータでイベント到達を検証。オフラインキュー・アプリ終了時欠損対策(`@capacitor/network`/`@capacitor/app`追加導入要否をこの段階で判断)を重点検証。Google Play Data Safetyフォーム記入・Familiesポリシー適合確認を並行準備。
- **Phase 3: iOS native**: `native/ios`のCapacitor scaffoldをゼロから実施、`server.iosScheme`既定(`capacitor://localhost`)の実機確認から入る。Android で確立したキュー/送信ロジックを流用。Apple Kidsカテゴリ特有の要件(App Privacyラベル、1.3ガイドラインの契約・自己申告ベース分析ツール利用条件、ATT要否)の最終チェック。
- **全フェーズ共通の検証ゲート**: 各フェーズ完了時に「オフライン→オンライン復帰でのイベント到達率」「アプリ強制killからの再起動でのキュー残存率」「大量バッチフラッシュ時のkeepalive上限超過による送信失敗率」を実機で数値検証する(現状は静的コード解析のみで未実測)。

---

## 8. 統合ロードマップ

両チームの調査結果を統合した単一フェーズ列。

| Phase | 内容 | 工数目安 |
|---|---|---|
| **Phase 0** | ゼロ実装系。既存Umamiタグを LP `index.html`/`play.html`/未導入18ゲームへ展開。CF Workers Observabilityの確認手順確立。Google Sheets週次KPI(K1-K12)継続運用。`robots.txt`/`sitemap.xml`整備(Sitemap行の実体化、30以上あるゲームディレクトリの網羅)。 | 即日〜半日 |
| | ⚠️ **並行留意事項**: 本番webapp Worker(`pono-asobiba-app.ndw.workers.dev`)のerror 1042 404未解決は、分析基盤本体とは独立の障害だが**Phase 3(Android native実機検証)の前提ブロッカー**であるため早期解消が望ましい。 | — |
| **Phase 1** | Web収集開始。`/api/e`(`src/api/events.js`新設)+WAE binding、`common/telemetry.js`+`common/device-id.js`新設、`pono_client_id`(`crypto.randomUUID`、プロフィールと物理分離)、P0イベント8個実装、オプトアウトトグル+告知バナー、プライバシーポリシー記載(§5-4/§7-3のCOPPAゲート)、staging-app先行導入+Playwright/admin除外。CORSは`src/api/savedata.js`の`allowedOrigins()`を共有。**追加ゲート: 第10章のA-4判断(GASパイプライン分離 or 開示強化)+β配布文書の整合確認(§10-1 A項)も本Phaseの完了条件に含める。** | 2〜3日 |
| **Phase 2** | 集計+可視化。D1作成+migration、cron trigger(`[triggers]`はinheritableのため`env.staging`/`env.staging-app`にcrons=[]の明示上書き必須+デプロイ後ダッシュボード目視確認)、`admin/`分析タブ実装。 | 3〜5日 |
| **Phase 3** | Android native。前提=error 1042解消+`stage-www.mjs`のPONO_API_BASEビルド時切替テンプレート化。`native/content-manifest.json`への`common/telemetry.js`等の手動追加(file-list方式)、`native/www`再同期(stale事故既知)、実機検証ゲート(オフライン→復帰の到達率/強制killからのキュー残存/バッチ上限超過失敗率)、Google Playファミリーポリシー+Data Safetyフォーム。 | — |
| **Phase 4** | iOS native。scaffoldゼロから。`capacitor://localhost`(`savedata.js`のallowlistに先回り追加済み・未検証)、Apple Kidsカテゴリ(公式certifiedリストは無い・契約/自己申告ベース)、App Privacyラベル、ATT要否最終判断。 | — |
| **Phase 5** | 高度化・継続。tier別ファネル、コホート分析、料金テストの効果測定、P1/P2イベント追加。 | 継続的 |

---

## 9. リスク・要確認事項

以下は元分析が明示的に「要確認」とした事項、および本統合で新たに識別した運用リスク。確定情報として扱わないこと。

- **WAEの`COUNT(DISTINCT ...)`サンプリング補正手法**: 未文書化のまま。D1側で生distinct行を持つ設計(§6-3)で実質回避しているが、WAE側の生ログ自体がサンプリングで欠落するリスクは残る。
- **D1のシングルライター特性に起因する安全な書込QPS目安**: 要確認、実装後に実測で確認する。
- **WAEのadaptive samplingが実際にどの書込量から発動するか**: 具体的な閾値は要確認。本アプリの想定トラフィックが閾値を超えないかは実装後に実測。
- **GrafanaからD1/WAEへの公式接続手段(プラグイン等)の有無**: 要確認(Phase5以降の検討事項)。
- **KV/D1それぞれの無料枠の正確な数値**(書込/読取回数、ストレージ容量): 要確認。
- **`wrangler.toml`の`assets`/`observability`が公式ドキュメント上inheritableと分類される一方、本プロジェクトの記述は非継承として明示的に再宣言している食い違い**: 原因未特定。ドキュメント上の分類を鵜呑みにせず、`[triggers]`設定後も必ずCloudflare dashboardで目視確認する運用の根拠として扱う。
- **`sendBeacon`のWebView対応状況**: 最新のAndroid System WebView実装依存、要確認。cross-origin+JSON送信でのpreflight未対応の既知の落とし穴がある。
- **`fetch keepalive`の合計送信量上限(概ね64KiB)**: ブラウザ/WebViewバージョン差に依存する実装上の上限であり公式に固定値として保証されたものではない。バッチ設計はこの前提で保守的に組む(§6-2/§7-1)。
- **Capacitorのストレージ分離のOSバージョン差**: 複数のCapacitorアプリ間で`https://localhost`のlocalStorageが共有される心配は基本的にないと考えられるが、実装詳細・OSバージョン差は要確認。
- **iOS `capacitor://localhost`の到達性**: `src/api/savedata.js`のCORS allowlistに先回り追加済みだが、`native/ios`自体が未scaffoldのため未検証。
- **Google Play Families/Apple Kidsカテゴリの最新ポリシー**: 頻繁に改定されるため、実際の申請前に必ず最新の公式ガイドラインを再確認する(§7-3)。
- **COPPA「内部運用支援」例外の解釈・最新のFTC guidance**: 要確認。EU居住児童向けGDPR-K等の他法域要件は本計画の範囲外。
- **`admin/index.html`のGitHubコミット先ブランチ`GH_BRANCH='develop'`が凍結済みブランチと同名の件**(§3 罠#9): 本計画の主題(分析基盤)そのものではないが、コンテンツ管理(rewards.json/creatures.json等)の運用継続性に関わるため、ユーザー確認を推奨する未解決事項として申し送る。
- **本番webapp Worker(`pono-asobiba-app.ndw.workers.dev`)のerror 1042再発**: 分析基盤とは無関係の既知課題だが、Phase 3(native実機検証)の前提ブロッカー。解消状況次第でPhase 3着手タイミングを調整する。
- **A-4: GASパイプラインでのメール紐付きリスク(第10章)**: P1の`rating_submitted`/`survey_submitted`に`client_id`を同梱すると、`survey.html`の任意メール欄と同一GASエンドポイント(同一スプレッドシート)で符号と実メールアドレスが同居し再識別可能になる。APPI第31条(個人関連情報の第三者提供)の論点にも接続する(§10-5)。GASパイプライン分離(推奨)か開示強化かのオーナー判断がP1実装前に必要。
- **β配布文書3件のliteral-conflict**: `docs/beta/_html/consent_form.html:199,231`(「ボタンを押した時だけ送られます」「〜だけをお預かりします」)/`daycare_request.html:227`(「〜のみ」の限定列挙)がdefault-on自動送信の設計と文字通り矛盾する(§10-1 A-1〜A-3)。**配布ステータス(配布済みか未配布ドラフトか)の確認がオーナー宿題**。配布済みなら文言修正、未配布なら修正後に配布。
- **`/privacy`デッドリンク**: `consent_form.html:271`/`parent_flyer.html:235`(β同意書・チラシ)が`https://pono.kodama-no-mori.com/privacy`を印字参照しているが実体ページが存在しない。Phase 1必須ゲートのプライバシーポリシーページ新設(§5-4/§10-5)で解消する。

---

## 10. ブランド約束との整合(文言監査と保護者向け説明設計)

「売り文句と計測の整合性監査」ワークフロー(§11 出典)の成果を収録する。LP・help.html・βテスト配布文書等の対外的な約束文言20件をfile:line単位で監査し、テレメトリ導入後も既存の約束が嘘にならないための文言修正・設計判断・開示設計をまとめた。クロスレビュー(critical 1/major 2/minor 1)反映済みの改訂版を正とする。本章内の「§5-x」等は本書の該当章を指す。

**前提(監査で判明した事実 — 2026-07-13 オーナー決定を反映)**:
- **プライバシーポリシーページの不在(/privacy デッドリンク)**: 「プライバシーポリシー」という名の実装済みページ・セクションは本番サイト(`index.html`/`help.html`/`play.html`/`survey.html`)にも`src/worker.js`のルーティングにも一切存在しない。`consent_form.html:271`と`parent_flyer.html:235`が参照する`https://pono.kodama-no-mori.com/privacy`は、現状デッドリンクのまま保護者向け配布文書に印字される予定になっている(`docs/PRICING_STRATEGY.md:667`でも「プライバシーポリシー…を整備したか」が未チェックTODO)。
- **β配布文書の配布ステータス — オーナー確認済み(2026-07-13): 未配布**。配布前の文言修正を適用済み(全7箇所: A-1 `docs/beta/_html/consent_form.html:199` + `assets/_archive/beta/consent_form.md:20` / A-2 `daycare_request.html:227` / A-3 `consent_form.html:231` + `consent_form.md:62` / 追加:「集めるもの」リスト `consent_form.html:206` + `consent_form.md:28`)。

### 10-1. 整合性マトリクス — 約束文言 × テレメトリ導入後の真偽

判定は3段階: **真のまま**(文字通り矛盾しない)/ **条件付き真**(対象を限定すれば真、誤解リスクあり)/ **要修正**(literal-conflict、そのままでは嘘になる)。

#### A. 要修正(literal-conflict) — オーナー決定済み(2026-07-13)、両論は履歴として保持

| # | 引用 | 出典・対象 | なぜ「要修正」か | 文言修正案 | 設計側で回避する案 |
|---|---|---|---|---|---|
| A-1 | 「データはボタンを押した時だけ送られます。こちらが勝手に送信することはありません。」 | `docs/beta/_html/consent_form.html:199`(園経由配布の同意書)、同文が`assets/_archive/beta/consent_form.md:20`にも存在 | P0の8イベントはいずれもページ表示・操作に伴い**自動発火**し、かつ初期状態はオプトアウトOFF=**default-on**(§5-1・§5-3)。ボタン押下時のみという断定と正面から矛盾する | 「あそびのきろく(どのゲームでどれくらい遊んだか)は、名前と結びつかない符号を使って自動的に記録されます。ボタンを押して送る項目(保護者の任意メモ等)以外にも、自動で送られる記録があります。」に置換 → **文言修正案を適用済み(2026-07-13)** | β参加端末のみP0自動イベント(`session_start`等)を送信対象から除外するセグメントフラグを設ける。ただし本番default-on設計(§5-3)の趣旨=十分なNを得ることと矛盾するため、β母集団が小規模なら実害は小さいという前提の上での折衷案 |
| A-2 | 「集めるのは匿名のプレイ時間、ゲームID、保護者の任意メモ、年齢層のみのアンケート回答です。」 | `docs/beta/_html/daycare_request.html:227`(園向け依頼文書) | 「のみ」の限定列挙に`paywall_hit`/`upgrade_cta_click`/`acorn_earned`等の収益ファネル系イベント(§5-1表)が含まれない | 「のみ」を削除し範囲を一般化。例:「集めるのは、匿名のあそびの記録(遊んだゲーム・時間・アプリのご案内を見たかどうかなど)、保護者の任意メモ、年齢層のみのアンケート回答です。広告や個人を特定する情報は集めません。」 → **文言修正案を適用済み(2026-07-13)** | β参加者セグメントでは`paywall_hit`/`upgrade_cta_click`/`acorn_earned`を送信対象外にする。ただし「課金導線への興味度」という主要4問の一つ(§5-1)をβ集団から測れなくなるトレードオフを伴う |
| A-3 | 「お名前や顔写真は一切集めません。ゲームをプレイした時間と、ママ・パパが書いたメモだけをお預かりします。」 | `docs/beta/_html/consent_form.html:231`(子供本人へ読み聞かせる想定の文) | 「だけ」の限定。`game_launch`/`game_clear`等はプレイ時間の範疇を超えるゲーム単位のアクション記録であり、かつ自動収集データで保護者メモ(手動入力)とは性質が異なる | 「だけ」を「など」に置換。「…ゲームでどんなふうに遊んだか(遊んだ時間やクリアしたかどうかなど)と、ママ・パパが書いたメモをお預かりします。」 → **文言修正案を適用済み(2026-07-13)** | 子供向け説明文なので、複数イベント種を技術的に統合する代わりに文言側で「あそびの記録」に一括りにする一般化で吸収するのが現実的(A-2と同じ思想) |
| **A-4**(critical) | §10-2対比表「メールアドレス…新設のあそびの記録には一切含めない」/ §10-3 FAQ Q2「送るデータの中にもお名前・生まれた日・メールアドレスなどは一切含まれません」(いずれも旧ドラフト文言、現在は修正済み) | §5-2 P1設計(`rating_submitted`/`survey_submitted`行「既存GAS(client_id/session_id同梱化のみ追加)」)。実装根拠: `common/rating-modal.js:215-255`(`postStarToAppsScript`、URLは`play.html:11111`で注入)と`survey.html:155,326`が**同一の**Google Apps Script URLにPOSTしている。`survey.html`のQ9メール欄(`survey.html:123-125,295-298,321`)は任意だが実在 | P1でrating/survey系イベントに`client_id`を同梱すると、保護者がQ9に任意でメールアドレスを書いた場合、Google側の同一スプレッドシート上で`client_id`(=あそびの記録全体の紐付けキー)と実メールアドレスが同居し、そのアドレスの家庭の行動記録全体が事実上再識別可能になる。「一切含まれません」という断定はこの経路を見落としており、そのままでは事実と異なる | §10-2対比表「メールアドレス」行と§10-3 FAQ Q2を、任意メール入力時の紐付きリスクを開示する文言に書き換え済み(本章に収録の版が修正後) | **オーナー決定(2026-07-13): 分離案を採用**。P1で`rating_submitted`/`survey_submitted`に`client_id`を同梱する場合はGAS(任意メール欄と同一シート)には送らず、`/api/e`(WAE/D1)側の別チャネルで送る。GASには従来どおり`anonSid`のみ |

**A-1〜A-3(β配布文書)— 解決済み(2026-07-13)**: 3件とも本番サイトではなく`docs/beta/_html/`配下のβテスト配布文書。オーナー確認により**未配布**と判明し、**配布前の文言修正を全7箇所に適用済み**(§10冒頭の前提参照)。当初の推奨(配布ステータス確認→配布済みなら文言修正/未配布なら修正後に配布)は「未配布→配布前修正」ルートで完了した。

**A-4(GASパイプライン設計)— 決定済み(2026-07-13): 分離案を採用**: A-1〜A-3とは性質が異なり、β限定ではなく§5-2のP1実装(rating/surveyへの`client_id`同梱)が動き出した瞬間に本番の全保護者に及ぶ問題。P0(ゲームプレイ等の基本イベント収集)の開始自体はGASを経由しないためA-4の影響を受けない。**オーナー決定により、P1では`client_id`をGAS(任意メール欄と同一シート)に送らず`/api/e`(WAE/D1)側の別チャネルで送る。GASには従来どおり`anonSid`のみを維持する。分離実装前に`client_id`のGAS同梱を先行させることは禁止。**

#### B. 条件付き真(perception) — 誤解防止のための説明強化が必要

| # | 引用 | 出典・対象 | 判定根拠 | 保護者へどう説明するか(1行) |
|---|---|---|---|---|
| B-1 | 「また、このサイトではお名前や連絡先などの個人情報を取得していないため、安心してお子さまに遊ばせていただけます。」 | `help.html:121`(保護者向けあいさつ文) | 対象は「お名前や連絡先など」に限定されており、匿名の`pono_client_id`(氏名・連絡先と物理的に別キー、§5-3)はこの列挙の対象外。ただし一般読者は「行動記録も含め何も取られていない」と拡大解釈しやすい、監査でも「矛盾リスクが最も高い一文」と指摘 | 文言はそのまま維持しつつ、直後に「あそびの記録(とうけい)について」という小見出しを新設し、「お名前・連絡先は今までどおり取っていません。ただし、どのゲームでどれくらい遊んだかを、名前と結びつかない符号で自動的に記録することがあります」と1文追記してリンクで詳細(§10-2の表)へ誘導 |
| B-2 | 「名前、メールアドレスなどの個人情報を入力することなしに、そのままブラウザで遊べます。」 | `index.html:1972`(LP安心セクション) | 「入力」に限定、`client_id`は自動生成でユーザー入力を要求しない(§5-3)ため字面上は矛盾しない | 事実として真、文言変更不要。安心セクション直下に「あそびの記録について」への導線リンクを追加するのみ(§10-4参照) |
| B-3 | 「個人情報の入力なし」 | `index.html:1980`(chipリスト) | B-2と同様、「入力」限定 | 事実として真。chip自体は変更不要 |
| B-4 | 「ポノのあそびば内で、名前やメールアドレスの入力を求めることはありません。」 | `index.html:2264`(フッター直下の唯一のまとまった開示文) | 「入力を求めることはありません」に限定され字面上は真だが、プライバシーポリシーページが存在しない現状、この一文が実質的な唯一の開示として機能している | 事実として真だが役割過剰。この一文のすぐ近くに「あそびの記録についてくわしくはこちら」リンクを追加し、単独での"唯一の開示"状態を解消する(§10-4/§10-5参照) |
| B-5 | 「集めたデータは(お子さんの年齢層は統計集計後に削除)2026年12月31日までに、すべて削除します。」 | `docs/beta/_html/consent_form.html:215`(β同意書) | β限定の削除期限コミット。本番テレメトリのD1データはTTL/削除ポリシー未設計(§6-1の「保持3ヶ月固定」はWAE生ログのみでD1は無期限になりうる)。βの`client_id`イベントが本番パイプラインに混入すると期限を守れないリスク。**このD1 TTL未設計というギャップは§10-3 FAQ Q3の回答の直接の根拠でもある** | β参加者向け説明としては維持可能だが、実装側でβ由来の`client_id`/イベントを本番D1ロールアップと分離識別できるようタグ付けし、期限到来時に確実に削除できる設計にする(実装時の要検討事項として申し送り) |

#### C. 真のまま(none) — 変更不要、参考として一覧

| 引用(要約) | 出典 | 理由 |
|---|---|---|
| 「お子さんを特定できる情報(お名前・顔写真・声・位置情報)は、一切収集しません」 | `consent_form.html:198`、`daycare_request.html:226`、`parent_flyer.html:233` | 列挙対象が氏名・顔写真・声・位置情報に限定。§5-5の非収集リストと完全整合(GPS・カメラ・マイク入力は未使用) |
| 「会員登録なし」 | `index.html:1979` | アカウント/ログイン機能は現状もテレメトリ導入後も一切導入しない(§5-3, §5-4) |
| 「会員登録や名前・メールの入力なしで、そのまま遊べます。」 | `index.html:2047` | B-2と同様「入力」限定 |
| 「ガチャガチャは課金なし」 | `index.html:1981` | 課金モデルの話でデータ収集と無関係 |
| 「登録不要!ブラウザで、誰でもすぐに無料で遊べます!」 | `index.html:1944` | 同上 |
| 「無料でも基本のあそびを楽しめます。」 | `help.html:118` | 同上 |
| 「回答は匿名で集計され、個人を特定できる情報(お名前/お顔/お声/位置情報)は一切収集しません。」 | `docs/beta/google_forms_template.md:56`等 | アンケート回答自体の匿名性の話でテレメトリの`client_id`/イベントとは別チャネル。**ただしこの「別チャネル」という前提自体がA-4で相対化される点に注意。回答の匿名性(誰が回答したか特定できない)という論点と、`client_id`とメールの内部紐付きという論点は別軸でありC判定は維持するが、Google Apps Script経由という共通点には留意が必要** |

**運営内部文書(対外的な約束文言ではないため対象外)**: `google_forms_setup_guide.md:43`(運営向け設定手順)、`PRICING_STRATEGY.md:25`(社内戦略資料の「3つの約束」=広告ゼロ・IAPゼロ・家族共有、データ収集非言及)、`PRICING_STRATEGY.md:667`(未整備TODO、本書§5-4のプライバシーポリシー新設ゲートと符合)。

**別枠の要対応事項(このマトリクスとは別軸)**: `consent_form.html:271`と`parent_flyer.html:235`が参照する`https://pono.kodama-no-mori.com/privacy`は実装ゼロのデッドリンク(本番HTMLに実体0件)。§5-4はプライバシーポリシー新設を「収集開始前の必須ゲート」と明記しており、このURLの実体化そのものがPhase 1完了条件。

### 10-2. 「あつめるもの・あつめないもの」対比表(保護者向け・help.html/プライバシー説明用)

子供向けブランド方針に基づき「データ収集」「トラッキング」の語は使わず、**「あそびの記録(とうけい)」**という言葉に統一する。以下は§5-5「集めない things リスト」と完全整合させた対比表案(そのままhelp.htmlやプライバシーページに掲載可能な文面)。

**あつめないもの**

| 項目 | 備考(本書根拠) |
|---|---|
| お名前・生まれた日・性別 | `pono_player_profile_v1`のname/age/genderはサーバーに送らない(現行どおり継続、§5-5) |
| ご住所・お電話番号 | そもそも入力欄自体が存在しない |
| メールアドレス | あそびの記録にも、その送り先にも、メールアドレスは一切含まれません(§5-5)。感想アンケート(survey.html)で任意入力されたメールアドレスは、あそびの記録(符号付きデータ)とは**別の送り先**で管理されます。※この断定はGASパイプライン分離(§10-1 A-4、オーナー決定 2026-07-13)の実装が前提。分離実装前は`client_id`をGASに同梱してはならない |
| お顔の写真・お声 | カメラ・マイク機能はそもそも存在しない(§5-5) |
| 正確な居場所(位置情報) | GPS/位置情報の取得機能は使っていない(§5-5) |
| 機械の背番号(広告用ID) | IDFA/AAID/MACアドレス等の広告ID・端末IDは取得しない(§5-5) |
| 機械の特徴を組み合わせた見分け方の強化 | 既存の端末フィンガープリント(dfp)はこれ以上強化せず、ランダムな符号(client_id)に一本化する(§5-3・§5-5) |
| インターネットの住所(生のIPアドレス) | ハッシュ化(暗号のように読めなくする処理)した状態のみ扱う(§5-5、`src/api/ratelimit.js`) |
| お子さんが描いた絵そのもの | 「保存した枚数」等の数字だけを将来検討する可能性はあるが、絵の中身は送らない(§5-5) |
| 広告会社のタグ・追跡用の仕組み | 第三者広告SDK・トラッキングピクセルは使わない(§5-5) |
| 他のアプリやサイトをまたいだ行動の見張り | クロスサイト/クロスアプリの行動横断は行わない(§5-5) |
| 記録用の符号を使った広告や、お子さんへの直接連絡 | 符号(client_id)はあそびを良くする目的だけに使い、広告や連絡には使わない(§5-4・§5-5) |

**あつめるもの**

| 項目 | 備考(本書根拠) |
|---|---|
| どのゲームでどれくらい遊んだか、の匿名のあそびの記録(とうけい) | 「めいろで3回あそんだ」のような、プレイ回数・クリアしたかどうかなど(§5-1 P0イベント、§5-4告知文言) |
| 名前と結びつかない「符号」(ランダムな番号) | `pono_client_id`。`crypto.randomUUID()`で自動生成、氏名・年齢・性別とは別の場所に保存(§5-3)。メールアドレスと同じ場所に置かれることはありません。※この断定はGAS分離の実装が前提(上表「メールアドレス」行参照) |
| 遊んだ日や、ブラウザ版/アプリ版などの技術的な情報 | tier/platform/environment等(§5-1共通プロパティ) |
| (自分から書いてくださった場合のみ)★評価やアンケートのご感想 | 完全にオプトイン、既存フローのまま(survey.html、§5-2) |

**掲載時の注記文言案**: 「ポノのあそびばは、あそびの記録(とうけい)を、名前と結びつかない符号だけで自動的に記録しています。この記録は、あそびばをもっと楽しくするためだけに使い、広告やお子さまへの連絡には使いません。感想アンケートの回答は、あそびの記録とは別の送り先で管理しています。」※この文言はGASパイプライン分離(§10-1 A-4)の実装が前提。分離実装前は`client_id`をGASに同梱してはならない。

### 10-3. 保護者向けFAQ 5問

§5-4の告知バナー文言・「データかんり」設定文言と矛盾しないよう、同じ語彙(「あそびの記録」「符号」「データかんり」)で統一する。

**Q1. 結局なにか集めてるの?**
A. はい、集めています。ただし、お子さまのお名前や連絡先とは結びつかない「符号(ランダムな番号)」を使って、どのゲームをどれくらい遊んだかという「あそびの記録(とうけい)」を自動的に記録しています。何を集めて、何を集めないかは上の表のとおりです。

**Q2. 名前と結びつく?**
A. いいえ。あそびの記録(自動で送られるデータ)にも、その送り先にも、お名前・生まれた日・メールアドレスは一切含まれません。記録に使う符号(client_id)は、お名前などとは別の場所に保存されています(この設計は合言葉クラウド同期でお名前などを常に取り除く仕組みと同じ考え方です、§5-3)。感想アンケート(survey.html)でメールアドレスを任意で書いていただいた場合も、そのメールはあそびの記録(符号付きデータ)とは別の送り先で管理され、結びつきません。

※この断定はGASパイプライン分離(§10-1 A-4、オーナー決定 2026-07-13)の実装が前提。分離実装前は`client_id`をGASに同梱してはならない。

**Q3. 消せる?**
A. 「符号のリセット」と「これからの送信を止めること」はすぐにできます。⚙設定 →「データかんり(保護者の方へ)」から、記録用の符号(client_id)をいつでも新しく作り直せます。これにより、これまでの記録と、これから記録される内容とのつながりを断つことができます。また「あそびの記録を送らない」をONにすれば、これ以降の記録の送信そのものを止めることができます(§5-3)。

ただし、**すでにお預かりした記録そのものを、その場で完全に消し去れるわけではありません**。生の記録(WAEログ)は送信から3か月で自動的に消える設計ですが(§6-1)、集計後のデータ(D1)をいつまで保存するかは現時点でまだ決まっていません。この点はご不便をおかけしますが、正確にお伝えするため「消せる?」に一言で「はい」とはお答えしていません。保存期間の仕組みが固まり次第、この説明も更新します。

**Q4. なぜ集めるの?**
A. どのゲームが楽しく遊ばれているか、遊びにくいところがないかを知って、あそびばをもっと良くするために使います。広告のためや、お子さまに直接連絡するためには一切使いません(§5-4・§5-5)。

**Q5. 会員登録が必要になったの?**
A. いいえ、必要ありません。今までどおり、会員登録やお名前・メールアドレスの入力なしでそのまま遊べます。あそびの記録は入力の手間なく、自動でつく記録です(`index.html:1972/1979/1980/2047`の各文言と矛盾しない設計)。

### 10-4. LPの扱い

**判断: LPの売り文句(会員登録なし・個人情報の入力なし・課金なし)は一切変更しない。**

理由:
- これら3つは監査で「真のまま」または「入力に限定した文言のため条件付き真」と判定されており(§10-1 B-2・B-3・C参照)、いずれも修正の必要がない。安易に書き換えると「今まで嘘だったのか」という逆の誤解を招く。
- 技術的にも、LP(`index.html`)自体は現状も導入後も`client_id`ベースの記録を持たない。§5-5で「Umami(SaaS)へのclient_id/session_id/tier等アプリ固有識別子の送信」を明示的に禁止しており、P1で追加予定の`lp_cta_click`/`lp_feature_card_tap`もUmamiパイプライン(§5-2)で`client_id`無しのURL単位の集計にとどまる。つまりLPの閲覧自体は「符号による記録」の対象外であり、記録が始まるのはアプリ本体(`play.html`)に入ってから。
- なお、A-4(GASパイプラインでのメール紐付きリスク)は`survey.html`(遊んだ後の感想アンケート)の話であり、LP自体には影響しない。LP文言の再検討が不要という結論はA-4の影響を受けない。

**追加すべき最小限の要素**:
1. フッター直下、現行の「ポノのあそびば内で、名前やメールアドレスの入力を求めることはありません。」(`index.html:2264`)のすぐ近くに、リンク1本「あそびの記録について」を追加し、help.htmlの新設セクション(または新設プライバシーページ)へ誘導する。「この一文が実質的な唯一の開示として機能してしまっている」状態を解消する最小手当てになる。
2. 安心セクションのchipリスト(`index.html:1979-1981`付近)自体は変更しないが、セクション末尾に小さく1行「くわしくは『あそびの記録について』をご覧ください」を添えることも可(必須ではなく推奨、視覚的な圧を避けるためリンクは1箇所に集約するのが望ましい)。
3. これは§5-4が定める「収集開始前の必須ゲート(プライバシーポリシー整備)」の実装物と直結させる。つまりリンク先ページを新設すること自体が本書のハードゲート条件を満たす作業であり、LP側の追加工数は実質「リンク1本」のみで済む。リンク先には§10-2の対比表・§10-3のFAQ(A-4対応版)をそのまま掲載する。

### 10-5. 優良誤認リスクの整理と法的フレーム(APPI第31条)

**論点**: 「個人情報の入力なし」は文字通り維持されるが(§10-1 B-2/B-3)、「匿名の利用統計(あそびの記録)は自動送信する」という事実がどこにも開示されないまま収集を始めると、保護者が抱く「何も記録されていない」という受け取り方(B-1)と実態が乖離し、広義の優良誤認(実態より良く見せる表示)に近い状態になるリスクがある。さらにこの「匿名」という前提自体にも例外がある——A-4の通り、感想アンケートに任意でメールアドレスを書いた家庭については、記録用の符号(`client_id`)とメールアドレスがGoogle側の同一エンドポイントに届き、事実上紐付きうる。これは「個人情報の入力なし」という訴求そのものへの反証ではないが、「client_idは他の情報と照合せず特定の個人を識別できない完全匿名ID」という前提を一部の家庭について崩す。

**3点セット(告知バナー+help.html+プライバシーポリシーページ)で足りるかの評価**:

| 接点 | 現状の設計 | 評価 |
|---|---|---|
| 告知バナー(§5-4) | 初回`session_start`発火時に画面下部へ非ブロッキング表示 | ○ タイミングは妥当だが、**バナー表示と最初のイベント送信がほぼ同時**であり、厳密には「送信前の事前告知」ではなく「送信と同時の告知」である点に留意。ただしdefault-on設計はCOPPA「内部運用支援」例外に基づき保護者同意を前提としない設計(§5-4)のため、これは同意取得の欠如ではなく開示のタイミングの論点にとどまる |
| help.html | 既存の保護者向けあいさつ文(B-1)に、あそびの記録セクション+対比表(§10-2)を新設 | ○ 保護者が能動的に読みに行く場所として機能。ただし**LPからの導線がない**と、LPだけ見て離脱する保護者(=「個人情報の入力なし」という言葉だけを字面通り受け取りやすい層)には届かない |
| プライバシーポリシーページ | 現状デッドリンク(`/privacy`)。§5-4がPhase 1着手前の必須ゲートとして新設を明記 | △ **現状は存在しないため「3点セット」がそもそも未完成**。これを実装することが優良誤認リスク解消の前提条件そのもの |

**結論**: 3点セットという設計方針自体は妥当だが、現状のままでは以下の3つの穴があり、**「足りる」と言うには §10-4のLPリンク追加・プライバシーページ新設・A-4への対応の3つが実装されて初めて成立する**。

1. **LPからの導線の欠如**: LPには現在、あそびの記録に関する開示文言・リンクが一切ない。→§10-4のフッターリンク1本の追加で解消。
2. **プライバシーポリシーページの不在**: β配布文書2件が既に`/privacy`を印字予定で参照しているにもかかわらず実体がない。§5-4・§7-4はこれを「収集開始前の必須ゲート」と位置づけており、**このページの新設はテレメトリのPhase 1実装可否そのものと不可分な前提条件**。
3. **GASパイプラインのメール紐付きリスク(A-4)への対応未了**: 3点セットのいずれにも「感想アンケートのメールが記録用符号と同じ場所に届きうる」という事実が明記されていなければ開示として不十分になる。§10-2対比表・§10-3 FAQ Q2には反映済みだが、告知バナー(短文のため詳細を書ききれない)とプライバシーポリシーページ本体にも、この例外を明記することが必要。

**用語統一の追加論点**: 告知バナー・help.html・プライバシーポリシーページの3面で、同じ実体(`pono_client_id`)を「符号」「あそびの記録」「永続識別子」など異なる語で呼び分けると、保護者から見て「結局何のことか」が繋がらず、開示として機能しなくなる。3面すべてで**「あそびの記録(とうけい)」「名前と結びつかない符号」**という共通の平易な語彙に統一することを実装時のレビュー項目に加える。

**法的フレームの補足(個人情報保護法/APPI)**:

§5-4はCOPPA(米国)中心の整理だが、本サービスは日本語・日本居住の子育て家庭が主対象である。「COPPAの3条件を満たす設計はAPPI側の実務的な期待にもほぼ横滑りで応えられる」という初期整理は不正確であり、以下のとおり修正する。

- *client_id単体の位置づけ*: `pono_client_id`(氏名・年齢・性別とは物理的に別キーで保存)は、それ単体では「他の情報と照合することにより特定の個人を識別することができる」状態にないため、通常はAPPI上の「個人情報」ではなく**「個人関連情報」(APPI第2条第7項、第31条)**に該当すると整理できる。
- *APPI第31条(個人関連情報の第三者提供規制)の論点*: A-4の通り、survey.html経由でメールアドレスが任意入力された場合、そのメールと`client_id`タグ付きのあそびの記録が同一のGoogle Apps Scriptエンドポイント(=同一スプレッドシート)に集約される。これは「個人関連情報を、提供先において他の情報と照合することにより特定の個人を識別することができる」状態を作り出しうるという点で、APPI第31条が想定する類型に接近する。厳密には2通りの整理があり得る:
  1. GAS/スプレッドシートが運営者自身のGoogle Workspace環境内で完結し、Googleは業務委託先(処理受託者)にすぎないと整理する場合、これは「第三者提供」ではなく運営者内部での「個人関連情報と他の情報の統合による個人データ化」の問題になる。この場合、統合後のデータを「個人データ」として扱い、取得時の利用目的通知(APPI第21条相当)・安全管理措置(第23条相当)等の通常の個人情報保護義務を果たす必要が生じる。
  2. Googleを実質的に独立した受領主体とみなす整理をとる場合、第31条の第三者提供規制そのものが適用され、提供先が個人関連情報を他の情報と照合して個人を特定することがあらかじめ想定される以上、本人同意の取得(または取得済みであることの確認)が必要になる。
- いずれの整理でも、**「client_idは他の情報と照合せず特定の個人を識別できない完全匿名ID」という前提が、survey.html経由でメールを入力した家庭については崩れる**という結論は共通する。COPPA上「内部運用支援・第三者への開示なし」を満たす設計だからといって、APPI側の論点まで自動的にクリアされるわけではない。

**結論(法的フレーム)**: COPPAとAPPIは別の法的テストであり、同一設計が両方を自動的に満たすとは限らない。特に第三者(Google)への同梱送信を伴う設計は、COPPA上は「内部運用支援」として問題なくても、APPI上は個人関連情報の第三者提供規制(第31条)または統合後の個人データ化の論点を追加で検討する必要がある。この点はA-4の設計判断(GASパイプライン分離を推奨)と直結しており、分離が実装されればこの論点自体が実務上ほぼ消滅する。分離が実装されない場合は、プライバシーポリシー新設時に ①survey.htmlのメール入力とあそびの記録が同一送付先に届きうること、②その場合Google側で紐付き得ること、を明記し、必要であればAPPI第31条に基づく本人同意取得フローの追加を検討する(具体的な実装方式の選定は実装時の検討事項として申し送り)。

---

## 11. 出典

- **チームA(Web版棚卸し+分析3本+監査)**: `/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/b0969359-8e42-4135-93fb-92dbe60d4a6e/tasks/w9ukkazm5.output`(実施日 2026-07-13)。recon 4本(client-data/server-side/telemetry/app-surface)+ analyses 3本(marketing-utility/gap-proposal/architecture、各レビュー→改訂の2段階)+ 監査(verification: confirmed/contradictions/missed)の構成、エージェント数13。
- **チームB(ネイティブ対応)**: `/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/b0969359-8e42-4135-93fb-92dbe60d4a6e/tasks/wgqpwe131.output`(実施日 2026-07-13)。recon 1本+ analysis 1本(レビュー→改訂の2段階)の構成、エージェント数4。
- **チームC(売り文句と計測の整合性監査)**: `/private/tmp/claude-501/-Users-ndw-mac-AppDevelopment-pono-asobiba-app/b0969359-8e42-4135-93fb-92dbe60d4a6e/tasks/wxtep3pmz.output`(実施日 2026-07-13)。文言監査(claims 20件)+ 整合設計(クロスレビュー critical 1/major 2/minor 1 反映済み改訂版)の構成。本書§10の素材。
- 本書はオーケストレーター(Fable)が両ワークフローの成果物を統合・矛盾解消のうえ確定した設計方針(識別子を`pono_client_id`に統一、GAS表記を`/api/e`+WAEに読み替え等)に従って執筆した。個別の事実主張のfile:line引用は、元分析が実施したソースコード確認・監査(verification)・Cloudflare公式ドキュメントのWebFetch確認に基づく。
