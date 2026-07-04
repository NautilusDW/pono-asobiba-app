# ポノのあそびば 週次アンケート運用チェックリスト

対象 SS: `1Gs79PHC8YUXGN2VpaHHH6edHH1BtfiOYvaCHxcbwXXI`
対象 Apps Script プロジェクト: doPost + `WeeklyDigest.gs`
運用開始: Phase 1 実装完了後 (`docs/SURVEY_PHASE1_IMPLEMENTATION.md` 参照)

## 1. このチェックリストの使い方

毎週月曜の朝 30 分で、前週のアンケートデータから 「今週動く / 動かない」 を決める運用手順です。Phase 1 の GO/HOLD 基準 (K1≥4.0 / K2≥60% / K3≤15% / K4≥3.8 / N≥80 / 4 週連続) に到達するまで、この手順を毎週回します。Apps Script バッチは月曜 09:00 JST に自動起動し、Weekly_Summary への行追加と Gmail 送信が 09:05 までに完了する想定です。

---

## 2. 月曜 09:00-09:30 の 30 分ワークフロー

### 全体表 (5 ステップ)

| Step | 所要 | 開くもの | 見る指標 | 判断 |
|---|---|---|---|---|
| 1 | 5 min | Gmail 受信箱 | 判定バッジ (GO/HOLD/MARGINAL) + KPI サマリ表 | 判定が変わったか? |
| 2 | 5 min | Sheets → Dashboard タブ | K1-K12 + streak (B15/C16) | 30 日 N と 7 日 N の乖離は? |
| 3 | 10 min | Weekly_Summary の K 列 (最新行) の digest 全文 | AI 生成の Action Item + 印象的発話 | 今週着手する 1 アクションは? |
| 4 | 5 min | Game_DeepDive + Trend_Weekly | Net Score 最低ゲーム / トレンド反転 | 個別対策が必要なゲームは? |
| 5 | 5 min | Decision_Log タブ | 前週の decision を再読 | 今週の decision を 1 行追記 |

**⚠️ 前提**: Apps Script バッチは 09:00 JST 起動 → 遅くとも 09:05 までに Weekly_Summary に 1 行 append され、Dashboard!C16 の streak 判定が更新されます。09:05 まで待ってから Step 2 に進んでください。09:10 過ぎても Gmail が来ない場合は §4-3 (バッチ停止) を参照。

### Step 1: Gmail を開く (5 分)

1. `[ポノのあそびば 週次] YYYY-MM-DD〜YYYY-MM-DD N=X ★avg=X.XX (GO/HOLD/MARGINAL)` のメールを開く
2. 判定バッジ (画面上部の色付き帯) を確認
   - **GO** (緑): K1-K4 + N が全て達成
   - **MARGINAL** (橙): 一部達成、K1 と N は達成
   - **HOLD** (赤): K1 または N が未達
3. KPI サマリ表の `OK/NG` を目視で走査。前週メールと比べて **NG が増えた指標** があれば priority high
4. 本文の `## 10. Action Item` セクションを読む。優先度「高」のアクションは特に注視

**判断ポイント**: 判定バッジが前週と変わっていたら (HOLD → MARGINAL、MARGINAL → GO 等)、その原因指標を必ずメモ (§3 で Decision_Log に記入)。

### Step 2: Dashboard タブを開く (5 分)

Sheets の Dashboard タブに移動:

1. **A2 の更新時刻** が本日 09:00 台であることを確認 (バッチが動いたか)
2. **C3-C7 (K1-K5 30 日集計)** と **C15 (直近 7 日 N)** を見る
   - 30 日 N と 7 日 N が大きく乖離 → プロモーション or 話題化で流入が偏っている
3. **C14 (30 日スナップショット GO/HOLD)** と **C16 (4 週連続判定)** を見る
   - C14 が GO でも C16 が HOLD → まだ streak が積み上がっていない
   - C14 が HOLD で C16 が GO → 直近悪化、要調査
4. **チャート 4 種** (★分布 / 好きなゲーム TOP10 / gameId×★平均 / 価格印象) を眺めて分布の偏りをスキャン

**判断ポイント**: C16 が **GO** かつ Weekly_Summary!J 列 (最終行) が `READY` なら **4 週連続達成**。Early Access launch 準備 (KDP 有料化、master merge、告知) の意思決定を Decision_Log に書く。

