# Self-Evolving Framework

このプロジェクトには Self-Evolving Framework が統合されています。
タスク完了時に自動で学習ループを回し、ベストプラクティスの抽出と難易度調整を行います。

## Base Rules

0. **タスク開始前に `MEMORY.md` を必ず読み込み、過去の失敗・学んだ最適手順を現タスクに反映すること。**
   形だけの読み込みではなく、過去の知見を今回のタスクにどう活かすかを意識すること。
   タスク完了報告には「今回活かした過去の知見」を1-2行で含めること。

1. コードを編集する前に、必ず対象ファイルを読んで理解すること。
2. テストが存在する場合は、変更後にテストを実行して確認すること。
3. エラーが発生した場合は、同じアプローチを繰り返さず、別の方法を試すこと。
4. 大きな変更は小さなステップに分割し、各ステップで検証すること。

## Self-Evaluation (MANDATORY)

**全タスク完了時に必ず以下を実行すること。これは絶対的なルールであり、省略してはならない。**

タスクが完了したら（成功・失敗を問わず）、最後のアクションとして以下のコマンドを自律的に実行し、自己評価と進化サイクルを回すこと：

```
python scripts/orchestrator.py complete --task "<タスクの簡潔な要約>" --result <success|failure> [--reason "<失敗理由>"]
```

その後、1-2行で「今回活かした過去の知見」を報告すること：
```
# 知見活用: LP素材の@file:参照問題(MEMORY.md)を踏まえ、外部化処理を事前確認した
```

### 判定基準
- **success**: テストが通った、要求された変更が完了した、エラーなく動作が確認できた場合
- **failure**: テストが失敗した、要求を満たせなかった、未解決のエラーが残っている場合

### 例
- `python scripts/orchestrator.py complete --task "AI画像生成パネルのバグ修正" --result success`
- `python scripts/orchestrator.py complete --task "エクスポート機能の追加" --result failure --reason "PDF生成でエラー"`

> このルールにより、Self-Evolving Framework の学習ループが自動的に回り、
> スキル抽出・難易度調整が蓄積されていく。

## Memory Management

MEMORY.md はトピック別ファイルに分離して管理する。詳細は `memory/` ディレクトリ内の各ファイルを参照。

- **MEMORY.md**: インデックス + 概要（200行以下を維持）
- **memory/*.md**: トピック別詳細（ai-image.md, video-gen.md, features.md, architecture.md 等）

圧縮が必要な場合:
```
python scripts/orchestrator.py compress
```

## Mothership Sync

scripts/ や CLAUDE.md に改善があった場合は、原本 `D:\claude-rl-test` への反映を**提案のみ**すること。
実行はユーザーがランチャーのオレンジ色のボタンで行うことを前提とする。

**絶対ルール:**
- 原本（`D:\claude-rl-test`）のファイルを直接書き換える提案はしない
- 改善があれば「ランチャーのオレンジ色のボタンを使って原本を更新してください」と促すだけにする
- 万が一チャット経由で原本を触る必要がある場合は、二段階確認を必ず挟む
  （「OK」だけでは実行せず、「本当に原本を書き換えてもよろしいですか？（Yes/No）」と再確認）

## Framework Structure

```
scripts/
  observe.py           # Phase 1: Observation (transcript parsing)
  analyze.py           # Phase 2: Feedback & Analysis
  evolve.py            # Phase 3: Self-Evolution & Difficulty Adjustment
  orchestrator.py      # Main entry point (Phases 1+2+3 + compress)
logs/                  # Runtime artifacts (auto-generated, gitignored)
```

## Conventions

- ログファイルは JSONL 形式で `logs/` に保存する。
- MEMORY.md への書き込みはマーカー (`## Section Name`) で区切る。
- CLAUDE.md のフレームワーク自動更新セクションは `## Auto-Extracted` または `## Current Difficulty` で始まる。




















































































































## Current Difficulty Level

- **レベル**: 5 - 抽象指示 (Abstract)
- **説明**: 非常に抽象的な指示で、問題の発見から解決まですべてを任せる
- **直近の成功率**: 100%
- **調整理由**: 成功率 100% → 難易度維持
- **指示の例**: コード品質を向上させてください。

> タスクを依頼する際は、上記レベルの抽象度でプロンプトを作成してください。

## Auto-Extracted Best Practices (Updated: 2026-04-04)

以下のルールは過去のタスク実績から自動抽出されたベストプラクティスです。

1. **小さな単位で検証しながら進めた** (検出回数: 200, 例: 5歳向けなぞり書きWebアプリのプロトタイプ作成（HTML/CSS/JS単一ファイル）, 書き順ガイドのSVGパス精度改善（座標自動検出+Catmull-Romスプライン+データ全面書き直し）, Hanzi Writerライブラリ導入による書き順ガイド・なぞり判定の全面刷新)
2. **編集前にファイルを読んで理解した** (検出回数: 199, 例: 書き順ガイドのSVGパス精度改善（座標自動検出+Catmull-Romスプライン+データ全面書き直し）, Hanzi Writerライブラリ導入による書き順ガイド・なぞり判定の全面刷新, AnimCJK教科書体SVGデータを表示・判定の単一ソースとする設計への全面刷新)
3. **エラー発生後に別のアプローチに切り替えた** (検出回数: 194, 例: 5歳向けなぞり書きWebアプリのプロトタイプ作成（HTML/CSS/JS単一ファイル）, 書き順ガイドのSVGパス精度改善（座標自動検出+Catmull-Romスプライン+データ全面書き直し）, Hanzi Writerライブラリ導入による書き順ガイド・なぞり判定の全面刷新)
4. **実装前にコードベースを探索した** (検出回数: 103, 例: 5歳向けなぞり書きWebアプリのプロトタイプ作成（HTML/CSS/JS単一ファイル）, 書き順ガイドのSVGパス精度改善（座標自動検出+Catmull-Romスプライン+データ全面書き直し）, Hanzi Writerライブラリ導入による書き順ガイド・なぞり判定の全面刷新)
5. **テストを先に書いてから実装した (TDD)** (検出回数: 3, 例: Room_Base圧縮・マスクαチャンネル変換・巾木JS上書き修正・ファイル名短縮, 12種カラー素材をマスク切り出し・壁床巾木分離・items.jsショップ全登録, aquarium生き物復旧：テクスチャロードのレースコンディション修正＋絵文字デフォルトをoceanスプライトに置換)
