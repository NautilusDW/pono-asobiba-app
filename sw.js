// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting
// v2362: 新規ミニゲーム「ポノのかわづり」Phase 0 (川づりMVP) を tsuri-kawa/
// として追加し、play.html GAMES/APP_TITLE_MENU_IDS に登録。ゲーム個別ファイルは
// network-first配信のためCRITICAL_ASSETSには追加しない。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSIONと同期 (2362)。
// v2361: ひょっこりハイタッチ「もりのおさんぽ」の背景色を場所ごとに刷新。
// どんぐりみちは赤茶・琥珀、みずべは水色・青緑へ分離し、こもれびひろばの
// 黄緑との差を明確化。locations.js の query を20260723-1444へ同期。背景2点と
// ゲーム個別ファイルはnetwork-first配信のためCRITICAL_ASSETSには追加しない。
// play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSIONと同期 (2361)。
// v2360: ひょっこりハイタッチの動物本体だけを下辺マスク内へ分離し、月・
// 通常光・ボーナス画像内の星と光彩・加点表示が右上で切れる問題を修正。
// styles.css/index.html queryを20260723-1442へ同期。ゲーム個別ファイルは
// network-first配信のためCRITICAL_ASSETSには追加しない。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSIONと同期 (2360)。
// v2359: ぐらぐらシーソーひろば 二度目のクロスレビュー軽微指摘3件を是正。
// (1) R7 (index6) の tray dog/cat/frog 3種同時登場を緩和 (frog を外し
// blueberry+1)。 (2) R8/R9 (index7/8) で mystery_stone/star_block が
// 初登場ラウンドの tray (ドラッグ対象) に無かった不備を修正 (left固定だけで
// 触れなかった問題)。 (3) mystery_stone の意外性強化のため weight9→13 に変更
// (通常のmサイズ帯6〜8からわずか+1しか離れておらず弱かったため)。
// logic.js のみの変更、本番 placeItem を呼ぶ全探索スクリプトで全10ラウンドの
// 解到達可能性・slip到達可能性・near-balance到達可能性を再検証済み。
// guragura-seesaw/index.html の ?v= を20260723-7→8 (styles.css/logic.js/
// game.js、実体は logic.js のみ変更)。play.html PAGE_CACHE_VERSION/
// window.PONO_SW_VERSION と同期 (2359)。
// v2358: ポノのまちづくり (machizukuri/) を comingSoon+debugPlayable で新規追加し、
// APP_TITLE_MENU_IDS にも登録。しゅうかくで そだつ まち v1 (12区画・買って置く・
// 花ミクロスロット・室と畑への読み取り専用連携)。ゲーム個別ファイル
// (machizukuri/index.html, machizukuri/styles.css, machizukuri/js/logic.js,
// machizukuri/js/parts.js, machizukuri/js/game.js) は network-first 配信のため
// CRITICAL_ASSETS には追加しない (hatake-nikki/guragura-seesaw 新規追加時の
// v2325 と同型)。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2358)。
// v2357: ぐらぐらシーソーひろば v3 再設計 (人形/大きさ=重さ統一・10ラウンド化・
// ふたご皿廃止) のUI側追従。roundDots 5→10個、.pan 17%→25%/item-box 9-15%→
// 7-11% に縮小して5個グループのお皿詰まりを解消、ふたご皿UIは休眠コードとして
// 一貫させたまま維持 (実行時には到達しない)。tests/e2e/guragura/ の
// twin-basket-round3.spec.ts / remove-placed-item.spec.ts を10ラウンド構成に
// 追従。guragura-seesaw/index.html の ?v= を20260723-6→7 (styles.css/logic.js/
// game.js)。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2357)。
// v2356: ひょっこりハイタッチを、こもれび6穴／どんぐり5穴／みずべ4穴の
// 「もりの さんぽみち」3地点へ拡張。場所データ、30秒完走ごとの保存進行、
// 新背景2点、たぬき／かわうそ4状態、結果の散歩道、低速読込とfocus終端を追加。
// ゲーム個別ファイルと新規画像はnetwork-first配信のためCRITICAL_ASSETSには
// 追加しない。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2356)。
// v2355: なぞなぞトレイン「きょうりゅうのもり」の救助背景を、親不在で
// 閉じ込められた子ども恐竜3頭へ変更。水路はかんたん3×4／ふつう4×5／
// むずかしい4×7へ分け、発光ゴールと回転時の水路中央接続を追加した。
// 個別CSS/JS queryを20260723-1436へ同期。ゲーム個別ファイルはnetwork-first
// 配信のためCRITICAL_ASSETSには追加しない。play.html PAGE_CACHE_VERSION/
// window.PONO_SW_VERSION と同期 (2355)。
// v2354: ぐらぐらシーソーひろばのぞうラウンドを、GPT Image 2製の
// ほし／はーと／ふしぎないし各weight7と、ぶどうweight3の発見型パズルへ変更。
// 3種は見た目サイズを変えつつ同じ重さとし、軽すぎる試行には方向どおりの案内を表示。
// 実配置関数の全状態探索で初手許容75%、全トレイ参加、前進不能・黙った超過0を確認。
// styles/logic/game queryを20260723-6へ同期。ゲーム個別ファイルはnetwork-first配信の
// ためCRITICAL_ASSETSには追加しない。play.html PAGE_CACHE_VERSION/
// window.PONO_SW_VERSION と同期 (2354)。
// v2353: なぞなぞトレイン「きょうりゅうのもり」のクレーンを、困っている
// こどもの恐竜の救出へ変更。救出前後の背景、停止前の予告、説明画面、
// 段階的な画像先読み、水路の源から池までの順送り表示を追加し、個別CSS/JS
// queryを20260723-1435へ同期。ゲーム個別ファイルはnetwork-first配信のため
// CRITICAL_ASSETSには追加しない。play.html PAGE_CACHE_VERSION/
// window.PONO_SW_VERSION と同期 (2353)。
// v2352: ポノのはたけにっきを、最初から使える論理3×3の9区画へ拡張。
// 画面では奥から1／2／3／2／1枚に見えるアイソメ配置を畑面中央へ置き、
// 旧3／4区画セーブのindexと位置を保持して不足分だけ空畑で補完する。
// 水やり済みしずくは14〜22pxへ縮小して札の左上外側へ移し、作物絵と
// 隣接畝の土へ重ならないようにした。styles/logic/game queryも更新。
// ゲーム個別ファイルはnetwork-first配信のためCRITICAL_ASSETSには追加しない。
// play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2352)。
// v2351: ひょっこりハイタッチの6茂みを背景の接地点へ揃え、画像内で右寄りだった
// 穴中心をキャラ窓へ補正。前葉と窓下端を同じ高さで閉じて出現途中の下漏れを防ぎ、
// 停止位置も上げてキャラの胴体が水平に切れる表示を解消した。styles.css queryを
// 20260723-1432へ同期。ゲーム個別ファイルはnetwork-first配信のため
// CRITICAL_ASSETSには追加しない。play.html PAGE_CACHE_VERSION/
// window.PONO_SW_VERSION と同期 (2351)。
// v2350: ポノのはたけにっきを、最初から使える4区画の左右対称なアイソメ2×2
// (奥1・中央左右2・手前1)へ整理し、中央に緑のあぜ道を確保。旧3区画セーブは
// 既存データを保持して4枠目だけ空畑で補完する。全区画の共通左上アンカーへ
// 60〜70%サイズの作物札を置き、その左上へ約60%サイズの水やり済み生成マークを
// 重ねた。styles/logic/game queryも更新。ゲーム個別ファイルはnetwork-first配信のため
// CRITICAL_ASSETSには追加しない。play.html PAGE_CACHE_VERSION/
// window.PONO_SW_VERSION と同期 (2350)。
// v2349: ひょっこりハイタッチの上段3か所を短い画面で0.90、それ以外で0.88へ
// 縮小して少し奥へ接地させ、下段3か所は基準サイズのまま相対的に手前へ見せる
// 前後パースを追加。葉の茂み・手前縁・キャラ窓を同じ比率で拡縮し、押下時も比率を
// 維持する一方、6か所のタップ面は無変形・同寸のまま保った。styles.css queryを
// 20260723-1431へ同期。ゲーム個別ファイルはnetwork-first配信のため
// CRITICAL_ASSETSには追加しない。play.html PAGE_CACHE_VERSION/
// window.PONO_SW_VERSION と同期 (2349)。
// v2348: guragura-seesaw の重さ再設計 (logic.js CATALOG/ROUNDS/TWIN_ROUND_CONFIG/
// SLIP_DIFF を「果物/野菜(1-3) < 動物(4-10)、動物内 frog<cat<dog<bear<elephant」
// の一貫順序へ全面更新) に追従し、tests/e2e/guragura/ の twin-basket-round3.spec.ts /
// remove-placed-item.spec.ts がハードコードしていた解 (dog+lemon 等) を新しい
// 重さで実在する解 (dog+frog, dog→cat/frog→lemon 等) へ更新。ゲーム個別ファイルは
// network-first配信のためCRITICAL_ASSETSには追加しない。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2348)。
// v2342: ひょっこりハイタッチを30秒へ短縮し、実出現7体ごとのGPT Image 2製
// 「ひかりモモンガ」(30点)、通常10点／ボーナス30点＋連続成功コンボ加点、
// リアルタイム加点・コンボHUD、端末内の最大コンボ記録を追加。自然退場はコンボを
// 維持し、睡眠タップの減点と終盤の音カウントを撤去して急かしすぎない進行へ調整。
// ゲーム個別ファイルと画像はnetwork-first配信のためCRITICAL_ASSETSには追加しない。
// play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2342)。
// v2341: guragura-seesaw「タップで はじめる」無反応の再発 (2026-07-22 に一度修正した
// logic.js 読込リトライは健在だったが、横画面誤検知ガード (#landscape-notice) が
// 旧来の innerHeight>=innerWidth 素朴比較のままだったため、WebView起動直後/回転中の
// 中間resize等でinnerWidth/innerHeightが不正確な値を返すと誤って表示されボタンを
// 塞いでいた) を修正。姉妹ゲーム hyokkori-hightouch 確立済みパターンを移植し、
// screen.orientation.type優先+matchMedia(orientation)フォールバック+fail-open+
// try/catch二重防御 (computeIsPortrait/isCoarsePointer個別 + boot()全体をbootInner()
// 経由でtry/catch化) に統一。pageshow/load/visualViewport resizeの再評価トリガーも追加。
// ゲーム個別ファイルは network-first 配信のため CRITICAL_ASSETS には追加しない。
// play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2341)。
// v2340: ひょっこりハイタッチをGPT Image 2製の専用32画像へ刷新し、起きている
// 友だちへの成功時だけ「ひかりのたね」が別の隠れ場所へ移るリレーと、4回ごとの
// 花壇3段階成長を追加。専用awake/sleeping画像、森背景、隠れ場所、開始/結果、FX、
// メニューサムネを接続した。ゲーム個別ファイルと画像はnetwork-first配信のため
// CRITICAL_ASSETSには追加しない。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION
// と同期 (2340)。
// v2339: guragura-seesaw に「ふたご皿(twin basket)」メカニクスを追加 (ラウンド3-5、
// logic.js の TWIN_ROUND_CONFIG/placeItemTwin/removeItemTwin と対になるUI実装)。
// ラウンド3(elephant単体,普通)=1皿最大3個/局所重さ上限5、ラウンド4(dog+cherry)・
// ラウンド5(bear+grapes、難しい)=1皿最大2個/局所重さ上限4。 右皿をA(桃#FFD9B3/橙
// #FF9F45)・B(藤#E0D4F7/紫#9B7FD4)の2ドロップゾーンに分割し、局所超過(そのお皿だけ
// おもすぎ)は「こっちのおさらだけ、おもすぎたみたい！」を該当バスケット近くに表示。
// ラウンド1・2は既存の単一右皿(rightIds/placeItem/removeItem)のまま無変更。ゲーム
// 個別ファイルは network-first 配信のため CRITICAL_ASSETS には追加しない。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2339)。
// v2338: なぞなぞトレイン恐竜分岐の先頭へ、列車クレーンで湧き水そばの
// 倒木を安全地帯へ運ぶイベントを追加。クレーン→水路→ティラノ勝負の3イベント、
// pointer/keyboard入力、同イベント無罰retry、遅延decode/stale callback防御を実装し、
// なぞなぞ個別CSS/JSの読込tokenを1418へ更新。ゲーム個別ファイルと画像は
// network-first配信のためCRITICAL_ASSETSには追加しない。play.htmlの
// PAGE_CACHE_VERSION/window.PONO_SW_VERSIONと同期 (2338)。
// v2337: hatake-nikki コードレビュー指摘の修正。 (1) 常設ステータスバーの
// updateStatusBar() に force 引数を追加し、 beginPress() の長押し開始時(優先度1の
// 「そのまま ゆびを はなさないでね…」)だけ statusFlashTimer 中でも強制的に上書き
// できるようにした(直前の水やり成功flash等に最大1.6秒埋もれるバグを解消)。
// (2) beginPress() の水やりタイマー開始条件へ !plot.wateredToday を追加し、
// 既に本日水やり済みの畝を長押ししても成功フロー(バッジ/スプラッシュ/flash/
// ハプティクス)が再生されないようにした。 ゲーム個別ファイルは network-first
// 配信のため CRITICAL_ASSETS には追加しない。play.html PAGE_CACHE_VERSION/
// window.PONO_SW_VERSION と同期 (2337)。
// v2336: guragura-seesaw に「あとちょっと！ハラハラ演出」を追加。 釣り合いに近づいた
// 瞬間(near-balance rising edge)だけ #plank に淡い金色グロー(box-shadow アニメ、
// transform は絶対に含めない)+ common/haptics.js の新パターン 'nearBalance'(8ms単発)
// を1回だけ発火。 logic.js に純関数 isNearBalance(targetDeg, nearDeg) と定数
// NEAR_BALANCE_EPS_DEG=5.0 (重さ差1個ぶん=3.5degは近い/2個ぶん=7degは近くない、
// を切り分ける中間値) を追加。 ゲーム個別ファイルは network-first 配信のため
// CRITICAL_ASSETS には追加しない。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION
// と同期 (2336)。
// v2331: donguri-wakekko/hyokkori-hightouch/hatake-nikki/guragura-seesaw の横画面誤検知
// +スタートボタン無反応の修正セッション。ゲーム個別ファイルは network-first 配信のため
// CRITICAL_ASSETS には追加しない。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION
// と同期 (2331)。
// v2330: guragura-seesaw 板センタリング欠落によるレイアウト崩れ修正 + 初回チュートリアル追加。
// #plank (left:50%; width:58%; のみでセンタリング補正なし) が回転ゼロでも常に右へ
// オーバーフローし右皿 (#panRight) が #stage 外へ出て不可視になっていたバグ (初回コミット
// e46006e77 から存在) を、位置決め専用の #plankPivot ラッパーを新設し #plank を
// transform-origin 50% 50% の回転専用要素へ分離する二層構造で修正 (game.js の rAF ループが
// #plank の transform を rotate(θ) で毎フレーム上書きするため CSS 単体修正は不成立、
// game.js 側は無変更)。加えて初回自動チュートリアル (pono_guragura_tut_seen_v1) 導入、
// TUT_STEPS 文言改善、ドロップ先ハイライト (.pan-right.is-drop-target) 追加。ゲーム個別
// ファイルは network-first 配信のため CRITICAL_ASSETS には追加しない。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2330)。
// v2329: hyokkori-hightouch「はじめる」ボタン無反応バグの再発防止修正。guragura-seesaw
// (v2327) と同型の脆弱パターン (js/logic.js 読込失敗時に game.js 全初期化が無言スキップ)
// が js/game.js 冒頭ガードに存在していたため、同じ boot() ラップ+自動リトライ1回+
// 再読込UIを移植し、script タグに ?v= キャッシュバスティングを付与。ゲーム個別ファイルは
// network-first 配信のため CRITICAL_ASSETS には追加しない (v2327 と同型)。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2329)。
// v2328: なぞなぞトレインの恐竜分岐を、みずみち救助とティラノのきてき勝負からなる
// 専用アドベンチャーへ刷新。GPT Image 2製の水辺2景・ティラノ6状態・咆哮／汽笛／
// 水タンク／操作部品13点を実行時読込し、縦向き・バックグラウンド中断時の入力を破棄する
// (batch:1411-nazonazo-dino-adventure)。個別素材はnetwork-firstのためprecache追加なし。
// v2327: guragura-seesaw「はじめる」ボタン無反応バグ修正。js/logic.js 読込失敗時に
// game.js 全初期化が無言スキップされる脆弱性へ、自動リトライ1回+再読込UIを追加し、
// script タグに姉妹ゲーム同型の ?v= キャッシュバスティングを付与。ゲーム個別ファイルは
// network-first 配信のため CRITICAL_ASSETS には追加しない (v2325 と同型)。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2327)。
// v2325: ポノのはたけにっき (hatake-nikki/) とぐらぐらシーソーひろば (guragura-seesaw/) を
// comingSoon+debugPlayable で新規追加し、APP_TITLE_MENU_IDS にも登録。ゲーム個別ファイルは
// network-first 配信のため CRITICAL_ASSETS には追加しない (v2318/v2320 と同型)。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2325、並走セッションによる2322→2325の
// バージョンドリフトも解消)。
// v2322: donguri-wakekko の hidden 属性無効化バグ修正 (.overlay-screen/.board-screen の
// 無条件 display:flex が UA stylesheet の [hidden]{display:none} をカスケードで打ち消し、
// title/result オーバーレイが常時同時表示になる事故。#app [hidden]{display:none !important}
// を追加して修正) + 横画面16:9化。ゲーム個別ファイルは network-first のため CRITICAL_ASSETS
// 追加不要 (v2318 と同型)。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2322)。
// v2321: hyokkori-hightouch を横画面 (16:9) レイアウトに刷新。
// v2320: ひょっこりハイタッチ (hyokkori-hightouch/) を comingSoon+debugPlayable で新規追加。
// ゲーム個別ファイルは network-first 配信のため CRITICAL_ASSETS には追加しない
// (v2318 と同型)。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2320)。
// v2319: play.html APP_TITLE_MENU_IDS にどんぐりわけっこ対決 (donguri-wakekko) が
// 漏れていたのを追加し、アプリ版タイトルから遊べるように修正 (pakupaku-catchは既存)。
// v2318: どんぐりわけっこ対決 (donguri-wakekko/) とぱくぱくキャッチ (pakupaku-catch/) を
// comingSoon+debugPlayable で新規追加。ゲーム個別ファイルは network-first 配信のため
// CRITICAL_ASSETSには追加しない (batch:1411-tier-a-new-genre-games)。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2318)。
// v2311: なぞなぞトレイン新規分岐の雪・炎パーティクル、恐竜・猫ランドマーク、
// toy背景差し替えと8ステージ高さ補正を最終化。追加8画像は選択面だけの実行時読込とし、
// CRITICAL_ASSETSには追加しない (batch:1385-nazonazo-branch-stage-polish)。
// v2310: もじっこ文字書きをフクロウ博士のなぞなぞ実物枠・紙質へ統一し、
// 白基調の専用4枠を自然比で接続 (batch:1328e-mojikko-match-owl-riddle)。
// v2309: なぞなぞトレインの新規分岐8ステージへ、選択した面だけを読む
// 6層ラスター背景とシームレスなパララックスを追加。48画像は実行時選択読込のため
// CRITICAL_ASSETSには追加しない (batch:1382-nazonazo-branch-bg-raster-integration)。
// v2308: なぞなぞトレイン分岐系列(batch:1401〜1404)と、LP／アプリ入口タイトルロゴ
// 系列(v2303〜v2307)を履歴保持で安全統合し、両系列を同一キャッシュ世代へ更新
// (batch:1382-nazonazo-branch-bg-raster-integration)。
// v2307: 直前の白いおなかの横方向への張り出しを戻し、元の腹幅を保ったまま
// 脇の下〜前腕直下だけを上向きに白毛でつないだ。前腕・左側の茶色い胴・
// 下側の腹毛・顔・足・文字・透明輪郭は維持した
// (batch:1372h-lp-title-belly-underarm-vertical-fill)。
// v2306: LP／アプリ入口タイトルの白いおなかを、画像左側の腕の付け根〜脇の下だけ
// 弧状に少し広げた。前腕・中央／右／下側の腹毛・顔・足・文字・透明輪郭は維持した
// (batch:1372g-lp-title-belly-armpit-fill)。
// v2305: v2304では実寸で差が見えなかったため、白いおなかの上端を前腕の直下まで
// 明確に拡張。前腕の茶色と下側の腹毛は維持した
// (batch:1372f-lp-title-belly-visible-upper-fill)。
// v2304: LP／アプリ入口タイトルの白いおなかを、前腕の背後で少し上へ拡張。
// GPT Image 2の再生成結果から上端だけを合成し、前腕・下側の腹毛・透明輪郭は維持した
// (batch:1372e-lp-title-belly-upper-fill)。
// v2303: LP／アプリ入口タイトルの白いおなかをGPT Image 2で再生成。
// 座標輪郭を廃止して水彩の毛先が連続する小さめの腹毛だけを元ロゴへ合成し、
// 顔・前腕・足・文字・透明輪郭は元画素のまま維持した
// (batch:1372d-lp-title-belly-regenerate)。
// v2299: LP／アプリ入口タイトルの白いおなかを、生成見本と同じく前腕の背後へ配置。
// 前腕下面カーブ＋3pxを元画素のまま保護し、腕への色かかりを解消した
// (batch:1372c-lp-title-belly-arm-clearance)。
// v2298: LP／アプリ入口のタイトルロゴで、白いおなかが生成見本より左へ広がった
// batch:1372 の反映ずれを修正。生成見本と同じ右寄りの小さな縦長形へ合わせ、
// 色もオリジナル準拠の温かいアイボリーへ調整した (batch:1372b-lp-title-belly-position)。
// v2293: room家具24品48点はitems.jsの公開URLを変えず、SW内だけで1371c専用cache keyへ
// 保存する。旧同名画像cacheを再利用せず、初回はno-store取得する (batch:1371c-room-furniture-angle-correction)。
// v2292: room家具24品48点を、角度補正版rawからsoft alpha付きA/Bへ差し替え。
// Bは完成Aの画素完全水平反転で統一した (batch:1371-room-furniture-repertoire-expansion)。
// v2291: LP／アプリ入口のタイトルロゴで、ポノのおなかをオリジナル準拠の
// 温かいアイボリー色へ修正。ロゴ文字・顔・ポーズ・透明キャンバスは維持し、
// index.html／index-app.html の画像queryも同期した (batch:1372)。
// v2289: 独立レビューで発見されたCriticalバグ修正。common/treasure.jsのshowTreasure()は
// _choiceMode/_choices/_onChooseをモジュール単一状態で持つため、stamp-rally.jsの
// checkSlotReward()がカード境界(total=15,30,45)で「未取得スロット報酬」(setTimeout 200ms)
// と「カード完成報酬」(setTimeout 1200ms)を独立に呼ぶと、後発の呼び出しが先発の選択未確定
// (onChoose未発火)のまま状態を上書きし、先発のgrantRewardが永久にロストしていた
// (v2288の2択UI化でgrantを選択確定後まで遅延させたことで露見)。showTreasure()に呼び出し
// キューを実装し、表示中の宝箱が完全に閉じきる(onChoose確定+モーダルclose)まで次の呼び出し
// を待たせるよう修正 (common/treasure.js)。実ブラウザ(Playwright)で、待ち時間ゼロの連続呼び出し
// および1件目を無操作でオートクローズさせるケースの両方で両方の報酬が過不足なく正しい順序で
// 確定することを検証 (tests/e2e/treasure/treasure_queue_regression.spec.js)。副次的に、
// _doClose()のタップオーバーレイ除去セレクタ([style*="z-index:3"]、実ブラウザのstyle属性
// 再シリアライズでスペースが入り一致しない)と、閉じるアニメーションのinline transformが
// 次回表示にクリアされず残留する(2回目以降の宝箱が潰れたまま表示される)、の2件の関連バグも
// 同じPlaywright検証で発見し修正。stamp_rally_slot_reward_boundary_regression.cjsのshowTreasure
// スタブも2択onChoose確定を模擬するよう更新し再度パス確認 (batch:1371)。play.html
// PAGE_CACHE_VERSION / PONO_SW_VERSION と同期。
// v2288: 性別自動判定(pono_profile、現行導線からは誰も書き込まない壊れたキー)を撤去し、
// gendered な報酬(boy/girl両バリアント)をタップして選ばせる2択UIに置き換え。
// common/treasure.jsのshowTreasure()にoptions.choices/onChooseを追加し、選択確定後に
// grantRewardする設計に変更 (common/first-clear.js, common/stamp-rally.js)。
// v2287: スタンプカード境界(total=15,30,45,...)でスロット報酬(1/8/15マス目)が二重付与
// される既存バグを修正。getCardNum(total)が境界ちょうどの時「次のカード」の番号を返して
// いたため、getFilledInCard(total)(=満タンの15)と矛盾し、checkSlotReward()がスロット
// 報酬キーを誤った次カード番号(例: card2_slot1)で組み立てて既付与分(おもちゃばこ/ベッド)
// を再付与していた。getCardNum()を「直前に完成したカード」の番号を返すよう修正し境界で
// 整合させた(common/stamp-rally.js)。total=1..45のシミュレーションで二重付与解消を検証
// (tests/stamp_rally_slot_reward_boundary_regression.cjs)。play.html PAGE_CACHE_VERSION /
// PONO_SW_VERSION / stamp-rally.js?v= と同期。
// v2286: 管理ダッシュボードのなぞなぞトンネル パネル見出しを「🚂 ステージを試す」から
// 「🚂 なぞなぞトンネル ステージセレクト（試遊）」へ変更し、App staging 管理画面
// (https://pono-asobiba-app-staging.ndw.workers.dev/admin/) でのみ有効という説明を
// 静的テキストで追記。タブ文言・postMessage token/origin検証・機能自体は無変更
// (batch:1351-nazonazo-tunnel-stage-select-recovery)。play.html PAGE_CACHE_VERSION
// と同期不要 (admin/テストのみ変更)。
// v2280: 窓と床家具の衝突判定をalpha外接長方形から実不透明ピクセルマスクへ変更。
// カーテン中央やアーチ内側の透明領域へ家具を置ける一方、窓枠へ実際に食い込む
// 配置は従来どおり拒否する (batch:1360-room-pixel-mask-window-collision)。
// v2279: ブロッコリー／枝豆の鍋内アニメーションを全食材共通周期の往復から、
// 房・さやごとに周期／位相／3区間の移動量／回転方向が異なる独立対流へ変更。
// 湯切り時の完成食材を穴あきおたまの受け部と白い浅皿の中央へ再配置し、
// 「ボウルへ」を「おさらへ」へ修正 (batch:1358-kitchen-independent-convection)。
// v2278: 水切り後の深い黄ボウルはコンロの見下ろし角度と合わず、前縁maskも
// 不自然なため廃止。既存の白い浅皿 `prep_plate.png` を再利用し、穴あきおたまで
// 湯を切った食材を内側へ置く配置へ変更。完成食材のclip-path maskを完全撤去。
// 鍋内食材も水面mask幅29→23%へ縮小し、全房・さやを水面中央側へ寄せて端切れを防止
// (batch:1353-kitchen-familiar-drain-plate)。play.html同期不要。
// v2277: 茹で塩瓶を右上過ぎる69%→63%へ中央寄せ。瓶自体を右上→左下へ動かす
// 専用shakeへ変更し、塩粒もstart x61〜65%からend x44〜52%へ必ず9%以上左下へ
// 落ちる軌道に強化。縦長transparent canvasで小さく見えた皿上ブロッコリーを
// 8.5→12%へ拡大し、皿中央の2段へ集合配置 (batch:1352-kitchen-salt-direction-broccoli-bank)。
// play.html同期不要。
// v2276: 茹で鍋を3%下げ、塩瓶を16%→11.5%へ縮小して鍋右上の操作範囲へ限定。
// 左上→右下の固定grid塩を撤去し、右上から左下の水面へ落ちる20粒の個別particle
// burstへ変更。水面演出も鍋と一緒に3%下げ、皿上ブロッコリーを6.5%→8.5%へ拡大
// (batch:1351-kitchen-boil-salt-particles)。play.html同期不要。
// v2275: 茹で鍋をコンロの見下ろしパースへ合わせた中深さのGPT Image 2生成画像へ
// 再差替え。表示76%／top -1%、水面mask・泡・波紋・投入食材を
// 36.6×33%の新しい共通楕円へ再計測し、runtime URLを `?v=1350` へ更新
// (batch:1350-kitchen-pot-perspective-medium-depth)。play.html同期不要。
// v2274: batch:1349で差し替えた茹で鍋が、開いたままの旧クライアントで同一URLの
// 画像cacheから表示され続けるため、runtime参照へ `?v=1349` を付けて新画像を
// 必ず取得させる。配信済みPNGのSHA-256はローカルとApp stagingで一致確認済み。
// play.html同期不要。
// v2273: 茹で鍋をGPT Image 2で生成し直し、欠けていた下側を丸胴から平底まで
// 完全に描画。クロマ透過後の新しい鍋の実測に合わせて表示を70%へ調整し、
// 水面mask／泡／波紋／鍋内食材を38×25.5%の同一楕円へ再配置。既存heat-glowは
// 形を変えず鍋底の背後へ移動 (batch:1349-kitchen-complete-boil-pot)。
// play.html同期不要。
// v2272: おへやのベッドチュートリアルが既存配置を中央へ強制移動する処理と、
// 家具衝突時に別の空きセルへ自動移動する処理を廃止。既存位置を維持し、
// 置けないドラッグは元位置へ戻してユーザー指定外の移動を防止
// (batch:1349-room-no-forced-furniture-move)。play.html同期不要。
// v2271: 茹で工程だけに新設してしまった青い円形flameを撤去。焼く・揚げる工程で
// 既に使っている既存heat-glow（オレンジの2本炎）を同じclass／animationのまま
// 鍋下中央へ配置し、火の形・色・動きをトントンキッチン内で統一
// (batch:1348-kitchen-reuse-existing-flame)。play.html同期不要。
// v2270: ブロッコリー／えだまめ茹で鍋を56%へ縮小し、鍋底・五徳・青い火を
// 画面内表示。水面mask／泡／波紋を同一35.8×26.5%楕円へ統一し、皿上の房・
// さやを実皿内へ再配置。湯切りボウルを縦方向へ起こし、完成食材を内側楕円で
// clipして前縁からのはみ出しを防止
// (batch:1347-kitchen-boil-geometry-fire-drain-mask)。play.html同期不要。
// v2269: にんじんいんげんの旧いんげん短冊を、GPT Image 2生成の包丁切断面が
// 見える個別10種へ差し替え。炒め操作は距離900→2200、接触11→14片、最低7秒へ
// 延長し、急いで数回動かしただけでは完成しないようにした
// (batch:1346-kitchen-green-bean-cut-pieces)。play.html同期不要。
// v2268: 材料選択で冷蔵庫画像を縦長枠へcoverして拡大クロップしていた状態を
// 元画像に近い8:5枠へ修正。素材カードの中央占有幅と画像寸法も抑え、背景の
// 暗さ・ぼかし／かな名札／縦スワイプは維持
// (batch:1344b-kitchen-carousel-no-zoom)。play.html同期不要。
// v2267: 下部ナビ「おしらせ」ベルの未読件数バッジ (#bottomNavNewsBadge) の数字が
// 実機で欠けて見える不具合を修正。原因は旧 .bn-item 定義 (play.html L1341) の
// overflow:hidden が現行 .bn-item 定義 (L9189) で上書きされずカスケードで残存し、
// .bn-badge の top:-7px/right:-7px はみ出し配置を四角くクリップしていたこと
// (WebKit固有のmask×filterバグではなく、Chromium/WebKit両方で再現する素の
// overflow:hidden起因と実機再現確認済み)。.bn-item に overflow:visible を明示
// 追加してクリップ源を除去。バッジ自体の見た目は変更なし
// (batch:1345-bn-badge-clip-fix)。play.html PAGE_CACHE_VERSION / PONO_SW_VERSION
// を2267へ同期。
// v2266: トントンキッチンの材料選択を、暗くぼかした冷蔵庫背景上の3枚1段
// 縦スワイプカルーセルへ変更。素材名を白いかな名札で常時読みやすくした
// (batch:1344-kitchen-ingredient-vertical-carousel)。play.html同期不要。
// v2265: もじっこファーム文字書きを白紙面の木枠6種へ刷新。汎用枠に加え、
// 文字リスト／ミルマル／メッセージ／書字盤／書き順へ葉・芽・どんぐり等の
// 専用corner彫刻を割り当て、個別9-slice補正で直線レールを約6pxへ統一。
// 101pxメッセージの左右safe area、庭背景、設定内の戻る、明朝体お手本を維持
// (batch:1328d-mojikko-white-paper-ornate-frames)。play.html同期不要。
// v2264: 茹で鍋を縮小・上寄せして底と五徳を画面内へ収め、ブロッコリー5房を
// 皿内へ縮小再配置。全投入後の2.8秒加熱待ちと、穴あきおたまを鍋→水切り
// ボウルへ2回ドラッグする湯切り操作を追加
// (batch:1343-kitchen-boil-timing-drain-gameplay)。play.html同期不要。
// v2263: ブロッコリー／えだまめの茹で水面を鍋画像から計測した共通楕円へ統一。
// 鍋内食材を専用水面マスクへ収め、波紋の極端な横長比とブロッコリーの
// 中央基準が消える上下動を修正
// (batch:1342-kitchen-boil-water-mask-perspective)。play.html同期不要。
// v2262: えだまめの見えない洗浄工程を削除し、塩を振る→塩もみ→茹でるへ簡略化。
// 固定グリッド状の塩を廃止し、瓶の穴から不規則な20粒が弧を描いて落下し、
// 各さやの上へ段階的に残る粒レイヤーへ変更
// (batch:1341-kitchen-edamame-individual-pods followup)。play.html同期不要。
// v2261: えだまめをGPT Image 2生成の個別さや12枚へ刷新。器の中で洗う→
// 塩を振る→個別に混ざる塩もみ、点火→沸騰→皿から8さやを1つずつ投入へ再構成。
// 着水ごとの白い波紋／泡と、水流による個別の回転・揺れを追加
// (batch:1341-kitchen-edamame-individual-pods)。play.html同期不要。
// v2260: GPT Image 2で生成した長い木製菜箸を透過し、にんじんいんげん／
// きんぴらの2.5D混ぜ操作をCSS製ヘラから菜箸へ変更。先端をpointerへ合わせ、
// 子ども向け案内も「さいばし」へ統一
// (batch:1340-kitchen-saibashi)。play.html同期不要。
// v2259: にんじんいんげん完成時を現行free-layout画像へ切替。きんぴらは旧カード／
// 巨大な汎用焼き素材を廃止し、にんじん細切り→専用ごぼう細切り10枚→ヘラ炒めの
// 順序操作と現行kinpira完成画像へ統一
// (batch:1339-kitchen-current-finals-kinpira)。play.html同期不要。
// v2258: もじっこファーム文字書きの全外枠を、正本設定ボタンと同じ木枠厚へ
// 揃えた単一9-sliceマスターへ統一。通常9px／短い横画面13px、
// slice47 fill／stretchで紙面の反復継ぎ目を防止。設定は正本画像、
// 戻るは設定内、モード選択は外枠1つ＋1px区切り。庭背景と明朝体お手本を維持
// (batch:1328c-mojikko-settings-gauge-frame-family)。play.html同期不要。
// v2257: にんじんいんげんの個別切れ端21枚に残っていた不透明な紫背景を除去。
// にんじん11枚／いんげん10枚をsoft matte・despill付き透過PNGへ再処理し、
// さらに透明余白10pxを加えて切れ端が画像端へ接するクロップ感も解消
// (batch:1338-kitchen-clean-cutout-alpha)。play.html同期不要。
// v2256: にんじんいんげんのCanvasをフライパン内周の実測比率
// left 29.4% / top 12.5% / width 42.1% / height 54%へ拡大・再配置。
// 描画clipと物理境界も同じ楕円比率へ統一してマスクずれを修正
// (batch:1337-kitchen-stir-mask-fit)。play.html同期不要。
// v2255: にんじんいんげんの投入を個別切れ端のにんじん皿→いんげん皿→混ぜる
// 3段階へ変更。投入前の合成レイヤ感といんげんの突然出現を解消し、フライパンの
// 楕円描画範囲を左上へ補正して鍋肌に合わせたクリップを追加
// (batch:1336-kitchen-ninjin-ingen-sequence)。play.html同期不要。
// v2254: にんじんいんげんを、既存の個別切れ端18枚がフライパン内で散らばり、
// PC/タッチのヘラドラッグで押す・回る・少し跳ねる2.5D炒め操作へ変更。
// 透明な塩レイヤーによる入力遮断も回避し、全体を混ぜると完成する。
// (batch:1335-kitchen-ninjin-ingen-stir)。play.html同期不要。
// v2253: v2251の材料固有基準補正を訂正。エディターのstart/end markerは保存時も
// CSS基準87%/13%からtx移動しており、材料固有値を再加算すると青線と1打目が約9pt
// ずれた。画面上の青線中心と包丁先端を直接比較して0.3pt未満に統一
// (batch:1334-kitchen-visible-marker-align)。play.html同期不要。
// v2252: もじっこファームの文字書き画面を、専用生成した絵本調フレーム16点へ統一。
// すべて元画像の縦横比を維持し、選択・押下状態は画像差し替えではなく紙面内の色と
// 動きで示す。庭背景・お手本文字の明朝体・3モード・進捗保存は維持
// (batch:1328b-mojikko-unified-frame-implementation)。play.html同期不要。
// v2251: 材料別に保存した包丁の切り始め/終わり位置を、旧にんじん共通基準
// 87%/13%ではなく各材料固有のstartX/endXへ加算して復元。いんげん1打目の右ずれと
// 切断間隔を修正 (batch:1333-kitchen-marker-material-base)。play.html同期不要。
// v2250: トントンキッチンの新規食材をエディター保存した際、幅`61.9983%`を
// 復元処理が`61.9983px`と誤解して極端に縮めていた単位バグを修正。保存幅・高さの
// `%`/`px`を両対応化 (batch:1332-kitchen-editor-percent-size)。play.html同期不要。
// v2249: トントンキッチン配置エディターの保存先を凍結済みdevelopから現行の
// develop-appへ修正。新規いんげん等の材料別位置キーが保存後の通常画面へ反映される
// 経路を復旧 (batch:1331-kitchen-editor-new-assets)。play.html同期不要。
// v2248: batch:1321-treasure-overlay-permanent-failsafe。宝箱(common/treasure.js
// #treasure-overlay)/初回クリア報酬(common/first-clear.js _simpleAfterMsg)の全画面
// オーバーレイに、将来また閉じるボタンが機能しない不具合が起きても画面が詰まない
// よう恒久的な安全弁2種を追加。①自動タイムアウト閉じ: 両ファイルとも表示直後に
// AUTO_CLOSE_MS/AFTER_MSG_AUTO_CLOSE_MS=10000ms のタイマーを仕込み、無操作でも
// 10秒後に自動で閉じる (既存演出時間: treasure.js動画実測6.4秒、first-clear.jsは
// 静的モーダルに対し十分な余裕)。②背景タップ閉じ: オーバーレイ背景 (子要素除く)
// への直クリックで閉じる。treasure.jsは_finished===true (閉じるボタン表示済み=
// 動画再生完了後)のみ、first-clear.jsは表示から500ms猶予後のみ有効化し、演出中の
// 誤タップ・タップスルーを防止。③_closing/closedフラグでclose btn・背景タップ・
// auto-closeの3経路が競合しても既存クローズ関数(_doClose()/_close())は1回だけ実行
// され、onClose/onDoneの発火タイミングは不変。Playwrightで11ケース検証済み
// (明示クローズ後の誤タイムアウト無し・演出初期の背景タップ無効・約10秒後の自動
// クローズと背後UIクリック復帰、等)。play.html PAGE_CACHE_VERSION / PONO_SW_VERSION
// を2248へ同期(2246→2247は並走セッションのbatch:1330-kitchen-required-step-assets
// と競合したため2248へ繰り上げ)。common/treasure.js の <script src> 固定 ?v= クエリ
// (play.html) も2248へ同期。independent reviewで、AUTO_CLOSE_MSの10秒タイマーが
// 「タップして あけよう！」表示直後(オーバーレイ表示時)に開始され、タップまでの
// 待ち時間を差し引かないままだった不具合を検出・修正: 動画6.4秒+演出だけで budget
// を使い切り、タップまで数秒かかった通常の子供の反応速度でも動画再生中に強制
// クローズされ得た。common/treasure.js の _onTapOpen(タップ直後)と_showCloseBtn
// (閉じるボタン表示時)の2箇所で_scheduleAutoClose()を呼び直し、各フェーズ開始時点
// から常にフルの10秒猶予を確保するよう変更。
// v2247: トントンキッチンの果物7種へ丸ごと／切断後の工程画像を追加し、切る工程は
// 現行まな板と同じ画角で表示。いんげんを独立した下ごしらえ材料として追加し、
// にんじん・いんげんを個別の細い切れ端スプライトへ変更した
// (batch:1330-kitchen-required-step-assets)。play.html PAGE_CACHE_VERSION と同期不要。
// v2245: batch:1320-settings-button-unresponsive-investigation。緊急report「設定ボタンが
// 迷路含む複数ゲームで反応しない」の根本原因を特定。batch:1318の宝箱/初回クリア報酬tier判定
// 修正で、app tierにおいて#treasure-overlay(common/treasure.js)/_simpleAfterMsg(common/
// first-clear.js)という全画面オーバーレイ(z-index:99999, document.body直下に兄弟要素として
// 生成)が史上初めて実際に発火するようになり、common/menu.jsの設定ボタン(.pono-menu-toggle,
// 旧z-index:9990)を含む画面全体のクリックを透明に吸収するようになっていた。common/menu.jsの
// z-index群を999994〜999996へ底上げしmaze/puzzle/bentoを解消。oto/quizlandは設定ボタンが
// CSS containment/transform-scaleで確立されたスタッキングコンテキスト内にあり単純なz-index
// 底上げが効かないため、body直下の透明プロキシ(oto #set-trigger)・既存.pono-menu-toggleの
// 転用(quizland #hud-settings-btn)で個別対応。independent reviewでoto側の原因コメント誤記
// (実際の穴はjs/game-stickers.jsのトースト/どんぐり報酬オーバーレイ)とsyncProxyRect()が
// body class変化(resize/orientationchange以外)に追従できない回帰リスクを検出・修正
// (MutationObserverでbody class変化を監視)。play.html PAGE_CACHE_VERSION と同期 (2245)。
// v2244: ブロッコリー小房の待機場所を既存の調理皿へ統一し、皿から鍋へ1個ずつ移す。
// 塩入れは焼き工程と同じく瓶を水面へドラッグして上下に振る操作へ変更。泡を水面楕円で
// マスクし、波紋と泡を白・グレーの輪郭だけにしてパースと温度感を修正
// (batch:1326-kitchen-workshop-assets)。play.html PAGE_CACHE_VERSION と同期不要。
// v2243: batch:1319-room-profile-move-puzzle-tutorial-fix。①「わたしのおうち」導線を
// 設定モーダルからプロフィールハブへ完全移設 (play.html: #settingsRoomBtn 撤去、
// #profileHubModal に #profileRoomBtn 新設。tier判定ロジック=isRoomTierLocked は不変)。
// ②パズルのタイトル「みない」選択時、#loading の可視状態という不安定なシグナルに
// 依存してタイトルベールが閉じずスタート不能になり得た構造的欠陥を修正
// (puzzle/main.js: finishOpeningAndEnterGame() が新規ステージ読込を開始したかを
// 明示的な戻り値で判定するよう変更 + 6秒フェイルセーフ timeout を追加)。
// play.html PAGE_CACHE_VERSION / PONO_SW_VERSION を2243へ同期。puzzle/main.js は
// CRITICAL_ASSETS precache対象外・network-first配信のため precache list 変更なし
// (puzzle/index.html 側のローカル ?v= 資産バージョンは本batch対象外につき別途要確認)。
// v2242: ブロッコリーのゆで工程を、点火→既存塩瓶で塩入れ→既存コンロ音で加熱待ち→
// 水面上の泡・波紋・湯気で沸騰→形と角度が異なる小房5種を1個ずつ投入、へ変更。
// 鍋の水面へ効果位置を合わせ、小房を左右・前後へ分散した
// (batch:1326-kitchen-workshop-assets)。play.html PAGE_CACHE_VERSION と同期不要。
// v2241: なぞなぞトレイン宇宙面の追いつき後を、同じ画面での余韻から、しっぽの
// 5ゲート操縦、3つのひかりロック、3段階のタイミング連打へ続く約50〜62秒の
// 「すいせいごと だいきゅうしゅつ」に再構成。救出後は彗星の尾が虹色の線路となり、
// 全6駅が星でつながるエンディングを追加 (batch:1329-nazonazo-grand-rescue)。
// play.html PAGE_CACHE_VERSION / PONO_SW_VERSION は2241へ同期 (読込クエリは変更なし)。
// v2240: batch:1318-stamp-rally-daily-challenge-merge。「今日のチャレンジ」(お題,
// js/daily-quest.js)と新設スタンプラリーが同一画面に別々の日替わりバナーとして並んでいた
// UXを一本化。お題クリア(PonoDailyQuestClearedイベント)でガチャボーナスに加えスタンプラリー
// のボーナススタンプも同時付与するcommon/stamp-rally.jsのgrantDailyQuestBonusStamp()を新設し、
// お題プールになぞなぞトレイン/クッキング/もじっこファームを追加(3ゲームへPonoGameStickers.grant
// 計装も追加)。2ゲーム版デイリーラリー帯(#stampRallySection)はplay.htmlから撤去。独立レビュー指摘
// で見つかった3件を修正: ①common/treasure.jsのshowTreasure()がtier無視でPONO_MVP_NO_REWARDSを
// 直読みし宝箱演出がapp tierでも非表示だったバグ(common/first-clear.jsと同じ3段フォールバックへ
// 統一)、②common/stamp-rally.jsのcheckDailyCompletion()がcontainer不在でも実行され続け旧2ゲーム
// ボーナスを二重付与していたバグ(container存在ガード追加で完全no-op化)、③クッキングのお題達成
// シグナルがページ読込/モード切替だけで誤発火する(操作ゼロで達成扱いになる)バグ(fromGameplay引数で
// 実プレイ完了時のみ発火するようゲート)。common/first-clear.jsのtier判定漏れ(window.PONO_MVP_NO_REWARDS
// 直読みで初回クリア報酬が全tier停止していた)も同3段フォールバックへ修正。
// play.html PAGE_CACHE_VERSION と同期 (2240)。
// v2239: ブロッコリーを生成した大きな一株から、まな板で5回トントンして小房へ
// 分ける下ごしらえに変更。小房は1個ずつ鍋へ入れ、全投入後に泡12個・水面波紋・湯気の
// パーティクルで沸騰させる。鍋位置と操作を塞いでいた透明レイヤーも修正
// (batch:1326-kitchen-workshop-assets)。play.html PAGE_CACHE_VERSION と同期不要。
// v2238: みちつなぎの最終「おかあさんと さいかい！」を、既存の再会イラストと
// おかあさんの台詞／手数／もういちど操作を保ったまま16:9全画面の紙芝居へ変更。
// 旅バーも二人が同じ終点へ着いた状態で表示する (batch:1327-slide-gameclear-fullscreen)。
// play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html／テストのみ変更)。
// v2237: トントンキッチンのブロッコリー／えだまめを、ざいりょう選択→したごしらえ→
// れいぞうこ→コンロでゆでる流れへ分離。沸騰鍋画像への切替をやめ、静水鍋の上へ泡と
// 湯気のパーティクルを重ねる方式に変更した (batch:1326-kitchen-workshop-assets)。
// play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html／テストのみ変更)。
// v2236: なぞなぞトレイン宇宙面の接近・首位交代・最終連打へ、操作を止めない短い
// カメラ寄り、漫画効果線、対決カットインを追加。星の子救出は発射デモ、指の追跡ガイド、
// 入力地点の照準と点線、中心合わせ2倍の連続フィードバックで操作を明確にした
// (batch:1327-nazonazo-cinematic-catch)。play.html PAGE_CACHE_VERSION と同期不要
// (nazonazo-tunnel／テストのみ変更)。
// v2235: 今日のチャレンジ(デイリークエスト)への一本化統合 (4ストリーム並走)。
// common/stamp-rally.js の2ゲームデイリーラリーをレガシー化しno-op化、新たに
// grantDailyQuestBonusStamp() を追加して今日のチャレンジ達成(PonoDailyQuestCleared)時に
// スタンプ1個を冪等付与。js/daily-quest.js の QUEST_POOL へ新ゲーム3本
// (nazonazo-tunnel/cooking/writing-mori) を追加しisAppTierガード付きで出題対象化、
// 各ゲームへPonoGameStickerGranted計装を追加。play.html は #stampRallySection を撤去し
// PonoDailyQuestClearedリスナーからgrantDailyQuestBonusStamp配線、common/treasure.jsの
// <script src>読込を追加して宝箱演出を復旧。common/first-clear.jsのtier判定漏れ
// (window.PONO_MVP_NO_REWARDS直読みでapp tierでも報酬ブロックされていたバグ)を
// common/achievements.jsと同じ3段フォールバックの_rewardsBlocked()へ修正
// (batch:1318-stamp-rally-daily-challenge-merge)。play.html PAGE_CACHE_VERSION と同期 (2235)。
// v2234: みちつなぎの中央に重なっていた水色の移動矢印を撤去し、押せるパネルの穴側エッジ、
// 推奨パネル自体の予告移動、360msの持ち上がり／滑走、移動元の穴、着地後の新しい穴を
// 暖色で順に見せる操作フィードバックへ変更。App版では `?stage=3` で二段探索を直接確認
// できるようにした (batch:1326-slide-motion-clarity)。play.html PAGE_CACHE_VERSION と同期不要。
// v2233: トントンキッチンへ共通のゆでる操作を追加。専用鍋の静水／沸騰、食材レイヤー、
// 穴あきおたま、水切りボウルを分離し、ブロッコリー／えだまめが同じ器具と進行を使う。
// 網素材は使わずマスクしやすい太い輪郭へ統一した (batch:1326-kitchen-workshop-assets)。
// play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html／画像／テストのみ変更)。
// v2232: なぞなぞトレイン宇宙面の最終追跡を約35〜45秒の競争へ再設計。
// 通常ブーストを1.8秒へ延長し、ロケット先行→彗星カウンター→最終連打で再逆転する
// リード交代を追加。旧しっぽ3本＋星の子の4押し救出を廃止し、動く星の子へ救助リングを
// 合わせ続ける空間キャッチへ変更した (batch:1326-nazonazo-race-duel)。
// play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel／テストのみ変更)。
// v2231: 実績リバランス+新ゲーム3本計装+デイリーラリーUI復活+PROFILE_GOALS動的化+
// 管理画面横断ビュー+ハイブリッドショップの6ストリーム統合 (batch:1317-furniture-reward-rebalance)。
// common/achievements.js の旧ゲーム(bowling/breakout/slide/drawing/fossil/writing/wordmatch)
// 向け実績30件をarchived化し判定・PROFILE_GOALS生成から除外、新ゲーム3本(nazonazo-tunnel/
// cooking/writing-mori)+既存ゲーム拡張の実績17件を追加。対象5ゲームへ実績計装(incrementStat)と
// デイリーラリー(pono_played_)登録を追加。common/stamp-rally.js の ALL_FREE_GAMES を9件へ
// 差し替え、play.html にデイリーラリー帯を復活 (renderDailyRally null guard 込み)。play.html の
// PROFILE_GOALS ハードコードを common/achievements.js の getActiveAchievements() からの
// 動的生成へ置換。common/shop-catalog.js を新設しshop/index.html へ🪑かぐタブ(どんぐり購入)を
// 追加するハイブリッドショップを実装、room/index.html の MERGE_KEYS へ pono_shop_furn_purchased
// を追加。admin/index.html へ家具クロスビュータブを追加。クロスレビューで発覚した実績既取得者
// への家具二重販売・stamp-rally/first-clear報酬のショップ除外漏れ・cache-bustクエリ未更新を
// 3ラウンドの修正で解消(shop/index.html・admin/index.html への common/stamp-rally.js 読込追加込み)。
// common/shop-catalog.js は play.html から無条件 <script src> で読まれないため
// CRITICAL_ASSETS_SCRIPTS 追加は不要(shop/index.html・admin/index.html のみが読み込み、
// admin/ は SW 素通しのため precache 対象外)。play.html PAGE_CACHE_VERSION と同期 (2231)。
// v2230: みちつなぎ3面を「おかあさんのしるしまで→出口まで」の二段探索へ変更。
// 中間到着でポノが実経路を歩き、通過済みの地形を固定して後半2手へ切替。GPT Image 2製の
// 森地面／土道素材、地形一体型パネル、区間別の旅ゲージ／retryを追加した
// (batch:1323-slide-checkpoint-prototype)。play.html PAGE_CACHE_VERSION と同期不要。
// v2229: トントンキッチンの標準メニュー残り17品＋ごはん3種へ、食材選択、洗う／むく、
// 指定の切り方、ゆでる／混ぜる、巻く／包む、炊飯／仕上げを順番に操作する共通調理画面を追加。
// マウス／タッチ／キーボードに対応し、お弁当本体の現行完成画像へ統一した
// (batch:1325-kitchen-menu-phases2-5)。play.html PAGE_CACHE_VERSION と同期不要。
// v2228: トントンキッチン標準メニューPhase 1。にんじんいんげん／きんぴらの選択結果を
// 調理画像へ伝播し、コロッケをじゃがいもの切る工程から開始。ミートボール／やきざけの
// カードをお弁当本体と同じ現行画像へ統一した (batch:1324-kitchen-menu-phase1)。
// play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html／テストのみ変更)。
// v2227: トントンキッチンのじゃがいもを、下ごしらえモードでは切ったところで冷蔵庫へ
// 保存して終了する経路へ分離。おかずづくりモードのつぶす／混ぜる／成形／衣／揚げる
// コロッケ全工程は維持した (batch:1323-kitchen-potato-cut-only)。
// play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html／テストのみ変更)。
// v2226: みちつなぎの途中紙芝居では、おかあさんを25／50／75%、ポノを各6%後方へ残し、
// 次章導入もポノを瞬間移動させず母だけ先行。開始画面から母を先に置き、最終面の実経路を
// 歩き切った完全一致時だけ再会扱いにした (batch:1320-slide-no-early-catch)。
// play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html／テストのみ変更)。
// v2225: トントンキッチンの肉分け／丸め案内の絵文字手を、既存のGPT Image 2製
// チュートリアル手画像へ統一。ミートボールは球を正確につかまなくても、フライパン内の
// 空いている場所から最寄りの球を選んでころころできるよう操作範囲を広げた
// (batch:1322-kitchen-generated-hands-meatball-roll)。play.html PAGE_CACHE_VERSION と同期不要。
// v2224: トントンキッチンのめだまやき蓋を鍋中心へ少し上げ、完成卵がpan位置に残る
// CSS詳細度競合を解消して皿中央へ配置。冷蔵庫カード7品をお弁当箱本体と同じ現行画像へ
// 差し替え、タコウインナー／からあげは2枚cluster表示へ統一した
// (batch:1321-kitchen-egg-align-recipe-art)。play.html PAGE_CACHE_VERSION と同期不要。
// v2223: トントンキッチンのめだまやき蓋へtouch-action:noneを追加し、タッチドラッグを
// ブラウザーpanへ奪われるpointercancelを防止。cancel時もclientX/Y=0を配置座標へ使わず、
// 左端へ飛んでから戻る動きを封鎖した (batch:1320-kitchen-lid-touch-cancel)。
// play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html／テストのみ変更)。
// v2222: みちつなぎの旅バーを16:9 shell外のviewport端まで広げ、赤いおかあさんと
// 緑のポノを26〜55秒の期待ペースで視認できる速さへ変更。流れる距離bridgeと顔の歩行motion、
// 紙芝居後の6%先行、同一盤面再挑戦での位置維持を追加し、メニュー／非表示／縦向き中は
// 導入・退出も停止して復帰時のjumpを防いだ (batch:1319-slide-fullbleed-motion)。
// play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html／テストのみ変更)。
// v2221: なぞなぞトレイン宇宙面の最終救出で、画面外pointerup／cancel／blurと遅延capture喪失を
// 安全に回収し、物理clickを代替入力として復旧。下の案内を尾3本と星の子救出まで進められる
// 実buttonへ変更し、通常race guardがずれた場合も勝利後の完了timerまで進めるようにした
// (batch:1319-nazonazo-rescue-input-unfreeze)。play.html PAGE_CACHE_VERSION と同期不要。
// v2220: トントンキッチンのめだまやきで、配置エディター由来のinline transformを
// ドラッグ開始時に除去し、蓋が指から飛んで元へ戻る問題を修正。切れ端配置は全食材で
// 縮小後の見かけ寸法ではなく受け皿内のCSS寸法を使い、レタス・にんじん等が受け皿の
// 一部へ集中せず全体へ散るよう統一した (batch:1319-kitchen-lid-bowl-spread)。
// play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html／テストのみ変更)。
// v2219: 家具スタンプカードのCSS/JS参照へ明示version queryを追加。初回v2218公開確認で裸URLの
// CSSだけ旧緑枠がエッジキャッシュに残ったため、赤枠＋紙色を既存端末でも確実に取得させる
// cache bustを追加した (batch:1318-furniture-stamp-red-lineart)。play.html PAGE_CACHE_VERSIONと同期。
// v2218: 家具スタンプカードの押印を、カラー顔写真からGPT Image 2製の赤い線画ゴム印へ差し替え。
// 白背景を透過し、256px lossless WebPへ最適化。押印済みマスも赤枠＋紙色へ揃え、30px表示で
// 外丸・顔・かすれが読める実物スタンプ調へ変更した (batch:1318-furniture-stamp-red-lineart)。
// common/stamp-rally.js・common/stamp-rally.css・画像をprecacheし、play.html PAGE_CACHE_VERSIONと同期。
// v2217: みちつなぎの一本旅バーを16:9 shellの左右いっぱいへ拡張し、おかあさんの赤線と
// ポノの緑線を面ごとの時間予算に沿ってプレイ中も連続前進させた。時間予算は盤面サイズ・
// 保証shuffle手数・pickup／よつまた学習時間から算出。初回時間切れは同じ初期盤面へ戻し、
// 再挑戦は時間制限なしにする。ポーズ／共有メニュー／確認／背景化／縦向き／物語／練習／
// 短い操作案内中は時計を止め、復帰時の案内と待ち時間も同期した
// (batch:1318-slide-realtime-chase)。play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html／テストのみ変更)。
// v2216: なぞなぞトレイン宇宙面の最終追跡を、横スクロールで現在の2本だけを選ぶ3分岐へ刷新。
// 描画距離と実走距離を同じ比率に揃え、スターみちほど追いつきやすい全8経路、分岐中の低速化、
// 光る道の直接タッチ、3スターの手動／安全自動ブーストを追加。捕捉後は大写しの彗星の尾を3本
// 右へ払い、星の子をロケットの輪へ運ぶ失敗なしの救出へ切り替えた
// (batch:1316-nazonazo-visible-chase-rescue)。play.html PAGE_CACHE_VERSION と同期不要。
// v2215: もじっこファームの文字書きから旧 `menu_card_base_01〜04` を外し、左・相棒・書き順・結果の
// 完成画像を、CSS の白い紙面や影を重ねない一層表示へ統一。モード選択 F002 は4分割の完成画像で
// 3モード＋とじるを構成し、通常／押下画像の大きさを固定。Native 同梱には図鑑 UI 4素材と押下
// ラベル1素材を追加し、文字書きが使う44画像を収録した (batch:1316-mojikko-image-only-controls)。
// play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html／Native manifest／テストのみ変更)。
// v2214: スタンプカード復活 + book tier家具付与配線 + ACHIEVEMENTS配列 phantom id 修正を統合
// (batch:1315-furniture-stamp-card-revival)。play-all.html にインライン実装されていたスタンプ
// ラリー/スタンプカード IIFE (1482行JS + 369行CSS) を common/stamp-rally.js・common/stamp-rally.css
// へ抽出し、common/mvp-flags.js の CSS一括非表示ルール (.stamp-rally-section 等) を
// batch:1313 の .login-streak/.streak-banner と同じ `body:not([data-tier="app"])` スコープへ変更
// (app tier では表示、free/bookは従来どおり非表示)。play.html (本番ハブ) の設定モーダルに
// 「📋 スタンプカード」導線を新設 (#settingsStampBtn、isStampTierLocked/updateSettingsStampAction、
// room ボタンと同型・app tier限定でbookは解除しない)。common/mvp-flags.js・common/achievements.js・
// common/stamp-rally.js を common/tier.js 直後の script クラスタへ無条件追加 (stamp-rally.js の
// rewardsBlocked() が PonoMvpFlags 有無のみを見る2段判定でmvp-flags.js未読込時にfail-openする
// 実在バグをmvp-flags.js読込で是正)。common/achievements.js の grantPremiumBonus() が付与する
// 家具ID (旧 ach_small_chair/ach_bookshelf) が room/items.js の ROOM_ITEMS カタログに存在しない
// 幻のIDだったため book tier 購入者が家具を一切入手できない構造的欠落を発見・修正し、
// common/tier.js の BOOK_ROOM_ITEM_IDS (10種) と一致させ、play.html の pwFinalizeSuccess()・
// 初期化時・finishBookWelcome() に冪等な ensurePremiumFurnitureGranted() 呼び出しを追加
// (既存book tier確定済みユーザーへの遡及救済含む、一発フラグの早期returnを外し内容ベースの
// 冪等性へ修正)。あわせて common/achievements.js の ACHIEVEMENTS配列 (実績19種) が付与する
// furn 報酬IDも同型の幻IDだったため実カタログの furn_*/deco_* id へ全19種置換し、
// tests/room_furniture_app_tier_regression.cjs へ全furn報酬idをroom/items.jsカタログと突合する
// 回帰チェックを追加。tests/room_furniture_book_tier_regression.cjs 新規。common/achievements.js・
// common/stamp-rally.js・common/stamp-rally.css は play.html が common/tier.js の直後に無条件
// <script src> で読む必須スクリプトのため CRITICAL_ASSETS_SCRIPTS へ追加 precache。
// play.html PAGE_CACHE_VERSION と同期 (2214)。
// v2213: みちつなぎ上部の8点表示を、一本の旅バー上でおかあさん=あか／ポノ=みどりの位置と近づき具合が分かる表示へ変更。2／4／6面の紙芝居を25／50／75%の節目として同期し、次面ではおかあさんだけ先行、8面到着で100%再会する。既存の顔画像、色以外の線幅／上下配置、reduced-motion、練習中の非表示、568×320〜1366×768とChromium／WebKit回帰を追加した (batch:1317-slide-chase-progress)。play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html/テストのみ変更)。
// v2212: なぞなぞトレイン宇宙面の最終追跡を3区間×3択の27経路と共通S字追込路へ整理。彗星86／ロケット90／ブースト410×0.6秒、1スター=192距離の計算へ統一し、約3倍の5スター遠回りが近道より速くなる配分、少数の軽い罠、走行中の彗星へ13.6〜17.25秒で追いつく全経路、ブースト連打予約と受付数、各道の秒数／スター数表示を追加した (batch:1315-nazonazo-route-balance)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2211: もじっこファーム文字書きの相棒名を、実Zen Maru Gothicでも木札のdesign y=0〜58へ固定して中央配置。Google Fonts onlineとoffline fallbackの両方でbox／glyph中心／安全余白／短横12px下限／吹き出し・ミルマル非重複を回帰固定した (batch:1315-mojikko-frame-correction)。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html/テストのみ変更)。
// v2210: もじっこファーム文字書きの背景を元の庭へ戻し、左／相棒／書字盤／書き順へ異なる既存絵本枠を割り当てた。透過枠の中心fillと外周の白矩形を撤去し、周辺は庭が見える暖色surface、中央書字盤だけ明朝体のお手本を読みやすい紙面として維持。main／chooser／resultの白矩形、相棒名の木札収容、6 viewport、4成長状態、LP lock／portrait保存非破壊を回帰固定した (batch:1315-mojikko-frame-correction)。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html/テストのみ変更)。
// v2209: batch:1313 の app tier 報酬解除作業 (Foundation: common/tier.js の _syncTierBodyAttr() /
// common/mvp-flags.js の rewardsBlocked() ヘルパー、Stream A: common/stickers.js checkDailyLogin
// のログインボーナス復活、Stream B: room/index.html・play-all.html の「わたしのおうち」家具復活、
// Stream D: index-app.html 新設 + index.html 導線、Fix Round1 (v2208): stickers.js checkDailyLogin
// の fail-closed 自己完結化) を統合する最終ラウンド。play.html の設定モーダルに「🏠 わたしのおうち」
// ボタン (isRoomTierLocked/updateSettingsRoomAction) を新設し、room/index.html への実導線を追加した。
// あわせて common/achievements.js の _rewardsBlocked() も common/stickers.js checkDailyLogin と同じ
// 3段フォールバック (PonoMvpFlags有無 → PONO_MVP_NO_REWARDS有無 → PonoTier.isApp()単独判定) へ揃え、
// common/mvp-flags.js を読み込まない room/index.html などのページで bubble/breakout 側が無条件に
// 報酬付与していた fail-open の実在バグを修正した。tests/room_furniture_app_tier_regression.cjs に
// room/index.html 相当 (PonoMvpFlags/PONO_MVP_NO_REWARDS 両方未定義、PonoTierのみ存在) の3段
// フォールバック回帰ケースを追加。play.html PAGE_CACHE_VERSION と同期 (2209)。
// v2208: アプリ専用「ログインボーナス」「わたしのおうち（家具）」機能を復活 (batch:1313、Foundation+3ストリーム統合)。
// common/mvp-flags.js に app tier 限定で報酬凍結を解除する PonoMvpFlags.rewardsBlocked() ヘルパーを追加し、
// common/tier.js は document.body.dataset.tier を同期する _syncTierBodyAttr() を新設。common/stickers.js
// (checkDailyLogin) と common/achievements.js (incrementStat/setStatMax/checkAchievements/grantReward) の
// PONO_MVP_NO_REWARDS 直参照を rewardsBlocked() 経由へ置換し、play.html に common/stickers.js の
// <script src> (app tier 限定の起動トリガー付き) を追加。独立レビュー指摘を受け checkDailyLogin() 内部ゲートを
// window.PonoTier.isApp() フォールバックで自己完結させ、common/mvp-flags.js 未読込ページでの fail-open を防止。
// room/index.html は free tier のみブロックする tier ロックガードを新設し、play-all.html は card-room の
// grayout 解除・lockedCards 登録・bn-room 常時表示・家具解放チェーン7箇所の rewardsBlocked() 置換で
// 「わたしのおうち」を復活させた。アプリ専用ランディングページ index-app.html を新規追加し、index.html の
// COMING SOON モーダルからリンクした。common/stickers.js は play.html が tier.js 直後に無条件読み込む
// 必須スクリプトのため CRITICAL_ASSETS_SCRIPTS へ追加 precache。play.html PAGE_CACHE_VERSION と同期。
// v2207: なぞなぞトレイン宇宙面の最終追跡で、彗星を最短の逃走ルートへ固定し、ロケット先着後に彗星を待つ逆転処理を削除。全188経路で彗星が画面右側を先行し、最後の共通路でだけロケットが追いつく状態を回帰固定した (batch:1314-nazonazo-comet-lead)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2206: もじっこ文字書きのミルマルを、初期状態確定前は画像なし、確定後はタマゴ／赤ちゃん／よちよち／成長の排他的visual classで対応する1枚だけ読む構造へ変更。不要な成長画像のcancelをなくし、4状態それぞれの正しい1request・他状態0・request failure 0・成功演出の追加request 0を回帰固定した (batch:1311-mojikko-storybook-ui)。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html/テストのみ変更)。
// v2205: もじっこ文字書きの短い横画面で、実際のZen Maru Gothic読込時にもモード選択の見出しと補助文が重ならないよう間隔を拡張。667×375／844×390で正の文字間隔、枠内収容、2行以内、44px以上の操作領域を回帰固定した (batch:1311-mojikko-storybook-ui)。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html/テストのみ変更)。
// v2204: もじっこファームの文字書き画面を、なぞなぞのフクロウ博士と共通する水彩の森・紙と木の絵本フレーム・丸ゴシックUIへ統一。お手本文字／HanziWriter／判定形状は明朝体のまま維持し、ミルマル4成長状態、もじミルク、ひまわり、ことばの穴18種の水彩絵を追加。短い横画面の実寸文字、モード選択、結果モーダルのfocus／scroll不変も回帰固定した (batch:1311-mojikko-storybook-ui)。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html/画像/テストのみ変更)。
// v2203: みちつなぎの途中物語絵を16:9 shellのほぼ全画面へ拡大し、GPT Image 2製の森／洞窟／月夜の道質感、赤旗ゴール、よつぼしへ刷新。道端を平らに重ねて十字を含むマス境界の丸い切れ目を解消し、stage3の経由アイテム取得とstage4の1枚だけ付け替え可能なよつまたを追加した。568×320〜1366×768、coarse touch、Chromium／WebKit、4面全到達状態を回帰した (batch:1311-slide-generated-road-mechanics)。play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html/画像/テストのみ変更)。
// v2202: なぞなぞトレイン宇宙面の最終追跡を、画面全体へ広がる10分岐・26経路・188通りの迷路ネットワークへ拡張。2択／3択、8の字・旋回・ねじれ・外周、スター多数の遠回りと近道を混在させ、キャラクター表示サイズを維持したまま論理画面を1600×1200へ引いた。分岐中は双方を同速減速し、無入力時の安全路自動選択、ゴール待機中のブースト保持、失敗なし救出を維持した (batch:1312-nazonazo-space-maze-network)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2201: なぞなぞトレイン宇宙面の最終イベントを、決まった星の道をロケットと彗星が自動で進む分岐追跡へ刷新。近道／ブーストスターの道を3回選び、追いついた後は彗星の尾の結び目をほどいて「ほしのこ」を救出する物語へ接続した。App管理画面には最終追跡だけを直接試せる認証済みiframe導線も追加した (batch:1310-nazonazo-admin-chase-preview)。play.html PAGE_CACHE_VERSION と同期不要 (admin/nazonazo-tunnel/テストのみ変更)。
// v2200: みちつなぎの右端ゴールを全テーマ共通のコーラル色の旗と短い出口ラインへ変更し、4段／5×4盤面でも正しい段を常時判別可能にした。到着前の手がかり非表示は維持し、途中3枚・最終1枚・盤面上のおかあさんを以前の物語イラストへ正確に復帰。568×320を含む全8面の旗色／位置／範囲と旧挿し絵decodeをChromium／WebKitで回帰した (batch:1310-slide-goal-art-mechanics)。play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html/テストのみ変更)。
// v2199: なぞなぞトレイン宇宙面の全問後に、視点を引いた宇宙で小さなロケットがおおながれぼしを追う最終イベントを追加。4回タップで自動ブースト、減速を挟んで3セット進む失敗なしの構成とし、遅い入力の保持、設定・縦向き・バックグラウンド中断、二重クリア防止、reduced-motionへ対応した (batch:1309-nazonazo-space-chase-boss)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2198: なぞなぞトレイン宇宙面で、駅到着時のロケット位置を発進直前まで保存・復元し、画面回転後も同じ比率で再開。後半ゲートを最大12本の連続路へ増やし、端の到着位置につながる固定レーンと発進猶予を追加。リペアは駅・ネジ別の2/3周＋停止角度、3チェック完了後の8/10/12回パワー連打へ拡張した (batch:1308-nazonazo-space-restart-repair-boss)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2197: もじっこファームの文字練習へ「ことばの あな」と「きょうの 3もじ」を追加し、各課題の再開保存、複数タブでの原子的な報酬claim、IDB障害時のfail-closed fallback、途中報酬表示、縦向き中断と短い横画面の操作領域を回帰固定した (batch:1307-mojikko-writing-modes)。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html/テストのみ変更)。
// v2196: みちつなぎを、明るい16:9背景8景が連続する一人旅へ刷新。ポノの入場→通常プレイ→道を歩く→手がかり発見→右退出を単一actorへ統合し、重複表示を構造的に防止。「ここへ」を物理的な空き穴へ置換し、最初の一手だけを案内。到着前の手がかり非表示、柔らかい絵本調のおかあさん、旧暗色カットシーンの明色レイヤー化、reduced-motion、全8面／Chromium／WebKit回帰を追加した (batch:1306-slide-solo-adventure)。play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html/画像/テストのみ変更)。
// v2195: もじっこファームの文字練習で、クリア済み文字と順番モードの次の未完了文字を端末へ保存し、通常入場／別ゲームからの復帰／再読込でも続きから再開。文字別の完了マーカーとV2一覧キャッシュを併用して複数タブの同時更新を収束させ、旧V1 cursor互換も維持した (batch:1306-mojikko-writing-resume)。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html/テストのみ変更)。
// v2194: みちつなぎを16:9の世界一体型盤面へ再設計。大型情報カードと青い二重枠／反復タイル画像を外し、小型HUD、全身ポノ／おかあさん、テーマ別の木・石・星明かりの道、空きマス／動かせるパネル／接続済み経路の独立色と流れを追加。初回チュートリアルのpause競合・二重起動・stage-start状態ずれも修正し、全8面／Chromium／WebKit／coarse pointer／reduced-motion／free-book-app gateを回帰した (batch:1305-slide-worldboard-redesign)。play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html/テストのみ変更)。
// v2193: なぞなぞトレインの宇宙駅間ゲートを区間・難易度に応じた2〜6個へ増やし、固定6個プール、ゲート単位の一度だけの接触判定、レイアウトキャッシュでiPadを含む毎フレーム負荷を抑えた (batch:1304-nazonazo-space-multi-gates)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2192: みちつなぎの既存8ステージを縦盤面から左→右の横盤面へ変換し、入口／ゴール、正解経路、3手チュートリアル、開始・終了矢印、歩行方向を統一。上向き区間をなくして正面歩行の後退表示を防ぎ、短い横画面の左右マーカー／ラベル、かな文言も調整した (batch:1304-slide-left-right)。play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html/テストのみ変更)。
// v2191: なぞなぞトレインのミライシティを、ハンドルで位置を合わせて「おろす」「とめる」の2クリックで運ぶクレーンへ簡略化。宇宙は安全なすきまを抜けるゲートと、正しい答えを選んで3本のネジを締める修理ゲームへ刷新し、タッチ／キーボード、縦向き中断、短い横画面、誤答再挑戦を統合した (batch:1303-nazonazo-future-space-games)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2190: みちつなぎを16:9横画面へ再構成し、最終ステージまでの盤面寸法、横向き案内、短い画面のダイアログ、チュートリアル再開を調整。最適化済み歩行スプライトの実寸から1フレームずつ切り出し、歩行中にポノが2〜3匹へ増える表示を修正した (batch:1303-slide-landscape)。play.html PAGE_CACHE_VERSION と同期不要 (slide/index.html/テストのみ変更)。
// v2189: なぞなぞトレインのミライシティを、丸ハンドルで左右位置を合わせ、大ボタンの長押し／解放でポッドを下ろすUFOキャッチャーへ再設計。適正高さの光・音・案内、吸着後の独立3タップ、自動上昇、中央コアへの投入、Space／Enter操作、スナップ保持、誤答後の再操作を統合した (batch:1302-nazonazo-future-ufo-crank)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2188: なぞなぞトレインのミライシティを、固定2ポッドからフックで答えをつかみ、持ち上げ、中央コアへ運んで下ろすガントリークレーンゲームへ全面置換。操作ミスは無罰、誤答投入だけ既存誤答へ接続し、キーボード・reduced-motion・短い横画面・クイズ遷移中の早操作にも対応した (batch:1301-nazonazo-future-crane)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2187: デイリーガチャレバーのタッチ当たり判定を独立メディアクエリ ((hover:none),(pointer:coarse)) で拡張し、iPad横向き(幅1024px以上)や11インチ以上の縦向き(834px)などモバイル向けレイアウト分岐に含まれない「大きいがタッチ操作」の端末でも指当たり判定を確保した (batch:gacha-lever-touch)。あわせてガチャ詳細モーダルの初回チュートリアル (common/onboarding/steps-gacha.js) を1ステップ→2ステップへ再設計し、獲得シール本体の案内後に既存の「シールちょうに はって あそぼう」ノート (#dailyGachaRewardNote) へ誘導するステップを追加した (batch:gacha-tour-note)。play.html PAGE_CACHE_VERSION と同期 (2187)。
// v2186: なぞなぞトレインの煙をPC／iPad共通の豊かな密度へ戻し、実走行の再開ごとにwarm startを行う。48 DOM上限を保ち、PCは補助ローブ、iPadは主パフの寸法／飛距離、reduced-motionは静的な分布で旧PC相当の見た目量を維持。トンネル内では煙を即時消去・非表示にした (batch:1297-nazonazo-smoke-parity)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2185: ガチャ詳細モーダルの初回チュートリアルを追加 (batch:onboarding-tour-gacha)。common/onboarding/steps-gacha.js を新規作成し registerStage('gachaIntro', ...) で requestStage 専用ステージとして登録 (STAGE_ORDER には含めず自動起動シーケンスには乗らない)。play.html はスピン後演出の既存タイマー (revealProfile.actionsDelay) の直後に兄弟タイマーを追加し、恒久ノート表示が出そろってから maybeRequestDailyGachaIntroTour() を呼ぶ。common/onboarding/ 配下の新規ファイルのため CRITICAL_ASSETS_SCRIPTS へ追加 precache 必須 (batch:onboarding-tour と同型)。play.html PAGE_CACHE_VERSION と同期 (2185)。
// v2184: 初回オンボーディング・タイトル画面ツアーのゲーム一覧スポットライトが下部UIまで明るくなる不具合を修正 (target を #cardList に変更)。シール帳導線ステップは一旦削除しガチャガチャ誘導で終える2ステップ構成へ変更 (batch:onboarding-tour-fix)。play.html PAGE_CACHE_VERSION と同期 (2184)。
// v2183: タイトル画面カード一覧のドラッグ時ちらつき/大ドラッグ消失を根本修正 (batch:1301)。iOS Safariが
// ネイティブpan開始時にpointercancelを発火しisDragging追跡が実機で機能していなかった構造バグをtouch
// events (touchstart/touchend/touchcancel) ベースへ置換し、ループ帯復帰teleportをスクロール静止時
// (settleLoop) へ移設、snapアニメも指接地で即中断。3コピー目サムネのlazy読み込み非対称も解消し
// 全コピーeager化。tests/title_card_loop_drag_regression.cjs を新規precache対象外(テストのみ)で追加。
// play.html PAGE_CACHE_VERSION と同期 (2183)。
// v2182: プロフィールのアバター選択に free/book/app tier ロックを追加 (common/tier.js: FREE_AVATAR_PRESET_IDS/BOOK_AVATAR_PRESET_IDS/isAvatarPresetUnlocked、hasBookUpgradeContent/getBookLimitPromoCopy に avatar 分岐追加。play.html: .tier-locked CSS・ロック判定・クリックガード追加)。common/tier.js は CRITICAL_ASSETS_SCRIPTS の precache 対象のため CACHE_VERSION バンプ必須 (batch:1300-avatar-tier-gating)。play.html PAGE_CACHE_VERSION と同期 (2182)。
// v2181: おべんとうの「とりけす」ボタン生成を単一factoryへまとめ、自動復元説明中／通常時の有効状態とpointerdown案内配線を実ボタン相当の回帰テストで固定した (batch:1296-bento-undo-focus review follow-up)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/テストのみ変更)。
// v2180: おべんとうののり編集を自動で元に戻す説明中、「とりけす」を灰色にせず、現在のボタンへ白枠・指なしの青い案内枠を1個だけ表示。触れても履歴は変えず既存案内だけを返し、通常の取り消し可否は維持する (batch:1296-bento-undo-focus)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/テストのみ変更)。
// v2179: 初回プレイ時のオンボーディング・チュートリアル (アバター作成案内→タイトル画面ツアーの4ステップ、2回目以降のセッションでは絵本あいことば案内を追加) を新規実装。common/onboarding/ 配下 (tour-engine.js/tour.css/steps-avatar.js/steps-title-tour.js/steps-book-unlock.js) を新規precache (batch:onboarding-tour)。play.html PAGE_CACHE_VERSION と同期 (2179)。rebase時にv2178 (batch:1294-nazonazo-settings-menu) と番号衝突したため+1で再採番。
// v2178: なぞなぞトレインへ、既存のせってい画像を使った固定ドロップダウンを追加。ちずと「ホームへ もどる」を全ステージから開けるようにし、外側タップの誤作動防止・キーボード操作・iPad縦横表示に対応した (batch:1294-nazonazo-settings-menu)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2177: なぞなぞトレインのiPad煙量、客車連結間隔、ジャングル正解重複とナマケモノ寸法、トンネルのかくれともだち移動、数字面終了後の残留アニメ／低fps進行遅延を修正した (batch:1293-nazonazo-runtime-fixes)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2176: telemetry初回告知バナーの文言を、「符号」等の分かりにくい語を避けて「遊んだゲームと回数を、お名前とは結びつけずに記録しています」へ差し替えた (batch:telemetry-notice-copy)。play.html PAGE_CACHE_VERSION と同期不要 (テキストのみ変更)。
// v2175: なぞなぞトレインの選択肢以外に残っていた絵文字を、既存クイズ絵とGPT Image 2の新規10素材へ差し替え。おたすけ・道中アイテム・レア／駅／海／トンネルの仲間・上部HUD・マップ・図鑑・結果・操作案内まで共通画像rendererへ統一した (batch:1292-nazonazo-full-art)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2174: LPのガチャガチャ紹介へ、基本的に1日1回・ミニゲームでどんぐりを得られること・課金なしの補足を追加。詳細導線末尾の不要な「を」を外し、カードとモーダルの「ガチャ」略称を「ガチャガチャ」へ統一した (batch:1291-lp-gachagacha-copy)。play.html PAGE_CACHE_VERSION と同期不要 (index.html/docs/テストのみ変更)。
// v2173: なぞなぞトレインの全175出題イラストをGPT Image 2の絵本調171素材へ差し替え。通常・海・未来・宇宙・数字の各出題と、正解後の客車・仲間・トンネル表示まで同じ画像を引き継ぎ、絵文字は画像エラー時だけ表示する (batch:1291)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2172: LPの5ゲームカードを、モード名や競争語ではなく「見比べる力」「道を選ぶ力」「音を聞き分ける力」など学びが伝わるタグへ統一。ガチャとシールちょうの詳細導線も、集め方・選び方／貼り方・飾り方を詳しく見る自然な文へ変更した (batch:1290)。play.html PAGE_CACHE_VERSION と同期不要 (index.html/docsのみ変更)。
// v2171: なぞなぞトレインをiPad実機向けに調整。車輪・走行音を減速し客車車輪を同期、煙のSafari合成と負荷を修正、アイテム取得点と見える演出を追加。通常クイズを中央へ移し、トンネル走行と数字世界の点滅、各ステージ終了時の一時演出残留も解消した (batch:1289)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2170: LPのゲーム紹介文を、保護者向けの遊び説明／育ちの説明／子ども向け場面キャプションに整理。tierで異なる機能数や過度な教育効果の断定を外し、自然で実装に沿う表現へ改稿した (batch:1288)。play.html PAGE_CACHE_VERSION と同期不要 (index.html/docsのみ変更)。
// v2169: おべんとうのお店モード（おねがいモード）で、のり細工・顔のり等の「かざり」タブを非表示にし新規配置も禁止（チュートリアル中は従来どおり全のり教習可）。ごはんタブをお店モードだけ しろごはん／うめぼし／のりべんセットの3択にし、のり弁はご飯シルエットPNGのCSSマスクで帯のり3枚を全7箱のご飯形状へ自動フィット（新規画像なし）。お店モード初回に「おねがいどおりに つくって とどけてあげてね」の無音橋渡しカードを追加 (batch:1285)。v2168競合のため再採番。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/テストのみ変更)。
// v2168: なぞなぞトレインの深い海で潜水艦の接触回収、独立したクイズ案内、海底生物3種、移動・予告攻撃するおおあわぬしを追加。未来は流れる2択カプセル、宇宙は固定回答を選んで3.25周回すスターエンジンへ再設計し、ロケットの上下左右操作と成功音の一重化も反映した (batch:1285)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2167: なぞなぞトレインの未来を、答えタワーを引き上げ／3回タップで街を組み立てる全画面「ミライ・ビルダー」へ再設計。宇宙は固定楕円軌道を回して答え星をドックへ合わせ、同じ円運動で銀河を巻いて解放する全画面「ぎんがドック」へ別ジャンル化した。誤答復帰・おたすけ・キーボード・reduced-motion・5問履歴を維持 (batch:1282)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2166: データ分析基盤 P0 (docs/data-analytics-plan.md) — common/telemetry.js を CRITICAL_ASSETS_SCRIPTS へ追加 precache (rating-modal.js と同じ並列作成パターン、asset 単位 try/catch のため未配備でも install 失敗にならない)。privacy.html は help.html と同じく HTML なので isHTML passthrough の対象外 = precache 登録不要 (network-first で鮮度担保)。rebase 時に v2165 (なぞなぞトレイン改修, batch:1281) と番号衝突したため +1 で再採番。play.html PAGE_CACHE_VERSION と同期 (2166)。
// v2165: なぞなぞトレインの未来を3個の正解カプセルで街を点灯する全画面マグネットゲート、宇宙を答えポータルへ重力スイングする長押し・解放ゲームへ別ジャンル化。宇宙は5問で星座線が完成し、最終問だけ全画面発光する。町・ジャングル・数字・未来の6背景素材は枝間など内部に残った白だけを透過し、花・数字面・ハイライトを保持した (batch:1281)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2164: タイトルのおしらせを公式情報だけの1一覧へ戻し、おみせタブ・ショップ記事・記事内導線を撤去。ショップ更新は公式未読数から完全に分離し、タイトルの明るい更新札とガチャ内の更新badgeだけで一目表示して、実際におみせを開いた時だけ消す (batch:1283)。play.html PAGE_CACHE_VERSION と同期 (2164)。
// v2163: おべんとうの3色説明が終わったら「わかった！」を青白く点灯。のり編集は小さく／大きく／左右回転を自由に何度でも試せるようにし、保存状態へ一度で復元。完成時の重複テキストを外し、自由編集ナレーションをTTS3.1/Ledaで更新した (batch:1278)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/音声/docs/テストのみ変更)。
// v2162: タイトルのおしらせを「こうしき／おみせ」タブ、日付・カテゴリ・未読表示・おみせ導線付きカードへ刷新。manage debugの「みため」タブへサンプル6件と未読／既読／shopKey付きショップ更新の再現操作を追加し、タイトルとガチャ内の更新signはdebug時だけ表示して実際の開店時に消す。通常ユーザーの保存・商品状態は変更しない (batch:1282)。play.html PAGE_CACHE_VERSION と同期 (2162)。
// v2161: おべんとうチュートリアルの縮小・回転後は、とりけすを繰り返し使える説明を聞いて見本側で2段ぶん自動復元。カップの青枠をパレット再描画直後も即時表示し、残りのおかずで3色を再案内。レタス・全しきりの完成状態を不透明で一拍見せ、ハンバーグの角丸線を光だけへ変更し、配置したピックを実際に動かす教習とTTS3.1/Leda音声を追加した (batch:1277)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/音声/docs/テストのみ変更)。
// v2160: シールちょうの上部5ボタン＋前後ページ＋ページ番号にGPT Image 2押下画を追加。タイトルはガチャ入口・日次チャレンジ5種・絵本特典入口へ押下画を追加し、既存のゲーム再生pressed画像が親カード押下で発火するよう修正。右下3ボタンとプロフィールの既存押下は維持する (batch:1276)。play.html PAGE_CACHE_VERSION と同期 (2160)。
// v2159: なぞなぞトレインの深い海を、5種類重複なしの泡救出物語へ再構成。小さく閉じ込められた生物を連射で助け、短いかな台詞とともに最大3匹が援護射撃へ参加する。最後はGPT Image 2生成の巨大チョウチンアンコウ「おおあわぬし」の泡バリアを、命中色変化・3段階のひび・残量表示を見ながら破るボス戦を追加した (batch:1273)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2158: タイトルのポノガチャ残り回数badgeを、小さな「あと／かい」と大きな数字へ再構成。残り1〜2回だけ8秒周期の静かな左→右ライトSweepを入れ、0回とreduced-motionでは停止する (batch:1275)。play.html PAGE_CACHE_VERSION と同期 (2158)。
// v2157: シールちょう上部の「ひょうし」「シール ミュージアム」を、みるモードと同じ木枠・生成文字・868×272比率のGPT Image 2完成ボタンへ統一。3操作の表示寸法と外周を全画面幅でそろえ、HTML重複文字を非表示化した (batch:1274)。play.html PAGE_CACHE_VERSION と同期 (2157)。
// v2156: シールちょうのテーマ選択を短い「ひょうし」へ統一し、表紙表示中は中央下の重複する「ひょうし」状態ラベルをfocus／読み上げごと非表示化。中ページのページ番号ボタンとページ一覧内の表紙へ戻る「ひょうし」は維持する (batch:1273)。play.html PAGE_CACHE_VERSION と同期 (2156)。
// v2155: シールちょうの現行「きせかえ」を将来の着せ替えシールと区別できる「シールちょうを えらぶ」へ改名。「とくべつ」を基準に全25テーマの表紙を等方zoom／中心補正し、必要な中ページ・裏表紙・表紙裏の外周も調整。綴じ絵がないテーマはring下へテーマ色の綴じ板を追加し、補正textureは現在テーマだけ保持して切替時に解放する (batch:1272)。play.html PAGE_CACHE_VERSION と同期 (2155)。
// v2154: なぞなぞトレインの深い海シューティングを16／20／24発の高速連射、最大2.2倍の非線形膨張、張り→白色フラッシュ→光輪＋36破片の大破裂へ刷新。宇宙はGPT Image 2生成の星雲・惑星・小惑星・探査ロケット・宇宙駅と遠中近の星粒を多重スクロールし、3タップで星座をつないで答える短いミニゲームへ変更した (batch:1271)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2153: ガチャ結果に「はじめて／もってるシール」と獲得後の何枚目かを表示。シール帳は所持countを残り枚数として×N表示し、表紙を含む全ページで所持数まで貼付可能、削除で1枚復帰、旧上限超過配置は非破壊で維持する (batch:1271)。play.html PAGE_CACHE_VERSION と同期 (2153)。
// v2152: LPの「遊びのほかにも」をガチャガチャ本体／シールちょう仮表紙の各1枚から詳細画面を開く構成へ変更。シールちょうは、はるモードの縦ドラッグ中断と重い連続再描画を抑え、下段トレイを71枚目まで中央へ送れるよう修正。スクショモードは有効時に直URLでも表示し、WebKit/Chromiumとも机・本・上部操作・ページボタン・見えているトレイを安定合成する (batch:1269)。play.html PAGE_CACHE_VERSION と同期 (2152)。
// v2151: なぞなぞトレインの未来シティで海ステージの操舵位置が機関車へ残る浮遊を解消。塔頂まで入る不透明な遠景・中景と横向き未来駅をGPT Image 2で再生成し、遠景0.10／中景0.32／線路・駅1.00／手前1.12のミラー式連続ループへ変更。駅問題は光を上下2択ホームまでなぞるレールゲームへ刷新し、誤答再挑戦・おたすけ・キーボード・reduced-motionを統合した (batch:1269)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2150: タイトル画面のポノガチャバナー右上に当日の残り回数 (2→1→0) を表示。抽選直後・チャレンジ更新・日付更新・別タブ変更・履歴復帰でも同期し、0回時は落ち着いた色へ切り替える (batch:1270)。play.html PAGE_CACHE_VERSION と同期 (2150)。
// v2149: おべんとうの縦しきりは全おかずより前面のまま、横2本だけをおかずと同じY奥行きへ戻し、手前のソーセージ／ハンバーグを前面化。本体と配置エディターを同期し、3色ガイド「あか」の1本は発音が自然だった直前TTS3.1/Leda版へ復元した (batch:1269)。play.html PAGE_CACHE_VERSION と同期不要 (bento/admin/音声/docs/テストのみ変更)。
// v2148: なぞなぞトレインの深い海で、遠景0.10／中景0.44／海底と駅1.00／最前景サンゴ1.06へ多重スクロールを整理し、下端透けと開始時の内部15pxスクロールを解消。GPT Image 2生成の横向き海底駅へ差し替え、暗転後の「ようい」「ドン！」から左潜水艦対右縦2択が逃げる連射アリーナを追加した (batch:1268)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2147: おべんとうの全しきりをハンバーグを含む全おかずより前面へ戻し、本体と配置エディターのレイヤー正本を同期。全37ナレーションも短い共通アンカー付きブロックからTTS3.1/Ledaで再収録し、1.15倍速・音量・原稿照合を統一した (batch:1268)。play.html PAGE_CACHE_VERSION と同期不要 (bento/admin/音声/docs/テストのみ変更)。
// v2146: なぞなぞトレインの深い海を、上下左右に動かせる潜水艦シューティングへ刷新。海面を押しながらの連射、動く答えの命中膨張・破裂、直近3人の仲間による軌跡追従・同時射撃、右下ボタンと矢印/WASD＋Space操作を追加した (batch:1267)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2145: おべんとう完成見本の「おきにいり」を現行TTS3.1/Ledaの短い連続takeへ差し替え、「では、じぶんで おべんとうを つくってみよう」の後に空のお弁当箱から一度だけ始める導線を追加。星保存と×のどちらも最後の音声へ合流し、途中連打・評価モーダル・二重再開を防止した (batch:1267)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/音声/docs/テストのみ変更)。
// v2144: LPのガチャガチャを指定の開封スタンプ画像、お店を看板欠け修正版へ差し替え。撮影中のシール帳遷移でcapture状態を維持し、シール帳は透明なWebGL切抜きでなく机・操作ボタンを含む実画面全体を撮影するよう変更。外部Three.js読込前も暫定登録して早押しを準備完了まで待たせ、シール帳→ミュージアム→トップと共通シール獲得導線でも撮影セッションを継続する (batch:1264)。play.html PAGE_CACHE_VERSION と同期 (2144)。
// v2143: おべんとうの3色ガイド中に開始カードが再表示される20秒再案内競合を止め、目2個目・口の女性ナレーションをTTS3.1/Ledaで追加。しきりは下段主菜→下段横しきり→中段おかず→上段横しきり→上段おかずのY段差レイヤーへ本体と配置エディターを同期した (batch:1266)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/admin/音声/docs/テストのみ変更)。
// v2142: なぞなぞトレインのジャングルで、雲を含む最奥skyと、その手前の山・樹海horizonを同じ12vh上げた。3層目以降、動物、駅、線路、列車は不変で、horizon下端を線路奥上端80vhへ合わせて隙間を防止 (batch:1266)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2141: Basic Auth管理ダッシュボードへ、なぞなぞトレイン全6ステージの16:9試遊セレクターを追加。same-origin管理iframeだけがステージを選択でき、子画面タップで音声を解錠して開始。試遊中のセーブ書込とLP側のロック迂回を禁止した (batch:1265)。play.html PAGE_CACHE_VERSION と同期不要 (admin/nazonazo-tunnel/テストのみ変更)。
// v2140: なぞなぞトレインの町外れで奥から2番目の山を固定上限なしの0.16倍パララックスへ変更。ジャングルは鳥3種・チョウ3種を各1体ずつシャッフル表示し、深い海は強制スクロールを保ったまま潜水艦の高さ操作と「あわレーン」回答ゲームを追加した (batch:1264)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2139: ガチャガチャ結果の撮影でアニメーションtransformが二重適用され、景品とカプセルが左寄り・拡大して広角に見えていた問題を修正。撮影クローン内だけ最終フレームを静的transformへ焼き込み、実画面と1920×1080保存画像の位置・大きさを一致させた (batch:1263)。play.html PAGE_CACHE_VERSION と同期 (2139)。
// v2138: なぞなぞトレインの町外れ遠景・中景とジャングル遠景を純白背景から再生成し、紫フリンジを除去して山裾を線路まで延長。ジャングルの最奥2層、線路、列車、駅、木を上げ、駅奥に低い生息地層を追加。ゾウ/キリンは各3回のstage固定出演（大型1回＋小型2回、反転/別コマ）へ整理し足裏接地。数字面は答えの数だけ品物を貨車へ積み、戻す/しゅっぱつで確定するミニゲームへ刷新 (batch:1263)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2137: なぞなぞトレインの町外れで奥から2番目の山をさらに12vh上げ、数字ステージの浮いて見えた最前景を撤去してジャンプ回数で答えるミニゲームへ変更。ジャングルは向き・縮尺を統一したチョウ3コマと、端切れのない大型キリン・正面ゾウ鼻3コマへ差し替えた (batch:1262)。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更)。
// v2136: おべんとうチュートリアル中は通常プレイ用「したに しく」編集帯を隠し、小さいおかず工程の配置済みメイン選択と古い葉っぱ編集callbackを拒否。正規のレタス→ハンバーグ導線は維持し、現行27 cueのナレーション収録正本も追加 (batch:1262)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/docs/テストのみ変更)。
// v2135: ガチャガチャの透過案内へ出る矩形マスクを除去し、当日終了案内をフクロウ博士の木枠へ変更。スクショは押下時のstep／開封状態を保持してシール消失・カプセル変形・案内枠の取り違えを防止。お店看板を実img化して半欠けを解消し、LP画像と表記を更新 (batch:1260)。play.html PAGE_CACHE_VERSION と同期 (2135)。
// v2134: おべんとうチュートリアルの縮小・回転を独立履歴として2回取り消す流れへ修正。はっぱボタン・レタス・ハンバーグの青枠を監視ループ外の専用レイヤーで常時見えるようにし、横なみなみしきりは本体と配置エディターを-4.4度へ同期、左右2枚の中心高さも同じ行へそろえた (batch:1261)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/admin/テストのみ変更)。
// v2133: なぞなぞトレインの列車ステージで線路・列車・駅・地面接地物を上へ調整。町の空と一体の最遠景山を通常42vh／超横長34vhまで上げ、透明な谷間には空画像下端色を補って黒い隙間を防止。トンネル内ハイスコアは箱をなくし、白文字で画面上中央へ大きく表示。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更、batch:1261)。
// v2132: なぞなぞトレインの現在スコアを画面上中央へ固定し、右へハイスコア・おたすけ・ともだち数を横並び化。町の雨を旅ごと25%のにわか雨（晴れ間あり）へ変更し、壁面シルエットの大きさ/角度差、キリン/ゾウ拡大、GPT Image 2の鳥/チョウ3コマ飛行を追加。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更、batch:1260)。
// v2131: おべんとうチュートリアルを子ども向けの「タッチ」表記へ統一。指定外の品目・タブは配置前に止めて「それは ちがうよ」と再案内し、のりは位置undo 1回→縮小＋時計回り→まとめてundo 1回へ変更。レタスの青い丸枠、しきり全7枠、しきり前面化、横なみなみしきりの水平補正も反映 (batch:1260)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/admin/テストのみ変更)。
// v2130: おべんとうのレタス選択直後、画像decode待ちの旧おかずDOMが最初のハンバーグタップを横取りする競合を解消。armed状態を即時描画して、案内が出た瞬間から対象タップが確実にstageへ届くようにした (batch:1258)。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/テストのみ変更)。
// v2129: おべんとうチュートリアルを、のりの時計回り→反時計回り（相殺して取り消し3回）、小さいおかず4個＋三色バランスの短い再案内、ハンバーグ限定のレタスタップ、しきり1個→ピック1個の実操作順へ更新。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/テストのみ変更、batch:1258)。
// v2128: なぞなぞトレインに面別・旅合計スコア、壁面と同期して流れる「トンネルの かくれともだち」、おたすけ4個目以降の点数変換を追加。ジャングル6種を、森に半ば隠れて生活する高密度なGPT Image 2素材へ差し替え。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像/テストのみ変更、batch:1255)。
// v2127: スクショモードをシール帳 (Prototypes/StickerBookThreeJS、WebGL canvas 直撮り: build 内 1 フレーム明示 render → 同期合成)・シールミュージアム (StickerExhibitionCarousel、#app を html2canvas + 共有シム + dynScale)・どんぐりショップ (play.html #donguriShop .donguri-shop-v2-stage) へ追加 (batch:1254)。play.html はモーダル open ごとに register を上書きする方式 (ガチャ⇄ショップ切替、hideShop でガチャ復帰)。capture-mode OFF の本番挙動は不変。ミュージアム main.js の ?v= もバンプ。play.html PAGE_CACHE_VERSION と同期 (2127)。
// v2126: もりのおみせの音声排他を修正 (batch:1253) — ガチャ上のショップで gesture/focus/visibility 復帰が背後のガチャbedを再開する経路と、close後にshop曲を復活させる遅延retryを封鎖。ショップ中のおとOFF/ONも無音→shop曲だけへ統一。吹き出しをリスの顔より上へ移し、時刻案内は1行、開店案内は意図した2行へ組版。play.html PAGE_CACHE_VERSION と同期 (2126)。
// v2125: Bento Kitchen のコロッケ成形を、こねたタネから粉工程1枚目と同一の素コロッケ輪郭へ30〜90%で連続クロスフェード。完成時は点線ゴールとalpha輪郭・中心・角度を一致させ、粉工程開始時も同じ大きさ・位置を保持してから皿中央へ滑らかに移動する。play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html/テストのみ変更)。
// v2124: なぞなぞトレインのジャングル動物を18体から遠・中・手前各2体の6体へ整理し、動物自身を完全不透明化。キリン・ゾウ・ワニは透過alpha下端ではなく可視の足先/丸太を草地線へ接地。各トンネルに「トンネルの かくれともだち」を追加し、直前の仲間3人を探して3/3なら次面用おたすけ1個、無操作でも列車進行は維持。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2123: スクショモード common/capture.js の出力低解像度 (全体ぼやけ) を根治 (batch:1244) — html2canvas@1.4.1 の背景描画が CSS px 中間 canvas 縮小で scale の supersampling を捨てる根因に対し、①object-fit img の padding 焼き込み (鮮明 img パス維持)、②CSS 背景→img 注入シム (Option X: トップ/おみせボタン等の単一 url() no-repeat 背景、native 比 9 割へ回復)、③撮影中限定の createPattern スケール補正 hook (Option Y2: repeat/多層背景の保険、shoot() の try/finally で install/uninstall + 再入ガード)、④play-gacha build の scale 動的化 (小窓でもラスタ ≥ preset)。実測: ボタン lapVar 239/270→878/1273。capture-mode OFF の本番挙動は不変。play.html PAGE_CACHE_VERSION と同期 (2123)。
// v2122: おべんとうチュートリアルの「とりけす」1回制限を撤廃。移動・縮小・拡大・回転の履歴を初期顔へ戻るまで1段階ずつ戻し、両目・鼻・口が元の位置/大きさ/回転へ復元した時だけ「のりOK」へ進む。復元後は顔パーツ配置まで戻しすぎない。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/テストのみ変更)。
// v2121: Mazeステージ4の到達不能な板アイテムをstage/runtime/editor/画像から完全撤去。Basic Auth管理ダッシュボードへ全9ミニゲームの16:9デバッグ枠を追加し、same-origin管理iframeだけが通常のBGM一拍・ナレーション開始経路を進行保存なしで起動可能に。高速切替時は世代IDで旧じゃんけん/Simon timerを無効化。play.html PAGE_CACHE_VERSION と同期 (2121)。
// v2120: Bento Kitchen のポテト+ひき肉を、中央小山→同じ水彩そぼろ粒が内側・中域・全体へ均等に広がる4段階へ再構成。局所maskを維持したままドラッグ中だけ食材面を小さく追従させ、中央に留まって急に全面へ飛ぶ見え方を解消。コロッケ成形は同一素材をX/Y連続warpし、完成時の中心・幅・高さを点線ゴールへ一致。play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html/画像/テストのみ変更)。
// v2119: なぞなぞトレインのジャングル動物18体を、空中の画像上端基準から枝・吊り下がり・足元基準へ再配置。樹上動物を116%中景タイルと同位相で流し、地上組は草地へ接地して上下浮遊を停止。vminでキリン最長身／ゾウ大柄／シマウマ中型／ライオン低めの体格差を固定し、ジャングル時の運転席内装で背景動物の車窓貫通も防止。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/テストのみ変更)。
// v2118: おべんとうチュートリアルののり操作を「移動→ちいさく→おおきく→回転→とりけす1回→のりOK」の実操作順へ整理。パレット内外のscroll完了と安定rectを待って青枠を1回だけ開始し、Phase切替・配置直後・遅延callbackでの途中描画/別位置再表示を防止。しきりは管理エディター/APIのA〜G配列を座標・向き・サイズの正本としてindex順に配置する。play.html PAGE_CACHE_VERSION と同期不要 (bento/index.html/テストのみ変更)。
// v2117: Bento Kitchen のじゃがいも潰しで、進行判定領域に切られて残っていた旧画像の上輪郭を、ドラッグ履歴の相補maskで先に除去して同じ位置へ次画像を入れる局所置換へ修正。皿外へ出て戻るpointerは新しいstrokeとして再開し、皿を横切る帯も防止。ポテト+ひき肉の4段階と成形素材は、直前のマッシュと同じ皿・画角・大きさを固定したマットな水彩絵本調へ統一。play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html/画像/テストのみ変更)。
// v2116: タイトルのめいろ説明文を、写真が出ない通常／選択だけの状態では他カードと同じ焦げ茶へ統一し、実際に写真peekが出るscroll overlay／fine-pointer hover・focusだけ明色へ反転。プロフィール主画面の姿を短画面68pxの3倍となる204pxへ拡大して名前・操作・進捗を右列へ整理し、「ゲームで あそぶと できたことが ふえるよ」を独立枠から進捗ボックス最上段へ統合。490×317を含む5画面幅で下部とじるまでscroll不要。play.html PAGE_CACHE_VERSION と同期 (2116)。
// v2115: もじっこファームの「もじごはん」を、茶わんのおかゆ風アイコンから白い三角おむすび＋濃いのり＋星形具のピクセルアイコンへ差し替え。持ち物・食事ボタン・食事FX・文字報酬を新versioned画像へ統一し、食事時刻／回数／報酬／保存／文字判定ロジックは不変。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/画像/テストのみ変更)。
// v2114: なぞなぞトレインのサル/フクロウを、目の規則だけ維持してポノ型の正面丸顔・淡色顔面パッチから分離。サルは横向きの長い四肢・枝を握る手足・S字尾、フクロウは横広の盾形頭・近い2眼・短い中央くちばし・翼/胸斑/足で種固有シルエットに差し替え、白目/眼輪なしの絵本調を維持。新versioned alpha WebPで旧cacheを回避。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像のみ変更)。
// v2113: プロフィールハブの独立した「なまえを かえる」「すがたを えらぶ」ボタンを撤去し、名前本体とサムネイルを直接タップする編集導線へ変更。名前専用パネルへランダム機能を追加し、意味が伝わりにくかった「できた／いちばん／もうすぐ」を、達成数／全数・全体バー・次の具体的な項目へ置換。490×317を含む短い横画面の下端収まりと、各サブ画面のフォーカス移動も調整。play.html PAGE_CACHE_VERSION と同期 (2113)。
// v2112: もじっこファームへ、朝・昼・ごご・ばん各1回の食事枠と成長別のもじミルク／もじごはん／もじクッキーを追加。GPT Image 2のもじごはん画像と動的な報酬枠、旧セーブ移行、日跨ぎ・複数タブの重複防止、欠食で機嫌を下げない表示を実装。タマゴ中の文字報酬はスターのみ。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/画像/テストのみ変更)。
// v2111: なぞなぞトレインのジャングル動物12種を、白目なしの濃い丸目＋小さなハイライト、丸い単純形、マットな水彩・ガッシュの絵本調へ全差し替え。サル/フクロウを基準に全種の目と描き込み量を統一し、新versioned alpha WebPで旧リアル調cacheを回避。既存3深度パララックス・微動・iOS上限・トンネル/reduced-motion/LP lockは維持。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像のみ変更)。
// v2110: ガチャ/おみせ画面へタイトル BGM が二重再生される実機バグを根治 (batch:1242) — タブ復帰時の visibilitychange 復帰経路 (play.html tryPlay) がガチャ/おみせの抑止状態を見ず無条件 resume していた問題へ、単一調停点 isTopBgmSuppressed() (pausedTopBgm フラグ + モーダル DOM 開閉の OR) ガードを導入。PonoVisibilityAudioGuard の backoff replay が抑止中の play-bgm を native play で復活させる経路も data-pono-force-paused 契約で封鎖。閉時の正当復帰 (resumeTopBgmAfter*) は直接 play() でガードを bypass し不変。play.html PAGE_CACHE_VERSION と同期 (2110)。
// v2109: もじっこファームの文字書きで、点線ガイド・塗り判定・HanziWriter の座標変換を共通化し、HanziWriter 合格後に別条件で拒否する終点判定／途中保留／3回目救済を撤去。見えるガイドの約65%を順方向になぞる共通fallbackと、半濁点など閉ループ10画の循環進捗を追加し、全142かな418画の100%/65%正方向通過・逆方向/点打ち拒否を固定テスト。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html/テストのみ変更)。
// v2108: なぞなぞトレインのジャングルへGPT Image 2生成の動物12種を奥・中・手前寄り3層で追加。18体（iOSは15体上限）を大きさ・向き・位相・速度違いでパララックス微動させ、問題/列車より後ろ・pointer-eventsなし・トンネル/他stage非表示・reduced-motion静止・雨天暗転・LPロック時0読込に対応。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel/画像のみ変更)。
// v2107: スクショモード capture.js の2不具合修正 (batch:1241) — ① html2canvas 1.4.1 が object-fit/object-position 未実装で img を box へ全面 stretch するため、デイリーガチャの LP 16:9 撮影でガチャ機が横太り (実測 AR 0.81→1.02〜1.07、viewport 依存で毎回変動) していた問題を、onclone で該当 img を透明1px + 等価 background-image (contain/cover) へ変換して修正 (クローン DOM 限定・実画面無影響、Playwright 実測で AR 0.812 に復元)。② Mac で Shift+Alt+C が e.key='Ç' となり撮影 UI が開かない問題へ e.code==='KeyC' 併用で対応。isFeatureEnabled('capture-mode') gating は不変。play.html PAGE_CACHE_VERSION と同期不要 (play.html 未変更、common/capture.js のみ変更)。
// v2106: Bento Kitchen のじゃがいも切れ端を、縮小後pxの二重適用を避けた9固定スロットで皿の横90%・縦84%へ分散。マッシュは各段階を全体98%・各領域95%まで保持。ポテト+ひき肉はGPT Image 2の中央小山素材へ差し替え、共通皿を固定したままドラッグ履歴maskで触れた食材部分だけを次状態へ置換する局所mixへ変更し、段階境界も全体96%・6領域90%まで保持。play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html/画像のみ変更)。
// v2105: もじっこファームのお世話で、縮小画面でも同じ長さになるようなで距離を正規化し、短い一筆は累積して中央通知を繰り返さないよう修正。タマゴ中の案内から「あたま／ミルマル」を外し、文字完了後にお世話から戻ると次の文字を復元。副指・pointercancelも分離。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori のみ変更)。
// v2104: なぞなぞトレインの町で雨を旅ごと50%抽選へ変更し、雨天は列車の巡航を8%ゆっくりにする代わり、めずらしい仲間の1回ごとの遭遇率を25%→40%へ上げる。かな2行の効果案内、マップ/ステージをまたがないレアtimer guardも追加。最遠景山は通常30vh・超横長22vh、次の山はtop -38vhへ上げ、下端gapなしで奥行きを強調。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel のみ変更)。
// v2103: もじっこファームの文字書きで、HanziWriter 合格後の独自終点条件を88%→72%へ緩和。合格済みの途中線を消さず次のタッチで続けられるようにし、3回目は前向き45%・終点72%・塗り50%・逆戻り12%以内・実ドラッグをすべて満たす時だけ救済。点打ち/微小往復/逆書き/別画を拒否し、pointercancel/二本指の認識ずれも防止。play.html PAGE_CACHE_VERSION と同期不要 (writing-mori/index.html のみ変更)。
// v2102: Bento Kitchen の包丁効果線を11本へ増やして実表示2.7〜6.8pxへ増太。じゃがいも潰しは90%/全域条件を保ちつつ細かなcoverageで所要操作を延長し、ポテト+ひき肉混ぜは共通皿上の小粒食材レイヤーを全域coverageで連続blend/warpする方式へ刷新。左残り・局所塗り絵表示・大粒の納豆状表現を解消し、成形も同一食材から小判形へ連続warpする。play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html/画像のみ変更)。
// v2101: デバッグ機能 'survey-multi-submit' を追加 (batch:1236)。ON のときだけご感想 (survey.html) と★モーダル (rating-modal.js) の永久 dedup チェックをバイパスして何回でも送信テスト可能に。survey.html に debug-mode.js 読込 + リロード不要の再送信ボタン (デバッグ時のみ DOM 生成) を追加、PONO_SW_VERSION を v2101 に同期。isAllowed() gating (staging + manage 解錠) は不変で本番挙動に影響なし。play.html PAGE_CACHE_VERSION と同期不要 (play.html 未変更、survey.html/common/debug-features.js/rating-modal.js のみ変更)。
// v2100: Maze ○×クイズの回答行を横画面gridの水平中央へ固定し、2ボタンの左右余白を均等化。play.html PAGE_CACHE_VERSION と同期。
// v2099: Maze 全9ミニゲームの16:9枠内で、旧compact上限により小さく浮いていた主役絵・ゲーム盤・操作面を短辺比例へ変更。じゃんけん/旗/○×/Simon/シルエット/なかまはずれ/水/岩/ボウリングと結果・報酬状態の余白を再配分。play.html PAGE_CACHE_VERSION と同期。
// v2098: なぞなぞトレインの規則的な雨タイルを、長さ・太さ・速度・開始位相・横流れが粒ごとに異なる遠/中/手前3層パーティクルへ刷新。固定プール再利用、iOS 74粒上限、トンネル/晴天/LPロック時停止、reduced-motion静止に対応し、空と一体の最遠景山も通常18vh・超横長14vh上へ移動。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel のみ変更)。
// v2097: なぞなぞトレインの町外れで遠景・中景の山を上へ移動し、固定枠内ミラー式ループでiOSを含む横切れ・継ぎ目を解消。1周目の町に3層の雨と景色減光を追加し、トンネル内/次ステージ/reduced-motion/管理用晴雨比較に対応。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel のみ変更)。
// v2096: Bento Kitchen の包丁効果線を実表示1.9〜5.4pxへ太くし、じゃがいも潰しを実coverage 90% + 全域80%へ引き上げ。コロッケ成形は共通皿・同一中心/水平角度の食材レイヤー3段階へ統一し、未成形の山から小判形へ進む見た目に刷新。play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html/画像のみ変更)。
// v2095: Maze 全9ミニゲームのプレイ枠を16:9へ統一し、viewport短辺へ収める。シルエット/リズムで残っていた虫紹介欄と内部scroll、旗/岩/ボウリングの高さ431〜560pxでの下端切れを解消。play.html PAGE_CACHE_VERSION と同期。
// v2094: Maze の旧縦長動物cropを全参照から撤去し、安全な単体画像へ統一。犬を中央配置画像へ変更し、岩くだきは24打/13秒へ延長。同名画像は固定queryで旧cacheを回避。play.html PAGE_CACHE_VERSION と同期。
// v2093: なぞなぞトレインで開始時のスキン更新後も初期描画ガード解除クラスを保持し、音だけ流れて全画面が消える回帰を修正。play.html PAGE_CACHE_VERSION と同期不要 (nazonazo-tunnel のみ変更)。
// v2092: Bento Kitchen のじゃがいも潰しを各画像段階の実coverage 80% + 全域判定へ変更し、同じ場所の連打を無効化。ポテト+ひき肉は皿を適正化し、太い連続ブラシで広く混ざる表示へ修正。play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html のみ変更)。
// v2091: タイトルメニューのスクロール矢印を白⇄オレンジでゆっくり明滅 (視認性向上)。play.html PAGE_CACHE_VERSION と同期。
// v2090: Maze 岩くだきの入力を click 完了待ちから primary pointerdown 即時受付へ変更し、高速マウス連打の取りこぼしを防止。後続 click の重複除外、キーボード/支援技術 fallback、固定 hit area も追加。play.html PAGE_CACHE_VERSION と同期。
// v2089: Bento Kitchen のじゃがいも潰しを、既存マッシャーのタップ/ドラッグと同角度3段階の局所リビールへ変更。指ぶれ・Enter・画像失敗時の進行も保護。play.html PAGE_CACHE_VERSION と同期不要 (bento/kitchen.html のみ変更)。
// v2088: bento tier 別アイテム再配分 (batch:1221) — 小さいおかず(ミートボール/にんじんいんげんをfreeへ降格、えだまめ/ポテトサラダ/りんごをbookへ昇格。ぶどうはカタログ実体なしのため不採用)、しきり/ピックを各1種(なみなみ/ほし)のみ無料化し他3種ずつをbook以上に変更 (common/tier.js, bento/index.html)。play.html PAGE_CACHE_VERSION と同期不要 (tier.js/bento/index.html 変更)。
// v2087: Maze なかまはずれを短い横画面で虫/4択の左右2列へ切替え、全15問を画面内へ収容。細長いネコ/いぬ/くま/ライオン/ぞうを既存生成素材へ差し替え。play.html PAGE_CACHE_VERSION と同期。
// v2086: bento tut2 hotfix5 (batch:1058) — とりけす教習ステップ + はっぱ指定制 (レタス→おかず下) + 完成画面レガシー二重系統の tut2 中無効化 + 全ステップのテキストチャネル整理 (floating bubble 削除・setSpeech 一本化) + 仕切りG 縦強制撤去 (bento/admin/worker)。play.html PAGE_CACHE_VERSION と同期不要 (bento/admin/worker 変更)。
// v2085: Maze 全9ミニゲームの開始時に探索BGMをフェードアウトし、新BGMを一拍聴かせてからゲーム/ナレーションを開始。ボタンの開始合図と待機取消も追加。play.html PAGE_CACHE_VERSION と同期。
// v2084: Bento Kitchen の包丁効果線を実際の位置・サイズ・振り下ろし量へ追従させ、線の長さ/太さ/間隔/タイミングを不均一化。play.html PAGE_CACHE_VERSION と同期。
// v2083: App タイトルのなぞなぞトレイン / クッキング / もじっこファームを専用の既存素材へ差し替え。native manifest に 3 ゲームの本体・必要素材・クッキング thumb を同梱。play.html PAGE_CACHE_VERSION と同期。
// v2082: 未ローンチ2ゲーム (トントンキッチン/もじっこファーム) に直URLロック追加 (app tier のみ通過)。play.html PAGE_CACHE_VERSION と同期。
// ── changelog アーカイブ ──
// v2081 以前の changelog は docs/sw-changelog-archive.md へ移動した (最終移設 2026-07-11)。
// sw.js が ~318KB (約 93% が changelog コメント) に肥大し、 毎ロード + 5分毎の
// update poll で再ダウンロードされていたため。 docs/ は .assetsignore で deploy 除外。
// 新しいエントリは従来どおりこのファイル先頭 (L3、 newest-first) へ追記し、
// 古いエントリ (目安: 最新 ~10 件超過分) は docs/sw-changelog-archive.md 先頭へ退避すること。
// v2283: v2282 の回帰 + 横展開漏れを修正。(1) common/stamp-rally.js showAchievementList()
// の分子 doneCount が Object.keys(unlocked).length(未フィルタ)のままで分母(active実績数)と
// 母集団が食い違い「73/43」のような破綻表示になっていたのを、allAch(active)でフィルタし直して解消。
// (2) room/index.html renderTakaraAchievements()(おもちゃばこ→じっせきタブ)が
// window.getAchievements()(全件)のままだったのを getActiveAchievements() へ差し替え、
// 分子/分母とも active 母集団に統一。(3) collection/index.html(ずかんページ)のスタンプ一覧も
// getAchievements() → getActiveAchievements() へ差し替え(未取得を隠さず見せる設計意図は維持)。
// (4) 追加grepで common/stickers.js の window.showAchievementBoard()(現状どこからも未呼出だが
// window公開の同型バグ)も発見し、同じくactiveへ差し替え。
// v2282: スタンプカード🏆実績一覧が廃止済みゲーム(wordmatch/bowling/breakout/slide/fossil/旧writing)の
// 実績を表示し続けるバグを修正。common/stamp-rally.js:906 showAchievementList() の window.getAchievements()
// (全件・未フィルタ) を window.getActiveAchievements() (archived除外) へ差し替え。
// v2281: プロフィール選択のキャラクター候補を、初回作成・編集の両画面で拡大。
// v2284: スタンプカード報酬ロジックのデータ整合性を整理 (common/stamp-rally.js, assets/data/rewards.json)。
// (1) カード完成報酬の履歴が後から食い違う精度バグを修正: 付与した瞬間の報酬をLS_STAMP_REWARDS_DETAIL
// へスナップショット保存し、showRewardHistory()はそれを優先表示するよう変更 (CARD_COMPLETE_REWARDS配列の
// admin側並べ替え/削除やオフライン→オンライン切替で過去の履歴まで別アイテムに化けていたバグの根本対応。
// 記録の無い旧ユーザーは従来通りその場再計算にフォールバックし後方互換を維持)。
// (2) stamp-rally.jsのCARD_SLOT_REWARDS/CARD_COMPLETE_REWARDSフォールバック(fetch失敗時用)を、
// rewards.jsonの実データ(1/8/15マス目・カード完成報酬5件)と完全同期(旧フォールバックは無関係な
// アイテムだった)。(3) rewards.jsonの20マス目報酬(SLOTS_PER_CARD=15のため絶対に到達不能)の
// マッピングを削除。対象家具2点(imp_furn_45b11a5f/imp_furn_13713cc8)はroom/items.jsの通常ショップ
// 商品として現存するため画像/データ自体は削除せず、shop-catalog.jsが誤って実績専用(非売品)扱い
// していたバグも副次的に解消。(4) rewards.jsonのslot1 afterMsgがカンマ結合の単一文字列になっていた
// バグを配列2件へ修正。play.html PAGE_CACHE_VERSION / PONO_SW_VERSION / stamp-rally.js?v= と同期。
// v2285: スタンプカード スロット報酬(1/8/15マス目)の履歴表示にも、カード完成報酬と同じ
// スナップショット方式(pono_stamp_rewards_detail)を適用。rewards.json のスロット報酬定義が
// 後で変わっても、過去に付与済みの履歴表示が化けないようにする(common/stamp-rally.js)。
// v2288 (batch:1370): 性別自動判定を廃止し「宝箱を開ける瞬間に子どもがboy/girlの見た目を
// タップで選ぶ」方式へ変更。common/treasure.js の showTreasure() に options.choices/onChoose
// による2択選択モードを追加(gendered報酬でboy/girl両方のデータが揃う時のみ有効化。
// データ不備時は従来通り単一revealへフォールバック)。common/first-clear.js/common/stamp-rally.js
// は grantReward を「表示前」から「選択確定後」に変更し、pono_profile(現在のユーザー導線
// からは誰も書き込まない壊れたキー)への依存を撤去。play.html PAGE_CACHE_VERSION/
// PONO_SW_VERSION、common/treasure.js?v= / common/stamp-rally.js?v= と同期。
// (batch: nazonazo-tunnel-branch-choice-ui) なぞなぞトレイン: トンネル内に
// snow/fire分岐用の選択ゲートUI(#tunnelBranchGates)を追加。finishTunnelInterior/
// gloopの無条件stg++をresolveNextStage(stg,pendingBranchChoice)ベースに置換し、
// applySkinのクロスフェード先読み(nIdx)もresolveNextStage経由に統一。
// game.js/index.html/styles.cssを変更したためバンプ。
// クロスレビュー修正: openMap()の解放進度がhidden(snow/fire)分岐indexを
// 誤ってmax()に含めてしまい本編ステージを丸ごとスキップ可能だったバグ修正、
// buildRegistry()のhidden除外(=snow/fireで集めた生きものがずかんに永久に
// 出ない不整合)を撤廃、仲間探しミニゲームと分岐ゲートUIの同時起動によるタップ
// 領域重複を町区間のみ回避、quiz-art.jsにstageSnow/stageFireアイコン追加。
// (batch:1401-nazonazo-tunnel-branch2-3-4) 分岐点2(jungle→number: dino/toy)・
// 分岐点3(number→sea: cat/fantasy)・分岐点4(future→space: sky/ruins)を追加。
// STAGES末尾に6新規隠しステージ、jungle/number/futureにbranches追加、RARES/
// GENS(sizeD/sizeT)/questions.js(DINO/TOY/CAT/FANTASY/SKY/RUINS)/quiz-art.js
// (stageDino等)を拡張。styles.cssは既存の#veh/#cars exact-match回帰テスト
// (nazonazo_mountain_weather_regression.cjs)を壊さないため今回は無変更。
// (batch:1401-nazonazo-admin-branch-preview) 管理ダッシュボード(admin/index.html)の
// 🚂なぞなぞQAパネルに、分岐先隠しステージ8つ(snow/fire/dino/toy/cat/fantasy/sky/ruins)
// のプレビューボタンを「🌉ぶんき ルート(かくれステージ)」見出し付きの別グループとして
// 追加。game.jsのNAZONAZO_ADMIN_STAGE_INDEXにも8id(index6〜13)を追加。プレイヤー向け
// 本編マップ(openMap)は無変更、隠しルート発見体験もそのまま。admin/index.html・
// game.jsを変更したためバンプ。
// (batch:1402-nazonazo-darius-phase0-refactor) 将来のDarius homage分岐拡張(Phase1/2)に
// 向けた技術的負債解消の純粋リファクタ(新規コンテンツ追加なし、既存14ステージの挙動は
// 完全不変)。RARES独立配列を廃止しSTAGES[i].rare(2要素)へ移植、isMainlineFinalStgを
// STAGES[i].final、isSeaStage/isFutureStage/isSpaceStageをSTAGES[i].mechanic
// (seaBoss/futureCrane/spaceChase)ベースの判定へ一般化、NAZONAZO_ADMIN_STAGE_INDEXを
// STAGES.reduce()による自動導出へ置換、openMap()の進度カウントをhiddenから独立した
// countsToProgress:falseフラグへ分離(マップ表示可否は引き続きhiddenで判定)。game.jsを
// 変更したためバンプ。
// (batch:1403-nazonazo-darius-phase1-data-wiring) 「毎ジャンクション必ず分岐する」構造の
// Phase1データ配線。sea に branches:[future,future2] を新設(唯一の完全新規ジャンクション)、
// fantasyのrejoinIdをsea→sea2、ruinsのrejoinIdをspace→space2へ変更、末尾index14/15/16に
// sea2/future2/space2(hidden:true・countsToProgress:true・プロシージャルSVGのみ・問題バンク
// はPhase1スタブとして既存流用)を追加。buildWorld()のtrackside decor件数抑制をst.id直書き
// からst.mechanicベースへ一般化(sea2/space2への一般化漏れ対応)。トンネル分岐ゲートに
// speak()呼びかけ+transform/box-shadowのみの揺れ演出、openMap()に「えらべる みち」フォーク
// ヒント(🔀+行き先2アイコン)を追加。game.js/styles.css/quiz-art.jsを変更したためバンプ。
// (batch:1404-nazonazo-darius-phase1-crossreview-fix) 3レンズ独立クロスレビューで発見された
// Phase1回帰3件を修正。(1) sea2/future2/space2はbody.className="st-"+st.idでのみクラス
// 付与されるため、styles.cssの.st-sea/.st-future/.st-space(31/22/30箇所)や
// document.body.classList.contains("st-space")等のJS判定が一切効かず、sea2の潜水艦操作
// UI・全クイズ当たり判定、space2の通常操縦・星背景が実質プレイ不能だった。applySkin()を
// 新設stageBodyClass()(st.mechanicベース)経由にし、body に "st-<id>" と同時にmechanicを
// 共有する本編ステージの"st-sea"/"st-future"/"st-space"family classも付与するよう一般化。
// (2) openMap()のhighestOpen計算がsea2/future2/space2の物理STAGES index(末尾14-16、本編
// 0-5より後ろ)をそのままi+1採用しており、sea2に到達しただけで本編マップ6ノード全てが
// 先取りアンロックされる進行スキップバグがあった。新設mainlineSlotIndex()(mechanicで
// 本編の対応ステージindexへ変換)を導入しopenMap()のhighestOpen/cur判定を修正。
// (3) openMap()の分岐ヒント(.map-fork-hint)を#mapRowの直接の子(横一列)として追加していた
// ため、追加幅で「みらいシティ」「うちゅう」ノードが画面外へ押し出されタップ不能になる
// レイアウト回帰があった。ヒントを各mapNodeボタン自身の子として絶対配置化しrowの横幅
// 計算から除外、押せるボタンに見えて反応しない見た目(box-shadow・無限パルス)も撤去し
// 静的な情報タグへ変更。game.js/styles.css/tests/nazonazo_tunnel_branch_topology_regression.cjs/
// tests/nazonazo_ready_class_regression.cjsを変更したためバンプ。
// v2312: play.html の APP_TITLE_MENU_IDS へ開発中コンテンツを追加
// (starparodier/undersea-cave/sea-album を通常公開 + bubble/coloring/
// stacking/aquarium を comingSoon:true+debugPlayable:true で追加、
// GAMES 配列へ新規4エントリ追加) したためバンプ。
// v2313: コードレビュー指摘対応。bubble/coloring/stacking の
// 「テスト用: 毎回表示」デバッグ残骸(localStorage.removeItem直後の
// チュートリアル強制表示)を除去、チュートリアルが1回だけ出るよう修正。
// v2314: なぞなぞトレインの恐竜ステージを、常時見える遠景の群れと水辺を含む
// 5つの生活シーンへ拡張し、疎な中景で山並みを再表示。猫ステージは毛糸の旧前景を
// 撤去し、8種類の猫の暮らしを全長14地点へ分散。選択ステージだけ追加素材を先読みし、
// 新規17画像は初回画面必須ではないため CRITICAL_ASSETS へ追加しない (batch:1407)。
// v2315: なぞなぞトレインの火・恐竜・魔法ステージを奥行き再調整。火は遠景へ火山を戻し、
// 地表に炎5／火の粉7〜8の再利用プールを常時流す。恐竜は空の透けを草原で塞ぎ、遠景群れと
// 5つの生活シーンを深度別速度へ分離。魔法の城を上へ出し、星の装飾だけを穏やかに明滅させる。
// 新規11画像は選択ステージだけが読むため CRITICAL_ASSETS へ追加しない (batch:1408)。
// v2316: なぞなぞトレインの火・恐竜・猫ステージの画像と多重スクロールを世界観に合わせて再調整 (batch:1409-world-coherence)。
// v2317: なぞなぞトレインの恐竜・卵・猫の実接地線を地面へ固定し、猫の建物と生活景を
// clampなしのworld座標で連続スクロールさせる。全区間の猫密度も均等化 (batch:1410)。
// v2326: hatake-nikki の畑レイアウト崩れ(#field-bg幽霊アセット除去+tool-rail/plot2重なり解消)
// 修正 + 水やり操作discoverability改善(パルス演出/ヒントトースト/初回チュートリアル自動表示) (batch:1415)。
// v2332: なぞなぞトレインの火山恐竜ワールド・猫ワールドを再構築し、背景アセットと
// クイズ用アートを刷新 (feat: rebuild fire dino and cat worlds)。play.html
// PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2332)。
// v2333: hyokkori-hightouch の boot() を try/catch で防御し、向き判定 API が例外を
// 投げても穴生成・start-btn バインドが丸ごと止まらないようにフェイルセーフ化
// (orientation-api-exception 対応)。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION
// と同期 (2333)。
// v2335: hatake-nikki の水やり長押し中に iOS ネイティブコールアウトで touchcancel が
// 発火し水やりが無言中断される不具合を修正 (-webkit-touch-callout:none + contextmenu
// preventDefault)。水やり成功フィードバック(バッジ/演出/flash文言)と常設ステータスバー
// を追加し、#stage 背景を cover→contain に防御的変更 (ひし形頂点欠け不能化)。
// play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2335)。
// v2343: guragura-seesaw 重大バグ修正。 .pan-items { pointer-events: none } が
// 皿に置いたアイテムを永久に掴めなくしていた (誤配置しても取り除けず詰む事故、
// 2026-07-23 ユーザー報告)。 .item-box に pointer-events:auto を明示して復旧。
// play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2343)。
// v2344: なぞなぞトレイン恐竜面のクレーンを3荷物・3置場・重さ別挙動・振り子タイミングへ拡張し、
// 水路を4×7回転タイル・ランダム盤面・一度だけのヒントへ刷新。CSS/JSと関連画像のqueryを
// 20260723-1421へ同期。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2344)。
// v2345: ひょっこりハイタッチのコンボを枠なしの大きな中央数字へ変更。成功ごとに
// 文字を育て、2／5／10／15コンボの段階で色・弾み・放射花火の本数と粒子を強化した。
// 操作を遮らないpointer透過、解除／再挑戦時の消去、reduced-motion時の花火停止も追加。
// ゲーム個別ファイルはnetwork-first配信のためCRITICAL_ASSETSには追加しない。
// play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION と同期 (2345)。
// v2346: hatake-nikki の3区画を green.png の実画像面へ三角配置し、透明な矩形同士の
// 重なりで奥の畝へのタッチが手前へ奪われないよう、可視ひし形だけを操作面に分離。
// styles.css は個別query更新済み。ゲーム個別ファイルはnetwork-first配信のため
// CRITICAL_ASSETSには追加しない。play.html PAGE_CACHE_VERSION/window.PONO_SW_VERSION
// と同期 (2346)。
// v2348: ひょっこりハイタッチから常設の花壇・ひかりのたね・成長表示を撤去し、
// GPT Image 2製の6接地面つき森背景、同じ葉の茂みを背面／手前縁へ重ねる共通開口、
// 中央コンボレーンへ整理。直前に成功した場所だけを次候補から外す視線移動、
// 7体ごとの30点ボーナス、最大コンボ記録は維持。ゲーム個別ファイルと画像は
// network-first配信のためCRITICAL_ASSETSには追加しない。play.htmlの
// PAGE_CACHE_VERSION/window.PONO_SW_VERSIONと同期 (2348)。
// v2347: なぞなぞトレイン恐竜面のクレーン／水路成功結果を、自動遷移ではなく
// 明示ボタンを押すまで保持。水路はdecode済み成功絵を確認してから次へ進める。
// styles.css／game.js queryを20260723-1429へ同期。ゲーム個別ファイルと画像は
// network-first配信のためCRITICAL_ASSETSには追加しない。play.htmlの
// PAGE_CACHE_VERSION/window.PONO_SW_VERSIONと同期 (2347)。
const CACHE_VERSION = 2362;
const CACHE_NAME = 'pono-v' + CACHE_VERSION;
const ROOM_FURNITURE_CACHE_REFRESH_TOKEN = '1371c';
const ROOM_FURNITURE_CACHE_REFRESH_IDS = [
  'furn_sofa_beige',
  'furn_sofa_pink',
  'furn_sofa_blue',
  'furn_tv_stand',
  'furn_coffee_table',
  'deco_floor_cushion_stripe',
  'furn_kitchen_counter',
  'furn_fridge',
  'furn_dining_table_set',
  'furn_kitchen_cabinet',
  'deco_fruit_basket',
  'deco_cookie_jar',
  'furn_garden_bench',
  'furn_sandbox',
  'furn_garden_table_parasol',
  'deco_planter_flowers',
  'deco_watering_can',
  'deco_birdhouse',
  'furn_wardrobe_wood',
  'furn_wardrobe_pink',
  'furn_wardrobe_blue',
  'deco_christmas_tree_mini',
  'deco_tanabata_bamboo',
  'deco_pumpkin_lantern',
];
const ROOM_FURNITURE_CACHE_REFRESH_PATHS = new Set();
ROOM_FURNITURE_CACHE_REFRESH_IDS.forEach(id => {
  const base = '/assets/images/Rooms/furnitures_final/' + id;
  ROOM_FURNITURE_CACHE_REFRESH_PATHS.add(base + '_A.png');
  ROOM_FURNITURE_CACHE_REFRESH_PATHS.add(base + '_B.png');
});
// CACHE_VERSION bump 規約: sw.js / CRITICAL_ASSETS 配下 / play.html (PAGE_CACHE_VERSION) を
// 編集したら必ず +1 して deploy する。orchestrator が最後にバンプする運用 (CLAUDE.md 参照)。

