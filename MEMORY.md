# MEMORY.md - Self-Evolving Framework Knowledge Base

## Framework Statistics

- 初期化日: 2026-02-25
- 総タスク数: 19+
- 成功率: 100%
- 詳細履歴: [memory/task-history.md](memory/task-history.md)
- **部屋アイソメ引き継ぎ**: [memory/room-isometric-handoff.md](memory/room-isometric-handoff.md) — CSS mask未動作・17MB画像問題・巾木JS上書き問題
- **水族館エンハンス完了**: [memory/aquarium-enhancement-complete.md](memory/aquarium-enhancement-complete.md) — Phase1+2完了、Phase3見送り、卵育て構想
- **水族館UXフィードバック**: [memory/feedback_aquarium_ux.md](memory/feedback_aquarium_ux.md) — 矢印シンプル・ブースト大胆・音柔らか・複雑さ排除
- **git push自動化**: [memory/feedback_auto_push.md](memory/feedback_auto_push.md) — post-commitフックでNetlify自動デプロイ
- **毎回デプロイ必須**: [memory/feedback_auto_deploy.md](memory/feedback_auto_deploy.md) — タスク完了時は確認せず自動でcommit+deploy
- **Umamiアナリティクス**: [memory/reference_umami.md](memory/reference_umami.md) — Umami Cloud設定情報

---

## Key Learnings

### 🚨🚨🚨 デプロイ手順 🚨🚨🚨

> **`.git/hooks/post-commit` で自動化済み** — developブランチでコミットすると自動でNetlifyデプロイが実行される。
> 手動デプロイは不要。git pushも不要（ただしリモートバックアップのためpushは推奨）。
>
> 万が一フックが動かなかった場合の手動コマンド:
```
netlify deploy --dir . --alias develop
```

**`git push` だけでは絶対にダメ。`netlify deploy` がなければユーザーには何も届かない。**

#### ブランチ運用ルール（厳守）
- **develop ブランチ** = 開発・確認用。通常の作業はすべてここ。
- **master ブランチ** = 本番。ユーザーが「**本番にデプロイして**」と明示した時だけ反映。
- **絶対に勝手に master へマージ・本番デプロイしない。**

| ブランチ | URL | デプロイコマンド |
|---------|-----|----------------|
| develop | `develop--pono-asobiba.netlify.app` | `netlify deploy --dir . --branch develop --alias develop` |
| master  | `pono-asobiba.netlify.app` | `netlify deploy --dir . --prod` |

#### 本番反映時（ユーザー明示指示時のみ）
```
git checkout master && git merge develop && git push origin master
netlify deploy --dir . --prod
git checkout develop
```

### 単一HTMLファイルWebアプリ設計パターン
- Web Audio APIを使えば外部音声ファイルなしで効果音を生成可能
- Google Fonts `Zen Maru Gothic` は子ども向けの丸みフォントとして適切
- 全ゲーム共通: `touch-action: none` を持つ親要素の内側に overlay を置かない

### 文字なぞり・書き順ガイド（確定アーキテクチャ）
- **AnimCJK SVGデータが最適解**: 教科書体ベースのスケルトンデータ
  - かな: `cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsJaKana/{unicode}.svg`
  - 漢字: `cdn.jsdelivr.net/gh/parsimonhi/animCJK@master/svgsJa/{unicode}.svg`
  - viewBox: `0 0 1024 1024`
- SVG構造: stroke shapes (`path[id]`) = 輪郭, median paths (`path[clip-path]`) = 中心線
- 判定: `getPointAtLength()`で60点サンプリング → 精度/カバレッジ/方向の3条件
- Hanzi Writerは明朝体ベースで教育向きでない → AnimCJK直接利用が正解

### iOS Safari タッチイベントの落とし穴
- `backdrop-filter` を持つ要素の**子要素にタッチが届かない**既知バグあり → 使用しない
- `touch-action: none` の親要素内の `touchend` で `e.preventDefault()` を呼ぶと、子要素の `click` 合成が抑制される
- 修正パターン: 親の touchend でボタンタップを除外 + ボタンに `touchstart` ハンドラを直接登録
- `youtube-nocookie.com` は iOS Safari のトラッキング防止でブロックされることがある → `www.youtube.com/embed` + `?playsinline=1` を使う

