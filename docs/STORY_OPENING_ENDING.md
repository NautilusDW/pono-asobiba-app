# オープニング / エンディング シナリオ案

**対象範囲:** ひらがな編（あ〜わ 行、10面クリア）  
**発動タイミング:** オープニング = 初回起動時 / エンディング = **わ行 (カゲロウ) クリア後**（v268 で ら行 → わ行 に移動、v271 で celebration 経由に統合）  
**続き:** 魔王城突入〜ラスボス戦は **カタカナ編** として後日実装

## 全体タイムライン（ひらがな編）

| # | 行 | 主要イベント | 関連関数 | ドキュメント節 |
|---|---|---|---|---|
| — | — | OP 紙芝居 (S1〜S8) | `OPENING_SCENES` + `_showStoryboard` | オープニング |
| 1 | あ・か | もりの妖精リーファと合流 (か行 bridge) | `_waterFairyFarewell` | — |
| 2 | さ | 中ボス (森ボス)、たて入手 | `grantGear('shield')` | — |
| 3 | た・な | 祠で氷の妖精セリナ救出・鍵受け渡し | `_rescueFairy('shrine')` | 氷の妖精・鍵の受け渡し |
| 4 | は | 中ボス (洞窟ボス)、よろい入手 | `grantGear('armor')` | — |
| 5 | ま | — | — | — |
| 6 | や | — | — | — |
| 7 | ら | 溶岩で炎の妖精ヒノカ救出 | `_fireFairyFarewell` | 炎の妖精との合流 |
| 8 | わ | **最終ボス カゲロウ (v272: Battle Intro + Climax + Celebration 統合)** | 後述 | わ行 最終ボス戦全体 |
| — | — | ED 紙芝居 (E1〜E5) | `ENDING_SCENES` + `_showStoryboard` | エンディング |

## 登場人物（v268 固有名追加）

| 役 | 名前 | 種族・立ち位置 |
|---|---|---|
| 主人公 | ゆうしゃ | プレイヤーの分身 |
| 姫 | おうじょさま | 冒険の目的、ザガンに誘拐されている |
| 王様 | おうさま | 国王、勇者の依頼主（Charon voice） |
| **リーファ** | 森の妖精 | か行 (橋) で出会う。木の葉の妖精。一緒に旅する |
| **セリナ** | 氷の妖精 | な行 (祠) で出会う。魔王城の鍵を氷の首飾りに封じて持っている |
| **ヒノカ** | 炎の妖精 | ら行 (溶岩) で出会う。**カゲロウ (わ行ボス) の相棒**。火山を守る仲間 |
| カゲロウ | かざんのぬし | わ行ボス。ヒノカの相棒だったがザガンの仮面で心を奪われた |
| ザガン | 魔王 | ラスボス（カタカナ編）。手下を使って国を荒らす |
| **ノクス** | 仮面の魔人 | ザガンの筆頭手下。OP S4a で初登場、わ行クライマックスでカゲロウに再呪印を刻む |

---

## オープニング（紙芝居・全7シーン）

プレイヤーはタップで次のシーンへ進む。各シーンはテキスト＋背景画像（画像はユーザー側で生成予定、暫定はグラデ背景）。

### S1 — 平和な王国（2 ビートに分割、C01 / C02）

S1a:

> むかし むかし、  
> しあわせな おうこく が ありました。

S1b:

> まいにち みんなが わらいあう、  
> やさしい くに でした。

### S2 — お姫様（2 ビートに分割、C01 / C02）

S2a:

> おうじょさま は こころ やさしく、

S2b:

> ひとびと から あいされて いました。

### S3 — ふしぎな ひかり

S3a:

> あるひ、 おしろ の へや で  
> おうじょさま が すごして いると、  

S3b:

> へや の なか に  
> ふしぎな ひかり が あらわれました。

### S4 — まおう の てさき（2 分割、v266b で S4c 廃止）

S4a:

> ひかり の なか から、  
> まおう ザガン の てさき が  
> すがた を あらわしました。  

S4b:

> それは、 かめん を つけた  
> ふしぎ で おそろしい まじん でした。

**v266b 再構成メモ (2026-04-24):** 旧 S4c（「ザガンは『ありがとう』の心を奪う魔王」）は S5c_c へ移動統合。「襲撃 → 惨状 → 心を奪われた結果 → じつは魔物も…」という物語の起伏を強化した。旧 `voice/S4c.mp3` は不要となり削除。

### S5 — つれさられる（2 ビートに分割、C01 / C02）

S5a:

> まばゆい ひかり が  
> へや いっぱい に ひろがる と、

S5b:

> おうじょさま は  
> つれさられて しまいました。

### S5c / S5d — 呪縛の手（v265 追加、v266 で S5c を 2 分割 / 2026-04-24）

**追加理由:** バトルで「仮面を こわす」メカが登場するため、その世界観設定を OP で先に提示する。姫誘拐 (S5b) と 王の叫び (S6a) の間に挿入することで因果が自然 (「姫が連れ去られた後、呪縛が国中に広がった → 王が叫んだ」)。S5 の延長として S5c/S5d と命名し、既存 S6〜S8 の mp3 リネームを回避。

**v266 改訂**: S5c のナレーションが長いため、専用パノラマ画像 2 枚を横パンで見せる構成に変更。音声 `S5c.mp3` は 2 ビットで連続再生 (setVoice の同一 src スキップで途切れない)。

**画像構成:**
- `opening_s5c_a.jpg` (1600×685, 2.33:1 パノラマ) — S5c_a 用、`pan: 'right'` で左→右
- `opening_s5c_b.jpg` (1600×685, 2.33:1 パノラマ) — S5c_b 用、`pan: 'left'` で右→左（視点反転）
- `opening_s5c_c.jpg` (v266b 追加、**画像未作成**) — S5c_c 用、襲撃後の惨状（壊れた家・泣き崩れる人々）
- `opening_s5d.jpg` (1600×904, 16:9) — S5d 用、パン無し

**絵の内容:** 夜の村、白い顔なし仮面（おでこに紫の呪印）の魔物が逃げる村人を威嚇・襲撃する構図。S5c_c は襲撃後、ほぼ無人の村で悲しく泣いている姿や壊れた家屋を描写。

S5c_a:

> その ひから、 くに の あちこちで、  
> しろい かめん を つけた まもの が あらわれ、

S5c_b:

> ひとびと を おそい はじめました。

S5c_c (v266b 追加、v268 で 2 ビット分割・前半 / 2026-04-24):

> まおう ザガン は、  
> ひとびと の 「ありがとう」 の こころ を うばい、

S5c_c2 (v268 追加・後半):

> くに を くらやみ に しずめよう と して いた の です。

**ナレーション方針**: 旧 S4c のセリフをそのまま使用（位置と絵だけ変更）。v268 でユーザー指示により「心を奪い」で区切って 2 ビットに分割。音声も同期するため `S5c_c.mp3` を短縮版に差し替え、新規 `S5c_c2.mp3` を後半用に追加予定。

S5d (v268 で 2 ビット分割・前半):

> じつは その まもの は、  
> やさしい せいれい が ザガン の のろい で  
> あやつられて いた の です。

S5d2 (v268 追加・後半):

> かめん を こわさないと、 もと に もどれません。

**構成意図**: S5c_a/b「魔物が攻撃」→ S5c_c「惨状・ザガンの動機（心を奪う）」→ S5d「じつは その魔物も操られて…」という**3 段の物語の起伏**。恐怖 → 悲しみ → 同情・決意の感情転換を演出。v268 で音声と画面メッセージの同期ズレ対策として長文シーンを 2 ビットに分割。

**Voice (TTS):**
- `voice/S5c_a.mp3`, `voice/S5c_b.mp3` - S5c 用分割音声（v268 でユーザー収録予定）
- `voice/S5c_c.mp3` - 前半「心を奪い」まで（ユーザー短縮版に差し替え予定）
- `voice/S5c_c2.mp3` - 後半「くらやみ に しずめよう…」（新規収録予定）
- `voice/S5d.mp3` - 前半「あやつられて いた」まで（ユーザー短縮版に差し替え予定）
- `voice/S5d2.mp3` - 後半「かめん を こわさないと…」（新規収録予定）
- 音声提供までは `S5c.mp3` / `S5c_c.mp3` / `S5d.mp3` が各々の先頭で再生（setVoice 同一 src 継続、分割反映まで暫定運用）

### S6 — おうさま の さけび（v268 で S6c 文言調整）

**v268 変更**: S6c を「ゆうかん な せんし を あつめました」→「**くに じゅう から、ゆうかん な せんし を あつめました**」に。「悲しく叫び」から「戦士を集めた」への論理飛躍を「国中から」で補強。絵としては王の前に大勢の戦士が並ぶカット、その次に王が勇者に話しかけるカット（S7a）への流れが理想。

S6a:

> 「たすけて くれる もの は おらぬか！」  

S6b:
> おうさま は かなしく さけび、 

S6c (v268 改訂、「国中から」追加):

> くに じゅう から、  
> ゆうかん な せんし を あつめました。

S6d (v269 新規):

> なか でも おうさま と よげんしゃ は、  
> ひとり の わかもの に めを とめ ました。

### S7 — 勇者召集（v269 で 4 ビットに拡張、預言導入）

#### v269 背景設定 (2026-04-24)

王国には「王族のみに伝わる秘伝の預言」があり、勇者はこの預言の条件に合致する者として選ばれた。心の優しさで選ばれたという真相は物語の終盤で明かされる伏線として温存。

**預言の文言**（ナレーターが朗読）:

> やみ の とき、 まんげつ の よる に うまれ、  
> ほしのしるし を もつ もの が、 まおう を うちやぶる

**勇者の特徴 (預言との一致)**:
1. 『ほしのしるし』をその身に持つ（アザ/印）
2. 『まんげつのうまれ』（満月の夜に生まれた）

王 + 預言者がこの 2 条件の一致を見抜いて勇者を選定。

#### S6d (v269 新規、S6c と S7a の間)

> なか でも おうさま と よげんしゃ は、  
> ひとり の わかもの に めを とめ ました。

**Voice (TTS):** `voice/S6d.mp3` (Iapetus、2026-04-24 統合済み)。

#### S7a_mid (v269 新規、預言開示)

> おうぞく だけ の ひみつ の よげん 。  
> 『やみ の とき、 まんげつ の よる に うまれ、  
>  ほしのしるし を もつ もの が、 まおう を うちやぶる』

**Voice (TTS):** `voice/S7a_mid.mp3` (Iapetus、2026-04-24 統合済み)。ナレーターが「王族だけの秘密の預言」と紹介してから預言本文を朗読する自然な読み上げ。巻物などの VFX なし、絵はユーザー側で別途検討。

#### S7a (v269 改訂、預言条件一致):

> その しるし も、 まんげつ の うまれ と いう じき も、  
> あなた に ぴたり と あって いた の です。

**Voice (TTS):** `voice/S7a.mp3` (Iapetus、2026-04-24 新テキストで差し替え済み)。

S7b:

> 「ゆうしゃ よ、  
> わが ひめ を たすけだして くれ！」

S7c (v266 ありがとうテーマ勅命、v269 で 2 ビット分割):

前半 (S7c):

> 「まどわされた せいれい たち を めざめさせて、

後半 (S7c2):

> 『ありがとう』 の ちから を あつめて、  
> かならず ひめ を たすけだす のだ！」  
> → タップで冒険スタート

