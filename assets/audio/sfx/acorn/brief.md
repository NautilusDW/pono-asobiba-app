# Acorn Get Festive SE - 生成発注 brief

> **status**: AWAITING MANUAL GENERATION (Claude Code session で MCP 音声生成不可と判明、 ユーザー手動発注に委譲)
> **created**: 2026-06-28
> **target file**: `assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3`
> **deploy target**: develop-app → App staging (`pono-asobiba-app-staging.ndw.workers.dev`) で実機検証 → master

---

## 1. なぜ Claude Code で直接生成しなかったか

MCP `higgsfield_game.generate_audio` の tool description に以下の明示制約あり:

> This tool only generates speech: it cannot generate music or sound effects for general use, and there is no standalone music/SFX model here — decline general music or sound-effect requests rather than substituting a speech model. The models sonilo_music (music), mirelo_text_to_audio (sound effects) and inworld_text_to_speech (voice) exist ONLY for the game-generation pipeline and must not be used for standalone audio.

このため fal-ai / SUNO AI / 手動 DAW のいずれかに発注する必要がある。

CLAUDE.md スキル「`everything-claude-code:fal-ai-media`」が利用可能のため、 次セッションで fal.ai 経由 ThinkSound (video-to-audio) または CSM-1B 経由生成を試すのが妥当ルート。 SUNO 経路は `docs/SOUND_EFFECTS_GUIDE.md` 既存ガイドあり。

---

## 2. 音響仕様 (正本)

| 項目 | 値 |
| --- | --- |
| ファイル名 | `acorn_get_festive_20260628.mp3` |
| 長さ | 0.9 - 1.2 秒 (終端 150ms フェードアウト込み) |
| 形式 | MP3 ステレオ 128-192 kbps (44.1 kHz) |
| ピーク | -3 dBFS 以下 (子供向け再生機器でクリップ回避) |
| LUFS | -16 LUFS 程度 (既存 don.mp3 と同程度のラウドネス) |
| 終端 | フェードアウト必須 (ブツ切り禁止) |

### 音色構成 (時系列)

```
0.00s ── 0.20s : 「チラーン」 軽いベル/グロッケンの単音 (中高域 C5-E5 付近)
0.20s ── 0.55s : 「キラキラ」 サスティン付きハープシコード or 鉄琴アルペジオ上昇 (C major)
0.40s ── 0.80s : 控えめホルン 1音 (F4 付近、 ベルとオーバーラップ、 ふんわり)
0.55s ── 1.10s : シマー鈴のディケイ (高域 8-12 kHz の sparkle reverb tail)
1.00s ── 1.20s : フェードアウト
```

### 雰囲気キーワード

- 明るい、 祝祭、 童話絵本
- 攻撃的でない、 鋭くない、 突き刺さらない
- 子供 (3-7 歳) の耳に優しい高域カット (16 kHz 以上 -6 dB)
- 無音声 (ボーカル NG)
- 想像できる類例:
  - スーパーマリオ 「コイン」 + 「1up」 のミックス
  - どうぶつの森 アイテム取得 SE
  - ぷよぷよ 「キラリ」 ピース sparkle

---

## 3. 生成プロンプト (各サービス用)

### SUNO AI v5.5 One Shot モード (推奨)

```
Short cheerful game jingle, 1 second, light bell chime followed by sparkle and a soft brass note, kid-friendly, fairytale picture book mood, no vocals, gentle fade out
```

参考: `docs/SOUND_EFFECTS_GUIDE.md` の既存ガイド踏襲

### fal.ai (mmaudio / stable-audio-open)

```
festive bell chime sparkle and warm horn, 1 second, children's game reward sound, picture book magical fairytale mood, soft and warm, gentle fade out, no vocals
```

### ElevenLabs SFX (代替)

```
A cheerful 1-second game reward jingle: tiny bell chime, ascending sparkle, gentle horn touch, fairytale picture book vibe, kid-friendly, fade out
```

---

## 4. 配置 / 統合フロー (次セッションで実施)

### 4.1 ファイル配置

