# シールブック エンゲージメント設計プラン

> **バージョン**: v4.1 2026-07-02: 3-reviewer クロスレビュー反映 (must_fix 10 / should_improve 5)
> **対象**: pono-asobiba-app の シールブック体験全体
> **前提**: シール=自由絵柄カタログ、 ガチャ / どんぐりショップ / 取り置き の 3 経路。 絵本連動シールは特別枠として並存。
> **今回の方針転換**: シール帳の面白さを 「キャラ演出」 ではなく 「骨格」 に絞る。 キャラ演出 (ポノ登場 / ふくろう先生ヒント / 褒めナレ) は §7 保留リストへ格下げ、 骨格が定着した後の Phase 2 で再検討する。

---

## 0. TL;DR

- シールブックは 骨格 4 本 に絞る:
  1. 未取得シルエット表示 (集めるべきものが視覚化される)
  2. 吸着 magnetic snap (小さい指でもピタッと収まる)
  3. 触覚 haptics (貼付瞬間の身体化)
  4. 完成の絵的祝祭 (カテゴリ埋め切ったら絵で余韻を伝える)
- キャラ演出 (ポノ登場 / ふくろう先生ヒント / 褒めナレ / shop-glow / 予約席リボン / しんいりリボン / 物語 / 育つ表紙 / 家族共有 / KDP 連動) は Phase 2 に保留。 骨格 4 本で十分な体感改善が出るはずで、 定着後に再検討する。 **保留項目の分類と再検討観点の正本は §7-1 対応表 (Single Source of Truth)** で、 §0 は概要のみ。 個別項目の条件付き扱い (例: newbie-ribbon は pulse affordance で気付けるなら不要、 予約席リボンは haptics で代替可能性検証) は §7-1 を参照
- ガチャ (`play.html` L6299-6378) は 3 回レバー + カプセル開封の unboxing が既に実装済み。 骨格 4 本で 「シール入手後にシールブックで貼る体験」 を強化する。
- カタログは 175 枠 (実装 135 + 計画 40)、 全て `gameId` 必須。 骨格 1 の前提として `origin: 'book' | 'game' | 'free'` を新設し、 自由絵柄枠 (free) を第一級市民にする。
- トーン制約: 花火 / 爆発 / 蛍光色 / 星形パーティクル / additive blending / 200ms 超単発 vibrate 禁止。 森トーン厳守。
- 音声制約 (§0.5): ポノ・ふくろう博士・パートナー動物 8 種は肉声禁止。 声を使うなら女性ナレ (Gemini Leda 1.15x) の第三者読み聞かせのみ。 fal-ai 系 TTS は音声用途で禁止。

---

## 0.5 音声 / テキスト運用原則 (キャラクターイメージ保護)

ポノのあそびばにおける音声 / テキスト運用は 「キャラクターは絵と動きで生きる、 言葉は女性ナレーターが第三者として代弁する」 を絶対原則とする。 ポノ・ふくろう先生・パートナー動物 8 種は肉声を持たず、 その内面や発話は必ず女性ナレ (Gemini Leda 1.15x) による間接話法 (「〜だって」 「〜と言っているよ」) の第三者読み聞かせに変換する。

**正本参照** (音声運用ポリシーの Single Source of Truth は `AGENTS.md §2.5`。 本ドキュメント §0.5 は要約であり、 矛盾があれば AGENTS.md 側が正)
- **`AGENTS.md §2.5.1` キャラクター音声禁止** — ポノ・ふくろう博士・パートナー動物 8 種の肉声禁止
- **`AGENTS.md §2.5.2` fal-ai TTS 禁止** — CSM-1B 含む fal.ai TTS モデル全面不使用
- **`AGENTS.md §2.5.3` Gemini Leda pipeline** — `common/narration.js:39` の既存 pipeline 継続、 faster-whisper 検証必須
- **`AGENTS.md §2.5.4` partners.js voiceTag 実装解釈禁止** — metadata のみ (2026-07-02 grep 確認済、 詳細は本ドキュメント §7-2 補遺の audit artifacts)

**固定化 memory 参照** (memory ファイル生成タイムライン: v4.1 と同じ session で HANDOFF.md に記載予定)
- `[[policy_no_fal_ai_tts]]`: fal-ai TTS (音声生成) は使わない。 女性ナレは既存 Gemini Leda pipeline (`common/narration.js:39`) 継続
- `[[policy_character_voice]]`: ポノ・ふくろう博士は肉声なし。 声を使うなら女性ナレのみ (第三者読み聞かせ視点、 「わたし、 ポノ!」 等の一人称禁止)

**3 原則**

- **ポノ・ふくろう先生は音声禁止**: プロジェクト全域でキャラクター (ポノ / ふくろう先生 / パートナー動物 全 8 種) の肉声を新規収録・TTS 生成・再生することを禁止する。
- **声を使うなら女性ナレのみ**: 音声を使う場合は女性ナレ (Gemini TTS Leda / 1.15x / volume 0.9) の第三者読み聞かせ形式のみ許可。 直接話法 (「〜だよ」 の一人称) は必ず間接話法 (「〜だって」 「〜と言っているよ」) に書き換えて生成する。 spec / コード / docs で 「voice」 単独語は禁止し、 「女性ナレ (female narrator)」 「機能音 (functional tone / SE)」 「キャラ肉声 (character voice = 禁止)」 のいずれかに明示分類する。
- **一人称禁止**: 女性ナレはいかなる場面でもポノ・ふくろう先生・パートナー動物の一人称 (ぼく、 わたし、 おれ) を使用禁止。 ナレーターのポイント・オブ・ビューは 「森の中立的な観察者」 に固定。

**骨格 4 本と音声の関係**

骨格 1-4 では、 音声を積極的に使わない設計に振り切る:
- 骨格 1 (シルエット表示): tap 反応は 静かな吹き出しテキストのみ、 または沈黙。 owl-whisper 系の女性ナレは §7 保留リスト
- 骨格 2 (吸着 snap): 音声なし。 snap SE (機能音、 短い chime) のみ可
- 骨格 3 (触覚 haptics): vibrate のみ。 iOS 代替の 440Hz sine wave は 「機能音」 レイヤなので許可。 女性ナレは併用しない
- 骨格 4 (完成の絵的祝祭): 静かな吹き出しテキストのみ、 音声なし。 女性ナレの祝祭ナレは §7 保留

女性ナレを解禁するのは Phase 2 (§7 保留リストの再検討) 以降。 骨格 4 本を先に定着させ、 テキスト + 触覚 + 絵 の 3 層で情報伝達できることを実測してから、 音声レイヤを重ねるかを判断する。

---

## 1. 現状把握

### 1.1 ガチャシステム (`play.html`)