### Step 3: AI Digest 本文を読む (10 分)

Weekly_Summary タブに移動 → 最新行 (最下行) の K 列 (digestMarkdown) をクリック → セル内容を全文表示 (数式バーで展開) or Ctrl+A → 別のテキストエディタに貼付:

1. `## 1. 母集団特性` → age 分布の変化 (前週比)
2. `## 4. gameId 別評価` → 5 ゲームで一番低い ★平均のゲーム
3. `## 6. stumbles top ゲーム別` → 「原文引用」の子供の声を必ず読む (数字だけ見ない)
4. `## 9. 定性要約 → 印象的な発話 3 件` → チームで共有すべき 1 つを選ぶ
5. `## 10. Action Item` → 優先度「高」を今週の実装 sprint に組み込む
6. `## 11. GO/HOLD 判定` → 未達指標のリストを控える

**判断ポイント**: 今週の実装 sprint に 1 個だけ Action を取り込む。3 個以上詰め込むと消化不良で HOLD が続く。

### Step 4: Game_DeepDive / Trend_Weekly を確認 (5 分)

**Game_DeepDive**:
1. F 列 (Net Score) が **負の値** のゲームがあれば、その stumble を Weekly_Summary digest の該当ゲーム引用と突合
2. D 列 (平均★) が 5 ゲーム中最低のゲームを特定 → 次週 sprint 候補

**Trend_Weekly**:
1. 折れ線 (★平均 / 熱中度) が **右肩下がり 2 週連続** なら要警戒 (sw アップデートで regression 疑い)
2. N (棒グラフ) が急落 → LP 流入源の劣化を確認 (KDP QR / Amazon listing / SNS)

**判断ポイント**: Net Score 最低ゲーム or 2 週連続低下ゲームが Step 3 の Action Item と一致していれば confidence 高い、着手決定。

### Step 5: Decision_Log に 1 行追記 (5 分)

Decision_Log タブに移動 → 最下行の下に 1 行追加:

| 列 | 記入内容 |
|---|---|
| A (date) | `2026-XX-XX` (今日) |
| B (decision) | 今週の意思決定を 1 行 (例: `quizland tutorial 再構成 sprint 開始` / `GO 判定継続、様子見` / `KDP listing 準備 kickoff`) |
| C (rationale) | 根拠 (Step 1-4 で見た指標 or 発話を参照。例: `Net Score -8, quizland stumble "むずかしすぎ" 6件`) |
| D (KPI_snapshot) | 数値スナップショット (例: `7日N=62 / K1=3.9 / K2=58% / K4=3.7 / streak=0`) |
| E (next_action) | 来週までにやること (例: `sw v1400 で quizland Q1-Q3 難度下げ、次週再測定`) |

**書き方のコツ**: 3-6 ヶ月後の自分が読んで「なぜあの判断をしたか」を再現できるか、を基準に書く。「保留」だけでは足りない → 「保留、理由は N=45 で信頼区間広すぎ」まで書く。

---

## 3. 判断が発生したら何を書くか (Decision_Log 詳細)

### 6 列の定義 (再掲)

| 列 | 定義 | 記入必須 |
|---|---|---|
| A date | ISO 日付 (yyyy-MM-dd) | 必須 |
| B decision | 動詞から始まる短文。名詞句禁止 | 必須 |
| C rationale | 定量 or 定性の根拠。数字は必ず単位付き | 必須 |
| D KPI_snapshot | 7日N / K1-K4 / streak / 特筆ゲーム指標 | 必須 |
| E next_action | 期限と担当行動。「様子見」は禁止 (「N=80 到達まで運用継続」 のように条件付きで書く) | 必須 |

### 記入ルール 4 点

1. **判断がない週も 1 行書く**: 「今週は特に動かない」 も意思決定。理由 (C 列) を必ず書く
2. **数字は必ず時期を明示**: 「N=45」 でなく 「7日N=45」 or 「30日N=45」
3. **子供の声を引用する場合は原文改変禁止**: `「むずかしすぎる」6件` のように件数付きで
4. **B の decision は 1 週 1 個**: 複数の意思決定がある場合は行を分ける

