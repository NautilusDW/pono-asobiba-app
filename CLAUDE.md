# CLAUDE.md - Project Intelligence

このファイルは Self-Evolving Framework の「環境 (Environment)」として機能します。
Claude Code はこのファイルを自動的に読み込み、プロジェクトのコンテキストとして使用します。

## Project Overview

- **プロジェクト名**: Self-Evolving Framework for Claude Code
- **目的**: 強化学習の概念を応用し、Claude Code の自己進化・自己最適化を実現する
- **言語**: Python 3.10+

## Base Rules

1. コードを編集する前に、必ず対象ファイルを読んで理解すること。
2. テストが存在する場合は、変更後にテストを実行して確認すること。
3. エラーが発生した場合は、同じアプローチを繰り返さず、別の方法を試すこと。
4. 大きな変更は小さなステップに分割し、各ステップで検証すること。

## Project Structure

```
.
├── .claude/
│   └── settings.json       # Claude Code hook configuration
├── scripts/
│   ├── observe.py           # Phase 1: Observation hook
│   ├── analyze.py           # Phase 2: Feedback & Analysis
│   ├── evolve.py            # Phase 3: Self-Evolution
│   └── orchestrator.py      # Main entry point
├── logs/                    # Action logs (auto-generated)
├── CLAUDE.md                # This file (Environment)
├── MEMORY.md                # Knowledge accumulation (Reward)
└── README.md                # Usage guide
```

## Conventions

- ログファイルは JSONL 形式で `logs/` に保存する。
- MEMORY.md への書き込みはマーカー (`## Section Name`) で区切る。
- CLAUDE.md のフレームワーク自動更新セクションは `## Auto-Extracted` または `## Current Difficulty` で始まる。
