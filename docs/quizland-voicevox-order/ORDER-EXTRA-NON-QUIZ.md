# Quizland 「問題以外」 音声発注書 (ORDER-EXTRA-NON-QUIZ)

## 概要

問題本編 (くるみ女声 907 件、 `ORDER-FULL.md`) とは独立した、 **博士のリアクション/リザルト/問題コール** の音声化発注。 第 3 の発注書として位置づけ。

- **総件数: 53 件** (くるみ 5 + 博士 48)
- 担当エンジン: **VOICEPEAK**
- 出力形式: wav (48kHz / 16bit / モノラル)
- 出力ディレクトリ: 納品時に別途指示（ひとまず `audio/quizland/extra/` を想定）

## 列構造の意味

- **speech**: VOICEPEAK に入力するテキスト。 漢字混じりで読み崩れを抑止
- **display**: アプリ画面 (吹き出し / リザルト等) に表示するテキスト。 ひらがな主体で子供が読みやすく
- 音声出力 wav と画面表示は **同じセリフだが文字種が異なる** 二段運用

### 件数の内訳

| 区分 | 話者 | 件数 |
|---|---|---|
| A. 問題番号コール | くるみ | 5 |
| B-1. 通常正解 (correct) | 博士 | 10 |
| B-2. レア正解 (rarePraise, 10% 確率) | 博士 | 6 |
| B-3. 不正解 (wrong) | 博士 | 8 |
| B-4. 連続不正解 (consecutiveMiss) | 博士 | 6 |
| B-5a. クリア・パーフェクト (clear.perfect) | 博士 | 3 |
| B-5b. クリア・グッド (clear.good) | 博士 | 3 |
| B-5c. クリア・オーケー (clear.okay) | 博士 | 3 |
| B-5d. クリア・トライアゲイン (clear.tryAgain) | 博士 | 7 |
| B-6. ヒント 2 段目フォールバック (hint2FallbackGeneric) | 博士 | 2 |
| **合計** | — | **53** |

## 話者割り当て

| 話者 | エンジン | 設定 | 担当 |
|---|---|---|---|
| **くるみちゃん** | VOICEPEAK | 「女の子」 プリセット | A. 問題番号コール 5 件 |
| **フクロウ博士** | VOICEPEAK | **「ナレーター おじいさん」 (秦なおき声、 単体購入済 2026-05-12)** | B. リアクション/リザルト/ヒント 48 件 |

(ポノは音声化保留、 OP シネマも一旦保留)

### くるみちゃん設定 (確認用)

- VOICEPEAK 「女の子」 プリセット
- 問題本編 (くるみ女声 907 件、 `ORDER-FULL.md`) と同じ音量・話速で揃える
- 子供向けに早口にならないよう注意

### フクロウ博士設定 (確定: ナレーター おじいさん 2026-05-12)

- **VOICEPEAK 「ナレーター おじいさん」 (秦なおき声) を採用** (2026-05-12 ユーザー単体購入確定 ¥5,980、 6 ナレーターセット保有者向け優待版)
- VOICEPEAK 公式コンセプト: 「熟年男性の深みのある声、 モノローグや昔話のストーリーテラーに最適」 (秦なおき / 2024-12 リリース)
- パラメータは **素のプリセットで試聴 → 必要なら微調整** の方針 (素のままで通す前提)
- 笑い声 (「ほっほっほ」) と語尾 (「〜じゃ」「〜のう」) が老博士らしく自然に出るかが鍵
- Plan B (「おじいさん」 で違和感がある場合の代替): **「男性3」 (柊一希) + ピッチ/速度を下げて年配感** (¥0、 既存 6 ナレーターセット同梱) を温存。 詳細は [memory/feature_quizland_voicepeak_pivot.md](../../memory/feature_quizland_voicepeak_pivot.md) の「Plan B」 セクション参照

## 博士パラメータ (確定方法)