| 項目 | 実装 |
| --- | --- |
| 入口ボタン | `play.html:5996` `#dailyGachaEntry` (画面右下、 モバイル bottom 122px、 木製看板テクスチャ) |
| モーダル HTML | `play.html:6299-6378` |
| 回転数 | 3 回 (`DAILY_GACHA_TURNS=3` at `L7604`) |
| Spin 処理 | `play.html:8686-8717` `commitDailyGachaTurn()` |
| Reveal 処理 | `play.html:8719-8783` `runDailyGacha()`。 NORMAL / RARE / SUPER 別のタイミング差分 |
| カプセル開封 | `play.html:8774-8778`。 `.is-opened` 追加で 左右半分が -34deg / +34deg に開き、 sticker が中央から emerge |
| Sticker Book への遷移 | `play.html:8989-8991` `goDailyGachaStickerBook()` → `Prototypes/StickerBookThreeJS/?surface=cover` |

**注**: ガチャの unboxing 演出強化 (旧 §4-2 の 4 点改善など) は骨格 4 本の対象外。 sticker book で 「貼る体験」 に骨格 4 本を集中する。

### 1.2 ショップ / 取り置き (前提情報)

- どんぐりショップは 1 日 2 回入替、 未所持優先ロジック が計画済。
- 取り置き機能あり。 sticker book 側での可視化 (shop-glow / 予約席リボン) は §7 保留。

### 1.3 カタログスコープ (`sticker_book_content_plan.json` / `data/stickers/game-stickers.json`)

| 項目 | 数 |
| --- | --- |
| 実装済シール (serial 001-135) | 135 枚 |
| 計画中シール (serial 136-175) | 40 枠 |
| 絵本専用 (book_bonus) | 6 枚 (serial 130-135、 `bookOnly: true`) |
| ゲーム紐付き | 129 枚 (12 ゲームに分散) |
| 完全自由絵柄 | 現在ゼロ (全 175 枠が `gameId` 必須) |
| Rarity | normal / rare / super の 3 段 |
| Tier | free / app 併用 |

**主なギャップ**
- `gameId` 必須制約により、 「実験的自由絵柄」 が定義上不可能
- 40 枠の未実装枠を 「自由絵柄実験場」 として活用したい

---

## 2. 骨格 4 本 + 保留リストの全体像

| # | 骨格 | テーマ | 詳細 |
| --- | --- | --- | --- |
| 1 | 未取得シルエット表示 | 集めるべきものが視覚化される | §3 |
| 2 | 吸着 magnetic snap | 小さい指でもピタッと収まる | §4 |
| 3 | 触覚 haptics | 貼付瞬間の身体化 | §5 |
| 4 | 完成の絵的祝祭 | カテゴリ埋め切ったら絵で余韻を伝える | §6 |

保留リスト (Phase 2 で再検討): §7 参照

**実装ステータス (v4.1 時点、 2026-07-02)**

本ドキュメントは仕様書であり、 以下は **すべて未実装** (計画のみ):

| 骨格 / 前提 | 対象ファイル | 現状 |
| --- | --- | --- |
| §3-0 origin スキーマ PR | `data/stickers/game-stickers.json`, `Prototypes/StickerBookThreeJS/sticker_book_content_plan.json` | `origin` field 未定義。 migration script (`scripts/migrate_sticker_origin.mjs`) 未作成 |
| §3-1 骨格 1 (未取得シルエット) | `Prototypes/StickerBookThreeJS/main.js` | シルエット slot・pulse アニメ未実装。 認識率実測未実施 |
| §4-1 / §4-1a 骨格 2 (snap + 候補ハイライト) | `Prototypes/StickerBookThreeJS/main.js` | snapProfile 未実装、 halo mesh 未実装 |
| §5-1 骨格 3 (haptics) | `common/haptics.js`, `common/haptic-fallback-audio.js` | **両ファイル未作成**。 既存の bare `navigator.vibrate()` / `triggerDailyGachaBlockedFeedback` 呼び出しは grep audit 未実施 (`docs/audit/haptics_migration_map.md` 未作成) |
| §6-1 骨格 4 (完成祝祭) | `Prototypes/StickerBookThreeJS/main.js`, `assets/leaf_soft_20px.png`, `assets/stamp_leaf.webp`, `assets/stamp_acorn.webp` | `checkCategoryCompletion()` 未実装、 particle 素材未発注、 記念スタンプ素材未発注 |
| ManageDebug 設定画面 | `js/manage-debug-settings.js` | **ファイル未作成**。 opt-out toggle も骨格 3 / 4 分いずれも未配線 |
| Brand Kit brief (記念スタンプ) | `.claude-design-bundle/components/completion-stamp/brief.md` | **ディレクトリ未作成**。 素材発注のスタート地点なし |

**実装 PR 順序 (依存グラフ)**:
1. §3-0 origin スキーマ PR (§3-1 / §6-1 の前提)
2. `.claude-design-bundle/components/completion-stamp/brief.md` 作成 → Claude Design 経由で素材発注 (並列可)
3. `common/haptic-fallback-audio.js` → `common/haptics.js` (骨格 3 単体、 他骨格から独立して先行可)
4. `js/manage-debug-settings.js` (骨格 3 / 4 の opt-out UI、 骨格 3 実装と並列可)
5. §3-1 骨格 1 → §4-1 / §4-1a 骨格 2 → §6-1 骨格 4 (main.js 集中変更ゾーン、 順次)

**認識率テスト・音量実測は各実装 PR の前提条件** (§3-1 pulse 認識率、 §5-1 440Hz 音量 A/B 等)。 pragmatic 進行としては 「暫定実装 (葉っぱアイコン常時表示 / volume 0.15) で先行実装 → テスト → 削減 or 上方修正」 の 2 段階を許容 (should_improve 反映)。

**骨格 4 本の設計思想**

- **絵と触感で伝える**: テキスト最小、 音声最小、 絵と触覚で意味を伝える
- **数字を使わない**: 「◯/△」 の分数表示は 3-8 歳の年齢感覚指針 (`design_age_rating_display`) に反する。 完成の合図も絵で表現する
- **森トーン維持**: 花火・爆発・金オーラは禁止。 §8 の禁則を全骨格で遵守
- **キャラ演出は後**: ポノ・ふくろう先生の演出は Phase 2 に温存。 骨格が体感改善を実測できてから重ねる

---

## 3. 骨格 1: 未取得シルエット表示

### 3-0. 前提条件: origin スキーマ PR

骨格 1 は `origin: 'book' | 'game' | 'free'` field 新設を前提とする。 実装は必ずこの PR を最初に切ってから §3 本体に進む。

**Acceptance criteria**:
1. `data/stickers/game-stickers.json` と `Prototypes/StickerBookThreeJS/sticker_book_content_plan.json` が `origin` field を支持し、 JSON Schema に反映済み
2. `gameId` を nullable 化 (origin='game' の時のみ必須、 origin='book'/'free' では null 許容) — backward compatible
3. 既存 135 sticker を自動分類する migration script が pass:
   - `bookOnly: true` → `origin: 'book'` (serial 130-135)
   - 残 `gameId` 有り → `origin: 'game'` (serial 001-129)
   - 未実装枠 (serial 136-175) → `origin: 'free'` に振替
