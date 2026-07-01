# シールブック エンゲージメント設計プラン

> **バージョン**: 2026-07-02 初版
> **対象**: pono-asobiba-app の シールブック体験全体 (収集 / 授受 / 物語 / 成長 / 家庭共有)
> **前提**: シール=自由絵柄カタログ、 ガチャ/どんぐりショップ/取り置き の 3 経路。 絵本連動シールは特別枠として並存。

---

## 0. TL;DR

- シールブックは 3-8 歳向け 「森の絵本世界」 の 収集 + 授受 + 物語 + 成長 + 家庭共有 の 5 本柱で設計する。
- ガチャ (`play.html` L6299-6378) は 3 回レバー + カプセル開封の unboxing が既に実装済み。 ポノは 「カプセル左半分の静止絵」 に閉じ込められている状態 (exact_gaps 参照)。 大改修せず マイクロ改善で climax を強化する。
- カタログは 175 枠 (実装 135 + 計画 40)、 全て `gameId` 必須。 ここに `origin: 'book' | 'game' | 'free'` を新設し、 自由絵柄枠 (free) を第一級市民にする。
- 柱1 (収集の可視化) と 柱2 (授受の儀式) を先行実装。 柱3-5 は 柱1&2 の実装完了後に再検討 (自由絵柄方針との齟齬を避ける)。
- ポノ登場は 「ガチャ最終開封時の見守り顔 1.4s」 のみ に限定。 ショップは店員 NPC、 取り置きは静かな UX で 3 経路の情緒を分業する。
- トーン制約: 花火/爆発/蛍光色 禁止。 森トーン厳守。 触覚は 3-8 歳の発達心理に沿って 短く優しく、 保護者 opt-out 完備。

---

## 0.5 音声/テキスト運用原則 (キャラクターイメージ保護)

ポノのあそびばにおける音声/テキスト運用は 「キャラクターは絵と動きで生きる、 言葉は女性ナレーターが第三者として代弁する」 を絶対原則とする。 ポノ・ふくろう先生・パートナー動物 8 種は肉声を持たず、 その内面や発話は必ず女性ナレ (Gemini Leda 1.15x) による間接話法 (「〜だって」 「〜と言っているよ」) の第三者読み聞かせに変換する。 3-5 歳未識字児には視覚ピクトグラム + 触覚 haptics + 女性ナレの 3 層冗長で意味を届け、 テキストは保護者読み聞かせと識字児向けの補助レイヤとして機能させる。 全音声要素は ManageDebug で個別 OFF 可能とし、 感覚敏感児と家庭ごとの好みに配慮する。

**既存 partner_* voiceTag の migration スケジュール (実装リード should_improve、 §4 前提条件)**

§0.5 は 「既存 `partner_*` の voiceTag も第三者ナレ間接話法ルートへ順次置換する」 と宣言するが、 §4-3 の新規実装と混在すると (a) どのゲームが partner_* を持つか (b) 置換順序 (c) rollback 方法 が曖昧になる。 新規実装 (§4) とは分離した負債返却フェーズとして扱う:
- **走査**: `data/` `Prototypes/` 配下で `partner_[a-z]+` の voiceTag を全 grep し、 game 別に集計 (quizland/maze/oto/puzzle/bento/quiz-sound/sea-album/starparodier/undersea-cave/wordmatch/writing-mori/zukan の 12 ゲームが対象)
- **優先順位**: sub tier で最も遊ばれるゲーム (quizland / oto / puzzle) → free tier ゲーム → 実験ゲーム、 の順
- **段階置換**: 各ゲームごとに (a) 現行 partner_* voiceTag を第三者ナレ台詞に書き換え (b) whisper 検証済み新規 TTS を差替 (c) 旧 audio ファイルは 30 日 grace period 後に削除。 rollback は grace period 内なら voiceTag と audio 差替のみで可能
- **完了ゲート**: `grep -r 'partner_' data/ Prototypes/` が 0 件になるまで、 launch (Early Access `[[monetization_strategy]]`) には進めない
- 進捗を `docs/audit/partner_voice_migration.md` に記録

**「voice」 タグ / 「audio」 タグの実装レイヤ分類監査 (ブランドガーディアン should_improve)**

現行 play.html および各ゲームの code 内には 「voice」 「audio」 タグが散在する。 これが (a) 女性ナレ (narration) (b) 機能音 (functional tone / SE / BGM) (c) キャラ肉声 (character voice = 禁止) のいずれかを判別できない状態は §0.5 準拠の実装として不整備。 実装リードは §4-4 の実装初手 step 1 と同時に、 以下の grep + refactor チェックリストを 1 度実施し、 一元化を確認する:
- `grep -rE '\bvoice\b' src/ play.html Prototypes/` で全 callsite を列挙
- 各 callsite を上記 3 分類にラベル付けし、 変数名/関数名/コメントを明示的に置換 (`playVoice()` → `playNarration()` / `playSE()` / `playChime()` 等)
- 監査結果を `docs/audit/voice_tag_reclassification.md` に記録し、 実装リードが確認

**3 原則**

