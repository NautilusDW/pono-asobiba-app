# Codex 指示文書: maze エンカウンターモーダル + 旗あげボタン UI 改修

作成日: 2026-06-12
対象ブランチ: develop
配信: Cloudflare Workers (`wrangler deploy --env staging` → https://pono-asobiba-staging.ndw.workers.dev/)

## 改修対象ファイル
- `d:\AppDevelopment\pono-asobiba-app\maze\index.html`
- `d:\AppDevelopment\pono-asobiba-app\sw.js` (CACHE_VERSION bump)

---

## タスク A: エンカウンター紹介モーダルのバランス改善

### 現状 (問題点)
- HTML: [maze/index.html:2326-2337](../../maze/index.html#L2326-L2337) の `#encModal > .enc-card > .enc-left + .enc-stage` 構造
- CSS: [maze/index.html:708-811](../../maze/index.html#L708-L811)
  - `.enc-card` は 2 列 grid (`minmax(160px, 42%) 1fr`)、 左にキャラ+名前+台詞、 右に「○○ で あそぶ ▶」ボタン
  - `.enc-creature img` が `height: 1em; max-width: 1.6em` 固定で、 縦画面では `clamp(2.6rem, 12vw, 4rem)` まで縮小 → **キャラが極小**
  - `.enc-btn.primary` が `width: 100%` (親 `.enc-stage` 全幅) → **ボタンだけ巨大、 横長**
  - 台詞 `.enc-dialog` が左列下に押し込められて読みづらい

### 改修要件
1. **レイアウトを 1 列縦積みに変更**:
   - `.enc-card { grid-template-columns: 1fr; row-gap: 14px; }` で 1 列化
   - 上から: キャラ画像 (大) → 吹き出し付き台詞 → 名前 (小) → 「○○ で あそぶ ▶」ボタン
2. **キャラ画像を大きく**:
   - `.enc-creature img { height: clamp(120px, 28vh, 200px); max-width: none; width: auto; }` 程度
   - `img` の親 `.enc-creature` の `font-size` 固定指定 (`clamp(3.6rem...)`) を撤去し、 子 `img` に直接 px 指定
   - 既存 `encWiggle` アニメは維持 (キャラの可愛さ要素)
3. **吹き出しスタイルで台詞を表示**:
   - 既存 `.voice` CSS パターン ([maze/index.html:236-257](../../maze/index.html#L236-L257)) を流用
   - `.enc-dialog` に `background: #FFFAE6; border: 2px solid #F5C842; border-radius: 18px; padding: 12px 18px; position: relative;` を追加
   - `::after` で下向きの三角テールを作り、 キャラ画像の口元から出ているように見せる (キャラの下から吹き出しが出る形)
4. **「○○ で あそぶ ▶」 ボタンを小さく**:
   - `.enc-btn.primary { width: auto; padding: 10px 28px; align-self: center; }` で **コンテンツ幅 + 中央寄せ**
   - `font-size` は現状の `clamp(0.9rem, 2.2vw, 1.05rem)` 維持
5. **適用対象は全 9 種類の虫** (CREATURE_KIND_DATA、 [maze/index.html:3756-3811](../../maze/index.html#L3756-L3811)):
   - mayoi (まよいムシ / janken)
   - odoke (おどけムシ / truefalse)
   - pyon (ぴょんぴょんムシ / simon)
   - kabuto (コツコツムシ / silhouette)
   - hachi (ブンブンムシ / oddone)
   - hatahata (ハタハタムシ / flag)
   - amenbo (アメンボムシ / water_bridge)
   - strengthRock (おもい いわ / strength_push)
   - kumo (クモムシ / web_sweep) ※ imageUrl 無いので emoji フォールバック残す
6. **CSS の縦画面フォールバック** ([maze/index.html:2003-2025](../../maze/index.html#L2003-L2025)) を整理 — 新レイアウトでは元々 1 列なので冗長な小さくする指定を削除

### 受け入れ条件
- [ ] スクリーンショットの 9 種すべてでキャラが画面の主役 (画像高さ 120-200px)
- [ ] 台詞が吹き出し形状で、 キャラの下に位置
- [ ] 「○○ で あそぶ ▶」 ボタンが台詞より小さく、 内容幅 + 中央寄せ
- [ ] 既存 `encWiggle` キャラ揺れアニメは維持
- [ ] モバイル (375px) でも横はみ出さず、 タブレット/PC (1024px+) でもバランス維持

---

## タスク B: 旗あげミニゲームの 赤/白 ボタンを円形化 + 押下フィードバック

### 現状
- HTML: [maze/index.html:6007-6049](../../maze/index.html#L6007-L6049) `_showFlagGame()` で動的生成
  - `.flag-controls` 内に `<button class="enc-btn flag-red" data-flag="red">あか</button>` と `<button class="enc-btn flag-white" data-flag="white">しろ</button>`
- CSS: [maze/index.html:1102-1119](../../maze/index.html#L1102-L1119)
  - `.flag-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }`
  - `.flag-controls .enc-btn { min-height: 54px; font-size: clamp(1.1rem, 2.8vw, 1.45rem); border-radius: 14px; }` — **横長 pill 状**
  - `.flag-red` は `linear-gradient(135deg, #E94E4E, #FF8A7A)` の赤
  - `.flag-white` は `linear-gradient(135deg, #FFFFFF, #F3E8D5)` + `border: 3px solid #D7C9AD`
- 既存 `:active { transform: scale(0.95); }` ([maze/index.html:810](../../maze/index.html#L810)) — フィードバックは控えめ
- JS ハンドラ: `_onFlagTap(flag)` ([maze/index.html:6045-6090](../../maze/index.html#L6045-L6090))
- 効果音: 正解 `correct.mp3` / ミス `不正解.mp3` (volume 0.45)

### 改修要件
1. **ボタンを完全な円形に**:
   - `.flag-controls .enc-btn` に `width: clamp(96px, 22vw, 132px); height: clamp(96px, 22vw, 132px); border-radius: 50%; padding: 0;` を追加
   - `.flag-controls` の grid を `display: flex; justify-content: center; gap: clamp(28px, 8vw, 56px); margin-top: 12px;` に変更
2. **文字 (「あか」「しろ」) を削除**:
   - HTML: `<button>あか</button>` → `<button aria-label="赤"></button>` (a11y のため aria-label のみ残す)
   - CSS: 既存 `font-size` 指定を撤去
3. **押下フィードバック (3 段重ね)**:
   - **a) スケール強化**: `.flag-controls .enc-btn:active { transform: scale(0.88); transition: transform 0.06s ease-out; }`
   - **b) リング波及 (ripple)**: `::after` 擬似要素で押下時に半透明白リングを 0→1.6x に拡張、 0.45s で fade out。 `@keyframes flagBtnRipple` を追加
   - **c) インナーシャドウ**: 押下中だけ `box-shadow: inset 0 6px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15);` でへこんだ感を演出
4. **既存色とグラデは維持** (.flag-red の赤、 .flag-white の白+ベージュ枠)
5. **モバイル 1843-1845 行の override** ([maze/index.html:1843-1845](../../maze/index.html#L1843-L1845)) も円形を保つよう調整
6. **タッチ領域確保**: ボタン外側に `padding` ではなく `outline` 透明領域で 12-16px 拡張 (誤タップ防止)

### 受け入れ条件
- [ ] 赤・白ボタンが完全な円形 (modern button feel)
- [ ] 文字なし、 色だけで判別可能
- [ ] タップ瞬間に 「scale-down + 白リング波及 + インナーシャドウ」 の 3 重フィードバックが連動
- [ ] 既存 `correct.mp3` / `不正解.mp3` SE は変更なし (連動を保つ)
- [ ] a11y: `aria-label="赤"` / `aria-label="白"` を維持
- [ ] iPhone SE (320px 幅) でも 2 つの円ボタンが横並びで収まる

---

## タスク C: 必須付随作業

1. **sw.js CACHE_VERSION bump**: 現状値から +1、 コメントは `// vNNNN: maze encounter modal balance + flag buttons circular with press feedback` 等
2. **動作確認**:
   - エンカウンターは 9 種すべてのスクショ確認 (デプロイ後ステージ 1-7 を順に進める)
   - 旗あげミニゲームはステージ 4 / ステージ 6 で hatahata で実行可

---

## 制約・注意事項
- 既存の `encPop` / `encWiggle` キャラアニメ ([maze/index.html:778付近](../../maze/index.html#L778)) は維持
- `_triggerEncounter` / `_creatureData` / `_gameForCreature` の **JS ロジックは変更不要** (HTML 構造の change と CSS の up は十分)
- `_showFlagGame` の JS ロジックは変更不要 (HTML テンプレートと CSS のみ)
- 子供向けタッチで誤タップ防止 — 円ボタン同士は最小 28px 以上離す
- ボタン色のコントラスト比 (WCAG AA) は維持

---

## 完了後の流れ
1. `git diff` で差分を確認
2. develop ブランチに commit (auto-commit hook で自動 commit される設定)
3. `wrangler deploy --env staging` で staging 配信
4. staging URL で stage 6 を進めて hatahata エンカウンター → 旗あげミニゲームの両方を実機確認
