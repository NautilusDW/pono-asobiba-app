# Pono Native Shell

`native/` は、既存ゲームを Capacitor のネイティブアプリ（Android / iOS）へ組み込むための独立ワークスペースです。
Web 配信用ファイルを直接コピーせず、[`content-manifest.json`](./content-manifest.json) に明示した実行時コンテンツだけから `native/www/` を生成します。

## Platform status

- **Android (Phase 1)**: 実装済み。`native/android/` に Gradle プロジェクトあり。
- **iOS (Phase 2 / Simulator 検証済み・実機は未検証)**: `npx cap add ios` でプラットフォームの骨格を追加済み（`native/ios/` に Xcode プロジェクト一式）。2026-07-17 に完全版 Xcode 26.6 + iOS 26.5 Simulator runtime + CocoaPods 1.17.0 がこのマシンへ導入され、**Xcode 26.6 + iOS 26.5 Simulator (iPhone 17) でのビルド・インストール・起動・WebView描画まで実際に確認済み**。
  - 依存管理は **CocoaPods ではなく Swift Package Manager (SPM)**。`native/ios/App/` に `Podfile` は存在せず、`native/ios/App/CapApp-SPM/Package.swift` が Capacitor ランタイム (`capacitor-swift-pm` 8.4.2) を解決する。そのため CocoaPods 導入済みでも `pod install` は実行されない・不要（`npm run ios:sync` = `npx cap sync ios` は Package.swift の更新のみ行う）。
  - ビルドも CocoaPods 由来の `App.xcworkspace` は存在しないため、`xcodebuild -workspace App.xcworkspace ...` ではなく `xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' build` で `** BUILD SUCCEEDED **` を確認。
  - 検証手順: `npm run stage-www` → `npm run ios:sync` → 上記 `xcodebuild build` → `xcrun simctl install booted <App.app>` → `xcrun simctl launch booted com.kodamanomori.pono` → `xcrun simctl io booted screenshot`。ホーム画面上のアプリアイコン・表示名（「ポノのあそびば」）、タイトル画面（サインボード・「タップしてはじめよう」）、プロフィール/キャラクター選択画面（キャラアイコン・プライバシー通知モーダル）まで、フォント・画像とも正常描画をスクリーンショット目視で確認。
  - ⚠️ **初回のみ**、SPM が `capacitor-swift-pm` を GitHub から取得する際に macOS Keychain の認証確認ダイアログ（GUI）が出ることがある。ヘッドレス/CI 実行では初回だけ人手（ログインパスワード入力）が必要になる可能性があるため、無人 CI に組み込む場合は事前に Package 解決を済ませておくか、別途対応を検討すること。
  - ⚠️ **物理 iPhone 実機でのインストール・動作確認は今回もまだ未実施**。AGENTS.md §7.4 が求める「Android 物理端末」要件を iOS Simulator 確認では代替できない。実機検証は別途必要。
  - 補足: タイトル画面のスクリーンショットはコンテンツが90度回転して写っているが、これは**このゲームが横向き専用で、プレイ時は端末を横向きに回転させる設計のため意図通り**（ユーザー確認済み）。Simulator側で端末を横向き回転させた状態のスクリーンショットのため、portrait のまま撮ると縦長フレームに横向きレイアウトが写り込む。ビルド不具合ではない。
  - `native/ios/App/App/public/`（`cap sync` で再生成される `www/` の巨大コピー）や `Pods/`、`DerivedData/`、`xcuserdata/` などは Git 管理対象外（ルート `.gitignore` および `native/ios/.gitignore` 参照）。`App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`（SPM の依存バージョン pin）はどちらの gitignore にも該当せず、通常どおり追跡対象。

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
npm run ios:sync    # 要 Xcode（Phase 2、Simulator ビルドまで検証済み。実機は未検証。上記 Platform status 参照）
```

`stage-www` は全 preflight 完了後に一時ディレクトリへ出力し、内容検証に合格した場合だけ `www/` を入れ替えます。失敗時は直前の `www/` を保持します。生成した `www/` は Git 管理対象外です。

`verify-assets` は manifest と生成物のパス・サイズ・内容を完全照合し、禁止物や native flag の欠落も検査します。`verify-references` は HTML/CSS の同一origin参照と、シールカタログ内の動的画像参照を検査します。

## Current scope

現在はタイトル、主要5ゲーム、なぞなぞトレイン、クッキング、もじっこファーム、ヘルプ、アンケート、プロフィール/ガチャ/ショップ、シールちょう、シールミュージアムと、その実行時素材を同梱します。旧方式の約1.28GBに対し、manifest版は約932.9MBです。

シールちょうの Three.js、Google Fonts、一部 capture ライブラリには外部配信参照が残っています。そのため現段階は完全オフライン保証ではありません。外部依存のローカル同梱化は、Unity試作と実機性能測定に合わせて次工程で判断します。
