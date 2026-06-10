# ポノあそびば 価格戦略ドキュメント

> **このドキュメントの位置づけ**: ポノあそびば(個人開発・未就学児〜小学校低学年向けWeb/PWA知育アプリ)を iOS / Android のネイティブアプリとしてストア配信する際の、価格・セール・プロモーション・価格改定すべての社内意思決定資料。今後の値付け判断はこのドキュメントを起点に行う。
>
> **最終更新日**: 2026-06-11
> **作成者**: 個人開発者(日本居住・免税事業者)
> **根拠調査の概要**: (1) 買い切り型モデル成立条件の海外/日本事例25件以上の深掘り、(2) iOS App Store 価格・セール機構の Apple Developer 一次情報確認、(3) Google Play 価格・セール機構の support.google.com 一次情報確認、(4) アプリ/SaaS 価格改定事例(Figma/Notion/1Password/iPhone 値下げ事件等)と日本の改正景品表示法(2024年10月施行)の整理、(5) 日本の月別販促タイミングの調査。各観点について別途「検証(verification)」フェーズを通し、誤情報・古い情報・推測値を切り分けたうえで本書に反映している。

---

## 0. 結論サマリ (1ページで読める要約)

### 推奨価格(3案)

| 案 | 価格(税込) | 立ち位置 | 推奨度 |
|---|---|---|---|
| A | **¥980** | お試しやすい入り口価格 | △ |
| B | **¥1,480** | 品質訴求・推奨案 | ◎ |
| C | **¥1,980** | プレミアム位置・年額視野 | ○ |

### フェーズ別ロードマップ

1. **リリース時(0-3ヶ月)**: 買い切り ¥1,480 単発、セールゼロ
2. **3-6ヶ月**: 季節パック / シーズンパス ¥600 を追加(本体価格はそのまま)
3. **1年後**: 年額 ¥1,980 サブスクを追加投入(買い切り版は併売継続)、Tinybop / Pango 型の三層共存モデルへ
4. **3-5年後**: シリーズ第2作・第3作を出して横展開(Endless 方式)
5. **5-7年後**: 限界が見えたらサブスク主軸へ移行検討(Toca Boca / Sago Mini / Dr.Panda 型)。移行時は既存購入者へ永続無料アクセス保証

### 絶対NG(リリース1年以内)

- **50%超のセールを打つこと**(「待てば下がる」アンカー定着 → 定価販売消滅)
- **元値を表示する形での二重価格セール**(改正景品表示法 8週間ルール違反リスク・直罰100万円以下)
- **既存ステージを後から有料パック化**(Figma 型の信頼破壊)
- **短期間(同年内)の二度値上げ**(Notion 型の信頼破壊)
- **後出しサブスク化(買い切り購入者を放置)**(Pango / Toca は移行時に永続アクセス保証を必ず付けた)
- **3月25日〜4月7日のリリース**(進研ゼミ4月号と真っ向衝突)

### iOS / Android 着金額一覧表(Small Business Program 15%手数料・日本居住免税事業者)

| 表示価格 | プラットフォーム手数料(15%) | 開発者受取(円) | 備考 |
|---|---|---|---|
| ¥980 | ¥147 | **約 ¥833** | 免税事業者のため消費税分は実質受取(¥980÷1.10×0.85 ≒ ¥757 が課税事業者換算) |
| ¥1,480 | ¥222 | **約 ¥1,258** | 推奨案 |
| ¥1,980 | ¥297 | **約 ¥1,683** | プレミアム |
| ¥600(シーズンパス) | ¥90 | **約 ¥510** | |
| ¥1,980(年額サブスク) | ¥222(1年目)〜 | 1年目 ¥1,258 / 2年目以降 ¥1,683(15% → 旧 Auto-Renewable 30%→1年経過後15%が iOS の標準) | 注: Small Business Program 適用なら初年度から15% |

> **注記**: 免税事業者である限り消費税分は手元に残るが、年間売上が 1,000 万円を超えた瞬間に課税事業者化が必要(インボイス含む)。¥1,480 × 約 6,800 本/年 で 1,000 万円ライン到達。これを意識した経理体制を初年度から準備しておく。

---

## 1. 市場相場(2026年6月時点・検証済み)

### 海外と日本の競合価格表

| アプリ | 開発元 | 課金モデル | 価格(2026年6月時点) | 確度 |
|---|---|---|---|---|
| **Endless Alphabet** | Originator | Free DL + 一括 IAP | 段階解放、Endless Numbers IAP $6.99 / $14.99 / $11.99 | 高(Educational App Store) |
| **Tinybop The Human Body** | Tinybop | 買い切り + 年額横断サブスク | 個別 $3.99、Explorer's Pass 年 $9.99 | 高(Tinybop公式) |
| **Slice Fractions** | Ululab | 純買い切り(無広告無IAP) | $3.99-$5.99、School Edition $5.99 | 高(Ululab公式) |
| **LOOPIMAL / BANDIMAL** | YATATOY | 純買い切り | 各 $3.99-$4.99 | 高(App Store) |
| **Monument Valley(参考)** | ustwo | 買い切り + DLC | $3.99-$4.99 + DLC $1.99 | 高(GameDeveloper.com) |
| **Pok Pok Playroom** | Pok Pok | サブスク | 月 $3.99 / Lifetime $49.99 | 高 |
| **Sago Mini / Toca Boca → Piknik** | Spin Master | サブスク統合 | Piknik 月 $11.99 | 高(Spin Master公式) |
| **Kiddopia** | Paper Boat Apps | サブスク | 月 $12.99 / 年 $79.99(古いソースに $7.99 表記あり、現行は $12.99 主) | 中-高 |
| **タッチ!あそベビー** | WAO CORPORATION | 買い切り(複数遊びパック+無料お試し) | 数百〜千円台、シリーズ累計 22M DL(2025年12月) | 高(ワオっち!公式) |
| **あそんでまなべる 日本地図パズル** | Digital Gene | 買い切り | 数百円〜 | 高 |
| **おやこでリズムえほん**シリーズ | Smart Education | 買い切り or 無料DL+楽曲IAP | アプリにより異なる | 中-高 |
| **すみっコぐらし**系教育アプリ | サンエックス系 | サブスク | 月 ¥480 前後 | 中 |
| **シンクシンク** | Wonderfy | フリーミアム + サブスク | 無料コース + プレミアム 月 ¥980 | 高 |
| **トドさんすう** | Enuma | 1年買い切り + 月額サブスク併存 | 1年プラン ≒ ¥8,800(2年プランは2024年6月終了) | 高 |
| **ワンダーボックス** | ワンダーラボ | サブスク(教材付き) | 月 ¥3,700〜 | 高 |
| **Peekaboo Barn** | Night & Day Studios | 純買い切り(2008年〜) | $1.99 前後、18年ロングテール | 高 |