4. `origin` filter で分岐可能なことをテスト
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

### 3-1. シルエット 二層 slot: 絵本ページ形式 / 森の広場形式

- **現状**: Three.js 上で slot が単一グリッド (`main.js` の `categoryId` ベース)。 未取得シルエット枠自体が未実装。
- **理想**: slot に `origin` プロパティを新設。 Three.js シーンで 2 レイアウトを混在:
  - **book-tied**: 見開き絵本ページ調 (角丸紙質テクスチャ + ページ番号 + ふち罫)
  - **game / free**: 森の広場調 (草地 + 切り株 + 木の実の上に散らばる、 自由配置)
  - 未取得は全 origin 共通で 「白シルエット + 淡い葉っぱパーティクル + 曇りガラスの丸フチ」
  - free 枠は特に 「? マークの卵型」 表示にして 『これから森に来る子』 感を出す
- **『反応する空白』設計**: シルエットは静止画ではなく、 4s 周期で opacity 0.85→1.0→0.85 の微 pulse アニメを常時発火。 tap すると 静かな吹き出しテキストのみ を表示する (音声・女性ナレは Phase 2 保留、 §7)。 沈黙でも良い設計。
  - 吹き出しテキスト例: 「ここに だれか いるみたい」 「まだ みぬ おともだち」
  - テキスト内容制約: `gameId` 露出禁止、 経路情報 (ガチャ / ショップ / どんぐり) 禁止。 §8 の禁則参照
  - tap 反応の音声は無し (骨格段階では静かに保つ)
- **pulse affordance の認識率実測 (Phase 1 実装前提条件)**: 3-4 歳児 最小 8 名 に対して 「pulse するシルエットを触ってみる」 自発率を測定。 このテストの実施と結果を骨格 1 の実装 GO/NO-GO の gate とする (実測完了までは暫定実装 = pulse + アイコン常時表示ハイブリッド版で先行実装):
  - **>70%**: pulse のみで確定実装 (アイコン削減)
  - **50-70%**: pulse + tap エリアに 中立的な葉っぱアイコン (`assets/leaf_hint_icon.png`、 8-12px、 森トーン 単色) 常時表示のハイブリッドで確定。 **本アイコン表示は装飾ではなく骨格 1 の子機能** (affordance 認識を成立させるための必須要素) として扱う
  - **<50%**: pulse は装飾扱いに降格、 アイコン主体 (24-32px) に切替。 同じく骨格 1 の子機能
- **なぜ骨格昇格か**: アイコンは 「集めるべきものが視覚化される」 という骨格 1 のコア機能 (どこに tap 可能な未取得枠があるか) を成立させる。 装飾 (例: shop-glow の光) は 「気付いた後の情緒 boost」 なので Phase 2 の §7 でよいが、 affordance アイコンは骨格 1 の PoC 前に確定させないと交絡変数となる。 Phase 2 での再検討対象外
- **効き**: 3-5 歳の Piaget 保存概念未確立への対応。 静的白影のみでは届かないため、 pulse + tap 反応 (テキストのみ) を必須仕様とする。
- **実装初手**: `sticker_book_content_plan.json` に `origin` フィールドを追加し、 既存 175 枠を分類。
- **effort**: L
- **impact**: 9 / 10
- **files**:
  - `Prototypes/StickerBookThreeJS/sticker_book_content_plan.json`
  - `Prototypes/StickerBookThreeJS/main.js`
  - `data/stickers/game-stickers.json`

---

## 4. 骨格 2: 吸着 magnetic snap

### 4-1. collection モード限定 + origin 別 snap プロファイル

- **現状**: 貼付インタラクションは Three.js `main.js` に既存 drag があるが、 シルエット吸着挙動は未実装。 自由並び側は snap 位置定義なし。
- **理想**: モード分離:
  - **collection モード** (ガチャ / ショップ直後のオート整列): origin 問わず該当 silhouette に吸着距離 80px で吸い込む + 貼付 SE + パフ煙
  - **自由編集モード** (子供が任意に触る時): snap 無効、 自由配置
  - book origin は常に snap ON (絵本ページの角丸枠にピタッと収まる)
  - free origin は snap 弱め (吸着距離 40px、 外すのも簡単)
  - 実装 `snapProfile = {book:'strong', game:'medium', free:'weak', modeOverride:'collection'|'free'}`
- **効き**: ガチャ直後は自動で 『あるべき場所』 に飛んでいく気持ちよさ、 自由編集時は自分の広場を作る自由。 origin ごとに触感が違うので絵本感 / 実験感の切り替えが手で伝わる。 小さい指でも 「はまった」 感を得られる。

### 4-1a. 候補ハイライト UI (骨格 2 の子機能、 装飾ではなく本質的な snap 補助)

tap-to-place UI (指を離す前の予測表示) では最寄り silhouette 3 個までを弱ハイライトする。 これは snap 吸着距離内の候補を事前提示することで指の誤操作を減らし、 小さい指でも正確性を上げる骨格 2 の子機能である (単なる装飾ではないため §7 保留対象外)。

**仕様**:
- **目的**: 4-5 歳児の位置覚測定能力 (± 40px 程度、 発達心理研究 Bushnell & Boudreau 1993 を参考) に合わせた視覚フィードバックにより、 指を離す前に 「ここに置くと吸い込まれる」 を予告する
- **候補数**: 最大 3 個 (距離順、 4 個目以降は非表示)。 3 個上限は Gestalt 7±2 の下限側で 3-8 歳が同時追跡できる要素数
- **アニメ**: 200ms ease-in-out で opacity 0.0 → 0.55 の halo highlight、 指が離れたら 150ms fade-out
- **色**: 森トーン `#A8C4A2` (若葉色) → `#C9B48A` (亜麻色) の 4s cycle グラデーション。 花火・レインボー禁止
- **形状**: silhouette と同じ卵形 / 円形の soft-edge halo (blur 8px)。 星形禁止
- **origin 別強度**: book origin 候補は halo opacity 0.55、 game 0.45、 free 0.35 (snapProfile と対応)
- **発達心理根拠**: 就学前期 (Piaget 前操作期) は視覚予測と運動制御の統合が発達段階にあり、 candidate preview を通じて 「ここに置ける」 の空間認識を補助することで自己効力感 (Bandura) を高める
- **opt-out**: ManageDebug 「候補ハイライト」 toggle (骨格 2 セクション、 `pono_snap_candidate_highlight` key)

