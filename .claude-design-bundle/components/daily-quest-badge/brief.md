# Brand Kit Brief: daily-quest-badge

> このファイルは Claude Design (Pono LP Brand Kit) 上で並列生成するための仕様書。 生成対象は **play.html の daily-gacha-entry (ガチャ入口カプセル) の右上に重ねる お題バッジ PNG 3 種**。 既存 `assets/ui/gacha/daily_gacha_capsule_closed_pink.png` の温かい木+紙+毛糸トーンを踏襲しつつ、 子供が直感的に 「⭐ = いいこと / やってね」 と感じる手描きスターを焼き込む。 morito が採用案を選定 → Claude Code が `assets/ui/gacha/badges/` に保存 → play.html / play.css の overlay positioning → sw.js バンプ → push の流れ。

---

## 用途と文脈 (Pono のあそびば内での役割)

- **配置先**: play.html ホーム画面の daily-gacha-entry (ガチャ入口カプセル、 390×120 推奨幅、 既存 PNG `daily_gacha_capsule_closed_pink.png`)
- **役割**: ガチャに「お題 (daily quest)」 状態を可視化するオーバーレイバッジ。 状態 3 種で見た目を切り替えてプレイヤーに **「今日やることがある / 達成した / ボーナス中」** を一瞬で伝える
- **頻度**: 子供 3-6 歳のセッション開始時に毎回視界に入る。 文字を読まなくても状態が分かることが必須
- **アニメ可否**: 静止 PNG のみ生成 (※ 画像生成自体は GPT Image 2 を使用、 ここでの CSS keyframe 記載は生成後の実装側アニメ後処理 — 画像のコード描画代用ではない)

---

## 含めるアセット一覧

3 種の PNG を 1 セットで生成する。 すべて **96×96 px (Retina 想定で 192×192 px @2x も推奨)、 透過 PNG、 アルファチャンネル必須**。

| ファイル名 | 用途 | 状態 | アート要素 |
| --- | --- | --- | --- |
| `daily_quest_badge_pending.png` | お題未達成 (恒常表示) | デフォルト | 手描き⭐ + 周囲にキラキラ点 4-6 個 (静止だが「動きそう」 余白) |
| `daily_quest_badge_done.png` | 達成直後 (0.8 秒だけ表示) | 祝祭 | 金色⭐ + 紙吹雪パーティクル (赤/緑/黄/水色 系の小片) |
| `daily_quest_badge_bonus.png` | ボーナス中 (24h 表示) | 訴求 | ⭐ + 「ボーナス！」 のクラフト紙吹き出し風 (右下に小さく) |

- **すべて 96×96 px (1x)、 192×192 px (@2x)**
- **透過 PNG** (背景なし、 アルファチャンネル必須)
- 中央付近に主役⭐を配置し、 周囲 12-16 px は安全余白 (カプセル右上の角丸食い込み時にクリップされないため)

---

## アートディレクション (色・トーン・既存 Brand Kit との整合)

### 既存 Brand Kit 一貫性 (必読)

- **基調**: Pono LP / play.html 既存の **温かい木調 + 紙 + 毛糸** のクラフト感
- **色**:
  - ⭐ ベース: 温かい山吹/黄土 (`#E8B85C` 〜 `#D9A340` 系、 真鍮 NG)
  - ⭐ 縁取り: 焦茶 (`#5D4E37` 系、 hero-labels と同系)
  - done 版の金: 山吹寄りの暖色金 (`#F2C94C` 〜 `#E8B85C`、 メタリックは禁止)
  - bonus 版の吹き出し: クラフト紙ベージュ (`#E8D9BD` 〜 `#D9C4A0`、 hero-labels と同調)
  - パーティクル/キラキラ: pastel kawaii (淡赤 `#F7B7A3` / 淡緑 `#C8D9A0` / 淡黄 `#F7DCA0` / 淡水 `#A8D0D9`)
- **質感**:
  - 水彩のにじみ + 鉛筆の薄い縁取りで手描き感を出す
  - 紙繊維のごく淡いテクスチャ可 (hero-labels と同等)
  - メタリック / グラデのギラギラ / 蛍光ネオン は **禁止**
- **NG**:
  - emoji 風の単色フラット⭐ (✩ / ★ 直接の貼り付け)
  - ベクター icon 然とした硬い線
  - 真鍮 / メタリック / クロム表現
  - 大人向けゲームの 「報酬」 感 (パチンコ / ソシャゲ風のキラギラ)

### 子供 3-6 歳ターゲットの直感性

