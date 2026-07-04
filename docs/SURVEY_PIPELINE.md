# アンケート機能 全体設計書

## このドキュメントの目的

本ドキュメントは、Pono あそびば の Early Access (¥980) launch 前に、保護者からの声を体系的に集めて 4 つの経営判断を下すための「アンケート機能」の全体設計をまとめたものである。対象読者はプロダクトオーナー (絵本作家 + 経営者)。実装の細部ではなく「なぜこの構造なのか」「どこで意思決定するか」を、いつでも読み返せる形で残す。技術面の意思決定は 2026-07-04 時点のもの。

---

## 目次

1. [アンケートの目的](#1-アンケートの目的)
2. [収集フローの 2 段階設計](#2-収集フローの-2-段階設計)
3. [質問設計 (9 問)](#3-質問設計-9-問)
4. [データ保存とスキーマ](#4-データ保存とスキーマ)
5. [Apps Script 受信層とセキュリティ](#5-apps-script-受信層とセキュリティ)
6. [UI 方針と Google Forms 不採用理由](#6-ui-方針と-google-forms-不採用理由)
7. [分析アプローチの選定](#7-分析アプローチの選定)
8. [Dashboard シート構成](#8-dashboard-シート構成)
9. [GO/HOLD 判定基準](#9-gohold-判定基準)
10. [週次運用サイクル](#10-週次運用サイクル)
11. [実装ロードマップと将来課題](#11-実装ロードマップと将来課題)
12. [用語集](#用語集)

---

## 1. アンケートの目的

Early Access ¥980 launch 前の MVP フェーズにおいて、保護者の声から次の 4 判断を下すことが本機能の存在理由である。

| # | 判断項目 | 期待するアウトプット |
| --- | --- | --- |
| 判断 1 | **EA launch GO/HOLD** | 第 9 章の 4 閾値を 4 週連続で満たせば GO |
| 判断 2 | **MVP 5 ゲームの取捨選択** | quizland / maze / oto / bento / puzzle のうち伸ばすもの・削るものの選定 |
| 判断 3 | **絵本連動の価値評価** | 次巻の同梱シールへの追加投資の妥当性 |
| 判断 4 | **保護者の価格感度** | ¥980 EA 価格の改定要否 |

> 補足: アンケートは「感想収集」ではなく「意思決定のためのデータ収集」と定義する。したがって集める項目は、この 4 判断に直結する変数だけに絞り込む。

---

## 2. 収集フローの 2 段階設計

回答負荷の高い依頼を初手で提示しないため、収集フローを 2 段階に分離する。

### 2.1 第 1 段階: モーダル (★5 段階)

- タイトル画面の「ごかんそう」ボタンから起動
- ★を 1 つ選ぶだけで即座にサーバへ送信 (匿名、fire-and-forget)
- ユーザーの体感操作は 2 秒以内
- 送信失敗は意図的にハンドリングしない (fire-and-forget)。UX の軽量化を最優先する

### 2.2 第 2 段階: survey.html (詳細 9 問)

- モーダル下部の CTA「アンケートに こたえる →」から遷移
- 9 問構成、所要 2〜3 分
- 必須は 3 問のみ (Q1/Q2/Q3)、残り 6 問は任意

> 補足: 「★を押す」だけで完了する導線を残すことで、詳細アンケートに答えない層からも定量指標 (★分布) が確保できる。GO/HOLD 判定 (第 9 章) の K1〜K3 はこの★スコアから算出する。

---

## 3. 質問設計 (9 問)

| Q# | 必須/任意 | 内容 | 形式 | 選択肢数 |
| --- | --- | --- | --- | --- |
| Q1 | 必須 | お子さんの年齢 | ラジオ | 7 (3 さい未満 / 3 / 4 / 5 / 6 / 7 以上 / 複数) |
| Q2 | 必須 | 熱中度 | ラジオ | 5 段階 |
| Q3 | 必須 | 遊びの様子から感じたこと | チェックボックス複数 | 9 (ポジ/ネガ混在) |
| Q4 | 任意 | つまづき場面 | チェックボックス複数 | 8 |
| Q5 | 任意 | 一番長く遊んだゲーム | チェックボックス複数 | MVP 5 ゲームのみ |
| Q6 | 任意 | 絵本連動の実感 | ラジオ | 4 段階 |
| Q7 | 任意 | 相対価値 (絵本 ¥1,500 比) | ラジオ | 5 段階 |
| Q8 | 任意 | 自由記述 | textarea | 500 字上限 |
| Q9 | 任意 | Early Access 招待メール | email input | — |

### 3.1 設計上の 3 つの注意点

1. **Q3 のポジ/ネガ混在**: 肯定選択肢だけを並べると「良かった項目にチェック」の同調バイアスが出る。「集中できていなかった」「途中で飽きた」等のネガ項目を意図的に混ぜて、意思表示を精緻化する。
2. **Q7 のアンカリング回避**: ¥980 を直接ぶつけると「その価格が妥当か」の是非で回答が二極化する。既存絵本 ¥1,500 との相対値で聞くことで、価格帯の中の相対位置として自然に測れる。
3. **Q9 のメール収集**: 任意入力。EA launch 時の案内リスト構築に使う。同意なしの流用はしない。

> 補足: Q1 の「複数」選択肢は、兄弟同時プレイ層を取りこぼさないための選択肢。分析時は独立カテゴリ扱いとし、単一年齢の傾向分析には含めない。

---

## 4. データ保存とスキーマ

### 4.1 保存先

Google Sheets 1 冊、3 タブ構成。

| タブ名 | 用途 |
| --- | --- |
| `staging` | 開発版 (pono-asobiba-app-staging.ndw.workers.dev) からの送信 |
| `production` | 本番 (pono-asobiba-app.ndw.workers.dev) からの送信 |
| `unknown` | 判別不能な hostname からの送信 (バケツ) |

`unknown` タブを設ける理由は、後述の hostname 判定に失敗したデータを捨てないため。分析時は無視できるが、想定外のドメインからのアクセス検知にも使える。

### 4.2 16 列スキーマ

| # | 列名 | 型 | 由来 |
| --- | --- | --- | --- |
| 1 | `timestamp` | ISO8601 | Apps Script 側で採番 |
| 2 | `environment` | staging/production/unknown | client hostname 判定 |
| 3 | `anonSid` | string (匿名 ID) | localStorage 保存の匿名識別子 |
| 4 | `starScore` | 1–5 | モーダル |
| 5 | `gameId` | string | どのゲームから起動されたか |
| 6 | `swVersion` | string | `window.PONO_SW_VERSION` |
| 7 | `playDurationSec` | number | 起動から送信までの秒数 |
| 8 | `age` | Q1 の値 | survey.html のみ |
| 9 | `engagement` | 1–5 | Q2 |
| 10 | `positiveNotes` | CSV | Q3 (多選択を CSV 連結) |
| 11 | `stumbles` | CSV | Q4 |
| 12 | `favoriteGames` | CSV | Q5 |
| 13 | `bookConnection` | 1–4 | Q6 |
| 14 | `pricePerception` | 1–5 | Q7 |
| 15 | `freeText` | string ≤500 | Q8 |
| 16 | `email` | string | Q9 |

### 4.3 二重送信抑止

同日重複送信を防ぐため、送信成功時に `pono.survey.lastSubmit.<date>` を localStorage に記録する。同日中の 2 回目送信はモーダル側でブロック (「今日はもう回答済み」表示)。意図しない連打送信を抑止する軽量ガードにとどめる (厳密な重複防止は行わない)。

---

## 5. Apps Script 受信層とセキュリティ

### 5.1 Google Apps Script Web App の役割

エンドポイント URL は 1 本。hostname 判定は **クライアント側** で行い、判定結果 (`staging` / `production` / `localhost` / `unknown`) を payload の `environment` フィールドに含めて送信する。Apps Script はその値を見てタブを振り分ける。

初回 POST 時、対象タブに列名ヘッダー行が無ければ Apps Script が自動投入する。運用者側の手作業は不要。

### 5.2 防御ライン

| 項目 | 対策 | 意図 |
| --- | --- | --- |
| payload サイズ | 32 KB 上限 | 大量ペースト・攻撃的送信の遮断 |
| フィールド別長さ | freeText 500 字、email 320 字 等 | 個別欄の異常膨張防止 |
| 同時書き込み | `LockService` で排他ロック | 複数送信が同時到着しても行が壊れないため |
| 環境値の不明値 | 拒否せず `unknown` に落とす | データ損失より観測を優先 |

> 補足: Apps Script のレート制限や CAPTCHA、CSP ヘッダの `connect-src` 追加は現時点で未対応。第 11 章末の「将来課題」で別バッチ化している。

---

## 6. UI 方針と Google Forms 不採用理由

### 6.1 モーダルと survey.html の共通ブランド

| 要素 | 仕様 |
| --- | --- |
| 背景色 | クリーム `#FFF8F0` |
| アクセント | オレンジ `#F2915A` |
| フォント | Zen Maru Gothic |
| 角丸 | 22〜28 px |
| CTA | 木製ボタン `#FFD84D` |
| survey.html ヘッダー画像 | `brand_logo.png` (横長ロゴ+キャラ) |

### 6.2 Google Forms を採用しない理由

| 観点 | Google Forms | 自前実装 |
| --- | --- | --- |
| デザイン自由度 | ほぼ無し | フルコントロール |
| 世界観との整合 | Forms UI に切り替わることで世界観の一貫性が損なわれる | Pono ブランドで一貫 |
| モバイル UX | 汎用的 | 幼児連れの片手操作に最適化可 |
| 実装コスト | 低 | 中 (許容範囲) |

> 補足: 「絵本作家が作ったアプリ」であることが CVR (回答率) に効くと判断している。Forms 遷移時点で回答者の言葉選びが変わり、自由記述の質が落ちる。その品質差はデータの質を直接下げるため、UI 内製の追加コストを飲む。

---

## 7. 分析アプローチの選定

3 案を比較し、**Approach A (Sheets ネイティブ)** を選定した。

| 案 | 中身 | 追加インフラ | 実装時間 | 月コスト | 判定 |
| --- | --- | --- | --- | --- | --- |
| **A** | Google Sheets の関数・条件付き書式・グラフで完結 | ゼロ | 13 時間 | 無料 (Gemini 採用時) | **採用** |
| B | Looker Studio で dashboard 化 | Looker 連携 | +8〜10 時間 | 無料枠 | Phase 3 で追加 |
| C | 自前 admin dashboard を Web アプリ側に実装 | Worker + DB | 40〜60 時間 | 継続コスト | 過剰投資として不採用 |

> 補足: Approach C は「投資家向けに見せられる dashboard が要る」フェーズになれば再検討する。現時点では Sheets のグラフ機能と AI 要約で意思決定に必要な粒度は満たせる。

---

## 8. Dashboard シート構成

Google Sheets 側に 6 タブを追加する。

| タブ | 内容 | 更新頻度 |
| --- | --- | --- |
| `Dashboard` | KPI 12 枚 + chart 4 種 (★分布ヒスト / favoriteGames 棒 / bookConnection × ★ 散布図 / pricePerception 円) | リアルタイム |
| `Game_DeepDive` | 5 ゲーム × Net Score (favorite − stumble) 表 | リアルタイム |
| `Trend_Weekly` | 週次 3 指標折れ線 (★平均 / engagement / N) | 週次 (月曜) |
| `Weekly_Summary` | AI (Gemini) が生成した週次要約テキスト | 週次 (月曜) |
| `Decision_Log` | ユーザーが週次判断を書き込む監査ログ | ユーザーが手動 |
| `_Helpers` | 多選択列 (positiveNotes / stumbles / favoriteGames) を `FLATTEN` 展開する内部タブ | リアルタイム |

### 8.1 Decision_Log は AI 代筆禁止

Weekly_Summary は AI が書く。一方 Decision_Log は「今週これを決めた」「なぜ決めたか」をユーザー自身が書き込む。判断責任を機械化しないための明示的な分離。

### 8.2 _Helpers タブの必要性

Q3/Q4/Q5 は CSV で 1 セルに保存される。集計時は `FLATTEN` で縦持ちに展開しないと `COUNTIF` 系関数が機能しない。この展開ロジックを Dashboard 本体に埋めるとメンテ不能になるため、専用タブに分離する。

---

## 9. GO/HOLD 判定基準

Early Access ¥980 launch を **GO** と判定する条件は以下の 4 週連続達成。

| # | 指標 | 閾値 |
| --- | --- | --- |
| K1 | 星平均 | ≥ 4.0 |
| K2 | ★4-5 の比率 | ≥ 60% |
| K3 | ★1-2 の比率 | ≤ 15% |
| K4 | 熱中度 (engagement) 平均 | ≥ 3.8 |
| N | 週次回答数 | ≥ 80 |

満たさない場合は **HOLD** = 「NO-GO」ではなく「原因特定 → 改修 → 再測定 (1 週サイクル)」ループに入る。

> 補足: 閾値は合意済み、以降動かさない。閾値変更の動機が発生した時点で、その動機自体と根拠を Decision_Log に必ず記録する (基準の恣意的な緩和を検知するため)。

---

## 10. 週次運用サイクル

### 10.1 AI 選定: Gemini 2.5 Flash (2026-07-04 確定)

| 観点 | Gemini 2.5 Flash | Claude Haiku 4.5 |
| --- | --- | --- |
| 料金 | 無料枠内 | 従量課金 |
| Apps Script 統合 | 最も簡単 (Google 純正 API) | 追加実装が要る |
| API キー管理 | 不要 (Apps Script の OAuth) | 必要 |
| 品質 | 週次要約用途では十分 | 若干高い |

Gemini を採用するが、プロンプトは AI 非依存な形で書き、呼び出し先だけ差し替えれば Claude Haiku 4.5 に乗り換え可能な構造を維持する。

### 10.2 週次デジェスト配信

毎週月曜 9:00 JST に、以下 2 系統に配信する。

- **Sheets の `Weekly_Summary` タブ** に AI 要約を書き込み
- **Gmail (自宅アドレス)** に同じ内容をメール送信

同じ内容を 2 経路に流す理由は、朝の閲覧動線が Sheets/Gmail のどちらでも成立するようにするため。

### 10.3 30 分の週次ワークフロー

| 時間 | 作業 |
| --- | --- |
| 0–2 分 | Dashboard で直観チェック (KPI 12 枚) |
| 2–7 分 | Trend_Weekly で 4 週トレンド確認 |
| 7–12 分 | Weekly_Summary の AI 要約読了 |
| 12–17 分 | ★1-2 の生行を読む (改善ヒント抽出) |
| 17–27 分 | Game_DeepDive で 5 ゲームの取捨判断 |
| 27–30 分 | Decision_Log に今週の判断を記録 |

---

## 11. 実装ロードマップと将来課題

### 11.1 実装ロードマップ

| Phase | 移行トリガ | 工数 | 内容 |
| --- | --- | --- | --- |
| Phase 1 | 今週着手 | 13 h | Sheets Dashboard 全 6 タブ + Apps Script 週次バッチ + Gmail 送信 + GO/HOLD 判定セル |
| Phase 2 | 回答 30 件到達 | 3 h | 実データで AI 要約品質を確認、KPI 閾値の微調整 |
| Phase 3 | EA launch 後 N≥100/月 | 8–10 h | Looker Studio 4 ページ dashboard + 投資家 view URL |

### 11.2 送信済み batch 履歴

| batch | 内容 | SW |
| --- | --- | --- |
| `batch:936` | 星評価 hidden POST + survey.html 新設 | v1950 → v1951 |
| `batch:937` | モーダル表示バグ修正 (CSS animation の WebKit 既知バグで opacity 固着) | v1951 → v1952 |
| `batch:938` | `swVersion` 空文字問題修正 (`window.PONO_SW_VERSION` 注入) | v1952 → v1953 |

### 11.3 将来課題 (先送り済み)

| 項目 | 理由 | 想定バッチ |
| --- | --- | --- |
| Apps Script レート制限 / CAPTCHA (DoS 対策) | サーバ側作業、Phase 1 と分離 | 別バッチ |
| CSP ヘッダに `connect-src script.google.com` 追加 | `worker.js` 改修が必要 | 別バッチ |
| ★1-3 auto-close 撤廃の幼児 UX 検討 | 実機テスト結果待ち | 別バッチ |

---

## 用語集

英字略語・アプリ固有語を優先し、一般的なビジネス用語は割愛している。

| 用語 | 説明 |
| --- | --- |
| 📘 **Early Access (EA)** | 正式版より先に有料で提供する先行公開版。本アプリでは ¥980 で launch 予定 |
| 📘 **MVP** | Minimum Viable Product。判断に必要な最小構成 |
| 📘 **GO/HOLD** | 進める / 一時停止する の 2 択判定 |
| 📘 **HOLD** | 撤退ではなく「原因特定 → 改修 → 再測定 (1 週サイクル)」ループを含意 |
| 📘 **KPI** | Key Performance Indicator。判定に使う数値指標 |
| 📘 **N** | 回答数 (Number of responses)。統計的な妥当性のしきい値に使う |
| 📘 **CVR** | Conversion Rate。起動から回答完了までの到達率。CTR (Click-Through Rate = クリック率) とは別軸で、本設計では CVR のみを追跡する |
| 📘 **anonSid** | 匿名セッション ID。localStorage に保存し、個人特定情報を含まない |
| 📘 **starScore** | モーダルの★5 段階スコア (K1–K3 の根拠データ) |
| 📘 **engagement** | 熱中度 (Q2)。K4 の根拠データ |
| 📘 **Net Score** | favorite 選択数 − stumble 選択数。ゲーム単位の総合評価 |
| 📘 **Approach A / B / C** | 分析基盤の 3 案 (Sheets ネイティブ / Looker Studio / 自前 dashboard) |
| 📘 **Apps Script** | Google が提供するサーバサイド JavaScript 実行環境。Sheets と Gmail の自動化に使う |
| 📘 **Looker Studio** | Google 提供の BI dashboard ツール。Sheets を直接参照でき、複数ページの視覚化を無料枠で構築可能。Phase 3 で採用予定 |
| 📘 **LockService** | Apps Script の排他制御 API。同時書き込みで行が壊れないようにする仕組み |
| 📘 **FLATTEN** | Sheets 関数。CSV で 1 セルに詰まった多選択回答を縦持ちに展開する |
| 📘 **fire-and-forget** | 送信して結果を確認しない通信方式。UX を軽くするため意図的に採用 |
| 📘 **hostname 判定** | クライアント側で URL のホスト名を見て `staging` / `production` / `unknown` を振り分ける処理 |
| 📘 **staging** | 開発版環境。`pono-asobiba-app-staging.ndw.workers.dev` |
| 📘 **production** | 本番環境。`pono-asobiba-app.ndw.workers.dev` |
| 📘 **unknown タブ** | hostname 判定に失敗した送信データの受け皿。データ損失回避のため設置 |
| 📘 **swVersion** | Service Worker のキャッシュ版番号。`window.PONO_SW_VERSION` で送信データに埋め込む |
| 📘 **CSP** | Content Security Policy。ブラウザに許可通信先を宣言するヘッダ |
| 📘 **connect-src** | CSP の項目。fetch/XHR の宛先ドメインを制限する |
| 📘 **CAPTCHA** | ボット遮断のための人間性テスト。将来課題 |
| 📘 **アンカリング** | 提示された数字に判断が引きずられる認知バイアス。Q7 で回避設計 |
| 📘 **肯定バイアス** | 肯定的な選択肢に票が集中する傾向。Q3 でポジ/ネガ混在にして回避 |
| 📘 **Decision_Log** | 週次判断の監査ログ。AI 代筆禁止のユーザー自筆タブ |
| 📘 **Weekly_Summary** | AI (Gemini) が生成する週次要約タブ |
| 📘 **Phase 1** | 実装段階の初期フェーズ。今週着手、工数 13 h |
| 📘 **Phase 2** | 回答 30 件到達時に移行。AI 要約品質確認と KPI 閾値微調整 |
| 📘 **Phase 3** | EA launch 後、月間 N≥100 到達時に移行。Looker Studio 導入 |

---

更新日: 2026-07-04