// ── Critical asset precache list ──
// 目的: SW 更新後の完全コールドスタートを避け、 install 時にファーストビュー必須資産を
// 一括で取得しキャッシュへ載せる。 加えて fetch handler を cache-first に倒して
// 同一セッション内の HTTP 往復を排除する。
//
// 選定指針 (タスク提案 #2):
// - common/ 配下の必須 JS (sw-update.js, tier dispatcher, capture, acorns, data-export,
//   debug-mode, mvp-flags) + play.html が <script src> で読む js/ 3 本
// - カードサムネ thumb_*.webp 8 枚 (play.html L37-42 + bento/kitchen の予備)
// - メニューカード台座 menu_card_base_*.webp 4 枚 + paper_mask_*.png 4 枚 (タイトル4枚カード必須)
// - 任意: 主要 webp 系のみ。 bottom-nav PNG 5 枚 (合計 ~9MB) は <link rel=preload> で
//   ブラウザ HTTP cache に乗るため、 ここでは意図的に外す (precache 2MB 制約)。
//
// 注: fetch handler は isHTML なリクエストを SW 素通し (return;) しているため、
// HTML は precache しても navigation で使われない。 旧 CRITICAL_ASSETS_HTML
// (play.html / quizland/index.html / survey.html ≈ 1.16MB) は install ごとの
// 死荷重だったため 2026-07-10 に撤去 (HTML の鮮度は worker 側 no-cache 配信で担保)。
const CRITICAL_ASSETS_SCRIPTS = [
  '/common/sw-update.js',
  // v1944 (cross-file H5): preload-helper.js は BGM/SE 復帰の中核 (PonoVisibilityAudioGuard /
  // guardedPlay / statechange auto-resume) を担うため precache 対象に載せる。
  // CACHE_VERSION bump 時に確実に新版を配信 (network-first 頼みだと旧 SW キャッシュ + Cache-Control
  // で数分〜数時間の遅延あり → 実機検証で false negative になる)。
  '/common/preload-helper.js',
  '/common/debug-mode.js',
  '/common/debug-features.js',
  '/common/capture.js',
  '/common/tier.js',
  '/common/difficulty.js',
  '/common/acorns.js',
  '/common/data-export.js',
  '/common/mvp-flags.js',
  // v2207: ログインボーナス復活 (batch:1313) — play.html が common/tier.js の直後に
  // 無条件 <script src> で読む必須スクリプト (checkDailyLogin 等)。mvp-flags.js と
  // 同じ理由で precache 対象 (asset 単位 try/catch のため未配備でも install 失敗にならない)。
  '/common/stickers.js',
  // v2211: スタンプカード復活 (batch:1315) — play.html が common/tier.js の直後に無条件
  // <script src> で読む必須スクリプト2本 (grantPremiumBonus/incrementStat 等の achievements.js、
  // PonoStampRally 本体の stamp-rally.js)。stickers.js/mvp-flags.js と同じ理由で precache 対象
  // (asset 単位 try/catch のため未配備でも install 失敗にならない)。
  '/common/achievements.js',
  '/common/stamp-rally.js',
  '/common/stamp-rally.css',
  '/common/acorn-modal-shared.css',
  '/common/acorn-modal.js',
  '/common/acorn-audio.js',
  '/common/acorn-copy.json',
  // v1718: ごかんそう (rating) — 別エージェント並列作成中。 未配備でも precache は asset 単位
  // try/catch でラップされる (precacheAssetGroup の allSettled gate) ため install 失敗にならない。
  '/common/rating-modal.js',
  '/common/rating-modal.css',
  // v2166: データ分析基盤 (docs/data-analytics-plan.md) — telemetry.js は play.html の
  // data-pono-telemetry-auto script tag から読まれる必須計測モジュール。rating-modal.js と
  // 同じ理由で precache 対象 (asset 単位 try/catch のためファイル欠落でも install は失敗しない)。
  '/common/telemetry.js',
  // v2179: 初回オンボーディング・チュートリアル (batch:onboarding-tour) — 依存ゼロの
  // 単独 IIFE (telemetry.js/rating-modal.js と同型)。 asset 単位 try/catch precache の
  // ため未配備でも install 失敗にならない。
  '/common/onboarding/tour-engine.js',
  '/common/onboarding/tour.css',
  '/common/onboarding/steps-avatar.js',
  '/common/onboarding/steps-title-tour.js',
  '/common/onboarding/steps-book-unlock.js',
  '/common/onboarding/steps-gacha.js',
  '/js/game-stickers.js',
  '/js/daily-quest.js',
  '/js/donguri-shop.js',
  // 2026-07-10: PIXI 7 を CDN から common/vendor/ へローカル化 (aquarium/ + egg/ が同一
  // オリジンで読む)。 オフラインでも両ゲームが起動できるよう precache に載せる (~456KB)。
  '/common/vendor/pixi7.min.js',
  // v1745: AcornModal default SE (祝祭ジングル 1.20s)。 既存 don.mp3 と並列で precache。
  '/assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3',
];
const CRITICAL_ASSETS_IMAGES = [
  // v2258: もじっこ文字書きの全外枠で共有する9-sliceマスター。
  '/assets/images/mojikko/writing/storybook/settings-gauge-family/mojikko_settings_gauge_frame_master.png',
  // v2217: 家具スタンプカードの押印済みマスで使う赤い線画ゴム印。
  '/assets/ui/stamp-card/pono_red_rubber_stamp_20260716.webp',
  // v1718: ごかんそう (rating) — PNG asset; CRITICAL_ASSETS_SCRIPTS から分離 (semantic 整理)。
  // v1750: 焼き込み済み 木枠アイコン (通常 + 押下) に差し替え。 :active で pressed 版へ即時切替するため
  //        両方を precache し初回 tap の網経路遅延を防ぐ。
  '/assets/ui/icon_feedback_20260628.png',
  '/assets/ui/icon_feedback_20260628_pressed.png',
  // 2026-07-10: 旧 512px 版 (icon_feedback_20260628_512 / _pressed_512, 計 ~866KB) は
  // どのページからも参照されない死に precache だったため撤去 (repo 全域 grep で参照ゼロを確認)。
  // v2008: 右下ナビの一体型 GPT Image 2 生成ボタン。初回表示と押下時のちらつきを避けるため通常/押下を同時に precache。
  // 2026-07-10: lossless (~933KB/枚) → lossy q85 (~120KB/枚) へ再エンコード。 寸法 1536x492 同一、
  // 差し替え規約に従い新ファイル名 (_20260710)。
  '/assets/ui/bottom-nav/nav_group_3_joined_normal_20260710.webp',
  '/assets/ui/bottom-nav/nav_group_3_joined_pressed_feedback_20260710.webp',
  '/assets/ui/bottom-nav/nav_group_3_joined_pressed_news_20260710.webp',
  '/assets/ui/bottom-nav/nav_group_3_joined_pressed_settings_20260710.webp',
  '/assets/ui/bottom-nav/profile_wallet_frame_wide_20260708.webp',
  // v1979: GPT Image 2 生成の全身アバター用パーツマスク。プロフィールボタンが初期表示に入るため先読み対象。
  '/assets/images/avatars/parts/avatar_part_head_20260705.png',
  '/assets/images/avatars/parts/avatar_part_hair_short_20260705.png',
  '/assets/images/avatars/parts/avatar_part_hair_long_20260705.png',
  '/assets/images/avatars/parts/avatar_part_hair_spike_20260705.png',
  '/assets/images/avatars/parts/avatar_part_ears_animal_20260705.png',
  '/assets/images/avatars/parts/avatar_part_outfit_tee_20260705.png',
  '/assets/images/avatars/parts/avatar_part_outfit_dress_20260705.png',
  '/assets/images/avatars/parts/avatar_part_outfit_overall_20260705.png',
  '/assets/images/avatars/parts/avatar_part_bottom_pants_20260705.png',
  '/assets/images/avatars/parts/avatar_part_bottom_skirt_20260705.png',
  '/assets/images/avatars/parts/avatar_part_shoes_20260705.png',
  '/assets/images/avatars/parts/avatar_part_boots_20260705.png',
  '/assets/images/avatars/parts/avatar_part_tail_fluffy_20260705.png',
  '/assets/images/avatars/parts/avatar_part_tail_long_20260705.png',
  '/assets/images/avatars/parts/avatar_part_eyes_dot_20260705.png',
  '/assets/images/avatars/parts/avatar_part_eyes_smile_20260705.png',
  '/assets/images/avatars/parts/avatar_part_eyes_star_20260705.png',
  '/assets/images/avatars/parts/avatar_part_eyes_sleepy_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mouth_smile_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mouth_open_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mouth_flat_20260705.png',
  '/assets/images/avatars/parts/avatar_part_nose_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_leaf_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_dot_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_ribbon_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_star_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_square_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_heart_20260705.png',
  '/assets/images/avatars/parts/avatar_part_cheeks_20260705.png',
  '/assets/images/avatars/parts/avatar_part_mark_sparkle_20260705.png',
  // v1980: GPT Image 2 生成の体型ベースと追加パーツ。体型選択を含むプロフィール初回表示用。
  '/assets/images/avatars/parts/avatar_bodytype_balanced_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_small_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_round_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_tall_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_robot_20260706.png',
  '/assets/images/avatars/parts/avatar_bodytype_monster_20260706.png',
  '/assets/images/avatars/parts/avatar_part_hair_round_20260706.png',
  '/assets/images/avatars/parts/avatar_part_hair_side_20260706.png',
  '/assets/images/avatars/parts/avatar_part_hair_cap_20260706.png',
  '/assets/images/avatars/parts/avatar_part_ears_fox_20260706.png',
  '/assets/images/avatars/parts/avatar_part_ears_cat_20260706.png',
  '/assets/images/avatars/parts/avatar_part_ears_rabbit_20260706.png',
  '/assets/images/avatars/parts/avatar_part_ears_bear_20260706.png',
  '/assets/images/avatars/parts/avatar_part_arms_skin_20260706.png',
  '/assets/images/avatars/parts/avatar_part_outfit_hoodie_20260706.png',
  '/assets/images/avatars/parts/avatar_part_bottom_shorts_20260706.png',
  '/assets/images/avatars/parts/avatar_part_feet_bare_20260706.png',
  '/assets/images/avatars/parts/avatar_part_tail_round_20260706.png',
  '/assets/images/avatars/parts/avatar_part_nose_small_20260706.png',
  '/assets/images/avatars/parts/avatar_part_cheeks_pair_20260706.png',
  '/assets/images/avatars/parts/avatar_part_mark_ribbon_side_20260706.png',
  '/assets/images/avatars/parts/avatar_part_mark_sparkle_tiny_20260706.png',
  // v1989: GPT Image 2 生成の全身完成品40体WebP。プロフィールは完成品を選ぶ方式のまま運用する。
  '/assets/images/avatars/avatar_pono_kko_20260706.webp',
  '/assets/images/avatars/avatar_leaf_kko_20260706.webp',
  '/assets/images/avatars/avatar_sky_kko_20260706.webp',
  '/assets/images/avatars/avatar_berry_kko_20260706.webp',
  '/assets/images/avatars/avatar_acorn_kko_20260706.webp',
  '/assets/images/avatars/avatar_umi_kko_20260706.webp',
  '/assets/images/avatars/avatar_yuki_kko_20260706.webp',
  '/assets/images/avatars/avatar_hoshi_kko_20260706.webp',
  '/assets/images/avatars/avatar_hana_kko_20260706.webp',
  '/assets/images/avatars/avatar_niji_kko_20260706.webp',
  '/assets/images/avatars/avatar_kinoko_kko_20260706.webp',
  '/assets/images/avatars/avatar_lantern_kko_20260706.webp',
  '/assets/images/avatars/avatar_tsuki_kko_20260706.webp',
  '/assets/images/avatars/avatar_mori_kko_20260706.webp',
  '/assets/images/avatars/avatar_pudding_kko_20260706.webp',
  '/assets/images/avatars/avatar_oto_kko_20260706.webp',
  '/assets/images/avatars/avatar_hon_kko_20260706.webp',
  '/assets/images/avatars/avatar_puzzle_kko_20260706.webp',
  '/assets/images/avatars/avatar_garden_kko_20260706.webp',
  '/assets/images/avatars/avatar_cocoa_kko_20260706.webp',
  '/assets/images/avatars/avatar_fox_20260706.webp',
  '/assets/images/avatars/avatar_rabbit_20260706.webp',
  '/assets/images/avatars/avatar_bear_20260706.webp',
  '/assets/images/avatars/avatar_cat_20260706.webp',
  '/assets/images/avatars/avatar_squirrel_20260706.webp',
  '/assets/images/avatars/avatar_owl_20260706.webp',
  '/assets/images/avatars/avatar_tanuki_20260706.webp',
  '/assets/images/avatars/avatar_polar_20260706.webp',
  '/assets/images/avatars/avatar_robot_blue_20260706.webp',
  '/assets/images/avatars/avatar_robot_yellow_20260706.webp',
  '/assets/images/avatars/avatar_star_mon_20260706.webp',
  '/assets/images/avatars/avatar_leaf_mon_20260706.webp',
  '/assets/images/avatars/avatar_moko_mon_20260706.webp',
  '/assets/images/avatars/avatar_water_20260706.webp',
  '/assets/images/avatars/avatar_snow_20260706.webp',
  '/assets/images/avatars/avatar_mushroom_20260706.webp',
  '/assets/images/avatars/avatar_acorn_20260706.webp',
  '/assets/images/avatars/avatar_lantern_20260706.webp',
  '/assets/images/avatars/avatar_moon_20260706.webp',
  '/assets/images/avatars/avatar_puka_mon_20260706.webp',
  // v1949: peek 層の bg 8 種 (menu カード裏の絵本タイトル背景)。 cold start で
  // is-overlay-active が付いた瞬間に on-demand decode されると 100-500ms 透明/低解像
  // になり iPhone のゆっくりドラッグ中に flicker 源となるため precache 化。
  '/assets/ui/play_quizland_title_back.webp',
  '/assets/ui/play_quiz_sound_title_back.webp',
  '/assets/ui/play_wordmatch_title_back.webp',
  '/assets/ui/play_maze_title_back.webp',
  '/assets/ui/play_oto_title_back.webp',
  '/assets/ui/play_bento_title_back.webp',
  '/assets/ui/play_puzzle_title_back.webp',
  '/assets/ui/play_starparodier_title_back.webp',
  // v2030: monster-math Phase R3 (tenmegane/kakuren モードへ全面差替)。 pucchi/pakun/gaburu
  // 系立ち絵・シール・title_trio を全撤去、 新モンスター立ち絵6枚+シール4枚+title_v2_composite+hat_star
  // を precache 追加 (計12枚)。 PNG 版 (fallback 用) は精査済みで容量節約のため precache 対象外。
  '/monster-math/assets/bg_shokudo.webp',
  '/monster-math/assets/monster_tenmegane_idle.webp',
  '/monster-math/assets/monster_tenmegane_mouth_open.webp',
  '/monster-math/assets/monster_tenmegane_happy.webp',
  '/monster-math/assets/monster_kakuren_idle.webp',
  '/monster-math/assets/monster_kakuren_peek.webp',
  '/monster-math/assets/monster_kakuren_happy.webp',
  '/monster-math/assets/sticker_mm_tenmegane.webp',
  '/monster-math/assets/sticker_mm_kakuren.webp',
  '/monster-math/assets/sticker_mm_both_modes.webp',
  '/monster-math/assets/sticker_mm_perfect.webp',
  '/monster-math/assets/title_v2_composite.webp',
  '/monster-math/assets/hat_star.webp',
  '/monster-math/assets/ui_blackboard.webp',
  '/monster-math/assets/ui_counter_frame.webp',
];
const CRITICAL_ASSETS_THUMBS = [
  '/assets/ui/thumb_quizland_owl.webp',
  '/assets/ui/thumb_quiz-sound.webp',
  '/assets/ui/thumb_oto.webp',
  '/assets/ui/thumb_bento.webp',
  '/assets/ui/thumb_puzzle.webp',
  '/assets/ui/thumb_wordmatch.webp',
  '/assets/ui/thumb_starparodier.webp',
  '/assets/ui/thumb_maze.webp',
  '/assets/ui/thumb_kitchen.webp',
];
const CRITICAL_ASSETS_CARDS = [
  '/assets/ui/menu_card_base_01.webp',
  '/assets/ui/menu_card_base_02.webp',
  '/assets/ui/menu_card_base_03.webp',
  '/assets/ui/menu_card_base_04.webp',
  '/assets/ui/menu_card_paper_mask_01.png',
  '/assets/ui/menu_card_paper_mask_02.png',
  '/assets/ui/menu_card_paper_mask_03.png',
  '/assets/ui/menu_card_paper_mask_04.png',
  '/assets/ui/menu_card_coming_soon_banner_20260708.webp',
];

