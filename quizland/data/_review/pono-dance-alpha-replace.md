# Pono Dance Alpha Replacement Report

実施日: 2026-05-03
作業者: Claude Code (Opus 4.7)

`assets/images/characters/pono/dance/` 配下の 10 枚を、`D:\ポノのおへや\PONO_dance\` のアルファチャンネル付き版に差し替えた。

## Mapping (10 files matched)

| Destination | Source | Pose Description |
|---|---|---|
| dance_cheer.png | pono_01_003.png | 目を閉じて満面の笑み、両手を上げて片足前に踏み出すダイナミックなポーズ |
| dance_cool.png | pono_01_012.png | 腕を組んでにやり、半身に立つ（クール） |
| dance_hi.png | Pono_dance04_001.png | 両手を真横に大きく広げ、口を開けて笑う正面立ち |
| dance_hooray.png | Pono_dance_03_001.png | 両手を真上に V 字、目を開けて口を大きく開けた歓喜 |
| dance_point.png | pono_01_006.png | 右手で前方を指差し、口を開けて笑う |
| dance_shy.png | pono_01_011.png | 両手を顎の前で組み、はにかんだ笑み |
| dance_smile.png | Pono_dance02_010.png | 目を閉じた満面の笑み、片足前に踏み出した歩きポーズ |
| dance_tilt.png | Pono_dance02_001.png | 両手を斜め下に広げ、控えめな笑顔（バランス取り） |
| dance_walk.png | pono_01_009.png | 横向き、リラックスした小さな笑顔で歩いている |
| dance_wave.png | Pono_dance04_004.png | 右手を上げてバイバイ／応援、控えめな口開け笑顔 |

## Files NOT clearly matched (if any)

None. 10 件すべて元のポーズと視覚的に強く一致するソースが見つかった。

ただし以下は注意点として記録:
- `dance_wave` は元ファイル（口開け+片手挙げ）に対し、`pono_01_004`（同口開け+片手挙げだが歩きステップ）と `Pono_dance04_004`（小さく口開け+片手挙げ+立ち）の 2 候補があり、立ち姿に近い `Pono_dance04_004` を選択。
- `dance_walk` はサイドビュー歩きが多数候補あり（`Pono_dance_03_009/010`, `pono_01_009`, `Pono_dance04_010/011`）。元の dance_walk の向き（やや右向き）に最も近い `pono_01_009` を選択。

## Alpha impact assessment

すべての参照箇所は `<img>` タグ または `new Image() + .src` 経由での DOM 描画。canvas drawImage で不透明前提の合成をしている箇所は無し。アルファチャンネル付きへの差し替えは全箇所で安全。

| Usage location | Display method | Alpha OK? | Notes |
|---|---|---|---|
| maze/index.html | `<img>` タグ | 〇 | 単純表示 |
| bento/index.html | `<img id="complete-pono-big">` および JS で img.src にセット → DOM 表示 | 〇 | 結果ダイアログのアバター |
| oto/index.html | プリロード配列（後続で `<img>` または DOM 表示） | 〇 | 透過で背景が透けるのは想定通り |
| play-all.html | `<img class="greet-pono">` | 〇 | 挨拶アイコン |
| writing/index.html | `<img class="pono-deco">` および JS で `.src` ローテ | 〇 | 装飾＋応援表示 |
| fossil/index.html | `<img>` タグ + showCharBubble 経由 | 〇 | `new Image()` は宣言のみ、drawImage 未使用 |
| admin/index.html | アセット一覧の `<img src>` | 〇 | 管理画面プレビュー |
| _tmp_fossil_js.js | tmp ファイル（参照のみ） | 〇 | 残骸ファイル、影響なし |

懸念事項: なし。すべて HTML/CSS の通常レイヤーに乗るため、透過部分はその時の親背景がそのまま見える挙動になる（既存の不透明白背景表示と比べて自然になり、むしろ改善）。

## sw.js

- Before: `CACHE_VERSION = 695`
- After: `CACHE_VERSION = 696`

## Cleanup

- ソースフォルダ `D:\ポノのおへや\PONO_dance\` はリポジトリ外（プロジェクト外の素材置き場）のため、元ファイルはそのまま保持。クリーンアップ不要。
- 差し替え後の dest ファイルは 10 件すべて 240–400 KB（アルファチャンネル付きで自然なサイズ）。

## 知見活用

過去ログより、画像差し替え時は (1) 全参照箇所の表示方法（`<img>` か canvas か CSS background か）を grep で確認、(2) sw.js の CACHE_VERSION バンプ、の 2 点を必ず行う運用が確立されている。今回もこの手順を踏襲し、canvas drawImage の存在チェックまで行ったうえで安全と判断した。