**実装初手**: `main.js` の drag update ループで `nearest_3_silhouettes(pointer_world_xy)` を呼び halo mesh を toggle。 halo は `THREE.Sprite` + soft PNG texture、 sizeAttenuation: true。
- **音声**: 骨格 2 では女性ナレ非使用。 snap SE (機能音、 短い chime 60-100ms) のみ。 触覚は骨格 3 の `haptics.play('sticker.paste.normal')` を呼ぶだけで統合される。
- **実装初手**: `main.js` に mode state と `snapProfile` 定義追加。 まず collection モードのみ (ガチャ完了後 → sticker book 遷移直後 3 秒) で origin=book 強 snap の PoC。
- **effort**: M
- **impact**: 8 / 10
- **files**:
  - `Prototypes/StickerBookThreeJS/main.js`
  - `play.html`

---

## 5. 骨格 3: 触覚 haptics

### 5-1. 触覚シナリオ (シーン別 vibrate() 表 + iOS 代替 + 発達心理根拠 + opt-out)

新規 module `common/haptics.js` を作り、 全シーンから `haptics.play(sceneKey)` で呼び出す。 骨格 3 は 純粋な vibrate + iOS audio 代替 のみ、 女性ナレは併用しない (§0.5 参照、 「機能音 / functional tone」 レイヤに限定)。

**シーン別 vibrate パターン表** (音声非依存)

骨格 3 は 「入力に対する即時 haptic フィードバック」 を担う独立骨格である。 骨格 4 のカテゴリ完成祝祭は独立イベントで、 発火時に骨格 3 の `haptics.play('completion')` を **hook 呼び出し** する形の連動 (骨格間依存グラフを明示)。 混同を避けるため以下 2 表に分割する。

**(a) 骨格 3 単独シーン (入力フィードバック 13 パターン)**

| シーン | パターン (ms) | 強度の意図 |
| --- | --- | --- |
| シール貼付 (NORMAL) | `[30]` | 貼れた瞬間の短い確定感。 覚醒しすぎない範囲 |
| シール貼付 (RARE) | `[20, 60, 20]` | 小さい → 少し長い → 小さい の 3 段。 「特別感」 の情動 boost |
| シール貼付 (SUPER) | `[15, 40, 15, 40, 80]` | 累積的な climax。 最後 80ms で余韻 |
| カプセル割れ (turn 3 後 `.is-opened`) | `[100]` | 1 発の明確な 「パカッ」 |
| RARE 出現 (badge pop 時) | `[15, 40, 15, 80]` | rarity 別で escalate |
| SUPER 出現 (badge pop 時) | `[10, 30, 10, 30, 10, 120]` | 6 段で 「わっ」 の高揚感 |
| 表紙めくり / ページめくり | `[8]` | 紙をめくる微かな触感 |
| ショップ購入決定 (どんぐり消費確定) | `[40, 30, 40]` | 「ぽん・ぽん」 の支払い確認感 |
| ショップ購入キャンセル / どんぐり不足 block | `[15, 30, 15, 30, 15]` | 軽い denial パターン |
| ガチャ turn 1-2 のレバー回転完了 | `[12]` | 1 turn 分完了の手応え |
| ガチャ turn 3 のレバー回転完了 (climax 予告) | `[20, 50, 20]` | 「これで最後」 の触覚合図 |
| ガチャ 本日使用済み ('used') block タップ | `[10, 40, 10]` (既存 `triggerDailyGachaBlockedFeedback` を統合) | 既存実装を module 統合 |
| 取り置きシール 受取確定 | `[25, 40, 25]` | 「開封」 に近いゆっくりめの 3 段 |

**(b) 骨格 4 連動シーン (完成祝祭 hook、 §6-1 演出シーケンス内で発火)**

骨格 4 が完成判定を出した瞬間、 骨格 4 側の演出シーケンスから明示的に `haptics.play('completion')` を呼び出す。 骨格 3 が主導する自立シーンではないので (a) 表とは分けて管理する。

| シーン | パターン (ms) | 強度の意図 | hook 発火元 |
| --- | --- | --- | --- |
| カテゴリ完成 | `[20, 40, 20, 40, 60]` | 埋め切った瞬間の 5 段累積 | §6-1 演出シーケンス `t=0` の `checkCategoryCompletion()` |

**エスカレーション上限** (触覚疲れ・パターン学習防止):
- 1 分間に発火可能な触覚パターンは 最大 3 パターン まで。 4 個目以降は skip (silent fail)
- `common/haptics.js` 内でリングバッファ管理: `_recentTimestamps: [t1, t2, t3]`、 `now - t3 < 60000` なら skip
- ページめくり (シーン `page`) は連続発火が想定されるため上限カウントから除外 (`ignoreQuota: true`)

**発達段階別パターン区分** (3-5 歳と 6-8 歳の触覚許容差):
- ManageDebug 設定画面に 年齢入力 (3-5 / 6-8 / 未入力) を追加。 未入力時は 3-5 相当を default
- 3-5 歳 mode: 全パターンの単位長を 20-40ms 上限 に truncate (例: SUPER `[15, 40, 15, 40, 80]` → `[15, 40, 15, 40, 40]`)
- 6-8 歳 mode: 表通りのフルパターン (最大 80ms 単位)
- 変換ロジック: `haptics.js` の `_capForAge(pattern)` helper で一括処理

**iOS 対応** (Web Vibration API は iOS Safari 非対応、 2026-07 時点)
- **Audio 代替 (機能音レイヤ)**: 短い 440Hz (A4 音) sine wave を `HapticFallbackAudio.playClick()` (別モジュール `common/haptic-fallback-audio.js`) で volume 0.15 (初期値、 実測後上方修正可)、 duration 3-5 歳: 20ms / 6-8 歳: 40ms で再生。 §0.5 準拠で 「機能音 (functional tone / SE)」 レイヤに分類。 キャラ音声ではない
  - 60Hz は使用しない (Thaut et al. 2005: 低域音は幼児の情動制御に強い影響)
  - 440Hz は音楽の基準ピッチ、 子どもにとって最も自然な短音
  - **音量実測要件**: A/B テスト (3-8 歳児 最小 10 名) で volume 0.1 / 0.15 / 0.2 / 0.25 / 0.3 の 5 段階で正答率を測定。 iOS デバイス (iPad 第 5/6 世代、 iPhone SE) でスピーカー出力レベル (dB SPL) を実測
- **CSS 代替**: 対象要素に `haptic-shake` クラスを 120ms 付与 (`translateX ±1px` の 60ms 周期)
- **iOS 判定**: `/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream`
- 実装: `haptics.js` 内で `if (navigator.vibrate) { vibrate } else { fallback audio + css }`

**発達心理根拠 (3-8 歳)**
1. 前庭 - 固有受容 - 触覚統合 (Ayres 感覚統合理論): 就学前後は多感覚統合が急成長する時期で、 視聴 + 触の同時入力は記憶定着率を上昇
2. 因果理解の形成: 「押す → 震える」 の直近フィードバックが自己効力感 (Bandura) を高める
3. 情動制御: 短い規則的振動 (30-80ms) は落ち着き効果、 不規則長振動 (200ms+) は覚醒
4. 遊びの再開性 (Vygotsky): 触覚報酬は 「もう一度やりたい」 を惹起

