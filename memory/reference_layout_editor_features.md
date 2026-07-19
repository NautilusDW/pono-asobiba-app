# reference_layout_editor_features.md

quizland editor (`?edit=1`) と editor 内 Playtest mode (`🧪 Playtest ON`) の挙動マトリクス。

## バージョン履歴

### v801 (Playtest UI 追加)
- editor toolbar に `🧪 Playtest` トグルボタンを追加
- ON のとき以下が動くようにした:
  - 全 169 問の巡回 (前へ・次へ・ジャンプ)
  - コメント / スクショ保存 (GitHub に PR)
  - ⏭ 次の問題ボタン
- 同時に chip pointerdown / 吹き出しクリックの editor ガードを
  `_isEditMode() && !isPlaytestInEditor()` に変更し、
  Playtest ON で「答え判定」 もできるようにしてしまった (これが裏目)。

### v816 (chip 選択優先に revert)
- 報告: 「Playtest ON にすると chip クリックで editor 選択が出ない」
- 原因: chip pointerdown / 吹き出し click が Playtest ON で先に発火し、
  layout-editor 側の click 選択ハンドラが取り逃がされていた。
- 修正: 該当 2 callsite を「editor mode なら常に抑止」 に戻した:
  - `quizland/index.html` line ~3387 (chip pointerdown)
  - `quizland/index.html` line ~2602 (char-hint-bubble click)

## 現在の挙動マトリクス (v816 以降)

| 操作 | editor (Playtest OFF) | editor + Playtest ON | 通常プレイ |
|------|----------------------|---------------------|-----------|
| chip クリック | editor 選択 | **editor 選択** (v816 で戻した) | 答え判定 |
| 吹き出しクリック | editor 選択 | **editor 選択** (v816 で戻した) | ヒント2表示 |
| HUD ボタン | 抑止 | 抑止 | 通常動作 |
| 結果画面のリトライ | 抑止 | 抑止 | 通常動作 |
| ⏭ 次の問題 (toolbar) | 動く | 動く + コメント保存 | (UI なし) |
| 前へ/次へ (debug nav) | 抑止 | 動く + コメント保存 | (UI なし。 ?debug=all で出る) |
| ジャンプ select | 抑止 | 動く + コメント保存 | (UI なし) |
| capture / 添付 | 抑止 | 動く | (UI なし) |

## editor + Playtest ON のユースケース

1. layout-editor で chip / stage 画像 / 吹き出し位置を整える
2. 🧪 Playtest ON で問題を巡回しながらコメントを残す (GitHub PR)
3. 答え判定の確認は **通常プレイ (?edit=1 を外す)** で行う

「Playtest 中に答えたい」 ニーズが出たら、 別途 Alt+Click や 1/2/3/4 キーで
答える別 UI を追加することを検討する。

## 触ってはいけない `isPlaytestInEditor()` callsite

下記は editor + Playtest ON で動かす設計。 v816 でも維持すること:

- `nextQuestion` 内の `_qzPtSaveCurrentNote` 呼出 (line 3595 付近)
- `updateDebugNav` (line 3793 付近)
- `_qzDebugGoto` (line 3817-3818 付近)
- `_qzPtSaveCurrentNote` 自体 (line 4085 付近)
- capture / 添付 button handler (line 4211, 4217 付近)
- debug-prev / debug-next / jump select handler (line 4247, 4253, 4281 付近)