「ナレーター おじいさん」 の **素のプリセットで全 48 件を試作** → ユーザー試聴で問題があった行のみピッチ / 速度 / イントネーションを微調整して再生成、 という流れに簡素化。 確定値が決まったら本書に追記。

試聴用サンプル (3 件、 VOICEPEAK ナレーター おじいさん 素プリセットで生成):
- `hakase_correct_05.wav` 「ふむふむ、 よくできたのう」 (通常正解、 のう語尾)
- `hakase_rare_01.wav` 「ほっほっほ…わしも まけておれんな」 (笑い声入り、 ほっほっほ)
- `hakase_clear_perfect_01.wav` 「ぜんもん せいかい！ きみは もう、 もりの なぞなぞマスターじゃな！」 (リザルト、 長尺)

> 旧検討案 (パターン A/B/C = 男性1 / 男性2 / 男性3 のプリセット比較 + 年配パラメータ調整) は「ナレーター おじいさん」 単体購入で必要性が解消したため簡素化。 Plan B として男性3 + パラメータ調整は温存 ([memory/feature_quizland_voicepeak_pivot.md](../../memory/feature_quizland_voicepeak_pivot.md) 参照)。

## 命名規則

| 区分 | 規則 | 例 |
|---|---|---|
| くるみ・問題コール | `kurumi_dai{N}mon.wav` (N = 1〜5) | `kurumi_dai1mon.wav` |
| 博士・通常正解 | `hakase_correct_{NN}.wav` (NN = 01〜10) | `hakase_correct_01.wav` |
| 博士・レア正解 | `hakase_rare_{NN}.wav` (NN = 01〜06) | `hakase_rare_01.wav` |
| 博士・不正解 | `hakase_wrong_{NN}.wav` (NN = 01〜08) | `hakase_wrong_01.wav` |
| 博士・連続不正解 | `hakase_miss_{NN}.wav` (NN = 01〜06) | `hakase_miss_01.wav` |
| 博士・クリア (パーフェクト) | `hakase_clear_perfect_{NN}.wav` (NN = 01〜03) | `hakase_clear_perfect_01.wav` |
| 博士・クリア (グッド) | `hakase_clear_good_{NN}.wav` (NN = 01〜03) | `hakase_clear_good_01.wav` |
| 博士・クリア (オーケー) | `hakase_clear_okay_{NN}.wav` (NN = 01〜03) | `hakase_clear_okay_01.wav` |
| 博士・クリア (トライアゲイン) | `hakase_clear_tryagain_{NN}.wav` (NN = 01〜07) | `hakase_clear_tryagain_01.wav` |
| 博士・ヒント 2 フォールバック | `hakase_hint2_generic_{NN}.wav` (NN = 01〜02) | `hakase_hint2_generic_01.wav` |

### 命名規則の選定理由

- **`kurumi_*` / `hakase_*` の話者プレフィックス**: 別フォルダ運用にしなくてもファイル一覧で話者の判別が可能。 既存 `ORDER-FULL.md` (`q{NNN}_{q|a|b|c|d}.wav`) とも区別がつく
- **カテゴリ名 (`correct` / `rare` / `wrong` / `miss` / `clear_*` / `hint2_generic`)**: `quizland/index.html` の `HAKASE_DIALOGUE` 定数のキー名と 1:1 対応 (`correct`, `rarePraise`, `wrong`, `consecutiveMiss`, `clear.perfect/good/okay/tryAgain`, `hint2FallbackGeneric`)。 将来コード側でファイル名を機械的に生成する時に整合する
- **2 桁ゼロパディング (`_01` 〜 `_10`)**: ソート順で配列インデックス順 (correct[0] = `_01`) と一致

## 検収観点