// precache をグループに分割: 1 グループ全失敗しても他は通る (allSettled)。
const CRITICAL_ASSET_GROUPS = [
  CRITICAL_ASSETS_SCRIPTS,
  CRITICAL_ASSETS_THUMBS,
  CRITICAL_ASSETS_CARDS,
  CRITICAL_ASSETS_IMAGES,
];

// 直前世代の cache (pono-v<NUM> 降順の先頭) を開く。 activate は「最新1世代だけ残す」
// 運用なので、 install 時点 (activate 前 = 削除前) では前世代がまず存在する。 無ければ null。
function openPreviousCache() {
  return caches.keys().then(keys => {
    const ponoKeys = keys.filter(k => k.startsWith('pono-v') && k !== CACHE_NAME);
    ponoKeys.sort((a, b) => {
      const na = parseInt(a.replace(/^pono-v/, ''), 10) || 0;
      const nb = parseInt(b.replace(/^pono-v/, ''), 10) || 0;
      return nb - na;
    });
    return ponoKeys.length ? caches.open(ponoKeys[0]) : null;
  }).catch(() => null);
}

// 個別 asset の失敗で install が落ちないように、 asset 単位の try/catch でラップする。
function precacheAssetGroup(cache, urls, prevCache) {
  return Promise.allSettled(
    urls.map(async url => {
      // copy-forward: 前世代 cache に同一 URL があれば先に新 cache へ複製しておく。
      // network 検証が失敗しても warm な状態を維持でき、 再ダウンロード嵐を防ぐ。
      try {
        if (prevCache) {
          const prev = await prevCache.match(url);
          if (prev) await cache.put(url, prev);
        }
      } catch (e) {}
      try {
        // cache: 'no-cache' = ブラウザ HTTP cache の ETag 再検証 (304 なら body 転送なし)。
        // 旧 'reload' は HTTP cache 完全バイパスで、 CACHE_VERSION bump のたびに
        // 全 precache (~10MB) を再ダウンロードしていた (2026-07-10 修正)。
        // 検証済みレスポンスで copy-forward 分を上書きするので鮮度は従来同等。
        const response = await fetch(new Request(url, { cache: 'no-cache' }));
        if (!response || !response.ok) {
          throw new Error('precache fetch failed: ' + url + ' status=' + (response && response.status));
        }
        await cache.put(url, response);
      } catch (err) {
        // install 全体は失敗させない。 個別 asset の失敗は WARN レベルで握りつぶす。
        try { console.warn('[sw] precache skip', url, err && err.message); } catch (e) {}
      }
    })
  );
}