**opt-out (ManageDebug 設定画面 「触覚」 セクション)**
- [x] 触覚 全体 ON/OFF (master)
- [x] シール貼付時 の触覚
- [x] カプセル開封時 の触覚
- [x] レア出現時 の触覚
- [x] ページめくり時 の触覚
- [x] ショップ購入決定 の触覚
- [x] カテゴリ完成時 の触覚 (骨格 4 連動)
- [x] iOS 音代替を許可 (デフォルト off、 iOS ユーザーが選べる)

localStorage keys (play.html L49 `pono_*` パターンに整合): `pono_haptics_master` / `_sticker` / `_capsule` / `_rare` / `_page` / `_shop` / `_completion` / `_ios_audio_fallback` / `_age_group` (3-5|6-8|null)

**管理画面への統合**:
- 既存 debug settings panel は `feature_manage_debug_settings_panel.md` に計画のみ。 本 PR で `js/manage-debug-settings.js` を新規作成
- panel HTML は `admin/` 配下に配置し `admin/index.html` から dynamic import
- 「触覚」 セクションと骨格 4 の 「完成祝祭」 セクションを同一 panel 内に配置

- **効き**: 3-8 歳が 「押した → 応えてくれた」 の因果を触覚で即受け取れる。 iOS ユーザーも音 + CSS で 「なにか起きた」 の代替を得られる。
- **実装初手 (既存 audio pipeline 統合マップ)**:
  1. **既存呼び出し全走査**: `play.html` および `Prototypes/StickerBookThreeJS/` 配下で `navigator.vibrate(`, `triggerDailyGachaBlockedFeedback` の呼び出しを grep し、 全 callsite の位置と目的を `docs/audit/haptics_migration_map.md` に列挙
  2. **モジュール責任分離図**: (a) `common/haptic-fallback-audio.js` = 440Hz sine wave 機能音のみ (iOS haptic 代替) (b) `common/haptics.js` = 触覚のみ (vibrate + iOS 音代替の呼び分けは (a) に委譲) の 2 モジュール構成を README に図解
  3. **段階的置換**: まずシール貼付 1 シーンだけ `haptics.play('sticker.paste.normal')` に配線して動作確認 → 全 13 シーンを順次移行 → 既存 bare `navigator.vibrate()` 呼び出しを撤去 (grep で 0 件になるまで)
- **effort**: M
- **impact**: 0.68
- **files**:
  - `common/haptics.js`
  - `common/haptic-fallback-audio.js`
  - `Prototypes/StickerBookThreeJS/main.js`
  - `js/manage-debug-settings.js`
  - `play.html`

---

## 6. 骨格 4: 完成の絵的祝祭

### 6-1. カテゴリ埋め切りで絵の余韻を伝える

- **現状**: シール完成 (カテゴリ / origin 別プール埋め切り) の合図が未実装。 「あと何枚で完成」 の可視化もない。 数字表示 (「12/50」 等) は年齢感覚指針 (`design_age_rating_display`) に反するため使えない。
- **理想**: カテゴリ (§3-0 で定義される origin=book / game / free の各カテゴリ、 または book 内のシリーズ / game 内のゲーム別プール) が完成した瞬間の演出を、 数字を使わず絵で伝える:

**演出シーケンス** (合計 4-5s、 音声なし)

| t (s) | 演出 |
| --- | --- |
| 0 | カテゴリ最後の 1 枚が貼付確定 (骨格 2 snap 完了 → `checkCategoryCompletion()` が true → 骨格 3 の `haptics.play('completion')` を hook 呼び出し、 vibrate `[20, 40, 20, 40, 60]` 発火。 骨格間依存: §5-1 (b) 表参照) |
| +0.2 | 該当ページが 3D で自動的に開く (Three.js camera が該当ページに寄って fit、 1.2s ease-out) |
| +1.4 | 紙吹雪 particle 4-5s (森トーンパレット 5 色、 円形のみ、 星形禁止、 additive blending 禁止) |
| +2.0 | 記念スタンプがページ右下に焼き付く (葉っぱ形 or どんぐり形の hanko、 sw = 0 → 1.0 → 0.9 の bounce、 0.4s。 localStorage 永続) |
| +2.5 | 静かな吹き出しテキスト 「みつけたね」 (3.0s 表示、 音声なし、 場所はページ中央上部) |
| +5.0 | 全 clear、 sticker book 通常状態に復帰 |

**演出設計制約**:
- **数字禁止**: 「◯/△」 「N まい あつめた」 等の分数・枚数表示は絶対に使わない (`design_age_rating_display` 準拠)。 完成の合図は 「ページが開く + 紙吹雪 + 記念スタンプ + 静かな吹き出し」 の絵的シーケンスのみ
- **森トーン維持**: 紙吹雪は §8 の森トーンパレット (`#E8D6A8`, `#C9B48A`, `#A8C4A2`, `#F2C6B4`, `#FFF0C0`) のみ。 花火・爆発・金オーラ・レインボー禁止
- **音声なし**: 女性ナレ・キャラボイス・BGM 変化なし。 骨格 3 の触覚 `haptics.play('completion')` のみが音の代替 (機能音レイヤ)。 女性ナレによる祝祭ナレは §7 保留
- **カメラの寄せ**: 該当ページに Three.js camera が自動 fit する動きは 「絵本の見開きを子供が両手で持ち上げた」 感を模す。 過剰な zoom は禁止 (page 全体が視野内に収まる範囲まで)
- **記念スタンプの永続化**: 完成した origin/category の localStorage key `pono_sticker_completion_stamp_<origin>_<categoryId>` = ISO 日付を保存。 以降 sticker book を開くたびにスタンプが焼き付いた状態で表示される
- **完成カテゴリの定義**: 骨格 1 の origin (`book` / `game` / `free`) を第一階層、 内部の category (book のシリーズ / game のゲーム / free の実験群) を第二階層。 第二階層の埋め切りで発火。 origin 全体の埋め切りは §7 保留 (Phase 2 の 「表紙が育つ森」 と統合設計)

**紙吹雪 particle 詳細**
- 数: 24-32 個 (Gestalt 7±2 を超えるが 「祝祭の量感」 として意図的に多め、 ただし画面全体に薄く散らす)
- 形状: 円形 (soft_dot_16px.png) + 木の葉形 (leaf_soft_20px.png、 新規素材) の 2 種類混在
- 軌跡: ページ上部から降下、 初速 `vy = 0.3-0.7 rand`, `vx = -0.4-0.4 rand`, gravity 0.35 (紙のようにゆっくり)
- lifespan: 3-4s、 opacity 0.9 → 0 の ease-out fade
- サイズ: `PointsMaterial size 0.025-0.045` (world unit)、 `sizeAttenuation: true`
- blending: **NormalBlending** (additive 禁止)