### 記入例 (observe/price)

**observe (状況観察のみで動かない週)**:
```
A: 2026-07-13
B: 現状維持、次週 N=80 到達を目標に継続観察
C: 7日N=58 で GO 判定閾値未達、K1=3.9 は達成寸前だが streak 中断リスクあり
D: 7日N=58 / K1=3.9 / K2=59% / K3=13% / K4=3.7 / streak=0
E: LP 告知強化はしない (プロモ流入で母集団歪む懸念)、フォーム未回答 URL の SW toast を再確認
```

**price (価格印象の分布から意思決定)**:
```
A: 2026-08-10
B: Early Access 価格 ¥980 で launch 決定、正式版 ¥1,480 表記も併記
C: 価格印象 top が「ちょうどいい」56%、「安い」22%、「高い」8% で ¥980-1,480 レンジ確定。K1-K4 GO streak=4 達成
D: 7日N=92 / K1=4.2 / K2=68% / K3=6% / K4=4.1 / streak=4 / 価格「ちょうどいい」=56%
E: master merge (sw v1500) / KDP listing 有料化 / 買い切り¥980 launch アナウンス、正式版 ¥1,480 無料アップグレード保証明記
```

---

## 4. 数字が期待と違う時のトラブルシューティング

### 4-1. K1 (★平均) が急落した

**症状**: 先週 K1=4.1 → 今週 K1=3.5 のような 0.3 以上の低下

**想定原因**:
- (a) 直近 sw アップデートでゲーム regression (体感バグ導入)
- (b) 特定 gameId で低評価が集中 (Game_DeepDive で D 列を見る)
- (c) 母集団の age 分布が急変 (幼児が増えて難易度不一致)

**確認手順**:
1. Weekly_Summary!K の `## 4. gameId 別評価` で 5 ゲームの ★平均を確認、どのゲームが低いか
2. Trend_Weekly のグラフで前週比を確認、単発 dip か持続傾向か
3. Dashboard!C9 (最頻年齢) が前週と変わっていないか
4. Sheets の `production` タブで先週 (WEEK-1) と今週 (WEEK) の該当ゲームの ★分布を目視スキャン

**対処**:
- (a) → sw の直近 changelog (直近の commit ログ) を確認、疑わしければ roll back or hotfix
- (b) → 該当ゲームの stumble 原文を Weekly_Summary で読む、Decision_Log に「該当ゲーム sprint 開始」記入
- (c) → age フィルタで再集計。難易度ラベルの「やさしい/ふつう/むずかしい」表示がその age で適切か再検討

### 4-2. N (回答数) が伸びない

**症状**: 数週連続で 7日N < 30 のまま増えない

**想定原因**:
- (a) LP から Web app への遷移率が低い
- (b) アンケートフォームの露出タイミングが悪い (プレイ直後でなく次回起動時等)
- (c) SW toast でフォーム URL 表示していない
- (d) KDP QR / SNS 告知の効果が薄い

**確認手順**:
1. Dashboard!C7 (30 日 N) と C15 (7 日 N) の比を見る → 30 日 N/4 と 7 日 N が近ければ均等流入、乖離あれば一時的ブースト後の減衰
2. LP staging URL (`pono-asobiba-staging.ndw.workers.dev`) と本番 (`pono.kodama-no-mori.com`) のアクセス分布 (Cloudflare Analytics)
3. アンケートフォームの表示条件を `common/survey.js` (もしあれば) で grep

**対処**:
- (a) → LP の CTA (call to action) を強調、Hero 直下の 「あそぶ」 ボタンを大きく
- (b) → プレイ 3 回後 or セッション終了時にフォーム誘導トースト表示 (要実装)
- (c) → common/sw-update.js に近い形でフォーム URL toast を実装
- (d) → 巻末の QR コードが読み取りやすいか物理本で確認

### 4-3. AI 要約が破綻している (バッチ停止 or 出力空)

**症状**: 
- Gmail が来ない
- Weekly_Summary!L (errorLog) に何か書かれている
- Weekly_Summary!K (digestMarkdown) が 「## AI 要約失敗」 で始まっている