1. **アクセント・読み崩れ・キャラ感統合**
   - 「ほっほっほ」 の笑い声が機械的でなく老博士らしく自然か
   - 「〜じゃ」「〜のう」「〜じゃろう」 の語尾が崩れず博士らしく出るか
   - 「ばっちり」「ぜんもん」 等の促音が崩れていないか
   - 「お見事 (オミゴト)」 が「オケンブツ」 等と誤読されていないか
   - 博士: 年配の博士感がきちんと出ているか (若い男性の声に聞こえないか)
   - くるみ: 第1〜5問目コールで親しみやすく明るいお姉さん感が出ているか、 既存くるみ問題本編 907 件と同じトーンで揃っているか
2. **音量レベル**
   - くるみ問題本編 907 件 (`ORDER-FULL.md`) と音量を揃える
   - 博士 48 件の中でも音量差が大きくないか (特に rarePraise / clear.perfect 等の「驚き寄り」 セリフが突出しないか)
3. **冒頭/末尾無音**
   - 冒頭 100-200ms / 末尾 100-200ms 程度を目安
4. **博士⇔くるみのキャラ間音色ギャップ**
   - 連続再生 (博士の正解リアクション → くるみの「第N問目」) で違和感がないか
   - 話者切り替え時に音量・トーンの段差が大きすぎないか
5. **リザルト感の階段**
   - clear.perfect / clear.good / clear.okay / clear.tryAgain の 4 段階が音声から段階的に伝わるか
   - perfect は最も嬉しさ・驚きが強く、 tryAgain は最も穏やかで励まし寄りに聞こえるか

---

## A. くるみ担当: 問題番号コール (5 件)

ファイル名規則: `kurumi_dai{N}mon.wav` (N = 1〜5)

| ファイル名 | speech (VOICEPEAK 入力) | display (画面表示用) | 備考 |
|---|---|---|---|
| `kurumi_dai1mon.wav` | 第一問目です | だい1もんめです | 「第一問」 はユーザー辞書登録済 (`voicepeak_user_dict.csv` line 67) |
| `kurumi_dai2mon.wav` | 第二問目です | だい2もんめです | |
| `kurumi_dai3mon.wav` | 第三問目です | だい3もんめです | |
| `kurumi_dai4mon.wav` | 第四問目です | だい4もんめです | |
| `kurumi_dai5mon.wav` | 第五問目です | だい5もんめです | |

> **読み方注**: 「第1問目」 は表示上は半角数字だが、 speech 入力では「第一問目 / 第二問目…」 と漢数字に統一する (VOICEPEAK の「だい いちもん」 系の読み崩れを避けるため、 既に「第一問」 が辞書登録済 = `ダイイチモン` 4 平板)。 第二問〜第五問は辞書未登録なので、 同じ調子 (`ダイニモン` / `ダイサンモン` / `ダイヨンモン` / `ダイゴモン` の 4 平板) で読まれるか試聴で確認 → 必要なら辞書追加 (「C. 辞書追加候補」 参照)。

---

## B. 博士担当: HAKASE_DIALOGUE 抽出 (48 件)

`quizland/index.html` の `HAKASE_DIALOGUE` 定数 (L3231-3370) から、 リアクション/リザルト/共通ヒントフォールバックを全件抽出。

### B-1. correct (通常正解) — 10 件

ファイル名規則: `hakase_correct_{NN}.wav` (NN = 01〜10、 配列インデックスと 1:1 対応)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) |
|---|---|---|
| `hakase_correct_01.wav` | おお！ 正解じゃ！ | おお！ せいかいじゃ！ |
| `hakase_correct_02.wav` | よいぞ よいぞ！ | よいぞ よいぞ！ |
| `hakase_correct_03.wav` | きみ、なかなか 鋭いのう | きみ、なかなか するどいのう |
| `hakase_correct_04.wav` | その ひらめき、素晴らしい！ | その ひらめき、すばらしい！ |
| `hakase_correct_05.wav` | ふむふむ、よく出来たのう | ふむふむ、よくできたのう |
| `hakase_correct_06.wav` | お見事じゃ！ | お見事じゃ！ |
| `hakase_correct_07.wav` | その通り じゃ！ | そのとおり じゃ！ |
| `hakase_correct_08.wav` | ばっちり じゃ！ | ばっちり じゃ！ |
| `hakase_correct_09.wav` | やるのう！ | やるのう！ |
| `hakase_correct_10.wav` | 賢いのう！ | かしこいのう！ |