**iPad ロー品質モード**: A10/A12 世代は particle count -30% (16-22 個)、 lifespan -20%、 texture 圧縮版

**opt-out (ManageDebug 「完成祝祭」 セクション)**
- [x] 完成祝祭 全体 ON/OFF (master)
- [x] ページ 3D 開き
- [x] 紙吹雪 particle
- [x] 記念スタンプ焼付
- [x] 「みつけたね」 吹き出し

localStorage keys: `pono_completion_master` / `_page_open` / `_confetti` / `_stamp` / `_text_bubble`

- **効き**: 「集め切った」 達成感が数字ではなく絵で伝わる。 記念スタンプの永続化で 「もう一度 sticker book を開きたい」 動機を生む。 音声を使わないため感覚敏感児にも overload なし。 3-8 歳の Piaget 象徴的思考期に沿った、 具象的な祝祭体験。
- **実装初手**:
  1. カテゴリ完成判定関数 `checkCategoryCompletion(origin, categoryId)` を `main.js` に追加 (§3-0 の origin スキーマ PR merge 後)
  2. 記念スタンプ素材 (葉っぱ / どんぐり) を Claude Design (Pono LP Brand Kit) 経由で発注 (`feedback_brand_kit_design_via_claude_design.md` 準拠、 Claude Code の MCP 直生成禁止)
  3. `Prototypes/StickerBookThreeJS/main.js` に completion celebration hook を差し、 まず 1 カテゴリで PoC → 全カテゴリへ展開
- **effort**: L
- **impact**: 9 / 10
- **files**:
  - `Prototypes/StickerBookThreeJS/main.js`
  - `Prototypes/StickerBookThreeJS/assets/leaf_soft_20px.png` (新規)
  - `Prototypes/StickerBookThreeJS/assets/stamp_leaf.webp` (新規、 Brand Kit 発注)
  - `Prototypes/StickerBookThreeJS/assets/stamp_acorn.webp` (新規、 Brand Kit 発注)
  - `.claude-design-bundle/components/completion-stamp/brief.md` (先行作成)
  - `js/manage-debug-settings.js`

---

## 7. 保留リスト (Phase 2 で再検討)

**保留理由**: 骨格 4 本 (§3-6) を先に定着させ、 実測で体感改善を確認してから、 キャラ演出 / 世界演出 / 家族共有 / 物語連動 の各項目を再検討する。 骨格が定着する前にこれらを実装すると、 骨格の効き目を実測できない (交絡変数として作用)。

**再検討トリガ**:
- 条件: 骨格 4 本の全 PR が master に merge 完了 + 3-8 歳児 8 名以上のユーザーテストで骨格 4 本の体感改善を確認
- 期限: merge 完了から 2 週間以内
- 参加者: デザイン (アートディレクター) / 運営 / エンジニアリード の 3 者合同齟齬検証会
- アウトプット: 議事録 `.claude-design-bundle/pillar-phase2-redesign/meeting_notes_YYYY-MM-DD.md` + 再設計 brief

### 7-1. 旧 §番号 → 新 §7 対応表

| 旧 § | 旧タイトル | 保留分類 | 再検討観点 |
| --- | --- | --- | --- |
| 3-3 | 1-C-owl-whisper (ふくろう先生ヒント 女性ナレ + 吹き出し) | キャラ演出 | 骨格 1 の吹き出しテキスト単体で意味通達 >60% なら不要。 <60% なら女性ナレ導入を検討 |
| 3-4 | 1-D-shop-glow (今日のショップ在庫シルエットが光る) | 世界演出 | 骨格 1 定着後、 「今日の何かに会える予感」 の非言語シグナルとして再設計 |
| 3-5 | 1-E-reserved-seat (取り置き中シールの予約席リボン) | 骨格に近い / 予約UX | **骨格 3 (haptics) の 「取り置き受取確定」 パターン (`[25, 40, 25]ms`) で 「自分がこの子を選んだ」 感の代替性を実測検証**。 判定条件: (a) **60% 以上** 達成なら装飾扱いとして §7 保留継続 (Phase 2 で再検討)、 (b) **60% 未満** ならリボンビジュアルを **骨格 2 の snap 視覚フィードバックに統合し骨格昇格** (`4-1a` 候補ハイライトの origin=reserved 別カラー variant として再設計)。 Phase 2 再検討会 (§7 冒頭) の agenda item に 「予約席 haptics 代替性検証結果の報告」 を必ず含める |
| 3-6 | 1-F-newbie-ribbon (直近 7 日以内 free 絵柄にリボン) | 世界演出 | 骨格 1 の pulse affordance で新入りも既存も等しく気付けるなら不要 |
| 4-1 | 2A-v2 (ガチャ最終開封時のポノ見守り顔 1.4s) | キャラ演出 | 骨格 4 の完成祝祭で 「達成感」 が既に伝わっているか実測後、 ガチャ climax に別種の情緒 (キャラ登場) を重ねる価値があるか判定 |
| 4-2 | 2B-v2 (unboxing マイクロ改善 4 点) | ガチャ演出 | 骨格 4 本と直交する領域。 Phase 2 で unboxing 独立タスクとして再優先度付け |
| 4-3 voice 層 | 2C-v2 の女性ナレ 10 本 (praise voice) | キャラ演出 (音声) | 骨格 4 完成祝祭が数字なし絵のみで達成感を伝えているなら不要。 vibrate + visual では届かない低刺激カテゴリ (連続貼付など) にのみ限定導入 |
| 5-1 | 柱3 物語の背骨 (1 シール = 1 物語断片) | 物語連動 | 骨格 1 の origin 分離定着後、 book/game/free の物語トーン差別化を再設計 |
| 5-2 | 柱4 長期成長の可視化 (育つ表紙・時間帯・週次セレクト) | 世界演出 | 骨格 4 の完成祝祭が origin 全体埋め切りへ拡張できるかとセットで検討 |
| 5-3 | 柱5 家庭内共有 (ママにみせる・KDP 連動) | 家族共有 | KDP Amazon リスティング (`feature_kdp_amazon_listing.md`) と絵本合言葉 (`policy_book_buyer_password.md`) の launch 時期と連動 |

### 7-2. Phase 2 で新規追加検討する候補

- **音声レイヤの解禁判定**: 骨格 4 本の実測で 「テキスト + 触覚 + 絵」 の 3 層で不足があると分かった場合のみ、 女性ナレ (Gemini Leda 1.15x 第三者読み聞かせ) を骨格上に重ねる。 fal-ai TTS は引き続き禁止 (§0.5 / `policy_no_fal_ai_tts`)
- **キャラ演出の順序**: ポノ登場 (旧 §4-1) / ふくろう先生ヒント (旧 §3-3) は Phase 2 内でも段階導入。 まずは 1 経路 (例: ガチャ最終開封のポノ見守り顔) のみ先行
- **partner_* voiceTag 実装解釈**: `puzzle/partners.js` の voiceTag metadata フィールドは 2026-07-02 grep で実行時 code path なしを確認済 (§8 参照、 §7-3 補遺 audit artifacts に grep コマンドと結果を記録)。 実装解釈を復活させる場合は、 `policy_character_voice` に反しないことを再検証

