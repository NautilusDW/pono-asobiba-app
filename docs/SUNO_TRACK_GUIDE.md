# 🎵 SUNO で寝かしつけアプリ 3 曲を作るガイド

SoundDraw と並走する SUNO 側の運用手順書。 SUNO は 「歌もの / 展開もの」 が主戦場のため、 本アプリの loop-optimized BGM 用途では **[instrumental] 明示 + no crescendo / no cadence / no clear ending / no beat drop の四重否定** で 「終わらない」 テイクを引き出すのが必須。 SoundDraw との違い、 判定基準、 reroll 分岐、 3 通りの代替 prompt を曲ごとに掲載。

## 事前準備

- SUNO **Pro プラン $10/月 (年払 $8)** に登録 (商用可 / v5.5 アクセス / WAV 書き出し可 / Free の MP3 128kbps は launch 品質に足りない)
  - 注: 素材評価目的で Free の v5 を試すのは可、 ただし launch 用素材は必ず Pro 契約後に生成し直す (Free は商用不可)
- 出力先ローカルフォルダ: `docs/audio/suno_raw/` を用意
- Custom Mode を使用 (Simple Mode は style prompt を無視するため NG)
- モデル: **v5 または v5.5** (v4.5 でも生成可だが loop 精度は v5 系が上、 v5.5 は Pro 限定)
- 528Hz drone 合成は Web Audio API 側 (batch:940 の loop engine) で後段実施 → SUNO 素の wav を単体でアプリに埋めない前提で ToS 上 「派生物」 扱いにする

## 全曲共通の設定ルール (絶対に守る)

- **Custom Mode に切り替え** (Simple では style prompt が反映されない)
- **Instrumental トグル: ON** (style prompt 側の `[instrumental]` と二重で明示)
- **Lyrics 欄: 空欄** (何か入れると v5 は歌わせようとする、 `(instrumental)` すら入れない)
- **Length: 最大 8 分を指定** (v4.5 / v5 / v5.5 とも Free 含め到達可、 短尺で切って Extend を回すより一発 8 分の方が tonal drift 少)
- **Style prompt: 200 文字以内** (超過は silent truncate、 末尾の否定語が落ちて crescendo が復活する事故が多い)
- **タイトル欄: 楽曲コンセプトを英語で** (日本語タイトルは v5 の generator を混乱させ vocal 想起を招く)
- **Style prompt 内の禁則ワード**: `song` / `track` / `chorus` / `verse` / `intro` / `outro` (楽曲構造語は展開を呼ぶ) / `epic` / `climax` / `build up` / `release` (crescendo を呼ぶ) / `singer` / `vocalist` (vocal を呼ぶ)
- **loop 化の四重否定**: `no crescendo, no cadence, no clear ending, no beat drop` は 3 曲全てに必須 (どれか 1 個抜くと最後 15 秒で fade or 終止が発生し crossfade 不能)
- **528Hz drone との beat 回避基準**: SoundDraw と同じ。 B4 (494Hz) 〜 C#5 (554Hz) の帯域に 3 秒以上 sustain する音が乗ったテイクは棄却
- **未改変配信禁止** → 必ずアプリで 528Hz drone layer + crossfade を追加して派生物化してから配信 (SUNO Pro 商用ライセンス準拠)

---

## 曲 1: もりのこもりうた (童謡的子守唄)

### SUNO title 欄

```
Forest Lullaby - Moonlit Cradle
```

### Style prompt (197 chars)

```
[instrumental] seamless loop lullaby, music box ostinato, harp arpeggio cycle, celesta, sustained pad, D dorian, no vocals, no drums, no crescendo, no cadence, no clear ending, no beat drop, hushed
```

### 設計意図

