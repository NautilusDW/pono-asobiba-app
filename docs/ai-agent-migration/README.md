# AI Agent Migration Helpers

Windows から Mac へ、Codex / Claude Code のローカル履歴・skills・plugins・設定を移すための補助スクリプトです。

## 何を移すか

含めるもの:

- Codex: `sessions`, `archived_sessions`, `attachments`, `skills`, `plugins`, `rules`, `memories`, `config.toml`, `history.jsonl`, `session_index.jsonl`
- Claude Code: `projects`, `commands`, `agents`, `skills`, `plugins`, `hooks`, `settings.json`, `settings.local.json`

含めないもの:

- Codex: `auth.json`, `cap_sid`, `installation_id`, `logs_*.sqlite*`, `state_*.sqlite*`, `cache`, `.sandbox*`, `.tmp`, `tmp`
- Claude Code: 認証情報らしいファイル、cache、logs、tmp

この ZIP にはチャット履歴が入ります。公開リポジトリ、Slack、メール添付などには置かないでください。

## Windows 側で ZIP を作る

PowerShell で repo 直下に移動します。

```powershell
cd D:\AppDevelopment\pono-asobiba-app
```

実行ポリシーをこの PowerShell だけ一時的に緩めて、エクスポートします。

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\docs\ai-agent-migration\export-ai-agent-state.ps1
```

成功すると、デスクトップに次のような ZIP ができます。

```text
ai-agent-migration-20260709-123456.zip
```

この ZIP を AirDrop、USB、iCloud Drive などで Mac の `Downloads` に移します。

## Mac 側へ取り込む

Mac 側で repo を clone 済みなら、ターミナルで repo 直下へ移動します。

```bash
cd ~/AppDevelopment/pono-asobiba-app
```

ZIP 名を実際のファイル名に置き換えて実行します。

```bash
bash docs/ai-agent-migration/import-ai-agent-state.sh ~/Downloads/ai-agent-migration-20260709-123456.zip
```

既存の `~/.codex` / `~/.claude` に同名ファイルがある場合は、先に `~/ai-agent-migration-backup/` へバックアップされます。

## 確認

Codex:

```bash
codex resume --all
```

直近だけ:

```bash
codex resume --last --all
```

Claude Code:

```bash
claude
```

対象 repo を開いて、過去プロジェクト履歴が見えるか確認します。

## 注意

- `auth.json` は移しません。Mac 側で `codex login` し直してください。
- Claude Code も Mac 側でログインし直してください。
- Windows と Mac の履歴は自動同期されません。これは移行時点のスナップショットです。
- 以後は Mac を主環境にするのがおすすめです。