- 「⭐ = いいこと / やったらいい」 を 0.3 秒で理解させる
- 文字は最小限 (bonus 版の 「ボーナス！」 のみ可、 字はひらがな or カタカナ、 焦茶手書き調)
- 笑顔 / 顔の描き込みは禁止 (Pono / ハリネズミ等のキャラ顔は本体側のみ)

### 既存カプセル PNG との並び

採用後に隣接表示される既存 `daily_gacha_capsule_closed_pink.png` (ピンク系カプセル) の上に重ねる。 ピンクと黄/金⭐の色差で目立たせるが、 ピンクを殺さない (バッジは右上 48-56 px 程度の小サイズで運用)。 採用前に Claude Design 上で **カプセル PNG とのモックアップ重ね** を 1 枚見せるとベスト。

---

## 配置先 / 利用シーン

- **配置先 (実装側)**: `assets/ui/gacha/badges/` に保存 (新規ディレクトリ作成)
- **表示位置**: daily-gacha-entry (390×120 推奨幅、 絶対配置 absolute) の **右上隅から内側に -8px / -8px 食い込ませる**
- **表示サイズ**: 48-56 px (1x)、 Retina で 96-112 px
- **状態遷移**:
  - 初期表示: `pending` (お題未達成、 恒常表示)
  - お題達成イベント発火時: `done` を 0.8 秒だけフェードイン → fadeOut
  - 24h ボーナス期間中: `bonus` を恒常表示 (pending を上書き)
- **アニメ (実装側 CSS)**:
  - pending: subtle bounce (周囲キラキラに合わせて 2s ループ)
  - done: scale 0.8→1.2→1.0 + opacity 0→1→0 (0.8 秒)
  - bonus: 静止 (吹き出しが揺れる程度の軽い rotate ±2°)

---

## 禁止事項 (絶対やらない)

- **SVG / Canvas / CSS / PIL / 手書きベクター での代用は禁止** — PNG ラスター生成のみ
- **MCP (higgsfield / fal-ai) で Claude Code が直接生成するのは禁止** — 必ず Claude Design (Pono LP Brand Kit) 経由
- **emoji 直接埋め込み (⭐ / ✨ / 🎉 を画像化しただけ) は禁止** — 手描き水彩+鉛筆縁取りで描き起こす
- **メタリック金 / 真鍮 / クロム表現は禁止** — 暖色山吹で代替
- **蛍光 / ネオン色は禁止** — Brand Kit パステル枠内で発色
- **キャラクター (ポノ / ハリネズミ / 顔表情) の描画は禁止** — ⭐とパーティクルのみ
- **背景色付き出力は禁止** — 透過 PNG のみ
- **「お金 / 取引 / 通貨」 を連想させる金貨・コイン・$ マークは禁止** — ⭐は「やったらいい気持ち」 の象徴に留める

---

## 参考 (既存 assets/ui/gacha/* との並びを意識)

- 既存 PNG: `assets/ui/gacha/daily_gacha_capsule_closed_pink.png` (ピンク系カプセル) — このバッジが右上に重なる
- 既存トーン参考: `.claude-design-bundle/components/hero-labels/` (`ongaku.png` `puzzle.png` 等のクラフト紙質感)
- ⭐モチーフ参考: hero-labels に既存⭐モチーフは無いため新規。 手描き水彩+鉛筆縁取りの方向で新規起こし
- **採用後の隣接 PNG (絶対サイズ感)**: バッジは カプセル幅 390px に対して 48-56px (約 13-14%) の小サイズで運用するため、 96×96 内に主役⭐がしっかり読めるよう **中央 60-70 px に⭐本体を集約** すること

---

## 出力形式

- **透明背景 PNG** (アルファチャンネル必須)
- **1x (96×96) + Retina @2x (192×192) の 2 枚 1 セット**
- **合計 6 PNG** (3 状態 × 2 解像度) を Claude Design からエクスポート
- ファイル名 (確定):
  - `daily_quest_badge_pending.png` / `daily_quest_badge_pending@2x.png`
  - `daily_quest_badge_done.png` / `daily_quest_badge_done@2x.png`
  - `daily_quest_badge_bonus.png` / `daily_quest_badge_bonus@2x.png`
- **配置先**: `d:/AppDevelopment/pono-asobiba-app/assets/ui/gacha/badges/`
- **ファイル名のリネーム禁止**: 実装側 CSS / JS は上記ファイル名前提

---

## ステータス: WAITING FOR CLAUDE DESIGN