self.addEventListener('install', event => {
  // 開いているゲームへ新しいSWを即時適用すると、controllerchange経由で
  // ページがリロードされ、ゲームがタイトル状態へ戻ってしまう。
  // 待機状態にして、次回起動/遷移時に自然に切り替える。
  //
  // ただし precache は install 中に行い、 ファーストビュー資産だけは新版 SW でも
  // 即座に提供できるようにする (cold start 解消)。
  // copy-forward 用の前世代 cache は activate の削除前 (= install 中) に開いておく。
  event.waitUntil(
    Promise.all([caches.open(CACHE_NAME), openPreviousCache()]).then(([cache, prevCache]) =>
      Promise.allSettled(
        CRITICAL_ASSET_GROUPS.map(group => precacheAssetGroup(cache, group, prevCache))
      )
    ).catch(err => {
      try { console.warn('[sw] precache open failed', err && err.message); } catch (e) {}
    })
  );
});

// ── Legacy skip-waiting message hook (v1137-) ──
// 現行の common/sw-update.js は更新待ちUIを出さず、次回起動/遷移で自然に
// 切り替える。既に開いている旧ページからのメッセージだけ後方互換で受ける。
self.addEventListener('message', event => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  // 旧キャッシュは「最新1世代だけ残す」 warm migration 方式に変更 (旧: 全削除)。
  // - 既存クライアントは claim せず、プレイ中のページを中断しない。
  // - 新 SW activate 直後、 旧 SW (1世代前) の cache を即削除すると
  //   再 fetch 嵐になる (cold start)。 旧版を 1 世代残しておけば、
  //   キャッシュ突合せ目的で再利用できる + image cache-first の hit 確率も上がる。
  // - 'pono-v' で始まる cache のうち、 現行 CACHE_NAME 以外を新しい順に並べて
  //   最新1件(=1世代前)だけ残し、 それ以前を削除する。
  event.waitUntil(
    caches.keys().then(keys => {
      const ponoKeys = keys.filter(k => k.startsWith('pono-v') && k !== CACHE_NAME);
      // pono-v<NUM> の NUM 降順 (= 新しい順) でソートし、 先頭 (= 1世代前) は残す。
      ponoKeys.sort((a, b) => {
        const na = parseInt(a.replace(/^pono-v/, ''), 10) || 0;
        const nb = parseInt(b.replace(/^pono-v/, ''), 10) || 0;
        return nb - na;
      });
      const toDelete = ponoKeys.slice(1); // 2世代以上前のみ削除
      return Promise.all(toDelete.map(k => caches.delete(k)));
    })
  );
});