### 重要トレンド(2024-2026)

1. **教育アプリ市場における買い切り(one-time purchase)比率が 2023年 6% → 2024年 17% へ急上昇**(Adapty ベンチマーク)。サブスク疲れの反動として買い切りが再評価されている。
2. **大手は買い切り → サブスクへ移行が完了**: Toca Boca(2018-2024)、Sago Mini、Dr.Panda、Pango、Fiete、DragonBox。一方で **Tinybop / YATATOY / Slice Fractions / Peekaboo Barn / WAO っち!** は純買い切りで10年以上現役。
3. **日本市場では「買い切り=安心」「サブスクは嫌い」のカルチャーが SNS / 口コミで顕在化**(Togetter等)。日本主軸なら買い切りは合理的選択。
4. **個人開発者の現実的売上レンジ**: 純買い切り型子供/教育アプリで月 $1k-$5k(年 180万-900万円)が中央値。月 $10k 超は強いブランド/シリーズ化が必要。Monument Valley / Endless Alphabet は例外。
5. **出口戦略の前例**: DragonBox → Kahoot $18M(2019)、Originator → Spin Master $29M(2021)。シリーズで10-20本のIP、累計DL数百万を達成すれば現実的に視野。Toca Boca / Sago Mini の Spin Master 買収額は**公開されていない**(過去資料の "$24M+" は典拠不明・要削除)。

---

## 2. 買い切り型モデルの深掘り 【今回追加・最重要】

### 2.1 買い切り型が「今でも」成立する5条件

| # | 条件 | 代表事例 |
|---|---|---|
| 1 | **無広告・無サブスク・無データ収集を明確に売る** | Peekaboo Barn / タッチ!あそベビー / YATATOY |
| 2 | **IAPで実質単価を$5-$15に積む(初期は無料 or 安価で入る)** | Endless Alphabet / Endless Numbers |
| 3 | **シリーズ化と既存IPの横展開でCAC回収を分散** | Tinybop / Originator / Smart Education |
| 4 | **教育機関 / School Edition で B2B 売り上げ追加** | Slice Fractions / Endless Wordplay |
| 5 | **親の「買って終わり・子に残してあげたい」感情に訴求** | 日本市場で特に有効・タッチ!あそベビー / Digital Gene |

> **ポノへの示唆**: 5項目を全て揃えれば、日本市場で月 50-200万円、海外含め月 100-500万円は射程圏内(推測)。最低でも (1)(3)(5) は必ず満たす設計にする。

### 2.2 海外/日本の長寿買い切りアプリ事例(主要 12 件)

| アプリ | リリース | 価格(2026年時点) | モデル | 学び |
|---|---|---|---|---|
| **Endless Alphabet** | 2013 | Free DL + IAP段階解放 | フリーミアム+IAP | "無料お試し→一括IAPで全解放"はストアで自然に通る。シリーズ化(Reader/Numbers/Spanish/Wordplay)で横展開 |
| **Toca Boca初期 3作** | 2011 | $0.99-$2.99(当時) | 純買い切り | 5年で累計 140M DL(全32アプリ)、頂点でサブスク移行 |
| **Tinybop The Human Body** | 2013 | $3.99 + 年 $9.99 横断サブスク | 三層共存 | バンドル(Tinybop Collection 1-10)も併売 |
| **DragonBox Algebra 5+** | 2012 | 旧 $4.99-$9.99 | 純買い切り→Kahoot傘下 | ニッチ学習でも $5-$10 で $18M 買収 |
| **Monument Valley** | 2014 | $3.99-$4.99 + DLC $1.99 | プレミアム単発 | 2年で $14.4M 売上、子供向けではないが象徴例 |
| **Slice Fractions** | 2014 | $3.99-$5.99、School Edition $5.99 | 純買い切り(IAP/広告ゼロ) | Apple Editor's Choice + Parents' Choice Gold、B2C+B2B 二本立て |
| **LOOPIMAL / BANDIMAL** | 2015-2017 | $3.99-$4.99 | 純買い切り | 個人スタジオ × 極小ラインナップ × 芸術的品質でロングテール |
| **Peekaboo Barn** | 2008 | $1.99 前後 | 純買い切り | リリース 18 年経過後もストア継続。"何も足さない"を売る究極形 |
| **タッチ!あそベビー** | 2013 | 買い切り(複数パック) | 無料お試し + 買い切り | シリーズ累計 22M DL(2025/12時点)、日本買い切りの代表 |
| **あそんでまなべる 日本地図パズル** | 2012 | 数百円〜 | 純買い切り | 14年現役、学校教科直結テーマ × シリーズ化 |
| **おやこでリズムえほん**シリーズ | 2012 | 買い切り or IAP楽曲解放 | ハイブリッド | 童謡/Eテレ等の既存IPと組合せ |
| **トドさんすう** | 2014 | 1年プラン ≒ ¥8,800 + 月額サブスク併存 | 期間買い切り | 「完全サブスク移行」と誤解されがちだが、実は買い切り併存。日本買い切り事例として加算可 |

### 2.3 単独買い切り vs シリーズ買い切り の構造比較

| 観点 | 単独買い切り(Monument Valley / Slice Fractions / LOOPIMAL) | シリーズ買い切り(Endless系 / Tinybop / タッチ!あそベビー / Digital Gene) |
|---|---|---|
| 必要品質 | 1作で完結する濃い体験 | 世界観確立→低コストで続編量産 |
| 当たり外れ | 大きい(MV は $14M 超、外れると数百万) | 小さい(累積で勝つ) |
| 開発期間 | 長い(年単位) | 1作目以降は短縮可 |
| 初動売上 | 大きい(賞・話題性次第) | 小さいが累積で勝つ |
| クロスセル | なし | あり(バンドル販売でLTV上昇) |
| リスク分散 | 低い | 高い |
| **ポノの推奨** | × | **◎(個人開発・小チームに最適)** |