### B-2. rarePraise (レア正解、 10% 確率発動) — 6 件

ファイル名規則: `hakase_rare_{NN}.wav` (NN = 01〜06)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) |
|---|---|---|
| `hakase_rare_01.wav` | ほっほっほ…わしも 負けておれんな | ほっほっほ…わしも まけておれんな |
| `hakase_rare_02.wav` | きみは もう 博士の 仲間じゃな | きみは もう はかせの なかまじゃな |
| `hakase_rare_03.wav` | これは わしも 驚いたわい | これは わしも おどろいたわい |
| `hakase_rare_04.wav` | きみの 頭は すごいのう | きみの あたまは すごいのう |
| `hakase_rare_05.wav` | これは 天才じゃな！ | これは てんさいじゃな！ |
| `hakase_rare_06.wav` | わしの 負けじゃ、ほっほっほ | わしの まけじゃ、ほっほっほ |

### B-3. wrong (不正解) — 8 件

ファイル名規則: `hakase_wrong_{NN}.wav` (NN = 01〜08)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) |
|---|---|---|
| `hakase_wrong_01.wav` | ふむ… 違ったようじゃな | ふむ… ちがったようじゃな |
| `hakase_wrong_02.wav` | 大丈夫、もう一度 考えてみよう | だいじょうぶ、もういちど かんがえてみよう |
| `hakase_wrong_03.wav` | 慌てんで よいぞ | あわてんで よいぞ |
| `hakase_wrong_04.wav` | ふむふむ… 惜しいのう | ふむふむ… おしいのう |
| `hakase_wrong_05.wav` | そっか、違ったか | そっか、ちがったか |
| `hakase_wrong_06.wav` | まあ そんな時も あるさ | まあ そんなときも あるさ |
| `hakase_wrong_07.wav` | もう一度、よーく 見てみよう | もういちど、よーく みてみよう |
| `hakase_wrong_08.wav` | ゆっくりでよいぞ | ゆっくりでよいぞ |

### B-4. consecutiveMiss (連続 2 回不正解) — 6 件

ファイル名規則: `hakase_miss_{NN}.wav` (NN = 01〜06)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) |
|---|---|---|
| `hakase_miss_01.wav` | 難しいかの？ | むずかしいかの？ |
| `hakase_miss_02.wav` | ヒントを 見てみるかい？ | ヒントを みてみるかい？ |
| `hakase_miss_03.wav` | 一緒に 考えてみよう | いっしょに かんがえてみよう |
| `hakase_miss_04.wav` | ふむ… 難しいのう | ふむ… むずかしいのう |
| `hakase_miss_05.wav` | ヒントが あるぞ、見てみる？ | ヒントが あるぞ、みてみる？ |
| `hakase_miss_06.wav` | ゆっくり いこうか | ゆっくり いこうか |

### B-5a. clear.perfect (5/5 正解) — 3 件

ファイル名規則: `hakase_clear_perfect_{NN}.wav` (NN = 01〜03)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) | 備考 |
|---|---|---|---|
| `hakase_clear_perfect_01.wav` | 全問 正解！ きみは もう、森の なぞなぞマスターじゃな！ | ぜんもん せいかい！ きみは もう、もりの なぞなぞマスターじゃな！ | |
| `hakase_clear_perfect_02.wav` | ほっほっほ、わしも 驚いた！ | ほっほっほ、わしも おどろいた！ | |
| `hakase_clear_perfect_03.wav` | きみは もう、博士を 超えとるかも しれんのう | きみは もう、はかせを こえとるかも しれんのう | 将来「全カテゴリパーフェクト限定発火」 に格上げ予定 ([memory/feature_quizland_hakase_perfect_master_seal.md](../../memory/feature_quizland_hakase_perfect_master_seal.md))。 音声は通常通り収録 |