// Range リクエストへ cache 済みの完全 (200) レスポンスから 206 を組み立てて返す。
// iOS Safari は media 要素の Range 要求に 200 full body を返すと再生に失敗することが
// あるため、 動画/音声の cache-first 化 (2026-07-10) とセットで必須。
// Range ヘッダが無い場合・response が 200 full でない場合はそのまま返す。
function sliceRangeResponse(request, response) {
  if (!response || response.status !== 200) return Promise.resolve(response);
  const rangeHeader = (request.headers && request.headers.get('range')) || '';
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!m || (m[1] === '' && m[2] === '')) return Promise.resolve(response);
  return response.arrayBuffer().then(buf => {
    const total = buf.byteLength;
    let start;
    let end;
    if (m[1] === '') {
      // suffix range: bytes=-N (末尾 N バイト)
      start = Math.max(0, total - parseInt(m[2], 10));
      end = total - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] === '' ? total - 1 : Math.min(parseInt(m[2], 10), total - 1);
    }
    if (start >= total || start > end) {
      return new Response(null, {
        status: 416,
        statusText: 'Range Not Satisfiable',
        headers: { 'Content-Range': 'bytes */' + total }
      });
    }
    const sliced = buf.slice(start, end + 1);
    return new Response(sliced, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
        'Content-Length': String(sliced.byteLength)
      }
    });
  });
}