**Voice (TTS):** `voice/S7c.mp3` / `voice/S7c2.mp3` (Charon 王様 voice、2026-04-24 統合済み)。文字数が多いため 2 ビット分割。同日 S6a/S7b も差し替え済み、全 4 本 -14 LUFS 正規化。

### S8 — 勇者出発

あさひ を うけて、
ゆうしゃ は たびだった。
おひめさま を たすけだす、
ながい たび の はじまりだ。
---

## エンディング（紙芝居・全7シーン）

ら行クリア + 炎の妖精のお別れセリフの直後に発動。  
BGM: `assets/audio/storyboard/moonfire_oath.mp3`（E1 で開始、通しで再生、最終シーン後の白フェード中に 4s で消音）。

（※ポノ・ハリネズミは紙芝居には登場させない。勇者＋3妖精の物語として独立させる。）

### E1 — 焚き火の仲間

画：もりの なか、たきび の まわりに もり・ほのお・こおり の 3にん の ようせい が よりそう。

> 3 にん の ようせい の ちから を かりて、  
> ここまで やって きた。

**補足（妖精配置 / 2026-04-24 改訂）:**  
祠で救出するのは **氷の妖精**（氷の封印に閉じ込められていて、ザガンの封印で自分の氷魔法が使えない）。溶岩で救出するのは **炎の妖精**（ザガンの魔力の鎖で溶岩の底に縛られている）。  
一時期「炎なのに熱い」矛盾回避のため祠↔溶岩でスワップしていたが、(1) 氷の妖精を溶岩に置くと「氷で溶岩に足場を作る」物理矛盾、(2) 鍵を氷の妖精に持たせる方が能力と合う、という問題で元に戻した。熱の矛盾は「炎の妖精は熱さで弱らない。動けないのは魔力の鎖のため」と説明を差し替えて解消。

### E2 — 焚き火の余韻（3分割）

焚き火まわりの異なるショット 3 枚（`ending_2a.jpg` / `2b` / `2c`）で構成し、ナレーションを 1 行ずつ載せて余韻を引き伸ばす。

**E2a** — たきびの火が揺れる

> たきび の ひ が、  
> ちいさく ゆれて いる。

**E2b** — 思い出が浮かぶ

> ながい たび の おもいで が…

**E2c** — 胸に甦る

> しずかに むねに よみがえる。

### E3 — 星空（ゆっくり縦パン）

画：縦長の夜空画像 (`ending_3.jpg`)。`pan: 'up'` で下（地上の勇者）→上（満天の星）へ 16 秒かけてゆっくりパン。

> よぞら を みあげる と、  
> ほし が きらきら と ひかって いた。

### E1 の音声収録ルール（v266）

`text` フィールドには `{{THANKYOU}}` プレースホルダが入っており、実行時にプレイヤーの累計カウント数字で動的置換される。**音声は数字を読まず、汎用表現「たくさん」で録音する**（画面文字と音声が軽くズレるが、子供は数字を読まないので問題なし）。

収録スクリプト:
```
3 にん の ようせい の ちから を かりて、
ここまで やって きた。
「ありがとう」 も たくさん あつまった。
```

画面表示（プレイ中の実例）:
```
3 にん の ようせい の ちから を かりて、
ここまで やって きた。
「ありがとう」 も 37 こ あつまった。
```

### E4 — 決意（ゆっくり縦パン、v266 で地の文化）

画：縦長 (`ending_4.jpg`)、地上の勇者から奥の魔王城のシルエットへ `pan: 'up'` で 16 秒。  
将来: 勇者の手が魔王城の鍵を握りしめている寄りカットを差し込む予定（鍵素材待ち）。  
**v266 改訂**: ナレーター (Iapetus) が読む前提で、勇者の直接台詞を「心の声 + 地の文」体裁に統一。

> 「まおうじょう は、 すぐ そこ だ。  
> かならず、 おひめさま を たすけだす ぞ」  
> と、 ゆうしゃ は こころ の なか で つぶやいた。

### E4b — ありがとうの力（v266 追加）

同じ縦長画像 (`ending_4.jpg`) を使い、E4 の直後に配置。「集めた ありがとう」が封印を破る力になる、という絵本テーマの決着ビート。

> 「あつめた 『ありがとう』 の ちから で、  
> まおうじょう の のろい を やぶって みせる ぞ」  
> と、 ゆうしゃ は あらためて つよく けつい する のであった。

**Voice (TTS):** `voice/E4.mp3` / `voice/E4b.mp3` (Iapetus、2026-04-24 統合済み)。ED 全シーン (E1〜E4b) も同日まとめて収録完了。

### E5 — クレジット（余韻）

画：タイトルロゴ (`assets/images/ui/title_logo.png`)。最終シーンを抜けた後、既存の余韻演出（背景が白へフェード → BGM が 4 秒でフェードアウト → overlay 透明化 → マップ画面へ復帰、総尺 ~8 秒）で閉じる。

> Sillas W. Nemo  
>   
> カタカナ へん に、 つづく…

---

## イベント: わ行 最終ボス戦『カゲロウ覚醒』 — 全体フロー（v268〜v272）

ら行クリア後、わ行に入ってから ENDING_SCENES 再生までの**全体シーケンス**を示す。各ビートの詳細は後続のサブセクションに分ける。