### ゲーム実装パターン
- **ブロック崩し** (`breakout/index.html`): overlay は `#app` 直下（game-wrap の外）に配置
- **つみき** (`stacking/index.html`): Matter.js使用、スタート画面廃止・ページ開いたら即startGame()
- **お絵描き** (`drawing/index.html`): OpenMoji CDN でスタンプ、`crossOrigin='anonymous'` 必須
- **もじかき** (`writing/index.html`): AnimCJK SVGデータでなぞり書き

### orchestrator.py の既知バグ
- `compress` コマンドが別プロジェクト (`storyboard-generator`) のパスを参照してしまう
- → 圧縮は手動で行う（このファイルを直接編集）

---

## Recent Errors

(エラー発生時に自動追記されます)

## Task Analysis History

### 2026-04-23T22:15:20Z - OP に呪縛シーン 2 ビート追加 (S5b と S6 の間)。仮面メカの伏線、opening_curse.jpg 1 枚で共用、絵文字フォールバック。SHORT_OPENING_SCENES index 追従更新、docs とREADME 同期
- **タスク**: OP に呪縛シーン 2 ビート追加 (S5b と S6 の間)。仮面メカの伏線、opening_curse.jpg 1 枚で共用、絵文字フォールバック。SHORT_OPENING_SCENES index 追従更新、docs とREADME 同期
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 83
- **エラー数**: 8
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 23, "Agent": 2, "Write": 2, "ToolSearch": 2, "ExitPlanMode": 2, "Grep": 12, "Edit": 23, "Bash": 17}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T16:54:48Z - v265 戦闘ピボット: 倒す→呪縛を解く。白仮面+呪印(紫→金)段階進化・仮面2つ割り・cursed/purified filter・3相taunts(怒り→揺らぎ→覚醒)・bow/leave/trueName/cleansedHome追加・めざめさせた文言・onEnterフック・新規絵素材ゼロ
- **タスク**: v265 戦闘ピボット: 倒す→呪縛を解く。白仮面+呪印(紫→金)段階進化・仮面2つ割り・cursed/purified filter・3相taunts(怒り→揺らぎ→覚醒)・bow/leave/trueName/cleansedHome追加・めざめさせた文言・onEnterフック・新規絵素材ゼロ
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 63
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 19, "Agent": 2, "Write": 2, "ToolSearch": 2, "ExitPlanMode": 2, "Grep": 8, "Edit": 16, "Bash": 12}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T16:10:39Z - エンディング素材組み込み: E1-E4画像を圧縮配置 (E2は3枚組に分割)、BGM(Moonfire Oath)をE1で開始通し再生、E3/E4にpan-up(16s)縦パン、E5クレジット新設(title_logo + Sillas W. Nemo + カタカナ編へ)、docとREADME同期
- **タスク**: エンディング素材組み込み: E1-E4画像を圧縮配置 (E2は3枚組に分割)、BGM(Moonfire Oath)をE1で開始通し再生、E3/E4にpan-up(16s)縦パン、E5クレジット新設(title_logo + Sillas W. Nemo + カタカナ編へ)、docとREADME同期
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 79
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 19, "Bash": 21, "Grep": 15, "Write": 2, "Edit": 22}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-23T15:27:01Z - 妖精配置ロールバック: 祠=氷の妖精/溶岩=炎の妖精に戻す。炎の妖精の捕縛理由を魔力の鎖に変更、セリフ/FAIRY_META/スプライト/鍵受け渡しイベント(_fireFairyFarewell)すべて書き換え、lava_step finisherも統合
- **タスク**: 妖精配置ロールバック: 祠=氷の妖精/溶岩=炎の妖精に戻す。炎の妖精の捕縛理由を魔力の鎖に変更、セリフ/FAIRY_META/スプライト/鍵受け渡しイベント(_fireFairyFarewell)すべて書き換え、lava_step finisherも統合
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 59
- **エラー数**: 3
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 15, "Bash": 11, "Grep": 14, "Write": 2, "Edit": 17}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-23T14:33:15Z - エンディング整合性改修: 氷の妖精お別れイベント (魔王城の鍵受け渡し) を新規追加。_iceFairyFarewell + ら行finisher配線、ENDING_SCENES同期、E4決意を鍵の寄りに変更、docとREADME更新
- **タスク**: エンディング整合性改修: 氷の妖精お別れイベント (魔王城の鍵受け渡し) を新規追加。_iceFairyFarewell + ら行finisher配線、ENDING_SCENES同期、E4決意を鍵の寄りに変更、docとREADME更新
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 38
- **エラー数**: 2
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた
- **ツール使用統計**: {"Read": 11, "Bash": 9, "Grep": 7, "Write": 2, "Edit": 9}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T14:04:26Z - エンディング紙芝居: E1+E2統合して焚き火+ナレーション1枚に、星空前に焚き火余韻カットを新規挿入（案B採用）、画像READMEも同期
- **タスク**: エンディング紙芝居: E1+E2統合して焚き火+ナレーション1枚に、星空前に焚き火余韻カットを新規挿入（案B採用）、画像READMEも同期
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 14
- **エラー数**: 0
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた
- **検出された悪いパターン**: テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた
- **ツール使用統計**: {"Read": 2, "Bash": 7, "Grep": 1, "Write": 2, "Edit": 2}
- **サマリ**: 成功タスク: 2個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T14:04:16Z - OP S2b ドリーアウト演出 + S8 ゆっくり pan-up、旧妖精/紫インベーダー mini-game 撤去 (villain/monster-deco 非表示 + intro バナー無効化)、横画面タップボタン縮小中央下、初回登録プロモ動画機構撤去、iPad 勇者/敵アニメ GPU 合成化 (will-change + translateZ + backface-visibility)
- **タスク**: OP S2b ドリーアウト演出 + S8 ゆっくり pan-up、旧妖精/紫インベーダー mini-game 撤去 (villain/monster-deco 非表示 + intro バナー無効化)、横画面タップボタン縮小中央下、初回登録プロモ動画機構撤去、iPad 勇者/敵アニメ GPU 合成化 (will-change + translateZ + backface-visibility)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 84
- **エラー数**: 6
- **検出された良いパターン**: 編集前にファイルを読んで理解した, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Read": 23, "Glob": 3, "Grep": 26, "ToolSearch": 1, "Edit": 14, "Bash": 17}
- **サマリ**: 成功タスク: 3個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