// Network-first strategy: try network, fall back to cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // 管理ツール（tools/, admin/, room pivots, /api/ 系）は SW 介在なしでブラウザに直接通す。
  // Basic Auth の 401 チャレンジ時にポップアップが正しく出るようにするため。
  // respondWith を呼ばない = デフォルトのネットワーク取得 + ブラウザ側のダイアログ処理が有効。
  if (event.request.url.includes('/admin/')
      || event.request.url.includes('/tools/')
      || event.request.url.includes('/room/furniture_adjuster')
      || event.request.url.includes('/room/yard_adjuster')
      || event.request.url.includes('/api/gh/')
      || event.request.url.includes('/api/gemini/')) {
    return;
  }

  // ナビゲーション系リクエスト (navigate / document / Accept: text/html) は
  // SW で intercept しない。ブラウザのネイティブな navigation と 307 redirect
  // follow に完全に任せる。
  //
  // 過去に v1190 で redirect:'manual' + Response.redirect(opaqueredirect) 戦略を
  // 試したが、 Fetch 仕様で opaqueredirect の response.url は空文字になるため、
  // フォールバックの event.request.url (= /play.html) に 302 を返してしまい、
  // ブラウザが同じ /play.html を再 fetch → 同じ 302 → 無限ループ
  // → ERR_TOO_MANY_REDIRECTS で両 staging が死亡。
  //
  // オフライン navigation フォールバックは失われるが、致命バグを取る方が優先。
  const isHTML = event.request.destination === 'document'
    || event.request.headers.get('accept')?.includes('text/html');
  if (isHTML) {
    return;
  }

  // batch:1371c の家具24品48点だけは、items.js のURLを維持したままSW内部の
  // synthetic queryを新cache keyとして使う。items.jsを参照する調整・報酬ツールの
  // `_A.png` / `_B.png` 末尾判定を壊さず、旧世代cacheの同名画像も拾わない。
  // synthetic keyが無い初回だけ元URLをno-storeで取得し、通信失敗時のみ旧cacheへ退避する。
  if (event.request.destination === 'image'
      && ROOM_FURNITURE_CACHE_REFRESH_PATHS.has(new URL(event.request.url).pathname)) {
    const versionedUrl = new URL(event.request.url);
    versionedUrl.searchParams.set('__pono_asset', ROOM_FURNITURE_CACHE_REFRESH_TOKEN);
    const versionedKey = new Request(versionedUrl.toString());
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(versionedKey).then(currentCached => {
          if (currentCached) return currentCached;
          return fetch(event.request, { cache: 'no-store' })
            .then(async response => {
              if (!response || !response.ok) {
                throw new Error('room furniture refresh failed: ' + (response ? response.status : 'no response'));
              }
              try {
                await cache.put(versionedKey, response.clone());
              } catch (cacheError) {
                try {
                  console.warn('[sw] room furniture refresh cache put failed', cacheError && cacheError.message);
                } catch (e) {}
              }
              return response;
            })
            .catch(networkError =>
              caches.match(versionedKey).then(previousCached => {
                if (previousCached) return previousCached;
                return caches.match(event.request).then(originalCached => {
                  if (originalCached) return originalCached;
                  throw networkError;
                });
              })
            );
        })
      )
    );
    return;
  }

  // 画像は cache-first 戦略 (旧: 常に network no-store)。
  // 理由: SW 更新のたびにすべての画像が完全コールドスタートしていた問題を解消し、
  // 同一ページ内・同一セッションでの重複参照を CF エッジへ往復させない。
  //
  // cache key は query 込みの完全 URL。 差し替え時の cache-bust 規約:
  //   - 正本は ?v=<timestamp> (例: ?v=1693, ?v=20260627)
  //   - 既存実装の互換で ?t=<timestamp> (tools/maze-editor.html) も同じ扱い
  //   - 値を更新すれば別 key = 必ず network 取得になるため、 強制更新はそのまま機能する
  //   - 旧実装は ?v=/?t= 付きを毎回 cache:'no-store' で再取得していたが、 固定値の
  //     ?v=N は URL ごと一意な key なので、 ページ表示のたびに bento ~4.2MB /
  //     maze ~5MB を再ダウンロードするだけの無駄だった (2026-07-10 に cache-first へ統一)
  // ⚠️ 同名ファイルの上書きは NG (Same-URL Same-Filename Overwrite Risk):
  //   menu_card_base_01.webp などをそのまま上書き push すると、 cache-first 戦略下では
  //   旧 client は旧画像を引き続ける。 CACHE_VERSION bump も即効性はない: activate は
  //   1 世代前 cache を残し (warm migration)、 caches.match は古い cache から順に探す
  //   ため、 同一 URL の旧エントリは bump 1 回を生き延びる (完全退役は 2 bump 後)。
  //   画像更新は必ず (a) 新ファイル名 か (b) ?v=<ts> の値更新 を伴うこと (= 別 cache
  //   key になり確実に network 取得)。 詳細は AGENTS.md / CLAUDE.md のデプロイ規約参照。
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // 動画 (宝箱・ハリネズミ等) と BGM / storyboard 音声は cache-first (旧: 毎回 network
  // no-store)。 旧実装は 4-5MB の mp4 / BGM mp3 を再生のたびに全量再ダウンロードして
  // いた (2026-07-10 修正)。
  // - cache key は query 込みの完全 URL。 差し替え時は画像と同じく (a) 新ファイル名 /
  //   (b) ?v=<ts> の値更新 のどちらかで強制更新する (CACHE_VERSION bump は 1 世代残しの
  //   ため即効性なし。 上記画像の Same-URL Same-Filename Overwrite Risk 参照)。
  // - media 要素は Range リクエストを送る (206 は cache.put 不可 + iOS Safari は 206
  //   応答必須)。 URL 文字列で fetch して Range ヘッダを外した完全な 200 を取得・保存し、
  //   応答時に sliceRangeResponse で必要なら 206 に切り出して返す。
  if (event.request.destination === 'video'
      || event.request.url.includes('/assets/videos/')
      || event.request.url.includes('/assets/audio/bgm/')
      || event.request.url.includes('/assets/audio/stickerbook/bgm/')
      || event.request.url.includes('/assets/audio/storyboard/')) {
    const mediaUrl = event.request.url;
    event.respondWith(
      caches.match(mediaUrl).then(cached => {
        if (cached) return sliceRangeResponse(event.request, cached);
        return fetch(mediaUrl)
          .then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(mediaUrl, clone))
                .catch(() => {});
            }
            return sliceRangeResponse(event.request, response);
          })
          .catch(() => caches.match(mediaUrl).then(fallback =>
            fallback ? sliceRangeResponse(event.request, fallback) : fallback
          ));
      })
    );
    return;
  }

  // items.js / rewards.json / tts manifest はデプロイ直後に即反映させたいので HTTP
  // キャッシュも無効化。 cache:'no-store' で毎回ネットワーク取得、 SW キャッシュだけ
  // 更新してオフライン用に保持 (2026-04-21)。
  if (event.request.url.includes('/room/items.js')
      || event.request.url.includes('/assets/data/rewards.json')
      || event.request.url.includes('/assets/tts/manifest.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // StickerBookThreeJS はプロトタイプ調整頻度が高く、古い main.js/CSS/JSON が残ると
  // 図鑑だけ空表示になるなどの検証事故につながるため、常にネットワーク優先で取り直す。
  if (event.request.url.includes('/Prototypes/StickerBookThreeJS/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // その他のアセット類は network-first + cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