`ostinato (同じ短いフレーズを反復し続ける音楽用語)` と `arpeggio (和音を 1 音ずつバラして連続演奏する形) cycle` で 「循環している」 ことを明示し、 v5 が曲構造を組み立てに行くのを抑制。 `D dorian (dorian / aeolian は西洋音階のモード種類、 minor に近いが響きが違う)` は Key の強制指定 (SUNO は key 指定を 6-7 割の確率で尊重、 拒否時は転調してくる)。 `hushed` は音量ダイナミクスの上限を暗示。 vocal 抑制のため `[instrumental]` + `no vocals` の二重明示。

### 生成のコツ

Custom Mode で instrumental トグル ON + Lyrics 空欄 + Style prompt をそのまま貼り、 Length 8 分、 モデル v5 (or v5.5)。 タイトルは英語必須 (「もりのこもりうた」 と入れると v5 が民謡歌唱を試みる事故報告あり)。 **1 回の生成で 2 バリエーション出る**ので、 両方視聴して素直な方を採用。

### 判定基準

**OK (全部満たす)**
- Music box / Celesta の高域が主旋律として鳴っている
- Pad が持続していて空白なし
- vocals / drums / bass が完全無音 (SUNO はたまに breath sample を挟むので要確認)
- 8 分間で 4-5 回同じ旋律モチーフが循環
- **B4〜C#5 に 3 秒以上 sustain する音がない**
- 終盤 30 秒でフェード or 終止していない
- Key が D 系 (D dorian / D minor / D major、 SUNO は dorian を minor に寄せがち、 III が長 3 度なら OK)

**reroll 必須 (どれか 1 つ)**
- Vocal (choir / breath / humming) 混入
- Drums / Kick / Shaker 混入
- 途中で BPM や key が転調
- 終盤 15-30 秒で明確に fade out or 終止
- Cinematic strings 主体になって music box 要素ゼロ
- C5 sustain が pad で頻発

### reroll 調整ポイント

| 症状 | 対処 (次の生成で style prompt を差し替え) |
|---|---|
| Vocal 混入 | `[instrumental]` を prompt 冒頭で反復 → `[instrumental] [no vocals] [no lyrics]` |
| Drums 混入 | `no drums` → `no drums, no percussion, no shaker, no kick` |
| 終盤に fade / 終止 | `no clear ending` → `no clear ending, no fade out, no final chord, endless loop` |
| Key が転調 | `D dorian` → `D dorian throughout, single key, no modulation` |
| Music box が出ない | `music box ostinato` を prompt 最前列に移動、 `harp arpeggio cycle` を削除して集中させる |

### 代替 Style prompt 3 通り

**Alt-1: Toy Piano 主体版 (v5 が Music Box を出さない時の逃げ)**
```
[instrumental] seamless loop lullaby, toy piano melody cycle, glockenspiel accents, warm pad drone, D dorian, no vocals no drums no bass, no crescendo, no cadence, no clear ending, no beat drop, gentle
```

**Alt-2: Harp 主体 + minimalist 版 (音数を削って drone 寄りに寄せる)**
```
[instrumental] endless lullaby loop, harp arpeggio ostinato, felt piano sparse notes, subtle celesta, D aeolian, hushed dynamics, no vocals, no percussion, no crescendo, no cadence, no clear ending
```

**Alt-3: 童謡感強化版 (SoundDraw Kids 相当を SUNO で狙う)**
```
[instrumental] children lullaby seamless loop, music box nursery melody, celesta, xylophone, soft pad, D major, no vocals no drums, no crescendo, no cadence, no clear ending, no beat drop, warm cradle
```

### SoundDraw との対比 (曲 1 のみ両方作って比較する前提)