### 7-3. 補遺: audit artifacts

将来のエンジニアが 「voiceTag が実装済み」 「origin schema が完成済み」 と誤解しないように、 v4.1 時点の verification 結果を明示的に記録する:

- **voiceTag 実行時再生ルート不在の確認 (2026-07-02)**:
  - コマンド: `grep -rn 'voiceTag' puzzle/ common/ Prototypes/` (ripgrep 相当)
  - 結果: `puzzle/partners.js` の metadata 定義のみヒット、 `.play(voiceTag)` / `new Audio(voiceTag)` / `narration.playByTag` 型の呼び出し 0 件
  - 保存先: audit ログは AGENTS.md §2.5.4 に referenced、 詳細再確認は本ドキュメント §7 冒頭の再検討トリガと同時に実施
- **origin schema migration test 計画**:
  - `docs/audit/sticker_migration_checklist.md` を §3-0 PR 実装時に作成すること
  - チェック項目: (a) bookOnly=true の 6 枚が origin='book' に分類 (b) 既存 game origin 129 枚の gameId 値が null にならない (c) free origin 40 枚に重複なし
- **affordance 認識率テスト計画** (§3-1 pulse >70% / 50-70% / <50% の判定 gate):
  - テスト設計 doc は骨格 1 実装 PR 開始時に `docs/audit/affordance_recognition_test_plan.md` として起票
  - 参加者: 3-4 歳児 最小 8 名、 保護者同意取得済、 実施環境は iPad 6 世代想定

---

## 8. やってはいけないこと (トーン制約 + 音声制約)

**絶対禁則 (トーン)**
- 花火 / 爆発 / 蛍光色 (蛍光ピンク・蛍光緑・蛍光青) の使用
  - 理由: 森トーン絵本世界の一貫性毀損。 3-8 歳の感覚統合期に強い彩度刺激は覚醒過剰を招く (Ayres 1972)
- 星形パーティクル (円形および木の葉形のみ許可)
  - 理由: 星形は西洋的祝祭記号で花火連想が強い。 円形 / 木の葉形はドングリ / 木の実 / 水滴の自然物連想で森世界と整合
- Additive blending による発光 (蛍光化するため、 NormalBlending + アルファグローで代替)
- 200ms を超える単発 vibrate (覚醒しすぎ、 子ども向けに不適切)
- 数字による進捗表示 (「12/50」 「N まい」 等、 `design_age_rating_display` 準拠)
- 画像を CSS で stretch (縦横比違反、 `feedback_image_aspect_ratio.md` 参照)

**絶対禁則 (経路情報 UI 露出)**
- 「このシールは XX で貰える」 と `gameId` / 入手経路を UI で明示すること (自由絵柄カタログ性を毀損)
- 「今日のガチャ在庫は ○○」 「ショップで見かけたら教えるね」 等の経路情報リーク

**絶対禁則 (音声、 §0.5 + AGENTS.md §2.5 準拠。 正本は AGENTS.md §2.5、 以下は要約)**
- **ポノ・ふくろう博士 (および パートナー動物 全 8 種) に肉声を持たせる**: TTS / 収録 / 新規発話 全面禁止。 既存 `partner_*` voiceTag も第三者ナレ間接話法ルートへ順次置換。 「わたし、 ポノ!」 「ぼくは ふくろう先生」 等のキャラ一人称ナレーションは絶対禁止
- **fal-ai / fal.ai / everything-claude-code:fal-ai-media スキルを 音声生成用途 で使う**: 汎用 TTS は声質調整の自由度が高く、 「ポノ風の柔らかい声」 とプロンプトするだけでキャラ性が帯びるリスク。 音声生成は Gemini Leda 1.15x (`common/narration.js:39` の既存 pipeline) のみ許可。 画像用途 (fal-ai-media の画像モデル) は本禁則の対象外、 別ルール適用
- **女性ナレをキャラの代弁として直接話法で書く**: 「〜だよ」 の一人称は禁止、 必ず 「〜だって」 「〜と ふくろう先生が いっているよ」 の間接話法・第三者読み聞かせ視点に書き換える。 女性ナレは 「森の中立的な観察者」 のポイント・オブ・ビューに固定
- **`puzzle/partners.js` の voiceTag metadata フィールドを 「音声資産あり」 と解釈すること**: 2026-07-02 grep で voiceTag が実行時に音声を再生する code path は存在しないことを確認済。 metadata フィールドを 「実装済み音声資産の名前」 と誤解釈して音声再生ロジックを追加することは禁止。 voiceTag は将来の第三者ナレ再生スイッチとして扱い、 実装時は §0.5 準拠 (Gemini Leda 1.15x / 間接話法 / whisper 検証必須)

**絶対禁則 (実装 / spec 表記)**
- spec / コード / docs で 「voice」 という語を単独で使う (必ず 「女性ナレ (female narrator)」 「機能音 (functional tone / SE)」 「キャラ肉声 (character voice = 禁止)」 のいずれかに明示分類する)
- TTS voice を whisper 検証なしでデプロイ (`feedback_tts_whisper_verify_required.md` 参照)

**推奨トーン**
- 森トーン: 麦色 (`#E8D6A8`)、 亜麻色 (`#C9B48A`)、 若葉色 (`#A8C4A2`)、 桜貝色 (`#F2C6B4`)、 蜂蜜色 (`#FFF0C0`、 SUPER および完成祝祭 微量のみ)
- 触覚: 30-80ms 台の短い規則的パターンを基本に、 climax のみ累積型
- 完成祝祭: 数字なし、 絵で伝える。 ページ 3D 開き + 紙吹雪 + 記念スタンプ + 静かな吹き出しの 4 要素で 「みつけた」 感を作る
- opt-out: 全 celebration 要素を保護者が個別 toggle できるように `ManageDebug` 設定に集約

---

## 9. 変更履歴