**想定原因**:
- (a) GEMINI_API_KEY 期限切れ or quota 超過
- (b) Apps Script トリガが実行失敗 (プロジェクトの実行数エラー等)
- (c) Gemini API endpoint 変更 (Google 側の breaking change)
- (d) production タブの列順が変わって集計が壊れた

**確認手順**:
1. Apps Script エディタ → 実行数 (時計アイコン隣) → runWeeklyDigest の履歴を見る
2. 失敗ログを開く。`Gemini HTTP 429` なら quota、`HTTP 400 API key not valid` なら key 期限
3. Weekly_Summary!L の errorLog 文字列で症状を絞り込む
4. `testRunWeeklyDigest` を手動再実行してエラー再現

**対処**:
- (a) → aistudio.google.com で新 key 発行、PropertiesService の GEMINI_API_KEY を更新
- (b) → トリガを削除して再作成 (時計アイコン → 該当 trigger → 削除 → 再度追加)
- (c) → WD_GEMINI_ENDPOINT の URL を Gemini API 最新ドキュメントで確認、model 名 (`gemini-2.5-flash`) が現行か
- (d) → production!A1:P1 のヘッダ順が Apps Script の WD_COL 定数と一致するか目視。不一致なら Apps Script 側を修正
- どの場合も、Weekly_Summary!K に定量部分は残っているので、当週の判断は Dashboard + 定量セクションで実行可能

### 4-4. GO カウンタが 3 で停止する (4 週連続に届かない)

**症状**: Weekly_Summary!I (streakCount) が 3 まで積み上がったが翌週 0 にリセット

**想定原因**:
- (a) 週次の 1 指標だけ閾値割れ (例: K3 が 15% → 17% でリセット)
- (b) 母集団の質が変わって特定指標が変動 (シーズナリティ)
- (c) 直近 sw アップデートで小さな regression

**確認手順**:
1. Weekly_Summary の直近 4 行を並べて H (goHoldStatus) と C-G (5 指標) の推移を見る
2. どの指標が閾値を割ったか特定 (`GO → GO → GO → MARGINAL → 0` の遷移で MARGINAL 週の未達指標)
3. その週の Gemini digest (K 列) の `## 11. GO/HOLD 判定` セクションで未達指標名を再確認

**対処**:
- (a) 未達指標に対応する Action を Decision_Log に記入、翌週再測定
- (b) age 分布や流入源の変化を確認、必要なら閾値見直しの議題を Decision_Log で提起 (ただし閾値は変更禁止、§5 参照)
- (c) 直近 sw commit を確認、疑わしければ roll back

### 4-5. favorite と stumble が同じゲームで重複している

**症状**: Game_DeepDive で favorite_N と stumble_N が両方大きい (例: quizland: favorite=15, stumble=12)

**想定原因**:
- (a) そのゲームが「面白いが難しい」で愛憎混在
- (b) ユーザーが「favoriteGames」と「stumbles」の意味を混同してフォームに書いている
- (c) フォームの選択肢配置が近すぎて誤選択

**確認手順**:
1. Weekly_Summary!K の `## 5. favoriteGames Net Score` と `## 6. stumbles top ゲーム別` の原文引用を突合
2. 同じ子供 (anonSid) が両方に該当ゲームを書いていないか production タブで anonSid + gameId を軸に集計
3. Web app のフォーム UI で favoriteGames と stumbles の位置関係・ラベル文言を確認

**対処**:
- (a) 難易度調整 sprint (該当ゲームの Q1-Q3 or ステージ 1-3 の難度下げ)
- (b) フォームのラベル文言を明確化 (例: 「一番楽しかったゲーム」 vs 「うまくいかなかったゲーム」)
- (c) フォーム UI 改修、選択肢間に余白追加

---

## 5. 触っちゃいけない場所

以下は運用中に触ると Phase 1 のゴール設計が崩れます。**変更する前に必ず 1 週間の観察期間を挟む**、または相談すること。

### 5-1. GO/HOLD 閾値 (5 個)

- **K1_STAR_AVG = 4.0**
- **K2_HIGH_RATIO = 0.60**
- **K3_LOW_RATIO = 0.15**
- **K4_ENGAGE_AVG = 3.8**
- **N_MIN = 80**
- **STREAK_WEEKS = 4**