### B-5b. clear.good (4/5 正解) — 3 件

ファイル名規則: `hakase_clear_good_{NN}.wav` (NN = 01〜03)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) |
|---|---|---|
| `hakase_clear_good_01.wav` | 立派じゃ！ よく出来た！ | りっぱじゃ！ よくできた！ |
| `hakase_clear_good_02.wav` | お見事 じゃった！ | お見事 じゃった！ |
| `hakase_clear_good_03.wav` | ふむふむ、楽しかったのう | ふむふむ、たのしかったのう |

### B-5c. clear.okay (3/5 正解) — 3 件

ファイル名規則: `hakase_clear_okay_{NN}.wav` (NN = 01〜03)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) |
|---|---|---|
| `hakase_clear_okay_01.wav` | よく頑張ったのう | よくがんばったのう |
| `hakase_clear_okay_02.wav` | ほっほっほ、いい 感じじゃ | ほっほっほ、いい かんじじゃ |
| `hakase_clear_okay_03.wav` | また 一緒に 遊ぼうな | また いっしょに あそぼうな |

### B-5d. clear.tryAgain (0〜2/5 正解) — 7 件

ファイル名規則: `hakase_clear_tryagain_{NN}.wav` (NN = 01〜07)

> **tryAgain プール 7 件構成 (2026-05-12 ユーザー判断で拡張)**:
> - 新規 1 件: `tryagain_01` 「むずかしかったのう。 また やってみるとよい」 (旧「また あそびに きてくれよな」 をユーザー NG で差し替え)
> - 既存 2 件: `tryagain_02`, `tryagain_03` (そのまま音声化)
> - 新規追加 4 件: `tryagain_04`, `tryagain_05`, `tryagain_06`, `tryagain_07` (バリエーション充実のため拡張)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) |
|---|---|---|
| `hakase_clear_tryagain_01.wav` | 難しかったのう。 また やってみるとよい | むずかしかったのう。 また やってみるとよい |
| `hakase_clear_tryagain_02.wav` | 慌てず、ゆっくりで よいぞ | あわてず、ゆっくりで よいぞ |
| `hakase_clear_tryagain_03.wav` | 次は もっと できるはずじゃ | つぎは もっと できるはずじゃ |
| `hakase_clear_tryagain_04.wav` | 考えたのが えらいぞ | かんがえたのが えらいぞ |
| `hakase_clear_tryagain_05.wav` | わしも 昔は そうじゃった | わしも むかしは そうじゃった |
| `hakase_clear_tryagain_06.wav` | 一休みして また おいで | ひとやすみして また おいで |
| `hakase_clear_tryagain_07.wav` | ちょっと 休憩して また 遊ぼう | ちょっと きゅうけいして また あそぼう |

### B-6. hint2FallbackGeneric (ヒント 2 段目共通フォールバック) — 2 件

ファイル名規則: `hakase_hint2_generic_{NN}.wav` (NN = 01〜02)

| ファイル名 | speech (VOICEPEAK 入力、 漢字混じり) | display (画面表示用、 ひらがな) | 備考 |
|---|---|---|---|
| `hakase_hint2_generic_01.wav` | ふむ… もう少しじゃ | ふむ… もうすこしじゃ | 旧「ほっほっほ、もうすこしじゃ」 から差し替え済 (笑い声の連続発火を抑制) |
| `hakase_hint2_generic_02.wav` | じっくり 選んでみよう | じっくり えらんでみよう | |

---

## C. 辞書追加候補 (新出語)

`tools/voicepeak/voicepeak_user_dict.csv` (66 語) と照合し、 本発注書に登場するセリフから抽出した未登録の主要語を以下に列挙する。 アクセント核位置は推定値。 試聴後に必要に応じて辞書追加 → VDC2 再生成 (`tools/voicepeak/Convert-VoicepeakUserDictCsvToVdc2.ps1`) を実施する。

### C-1. 番号コール関連 (高優先)