| 日付 | バージョン | 変更内容 |
| --- | --- | --- |
| 2026-07-02 | 初版 | 柱1 (収集の可視化) 6 案 + 柱2 (授受の儀式) 4 案の詳細設計。 柱3-5 は保留 |
| 2026-07-02 | v2 | レビュー反映 (must_fix 15 件 / should_improve 6 件) |
| 2026-07-02 | v3 | キャラクター音声禁止 + 女性ナレーター専業化ポリシー反映。 §0.5 新設 |
| 2026-07-02 | v3.1 | 3-reviewer クロスレビュー反映 (must_fix 15 件 / should_improve 5 件) |
| 2026-07-02 | v4.1 | **3-reviewer クロスレビュー反映 (must_fix 10 件 / should_improve 5 件)**。 主な変更: (1) §0 TL;DR 保留リスト集約行を追記、 「§7-1 対応表を SSOT とし §0 は概要のみ」 に明示、 個別項目 (newbie-ribbon / 予約席リボン) の条件付き扱いを §7-1 参照に統一 (game-design reviewer must_fix #4)。 (2) §3-1 pulse affordance 認識率テストを Phase 1 実装前提条件 gate に格上げし、 ハイブリッド版 (葉っぱアイコン `assets/leaf_hint_icon.png` 8-12px) を暫定実装 default 化、 「アイコンは骨格 1 の子機能」 と明示分類、 Phase 2 再検討対象外を宣言 (game-design must_fix #1 + 実装リード should_improve)。 (3) §4-1a 「候補ハイライト UI」 独立サブセクション新設、 骨格 2 の子機能として (a) 目的 (b) 3 個上限の Gestalt 根拠 (c) 200ms halo アニメ (d) 森トーングラデ (e) 発達心理根拠 (Bushnell & Boudreau 1993) (f) origin 別強度 (g) opt-out を明記 (game-design must_fix #2)。 (4) §7-1 予約席リボンの判定ロジック逆転修正、 「haptics で 60% 以上 → §7 保留継続、 60% 未満 → 骨格 2 昇格 (`4-1a` に統合)」 を明示、 Phase 2 再検討会 agenda item に追加 (game-design must_fix #3)。 (5) §5-1 触覚シナリオ表を (a) 骨格 3 単独 13 シーン (b) 骨格 4 連動 1 シーン (`checkCategoryCompletion()` hook 経由) の 2 表分割、 骨格間依存グラフを可視化 (game-design must_fix #5)。 (6) §6-1 t=0 演出シーケンス表に骨格 3 hook 呼び出しの明示追記。 (7) §2 「実装ステータス (v4.1 時点)」 表を新設、 §3-0 origin schema / §3-1 骨格 1 / §4-1a snap 候補ハイライト / §5-1 haptics モジュール 2 本 / §6-1 completion celebration / ManageDebug 設定画面 / Brand Kit brief 全てが未実装であることを明示、 実装 PR 順序 (依存グラフ) と暫定実装許容範囲を明記 (実装リード must_fix #1-#5 全反映)。 (8) §0.5 に正本参照 (AGENTS.md §2.5 SSOT 明示) 追加、 4 サブセクション (§2.5.1-2.5.4) への直接 link、 memory ファイル生成タイムラインを HANDOFF.md 記載予定と明記 (policy guardian should_improve #1 #4)。 (9) §7-2 partners.js voiceTag 記述に §7-3 audit artifacts への link 追加。 (10) §7-3 「補遺 audit artifacts」 新設、 voiceTag grep 検証結果 (2026-07-02) / origin schema migration test 計画 / affordance 認識率テスト計画 の 3 件を verification log として明記 (game-design should_improve #5)。 (11) §8 音声禁則ヘッダに 「正本は AGENTS.md §2.5、 以下は要約」 を追記 (policy guardian should_improve #5)。 (12) 併せて CLAUDE.md Base Rule 6-7 と ECC skill 一覧 fal-ai-media 行に AGENTS.md §2.5 詳細正本参照を追記 (policy guardian should_improve #2 #3)、 AGENTS.md §2.5 冒頭に SSOT 宣言を追加 (policy guardian should_improve #4)。 **却下項目**: game-design should_improve #1-#4 (紙吹雪 3-4 歳 UI 負荷テスト詳細化 / 年齢入力 default 6-8 に変更 / migration checklist 別 file 化 / 保護者 dashboard 数字表示検討) は pragmatic 進行と初期スコープ抑制の観点で保留、 実装 PR 段階または Phase 2 再検討会で扱う。 実装リード should_improve #1-#5 (音量実測段階分け / pulse ハイブリッド default / 年齢別制御タイミング / iPad ロー品質実測 / localStorage version bump) は §2 実装ステータス表末尾の 「暫定実装で先行 → テスト後修正」 pragmatic 進行方針で包括的に反映済 |
| 2026-07-02 | v4 | **骨格 4 本にリセット + memory 2 件固定化反映**。 主な変更: (1) 5 本柱構造を撤廃し 「骨格 4 本 + 保留リスト」 に構造刷新。 骨格 = (a) 未取得シルエット表示 (b) 吸着 magnetic snap (c) 触覚 haptics (d) 完成の絵的祝祭。 (2) §0 TL;DR を骨格 4 本に絞った旨と Phase 2 保留の理由を明記。 (3) §0.5 音声原則に固定化 memory 2 件参照追加 (`policy_no_fal_ai_tts` / `policy_character_voice`)、 「骨格 4 本と音声の関係」 サブセクション追加 (骨格段階では女性ナレを積極的に使わない設計)。 (4) §3 骨格 1 は旧 §3-1 1-A-v2 を再編集、 tap 反応を owl-whisper 系ナレから 「静かな吹き出しテキストのみ or 沈黙」 に変更、 pulse affordance <50% 時のハイブリッド案を 「ふくろう先生の羽根」 から 「中立的な葉っぱアイコン」 に置換。 (5) §4 骨格 2 は旧 §3-2 1-B-v2 を再編集、 音声は snap SE (機能音) のみに縮小。 (6) §5 骨格 3 は旧 §4-4 2D-v2 を昇格、 女性ナレ関連削除、 vibrate + iOS 440Hz sine wave 機能音代替のみに純化、 カテゴリ完成 (骨格 4 連動) 新シーン追加。 (7) §6 骨格 4 は新設セクション、 カテゴリ埋め切りの絵的祝祭シーケンス (ページ 3D 開き + 紙吹雪 + 記念スタンプ + 「みつけたね」 静かな吹き出し) を仕様化、 数字表示を絶対禁止、 音声なし、 記念スタンプ localStorage 永続化。 (8) §7 保留リスト新設、 旧 §3-3 / §3-4 / §3-5 / §3-6 / §4-1 / §4-2 / §4-3 voice 層 / §5-1 / §5-2 / §5-3 を全て移動、 対応表 (旧 § → 新 §7) 追加、 §3-5 予約席リボンは 「骨格 3 の取り置き受取確定 haptics で代替できるか」 の判定を Phase 2 の再検討観点に明記。 (9) §8 やってはいけないこと に音声禁則 4 項追加 (fal-ai TTS 禁止 / ポノ・ふくろう肉声禁止 / puzzle/partners.js voiceTag の実装解釈禁止 / 「わたし、 ポノ!」 等のキャラ一人称禁止) + 完成祝祭関連の追加禁則 (数字による進捗表示、 星形パーティクル、 additive blending)。 (10) §9 v4 エントリ。 旧 v3.1 の TTS 生成 31 本フローは骨格 4 本の範囲外となり保留 (§7 での再検討時に見積り直し) |