### 2.4 個人開発者が現実的に狙える年商レンジ(参考値)

| レンジ | 月商目安 | 年商目安 | 必要条件 |
|---|---|---|---|
| 入門 | $1k-$5k | 約 180万-900万円 | 1作リリース + 並程度の品質・露出 |
| 中堅 | $5k-$10k | 約 900万-1,800万円 | シリーズ2-3作 + Apple Editor's Choice 等獲得 |
| 上級 | $10k-$50k+ | 約 1,800万-9,000万円 | 強ブランド + シリーズ化 + 海外展開 |
| 例外的ヒット | $100k+ | 1億円超 | Monument Valley / Endless Alphabet 級。再現性低い |

> **ポノの目標設定**: 1-2年目で月 10-30万円、3-5年目で月 50-200万円(シリーズ化が進めば)。YATATOY / Slice Fractions レベル(年 600万-2,000万円)を現実的ベンチマークに置く。Monument Valley は狙わない。

### 2.5 買い切りで売上を伸ばす定石施策

1. **Apple / Google Editor's Choice 獲得**(Slice Fractions / LOOPIMAL / Endless 全て獲得)
2. **Apple Design Award**(Tinybop / YATATOY 等)
3. **Indie App Sales Event / Black Friday / 年末セール参加**
4. **シリーズ化**(Endless Alphabet→Reader→Numbers 方式)
5. **無料アップデートで継続的話題化**
6. **教育機関向け School Edition 別売**(B2C $4.99 vs B2B $9.99-$19.99)
7. **バンドル販売**(Tinybop Collection 1-10 で割引)
8. **多言語化**(Endless Spanish 等で市場拡大)
9. **IAPで実質値段を $10-$15 に積み増し**(Endless Numbers $14.99 等)
10. **DLC追加**(Monument Valley Forgotten Shores $1.99 で売上第二波)

### 2.6 買い切りの典型的ライフサイクル

```
(1) リリース → Apple Editor's Choice / 賞獲得で初期スパイク
(2) シリーズ化 / 横展開で 2-5 年安定収益
(3) 無料アプデでロイヤリティ維持
(4) 5-10 年目で別アプリへ続編、もしくはバンドル / サブスクへ吸収
(5) それでも残るロングテール(WAO っち / Peekaboo Barn 型)
```

- (4) でサブスク移行 → Toca Boca / Sago Mini / Dr.Panda / DragonBox
- ハイブリッド維持 → Tinybop / Pango / Fiete
- 純買い切り維持 → YATATOY / Slice Fractions / Peekaboo Barn / タッチ!あそベビー
- DLC 追加で10年以上維持 → Monument Valley

---

## 3. ポノ推奨価格 3案 と 手元残額シミュレーション

(前回まとめの再掲・要約)

### 3案の比較表

| 案 | 価格 | コンセプト | ターゲット | 手元残額(15%手数料) | 推奨度 |
|---|---|---|---|---|---|
| **A** | ¥980 | カジュアル入り口 | 価格重視・お試し層 | 約 ¥833 | △ |
| **B** | **¥1,480** | **品質と価格のバランス** | **教育に投資したい標準層** | **約 ¥1,258** | **◎** |
| **C** | ¥1,980 | プレミアム位置 | 教材として真剣に検討する層 | 約 ¥1,683 | ○ |

### 推奨案 B(¥1,480)の理由

- **国内ベンチマーク**: トドさんすう年 ¥8,800、シンクシンク月 ¥980、ワンダーボックス月 ¥3,700 と比べて圧倒的に安く感じる価格帯
- **海外ベンチマーク**: Endless Alphabet シリーズの IAP 上限 $14.99 と整合
- **心理アンカー**: Endless Alphabet $8.99 が「買い切り知育上限」として機能している(¥1,200〜¥1,500相当)
- **手元残額**: ¥1,258 は粗利率約 85%、個人開発として十分

### 損益分岐の目安(参考値)

- 開発時間コスト(自分の人件費)を時給 ¥3,000 として年 1,000 時間と仮定 → 年 300 万円
- 必要販売本数(¥1,258/本): **約 2,400 本/年**(月 200 本)
- これは月平均 6-7 本/日。Apple Editor's Choice や Featured を1回取れば達成可能

---

## 4. 買い切り + シーズンパス + サブスク併用設計

(前回まとめの再掲・要約 + 追加調査で強化)

### 三層構造の基本設計

```
[本体買い切り ¥1,480]
  └─ コアステージ・コアゲーム・コアキャラ
  └─ オフライン完結
  └─ 一度買えば永久 + 無料アプデで維持

[シーズンパス ¥600 / 季節]
  └─ 春・夏・秋・冬の限定ステージ、限定キャラ衣装
  └─ 3-6ヶ月後から投入
  └─ 単発買い切り IAP として実装
  └─ Endless Numbers の "Big Kids Pack $11.99" 方式

[年額サブスク ¥1,980 / 年]
  └─ シーズンパス4回分相当を年単位で
  └─ ボーナス: お絵かき素材アーカイブ・録音保存機能 等
  └─ 1年後から投入
  └─ Tinybop Explorer's Pass(年 $9.99) 方式
```

### Tinybop / Pango が成立させた「三層共存」の鍵

| 層 | 既存購入者への扱い | 新規顧客への訴求 |
|---|---|---|
| 買い切り本体 | 永続アクセス保証 | 一度きりの安心感 |
| 単発IAP/シーズンパス | 必要なものだけ買える自由 | 試しやすい少額 |
| サブスク | 強制移行しない(既存ユーザーが望めば加入) | 全部入りの便利さ |

**ポイント**: サブスクを後から追加しても、買い切り購入者には何も奪わない。Pango Premium バンドル(複数アプリのライフタイム購入)も併売する設計がベスト。

---

## 5. iOS App Store のセール・価格変更機構

### 5.1 価格 Tier

- **最大 900 ティア**(デフォルト 800 + 申請 100)、$0.29 〜 $10,000
- $10 までは $0.10 刻み、$10-$50 は $0.50 刻みなど価格帯別
- サブスクは 2022年12月、買い切り・IAP は 2023年春から新ティア対応

### 5.2 価格は「基準国(Base Country)」モデル

