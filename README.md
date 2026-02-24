# Self-Evolving Framework for Claude Code

強化学習の概念「RLAnything」を応用し、Claude Code が自己進化・自己最適化するための仕組みです。

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Self-Evolving Loop                    │
│                                                         │
│  ┌───────────┐    ┌────────────┐    ┌───────────────┐  │
│  │  Phase 1   │    │  Phase 2   │    │   Phase 3     │  │
│  │ Observation│───>│  Analysis  │───>│  Evolution    │  │
│  │            │    │            │    │               │  │
│  │ observe.py │    │ analyze.py │    │  evolve.py    │  │
│  └─────┬─────┘    └─────┬──────┘    └───────┬───────┘  │
│        │                │                    │          │
│        v                v                    v          │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐     │
│  │ logs/    │    │ MEMORY.md │    │  CLAUDE.md   │     │
│  │ (JSONL)  │    │ (Reward)  │    │(Environment) │     │
│  └──────────┘    └───────────┘    └──────────────┘     │
│                                                         │
│        Policy = Claude LLM 本体                         │
└─────────────────────────────────────────────────────────┘
```

### RL マッピング

| RL 要素 | フレームワーク要素 | 役割 |
|---------|------------------|------|
| **方策 (Policy)** | Claude LLM 本体 | 行動の決定 |
| **報酬モデル (Reward)** | `post_tool_use` hook + `MEMORY.md` | 行動の評価と知識蓄積 |
| **環境 (Environment)** | `CLAUDE.md` + `MEMORY.md` | コンテキスト提供と難易度調整 |
| **状態 (State)** | 現在のコードベース + ログ | 観測可能な環境の状態 |
| **行動 (Action)** | ツール呼び出し (Read, Edit, Bash, ...) | エージェントの出力 |

## Prerequisites

- Python 3.10 以上
- Claude Code CLI

## Setup

### 1. リポジトリのクローン / 配置

```bash
cd /path/to/your/project
```

### 2. Claude Code Hook の設定

`.claude/settings.json` が以下の内容で配置されていることを確認してください:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python scripts/observe.py"
          }
        ]
      }
    ]
  }
}
```

> **Note**: `matcher` が空文字の場合、すべてのツール呼び出しに対してフックが発火します。
> 特定のツールのみを対象にする場合は `"matcher": "Bash"` のように指定してください。

### 3. 初期ファイルの確認

以下のファイルが存在することを確認:

- `CLAUDE.md` - プロジェクトコンテキスト（環境）
- `MEMORY.md` - 知識蓄積（報酬モデルの入出力）
- `logs/` ディレクトリ

## Usage

### 通常のワークフロー

```
1. Claude Code でタスクを実行
   └─ Phase 1 が自動で全行動を記録

2. タスク完了時にオーケストレーターを実行
   └─ Phase 2 (分析) + Phase 3 (進化) が実行される

3. 次のタスクで更新された CLAUDE.md が自動適用
   └─ ベストプラクティスが新しいルールとして反映
```

### コマンド一覧

#### タスク完了報告（分析 + 進化の一括実行）

```bash
# 成功時
python scripts/orchestrator.py complete --task "ログイン機能の実装" --result success

# 失敗時（理由付き）
python scripts/orchestrator.py complete --task "バグ #42 の修正" --result failure --reason "テストが依然失敗"
```

#### 進化のみ（スキル抽出 + 難易度調整）

```bash
python scripts/orchestrator.py evolve
```

#### ステータス確認

```bash
python scripts/orchestrator.py status
```

#### リセット（ログ・状態の初期化）

```bash
python scripts/orchestrator.py reset
```

### 個別スクリプトの実行

```bash
# Phase 2 のみ（分析のみ）
python scripts/analyze.py --task "タスク名" --result success

# Phase 3 のみ
python scripts/evolve.py                    # 両方
python scripts/evolve.py --extract-only     # スキル抽出のみ
python scripts/evolve.py --difficulty-only  # 難易度調整のみ
```

## Phase Details

### Phase 1: Observation (観測)

**ファイル**: `scripts/observe.py`

- Claude Code のツール実行後に `post_tool_use` hook 経由で自動実行される
- 各ツール呼び出しの情報を構造化 JSONL ログとして記録
- エラー検出時は `MEMORY.md` にも即座に記録
- ログは自動ローテーション（最大500行）

**記録するデータ**:
```json
{
  "timestamp": "2026-02-24T12:00:00Z",
  "session_id": "abc123",
  "tool_name": "Bash",
  "tool_input_summary": "{\"command\": \"pytest tests/\"}",
  "result_summary": "3 passed, 1 failed",
  "has_error": true,
  "error_type": "failed",
  "error_snippet": "FAILED tests/test_auth.py::test_login..."
}
```