| 観点 | SUNO (v5 + Rev. prompt) | SoundDraw (Kids ジャンル + Music Box) |
|---|---|---|
| **童謡感の跳ね** | ○ (Music Box + Toy Piano の当たり率高、 v5 系は旋律の 「歌わせ癖」 が跳ねを生む) | ◎ (Kids ジャンルは童謡ど真ん中、 Music Box プリセットが安定) |
| **loop 適性** | △ (Rev. prompt で 6-7 割 loop OK、 3-4 割は終止が残る) | ◎ (Structure タブで Ending セクション削除すれば確実に loop 化) |
| **Key 強制精度** | △ (D dorian 指定は 6-7 割尊重、 minor 寄りに転ぶ) | ◎ (Change Key で数値強制、 100% 反映) |
| **BPM 強制精度** | × (v5 は BPM 数値指定を明示的にサポートせず、 style prompt に `64 BPM` と書いても 60-72 の幅で揺れる) | ◎ (Change Tempo で数値固定) |
| **単発の長さ** | ◎ (8 分一発、 tonal drift 最小) | △ (5 分上限、 loop engine の crossfade で稼ぐ) |
| **生成コスト** | ◎ ($10/月、 商用 OK) | △ ($23.39/月、 stems 込みだが単価は倍以上) |
| **音色の意外性** | ◎ (v5 は 「予想外の良さ」 が出る、 童謡の情緒を凌駕するテイクが 5 回に 1 回) | × (Kids プリセット内の音色範囲を出ない、 良く言えば安定、 悪く言えば予定調和) |
| **reroll コスト** | ◎ (1 生成で 2 バリエ、 待ち時間 30-60 秒) | △ (1 生成 1 バリエ、 待ち時間 40-90 秒 + セクション再編集の手間) |
| **stems 書き出し** | × (SUNO はマスターのみ、 stems なし) | ◎ (5 レイヤー分離書き出し可) |
| **判定推奨** | 「意外性のある童謡」 が欲しければ SUNO | 「教科書的な童謡 + 後工程 mix 余地」 なら SoundDraw |

### 期待所要

**3-5 回生成想定**。 v5.5 なら 2-3 回で当たる可能性あり。 5 回失敗したら Alt-1 → Alt-2 → Alt-3 の順で prompt 切替、 それでも失敗したら SoundDraw Kids 版に一本化して SUNO 版は諦めて OK。

---

## 曲 2: もりの つきよ (環境音ドローン)

### SUNO title 欄

```
Moonlit Forest Night - Woodland Ambient
```

### Style prompt (194 chars)

```
[instrumental] seamless loop forest night, field recording, owl, crickets, sparse flute, celesta, D dorian drone, cyclical, no tempo, no crescendo, no cadence, no clear ending, no beat drop, ASMR
```

### 設計意図

`field recording` + `owl` + `crickets` で環境音の質感を呼び寄せ、 `D dorian drone` + `cyclical` で音楽的展開を封じる。 `no tempo` は SUNO への強い示唆 (実際には 40-50 BPM 相当で生成されるが、 リズム感を消せる)。 `ASMR` は音量ダイナミクスと近接感の指定。

### 生成のコツ

SUNO は `field recording` を 「lofi の効果音」 として解釈しがちなので、 lofi 系ドラムが混入したら即 reroll。 flute は 「遠くで一瞬鳴る」 が理想で、 melody line として立つと環境音の距離感が崩れる。 v5.5 の方が 「音楽にせず環境音のまま置く」 判断精度が高い。

### 判定基準

**OK**
- Owl / cricket / wind 系の環境音が主体
- Flute / celesta は距離感がある (前に出ていない)
- Drums / percussion / lofi beat が完全無音
- Key が D 系 (D dorian / D minor)
- **B4〜C#5 に 3 秒以上 sustain する音がない**
- 曲 1 の 8 分ラストからの crossfade で違和感なし

**reroll 必須**
- Lofi beat / hip-hop drums 混入 (SUNO の `field recording` 誤解釈)
- Flute が melody として前に出る
- 環境音が消えて Ambient pad だけの純音楽になる
- Owl の鳴き声が過剰でループ 3 周目でくどい (5 分に 1-2 回が理想)

### reroll 調整ポイント