- 1か国の価格を決めると、Apple が残り 174 ストアフロント・43 通貨で自動換算
- 基準国の価格は Apple が勝手に変えない
- 国別カスタマイズは可能だが、カスタム化した国は以降の自動 FX 調整対象外
- **ポノは「日本(JPY)を基準国に設定」を推奨**

> 注: Apple Newsroom(2022年12月)では「175ストアフロント / 45通貨」表記もあり、公式内に表記揺れがある。基本的に「世界中で買える」と理解しておけば実務上は問題ない。

### 5.3 セール実施手順(App Store Connect)

```
App Store Connect → Monetization → Pricing and Availability
  → Price Schedule [+] → Temporary Price Change を設定
```

- **最長 1 年**、開始日は当日〜翌年末日まで予約可
- クールダウン・回数上限は公式に未記載(技術的には何度でも可能)
- 複数スケジュールを並べることも可能
- **注意**: 基準国を変更すると予約済みスケジュールが全削除される

### 5.4 サブスク値上げのルール(将来サブスク導入時)

**ユーザー同意不要の条件**(AND条件):
- 過去 12 か月以内に値上げを行っていない
- 値上げ額が「現価格の 50% 超」**かつ**「$5(¥800)/$50(¥8,000)超」の**両方**を満たさない

> つまり、50%超でも $5 以内なら同意不要、$5 超でも 50% 以内なら同意不要。**両方超えた時だけ明示同意必須**。

ドイツ・オーストリア・ポーランド・韓国は全値上げで同意必須。

### 5.5 値上げ通知(自動配信)

| 期間 | 配信内容 |
|---|---|
| 60日前 | メール(年/半年/四半期/2か月サブスク) |
| 27日前 | メール(月額) |
| 7日前 | プッシュ通知 |
| 初回起動時 | アプリ内メッセージ(iOS 13.4+) |

**Option A (Preserve Prices)** を選ぶと既存契約者は旧価格据え置き、解約後60日以内の再加入も旧価格 — Grandfather Pricing 機能。

### 5.6 値下げ・買い切り価格保護

- サブスク値下げは即時で全既存契約者に自動適用。**reverse 不可**(改めて値上げするしかない)
- **買い切りアプリの既存購入者への差額返金(price protection)は Apple 公式に存在しない**
- → 値下げのたびに「定価で買って損した」レビューがつくリスク

### 5.7 プロモコード

- アプリ用: **プラットフォーム別バージョンあたり最大 100**、有効期限 4 週間、1 回のみ使用可
- **コード経由 DL はレビュー投稿不可・チャート反映不可**(=広告枠扱い)
- IAP/サブスク用 Offer Code: アプリあたり **100万コード / 四半期**、最大 10 アクティブオファー、最長 6 か月有効、サブスクと非サブスク両方カバー

### 5.8 Apple 主導フィーチャーの狙い方

```
App Store Connect → Featuring Nominations から申請
  → 最低 2 週間前、最大 3 か月前まで提出可
```

- iOS 18 以降強化
- Apple が編集対象にするのは:
  - 新規アプリ・大型アップデート
  - In-App Events(時限コンテンツ)
  - 開発者ストーリー
  - 季節 / 文化的モーメント
- **個人開発者の現実**: 新興・無名アプリで初回掲載される確率は高くない。**取れたら大きいが、取れない前提で売上計画を組む**

### 5.9 季節編集枠(推測ベース)

- Apple 公式は具体的編集枠カレンダーを公開していない
- 二次情報(ASO業者ブログ等)で「Back to School」「Holiday」枠は確認可能
- **ポノの狙い目**: 新学期(3-4月)・夏休み(7-8月)・年末年始 — **ただし「断定」ではなく「実例から推測される傾向」として扱う**

---

## 6. Google Play のセール・価格変更機構

### 6.1 Sales(セール)機能

- **2017年2月**に正式化(2023年導入は誤り、当時は1-8日仕様。後年14日に拡張)
- **Paid Apps 限定**(サブスクリプション・一括課金型 IAP は対象外)
- 最短 1 日 〜 最長 14 日
- **最低 10% 割引**
- 連続セール間に **30 日のギャップ必須**
- **理論的な年間上限は 約 11 回**(31日サイクル換算で 365/31 ≒ 11.7)
- セール価格は固定価格 or パーセント割引(10〜100%)
- **strikethrough(元値に取り消し線)表示**がストアで自動付与
- **iOS には無い独自の販促視覚効果**

### 6.2 strikethrough 非表示の 13 か国(EU/UK)

Belgium, Croatia, Czech Republic, Denmark, Estonia, France, Greece, Hungary, Latvia, Netherlands, Poland, Sweden, UK

> Omnibus Directive 準拠の文脈。EU 全加盟国ではない(Germany, Italy, Spain 等は含まれない)点に注意。

### 6.3 $0(無料化)セール

- 可能だが**購入カウント対象外**、その期間中は有料 Top Charts 対象外
- バズ施策として有効だが、ランキング露出は失う

### 6.4 価格テンプレート廃止(2025年10月27日)

- 以後は個別商品ごとに価格管理
- 既存テンプレートはアンリンクされ価格はそのまま個別商品に転写
- **多数 IAP を持つ場合、Google Play Developer API での一括管理が事実上必須**

### 6.5 Promo Codes

| 種類 | 上限 |
|---|---|
| 非サブスク(Paid Apps + One-time products 合算) | 500 / 四半期 |
| Subscription one-time use | 10,000 / 四半期 / product |
| Subscription custom code | 開発者が 2,000〜99,999 で設定 |

- 未使用分は**翌Qに繰越されない**
- Subscription custom code は新規サブスクライバー限定(過去契約者は使えない)
- **3〜90 日の無料お試し**を提供可能

### 6.6 Subscription 値上げ(Opt-in / Opt-out)

| 方式 | 条件 | 通知期間 |
|---|---|---|
| Opt-in | 全国対象。ユーザー同意必須、未同意なら自動解約 | — |
| Opt-out | 優良開発者のみ・対象国限定。年1回まで(過去365日に1国地域あたり1回) | 30〜60日 |

- Opt-out 値上げの上限: **「現価格の +50%」または「+$0.17/日相当」の大きい方**
- **韓国は 2025/2/14 以降、無料お試し→有料時(終了14日前)・割引終了時(更新30日前)などで事前同意必須**(Dark Pattern 規制)

### 6.7 Price Experiments(A/B)

