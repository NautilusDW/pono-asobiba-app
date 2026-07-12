// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting
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
const CACHE_VERSION = 2150;
const CACHE_NAME = 'pono-v' + CACHE_VERSION;
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
  '/common/acorn-modal-shared.css',
  '/common/acorn-modal.js',
  '/common/acorn-audio.js',
  '/common/acorn-copy.json',
  // v1718: ごかんそう (rating) — 別エージェント並列作成中。 未配備でも precache は asset 単位
  // try/catch でラップされる (precacheAssetGroup の allSettled gate) ため install 失敗にならない。
  '/common/rating-modal.js',
  '/common/rating-modal.css',
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