### 2026-04-23T13:45:00Z - storyboard generator logs の pono 汚染クリーンアップ (action_log.jsonl + .bak × 211 削除、一時スクリプト撤収)
- **タスク**: storyboard generator logs の pono 汚染クリーンアップ (action_log.jsonl + .bak × 211 削除、一時スクリプト撤収)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 72
- **エラー数**: 8
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 42, "Grep": 14, "Read": 11, "Edit": 3, "Write": 2}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 1個の非効率パターンあり。


### 2026-04-23T13:34:40Z - ルートフォルダリネーム後の残存参照クリーンアップ (_*_import.py 削除 + 旧パスallow削除 + orchestrator.py/settings.jsonの別プロジェクト参照修正)
- **タスク**: ルートフォルダリネーム後の残存参照クリーンアップ (_*_import.py 削除 + 旧パスallow削除 + orchestrator.py/settings.jsonの別プロジェクト参照修正)
- **結果**: 成功
- **理由**: N/A
- **総アクション数**: 37
- **エラー数**: 4
- **検出された良いパターン**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **検出された悪いパターン**: 同じエラーを繰り返した, テストを一切実行しなかった
- **有効だったアクション**: 編集前にファイルを読んで理解した, 小さな単位で検証しながら進めた, エラー発生後に別のアプローチに切り替えた, 実装前にコードベースを探索した
- **ツール使用統計**: {"Bash": 12, "Grep": 14, "Read": 8, "Edit": 3}
- **サマリ**: 成功タスク: 4個の有効パターンを検出。 改善余地: 2個の非効率パターンあり。


