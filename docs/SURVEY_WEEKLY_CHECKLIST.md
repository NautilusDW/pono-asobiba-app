# アンケート週次運用チェックリスト

## このチェックリストの使い方

毎週月曜 09:00 JST に Gmail 宛へ届く週次 digest を起点に、30 分で週次の意思決定を完了させるための参照ドキュメントである。上から順に本書だけを開けば、Google Sheets への遷移・KPI 確認・Decision_Log 記入・トラブル判別まで一貫して処理できる構成にした。対象は Phase 1 実装 (production tab のみ集計、AI 要約 = Gemini 2.5 Flash、配信 = Sheets Weekly_Summary + Gmail) を前提とする。

---

## 目次

1. [月曜 09:00-09:30 の 30 分ワークフロー](#1-月曜-0900-0930-の-30-分ワークフロー)
2. [判断が発生したら何を書くか](#2-判断が発生したら何を書くか)
3. [数字が期待と違う時のトラブルシューティング](#3-数字が期待と違う時のトラブルシューティング)
4. [触っちゃいけない場所](#4-触っちゃいけない場所)
5. [困った時の相談先](#5-困った時の相談先)

---

## 1. 月曜 09:00-09:30 の 30 分ワークフロー

digest メールの受信を起点に、以下 5 ステップを順番に実施する。各ステップの所要時間はスキップせず守ること (時間内に終わらなくても、次のステップに移った上で残りは後日にまわす)。

| Step | 所要 | 開くもの | 見る指標 | 判断 |
| --- | --- | --- | --- | --- |
| 1 | 5 分 | Gmail digest | 4 閾値 (K1-K4) と N の週次値 | GO/HOLD カウンタが進んだか止まったか |
| 2 | 8 分 | Sheets `Dashboard` | KPI 12 と chart 4 の全景 | 前週比で大きく動いた指標があるか |
| 3 | 7 分 | Sheets `Game_DeepDive` + `Trend_Weekly` | ゲーム別 Net Score / 週次 3 指標の折れ線 | どの MVP 5 ゲームが伸び/落ちたか |
| 4 | 7 分 | Sheets `Weekly_Summary` | AI 要約の定性ブロック (positive/課題/引用) と Action Item | 今週の action を 1-3 件確定 |
| 5 | 3 分 | Sheets `Decision_Log` | 手記追記 | 判断内容 + 理由 + 次週の観察点を記録 |

### 1.1 Step 1: Gmail digest で GO/HOLD カウンタを確認 (5 分)

digest 冒頭の GO/HOLD ブロックに、以下の 5 値が並ぶ。

| 指標 | 閾値 | 現在値の読み方 |
| --- | --- | --- |
| K1 星平均 | ≥ 4.0 | 4.0 未満なら「不達」表示 |
| K2 ★4-5 比率 | ≥ 60% | 比率と分母 (N) が併記される |
| K3 ★1-2 比率 | ≤ 15% | 上限 15% を超えると「不達」 |
| K4 熱中度平均 | ≥ 3.8 | 熱中度 = Q2 の 5 段階回答平均 |
| N | ≥ 80 | 4 週連続 N ≥ 80 が必要 |

- 5 指標すべてが閾値を満たせば、「4 週連続カウンタ」が +1 進む
- 1 つでも不達なら、カウンタは 0 にリセットされる
- カウンタ = 4 に到達した週が、判断 1 (EA launch GO) の発火条件

Step 1 での判断はここで完結する。「今週カウンタが進んだか」「N が 80 に届かなかったか」の 2 点だけ確認して次へ進む。

### 1.2 Step 2: Dashboard で 12 KPI の全景を眺める (8 分)

Sheets を開き `Dashboard` タブに直行する。KPI 12 は以下 4 群に分かれている。

| 群 | KPI |
| --- | --- |
| 母集団 | 総回答数 N / 週次 N / 年齢分布上位 3 帯 |
| 星スコア | K1 平均 / K2 比率 / K3 比率 |
| 熱中度 | K4 平均 / 熱中度 ★5 比率 |
| 絵本・価格 | bookConnection ポジ比率 / pricePerception 「安い」比率 / pricePerception 「高い」比率 |

- 前週比セル (右列) を優先して見る。±5% 以内は誤差、±10% 超は異常シグナルとして Step 4 で AI 要約から原因を探る
- chart 4 (星分布 / 熱中度分布 / ゲーム別 Net Score / 週次 N 推移) はスクロールで一望する
- 「前週比で異常な指標を 1 つ選ぶ」ことをここで意識する。異常なしなら Step 3 へ

### 1.3 Step 3: Game_DeepDive と Trend_Weekly でゲーム単位の変化を追う (7 分)

MVP 5 ゲーム (quizland / maze / oto / bento / puzzle) の Net Score を確認する。

- `Game_DeepDive` タブに 5 行並ぶ。各行の Net Score = favoriteGames 選択率 − stumbles 選択率
- Net Score が前週比 −0.1 以上下落したゲームがあれば、その game_id を頭に留めて Step 4 の AI 要約で照合する
- `Trend_Weekly` の折れ線 3 本 (K1 / K4 / Net Score 上位ゲーム) で 4 週トレンドを俯瞰する
- 「1 週のブレ」か「3 週以上の下降」かを判別する。前者は放置、後者は判断 2 (ゲーム取捨選択) の材料

### 1.4 Step 4: Weekly_Summary で AI 要約から Action Item を確定 (7 分)

`Weekly_Summary` タブは Apps Script 週次バッチが月曜 08:30 頃に自動で書き込む。以下 10 セクションが縦に並ぶ。

1. 母集団特性 (age 分布)
2. 星スコア分布 (K1-K3)
3. engagement 分布 (K4)
4. gameId 別評価
5. favoriteGames Net Score
6. stumbles top (ゲーム別)
7. pricePerception 分布
8. bookConnection 分布
9. 定性要約 (freeText): positive top3 + 課題 top3 + 印象的な発話 3 件 (原文引用)
10. Action Item (優先度順) + GO/HOLD 判定 + 4 週連続カウント

- Step 2/3 で目についた異常指標があれば、9 の定性要約と 6 の stumbles top を照合して原因仮説を立てる
- 10 の Action Item は 3-5 件出てくる。今週着手するものを 1-3 件に絞る (3 件を超えると翌週に持ち越される)
- 引用は「印象的な発話 3 件」の原文をそのまま Decision_Log に貼れるよう控えておく

### 1.5 Step 5: Decision_Log に手記を追記 (3 分)

判断が発生した週は必ず 1 行残す。判断がなかった週も「観察のみ、次週継続」で 1 行残す (空白週を作らない)。書式は次章 2 節を参照。

---

## 2. 判断が発生したら何を書くか

`Decision_Log` は判断の再現性を担保するための手記であり、後から「なぜその時こう決めたか」を追える形にする。列構成は以下。

| 列 | 内容 |
| --- | --- |
| date | 記入日 (YYYY-MM-DD) |
| week | 対象週 (例: 2026-W28) |
| category | 判断カテゴリ (launch / game / book / price / observe) |
| decision | 判断内容 (1 文で完結) |
| rationale | 根拠となった数字 + 引用 (2-3 文) |
| next_watch | 次週の観察点 (1 文) |

### 2.1 記入ルール

- 判断カテゴリは 5 種類のみ (launch / game / book / price / observe)。それ以外を作らない
- rationale には「KPI の数値 + AI 要約の原文引用」を最低 1 つずつ含める。数字だけ・引用だけは不可
- 判断を先送りした場合も observe カテゴリで残す。判断していない事実自体が意思決定である
- 過去行を書き換えない。訂正が必要な場合は新しい行として追記する

### 2.2 記入例 1: ゲーム取捨選択の観察

| 列 | 内容 |
| --- | --- |
| date | 2026-07-13 |
| week | 2026-W28 |
| category | observe |
| decision | oto の Net Score 低下は 1 週様子見。次週も低下なら Q3 課題選択肢の内訳を精査 |
| rationale | oto Net Score が 0.32→0.18 (−0.14)、stumbles top に「音が小さくて聞き取れない」が 4 件。K1 は 4.1 で維持されているため即断は避ける |
| next_watch | 2026-W29 の oto Net Score と stumbles「音」系選択率 |

### 2.3 記入例 2: 価格改定の判断

| 列 | 内容 |
| --- | --- |
| date | 2026-07-27 |
| week | 2026-W30 |
| category | price |
| decision | ¥980 EA 価格は維持。改定なし |
| rationale | pricePerception「安い」比率 42%、「高い」比率 11%。定性引用「絵本と合わせて考えたら妥当」複数件。K1 = 4.2 で品質評価も安定 |
| next_watch | 8 月中旬の N 累計と、無料期待コメントの推移 |

---

## 3. 数字が期待と違う時のトラブルシューティング

以下 5 ケースは頻出する。判断を焦らず、原因の切り分けを先に行うこと。

### 3.1 星平均 (K1) が前週比で急落した

- まず `Dashboard` の週次 N を見る。N < 20 の週は 1 件の低評価で K1 が 0.3 以上動く。統計ノイズの可能性が高い
- N ≥ 30 で K1 が 0.3 以上下がっていれば `Weekly_Summary` の定性要約と gameId 別評価を確認
- 特定ゲームの Net Score が同時に落ちていれば、そのゲーム側の不具合または新規流入層の期待ミスマッチを疑う
- Decision_Log は observe で 1 行残し、次週まで判断保留

### 3.2 N が伸びない (週次 N < 20 が続く)

- LP 経由の流入自体が減っているのか、遊んでいるが回答していないのかを分ける
- 前者なら production の総 anonSid 数 (Sheets の生タブでカウント) を確認、集客側の問題として切り出す
- 後者なら survey.html への CTA (タイトル画面「ごかんそう」ボタン) が正常に出ているか実機で確認する
- Phase 1 では N < 20 の週は AI 要約の精度も落ちる。無理に GO 判定に使わない

### 3.3 AI 要約が意味不明・的外れ

- Gemini 2.5 Flash はサンプル数が少ないと「印象的な発話」を機械的に選ぶ傾向がある
- `Weekly_Summary` の N を確認し、N < 30 の週の定性要約は参考程度に扱う
- 3 週連続で要約品質が悪い場合は、Apps Script のプロンプトを見直す (第 5 章 5.1 の相談先へ)
- 要約が空欄の週は Apps Script トリガの実行ログを確認 (第 4 章 4.2)

### 3.4 GO/HOLD の 4 週連続カウンタが 3 で止まる

- Phase 1 の想定挙動である。過剰反応しない
- カウンタが 3→0 にリセットされる週があれば、リセット原因の指標 (K1-K4/N のどれか) を Decision_Log の observe に必ず残す
- 3 週連続でリセットが繰り返される場合は、閾値ではなく MVP 自体の見直しが必要になる可能性を想定する

### 3.5 favoriteGames と stumbles が同じゲームで両方 top に来る

- 熱中しているが同時につまずいてもいる、という「熱中系難所」のシグナル
- 直ちに削るのではなく、tuning 対象として Decision_Log に game カテゴリで 1 行残す
- Net Score 単独で判断せず、K4 (熱中度平均) と併せて評価する

---

## 4. 触っちゃいけない場所

以下 3 領域は運用中に触らない。触ると週次サイクルが崩壊するか、過去データとの整合性が失われる。

### 4.1 GO/HOLD 閾値 (K1 ≥ 4.0 / K2 ≥ 60% / K3 ≤ 15% / K4 ≥ 3.8 / N ≥ 80)

- 4 週連続の観測期間中に閾値を動かすと、それまでの週次判定が意味を失う
- 閾値の変更は EA launch 判断後 (= 判断 1 が確定した後) のみに限定する
- 「近い数値だから通してよいか」の判断も行わない。1 つでも不達なら不達

### 4.2 Apps Script トリガと定数

- Web App URL (`https://script.google.com/macros/s/AKfycbwAHRy0UyHRCktZdxpQEgUHj7jEuHA49lb6t5HgckVmYogQTDdB4AlRhT99rp94U4hLhA/exec`) は再デプロイで変わる。触らない
- 定数 SHEET_ID (`1Gs79PHC8YUXGN2VpaHHH6edHH1BtfiOYvaCHxcbwXXI`) と HEADERS (16 列) は既存 doPost が依存している。変更は Phase 2 まで凍結
- 週次バッチのトリガ (毎週月曜 08:30 頃実行) の時刻を勝手に動かさない。digest 到着時刻 09:00 に合わなくなる

### 4.3 `_Helpers` タブと production tab の生データ

- `_Helpers` は FLATTEN 展開を担う内部シート。数式を触ると `Dashboard` / `Game_DeepDive` / `Trend_Weekly` が全部連鎖破損する
- production tab の行を手動で削除・並び替えしない。anonSid の追跡と週次集計が壊れる
- 誤送信や test データを除外したい場合は、production の行を削除せず、フィルタ列を別途足すことで対処する (Phase 2 で対応予定)

---

## 5. 困った時の相談先

Phase 1 実装で不具合や疑問が出た場合、以下 3 種のプロンプトテンプレを Claude Code に投げる。テンプレは丸ごとコピーして状況の 1 行だけ差し替えて使う。

### 5.1 AI 要約の品質が落ちた時

```
Weekly_Summary の AI 要約が [ 症状を 1 行 ] という状態。
Sheet ID = 1Gs79PHC8YUXGN2VpaHHH6edHH1BtfiOYvaCHxcbwXXI
対象週の N と K1-K4 の値、および Apps Script の週次バッチ実行ログを確認して、
プロンプト側の問題かサンプル数の問題かを切り分けてください。
必要ならプロンプト修正案を出してください。
```

### 5.2 週次バッチが動かなかった時

```
月曜 09:00 に Gmail digest が届かなかった。
Apps Script プロジェクトの週次トリガ実行ログを確認して、
- doPost 側 (受信) は動いているか
- 週次バッチ側 (Weekly_Summary 書込 + Gmail 送信) の失敗理由
を報告してください。
Sheet ID = 1Gs79PHC8YUXGN2VpaHHH6edHH1BtfiOYvaCHxcbwXXI
```

### 5.3 数字の解釈に迷った時

```
2026-W[週番号] の Dashboard で [ 指標名 ] が [ 前週比 ] 動いた。
Weekly_Summary の定性要約と Game_DeepDive の Net Score を突き合わせて、
- 統計ノイズ (N < 30)
- 特定ゲームの品質シグナル
- 母集団の変化 (age 分布シフト)
のどれが最も妥当な解釈か、Decision_Log に書くべきカテゴリ (launch/game/book/price/observe) と併せて 1 案出してください。
```

---

## 補足

- 本ドキュメントは Phase 1 (production tab のみ集計) を前提とする。Phase 2 でフィルタ列や複数環境併合を導入する際は本書を改訂する
- 週次サイクル運用開始 4 週目までに、実際の運用感覚と本書のズレを 1 回洗い出す (Decision_Log の observe に「本書改訂候補」として記す)
- Gemini 2.5 Flash の応答フォーマットが変わった場合、`Weekly_Summary` の 10 セクション構成が崩れる。第 3 章 3.3 の判定基準に沿って早期に検出する