### Phase 2: Feedback & Analysis (フィードバック分析)

**ファイル**: `scripts/analyze.py`

- タスク完了後に行動ログ全体を振り返る
- 以下のパターンを自動検出:

| パターン | 種別 | 説明 |
|---------|------|------|
| `test_first` | 良 | テストを先に書いてから実装 (TDD) |
| `read_before_edit` | 良 | 編集前にファイルを読んで理解 |
| `incremental_validation` | 良 | 小さな単位で検証しながら進行 |
| `error_recovery` | 良 | エラー後に別アプローチに切替 |
| `exploration_first` | 良 | 実装前にコードベースを探索 |
| `blind_edit` | 悪 | ファイルを読まずに編集 |
| `repeated_errors` | 悪 | 同じエラーを3回以上繰返し |
| `no_testing` | 悪 | テストを一切実行しなかった |

- 分析結果を `MEMORY.md` に以下のフォーマットで蓄積:
  ```
  ### 2026-02-24T12:00:00Z - ログイン機能の実装
  - タスク: ログイン機能の実装
  - 結果: 成功
  - 有効だったアクション: テストを先に書いてから実装した (TDD), 編集前にファイルを読んで理解した
  ```

### Phase 3: Self-Evolution (自己進化)

**ファイル**: `scripts/evolve.py`

#### スキル抽出

- `MEMORY.md` の分析履歴から、2回以上出現する成功パターンを「スキル」として認定
- 認定されたスキルは `CLAUDE.md` の `## Auto-Extracted Best Practices` セクションに自動追記
- Claude Code は次回以降、これらのルールを前提知識として使用

#### 動的難易度調整

直近タスクの成功率に基づいて、タスク指示の推奨抽象度を5段階で調整:

| Lv | 名称 | 成功率条件 | 指示例 |
|----|------|-----------|--------|
| 1 | 具体的指示 | < 20% で降格 | 「src/utils/validator.py の42行目に null チェックを追加して」 |
| 2 | ファイル指定 | | 「validator.py にエラーハンドリングを追加して」 |
| 3 | 機能指定 | 初期値 | 「バリデーション機能を改善して」 |
| 4 | 目標指定 | | 「入力の堅牢性を高めて」 |
| 5 | 抽象指示 | > 80% で昇格 | 「コード品質を向上させて」 |

## Example: Full Cycle

```bash
# 1. Claude Code でタスクを実行（Phase 1 が自動でログ記録）
#    → claude "ログイン機能を実装して"

# 2. タスク完了後に報告
python scripts/orchestrator.py complete \
  --task "ログイン機能の実装" \
  --result success

# 出力例:
# ============================================================
#   Self-Evolving Framework: Task Completion
#   Task: ログイン機能の実装
#   Result: success
# ============================================================
#
# --- Phase 2: Feedback & Analysis ---
# Loaded 23 actions from observation log
# Analysis saved. Summary: 成功タスク: 3個の有効パターンを検出。
#
# --- Phase 3: Self-Evolution ---
# Extracted 2 recurring skill patterns:
#   [3x] テストを先に書いてから実装した (TDD)
#   [2x] 編集前にファイルを読んで理解した
# Success rate: 85%
# Difficulty: Lv.3 -> Lv.4 (目標指定)
#
# ============================================================
#   Evolution cycle complete!
# ============================================================

# 3. ステータス確認
python scripts/orchestrator.py status
```

## File Structure

```
.
├── .claude/
│   └── settings.json           # Hook configuration
├── scripts/
│   ├── observe.py              # Phase 1: Post-tool-use observation
│   ├── analyze.py              # Phase 2: Feedback & analysis
│   ├── evolve.py               # Phase 3: Self-evolution & difficulty
│   └── orchestrator.py         # Unified entry point
├── logs/
│   ├── action_log.jsonl        # Raw action log (Phase 1 output)
│   ├── analysis_log.jsonl      # Analysis results (Phase 2 output)
│   └── difficulty_state.json   # Difficulty tracking (Phase 3 state)
├── CLAUDE.md                   # Project context (auto-updated)
├── MEMORY.md                   # Knowledge base (auto-updated)
└── README.md                   # This file
```

## Extending the Framework

### カスタムパターン検出器の追加

`scripts/analyze.py` の `POSITIVE_PATTERNS` または `NEGATIVE_PATTERNS` 辞書に新しいエントリを追加:

```python
POSITIVE_PATTERNS["my_pattern"] = {
    "description": "カスタムパターンの説明",
    "detector": lambda actions: my_detector_function(actions),
}
```

### 難易度レベルのカスタマイズ

`scripts/evolve.py` の `DIFFICULTY_LEVELS` 辞書を編集して、レベル定義やしきい値を変更できます。

## License

MIT