- **ポノ・ふくろう先生は音声禁止**: プロジェクト全域でキャラクター (ポノ / ふくろう先生 / パートナー動物 全 8 種) の肉声を新規収録・TTS 生成・再生することを禁止する。 既存 `partner_*` の voiceTag も第三者ナレ間接話法ルートへ順次置換する。
- **声を使うなら女性ナレのみ**: 音声を使う場合は女性ナレ (Gemini TTS Leda / 1.15x / volume 0.9) の第三者読み聞かせ形式のみ許可。 直接話法 (「〜だよ」 の一人称) は必ず間接話法 (「〜だって」 「〜と言っているよ」) に書き換えて生成し、 whisper 検証プロンプトにも明記する。 spec / コード / docs で 「voice」 単独語は禁止し、 「女性ナレ (female narrator)」 「機能音 (functional tone / SE)」 「キャラ肉声 (character voice = 禁止)」 のいずれかに明示分類する。
- **未識字児対応戦略**: 3-5 歳未識字児向けは (a) 視覚ピクトグラム (キャラの姿勢・表情・アイコン) を第一レイヤ (b) 触覚 haptics を第二レイヤ (c) 女性ナレ第三者読み聞かせを第三レイヤ (d) テキストは保護者・識字児向け補助 の 4 層冗長で情報伝達。 単一チャネル依存を避け、 女性ナレ再生時は BGM ducking (0.4 まで一時降下、 ナレ終了 300ms 後に復帰) を必須とする。
- **一人称禁止 (ブランドガーディアン must_fix)**: 女性ナレはいかなる場面でもポノ・ふくろう先生・パートナー動物の一人称 (ぼく、 わたし、 おれ) を使用禁止。 ナレが子どもに語りかける場合も 「この子が〜」 「ここに〜が いるんだ」 と第三者観察視点を保つ。 ナレーターのポイント・オブ・ビューは 「森の中立的な観察者」 に固定。 TTS 生成プロンプトに 「一人称禁止テンプレート (You are a narrator describing a child's discovery, never speak AS the character or child)」 を必ず添付する。 テンプレートは `.claude-design-bundle/tts-prompts/narrator_third_person_template.txt` として管理する
- **同時再生禁止 (Claude Code 未識字児レビュー should_improve → must 昇格)**: 同一シルエットを連打された場合、 「前のナレ終了を待つ」 (キューイングなし) を必須ガードとする。 前ナレ再生中の tap は視覚フィードバック (シルエット微 pulse ピカ 200ms) のみ返し、 女性ナレは silent skip。 ナレ重複による 「怖い」 「うるさい」 体感を感覚敏感児 (15-20%) から確実に排除する

**保護者読み聞かせなし想定シナリオ (パート2、 Claude Code 未識字児レビュー must_fix)**

本ドキュメントは 「テキスト = 保護者・識字児向け補助」 と位置付けるが、 実際には保護者が読み聞かせない家庭が相当数存在する。 その回帰性を明示的に保証するため、 3-5 歳未識字児が女性ナレ音声 + BGM ducking + 視覚 (ポノ表情/points burst/シルエット pulse) の 3 点だけで 「シールをもらった感」 「ここに何かある感」 に到達できることを実測要件とする。

- **実測要件**: 3-5 歳児 **最小 8 名** を対象に、 保護者読み聞かせ無しの環境でガチャ celebration とシルエット tap→owl-whisper 発火を体験させ、 (a) 開封瞬間の positive facial affect 検出率、 (b) tap から吹き出し反応までの理解率、 (c) 「もう一度やる」 の自発的再試行率、 を測定。 各指標が **>70%** に達しない場合は追加補助 (男性ナレ導入 or on-screen ピクトグラム強化 or 触覚パターン強化) を検討
- **落とし所ガイドライン**: 保護者読み聞かせを 「推奨」 として LP / パッケージに明記する (家族での体験を前提とすることを設計者・保護者双方に事前に伝える)。 ただし 「読み聞かせなしでも子どもが取り残されない」 3 層冗長の設計は死守する
- 検証結果を `docs/user_test_reports/no_parent_readalong_regression.md` に記録

---

## 1. 現状把握

### 1.1 ガチャシステム (`play.html`)

| 項目 | 実装 |
| --- | --- |
| 入口ボタン | `play.html:5996` `#dailyGachaEntry` (画面右下、 モバイル bottom 122px、 木製看板テクスチャ) |
| モーダル HTML | `play.html:6299-6378` |
| 回転数 | 3 回 (`DAILY_GACHA_TURNS=3` at `L7604`) |
| Spin 処理 | `play.html:8686-8717` `commitDailyGachaTurn()`。 レバー dragAngle >= 315deg で 1 turn 確定、 turn 1-2 は click SE、 turn 3 は finalStinger |
| Reveal 処理 | `play.html:8719-8783` `runDailyGacha()`。 NORMAL/RARE/SUPER 別に exit → drop (3.15s) → closeup → open のタイミング差分 |
| カプセル開封 | `play.html:8774-8778`。 `.is-opened` 追加で 左右半分が -34deg/+34deg に開き、 sticker が中央から emerge |
| ポノ登場 | 左半分カプセル画像内の 静止絵のみ (`daily_gacha_capsule_open_*_pono.png`)、 独立キャラとしての登場なし |
| Rarity 分岐 | `play.html:7644-7727` NORMAL / RARE / SUPER の 3 段。 badge・タイトル・音量が rarity 別 |
| 失敗ケース | `play.html:8833-8876`。 count>=2 で `'used'` メッセージ、 count=1 && !quest_cleared で `'locked'` |
| Sticker Book への遷移 | `play.html:8989-8991` `goDailyGachaStickerBook()` → `Prototypes/StickerBookThreeJS/?surface=cover` |

**主なギャップ (`exact_gaps` より抜粋)**
1. 触覚的な handoff なし: カプセルが開いて sticker が出るが、 誰も 「渡してくれない」
2. ポノがカプセルに閉じ込められている: 静止画のまま -34deg で退場する
3. Rarity flash なし: badge が静かに現れるのみ、 SUPER の climax 感が薄い
4. 空間的乖離: カプセル半分が左右に飛び、 sticker が中央から出るが 「カプセルの中身が出た」 感が弱い
5. 「また あした」 バブルが sticker peak と競合 (3.35s から早すぎる)
6. Rarity 別の音差別化が弱い (音量・rate のみ)
7. 3 回レバーが全て同じ SE、 turn 3 に climax がない

### 1.2 ショップ / 取り置き (前提情報)

- どんぐりショップは 1 日 2 回入替、 未所持優先ロジック が計画済 (実装状況は本ドキュメントの主対象外)。
- 取り置き機能あり (詳細 UI 未定義)。 sticker book 側での可視化は未実装。

### 1.3 カタログスコープ (`sticker_book_content_plan.json` / `data/stickers/game-stickers.json`)

| 項目 | 数 |
| --- | --- |
| 実装済シール (serial 001-135) | 135 枚 |
| 計画中シール (serial 136-175) | 40 枠 |
| 絵本専用 (book_bonus) | 6 枚 (serial 130-135、 `bookOnly: true`) |
| ゲーム紐付き | 129 枚 (12 ゲームに分散: quizland/maze/oto/puzzle/bento/quiz-sound/sea-album/starparodier/undersea-cave/wordmatch/writing-mori/zukan) |
| 完全自由絵柄 | **現在ゼロ** (全 175 枠が `gameId` 必須) |
| Rarity | normal / rare / super の 3 段 |
| Tier | free / app 併用 |

**主なギャップ**
- `gameId` 必須制約により、 ゲームにも絵本にも紐付かない 「実験的自由絵柄」 が定義上不可能
- 40 枠の未実装枠を 「自由絵柄実験場」 として活用する余地あり、 かつ人気シールを 「次期メインキャラに昇格」 させる思想は既にあるが UX で機能していない

---

## 2. 5 本柱の全体像

| 柱 | テーマ | 目的 | 本ドキュメントでの扱い |
| --- | --- | --- | --- |
| 柱1 | 収集の可視化 | 「あと何がある」 「今日 誰に会える」 を非言語で伝える | 詳細設計 (§3) |
| 柱2 | 授受の儀式 | 「もらった」 手触りを 視 + 聴 + 触 の多感覚で残す | 詳細設計 (§4) |
| 柱3 | 物語の背骨 | 「1 シール = 1 物語断片」 で世界観を積層する | 保留 (§5)。 自由絵柄方針との齟齬要検証 |
| 柱4 | 長期成長の可視化 | 表紙が育つ森、 週次セレクト、 コンプ祝祭 | 保留 (§5) |
| 柱5 | 家庭内共有 | 「ママにみせる」 物理儀式、 KDP 絵本連動特典 | 保留 (§5) |

---

## 3. 柱1 詳細: 収集の可視化

自由絵柄カタログを前提に、 「未取得の空白」 「今日 会える気配」 「新入りの到来」 を非言語シグナルで伝える 6 案。

### 3-0. 前提条件: origin スキーマ PR (全 6 案の共通土台)

柱1 の 6 案は全て `origin: 'book' | 'game' | 'free'` field 新設を前提とする。 実装は必ずこの PR を最初に切ってから 3-1〜3-6 に進む。

**Acceptance criteria** (実装リード指摘):
1. `data/stickers/game-stickers.json` と `Prototypes/StickerBookThreeJS/sticker_book_content_plan.json` が `origin` field を支持し、 JSON Schema に反映済み
2. `gameId` を nullable 化 (origin='game' の時のみ必須、 origin='book'/'free' では null 許容) — backward compatible
3. 既存 135 sticker を自動分類する migration script が pass:
   - `bookOnly: true` → `origin: 'book'` (serial 130-135)
   - 残 `gameId` 有り → `origin: 'game'` (serial 001-129)
   - 未実装枠 (serial 136-175) → `origin: 'free'` に振替
4. 1-A / 1-B / 1-C / 1-D / 1-E / 1-F の 6 案全てが `origin` filter で分岐可能なことをテスト
5. migration script pseudo-code:
```js
// scripts/migrate_sticker_origin.mjs
for (const s of stickers) {
  if (s.bookOnly === true) s.origin = 'book';
  else if (s.gameId) s.origin = 'game';
  else s.origin = 'free';
}
// 検証: origin=game && !gameId は 0 件、 origin=book は 6 件、 origin=free は 40 件
```

### 3-1. 1-A-v2 : シルエット未取得表示 (二層 slot: 絵本ページ形式 / 森の広場形式)

- **現状**: `sticker_book_content_plan.json` の 175 枠が全て `gameId` 必須。 Three.js 上で slot が単一グリッド (`main.js` の `categoryId` ベース)、 絵本連動と自由絵柄の棲み分けなし。 未取得シルエット枠自体が未実装。
- **理想**: slot に `origin` プロパティを新設 (`'book' | 'game' | 'free'`)。 Three.js シーンで 2 レイアウトを混在させる:
  - **book-tied**: 見開き絵本ページ調 (角丸紙質テクスチャ + ページ番号 + ふち罫)
  - **game / free**: 森の広場調 (草地 + 切り株 + 木の実の上に散らばる、 自由配置)
  - 未取得は全 origin 共通で 「白シルエット + 淡い葉っぱパーティクル + 曇りガラスの丸フチ」
  - free 枠は特に 「? マークの卵型」 表示にして 『これから森に来る子』 感を出す
  - `gameId` は `origin='game'` の時のみ必須、 free/book では null 許容
  - **『反応する空白』設計** (心理学者指摘: 3-5 歳は Piaget 保存概念未確立で 「白影=欠けている」 認識が難しい): シルエットは静止画ではなく、 4s 周期で opacity 0.85→1.0→0.85 の微 pulse アニメを常時発火。 tap すると `1-C-owl-whisper` (§3-3) のヒントが表示される — シルエット横にふくろう先生の羽根アイコン + 木の葉フレーム吹き出しでテキストを表示し、 同時に女性ナレ (Gemini Leda 1.15x) が 「ふくろう先生は こう いっているよ。 〜〜」 と間接話法で読み上げる。 ふくろう先生自身の肉声は絶対に再生しない (§0.5 準拠)。 ManageDebug でナレ OFF 可能。 「視覚シグナル」 単独に頼らず 「タッチ→反応 (テキスト + 第三者ナレ)」 の能動フィードバックで 『自分が選んだ』 感と識字/未識字両対応を両立する。 静的白影のみでは 3-4 歳に届かないため、 pulse + tap 反応を必須仕様とする。
  - **pulse affordance の認識率実測** (Claude Code 未識字児レビュー must_fix): opacity pulse (0.85→1.0→0.85) が 3-4 歳に 「ここに何かある」 affordance として届くかを実装前に検証。 ユーザーテスト (3-4 歳児 **最小 8 名**) で 「pulse するシルエットを触ってみる」 自発率を測定し、 (a) 自発 tap 率が **>70%** なら pulse のみで実装、 (b) **50-70%** なら pulse + tap エリアに 「ふくろう先生の羽根アイコン」 常時表示のハイブリッド、 (c) **<50%** なら pulse は装飾扱いで羽根アイコン主体に切替。 tap 後の吹き出しテキスト + 女性ナレが確実に発火することを smoke test (`Prototypes/StickerBookThreeJS/tests/silhouette_tap_smoke.test.mjs`) で自動確認。 検証結果を `docs/user_test_reports/silhouette_pulse_affordance.md` に記録
- **子どもへの効き**: 『絵本のあの子』 と 『まだ知らない森の子』 が同じ棚に共存し、 驚きと安心が同居。 微 pulse で 「ここに何かある」 という非言語 affordance が生まれ、 tap で ふくろう先生が応答することで 3-5 歳の 「自分がした感」 (Bandura 自己効力感) を触発する。
- **実装初手**: `sticker_book_content_plan.json` に `origin` フィールドを追加し、 既存 175 枠を分類 (book=serial 130-135、 game=001-129、 free=136-175 を `'free'` に振替)。 スキーマ緩和 PR を先に切る。
- **effort**: L
- **impact**: 9 / 10
- **files**:
  - `Prototypes/StickerBookThreeJS/sticker_book_content_plan.json`
  - `Prototypes/StickerBookThreeJS/main.js`
  - `data/stickers/game-stickers.json`
- **方針整合**: 自由絵柄=`origin:'free'` を第一級市民に格上げし、 「gameId 必須で自由絵柄が持てない」 現状ギャップを根本解消。 入手経路には触れないので方針 A/B と直交。

### 3-2. 1-B-v2 : シルエット吸着 snap (collection モード限定 + origin 別 snap プロファイル)

- **現状**: 貼付インタラクションは Three.js `main.js` に既存 drag があるが、 シルエット吸着挙動は未実装。 自由並び側は snap 位置定義なし。
- **理想**: モード分離:
  - **collection モード** (ガチャ/ショップ直後のオート整列): origin 問わず該当 silhouette に吸着距離 80px で吸い込む + 貼付 SE + パフ煙
  - **自由編集モード** (子供が任意に触る時): snap 無効、 自由配置
  - book origin は常に snap ON (絵本ページの角丸枠にピタッと収まる方が絵本らしい)
  - free origin は snap 弱め (吸着距離 40px、 外すのも簡単)
  - 実装 `snapProfile = {book:'strong', game:'medium', free:'weak', modeOverride:'collection'|'free'}`
  - tap-to-place UI では最寄り silhouette 3 個までを弱ハイライト
- **子どもへの効き**: ガチャ直後は自動で 『あるべき場所』 に飛んでいく気持ちよさ、 自由編集時は自分の広場を作る自由。 origin ごとに触感が違うので絵本感/実験感の切り替えが手で伝わる。
- **実装初手**: `main.js` に mode state と `snapProfile` 定義追加。 まず collection モードのみ (ガチャ完了後 → sticker book 遷移直後 3 秒) で origin=book 強 snap の PoC。
- **effort**: M
- **impact**: 8 / 10
- **files**:
  - `Prototypes/StickerBookThreeJS/main.js`
  - `play.html`
- **方針整合**: 「ゲームクリアで直接付与しない」 方針とは無関係 (配置ロジック)。 自由絵柄は snap 弱め or OFF で 『自由並び』 の実験場性を維持、 ガチャ/ショップから来た瞬間だけ強 snap で入手のご褒美感。

### 3-3. 1-C-owl-whisper : 未取得シルエット tap → ふくろう先生ヒント (吹き出しテキスト + 女性ナレ間接話法の二層)

- **現状**: 旧 1-C 案は 「このシールは quizland で貰える」 等の `gameId` を UI 露出する設計だったが、 自由絵柄方針違反 (ゲーム紐付けを子供に明示すると 『このゲーム遊ばなきゃ』 圧が生まれ、 free 枠の意義も潰れる)。 なお前バージョンで前提としていた 「既存ふくろう先生ボイス資産」 は在庫監査で存在しないことが確認された (`partner_fukurou` は placeholder のみ)。 新規収録するにしてもキャラ肉声禁止方針 (§0.5) に抵触するため、 音声主体は女性ナレの第三者読み上げに転換する。
- **理想**: 未取得シルエット tap で、 詩的ヒントを 「吹き出しテキスト (キャラの言葉)」 + 「女性ナレ (第三者読み聞かせ)」 の二層で提示する。 詩的ヒント 12-16 本を JSON 化し、 シルエット ID → ヒントテキストで紐付け。 テキスト版と間接話法ナレ版を別テキストで管理する。 例:
  - テキスト: 「あかい ぼうしの なにか が あるって」 / ナレ: 「あかい ぼうしの なにかが いるって、 ふくろう先生が いっていたよ」
  - テキスト: 「あまい におい が するんだって」 / ナレ: 「あまい においが するらしいって、 ふくろう先生が おしえてくれたよ」
  - テキスト: 「きらきら した ものの ちかくに いるって」 / ナレ: 「きらきら した ものの ちかくに いるらしいって、 ふくろう先生が いっていたよ」
  - **絶対禁則**: `gameId` や 「ガチャで出る/ショップで出る」 は言わない。 ふくろう先生自身の肉声は禁止。 ナレは間接話法 (「〜だって」 「〜と ふくろう先生が いっているよ」) の第三者形式のみ許可。 直接話法 (「ぼくはね」 等) は禁止
  - origin 別プール (テキスト + ナレ 2 系統管理):
    - **book 系**: 絵本の 1 節を匂わす詩的ヒント
    - **game 系**: 世界観キーワード (森/海/夜/おと) を匂わす抽象ヒント
    - **free 系**: 「まだ ふくろう先生も よく しらないんだって… ちかごろ 森に あそびに 来る みたいだよ」 の未知感ヒント (間接話法版)
  - オノマトペ (「ぽっ」 「ふわり」) をヒントに少量混ぜて 3-5 歳児の情緒フックを作る
  - 1 日 1 シールにつき 1 回まで、 翌日リセット (乱用防止 + 明日の楽しみ)
  - 枕詞ナレ 1 本: 「ふくろう先生は こう いっているよ」 (共通イントロ)
  - ビジュアル: ふくろう先生の羽根アイコン (新規) + 木の葉フレーム吹き出し PNG (新規) を silhouette 横に配置。 これが 「ふくろう先生からのメッセージ」 の視覚記号として機能する
  - 音声: 新規女性ナレ TTS 12-16 本 (§0.5 準拠、 Gemini Leda 1.15x、 whisper 検証必須)

- **owlHint バリデーション仕様** (アートディレクター + ブランドガーディアン指摘):
  - 30 字以内 (絵本トーンの短句)
  - **経路情報禁止キーワード配列**: `['ガチャ', 'ショップ', 'どんぐり', 'ゲーム', 'クリア', 'quizland', 'maze', 'oto', 'puzzle', 'bento', '当てる', '交換', '購入']` の presence チェックで PR CI が block
  - **キャラ内面言及禁止キーワード配列** (ブランドガーディアン must_fix、 女性ナレは第三者観察者としての立場を保つ): `['すきだ', 'すきなの', 'すきなんだ', 'たのしい', 'たのしいの', 'かなしい', 'さみしい', 'うれしいの', '〜の理由', '〜だから']` の presence チェックで block。 キャラの気持ち・好み・理由の直接描写は禁止し、 視覚的特徴 (色・形) と可能性 (「いるかもしれない」 「〜らしい」 「〜だって」) に留める
  - **キャラ主語形禁止パターン** (ブランドガーディアン must_fix): 正規表現 `/^(ぼく|わたし|おれ)/u` (一人称マーカで文が始まる) と `/(ポノ|ふくろう先生|この子)が[^、。]{0,20}(すき|きらい|たのしい|うれしい)/u` (キャラ主語 + 内面形容) を CI で検出し block。 ナレ文が常に第三者観察形であることを自動検証する
  - **ナレプロンプトの標準テンプレ** (TTS 生成時に必ず添付、 生成担当エンジニアが誤ってキャラ演技的読みで生成することを予防): 『あなたは森の中立的な観察者としてのナレーターです。 3-5 歳児の保護者が読み聞かせるトーンで、 決してキャラクターを演じず、 キャラクターの内面や感情には踏み込まず、 見えた事実と可能性のみを第三者として描写してください。 一人称 (ぼく・わたし) は使わず、 「〜だって」 「〜らしい」 「〜と ふくろう先生が いっていたよ」 の間接話法で読んでください。』
  - 肯定形 → 抽象形 変換例 (作成者ガイド用):
    - NG: 「quizland でもらえる」 → OK: 「おとの ちかくに いる こが いるんだって」
    - NG: 「ショップに いま いるよ」 → OK: 「きょうは あまい においが するらしい」
    - NG: 「ガチャで 出るよ」 → OK: 「そらから ふって くるって うわさ」
    - NG: 「あまい におい が すきなんだって」 (内面言及) → OK: 「あまい におい が するらしいって、 ふくろう先生が いっていたよ」 (状況描写)
  - CI script: `scripts/validate_owl_hints.mjs` で全 owlHint (テキスト + ナレ両系統) を走査し、 違反時 exit 1
  - **意味通達テスト** (Claude Code 未識字児レビュー must_fix): syntax チェックだけでは 3-5 歳児に伝わるかを保証できない。 新規 owlHint 追加時は 3-5 歳児 **最小 4 名** に 「これを聞いて、 どんな子だと思う?」 の開放回答調査を実施 (動画記録)。 回答が実際のシールビジュアルに合致する率が **>60%** なら本番投入、 それ未満は該当 hint を blocked。 whisper 検証 (音声一致) と別工程として PR approval 前に実施し、 結果を `docs/user_test_reports/owl_hint_semantic_delivery.md` に記録する workflow を docs に記載
- **子どもへの効き**: 「どこで貰える」 の攻略情報ではなく 「どんな子なんだろう」 の物語想像を返す。 探索心が 『遊ぶ動機』 ではなく 『会いたい気持ち』 に変換される。 free 枠は 「先生も知らない」 で新入り感が強化。
- **実装初手**: `sticker_book_content_plan.json` 各シールに `owlHint` フィールド (30 字以内、 経路情報禁止のバリデーション付き) を追加。 まず book 6 枚 + free 10 枚の 16 シールで PoC。
- **effort**: M
- **impact**: 8 / 10
- **files**:
  - `Prototypes/StickerBookThreeJS/sticker_book_content_plan.json`
  - `Prototypes/StickerBookThreeJS/main.js`
- **方針整合**: 却下案 —
  - (a) 「ショップで見かけたら教えるね」 = ショップ経路明示で方針違反
  - (b) 「明日のガチャで会えるかも」 = ガチャ経路明示、 同上
  - (d) 沈黙 = free 枠 「まだ誰も知らない子」 の面白さを伝える手段が消える
  - (c) 物語化ヒントが方針 (自由絵柄カタログ+経路非明示) と最も整合

### 3-4. 1-D-shop-glow : 今日のショップ在庫シルエットが棚で 『そっと光る』

- **現状**: どんぐりショップは 1 日 2 回入替 + 未所持優先ロジック計画済。 sticker book 側との連動は未実装で、 「今日ショップに来ている子」 と 「棚のシルエット」 が結び付いていない。
- **理想**: sticker book を開いたとき、 当日ショップ在庫と一致する silhouette slot だけ、 周囲に淡い金の粒 (パーティクル) を 3 秒間隔でふわっと浮かべる。 テキストでは何も語らない。
  - tap すると 1-C の二層ヒント (吹き出しテキスト + 女性ナレ間接話法) が再生される (「ショップにいるよ」 は言わない、 抽象語彙のみ)。 ショップ文脈用に別プールを持たせ、 「きょう だけの おともだち が いるって」 「きょうだけの おともだちが いるって、 ふくろう先生が おしえてくれたよ」 のような 「今日限定」 ニュアンスを追加する (ショップ用ヒントテキスト 6-8 本 + 対応女性ナレ TTS 6-8 本 = whisper 検証必須)。 ショップ棚の該当スロットに小さな金色 sparkle パーティクルを添えて 『これのことだよ』 と視線誘導し、 未識字児は sparkle + ナレ音で、 識字児は sparkle + テキストで処理する
  - 実装: `play.html` 側の `todayShopInventory` 配列 → sticker book に localStorage / query 経由で渡し、 `main.js` の silhouette mesh に emissive glow shader を条件付与
  - free/book/game origin 問わず適用
  - **shop 候補と gacha 候補で発光リズムを差別化** (心理学者 should_improve 指摘、 意思決定支援):
    - shop 候補: 点滅周期 **2s** (速め、 「今行けばある」 感)、 明度 0.6→0.85
    - gacha 候補: 点滅周期 **4s** (ゆったり、 「今日のどこかで」 感)、 明度 0.55→0.75
    - 両方候補の slot は shop 側を優先表示 (即時性が高い)
  - 3-5 歳が 「どっちに行くか」 迷い続けないよう、 明度差 + 周期差の 2 軸で情報階層を作る
- **子どもへの効き**: 「今日はこの子に会える予感」 の非言語シグナル。 能動的な探索 (ショップ/ガチャを見に行く) を子供自身が決める。 文字読解不要なので 3-5 歳に届く。
- **実装初手**: `play.html` 側でショップ日次在庫を `localStorage.setItem('pono_today_stamp_hints', [serials])` で公開する API を作り、 `main.js` で読み取って silhouette 3D mesh に emissive property を付与する PoC。
- **effort**: M
- **impact**: 9 / 10
- **files**:
  - `play.html`
  - `Prototypes/StickerBookThreeJS/main.js`
- **方針整合**: 「どんぐりショップ経路」 を UI 文言で明示せず、 光という非言語シグナルだけで示す。 自由絵柄カタログ性を維持したまま探索を促せる汎用フック。 ガチャ候補にも流用可能。

### 3-5. 1-E-reserved-seat : 取り置き中シールの 『予約席』 マーク

- **現状**: 取り置き機能は前提として存在するが、 sticker book 側で 「取り置き中」 を可視化する UI が未定義。 子供は取り置いたことを忘れがち。
- **理想**: 取り置き中シールの対応 silhouette slot 右上に、 小さな 『よやくずみ』 しおり (布ラベル風 3D mesh、 リボン揺れアニメ 4s ループ) を貼る。
  - text は使わず、 ハート型に 「⇩」 の絵文字調アイコンだけ
  - tap すると 「あと N にちで まってるよ」 の吹き出し (数字は絵本 UI で慣れている 1-3 の範囲想定)
  - 取り置き期限切れで自動的にしおりが落ちるアニメ (雨に濡れて外れる) → 期限のプレッシャーを物語化
  - origin 問わず適用
- **子どもへの効き**: 「自分がこの子を選んだ」 という所有以前のコミット感が可視化され、 通う動機になる。 忘却防止 UX + 期限切れも詩的処理。
- **実装初手**: `localStorage` の取り置き state schema を確認 (未実装なら stub 定義)。 `main.js` の silhouette slot に `reservedRibbon` 子 mesh を追加する PoC。 まず 1 スロット固定でビジュアル検証。
- **effort**: S
- **impact**: 7 / 10
- **files**:
  - `Prototypes/StickerBookThreeJS/main.js`
  - `play.html`
- **方針整合**: 取り置きは方針の柱 (ショップ経路の一部)。 origin 問わず同一マークで扱うので自由絵柄性を損なわない。

### 3-6. 1-F-newbie-ribbon : 直近 7 日以内に追加された free 絵柄に 『しんいり』 リボン

- **現状**: free 枠 40 枠を今後追加していく際、 既存シールの中に埋もれて 「新しく森に来た子」 の存在に気付けない。 実験シール=次期メインキャラ昇格の観測窓 (前提より) が UX 上で機能しない。
- **理想**: sticker catalog schema に `addedAt: ISO date` を追加。 `addedAt` が 「今日から 7 日以内」 の `origin='free'` シールにだけ、 silhouette (未取得時) と artwork (取得時) 両方の左上に小さな 『しんいり』 リボン (布切れ風 3D、 木の枝から吊り下がる)。
  - 取得済みでも 7 日間はリボン継続 (発見の余韻)
  - 開いた瞬間、 最初の 1 回だけ以下を同時発火 (free 全体を空気として告知): (1) リボン ピカ光アニメ 400ms (2) 画面上部にふくろう先生葉フレーム吹き出し 「あたらしい おともだちが きたんだ」 (観察型、 事実のみ、 3.5s 表示) (3) 女性ナレが 「あたらしい おともだちが きたって、 ふくろう先生が おしえてくれたよ」 と間接話法で読み上げ (§0.5 準拠、 新規 TTS 1 本 whisper 検証必須) (4) 柔らかい chime SE (既存 finalStinger 派生で可)。 吹き出しテキストは 「新入りが来た」 事実のみに留め、 「ふくろう先生が教えた」 のメタ説明はナレに委譲する (ブランドガーディアン must_fix — 吹き出しとナレで意味の重複を避け、 テキストが 『ふくろう先生の肉声』 と誤読されるのを防ぐ)。 localStorage `newbie_ribbon_seen_v1` で二回目以降は SE のみに縮小。 ふくろう先生自身の肉声は再生しない
  - 8 日目以降は自動でリボンが外れる
  - **時刻基準の明確化** (アートディレクター指摘): `addedAt` は ISO 8601 UTC 文字列。 判定は **サーバー UTC 00:00 を epoch** として `addedAt <= now_utc() - 7 * 86400` で外れる。 client-side 時計での判定は行わない (時計巻き戻し悪用回避)。 client は表示時に `addedAt > now_utc()` 検出でエラーログ + リボン非表示 (壊れた state からの復帰)。 リボン付与判定は sticker book 起動時 & 日次 cron (server) の双方で実施
  - 人気シール (取得率 or お気に入り率で判定) は運営が内部的に 「昇格候補」 ラベルを付けて次期主役に育てる材料になる
- **子どもへの効き**: 「毎週新しい子が森に来る」 体験が生まれ、 通う理由が積み上がる。 運営側にも人気投票の自然データが入る。
- **実装初手**: `content_plan.json` に `addedAt` フィールドを追加し、 既存 free 枠 40 枚のうち 5 枚を 「新入り予備」 として設定。 `main.js` に `addedAt<=7d` チェック + `newbieRibbon` mesh を追加する PoC。
- **effort**: M
- **impact**: 8 / 10
- **files**:
  - `Prototypes/StickerBookThreeJS/sticker_book_content_plan.json`
  - `Prototypes/StickerBookThreeJS/main.js`
- **方針整合**: 自由絵柄=free origin の存在意義 (実験場・次期主役候補) を UX で顕在化する方針の核。 ガチャ/ショップ経路には触れず、 時間軸で新規性を示す。

### 3-7. 却下案 (柱1)

| 旧 ID | 却下理由 |
| --- | --- |
| 1-C-original | 「このシールは quizland で貰える」 等の `gameId` 露出は方針違反。 1-C-owl-whisper に転換 |

---

## 4. 柱2 詳細: 授受の儀式

「ちゃんと壊れて、 ちゃんと出てきて、 一緒に喜んでくれた」 手触りを、 大改修せずマイクロ改善 + 新規 celebration + 触覚統合で作る 4 案。

### 4-1. 2A-v2 : ポノ登場は 『ガチャ最終開封時の見守り顔』 1 経路に限定

- **現状**: ポノは capsule 左半分 PNG 内の静止画のみ。 open animation で -34deg 回転しながら画面外へ退場する扱いで 「pono がくれた」 感が皆無 (exact_gaps[1] Pono trapped in capsule)。 ショップ・取り置きにもキャラ登場ゼロ。
- **理想**: 経路別の登場方針を確定:

  **(a) ガチャ経路 = ポノ出す [採用]**
  - タイミング: `capsuleOpen` (`.is-opened`) 発火の +0.20s (sticker emerge の 0.04s 手前) から 1.4s 表示
  - 位置: modal 内右下、 capsule の外側 (独立レイヤ)、 80×80px
  - 表情差分 (**Ekman emotion coding 基準**、 3-5 歳が瞬時に読み取れる身体差を必須化 — 心理学者指摘):
    - **NORMAL** = `pono_smile_soft.webp`
      - 口: **開いた微笑み** (両端上向き、 口内が少し見える程度)
      - 目: 通常の丸、 わずかに細めた三日月
      - 姿勢: 直立、 両腕自然に下ろす
    - **RARE** = `pono_hop_wave.webp` (2 フレーム 0.16s ループ)
      - 口: **口を大きく開けた笑顔**
      - 目: 三日月に細めた喜び目
      - 姿勢: **片手を上げて振る + 体が 1 コマ 4px 縦跳ね**
    - **SUPER** = `pono_wow_starry_eye.webp`
      - 口: **口を丸く「わっ」の O 字**
      - 目: **星型 (Ekman 「驚き＋喜び」 の複合表現)**
      - 姿勢: **両腕が上がって体が 5deg 傾く**
      - 単なる 「目が星」 の微差ではなく口・腕・体傾きの 3 点で 「驚いた」 が身体レベルで伝わる
  - 動き: `bottom -16px` → `bottom +8px` に `translateY(-24px)` 0.32s ease-out で入場、 1.0s 停留、 fadeOut 0.24s
  - 意味: 「ポノが横で よかったねって見ていてくれた」 感。 触らない、 くっつかない、 邪魔しない
  - 差別化: 既存の左半分 pono PNG はそのまま維持。 新規レイヤは独立キャラとしての pono で別素材
  - **ポノの発話は無し** (§0.5 準拠、 キャラ肉声禁止): ポノ自身の吹き出しやテキストは一切表示しない。 ポノは決して 「話さない」 キャラとして統一する。 未識字児補助として、 画面下部に女性ナレの第三者描写 「シールが でてきたね」 (状況の観察型、 ブランドガーディアン must_fix 反映で 「ポノが〜した」 の能動形を撤廃) を 1 回だけ再生するオプションを実装 (ManageDebug でナレ OFF 可、 デフォルト ON、 新規 TTS 1 本 whisper 検証必須)。 表情 3 種 (Ekman 準拠) + 姿勢 (両手差し出しポーズ) がピクトグラム的に意味を伝えるので、 ナレは補助レイヤに留める。 **ナレプロンプト絶対条件**: 「女性ナレは決してポノ・ふくろう先生・パートナー動物の行為主性を述べない。 『ポノが〜した』 『ふくろう先生が〜した』 の能動形は禁止し、 『シールが でてきた』 『ぱかっと ひらいた』 の状況観察型で書く」 と生成プロンプトに明記。 whisper 検証の禁止キーワードに `['ポノが', 'ふくろう先生が', 'この子が']` の主語形を追加

  **(b) ショップ経路 = ポノ出さない [意図的に不採用]**
  - 理由: 店員 (ハリネズミ等の別 NPC) が交換相手なので、 pono が横取り登場すると 「誰が店員?」 が混乱する
  - 代わりに店員 NPC の 「はい どうぞ」 差し出しモーションで差別化。 pono 不在がショップの個性になる

  **(c) 取り置き受取経路 = ポノ出さない [不採用]**
  - 理由: 「後日 自分で開く」 静かな UX。 毎回 pono が入場するとノイズ
  - 代わりに 「取り置きだったシール」 を示す 小さな 🎀 リボン表示のみで済ませる (1-E との連携)

  **実装**: `play.html` modal に `#dailyGachaCelebratePono` div を新設 (左半分 pono とは別)、 CSS keyframe `dailyGachaPonoWave` を追加、 `runDailyGacha()` の `openDelay + 200ms` で `classList.add('is-visible')`。 素材 3 種を新規発注 (Claude Design 経由)。

- **子どもへの効き**: 3-8 歳が 「ポノが 一緒に喜んでくれた」 と感じるが、 1.4s + 1 経路限定 なので飽きない。 ショップ/取り置きは別の情緒 (店員のもてなし / 静かに開く楽しみ) を持たせる分業になる。 現状の 「トラップされた絵」 は 「カプセルの装飾」 に役割整理できる。
- **表情差分の 3-5 歳児認識可能性検証** (Claude Code 未識字児レビュー must_fix、 Ekman coding の科学的根拠を実測に落とし込む):
  - 素材確定前に 3-8 歳児 **最小 6 名** を対象に表情認識テストを実施 (反応時間 + 正答率を測定)。 NORMAL/RARE/SUPER の 3 種を無作為順で提示し 「どのポノが一番うれしそう?」 「どのポノがびっくりしてる?」 を口頭で確認
  - 星型目 (SUPER) は日本の 3 歳児で 「花火」 と誤認される可能性あり。 「星型目」 単独ではなく 「星型目 + 口 O 字 + 両腕上げ + 体傾き 5deg」 の 4 要素同時変化で 「驚き＋喜び」 を伝える。 これは Ekman 「複合表現」 の身体化
  - 認識テストで NORMAL/RARE/SUPER の弁別正答率が **有意差なし** (p >= 0.05) の場合は §4-2 マイクロ改善 4 点に絞って先行実装し、 表情差分は後期フェーズへ延期する rollback plan を持つ
  - 素材 brief.md に 「3-5 歳児への聴感/視認テスト前提」 を明記し、 デザイナーが 「ポノが話す」 と誤解しないよう 「この表情は見守る姿勢を示すビジュアルシグナル。 ポノ自身は話さず、 ナレーターが説明する」 を brief 冒頭に固定
  - 検証結果を `docs/user_test_reports/pono_expression_recognition.md` に記録
- **実装初手 (素材納品フロー 3 ステップ)**:
  1. `.claude-design-bundle/components/gacha-celebrate-pono/brief.md` を **先行作成** — ポノ表情 3 種 (Ekman coding 基準の身体差、 口/目/腕/体傾きの図解付き)、 配置位置 (modal 右下 80×80px)、 動き keyframe、 想定サイズ (128×128px 元素材) を確定。 「ポノは話さない、 表情は見守り姿勢のビジュアルシグナル」 を冒頭に明記。 コード実装前必須
  2. Claude Design (Pono LP Brand Kit) 経由で並列生成 → 採用案確定 (`feedback_brand_kit_design_via_claude_design.md` 準拠、 Claude Code の MCP 直生成禁止)。 skill: `mcp__claude_ai_Figma__use_figma` は本プロジェクトで使用しない (Figma 経由の生成は Brand Kit 側で完結)
  3. 採用素材を `assets/ui/gacha/pono_celebrate_{normal,rare,super}.webp` に配置 (既存 `assets/ui/gacha/` パスパターンに統一)。 その後 `play.html` L6299-6378 の gacha modal HTML 直下に `#dailyGachaCelebratePono` div を追加、 L3408 付近に `dailyGachaPonoWave` keyframe を追加、 `runDailyGacha()` の `openDelay + 200ms` で `classList.add('is-visible')`
- **effort**: M
- **impact**: 0.72
- **files**:
  - `.claude-design-bundle/components/gacha-celebrate-pono/brief.md` (**先行作成**)
  - `play.html`
  - `assets/ui/gacha/pono_celebrate_normal.webp`
  - `assets/ui/gacha/pono_celebrate_rare.webp`
  - `assets/ui/gacha/pono_celebrate_super.webp`
- **方針整合**: ユーザー明言 「せいぜいガチャの方でポノの顔が出てきて良かったねぐらい」 を 1 経路限定 + 1.4s + 邪魔しない位置で忠実に反映。 過剰演出を防ぐため 不採用経路も明記。

### 4-2. 2B-v2 : 既存 unboxing の 惜しい 1 秒を マイクロ改善 4 点 (大改修禁止)

`exact_gaps` 由来の改善のみ、 コード変更は各 30 行以内。

- **改善 1: turn 3 だけ ドラムロール的な pitch ramp**
  - 現状: 3 turns 全て click SE、 volume/rate 微調整のみ (`L7633-7637`)
  - 変更: turn 3 の `commitDailyGachaTurn()` で `finalStinger` の `playbackRate` を 0.85→1.15 の 0.5s ramp、 volume も 0.8→1.0 ramp
  - 実装: `play.html:8707` `finalStinger` 呼び出しを `PonoAcornAudio.playWithRamp()` (新規 helper 8 行) に置換
  - 効果: 「もうすぐ何か来る」 の予感を 0.5s だけ足す

- **改善 2: capsule 割れ瞬間の 白フラッシュ 60ms**
  - 現状: sparkle が open と同時に infinite pulse で始まる (`L3173-3174`) が climax 感薄い (exact_gaps[2])
  - 変更: `.is-opened` 追加と同時に modal backdrop に 60ms だけ opacity 0.35 の白オーバーレイ (新規 keyframe `dailyGachaFlashPop`)
  - 制約: 花火/爆発 NG 遵守。 `rgba(255, 250, 240, 0.35)` の森トーン白
  - rarity 別: NORMAL は出さない、 RARE は 60ms、 SUPER は 120ms + 温かい橙微量

- **改善 3: 「また あした」 バブル出現を 1.5s 遅延**
  - 現状: 3.35s から出て sticker peak (実時間 5.58-6.92s) と競合 (exact_gaps[4])
  - 変更: 即時表示を stickerOut 完了 + 0.4s 後に遅延、 shortcut close で消失可
  - 実装: `play.html:8780` 前後の `setTimeout` 追加 1 箇所

- **改善 4: sticker emerge 軌跡を capsule 中心と接続**
  - 現状: sticker が -34px から 98px の縦一直線 (exact_gaps[3] Spatial dissonance)
  - 変更: `dailyGachaStickerOut` keyframe に 30% で `scale 0.72 + translateY 34px` の中間 keyframe を追加、 「capsule の口からこぼれる」 感を出す
  - コード追加: keyframe 6 行のみ

- **子どもへの効き**: 各改善は単独では微差だが 4 点合計で 「ちゃんと壊れて、 ちゃんと出てきた」 一続きの体感に。 大人には気付かれない層だが 3-8 歳は 「なんかいい!」 と感じる粒度。
- **定量検証 MilestoneTask** (心理学者指摘、 定性→定量の転換):
  - 実装完了後、 3-8 歳児 **8 名以上** のユーザーテストを実施
  - 測定指標: (a) 開封直前の視線滞留時間 (turn 3 開始〜capsule open)、 (b) 笑顔検出 (open 瞬間〜+1.5s の positive facial affect)、 (c) 自発的発話 (「わー」 「あっ」 等の interjection 頻度)
  - 比較: 実装前/後で t-test、 p < 0.05 で有意差確認後に本番展開
  - 検証結果を `docs/user_test_reports/gacha_climax_4point.md` に記録
  - **有意差が得られなかった場合は改善案を rollback** し、 別アプローチを再検討 (「4 点合計で効く」 の仮説を捨てる勇気を持つ)
- **実装初手**: `play.html:7633-7637` の `DAILY_GACHA_TURN_SFX` の rate/volume を配列化し `commitDailyGachaTurn()` L8705-8707 で step 別に呼び分ける (改善 1 を最小コミットで先行)。
- **effort**: S
- **impact**: 0.55
- **files**:
  - `play.html`
  - `docs/user_test_reports/gacha_climax_4point.md` (検証後)
- **方針整合**: 「既に unboxing 実装済み」 前提を守り、 削除・大改修は一切しない。 4 点全て既存 keyframe/timing に対する +30 行以内の追記。

### 4-3. 2C-v2 : 貼付時 多感覚 celebration 詳細スペック (2 段階分離: 確定感 → 喜びブースト)

`Prototypes/StickerBookThreeJS/main.js` の `onStickerPlaced()` に発火。

**設計思想: 2 段階分離** (心理学者指摘、 Ayres 1972 感覚統合の過剰刺激警告への対応):

同時多感覚発火は感覚敏感児 (約 15-20%) に overload を起こすため、 celebration を明示的に 2 段階に分離する:

- **第 1 段 「確定感」 (0-80ms)**: vibrate のみ、 音・視 なし。 短い触覚単独で 「はまった」 を伝える
- **第 2 段 「喜びブースト」 (+300ms 遅延)**: 女性ナレ (第三者描写) + glow + Points burst を発火。 3-5 歳の脳が第 1 段を処理し終わってから重ねる。 ポノ自身は無音のまま画面隅で嬉しそうにジャンプ (0.3s bounce アニメ、 新規素材) して 「喜んでいる」 ことをピクトグラム的に示す

これにより neurotypical 児には十分な充足感、 感覚敏感児には 「触覚だけ体験」 の逃げ道を提供 (ManageDebug で 「よろこびナレ」 「よろこび ひかり」 「よろこび つぶ」 の 3 チェックボックスを OFF にすれば第 2 段が消える)。 §0.5 準拠でキャラ肉声は使わず、 音声は女性ナレ (Gemini Leda 1.15x) の第三者読み聞かせのみ許可する。

**[1] Three.js Points burst (8-12 個、 Gestalt psychology 準拠)**
- 数: **NORMAL 8 / RARE 10 / SUPER 12** (旧案 12-16 個 → Gestalt 「visual cluster の最適数 7±2」 に基づき削減 — 心理学者 should_improve 指摘)
  - 16 個は 「ノイズに見える」 リスクがあり、 3-5 歳児の視覚処理容量を超える
- 色パレット (森トーン厳守、 蛍光禁止):
  - `#E8D6A8` (麦)、 `#C9B48A` (亜麻)、 `#A8C4A2` (若葉)、 `#F2C6B4` (桜貝)
  - SUPER のみ `#FFF0C0` (蜂蜜微量) 1 個混入
- 軌跡: 貼付点から radial 発射、 初速 `vy = -0.6 ~ -1.1 rand`, `vx = -0.5 ~ 0.5 rand`, gravity 0.9
- lifespan: 700-1100ms rand、 opacity 1.0 → 0 の linear fade
- サイズ: `PointsMaterial size 0.02-0.035` (world unit)、 `sizeAttenuation: true`
- 形状: 円形テクスチャ 1 枚 (`soft_dot_16px.png`)、 star 形は禁止 (花火 NG)
- **iPad ロー品質モード** (実装リード指摘、 A10/A12 60fps 維持のため): デバイス検出で iPad 世代を判定、 gen 5-6 (A10/A12) は particle count -25% (NORMAL 6/RARE 8/SUPER 10)、 glow は Sprite 1 枚のまま texture 圧縮版 (`glow_soft_low.png`) に差替、 vibrate は基本パターンのみ (RARE/SUPER の多段パターンを NORMAL 相当に fallback)。 ManageDebug に 「軽量モード」 手動 toggle も追加
  - **実測検証フロー** (実装リード must_fix、 60fps 維持が机上計算にならないよう): 実装後、 iPad gen 5-6 (A10/A12) 実機でユーザーテストを実施し、 celebration 発火時の fps を Chrome DevTools remote debug で記録 (target: 50fps 以上、 min 45fps)。 60fps 達成できない場合は particle count をさらに削減 (NORMAL 4 / RARE 6 / SUPER 8) するか、 glow を texture 動画 (h.265) に差替。 検証データを `docs/user_test_reports/celebration_fps_ipad_a10a12.md` に記録し、 各世代 (A10 / A12 / A13 / A14) の fps 実測値を表化

**[2] PonoNarratorAudio 「そっとよろこびを伝える描写ナレ」 (女性ナレ 10 本、 whisper 検証前提)**

§0.5 準拠でキャラ肉声は禁止。 全 10 本を女性ナレ (Gemini Leda 1.15x) の第三者読み上げに置換。 直接話法 (「すてき!」) だと 「誰が言った?」 が曖昧なので、 間接描写 + オノマトペ + 短句のミックスに設計し直した。

| # | ナレ短句 (第三者描写) | 用途 | rarity プール |
| --- | --- | --- | --- |
| 1 | 「はれたんだ」 (第三者観察、 目的語=シール) | pasted 汎用 | NORMAL |
| 2 | 「ぴったり おさまった ね」 (判定描写、 目的語=シール) | 汎用 | NORMAL |
| 3 | 「いろが すてき ね」 (絵柄描写、 目的語=シールの絵) | 汎用 | NORMAL |
| 4 | 「きれい に ならんだ ね」 (状態描写、 目的語=ページ) | 汎用 | NORMAL |
| 5 | 「もう ひとつ さがそう ね」 (次への誘い、 ナレが子に語りかける) | 連続貼付 3 枚目 | RARE |
| 6 | 「ここに いたんだ ね」 (発見描写、 目的語=シールの子) | rare 専用 | RARE |
| 7 | 「ぴかぴか した ね」 (視覚オノマトペを子と共有する共有型) | 情動フック | NORMAL |
| 8 | 「ポノも うれしそう だね」 (ポノを第三者描写、 主語=ポノを明示、 内面ではなく外観のみ) | 感情共有、 ポノを直接発話させない | SUPER |
| 9 | 「これ お気に入り かな」 (子への問いかけ) | 汎用 | SUPER |
| 10 | 「みつけた ね」 (達成描写、 子への共有型) | 初出シール専用 | RARE |

**テキスト運用原則** (ブランドガーディアン must_fix): 全短句は 「一人称禁止・目的語は常に『子ども』『シール』『出来事』のいずれかに限定」。 女性ナレ = 森の中立的観察者としての立ち位置を保ち、 ポノ・ふくろう先生・パートナー動物の内面 (気持ち・好み・理由) には言及しない。 内面を思わせる表現 (「すきだ」 「たのしい」 「〜の理由」 「〜だから」) は禁止語彙とし、 CI script `scripts/verify_praise_voices.mjs` の禁止キーワード配列に追加する。

- 全て女性ナレ (Gemini Leda 1.15x)、 rarity 別プール分け (NORMAL: 1,2,3,4,7 / RARE: 5,6,10 / SUPER: 8,9 + 特別 chime)
- **検証フロー 6 ステップ** (アートディレクター + 実装リード + Claude Code 未識字児レビュー must_fix、 責任所在明確化 + 反転プロンプト検証 + 聴感年齢適性):
  1. TTS 生成 (生成担当エンジニア)。 生成プロンプトに 「第三者ナレーターとして読む、 キャラを演じない」 を明記 (sk_intro 事故 `feedback_tts_whisper_verify_required.md` の再発防止)。 **concrete prompt テンプレート (実装リード must_fix)**: 『これは女性ナレーターが児童向け読み聞かせとして、 キャラクター (ポノ / ふくろう先生 / パートナー動物) の肉声ではなく、 第三者の大人として、 状況を客観的に描写する音声です。 __ (テキスト) __ を、 Gemini Leda 声で、 1.15 倍速で、 柔らかく、 キャラを演じず読み上げてください。 一人称 (ぼく・わたし) は使わず、 「〜だって」 「〜らしい」 の間接話法トーンで。』 プロンプトは `.claude-design-bundle/tts-prompts/narrator_third_person_template.txt` から必ずコピー
  2. **反転プロンプト検証** (アートディレクター must_fix): 同一テキストで 「キャラが一人称で喋る」 反転プロンプトを 1 サンプルのみテスト生成し、 出力の差 (声質・トーン・感情) を wav スペクトログラムと聴感で比較。 反転版と本番版に有意な差があることを確認 (差がないなら Leda が第三者化を実装していない可能性 → プロンプト再検討)
  3. `faster-whisper` 文字起こし (自動 CI script `scripts/verify_praise_voices.mjs`)
  4. `docs/praise_voices_verification.xlsx` (対応表) で exact match 確認 (自動)。 声質一致確認: 既存 quiz TTS と同一話者 (Leda) / 同一速度 (1.15x) / 同一 volume (0.9) であることを wav メタと聴感で確認。 生成時のシード固定を推奨し、 生成後の regeneration は禁止 (同一テキストを再生成せず、 修正時は別ファイル名で並存)
  5. **親ナレーター聴感テスト** (Claude Code 未識字児レビュー should_improve → must 昇格): 実際の親 (18-50 歳) **1 名以上** に該当ナレ 10 本を聴かせ、 3-5 歳児への年齢適性・自然性を評価。 rejection case は 「早口すぎる」 「機械的すぎる」 「キャラっぽい」 の 3 rejection reason ラベルで分類し、 該当ラベル >2 なら再生成
  6. デザイナー (トーン確認担当) 目視 hanko: 感情表現・年齢適性・森トーン整合・第三者ナレ視点の妥当性。 batch 検証 (1 回の hanko session で複数ナレを同時評価) を推奨
  7. 配置 (`common/pono-narrator-audio.js` の narration registry に commit)
- exact match 失敗時 or デザイナー rejection 時は該当ナレを配置しない (`feedback_tts_whisper_verify_required.md` 準拠、 TTS 検証禁止ルールと明示的に整合)
- 再生ルール: **貼付 +300ms** (第 2 段開始時、 第 1 段 vibrate から 300ms 遅延)、 random 選択 (rarity フィルタ)、 同じナレは直近 3 回スキップ。 「同時再生禁止」 ガード: 前ナレがまだ再生中なら今回はスキップ + haptic のみ。 **BGM ducking**: 女性ナレ再生開始時に BGM を 0.4 まで下げ、 ナレ終了 300ms 後に 1.0 復帰 (PonoNarratorAudio 側で自動化、 missing_gaps 「BGM ducking なし」 を解決)

**[3] `navigator.vibrate()` パターン** — 詳細は §4-4 の触覚シナリオ表参照
- NORMAL: `[30]`
- RARE: `[20, 60, 20]`
- SUPER: `[15, 40, 15, 40, 80]`

**[4] Soft glow (SUPER 専用、 花火厳禁)**
- シール周囲に radial gradient `rgba(255, 240, 200, 0.55)` → 0、 直径 `sticker * 2.4` の円
- Three.js Sprite (`glow_soft.png`)、 sticker と同じ position、 scale 0 → 1.0 → 0.85 を 0.9s ease-out
- opacity 0 → 0.7 → 0、 total 1.2s
- **additive blending は使わない** (蛍光化するため) → NormalBlending + png のアルファグロー

**[5] ManageDebug 個別 toggle** (`feature_manage_debug_settings_panel.md` 準拠)

設定画面 celebration セクション:
- [x] よろこび つぶ (Points burst パーティクル)
- [x] よろこびナレ (女性ナレ第三者描写、 旧 「褒め声」)
- [x] 振動 (vibrate)
- [x] よろこび ひかり (SUPER glow)
- [x] 全体 ON/OFF (親スイッチ)

localStorage keys: `ponoCelebration.particle` / `.narration` / `.vibrate` / `.glow` / `.master`
デフォルト: 全 `true`

(旧 `voice` key は §0.5 の 「voice 単独語禁止」 方針に沿って `narration` に改名)

**発火順序 (2 段階分離、 合計 1.5s 以内)**

| t (ms) | 段 | イベント |
| --- | --- | --- |
| 0 | 第 1 段 | 貼付確定 |
| +0 | 第 1 段 | **vibrate のみ** (`[30]` 等、 §4-4 表参照) — 音・視 なし |
| +80 | 第 1 段完了 | 短い確定感の完了 |
| +300 | 第 2 段 | Points burst 開始 |
| +300 | 第 2 段 | 女性ナレ praise 再生 (第三者描写、 第 1 段から 300ms 遅延、 BGM ducking 発火) |
| +300 (SUPER のみ) | 第 2 段 | soft glow 開始 |
| +1500 | 全 clear |

**発火順序の設計理由**: 第 1 段の 80ms 触覚だけで感覚敏感児は 「はまった」 を認識できる。 第 2 段の +300ms は 3-5 歳の情報処理レイテンシに合わせた 「重ねてよい」 のタイミング (Bundy 2020 感覚統合の同時発火閾値)。

- **子どもへの効き**: 3-8 歳の脳内報酬回路を 2 段階分離で 「確定感 → 喜び」 の心理的リズムに沿って発火。 花火/蛍光を排除しているため保護者の安心感も維持。 感覚敏感児は第 2 段 opt-out で第 1 段のみ体験可能。 SUPER glow を出し惜しみすることで 「またあの光が見たい」 内発動機に繋がる。
- **実装初手**: `Prototypes/StickerBookThreeJS/main.js` の `onStickerPlaced` (grep で位置特定) に celebration hook を差す。 まず第 1 段 vibrate のみ、 次に第 2 段 Points burst のみ、 の順で個別 PR 化 (voice/glow はさらに別 PR)。

- **TTS 生成 31 本の工数見積 + 優先度順序** (実装リード must_fix):
  - **総本数内訳**: praise voice 10 本 (§4-3) + owl-whisper 12-16 本 (§3-3、 8+8=16 想定) + shop-glow hint 6-8 本 (§3-4) + newbie ribbon 1 本 (§3-6) + ポノ登場ナレ 1 本 (§4-1) + みせるモード 1 本 (§5-3) = 合計 31-33 本
  - **工数見積**: TTS 生成 (31 本) = 1 日、 whisper 検証 CI (自動) = 1 日、 反転プロンプト検証 (§4-3 検証フロー step 2) = 0.5 日、 親ナレーター聴感テスト (§4-3 step 5) = 0.5 日、 デザイナー hanko (全 31 本 batch) = 3-4 日、 **合計 5-6 日**
  - **優先度順序**: (1) praise voice 10 本 (§4-3、 celebration 実装のブロッカー) → (2) owl-whisper 16 本 (§3-3 PoC 用) → (3) ポノ登場ナレ 1 本 + newbie ribbon 1 本 → (4) shop-glow 6-8 本 + みせるモード 1 本
  - **hanko 工数削減**: デザイナー hanko は batch 検証 (1 session で複数ナレ同時評価) を推奨。 rejection 時は該当ナレのみ再生成
  - スケジュール明記: `docs/tts_generation_schedule.md` に本表を転記し、 生成担当エンジニアと共有
- **`common/pono-narrator-audio.js` 最小スケルトン** (実装リード指摘、 §0.5 準拠のモジュール名改称: 旧 `pono-acorn-audio.js` → `pono-narrator-audio.js`。 「ポノが話す」 誤解を避け、 キャラ肉声禁止方針を名前で明示。 将来の改修で誤ってキャラ肉声が混入するのを命名で予防):
```js
// common/pono-narrator-audio.js (新規作成)
// 既存 play.html 内 audio 処理系との統合ラッパ
// 全て女性ナレ (Gemini Leda 1.15x) 前提。 キャラ肉声は絶対に登録禁止
export class PonoNarratorAudio {
  static _narrationRegistry = {}; // { narrationId: HTMLAudioElement }
  static _recentHistory = []; // 直近 3 回スキップ管理

  static register(narrationId, audioSrc) { /* preload */ }
  static play(narrationId, opts = {}) { /* volume/rate 指定可、 BGM ducking 内蔵 */ }
  static playPraiseNarration(rarity) { /* rarity フィルタ + random + 履歴 + 同時再生ガード */ }
  static playOwlHint(silhouetteId) { /* §3-3 の間接話法ナレを再生 */ }
  static playStickerNewbie() { /* §3-6 の 「あたらしい おともだちが きたって〜」 */ }
  static playWithRamp(narrationId, rateRamp, volRamp, ms) { /* 4-2 改善 1 用 */ }
}
```
iOS Safari unlock は既存 PuzzleVoice.js を参考に実装。 ManageDebug 個別 OFF フラグ対応。 既存 play.html 内 audio 変数の初期化位置 (L245 付近) に import + `PonoNarratorAudio.register()` 呼び出しを追記。 なお iOS 音代替 (§4-4 の 440Hz sine wave 短音) は 「機能音」 レイヤなので `HapticFallbackAudio.playClick()` (別モジュール) に切り出し、 「音声 (narration)」 と 「機能音 (functional tone / SE)」 を実装レイヤで分離する (§0.5 準拠)。

- **`js/manage-debug-settings.js` 統合** (実装リード指摘):
  - 既存 debug settings panel が存在するか要確認 (`feature_manage_debug_settings_panel.md` は計画段階)。 なければ本 PR で新規作成
  - localStorage key 命名は play.html L49 の既存 `pono_*` パターンに整合させ、 本モジュールは `pono_celebration_*` プレフィクスを使用 (`.master` → `pono_celebration_master`)
  - 設定画面から dispatch する custom event `pono:celebration-settings-changed` を main.js が listen し即時反映

- **effort**: L
- **impact**: 0.88
- **files**:
  - `Prototypes/StickerBookThreeJS/main.js`
  - `Prototypes/StickerBookThreeJS/assets/soft_dot_16px.png`
  - `Prototypes/StickerBookThreeJS/assets/glow_soft.png`
  - `Prototypes/StickerBookThreeJS/assets/glow_soft_low.png` (iPad ロー品質モード用)
  - `common/pono-narrator-audio.js` (**新規作成**、 スケルトン上記、 §0.5 準拠)
  - `common/haptic-fallback-audio.js` (**新規作成**、 iOS 440Hz sine wave 機能音を音声レイヤから分離)
  - `js/manage-debug-settings.js` (存在確認後、 なければ新規作成)
  - `scripts/verify_praise_voices.mjs` (whisper 検証 CI、 「第三者ナレーターとして読む」 プロンプト明記)
  - `assets/pono_bounce_animation.webp` (**新規**、 ポノ 0.3s bounce アニメ、 無音)
- **方針整合**: ユーザーが 「そうした方がいい」 と明確同意した領域なのでフルスペック化。 花火禁止/森トーン維持/whisper 検証/ManageDebug toggle を全て仕様に組み込み済み。 感覚敏感児配慮を 2 段階分離で技術仕様化。 §0.5 準拠でキャラ肉声禁止 + 第三者ナレ間接話法 + BGM ducking + モジュール名で肉声誤混入を予防、 の 4 点を実装レイヤに定着。

### 4-4. 2D-v2 : 触覚シナリオ (シーン別 vibrate() 表 + iOS 代替 + 発達心理根拠 + opt-out)

新規 module `common/haptics.js` を作り、 全シーンから `haptics.play(sceneKey)` で呼び出す。

**シーン別 vibrate パターン表**

| シーン | パターン (ms) | 強度の意図 |
| --- | --- | --- |
| シール貼付 (NORMAL) | `[30]` | 貼れた瞬間の短い確定感。 覚醒しすぎない範囲 |
| シール貼付 (RARE) | `[20, 60, 20]` | 小さい → 少し長い → 小さい の 3 段。 「特別感」 の情動 boost |
| シール貼付 (SUPER) | `[15, 40, 15, 40, 80]` | 累積的な climax。 最後 80ms で余韻。 花火 SE と 同期しない (触覚単独で climax) |
| カプセル割れ (turn 3 後 `.is-opened`) | `[100]` | 1 発の明確な 「パカッ」。 白フラッシュ 60ms と同時 |
| RARE 出現 (badge pop 時) | `[15, 40, 15, 80]` | rarity 別で escalate |
| SUPER 出現 (badge pop 時) | `[10, 30, 10, 30, 10, 120]` | 6 段で 「わっ」 の高揚感 |
| 表紙めくり / ページめくり | `[8]` | 紙をめくる微かな触感。 覚醒最小、 集中を切らない |
| ショップ購入決定 (どんぐり消費確定) | `[40, 30, 40]` | 「ぽん・ぽん」 の支払い確認感。 取消不可の決定感を触覚で |
| ショップ購入キャンセル / どんぐり不足 block | `[15, 30, 15, 30, 15]` | 軽い denial パターン。 不快にならず 「今はダメ」 を伝える |
| ガチャ turn 1-2 のレバー回転完了 | `[12]` | 1 turn 分完了の手応え。 turn 3 に向けたリズム構築 |
| ガチャ turn 3 のレバー回転完了 (climax 予告) | `[20, 50, 20]` | 「これで最後」 の触覚合図。 直後の drop アニメへ期待を渡す |
| ガチャ 本日使用済み ('used') block タップ | `[10, 40, 10]` (既存 `triggerDailyGachaBlockedFeedback` を統合) | 既存実装を module 統合 (新規追加ではなく統合対象) |
| 取り置きシール 受取確定 | `[25, 40, 25]` | 「開封」 に近いゆっくりめの 3 段。 pono 不登場を触覚で埋める |

**エスカレーション上限** (心理学者指摘、 触覚疲れ・パターン学習防止):
- 1 分間に発火可能な触覚パターンは **最大 3 パターン** まで。 4 個目以降は skip (silent fail)
- `common/haptics.js` 内でリングバッファ管理: `_recentTimestamps: [t1, t2, t3]`、 `now - t3 < 60000` なら skip
- ページめくり (シーン `page`) は連続発火が想定されるため上限カウントから除外 (`ignoreQuota: true` フラグ付き scene 定義)
- 上限到達時のログは開発時のみ console.warn、 本番は silent

**発達段階別パターン区分** (心理学者指摘、 3-5 歳と 6-8 歳の触覚許容差):
- ManageDebug 設定画面に **年齢入力** (3-5 / 6-8 / 未入力) を追加。 未入力時は 3-5 相当を default (安全側)
- 3-5 歳 mode: 全パターンの単位長を **20-40ms 上限** に truncate (例: SUPER `[15, 40, 15, 40, 80]` → `[15, 40, 15, 40, 40]`)
- 6-8 歳 mode: 表通りのフルパターン (最大 80ms 単位)
- 変換ロジック: `haptics.js` の `_capForAge(pattern)` helper で一括処理

**iOS 対応** (Web Vibration API は iOS Safari 非対応、 2026-07 時点でも)
- **Audio 代替**: 短い **440Hz (A4 音) sine wave** を `HapticFallbackAudio.playClick()` (別モジュール `common/haptic-fallback-audio.js`) で volume **0.15 (初期値、 実測後上方修正可)**、 duration 3-5 歳: 20ms / 6-8 歳: 40ms で再生。 §0.5 準拠で 「機能音 (functional tone / SE)」 レイヤに分類し、 女性ナレ (`PonoNarratorAudio`) と実装レイヤを分離する (旧 `PonoAcornAudio.playHapticClick()` を改名 + モジュール分割。 「音声 (voice)」 と 「機能音 (functional tone)」 を混同しないため)
  - **60Hz は使用しない** (心理学者指摘、 Thaut et al. 2005 Music & Neuroscience: 低域音は幼児の情動制御に強い影響、 予測しづらい覚醒を引き起こす)
  - 440Hz は音楽の基準ピッチ、 子どもにとって最も 「自然」 な短音
  - **音量実測要件** (Claude Code 未識字児レビュー must_fix): デバイス実機での聞こえ具合を検証するまで volume 0.15 は暫定値扱い。 A/B テスト (3-8 歳児 **最小 10 名**) で volume **0.1 / 0.15 / 0.2 / 0.25 / 0.3** の 5 段階で 「音が聞こえたか」 「意図的なフィードバックと感じたか」 の正答率を測定。 iOS デバイス (iPad 第 5/6 世代、 iPhone SE) でスピーカー出力レベル (dB SPL) を実測。 通知音の相対レベル (40-60 dB SPL) と比較して 「小さすぎず、 うるさすぎず」 の帯を確定。 結果に応じて volume は 0.2〜0.25 への上方修正、 もしくは 「440Hz 不足なら 800Hz + volume 0.2」 の代替案を検討。 実測結果を whisper 検証フローと同レベルの品質ゲートとして `docs/user_test_reports/ios_haptic_audio_volume.md` に記録
- **CSS 代替**: 対象要素に `haptic-shake` クラスを 120ms 付与 (`translateX ±1px` の 60ms 周期)
- **iOS 判定**: `/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream`
- 実装: `haptics.js` 内で `if (navigator.vibrate) { vibrate } else { fallback audio + css }`

**発達心理根拠 (3-8 歳)**
1. **前庭 - 固有受容 - 触覚統合** (Ayres 感覚統合理論): 就学前後は多感覚統合が急成長する時期で、 視聴 + 触の同時入力は記憶定着率を上昇 (Ayres 1972, Bundy 2020)
2. **因果理解の形成**: 「押す → 震える」 の直近フィードバックが自己効力感 (Bandura) を高める。 特に 3-5 歳は 「自分がした感」 を触覚で最も強く感じる
3. **情動制御**: 短い規則的振動 (30-80ms) は落ち着き効果、 不規則長振動 (200ms+) は覚醒。 celebration に 40ms 台を使うのは覚醒しすぎない範囲での喜びブースト
4. **遊びの再開性** (Vygotsky): 触覚報酬は 「もう一度やりたい」 を惹起、 セッション継続時間に寄与

出典は README / design docs にリンク推奨。

**opt-out (ManageDebug 設定画面 「触覚」 セクション)**
- [x] 触覚 全体 ON/OFF (master)
- [x] シール貼付時 の触覚
- [x] カプセル開封時 の触覚
- [x] レア出現時 の触覚
- [x] ページめくり時 の触覚
- [x] ショップ購入決定 の触覚
- [x] iOS 音代替を許可 (デフォルト off、 iOS ユーザーが選べる)

localStorage keys (play.html L49 `pono_*` パターンに整合): `pono_haptics_master` / `_sticker` / `_capsule` / `_rare` / `_page` / `_shop` / `_ios_audio_fallback` / `_age_group` (3-5|6-8|null)
保護者向け 「就寝前は OFF 推奨」 の説明文を設定画面下部に配置。
`AGENTS.md` security-review 該当箇所 (`localStorage` 書込) に `haptics.js` を追加。

**管理画面への統合** (実装リード指摘):
- 既存 debug settings panel は `feature_manage_debug_settings_panel.md` に計画のみ (実体未作成)。 本 PR で `js/manage-debug-settings.js` を新規作成
- panel HTML は `admin/` 配下に配置し `admin/index.html` から dynamic import
- 「触覚」 セクションと 「celebration」 セクション (§4-3) は同一 panel 内に配置
- 変更時 custom event `pono:haptics-settings-changed` を dispatch、 `haptics.js` module が listen して即時 state 更新
- localStorage への直接書き込みは AGENTS.md security-review 対象なので `admin/` 配下のみに集約

- **子どもへの効き**: 3-8 歳が 「押した → 応えてくれた」 の因果を触覚で即受け取れる。 iOS ユーザーも音 + CSS で 「なにか起きた」 の代替を得られ、 端末差別で寂しくならない。 opt-out で保護者コントロール完備、 感覚過敏の子にも配慮。
- **実装初手 (既存 audio pipeline 統合マップ、 実装リード must_fix)**:
  1. **既存呼び出し全走査**: `play.html` および `Prototypes/StickerBookThreeJS/` 配下で `navigator.vibrate(`, `triggerDailyGachaBlockedFeedback`, `partner_*` voiceTag の呼び出しを grep し、 全 callsite の位置と目的を `docs/audit/haptics_migration_map.md` に列挙
  2. **モジュール責任分離図**: (a) `common/pono-narrator-audio.js` = 女性ナレ音声 (第三者読み聞かせ / BGM ducking / whisper 検証済み registry) (b) `common/haptic-fallback-audio.js` = 440Hz sine wave 機能音のみ (iOS haptic 代替) (c) `common/haptics.js` = 触覚のみ (vibrate + iOS 音代替の呼び分けは c → b に委譲) の 3 モジュール構成を README に図解
  3. **初期化順序を固定**: `<script>` タグの順序で (a) `common/haptics.js` を最初に import (b) 続けて `common/haptic-fallback-audio.js` (c) 最後に `common/pono-narrator-audio.js` を import し、 `.register()` 呼び出しを一括実行。 event binding は初期化完了後の DOMContentLoaded で実施
  4. **段階的置換**: まずシール貼付 1 シーンだけ `haptics.play('sticker.paste.normal')` に配線して動作確認 → 全 12 シーンを順次移行 → 既存 bare `navigator.vibrate()` 呼び出しを撤去 (grep で 0 件になるまで) → 完了確認 PR で `common/haptics.js` に 「唯一の vibrate 呼び出し口」 コメントを付す
- **effort**: M
- **impact**: 0.68
- **files**:
  - `common/haptics.js`
  - `Prototypes/StickerBookThreeJS/main.js`
  - `js/manage-debug-settings.js`
  - `play.html`
- **方針整合**: 前回 「説明わかりにくい」 指摘を受け、 シーン別表 + iOS 代替具体化 + 発達心理根拠 + opt-out 粒度を全て仕様に落とし込み済み。 触覚をどこで発火するかが一覧で見える化された。

### 4-5. 却下案 (柱2)

| 旧 ID | 却下理由 |
| --- | --- |
| 2B_original_envelope_egg_unboxing | 既にカプセル + 3 回回す + 開封の unboxing 演出が実装済み。 新規 unboxing 追加は二重化するため削除、 マイクロ差分改善 (2B-v2) に転換 |
| 2A_original_pono_handoff_all_paths | 全 grant 経路 (ガチャ/ショップ/取り置き) で pono 手渡しを提案していたが、 ユーザー明言 「せいぜいガチャの方でポノの顔が出てきて良かったねぐらい」 を尊重し、 ガチャ 1 経路 + 見守り顔 1.4s に縮小 |
| 2A_pono_carry_sticker_animation | pono がシールを手に持って渡すアニメは素材制作コスト大 + capsule 内静止 pono との整合性が破綻。 独立レイヤの見守り顔で代替 (制作コスト 1/3、 情緒的機能は同等) |

---

## 5. 柱3-5: 一言サマリ (保留)

**保留理由**: 柱1 の 「シールの自由絵柄 (`origin: 'free'`) を第一級市民に格上げ」 と、 柱2 の 「授受の 1 経路特化」 が確定してから設計しないと、 物語・成長・共有の各柱が 「gameId 前提」 の古い設計に引きずられる。

**保留リスクの明示** (心理学者指摘): 柱3 (物語の背骨) が欠落したまま柱2 の celebrate voice が 「ふくろう先生の褒め声」 を発するのは意識的な設計選択である。 シールの物語断片が定義されていない段階では、 voice は 「褒め」 (`praise`) に留め、 「その子の物語を語る」 表現は禁止する。 柱3 実装時に voice pool を拡張して 「物語言及」 バリエーションを追加する予定。 この明示なしに柱2 単独実装すると 「なぜ voice が短句褒めなのか」 が実装者に伝わらず、 齟齬が発生する。

**再検討トリガ (一元化、 アートディレクター指摘)**:
- **条件**: 柱1 (§3-0 + §3-1 + §3-2) と柱2 (§4-1 + §4-2 + §4-3 + §4-4) の全 PR が master に merge 完了
- **期限**: merge 完了から **1 週間以内**
- **参加者**: デザイン (アートディレクター) / 運営 / エンジニアリード の 3 者合同齟齬検証会
- **アウトプット**:
  - 議事録: `.claude-design-bundle/pillars-3-5-redesign/meeting_notes_YYYY-MM-DD.md`
  - 再設計 brief: `.claude-design-bundle/pillars-3-5-redesign/brief.md`
  - 各柱の GO/NO-GO 判定 + 設計方針確定
- **議題**:
  1. 柱2 celebrate voice の 「褒め止まり」 から 「物語言及」 への拡張可否
  2. 柱3 物語断片の origin 別トーン (book/game/free) 差別化
  3. 柱4 表紙成長ロジックの collection 進捗連動仕様
  4. 柱5 KDP 連動タイミング (`feature_kdp_amazon_listing.md` の launch 時期と整合)
- **事前共有ドキュメント** (実装リード should_improve): 検証会前に `.claude-design-bundle/pillars-3-5-redesign/pre_sync_README.md` を作成し、 「柱3 欠落のため §4-3 praise voice を意識的に短句褒めに設計した」 因果関係を参加者に共有する。 これがないと 「なぜ voice が短句褒めなのか」 「なぜ物語言及がないのか」 の質問がラウンド開始後に頻出し、 議題進行が滞る
- **voice pool 拡張時の判定フローチャート** (実装リード should_improve、 v4 以降の実装時に praise voice を維持するか一本化するかの意思決定): 検証会で 「物語言及」 バリエーション追加が GO の場合、 (a) 既存 praise voice 10 本を維持したまま物語系 5-8 本を別プールで追加 (デフォルト、 初出シールに使用) か (b) 一本化して全 15-18 本に統合するかを判定。 判定基準は 「初出時と再貼付時でナレを変えたい要求があるか」。 テンプレート: `.claude-design-bundle/pillars-3-5-redesign/voice_pool_extension_flowchart.md`

### 5-1. 柱3 物語の背骨 (保留)

- **一言サマリ**: 「1 シール = 1 物語断片」。 シールにミニ物語 (30-60 字) と 「もらった理由」 を紐付けて、 世界観を積層する。
- **保留タグ**: 柱1 の origin 分離が確定してから、 book/game/free それぞれの物語トーンを再設計。

### 5-2. 柱4 長期成長の可視化 (保留)

- **一言サマリ**: 表紙が育つ森 (収集率で背景の木が成長)、 開封 Peak 儀式、 時間帯/季節/週次セレクト、 デイリー朝の郵便、 コンプ祝祭。
- **保留タグ**: 柱1-D (今日のショップ光り) と柱2-A (celebrate pono) の実装後、 「日々の変化」 のリズムを見てから儀式頻度を決める。

### 5-3. 柱5 家庭内共有 (保留)

- **一言サマリ**: 「ママにみせる」 物理儀式 (画面を持って見せに行くトリガ)、 KDP 絵本連動限定シール開封、 家族アカウント切替時の演出。
- **保留タグ**: KDP Amazon リスティング (`feature_kdp_amazon_listing.md`) と絵本合言葉 (`policy_book_buyer_password.md`) 側の確定を待ってから設計。
- **音声方針 (先行確定、 §0.5 準拠)**: 「みせるモード」 の家族向け呼びかけ発火は、 スプラッシュ 3 回目以降 (localStorage で count) に画面下部から控えめな橙リボンで 「おうちの ひとと いっしょに みるモード」 パネルをスライドイン。 テキスト: 「おうちの ひとに みせたい ときは、 ここを ながおしして ね」。 女性ナレが同文を間接話法で 1 回読み上げ (「おうちの ひとに みせたい ときは、 ここを ながおしすると いいって」、 新規 TTS 1 本 whisper 検証必須)。 ManageDebug で OFF 可、 7 日 cooldown。 未識字児が保護者に 「あれなに?」 と聞くフックとして機能する設計。

---

## 6. やってはいけないこと (トーン制約)

**絶対禁則**
- 花火 / 爆発 / 蛍光色 (蛍光ピンク・蛍光緑・蛍光青) の使用
  - **理由**: 森トーン絵本世界の一貫性毀損。 蛍光は自然界に存在せず 「ポノの森」 の質感を壊す。 3-8 歳の感覚統合期に強い彩度刺激は覚醒過剰を招く (Ayres 1972 感覚統合理論、 詳細は `docs/DESIGN_PSYCHOLOGY.md` (未作成、 §4-4 出典と統合予定) 参照)
- 星形パーティクル (円形のみ許可)
  - **理由**: 星形は西洋的祝祭記号で花火連想が強い。 円形 (soft_dot) はドングリ/木の実/水滴の自然物連想で森世界と整合
- Additive blending による発光 (蛍光化するため、 NormalBlending + アルファグローで代替)
  - **理由**: additive は色域を突き抜けて蛍光化する物理特性。 NormalBlending + png のアルファグローで 「柔らかい光」 を維持
- 200ms を超える単発 vibrate (覚醒しすぎ、 子ども向けに不適切)
  - **理由**: 200ms を超えると触覚が 「異物混入」 として脳幹で処理され、 情動制御が崩れる (Bundy 2020 感覚統合)。 30-80ms 台は 「なだめ」、 200ms+ は 「警戒」 の区分
- 「このシールは XX で貰える」 と `gameId` / 入手経路を UI で明示すること (自由絵柄カタログ性を毀損)
- 「今日のガチャ在庫は ○○」 「ショップで見かけたら教えるね」 等の経路情報リーク
- ポノをショップ・取り置き経路に登場させること (店員 NPC / 静かな受取 UX の情緒を壊す)
- 画像を CSS で stretch (縦横比違反、 `feedback_image_aspect_ratio.md` 参照)
- TTS voice を whisper 検証なしでデプロイ (`feedback_tts_whisper_verify_required.md` 参照)
- **ポノ・ふくろう先生 (および パートナー動物 全 8 種) に肉声を持たせる** (§0.5 準拠、 TTS も収録も新規発話も全面禁止。 既存 `partner_*` voiceTag も第三者ナレ間接話法ルートへ置換)
- **女性ナレをキャラの代弁として直接話法で書く** (「〜だよ」 の一人称は禁止、 必ず 「〜だって」 「〜と ふくろう先生が いっているよ」 の間接話法・第三者読み聞かせ視点に書き換える)
- **fal-ai / 他 TTS で 「ポノ声」 「ふくろう先生 声」 と称した資産を新規生成する** (キャラ肉声禁止の抜け道になるため。 音声を生成する場合は必ず 「女性ナレーターが第三者として読む」 プロンプトで Gemini Leda 1.15x のみを使用)
  - **fal-ai 禁止の技術的理由** (実装リード must_fix): fal-ai は汎用 TTS で声質調整の自由度が高く、 「ポノ風の柔らかい声」 とプロンプトするだけでキャラ性が帯びる可能性が高い。 代わりに Gemini Leda 1.15x (Google TTS、 「女性ナレーター」 に特化、 1.15x 速度対応、 faster-whisper 親和性、 cost ceiling が予測可能) を標準とする。 Leda は音色の「キャラ化」自由度が低く、 プロンプトで 「ポノとして読んで」 と指示しても第三者ナレとして安定して読み上げるため、 誤解・誤混入耐性が高い
- spec / コード / docs で 「voice」 という語を単独で使う (必ず 「女性ナレ (female narrator)」 「機能音 (functional tone / SE)」 「キャラ肉声 (character voice = 禁止)」 のいずれかに明示分類する。 モジュール名にも反映 = `PonoNarratorAudio`, `HapticFallbackAudio` 等)

**推奨トーン**
- 森トーン: 麦色 (`#E8D6A8`)、 亜麻色 (`#C9B48A`)、 若葉色 (`#A8C4A2`)、 桜貝色 (`#F2C6B4`)、 蜂蜜色 (`#FFF0C0`、 SUPER 微量のみ)
- 触覚: 30-80ms 台の短い規則的パターンを基本に、 climax のみ累積型
- 言葉: ふくろう先生は 詩的・抽象的・想像を促す。 攻略情報を絶対に与えない
- ポノ登場: 見守る・触らない・邪魔しない。 1.4s 以内で退場
- opt-out: 全 celebration 要素を保護者が個別 toggle できるように `ManageDebug` 設定に集約

---

## 7. 変更履歴

| 日付 | バージョン | 変更内容 |
| --- | --- | --- |
| 2026-07-02 | 初版 | 柱1 (収集の可視化) 6 案 + 柱2 (授受の儀式) 4 案の詳細設計。 柱3-5 は保留。 ガチャ / ショップ / カタログスコープの現状把握を統合。 触覚シナリオ表 (12 シーン) と ManageDebug opt-out 設計を明文化 |
| 2026-07-02 | v2 | レビュー反映 (must_fix 15 件 / should_improve 6 件)。 主な変更: §3-0 origin スキーマ PR 前提条件セクション新設、 §3-1 シルエットに pulse affordance + tap→owl 反応の 『反応する空白』 設計追加 (3-5 歳 Piaget 保存概念未確立への対応)、 §3-3 owlHint バリデーション仕様 (禁止キーワード配列 + CI script) 追加、 §3-4 shop/gacha 光の点滅周期差 (2s / 4s) と明度差別化、 §3-6 addedAt 時刻基準を server UTC epoch に確定、 §4-1 ポノ表情差分を Ekman coding 基準の身体差 (口/腕/体傾き) に強化、 素材納品フロー 3 ステップ明記、 §4-2 定量検証 MilestoneTask (3-8 歳児 8 名以上ユーザーテスト + t-test) 追加、 §4-3 celebration を 2 段階分離 (第 1 段 vibrate 単独 → 第 2 段 +300ms で voice/glow/particle、 感覚敏感児 15-20% への配慮)、 Points burst 数を 8/10/12 に削減 (Gestalt 7±2)、 iPad ロー品質モード追加、 whisper 検証 5 ステップフロー化、 `common/pono-acorn-audio.js` スケルトン明記、 §4-4 触覚エスカレーション上限 (1 分 3 パターン) + 発達段階別区分 (3-5 歳 20-40ms / 6-8 歳 40-80ms) 追加、 iOS 音代替を 60Hz → 440Hz sine wave に変更 (Thaut 2005)、 localStorage key 命名を play.html `pono_*` パターンに整合、 §5 柱3-5 再検討トリガを一元化 (齟齬検証会の 3 者合同 + 議事録 path 確定 + 保留リスク明示)、 §6 禁則に理由付記 |
| 2026-07-02 | v3 | **キャラクター音声禁止 + 女性ナレーター専業化ポリシー反映**。 主な変更: §0.5 「音声/テキスト運用原則 (キャラクターイメージ保護)」 新設 (ポノ・ふくろう先生・パートナー 8 種の肉声全面禁止 / 女性ナレ Gemini Leda 1.15x 第三者読み聞かせ形式のみ / 3-5 歳未識字児向け 4 層冗長 (視覚ピクトグラム + 触覚 + 女性ナレ + テキスト) / BGM ducking 必須 / ManageDebug 個別 OFF)、 §3-1 tap→owl 反応を吹き出しテキスト + 女性ナレ間接話法の二層に変更、 §3-3 owl-whisper を 「既存ふくろう先生ボイス使用」 前提から 「新規女性ナレ 12-16 本 + 吹き出しテキスト 2 系統管理」 に全面改稿 (在庫監査で partner_fukurou 資産が placeholder のみと判明した事情を明記)、 §3-4 shop-glow tap を 1-C 二層ヒントに接続 + ショップ用ヒント 6-8 本追加、 §3-6 newbie-ribbon の 「ふくろう先生が話す」 を女性ナレ間接話法 + 吹き出しテキスト + chime SE の 3 点同時発火に変更、 §4-1 ポノ登場に 「ポノは決して話さないキャラとして統一 + 補助レイヤに女性ナレ第三者描写オプション (『ポノが なにか もってきてくれたよ』)」 を追加、 §4-3 celebration の設計思想を 「voice」 から 「女性ナレ (第三者描写)」 に置換 + praise voice 10 本テーブルを女性ナレ 「そっとよろこびを伝える描写ナレ」 10 本に全面書換 (『すてき!』 直接話法 → 『すてき な いろ』 描写、 『ぴかぴか!』 → 『ぴかぴか だ』 等) + BGM ducking + 同時再生ガード追加、 モジュール名を `PonoAcornAudio` → `PonoNarratorAudio` に改称 (肉声誤混入を命名で予防)、 §4-4 iOS 音代替を `HapticFallbackAudio.playClick()` 別モジュールに切り出し (機能音 と 音声 の実装レイヤ分離)、 §5-3 みせるモードの音声方針を先行確定 (女性ナレ間接話法 1 本 + テキストパネル)、 §6 禁則に 4 項追加 (キャラ肉声禁止 / 直接話法禁止 / 「ポノ声」 資産新規生成禁止 / 「voice」 単独語禁止)、 §7 v3 エントリ。 新規女性ナレ TTS 総計 31 本 (全て whisper 検証必須)。 音声関連 12 箇所修正 |
| 2026-07-02 | v3.1 | **3-reviewer クロスレビュー反映 (must_fix 15 件 / should_improve 5 件)**。 主な変更: **[ブランドガーディアン must_fix]** §4-3 praise voice 10 本テーブルを 「目的語=子/シール/出来事」 の第三者観察型に全面書換 (『はれた ね』→『はれたんだ』 / 『すてき な いろ』→『いろが すてき ね』 / 『ぴかぴか だ』→『ぴかぴか した ね』 等)、 テキスト運用原則 (一人称禁止 + 目的語限定 + キャラ内面言及禁止) を明記。 §3-3 owl-whisper ナレ 3 本を 「キャラ内面言及」 型 (『あまい におい が すきなんだって』) から 「状況描写」 型 (『あまい においが するらしいって、 ふくろう先生が いっていたよ』) に変更 + owlHint バリデーションに キャラ内面禁止キーワード配列 + キャラ主語形禁止正規表現 + ナレプロンプト標準テンプレを追加。 §3-6 newbie-ribbon 吹き出しを 「あたらしい おともだち が きたよ」 → 「あたらしい おともだちが きたんだ」 (観察型) に変更 + 吹き出しとナレの意味重複回避ルール明記。 §4-1 ポノ登場ナレを 「ポノが なにか もってきてくれたよ」 → 「シールが でてきたね」 (状況観察型) に変更 + 「ポノが〜」 「ふくろう先生が〜」 の主語形禁止を明記。 §0.5 に一人称禁止テンプレ (`.claude-design-bundle/tts-prompts/narrator_third_person_template.txt`) + 同時再生禁止ガードを追加。 **[Claude Code 未識字児レビュー must_fix]** §4-1 に Ekman 表情差分 3-5 歳児認識テスト (6 名) + 認識率有意差なし時の rollback plan、 §3-1 に pulse affordance 3-4 歳児認識率実測 (8 名、 <50/50-70/>70% で 3 段階分岐)、 §0.5 に保護者読み聞かせなし想定シナリオ (パート2、 8 名実測 + LP に読み聞かせ推奨明記)、 §4-4 iOS 音代替 volume の A/B テスト要件 (10 名、 0.1〜0.3 の 5 段階 + dB SPL 実測)、 §3-3 owlHint 意味通達テスト (4 名、 開放回答調査、 >60% 合致で本番投入) を追加。 **[実装リード must_fix]** §4-4 実装初手に既存 audio pipeline マイグレーションマップ 4 ステップ (grep 走査 → モジュール責任分離図 → 初期化順序固定 → 段階置換)、 §4-3 whisper 検証を 5→7 ステップに拡張 (concrete TTS プロンプトテンプレ + 反転プロンプト検証 + 親ナレーター聴感テスト)、 §6 fal-ai 禁止理由に技術的根拠 (声質調整自由度が高くキャラ性が帯びるリスク) 追記、 §4-3 に TTS 31 本の工数見積 (合計 5-6 日) + 優先度順序 4 段、 §4-3 iPad ロー品質モードに fps 実測検証フロー追加。 **[should_improve 反映]** §0.5 に 「voice タグ実装レイヤ分類監査」 セクション + partner_* voiceTag migration スケジュール、 §5 検証会に事前共有 pre_sync_README + voice pool 拡張判定フローチャートを追加。 **[should_improve 却下]** (a) §6 森トーンパレット WCAG コントラスト検証 (色ペアより 「色+明度+形状」 の 3 軸差別化が既に明記済み、 rarity 判別の代替は §4-3 celebration の要素差で十分)、 (b) §4-4 BGM ducking パラメータ完全表 (全ナレ発火シーンの ducking を PonoNarratorAudio 内で自動化、 個別パラメータ表化は実装後 tuning、 現時点で表化するとメンテ負債)、 (c) §5-3 「ながおし」 表現の親向け言語難易度改善 (「ながおし」 は既に 3-5 歳児が発声で親に伝えられる pointer word として意図的に選定、 敬語化は保護者/子ども呼びかけの二重性を破壊)、 (d) §4-1 ポノ位置・タイミング視線フロー検証 (§4-1 の Ekman 表情差分 6 名テスト内で同時実施、 別枠検証は工数過大)、 (e) §4-3 whisper 検証への聴感テスト step 挿入 (step 5 として親ナレーター聴感テストで実質吸収済み)。 追加検証工数目安: ユーザーテスト 5 種 (合計 3-5 名+8 名+10 名+8 名+4 名=最小 35 名参加者、 8-10 日) + 反転プロンプト検証 0.5 日 + 親ナレ聴感 0.5 日 |