- **one-time products 専用**(サブスクは不可)
- 同一国/地域で同時 1 実験、最大 1,000 purchase options
- 最長 6 か月、統計的有意後 14 日で自動終了
- 子供向け明示禁止はないが、倫理面の判断は要慎重

### 6.8 Custom Store Listings(季節キャンペーン用)

- **最大 50 ページ**
- 国別 / Search keyword / ユーザー状態(新規・休眠28日以上)/ Google Ads Ad Group / Pre-registered user でターゲット可
- 「holiday-themed group with custom screenshots」が公式例として明記
- **ポノは「夏休み」「入園入学準備」「クリスマス自由研究」用に Custom Store Listing を仕込んでおける**

### 6.9 Google Play Pass

- 招待制だが**興味表明可能**(全開発者対象)
- 収益はアルゴリズミック・ロイヤリティ方式
- 参加条件: IAP 全 unlock + 広告除去 + Play Billing / Licensing API 統合
- Family Manager + 最大 5 名のファミリーメンバーで共有可能
- 家族向けタイトル受け入れの実績あり(明示的な「family-friendly titles 豊富」公式コピーは未確認 → **mediumレベルの示唆**)

### 6.10 iOS との違い・Android 独自のセール文化

| 項目 | iOS App Store | Google Play |
|---|---|---|
| 公式セールバッジ | **なし**(strikethrough 非表示) | **あり**(strikethrough 自動付与) |
| 値下げ手段 | Temporary Price Change(最長 1 年) | Sales(1-14日、最低10%、30日ギャップ) |
| 子供向けサブスクパス | Apple Arcade(子供アプリ少なめ) | Play Pass(家族カテゴリ強い) |
| 値下げ実績の visibility | 弱い | 強い |
| 「Google Play だけのセール」 | — | **公式に許容、推奨される独自施策** |

> **ポノの示唆**: 「iOS は値引きしないが Google Play だけ夏休みセール」は完全に許容される。Android 独自の販促視覚を活用する。

---

## 7. 価格改定戦略(後から変える時)【最重要】

### 7.1 値上げの正当化と通知の鉄則

| 観点 | ベストプラクティス | 失敗例 |
|---|---|---|
| 順序 | **機能追加 → 告知 → 値上げ** の順 | Notion(機能追加なしで頻繁値上げ → 信頼破壊) |
| 通知期間 | **最低30日前、理想は3か月前** | 1Password(30日前告知だが説明不足で批判) |
| 頻度 | **年1回まで** | Notion(2024 + 2025 の二連発で炎上) |
| 幅 | **+30-50% まで、1回で** | 1Password(+33% を10年ぶり → 妥当だが説明不足) |
| ナラティブ | 「コンテンツが◯倍になりました」 | Figma(バンドル強制で「使わない機能を負担」と反発) |

### 7.2 値下げで炎上を回避する具体手法

1. **既存ステージの後追い有料化は絶対NG**(Figma 型信頼破壊)
2. **元値表示型の二重価格セールは避ける**(景品表示法リスク・後述)
3. **値下げするなら埋め合わせをセットで**:
   - 限定キャラクター / 壁紙の永続付与
   - 次回大型アップデート優先アクセス
   - お礼メール+クレジット表記
   - 早期購入者バッジをアプリ内に表示
4. **値下げの「理由」を必ず明示**(「多くの保護者の方に届けたく、価格を見直しました」等)
5. **値下げ幅は -30% 程度までに抑える**(-50% 超は心理的損失大)
6. **代替案: 無料体験版リリースで実質ハードルを下げる**(本体価格は維持)

### 7.3 Grandfather Pricing(既得権保護)

- iOS / Android 両プラットフォームで **公式機能**として既存ユーザーを旧価格に温存可能
- **買い切りアプリの場合、そもそも「買った人は永久に旧価格」が自然な状態** — 値上げで影響を受けるのは新規購入者のみ。これが買い切りモデル最大の利点
- サブスク移行時の鉄則:
  - 既存買い切りユーザーに永続無料アクセスを提供(Pango / Toca Boca → Piknik 移行時に実施)
  - LP に「買った人は永久に新コンテンツも享受できます」と明記

### 7.4 段階的値上げ戦略(理想形)

```
[0ヶ月] ¥1,480 で発売
   ↓ 新ステージ追加・キャラ追加・お絵かき機能拡充
[12ヶ月] ¥1,780 に値上げ(+20%、最低30日前告知、Grandfather保証明記)
   ↓ さらに新ゲーム1本追加
[24ヶ月] ¥1,980 に値上げ(+11%)
   ↓ コンテンツが2倍以上になった節目
[36ヶ月] 「ポノあそびば 2」として別 SKU 化(¥2,480)、旧版50%OFFクーポン
```

### 7.5 日本の景品表示法・二重価格表示リスク【法務】

#### 8週間ルール(消費者庁ガイドライン)

- セール開始日**直前の8週間**のうち**過半(4週間以上)**で比較対照価格(元値)による販売実績が必要
- 過去の販売価格使用最終日から 2 週間以上経過、または比較対照価格期間が通算 2 週間未満の場合は不当表示の恐れ
- 8週間未満しか販売していない商品は、販売開始からセール開始までの期間で同様の判定

#### 改正景品表示法(2023年5月公布、2024年10月1日施行)

- 故意の優良誤認表示・有利誤認表示に対し **100 万円以下の罰金**(直罰規定)が新設
- 法人には両罰規定あり
- 確約手続も同時導入
- **Apple / Google ストア内のセール表示も規制対象**(媒体問わず)
- > 注: 実際の摘発事例は大手 EC・大手小売中心。個人開発者の摘発例は確認できなかったが、「理論的リスクあり、実態は大手中心」として理解。安全側に倒して運用する

#### 将来価格を比較対照とする二重価格(2020年12月執行方針)

- 「今だけ ¥500(○月○日から ¥1,500)」のような訴求は、本当にその価格で売る計画・根拠が必要
- セール終了後すぐ元の安値に戻す/短期間しか高値で売らないのは **NG**

#### ポノでの実装ルール

| OK | NG |
|---|---|
| 「今だけ・期間限定セール」(元値非表示) | 「¥1,500 → ¥500」の元値表示セール |
| 「発売記念価格」(元値非表示) | 「定価 ¥1,500、いまだけ ¥500」 |
| 「夏休みキャンペーン」 | 「○月から ¥1,500 に値上げします、今のうちに」(本当に上げる計画があれば可) |