```
assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3
```

- 既存 `assets/audio/sfx/quiz/don.mp3` は **削除しない** (revert 用に保持)
- v2 以降の生成は `acorn_get_festive_YYYYMMDD.mp3` でタイムスタンプ更新

### 4.2 `common/acorn-audio.js` の DEFAULT_CONFIG 更新

```diff
  var DEFAULT_CONFIG = Object.freeze({
-   impact: 'assets/audio/sfx/quiz/don.mp3',
-   volume: 0.48
+   impact: 'assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3',
+   volume: 0.55
  });
```

- perfect state (満点・全クリ・全おかず正解) 時は呼び出し側で `play(gameId, { volume: 0.6 })` overrideで bump
- 一般状態は 0.55 (don.mp3 の 0.48 より少し前に出すが、 祝祭ジングルの方が中域うすいので耳痛くない想定)

### 4.3 sw.js CACHE_VERSION バンプ & precache 追加

- `CACHE_VERSION` を v1739 → v1740 (またはそのとき最新+1) にバンプ
- `CRITICAL_ASSETS_SCRIPTS` (または相当 precache list) に追加:
  ```
  'assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3',
  ```
- 既存 `assets/audio/sfx/quiz/don.mp3` の precache エントリは **保持** (fallback)

### 4.4 全ゲーム side の確認 (改修不要、 自動継承)

`acorn-modal.js` の `playSafe()` は `PonoAcornAudio.play(gameId)` を呼ぶだけで、 `gameId` 未登録なら DEFAULT_CONFIG を使う。 よって `common/acorn-audio.js` の DEFAULT_CONFIG を差し替えれば下記全ゲームに自動で新 SE が反映される:

- puzzle
- bento
- oto
- quizland
- maze
- undersea-cave
- starparodier

各ゲームで明示 `PonoAcornAudio.register(gameId, {...})` してる箇所のみは個別判断 (該当する場合は当該箇所も festive SE に差し替えるか、 ゲーム個性 SE を維持するか別 PR で決定)。

### 4.5 検証チェックリスト

- [ ] Chrome DevTools / Network で `acorn_get_festive_20260628.mp3` が 200 で配信される
- [ ] sw.js が新 CACHE_VERSION で activate、 旧 cache が purge
- [ ] App staging (`pono-asobiba-app-staging.ndw.workers.dev`) で puzzle クリア → acorn modal 表示時に新 SE が再生される
- [ ] iPad Safari (実機) で autoplay reject されない (acorn modal は user gesture 後発火なので OK 想定だが要確認)
- [ ] 既存 don.mp3 を呼ぶ箇所 (quiz の「ピンポン」 等) が壊れていない (don.mp3 ファイル自体は残存)
- [ ] perfect state 時 volume 0.6 bump が反映、 通常時 0.55 で過剰でない

---

## 5. 失敗時の rollback 手順

1. `common/acorn-audio.js` の DEFAULT_CONFIG を `quiz/don.mp3` / `0.48` に戻す
2. sw.js の CACHE_VERSION を再バンプ (キャッシュ強制更新)
3. push & deploy
4. acorn フォルダの新 mp3 はファイルとして残してよい (使われないだけ、 次の v2 試行で上書き)

---

## 6. 関連 memory / docs

- `memory/feature_play_splash_ad_zone.md` (acorn / 木製看板系の文脈)
- `docs/SOUND_EFFECTS_GUIDE.md` (SUNO ガイドの既存正本)
- `common/sw-update.js` (CACHE_VERSION バンプ後の toast UX、 既存仕様維持)

---

## 7. 次セッションへの引き継ぎ言葉 (テンプレ)

> 「acorn_get_festive_20260628.mp3 を fal.ai (mmaudio) または SUNO v5.5 で生成して、 `assets/audio/sfx/acorn/` に配置 → `common/acorn-audio.js` の DEFAULT_CONFIG を差し替え → sw.js CACHE_VERSION バンプ → develop-app push → App staging で実機検証お願いします。 brief は `assets/audio/sfx/acorn/brief.md` 参照」
