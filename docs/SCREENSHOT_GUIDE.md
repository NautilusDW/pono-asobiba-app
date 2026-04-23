# スクショ素材 差し替え手順

無料ユーザー向けのプロモモーダル（絵本層ゲームの宣伝）で使うスクショの置き場と、
差し替え後のキャッシュ更新フロー。

---

## 1. 配置先と命名規則

すべて `assets/images/previews/` に PNG で配置する。

| ゲーム | ファイル名 | 枚数 |
|---|---|---|
| もじかきクエスト | `writing_1.png` / `writing_2.png` / `writing_3.png` | **3** |
| おえかき       | `drawing_1.png` / `drawing_2.png`   | 2 |
| みちつなぎ      | `slide_1.png` / `slide_2.png`       | 2 |
| ボウリング      | `bowling_1.png` / `bowling_2.png`   | 2 |
| ブロックくずし   | `breakout_1.png` / `breakout_2.png` | 2 |

合計 **11 枚**。

### ストレッチ用（間に合えば）

MVP 公開後、わたしのおうち / すいぞくかん を絵本層に開放する際に追加予定:

| ゲーム | ファイル名 | 枚数 |
|---|---|---|
| わたしのおうち | `room_1.png` / `room_2.png`   | 2 |
| すいぞくかん  | `aquarium_1.png` / `aquarium_2.png` | 2 |

---

## 2. 推奨スペック

- 比率: 4:3 または 16:9（横長）。モーダルは最大 320px 幅 / 36vh 高で表示
- 解像度: 長辺 **1200px** 推奨（Retina 相当、貼付後も劣化しない）
- フォーマット: PNG、圧縮後 300-500KB 以内が目安
- 内容:
  - ゲームの**一番キャッチーな瞬間**（キャラの顔見せ / 成功体験 / かわいい絵面）
  - 複数枚の場合は「①導入 ②遊んでいる ③ごほうび」のようなストーリー性があると効く
  - UI の隠し要素（管理ボタン等）は写さない

---

## 3. 差し替え後の手順

1. `assets/images/previews/` に上記のファイル名で保存
2. [sw.js](../sw.js) の `CACHE_VERSION` を 1 つ上げる
   ```js
   const CACHE_VERSION = 368;  // ← +1
   ```
3. `wrangler dev` でローカル確認:
   ```sh
   wrangler dev
   ```
   play.html を開いて無料状態で「もじかきクエスト」カードをタップ → プロモモーダルで実画像が表示されることを確認
4. 本番デプロイ (ユーザー作業):
   ```sh
   wrangler deploy
   ```

---

## 4. 未貼付時の挙動（確認用）

画像が存在しない場合、[common/promo.js](../common/promo.js) の `makePlaceholderImage()` が
Canvas で「カード色 + ゲーム名」のダミー画像を生成してフォールバック表示する。
貼付後は `onerror` ハンドラが外れて実画像が優先される。

---

## 5. モーダル挙動の確認

DevTools Console で直接呼び出して確認できる:

```js
// 無料状態で play.html 上から
PonoPromo.showLockedPreview('card-writing');
```

- 画像が 2 枚以上ある場合、1.8 秒ごとに自動切替 + インジケータ dots 表示
- auto-close 時間は画像枚数に応じて自動調整（1.8s × 枚数 + 1.5s）
- 1 枚または未貼付時は 5 秒で閉じる

---

## 6. 運用 Tips

- **親向け FAQ**: 「かせきはっくつ」を一時的に近日公開扱いにしたため、既存プレイヤーからの問い合わせがあるかも。更新情報のアナウンス準備を推奨
- **絵本印字前の localStorage クリア**: テスト端末で `localStorage.removeItem('pono_premium')` を実行してから印刷パスワードを検証すること。既存フラグが残っていると解錠確認にならない
- **複数絵本対応**: 絵本シリーズを増やすときは [common/tier.js](../common/tier.js) の `BOOK_PASSWORDS` 配列に追記するだけで済む