### 7.6 リリース1年以内に絶対やってはいけない価格改定 3 つ

1. **50%超のセール**: 「待てば下がる」アンカー定着、定価販売消滅、ASO アルゴリズム不利
2. **元値を表示する形での二重価格セール**: 8週間ルール違反リスク・直罰対象
3. **コンテンツを後から有料パック化**: Figma 型の信頼破壊、未就学児保護者コミュニティでは SaaS より波及力大

### 7.7 リカバリー手順 — 「安すぎた」と気づいた時

```
① 3-6ヶ月は値段を動かさず売上推移を観察
② その間に1つ明確な追加価値(新ステージ/新ゲーム/新キャラ)をリリース
③ LP・App Store スクショ・リリースノートで「コンテンツが◯倍になりました」と価値増加を可視化
④ 最低30日前に「○月○日より新価格 ¥△△△に改定」とアプリ内告知
⑤ 現価格期間に駆け込み購入セール(元値非表示)
⑥ 値上げ実施
⑦ 既存購入者は永続的に新コンテンツも無料 — LP に明記
⑧ 値上げ幅は1回 +30-50% まで、年1回が上限
```

### 7.8 リカバリー手順 — 「高すぎた」と気づいた時

```
① 即値下げは禁忌。まず「なぜ売れないか」を分解(認知 / 価値訴求 / UX 摩擦)
② 値段以外で解決できないか3-6ヶ月試す(LP改善 / 無料体験ステージ拡充 / レビュー対策 / SNS発信)
③ それでも売れない場合、値下げは「一回・恒久的」にして二度と動かさない
④ 値下げの「理由」を必ず明示
⑤ 既存購入者への埋め合わせを必ずセット(限定特典・優先アクセス等)
⑥ 値下げ幅は -30% 程度まで、-50% 超は避ける
⑦ 代替案: 無料体験版リリースで実質ハードルを下げる(本体価格は維持)
```

---

## 8. 年間プロモーションカレンダー案

### 月別「セールが効くタイミング」表

| 月 | イベント | ポノの動き | セール率 |
|---|---|---|---|
| **1月 1-7日** | 新年・習慣化需要 | **新年セール「新しい年、新しい学習習慣」**(年最大の起爆剤) | **30%(年1-2回の起爆として50%可)** |
| 1月 末〜 | Apple「新学期を始めよう」(1/29-4/8、ハード販促) | 新ステージ追加 + LP テコ入れ | — |
| **2月20-28日** | 入園・入学準備プレ需要 | 入園・入学準備プレセール | 20% |
| 3月 上旬 | 進研ゼミ4月号本格セール開始前 | **大型アップデート + リリース推奨タイミング** | 20% |
| ❌ **3月25日-4月7日** | 進研ゼミ・Z会の最大火力期 | **何もしない・避ける** | — |
| 4月10-20日 | 新学期スタート | 新ステージ追加(価格ではなく機能訴求) | 20% |
| 5月 こどもの日 | こどもの日 | 無料コンテンツ追加のみ(セールなし) | — |
| ❌ **GW後半 5/3-5/5** | 家族外出ピーク・広告単価高騰・大手ゲーム強い | **避ける** | — |
| 4/25-5/9 | Google Play GW クーポン(50%OFF最大¥600) | 課金導線UI改善 + 受け皿準備 | — |
| 6月 | 平常運転 | LP改善・素材整備 | — |
| **7月10-19日** | 夏休み(7/20頃〜)突入前 | **夏休み開始ダッシュセール** | **30%** |
| ❌ **8/13-8/16** | お盆・帰省でDL落ちる | **避ける** | — |
| 8月25-31日 | 2学期準備 | 2学期準備セール「夏休み振り返り」 | 20% |
| 9月 敬老の日 | 敬老の日(祖父母課金可能) | 「孫へのギフト」訴求 | 20% |
| 10月 | 平常運転(秋は競合静か・穴場) | **リリースの裏番組として推奨** | — |
| **11月25日-12月5日** | ホリデーシーズン入口 | **ホリデー突入セール** | **30%** |
| 12月20-29日 | クリスマス・冬休み | **冬休み無料体験キャンペーン**(課金導線は1月起爆用に温存) | 無料体験 |
| ❌ 12/29-12/31 | 大手スマホゲームお正月イベントと広告枠争い | **避ける** | — |

### リリース時期の推奨(上位3)

| 順位 | 月 | 理由 |
|---|---|---|
| **1位** | **3月上旬(2/28-3/10)** | 春休み+入園・入学準備で親の財布が緩む直前。進研ゼミの4月号本格セール開始(3月中旬)より前に出して先行優位 |
| **2位** | **7月上旬(7/1-7/10)** | 夏休み(7/20〜)前の「夏休み対策準備」需要を捕獲。8月入ってからでは遅い |
| **3位** | **11月下旬-12月上旬(11/25-12/5)** | ホリデーシーズン入口で App Store Today の年末特集に間に合うラストタイミング。1月の新年習慣化需要にも繋げられる二段構え |

### セール率の使い分け

| シチュエーション | 割引率 |
|---|---|
| 通常時のミニセール | **20%** |
| 季節イベント(夏休み・新学期) | **30%** |
| 年1-2回の起爆剤(新年・冬休み) | **30-50%** |
| 50%超 | **リリース1年以内は禁止**、2年目以降に検討 |

### プラットフォーム露出戦略

- Apple / Google エディターへのピッチは **2-3 か月前**(=新学期向け1月、夏休み向け5月、ホリデー向け9月)
- Featured 取れたら通常時の数倍の DL — セール単体より優先度高い
- ただし**新興・無名アプリで初回掲載される確率は高くない**前提で売上計画を組む

### 子供のインターネット利用時間(参考)

| 区分 | 平均利用時間/日(令和6年度) |
|---|---|
| 10-17歳 | 5 時間 02 分(前年 +5 分) |
| 0-9歳 | 2 時間 09 分(前年 +4 分) |

(出典: こども家庭庁令和6年度調査・2025年3月公表)

---

## 9. 絶対に避けるべき罠 一覧