| 単語 | 読み | アクセント核位置 (推定) | 備考 |
|---|---|---|---|
| 第二問 | ダイニモン | 4 平板 | 既存「第一問」 と同じパターン |
| 第三問 | ダイサンモン | 4 | |
| 第四問 | ダイヨンモン | 4 | 「第四 (ダイシ)」 ではなく「ダイヨン」 と読ませる |
| 第五問 | ダイゴモン | 4 | |

### C-2. 博士セリフの主要新出語 (中優先)

セリフが正しく自然に読まれれば辞書追加は不要だが、 試聴で違和感があった場合は以下を辞書化する候補。

| 単語 | 読み | アクセント核位置 (推定) | 出現箇所 |
|---|---|---|---|
| お見事 | オミゴト | 2 | correct[5], clear.good[1] |
| せいかい | セイカイ | 0 | correct[0], clear.perfect[0] |
| すばらしい | スバラシイ | 4 | correct[3] |
| ぜんもん | ゼンモン | 0 | clear.perfect[0] |
| なぞなぞマスター | ナゾナゾマスター | 4 | clear.perfect[0] (複合語) |
| てんさい | テンサイ | 0 | rarePraise[4] |
| ものしり | モノシリ | 3 | (HAKASE_DIALOGUE.problem.byCategory にて trivia/weather/body 等で出現、 本発注外だが辞書共有) |
| りっぱ | リッパ | 0 | clear.good[0] |
| ヒント | ヒント | 1 | consecutiveMiss[1, 4] |
| かしこい | カシコイ | 3 | correct[9] |
| するどい | スルドイ | 3 | correct[2] |
| ひらめき | ヒラメキ | 3 | correct[3] |
| ばっちり | バッチリ | 0 | correct[7] |
| ふむふむ | フムフム | 1 | correct[4], wrong[3], clear.good[2] |
| ほっほっほ | ホッホッホ | 0 | rarePraise[0, 5], clear.perfect[1], clear.okay[1] (笑い声、 機械的読みになりやすい) |
| かんがえた | カンガエタ | 0 平板 | clear.tryAgain[3] (ユーザー指示で重要視、 既存辞書未登録) |
| きゅうけい | キュウケイ | 0 | clear.tryAgain[6] |
| ひとやすみ | ヒトヤスミ | 3 | clear.tryAgain[5] |
| なかま | ナカマ | 3 | rarePraise[1] |
| はかせ | ハカセ | 0 | rarePraise[1], clear.perfect[2] |
| もり | モリ | 0 | clear.perfect[0] |
| もういちど | モウイチド | 3 | wrong[1, 6] |
| じっくり | ジックリ | 3 | hint2FallbackGeneric[1] |

> **方針**: 試聴前に辞書を膨らませすぎると過剰補正のリスクがあるため、 **第一段階は C-1 (番号コール 4 語) のみ追加** → 試聴後に C-2 から問題のあった語のみ追加、 が安全。 ユーザーが先行追加を望む場合は C-2 全件を追加してもよい。

---

## D. ユーザー判断保留事項

### D-1. ヒント系の他プールを今回スコープに含めるか

`HAKASE_DIALOGUE` には他にも以下のヒント系プールが存在するが、 今回スコープに含めるかユーザー判断を保留中:

- `hint1` (5 件): ヒント 1 段目共通プール (例: 「ふむ… すこし むずかしいかな？」)
- `hint2FallbackByCategory` (8 カテゴリ × 3 件 = 24 件): カテゴリ別ヒント 2 段目フォールバック (例: count_total → 「ひとつずつ ゆびで さして かぞえてみよう」)
- `problem.general` (6 件): 問題提示時の博士セリフ (例: 「さてさて…これは わかるかな？」)
- `problem.byCategory` (8 件): カテゴリ別問題提示 (例: order_color → 「なにいろに みえるかな？」)