| 症状 | 対処 |
|---|---|
| Lofi beat 混入 | `field recording` → `nature ambient field recording, no beat, no drums, no percussion` |
| Flute が前に出る | `sparse flute` → `distant flute, faint, background` |
| 環境音が消える | prompt 冒頭に `nature soundscape` を追加、 `owl` を `owl hoot at distance` に強化 |
| Owl がうるさい | `owl` → `occasional owl` |

### 代替 Style prompt 3 通り

**Alt-1: 純環境音寄せ (音楽要素を最小化)**
```
[instrumental] endless forest night soundscape, nature field recording, distant owl, crickets, gentle wind, faint celesta twinkle, D drone, no melody, no drums, no crescendo, no cadence, no clear ending
```

**Alt-2: Ambient pad 主体 + 環境音を薄く重ねる版**
```
[instrumental] seamless ambient loop, warm pad drone D dorian, subtle owl, crickets in distance, faint wind chime, no beat, no melody line, no vocals, no crescendo, no cadence, no clear ending, hushed
```

**Alt-3: Celtic 夜想曲寄せ (v5 が 「forest」 を fantasy 解釈する場合の対策)**
```
[instrumental] nocturnal forest loop, sustained pad, whispered flute, distant owl, night crickets, D aeolian drone, cyclical breathing, no drums no bass no vocals no crescendo no cadence no clear ending
```

### 期待所要

**2-4 回**。 3 曲中で最も当たり率が高い (drone / ambient は SUNO も得意)。

---

## 曲 3: ふくろうのおやすみ (アンビエントハープ)

### SUNO title 欄

```
Owl's Goodnight - Dreamy Harp
```

### Style prompt (198 chars)

```
[instrumental] seamless loop lullaby, harp perpetual arpeggio A aeolian, warm pad, celesta twinkle, wind chime, no drums no bass no vocals no crescendo no cadence no clear ending no beat drop, hushed
```

### 設計意図

`perpetual arpeggio (終わりのないアルペジオ = 曲構造を作らせないための強制語)` は SUNO に対して 「終わらないパターン」 を強く要求する語彙。 `A aeolian` は minor と等価だが響きの近代性を出すため aeolian 指定。 `wind chime` は空間の広がりと 「時間停止」 感を作る。

### 生成のコツ

**A aeolian (= A minor) と 528Hz drone の C5 唸り問題は SUNO 版でも発生**する。 SoundDraw 版と同じ判断が必要 → Web Audio 側の drone を 523.25Hz (純正 C5) に落とすか、 B♭ minor 版で再生成するか。 SUNO で B♭ aeolian に振り直す場合は Alt-1 を使用。

### 判定基準

**OK**
- Harp arpeggio が流れているが立ちすぎていない
- 終盤 30 秒がフェードアウトしすぎず音量が持続
- Key が A minor / A aeolian
- **Harp arpeggio の C5 音が 2 秒以上 sustain するテイクは棄却** (528Hz drone との唸り)
- 8 分間で harp パターンが 5-6 回循環
- Wind chime が心地よい間隔 (30-60 秒に 1 回程度、 過剰は NG)

**reroll 必須**
- Vocal / choir 混入
- Percussive 要素混入
- Harp が classical solo として弾き倒す (arpeggio ではなく melody 主体になる)
- 終盤に明確な final chord / fade out
- C5 sustain が harp で頻発

### reroll 調整ポイント

| 症状 | 対処 |
|---|---|
| Harp が classical solo 化 | `harp perpetual arpeggio` → `harp minimal arpeggio cycle, no solo, no melody line` |
| Vocal 混入 | `[instrumental]` を冒頭反復 + `no vocals no choir no humming` |
| 終盤 fade | `no clear ending` → `no clear ending, no fade out, endless, infinite loop` |
| C5 唸り | 528Hz drone を 523.25Hz に変更 (Web Audio 側) or Alt-1 の B♭ aeolian 版へ切替 |
| Wind chime が過剰 | `wind chime` → `occasional wind chime` |