| # | 罠 | 失敗事例 / 根拠 |
|---|---|---|
| 1 | **超安価設定**(¥120 等) | 「安い=安っぽい」アンカー定着、後から値上げ不可能 |
| 2 | **IAPガチャ要素** | 子供向けで親の信頼破壊、レビュー炎上、Apple/Google 審査リスク |
| 3 | **月¥1,500超サブスク** | ワンダーボックス(月¥3,700)レベルの教材付きでないと正当化困難 |
| 4 | **後出しサブスク化(既存買い切り購入者を放置)** | Pango / Toca Boca → Piknik 移行時に永続アクセス保証を必ず付けた前例。これを怠ると Sago Mini レビューのような長期不満が残る |
| 5 | **Family Sharing 非対応** | iOS 子供向けでは事実上必須。これを切ると親レビューで即叩かれる |
| 6 | **コンテンツの後追い有料化** | Figma 型信頼破壊。Hacker News で Penpot 移行スレ 632 pt(2024) |
| 7 | **短期間(同年内)の二度値上げ** | Notion(2024+2025)で長期信頼ダメージ |
| 8 | **値上げ理由の説明不足** | 1Password(+33%)で「何が33%増えたか不明」と批判 |
| 9 | **元値表示の二重価格セール** | 改正景品表示法 8週間ルール違反リスク・直罰100万円以下 |
| 10 | **将来価格を煽る訴求(計画なし)** | 「将来 ¥1,500」と書いて実際に上げない → 有利誤認表示 |
| 11 | **発売直後の大幅値下げ** | iPhone 2007 事件型炎上。-50%以上は1年は禁止 |
| 12 | **頻繁なセール(月1回以上)** | 定価アンカー破壊・「待てば下がる」学習・Apple/Google 編集チーム評価悪化 |
| 13 | **3月末〜4月第1週のリリース / 大セール** | 進研ゼミ・Z会 と真っ向衝突 |
| 14 | **GW後半 / お盆 / 大晦日のリリース** | 家族外出 + 大手ゲーム広告枠争いで CAC 悪化 |
| 15 | **Monument Valley を狙うこと** | 再現性極低。YATATOY / Slice Fractions 級を現実的ベンチマークに |
| 16 | **海外価格の手動カスタマイズ過多** | カスタム化した国は以後 Apple/Google の自動 FX 調整対象外。メンテ負荷増 |

---

## 10. 意思決定チェックリスト

### リリース前

- [ ] 価格を **¥1,480(推奨案B)**で確定したか
- [ ] iOS / Android の Small Business Program に申請済みか(手数料 15%)
- [ ] 基準国を **日本(JPY)** に設定したか
- [ ] Family Sharing(iOS)/ Family Library(Android)を有効化したか
- [ ] LP に「無広告・無サブスク・無データ収集・買って終わり」を明記したか
- [ ] 「将来の値上げ・新コンテンツも既存購入者は無料で享受」と LP に明記したか
- [ ] プライバシーポリシー・特定商取引法表記・利用規約を整備したか
- [ ] リリース日が **3月上旬 / 7月上旬 / 11月下旬-12月上旬** のいずれかか
- [ ] Featured Nomination(iOS)を 2-3 か月前に提出済みか
- [ ] Custom Store Listings(Google Play)で季節バリエーション 3 種以上作ったか
- [ ] 開発時間と販売目標から損益分岐本数を計算したか(¥1,258/本 × 2,400本 = 300万円)

### リリース後 3 か月

- [ ] 値段を一切動かしていないか(動かすな)
- [ ] 売上推移・DL推移・課金率・レビュー評価を週次でログ化しているか
- [ ] アプリ内 In-App Event を最低 1 回設定したか
- [ ] レビュー★平均が 4.0 以上か(切ったら原因分解)
- [ ] アンインストール率を確認しているか
- [ ] 新ステージ・新ゲームの追加開発に着手したか
- [ ] プロモコード 100 枠を四半期で配布計画化したか(教育系インフルエンサー・保育士・幼児教室)
- [ ] 「安すぎた / 高すぎた」の感覚的判断ではなく数字で評価しているか
- [ ] 初期セール(新年/夏休み/ホリデーのいずれか1回)の効果測定をしたか

### リリース後 1 年

- [ ] 値上げするなら最低30日前告知の準備ができているか
- [ ] 値上げ理由を「コンテンツが◯倍になりました」と LP・リリースノートに明示できるか
- [ ] 既存購入者への「永続アクセス保証」を再度 LP で約束したか
- [ ] シーズンパス ¥600 IAP のリリース準備が整ったか
- [ ] 第2作のコンセプトが固まっているか(シリーズ化の入り口)
- [ ] 累計売上が 300 万円超か(損益分岐達成)
- [ ] Apple Editor's Choice / Google Editor's Choice にピッチを送ったか
- [ ] 海外展開(英語化)の優先順位を検討したか
- [ ] 学校向け School Edition(B2B)の可能性を検討したか
- [ ] サブスク主軸への移行を**まだ**選択肢として温存できているか(早期移行は禁止)

---

## 11. 参考資料・ソース URL一覧

### 海外買い切り事例

- Endless Alphabet: https://apps.apple.com/us/app/endless-alphabet/id591626572
- Originator: https://www.originatorkids.com/endless-alphabet/
- Endless Numbers (Educational App Store): https://www.educationalappstore.com/app/endless-numbers
- Toca Boca Wikipedia: https://en.wikipedia.org/wiki/Toca_Boca
- Toca Life standalone removal: https://tocaboca.helpshift.com/hc/en/16-other-toca-boca-apps/faq/145-toca-life-standalone-apps-removed-from-sale-jan-1st-2024/
- Spin Master(Toca/Sago 買収): https://www.prnewswire.com/news-releases/spin-master-announces-the-purchase-of-toca-boca-and-sago-mini-leading-global-kids-mobile-digital-app-brands-576557261.html
- Sago Mini: https://sagomini.com/
- Tinybop: https://tinybop.com/apps
- Tinybop Explorer's Pass: https://tinybop.com/support/google-play-store/is-the-7-day-trial-free
- DragonBox FAQ: https://dragonbox.com/about/faq
- Kahoot acquires DragonBox: https://www.edsurge.com/news/2019-05-08-game-on-kahoot-snaps-up-dragonbox-for-18-million-for-its-first-acquisition
- Monument Valley Wikipedia: https://en.wikipedia.org/wiki/Monument_Valley_(video_game)
- Monument Valley revenue: https://www.gamedeveloper.com/business/-i-monument-valley-i-revenues-top-14-million-two-years-after-launch
- Ululab(Slice Fractions): https://ululab.com/
- YATATOY: https://www.yatatoy.com/
- Peekaboo Barn: http://www.peekaboobarn.com/

