# Mac Development Setup Guide

最終更新: 2026-07-09  
対象: `pono-asobiba-app` を Windows から Mac へ並走移行するための手順

この手順書は、M4 Pro Mac mini 64GB での開発を前提にしています。Windows 側はすぐ止めず、しばらく Mac と並走する想定です。

## まずこのページを開いたら

最初のゴールは、Mac 側でプロジェクトを clone して、ローカルでポノの画面を開くところまでです。
一気に全部やらなくて大丈夫です。まずはこの順番で進めます。

1. Mac の「ターミナル」を開く。
2. `## 1. Mac に基本ツールを入れる` を実行する。
3. `## 2. VS Code を入れる` を実行する。
4. `## 3. Git、GitHub CLI、Node.js を入れる` を実行する。
5. `## 4. GitHub にログインする` を実行する。
6. `## 5. リポジトリを clone する` を実行する。
7. `## 6. npm 依存を入れる` を実行する。
8. `## 7. Cloudflare Wrangler を確認する` の `npx wrangler dev --env staging-app` まで実行する。

そこでブラウザに `http://localhost:xxxx` のような URL が出ます。
その URL を開いてポノの画面が出れば、第一段階は完了です。

途中で止まったら、エラー文をそのまま Windows 側の Codex / Claude Code に貼ってください。

## 0. いまの前提

- Windows 側の `develop-app` は `origin/develop-app` と一致していて、未コミット差分なし。
- Mac 側では `origin/develop-app` を clone すれば同じ状態から始められる。
- このプロジェクトでは `develop-app` がアプリ版 staging、`develop` が LP staging。
- Mac で作業を始めたら、Windows と Mac で同じファイルを同時に編集しない。

## 1. Mac に基本ツールを入れる

Mac の「ターミナル」を開きます。

まず Xcode Command Line Tools を入れます。

```bash
xcode-select --install
```

ダイアログが出たらインストールします。これは Git やビルド系の基本ツールです。

次に Homebrew を入れます。

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

インストール後、画面に `eval ...` から始まる案内が出たら、その指示をそのまま実行してください。

## 2. VS Code を入れる

VS Code は Mac 版があります。M4 Pro Mac mini なら Apple Silicon 版、または Universal 版で大丈夫です。

- Download: https://code.visualstudio.com/download
- macOS setup: https://code.visualstudio.com/docs/setup/mac

入れたら VS Code を開いて、次を実行します。

1. `Cmd + Shift + P`
2. `Shell Command: Install 'code' command in PATH`
3. ターミナルを開き直す

これでターミナルから以下で VS Code を開けます。

```bash
code .
```

## 3. Git、GitHub CLI、Node.js を入れる

基本ツールをまとめて入れます。

```bash
brew install git gh volta ripgrep jq python ffmpeg
```

Node.js は Volta 経由で入れると、バージョン管理が楽です。

```bash
volta install node@22
node -v
npm -v
```

`node -v` が `v22...` なら OK です。

## 4. GitHub にログインする

```bash
gh auth login
```

聞かれたら、基本は以下で進めます。

```text
GitHub.com
HTTPS
Login with a web browser
```

ブラウザが開くので認証します。

## 5. リポジトリを clone する

作業場所を作ります。

```bash
mkdir -p ~/AppDevelopment
cd ~/AppDevelopment
```

リポジトリを clone します。

```bash
git clone https://github.com/NautilusDW/pono-asobiba-app.git
cd pono-asobiba-app
git checkout develop-app
git pull origin develop-app
```

VS Code で開きます。

```bash
code .
```

## 6. npm 依存を入れる

リポジトリ直下で実行します。

```bash
npm ci
```

Playwright のブラウザも入れます。

```bash
npx playwright install
```

`native/` の Capacitor 側も触る予定がある場合だけ、こちらも入れます。

```bash
cd native
npm ci
cd ..
```

## 7. Cloudflare Wrangler を確認する

この repo は `wrangler` が `devDependencies` に入っているので、基本は `npx` 経由で使います。

```bash
npx wrangler --version
```

Cloudflare ログインが必要なら以下を実行します。

```bash
npx wrangler login
```

アプリ版 staging 相当のローカル確認は、まずこれを使います。

```bash
npx wrangler dev --env staging-app
```

表示された local URL をブラウザで開きます。

## 8. Codex を入れる

Codex CLI の macOS/Linux 公式インストールコマンドです。

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

ログインします。

```bash
codex login
```

ChatGPT アカウントでログインします。

VS Code でも使う場合は、VS Code の Extensions から Codex 拡張を入れます。

参考:

- Codex CLI: https://developers.openai.com/codex/cli
- Codex IDE extension: https://developers.openai.com/codex/ide

## 9. Claude Code を入れる

Claude Code は次のどちらかで入れます。

公式インストーラ:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Homebrew:

```bash
brew install --cask claude-code
```

起動します。

```bash
claude
```

ブラウザで Claude アカウントにログインします。

参考:

- Claude Code quickstart: https://docs.anthropic.com/en/docs/claude-code/quickstart
- Claude Code setup: https://docs.anthropic.com/en/docs/claude-code/setup

## 10. 最初の確認コマンド

Mac 側で以下を順に確認します。

```bash
git status -sb
node -v
npm -v
npx wrangler --version
npx playwright --version
```

構文チェックも軽く実行します。

```bash
node --check sw.js
```

ローカル起動します。

```bash
npx wrangler dev --env staging-app
```

ここまで通れば、Mac 側で日常開発できる状態です。

## 11. iOS / Android も見る場合

Web / PWA だけならここまでで十分です。

iOS も見る場合は、App Store から Xcode を入れます。Capacitor 8 は Xcode 26.0+ が必要です。

```bash
xcode-select --install
xcode-select -p
```

Android も見る場合は Android Studio と Android SDK を入れます。Capacitor 8 は Android Studio 2025.2.1+ が必要です。

参考:

- Capacitor environment setup: https://capacitorjs.com/docs/getting-started/environment-setup
- Capacitor iOS: https://capacitorjs.com/docs/ios
- Capacitor Android: https://capacitorjs.com/docs/android

## 12. 並走時の安全ルール

作業前:

```bash
git status -sb
git pull origin develop-app
```

作業後:

```bash
git status -sb
git add <changed-files>
git commit
git push origin develop-app
```

注意点:

- Windows と Mac で同じファイルを同時に編集しない。
- Windows 側に未コミット作業を残したまま、Mac 側で同じブランチを編集しない。
- `.env`、`.dev.vars`、API key、認証ファイルはコピーしない。必要なサービスは Mac 側でログインし直す。
- `develop-app` はアプリ版、`develop` は LP 版。staging URL を案内するときは取り違えない。
- 子ども向け UI 文言は、原則ひらがな / カタカナにする。

## 13. 困ったときの確認

現在ブランチ:

```bash
git branch --show-current
```

差分確認:

```bash
git status -sb
git diff --stat
```

最新 commit:

```bash
git log --oneline --decorate -5
```

Wrangler が動かない:

```bash
node -v
npx wrangler --version
npx wrangler login
```

Playwright が動かない:

```bash
npx playwright install
npx playwright --version
```

Mac 側でまず目指すゴール:

```bash
git status -sb
npm ci
npx playwright install
npx wrangler dev --env staging-app
```
