# KawaGlint: UI/ポノ配置修正 + 奥行き演出 + 図鑑UI 実装設計(2026-07-25)

ステータス: **設計確定済み・実装はワークフロー実行中(batch:1467、完了未確認)**。このファイルは、実装ワークフローが完了せずセッションが切れた場合に、別セッション/別AI(Codex等)がゼロから設計をやり直さずに済むよう、fable設計フェーズの成果物をそのまま保存したものです。

## 背景

ユーザーからのフィードバック(2026-07-25):
1. UIが釣り人ポノに被る不具合の修正 + ロケーションごとにポノの立ち位置を変える(全ロケ同じ位置だと味気ない)
2. 本番アート生成(実施済み・承認済み。下記「アート」節参照)
3. 海藻を独立した揺れるレイヤーに分離 + 石/サンゴ礁で手前奥の隠れ演出・奥行き感
4. 図鑑(fishdex)を画面から開けるようにする(データ層は実装済み・UIが無かった)
5. 「これが全部終わったら橋渡し基盤(Unity as a Library)に着手したい」→ 橋渡し基盤は明示的にスコープ外

## アート(生成・処理・目視確認済み)

`tmp/alpha_pending/1467-kawaglint-sea-depth-fishdex-art/`(**gitignore対象、ローカルのみ**)に生成済み:
- `backgrounds/bg_tsuri_{river_kakou,sea_sunahama,sea_iwaba,sea_oki}_20260725.png`(4点、クロマキー処理不要)
- `processed/species/`(11点、クロマキー除去済み): fish_unagi_{shadow,catch}, fish_{aji,ebi,karei,iwashi,tai,ika,maguro}_catch, hitode_catch, treasure_kaigara_catch
- `processed/props/`(13点、クロマキー除去済み): kawa_weed_{01,02,03}, umi_kelp_{01,02,03}(水草/海藻)、kawa_rock_{01,02}, kawa_log_01, umi_coral_{01,02}, umi_rock_{01,02}(隠れ物)

オーケストレーター(Claude)が全カテゴリを実際にReadツールで目視確認済み(背景4点全部、種の一部、透明チェッカーQA画像で透過確認)。**Unity本体(Content/Resources/KawaGlint/Sprites/)への配置とSpriteCatalog登録がまだの場合は、実装ワークフローの「アート統合」ステップが未完了ということなので、上記tmp/配下のファイルをそのまま使って統合すること。**

## 設計仕様(fableが確定・下記3点は実装者にそのまま渡せる形)

### (A) UI/ポノ重なり修正 + ロケーション別ポノ配置システム

- **原因**: `LocationOpenButton`(「ばしょ」ボタン、左上(40,-40))がポノの頭/帽子と重なる。
- **対処**: UIを動かす(ポノは動かさない)。「ばしょ」ボタンを右上BucketCount直下 `(-40,-132)` 200x72 へ移設。次のUIスロット `(-40,-216)` 200x72 を「ずかん」ボタン用に予約。
- **ポノのロケーション別配置**: `TsuriLocationData` に `AnglerAnchorU`(相対X, 0-1) / `AnglerAnchorWorldY` / `AnglerWorldHeight` / `AnglerFlipX` を純加算。`KawaGlintAnglerRig`(Rendering新設MonoBehaviour)が `ApplyPose()` で竿先ワールド座標を再計算、`KawaGlintGameController.ApplyAnglerPose()` が `TrySetLocation` 成立時に呼ぶ。5ロケーション分の具体的な数値(river_asase=現行値のまま回帰基準・変更禁止、river_kakou/sea_sunahama/sea_iwaba/sea_okiはそれぞれ異なる立ち位置)は下記の完全な設計テキストに記載。

### (B) 奥行きレンダリング(海藻独立揺れ + 石/サンゴ隠れ演出)

- 海藻6種(川3+海3)を独立スプライト化。既存の`KawaGlintStageContent.RegisterPlant`(根元ピボット周りsin回転、揺れ4°)をそのまま再利用(新規シェーダー不要、案2はQAで硬く見えた場合のみのアップグレード)。
- 石/サンゴ7種でsortingOrder順(奥11/12・魚14・手前16/17)による隠れ演出。当たり判定なし、描画順だけで「魚が岩の裏に隠れる/手前に見える」を実現。
- ウキ回廊(x∈[0.5,3.1])には手前レイヤーを置かない(前あたり演出を隠さないため)。
- ロケーション別の固定配置テーブル(5ロケーション分、具体的なx/rootY/高さ/layer)を設計済み。

### (C) 図鑑(fishdex)閲覧UI

- HUDに「ずかん」ボタン+NEWバッジを追加(LocationOpenButtonの真下)。
- 独立Canvas`KawaGlintFishdexCanvas`(sortingOrder 112)。かわ/うみタブ→3状態グリッド(未遭遇=？枠/遭遇済み未捕獲=シルエットtint/捕獲済み=実絵+名前)→セルタップで詳細オーバーレイ(habitat・サイズ・edibleバッジ「たべられる おさかな だよ」)。
- キャッチ直後「ずかんに とうろくしたよ！」スタンプ演出(初回捕獲のみ)。
- モーダル排他(`KawaGlintUiModalGate`)で「ばしょ」パネルと同時に開かないようにする。
- データ層(`TsuriDex`/`KawaGlintFishdexService`)は実装済み・変更不要、UI層のみ新設。

**完全な設計テキスト(実装者向け詳細仕様、C#クラス/フィールド/座標値まで)は、このセッションのオーケストレーターがsonnet5実装エージェントに実際に渡したプロンプト全文として存在する。実装ワークフローの進捗確認時に `git diff` で実際のコード変更を見るのが最優先。もしコード変更が全く無い(=ワークフローが未着手/失敗)場合は、AGENTS_CLAIMS.md の batch:1467 エントリと、このファイルの上記要約を元に、Core層(TsuriWorldData.cs)→Gameplay層(KawaGlintGameController.cs)→Rendering層(KawaGlintStageBuilder.cs等)→UI層(新規Fishdexパネル)の順で実装すること。**

## スコープ外(明示的に今回やらない)

- Unity as a Library橋渡し基盤(次のタスク、ユーザーが明言済み)
- catch-outbox/ack(Unity↔Web釣果同期) — §7批評「時期尚早」を踏まえ意図的に未実装
- dexProfile本文執筆(図鑑説明文、ゲート11、サンプル2件のみ既存)

## 関連ファイル

- 正本企画書: `docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md`(v1.1)
- 直前の実装(データ層+図鑑ストア+ロケーション選択UI): commit `93f4c269d`
- このドキュメントの元になった設計フェーズの完了報告: AGENTS_CLAIMS.md batch:1467 エントリ参照