### 代替 Style prompt 3 通り

**Alt-1: B♭ aeolian 移調版 (528Hz 唸り回避、 曲 2 D dorian からの接続 「長 3 度下」)**
```
[instrumental] seamless loop lullaby, harp perpetual arpeggio B-flat aeolian, warm pad, celesta twinkle, wind chime, no drums no bass no vocals no crescendo no cadence no clear ending, hushed
```

**Alt-2: Celtic 夜想曲寄せ (harp の質感強化)**
```
[instrumental] endless celtic lullaby loop, harp arpeggio pattern, soft strings pad, celesta, distant wind chime, A minor cycle, no drums no bass no vocals no crescendo no cadence no clear ending, dreamy
```

**Alt-3: Ambient pad 優位 + harp を装飾に (harp が主張しすぎる時の逃げ)**
```
[instrumental] seamless ambient loop, sustained warm pad A aeolian, sparse harp arpeggio accents, celesta twinkle, wind chime, no drums no bass no vocals no crescendo no cadence no clear ending, hushed
```

### 期待所要

**4-6 回**。 3 曲中で最も難易度高 (harp の主張抑制 + Key 判断 + 終止抑制の三重苦)。 SoundDraw 側の失敗時 fallback として位置付けるより、 SUNO 側でも同じくらいの reroll コストを見込む。

---

## SUNO で作った後の後工程

1. **書き出し前チェック**: 生成された 2 バリエのうち loop 適性が高い方を選定 / 終盤 30 秒でフェードや終止が発生していないか波形で確認
2. **WAV DL** (Pro 以上、 24bit/48kHz)。 MP3 128kbps (Free) は launch 品質に足りない
3. **配置**: `docs/audio/suno_raw/{song1|song2|song3}/` に master.wav で保存 (SUNO は stems 書き出し不可なので単一 wav)
4. **Extend の運用**: 8 分で足りない場合 (寝かしつけ用途で 15 分連続再生したい等) は Extend 機能で 2-4 分継ぎ足し可、 ただし **4-5 回目から tonal drift** (半音単位で調がずれる)。 3-4 回までに留め、 それ以上は crossfade loop 側で稼ぐ
5. **Claude に共有** → batch:940 の loop engine に 15/30/45 分 crossfade (8-15 秒 overlap) 設定で登録
6. **528Hz drone layer は Web Audio 側で常時継続** (曲間切り替わりで途切れないよう batch:940 実装済み前提)
7. **ライセンス note**: Pro 契約下で商用配信可 / 528Hz drone との mix で 「派生物化」 して未改変再配布禁止条項を回避 / Free プランの成果物は商用不可なので絶対に使わない

---

## user 判断待ちの点

1. **曲 1 は SoundDraw / SUNO どちらを本採用するか (最重要)**: 上記対比表を元に判断。 「教科書的な童謡 + 後工程 mix 余地」 なら SoundDraw、 「意外性のある童謡 + 単発 8 分の tonal 安定」 なら SUNO。 両方作って A/B 比較を launch までに 1 回実施推奨。
2. **曲 3 の Key 選択 (SoundDraw と共通判断)**: (a) A aeolian 維持 + Web Audio drone を 523.25Hz に変更 / (b) B♭ aeolian に半音移調 (Alt-1 使用) / (c) A + 528Hz のまま run し実機テスト。 レビュアーは (a) or (b) を強く推奨。
3. **モデル選択**: **Pro 契約下で** v5 vs v5.5 を A/B 比較 (v5 は速い、 v5.5 は loop 精度高)、 launch 素材は v5.5 で統一推奨
4. **Extend の使い方**: 8 分 × 1 発を crossfade loop に流すか、 8 分 + Extend 4 分 = 12 分単発を作るか。 tonal drift リスクと素材長のトレードオフ。