### 日本買い切り事例

- タッチ!あそベビー: https://apps.apple.com/jp/app/%E3%82%BF%E3%83%83%E3%83%81-%E3%81%82%E3%81%9D%E3%83%99%E3%83%93%E3%83%BC/id634212248
- ワオっち!: https://waochi.wao.ne.jp/apps-lp/
- 日本地図パズル: https://digital-gene.com/app_jpmappuzzle.php
- Smart Education おやこでリズム: https://rhythmaupass.smarteducation.jp/
- トドさんすう(1年プラン): https://apps.apple.com/jp/app/%E3%83%88%E3%83%89%E3%81%95%E3%82%93%E3%81%99%E3%81%86/id666465255
- シンクシンク: https://think.wonderfy.inc/about/

### iOS App Store 公式

- Set a price: https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price/
- Schedule price changes: https://developer.apple.com/help/app-store-connect/manage-app-pricing/schedule-price-changes-for-apps/
- Subscription pricing: https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/
- Subscription thresholds: https://developer.apple.com/help/app-store-connect/reference/auto-renewable-subscription-price-increase-thresholds/
- Promo codes: https://developer.apple.com/help/app-store-connect/offer-promo-codes/request-and-manage-promo-codes/
- Offer codes(IAP): https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-offer-codes-for-in-app-purchases
- Getting Featured: https://developer.apple.com/app-store/getting-featured/
- In-App Events: https://developer.apple.com/app-store/in-app-events/
- Pricing tiers update: https://developer.apple.com/news/?id=qzex35ch

### Google Play 公式

- Sales: https://support.google.com/googleplay/android-developer/answer/7271135?hl=en
- Pricing: https://support.google.com/googleplay/android-developer/answer/6334373?hl=en
- Subscription pricing: https://support.google.com/googleplay/android-developer/answer/12154973?hl=en
- Promo codes: https://support.google.com/googleplay/android-developer/answer/6321495?hl=en
- Price experiments: https://support.google.com/googleplay/android-developer/answer/13343030?hl=en
- Custom Store Listings: https://support.google.com/googleplay/android-developer/answer/9867158?hl=en
- Asset Library: https://support.google.com/googleplay/android-developer/answer/16386748?hl=en
- Google Play Pass: https://play.google.com/console/about/programs/googleplaypass/
- Play Pass家族共有: https://play.google.com/store/pass/getstarted/

### 価格改定事例

- Notion 2024年6月値上げ: https://www.notion.com/releases/2024-06-26
- Figma pricing evolution: https://newsletter.pricingsaas.com/p/inside-figmas-pricing-evolution
- 1Password 2026年値上げ批評: https://tidbits.com/2026/02/25/should-1passwords-price-hike-push-you-to-apples-passwords/
- iPhone 2007 値下げ事件: https://journalism.university/media-ethics-and-laws/iphone-price-cut-backlash-apple-strategy/
- RevenueCat Grandfather guidance: https://www.revenuecat.com/docs/subscription-guidance/price-changes
- Things 3 pricing: https://culturedcode.com/things/pricing/

### 日本の法務

- 景表法 8週間ルール解説: https://www.89ji.com/keihyou-guide/sale_rule.html
- 改正景表法解説: https://biz.moneyforward.com/contract/basic/20045/
- 消費者庁・将来の販売価格を比較対照とする二重価格 執行方針: https://www.caa.go.jp/policies/policy/representation/fair_labeling/guideline/assets/representation_cms216_201225_01.pdf

### 季節・市場データ

- こども家庭庁・青少年インターネット利用調査令和6年度: https://www.cfa.go.jp/policies/youth-kankyou/internet_research/results-etc/r06
- インテージGW2026調査: https://www.intage.co.jp/news/7612/
- 進研ゼミ小学講座: https://sho.benesse.co.jp/cp/one_month/
- Google Play GW2026クーポン: https://jetstream.blog/2026/04/25/android-google-play-in-app-purchase-50-off-offer-2026gw/
- Apple 新学期を始めよう 2026(URL修正版): https://www.apple.com/jp-edu/shop/browse/home/back_to_school/terms_conditions
- IMARC 日本教育アプリ市場: https://www.imarcgroup.com/japan-education-apps-market
- Adapty 教育アプリベンチマーク: https://adapty.io/blog/education-app-subscription-benchmarks/

### 個人開発者の指針

- Indie Hackers 一括vsサブスク: https://www.indiehackers.com/post/subscriptions-vs-one-time-payments-a-developers-honest-take-f153e48960
- Market Clarity Top Indie Apps: https://mktclarity.com/blogs/news/indie-apps-top

---

> **本ドキュメントの運用方針**: 価格に関する意思決定の起点はこのドキュメント。判断後の実績(セール DL/売上/レビュー反応)は `memory/sales_calendar.md` 等に蓄積し、年1回このドキュメントを更新する。Self-Evolving Framework の学習データに組み込むことで、来年以降の意思決定速度を上げる。
>
> **検証フェーズで判明した主な訂正点**(原調査からの修正済み):
> - Endless Alphabet 価格 $9.99 → **$8.99** に修正
> - Kiddopia $7.99/月 → **$7.99-$12.99/月のレンジ** に修正
> - トドさんすう「完全サブスク移行」 → **1年買い切り併存** に修正
> - 「Toca/Sago $24M+ で売却」 → **金額非公開** に削除
> - Endless Alphabet「1億DL」 → **シリーズ累計推定** にトーンダウン
> - サブスク値上げ閾値「50%以下」 → **「50%超 AND $5/$50超」のAND条件** に修正
> - Google Play Sales「2023年導入」 → **2017年正式化** に修正
> - 青少年ネット利用時間「4時間57分」 → **5時間02分(令和6年度)** に最新化
> - 教育アプリ市場「352億円(前年比138.7%)」 → **「子ども向け情報教育市場」(プログラミング教室+受験向け)** であり知育アプリ市場とは別物、と注記
> - iPhone値下げ事件「Jobsの冷淡な対応」 → **翌日に公開謝罪+$100クレジット** と事実ベースに修正