これらは Phase 1 の意思決定基準として `SURVEY_PIPELINE.md` で合意済み。動かすと過去の Decision_Log との整合が取れなくなります。閾値変更の議論をしたい場合は Decision_Log に「閾値見直し議題」として記録し、翌週まで実装しない。

### 5-2. Apps Script トリガ + 定数

- **`WD_SHEET_ID`**: SS を移動しない限り変更しない
- **`WD_SUMMARY_HEADERS` の 12 列順**: Sheets 側 Weekly_Summary の A1:L1 と厳密一致必須
- **`WD_COL` (16 列 index)**: production タブの列順を反映、フォーム側の doPost と整合
- **トリガ (毎週月曜 09:00-10:00 JST)**: 曜日変更禁止 (Decision_Log の書式が「月曜」前提)

### 5-3. `_Helpers` タブ / production 生データ

- **`_Helpers` タブ**: 数式を編集すると Dashboard / Game_DeepDive が連鎖破壊。**非表示** にしてある理由がこれ
- **production 生データ**: 手動で行を追加・削除しない。フォーム経由の append のみ許可。手動編集が必要な場合は、対象行の環境列を `manual_edit_YYYYMMDD` に変更してから

---

## 6. 困った時の相談先 (Claude Code プロンプトテンプレ)

### 6-1. AI 要約が意図しない内容を出した時

```
ポノのあそびば 週次 digest で意図しない出力が出た。詳細:

- 週: 2026-XX-XX 〜 YY-ZZ
- 期待していない出力箇所: (例) Action Item セクションが 「無料 launch を検討」 と書いた
- 実際の該当セクション全文 (Weekly_Summary!K からコピペ):
  ```
  ## 10. Action Item
  1. ...
  ```
- 定量スナップショット: 7日N=X / K1=Y.YY / K2=Z% / K3=A% / K4=B.BB / streak=C

Gemini プロンプト (WeeklyDigest.gs の buildDigestPrompt_) に:
1. どういう禁則を追加すべきか
2. または outputs の post-processing でフィルタすべきか
提案してください。
```

### 6-2. 週次バッチが停止した時

```
ポノのあそびば 週次バッチが停止した。

- 症状: (例) Gmail が届かない / Weekly_Summary に行 append なし
- 実行数タブのエラーメッセージ: (Apps Script → 実行数 → 該当行 → エラー全文コピペ)
- Weekly_Summary!L (errorLog) の内容: (直近行の L 列コピペ or 「空」)
- 直近 changelog: (Apps Script 側で直近触ったコード or 「触っていない」)

以下を判断してください:
1. 一時的障害 (翌週まで放置で OK) か
2. 手動再実行で復旧可能か (testRunWeeklyDigest 実行)
3. コード修正必要か (該当箇所提示)
4. Google 側の breaking change 可能性 (Gemini endpoint / MailApp quota)
```

### 6-3. 数値解釈で迷った時

```
ポノのあそびば 週次 KPI の解釈で迷っている。

現況:
- 7日N=XX, 30日N=YY
- K1=A.AA, K2=B%, K3=C%, K4=D.DD, streak=E
- Game_DeepDive: 特筆ゲーム (Net Score / ★平均) …
- Trend_Weekly: 直近 3 週の推移 …
- 印象的発話 (Weekly_Summary!K digest からコピペ 3 件)

私の仮説: (例) 「quizland の難易度が高すぎる」
判断迷い: (例) 「sprint を quizland に振るか、母集団拡大 (LP 改修) を優先するか」

以下を評価してください:
1. 私の仮説を支持する / 反証する定量根拠
2. 別の仮説候補 (数字から読める代替解釈)
3. Decision_Log に書くべき decision の 3 案
```

---

## 7. 補足: 週次以外のタイミング

- **月次 (第 1 月曜)**: Weekly_Summary の直近 4 行を横並びで見て、月間トレンドを Decision_Log に summary 追記
- **四半期 (3 ヶ月ごと)**: SURVEY_PIPELINE.md の閾値見直し議論 (実装は次期 Phase で)
- **GO 4 週連続達成時**: Early Access launch 準備の kickoff Decision_Log 記入 → master merge + KDP 有料化 + 買い切り¥980 告知
- **sw アップデート直後**: 翌週の K1 変動を必ず確認 (regression 検知)