**提案**: 今回は **「リアクション/リザルト + 共通ヒントフォールバック (B-6)」 までに絞り** (= 53 件)、 ヒント本編とカテゴリ別問題提示は第 4 弾発注書 (`ORDER-EXTRA-HINTS-AND-PROBLEM.md`) として後追いで扱うのが工数的に妥当。 理由:

- ヒント系は発動条件が複雑 (5 秒タイマー + 連続不正解 + カテゴリ判定)、 本実装側のヒント発動 UX 確定後に音声化したほうが手戻りが少ない
- カテゴリ別 2 段目 24 件は 1 カテゴリだけ抜けると違和感が大きい (= 全件揃える前提)、 53 件 + 24 件 = 77 件と一気に膨らむ
- リアクション/リザルトは確実に毎ゲーム発火するため優先度が高い (今回スコープに留める価値が高い)

ユーザーが「ヒント系も今回まとめて発注したい」 場合は本書を拡張するか、 別書 (`ORDER-EXTRA-HINTS-AND-PROBLEM.md`) を新規作成する。

### D-2. ファイル名規則の最終承認

「主要な判断 / 命名規則の選定理由」 セクションの 3 ルール (話者プレフィックス / カテゴリ名 = 定数キー名 / 2 桁ゼロパディング) でユーザー承認待ち。 既に存在する `q{NNN}_{q|a|b|c|d}.wav` 規則と整合させる方針で問題ないか確認。

### D-3. 博士の VOICEPEAK パラメータ確定値

**話者 = 「ナレーター おじいさん」 (秦なおき声) で確定済 (2026-05-12 ユーザー単体購入)**。 残るは素プリセットの試聴で必要な微調整があるかの確認のみ。 確定方法・試聴用 3 件サンプルは本書冒頭「博士パラメータ (確定方法)」 セクションを参照。

- 「ナレーター おじいさん」 素プリセットで試聴用 3 件 (`hakase_correct_05.wav` / `hakase_rare_01.wav` / `hakase_clear_perfect_01.wav`) を生成
- ユーザー試聴で OK なら素のまま全 48 件本生成、 違和感があった行のみ微調整 (ピッチ / 速度 / イントネーション)
- 確定値が決まり次第、 本書「博士パラメータ (確定方法)」 セクションに追記する
- Plan B (「おじいさん」 で違和感ある場合) = 「男性3 + パラメータ調整」 を温存

### D-4. 第 4 弾発注書との関係整理

- 本書 `ORDER-EXTRA-NON-QUIZ.md` (53 件): リアクション/リザルト/問題コール
- 提案 `ORDER-EXTRA-HINTS-AND-PROBLEM.md` (推定 43 件 = 5 + 24 + 6 + 8): ヒント 1 + カテゴリ別ヒント 2 + 問題提示 general + by category
- 提案 `ORDER-EXTRA-OP-CINEMATIC.md` (将来): OP シネマティックの博士・くるみ・ポノの台詞

→ 本書納品後にユーザーがどこまで進めるか判断。

---

## E. 既存発注書との関係

| 発注書 | 件数 | 話者 | スコープ |
|---|---|---|---|
| `COWORK-TEST-ORDER.md` | 27 | くるみ (VOICEVOX) | 問題本編テスト 5 問分 |
| `ORDER-FULL.md` | 907 | くるみ (VOICEVOX) | 問題本編フル 181 問分 |
| **`ORDER-EXTRA-NON-QUIZ.md` (本書)** | **53** | **くるみ (VOICEPEAK) + 博士 (VOICEPEAK)** | **問題以外: リアクション/リザルト/問題コール** |

- **くるみ全件 VOICEPEAK 「女の子」 統一 (2026-05-12 確定)、 二重話者化リスクなし**: くるみ全 912 件 (問題本編 907 + 第1〜5問目 5) を VOICEPEAK 「女の子」 プリセットで統一する方針が確定。 VOICEVOX 雨晴はうは廃案。 これにより問題本編と問題コールでエンジン違いによる音色差が発生する懸念は解消済
