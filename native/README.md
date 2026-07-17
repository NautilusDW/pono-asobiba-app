# Pono Native Shell

`native/` は、既存ゲームを Capacitor のネイティブアプリ（Android / iOS）へ組み込むための独立ワークスペースです。
Web 配信用ファイルを直接コピーせず、[`content-manifest.json`](./content-manifest.json) に明示した実行時コンテンツだけから `native/www/` を生成します。

## Platform status

- **Android (Phase 1)**: 実装済み。`native/android/` に Gradle プロジェクトあり。
- **iOS (Phase 2 / 着手中)**: `npx cap add ios` でプラットフォームの骨格のみ追加済み（`native/ios/` に Xcode プロジェクト一式が生成されている）。
  - ⚠️ **このマシンには完全版 Xcode が入っていない**（`xcode-select -p` は `/Library/Developer/CommandLineTools` を指しており、`xcodebuild -version` はエラーになる。`/Applications/Xcode.app` も存在しない）。CocoaPods (`pod` コマンド) も未導入。
  - そのため **ビルド・Simulator 起動・実機インストールのいずれも未検証**。「動作確認済み」ではなく、あくまで `cap add ios` によるプロジェクト生成が成功した段階。
  - Xcode 導入後の想定手順: `npm run ios:sync`（`www/` の内容を `native/ios/App/App/public/` に同期）→ `npm run ios:open`（Xcode が `native/ios/App/App.xcodeproj` を開く）→ Simulator か実機を選んでビルド・実行。CocoaPods を使う構成に切り替わった場合は `cd native/ios/App && pod install` が別途必要になる可能性がある（現時点では未確認）。
  - `native/ios/App/App/public/`（`cap sync` で再生成される `www/` の巨大コピー）や `Pods/`、`DerivedData/`、`xcuserdata/` などは Git 管理対象外（ルート `.gitignore` および `native/ios/.gitignore` 参照）。

## Content manifest

manifest schema v1 の entry は次の3形式です。

- `type: "file"`: 1ファイルをコピーする。`play.html` だけは `stripTapIntroAd: true` で広告DOMを除去する。
- `type: "directory"`: 指定ディレクトリを再帰コピーする。隠し項目、秘密ファイル、symlink、特殊ファイルがあれば失敗する。
- `type: "file-list"`: 指定ディレクトリ内から `files` に列挙したファイルだけをコピーする。制作途中素材と実行時素材が混在する場所に使う。

全 entry は `source` と `destination` をリポジトリ相対の POSIX パスで指定します。存在しないパス、型不一致、大小文字を含む出力衝突、path traversal、未知フィールドは preflight で失敗します。

## Commands

```sh
cd native
npm test
npm run stage-www:dry
npm run stage-www
npm run verify-assets
npm run verify-references
npm run android:sync
npm run ios:sync    # 要 Xcode（Phase 2、このマシンでは未検証。上記 Platform status 参照）
```

`stage-www` は全 preflight 完了後に一時ディレクトリへ出力し、内容検証に合格した場合だけ `www/` を入れ替えます。失敗時は直前の `www/` を保持します。生成した `www/` は Git 管理対象外です。

`verify-assets` は manifest と生成物のパス・サイズ・内容を完全照合し、禁止物や native flag の欠落も検査します。`verify-references` は HTML/CSS の同一origin参照と、シールカタログ内の動的画像参照を検査します。

## Current scope

現在はタイトル、主要5ゲーム、なぞなぞトレイン、クッキング、もじっこファーム、ヘルプ、アンケート、プロフィール/ガチャ/ショップ、シールちょう、シールミュージアムと、その実行時素材を同梱します。旧方式の約1.28GBに対し、manifest版は約932.9MBです。

シールちょうの Three.js、Google Fonts、一部 capture ライブラリには外部配信参照が残っています。そのため現段階は完全オフライン保証ではありません。外部依存のローカル同梱化は、Unity試作と実機性能測定に合わせて次工程で判断します。
