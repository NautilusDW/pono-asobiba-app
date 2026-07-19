# Codex フォローアップ指示文書: maze エンカウンターモーダル + 旗あげボタン (BLOCKER 修正 + 任意改善)

作成日: 2026-06-12
前段 commit: `795181c Polish maze encounter and flag button UI`
クロスレビュー結果: タスク B/C は仕様通り、 タスク A に BLOCKER 1 件 + 軽微残課題

---

## 🔴 BLOCKER: タスク A 主目的 (PNG キャラ拡大) が未達成

### 問題
`_triggerEncounter` 内で `<img>` 生成時に JS インラインスタイル `_img.style.height = '1em'; _img.style.maxWidth = '1.6em';` が書かれており、 これが新 CSS `.enc-creature img { height: clamp(120px, 28vh, 200px); max-width: min(72vw, 280px); }` を **優先度で上書き**。

### 影響
PNG スプライト系 **6 種** (kabuto / hachi / hatahata / amenbo / strengthRock / kumo) でキャラが旧サイズ (1em ≈ 16px 相当) のまま表示される。 emoji フォールバック系 (mayoi / odoke / pyon) のみ大きく表示。 タスク A の主目的「キャラを主役に大きく」 が半分の虫で達成できていない。

### 対象箇所
[maze/index.html:4997-4999](../../maze/index.html#L4997-L4999) (commit 795181c 時点。 行番号は ±5 程度ずれる可能性あり):

```js
_img.style.height = '1em';
_img.style.width = 'auto';
_img.style.maxWidth = '1.6em';
```

### 修正
上記 3 行 (height / width / maxWidth のインラインスタイル設定) を **すべて削除**。 CSS の `.enc-creature img` セレクタが適切なサイズを制御するので、 JS 側でインラインスタイルを設定する必要はない。 残す行: `_img.style.display = 'block';` のみ (もし無ければ追加。 inline 要素の baseline ズレ防止)。

### 検証方法
1. ステージ 4 で hatahata エンカウンター → モーダルでハタハタムシが画像サイズ 120-200px 程度で大きく表示されること
2. ステージ 6 で hatahata / hachi / kabuto を順に発火 → 全 PNG キャラが大きく表示
3. mayoi (emoji フォールバック) も従来通り大きく表示されていること
4. 縦画面 / 横画面の両方で確認

---

## 🟡 任意改善 (UX レビュアー指摘、 余裕があれば対応)

### 1. flag-white ボタンの輪郭視認性
**問題**: `.flag-white` の `border: 3px solid #D7C9AD` が背景 `#FFF8F0` に対して WCAG AA コントラスト未達の可能性。 P型/D型色覚で消えやすい。

**修正**: `.flag-controls .flag-white` の border-color を `#D7C9AD` → **`#B5A080`** に変更。 輪郭を強くして判別性を上げる。

### 2. iOS click 300ms 遅延で ripple フィードバックが遅れる
**問題**: `pointerdown` で `is-pressing` クラスが即付与されるが、 `is-rippling` は `click` で付与されるため iOS のダブルタップズーム判定で最大 300ms 遅延する場合がある。

**修正**: `.flag-controls` に **`touch-action: manipulation;`** を追加。 既存 CSS の `.flag-controls { display: flex; ... }` ブロック内に 1 行追加するだけ。

### 3. encStartBtn の order 未設定で初期表示一瞬チラつき可能性
**問題**: `#encStartBtn` (HTML line 2364 付近) が `.enc-left` の子で `order` 指定なし → `order: 0` (default) → `order: 1` の `.enc-creature` より前に来る可能性。 encPop アニメ 0.35s 中に上端に flash する懸念。

**修正**: HTML `<button id="encStartBtn">` に **`style="order: 4;"`** を追加 (または CSS で `#encStartBtn { order: 4; }`)。

### 4. 低背 landscape でのキャラ・吹き出し圧縮規則が `.is-janken` 限定
**問題**: `@media (max-height: 430px)` 内のサイズ縮小規則が `.is-janken` (じゃんけんモーダル) にしか適用されていない。 他のエンカウンター紹介で iPhone SE landscape (height 375px) 時に start ボタンが見切れる可能性。

**修正**: `@media (max-height: 430px)` ブロックに以下を追加:
```css
.encounter-modal:not(.is-janken) .enc-creature img {
  height: clamp(72px, 24dvh, 120px);
}
.encounter-modal:not(.is-janken) .enc-dialog {
  max-height: 18dvh;
  font-size: clamp(0.78rem, 1.8vw, 0.95rem);
}
```

---

## 🟠 重要: working tree の クモの巣 Canvas リライト 分離

### 状況
commit `795181c` 後に Codex が続けて maze/index.html に **クモの巣ミニゲームを Canvas ベースに全面リライト** する変更を加え、 working tree に未 commit (約 860 行 / 647 insertions + 213 deletions) で残っている。 内容: `.web-strand` DOM 要素を `<canvas id="webSweepCanvas">` + `_webSweepPointer` + `_resizeWebSweepCanvas` + `_webSweepRafId` の RAF ループに置換。

### 指示
**これは別 batch 作業として独立させる**。 今回の BLOCKER 修正と一緒に commit しないこと。

### 手順 (推奨)
```bash
# 1. クモの巣 Canvas 変更を一旦退避
cd d:/AppDevelopment/pono-asobiba-app
git stash push -m "kumo-canvas-rewrite-wip" -- maze/index.html

# 2. BLOCKER + (任意) UX 改善を適用
# (Edit maze/index.html, 上記の各修正を反映)
# (Edit sw.js, CACHE_VERSION を現状から +1)

# 3. 確認・コミット
git diff
git add maze/index.html sw.js
git commit -m "Fix maze encounter modal PNG character sizing"

# 4. デプロイ
wrangler deploy --env staging

# 5. クモの巣 Canvas 変更を復帰 (次の batch で別 commit に)
git stash pop
# このあと、 クモの巣 Canvas リライトは別のブリーフ + 別 commit として扱う
```

注意: `git stash pop` 後に conflict があれば、 手で解決すること (BLOCKER 修正と kumo 変更は別領域なので通常 conflict は起きないはず)。

---

## ✅ 受け入れ条件

1. **BLOCKER 修正**: PNG キャラ 6 種 (kabuto/hachi/hatahata/amenbo/strengthRock/kumo) のエンカウンターでキャラ画像が **clamp(120px, 28vh, 200px)** 程度の大きさで表示される
2. **任意改善 1-4 は対応した分だけ完了とする** (全部やる必要はないが、 1 と 2 は推奨)
3. **クモの巣 Canvas リライトが今回の commit に含まれていない** (`git stash` で退避済み or 別 commit で着地)
4. **sw.js CACHE_VERSION bump** (現状値から +1、 コメント例: `// vNNNN: maze encounter modal PNG character sizing fix`)
5. **staging で hatahata / hachi / kabuto / amenbo / strengthRock / kumo / mayoi / odoke / pyon の 9 種すべてのエンカウンターを 1 回ずつ確認**