| # | ビート | 実装関数 | v |
|---|---|---|---|
| 1 | マップシーン → 通常のエンカウント (「かざんのぬし あらわる！」) | `_showMapScene` + `_showBattleEncounterIntro` | — |
| 2 | **ヒノカ認識 + カゲロウ急襲イントロ** | `_playHinokaRecognitionIntro` | **v272** |
| 3 | わ→を の 2 ヒット (taunts p1/p2) | `battleHitEnemy` | v268 |
| 4 | ヒノカ歌の呼びかけ + 回想 4 枚 | `_playWaRowEpisode` + `_showMemoryFlashback` | v270/v272 |
| 5 | クライマックス interlude (覚醒→**儀式①「ほむら」**→ノクス妨害→倒れる→星の印→**儀式②「かげろう」**→仮面割れ) | `_playKagerouClimax` + `_showChantRitual` × 2 + `_crackKagerouMask` | v271 / **v277** |
| 6 | 最後の「ん」なぞり (p3 taunt) | HanziWriter quiz (既存) | v268 |
| 7 | 浄化演出 (仮面縦割れ + bow/leave) | `_startPurificationSequence` + `battleVictory` dialog | v265 |
| 8 | Celebration (3妖精集結 + **カゲロウ自身が太陽の剣を手渡し**) | `_showVolcanoCelebration` + `grantGear('sword')` | v271/**v272** |
| 9 | ENDING_SCENES (ひらがな編) | `_triggerHiraganaEndingIfNeeded` | v268/v271 |

**発動フラグ:** `_rowPracticeRow.label === 'わ'` (カタカナ ワ も包含) / `_battle.enemy.id === 'volcano_lord'` / `localStorage.pono_ending_seen` (ENDING 初回判定)。

**v272 構造変更 (2026-04-24):**
- 旧 Pre-battle 紙芝居 (VOLCANO_EPISODE_SCENES、4枚) は**撤去**。「ヒノカ は 数日間 ザガン に 捕らえられて いた → その間の カゲロウ の呪縛を知らない」という時系列に合わせ、**初対面で気づく** ナラティブに変更。
- 神器 (太陽の剣) 入手演出を generic モーダル + 幕バナーから、**カゲロウ本人が celebration 内で手渡す** 演出に変更 (感謝と共に渡す)。
- カゲロウの一人称「おれ」→「わたし」へ統一。

---

## イベント: ①  わ行 Battle Intro『ヒノカの認識 → カゲロウ急襲』（v272）

**発動タイミング:** わ行選択 → **山道紙芝居 (フル画面・縦パン)** → **カゲロウ登場アップ (フル画面・Ken Burns)** → 認識セリフ。「もじを なぞって たおそう！」の操作説明が出る**前**。マップ歩行+カーテン演出 (`_showMapScene`) は v275 で skip 済み。
**実装関数:** `_showBattleIntro` (`isVolcanoRow` 分岐) → `_showClimaxEventImage` × 2 → `_playHinokaRecognitionIntro(onDone)` → 認識 4 ビート → 急襲シェイク → 2 ビート。
**BGM:** バトル BGM 継続。ヒノカの dialog 中は静かなまま、急襲のシェイクでテンションを付ける。
**v278e 大量微修正 (2026-04-25):**

UI / レイアウト:
- bustup スケール 1.15 → **1.5**、base width 46% → 58% (ヒノカ・カゲロウ両方)、bottom -8% → -16% で下方シフト
- カゲロウ bustup width 56% → 62%、object-position center で右側カット軽減
- **妖精パーティーをスプライトとして battle-stage 内に配置** (`.party-fairies` 新設、勇者左下に横並び、各スロット = 小型妖精画像 + name + 細い HP bar)。旧 `.fairy-status` (左上の枠なしバー) は完全非表示。v278e 時点では `pixy_*.png` を使用していたが、**v278g で `Hinoka/hinoka_001.png` 等の新素材に差し替え + サイズ約 55% 縮小** (3 妖精合流時の横並びスペース確保)
- 連続技フェーズ全画面化を強化: `.mid-col`/`.controls`/`.header`/`.left-col` 等も全部隠す + battle-stage を `position:fixed inset:0` で画面いっぱいに敷き詰める (landscape 専用、ユーザー指示)
- chant ritual キャンバスを 82vw → **min(58vh, 60vw, 460px) × min(72vh, 460px)** で縦伸び
- chant ritual の subtext を全て **1 行化** (改行 \n を撤去)
- chant ritual の「ゆびでなぞって」ヒントを overlay 中央列 → **右下 absolute** に移動 → キャンバスの縦余裕拡大

物語フロー / 演出:
- ノクス再呪印 (`_showMaskedManInterference`) の画像に **下→上 縦パン 10s** 追加
- ノクス勝利タウント (`_showNokusVictoryTaunt`) の画像にも同様の **下→上 縦パン 12s** 追加
- ノクス Beat 2 と Beat 3 の間に **kagerou_recurse.jpg を 1 枚絵で挿入** (caption「魔人 ノクス は あらわれ、 カゲロウ の のろい を、 さらに つよめた——」) → `_playKagerouClimaxBeat3to5` 抽出してネスト整理
- Phase E3 (真名 finisher 直後) の流れを **火の玉飛翔 → 着弾 → われにかえった + ヒノカ呼びかけ → battle_last_02** に再構成:
  1. 🔥 emoji が画面左 (勇者) → 右 (カゲロウ) に 0.85s で飛翔
  2. 黄金フラッシュ + `.damaged` + screen-heavy-shake (着弾)
  3. 「かざんのぬし は **われにかえった！**」+ カゲロウ「…ヒノカ…？」 dialog
  4. battle_last_02 (仮面壊れた浄化遷移シーン)
  5. → battleVictory
- celebration の **「よく がんばったね！」を撤去**
- celebration の battle_last_03 (カゲロウ + ヒノカ寄り添い絵) は prefix 1 枚絵から **「カゲロウ「ゆうしゃ よ……」「そなた が いて くれた から…」「太陽の剣を…」「魔王城で…」」の 4 メッセージ間 ずっと背景表示** に移動。同時に他妖精 (リーファ + セリナ) を非表示にして主役を明確化。最後の締めメッセージ「3 にん の ようせい と…」で背景と妖精を復元

**v278d 微修正 (2026-04-25):**
- ノクス登場 (`_showMaskedManInterference`) に **下→上 縦パン** を追加 (10s linear、山道シーンと同パターン)
- 連続技「かげろう」入力後の最終フェーズ順序を **攻撃ヒット → 仮面割れ** に修正:
  - shoutout「カゲロウ！」直後に黄金フラッシュ + `.damaged` + `.screen-heavy-shake` (0.85s)
  - その後 `_crackKagerouMask` (仮面割れ) → `battle_last_02`
- **「めざめさせた」→「われにかえった」** に全体統一 (マザーオマージュ): バトルログ + 撃破ウィンドウ両方
- **どんぐり/ありがとうゲットの行を volcano_lord 戦のみカット** (盛り上がりを邪魔しないため。将来 celebration 末尾でゲット数だけ簡潔表示する案あり)
- celebration overlay の caption を battle-log と同じ書式 (#020208 + 枠) に変更し、**朝焼け bg と被って読めない問題を解消**
- **宝箱モーダル z-index 昇格** (`_showTreasureBoxReveal` 1650 → **1950**, `_presentBattleModal` 1700 → **1955**) — celebration overlay (1870) より上に出てタップ可能に

**v278c 微修正 (2026-04-25):**
- 山道 / カゲロウ登場 caption: 全幅黒帯 → **適度なボックス** (width:min(94vw,720px)、4 辺枠、bottom:18px で浮かす)
- 勇者ステータスの **「そうび」行を常時非表示** (.hero-equip-row { display: none !important })
- 妖精 HP バー: **勇者ステータスの右に横並び**、枠なし背景透過、サイズ縮小 (高さ 4px、ラベル「ヒノカ」「リーファ」「セリナ」全表示)、配色を背景に対して読みやすく
- 敵名前位置: volcano_lord 限定で `.enemy-info` を battle-stage の下端 → **敵イラストの直下** (top:78%、敵 wrap の右側に揃える) に再配置
- 「を」「ん」攻撃の直前にヒノカが **「カゲロウ、 やめて！おねがい、おもいだして……！」** / **「カゲロウ……！まだ、つたえたい こと が たくさん あるの……！」** を発話 (battle 流れに割込み)
- メモリフラッシュバック: **memory_03 (「でも、ザガンの呪いがふたりを引き裂いた」) を撤去**。3 枚 (希望→絆→歌) 構成に縮小
- 連続技 chant ritual の **キャンバスを 60vw,280px → 82vw,420px に拡大** (スマホで字小さい問題)
- **連続技フェーズ突入時に `body.combo-phase-active` クラスを付与** → なぞり書きキャンバス + ポノ + ハリネズミ + おてほん UI を全て display:none、battle-stage を 100vw + 78vh で全画面化。フェーズ完了 (`_playKagerouFinalCombo` の onDone) で自動解除

**v278f 全画面会話モード (2026-04-26):**
- ユーザー指示「バトルシーン以外のところのバトル画面、ほぼフル画面にしてって言ったけどなってないよ」
- `combo-phase-active` の効果 (キャンバス hide + battle-stage 全画面化) を **`battle-fullscreen-active` クラスでも発動するよう CSS 共有化**。両クラスで同じ display:none / position:fixed inset:0 が効く
- `_showBattleDialog` 入口で `_setBattleFullscreen(true)` → narrative 会話中は自動で全画面化。`_battleDialogFinish` 出口で `_setBattleFullscreen(false)` (`_battleDialogIsNarrative` フラグで _awaitTapOnLog と区別)
- `_awaitTapOnLog` (= ダメージ通知後のタップ待ち) は **対象外**: なぞり書き直後で flicker が出るため通常の split-screen を維持
- battle-log は全画面会話中、画面下部中央 (`bottom: 16px, width: min(92vw, 560px)`) にフロート — intro 中の battle-intro-active と同じ位置
- 連続して narrative 会話が呼ばれる場合 (showNext 再帰など) も同期的に remove → cb → add の順で進むので 1 フレーム内で完結し flicker しない

**v278l 山道→カゲロウ登場の overlay 切替時のフレーム露出修正 (2026-04-26):**
- ユーザー指摘 (複数回): 「山道とカゲロウ登場時のイメージの乗り替わり時にバトル画面のフレームが一瞬出る」
- 原因: `_showClimaxEventImage` の `close()` が overlay を 0.55s で fade out → 撤去 → 次の overlay が opacity:0 から fade in。合計 ~1.1s の間、半透明状態でバトル画面 (背景) が見えていた
- 修正: 火山ボス intro 開始時に **常駐の黒幕** (z:1800、climax overlay z:1805 の直下) を貼り、2 つの overlay が fade in/out する間ずっと背景を黒く保つ。Kagerou overlay の onDone (= battle stage reveal タイミング) で fade out → 撤去
- 影響範囲: `_showBattleIntro` の volcano boss 分岐のみ。通常マップシーンや他のクライマックスは現状維持

**v278k 妖精位置の右上シフト (2026-04-26):**
- ユーザー指示「フル画面の時の火の妖精の位置が左下すぎる、もっと右上に」「バトル画面の時も 1 キャラ分右に」
  → `.battle-stage .party-fairies` を `left: clamp(4px,2.5%,18px); bottom: clamp(8%,20%,26%)` から **`left: clamp(22px,6%,52px); bottom: clamp(20%,30%,38%)`** に変更
  → 約 1 キャラ分 (32px) 右シフト + 勇者足元 (~34% bottom) 付近に上昇
  → 他妖精 (riefa/serina) は同じ flex 親から row-reverse で並ぶため、自動的に同様にシフト

**v278j 妖精 3 人の見せ場 拡張 (2026-04-26):**

ユーザー要望 3 件 — セリナ足止め演出 / リーファ風魔法合体攻撃 / リーファ回復魔法見せ場。

新フロー (`_playKagerouFinalCombo`):
- B3 _playMagicAffinityDemo (既存) — 氷無効デモ
- **B3.5 [新] _playSerinaFreezeFollowup** — セリナ「わかった、 あしどめ くらい なら、 できる わ！」→ `launchMagicProjectile('ice')` 2 発目 → 着弾時に `#battleEnemy` に `frozen-feet` クラス付与 (永続)
- **B3.7 [新] _playRiefaWindIntent** — リーファ「わたしの かぜ で、 ヒノカ の ほのお を そだてる ね！」(風宣言、実演は B4 内)
- B4 _showChantRitual ['ほ','の','お'] (既存) → ★ chant onDone 内で `_spawnWindBoost('riefa', 8)` → 200ms 後 `_spawnWindBoost('hinoka', 6)` で「風が炎に乗った」合体演出 → 既存ダメージロジック (HP 12→6)
- **B4.3 [新] _playKagerouCounterAttack** — `_triggerKagerouRageAttack` → `_launchEnemyMagicProjectile('curse_shadow')` → 着弾時 `_hinokaMidHitEffect` + `_damageFairy('hinoka', 3)` (HP 8→5、`low` クラスで黄色) → カゲロウ「グルゥウオ……！」/ ヒノカ「うっ……！」
- **B4.6 [新] _playRiefaHealHinoka** — リーファ「ヒノカ、 まって ね。 なおして あげる わ。」→ `launchMagicProjectile('heal')` (緑) → 着弾時 `_healFairy('hinoka', 3)` (HP 5→8) + `_spawnHealSparkles('hinoka', 8)` で緑キラキラ → ヒノカ「ありがとう、 リーファ。」
- B5 _showChantRitual ['ひ','の','た','ま'] (既存)
- C1 _playKagerouHpRecoveryDespair (既存) — 冒頭で `enemyEl.classList.remove('frozen-feet')` 追加 (闇の力で氷を砕く演出)

新規実装:
- `_healFairy(key, amount)` — `_damageFairy` 対称ヘルパー (line 7626)
- `_spawnHealSparkles(fairyKey, count)` / `_spawnWindBoost(fairyKey, count)` — slot 座標を取って粒子撒き
- CSS: `.battle-enemy.frozen-feet::after` (水色氷晶グラデ + frozenFeetShimmer 2.4s ループ)、`.fairy-heal-sparkle` (緑、healSparkleFly 0.9s)、`.fairy-wind-boost` (cyan、windBoostFly 0.7s)
- `_playKagerouFinalCombo` の onDone wrapper に `frozen-feet` の cleanup を追加 (途中エラー時のセーフティ)

画像未支給時のフォールバック:
- `frozen_feet.png` (後日支給予定) は CSS `::after` の水色グラデが代替
- 風 / heal sparkle は完全 CSS 実装、画像不要

HP 計算:
- B4.3 `_damageFairy('hinoka', 3)` で 8→5 (62%、`low` クラス点灯)
- B4.6 `_healFairy('hinoka', 3)` で 5→8 (満タン、`low` クラス解除)
- C2 (_playFairiesKnockedOut) で Riefa+Serina HP→0 は変更なし

**v278i 4 件追補 (2026-04-26):**
- ユーザー指示「『私、ヒノカだよ』と名乗ってからバトル画面に戻るので非常に見づらい。その後カゲロウの『ゴゴゴ』でフルスクリーンに戻る」
  → `_playHinokaRecognitionIntro` の Hinoka 認識セリフ完了 cb で `_battleDialogIsNarrative=true; _setBattleFullscreen(true)` を即時実行。700ms の rage attack 演出中も全画面を維持し、split-screen 戻り → フル画面 の往復を解消
- ユーザー指示「ヒノカはスケール 60% にしてもっと右上に配置。勇者より前に出ないように」
  → `.battle-stage .party-fairies` の左下定位 (left:8px bottom:6px) を **`left: clamp(4px,2.5%,18px); bottom: clamp(8%,20%,26%)`** に変更し、勇者 (left:8% top:54%, 足元 ~25-34% bottom) のすぐ左下に。fullscreen 専用 override は撤去 (% 基準で battle-stage 縮尺に追従)
  → Hinoka 専用 width を `clamp(12px, 2.9vw, 19px)` (default の 60%) に縮小
- ユーザー指示「少し浮いてる感出したいので上下にゆっくり動いて」
  → `@keyframes partyFairyFloat` 追加。`.party-fairy-sprite` に `animation: partyFairyFloat 2.6s ease-in-out infinite` を付与。複数妖精合流時は nth-child で animation-delay -0.6s/-1.3s ずらし、同期しないようにする
- ユーザー指示「ヒノカの画像はバトル中はこれらの低解像度バージョン。フル画面の時は今の画像をそのまま」
  → in-battle スプライト (`.party-fairy-sprite`) のみ **`hinoka_pixel_front.png` (pixel art)** に差し替え + `image-rendering: pixelated` を Hinoka 限定で。bustup-portrait や celebration overlay 用の高解像度版 (`hinoka_001.png`) は別系統で継続
  → 素材未保存時は `onerror` で `hinoka_001.png` にフォールバック (pixel-rendering 解除も同時)。素材保存後は自動的に pixel art へ

**v278h 5 件追補 (2026-04-26):**
- ユーザー指示「お手本の時に全画面にならなくて良いです。なぞりスタート時も」
  → `_showBattleDialog(messages, onDone, opts)` に **`opts.noFullscreen` 追加**。なぞり turn 中の補助メッセージ (おてほんを みせるよ / なぞり スタート！) は `noFullscreen:true` で全画面化を skip。narrative とのレイアウト往復を抑える
- ユーザー指示「フル画面にした時に妖精が画面左下に貼り付いてて、パーティーに見えない」「主役の勇者のすぐ左下あたりに」「実際のパーティーで戦っているように、斜めに左下に 1, 2, 3, 4 と並んで」
  → `body.battle-fullscreen-active` 時のみ `.party-fairies` を `left: clamp(8px,3%,24px); bottom: clamp(8px,18%,24%); flex-direction: row-reverse;` に切り替え (勇者の左下に近づく)
  → 2 番目以降の slot に negative margin-right + translateY で **斜め階段配置** (hinoka 右端、riefa/serina が左下に少しずつ降りる隊形)
- ユーザー指示「氷の妖精が私の氷やってみるわって言った後に、一回カゲロウに水色の魔法を飛ばしてください、ダメージは通らない感じで」
  → `_playMagicAffinityDemo` に **`launchMagicProjectile('ice', { onImpact: → ice-noeffect フラッシュ })`** を挿入。HP は変動せず青光フラッシュのみ。投射 + 着弾を 1500ms 待ってからセリナの「ど…どうして…！？」へ進む
- ユーザー指摘「ヒノカが喋っているときに日の香が出てこなくて、ただのボケた背景しか映ってない」
  → `_hideBustups` の 650ms 後の portrait 一括削除タイマーが、直後に `_showBustup` で差し替えた新しい portrait を巻き添えで消していた競合を修正。タイマーで削除する対象を **`.bustup-portrait:not(.visible)`** に限定し、`_showBustup` が再付与した新 portrait は生き残るように
- ユーザー指示「連続技の文字を入力するときにボックスの中央合わせにして」
  → `.chant-ritual-canvas-wrap > div` を `display: flex; align-items: center; justify-content: center;` に。HanziWriter が `size = min(rect.width, rect.height)` で正方形 SVG を作るため wrap が縦長 (60vw × 72vh) のとき左上寄りになっていた問題を解消

**v278g 3 件追補 (2026-04-26):**
- ユーザー指摘「フル画面から戻った時の文字をなぞるキャンバスが位置がずれております」
  → `battle-fullscreen-active` 時の `.canvas-container` を `display:none` → **`visibility:hidden + pointer-events:none`** に変更。flex slot を保持し、class が剥がれた瞬間に layout reflow なしで正位置に復帰。`combo-phase-active` 側は連続技後に戻らないので display:none を維持
- ユーザー指摘「ヒノカの素材は相変わらず古いもので…また大きすぎます。基本的には妖精なので人よりも小さい設定に。あと 2 人の妖精が入るのでサイズを少なくとも半分くらいにしないと入らない」
  → 旧 `pixy_fire/forest/ice.png` から **新 `Hinoka/hinoka_001.png`, `Riefa/riefa_001.png`, `Serina/serina_001.png` (Apr 25 新素材)** に差し替え
  → `.party-fairy-sprite` 幅を `clamp(36px,8.5vw,56px)` → **`clamp(20px,4.8vw,32px)`** (約 55% 縮小)、スロット幅も `clamp(28,6.5vw,44)` に縮小し 3 妖精分の横並びを確保
  → `image-rendering: pixelated` → `auto` に (新素材は手描き調)
- ユーザー指摘「バストショット…メッセージボックスで隠れてしまう…画面に対する専用面積が大きすぎる…ギリギリ全身が入るぐらい…かげろう…頭半分が切れて…顔が入るように」
  → `.bustup-portrait` を `bottom: 0; height: 96%; object-fit: cover` → **`bottom: 22%; height: 72%; object-fit: contain`** に変更
  → メッセージ box (画面下) より上に足元が来るよう 22vh 持ち上げ、`contain` で全身常時表示 (頭切れ解消)
  → `scale 1.5x` を廃止 (頭が切れる原因) — alt 別 `object-position` 調整 (カゲロウ専用 `top left` 等) も不要に

**v278b フロー再構築 (2026-04-25): canonical 6 ターン構造の完成形**

実装範囲:
- `_rowPracticeNextChar` の step==2 トリガを撤去 → わ→を→ん の 3 ターンを素直に進める
- `_playWaRowEpisode` 末尾を `_playKagerouClimax` → `_playKagerouClimaxMain` に切替 (Beat 0 重複回避)
- `_playKagerouFinalCombo` を **Phase B-E オーケストレータ** に拡張:
  - **Phase B1**: 「ひらがな かんせい！れんぞくわざ かいほう！」バナー (`_showHiraganaCompleteBanner` 抽出)
  - **Phase B2**: `_showFairyMergeIntro` (リーファ + セリナ joined → ゲージ出現)
  - **Phase B3**: `_playMagicAffinityDemo` 新設 (氷無効 → 正義の炎、Beat 0 を独立関数化)
  - **Phase B4**: `_showChantRitual ['ほ','の','お']` 連続技 → カゲロウ HP 半減 (12→6)
  - **Phase B5**: `_showChantRitual ['ひ','の','た','ま']` 連続技 → カゲロウ HP 残り 1
  - **Phase C1**: `_playKagerouHpRecoveryDespair` 新設 — 紫闇フラッシュ + rage attack + HP 全回復 (12) + 絶望セリフ
  - **Phase C2**: `_playFairiesKnockedOut` 新設 — Riefa+Serina HP→0 (ゲージ消滅+取消線) + 倒れセリフ
  - **Phase D**: 既存 `_playWaRowEpisode` 呼び出し (= 訴え + 回想 + Beat 1〜5、ヒノカ重傷含む)
  - **Phase E1**: プロンプト「よげんの ちから が…」「真名を よびかけよう！」
  - **Phase E2**: `_showChantRitual ['か','げ','ろ','う']` finisher (shoutout「カゲロウ！」)
  - **Phase E3**: `_crackKagerouMask` + `battle_last_02` → onDone → `battleVictory`
- HP 数値はストーリー駆動 (各フェーズで `_battle.hp` を明示セット → `_renderEnemyNameColor()` で名前色更新)

**v278a 新機能 (2026-04-25): 妖精パーティー HP ゲージ + 敵 HP の名前色化**

実装範囲 (Phase B 第 1 弾、フロー再構築は v278b で別途):
- `_battle.fairies` に `{hinoka, riefa, serina}` の `{hp, maxHp, joined, alive}` 構造を追加
- `.fairy-status` DOM (battle-stage 内、hero-status 直下) に 3 妖精分のゲージ row を新設。各 row は data-fairy で識別、勇者ゲージより小型 (高さ 5px、min-width 85-118px)
- `_initFairyHp(enemy)`: バトル開始時にリセット。volcano_lord 戦のみ起動し、開幕は **ヒノカのみ joined** (ゲージ表示)
- `_addFairyToParty(key)`: key='riefa'|'serina' を joined にしてゲージ出現。`_showFairyMergeIntro` 冒頭で両方呼ばれる
- `_damageFairy(key, amount)`: HP 減算 + ゲージ更新。HP <= 25% で `.critical` (赤点滅)、<= 50% で `.low` (黄)、0 で `.dead` + row に `.fallen` (取消線+灰)
- `battleHitEnemy` の通常攻撃時 (= わ・を・ん turns): volcano_lord 戦なら `_damageFairy('hinoka', 1)` で累積被弾
- `_hinokaFallEffect` (= Beat 3-4 ヒノカ重傷) で `_damageFairy('hinoka', 99)` 実質 HP→0 → ゲージ消滅+取消線
- `_renderEnemyNameColor()`: `_battle.hp/maxHp` から `.enemy-name` に `data-hp-state="ok|hurt|critical|dying"` 属性を立てる
  - ok=白 / hurt=黄 / critical=赤+点滅 / dying=暗赤
- volcano_lord 戦のみ `.hp-bar-wrap` と `.pentagram-charge` を `display:none` で撤去 → **敵は名前色のみで残 HP 表現** (DQ 風)
- battleStage に `data-enemy-id` を伝播させて CSS から `.battle-stage[data-enemy-id="volcano_lord"]` で個別制御

**v278b で対応予定** (フロー再構築):
- 連続技「ほのお」(turn 4) / 「ひのたま」(turn 5) の追加
- 回想シーン+climax beats の位置を canonical 通りに移動 (現状はまだ ん の前)
- HP 全回復絶望シーン + 妖精やられる演出
- 真名「かげろう」を真の finisher にする

**v277m 微修正 (2026-04-25):**
- bustup スケール 0.7 → **1.15** (ユーザー指示「両方とも 115% ぐらいで」)
- カゲロウ bustup の右側カット問題: width 46% → 56%、object-position を top left → top center に変更し、横長画像 (591×478) の体の右側まで見えるようにする

**v277l 修正 (2026-04-25) — v277k で誤適用したサイズ/位置を是正 + hook v2 強化:**
- v277k で「バトル画面の 70% / 下げる」指示を **celebration row + 通常戦闘カゲロウ enemy** に誤適用していた → revert
  - celebration row: `margin-top:18vh→6vh`, height `clamp(112,22vh,182)→clamp(160,32vh,260)` に戻す
  - volcano-lord-wrap: `top:65%→50%` (元のバトル位置) に戻す
- 正しい修正対象は **bustup portrait (会話シーンの立ち絵)** だった:
  - `.bustup-portrait[alt="ヒノカ"]` と `.bustup-portrait[alt="カゲロウ"]` に scale(0.7) + bottom:-8% (transform-origin: bottom center) を追加
  - これでバストショット (ヒノカ「私の友達なの…」、カゲロウ「よそ者め…」等のセリフシーン) が 70% に縮小し、画面下方に沈み込んで顔が縦中央付近に来る
- `scripts/docs_review_hook.py` を **v1 (reminder) → v2 (block-on-mismatch)** に強化:
  - PostToolUse で「コード編集」と「docs 編集」を別々のセッションログに記録
  - Stop 時、コード編集ありで docs 編集 0 件なら **必ず block** + 編集ファイル一覧を提示
  - skip-once エスケープハッチ (`touch .claude/.docs-skip-once`) で物語影響なし宣言可

**v277k 修正 (2026-04-25) — ユーザーのまとめスクショに合わせた一括是正:**
- **山道 / カゲロウ登場 caption** を battle-log と同じフォーマットに統一: フォント Hiragino + size clamp(0.9-1.15rem) + weight 900 + letter-spacing 0.04em + line-height 1.4、背景 `#020208` + 上枠 `var(--window-border)`、画面**最下部**に貼り付け (bottom:0 全幅帯)
- caption box の**タップヒントを右下に固定** (バトル画面と同じ位置パターン)
- **カゲロウ登場 caption から「カゲロウ」名を撤去** — 「やみ に つつまれた、 おそろしい けもの が たちはだかった。」(まだ正体不明の段階)
- **celebration 妖精サイズ 70%** (height: clamp(160,32vh,260) → clamp(112,22vh,182)) + **row margin-top 6vh → 18vh で下げ**
- **バトル画面カゲロウ位置 top:50% → 65%** で下方シフト → スプライトの顔がちょうど画面縦中央 50% 付近に来る
- **妖精合流 (`_showFairyMergeIntro`) の発火位置を移動** — イントロ (バトル前) → `_playKagerouFinalCombo` 内 (れんぞくわざバナー後、prompt 前)。ユーザー指定の正しい順番:
  1. わ → を → ん (3 turns nazori、ヒノカ累積被弾)
  2. ん 完了 = ひらがな完成 → れんぞくわざ かいほう！ バナー
  3. **妖精合流** (リーファ + セリナ「ゆうしゃさま！やっと おいついた わ！」)
  4. プロンプト「カゲロウ の ほんとう の なまえ を、よびかけよう！」
  5. 連続技なぞり「かげろう」
  6. 仮面割れ → battleVictory
- 合流ダイアログを「ヒノカも ぼろぼろ ね」「カゲロウ は とても つよい——でも、 みんな で たちむかえば！」スタイルに刷新
- 残存「『かざんの うた』を、おもいだして！」を「『ほむらの うた』を、おもいだして！」に修正 (v277f で見落とし)

**v277j 修正 (2026-04-25):**
- v277i の bow セリフ変更を **revert** (旧: 「…ヒノカ… ゆうしゃ よ、 ありがとう…。」に戻す)
- 代わりに `_startPurificationSequence` 内の `_showSpiritThanksBubble` 呼び出しを **volcano_lord (カゲロウ) のときだけ skip** するよう変更。これでカゲロウのバトル画面に「…ありがとう」吹き出しが浮かなくなる。他の妖精 (リーファ等) は従来通り表示
- 連続技解放バナーの読み「れんぞくぎ」→「**れんぞくわざ**」(連続技 = renzoku-waza、漢字で「技」は音読みでなく訓読みの「わざ」採用)

**v277i 追加 (2026-04-25):**
- **finisher を「ん」→「かげろう」に再構成** (ユーザー繰り返し指摘) — Climax 本編は星の印 awakening で終わり、その後通常の「ん」なぞり (regular hit、ただし数字上の最終 HP→0 トリガー) → 直後に `_playKagerouFinalCombo()` が起動:
  1. 「ひらがな かんせい！れんぞくぎ かいほう！」バナー (1.6s) + Web Audio チャイム
  2. プロンプト「よげん の ちから が、ゆうしゃ の ゆび に やどる…」「カゲロウ の ほんとう の なまえ を、よびかけよう！」
  3. `_showChantRitual ['か','げ','ろ','う']` (連続技 = finisher 入力、starmark theme + shoutout「カゲロウ！」)
  4. `_crackKagerouMask` (仮面割れ)
  5. `battle_last_02` (浄化遷移シーン)
  6. → `battleVictory` で bow + leave + ascending + celebration
- カゲロウの bow セリフから「ありがとう」削除 (ユーザー指示「最後、バトル画面でカゲロウにありがとうって言わせるのはやめて」)
  - 旧: 「…ヒノカ… ゆうしゃ よ、 ありがとう…。」
  - 新: 「…ヒノカ… ゆうしゃ よ……。」
  - 感謝は celebration overlay 内の専用シーケンスで充分表現済み
- celebration overlay の妖精画像を高解像度版に差し替え (旧 `pixy_*.png` チビ pixel art → 新 `Hinoka/hinoka_001.png` 等のバストアップ portrait)。height ベースで揃える
- celebration の `grantSword` モーダル (宝箱モーダル) 表示中、妖精 + キャプションを一時 `display:none` → モーダル閉じたら復元 (ユーザー指示「宝箱が出てきたときに妖精は消えて。後ろに宝箱が隠れて開けられない」)

**v277h 追加 (2026-04-25):**
- **妖精合流シーンを「山道直後」→「カゲロウ初撃 + ヒノカ被弾の直後」に移動** (ユーザー繰り返し指摘の対応)。`_showFairyMergeIntro` を `_playHinokaRecognitionIntro` の onDone から呼び、バトル開始前ではなく**ヒノカが攻撃された後**に妖精が駆けつける文脈に変更
- 合流ダイアログを「やっと、おいついた」→「ヒノカ……！ だいじょうぶ……！？」「もり と ほこら の ふういん が とけて、 あなた を おいかけて きた の。」「ゆうしゃさま——わたし たち も、 ちから を かす わ！」に書き換え (ヒノカ被弾を見ての反応)
- **「を」完了直後にヒノカ軽傷の mini-cut を新設** (`_playWaMidHitCut` + `_hinokaMidHitEffect`)。step 2 で `_playWaRowEpisode` 直前に挟む。カゲロウ「グ……まだ おわらん……！」→ ヒノカ「きゃっ……！うっ……」軽傷フォール → ヒノカ「だいじょうぶ……！まだ、 たたかえる……！」の 3 ビート
- 軽傷ヒノカエフェクトは重傷版 (`_hinokaFallEffect`) と差別化: brightness 0.85 (vs 0.7) / 寿命 1.6s (vs 5s) / フラッシュ duration 0.35s (vs 0.6s)
- フラグを 2 段に分割 (`_waMidHitCutPlayed` + `_waRowEpisodePlayed`) — それぞれ完了時にのみ true 化、retry 時はバトル init で両方リセット (review 指摘の対応)
- `_triggerKagerouRageAttack` を cancellable timer 化 (mini-cut → climax の連続呼び出しでの class restore レース回避)
- バトル init で `hinoka-midhit` data-role の残留掃除を追加

**v277g 追加 (2026-04-25):**
- カゲロウ撃破 + 妖精達の歓喜 (`_showVolcanoCelebration`) の直後に **ノクス勝利後の不敵な笑み** (`_showNokusVictoryTaunt`) を挿入。`nokus_smirk.jpg` をフル画面表示し、内蔵ダイアログバーで「…ふっ。 なかなか おもしろい。」「だが、 おわり では ない。 まおうじょう で、 まって いる ぞ。」と語らせる。カタカナ編 (魔王城) への布石、ノクスがラスボスでないことの暗示
- ノクス再呪印 (`_showMaskedManInterference`) のセリフに「**ザガン さま の のろい は**、 そんな もの で、 ほどけぬ ぞ」と明示的に**ザガンの名前を出し**、ノクスはあくまでザガンの下っ端であることを 5 歳児にも分かる形で示す

**v277f リネーム (2026-04-25):**
- 「火山の歌」→「**ほむらのうた**」(古今和歌集の「ほむら」=焔の古語) に改名。意味は同じだが響きが特別に
- Beat 1 セリフ「カゲロウ『…ほのお…？』」→「カゲロウ『…ほむら…？ きいた こと が ある… むかし、 だれか と…』」
- Ritual 1 chant `chars: ['か','ざ','ん']` → `['ほ','む','ら']` (3 字維持)
- ヒノカ promo「いっしょ に、 『ほむらの うた』を…！」
- 完了後カゲロウ「…ほ… むら…？ それ は… むかし わたし が、 まもって いた…？」
- 場所名としての「火山」(かざんのいただき / 火山の主) は変更なし、楽曲名と歌の核ワードのみ「ほむら」に置換

**v277e 修正 (2026-04-25):**
- ノクス登場画像を `nokus_reappear.jpg` に差し替え (旧 `kagerou_recurse.jpg` は別シーン用に温存)
- ノクスのセリフを「…て こずって いる ようだな。」「だが、 そんな もので のろい は、 ほどけぬ ぞ。」へ刷新
- ヒノカ認識セリフ「あいぼう」→「ともだち」に変更 (5 歳児向けの語彙統一)
- 妖精合流シーン + ノクス登場 のダイアログバーを `.battle-log-line` と同じフォントメトリクス (font-size clamp(0.9-1.15rem) / weight 900 / letter-spacing 0.04em / line-height 1.4) + 同じ枠 (`#020208` bg + `var(--window-border)` 枠) に統一
- バトル中のカゲロウ位置を top:28% → 50% に変更し、頭切れ + ゲージ干渉の両方を回避
- カゲロウのみ `filter: none` で `.grounded` の drop-shadow を解除 (画像内にすでに紫グロウがあって二重に光っていたため)

**v277d 追加 (2026-04-25):**
- 山道 → カゲロウ登場 の間に **妖精合流シーン** (`_showFairyMergeIntro`) を挿入。リーファ + セリナ の高解像度バストアップ + 「ゆうしゃさま——やっと、おいついた わ！」「もり と ほこら から、ずっと…」「カゲロウ は つよい。わたし たち も、ちから を かす わ！」の 3 ダイアログ
- ノクス登場 (`_showMaskedManInterference`) のセリフを overlay 内蔵ダイアログバーに変更 (旧: 外部 battle-log で full-screen 画像に隠れていた)
- ~~カゲロウのバストアップ (`alt="カゲロウ"`) は CSS `object-position: top left` で顔切れ防止 (kagerou_atk_1 は顔が画像左寄りのため)~~ → **v278g で `object-fit: contain` に変更したため alt 別の object-position 調整は不要 (常時全身が収まる)**
- ヒノカのバストアップ画像をユーザー支給の高解像度版 (`Hinoka_001/002/003.png` 911×1422) に差し替え
- リーファ / セリナ の高解像度バストアップを `assets/images/characters/pixies/{Riefa,Serina}/` 配下に新設
- **Beat 0 追加** (Phase B 第 1 弾): セリナ「わたしの こおり、 やって みる…！」→ 効かない (`.ice-noeffect` 青フラッシュ) → ヒノカ「あの ほのお は、 やみ の のろい…」→ 「私の ほのお で やる わ！」→ 通る (`.damaged` + `screen-heavy-shake`) → 「みんな、 ちから を あわせよう！」→ Beat 1 (既存カゲロウ覚醒) へ。`_playKagerouClimax` を Beat 0 (魔法相性デモ) と `_playKagerouClimaxMain` (Beat 1〜5) に分割

**視覚 (v277c で再修正):**
- **BGM**: 山道シーン開始時に `setBgmFor('volcano_boss')` で `ashen_guardian.mp3` に切替。以降カゲロウ最終戦終了まで継続
- **山道** (`volcano_path_intro.jpg`): `_showClimaxEventImage(src, fn, { cover:true, pan:'up', caption:'...' })`
  - 画面いっぱい (`object-fit:cover`、`height:116vh`)、translate Y -8% → +8% を 10s linear で**下から上に縦パン** (見上げていくイメージ)
  - 下部に半透明バー + ナレーションテロップ「ゆうしゃ は、 かざん の いただき を めざし、 けわしい やまみち を のぼって いった——」
- **カゲロウ登場** (`kagerou_entrance.jpg`): `_showClimaxEventImage(src, fn, { cover:true, kenBurns:true, caption:'...' })`
  - 画面いっぱい (`height:100vh`、`translate(-50%,-50%)` 固定)、scale 1.0 → 1.08 を 8s ease-out で**中央ズーム** (translate アニメは無し → 「斜めパン」感を排除)
  - ナレーション「そこ に は—— のろわれた かざん の ぬし、 カゲロウ が、 たち はだかって いた。」
- **カゲロウ登場 onDone** で battleStage を reveal (display='', `body.battle-intro-active` を外す)
  - 通常フローはカーテン演出 (`_showBattleEncounterIntro`) で reveal するが、火山ボス分岐ではカーテンを skip しているため手動 reveal
- **認識セリフ中**: battle stage に勇者 + カゲロウが配置された通常戦闘画面 + ヒノカ右バストアップ
- **急襲時**: `_triggerKagerouRageAttack()` で敵スプライトに紫フィルタ + 激しい左右振動 + `.battle-stage` 強シェイク

**ナラティブ前提:** ヒノカ は ら行の溶岩で救出されるまでの**数日間 ザガン の魔力の鎖で幽閉されていた**。その間に カゲロウ が呪縛された事実は知らない。火山頂上で初対面の際に、**気配**で「もしかして…?」と気づく。

### Phase A: ヒノカ認識セリフ (4 ビート、タップ送り)

**v277b 改訂 (2026-04-25):** バトル開始直後に発火する文脈に合わせ、旧 H_R_1「…まって、ゆうしゃさま！」(制止セリフ) を撤去。「きはい」→「けはい」(気配) 誤字修正。残りは 4 ビートに圧縮。

**H_R_1:**
> ヒノカ「この けはい…！
>  どこか で
>  かんじた…？」

**H_R_2:**
> ヒノカ「まさか、
>  カゲロウ、 なの…？」

**H_R_3:**
> ヒノカ「わたし が ちいさい ころ から
>  ずっと いっしょ だった、
>  たいせつな あいぼう なの…！」

**H_R_4:**
> ヒノカ「カゲロウ！
>  わたし だよ、 ヒノカ だよ！
>  わかる でしょう？」

### Phase B: カゲロウ急襲 (2 ビート)

**視覚:** `_triggerKagerouRageAttack()` 発火で敵スプライトが紫脈動 + 画面シェイク (7 回)。

**K_R_1:**
> カゲロウ「ゴゴゴ……！
>  よそ もの め……！」

**H_R_6:**
> ヒノカ「…そんな！
>  あの やさしかった カゲロウ が…！」

→ 通常の「もじを なぞって たおそう！」操作説明を経て戦闘開始。

### 意図

- ヒノカ の「数日間幽閉されていた」時系列と整合性を取る (呪縛を知らない)
- 気づき → 関係説明 → 呼びかけ → **期待を裏切る急襲** の緩急で、単なる敵ではなく「とりもどすべき友」だと player に体感させる
- 「カゲロウ じゃ ない、 カゲロウ の すがた を した なにか」という二重構造を会話で提示

### 旧実装 (v268) からの変更点

旧: `VOLCANO_EPISODE_SCENES` の 4 ビート紙芝居で「カゲロウとヒノカは昔からの相棒、ザガンの呪縛で引き裂かれた」を**全部先出し**していた → player も ヒノカ も **知っている体** になっていた。

新: ヒノカ の知らない前提に合わせて紙芝居撤去。初対面の認識シーンで「誰が誰なのか、何が起きているのか」を会話で展開。回想 4 枚 (v270) は戦闘中盤で ヒノカ が カゲロウ を思い出させるために使う、という順序で再配置。

---

## イベント: ②  わ行バトル BATTLE_ENEMIES 設定（v268、v272 で pronoun 修正）

**敵データ** (writing/index.html 内 `BATTLE_ENEMIES['わ']`):
- `id: 'volcano_lord'`、`name: 'かざんのぬし'`、`trueName: 'カゲロウ'`
- `hp: 12`、`element: 'fire'`、`boss: true`、`reward: 'sword'` (たいようの つるぎ)
- `cleansedHome: 'かざん の いただき'`
- `grounded: true` (床に接地)

### カゲロウの言葉遣い (v272 ユーザー指示)

- **一人称: 「わたし」** (旧「おれ」から統一)。p1 は呪縛下で無人格のため pronoun 不要 (「ゴゴゴ…」等)。p2 以降の覚醒ゾーンで 1 人称が要る場合は「わたし」を使う。
- **勇者への二人称: 「そなた」** (火山の主らしい威厳ある古風な語彙、v272b)
- **ヒノカへの呼びかけ: 「ヒノカ」固有名 または 「おまえ」** (幼なじみ間の親密さ — p3 の「まさか、 おまえ、 なのか…」はヒノカへ)

### 3 相ダイアログ (taunts 構造、HP 帯で切替)

**p1 (HP 100-67%):** 攻撃的・呪縛下 (人格が剥がれている)
```
ゴゴゴ…
もえつきろ！
ようがんの ちから！
くらえ…！
```

**p2 (HP 66-34%):** 揺らぎ (ヒノカの歌声に反応しかけている)
```
…その こえ は…
どこ か で きいた きが する…
だれ だ… おまえ は…
```

**p3 (HP <34%):** 覚醒の気配（真名が漏れ出す）
```
…ヒノカ…？
まさか、 おまえ、 なのか…
…わたし は… かざん の…
```

**bow (仮面割れ直後):**
> …ヒノカ… ゆうしゃ よ、 ありがとう…。

**leave (上昇しながら):**
> わたし は、 ほんとう の すがた に もどれた。

### 意図

- p1 は呪縛下の「敵」像を崩さない（勝利感保持）
- p2 でヒノカの存在を忘れかけているが思い出しそうな揺らぎを出す
- p3 で真名「ヒノカ」が漏れ、覚醒の予兆を示す
- bow / leave で呪縛解除後の本来の温かい人格を見せる

---

## イベント: ③  ヒノカ『ほむらのうた』呼びかけ + 回想フラッシュバック（v270、v272 で簡素化、v277f で「かざんのうた」→「ほむらのうた」リネーム）

**発動タイミング:** わ行バトル中、**2 文字目（を）**を書き終えた直後 (`_rowPracticeStep === 2`)。フラグ `_waRowEpisodePlayed` でバトル中 1 回のみ発動。
**実装関数:** `_playWaRowEpisode(onDone)` — 呼びかけ導入 → `_showMemoryFlashback` → 歌の呼びかけ の 3 段構造。
**意味づけ:** バトル直前の Phase B (急襲) で「呼びかけても届かなかった」→ ここは**二度目のチャレンジ**。今度は歌で思い出させる。

### Phase A: 呼びかけ導入 (v272 で認識セリフ削除、1 ビートに簡素化)

**H_E_1:**
> ヒノカ「ゆうしゃさま、 もう いちど…！
>  カゲロウ を とりもどせる
>  はず なの…！」

### Phase B: メモリフラッシュバック（`_showMemoryFlashback`）

フルスクリーン sepia overlay で 4 枚の思い出画像を順にフェード表示。タップで次の画像、最終画像タップで閉じる。

**配列 `VOLCANO_MEMORY_IMAGES`（感情アーク順）:**
1. `memory_01.jpg` — 仲良し
2. `memory_02.jpg` — 絆
3. `memory_04.jpg` — 一緒に歌う（「ほむらのうた」の核イメージ）
4. `memory_03.jpg` — 呪いで引き離される（悲劇）

**並び順の意図:** 歌 (希望) → 悲劇 (喪失) の順で落差を作り、直後の「ほむらのうた を おもいだして！」セリフに感情の勢いを乗せる。

**視覚仕様:**
- 背景: `radial-gradient` 暗褐色 (焚き火的トーン)
- 画像: sepia 0.25、brightness 1.08、drop-shadow オレンジ系
- 下部: 「▼ タップ」ヒント（1.4s でブリンク）

### Phase C: 歌の呼びかけ

**H_C_1:**
> ヒノカ「カゲロウ！
>  わたし の こえ が、
>  きこえる でしょう？」

**H_C_2:**
> ヒノカ「むかし、 いっしょ に うたった
>  『ほむらの うた』を、
>  おもいだして！」

→ そのまま `_playKagerouClimax` に繋がる（v271 で分岐追加）。

### 意図

- v272 変更以降、バトル直前に認識セリフはすでに出ている → ここは**再挑戦**ビートとして再定義
- 「回想 → 歌」の順で情緒を積み上げ、歌の呼びかけで敵 HP 減ではなく「心を揺さぶる」表現に集中
- 回想画像は原則 PIL 変換で JPG 化 (1600幅, quality 85) し `assets/images/characters/kagerou/` に配置
- タップ送りで子供が自分のペースで読める

---

## イベント: ④  わ行バトル『ラスボス カゲロウ戦』 — Canonical Spec

> ⚠️ **重要 (2026-04-25 v278 リライト):** 本セクションは **「ユーザー指定の正しい設計」** を canonical として記述。実装は v278 系で進行中、各ビートに **実装状況マーカー** ([✅DONE] / [✅DONE] / [✅DONE]) を付ける。**過去の v277 系 change-log は最新フローと合わない箇所があるため参考程度に**。Claude は実装時に必ず本セクションの canonical spec に従うこと。

### 全体フロー (canonical、6 なぞりターン構成)

| # | アクション | 種別 | ターン | 実装状況 |
|---|----------|------|-------|---------|
| 1 | **わ なぞり** (剣) | 通常技 | 1 | [✅DONE] カゲロウ反撃 → ヒノカに 1 ダメージ |
| 2 | **を なぞり** (剣) | 通常技 | 2 | [✅DONE] カゲロウ反撃 → ヒノカに 2 ダメージ |
| 3 | **ん なぞり** (剣) | 通常技 | 3 | [✅DONE] ひらがな完全制覇！反撃でヒノカ瀕死 |
| — | **れんぞくわざ かいほう！ バナー** | 紙芝居 | 0 | [✅DONE] `_playKagerouFinalCombo` Step 1 (※位置は最終 finisher 直前ではなく **ここ** に移動が必要) |
| — | **妖精合流** (`_showFairyMergeIntro`) | 紙芝居 | 0 | [✅DONE] 現状は final combo 内。**ここ (連続技 ほのお の前) に移動が必要** |
| 4 | **連続技「ほのお」** (3字、ヒノカ正義の炎) | 連続技 | 4 | [✅DONE] 全員攻撃でカゲロウを追い詰める。HP 50% → 25% へ削る |
| 5 | **連続技「ひのたま」** (4字) | 連続技 | 5 | [✅DONE] もう一押し → カゲロウ HP ほぼ 0 (10% 程度に残す) |
| — | **カゲロウ HP 全回復** (闇の力で逆転、絶望演出) | 紙芝居 | 0 | [✅DONE] enemy 名前色が 紫闇に変色しつつ HP 戻る |
| — | **妖精たち反撃で吹き飛ばされる** (リーファ + セリナ 倒れる) | 紙芝居 | 0 | [✅DONE] 2 妖精の HP→0、bustup フォール |
| — | **回想シーン** (`_showMemoryFlashback`、4 枚絵) | 紙芝居 | 0 | [✅DONE] 既存実装あり、**位置を ここ (HP 全回復+妖精やられた後) に移動が必要** (現状はもっと早く発火) |
| — | カゲロウ覚醒の兆し「…ほむら…？」(Beat 1) | 紙芝居 | 0 | [✅DONE] `_playKagerouClimaxMain` Beat 1。位置移動必要 |
| — | **Ritual 1 「ほむら」** (3字、思い出しの儀式) | 連続技風 chant | 0 | [✅DONE] `_showChantRitual` awakening theme。位置調整が必要 |
| — | カゲロウ「…ほ…むら…？」思い出しかけ dialog | 紙芝居 | 0 | [✅DONE] |
| — | **ノクス再登場 + 再呪印** (`_showMaskedManInterference`) | 紙芝居 | 0 | [✅DONE] 「ザガンさまの のろい は…」 |
| — | カゲロウ激昂 + **ヒノカ重傷** (`_hinokaFallEffect`、Beat 3-4) | 紙芝居 | 0 | [✅DONE] ヒノカ HP→0、フォール演出 |
| — | ヒノカ最後の託し「星の印 を…」 | 紙芝居 | 0 | [✅DONE] 弱々しいセリフ |
| — | **星の印発動** (`_showStarMarkAwakening`、預言+星の印) | 紙芝居 | 0 | [✅DONE] |
| — | プロンプト「よげん の ちから が…」「カゲロウ の ほんとう の なまえ を、よびかけよう！」 | 紙芝居 | 0 | [✅DONE] `_playKagerouFinalCombo` Step 2 |
| 6 | **真名「かげろう」** (4字、`_showChantRitual` starmark + shoutout) | 連続技 = finisher | 6 | [✅DONE] |
| — | 仮面割れ (`_crackKagerouMask`) | 紙芝居 | 0 | [✅DONE] |
| — | `battle_last_02.jpg` (浄化遷移シーン) | 紙芝居 | 0 | [✅DONE] |
| — | → `battleVictory('fire', _chainReward)` → bow + leave + celebration | — | [✅DONE] |

### 実装の差分サマリ (v278 で着手すべき作業)

**主要なズレ** (canonical vs 現状コード):
1. **連続技「ほのお」「ひのたま」が未実装** — 現状コードは ん の直後に即 finisher (かげろう) へ進む。2 ターンの combo phase が抜けている
2. **回想シーン+覚醒兆し+ノクス+Beat 3-4+星の印 の位置が早すぎる** — 現状コードは を と ん の間で発火しているが、canonical だと ほのお+ひのたま の後 (HP 全回復・妖精やられの直後) に来る
3. **HP 全回復絶望シーン未実装** — 連続技で削ったあと、闇の力で HP 戻すドラマが無い
4. **妖精合流の位置** — 現状コードは final combo の Step 1.5。canonical だと 連続技の前 (ほのお の前) に配置

### HP ゲージシステム (canonical、v278 新設)

**ユーザー指示 (2026-04-25):**
- **敵 HP ゲージ撤去** → 名前のみ表示。残 HP は **名前の色で表現** (DQ 風):
  - 100-66%: 白
  - 66-33%: 黄
  - 33-1%: 赤
  - 0% / 撃破: 暗赤 + 灰
- **勇者 HP ゲージ** + **ヒノカ HP ゲージ** を battle 開幕から表示。妖精ゲージは勇者より小さく
- **リーファ + セリナの HP ゲージ**: **妖精合流タイミング** (連続技 ほのお の前) で出現。3 妖精分が並ぶ
- **ヒノカ HP** はわ・を・ん の反撃で削れていき、**ん 完了時に瀕死**。連続技の最中も低 HP 維持。 Beat 3-4 (climax 中) で 0 → フォール演出
- **リーファ + セリナ HP** は連続技で消費 → HP 全回復後の反撃で 0 → 倒れる演出
- **やられそう表現**: HP 低時にゲージ赤点滅 + ヒノカアイコン点滅

### Beat 0 (魔法相性デモ) の扱い [⚠️設計再考必要]

v277d で実装した「セリナ氷無効 → ヒノカ正義の炎が通る」演出は、現状は climax 開始時に発火する。canonical では:
- 「氷が効かない」演出は **連続技フェーズ (turn 4 ほのお) の前に短く挟む** か、**最初の通常攻撃時にセリナがちょっと顔を出して試す** 形で再配置
- ヒノカが「正義の炎」専用属性であることを示すのが目的

→ v278 で再配置場所を確定する。

### 旧 v277 系 change-log (参考、最新フローと一致しない箇所あり)

以下は v277b〜v277m の change-log。各バージョンで部分的に手を入れたが、フロー全体構造の修正は v278 で初めて完成する。



### Beat 0 — 魔法相性デモ (v277d 新設)

セリナ「わたしの こおり、 やって みる わ…！」→ `.ice-noeffect` 青フラッシュ → 効かず → セリナ「ど…どうして…！？ カゲロウ は ほのお タイプ なのに、 わたしの こおり が… とけ ちゃう！」→ ヒノカ「あの ほのお は、 ザガン が しこんだ やみ の のろい なの…！」「わたしの ほのお で やる わ！」「ごめんね、 カゲロウ…！」→ `.damaged` + `screen-heavy-shake` → 通る → セリナ「すごい…！カゲロウ が ひるんだ わ！」ヒノカ「みんな、 ちから を あわせよう！」→ Beat 1 へ。

### Beat 1 — カゲロウ一瞬覚醒 (v277f で「ほのお」→「ほむら」)

**視覚:** `_pulseKagerouAwaken()` — `.kagerou-awaken-pulse` 1.6s 金光パルス + imgRoar swap (1.5s)

**セリフ:**
> カゲロウ「…ほむら…？
>  きいた こと が ある…
>  むかし、 だれか と…」

### Ritual 1 — 『ほむらのうた』(v277 新設、v277f で「かざん」→「ほむら」)

**前置き:** ヒノカ bustup right、「ヒノカ「ゆうしゃさま！ いっしょ に、 『ほむらの うた』を…！」」

**実装:** `_showChantRitual({ chars: ['ほ','む','ら'], theme: 'awakening', heading: 'おもいだして…', subtext: 'カゲロウ と いっしょ に\nうたった、 ほむら の うた…' })`

**UI:** awakening theme overlay (温色 sepia 背景、温オレンジストローク)。3 文字を順に表示、各完了で黄金グロウ + 進捗ドット点灯。leniency 1.6 / 永久リトライ / スキップ不可。

**完了後:** カゲロウ「…ほ… むら…？ それ は… むかし わたし が、 まもって いた…？」(bustup right)

### Beat 2 — ノクス再呪印 (v277e で `kagerou_recurse.jpg` → `nokus_reappear.jpg` 差し替え)

**視覚:** `_showMaskedManInterference(onDone)` — `nokus_reappear.jpg` を full-screen overlay 表示。内蔵ダイアログバー (battle-log と同フォーマット、z-index 内蔵で full-screen 画像で隠れない、v277d)。

**名前の扱い (v276b):** 設定上の真名は **ノクス** だが、ひらがな編では名乗らない。話者タグは「かめんのおとこ」のまま。

**セリフ (v277e+g):**
> かめんのおとこ「…て こずって
>  いる ようだな。」
>
> かめんのおとこ「だが、 ザガン さま の のろい は、
>  そんな もの で、 ほどけぬ ぞ。」

「ザガン さま」を明示することで「ノクスは下っ端、ラスボスはザガン」を 5 歳児にも伝える。

### Beat 3 — カゲロウ再呪縛 → 激昂攻撃

`_triggerKagerouRageAttack()` (v277h で cancellable timer 化):
- `.kagerou-rage` 0.45s × 3 回 + `imgRage` swap
- `.screen-heavy-shake` 0.12s × 7 回

**セリフ:**
> カゲロウ「グ……グオォオオ……！」
> ヒノカ「きゃっ……！うっ……」(onEnter で `_hinokaFallEffect()` 発動)

### Beat 4 — ヒノカ被弾・倒れる演出 (v277 で「真名呼びかけ」誘導に書き換え)

**`_hinokaFallEffect()`:**
- 黄→赤ラジアルフラッシュ (0.6s `hinokaHitFlash`)
- `HINOKA_SPRITES['003']` (= `hinoka_003.png`、v277d で更新) を左下 (left:34% / bottom:8%、width:11%) に表示、1.4s の `hinokaFall` アニメで回転落下
- 5 秒後 DOM 削除

**セリフ:**
> ヒノカ「ゆうしゃさま… ごめん なさい…」
> ヒノカ「ほし の しるし の ちから で… カゲロウ の ほんとう の なまえ を、 よんで…」

### Beat 5 — 勇者の星の印発動

`_showStarMarkAwakening(onDone)` — フル画面金光オーバーレイ。中央に巨大な `✦` (clamp 10-22rem、金色多層グロウ + `starMarkPulse` 2s 脈動)。

**キャプション 2 段:**
1. 「ゆうしゃ の ひたい に、ほし の しるし が かがやき はじめた——」
2. (2.4s 後切替)「いにしえ の よげん——『ほし の しるし を もつ もの、まおう を うちやぶる』」

**完了後:** **クライマックス interlude はここで終了** (v277i で旧 Beat 5.5 + 5.6 を `_playKagerouFinalCombo` に分離)。`_rowPracticeNextChar_continue` 経由で「ん」の通常 nazori UI へ。

---

### `_playKagerouFinalCombo` (v277i+k 新設、火山ボス専用 finisher 連続技)

**発火:** ん 完了 → finisher 分岐 (writing/index.html:13130 付近) → `_isVolcanoBoss` の場合のみ `_playKagerouFinalCombo` 経由で battleVictory。

**Step 1: れんぞくわざ かいほう！ バナー** (1.6s)
- 「ひらがな かんせい！」(clamp 1.4-2.2rem、Zen Maru Gothic、黄色多層グロウ)
- 「れんぞくわざ かいほう！」(clamp 1.6-2.6rem、同色サブ)
- Web Audio チャイム 4 音 (659/784/988/1319Hz)

**Step 1.5: 妖精合流** `_showFairyMergeIntro` (v277h 新設、v277k でこの位置に移動)
- リーファ + セリナ の高解像度バストアップが画面左右に駆けつけるように出現
- ダイアログ 3 ビート:
  > リーファ「ゆうしゃさま！ やっと おいついた わ！」
  > セリナ「ヒノカ も ぼろぼろ ね… わたし たち も、 ちから を あわせる わ！」
  > リーファ「カゲロウ は とても つよい—— でも、 みんな で たちむかえば！」

**Step 2: プロンプト**
> よげん の ちから が、 ゆうしゃ の ゆび に やどる ——
> カゲロウ の ほんとう の なまえ を、 **よびかけよう！** (`dmg-line` 黄色ハイライト)

**Step 3: 連続技 = 真名なぞり**
- `_showChantRitual({ chars: ['か','げ','ろ','う'], theme: 'starmark', heading: 'なまえ を よびかけよう！', subtext: 'ほし の しるし の ちから で、\nのろい を やぶる…', shoutout: 'カゲロウ！' })`
- starmark theme overlay (黄金 + 紫闇)、4 文字、各完了で星マーク風グロウ
- 全文字完了で「**カゲロウ！**」ビッグテキスト (clamp 2.5-5rem) が 1.4s パルス + 完了 SE
- ★ **これが finisher 入力**

**Step 4: 仮面割れ** `_crackKagerouMask` (1.0s)
- `.kagerou-mask-crack` keyframes で白フラッシュ + 微振動 (translateX -4 → 4 → -3 → 2)
- Web Audio 0.3s ノイズバースト (仮面割れる音)

**Step 5: 浄化遷移** `_showClimaxEventImage('battle_last_02.jpg')` 1 枚絵

**完了後:** `battleVictory('fire', _chainReward)` → 通常勝利フロー (bow + leave + ascending) → `_showVolcanoCelebration` → `_showNokusVictoryTaunt` (v277g) → ENDING_SCENES

### 意図

- 「ん」を単独 finisher にせず、**「ひらがな完成 → 連続技解放 → 真名で finisher」** の 3 段ピーク構造でラスボス感を演出 (v277i+k、ユーザー指示)
- **妖精合流タイミング**: バトル前ではなく「ヒノカ瀕死 → ひらがな完成 → 連続技解放」のテンション最高点で駆けつけることで「カゲロウ は つよい——でも みんな で」のセリフが文脈に合う
- ノクスのセリフで「**ザガン さま**」を明示し、ノクス=下っ端 / ザガン=ラスボス の構図を 5 歳児に伝える (カタカナ編 = 魔王城戦への布石)
- 「ほむら」(火山の歌の核ワード) を Ritual 1 で書かせ、「かげろう」(真名) を Ritual 2 で書かせる二段呪文で**プレイヤー自身が言霊を発する操作感**を作る

---

## イベント: ⑤  Celebration『3 妖精の集結 + カゲロウによる太陽の剣受け渡し』（v271、v272 で剣受け渡し統合）

**発動タイミング:** わ行バトル victory → bow/leave ダイアログ完了 → `_chainReward` → 即 `_afterVictory`。`_battle.enemy.id === 'volcano_lord'` 分岐で **generic grantGear+banner を skip** し、celebration 内で剣を渡す。
**実装関数:** `_showVolcanoCelebration(onDone)`。

### 視覚仕様

- フルスクリーン朝焼けオーバーレイ (`radial-gradient` 黄金→橙→褐色)
- 妖精 3 体を横一列に配置（**森→火→氷**の順、中央がヒノカ）:
  - リーファ (`Riefa/riefa_001.png`、緑グロウ) ※ v278g で旧 pixy_forest.png から差し替え
  - ヒノカ (`Hinoka/hinoka_001.png`、橙グロウ、中央) ※ v278g で旧 pixy_fire.png から差し替え
  - セリナ (`Serina/serina_001.png`、水色グロウ) ※ v278g で旧 pixy_ice.png から差し替え
- 各妖精の下にひらがな名ラベル
- 下部キャプション欄（0.6s フェードでセリフ切替）
- 「▼ タップ」ヒント（ブリンク）

### 妖精登場タイミング

| タイミング | 登場 |
|---|---|
| overlay フェードイン + 0.45s | ヒノカ (中央、最初から) |
| msg 2 (「ちから の かぎり…」) | リーファ (左) フェードイン |
| msg 3 (リーファセリフ) | セリナ (右) フェードイン |

### セリフ（全 10 メッセージ、タップで送る）

**前半: 再会**
1. カゲロウ「ヒノカ……！ ぶじ か！？」
2. ヒノカ「カゲロウ……。 ちから の かぎり、 おもい を とどけて くれた のね……」 *(この時リーファ登場)*
3. リーファ「もり から、 ずっと あなた たち を おうえん して いた わ」 *(この時セリナ登場)*
4. セリナ「ほこら から かけつけた わ。 みんな ぶじ で よかった」
5. ヒノカ「ゆうしゃさま、 ほし の しるし の ちから で、 カゲロウ を すくって くれて ありがとう」

**後半: カゲロウ による 太陽の剣 受け渡し (v272 新規、v272b で きみ→そなた)**

カゲロウ の 勇者への二人称は **「そなた」** (威厳ある火山の主らしい古風な語彙)。ヒノカ 等 身近な存在には「おまえ」等のまま。

6. カゲロウ「ゆうしゃ よ……」
7. カゲロウ「そなた が いて くれた から、 わたし は めを さまし、 ヒノカ と また あえた。」
8. カゲロウ「この 『たいよう の つるぎ』 を、 そなた に あずけたい。 この かざん の ほのお を うつした、 わたし の たからもの だ。」
   → **タップすると `grantGear('sword')` モーダルが挟まる** (剣ビジュアル + 入手演出)
9. カゲロウ「まおうじょう で、 おひめさま を たすけだす ちから に なって くれ。」
10. 3 にん の ようせい と ゆうしゃ、 そして カゲロウ は、 あさひ の なか で かたく てを とりあった。

### grantGear('sword') 統合

メッセージ 8 の `grantSword: true` フラグで、タップ進行時に `grantGear('sword', onDone)` を挟む:
- 既存の剣入手モーダル（太陽の剣ビジュアル + SE）が overlay の上に重なって表示
- モーダル閉じたあと celebration メッセージ 9 に自然復帰
- 旧 v271 実装の `_showActClearBanner('かざんを こえた！', 'つるぎを てに いれた')` は **skip** (カゲロウの肉声が語るのでバナー不要)

### 意図

- 旅を通じて救出した 3 妖精（リーファ / セリナ / ヒノカ）+ 覚醒したカゲロウを一堂に会させてひらがな編を締める
- 太陽の剣が「偶然入手した武器」ではなく「**カゲロウからの託された想い**」になり、カタカナ編 (魔王城) での武器使用に感情的重みが乗る
- generic な「〇〇を てに いれた！」バナーを避け、物語と武器取得を不可分にする
- E1 の焚き火 3 妖精画と連続するトーンで、ED への感情連続性を作る

---

## イベント: ⑥  ENDING_SCENES トリガ（v268 で ら行→わ行 へ移動、v271 で celebration 後に統合）

**発動タイミング:** `_showVolcanoCelebration` の onDone 時。
**実装関数:** `_triggerHiraganaEndingIfNeeded(onDone)`。

### 判定ロジック

```
1. localStorage['pono_ending_seen'] === '1' なら → 即 onDone (スキップ)
2. 未視聴なら:
   a. ENDING_SCENES を copy (immutable)
   b. {{THANKYOU}} を window.getThankYou() の数字で置換
   c. _showStoryboard(scenes, ...) で再生
   d. 終了後 localStorage['pono_ending_seen'] = '1'
   e. onDone
```

### 重複定義との関係

ほぼ同一の判定ロジックが `_rowPracticeComplete` 側（clearModal の button click）にもあるが、**バトル経由の完了では clearModal 自体をスキップする**ため、そちらは実質的にパズル/非バトル経路専用。バトル経路では必ず celebration → `_triggerHiraganaEndingIfNeeded` を通る。

### 意図

- ら行 (v1 設計) で ED を出すと「まだカゲロウ戦が残っている」違和感があった → v268 で「物語の完結 = わ行クリア」に変更
- celebration の直後に流すことで、ED E1 の「3 妖精と焚き火」シーンが celebration の朝焼けから自然に夜の焚き火へ繋がる

---

## イベント: 氷の妖精・鍵の受け渡し（な行 最終文字クリア直後、v267 で移動）

**発動タイミング:** な行 riddle パズルの finisher（5文字目）完了直後。祠扉の動画 → 牢屋シーン → 妖精救出（`_rescueFairy('shrine', ...)`）→ **鍵受け渡しダイアログ** の流れ。

**経緯:** 旧実装では炎の妖精（ら行 lava_step）が鍵を渡していたが、docs 設計メモ（2026-04-24）通り「鍵は能力一致の氷の妖精（祠）が持つ」に code を合わせた (v267, 2026-04-24)。

**ロケーション:** 祠救出オーバーレイ (`#fairyRescueOverlay`) 上で氷の妖精が中央に立つ。鍵は氷の水晶から放たれて妖精の上に浮かぶ。

**背景設定（語られる前提）:**
- 氷の妖精はかつて魔王城に潜入し、**門番から魔王城の鍵を奪った**
- 帰途で**魔王の手下たち**に捕まり、**ザガンの封印**で祠に閉じ込められていた
- 鍵は **小さくして、自分の「氷の首飾り」の中に閉じ込めて隠した**。手下には普通の首飾りにしか見えず、見つからなかった（氷魔法の能力で金属を小さく凝結できる設定）
- 救出後、首飾りを砕いて鍵を勇者に託す → 「溶岩の奥にも仲間がいる」と炎の妖精救出を促す → カタカナ編（魔王城突入）への布石

**セリフ（_rescueFairy の shrine 分岐で実装）:**

初回 rescue メッセージ（FAIRY_META.shrine.msg）:
```
こおりの ようせい「たすけて くれて ありがとう！」
```

続けて鍵受け渡し 5 メッセージ (2026-04-24 ユーザー指示で凝縮):
```
1. こおりの ようせい「わたし、まおうじょう に しのびこんで、
   もんばん から かぎ を ぬすんで きた の！」

2. こおりの ようせい「でも、かえりみち に
   てしたたち に つかまって しまって…」

3. こおりの ようせい「でも、とっさに この くびかざり に
   とじこめた から みつからなかった わ。」
   （※このタイミングで氷の首飾りが砕けて鍵が現れる演出）

4. こおりの ようせい「この かぎ で
   おひめさま を たすけて！」

5. こおりの ようせい「わたし も てつだう わ！」
```

**演出メモ:**
- 3番目のセリフ表示タイミング (`keyRevealAt=2`) で `🔑` エモジを救出ステージにポップイン + sparkle SE
- グロー色は青〜水色（氷の首飾りから出てきたイメージ、`drop-shadow #7ad2ff / #4fc3f7`）
- 鍵は 4〜5 のセリフ中も表示し続け、「この鍵で」「手伝うわ」と視覚同期
- 最後のセリフ完了後、鍵はフェードアウト → 妖精の leaving アニメ → overlay close → `_riddleAdvance()`

## イベント: 炎の妖精との合流（ら行 最終文字クリア直後、v267 改訂）

**発動タイミング:** ら行 lava_step パズルの finisher 完了直後、既存の `_fireFairyFarewell(advance)` 呼び出しで発火。

**v267 変更:**
- 魔王城の鍵受け渡しは氷の妖精に移管（撤去）
- 炎の妖精は「仲間として旅に同行」する設定（ED E1 で焚き火を囲む世界観）なので、「ようがんに かえる」等の帰宅表現は廃止
- 「魔力の鎖で繋がれていた理由」を A案 (火山の魂・噴火を拒否) で明確化

**背景設定（語られる前提）:**
- 炎の妖精は **火山の魂**。火山が暴れないよう、いつも抑えている存在
- **ザガンの手下** が「**火山を噴火させて ふもとの村を焼け**」と命じた
- 彼女は拒否 → 手下たちが魔力の鎖で溶岩の底に幽閉
- （ザガン本人は魔王城に籠り、手下を動かして国を荒らす構図。OP S4b「かめんを つけた まじん」と整合）
- 幽閉されても彼女の意志が火山を完全には暴れさせなかった（S5c_c の村荒廃は心を奪う呪縛によるもので、火山噴火は抑えられていた）
- 氷の妖精（鍵を盗んだ罪）との対照: 盗賊型 vs 拒絶型

**セリフ（2026-04-24 ユーザー指示で簡素化、前版 8 メッセージ → 4 メッセージ）:**
```
1. ほのおの ようせい「ゆうしゃさま、
   たすけて くれて ありがとう！」

2. ほのおの ようせい「ザガン の てした に、
   かざん を ふんか させろ と いわれた の。」

3. ほのおの ようせい「でも わたし が こばんだ から、
   つかまって しまって…」

4. ほのおの ようせい「さあ、みんなで
   おひめさま を たすけに いこう！」
```

最後のセリフ完了後、妖精がフェードアウト → `advance()` → エンディング紙芝居（E1 で 3 妖精と合流）。

---

## 実装メモ

### 共通仕様

- DOM: 全画面オーバーレイ（z-index 1800、バトルログより上）
- タップで次のシーン／最終シーンでタップすると閉じて次のフローへ
- 画像はユーザーが後で生成・差し替え。暫定は背景グラデ＋絵文字で実装可
- 文字は 5 歳向け → 漢字なし、全ひらがな＋濁音のみ

### 発動条件

| 項目 | オープニング | エンディング |
|------|------|------|
| トリガー | 初回起動（localStorage `pono_intro_seen` なし） | ら行クリア + 炎の妖精お別れ完了後 |
| スキップ | 2回目以降は自動スキップ（タイトルに「おはなしを みる」ボタンから再生可） | 一度見たら再表示なし（ご褒美画面から再生可？） |
| BGM | 穏やか → 緊迫 → 決意 の3段階 or 通しで1曲 | 夜のキャンプ（静かな曲） |

### 未確定事項（ユーザー確認待ち）

- [ ] お姫様の名前（現状は「おうじょさま」固定）
- [ ] オープニング2回目以降の再生ボタン設置場所（タイトル画面？ 設定？）
- [ ] エンディング BGM 素材の有無
- [ ] 画像サイズ・解像度仕様（横長？ 縦長？ 既存マップ同等？）
