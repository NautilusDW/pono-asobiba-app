---
name: Quizland Opening Cinematic
description: 6-panel intro that plays after mode-select (before initGame). Ken Burns dolly + narration + **博士・ポノ・くるみ 3 キャラ会話** (sw v921+ でくるみ追加、 v922+ でクロスレビュー反映、 v923+ で kurumi 13 variants 管理機能 + Panel 2/5/6 variant 確定割当、 v924+ でクロスレビュー C HIGH 3 + MED 4 修正、 v925+ で editor 左ペインに Kurumi バリエーションサムネ追加 + シナリオ行 speaker に「くるみ」追加、 v926+ で editor `defaultScenario()` を本番 OP_PANELS と完全同期 (Panel 2/5 で kurumi line 追加 + Panel 6 で kurumiImg 注入)、 v927+ で editor `migrateScenario` の speaker='kurumi' 強制 hakase 化バグ修正 + `buildScenarioPanelsLiteral` の kurumi 2-way 判定バグ修正 + `kurumiFullPath` 新設で kurumiImg シリアライズ対応、 v929+ で editor scenario state に version 付き auto migration 実装 (`SCENARIO_DATA_VERSION` 定数 + loadScenario で version 不一致なら defaults 強制 + saveScenario で version 確実埋め込み) — 既存ユーザーも editor リロードだけで自動的に新 defaults へ移行、 DevTools 手動 reset 手順は不要に、 v930+ で editor 「くるみ側」 タブ切替 defensive 強化 (active class 即時更新 + state.kurumi 欠落時の自動 seed)、 v931+ で editor シナリオ dialogue 行に「ポノ」「はかせ」「くるみ」 の 3 dropdown 追加 (`appendCharImgSelect()` 共通ヘルパ + `HAKASE_VARIANTS` 定数 + `hakasePathByName` / `hakaseFullPath` ヘルパ新設 + `migrateScenario` で line.hakaseImg 空値正規化 + `buildScenarioPanelsLiteral` で hakaseImg シリアライズ追加 + SCENARIO_DATA_VERSION v927→v930 bump で auto migration 発火、 各 line で speaker と独立に 3 キャラの立ち絵 variant を編集可能、 runtime 側 hakaseImg 対応は HAKASE_VARIANTS が 1 種のみのため未実装 = 将来タスク)、 v932+ でローカル editor の kurumi 13 perVariant 位置調整 Export (`op-layout-2026-05-11-06-18-47.json`) を orchestrator 経由で `quizland/saved-layout.json` の `__op_layout.{B,C,D}.kurumi.perVariant` に merge、 220 keys 完全温存、 B の 13 variants が初期値から editor 編集後の実値に更新 (C/D は初期値温存、 D は `kurumi_001` のみ大きく上書き)、 「ローカル editor → AI 経由 publish → 全端末配信」 ワークフローが kurumi 全量で初めて成立、 v933+ で runtime kurumi CSS の per-VC `.op-char-slot` を `right: 0` 右端アンカーから `left: 50% + transform: translate(-50%, -50%)` 中央アンカーへ統一 (B/C/D 全 VC、 pono/hakase と同じ式)、 editor preview と runtime の transform 計算式が完全一致し、 v932 で焼き込んだ kurumi.perVariant slot 値がここで初めて runtime に「editor で見たまま」反映されるようになった (= saved-layout.json は無変更、 直したのは JSON の「解釈側」)、 v934+ ユーザー誤指定で同値再 export (`op-layout-2026-05-11-06-41-51.json`) を merge した実質無変更 publish (sw だけバンプ)、 v935+ 06-49-00 Export (`op-layout-2026-05-11-06-49-00.json`) を merge し VC C / D 側にも初めて hakase + kurumi の実値を publish (12 entries diff: B kurumi_clasp の slotH 354→320 / slotOffsetY 0→19 微調整、 C は hakase.slotOffsetX 0→-27 と kurumi.slotOffsetX 0→158 を実値化、 D は hakase.slotOffsetX -362→-142 と kurumi.slotH 489→413 / slotOffsetX 654→158 を実値化、 全 VC で hakase + kurumi の主要 slot を実値 publish する成熟段階に入った)、 v936+ 07-22-05 Export (`op-layout-2026-05-11-07-22-05.json`) を merge、 editor の「全ポーズに反映」 ボタン (前 task で実装、 同一 VC の perVariant 13 entries に同値を一括コピー) の初実用 publish が成立 (deep diff 70 entries 全て kurumi.perVariant のみ、 pono/hakase/singleBox/narration は差分ゼロ): B では 13 variants 全部の slotOffsetX=77 / slotOffsetY=19 統一 (22 entries)、 C では 12 variants の slotOffsetX 0→158 で kurumi_001 と完全一致 (12 entries)、 D では 12 variants で slotW 280→550 / slotH 380→413 / slotOffsetX 0→158 一括統一 (36 entries)。 「VC ごとに 1 variant を詰めたら 13 variants 全部に反映」 という新運用パターンが成立した配信成熟マイルストーン。 配信フローは [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md) で確定運用化、 「📡 配信」 ボタンは廃止扱い、 **v937+ (現行) — 仕様変更: 「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 を確定方針化、 OP_PANELS Panel 3 / 4 の各 line に `kurumiImg: kurumi_clasp.webp` を注入してくるみ立ち絵を Panel 2-6 全 5 panel 連続 visible に変更 (旧 v921-v936 は Panel 3-4 で kurumi 消失していた)、 op-layout-editor `defaultScenario()` も同期反映 + SCENARIO_DATA_VERSION v930→v937 bump で既存ユーザー auto migration、 同時に 07-31-53 Export merge で B kurumi の base box 微調整 (`B.kurumi.slotH` 320→303 + `B.kurumi.perVariant.kurumi_001.slotW` 280→227 / `slotH` 278→269 の 3 値のみ、 C/D は変更なし、 pono/hakase/singleBox/narration も差分ゼロ、 220 keys 完全温存)、 ポーズ並び Panel 2 hi → Panel 3 clasp → Panel 4 clasp → Panel 5 wink → Panel 6 clasp で確定**) + babble dialog + skip. くるみは Panel 2 で `kurumi_hi` (左手大きく挨拶) 初登場 → Panel 3 / 4 で `kurumi_clasp` (両手胸前) 立ち絵維持 (v937+ で追加) → Panel 5 で `kurumi_wink` (ウインク + こぶし) で「はーい、まかせて！」 → Panel 6 で `kurumi_clasp` (両手胸前で組む) を `kurumiImg` 注入で立ち絵 visible 維持しつつクイズ本編へ遷移 (Panel 2-6 全 5 panel ずっと visible、 ポーズだけシナリオに合わせて変化)、 babble は owl/pono/kurumi の 3 preset 切替。 **editor の「くるみ側」タブは「対話 (P2-6)」モードでのみ表示される仕様** (CSS line 661/667 で `is-narration` / `is-scenario` 時に tab-bar 全体が `display: none`、 元からの仕様で pono / hakase も同様)。 Codex prompt for missing panel art at tmp/quizland-op-cinematic/. tap-hint dynamic-follow + editor→runtime override (sw v890+) + saved-layout.json 経由の全端末配信 (B 経路、sw v892+)。 ナレーション音声を seg1 (OP_NA01.mp3) / seg2 (OP_NA02.mp3) で per-seg 分割再生 (sw v893+、v894+ で seg2 ファイル名のアンダースコアを撤去)。 v900+ で saved-layout.json に seed を直接書き込み、 editor 起動時に localStorage > seed > defaults の 3 段優先で初期化 + 「⟳ 復元」 + v902+ で 「💾 Export」 / 「📂 Import」 で origin 跨ぎ (ローカル ↔ staging) JSON 移植。 **v904+ (Q 案完成) で saved-layout.json の主キーを `__op_layout: { B, C, D }` (新) に拡張、 各 VC で `pono / hakase / singleBox / narration` 4 オブジェクトを per-VC で配信** — 旧 `__op_narration` は後方互換のため温存され、立ち絵+対話+ナレ全部を「📡 GitHub 配信」 1 操作で全端末反映できる。 **v905+ でポノ立ち絵に `perVariant` (6 ポーズ × 6 slot フィールド、 hakase 発話用 `pono_001` 含む) を配信、 dialogue line ごとに variant 名 (line.ponoImg → panel.ponoImg basename) を抽出して `perVariant[variantName]` を flat より優先で適用** — ポーズ切替時に slot 位置・サイズが追従。 **v906+ で editor ヘッダの 17 散在ボタンを 3 ドロップダウン (📥 Export ▾ / 📤 Import ▾ / 📡 配信 ▾) に集約、 配信ドロップダウンは staging origin (`pono-asobiba-staging.ndw.workers.dev`) のみ表示する allowlist 方式で、 ローカル開発 (file:// / localhost / 私有 IP / ::1) と production (`pono.kodama-no-mori.com`) では非表示** — production は GH_BRANCH='develop' hardcode の誤配信防止。 **v908+ で 4 つの即時バグ (赤文字 / 改行崩れ / 立ち絵消失 / race) を一括修正、 inline style を 「reset → set」 の対称パターンに統一 + 起動時に saved-layout.json を `cache: 'no-store'` で同期 fetch して LayoutSystem race を guard、 ハードリロードでも結果が安定**。 **v909+ でローカル editor を「編集 + Export 専用」に純化: ローカル origin (file:// / localhost / 私有 IP) で 📂 Import ドロップダウンを物理 DOM 非表示 (isServerOrigin allowlist) + 新ボタン 📋 「JSON のみクリップボード」 で `pono-op-layout-v1` schema を 1 クリックコピー、 ローカル編集 → AI チャット貼付け → orchestrator が saved-layout.json マージ + commit + auto push → staging 反映の片道フローを確立、 ローカル localStorage を外部 JSON で破壊する経路を物理消滅**。
type: project
---

# Quizland Opening Cinematic

**Status:** Implemented (2026-05-07) — staging
**Type:** Feature — UX / Storytelling

---

## Why

導入の物語性が弱く、子供向けにモード選択 → 即出題は唐突。森の家でフクロウ博士・ポノ・**アシスタントのリスのくるみちゃん**が「なぞなぞやろう」と顔合わせするワンシーンを挟むことで、世界観に入る前の助走を作る。スキップ可能なので飽きた周回ユーザーは1タップで本編へ。**くるみちゃん (sw v921+ 追加)** はクイズ本編で問題文を読み上げる役で、 OP では Panel 2 で初登場 → Panel 5 で博士から依頼を受け → Panel 6 でも立ち絵を維持したまま本編に遷移する流れで、 「読み手はくるみ」 という導入を視覚で済ませる。

## How to apply

- なぞなぞ系の演出/オープニング/フクロウ博士の台詞を改修するときは、まず本ファイルを参照して既存パネル構造とスキップ挙動を壊さないか確認する。
- パネル絵を差し替える場合は `tmp/quizland-op-cinematic/CODEX-PROMPT.md` の構図仕様に沿って Codex に依頼。`assets/images/quizland/OP/OP_panel_2.png` 〜 `OP_panel_6.png` を生成し、`OP_PANELS` 配列の `bg` を差し替える。
- Pono の声色を本格化する場合は `js/quizland-babble.js` の `pono` プリセットを `voice: true` 化（owl と同じ 2osc + BPF + LFO 経路）し、フォルマントを子供寄りに（u/a/e 中心、F1=900〜1300Hz）、`baseFreq` を 280〜340Hz に。

---

## Trigger Point

`quizland/index.html` の mode-btn ハンドラで `playOpeningCinematic()` → `playQuizStartCard()` → `initGame()` の async チェーン。タイトルタップ → モード選択 → **オープニング (6 パネル、 博士・ポノ・くるみの 3 キャラ会話)** → **タイトルカード (~2.2s)** → 出題開始 のフロー。

```js
document.querySelectorAll('.mode-btn').forEach(function(btn) {
  btn.addEventListener('click', async function() {
    selectedMode = btn.dataset.mode;
    document.getElementById('mode-screen').classList.add('hidden');
    try { await playOpeningCinematic(); } catch (e) { console.warn(e); }
    try { await playQuizStartCard();   } catch (e) { console.warn(e); }
    initGame();
  });
});
```

### Quiz Start Title Card (`playQuizStartCard`)

シネマ終了後 `initGame()` 直前に挿入する静止画タイトルカード。`assets/images/quizland/OP/quiz_start_card.webp` (フクロウ博士 + 「ふくろう博士の なぞなぞスタート!!」、410KB / 元 2711KB から 84.9% 削減) を 2.2s 表示してフェードアウト。タップで即スキップ可。

- HTML: `#quiz-start-card` overlay (z-index 310、シネマ z-index 300 より上)
- CSS: opacity フェードイン (0.35s) + transform: scale(0.92→1.0) のポップ
- JS: `_qscRunning` 再入ガード、`{ once: true }` タップリスナー + `finally` で removeEventListener、22×100ms ホールドループで `cancelled` ポーリング
- preload: タイトルタップ時の `__preloadList` に追加 (ウォーミング ~17s 余裕あり)

## ナレーション音声 per-seg 分割 (sw v893+)

panel 1 のナレーション音声を **seg1 / seg2 で別ファイル化**して per-seg 再生する設計に切替えた (2026-05-09)。

### Why

旧: 単一 `OP_NA.wav` (17.45s, seg1+seg2 連結) を panel-level `audio` で再生。タップ待ちで seg1 が止まっていてもナレ音声だけは seg2 まで言い切ってしまい、テキストと音声がズレるバグがあった。

新: `OP_NA01.mp3` (seg1) + `OP_NA02.mp3` (seg2) を `OP_PANELS[0].segments[i].audio` で **per-seg に格納**し、cinematic loop で seg を進めた瞬間に対応する Audio を強制停止する。タップで進めれば「読み終わるところまで」音声がきっちり止まる。

### 実装

- `OP_PANELS[0]` の panel-level `audio` を撤去、`segments[i].audio` を新設
- 新ヘルパ `__opStartSegAudio(segIdx)` / `__opStopSegAudio(a)` を `playOpeningCinematic` 内に追加し、 per-seg の Audio 生成・破棄を統一管理
  - `__opStartSegAudio` は前回の Audio / Web Audio routing を必ず disconnect してから新規 Audio を生成 (リーク防止)
  - URL は `segs[i].audio` 優先、 fallback で `panel.audio` (後方互換)
  - Web Audio routing は `audioCtx.createMediaElementSource(a)` → `__opNarrGain (0.65)` → destination
- BGM ducking は **seg1 起動時 1 回のみ**:`__opOrigBgm == null` の時のみ保存 + `setTargetAtTime(orig*0.3, ..., 0.18)`。 seg2 起動時は `__opOrigBgm` が既に保持済みなので **二重 duck をスキップ**
- BGM 復帰は seg2 終了 (or seg なし時の単一 seg 終了) で 1 回だけ `__opOrigBgm` を `setTargetAtTime` で復帰、`__opOrigBgm = null` にリセット
- preload も per-seg に汎用化: タイトルタップ時に `__preloadList` の隣で `OP_PANELS` を走査して `segments[i].audio` (+ panel.audio fallback) の URL を `__audSeen` 重複防止 dict 経由で全部 `new Audio().load()`
- 旧 `OP_NA.wav` ファイル自体は **削除しない** (rollback 用に残置)。コード参照のみ撤去

### Skip / cancel 経路

- `onSkip` (skip ボタン) は `_opActiveAudio.pause()` + BGM restore のみ呼ぶ。 Web Audio の `disconnect` は **`finally` ブロックの cleanup に依存** (single-run なら最終的に `__opStopSegAudio` で確実に切れるため安全)。 replay 時もこの `finally` が走るので routing リークはしない
- `_opCancelled = true` になると `_opWaitForAdvance` が即解除され、cinematic loop の `finally` で `__opStopSegAudio` が走って disconnect されるフロー

### 既知の保守性懸念 (cross-review MEDIUM 由来)

1. **`__opStopSegAudio(a)` の引数 `a` と module-level `__opNarrSrc` / `__opNarrGain` の implicit 結合**: 現状は seg 単一 caller なので問題ないが、 将来 `_opActiveAudio` を 2 つ並行で持つ設計に拡張する時はバインディングを明示化する必要あり (例: Audio 生成時に source/gain を return して closure に閉じ込める)
2. **`onSkip` の partial cleanup**: skip 直後は `pause` のみで `disconnect` しない。 即時に新 Audio を作って routing する経路が増えると、 古い routing が dangling する可能性あり。 現状の単一 cinematic 設計では `finally` 経由で必ず回収される

## ナレーション 2 セグメント切替タイミング (2026-05-07 調整)

panel 1 のナレーション (`OP_NA.wav`、17.45s) を 2 セグメントに分けて表示している:

- **seg1** (3 行 通常 黒): もりの おくに… ふくろうの はかせが すんでいます。
- **seg2** (2 行 黒): ポノは、なかよしの はかせと、いつもの なぞなぞで あそぶために やってきました。

**色運用（最終状態 2026-05-08）**: seg1 / seg2 ともに全行 **`emphasis: false` で黒**。一時期 seg2 を `emphasis: true` で赤強調にしたが「子供向けに赤は強すぎる／読み込まれると違和感がある」とのフィードバックで全面ロールバックし、`OP_PANELS[0].segments[1].lines[*].emphasis = false` に固定。Bold (font-weight: bold @ `.op-narration` base) で十分メリハリは出ているので追加色は不要。
赤強調用の CSS (`.op-narration p.emphasis { color: #c0392b; font-weight: 700; }`、本番側 quizland/index.html ~L2457) はエディタ parity の都合で残置 (将来 Panel が増えて使う可能性 + エディタプレビュー一致のため)。データ側で `emphasis: false` を維持している限り発火しない dormant rule。

切替トリガは `audio.currentTime >= Math.max(audio.duration * 0.62, 11.0)` — 「はかせが すんでいます」の発話終了 (≈11s) 以降に切替。fallback timeout は 12s。旧 `audio.duration / 2` (≈8.7s) では「なんでも しっている」直後で seg1 が早く切れすぎていたため修正。

ナレ全文の audio.ended 後にさらに **2 秒の hold** を入れてから panel 2 (博士の発話) に遷移。博士の発話開始がナレ余韻と重ならないようにするため。

## エディタ ⇄ 本番 parity (2026-05-08 修正)

`tools/op-layout-editor.html` の scenario プレビューが本番 typing engine と DOM 構造で乖離していたため、emphasis: true の行が本番で赤になるのにエディタプレビューでは黒のまま — という parity バグを抱えていた。以下のとおり修正済み:

- **`applyScenarioPreview()` の narration ブランチを本番 typing engine と同一構造に書き換え**:
  - 旧: `el.textContent = lines.join('\n')` のような単一テキストノード代入で emphasis 情報を失う
  - 新: `seg.lines.forEach` で `<p>` 要素を生成し、`line.emphasis === true` の行に `<p class="emphasis">` を付与 (本番 `quizland/index.html` ~L4907-L4914 の typing engine と 1:1 mirror)
- **エディタ `<style>` に対応 CSS を追加**:
  - `.op-narration-preview p { margin: 0.25em 0; }`
  - `.op-narration-preview p.emphasis { color: #c0392b; font-weight: 700; }`
  - 本番 `.op-narration p.emphasis` ルールと完全一致
- **`el.style.display = 'flex'` → `'block'` に修正**: 本番 `.op-narration` は flex ではなく block + `text-align: center` で水平センタリングしている。`flex` のままだと子 `<p>` が flex item になり、行間や中央寄せの挙動が本番と微妙にズレるため、display プロパティも本番と揃える。

これにより scenario モードでデータの emphasis フラグを切り替えると、**エディタプレビューも本番もまったく同じ見た目**で表示されるようになった。今後 emphasis を再導入する／別 panel に追加する際も、データの emphasis を編集すれば両方反映される。

## 会話レイアウト (2026-05-07 リデザイン、複数アスペクト対応、 2026-05-11 でくるみ overlay 拡張)

panel 2-6 の会話は `.op-content > .op-narration + .op-sides > .op-side-pono / .op-side-hakase` を base とし、 さらに **`.op-side.op-side-kurumi.op-side-overlay`** を absolute オーバーレイで重ねる構成。

- ベースの `op-side-pono` / `op-side-hakase` = 縦積みの **`.op-char-frame` (上) + `.op-dialogue` (下)** で 50% 幅、`max-width: 540px` キャップで横伸縮を抑制 (1:1 flex)
- **`.op-side-kurumi.op-side-overlay`** は **absolute 配置のオーバーレイ** で base の 1:1 flex を壊さない。 `.op-sides > .op-side.op-side-overlay { flex: none; }` の specificity 強化で flex item 化を確実に阻止 (sw v922+ クロスレビュー HIGH 反映)
- キャラは waist-shot: `<img>.op-char { width: N%; clip-path: inset(0 0 N% 0) }` で底辺を画像自体からカット、横方向は素のまま (横切り禁止)
- pono / hakase の `.op-dialogue` は常時表示・固定サイズ (`max-width: 480px`, `min-height: 120px`, `max-height: 200px`, `overflow-y: auto`)。発話側 opacity 1.0、非発話側 opacity 0.55 の dim で発話者を明示
- くるみ発話時は **対話ボックスの speaker クラス** (`.op-dialogue-single.is-kurumi`) で **ラベル色 #c46a4a (茶色寄りオレンジ)** に切替、 立ち絵オーバーレイは `is-visible` でフェードイン (opacity 0→1, 0.25s)
- 旧 `.op-characters` (キャラ行) + `.op-dialogues` (吹き出し行) の 2 行レイアウトは廃止、`.op-side` 縦積みに統一

背景ブラーは `.op-bg.is-static-blur { filter: blur(5px) saturate(0.9) brightness(0.94) }` (旧 `blur(10px) saturate(0.85) brightness(0.92)` の半分強度)。`.op-bg` は letterbox 外まで全画面で延長 (`.op-cinematic` ルートに対する `position: absolute; inset: 0`)。

### アスペクト戦略: 4:3 letterbox + 解像度別調整

cinematic stage は `.op-content` で **4:3 を最大アスペクト** として letterbox する:

```css
.op-content {
  width: min(100vw, calc(100vh * 4 / 3));
  height: min(100vh, calc(100vw * 3 / 4));
  aspect-ratio: 4 / 3;
}
```

- 4:3 viewport (1024×768): 100vw × 100vh で full
- 16:9 viewport (1920×1080): 1440 × 1080 (左右に 240px の letterbox bar)
- 21:9 viewport (1920×800): 1067 × 800 (左右に 426px の letterbox bar)

これにより内部レイアウトは **4:3 1 つだけ**を考慮すればよくなる。背景ブラー画像は letterbox 外も覆うため画面全体は埋まる (黒帯にならない)。

解像度別の追加調整:
- `(min-aspect-ratio: 16/10)` ワイド画面: ナレーション max-width 720→900px (横長矩形化)、会話ボックス max-width 480→540px、文字 22→20px
- `(max-width: 540px)` モバイル: キャラ・ボックス共に縮小、ボックス max-width: 100%

### キャラサイズ: width 基準 + clip-path inset (重要設計指針)

過去に試した height 基準 (height 180%/120% で frame をはみ出させ overflow:hidden) は、横長アセット (例: 博士の指示棒が画像左端まで突き出ている) で **横が切れる**問題があった。ユーザ要件「キャラクターの横が切れるのはダメ」に基づき、設計を **width 基準 + clip-path** に転換:

```css
.op-char-frame { position: relative; /* overflow:hidden は不要 */ }
.op-char-pono   { width: 75%; max-width: 280px; clip-path: inset(0 0 35% 0); }
.op-char-hakase { width: 95%; max-width: 320px; clip-path: inset(0 0 25% 0); }
```

- 横方向は元画像の natural aspect で表示 (横切れゼロ)
- 縦方向の waist-shot は **画像自体の下 N% を clip-path: inset() でカット**
- frame の `overflow: hidden` は不要 (むしろあると label 等の絶対配置子が clip される弊害があるため撤去)

| キャラ | desktop | wide (≥16/10) | mobile | clip-path bottom |
|---|---|---|---|---|
| ポノ全 5 枚 | 75% / max 280px | max 240px | 80% / max 200px | **35%** カット |
| 博士 (`owl_professor_guide.webp`) | 95% / max 320px | max 280px | 95% / max 230px | **25%** カット (squat な体型なので少なめ) |
| くるみ (13 variants, 全 aspect 0.73、 ~439×602) | overlay 配置 (saved-layout `__op_layout.{B,C,D}.kurumi.{slot,perVariant}` で per-VC + per-variant 制御、 初期 B 280×380 / C 380×520 / D 460×630 の右寄せ、 OP 内では `kurumi_hi` / `kurumi_wink` / `kurumi_clasp` を使用) | 同左 | 同左 | clip-path 不使用 (オーバーレイ全身表示) |

**新キャラ追加時の決め方**:
1. 画像のアスペクトと **底辺に何があるか** を視覚確認 (足先・尻尾・台座など、隠してよい要素か)
2. width % は他キャラと並べた時に頭サイズが揃うように調整 (Pono 75%, 博士 95% は経験値)
3. clip-path bottom % は visible top portion で **頭 + 胸 + 腰**が映るように設定。縦長キャラ (Pono) は 30-40%、横長キャラ (博士) は 20-25%
4. 横方向の clip は使わない (横切れ禁止)
5. 必ず実機 (staging) で 4:3, 16:9, 21:9, モバイル縦の組み合わせを目視確認

### 補足: 長セリフの auto-scroll

`_opTypeInto` の典型タイピング loop で `el.textContent += c` の直後に `el.closest('.op-dialogue').scrollTop = scrollHeight` を呼ぶ。`max-height: 200px + overflow-y: auto` のボックスで長セリフ (例: panel 5 「ほっほっほ、それでよい。…」) の末尾が下に隠れないようにするため。

## ナレーション asymmetric padding (視覚中央補正、2026-05-08)

ナレーションフレーム (Panel 1 で表示する縦長プレート風の枠) は、デザイン上の **視覚中央が幾何中央より上**にある (上部に装飾の余白、下部に細い帯がある等)。対称 padding (`padding: Npx Mpx`) のままだと、テキストが視覚中央より下にずれて「テキストが下に張り付いて見える」問題が出ていた。

これを解消するため、各 VC で `padding-top` を減らし `padding-bottom` を増やして **テキスト中心を上にシフト**する asymmetric padding を採用:

| VC | padding | シフト量 | 補足 |
|----|---------|----------|------|
| B  | `padding: 25px 28px 55px;` | top -15px / bottom +15px (合計上に 15px シフト) | font-size 30px |
| C  | `padding: 22px 36px 62px;` | top -20px / bottom +20px (合計上に 20px シフト) | font-size 44px |
| D  | `padding: 12px 40px 52px;` | top -20px / bottom +20px (合計上に 20px シフト) | font-size 52px |

(対応箇所: `quizland/index.html` ~L2552 / L2622 / L2692 周辺、各 VC の `.op-narration` ルール)

### 重要: エディタ Export との non-parity (TODO)

現状 `tools/op-layout-editor.html` の narration 編集 UI には **`paddingTop` / `paddingBottom` を独立に編集するコントロールが無い**。`padding` を `25px 28px 55px` のような 3 値ショートハンドで保持する仕組みがエディタ state に無いため、**エディタで CSS Export を実行すると asymmetric 値が消えて対称 padding に戻ってしまう可能性がある**。

回避策:
- Export 後にこの asymmetric 値を **手動で書き戻す** か、
- Export 前にデータを点検し、現状の手書き asymmetric 部分は **マージしない**。

恒久対応 TODO:
- エディタ narration セクションに `padding-top` / `padding-bottom` を独立スライダーとして追加し、state にも `paddingTop` / `paddingBottom` フィールドを持たせ、`applyNarrationToDom()` と CSS Export を 4 値分離型に書き換える。

## タップしてつづける の動的位置追従 (sw v890+)

`.op-tap-hint` (タップしてつづける) は、Panel 1 の `.op-narration` プレートの**高さ・位置に追従して直下に動的配置**される。固定 `bottom: 24-28px` (per-VC) のままだと、エディタで narration の `top` / `height` / `padding` を変更した瞬間に**プレートと tap-hint が物理的に重なる**バグがあったため。

実装ポイント (`quizland/index.html`):

- `_opPositionTapHintRelativeToNarration()` ヘルパを追加。`.op-content` を基準に `narration.offsetTop + offsetHeight` を計算し、 tap-hint をその直下 (gap **12px**) に inline `top: <px>px; bottom: auto` で配置。画面下方向の余白が tap-hint の高さ + 12px に満たない場合は narration の**直上**にフォールバック (`top: <narrTop - hintH - 12>px`)。
- `_opShowTapHint(showTextEl)` 内、tap-hint を表示する直前に上記ヘルパを呼ぶ。seg2 swap (narration テキスト差し替え) のタイミングでも再計算。
- `_opHideTapHint()` および `playOpeningCinematic()` の `finally` で tap-hint の inline `top` / `bottom` をクリア (replay 時の前回値持ち越し防止)。
- CSS の `.op-tap-hint { bottom: 24-28px }` (per-VC) は、**narration が非表示のシーン (panel 2-6 等) でのフォールバック値**としてそのまま温存。

設計指針: tap-hint は本来 narration の動線の一部 (「読み終わったらタップ」) なので、視覚的に narration に張り付く位置が正解。CSS だけで `narration の bottom + 12px` を表現する方法 (sibling selector / margin) は、 narration 自体が absolute / fixed 系のレイアウトに切替わった場合に破綻するため、JS で offsetTop ベースに再計算する方針を採用。

## Editor → runtime override 配線 (sw v890+ localStorage 経路、sw v892+ saved-layout.json 経路、sw v900+ seed 起動 fallback + 復元、 sw v904+ で立ち絵+対話+ナレ全部を全端末配信)

`tools/op-layout-editor.html` で編集した **立ち絵 (pono / hakase) + 対話ボックス (singleBox) + ナレーション (narration)** の `lineHeight` / `padding` / `fontSize` / `width` / `height` / 位置 / `bg` / `border` 等を runtime に反映する経路。**localStorage (A 経路、自端末のみ)** と **saved-layout.json 経由の GitHub 配信 (B 経路、全端末配信)** の 2 系統を併用し、runtime は以下の優先で適用する:

```
narration:
  優先度: window._currentLayoutData.__op_layout[vc].narration   (B 経路、新キー、 全端末配信)
        > window._currentLayoutData.__op_narration[vc]          (B 経路、旧キー、 後方互換)
        > localStorage[NARRATION_RUNTIME_PREFIX+vc]             (A 経路、dev 用 fallback)
        > null                                                   (CSS デフォルト温存)

pono / hakase / singleBox:
  優先度: window._currentLayoutData.__op_layout[vc].<obj>       (B 経路、新キー、 全端末配信)
        > null                                                   (CSS デフォルト温存)
```

新ヘルパ `_opLoadLayoutOverride(vc)` (runtime 側) と `buildRuntimeOpLayout()` / `applySeedToOpLayout(vc)` (editor 側) で両経路の snapshot 形 (フィールド名) を統一。 旧 `_opLoadNarrationOverride(vc)` も `__op_layout` を見るよう書き換え済 (旧 `__op_narration` キーも fallback で参照)。

### 保存側 (editor) — A 経路 (localStorage、自端末確認用)

`tools/op-layout-editor.html` の `save(vc)` で、既存の STORAGE_PREFIX (per-question layout snapshot) を**温存したまま**、 別キー `localStorage['pono.opNarration.runtime.<VC>']` に runtime 用 snapshot を JSON で書き出す。フィールド:

| field | 用途 |
|---|---|
| `lineHeight` | 行間 |
| `paddingX` / `paddingY` | 左右 / 上下 padding (px) |
| `fontSize` | px |
| `width` / `height` / `heightAuto` | サイズ (heightAuto=true なら height は注入しない) |
| `posMode` ('top' \| 'bottom') / `top` / `bottom` | 配置 (px) |
| `textAlignH` | 'left' \| 'center' \| 'right' |
| `bgMode` ('css' \| 'image' \| 'none') / `bgColor` (#hex) / `bgOpacity` | 背景 (image は本機能では未注入、css 時のみ rgba 合成) |
| `borderRadius` | px |
| `showShadow` | bool |

### 保存側 (editor) — B 経路 (saved-layout.json 経由、sw v892+ 導入、 sw v904+ で `__op_layout` 新キーに拡張)

エディタの「📡 GitHub 配信」ボタン (`publishNarrationToSavedLayout()`) は、 sw v904+ で **立ち絵 (pono/hakase) + 対話ボックス (singleBox) + ナレーション (narration)** を全部書き出す経路に拡張された。 挙動:

1. `/api/gh/repos/NautilusDW/pono-asobiba-app/contents/quizland/saved-layout.json` を **GET** → `_ghGetSavedLayout()` で base64 decode + JSON parse
2. parse 後の object の **top-level に 2 つのキーを merge**:
   - `__op_layout: { B, C, D }` (新キー、 各 VC は `{ pono, hakase, singleBox, narration }` の 4 オブジェクト) — `buildRuntimeOpLayout()` で生成
   - `__op_narration: { B, C, D }` (旧キー、 narration のみ) — 後方互換用に **同時に書き続ける**
3. **PUT** 時には GET で取得した `sha` を引継ぎ。 既存 per-question keys (`q72`, `q83`, `__chip_text_overrides`, ...) は **`__op_layout` / `__op_narration` 以外を完全温存** (218+ keys)
4. 409 conflict (他者が同時編集) はユーザに通知して中断
5. `bgImagePath` / `boxImagePath` は frame ID から URL を解決した値で seed に補完される (HIGH-3 fix、 frame ID 直書きだと runtime 側で resolve できないため)

#### HIGH fix: `_ghGetSavedLayout` の parse 失敗時のデータロス防止

実装初期、`_ghGetSavedLayout` が **parse 失敗を黙って `{}` で返してしまう**バグがあった。これは「base64 が空 (= 新規ファイル)」と「base64 は中身あるが壊れている」を区別できず、後者の場合に **`{}` を merge → PUT で全 keys 喪失**という致命リスクがあった。

修正後は:
- base64 が空 (= ファイル未作成) なら `{}` を返す (正常系)
- base64 が非空かつ parse 失敗 → **throw** してエディタ UI に「saved-layout.json が壊れています、配信を中止」と通知
- エディタ側は throw を catch して `alert` + return、PUT には**進まない**

これにより saved-layout.json の他キー全消去リスクは封じられた。

### 反映側 (runtime / `quizland/index.html`)

新ヘルパ群:

- `_opGetCurrentVC()`: `matchMedia('(min-aspect-ratio: 19/10)')` → **'D'**, `(min-aspect-ratio: 14/10)` → **'C'**, `(min-aspect-ratio: 85/100)` → **'B'**, **どれにもマッチしないなら `null`**。CSS の `@media` ブレークポイント (D/C/B + 縦長端末) と完全一致するように上から順に評価。null の場合は inline style を**一切注入しない** (CSS デフォルトを尊重)。
- `_opLoadLayoutOverride(vc)` (sw v904+ 新設、 ~L5223): `window._currentLayoutData?.__op_layout?.[vc]` を取得。 object でなければ null 返却。 立ち絵 / 対話 / ナレ 全部の per-VC snapshot 取得口。
- `_opLoadNarrationOverride(vc)`: **3 段優先で narration snapshot を返す** (sw v904+ で `__op_layout` 優先に書き換え済)。
  1. `_opLoadLayoutOverride(vc)?.narration` が object なら採用 (B 経路、 新キー)
  2. 無ければ `window._currentLayoutData?.__op_narration?.[vc]` を採用 (B 経路、 旧キー、 後方互換)
  3. それも無ければ `localStorage[NARRATION_RUNTIME_PREFIX + vc]` を JSON.parse (A 経路、dev 用 fallback)
  4. どれも無ければ null
- `_opApplyLayoutOverride()` (sw v904+ 新設、 ~L5243): `_opLoadLayoutOverride(_opGetCurrentVC())` で snapshot 取得 → `pono / hakase / singleBox / narration` 4 オブジェクトの inline style を **per-element に注入**。 narration は `_opApplyNarrationOverride(el)` に責務委譲して二重適用を回避 (HIGH-1 fix)。
- `_opHexToRgba(hex, opacity)`: `bgColor` (#rrggbb) + `bgOpacity` (0-1) → rgba 文字列。# 抜き / 3 桁 hex / 不正値も受ける (正規化、不正は null 返却)。
- `_opApplyNarrationOverride(narrEl)`: narration の **有効な値のみ** narrEl に inline style を注入。
  - `contentH === 0` (= レイアウト未確定) 時は早期 return (heightAuto=false 時に 0 を入れて潰すのを防ぐ)。
  - `value === undefined` / `NaN` / 空文字のフィールドは**注入スキップ** (CSS デフォルトを温存)。これは per-question layout の whitelist + opt-in 哲学を踏襲。
  - `bgMode === 'css'` で `bgColor` が不正値の場合、 `backgroundColor` は設定しないが `backgroundImage = 'none'` だけは確実に上書き (BG image override の残骸が漏れるのを防ぐ)。

呼び出しタイミング (sw v904+):
- panel ループ前 (~L5546): `_opApplyLayoutOverride()` で立ち絵 + 対話 + ナレ全部を 1 回注入
- narration セグメント可視化前 (~L5657): `_opApplyLayoutOverride()` を再度呼ぶ (narration テキスト差し替え時)
- dialogue panel 切替直後 (~L5752): `_opApplyLayoutOverride()` を再度呼ぶ (panel 跨ぎで立ち絵 / 対話の position が変わる場合に追従)
- `playOpeningCinematic` の `finally` (~L5810-L5839): pono / hakase / singleBox / narration **全部の inline style を全クリア** (replay 時に前回 override を持ち越さないため)

### 設計トレードオフ

- **A 経路 (localStorage)**: 同一 origin / 同一ブラウザ間でのみ共有。dev 中に「自分の手元でだけ確認」したい時に高速。
- **B 経路 (saved-layout.json)**: GitHub 経由で全端末・全ユーザに配信。 staging / production 共通の挙動を作るための本命。HIGH fix で parse 失敗時のロスを封じた上で、**`__op_layout` (新) / `__op_narration` (旧) は top-level の独立キー**として置くため、 per-question layout (`__chip_text_overrides` など) や qNN のキーとは**完全に非衝突**。 sw v904+ で `__op_layout` に拡張され、 立ち絵 / 対話 / ナレ全部を per-VC で配信。
- editor の CSS Export ボタンを使う既存ワークフロー (asymmetric padding を本番に焼き込む等) は無傷。CSS Export は **全ユーザ向けの恒久的な見た目変更**、 saved-layout.json 経路は **データ駆動の上書き** (CSS には書き出さず、 runtime が JSON を読んで inline style として反映) という棲み分け。
- **横展開予定**: 同じ「saved-layout.json の `__xxx` キーに JSON snapshot を merge → runtime が読んで inline 反映」という配信パターンは、他ゲームの layout 配信にも応用できる (例: zukan / character-builder / maze の layout エディタ)。

### Editor 起動時 seed fallback + 「⟳ 復元」ボタン (sw v900+)

`tools/op-layout-editor.html` を **別 origin** (例: ローカルで作業した値を staging で開く、 staging で作業した値をローカルで開く) で開いた際、 localStorage が origin スコープのため**編集値がまったく見えない**問題があった。 旧実装は `state[VC] = load(VC) || defaultsFor(VC)` で defaults に fallback してしまい、 既存の `quizland/saved-layout.json` (📡 GitHub 配信 で publish 済の正規値) が**まったく使われずデフォルト崩れ**を起こしていた。

これを解消するため:

1. **`quizland/saved-layout.json` の top-level に `__op_narration: { B, C, D }` を seed として直接書き込み** (commit a70ec33 で `quizland/index.html` の per-VC `@media` に hardcoded した CSS 値と完全一致)。 既存 219 keys (`q72`, `q83`, `__chip_text_overrides`, ...) は完全温存。
2. **editor 起動時に `init()` を async 化**し `await fetchSeedOpNarration()` で seed を fetch → `_seedOpNarration` にキャッシュ。
3. **`initVc(vc)` ヘルパで `localStorage > seed > defaults` の 3 段優先**で state を初期化:
   - localStorage 値があればそれを採用 (= 同 origin で過去に編集した値を尊重)
   - localStorage 空なら `defaultsFor(vc)` の上に `applySeedToNarration(vc)` で seed を merge → `migrateFrameIds` で sanitize
   - seed も無ければ defaults のまま
4. **「⟳ 復元」ボタン** (`📡 GitHub 配信` の隣) を追加。 `restoreNarrationFromSavedLayout()` で:
   - `confirm()` で誤クリック防止 (HIGH-1 fix)
   - `pushUndoSnapshot('⟳ 復元 ' + vc)` で復元前の状態を Undo スタックに積む (HIGH-1 fix、 万一 OK 押下後でも巻き戻せる)
   - 現 VC の `localStorage[STORAGE_PREFIX+vc]` と `localStorage[NARRATION_RUNTIME_PREFIX+vc]` を removeItem
   - `fetchSeedOpNarration(true)` で `cache: 'no-store'` 強制再 fetch (HIGH-2 fix、起動時のみ `cache: 'default'` でブラウザ HTTP キャッシュを利用し network round-trip を削る)
   - `defaults + seed merge → migrateFrameIds → state` 書き戻し → `save(vc)` → `render() / buildRightPane()`
5. seed の省略キー (例: `left=0`, `aspectLockRatio=0`) は `migrateFrameIds()` の narration backfill ロジックで 0 にフォールバックする。 将来 narration スキーマにフィールドが追加されたら seed 構造も合わせること (MEDIUM-3 fix で説明コメント追記済)。

#### 運用ガイダンス

- **ローカル → staging で編集値を移植したい場合**: 旧来は **手動 export/import が必須**だったが、 staging origin で「⟳ 復元」を押すか、 publish (📡 GitHub 配信) → そのまま staging を開けば seed として読み込まれる。
- **staging を「本物」にする運用**: 大きな変更は staging で編集 → publish → そのまま production / ローカル / 他端末も**自動で同じ値**で初期化される (= 1 回 publish で全 origin の defaults を正規値に揃えられる)。

#### 既知の制約

- localStorage は origin 跨ぎで共有されないため、 ローカルで「lineHeight 1.7」 staging で「lineHeight 1.5」 のように **同じ origin 内では** 各々の編集値が保持される (これは仕様)。 「ローカルで作業 → そのまま staging で続き」をやりたい場合は publish → staging で「⟳ 復元」を踏む。
- ただし seed 値が `quizland/index.html` の CSS hardcoded と一致しているので、 publish していなくても**大幅な崩れは起きない** (= seed の defaults 化により、 別 origin から開いても CSS と同じ値で initialize される)。
- `_seedOpNarration` は **process 内グローバルキャッシュ**。 publish 直後は「⟳ 復元」ボタンで `forceRefresh=true` 経由で再 fetch しないと古い値が残る (実装で考慮済 — `fetchSeedOpNarration(forceRefresh=true)` 時に `cache: 'no-store'`)。

### JSON Export / Import (X 案、 sw v902+) — origin 跨ぎ移植

`localStorage` が origin スコープのため、 ローカル `file://` で編集した値を staging origin に直接持っていけない問題があった (B 経路復活後も「ローカル編集 → 即 staging 配信」を成立させたい)。 これを解消するため、 editor に **「💾 NA Export」** / **「📂 NA Import」** ボタンと隠し `<input type="file">` を追加 (sw v902 で導入)。

#### 確定ワークフロー (X 案)

```
1. ローカル editor (file:// or localhost) で B/C/D narration を編集 → preview 確認
2. 「💾 NA Export」 → op-narration-<timestamp>.json をダウンロード
3. staging editor (本番 origin) を開いて 「📂 NA Import」 → JSON ファイル選択
4. 「📡 GitHub 配信」 → quizland/saved-layout.json の __op_narration を更新
5. 全端末・全ユーザに反映 (B 経路で fetch される)
```

ローカル ↔ staging のどちら方向にも双方向に移植可能。 「⟳ 復元」 (saved-layout.json から再 fetch) と組み合わせれば「staging で publish した値をローカルに持ち帰る」運用も可能。

#### JSON 形式

```json
{
  "schema": "pono-op-narration-v1",
  "exportedAt": "2026-05-09T10:30:45.123Z",
  "narration": {
    "B": { "lineHeight": 1.6, "paddingX": 28, "paddingY": 25, ... },
    "C": { ... },
    "D": { ... }
  }
}
```

- `narration[vc]` は `state[vc].narration` をそのままダンプ (フィールドはエディタが扱える narration スキーマと完全互換)
- 一部 VC が `null` でもエラーにならず該当 VC は import 時にスキップされる
- スキーマ名は `pono-op-narration-v1` (将来形式変更時はバージョンを bump)

#### 実装ポイント (`tools/op-layout-editor.html`)

- `exportNarrationJson()`: `state.B/C/D.narration` を JSON 化 → `Blob` → `<a download>` クリックで保存。 ファイル名は `op-narration-<ISO timestamp>.json`
- `importNarrationJsonFromFile(file)`:
  - `confirm()` で誤操作対策 (HIGH-1: 既存 narration を完全上書きするため必須)
  - 各 VC について `pushUndoSnapshot('NA Import ' + vc)` を積む (HIGH-2: 万一 OK 押下後でも巻き戻せる)
  - `state[vc].narration = Object.assign({}, state[vc].narration || {}, nr)` でフィールド単位の merge (= JSON 側に書かれているフィールドだけ上書き、 JSON 側に無いフィールドは現値維持)
  - `migrateFrameIds(state[vc])` で sanitize、 `save(vc)` で localStorage に永続化
  - 最後に `render()` で現 VC の preview を再描画
- イベント wire: `<button>` クリック → `<input type="file">` の `.click()` を呼んで file picker を開き、 `change` イベントで `importNarrationJsonFromFile(f)` 呼び出し。 `e.target.value = ''` で同じファイル再選択を許可

#### B 経路 / 既存ボタンとの併用

- 「📡 GitHub 配信」「⟳ 復元」「CSS Export」「JSON DL (= 全 layout snapshot)」の既存ボタンは**全て温存**。 NA Export/Import は narration の **3 VC 分のみ**を抜き出すコンパクトな移植経路で、 既存経路を一切壊さない
- `localStorage` も触らずに済むため、 ローカルで作業中の per-question layout (q72, q83 など) は import 時に**完全に無傷**

## Panel Spec

| # | kind | bg | 内容 |
|---|------|-----|------|
| 1 | narration | `OP_BG.webp` (森の家・外観、**シャープ／ブラー無し**、21:9 高解像度版に差し替え済み) | **ナレーションは全文 Bold** (font-weight: bold @ `.op-narration` base)、**全 5 行 黒で確定** (`OP_PANELS[0].segments[*].lines[*].emphasis = false`)。途中で seg2 (line 2 だけ → 全行) を `emphasis: true` で赤強調に切替えた経緯があるが「子供向けで赤強調は強すぎる／不要、Bold で十分」というフィードバックで **全面ロールバック済み**。seg1 (3行): もりの おくに… / そこには、なんでも しっている / ふくろうの はかせが すんでいます。 / seg2 (2行): ポノは、なかよしの はかせと、いつもの なぞなぞで / あそぶために やってきました。 |
| 2 | dialogue  | `OP_BG02.webp` (**博士の家の屋内**、is-static-blur: scale 1.08 + blur 5px) | **入室演出 (2026-05-08 追加)**: 最初の 2 秒は **BG を sharp で表示** (blur 無し / キャラ・Box 非表示) → 2 秒経過時に `is-static-blur` 追加 (filter フェード 0.6s) + sides / dialogueBox を opacity 0→1 で 0.5s フェードイン → 600ms マージン後に typing 開始。Pono panel 既定 = `dance_hi.webp`、博士 = `owl_professor_guide.webp`。 **3 行構成 (sw v921+ で kurumi 追加 / v923+ で kurumi variant `kurumi_hi.webp` 確定)**: ① 博士「ほっほっほ…ポノか。よくきたのう」 (pono `pono_001.webp` 聞き役) → ② **★くるみ「こんにちは、ポノさん！」** (pono `pono_001.webp`、 **kurumi `kurumi_hi.webp` ← 左手大きく挨拶 variant** フェードイン) → ③ ポノ「はかせ、くるみちゃん、あそびに きたよ！」 (pono `dance_wave.webp`)。 **「博士」漢字は使わずひらがな「はかせ」に統一** (sw v922+ クロスレビュー反映) |
| 3 | dialogue  | 同上 | Pono panel 既定 = `dance_hooray.webp`、**hakase line で `pono_001.webp` (聞き役)、pono line で `dance_hooray.webp`**、台詞「きょうも なぞなぞを するかの？」「うん！やりたい！」 (2 行)。 **両 line に `kurumiImg: kurumi_clasp.webp` (両手胸前で組む待機ポーズ) を注入** (sw v937+) してくるみ立ち絵を visible 維持。 「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 方針 (v937 確定) により Panel 3/4 は kurumi が黙って会話を聞いている演出 |
| 4 | dialogue  | 同上 | Pono panel 既定 = `think_arms_crossed_side.webp`、**hakase line で `pono_001.webp` (聞き役)、pono line で `think_arms_crossed_side.webp`**、台詞「ふむふむ… じしんは あるかな？」「うーん…でも がんばる！」 (2 行)。 **両 line に `kurumiImg: kurumi_clasp.webp` (両手胸前で組む待機ポーズ) を注入** (sw v937+) してくるみ立ち絵を visible 維持。 Panel 3 と同じく kurumi は黙って会話を聞いている (継続表示方針) |
| 5 | dialogue  | 同上 | Pono panel 既定 = `dance_smile.webp`。 **4 行構成 (sw v921+ で kurumi 追加 + sw v922+ で「クイズ」→「なぞなぞ」語彙統一 + sw v923+ で kurumi variant `kurumi_wink.webp` 確定)**: ① 博士「ほっほっほ、それでよい。まちがえても よいのじゃ。**かんがえることが たいせつじゃからの。**」 (pono `pono_001.webp`) → ② ポノ「うん！」 (pono `dance_smile.webp`) → ③ **★博士「くるみよ、いつもどおり なぞなぞを おねがいするぞ」** (pono `pono_001.webp`) → ④ **★くるみ「はーい、まかせて！」** (pono `pono_001.webp`、 **kurumi `kurumi_wink.webp` ← ウインク + こぶし variant** フェードイン) |
| 6 | dialogue  | 同上 | Pono panel 既定 = `think_chin_clasp.webp`、**hakase line / pono line とも `think_chin_clasp.webp`** (両者真剣な構え)、台詞「では、いくぞ…」「うん！」 (2 行)。 **両 line に `kurumiImg: kurumi_clasp.webp` (両手胸前で組む立ち姿 variant) を注入** することで くるみ立ち絵を visible 維持し、 喋らないままクイズ本編に遷移 (sw v922+ 「Panel 6 でくるみ消失」 クロスレビュー HIGH 修正 + sw v923+ で variant を `kurumi_001` → `kurumi_clasp` に切替えて待機感を演出、 表示判定は `speaker === 'kurumi' || d.kurumiImg` の OR 条件) |

Pono は `assets/images/characters/pono/dance/` 配下の透過 PNG を panel ごとに表情/身振り別で切替。**2026-05-08 から per-line `ponoImg` 対応** (speaker 関係なく全 line で指定可能): 各 dialogue line に optional `ponoImg` を持たせ、playOpeningCinematic が line 開始時に `d.ponoImg ?? panel.ponoImg` で `op-char-pono` の src を切替える (panel-level は fallback として残置 = 互換性維持)。**hakase 発話中も Pono は表示されているので、聞いている/驚いている等のリアクションを per-line ponoImg で表現できる。Panel 2-5 は `pono_001.webp` (neutral 立ち姿)、Panel 6 は `think_chin_clasp.webp` を使用**。事前にナレーション中に `new Image()` で全 panel + per-line ponoImg をプリロード済み（コールドキャッシュでも切替時 pop しない）。

**新規アセット (2026-05-08)**: `assets/images/characters/pono/dance/pono_001.webp` (399×569 RGBA, 46.5KB) — 元 `assets/images/characters/pono/pono_001.png` (303KB, 立ち姿 neutral) を WebP q85 で 85% 削減。元 PNG はそのまま残置 (他参照保護)。

## くるみちゃん組み込み (sw v921+ / クロスレビュー反映 v922+ / 13 variants 管理 v923+ / クロスレビュー C HIGH3+MED4 反映 v924+ / 左ペイン Kurumi サムネ + シナリオ speaker 拡張 v925+ / scenario defaults 同期 v926+ / migrate + export 修正 v927+ / scenario auto migration v929+ / くるみタブ defensive 強化 v930+ / シナリオ行 3 キャラ dropdown v931+ / kurumi.perVariant 13 entries の本格 publish 成立 v932+ / **runtime kurumi CSS 中央アンカー統一 v933+ (B/C/D 全 VC、 editor preview と式一致)**)

OP に **アシスタント役のリスのくるみちゃん** を 3 番目のキャラとして追加。 キャラ全般のスペック・性格・VOICEVOX 方針 + 13 ポーズ variants の用途は [feature_quizland_kurumi.md](feature_quizland_kurumi.md) に集約、 ここでは **OP cinematic 側の組み込み詳細** をまとめる。

### 組み込み箇所まとめ (variant 確定値: sw v923+、 editor 拡張は v924/v925 で進化、 v926/v927 で scenario defaults 同期 + migrate/export 修正、 v929 で scenario state version 付き auto migration、 v930 でくるみタブ defensive 強化、 v931 でシナリオ行に 3 キャラ dropdown 追加 + HAKASE_VARIANTS 新設 + hakaseImg migrate/export 対応、 **v932 でローカル editor の位置調整 Export を orchestrator 経由で saved-layout.json に merge — kurumi.perVariant 13 entries が初期値から editor 編集後の実値に更新**)

- **dialogue データ** (`quizland/index.html` ~L4869-L4911 = `OP_PANELS` Panel 2 / 3 / 4 / 5 / 6 全 5 panel で kurumi visible、 sw v937+ で Panel 3/4 にも kurumiImg 注入):
  - Panel 2: 3 行 (博士 → くるみ → ポノ)、 ② くるみ line に `speaker: 'kurumi'` + **`kurumiImg: 'kurumi_hi.webp'`** (左手大きく挨拶)
  - **Panel 3 (sw v937+)**: 2 行 (博士 → ポノ)、 **両 line に `kurumiImg: 'kurumi_clasp.webp'` (両手胸前で組む待機ポーズ) を注入** して立ち絵維持 (発話無し)
  - **Panel 4 (sw v937+)**: 2 行 (博士 → ポノ)、 **両 line に `kurumiImg: 'kurumi_clasp.webp'` (両手胸前で組む待機ポーズ) を注入** して立ち絵維持 (発話無し)
  - Panel 5: 4 行 (博士 → ポノ → 博士 → くるみ)、 ④ くるみ line に `speaker: 'kurumi'` + **`kurumiImg: 'kurumi_wink.webp'`** (ウインク + こぶし)
  - Panel 6: 2 行 (博士 → ポノ)、 **両 line に `kurumiImg: 'kurumi_clasp.webp'` (両手胸前で組む) を注入** して立ち絵を visible 維持 (発話無し、 待機ポーズ)
  - **「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 がプロジェクト方針** (sw v937 で確定)。 Panel 3/4 で消すような提案は今後しない。 ポーズ (variant) はシナリオに合わせて変化させてよい
  - ポノ呼び方は **「ポノさん」**、 博士呼び方は **「はかせ」** (ひらがな)、 クイズ本編呼称は **「なぞなぞ」** で語彙統一

- **HTML** (~L3117): `.op-side.op-side-kurumi.op-side-overlay.hidden` を pono / hakase の sides の下に追加。 内部に `<img id="op-char-kurumi" class="op-char op-char-kurumi">`

- **CSS**:
  - `.op-side-kurumi` フェード制御 (~L2407-L2410): `opacity 0 → 1` 0.25s ease-out + `.hidden { display: none }`
  - speaker クラス (~L2465): `.op-dialogue-single.is-kurumi .op-dialogue-label { background: #c46a4a; }` (茶色寄りオレンジ、 リス感)
  - per-VC slot デフォルト (B ~L2642 / C ~L2724 / D ~L2807): 右寄せ初期座標を hardcode (saved-layout.json で上書き可能)
  - **specificity 強化** (sw v922+ クロスレビュー反映): `.op-sides > .op-side.op-side-overlay { flex: none; }` で flex item 化を確実に阻止

- **runtime ロジック** (`playOpeningCinematic`):
  - `_opCurrentKurumiVariant(panel, line)` (~L5392-L5407): line.kurumiImg → panel.kurumiImg → null の優先で variant 名 (basename) を解決
  - `_opApplyLayoutOverride` 内 (~L5486-L5489): `applySide('kurumi', layout.kurumi, kurumiVariant)` で saved-layout.json の `__op_layout.{vc}.kurumi` を適用
  - dialogue render ループ (~L6075-L6122):
    - `isKurumi = (d.speaker === 'kurumi')`
    - **`keepKurumiVisible = isKurumi || !!(d && d.kurumiImg)`** — speaker が kurumi でなくても、 line に `kurumiImg` がセットされていれば立ち絵を visible 維持 (Panel 6 のための **OR 条件**、 sw v922+ クロスレビュー HIGH-1 修正)
    - visible 時: `kurumiSide.classList.add('is-visible')` でフェードイン、 hidden 解除
    - 非 visible 時: `is-visible` 削除でフェードアウト (DOM 残置)、 ただし `kurumiImgEl.src` 未セットの panel では `hidden` 追加で領域を返す
  - speaker クラス (~L6132): `dialogueBox.classList.toggle('is-kurumi', isKurumi)`
  - babble preset (~L6139): `presetForLine = isHakase ? 'owl' : (isKurumi ? 'kurumi' : 'pono')`
  - cleanup (~L6211-L6225): `finally` で `['pono', 'hakase', 'kurumi'].forEach(...)` の inline style 全クリア + `is-visible` / `hidden` リセット

- **babble preset** (`js/quizland-babble.js` ~L71-L83): `kurumi: { wave: 'triangle', baseFreq: 450, glide: 35, duration: 0.08, attack: 0.006, release: 0.048, peakGain: 0.13, pitchSpread: 30 }` — 詳細は [feature_babble_voice.md](feature_babble_voice.md) の「Kurumi Preset Specification」参照

- **saved-layout.json** (sw v923+ で 13 variants スキーマ拡張、 **sw v932+ で実値が editor 編集後に publish 済**): `__op_layout.{B,C,D}.kurumi.perVariant` に **13 entries** を保持。 v932 時点の実態は **B = 13 variants 全部が editor で個別調整済 (slotH 278〜380, slotOffsetX 54〜88, `kurumi_pray` のみ slotOffsetY=-4) / C = 13 variants 全部が `slotW=280 / slotH=380` の初期値温存 (今回の Export では C は touch せず) / D = `kurumi_001` のみ `slotW=550 / slotH=489 / slotOffsetX=654` で大きく上書き、 他 12 は初期値温存**。 op-layout-editor の 「くるみ側」 タブまたは **左ペイン Kurumi サムネ一覧 (v925+)** で variant 別に slot 位置・サイズ調整可能、 「📋 JSON のみクリップボード」 → AI チャット → orchestrator が saved-layout.json マージ → develop → staging で全端末反映というフローが v932 で正式運用化

- **アセット (13 variants)**: `assets/images/characters/kurumi/dance/kurumi_*.webp` 計 13 種 (`001` / `hi` / `wave` / `hooray` / `wink` / `clasp` / `idea` / `point` / `calm` / `pray` / `book` / `cheer` / `greet`)。 全 variant 共通: 赤いもみじ風スカーフ・頭飾り（紅葉+どんぐり）・絵本風水彩タッチ・パレット完全一致。 OP 内では `kurumi_hi` / `kurumi_wink` / `kurumi_clasp` の 3 variant を使用、 残りは将来のクイズ本編演出用ストック。 詳細用途表は [feature_quizland_kurumi.md](feature_quizland_kurumi.md) 「ポーズアセット運用」 を参照

### 表示維持仕様の判定ロジック (重要)

くるみが「喋らないが画面に立っている」 panel (= Panel 3 / 4 / 6) を作るため、 立ち絵 visible 判定は **`speaker === 'kurumi' || d.kurumiImg` の OR 条件** にしてある。 `kurumiImg` を line に注入するだけで、 喋らせずに立ち絵だけ維持できる。 sw v937+ で Panel 3 / 4 にも kurumiImg 注入したため、 **Panel 2-6 全 5 panel で連続 visible** が成立 (旧 v921-v936 は Panel 3-4 で kurumiImg 未注入のため一旦消えていた):

- Panel 2 で くるみ初登場 (visible、 `kurumi_hi`)
- **Panel 3 で くるみ立ち絵維持 (sw v937+、 両 line に `kurumiImg: kurumi_clasp` 注入で待機ポーズ)**
- **Panel 4 で くるみ立ち絵維持 (sw v937+、 両 line に `kurumiImg: kurumi_clasp` 注入で待機ポーズ)**
- Panel 5 で くるみ発話 (visible 継続、 `kurumi_wink` に変化)
- Panel 6 で 発話無しのまま立ち絵維持 (両 line に `kurumiImg: kurumi_clasp` 注入)
- → Panel 2 で登場したら Panel 6 まで一度も消えず、 クイズ本編開始時にも くるみが画面に立っていて 「読み手はこの子」 という導入が完結

**プロジェクト方針 (v937 で確定)**: 「くるみは Panel 2 で登場したら Panel 6 まで継続表示」。 「Panel 3/4 で消す」 のような提案は今後しない。 ポーズ変化はシナリオに合わせて自由 (v937 では Panel 3/4 を `kurumi_clasp` 待機ポーズに統一、 将来 `book` で本を読む / `idea` でひらめきポーズ等に変えてもよい)。 ユーザー指示原文「くるみはその場所にずっと出てていい。一度最初に出たらずっとそこにいていい。シナリオでポーズも変化させたりはしている」

`finally` cleanup で OP 終了時に `hidden` 復帰するため、 replay や skip でも前回の visible 状態を持ち越さない。

## Implementation Files

- **`quizland/index.html`**:
  - CSS: ~2120-2310（`.op-cinematic`, `.op-bg.is-static-blur`, `.op-content` 4:3 セーフエリア, バブル、スキップボタン、フェードイン）+ ~2407-2410 / ~2465 / ~2642 / ~2724 / ~2807 (`.op-side-kurumi` overlay フェード CSS と per-VC `.op-char-slot` デフォルト位置)
  - HTML: ~2459-2479（`#op-cinematic` overlay + `.op-content` ラッパー）+ ~3117 (`.op-side.op-side-kurumi.op-side-overlay.hidden` 独立サイド + `<img id="op-char-kurumi">`)
  - JS: ~4869-4911（`OP_PANELS` Panel 2-6 dialogue 配列、 kurumi line + kurumiImg 注入を含む）、 ~5392-5407 (`_opCurrentKurumiVariant`)、 ~5486-5489 (`applySide('kurumi', ...)`)、 ~6075-6122 (kurumi visible / fade ロジック、 `keepKurumiVisible = isKurumi || !!d.kurumiImg`)、 ~6132 (dialogueBox に `is-kurumi` クラス)、 ~6139 (preset 切替)、 ~6211-6225 (cleanup で `is-visible` / `hidden` 解除)
- **`js/quizland-babble.js`**: ~71-83 で `kurumi` preset (baseFreq 450, glide +35, triangle, peakGain 0.13)
- **アセット (WebP 化済み、PNG はフォールバックで残置)**:
  - `assets/images/quizland/OP/OP_BG.webp` (96KB / 元 2.2MB → 95.6% 削減)
  - `assets/images/quizland/owl_professor_guide.webp` (79KB / 元 1.5MB → 94.6% 削減)
  - `assets/images/characters/pono/dance/{dance_hi,dance_wave,dance_hooray,think_arms_crossed_side,dance_smile,think_chin_clasp,pono_001}.webp` (各 33-51KB)
  - `assets/images/characters/kurumi/dance/kurumi_*.webp` 13 variants (各 ~440×600 RGBA, 透過維持) — `001` 基準正面 + `hi`, `wave`, `hooray`, `wink`, `clasp`, `idea`, `point`, `calm`, `pray`, `book`, `cheer`, `greet`
  - `OP_NA01.mp3` / `OP_NA02.mp3` — ナレーション per-seg
- **`quizland/saved-layout.json`** (sw v923+ で 13 variants 化、 v924 でクロスレビュー C 修正、 v925 で editor 左ペイン Kurumi サムネ + シナリオ speaker 拡張、 v926-v931 はデータ層変更なし — editor の defaults / migrate / export ロジック修正と version 付き auto migration、 タブ defensive 強化、 シナリオ行 dropdown 拡張のみ、 **v932 でローカル editor の位置調整 Export を merge してデータ層が初期値 → editor 編集後の実値に更新、 220 keys 完全温存**): `__op_layout.{B,C,D}.kurumi.perVariant` に **13 entries** を保持。 v932 時点の実値は B が 13 variants 全部 editor で個別調整済 (slotH 278〜380、 slotOffsetX 54〜88、 `kurumi_pray` のみ slotOffsetY=-4)、 C は 13 variants とも `slotW=280 / slotH=380 / slotOffsetX=0` の初期値温存、 D は `kurumi_001` のみ `slotW=550 / slotH=489 / slotOffsetX=654` で大きく上書き、 他 12 は初期値温存。 全 variant `slotAspect='fixed_0.73'` / `objectPosition='bottom'` 統一
- **`tmp/quizland-op-cinematic/CODEX-PROMPT.md`**: Panel 2-6 の絵生成仕様（gitignored）

## API / Public surface

- `playOpeningCinematic()` — async, シングルトン（`_opRunning` ガード）。返り値なし、終了で resolve。
- スキップ: `#op-skip` クリックで `_opCancelled = true` → 進行中の audio.pause + babble.cancelAll + タイピング tick 中断。

## Audio coordination

- `OP_NA.wav` は `new Audio()` を `audioCtx.createMediaElementSource()` で既存 AudioContext に接続（iOS のユーザージェスチャーコンテキスト失効対策）。BGM は title-tap 時に `startBGM()` で起動済みなので audioCtx は unlock 済み。
- パネル 2-6 は文字ごとに `PonoBabble.playChar(c, 'owl' | 'pono' | 'kurumi')`。 speaker → preset 対応は `presetForLine = isHakase ? 'owl' : (isKurumi ? 'kurumi' : 'pono')` (~L6139)。 くるみ preset の詳細は [feature_babble_voice.md](feature_babble_voice.md) と [feature_quizland_kurumi.md](feature_quizland_kurumi.md) を参照

## Audio levels (反映済み)

統一スキームは [feature_audio_balance.md](feature_audio_balance.md) を参照。シネマでの実装:
- ナレーション (`OP_NA.wav`): Web Audio gain 0.65 + HTMLAudio.volume 0.65 fallback (`__opNarrSrc`/`__opNarrGain` を関数スコープで追跡)
- BGM (`bgmGain`): ナレ再生中は元値の 30% にダック (tau 0.18)、終了/skip/timeout/throw 全パスで `finally` から復帰 (tau 0.15)
- リプレイ時の Web Audio ノードリーク防止: `finally` で `__opNarrSrc.disconnect()` / `__opNarrGain.disconnect()`

## Known follow-ups (not blockers)

1. **Replay gate** — 毎回モード選択ごとに再生。`sessionStorage.setItem('op_seen', '1')` で初回のみに制限する案あり。
2. **OP_NA.wav の文言ズレ** — 現在のセグメント 2 の表示文言は「ポノは、なかよしの はかせと、いつもの なぞなぞで あそぶために やってきました。」だが、wav の音声は元々の「なぞなぞで あそびに きました」のままなのでテキストと音声が不一致。再録音するか、ナレ末尾だけ別 wav に差し替えるのが本筋。
3. **Pono voice** — 現状はシンプルなトライアングル単発音。owl と並ぶと差が大きいので、voice path（フォルマント+LFO）へ昇格させたい。
4. **Audio path convention** — `OP_NA.wav` が `assets/images/` 配下にあるのは命名規約違反。`assets/audio/quizland/OP/` に移動するのが本筋。
5. **Dead CSS** — `@keyframes opDolly`, `.op-bg.dollying`, `.op-bg.scenic-blur` は static-blur 移行で未使用化。削除可。
6. **エディタ asymmetric padding 入力 UI** — narration `.op-narration` の `padding-top` / `padding-bottom` 独立コントロールがエディタに無い。CSS Export を回した際に手書きの asymmetric 値 (B: `25px 28px 55px` / C: `22px 36px 62px` / D: `12px 40px 52px`) が **対称化されてリグレッションする危険**あり。state とエディタ UI / `applyNarrationToDom` / CSS Export を 4 値分離型へ拡張するのが恒久対応。 (詳細: 「ナレーション asymmetric padding」セクション参照)
7. **VC C / D narration の overflow 脆弱性** — 現在 `.op-narration` は `height` 固定 + `overflow` 未指定。3 行は収まるが **4 行以上書くとフレーム外にあふれる**可能性。reviewer 推奨: `overflow: hidden` を追加して安全側に倒す (本番のテキストを 3 行以下に保つ運用ルールがあるが、エディタからミスで増える事故予防)。今回スコープ外で未対応。

## (Q) 案完成 (sw v904+): 立ち絵+対話+ナレ全部を全端末配信

sw v902-v903 までの B 経路は **narration のみ** 配信していた。 sw v904+ (commit 予定の本変更) で **立ち絵 (pono / hakase) + 対話ボックス (singleBox) + ナレーション (narration) 全部** を per-VC で全端末配信できるよう拡張した (Q 案完成)。

### 効果

- editor の **「📡 GitHub 配信」 1 押**で全端末反映が完結。 立ち絵の位置 / 対話ボックスの bg / 文字サイズ等を編集 → 配信 → 全ユーザ環境に即反映
- **CSS DL → 開発者手動反映の手間ゼロ**: 旧来の 「CSS Export して quizland/index.html に手で貼り付け、 commit / push」 のフローを介さずに変更を全端末に届けられる
- 後方互換: 旧 narration-only JSON ファイル (`pono-op-narration-v1`) や 旧 `__op_narration` キーは引き続き読める。 既存ローカル editor 値も無傷

### 編集ワークフロー (確定)

```
1. ローカル editor (file:// or localhost) で B/C/D の立ち絵 / 対話 / ナレ を編集 → preview 即時反映
2. 「💾 Export」 → op-layout-<timestamp>.json をダウンロード
   (B/C/D 全部 + 立ち絵 / 対話 / ナレ 全フィールド、 schema=pono-op-layout-v1)
3. staging editor (本番 origin) を開いて 「📂 Import」 → JSON ファイル選択
   (旧 schema pono-op-narration-* も受入)
4. 「📡 GitHub 配信」 → quizland/saved-layout.json の __op_layout / __op_narration を更新
5. 全端末・全ユーザに反映 (B 経路で fetch される)
```

### 主キー構造

```json
{
  "__op_layout": {
    "B": { "pono": {...}, "hakase": {...}, "kurumi": {...}, "singleBox": {...}, "narration": {...} },
    "C": { ... },
    "D": { ... }
  },
  "__op_narration": {
    "B": { ... },     // 後方互換: narration のみ
    "C": { ... },
    "D": { ... }
  },
  "q72": { ... }, "q83": { ... }, "__chip_text_overrides": { ... }   // 既存 218+ keys は完全温存
}
```

`kurumi` は sw v921+ で追加された 5 つ目のオブジェクト。 `slot` (left/top/width/height/aspectLockRatio) と `perVariant` を持つ。 **sw v923+ で perVariant が 1 entry (`kurumi_001` のみ) → 13 entries (`kurumi_001` + `hi` / `wave` / `hooray` / `wink` / `clasp` / `idea` / `point` / `calm` / `pray` / `book` / `cheer` / `greet`) に拡張済**、 全 variant が `kurumi_001` と同値で初期化されており editor で個別に slot を上書きする想定。 _opApplyLayoutOverride は v921+ で `applySide('kurumi', layout.kurumi, kurumiVariant)` を追加して inline style 注入経路を拡張済 (~L5486-L5489)。

### Cross-review fixes (本変更で同時投入)

- **HIGH-1**: narration の二重適用を解消。 旧 `_opApplyLayoutOverride` 末尾に narration の inline style 注入ブロックがあり、 直後の `_opApplyNarrationOverride` と二重に走っていた。 後者に責務統合し前者から削除
- **HIGH-2**: `fetchSeedOpNarration` の early-return 条件を **`_seedOpNarration && _seedOpLayout && !forceRefresh`** に厳密化。 旧来は `_seedOpNarration` だけ見ていたので、 `_seedOpLayout` (新キー) のキャッシュが空のまま 2 回目以降の fetch がスキップされる race があった
- **HIGH-3**: editor の `buildRuntimeOpLayout()` で `bgImagePath` / `boxImagePath` を frame ID から URL を resolve した値で seed に補完。 frame ID 直書きだと runtime 側で resolve できず BG が効かないバグ防止
- **LOW-1**: editor のコメント文言を実 DOM ラベルに最新化 (「NA Export/Import」 → 「Export/Import」)

## ポノ ポーズ別位置 (per-variant) 配信完成 (sw v905+)

sw v904 までの `__op_layout[VC].pono` は **flat フィールドのみ** (= 全 variant 共通の slot 位置) を配信していた。 sw v905+ で `state.pono.perVariant` を **そのまま publish payload に含める**よう拡張し、 runtime 側で **dialogue line ごとに variant 名を抽出して `perVariant[variantName]` を flat より優先で適用**できるようにした。 これでエディタで「Panel 4 で `think_arms_crossed_side` を画面右に寄せる」のような **variant 別の slot 位置編集** を全端末配信できる。

### Editor 側 (`tools/op-layout-editor.html`)

- 既存の `sideSnap(side)` を **`sideSnap(side, includePerVariant)`** に拡張 (~L2051-L2080)
  - `includePerVariant=true` のときに `side.perVariant` (object of `{variantName: slotEntry}`) を whitelist された 6 フィールド (`left`, `top`, `width`, `height`, `aspectLockRatio`, `clipBottomPct`) でフィルタして `out.perVariant` に格納
  - hakase は `sideSnap(s.hakase, false)` のまま (perVariant 概念が無い、 ポーズによる位置変化が無い前提)
- `buildRuntimeOpLayout()` の呼び出し箇所 (~L2104) で `pono: sideSnap(s.pono, true)`、 `hakase: sideSnap(s.hakase, false)` と分岐

### 6 variants (publish 対象)

```
dance_hi, dance_hooray, dance_smile,
think_arms_crossed_side, think_chin_clasp,
pono_001 (中立立ち姿、 はかせ発話時の聞き役ポノ)
```

`pono_001` は `OP_PANELS` の hakase line 側で参照される neutral 立ち姿 (Panel 2-5 で使用)。 v905 で `PONO_VARIANTS` / `defaultsFor` の `ponoPerVariantDefaults` 初期化 / `migrateFrameIds` の backfill リストに追加され、 editor 上でも 6 番目の variant として編集可能になった (cross-review HIGH-1 fix)。

### Runtime 側 (`quizland/index.html`)

新ヘルパ + 拡張:

- `_opCurrentPonoVariant(panel, line)` (~L5244): 現在ポノの variant 名を導出
  - 第 1 優先: `line.ponoImg` (line に optional でセットされるパス) の basename から拡張子除去
  - 第 2 優先: `panel.ponoImg` から同様に basename 抽出
  - パス末尾と variant 名の **命名乖離に両対応** (フルパス `.../dance_hi.webp` でも variant 名 `dance_hi` 単体でも basename 抽出で `dance_hi` に正規化)
  - 該当無しなら `null` 返却 (= flat にフォールバック)
- `_opApplyLayoutOverride(panel, line)` (~L5276) — **引数 `(panel, line)` を追加**
  - 内部の `applySide(sideKey, side, variantName)` も第 3 引数 `variantName` を追加 (~L5290)
  - `variantName` が指定されていて `side.perVariant[variantName]` が存在すれば、 **flat スロット値の上にマージしてから DOM 適用** (variant 値が flat より優先)
  - `variantName` が無い / `side.perVariant[variantName]` が空 → flat のみ適用 (後方互換)
  - hakase 側は variant 引数を常に `null` で呼ぶ (perVariant 概念無し)

呼び出し箇所 (~L5584 / L5698 / L5795 / L5886):
- 初回 (panel ループ前): `_opApplyLayoutOverride(null, null)` — variant 未確定なので明示 null (cross-review MEDIUM-1 fix)
- narration セグメント表示前: `_opApplyLayoutOverride(panel, null)` — narration panel は dialogue line 無し
- dialogue panel 切替直後: `_opApplyLayoutOverride(panel, null)` — panel 単位の variant (panel.ponoImg)
- **dialogue line ループ内: `_opApplyLayoutOverride(panel, d)`** — line ごとに line.ponoImg で variant が変わるので、 ポーズ切替に追従

### 効果

- editor で 「Panel 4 の `think_arms_crossed_side` だけ右下に詰める」 のような **variant 別 slot 編集** → 「📡 GitHub 配信」 → 全端末で line 切替時に slot 位置・サイズが追従
- hakase 側は flat のみ (perVariant 無し) — hakase はポーズによる位置変化が無い前提
- editor 内部 state は `panel.ponoImgFallback` (variant 名)、 export 時に runtime 用 `panel.ponoImg` (フルパス) に変換される命名乖離があるが、 runtime 側 `_opCurrentPonoVariant` がパスでも variant 名でも両対応するので吸収

### 既知の制約

- pono_001 は legacy editor state (commit `c119c78` 時点) では `perVariant` キーに存在しなかった。 v905 の `migrateFrameIds` に backfill ロジックを追加したので、 既存ユーザの editor を開けば `baseSlot` から自動補完される (= 既存 5 variant への影響なし、 新規 user は defaults で初期化、 既存 user は migrate 経由で 6 variant 揃う)
- editor の各立ち絵編集 UI には現状 `clip-path` の編集 UI が無い (CSS 側 hardcoded)
- 立ち絵 / 対話の bg を **「ユーザー追加フレーム (data: URL)」** にすると `boxImagePath: null` で publish される (data: URL は GitHub に publish しない仕様)

### 既知のリスク / TODO

- editor で立ち絵 / 対話の bg を **「ユーザー追加フレーム (data: URL)」** にすると、 `boxImagePath: null` で publish されてしまい、 runtime で背景なしになる (CSS デフォルトに fallback)。 現状は user-frame は localStorage 内のみで使う運用 (data: URL は GitHub に publish されない仕様)
- 「⟳ 復元」 / 「📂 Import」 / 「📡 GitHub 配信」 で `__op_layout` と `__op_narration` の **整合性が崩れた状態** (例: layout だけ古い / narration だけ古い) は今のところチェックなし。 publish 時に両方同時更新される実装に依存している
- editor の各立ち絵編集 UI には現状 **width / height / 位置 / opacity** はあるが、 `clip-path` の編集 UI が無い (CSS 側で per-VC hardcoded のまま)

## くるみ 13 ポーズ管理機能 (sw v923+ / クロスレビュー C 修正 v924+ / 左ペイン Kurumi サムネ + シナリオ speaker 拡張 v925+ / scenario defaults 同期 v926+ / migrate + export 修正 v927+ / scenario auto migration v929+ / くるみタブ defensive 強化 v930+ / シナリオ行 3 キャラ dropdown v931+ / kurumi.perVariant 13 entries 本格 publish 成立 v932+ / **runtime kurumi CSS 中央アンカー統一 v933+ (editor preview と一致、 publish 値が runtime で初めて editor で見たまま再現)**)

`tools/op-layout-editor.html` を拡張し、 ポノ / 博士に並ぶ **3 番目のキャラ編集タブ「くるみ側」** を追加。 13 variants × 3 VC (B / C / D) で slot 位置・サイズ・透過オフセット等を **per-variant** で個別編集して saved-layout.json に publish できるようにした。 v924 でクロスレビュー C HIGH 3 + MED 4 を修正、 v925 で **左ペインに Kurumi バリエーションサムネ一覧** + **シナリオ行 speaker に「くるみ」追加** を投入し、 ポノとほぼ同等の編集 UI を実現。 v926 で **scenario モードのデフォルトデータ (`defaultScenario()`) を本番 quizland/index.html の OP_PANELS と完全一致** (Panel 1 seg2 を 3 行 emphasis:false / Panel 2 を 3 行で kurumi `kurumi_hi` 挨拶追加 + ポノ「はかせ、くるみちゃん…」 + ponoImg `dance_wave` / Panel 3-4 hakase line に `ponoImg: pono_001` 明示 / Panel 5 を 4 行で kurumi `kurumi_wink` バトンタッチ追加 / Panel 6 両 line に `kurumiImg: kurumi_clasp` 注入)。 v927 で **migrate / export 経路の kurumi 周りバグ 3 件を一括修正** (speaker='kurumi' を hakase に強制変換 / kurumiImg をシリアライズしない / kurumiImg 空値の正規化なし)。 v929 で **scenario state に version 付き auto migration を実装** — `SCENARIO_DATA_VERSION` 定数 + `loadScenario()` の version 不一致判定 + `saveScenario()` の version 埋め込みで、 既存ユーザーも editor リロードだけで自動的に新 defaults へ移行する (DevTools コンソール手順は不要)。 v930 で「くるみ側」タブ切替の defensive 強化 (active class 即時更新 + state.kurumi 欠落時の自動 seed + try/catch wrap)。 **v931 で editor のシナリオ編集モードの各 dialogue 行に「ポノ」「はかせ」「くるみ」 の 3 dropdown を並列追加** — `appendCharImgSelect()` 共通ヘルパ + `HAKASE_VARIANTS` 定数 (現状 1 entry: `owl_professor_guide`、 将来 `owl_professor_explain` 等を追加するだけで dropdown 自動拡張) + `hakasePathByName()` / `hakaseFullPath()` ヘルパ新設 + `migrateScenario` で line.hakaseImg 空値正規化追加 + `buildScenarioPanelsLiteral` で hakaseImg シリアライズ追加 + `SCENARIO_DATA_VERSION` を `'v927'` → `'v930'` に bump (defaults 構造未変更だが line に新フィールドが入る余地が広がったため auto migration 発火) — 各 line で speaker に関係なく 3 キャラの立ち絵 variant を独立に編集可能 (例 Panel 6 のような「kurumi が喋らないが立ち絵 visible」 line を scenario エディタから直接構築可能)。 runtime 側 hakaseImg 対応は **未実装** (HAKASE_VARIANTS が 1 種のみのため切替の余地がなく実害なし、 2 種以上に増やす際の将来タスク)。 (キャラ全般のスペック・全 variants の用途表は [feature_quizland_kurumi.md](feature_quizland_kurumi.md) に集約)

### editor 拡張要素 (v923 → v931 累積)

| 要素 | 内容 |
|---|---|
| `KURUMI_VARIANTS` 定数 (~L1184) | 13 variants 名のリスト (`kurumi_001` / `kurumi_hi` / `kurumi_wave` / `kurumi_hooray` / `kurumi_wink` / `kurumi_clasp` / `kurumi_idea` / `kurumi_point` / `kurumi_calm` / `kurumi_pray` / `kurumi_book` / `kurumi_cheer` / `kurumi_greet`) |
| `kurumiPerVariantDefaults` | 13 variants 全部に per-variant defaults (基準は `kurumi_001` と同値、 後で editor で個別調整) |
| `defaultsFor()` 内 `kurumi` object | B / C / D 別の base slot サイズ (B 280×380 / C 380×520 / D 460×630、 aspect 0.73、 右寄せ) |
| `buildRightPane()` (~L5467-L5469) | くるみ variant ドロップダウン (13 ポーズから選択 → preview 即時切替) |
| **左ペイン Kurumi セクション (v925 追加、 ~L1073-L1077)** | `<div class="section" id="kurumi-section" data-drop="kurumi">` を PONO セクション直後に追加。 `<div id="kurumi-grid" class="preset-grid"></div>` で **13 ポーズのサムネ一覧表示**、 サムネクリックで variant 切替 + perVariant slot 同期 + render。 info 文: 「サムネクリックで現在 VC のくるみ立ち絵を切替（slot 値は variant ごとに保存）」。 **ドラッグ&ドロップは未対応** (kurumi user-added 画像追加機能は未実装) |
| **`makeKurumiThumb(v)` 関数 (v925 追加、 ~L2703)** | `makePonoThumb` を完全踏襲。 thumb クリックで `pushUndoSnapshot('くるみ画像選択')` → `kurumiState.variant = v.name` → `syncFlatFromVariant(kurumiState)` → `save(currentVC)` → `render()` → `buildRightPane()` |
| **`buildPresetGrid()` 内呼び出し (v925、 ~L2766-L2772)** | `KURUMI_VARIANTS.forEach(v => kurumiGrid.appendChild(makeKurumiThumb(v)))` を pono / frame と並べて追加 |
| **`render()` の thumbnail highlight 切替 (v925、 ~L3573)** | `#kurumi-grid .preset-thumb` に対し現 variant の `selected` クラス付与 (pono と同様) |
| `applySideToDom('kurumi')` 分岐 | くるみ側の slot inline style 適用処理 |
| `kurumiPathByName()` ヘルパ | variant 名 → assets パスの解決 |
| `buildRuntimeOpLayout()` | `kurumi: sideSnap(s.kurumi, true)` を追加 (perVariant 込みで publish payload に含める) |
| CSS rule 生成ループ | `['pono', 'hakase']` → **`['pono', 'hakase', 'kurumi']`** の 3 way に拡張 |
| Speaker ラジオ (右ペイン preview) | 「ポノが話す / 博士が話す」 に **「くるみが話す」** を追加 |
| **シナリオ行 speaker (v925 追加、 ~L5151)** | `buildScenarioDialogueLineRow` 内の speaker forEach を `['hakase', 'pono']` → **`['hakase', 'pono', 'kurumi']`** に拡張、 ラベル: ポノ / はかせ / くるみ の 3 way ラジオ。 シナリオエディタから `speaker: 'kurumi'` line を直接追加可能 |
| **`defaultScenario()` (v926 で本番同期、 ~L1339-L1424、 v929 で `version: SCENARIO_DATA_VERSION` を埋め込み)** | 本番 `OP_PANELS` (sw v926 時点) と完全一致する 6 panel デフォルトデータを返す。 Panel 1 seg2: 3 行 emphasis:false。 Panel 2: 3 行 (hakase / **kurumi `kurumi_hi`** / pono `dance_wave`)。 Panel 3 / 4: hakase line に `ponoImg: pono_001` 明示。 Panel 5: 4 行 (hakase / pono / hakase / **kurumi `kurumi_wink`**)。 Panel 6: 両 line に **`kurumiImg: kurumi_clasp` 注入**。 v929 以降は戻り値に `version: SCENARIO_DATA_VERSION` を含み、 `loadScenario()` の version 不一致判定経路で既存ユーザーへも自動反映される (旧来必要だった DevTools コンソールでの localStorage clear 手順は不要) |
| **`migrateScenario()` (v927 で kurumi 強制 hakase 化バグ修正、 ~L1466-L1483)** | 旧: `if (d.speaker !== 'pono' && d.speaker !== 'hakase') d.speaker = 'hakase'` で **kurumi line を save → reload で hakase 化する致命的バグ**。 新: `if (d.speaker !== 'pono' && d.speaker !== 'hakase' && d.speaker !== 'kurumi') d.speaker = 'hakase'` の 3-way 判定に修正、 kurumi line も保持される。 同時に **`kurumiImg` 空値正規化** を追加 (空文字 / 非文字列なら delete、 renderer 側で意図しない立ち絵 visibility が起きないように) |
| **`buildScenarioPanelsLiteral()` (v927 で kurumi export 対応、 ~L6231-L6238 / ~L6281-L6297)** | 旧: speaker 判定 2-way (`(d.speaker === 'pono') ? 'pono' : 'hakase'`) で **kurumi line も hakase に化けて export**。 + kurumiImg をシリアライズせず Panel 6 の立ち絵注入が消えていた。 新: **`kurumiFullPath()` ヘルパー新設** (basename / フルパスどちらでも variant 名を抽出 → `KURUMI_VARIANTS` から path 解決、 未知名は `kurumi_001` fallback で 404 回避) + speaker 判定を 3-way に拡張 + `d.kurumiImg` あれば `kurumiImg: '<full path>'` を行内シリアライズ。 ponoImg / kurumiImg が同一 line に共存するケース (Panel 6) も対応 |
| `migrateFrameIds` | 既存 editor state に kurumi seed を backfill + perVariant 13 ポーズを backfill |
| **mirror mode は kurumi 対象外** | mirror モード（左右反転して片方の編集を反映）は pono ⇄ hakase の 2 者間のみ。 くるみは独立 overlay なので対象外 (mirror 関数冒頭で `'kurumi'` の場合は無条件 skip、 ~L1649) |
| **`SCENARIO_DATA_VERSION` 定数 (v929 追加、 v931 / v937 で bump、 ~L1250)** | **`'v937'` (v937 時点)** (`'v930'` → `'v937'`)。 `defaultScenario()` の構造を変えたら bump する単一の真実。 v931 では defaults 構造自体は未変更だが line に hakaseImg / kurumiImg 等の新フィールドが入る余地が広がったため auto migration を発火させる目的で bump、 v937 では Panel 3 / 4 各 line に `kurumiImg: kurumi_clasp` を注入する defaults 構造変更のため bump (既存ユーザーへも auto migration で反映) |
| **`loadScenario()` の version check (v929 追加、 ~L1534-L1546)** | localStorage から読んだ state の `parsed.version` が現行 `SCENARIO_DATA_VERSION` と不一致なら、 saved state を破棄して `defaultScenario()` を返す (= 自動 migration)。 console.log で `'<old> → <new>'` を表示 |
| **`saveScenario()` の version embed (v929 追加、 ~L1554-L1564)** | 保存時に `Object.assign({}, state.scenario, { version: SCENARIO_DATA_VERSION })` で必ず最新 version を上書きしてから JSON.stringify。 import 経由などで version 欠落のまま入っても次回 save で揃う |
| **`HAKASE_VARIANTS` 定数 (v931 追加、 ~L1205)** | はかせ立ち絵の variant リスト。 現状 1 entry のみ: `[{ name: 'owl_professor_guide', path: '../assets/images/quizland/owl_professor_guide.webp' }]`。 将来 `owl_professor_explain` 等を追加するだけで scenario dropdown が自動拡張される設計 (forEach で `<option>` 生成)。 `HAKASE_VARIANT_NAMES = HAKASE_VARIANTS.map(v => v.name)` も同時定義 |
| **`hakasePathByName(name)` ヘルパ (v931 追加、 ~L3255)** | basename → assets フルパス解決。 `HAKASE_VARIANTS.find(x => x.name === name)` で検索、 未知名は `HAKASE_VARIANTS[0].path` fallback。 pono / kurumi の同名ヘルパと完全に同パターン |
| **`hakaseFullPath(input)` ヘルパ (v931 追加、 ~L6381)** | `buildScenarioPanelsLiteral` 用の export ヘルパ。 basename / フルパス / 拡張子付き basename いずれの input でも variant 名抽出 → `HAKASE_VARIANTS` から path 解決、 未知名は `HAKASE_VARIANTS[0].path` fallback。 ponoFullPath / kurumiFullPath と同パターン |
| **`appendCharImgSelect(opts)` 共通ヘルパ (v931 追加、 ~L5270)** | `buildScenarioDialogueLineRow` 内で `line.ponoImg` / `line.hakaseImg` / `line.kurumiImg` の 3 dropdown を生成する共通 builder。 引数 `opts = { label, variants, currentName, onChange, fallbackName }`。 forEach で `<option>` 生成、 select の onchange で各 line の対応フィールドを更新。 3 キャラで重複していたビルダーロジックを 1 関数に集約 |
| **シナリオ行 dialogue line 3 dropdown (v931 追加、 ~L5303-L5345)** | `buildScenarioDialogueLineRow` 内、 既存ポノ dropdown の下に 「はかせの表情/ポーズ」 「くるみの表情/ポーズ」 dropdown を追加。 **speaker に関係なく常時 3 dropdown が表示**され、 各 line で 3 キャラの立ち絵 variant を独立に編集可能。 内部 state では `line.ponoImg` / `line.hakaseImg` / `line.kurumiImg` を basename (例 `'dance_hi'` / `'owl_professor_guide'` / `'kurumi_hi'`) で保持 |
| **`migrateScenario` に hakaseImg 空値正規化 (v931 追加、 ~L1480-L1495)** | `kurumiImg` と同パターン、 `line.hakaseImg` が空文字 / 非文字列なら delete。 renderer 側で意図しない立ち絵切替が起きないように |
| **`buildScenarioPanelsLiteral` に hakaseImg シリアライズ (v931 追加、 ~L6452-L6456)** | line に `d.hakaseImg` があれば `hakaseImg: '<full path>'` を行内シリアライズ (basename → `hakaseFullPath()` でフルパス化)。 runtime はまだ hakaseImg を読まない (HAKASE_VARIANTS が 1 種のみのため実害なし) が、 export スキーマを 3 キャラで揃えて将来拡張に備える |

### v924 クロスレビュー C 修正 (HIGH 3 + MEDIUM 4)

v923 投入直後にクロスレビュー C で指摘された 7 件の不具合を v924 で一括修正:

- **HIGH-1 (propagateMirror に kurumi ガード)**: mirror モードで pono ⇄ hakase 反映時に kurumi も巻き込まれて values が消える事象を修正、 `propagateMirror` 冒頭で `currentTab === 'kurumi'` を無条件 skip
- **HIGH-2 (editor preview に op-side-overlay クラス + CSS で production と同位置)**: editor preview の `<div class="op-side op-side-kurumi">` に `op-side-overlay` クラスを追加 + CSS で本番と同等の absolute レイヤー化 (`.op-sides > .op-side.op-side-overlay { flex: none; position: absolute; ... }`)、 editor で見る kurumi の位置 = 本番位置の parity を確立
- **HIGH-3 (importNarrationJsonFromFile に ent.kurumi 分岐)**: JSON Import 時に kurumi の slot/perVariant が読み捨てられていた事象を修正、 `ent.kurumi` の存在チェックを追加して state にマージ
- **MED-1 (scenario preview text + speaker label 3 way)**: scenario プレビューの speaker 表示に 'くるみ' ラベル追加 (~L5398)、 dialogueBox の class toggle も 3 way 対応 (`speakerSide === 'kurumi'`)
- **MED-2 (scenario preview line.kurumiImg → 画像/slot 反映)**: シナリオ行に `kurumiImg` がセットされている line を preview したとき、 `op-char-kurumi` の src と slot 位置を反映
- **MED-4 (onFrameAspectLoaded を kurumi 対応 + frame removal cleanup)**: frame アスペクト変更時の slot 再計算ロジックを kurumi にも拡張、 frame 削除時の inline style cleanup も対称に
- **MED-5 (height/box guides を kurumi 対応)**: stage 上の height/box ガイドラインに kurumi 用色 (`#fb923c` 橙) を追加、 視覚区別

### バグ修正（v923 同時投入）

- `ponoPerVariantDefaults` の **`dance_wave` 漏れ** を修正 (line 1697)。 v905 拡張時に backfill リストから漏れていたため、 既存 editor で `dance_wave` だけ defaults が空のまま読まれる事象を解消

### editor タブ表示モード制限 (元からの仕様、 v925 で明文化)

editor の「くるみ側」タブ (および pono / hakase タブ) は **「対話 (P2-6)」モードでのみ表示** される。 「ナレ」「シナリオ」モードでは tab-bar 全体が `display: none` になる:

```css
/* tools/op-layout-editor.html ~L659-L667 */
#right.is-narration .speaker-row,
#right.is-narration .mirror-row,
#right.is-narration .tab-bar { display: none; }
#right.is-scenario .speaker-row,
#right.is-scenario .mirror-row,
#right.is-scenario .tab-bar { display: none; }
```

これは元からの仕様 (pono / hakase でも同じ)、 シナリオモードでは tab-bar 全体が隠れて各 line で speaker 選択する流れになるため。 kurumi も同パターンに従う。 **「対話モード以外で『くるみ側』タブが見えない」 のはバグではなく仕様**。 ナレ / シナリオモードで kurumi の slot 編集をしたい場合は一旦「対話 (P2-6)」モードに切替えて編集 → モードを戻す。

### saved-layout.json 連携 (v923 スキーマ拡張 → v932 B kurumi 実値 publish → v933 runtime CSS アンカー統一 → v934 同値再 export の無変更 publish → v935 C/D 側にも hakase + kurumi 実値 publish 開始 → v936 「全ポーズに反映」 ボタンの初実用 publish (3 VC × 12-13 variants 一括同期、 70 entries diff) → **v937 (現行) Panel 3/4 継続表示 仕様変更 + B kurumi base box 微調整 (3 entries diff)**)

- `__op_layout.{B,C,D}.kurumi.perVariant` は **13 entries** で配信中 (v923 で 1 entry → 13 entries にスキーマ拡張)
- v932 で **B のみ** 13 entries が初期値 (`kurumi_001` 値全コピー) から editor 編集後の個別調整値に更新済: 元データ `D:\ポノのおへや\Dr.owl'quiz\op-layout-2026-05-11-06-18-47.json` (ローカル editor で位置調整 → Export) を Claude エージェントが merge。 `quizland/saved-layout.json` の top-level 220 keys 完全温存 (`q72`, `q83`, `__chip_text_overrides` 等の per-question overrides + `__op_narration` 等は touch せず)
- **v933 で runtime kurumi CSS の per-VC `.op-char-slot` を中央アンカー (`left:50% + transform:translate(-50%,-50%)`) に統一**したことにより、 ここに格納した slot 値 (`slotW` / `slotH` / `slotOffsetX` / `slotOffsetY`) が runtime で **editor preview と同じ位置に再現**されるようになった (v932 までは runtime CSS が `right: 0` 右端アンカーだったため、 同じ JSON 値でも runtime では editor preview と最大 ~400px 右にずれていた致命バグ)。 saved-layout.json は無変更、 直したのは「JSON 値の解釈側 (= runtime CSS)」だけ
- v934 はユーザー誤指定で **`op-layout-2026-05-11-06-41-51.json` (v932 と同値の Export) を再 merge した実質無変更 publish** (sw.js だけバンプ、 saved-layout.json `__op_layout` 中身は v933 から差分なし)
- v935 (06-49-00 Export を merge) で初めて C / D 側にも実値が流し込まれた (kurumi flat + perVariant + hakase 含めて 12 entries diff): **B** = `kurumi_clasp` の slotH 354→320 / slotOffsetY 0→19。 **C** = `hakase.slotOffsetX` 0→-27 + `kurumi.slotOffsetX` 0→158 + `kurumi_001` perVariant も同期。 **D** = `hakase.slotOffsetX` -362→-142 + `kurumi.slotH` 489→413 / `slotOffsetX` 654→158 + `kurumi_001` perVariant も同期
- v936 (07-22-05 Export を merge) で editor 「全ポーズに反映」 ボタンの初実用 publish が成立 (deep diff 70 entries 全て kurumi.perVariant のみ、 pono / hakase / singleBox / narration は差分ゼロ): **B (22 entries)** = 13 variants 全部の `slotOffsetX=77 / slotOffsetY=19` に統一 (v935 までは 54〜88 / 0/19/-4 が分散していたものをフラット化)。 **C (12 entries)** = `kurumi_001` 以外の 12 variants の `slotOffsetX` 0→158 (kurumi_001 と完全一致)。 **D (36 entries)** = `kurumi_001` 以外の 12 variants の `slotW: 280→550 / slotH: 380→413 / slotOffsetX: 0→158` 一括統一 (kurumi_001 と完全一致)。 「VC ごとに 1 variant を詰めたら 13 variants 全部に反映」 という新運用パターンが editor → JSON Export → Claude 反映まで往復成立
- **v937 (現行、 07-31-53 Export を merge + Panel 3/4 仕様変更)**: 「kurumi は Panel 2 で登場したら Panel 6 まで継続表示」 をプロジェクト方針として確定し、 `quizland/index.html` の `OP_PANELS` Panel 3 / 4 の各 line に `kurumiImg: '../assets/images/characters/kurumi/dance/kurumi_clasp.webp'` を注入 (計 4 line)、 `tools/op-layout-editor.html` の `defaultScenario()` Panel 3 / 4 にも `kurumiImg: 'kurumi_clasp'` を同期反映、 `SCENARIO_DATA_VERSION` を `'v930'` → `'v937'` に bump して既存ユーザー auto migration。 **saved-layout.json deep diff は 3 entries のみ** (B kurumi の base box 微調整): `B.kurumi.slotH` 320→303 / `B.kurumi.perVariant.kurumi_001.slotW` 280→227 / `B.kurumi.perVariant.kurumi_001.slotH` 278→269。 C / D は変更なし、 pono / hakase / singleBox / narration も差分ゼロ。 220 keys + kurumi.perVariant 13 entries 全 VC 完全温存
- v937 時点の実値スナップショット: **B = 13 variants 全部 `slotOffsetX=77 / slotOffsetY=19` 統一、 slotW は `kurumi_001=227 (v937 で 280→227)` / 他 12 variants=280、 slotH は `kurumi_001=269 (v937 で 278→269)` / 他 12 variants は 295〜380 でポーズ高さ別 / C = 13 variants 全部 `slotOffsetX=158 / slotW=280 / slotH=380` 統一、 hakase は `slotOffsetX=-27` 実値化 / D = 13 variants 全部 `slotW=550 / slotH=413 / slotOffsetX=158` 統一、 hakase は `slotOffsetX=-142` 実値化**。 全 variant `slotAspect='fixed_0.73'` / `objectPosition='bottom'` で統一
- **配信フローは [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md) で確定運用化** — ローカル editor の 「対話 (P2-6)」 モードで 「くるみ側」 タブ または 左ペイン Kurumi サムネ一覧から variant 選択 → slot ドラッグ調整 (必要なら 「全ポーズに反映」 ボタンで perVariant 13 entries 一括同期) → ヘッダの **「📥 Export → JSON ファイル」** で JSON ダウンロード → `D:\ポノのおへや\Dr.owl'quiz\` に保存 → ファイル名を Claude に伝える → Claude エージェントが saved-layout.json `__op_layout` のみ merge (他 219 keys 完全温存) + sw.js bump + post-commit hook で auto push → develop → staging で全端末反映 → ユーザー明示時のみ master merge で production
- **「📡 配信」 ボタン (sw v906/v907 で staging origin 限定実装) は廃止扱い、 今後一切話題にしない方針** (ユーザー明示)
- editor 側のコード変更は v931 で大半完了、 「全ポーズに反映」 ボタンは v936 直前 task で追加、 v937 では editor `defaultScenario()` Panel 3/4 の各 line に `kurumiImg: 'kurumi_clasp'` を追加 + `SCENARIO_DATA_VERSION` を bump (v932 / v934 / v935 / v936 は editor 完成済 Export 経路をそのまま使った publish イベント、 v933 は runtime quizland/index.html の per-VC `.op-char-slot` CSS 3 箇所のみ修正、 v937 は runtime OP_PANELS データ + editor defaultScenario + SCENARIO_DATA_VERSION の同期更新)

### 効果

- editor で 「Panel 6 の `kurumi_clasp` だけもう少し下に配置する」 「Panel 5 の `kurumi_wink` を小さめに」 のような **OP 内で実際に使う variant の per-VC 微調整** を全端末配信可能
- 残り 10 variants (`wave` / `hooray` / `idea` / `point` / `calm` / `pray` / `book` / `cheer` / `greet`) は OP 内では未使用だが、 将来クイズ本編 (正解時 hooray、 ヒント idea 等) で variant 演出を追加するときに editor 側のインフラが既に揃った状態
- v925 の **左ペイン Kurumi サムネ一覧** によりポノと同じ感覚で variant 選択ができ、 右ペインのドロップダウンより視覚的に高速 (13 ポーズを一覧視認)
- v925 の **シナリオ行 speaker 3 way 拡張** によりシナリオエディタから `speaker: 'kurumi'` line を直接追加できるようになり、 OP_PANELS の手動編集なしに kurumi のセリフを生成可能

### v926 修正: defaultScenario() を本番 OP_PANELS と完全同期

editor の scenario モードで初期表示されるシナリオデータ (`defaultScenario()`、 `tools/op-layout-editor.html` ~L1339-L1424) が、 sw v921-v925 の段階で本番 `quizland/index.html` の `OP_PANELS` から大きく乖離していた問題を v926 で解消。 全 6 panel を runtime と完全一致させた:

- **Panel 1 (narration)**: seg2 を 3 行・全行 emphasis:false に修正 (本番の最終状態 「赤強調全廃 + 3 行構成」 と一致)
- **Panel 2 (dialogue)**: 旧 2 行 (hakase / pono) → 新 **3 行** (hakase / **★kurumi**「こんにちは、ポノさん！」 ponoImg `pono_001` + **kurumiImg `kurumi_hi`** / pono **「はかせ、くるみちゃん、あそびに きたよ！」** ponoImg `dance_wave`)
- **Panel 3 / 4 (dialogue)**: hakase line に **`ponoImg: 'pono_001'` を明示** (本番と一致、 中身の台詞は同じ)
- **Panel 5 (dialogue)**: 旧 2 行 → 新 **4 行** (hakase / pono / **★hakase** 「くるみよ、いつもどおり なぞなぞを おねがいするぞ」 / **★kurumi** 「はーい、まかせて！」 ponoImg `pono_001` + **kurumiImg `kurumi_wink`**)
- **Panel 6 (dialogue)**: 2 行は据置、 ただし **両 line に `kurumiImg: 'kurumi_clasp'` を注入** して立ち絵 visible 維持の本番挙動と一致させた

**v929 以前の補足**: かつては defaultScenario() の更新が **新規ユーザー (= localStorage に scenario state が無いユーザー)** にしか反映されず、 既に編集経験のあるユーザーは `localStorage['pono.opLayoutEditor.v1.scenario']` に古い state が残っているため reload しても古いデータのまま見えていた。 v929 で **`SCENARIO_DATA_VERSION` 定数による version 付き auto migration** を導入したため、 既存ユーザーも editor をリロードした瞬間に新 defaults へ自動移行する (DevTools 手順は不要)。 詳細は次節「v929 修正: scenario state の version 付き auto migration」を参照。

### v927 修正: scenario migrate / export を kurumi 対応

v926 で defaults を同期した直後に発覚した **migrate / export 経路の kurumi 対応漏れ 3 件** を v927 で一括修正:

#### A. `migrateScenario()` の kurumi 強制 hakase 化バグ (`tools/op-layout-editor.html` ~L1466-L1472)

旧コード:

```js
if (d.speaker !== 'pono' && d.speaker !== 'hakase') d.speaker = 'hakase';
```

→ kurumi line (`speaker: 'kurumi'`) を save → reload した瞬間に **強制的に 'hakase' に化ける致命的バグ**。 v925 でシナリオ行 speaker に「くるみ」が追加された後も migration がそれを valid と認識していなかった。

新コード:

```js
if (d.speaker !== 'pono' && d.speaker !== 'hakase' && d.speaker !== 'kurumi') {
  d.speaker = 'hakase';
}
```

→ kurumi も valid speaker として保持される。 過去の migration で hakase 化されてしまった既存 state は v929 の auto migration (`SCENARIO_DATA_VERSION` 不一致経由) で自動的に defaults へリセットされ、 v927 のバグ修正後の正しい構成に揃う。

#### B. `kurumiImg` 空値正規化 (`tools/op-layout-editor.html` ~L1478-L1483)

`d.kurumiImg` が **空文字列** や **非文字列** で残っているケース (renderer 側は line.kurumiImg の有無で kurumi 立ち絵 visibility を判定) に対し、 migrate 時に delete してフォーマットを揃える処理を追加:

```js
if (d.kurumiImg != null && (typeof d.kurumiImg !== 'string' || !d.kurumiImg)) {
  delete d.kurumiImg;
}
```

→ 空値が残ることで意図せず立ち絵が出る / 出ないリスクを排除。

#### C. `buildScenarioPanelsLiteral()` の kurumi export 対応 (`tools/op-layout-editor.html` ~L6231-L6238 / ~L6281-L6297)

editor の `📋 JSON のみクリップボード` (= `buildScenarioPanelsLiteral()`) で本番 `OP_PANELS` 配列の JS リテラルを生成して export するロジックの 2 つの不具合を修正:

1. **speaker 判定 2-way → 3-way**: 旧 `(d.speaker === 'pono') ? 'pono' : 'hakase'` で kurumi line も hakase に化けて export → 新 `(d.speaker === 'pono' || d.speaker === 'kurumi') ? d.speaker : 'hakase'`
2. **`kurumiFullPath()` ヘルパー新設 + `kurumiImg` シリアライズ追加**: ponoImg と同じ規約で basename / フルパスのいずれでも variant 名抽出 → `KURUMI_VARIANTS` から path 解決、 未知名は `kurumi_001` fallback。 line に `d.kurumiImg` があれば `kurumiImg: '<full path>'` を行内シリアライズ。 ponoImg と kurumiImg は同一 line に共存可 (Panel 6 のように)

これにより editor で編集した kurumi line + Panel 6 の立ち絵注入が export → 本番 OP_PANELS への手動反映で完全に保たれるようになった。

### v929 修正: scenario state の version 付き auto migration

v926 で `defaultScenario()` を本番 OP_PANELS と同期して以降、 「**既存ユーザーは localStorage に古い saved state が残っているため、 editor をリロードしても新 defaults が反映されない**」 という運用課題があった (= 旧来は DevTools コンソールで手動 `localStorage.removeItem('pono.opLayoutEditor.v1.scenario')` → reload が必要)。 v929 で **scenario state にスキーマ version を持たせて自動 migration する仕組み**を導入し、 この課題を恒久解消した。

実装は `tools/op-layout-editor.html` 内の以下 4 箇所 (v931 時点の現行値で記載):

1. **`SCENARIO_DATA_VERSION` 定数** (~L1250): 現行値 **`'v937'`** (v931 で `'v927'` → `'v930'`、 v937 で `'v930'` → `'v937'` に bump、 v937 では Panel 3 / 4 各 line に `kurumiImg: kurumi_clasp` を注入する defaults 構造変更のため bump)。 `defaultScenario()` の構造または line に入る可能性のあるフィールド構成が変わったら bump する単一の真実
2. **`defaultScenario()`** (~L1370 周辺): 戻り値の object に `version: SCENARIO_DATA_VERSION` を埋め込み
3. **`loadScenario()` の version check** (~L1534-L1546): `localStorage[SCENARIO_STORAGE_KEY]` から読んだ object の `parsed.version !== SCENARIO_DATA_VERSION` なら、 saved state を **強制的に捨てて `defaultScenario()` を返す**。 不一致時は console.log で `'<old> → <new>'` を表示。 一致時のみ `migrateScenario(parsed)` を実行
4. **`saveScenario()` の version embed** (~L1554-L1564): 保存時に `Object.assign({}, state.scenario, { version: SCENARIO_DATA_VERSION })` で必ず最新 version を上書きしてから JSON.stringify。 import 経由などで version 欠落のまま state が入った場合も、 1 回保存すれば次回 load で正しく一致判定される

これにより、 **既存ユーザーは editor をリロードするだけで自動的に新 defaults へ移行**する。 影響範囲は **scenario state のみ** で、 layout state (slot 値、 frame 設定、 dropped assets 等) や narration state (`pono.opNarration.runtime.{B,C,D}`) は **別キー管理のため一切 touch されない**。

**運用上の注意**:

- 個別カスタマイズ (= editor で手編集した scenario の line) は version 不一致時に消える。 シナリオを手編集している場合は事前に「📋 シナリオ (OP_PANELS) クリップボード」 で export してバックアップを取る運用が必要
- `SCENARIO_DATA_VERSION` を bump するタイミング: `defaultScenario()` の panel 構成 / line 順 / speaker 構成を変えたとき。 純粋にテキストだけ修正する場合は bump 不要 (saved state を温存したいケース)
- v927 以前に保存した scenario state には、 過去の `migrateScenario` の **kurumi → hakase 強制変換バグ** によって `speaker: 'hakase'` に化けてしまっている line が含まれている可能性があったが、 v929 の auto migration によりそうした state も `version` 不一致でリセットされ、 v927 のバグ修正後の defaults に揃う

## editor ヘッダ整理 (sw v906+): 3 ドロップダウン化 + ローカル/production で配信非表示

editor ヘッダに散在していた **17 個のボタン** (Export/Import/配信系で命名揺れ・並び順がバラバラ) を **HTML5 `<details>` ベースの 3 ドロップダウン** に集約 (2026-05-09)。 旧ボタン群は削除し、 関数本体は変更せず **wire のみ新 ID (`dd-*`) に再 bind** することでリスクを最小化。

### ドロップダウン構造

| ドロップダウン | 内訳 | 旧 ID → 新 ID |
|---|---|---|
| 📥 **Export ▾** | クリップボードへ全部 (CSS+JSON) / CSS ファイル (.css) / JSON ファイル (.json、 立ち絵+対話+ナレ全 variant) / シナリオ (OP_PANELS) クリップボード | `btn-export` 系 4 個 + `btn-export-narration-json` を統合 |
| 📤 **Import ▾** | JSON ファイルから取り込み (旧 narration-only 形式も読込可) | `btn-import-narration-json` を統合 |
| 📡 **配信 ▾** | GitHub 配信 / GitHub から復元 | `btn-publish-narration` + `btn-restore-narration` を統合 |

### 削除した旧ボタン (計 8 個)

- `btn-export-clipboard` (📋 クリップボードへ全部)
- `btn-export-css` (📄 CSS ファイル)
- `btn-export-json` (📄 全 layout JSON)
- `btn-export-scenario` (📜 シナリオ)
- `btn-export-narration-json` (💾 NA Export)
- `btn-import-narration-json` (📂 NA Import)
- `btn-publish-narration` (📡 GitHub 配信)
- `btn-restore-narration` (⟳ 復元)

### ドロップダウン挙動

- HTML5 `<details>` + `<summary>` ベース (= JS 不要で開閉)
- `header details.hdr-dd` を全部集めて `toggle` イベントで **相互排他** (1 つ開いたら他は close)
- `document.click` で外クリック検出 → 開いている dropdown を close (`details.contains(e.target)` で内側クリックは除外)

### `isStagingOrigin()`: 配信ドロップダウンを staging 限定で表示

旧実装は **denylist 方式** (`hostname === 'localhost'` 等を弾く) だったため、 production (`pono.kodama-no-mori.com`) で配信ボタンが見えてしまい、 押すと `GH_BRANCH='develop'` hardcode で develop ブランチに書き込まれて **意図しない反映** が起きる事故リスクがあった。 また `172.*` の startsWith over-exclusion (172.16-31 のみ RFC1918 だが全 172.x が拒否) や `::1` IPv6 loopback の漏れもあった。

これらをまとめて解消するため **allowlist 方式** に転換:

```js
const isStagingOrigin = () => {
  try {
    return window.location.hostname === 'pono-asobiba-staging.ndw.workers.dev';
  } catch (e) {
    return false;
  }
};
if (!isStagingOrigin()) {
  document.getElementById('dd-publish').style.display = 'none';
}
```

これで配信ドロップダウンが見えるのは staging origin **1 つだけ**。 ローカル開発 (file:// / localhost / 127.x / 192.168.x / 10.x / 172.x / ::1) も production も全て非表示で、 誤配信ガードが完成した。

#### Cross-review HIGH/MEDIUM fixes (allowlist 化で同時解消)

- **HIGH-1**: production で配信ボタンが見える → 非表示
- **HIGH-2**: `172.*` startsWith over-exclusion (172.0-15 / 172.32-255 を誤って拒否) → allowlist で無効化
- **MEDIUM-1**: `::1` IPv6 loopback 漏れ (旧 denylist で取りこぼし) → allowlist で無効化

### 設計指針

- **関数本体は無変更**: `exportCopy` / `download('css')` / `exportNarrationJson` / `exportScenario` / `importNarrationJsonFromFile` / `publishNarrationToSavedLayout` / `restoreNarrationFromSavedLayout` などは旧コードのまま。 `_bindDd(id, fn)` ヘルパで新 ID にだけ wire し直す。 これでリスクを「ボタン整理」のみに局所化
- **`<details>` 採用理由**: ライブラリレス (純 JS / 純 HTML) で aria 対応もブラウザ任せ。 子供向け教育 PWA でランタイム JS を増やさないポリシーに合致
- **production 非表示の運用 (歴史的経緯)**: 旧来は配信を **staging editor からのみ** 行う設計 (staging で publish → develop ブランチに書き込み → Cloudflare Workers が develop を配信 → 全端末反映、 production からは「見たいだけ」 で配信禁止)。 **ただし sw v936 時点で「📡 配信」 ボタンは運用上廃止されており、 現在の確定運用フローは [reference_op_layout_publish_workflow.md](reference_op_layout_publish_workflow.md) に記載の「ローカル editor → 📥 Export → JSON ファイル → Claude エージェントで反映」 経路のみ**。 staging origin 限定ガードのコード自体は残っているが、 ボタンを使う運用は廃止扱い、 Claude は今後一切この経路を提案しないこと
- **横展開予定**: 同じ「3 ドロップダウン + allowlist で staging 限定」 パターンは他ゲーム editor (zukan / character-builder / maze) にも適用可能

### 効果

- 旧来の **17 ボタン横並びで命名揺れ** (📋 / 📄 / 📜 / 💾 / 📂 / 📡 / ⟳ が混在) を解消、 視覚的に階層化されて UI 把握が早い
- production 誤配信ガード (HIGH-1) が allowlist 化で副作用ゼロで解消
- ローカル editor で「存在意義が無い」配信ボタン (どうせ /api/gh/ proxy が届かない) を排除して UX 統一

## 4 バグ即時修正 (sw v908+): 赤文字 / 改行崩れ / 立ち絵消失 / race

ユーザーが staging editor + 本番 OP cinematic で再現報告した 4 つの異常を一気に潰した修正セット。 全て 「ハードリロード or panel 切替で結果が揺れる」 という症状で共通原因は **inline style の race + 前 panel 残留値**。

### 症状 (それぞれ独立に再現)

1. **ナレーション赤文字**: 起動条件によって narration の文字色がたまに赤や別色になる (= 正しくは CSS デフォルト `#3a2a14` ダークブラウン)
2. **改行崩れ**: ナレーション本文の `\n` が無視されて 1 行で詰まる panel がある (= 正しくは `pre-wrap` で改行保持)
3. **立ち絵消失**: panel/line 切替時にポノ or 博士の立ち絵が一瞬 0×0 や画面外に飛ぶ (= 前 panel が書いた `width/height/aspectRatio/transform/objectPosition` が新 src のキー欠損で残留)
4. **race による不安定性**: ハードリロード直後に OP cinematic が走ると `window._currentLayoutData` が未ロードのまま `_opLoadLayoutOverride` が呼ばれて全 override が CSS フォールバックする (= リロードのたびに違う見た目)

### 原因

既存実装は **「対称な reset → set」 ではなく 「set だけ」 で済ませていた**。 結果:

- `narrEl.style.color` / `whiteSpace` は inline 解除をしないため、 別 script (拡張機能 / theme / 旧コード) が一度書き込むと CSS の `.op-narration { color: #3a2a14 }` が打ち負ける
- `applySide` は新 src の slotW/slotH/slotAspect/transform が `undefined` だと前 panel の値を残す (= 「変更しない = 引き継ぐ」 になっていた)
- `playOpeningCinematic` 開始時に `LayoutSystem.init` の async fetch 完了を待つ仕組みが無く、 「先に走った OP が saved-layout を見られない」 シナリオが race で発生

### 修正 (Fix 1〜4 + minor)

- **Fix 1 (赤文字解消)**: `_opApplyNarrationOverride` 冒頭で `narrEl.style.color = ''` リセット → CSS デフォルト確定。 cleanup の finally 配列にも `'color'` 追加で replay 時もリーク無し
- **Fix 2 (改行崩れ解消)**: `narrEl.style.whiteSpace = 'pre-wrap'` を inline で確定 (CSS race を受けない) + cleanup に `'whiteSpace'` 追加
- **Fix 3 (立ち絵消失解消)**: `applySide` の **冒頭で必ず** `slot.style.width/height/aspectRatio/transform = ''` + `img.style.objectPosition = ''` をリセットしてから新値を当てる。 新 src がキーを持たない場合は `''` のまま CSS デフォルト (`@media` で 4:5 等) に着地。 slotAspect が `'fixed_*'` / `'free'` 以外の sentinel 値の場合も同じく CSS デフォルト fallback (コードコメント明示)
- **Fix 4 (race 解消)**: `playOpeningCinematic` 冒頭で `window._currentLayoutData?.__op_layout` 未ロードを検出したら `fetch('./saved-layout.json?_=' + Date.now(), { cache: 'no-store' })` で**同期取得**してから panel ループへ。 `cache: 'no-store'` + timestamp で CDN/browser cache 両方を bust。 取得失敗時は `console.warn` で debug 容易性を確保しつつ silent fallback (= CSS デフォルト) で既存挙動を維持

### Cross-review note (HIGH 2 件残存、 実害最小)

- Fix 3 の slotAspect: `'fixed_*'` / `'free'` 以外の文字列 (例: `'auto'` や想定外値) が来たときは inline 解除のまま **CSS デフォルト fallback**。 実態として saved-layout.json は 2 値しか書かないので onset 確率ゼロだが、 将来 sentinel 増やすときに気付けるようコードコメント追記
- Fix 4 の二重 fetch: LayoutSystem 側でも `saved-layout.json` を取りに行くため、 起動時に最大 2 回 fetch される可能性。 `cache: 'no-store'` だが 2KB 程度なので帯域影響限定 → 許容

### 副次効果

- **ハードリロードしても挙動が安定**: race を guard した結果、 「リロードのたびに違う」 を再現不能化
- **全シナリオで同じ結果**: editor staging / 本番 cinematic / replay (将来追加予定) が同じ override で再現
- **inline style の対称パターン化**: 「reset → set」 が `_opApplyNarrationOverride` / `applySide` / cleanup の 3 経路で揃ったため、 今後の override フィールド追加がパターン適用だけで済む

### 教訓

- **inline style は CSS デフォルトに対する追加** ではなく、 **独立した上書きレイヤー** として扱うべき。 「set した側が責任を持って reset する」 を関数境界で徹底
- **async init の race は同期 fetch + cache: 'no-store' で潰す**。 `await` を 1 行追加するだけで一貫性が出る (今回は 50ms 程度の追加遅延、 子供向け PWA で許容範囲)

## ローカル editor 純化 + クリップボード Export 追加 (sw v909+)

ローカル editor を「**編集 + Export 専用**」に純化し、 saved-layout.json への書き込みは
**orchestrator (AI) 経由に統一**する設計。 ローカル localStorage が外部 JSON で踏み潰される
経路を物理消滅させ、 ローカル → staging を完全片道に。

### Phase 1: ローカル origin で 📂 Import ドロップダウンを物理 DOM 非表示

- `isServerOrigin()` を新設 (allowlist 方式、 アロー関数で `isStagingOrigin` と style 統一):
  - `staging` (`pono-asobiba-staging.ndw.workers.dev`)
  - `production` (`pono.kodama-no-mori.com`)
  - 上記 2 つだけ true、 他 (= ローカル: `file://` / `localhost` / `127.x` / RFC1918 私有 IP / `::1`) は false
- `!isServerOrigin()` のとき `#dd-import` を `display: none` で隠す
- 物理 DOM 非表示 = ローカル localStorage への外部 JSON 注入 UI を完全に塞ぐ
- DevTools console から `document.getElementById('dd-import').style.display=''` で復活可
  (コードコメントで明示、 デバッグ余地は残す)

### Phase 2: 📋 JSON のみクリップボードコピーを Export に追加

- 新ボタン `#dd-export-json-clip` を `#dd-export` ドロップダウン内に追加
  ラベル: 「📋 JSON のみクリップボード (チャット貼付け用)」
- 新関数 `exportLayoutJsonToClipboard()`:
  - `pono-op-layout-v1` schema (Import 側と完全一致)
  - `layout.{B,C,D}` に `buildRuntimeOpLayout(vc)` を入れる (= 立ち絵 + 対話 + ナレ全 variant)
  - `JSON.stringify(payload, null, 2)` を `navigator.clipboard.writeText` でコピー
  - 成功時 toast に文字数表示、 失敗時 err toast (clipboard API 不可環境対策)

### Cross-review fix (HIGH-1)

- `isServerOrigin` を `function` 宣言ではなくアロー関数 (`const isServerOrigin = () => { ... }`)
  に統一 → 直前で定義済の `isStagingOrigin` (アロー) と style 整合、 strict mode で hoist
  順序を意識せずに済む

### ワークフロー (新)

```
ローカル editor で編集
  ↓ 📋 (or 📄 JSON ファイル) で 1 クリック
クリップボード or ダウンロード JSON
  ↓ チャット貼付け or ファイルパス共有
orchestrator (AI) が saved-layout.json マージ
  ↓ commit + post-commit hook で auto push
develop ブランチ → staging に自動反映
  ↓ ユーザー明示「本番に反映して」
master merge (二段階確認後) → production
```

### 設計上の不変条件

- **ローカル → サーバへの逆同期経路は無し**: orchestrator は `saved-layout.json` だけを
  触り、 ローカル端末の localStorage には**触れない** (= 触りようが無い)
- **ローカル localStorage は editor のテンポラリ作業領域のみ**: Export して AI に渡すまでの
  下書き
- **本番反映は二段階確認**: orchestrator が勝手に master merge することは絶対に無い

### 効果

- ローカル localStorage が外部 JSON で破壊される経路が物理消滅
- editor を試しにいじりたい新人にも安全 (Import で誤って他人の作業を上書きできない)
- AI 経由のアップロードフローが「コピー → 貼付け → 任せる」 の 3 ステップに圧縮

## Skip / Cancel semantics

- スキップボタン押下 → 即時：
  1. `_opCancelled = true`
  2. `_opActiveAudio.pause()`
  3. `PonoBabble.cancelAll()`
  4. 進行中の `_opTypeInto` ループは次の `tick()` で `_opCancelled` を見て resolve
  5. 200ms ポーリング interval も `finish()` を呼んで wait-promise 解放
  6. `playOpeningCinematic` の `finally` で overlay を hidden に戻し `_opRunning = false`
