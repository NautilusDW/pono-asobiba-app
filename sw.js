// Service Worker for ポノのあそびば PWA
// Network-first + version-based cache busting
// v1866: Bento どんぐり獲得モーダル文言を中立化し、完成結果画面の弁当表示を拡大 (batch:1013)。play.html PAGE_CACHE_VERSION と同期。
// v1865: シール帳で透明余白を除外して貼りサイズ/選択枠を一致させ、貼り付け影メッシュを一旦撤去 (batch:1012)。play.html PAGE_CACHE_VERSION と同期。
// v1864: Bento したにしくモードで既存おかず/カップを非表示ではなく薄表示に変更し、どんぐり獲得モーダルの自動閉じを停止 (batch:1011)。play.html PAGE_CACHE_VERSION と同期。
// v1863: シール帳の貼り付けサイズを大きめに統一し、ドラッグ中ゴースト・透明抜け・上下めくれ・裏面表示を改善 (batch:1009)。play.html PAGE_CACHE_VERSION と同期。
// v1862: Bento じぶんでつくるで、色違い箱選択時の実配置/スケール/小おかず数が canonical の水色側 slotLayout を読まず初期配置へ戻る問題を修正 (batch:1010)。play.html PAGE_CACHE_VERSION と同期。
// v1861: Bento 完成画面のお気に入りボタンを下げ、色違い箱の slotLayout を水色側へ正規化し、タコウインナー2本セットの右側を下レイヤーに変更 (batch:1008)。play.html PAGE_CACHE_VERSION と同期。
// v1860: えほん特典シール6枚を追加し、book解放時の自動付与とStickerBookThreeJSのPlaneGeometry頂点曲げ「ペタッ」演出を実装 (batch:1007)。play.html PAGE_CACHE_VERSION と同期。
// v1859: Bento 管理画面のおかず配置エディタで、押す丸の表示/編集先を本体ゲームの同番号 cup 優先ロジックへ統一し、普通箱以外で管理側だけ自動配置へ戻る問題を修正 (batch:1006)。play.html PAGE_CACHE_VERSION と同期。
// v1858: どんぐり獲得モーダルに不透明のクリーム色テキストボックスを追加し、背景透けで本文が読みづらい問題を修正 (batch:1005)。play.html PAGE_CACHE_VERSION と同期。
// v1857: Bento じぶんでつくるで、ピックモードを追加。自動配置後のピックを手動で動かせるようにし、手動ピックは再スナップしない (batch:1004)。play.html PAGE_CACHE_VERSION と同期。
// v1856: Bento じぶんでつくるで、ピックを常に最前面レイヤーに固定。仕切りは移動先スロットの縦横に合わせて横/縦タイプへ自動変換 (batch:1002)。play.html PAGE_CACHE_VERSION と同期。
// v1855: Bento じぶんでつくるで、ピックをおかず位置/サイズから自動配置して最大3本まで対応。仕切りはしきりモード中だけ選択/移動/削除できるよう分離 (batch:997)。play.html PAGE_CACHE_VERSION と同期。
// v1854: Bento じぶんでつくるで、Side工程の初期タブをカップにし、押す丸の表示位置を cup marker 優先に統一。箱変更時は旧おかずを残さずごはん工程から再開 (batch:996)。play.html PAGE_CACHE_VERSION と同期。
// v1853: Bento じぶんでつくるで、普通のお弁当のカップ押す丸が side-food の古い marker を優先していた問題と、仕切りの非 positionOverride sample x/y が猫箱の位置を飛ばす問題を修正 (batch:995)。play.html PAGE_CACHE_VERSION と同期。
// v1852: Bento じぶんでつくるで、猫箱などに直接保存済みの押す丸/仕切り位置をクマ基準の継承値で上書きしないよう修正 (batch:994)。play.html PAGE_CACHE_VERSION と同期。
// v1851: Bento じぶんでつくるで、押す丸/仕切りの箱別参照配置を本体側にも反映し、小おかず数を超えるカップ配置と満杯時の自動置き換えを停止 (batch:992)。play.html PAGE_CACHE_VERSION と同期。
// v1850: Bento じぶんでつくるの「したにしく」キャベツ/レタスを最大5個まで配置可能に変更 (batch:990)。play.html PAGE_CACHE_VERSION と同期。
// v1849: Bento じぶんでつくるで、スロット再配置時に箱 globalScale が二重適用されてゲーム側のおかずが管理プレビューより大きくなる問題を修正 (batch:989)。play.html PAGE_CACHE_VERSION と同期。
// v1848: Bento じぶんでつくるのカップ番号丸を、実配置ではなく同番号の押す丸表示座標へ揃える (batch:988)。play.html PAGE_CACHE_VERSION と同期。
// v1847: Bento じぶんでつくるで、管理画面の cup/slot 変更後に既存配置済みのおかず/カップも現在の固定スロットへ再スナップ (batch:987)。play.html PAGE_CACHE_VERSION と同期。
// v1846: Bento じぶんでつくるのカップ配置で、side-food 側の表示ターゲットへ上書きせず管理画面の cup 座標をそのまま反映 (batch:986)。play.html PAGE_CACHE_VERSION と同期。
// v1845: Bento 管理画面のおかず配置エディタに果物サンプルを追加し、キャラ箱は水色クマ/水色ネコだけ表示。水色ネコと同形箱の配置は水色クマ基準へ寄せる (batch:985)。play.html PAGE_CACHE_VERSION と同期。
// v1844: Bento じぶんでつくるに、とりけす/やりなおし履歴ボタンを追加 (batch:983)。play.html PAGE_CACHE_VERSION と同期。
// v1843: Bento 管理画面の敷き野菜を位置スロットA-Fではなくキャベツ/レタス別サイズ調整1枠へ整理 (batch:982)。play.html PAGE_CACHE_VERSION と同期。
// v1842: Bento 管理画面のおかず配置保存時に、丸箱以降の古い raw 座標を通常箱基準の初期配置へ materialize してサーバー値も更新 (batch:981)。play.html PAGE_CACHE_VERSION と同期。
// v1841: Bento 丸/キャラ箱など普通箱以外の未調整配置を、普通箱の現在位置から内側マスク比率で投影 (batch:980)。play.html PAGE_CACHE_VERSION と同期。
// v1840: Bento おかず配置の初期値を、主菜はハンバーグ位置、 小さいおかずは同番号カップ中心を基準に解決 (batch:979)。play.html PAGE_CACHE_VERSION と同期。
// v1839: Bento 管理画面のおかず配置エディタで、タコウインナーのサンプルを本体と同じ2本セット表示へ同期 (batch:978)。play.html PAGE_CACHE_VERSION と同期。
// v1838: Bento 管理画面のおかず配置エディタに箱ごとの全体スケールを追加し、かんたん配置の主菜/副菜/カップ/敷き野菜/仕切り/ピックへ個別サイズ×箱倍率で反映 (batch:977)。play.html PAGE_CACHE_VERSION と同期。
// v1837: Bento じぶんでつくるで、おかずメニューの表示順を 肉→野菜→果物 に整理 (batch:976)。play.html PAGE_CACHE_VERSION と同期。
// v1836: Bento じぶんでつくるで、ドラッグ入れ替え後の一瞬戻り抑制、右パネル省スペース化、かざりタブ復帰、葉っぱを評価対象外化、古い素材除外、果物ID追加、タコウインナー2個セット化 (batch:975)。play.html PAGE_CACHE_VERSION と同期。
// v1835: Bento じぶんでつくるで、メイン/小おかずが欠けたまま完成できないようにし、番号指定カップ配置・カップ入れ替え判定・したにしく自由編集モードを修正 (batch:974)。play.html PAGE_CACHE_VERSION と同期。
// v1834: Bento じぶんでつくるで、カップ内おかずを掴んでも親カップをドラッグして入れ替え可能にし、横/縦仕切りは保存時の向きに合うスロットを優先。横仕切りも sampleId 付きで保存サイズを拾い、初回タップ空振り/小さすぎる仕切りを修正 (batch:973)。play.html PAGE_CACHE_VERSION と同期。
// v1833: Bento じぶんでつくるで、配置済み小おかず/カップの上に出ていた「カ」/番号丸を非表示化し、空き枠だけ表示。配置済みアイテムのドラッグ&ドロップで同番号スロットを入れ替え可能にし、縦仕切りが別サンプルの保存サイズを引き継いで巨大化する問題も修正 (batch:972)。play.html PAGE_CACHE_VERSION と同期。
// v1832: Bento じぶんでつくるで、同じ番号に直置きおかずがある場合は後続カップ配置の空き候補から除外 (batch:971)。直置きおかずをカップで上書きせず、カップタブでも埋まりとして表示する。play.html PAGE_CACHE_VERSION と同期。
// v1831: Bento じぶんでつくるのカップ配置番号を side-food の見えている 1〜4 と同じ順番に統一 (batch:970)。cup 側の保存配列順が別でも、1=左下 / 2=右下 / 3=左上 / 4=右上 の番号どおりに配置される。play.html PAGE_CACHE_VERSION と同期。
// v1830: Bento じぶんでつくるの小さいおかず/カップ選択丸を、実配置と食い違わないよう再修正 (batch:969)。空き丸は設定された押す丸座標、配置済みの「カ」/番号丸はクランプ後の実アイテム座標へ追従し、投入時も押す丸座標を起点にする。play.html PAGE_CACHE_VERSION と同期。
// v1829: quizland 「保存しても消える」 問題の真の根本修正 + frozen layer 導入 (batch:968) — (1) common/layout/layout-editor.js snapshot() 内 line 660 の base-key skip ロジックを削除し、 🌐 モード編集時の snapshot 欠落 → deepMergeForSave での編集消失パスを完全に塞ぐ、 (2) localStorage cache TTL 10→2 分 (quizland _qzPickFreshLayoutData + layout-editor pickFreshestData) に短縮、 (3) saved-layout-frozen.json (新規 read-only 並列層) + editor 「🔒 このレイアウトをロック」 button 追加で重要 layout は per-Q キーを frozen.json に転記して永続化保証。 frozen は applier 側 beforeApply で base layer の上に優先 merge。 play.html PAGE_CACHE_VERSION と同期。

// v1828: Bento じぶんでつくる food タブで、カップ済みスロットの「カ」丸が cup 用押す丸座標へジャンプして数字丸の指定位置からずれる問題を修正。food タブではカップ済みでも同じ side-food 表示座標を使う (batch:968)。play.html PAGE_CACHE_VERSION と同期。
// v1827: quizland editor 個別 resize で .q-text-card .audio (右上スピーカー) を巻き込まない真の修正 (batch:966) — common/layout/layout-editor.js: findLinkedTargets で取得した linkedTargets 配列を GROUP_SCALE_PROTECTED_SELECTORS でフィルタし、 個別 resize 経路でも speaker を hard skip。 さらに primary と contains 関係 (祖先・子孫) にある要素も除外して .q-text-card 親自体が巻き込まれる経路も封じる。 batch:964 (group corner scale 用) と組合せて全 resize 経路で speaker を保護。 play.html PAGE_CACHE_VERSION と同期。
// v1826: Bento 管理画面のおかず配置エディタ「押す丸だけ」で、丸を固定カップサイズ相当の大きな半透明円にして、近づけ具合を見ながら調整できるようにする (batch:967)。play.html PAGE_CACHE_VERSION と同期。
// v1825: Bento 管理画面のおかず配置エディタに「押す丸だけ」プレビューを追加。食材画像と通常配置マーカーを隠し、現在の小さいおかず/カップの押す丸だけを見ながら調整できるようにする (batch:966)。play.html PAGE_CACHE_VERSION と同期。
// v1824: quizland group corner scale で .q-text-card .audio (右上スピーカー) を巻き込まない (batch:964) — selector exclusion で scale factor 適用対象から除外、 親 .q-text-card だけ resize される。 batch:962 の counter-transform hook と組合せて UI 巻き込み問題を完全解消。 play.html PAGE_CACHE_VERSION と同期。
// v1823: Bento 管理画面のおかず配置エディタで「押す丸」を初期選択から押しても、小さいおかずAへ自動切替して丸編集モードを有効化する (batch:965)。play.html PAGE_CACHE_VERSION と同期。
// v1822: quizland レイアウト保存→デフォルト回帰の根本修正 (batch:962) — common/layout/layout-editor.js: ★1 per-Q toggle 状態を localStorage 永続化 (key qz-layout-editor-per-q-scope-v1) / ★2 save 時 toggle/per-Q 不整合 confirm guard / ★4 GH PUT 前 deepMergeForSave で同時編集 conflict 可視化 / ★5 per-Q キー欠損時に toggle button title へ情報ヒント。 quizland/index.html: .q-text-card .audio に CSS 変数 --qz-tts-counter-scale (default 1) hook 追加 (group corner scale 巻き込み対策の receiver、 trigger は batch:963 で実装予定)。 play.html PAGE_CACHE_VERSION と同期。
// v1821: quizland Q113 (weather_lv1_004 虹) を Q119 と同じ stage_weather_rainbow_arc.png に差し替え (batch:961) — emoji_name → trivia + framed:true。play.html PAGE_CACHE_VERSION と同期。
// v1820: Bento 小おかず/カップ配置丸 (batch:960) — 管理ツールの実配置座標とは別に、ゲーム画面の選択丸だけ見た目用2x2グリッドへ分離。クリック後の実配置は従来どおり side-food / cup スロットを参照。play.html PAGE_CACHE_VERSION と同期。
// v1819: quizland Q113 関連 batch:944/945/946 のみを surgical revert (batch:948) — 直前 batch:947 (revert workflow) が他バッチの 13 エントリも巻き添えで消した分はバックアップから復元。私の誤 qid 修正だけを綺麗に巻き戻し。play.html PAGE_CACHE_VERSION と同期。
// v1817: Q113 を真の qid weather_lv1_004 に修正 (batch:946) — 直前バッチ944/945 は誤 qid で空振り。stale エントリ削除 + 正しいエントリ追加。
// v1812: Bento カップ修正 (batch:958) — カップ枠を4つに拡張、カップ内は1品入れ替え式に変更、配置先パネルを横スクロールの省スペースUIへ変更。play.html PAGE_CACHE_VERSION と同期。
// v1809: Bento 図配置/仕切りサイズ修正 (batch:957) — 小おかず配置図を実スロット座標で表示し、管理プレビューのドラッグ中心飛びと仕切りサンプル別サイズ反映を修正。 play.html PAGE_CACHE_VERSION と同期。
// v1808: じゃんけん リズム修正 — 「ジャン、 ケン、 ポン」 を 1 ショット連続発話で切出し統一 (batch:925)。 maze/janken の start.mp3 と call_jan/ken/pon.mp3 を Aoede 統一 take から再生成。 三拍子 (514/352/337ms) で日本のじゃんけんリズムを再現。 play.html PAGE_CACHE_VERSION と同期。
// v1807: Bento カップ配置UI調整 (batch:956) — プチトマト2個セットの間隔を詰め、カップ/そのまま配置パネルを文字中心からミニ弁当図 + カップ絵ボタンへ変更。
// v1806: Bento かんたん配置修正 (batch:955) — カップを小サイズ固定、プチトマトをカップ内2個セット、カップ/しきり/したにしくタブ分離、カップなし小おかず A-D 配置先指定、敷き野菜/仕切り/ピックのサンプルサイズ共有を追加。
// v1804: 音タッチ 8件まとめ修正 + perf 3件 (batch:940) — Pono sprite endsWith / mobile perspective 1200-1800px / tutorial pagehide cleanup / 「あとで」匿名保存 / silent catch→console.warn / star.repeat → table / mode 切替で _clearTriggered reset / 'ended' listener once:true / dance Image pool / songBtns querySelector cache / diff tab debounce。play.html PAGE_CACHE_VERSION と同期。
// v1803: Bento 仕切りGを追加の縦仕切り枠として扱う。Admin 既定DGを縦画像へ変更し、本体の縦仕切り優先順を A→C→E→G に修正。旧保存の G=横仕切りも縦仕切りへ正規化。
// v1802: Bento 仕切りだけ A〜G の7枠へ拡張。縦仕切り3枠 + 通常仕切り4枠を同時に使えるようにする。
// v1801: Bento 縦仕切り低リボン assets 6枚追加 + 管理エディター/本体の縦仕切り選択肢と列優先配置を追加。
// v1800: maze 監査 fix 2件 (batch:939) — クリア後 2.2s 遅延→ 並行起動 + pointer-events ガード / grid-stage dead code クリーンアップ。play.html PAGE_CACHE_VERSION と同期 (was sw v1799 / play v1798 diverged, this batch realigns both)。
// v1799: Bento 小さいおかずD選択維持 + キャベツ/レタスを自由な葉物枠へ分離 + 仕切り/葉物を2列×3段の6枠化。
// v1798: Maze janken player-win rescue logic, no cumulative chance drift, and hand-art choices.
// v1797: 旗あげ 6 voice 1 ショット連続生成 (Aoede 統一 リズム/テンション完全統一) + janken×8 + strength_push 4 + kumo 2 + audit-regen 13 (truefalse/simon/silhouette/oddone を Gemini 2.5 fallback/Higgsfield から 3.1 Aoede に再生成) = 計 33 voice 追加/上書き → 全 49 voice が Gemini 3.1 Aoede 統一 (batch:922/923)。 maze/index.html `_MAZE_VOICE_BUNDLED` whitelist を janken/strength_push/kumo 全 key 対応に拡張。 play.html PAGE_CACHE_VERSION と同期。
// v1795: えほんの あいことば モーダル (#passwordUnlockModal) の .password-modal-inner で max-height 66%→80% + overflow-y: auto を追加。 クイズタブの content が下端で見切れる bug を修正。 スクロールバーは subtle (thin + cream tone)。 play.html PAGE_CACHE_VERSION と同期。
// v1793: bento 監査 fix 3件 (batch:937) — pointercancel追加 / completeChromeSafeArea debounce / 「あとで いれよう」変数化。play.html PAGE_CACHE_VERSION と同期。
// v1792: quizland 監査 fix 6 件 (batch:936) — 不正解チップ複数赤クリア / 答え中ナレ停止 / キーボード対応 / ロック視覚FB / TTS 4→7s / ロック理由表示 + 軽量化。play.html PAGE_CACHE_VERSION と同期。
// v1791: 音タッチ モード選択画面の iPhone 17 portrait (393x852) layout 修正 (batch:942-oto-mode-select-title-overlap-iphone17)。 「あそびかたを えらぼう」 画面でロゴが下落して 「リズム ストーリーモード」 ボタンに被る問題を修正。 新規 `@media (max-width: 480px) and (orientation: portrait)` ブロックを追加し (1) `.intro__content { top: 16%; transform: translateY(0); width: min(62vw, 360px) }` でロゴを上部に固定 (2) `.start-mode-choice { padding-top: 6vh; align-items: flex-start }` で panel を上端 anchor (3) `.start-mode-panel { margin-top: clamp(180px, 36vh, 340px); transform: none }` で見出し + ボタンを下に押し下げ。 iPhone 17 で logo 中心 ~111px / panel 上端 ~358px / clear gap ~197px、 desktop/tablet/landscape は無改造。 play.html PAGE_CACHE_VERSION と同期。
// v1790: 音タッチの開始演出で、ライバル退場中に左下へ一瞬出ていた黄色い炎エフェクトを非表示化。play.html PAGE_CACHE_VERSION と同期。
// v1789: 音タッチ最終ステージを 1 オクターブ超の「おおきな ふるどけい」から、C〜G の5音に収まる「せいじゃの こうしん」へ差し替え。低音オクターブの見た目/実音分離を最終曲で使わない構成に変更。play.html PAGE_CACHE_VERSION と同期。
// v1788: 音タッチ最終ステージ「おおきな ふるどけい」のリズム再修正。弱起 pickupBeats を追加し、1音目を小節頭の手前へ同期。譜面の詰まりすぎていた拍を四分/二分中心へ戻し、カウントダウン overlay 消去で開始タイマーを消さないよう修正。play.html PAGE_CACHE_VERSION と同期。
// v1787: 謎々NA 7セリフ差し替え/追加 (weather_puddle あめのとき q121_a + opposite_suki よい q139_b + shape_name:22 ノート問題 5本 q182_q/a/b/c/d)。manifest.json に shape_name:22 の 5 エントリを追加。
// v1786: 音タッチ最終ステージ「おおきな ふるどけい」の譜面を低いソ/ラ/シ対応へ修正。見た目のレーンと実際の音高を分離し、冒頭の低いソ→ドと終止の低いシ→ドが逆オクターブで鳴る事故を防止。play.html PAGE_CACHE_VERSION と同期。
// v1785: ガチャ iPhone 対応。案内枠/追加ターン吹き出しの透明PNGを alpha-bleed 版へ差し替え、透明RGB黒由来の黒矩形を防止。ガチャ画面は locked/used 表示でも bed loop を開始し、可視復帰/次タップで再開を試す。play.html PAGE_CACHE_VERSION と同期。
// v1783: 音タッチ 2 件再修正 (batch:931-oto-tutorial-bgm-stage-bubble-sound)。 (1) チュートリアル BGM 再修正 (v1781 不発の根本原因) — v1781 で blur handler に `_otoTutorialState` ガード追加したが、 `showTutorial()` 内で `_otoTutorialState = {...}` 代入が `_showOtoTutorialBlackCover()` / `body.classList.add('oto-tutorial-open')` の DOM 操作 後に位置していたため、 DOM 変更で発生する偽 blur が `_otoTutorialState` 未代入の時点で hit して `_otoWindowInactive=true` になり、 後の `_startOtoTutorialBgm()` が `_otoAudioShouldBlock()` 早期 return で永久に開始しなかった。 修正: 関数冒頭で `_otoWindowInactive=false` リセット + `_otoTutorialState` 代入を DOM 操作前に移動 (`_finishOtoTutorial(false)` の後 / cleanup の正しさは保持)。 (2) ライバル発話中のステージタップで random C-scale 音が鳴る漏れを修正 — `_stageEl.addEventListener('pointerdown', ...)` が `_rhythm.demoActive` のみゲート、 `spawnBubbleAt()` → `playSetSoundFor()` で random idx の音が鳴っていた。 CSS `body.rhythm-opening-active|settle #stage { pointer-events: none !important }` 追加 + JS gate を `openingActive || openingSettling` 含む形に拡張 (pointerdown + pointermove、 defense in depth)。 dialog overlay は z-index 18 で独立、 SKIP/つぎへ ボタンは影響なし。 (bundled) Codex v1782 — Bento カップ配置 3 スロット復元 + タイトル背景・木枠モードボタン調整。 play.html PAGE_CACHE_VERSION と同期。
// v1782: Bento のカップ配置を「柄は共通・配置は3スロット」に修正。前回の代表1スロット化で保存/本体配置ともカップが1個しか置けなくなっていたため、Admin / Bento runtime / Worker normalize の cup limit を3へ戻し、既存保存が1件だけでも本体側で不足分を箱の既定アクセサリ位置から補完する。タイトル画面は背景オーバーレイを弱め、木枠モードボタンを少し落ち着いた明度へ調整。
// v1781: 音タッチ 3 件まとめ修正 (batch:930-oto-tutorial-bgm-rival-input-clear-modal)。 (1) チュートリアル BGM 不発を修正 — `_playOtoBgm()` の `_otoAudioShouldBlock()` 早期 return が、 DOM 初期化中の偽 `window.blur` で `_otoWindowInactive=true` になり tutorial BGM が永久に開始されない問題を解消。 blur handler に `_otoTutorialState` ガード追加 (v1778 の `_otoAcornModalActive` 同様 pattern)、 本物の app switch は `visibilitychange` 側で拾うため無影響。 (2) ライバル発話中の note 漏れ完全封じ — v1778 で pointerdown のみゲートしたが pointerup/leave/cancel と _stageEl が漏れていた。 CSS で `body.rhythm-opening-active|settle .instr-btn { pointer-events: none !important; opacity: 0.55; filter: saturate(0.7); transition: ... }` を追加して browser-level でイベント遮断 + 視覚 dim 表示 + JS 側にも openingActive/Settling gate を pointerup/leave/cancel に追加 (defense in depth)。 (3) ステージクリアモーダル landscape ≤520px 縦長 overflow — 既存 media query に `.rhythm-complete-actions { gap: 6px; margin-top: 4px; }` + `.rhythm-complete-btn { min-height: 44px; min-width: 110px; padding: 8px 12px; font-size: 0.95rem; }` を追加。 nested scroll は使わず panel 自身の overflow:auto に委ねて primary CTA「つぎのステージ」 が隠れる事故を防止、 min-height 44px は iOS HIG 準拠。 play.html PAGE_CACHE_VERSION と同期。
// v1780: base AcornModal __progress を白 → 焦げ茶 #6d3b07 (cream/maze 等で視認性確保)、 oto override #BEF5FF は維持、 dark panel ゲームは個別 override 追加。
// v1779: oto AcornModal 専用調整 — (1) __progress を白系に (海底ネイビーで視認性確保) (2) panel に大きめ border-radius で角丸化、 他ゲーム焦茶色は base 維持。
// v1778: 音タッチ 4 件まとめ修正 (batch:913-oto-rival-input-block-alps-replace)。 (1) ライバル発話中の note ボタン誤発音封じ — `.rhythm-opening-character` / `::before` / `-fire` が pointer-events:none で grid-row:2 (instr-btn 帯) にタップ抜け穴を作っていた。 instr-btn pointerdown handler を `_rhythm.openingActive || _rhythm.openingSettling || _rhythm.demoActive` でゲート、 setPointerCapture を gate 後に移動して releasePointerCapture も追加し、 音/視覚効果両方を完全抑止。 (2) ハイスコア名前入力モーダル `.rhythm-name-save` / `.rhythm-name-skip` のテキストはみ出し — margin-left 二重カウント解消、 padding を 10/16 → 10/12、 `min-width: 86px` → `max-content`、 `flex-wrap: wrap` 追加、 column mode で `width:100%; align-self:stretch`。 (3) どんぐりモーダルの BGM 停止 + 早すぎる出現 — `_otoAcornModalActive` flag で `window.blur` → `_silenceOtoAudioForInactive` 経路を抑制 (visibilitychange の本来の app 切替は不変)、 `_rhythm.pendingAcornModal` に stash して name-form 「のこす」/「あとで」 押下 400ms 後 (qualifies=true) または 1s 後 (qualifies=false) に `_maybeFireOtoAcornModal()` で fire、 `_hideRhythmComplete` で pendingAcornModal クリア。 common/acorn-modal.js は不変で他ゲーム無影響。 (4) アルプス一万尺 (id: alps, stage 7) を全削除し おおきな ふるどけい (id: oldclock, Henry Clay Work 1876 PD) に入れ替え。 4 sections (14/14/16/14 notes、 indices 0-4 で smooth contour)、 bandSongId 'oldclock104'、 RHYTHM_OPENING_SCENES.oldclock (ビートキング ガオーン 3 lines)、 SONGS array 同名エントリ、 RHYTHM_RIVALS は `'難しい' → hard` 経路で auto-attach。 UX レビュー指摘で section 4 note label を 'もう うごかない' → 'おしまい' に変更 (幼児の勝利時 negative-word 回避)。 play.html PAGE_CACHE_VERSION と同期。
// v1777: 非アクティブ時の音声停止ガード回帰を修正。common/preload-helper.js の PonoVisibilityAudioGuard が inactive 中の HTMLMediaElement.play() を「成功扱いの no-op」にしていたため、一部ゲームが BGM 開始済みと誤認して復帰後も鳴らない問題を、拒否扱いの Promise に変更して既存 retry/catch 経路へ戻した。スマホで blur だけ残るケースは次の pointer/touch/key 操作で focus-inactive を解除し、AudioContext も user gesture 内で resume する。play.html PAGE_CACHE_VERSION と同期。
// v1776: ガチャのスマホ実機でレバー回転中に透明 PNG の filter backing が黒いマスクとして出る再発を修正。phone-sized/short viewport でも gacha status / lever / turn cue / guide hand の CSS filter と lever ready pulse を無効化し、レバーの透明 hitbox を広げて掴みやすくした。play.html PAGE_CACHE_VERSION と同期。
// v1775: 音タッチ どんぐり獲得モーダル コピー差し替え + 進捗カウンター可読性 + 戦闘 bubble word-break (batch:912-acorn-modal-copy-readability)。 (1) common/acorn-copy.json oto > idle > title を「おとが ひびいたよ」 → 「リズム ぴったり！」 に差し替え (リズムゲームの達成感を直接讃える copy)。 (2) common/acorn-modal-shared.css `.pono-acorn-modal__progress` (きょう N/35 カウンター) の color を #6d3b07 (dark brown) → #ffffff、 opacity 0.85 → 1、 text-shadow 0 1px 2px rgba(0,0,0,0.5) 追加。 dark blue 系背景 (oto / starparodier) の不可視問題を解消、 maze の cream parchment 等の light 背景でも shadow で contrast 確保。 perfect-state 上書き (color: #fff7ca) は higher specificity で保たれる。 (3) oto/index.html の `.rhythm-victory-speech` / `.rhythm-special-bubble` / `.rhythm-fever-bubble` / `.tut-bubble` 4 class に `word-break: keep-all` + `overflow-wrap: anywhere` 追加。 v1773 で見落としていた defeat line bubble (「ケロッ... まいったケロ！」 が ケ/ロ で分断) を含む全 speech bubble の CJK 語中改行を停止。 play.html PAGE_CACHE_VERSION と同期。
// v1774: シール帳 `book=boy` の潜水艦表紙を、左バインダー金具を焼き込まないキャラクターなしの GPT Image 2 生成カバーへ差し替え。StickerBookThreeJS の asset query も更新し、play.html PAGE_CACHE_VERSION と同期。
// v1773: 音タッチ チュートリアル cancel 後の story mode 起動修正 + ライバルセリフ改行を文節単位に (batch:908-oto-tutorial-cancel-rival-wrap) + ガチャ スマホ横画面 黒矩形 mask artifact 修正 (batch:909-gacha-mobile-mask-artifact)。 (1) tutorial skip button の pointerdown handler が `_finishOtoTutorial(true, false)` を渡していたため、 `continueFlow=false` 経路で story mode 起動 (`_runOtoTutorialEndFadeToRhythmStart`) も menu 復帰 (`shouldRestoreRhythmMenu`) もスキップされ、 半初期化「自由モード」状態に落ちていた。 `(true, true)` に修正 (normal 完了経路と同一動線)。 (2) `.rhythm-rival-line` / `.rhythm-pono-line` / `.rhythm-opening-line` に `word-break: keep-all` + `overflow-wrap: anywhere` を追加。 dialog source の半角スペース (例 「リズムたいけつなら だれにも まけない！」) を phrase boundary として尊重させ、 CJK 既定の任意位置改行 (「リズ」 + 「ム」 等の語中断ち) を停止。 (3) ガチャ スマホ横画面で透明 PNG レイヤー (status / lever / turn-cue / guide-hand) に CSS `filter: drop-shadow()` が黒矩形 backing として合成される端末向けに、 touch device 限定 (`@media (hover: none) and (pointer: coarse)`) で該当部品の filter を `none !important` 化 + status は `overflow: visible` / `isolation: auto` 復元。 play.html PAGE_CACHE_VERSION と同期。
// v1772: シール帳のデフォルト動線を `book=forest` に変更し、forest 表紙はキャラクターなしの canvas 版を使用。StickerBookThreeJS の表紙開きチュートリアルは、cover open 完了後にレイアウトを安定させてから左ページ直書きテキストを fade-in するよう修正し、`ここを おしてね` try 中は指が上下に動いて対象ボタンを示すようにした。シール選択トレイは下端固定へ戻す。play.html PAGE_CACHE_VERSION と同期。
// v1771: Bento の `じぶんでつくる` を固定スロット配置へ寄せ、スマホではおかず/カップ/かざりを右パネルのタップだけで空き枠に自動配置、満杯時は選択中または古い枠を入れ替えるよう修正。配置済みアイテムのタップは選択のみでドラッグを始めない。Bento 冒頭の開店シーンは初回表示時に背景・店員画像・カウンターマスク背景の準備完了後に同時表示し、キャラ全身が先に出て後から切れる見え方を防止。admin/index.html はサーバー側の管理認証を正として、古いクライアント側の本文書き換えガードを撤去。
// v1770: Bento チュートリアルの旧 3 色説明自動起動を停止し、全工程チュートリアルの「はじめる」押下後だけ sk-intro を表示。sk-intro の「わかった！」は 3 色説明の既読だけ保存し、全工程 tutorial_done は進行完了/停止時だけ保存するよう分離。Bento 右パネルは外枠 overflow hidden + 内側リスト max-height/touch scroll 化し、iPhone 横画面で弁当箱一覧を縦スクロール可能に修正。common/preload-helper.js に PonoVisibilityAudioGuard を追加し、visibilitychange/pagehide/blur/freeze 中は全ゲーム共通で HTMLMediaElement/Audio/AudioContext を停止、Bento は PonoAudioVisibilityStop で BGM とナレーションも停止。preload-helper はゲーム/関連 app HTML で同期読込へ変更し、ゲーム本体初期化より前に音声ガードを入れるよう統一。
// v1768: maze ステージセレクト UI + トグル単体 bypass (batch:890-maze-stage-select-ux)。 manage debug board の「めいろ：全ステージ + どんぐり制限なし」 トグルを ON にしただけで tier check 無視 + どんぐり cap 無効化が有効になるよう、 ?dev=1 の追加要件を廃止 (maze/index.html の _DEV_BYPASS_TIER 計算式、 common/acorns.js の _isDevBypass)。 タイトル画面右下に「ステージセレクト」 ボタン (toggle ON 時のみ display) と modal (1-7 ボタン grid + 背景タップで閉じる) を追加し、 modal からは loadStage(N) で直ジャンプ + OP スキップ。 ?stage=N 直リンクも toggle ON 時のみ尊重するよう _getInitialStageIdx にガードを追加。 common/debug-features.js の description を URL 不要に書き換え。 play.html PAGE_CACHE_VERSION と同期。
// v1767: タイトル画面 16:9/wide の下スクロール矢印が bottom-nav にかぶって半分隠れる問題を修正。`@media (orientation: landscape) and (min-aspect-ratio: 16/10)` で `.scroll-hint--down` を bottom 138px→146px に少し上げ、4:3 の in-flow scroll-hint は既存挙動を維持。play.html PAGE_CACHE_VERSION と同期。
// v1766: Bento 管理画面の NPC/カウンターマスク設定を localStorage 下書き + サーバー正本へ統一。admin の位置/マスクスライダーは操作中に下書き保存し、保存時に `/api/admin/bento-npc-positions` へ NPC 位置 + 店員/お客さんカウンターマスクを同期。Worker の公開 GET `/api/bento/mask-defaults` は `npcPositions` / `staffCounterMask` / `customerCounterMask` を返し、bento/index.html は通常プレイでサーバー値を優先、管理/debug 時のみ localStorage 下書きを上書きとして使う。
// v1765: タイトル画面の「きょうのチャレンジ」Bento 表示を単語境界で改行。decorateGameTitle('bento') に break marker を戻し、daily banner では「ポノとつくろう」直後で 2 行化、通常ゲームカードは nowrap のまま半角スペース表示に維持。上下 scroll-hint の active オレンジを #f0782f + 二段 glow に強化。play.html PAGE_CACHE_VERSION と同期 (1763→1765、sw1764 を内包)。
// v1764: Bento 導入シーンの店員/お客さんカウンターマスク初期値を実画像の前板位置へ合わせ、旧 localStorage デフォルト値は新値へ移行。三色説明終了時に旧/新チュートリアル完了キーを同時に保存して再表示を止め、右パネル選択肢の touch scroll を pan-y に緩和。Bento のどんぐり報酬モーダルは 2.6 秒で自動非表示に戻し、くわしい けっか表示時に残留モーダルを閉じる。
// v1763: bottom-nav「ごかんそう」ボタンの解像感と wide 配置を修正。表示サイズは 114-158px まで拡大されるため、64px PNG を背景に使うと低解像度に見える。1024px 透過中間から 512px 版 `icon_feedback_20260628_512.png` / `_pressed_512.png` を作成し、play.html の .bn-item--feedback 背景を 512px 版へ差し替え。default/wide ではごかんそうを右へ寄せ (left -180→-172 / 16:9 -166→-162)、どんぐり badge は残高桁数で幅が伸びても重ならないよう left 固定から right-edge 固定へ変更。4:3 は見た目を維持しつつ同じ右端固定へ置換。 play.html PAGE_CACHE_VERSION と同期 (1762→1763)。
// v1762: bottom-nav「ごかんそう」 ボタン background-size 130% 130% revert (見切れ事故)。 sw1761 で透過余白を視覚的にトリムする目的で background-size を contain → 130% 130% に変更したが、 ボタン枠 (mask) は元のままなので画像が枠の外で見切れる事故が発生。 contain に戻して sw1760 と同じ表示状態を復元。 width/height/left (3 breakpoint 全て確定) / 画像ファイル / :active 押下挙動 / prefers-reduced-motion 対応は完全無改変。 アイコン本体がやや小さく見える件は画像再生成 (別タスク) で対応する。 play.html PAGE_CACHE_VERSION と同期 (1761→1762)。
// v1761: bottom-nav「ごかんそう」ボタンのアイコン視覚サイズ拡大。 icon_feedback_20260628.png は画像内透過余白が 45-50% と大きく (既存ベル 30-35% より広い)、 background-size: contain だと枠内に余白込みで縮小描画され、 中身が既存 4 ボタン sprite より 20-30% 小さく見えていた事故を解消。 .bn-item--feedback の background を contain → 130% 130% (枠より 30% 大きく描画 + center 配置) に変更し、 余白を視覚的にトリムしてアイコン本体を ~30% 拡大表示。 button box の width/height/left オフセット (sw1759/1758/1760 で確定済の default 158 / 16:9 150 / 4:3 114) は完全無改変、 全 3 breakpoint で default 1 行の background 宣言が継承される構造 (breakpoint 内は width/height/left のみ上書き) のため background-size 設定も 3 breakpoint 全てに自動適用。 :active 押下時の pressed 画像差し替え / transform / prefers-reduced-motion / sprite 4 ボタンの位置・サイズも完全無改変。 万一木枠 outline が切れて見えた場合は 130% → 120% に微調整可能。 play.html PAGE_CACHE_VERSION と同期 (1760→1761)。
// v1760: bottom-nav 4:3 breakpoint のごかんそうボタンとヘルプ sprite の「くっつき」 (gap 6px) 解消。 .bn-item--feedback left: -120→-130 (sprite 左端 0 基準で width 114 + gap 16 = -130 / width は 114 維持)、 連動して .acorn-balance-badge--nav left: -254→-264 (どんぐり-ボタン間 gap を維持しつつ 10px 左へ追従)。 default (sw1759 確定: width 158 / left -180 / どんぐり -290) / 16:9 (sw1758 確定: width 150 / left -166 / どんぐり -304) は完全無改変、 width/height/画像/:active 押下挙動/sprite 4 ボタンの位置・サイズも無改変。 play.html PAGE_CACHE_VERSION と同期 (1759→1760)。
// v1756: bottom-nav 5番目「ごかんそう」ボタン再修正 (sw1751 のサイズ感不足 + 16:9 gap 不足を解消)。 .bn-item--feedback width/height を 120→158 (default) / 104→136 (16:9) / 88→114 (4:3) に拡大し、 既存 4 ボタン sprite 1 タイル高さ (158/136/114) と完全同期。 画像 (icon_feedback_20260628.png 64x64) は木枠+座布団+ラベル baked in の単タイルデザインのため、 sprite 高さに揃えれば視覚的サイズ感が一致。 left オフセットはどんぐり基準から sprite 左端 (0) 基準に変更: -(width + 16) 計算で default -174 / 16:9 -152 / 4:3 -130 とし、 既存 sprite 「ヘルプ」 タイルとの gap 16 を 3 breakpoint 全てで確保 (16:9 でくっつき解消)。 4:3 のみ どんぐり .acorn-balance-badge--nav left を -214→-240 に押し出し (box-sizing:border-box の min-width 96 を box 幅とし、 どんぐり右端 -240+96=-144 / ボタン左端 -130 / gap 14px を確保)。 default (-260) / 16:9 (-244) のどんぐり left は無改変 (gap 38/32px で十分)。 :active 押下挙動 / prefers-reduced-motion / background-image (icon_feedback_20260628.png + _pressed.png) / sprite 4 ボタンの位置・サイズ も完全無改変。 play.html PAGE_CACHE_VERSION と同期 (1755→1756)。
// v1755: 機能トグルのラベルさらに平易化 (batch:889) — cross-reviewer 指摘の残り 3 件 (play-dev-mode / bento-maskedit / bento-debug-log) の label/description から「開発者」「エディタ」「開発ログ」「開発者ツール」 等の専門用語を排除し、 保護者が見て即理解できる平易な日本語に書き換え。 id / default / 他 6 features / CSS / isFeatureEnabled/setFeatureEnabled/localStorage 永続化は無改変。 play.html PAGE_CACHE_VERSION と同期。
// v1754: maze みずすべり追加調整 (batch:892-maze-water-shimmer-direction) — アメンボ画像の元向きが進行方向と逆に見えていたため、 rider 全体は回さず `.water-rider__amenbo` だけを CSS scaleX で左右反転し、ポノは既存公式画像のまま直立感を維持。水面 canvas には常時の薄いゆらぎ/光筋 `_waterSkateDrawWaterSurface` と、描いたラインから左右へ広がる疑似 displacement 波 `_waterSkateDrawPathRefraction` / `_waterSkateAddWake` を追加。画像生成・新規素材なし、実行時の入力軌跡/水面反応描画のみ。play.html PAGE_CACHE_VERSION は未変更、maze 個別更新のため sw.js CACHE_VERSION のみ bump。
// v1753: 機能トグル UI のラベル平易化 + 装飾線削除 (batch:888-toggle-ui-readable)。 common/debug-features.js の 9 features を「めいろ：全ステージ + どんぐり制限なし」 等の保護者向け平易ラベル + URL/操作手順入り description に書き換え、 play.html の .debug-board-panel dashed border を細い実線 (#e8d9b5) に、 .debug-feature-item を iOS Settings 風 (border 1px / box-shadow なし / label 15-16px bold + desc 12-13px gray) にリファクタ。 .is-on の黄色ハイライト・isFeatureEnabled/setFeatureEnabled/localStorage 永続化は無改変。 play.html PAGE_CACHE_VERSION と同期。
// v1751: bottom-nav 5 番目「ごかんそう」 ボタンが既存 4 ボタン sprite (木枠 + 座布団) に対して「半分以下サイズ」 で並んでいた不釣り合いを修正。 .bn-item--feedback の width/height を 78px 固定 → 各 breakpoint で sprite 1 タイル実表示サイズに合わせて拡大: default 78→120px (sprite 1 タイル 125x158 の 96%/76%)、 16:9 (~max-aspect-ratio 1599/900) 78→104px (sprite 1 タイル 107x136 の 97%/76%)、 4:3 (~max-aspect-ratio 4/3) 78→88px (sprite 1 タイル 90x114 の 98%/77%)。 height は 1:1 維持 (icon_feedback_20260628.png は正方形 + background-size: contain でアスペクト比保護)。 left 位置は -96 → -104 で 3 breakpoint 統一、 どんぐりバッジ右端 (default -260+140=-120 / 16:9 -244+124=-120 / 4:3 -214+96=-118) + gap 14-16px で揃え、 アイコン本体中心は元位置から約 +9px 右へ微移動 (sprite 木枠との重なり回避)。 どんぐり .acorn-balance-badge--nav 自体の left は無改変 (-260/-244/-214)、 :active 押下挙動 / prefers-reduced-motion / background-image (icon_feedback_20260628.png + _pressed.png) / sprite 4 ボタンの位置・サイズ も完全無改変。 play.html PAGE_CACHE_VERSION と同期 (1750→1751)。
// v1750: bottom-nav 5 番目「ごかんそう」 ボタンを焼き込み画像 (木枠 + クリーム座布団 + 紙鉛筆 + 「ごかんそう」 ラベル) に差し替え。 通常版 icon_feedback_20260628.png は v1718 から precache 済、 押下版 icon_feedback_20260628_pressed.png を新規追加。 :active で pressed 版に即時切替 + transform: translateY(1px) で押し込み感、 prefers-reduced-motion で transform 抑制。 play.html 側は擬似要素絵文字 (📝) / border / box-shadow / background-color / label テキストを CSS から除去 (全て画像に内包)。 既存 button_bottom_005.png (ベル) と同じデザイン言語で 4 アイコン sprite との統一感を獲得。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 .bn-item--feedback の position/left/width/height (sw1738 で確定) も無改変。 play.html PAGE_CACHE_VERSION と同期 (1748→1750)。
// v1746: maze 水面ラインスケート修正 — water-skate 専用 canvas に max-height/object-fit/margin override を追加し、 encounter 共通 `.enc-stage canvas` の contain 縮小で iPad mini 等の pointer 座標と描線がずれる問題を解消。成功時に描いた path を正規化保存し、完了画面の固定直線 `.water-complete-route` を廃止して `#waterCompleteCanvas` に実際の軌跡を再描画、アメンボ+ポノの最終位置も描いた道の終点へ追従。例外理由: 実行時の入力軌跡/波紋/きらめき描画で、画像アセット作成の代替ではない。既存 Pono 公式画像のみ使用、服/装飾追加なし。play.html PAGE_CACHE_VERSION は他 batch の v1745 のまま、maze 個別更新のため sw.js CACHE_VERSION のみ bump。
// v1745: AcornModal default SE を universfield-game-bonus-03 (1.20s 祝祭ジングル) に置換、 brief.md WIRED 更新
// v1744: AcornModal Phase 2 統合 fix を一括反映 — (1) common/acorn-modal.js show() の playSafe() に Promise rejection 防御 (.catch silent fail) を補強し iOS Safari の autoplay reject 時の uncaught promise を完全抑制、 (2) maze 「力の手袋: 岩くだき」 の岩砕き fallback timer (_strengthGimmickTimers に積む 6 秒 safety net) を再点検し setTimeout reference を確実に _clearStrengthGimmickTimers (_closeEncounter / 再 encounter) で掃除、 (3) common/acorn-modal-shared.css の .pono-acorn-modal__dismiss top/right を max(clamp(...), env(safe-area-inset-top/right, 0px)) 構文に統一し notched 端末で × button が安全圏外に出ないよう保証、 (4) tap padding を全 dismiss button で 44x44 物理 px 以上 (WCAG SC 2.5.5 Target Size) に揃え子供のタップ精度を底上げ、 (5) v1738-v1743 で並走 push されていた AcornModal 系 CRITICAL/HIGH (close button 位置 / SE 確実発火 / 祝祭ジングル / strength_push countdown / sk_intro 音声) の cross-review 残課題を Phase 2.5 として一括 close。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 acorn_get_festive 系 SE の precache 追加はユーザー判断で見送り (default don.mp3 を維持)、 acorn-copy.json / acorn-audio.js の登録テーブルは無改変、 maze の panel framework / Fukuro_frame / dev bypass / capped state も無改変。 play.html PAGE_CACHE_VERSION と同期。
// v1743: AcornModal default SE を「祝祭系 (チラーン + キラキラ + 鈴 + ホルン)」 ジングルに置き換え、 共通基盤の音響を子供向けに凝った仕上げに。
// v1741: AcornModal show() 時に PonoAcornAudio.play(gameId) を呼んで どんぐり獲得 SE を確実に再生 (default don.mp3、 ゲーム別 register で上書き可能)。
// v1740: maze 「力の手袋: 岩くだき」 ミニゲームに 3-2-1-GO! カウントダウン演出を追加 — strength_push/start.mp3 ナレーション再生 (encounter modal 起動時 user gesture 内、 iOS Safari autoplay policy 通過) → onended ハンドラで _runStrengthCountdown 起動 → 「3」 (1秒) → 「2」 (1秒) → 「1」 (1秒) → 「GO!」 + ゲーム本体起動 (deadline 確定 + locked=false + rockBtn enable + setInterval render loop)。 各秒で SE 再生 (3,2,1=oto/close-hit.mp3 流用、 GO=oto/game-start.mp3 流用、 _MZ_SE_PATHS に countdownTick/countdownGo 追加し既存 playMzSe API で発火、 新規 brief 不要)。 UI は .strength-game__impact-zone 内に absolute overlay (.strength-countdown) を重畳、 .strength-countdown__num に strengthCountdownPop keyframe (opacity 0→1→0 / scale 0.4→1→1.25 / 1秒) + GO! は緑シャドウで is-go modifier、 z-index 9 で rock/glove 上に表示 + pointer-events:none でタップ透過。 安全網: ナレ取得失敗 / play() reject 時は即カウントダウン、 onended が来ない端末向けに 6秒 fallback タイマー、 _strengthGimmickTimers に積んで _clearStrengthGimmickTimers (_closeEncounter / 再 encounter 時) で確実に掃除。 _strengthGameState 初期値で locked:true / deadline:0 にしてカウントダウン中の _renderStrengthPushGame 自動 fail (remain<=0) 発火を回避、 _startStrengthPushPlay で deadline 確定 + intervalId 再入防止ガードも追加。 button[disabled] 属性を初期付与し、 視覚的にもカウントダウン中タップ無効を明示。 既存 _onStrengthRockTap / _renderStrengthPushGame / _failStrengthPushGame / _clearStrengthPushGame / charm-popup / 他ミニゲーム (water_bridge / web_sweep / silhouette 等) の挙動は完全無改変。 iOS Safari autoplay: encounter modal は user gesture (タップ) 内で _showStrengthPushGame が呼ばれるため audio.play() OK。 play.html PAGE_CACHE_VERSION と同期。
// v1739: AcornModal SE 確実再生化 — common/acorn-modal.js の show() メソッドで playSafe() の発火タイミングを _buildDom()/_bindEvents()/appendChild/reflow の手前に前倒し。 user gesture (puzzle/oto/bento 等の clear handler tap) の同期 stack frame 内で PonoAcornAudio.play(gameId) を呼ぶことで iOS Safari の autoplay policy 通過率を最大化 (旧実装は requestAnimationFrame x2 → animated class 付与の後に SE 発火していたため、 gesture context が切れて autoplay reject されるリスクがあった)。 同一 show() 呼び出しでの SE 二重発火を防ぐ _seFired ガードを追加 (hide() で false に reset、 次回 show では正常に 1 回鳴る)、 また show() 終盤に保険として再試行ブロックを残置 (将来の reset 経路で _seFired===false なら user gesture 外でも 1 回試行、 reject されても silent fail で副作用なし)。 playSafe() は Promise<HTMLAudioElement|null> を返すよう正規化 (fire-and-forget で呼び出し側は無視可、 古い undefined 返却にも耐性)。 PonoAcornAudio (acorn-audio.js) 側は無改変 — 未登録 gameId は default (quiz/don.mp3 @ 0.48vol) にフォールバックする既存契約のまま。 game-stickers.js _playRewardImpactSfx() (シール popup 系) は別経路で無改変、 oto/quizland の rhythm-complete BGM や clear sfx と被らないよう SE 自体は短い 1-shot (don.mp3) を維持。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 acorn-modal-shared.css / acorn-copy.json / acorn-copy-loader.js も無改変。 play.html PAGE_CACHE_VERSION と同期。
// v1738: AcornModal × ボタンを右上角寄りに調整 (top/right clamp 値を縮小、 葉装飾と被らない最小余白)。
// v1737: bottom-nav 「せってい」 タップで PonoRating モーダルが開く緊急バグ修正 — play.html L5662 で 5 番目 (ごかんそう) を bottom-nav 内 grid 5 列目に追加していたが、 base sprite は 4 アイコン用 (title_bottom_nav_4_generated_20260626.webp) のまま据置だったため、 grid 5 列に変えると DOM 上の 4 番目「せってい」 ボタンが sprite 上「シール↔せってい」 中間に乗り、 5 番目「ごかんそう」 ボタンが sprite 上の「せってい」 アイコン位置に重なる結果、 ユーザーが「せってい」 アイコンをタップ → 実体は data-action="feedback" → PonoRating.openFromTitle() が発火する状態だった。 修正: (1) .bottom-nav grid-template-columns を repeat(5,1fr) → repeat(4,1fr) に戻し既存 4 アイコン sprite との位置整合を復元、 (2) .bn-item--feedback に position:absolute + left:calc(100% + 8px) で bottom-nav の右外側へ並置 + 暫定 label/icon を可視化 (絵文字 📝)、 (3) HTML の 5 番目 button にクラス bn-item--feedback を付与し grid auto-flow から除外。 dispatcher (L7106-7122) と HTML の data-action 値は元から正しかったため変更なし、 PonoRating.openFromTitle() は引き続き data-action="feedback" 経由でのみ発火。 5 列分 sprite (title_bottom_nav_5_*) が用意でき次第、 grid を 5 列に戻し .bn-item--feedback の絶対配置を撤去する。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変。 play.html PAGE_CACHE_VERSION と同期。
// v1736: 難易度ラベル統一 Phase 2 + Phase 4 fix 一括反映 (maze/oto/bento/puzzle/quizland) — (1) maze/index.html: HUD `#hud-stage` (テキスト右隣) と image-stage-mode `#imgStageLabel` の 2 箇所に `.pono-diff-badge[data-diff="easy|normal|hard"]` を追加、 `_mzUpdateDifficultyBadges(stageIdx)` ヘルパーで PonoDifficulty.forStage('maze', n) を反映 (stage1-3 easy / 4-5 normal / 6+ hard)、 imgLoadStage 経路 + grid stage 経路の 2 fork で hudStage.textContent 直後にフック、 PonoDifficulty 未読込時は try/catch silent fail。 (2) oto/index.html: リズム難易度タブを「★やさしい / ★★ふつう / ★★★むずかしい」 に統一 (data-diff 内部キー = 旧 'かんたん/ふつう/難しい' は selectors/tutorial/進捗保存互換のため温存、 narration mp3 同期は別タスク)、 `_normalizeRhythmDiffLabel` に旧↔新の双方向吸収追加、 `_displayRhythmDiffLabel/_displayRhythmDiffStars` を新設し曲一覧バッジに反映、 aria-label="むずかしさ ◯◯" + .rhythm-diff-stars CSS 追加。 (3) puzzle/album.html: col-head (1-20) 各セル下に `PonoDifficulty.forStage('puzzle', n)` で★/★★/★★★ 極小バッジ + cell タップ popup 下端の label 付き大バッジ追加、 `<script src="../common/difficulty.js">` 読込、 .album-diff--easy/normal/hard/popup CSS 追加、 album.css に partner-select.css と同パレット配色適用。 (4) bento/index.html: タイトル画面「おねがいモード」 ボタンに PonoTier→PonoDifficulty 連動の難易度バッジ (free=やさしい★ / book=ふつう★★ / sub=むずかしい★★★)、 「じぶんでつくる」(simple) は中立、 チュートリアル未完了時非表示、 aria-label= 空文字列初期化で SR 早読みリスク消滅。 (5) Phase 4 fix: quizland HTML 直書き「かんたん」→「やさしい」 + DIFF_LABELS を PonoDifficulty.DIFFICULTY.{EASY,NORMAL,HARD}.label 動的参照化、 puzzle/index.html + partner-select.js の hardcoded 'かんたん' を PonoDifficulty 経由に変更、 bento title-screen-difficulty-badge の aria-label/stars/label 空文字列初期化 (runtime 上書き)。 a11y: role="img" + aria-label="難易度 <label>" 統一、 stars span は aria-hidden で読み上げ重複回避。 子供画面に年齢数字は出さない方針 ([[design_age_rating_display]]) 維持、 改行コード LF 維持。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 common/difficulty.js は v1732 から既に CRITICAL_ASSETS_SCRIPTS 登録済。 play.html PAGE_CACHE_VERSION と同期。
// v1735: Phase 2 PonoAcornModal 全ゲーム統合 (Critical/High 22 件のクロスレビュー反映) — (1) puzzle / bento / undersea-cave / starparodier の 4 ゲームに common/acorn-modal-shared.css + common/acorn-audio.js + common/acorn-copy-loader.js + common/acorn-modal.js を head に追加、 body に data-game-id 属性 (puzzle / bento / undersea-cave / starparodier) を付与。 (2) 各ゲームの clear handler で addAcornsDaily を suppressRewardModal:true で呼んで granted を捕捉し、 granted>0 && window.PonoAcornModal の場合に new PonoAcornModal({gameId, granted, dailyTotal, dailyCap, state: capped? 'capped':'idle', autoHide:0}).show() を発火 (maze/oto と同パターン)。 try/catch + console.warn フォールバックで例外時も既存挙動破壊なし。 (3) play.html PAGE_CACHE_VERSION を 1722→1733 へ同期 (Phase 2 アセットの cache 整合性確保)。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 maze/oto/quizland の AcornModal 挙動も無改変。 quizland 旧 .result-acorn-reward DOM/CSS/JS の deprecate、 puzzle/bento/starparodier/undersea-cave 固有 CSS override (世界観差別化) は次フェーズで対応。
// v1734: 難易度ラベル統一 Phase 3 (クロスレビュー Critical/High 反映) — (1) quizland: <script src="../common/difficulty.js"> 追加、 難易度選択画面 HTML 直書き「かんたん」→「やさしい」、 const DIFF_LABELS を PonoDifficulty.DIFFICULTY.{EASY,NORMAL,HARD}.label 動的参照に変更し未読込時のフォールバックは新ラベル ('やさしい/ふつう/むずかしい') へ統一。 確認ダイアログ "やさしいで いい？" 等も自動で新ラベル化。 内部 'easy/normal/hard' キーと localStorage 互換は維持。 (2) puzzle/index.html: 本編プレイ画面にも common/difficulty.js を読込追加 (partner-select.js が PonoDifficulty を参照するため)、 puzzle/partner-select.js buildDifficultyBadge() の hardcoded 'かんたん' を PonoDifficulty.DIFFICULTY.EASY.label 経由に変更 (未読込時フォールバックは 'やさしい')。 コメント「(かんたん / ふつう / むずかしい)」→「(やさしい / ふつう / むずかしい)」 修正。 (3) bento/index.html: title-screen-difficulty-badge の HTML hardcoded aria-label="難易度 ふつう" / stars "★★" / label "ふつう" を空文字列初期化、 syncDifficultyBadge() が runtime で正しい tier に上書きするため、 スクリーンリーダー早読みでの「ふつう」誤読リスク消滅。 改行コード LF 維持。 子供画面に年齢数字を出さない方針 ([[design_age_rating_display]]) 維持。 oto は既に _displayRhythmDiffLabel が PonoDifficulty 経由で 'やさしい' を出力済 (内部キー 'かんたん' は selectors/tutorial/進捗保存互換のため温存、 narration mp3 同期は別タスク [[feedback_tts_whisper_verify_required]])。 maze HUD / oto タブ / oto 曲一覧バッジ実装 (v1733 で同時 deploy 済) を v1734 で正式記載。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 common/difficulty.js は v1732 から既に CRITICAL_ASSETS_SCRIPTS 登録済。
// v1733: 難易度ラベル統一 Phase 2 (puzzle album) — puzzle/album.html に common/difficulty.js を読込追加。 album.js の col-head (1-20) 各セル下に PonoDifficulty.forStage('puzzle', n) で★/★★/★★★ の極小バッジを追加 (stage 1-5=easy / 6-12=normal / 13-20=hard)、 cell タップ時の popup 下端にも label 付き大バッジを表示。 a11y: role="img" + aria-label="むずかしさ: <label>" + title。 album.css に .album-diff--easy/normal/hard 配色 (puzzle/partner-select.css と同パレット) と .album-diff--popup 大型バリアント追加。 ステージ番号 .album-grid__col-head-num を block 化して垂直配置。 既存の puzzle/index.html (本編プレイ画面) は currentStageIndex 線形進行で stage 選択 UI が無いため refactor 対象外。 quizland 側 DIFF_LABELS 統一は Phase 3。 子供画面に年齢数字を出さない方針 ([[design_age_rating_display]]) 維持、 改行コード LF を維持。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変。
// v1732: 難易度ラベル統一 Phase 1 — common/difficulty.js を新設 (MVP 5 ゲーム横断のラベル一元化、 'やさしい/ふつう/むずかしい' + ★ stars + 旧 'かんたん' 後方互換 normalizeLabel)。 bento/index.html のタイトル画面 「おねがいモード」 ボタンに PonoTier (free/book/sub) → PonoDifficulty 連動の難易度バッジを追加 (free=やさしい★ / book=ふつう★★ / sub=むずかしい★★★)、 「じぶんでつくる」 (simple) は中立 (バッジ無し)、 チュートリアル未完了時 (BENTO_TUTORIAL_STORAGE_KEY !== '1') は非表示。 a11y: role="img" + aria-label="難易度 <label>"、 stars span は aria-hidden で読み上げ重複回避。 子供画面に年齢数字は出さない方針 ([[design_age_rating_display]]) 維持、 quizland 側 DIFF_LABELS の refactor は次フェーズ。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変。
// v1731: Phase 2 全ゲーム共通仕様統一 — (1) autoHide:0 を全統合ゲーム (oto / quizland / bento / puzzle / starparodier / undersea-cave / maze) に波及、 oto の 4200ms 自動閉じを廃止し dismiss は × / panel/overlay tap / ESC の 3 経路に集約。 (2) base .pono-acorn-modal__dismiss を common/acorn-modal-shared.css で右上 absolute 固定 (top/right:clamp + safe-area-inset 対応) に統一、 各ゲーム個別の dismiss 配置 override は廃止。 (3) acorn-copy.json の kicker / label / cap copy トーンを統一しゲーム間の文言ブレ (ですます混在 / 感嘆符過多 / 重複文言) を解消。 (4) puzzle / bento / starparodier / undersea-cave の brief.md を整備し AcornModal 統合仕様の正本化。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 maze の panel framework / Fukuro_frame / dev bypass / capped state も無改変。 play.html PAGE_CACHE_VERSION と同期。
// v1730: AcornModal から「タップして つぎへ」 (tap-hint) 撤去 — × ボタンと役割重複だったため × + パネル/オーバーレイタップ + ESC の 3 経路に統合。 autoHide===0 のタップ待ち動作は維持。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変。
// v1729: AcornModal から tap-hint 「タップして つぎへ」 を完全撤去。 dismiss 動線は × / panel/overlay tap / ESC の 3 経路に集約。 common/acorn-modal.js (tap-hint DOM 生成 + tap-only modifier + DEFAULT_TAP_HINT + tapToDismiss resolveCopy/normalizeCopy を削除)、 common/acorn-modal-shared.css (.pono-acorn-modal__tap-hint base + @keyframes pono-acorn-tapHintPulse + reduce-motion override + [data-game-id="maze"] tap-hint 位置 override を削除)、 common/acorn-copy.json (default.tapToDismiss 削除)、 common/acorn-copy-loader.js (getDefaultTapHint API 削除) を一括反映。 autoHide===0 の挙動 (setTimeout skip + panel/ESC/×/overlay dismiss) は維持、 × button の右上 absolute 固定 + safe-area-inset 対応も無改変。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 他ゲーム (oto / quizland / undersea-cave 等) の AcornModal 挙動には影響なし。
// v1728: acorn-copy.json 全 state x 全ゲーム で kicker と label の重複文言を解消 (Phase 1.4 で maze.capped のみ修正していた漏れを網羅的に fix)。
// v1727: v1726 ヘッダコメント修正 (実装乖離訂正) — (1) tap-hint 説明を実装に合わせて 「v1725 同様 position:absolute + bottom:clamp(-72px,-9vw,-56px) で panel 下に浮かせ葉飾り PNG と視覚分離」 に訂正 (v1726 で 「panel 内側 (bottom inset + margin-inline auto) に収め panel 外はみ出しを解消、 v1725 の浮かせ方式を撤回し panel 内完結化」 と誤記載していたが、 acorn-modal-shared.css L740 は実際には負値 bottom のまま浮かせ実装を継続)、 (2) dev bypass localStorage キーフォーマットを実装に合わせて 「pono_acorns_dev_v1_<YYYY-MM-DD>_<gameId>」 に訂正 (旧記載 「pono_maze_acorn_cap_dev_<YYYYMMDD>」 / 「pono_maze_acorn_cap_<YYYYMMDD>」 は存在しないキー名)、 (3) dismiss button の safe-area-inset 対応を追加 (top/right を max(clamp(...), env(safe-area-inset-*, 0px)) で notched 端末でも安全圏内に保持、 WCAG SC 1.4.11)。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 selector scope ([data-game-id="maze"]) も無改変。
// v1726: maze AcornModal UI 細部 4 点反映 — (1) capped state 「もう きょうは いっぱい〜」 重複文言の片方を撤去 (重複コピー dedupe)、 (2) close × ボタンを panel 右上の固定座標 (top:clamp + right:clamp + position:absolute) に配置し葉装飾と分離、 (3) 「タップして つぎへ」 tap-hint を panel 下に absolute で浮かせ葉飾り PNG と視覚分離 (v1725 同様、 bottom:clamp(-72px,-9vw,-56px))、 (4) URL ?dev=1 / dev=true の時のみ daily cap を bypass するための DEV_BYPASS_KEY (`pono_acorns_dev_v1_<YYYY-MM-DD>_<gameId>` 形式) を common/acorns.js に追加 (本番バケット `pono_maze_<YYYY-MM-DD>` は無汚染)。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 quizland / oto / bento の AcornModal selector scope ([data-game-id="maze"]) で隔離。
// v1725: Phase 1.4 btn-fit — maze AcornModal の tap-hint (「タップして つぎへ」) が aspect-ratio:1200/609 panel + Fukuro_frame_001.png 下端葉装飾と衝突 / panel 下端からはみ出すバグを修正。 [data-game-id="maze"] .pono-acorn-modal__tap-hint に position:absolute + left/right:0 + margin-inline:auto + bottom:clamp(-72px,-9vw,-56px) を当て panel 外下に浮かせ、 葉飾り PNG と視覚分離。 transform を使わない中央寄せで pono-acorn-tapHintPulse keyframe との衝突回避。 aspect-ratio / Fukuro frame contain は無改変 (AR 禁則ルール遵守)、 他ゲーム (oto/quizland/bento 等) の tap-hint には影響なし (selector scope)。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変。
// v1724: maze AcornModal フレーム画像の AR 違反 (background-size:100% 100%) を修正、 panel container を画像 AR に合わせる方式に変更。 CLAUDE.md / AGENTS.md に画像縦横比禁則ルールを明文化。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変。
// v1723: クロスレビュー Phase 1.2 HIGH 反映 — common/acorn-modal-shared.css の maze panel box-shadow に `inset 0 -4px 0 rgba(120,80,20,0.15)` を追加 (quizland .board の上端 inset depth を再現) + ::before glow 色を #ffdd69(0.42) → #FFEF8A(0.42) に補正 (brief 仕様準拠)。 visual fidelity 強化のみ、 selector scope ([data-game-id="maze"]) / 既存 cache strategy / skipWaiting / clients.claim 設計は無改変。
// v1723: maze AcornModal — フクロウ博士キャラ重畳を撤去し quizland 問題ウィンドウ枠 (cream/茶木枠/葉装飾) を流用する正しい修正に差し替え。 v1720 で誤って owl_professor_guide.webp を ::before に重畳していた件の訂正。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変。
// v1722: Book Tier Unlock 3 経路化 (シリアル / Amazon 注文番号 / 絵本クイズ) — play.html #passwordUnlockModal に WAI-ARIA tabs (Manual Activation) + 3 panel + 共通 finalize/error helper を追加、 common/tier.js に verifySerialCode / verifyOrderId / verifyQuizAnswer / pickRandomQuiz / normalizeAnswer / QUIZ_QUESTIONS / SERIAL_CODES / ORDER_ID_RE を新設。 タイトル「えほんを もっているひとへ」 へ変更、 既存 verifyBookPassword は serial 経路の一次経路として温存 (フォールバック維持)。 新規 localStorage キー: pono_book_unlock_method / pono_book_unlock_at / pono_unlocked_orders (debug reset で一括削除)。 既存 cache strategy / skipWaiting / clients.claim 設計は無改変、 sw.js は CACHE_VERSION のみ bump (新規ファイル無し、 既存 common/tier.js は precache list 既登録)。 play.html PAGE_CACHE_VERSION と同期。
// v1721: クロスレビュー HIGH/CRITICAL 反映 — common/acorn-modal-shared.css の prefers-reduced-motion block に maze 用 text-shadow:none (kicker/label/amount-num) を oto と同パターンで追加し、 override 漏れ防止。 maze ::before reduce 時 filter を `filter:none` から depth shadow 維持 + glow のみ落とす形に緩和 (HIGH#5 アクセシビリティと視覚奥行きの両立)。 L591 コメントを Phase 1.5 装飾再導入時の audit ガイドとして補強。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計、 oto autoHide:4200 / quizland Perfect 演出は無改変。
// v1720: maze AcornModal ユーザーフィードバック反映 — (1) autoHide=0 で tap/ESC/× 待ち、 (2) 画像 404 修正、 (3) quizland フクロウ博士ウィンドウデザイン流用に刷新。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変。
// v1719: ガチャガチャ 1 日 2 回仕様化 (batch:881-gacha-twice-daily)。 (1) フリー pull (count 0→1) はチャレンジ不要、 毎日 1 回保証。 (2) デイリーチャレンジクリアで 2 回目 (count 1→2) 解放 (bonus FX 連動)。 (3) record に count フィールド追加 (旧 record は stickerId 有→count=1 後方互換)。 (4) isDailyGachaUsedToday は count>=2、 新ヘルパー canPullDailyGachaNow / getDailyGachaCount。 (5) lacksKey 撤廃、 openDailyGacha を新 3 state ロジック (count>=2 used / count===1 && !cleared locked / その他 通常 + bonus FX) へ。 (6) dailyGachaTodayKey を JST 境界 (UTC+9, getUTC*()) に統一して js/daily-quest.js の todayKeyJST と同一実装に (旧実装は local TZ 依存で端末が JST 以外だとズレ発生)。 (7) locked モード文言を「チャレンジを クリアすると もう1かい まわせるよ」 に。 PonoDailyQuest 側 (clearedAt / bonusUsedAt / markBonusUsed) は無改変。 play.html PAGE_CACHE_VERSION と同期。
// v1717: maze reward ガードを _official フラグ依存から URL ?image= パラメータ判定に切替。 _loadImageStageIndex async 完了タイミングに依存していた race condition を完全解消し、 cap 到達時も AcornModal を capped state で表示するように改修。
// v1716: ごかんそう (rating modal) 導入 — common/rating-modal.js / common/rating-modal.css / assets/ui/icon_feedback_20260628.png を CRITICAL_ASSETS_SCRIPTS に追加。 play.html bottom-nav に 5 ボタン目 (feedback) を追加し、 first-clear.js の triggerFirstClearReward Promise 解決後 800ms 連鎖で PonoRating.maybeShowAfterClear(gameId) を発火。 quizland / quiz-sound / bento の 3 ゲームは first-clear 経路に乗らないため個別 wire。 4 ゲート (既評価 / 7 日クールダウン / 累積 3 回 / 50% 確率) で子供没入を切らず、 ★4 以上のみ Forms 導線を提示。 PONO_FEEDBACK_FORMS_URL は PLACEHOLDER (ユーザーが Forms 作成後に置換予定)。 common/rating-modal.* は別エージェント並列作成中のため未配備でも tag/precache だけ先行登録 (404 silent fallback)。 play.html PAGE_CACHE_VERSION と同期。
// v1715: (a) ガチャ受け皿マスク再調整 — `.daily-gacha-drop-mask` bottom inset 9%→6%、奥壁ラインを下げてカプセルが奥側床面で自然に切れる見え方へ。 (b) maze 旗あげ音声リズム v3 + グローブ z-order + 8 ミニゲームナレーション基盤 (batch:874/875/876 統合) — _MAZE_VOICE_BUNDLED whitelist (truefalse 3/simon 4/silhouette 4/oddone 3/strength_push 1/kumo 5 = 計 20 keys) を _playMazeVoice / _preloadMazeVoices に通して未配置 12 keys (janken×8/water_bridge×6/strength_push×4/kumo×1) を silent skip 化、 console 404 noise ゼロ。 strength_push retry 時 crackPlayed/almostPlayed flag reset、 _stopAllMazeVoices helper 追加 + _closeEncounter 冒頭 invoke、 kumo/start.mp3 物理削除。 narration mp3 29 本 (flag 9/truefalse 3/simon 4/silhouette 4/oddone 3/strength_push 1/kumo 5) は runtime cache 任せ。 残 21 voice (janken×8/water_bridge×6/strength_push×4/kumo×2/flag×1) は batch:880-quota-retry で TTS quota 復活後追加予定。 play.html PAGE_CACHE_VERSION と同期。
// v1714: maze AcornModal race condition fix — applyMazeStageStoryFallback で _official=true を同時設定し、 _loadImageStageIndex 未完了でも reward 演出が確実に発火するように修正。
// v1713: Phase 1 oto acorn modal 統合 — oto/index.html を共通 AcornModal (common/acorn-modal.js + common/acorn-modal-shared.css) に統合。 oto/index.html は maze 同様 network-first (HTML は SW で intercept しない) のため CRITICAL_ASSETS_HTML への追加不要、 既存 cache strategy / skipWaiting / clients.claim 設計 (install/activate で呼ばない) は無改変。
// v1712: クロスレビュー Phase1 maze — common/acorn-modal.js _buildDom() で overlay に data-game-id 属性を伝搬し、 acorn-modal-shared.css の [data-game-id="maze"] override (forest accent / wood-tone panel / tea-pill label) を発火可能に。 maze/index.html <body> にも data-game-id="maze" を付与し selector matching chain を二重化。 common/acorn-modal-shared.css の @media (prefers-reduced-motion: reduce) ブロックに maze override の motion 寄り装飾 (radial-gradient / box-shadow / text-shadow) 静止化ルールを追加 (WCAG SC 2.3.3)。 maze/index.html _showMazeAcornModalOrProceed に _proceedOnce ガード追加で proceed() 二重発火 race を防止、 onClear story-less 分岐で最終ステージ時の AcornModal 不要インスタンス化を抑制。 既存 charm-popup / encounter-modal / triggerFirstClearReward 挙動は無改変。
// v1710: ガチャ落下カプセルの受け皿マスクを調整。前壁の外縁ではなく、厚み分だけ奥側の内壁ラインで隠れるよう `.daily-gacha-drop-mask` の bottom inset を 5% → 9% に変更。play.html PAGE_CACHE_VERSION と同期。
// v1709: クロスレビュー finalize batch:869-bff (4 fixes 統合) — Fix 1: play.html FOUC guard + #pono-game-splash overlay (oto 型 4 層マスキング、 タップ/Enter で dismiss、 a11y tabindex 対応)。 Fix 2: bento/index.html FOUC guard を #shop-opening / .shop-opening / .free-bottom-guide にも拡張 (将来 shop intro merge 時に forward-compatible)。 Fix 3: common/preload-helper.js gacha 配列を 6→11 件 (chrome 5 件追加 = start_panel/more_turn/counter/action_home/shop_button)、 play.html startDailyGachaImagePreload を FAST_BATCH_SIZE=8 gap=0 / 16 件以降 90ms gap に変更 (モーダル open 後 chrome paint -600ms)。 Fix 4: common/sw-update.js に opt-in トースト「今すぐ更新」 追加 (toastShown 多重防止)、 play.html に first-visit catch-up overlay (sessionStorage FLAG + lastSeen 比較 + __isReloading 2s cleanup でループ防止)。 play.html PAGE_CACHE_VERSION と同期。
// v1708: どんぐり獲得モーダル共通化リファクタ — common/acorn-modal-shared.css / common/acorn-modal.js / common/acorn-audio.js / common/acorn-copy.json を新規追加し precache list (CRITICAL_ASSETS_SCRIPTS) に登録。 quizland/index.html を CRITICAL_ASSETS_HTML に追加して daily-quest 経由のクリア演出 cold start 解消。 既存 network-first / cache-first 戦略は無改変。 skipWaiting/clients.claim は install/activate で呼ばない設計を維持。
// v1707: ガチャ結果のR/SR表示を台座型から装飾文字ロゴへ差し替え。Rは銀、SRは虹+白金の透過PNG lettermark とし、下プレートはレア度別の喜び一言 + シール名を表示。play.html PAGE_CACHE_VERSION と同期。
// v1706: クロスレビュー fix — Stream A ガチャ preload timing race condition 解消。 play.html L8987 の warmGameAssets('gacha', {fetchpriority:'low'}) inline 同期実行を DOMContentLoaded 待ち (readyState 'loading' 時) に変更。 preload-helper.js は <script defer> なので inline script 実行時点では未ロード (window.PonoPreload === undefined) で try-catch で silent skip されており、 init 時 low priority preload が実質発火していなかった問題を修正。 high priority (pointerenter/touchstart) 経路は元々 user interaction 後発火なので影響なし。 既存挙動 (preload-helper 内部 ロジック / GAME_WARM_ASSETS / FOUC guard) 変更なし。 play.html PAGE_CACHE_VERSION と同期。
// v1705: パフォーマンス改修 (Stream A/B/C 統合 batch:868-perf-gacha-and-remaining-games) — (A) play.html ガチャエントリに warmGameAssets('gacha') を init 時 (low priority) + pointerenter/touchstart 時 (high priority) で発火、 common/preload-helper.js GAME_WARM_ASSETS に 'gacha' key 追加 (capsule banner / machine / room backdrop / reveal_bg 3 種 計 ~1.6MB)。 (B) GAME_WARM_ASSETS に未対応 16 ゲーム (aquarium / breakout / slide / starparodier / undersea-cave / sea-album / wordmatch / shop / zukan / bubble / bowling / coloring / drawing / message / egg / fossil) を追加し、 各 index.html に preload-helper script + DOMContentLoaded warmGameAssets 呼出を wire。 (C) 12 ゲーム (bento / maze / oto / quizland / bubble / aquarium / breakout / bowling / egg / fossil / drawing / puzzle) の index.html head に FOUC guard inline <style> + 2 RAF ready class トリガ追加 (visibility:hidden で layout 保持しつつ init 完了まで game body 非表示)。 既存挙動 (ガチャ open / 各ゲーム init / SW 更新 toast) 影響なし、 SW CRITICAL_ASSETS 変更なし (各ゲーム個別 warm に委譲)。 play.html PAGE_CACHE_VERSION と同期。
// v1701: BGM 制御を堅牢化。 (1) pauseTopBgmForDonguriShop / pauseTopBgmForDailyGacha のガードを撤去し無条件 pause (冪等) に変更、 前回 close 時の play() autoplay fail による残留フラグ問題で 2 回目以降 pause が走らない bug を解消。 (2) gacha bed_loop の volume を 0.2 → 0.5 に上げて audible に。 (3) startDonguriShopBgm に play() promise catch + 1s retry を追加して shop-bgm の autoplay fail 時のリカバリ対応。 play.html PAGE_CACHE_VERSION と同期。
// v1700: パフォーマンス改修 (Stream A+C/B/D 統合) — (A+C) タイトル/ガチャの大型 PNG 17 枚を WebP 化 (32.19MB → 2.06MB / -93.6%)、 play.html / common/preload-helper.js の URL 参照を .webp に置換、 元 PNG は assets/_legacy_png/ に rollback 用退避。 (B) common/preload-helper.js を拡張し GAME_WARM_ASSETS map + window.PonoPreload.warmGameAssets(gameId) API 公開、 bento / puzzle / maze / oto / quizland の各 index.html から DOMContentLoaded で warm 起動 (各ゲーム 1.5MB 上限の idle 先読み)。 (D) play.html の play_bgm.mp3 (1.6MB) を <audio preload="none"> に降格、 4 callsite (tryPlay / dismissIntro / resumeTopBgmAfterDailyGacha / resumeTopBgmAfterDonguriShop) に bgm.preload='auto' bump を入れて play() 直前にロード開始。 iOS Safari の autoplay policy 下では既に初回タップまで再生不能なため UX 劣化なし、 cold start 帯域 ~10MB 削減。 sw.js の CRITICAL_ASSETS は対象 17 ファイル未含のため precache list 変更なし (別 URL の WebP なので CACHE_VERSION bump で旧 PNG キャッシュとの衝突回避)。 play.html PAGE_CACHE_VERSION と同期。
// v1699: もりのおみせ「こもれびや」 — 専用 BGM 復活。 sticker-album-morning.mp3 (シール帳と同じシティポップ調素材、 100.6 秒ループ) を <audio id="shop-bgm"> として組み込み、 startDonguriShopBgm / stopDonguriShopBgm ヘルパー新設。 showShop で pauseTopBgmForDonguriShop + startDonguriShopBgm、 hideShop で stopDonguriShopBgm + resumeTopBgmAfterDonguriShop の順で切替。 isMuted() を尊重 (localStorage 'pono_sound_off')、 volume 0.32、 currentTime 0 で頭出し。 play.html PAGE_CACHE_VERSION と同期。
// v1698: もりのおみせ「こもれびや」 — shop 中 BGM 復活。 v1693 の pauseTopBgmForDonguriShop / resumeTopBgmAfterDonguriShop 呼出を showShop/hideShop から撤回し、 play-bgm を shop 中も流す方針へ。 二重再生の真因だった daily-gacha bed_loop の漏れを showShop 内で確実に stop する処置を追加 (stopDailyGachaBed()) 。 将来 shop 専用 BGM を入れる時はヘルパー関数を再有効化。 play.html PAGE_CACHE_VERSION と同期。
// v1697: タイトル画面 cold-start preload 帯域削減 — play.html <head> から bottom-nav pressed PNG 4 枚 (合計 ~7.1MB / fetchpriority=low) の <link rel=preload> を撤去し、 新規 common/preload-helper.js (defer script, ~5.3KB) が requestIdleCallback (4s timeout) または最初の pointerdown/touchstart/keydown のうち早い方で <link rel=preload as=image fetchpriority=low> を動的注入する方式に切替。 normal sprite (title_bottom_nav_4_generated_20260626.png) は FV 背景として head preload に残置。 重複注入防止 (Set<string> + DOM querySelector チェック)、 LP (index.html) には pathname gate (endsWith('/play.html')) で発火しない。 SW image cache-first (?v=/?t= bypass) と組み合わせで初回タップ後は Cache から即返却。 cross-review (perf-regression + sw-pivot) 反映。 play.html PAGE_CACHE_VERSION と同期。
// v1696: こもれびや — 16:9 で rotation-note 上げ (top 16%→10%) + リス吹き出しの初期/反応字幕を復活 (v1689 の音声停止だけ残し、 表示テキストは元に戻す)。 play.html PAGE_CACHE_VERSION と同期。
// v1695: 音タッチ 4 件修正 — (1) アルプス一万尺の音程を Yankee Doodle 準拠の C メジャーに書き直し、 不自然な 6=シ / 7=高ド オクターブ跳躍を全削除 (Section 1/2/3/4 全 60 音再構成、 element count と beats は不変)。 (2) かえるのうたステージ opening dialog に「3きょく しょうぶ」 announce を追加 (3 → 4 line, kaeru → mary → twinkle 3 連戦を子供に予告)。 (3) リズムチュートリアル「つぎは きみのばん」 narration 不発を修正 — _playOtoTutorialNarration の guard を _otoAudioShouldBlock() (iOS Safari 偽 blur で誤発火) から document.hidden に絞り、 yourTurn cue の autoNextMs 280 → 4500 (narration 完了まで countdown 抑止)。 (4) リズム lane の mobile (≤640px) perspective を clamp(900px, 240vw, 1600px) に shallow 化し、 3D 透視による note 落下位置とボタン 2D rect の視覚ズレを解消。 play.html PAGE_CACHE_VERSION と同期。
// v1694: タイトル画面 cards-only 再描画化に伴うクロスレビュー反映 — (1) 画像 cache-bust 規約を統一: 既存規約 ?v= に加え tools/maze-editor.html 由来の ?t= も bypass 対象に追加 (sw.js L519-530, /[?&](?:v|t)=/)。 これにより admin/illustrator/pivot 系の動的差替が cache-first 戦略下でも即時反映。 (2) Same-URL Same-Filename Overwrite Risk を sw.js 内コメントで明文化 — 同名画像を上書き push すると次の CACHE_VERSION bump まで旧画像が居座るため、 画像更新時は (a) 新ファイル名 / (b) ?v=<ts> 付き参照 / (c) CACHE_VERSION bump のいずれか必須。 (3) CACHE_VERSION bump 規約コメントを TODO 表記から運用説明へ整理。 play.html PAGE_CACHE_VERSION と同期。
// v1693: もりのおみせ「こもれびや」 — BGM 二重再生バグ修正。 daily-gacha と同じ pattern で shop open/close 時に play-bgm を pause/resume。 pauseTopBgmForDonguriShop / resumeTopBgmAfterDonguriShop を新設、 showShop/hideShop で呼出。 shop narration audio に loop=false 明示。 play.html PAGE_CACHE_VERSION と同期。
// v1689: タイトル画面 (4:3 / iPad 横) bento / cooking カード — v1684 (desc hide + text-align center + right 17%) と v1681 の .game-title-break{display:block} を全廃。 「desc を隠して title を 2 行化」 方針は誤り (ユーザー指摘: desc は他カードと同じく見せたい)。 正解は title を 1 行に収めるための font-size 縮小 (bento 30→24px / cooking 30→26px)。 これで title 1 行 + desc 1 行 = 合計 2 行となり他カードと視覚揃え、 text-box left-align / right:13% も他カードと完全一致。 wbr 自体は inline ゼロ幅で残置 (font-size 縮小で 1 行に収まる想定だが、 横幅が更に狭まる端末向けの保険)。 play.html PAGE_CACHE_VERSION と同期。
// v1688: もりのおみせ「こもれびや」 — (1) slot::after シャドウを bottom -6%→-14% で下げ、 透明度 .46→.38 で「カウンター天板の離れた影」 感へ。 (2) bubble フォント拡大 (base 10-15→12-18, line-height 1.12→1.2 / 4:3 14-16→15-19 / mobile 8-12→10-13.5) で読みやすく。 (3) reserve title/name/price/empty フォント拡大 (base title 9-13→12-16, name 9-13→11-15, price 9-12→11-14, empty 「なし」 10-13→14-18 / 4:3 13-15→15-17, name 13-15→14-17, price 13-15→14-17, empty 14-16→16-19) で動的振り分け (短文 empty は大幅 UP、 長文 name は line-height 1.16 で詰めて 2 行折り返し緩和)。 (4) 16:9 base で title top 0→-16% / rotation-note 23.2→17% / bubble 62→54% / subtitle 55.8→47% で看板-rotation-note-吹き出し の重なり解消。 4:3 / mobile block の同種値は据え置き。 play.html PAGE_CACHE_VERSION と同期。
// v1685: シールのおみせ「こもれびや」 4:3 — head bar を letterbox 上部 (top: -10vh) に押し上げ + 看板 top -22%→-4% で head 内に収納 + rotation-note 18.6%→14% で看板真下に逃がし z-index 衝突解消 + bubble/subtitle を bottom 58%/49% に下げて重心均衡。 close/balance も head 上昇に追従。 play.html PAGE_CACHE_VERSION と同期。
// v1684: タイトル画面 (4:3 / iPad 横) bento / cooking カード — title 2 行 + desc 1 行で視覚 3 行化していた問題を解消。 4:3 ブロックで両 id 限定に game-card__desc を display:none、 game-card__text を right:13%→17% (左右対称) + text-align:center に上書き。 desc 消失で text-box 内 flex 子=title 1 個となり、 既存 top:50%+translateY(-50%)+justify-content:center が title 中心=card 中心=アイコン中心 を自動成立 (横中央寄せ + 縦アイコン揃え + 確実な 2 行化を一括達成)。 他カード / 他 viewport / decorateGameTitle / HTML 未改変。 play.html PAGE_CACHE_VERSION と同期。
// v1683: シールのおみせ「こもれびや」 — rotation-note chip 色 #ffe066→#ffdc2e (背景木目上のコントラスト UP) + outer glow 8px→5px + slot::after 楕円シャドウ blur 7px→5px (細長楕円のエッジ保持)
// v1682: もりのおみせ 4:3 ショップ画面のレイアウト改善 + シャドウ刷新 — (1) 4:3 専用ブロックで看板を min(43vw,440px)→min(52vw,540px) に拡大し、 title top -12%→-22%、 close/balance top base→-8% で letterbox 領域へ押し出し、 rotation-note top 21.3%→18.6% で詰めて上部の無駄空間を解消。 (2) rotation-note 視認性: base font clamp(10,1.12,15)→(11,1.28,17)、 4:3 (12,1.32,15)→(13,1.5,17.5)、 mobile (7,1.35,10)→(8.5,1.55,11.5) で全 viewport ワンランク拡大。 color #fff8df→#fff4cb (暖色寄り)、 「6じ」 chip 背景 rgba(83,42,10,.46)→rgba(72,32,5,.6)、 chip 文字 #fff2a6→#ffe066 で板背景上の浮き上がり強化、 text-shadow を 3 段に厚塗り。 (3) 4:3 で吹き出し/取り置きを下げ: bubble bottom 70.8%→62%、 subtitle 62.8%→53.5%、 reserve 3.2%→1.4%。 (4) カード台座シャドウ刷新: slot の縦長 drop-shadow 2 段 (8/8 + 21/16) を drop-shadow(0 4 4 .14) のみに減量、 ::after で横長楕円 radial-gradient + blur(7px) を bottom -6% に追加してカウンター上面の物体影を表現 (16:9/4:3/mobile 共通)。 is-held の glow も簡素化。 play.html PAGE_CACHE_VERSION と同期。
// v1681: タイトル画面 (4:3 / iPad landscape) — cards-col 縦中央寄せ (padding-top 18→0 / padding-bottom 110→80 / justify-content: center / gap 6px) + scroll-hint 上下を absolute→in-flow へ (card-list 真上/真下に追従、 4:3 専用 hintBobUp43/Down43 keyframes) + bento/cooking タイトル 2 行折り返し (white-space normal + game-title-break を block 化、 iOS Safari の inline-block nowrap 暴発バグ回避) + acorn balance badge 2x スケール化 (font 20→40, padding 8/14→16/28, min-width 70→140, icon 22→44, left -82→-164、 4:3 のみ 1.75x 抑制で nav 圧迫回避、 bump scale 1.22→1.12)。 game card desc 可読性向上 (8 方向クリームハロー + font-weight 800 + color 濃化、 maze は dark halo)。 subtitle 校正: writing-mori 「ミルマルと そだとう」 → 「ミルマルを そだてよう」 (誤字+ユーザー指示)、 puzzle 「えを かんせい」 → 「えを つくろう」、 starparodier 「宇宙で」 → 「うちゅうで」、 sea-album 「生き物を」 → 「いきものを」 (4-7 歳向けひらがな統一)。 play.html PAGE_CACHE_VERSION と同期。
// v1680: タイトル画面 middle-3 検知の座標系統一 (getBoundingClientRect ベース化) + 4:3 (iPad landscape) レイアウト調整 (看板拡大+左寄せ / safe-w 1020→1080 / カード max-height 106→124px / タイトル 24→30px / cards-col padding-top 40→18px / 下余白 128→110px) + nav 内 acorn 残高アイコンを🌰 emoji から店舗内と同じ donguri_shop_acorn_icon_20260626.png PNG に統一 (font-size→width 制御へ切替)。play.html PAGE_CACHE_VERSION と同期。
// v1679: シールのおみせの4:3表示を再調整。商品カード/リス/取り置き枠を下げ、吹き出しと取り置き文字を拡大。こもれびや看板はPNG実比率で100%描画を明示。
// v1678: シールのおみせの4:3レイアウトを接地感優先で調整し、debug mode では初回ナレーションを毎回強制再生。
// v1677: タイトル画面 v1676 の clip-path: inset() を撤回し PNG mask 経路を復元 (角丸矩形ではなく紙の有機的なフチを取り戻す)。 mask アライメント値を paper 実測値ベースに更新 (maskX/Y は paper 中心 %、 maskW/H は paper_% ÷ mask PNG の white α 領域 % で補正)。 mask file ↔ panel slot 対応 (1→1, 2→4, 3→2, 4→3) は維持。 CSS は v1675 の mask-image / mask-size / mask-position 経路 (CSS 変数 --card-mask / --mask-x/y/w/h を JS の applyTweaks() から注入) に戻し、 v1676 で追加した data-panel-n="1..4" 用 clip-path inset セレクタ群と --peek-inset-* CSS 変数群を完全削除。 cardMarkup inline style と applyTweaks ループは v1675 から無改変 (生存していた)。 play.html PAGE_CACHE_VERSION と同期。
// v1676: タイトル画面 auto-overlay middle-3 + hover peek の表示範囲を白い紙部分に収める。 panel image の object-fit: fill による縦 stretch と PNG mask の aspect 不整合で paper 領域から overlay がはみ出ていた問題を、 data-panel-n="1..4" ごとの clip-path: inset() で paper 矩形を直接縛る方式に変更。 panel と peek が同じ padded-box (.game-card 内 inset:0) を共有し、 panel の縦 stretch が peek inset% にも同じ比率でかかるので viewport breakpoint 切替でもズレない。 inset の % は panel native PNG の paper bbox 実測値 (alpha 検出ベース)。 PNG mask ロード不要に。 hover peek と auto-overlay middle-3 の両経路で同形に統一。 play.html PAGE_CACHE_VERSION と同期。
// v1675: シール帳 (sticker book three.js) iPad stuck/page-turn 緊急修正。 intro step 永続 await-cover-open バグ + sticker-edit 時 tray が page button を覆う重なり解消 + touch-action: manipulation。 修正ファイル: Prototypes/StickerBookThreeJS/main.js + Prototypes/StickerBookThreeJS/styles.css。 PAGE_CACHE_VERSION 同期不要 (play.html 不変更)。
// v1674: シールのおみせ開店案内に Gemini TTS 音声2本と音声タイミング字幕を追加。play.html PAGE_CACHE_VERSION と同期。
// v1673: ゲームカード タイトル背景の自動オーバーレイ middle-3 化 (peek hover は併存)
// v1672: タイトル画面 acorn badge を bottom-nav 内移設 + card-list 上方拡張 + blur fade + dots 撤去 + scroll-hint 復活
// v1671: LP リロード修正 Round 2 — bfcache + beforeunload キャンセルケースで isNavigating reset 追加 (common/sw-update.js)。 pageshow リスナーで bfcache 復元時に isNavigating=false を強制リセット (back button 経由で LP に戻った後の click 沈黙バグ防止)。 beforeunload/pagehide 時に scheduleNavigationReset() を発火し、 user が 「Stay」 を選んだ場合も 5 秒で stuck 状態を解除。 既存 POINTER_GUARD_MS / RELOAD_DEADLINE_MS / refreshing flag は無改変。
// v1670: LP「すぐあそぶ」 リロードバグ修正 (sw-update.js navigation guard + index.html click retry) — controllerchange/sw-updated 経路の safeReload に isNavigating ガード (beforeunload + pagehide 検知) を追加し、 deploy 直後の navigation 中 reload が pending request をキャンセルして LP に戻る race を遮断。 index.html 「すぐあそぶ」 ボタンに HEAD 生存確認 + 400ms wait の 2 回 retry click handler を追加し、 仮に SW reload と競合しても最終的に play.html 遷移が成立するよう多層防御。 play.html PAGE_CACHE_VERSION と同期。
// v1663: シールのおみせの吹き出しを口が見える右寄り尾のGPT Image 2 PNGへ差し替え、リスへの被りを避ける位置に調整。左右上部ボタンも小型化し上余白を追加。
// v1662: フクロウ博士のなぞなぞ — かずのじゅん問題の数字表示を1600x900ステージ基準の固定サイズにし、4:3/16:9でのサイズ揺れを解消。
// v1661: daily gacha の初回背景/台/本体/閉じカプセル/主要ボタンを head の low-priority preload でも先読みし、外部 script 遅延時の初回順次表示を抑える。
// v1660: daily gacha 画像 preload を setTimeout と requestIdleCallback の早い方で開始し、idle callback 遅延時もタイトル後に先読みを始める。
// v1659: daily gacha の主要画像 preload を decode 完了待ち直列から短間隔バッチ開始へ変更し、初回表示前にリクエストを揃える。
// v1658: シールのおみせのリス吹き出しを GPT Image 2 PNGへ差し替え、商品カード影と看板中央揃えを調整。daily gacha は初回表示前に主要画像を idle preload/decode。
// v1653: ゲームページ内でも、クリア時の `pono-acorns-changed` を拾ってどんぐり獲得モーダルを表示。タイトル戻り時の二重表示も抑止。
// v1650: シール帳 チュートリアル 3 件根治修正 — (1) ちらつき (cover-open 中 card 動く): showStickerTutorialStep で coverOpenAnimation 進行中 (または activeSurface !== "inside") なら .sticker-tutorial-card に .is-await-cover-open を付与し opacity:0 で潜伏、 updateCoverOpen の open 完了ブランチで rAF 1 つ挟んでから外す → 左ページ rect 確定後の fade-in (550ms)。 step.id ではなく coverOpenAnimation truthy を直接見るので将来 setBookSurface 追加にも自動追従、 intro step は coverOpenAnimation null なので影響なし。 (2) place 貼ったシールが消える: canvas click handler に suppressSceneClickAfterStickerDrop (250ms TTL、 cleanupStickerTrayDrag で起動) gate を追加し drop 直後の合成 click を完全 skip。 さらに place phase=complete|try の間は pickInlineStickerTarget / pickEditablePage 両 branch を early-return (refreshPageTemplateTextures 2 回目発火による blank frame 防止)。 addStickerFromTrayToPage を async 化し refreshPageTemplateTextures 前に await loadStickerImage で decode 完了を保証 (microtask 1 つだけ)、 drawAsyncPlacedSticker の .catch で stickerImageCache.delete(assetUrl) を呼び失敗 Promise 永久キャッシュを回避。 (3) tray 全 silhouette: styles.css の body.is-sticker-tutorial-tray-silhouette blanket selector を撤去し per-card class (.is-rarity-super-silhouette) 単独に統一。 target ハイライトも body class gate を外して単独 selector 化。 body class toggle 自体は main.js 側で温存 (他参照箇所への副作用回避)。 過去 commit (a681f99 selectedPlacementId protect / b43544f suppressStickerTrayClick / daa5543 SR ±2 silhouette) を上塗りで完成形に。 Prototypes/StickerBookThreeJS/{main.js, styles.css, index.html (cache-bust v=1650)} + sw.js のみ編集 (play.html PAGE_CACHE_VERSION は他作業中のため意図的に据え置き、 sw.js network-first で十分に新版配信される)。
// v1647: シール帳 チュートリアル中も右上の設定ボタン (⚙) を常時操作可に開放。 styles.css の DEMO/TRY blocklist から #topSettingsButton を除外し、 #topSettingsButton + #zukanSettingsPanel + その内部要素を tutorial-active 中も pointer-events: auto !important で明示的に override。 main.js の settingsTutorialButton ハンドラに tutorial-active guard を追加し、 panel 内 「あそびかた」 二重起動を finishStickerTutorial({markSeen:false}) → startStickerTutorial({manual:true}) で安全に restart 化。 他 step の排他制御 (mode/view/place/move/scale/rotate/ok/page allowlist + #topThemeButton/#albumModeToggle/#topEditButton/#scene/#collectionStickerTrayItems blocklist + ナレ系常時 auto) は完全無改変。 Prototypes/StickerBookThreeJS/{styles.css, main.js, index.html (cache-bust v=1647)} + sw.js のみ編集。
// v1645: シールのおみせのリス店員に、入店/取り置き/交換/不足/所持済みタップごとのポーズ差し替え・吹き出しリアクションを追加。
// v1644: シールのおみせ看板をsafe中央基準へ補正し、リス店員を黒目の白いハイライト強化版へ差し替え。ガチャ未解放メッセージは横長フレーム + 「まわせるよ」文言 + きょうのチャレンジ導線に変更。
// v1643: シール帳 チュートリアル 5 件確定仕様の追い込み修正 — (1) intro (1/10) のみ画面中央モーダル化 (テキストボックス + 黄背景便箋風 + フレーム復活、 card-corner/card-top の compound override も intro 時は中央寄せ優先) し、 step 2 以降は従来通り左ページ直書き。 (2) 左ページ overlay の角度を rotate(-1.6deg) → 0deg に矯正 (実ページ水平面と一致)、 場所は AABB 中央寄せ (08% offset / 84% 幅) を維持してページ左 5% へ飛ぶ問題を構造的に解消。 (3) 操作ボタン群 (あとで/もういちど/やってみる/とばす/つぎ) を 「左ページ下部固定 overlay (--tutorial-leftpage-btn-{x,y,w,h})」 → 「page-block 内 flex 子 (テキスト直下)」 に移動、 帆船イラスト回避と「テキストとボタンが離れない」 を両立。 main.js の leftpage-btn-* CSS 変数書き込みは廃止、 styles.css 側で position: static + mix-blend-mode: normal + isolation: isolate を設定して page-text の multiply 合成がボタンに伝播しない。 (4) DEMO 中 「つぎ」 を forceReady なしでは disable 固定: updateStickerTutorialNextAvailability に isDemoPhase 強制 disable + 音声 ended で DEMO 中なら forceReady を立てない、 DEMO→TRY 強制ループを確立。 DEMO 完了で textTry に差し替わり、 TRY 完了 (advanceOn) で notifyStickerTutorialAction が forceReady → pulse。 (5) place TRY 完了演出: stickerTutorialTargetRect の trayItems 分岐に complete phase 専用フォールバックを追加し spotlight を 「貼ったシール」 に再アンカー、 setStickerTutorialPhase の complete 突入時に textTry を「ぺったん！\nじょうずに はれたね」 に差し替え、 stickerTutorialState.completeStartedAt + place 専用 1500ms min-hold gate で 「貼った直後に消える」 を解消。 stale demo timer 防止のため finishStickerTutorialDemoToTry に expectedStep 引数を追加し、 全 8 callsite (mode/place/move/scale/rotate/ok/page/view) を startStep キャプチャ経由に置換。 Prototypes/StickerBookThreeJS/{main.js, styles.css, index.html (cache-bust v=1643 + page-block ラッパ)} + play.html (PAGE_CACHE_VERSION 1643) + sw.js のみ編集、 過去 commit (715c892 / 4ad74da / 457eb29 / daa5543 / e09803d / 2bad382) は無破壊で上塗り。
// v1641: daily gacha locked message uses the QuizLand wooden frame, removes the target emoji, and points to finishing today's challenge.
// v1640: シール帳 チュートリアル 5 件統合修正 — (1) テキスト boxless 化 + ペン書き立体感: .sticker-tutorial-page-text の便箋風 background/border-radius/box-shadow/inset border を全廃、 mix-blend-mode: multiply + text-shadow 凹凸 + rotate(-1.6deg) で「本に直書きしたメモ」 へ退行 (フォントは Zen Maru Gothic 維持、 PWA キャッシュ競合回避のため外部 Google Fonts 追加なし)。 (2) 操作ボタン群 (あとで/もういちど/やってみる/とばす/つぎ) を 「画面下端中央固定」 → 「左ページ下部 overlay (テキストの真下)」 に移動: --tutorial-leftpage-btn-{x,y,w,h} CSS 変数を main.js から注入し、 dashed border + 互い違い rotate で「貼り付けたスタンプ」 感、 「つぎ」 のみ山吹色 solid + min-width 92px で主動線強調。 ページめくり時もテキスト+ボタンが一体追従。 (3) place step TRY UI 修正: 11.4s で phase=try になっても ghost が 17.6s keyframe 継続 + hand keyframe 残骸 で 「やって みよう！」 + spotlight が霞んでいた問題を、 phase-try/complete で .sticker-tutorial-ghost を display:none !important + place step hand animation を停止して解消。 (4) シール ✓ 化け修正: stickerTutorialPickSticker(phase) を引数化し、 DEMO 時は STICKER_TUTORIAL_PICK_STICKER_IDS (蝶々) 固定、 TRY 時のみ requestedPasteStickerId 優先に分離。 ensureStickerTutorialEditableSticker / firstVisibleStickerAssetForTutorial / addStickerFromTutorialDemoToPage の fallback 3 箇所 (旧 stickerOptions[0] = quizland_good_stamp = ✓) を pick 経由に置換し、 「DEMO で ✓ がお手本にハイライト」 「fallback auto-place が ✓」 の素材ズレを根本回避。 (5) per-step 排他制御: DEMO/TRY 中に全 interactive 要素 (#scene/#topEditButton/#topThemeButton/#collectionStickerTrayItems/#inlineStickerScale/Rotation/Ok/Delete/Close/#bookNextPage/PrevPage/#albumModeToggle/#topSettingsButton) を pointer-events: none で物理ブロックし、 step ごとの allowlist (mode/view → topEditButton、 place → tray+scene、 move → scene、 scale → inlineStickerScale、 rotate → inlineStickerRotation、 ok → inlineStickerOk、 page → bookNextPage) のみ auto に解放。 ナレ系ボタン (Skip/Replay/DemoDo/StepSkip/Next/StartButton/StartSkip) は phase/step 問わず常時 auto 強制で 「とばす」 救済が確実に押せる。 setStickerTutorialPhase に scheduleStickerTutorialLayout + tray silhouette 再計算を追加し phase 切替時の rect/strong 表示忘れも防止。 Prototypes/StickerBookThreeJS/styles.css + main.js + index.html (cache-bust v=1640) + play.html (PAGE_CACHE_VERSION 1640) + sw.js のみ編集。 過去 commit (715c892 便箋導入 / 4ad74da 自動配置削除 / 457eb29 pasteId 動的化 / daa5543 SR silhouette / e09803d 操作型化) は逆方向干渉を避ける「上塗り」 のみで原本ロジック無破壊。
// v1626: タイトル画面の右下メニュー、えほんのあいことば、きょうのチャレンジを生成PNG土台へ差し替え。
// v1624: シール帳チュートリアル place step 2 件改善 — (1) tray scroll の base 位置を targetScroll より大きく左にプリセット (desiredTravel = min(maxScroll, max(700px, clientWidth*0.9))) し、 「右から大きく流れて蝶々で止まる」 演出に。 旧仕様は base = 現在の scrollLeft (通常 0) で、 蝶々が tray 前方にあると totalDistance ≒ 0-420px しかなく 「全然スライドしてない」 印象だった。 duration 4500ms 据置 = CSS keyframe 0-26% hand swipe 同期維持。 (2) open 切替 11300ms → 13350ms (75.85% = drop press) に遅延、 シール配置 11600ms → 13500ms (76.71%) に同期。 旧 open は hover 直前 (64.20%) で発火していたため、 hover→to の 1.50s 真下降下の最中に手だけ開く不整合 (「下がりながら手を開いてる」) が出ていた。 drop press と同期で 「ぐっ → 開く → release lift」 の自然な所作に整える。 Prototypes/StickerBookThreeJS/main.js のみ編集、 styles.css keyframe / ghost / 他 step (intro/mode/find/scale/rotate/ok/page/view/final) / grip 切替 8400ms / hand 消去・再出現 全て無改変。
// v1623: Donguri shop switches to twice-daily rotation with one guaranteed new slot and one reservation.
// v1622: Shop sign asset now has baked text; foreground counter regenerated lower and cuter.
// v1621: シール帳チュートリアル 5 件統合修正 — (1) find 冒頭 中央→左 ワープ解消 (styles.css L1885 30.5% → 32.5%、 88ms → 440ms slower)、 (2) ghost を hand と完全同期 (place phase 4 stop に per-stop animation-timing-function 追加、 styles.css L1991/1998/2005/2012)、 (3) hover→to 降下を速く (styles.css L1942/1998 56.5% → 64.5%、 hover→to 2.90s → 1.50s に短縮、 pickup→hover は逆に 1.03s → 2.44s 延長で「じっくり持っていく」 強化)、 (4) scale slider 指位置を thumb 追従化 (main.js L4543-4546 を rotate 分岐と同じ trackPad 補正パターン + 実 scale 値マッピングに置換、 commit 9a23803 で rotate のみ修正された差分を解消)、 (5) rotate slider 初期位置を value=0 thumb 中央 (50%) に補正 (main.js L4548-4555、 0.43/0.58 マジック数値を baseRotation/rightRotation 実値マッピングに置換)。 b3efa06 (slider transform)、 9a23803 (place 直行 + rotate 補正パターン)、 0bbd082 (find 2 回スワイプ)、 4189da8 (mode 3 連) の既存設計は全て温存。 アニメ duration 17.6s / 5.2s / 9.3s 不変、 keyframe stop 数 不変、 座標 CSS var 名 全て不変。 Prototypes/StickerBookThreeJS/styles.css + main.js のみ編集。
// v1620: タイトル画面の共通ボタンは今回押下表現なし。active の沈み込み・下ナビ pressed 状態を無効化。
// v1618: おみせのリス店員を大きい黒目版に変更し、前景テーブルをさらに下げ、こもれびや看板を濃い木彫り調へ差し替え。
// v1617: タイトル画面を2カラム整理。えほんのあいことば導線をロゴ下へ移動し、4項目メニューと設定内こうしん入口を追加。
// v1615: おみせの前景テーブルを下げ、リス店員を別ポーズに差し替えてテーブル背面レイヤーへ分離。
// v1614: おみせの「こうかんする」カード、リス店員の接地位置、こもれびや看板ロゴを調整。
// v1613: もりのおみせ こもれびや の吊り看板と「かう」押下カード素材を配信キャッシュへ反映。
// v1612: シール帳チュートリアル mode step の approach 中 hand 翻りを解消 (open のまま位置のみ移動、 press swap と同フレームで反転)。 find phase の grip 切替を 7000ms → 8400ms へ遅延し、 蝶々上で静止した直後に grip するよう調整。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集。
// v1611: もりのおみせ こもれびや の吊り看板を生成・実装し、背景は外側いっぱい、操作UIは16:9 safe内へ分離。
// v1610: daily gacha frame is true 16:9, center message uses generated speech-window asset, and shop button icon/text balance is adjusted.
// v1609: シールのおみせの「かう」焼き込みカードに押下状態を追加し、pointer/keyboard 中だけ pressed 背景へ切替。
// v1608: シールのおみせを16:9ステージに固定し、生成UI画像を縦横比維持で表示。商品画像の切れ、価格位置、かう文字焼き込みカードを調整。
// v1607: シールのおみせ UI を生成素材の背景/カウンター/リス店員/商品カードへ差し替え、商品イラストを大きめに見せるレイアウトへ更新。
// v1606: daily gacha shop button uses single-color icon style matching top/sticker buttons; sync play.html PAGE_CACHE_VERSION.
// v1603: シール帳チュートリアル place step 自然化 — find phase の micro-vibration を廃止し、3 つのシールを左→中央→右→選択の短い滞在で見比べる動きへ変更。place phase は右ページ内に中継点を clamp し、画面外・反対方向へ飛ぶ大振りをやめて、貼る位置の近くで小さく迷ってから release する流れに変更。Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集。
// v1601: シール帳 step 1 (mode) 「open のまま押している」 バグ修正 — (A) updateStickerTutorialDemo の hand リセット条件を強化: 旧仕様は `step?.id === "mode" ? "open" : handKey` で mode step である限り、 Phase 2 (press) 開始後も scheduleStickerTutorialLayout() が呼ばれるたびに hand を open に再上書きしていた。 新仕様は body classList の `is-sticker-tutorial-mode-rest` / `is-sticker-tutorial-mode-approach` を gate に追加し、 Phase 2 以降は step.hand="point" を尊重するように修正。 (B) startStickerTutorialModeDemo の 3 回の press タイマーで、 triggerStickerTutorialEditButtonPress 呼び出し直前に setStickerTutorialHandKey("point") を再保証 (補強案)、 タイミング上書きへの defensive layer を追加。 Prototypes/StickerBookThreeJS/main.js のみ変更、 styles.css / keyframe / 他 step / 他 hand 切替ロジック 全て無改変。
// v1600: シール帳チュートリアル find phase 2 回スワイプ完全復活 — @keyframes stickerTutorialFindPlaceHand 0-30% を 6 stop (0/12/13/14.5/15.5/26/27/29/30 の 9 stop) に再構成。 v1598/v1599 で 2 回目スワイプを削除した結果、 12.6-26% (約 2.36s) hand 完全不在になり 「2 回目が消えた + 消してほしい区間が空白で残った」 ユーザー指摘を解消。 新仕様: 0-12% 1 回目スワイプ (scroll-from→scroll-to) → 13% fade out → 14.5% scroll-from へ不可視ワープ → 15.5% fade in → 15.5-26% 2 回目スワイプ → 27% fade out → 29% demo-from 座標 + 縦向き transform へ不可視ワープ → 30% find phase 開始 fade in (次 30.5% findWander1 へ連続)。 30% 以降の find phase / 50% 以降の place phase は完全据置。 アニメ全体 17.6s 維持、 sw.js のみ version bump。 Prototypes/StickerBookThreeJS/styles.css 1855-1925 のみ編集、 main.js / ghost keyframe / 他ファイル無変更。
// v1598: daily gacha fixed action buttons + refreshed generated UI assets — play.html のガチャ内 `トップ`/`おみせ` を左上固定横並びに整理し、今日のチャレンジをガチャ導線と同じ金縁プレート画像 `assets/ui/daily_challenge_banner_gacha_style_20260625.png` に差し替え。おみせボタンもトップボタンの木枠/紙面質感に寄せた GPT Image 2 生成版 `assets/ui/daily_gacha_shop_button_acorn_v2_20260625.png` へ更新、旧右側逃がし CSS を削除。
// v1595: countdown bubble 重複解消 (1 つに統合 + ハリネズミ右下に再配置 + tail 左向き) — play.html ショップ画面で同じ「ばんごはんの あと かわるよ」 が #donguriShopBubble (hedgehog 横) と #donguriShopCountdown (中央上 plate) の 2 箇所に並列表示されていた問題を解消。 (1) DOM: <div class="donguri-shop-v2-countdown" id="donguriShopCountdown" hidden> を削除 (2) CSS: .donguri-shop-v2-countdown rule ブロック全削除、 .donguri-shop-v2-bubble を hedgehog (left:4%, bottom:6%, width:20%) の右下隣 (left:24%, bottom:10%, max-width:32%) に再配置、 ::after tail を bottom 下向き→ left 左向き (border-right 16px solid #fffbe8 + drop-shadow -2px 0 0 #b88600) に変更 (3) JS: renderShopCatalog の countEl = getElementById('donguriShopCountdown') 取得と countEl.textContent / countEl.hidden=false の代入を削除、 countdown text は bubbleEl 1 箇所に集約。 v1594 で staged 済の 4 件 (hedgehog 白枠 / もっとまわすよ slide 除去 / shop からガチャ機削除 / カード縮小+浮かせ+「あとN」 削除) は全て保持、 既存ガチャ機能 / レバー演出 / 5 ゲーム / common/* / 底部ナビ / PonoDebugMode 無改変。
// v1596: シール帳チュートリアル 自然化 — (A) find phase スライド中 (0-28%) hand 横向き固定 + 30-50% に find phase 圧縮、 (B) tray multi-active decoy を蝶々の DOM 近接 (±1/±2/±3) に変更、 (C) place phase 各 keyframe に cubic-bezier 個別付与 (Phase 1 応急対応)、 (D) wander 振り幅係数を 1.20→1.40 / 0.30→0.48 (符号反転 = decoy 側へ大きく寄る) / 0.20→0.24 に拡大 = decoy が近接化したことに連動して「うっかり見に行ってやっぱり蝶々に戻る」 演出を視覚明確化。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ変更。
// v1595a: きょうのチャレンジ + ガチャおみせボタン画像化 — play.html の daily quest banner を GPT Image 2 生成プレート `assets/ui/daily_challenge_banner_generated_20260625.png` 背景に変更し、下段はゲーム名だけを動的表示 + 横幅 fit。daily gacha shop link は GPT Image 2 生成の木枠/ベタ塗りお店シルエット `assets/ui/daily_gacha_shop_button_acorn_20260625.png` へ変更。バナー bottom を gacha entry から離して重なり回避、PAGE_CACHE_VERSION も 1595 に同期。

// v1594: shop layout 仕上げ (hedgehog 背景透過 + ガチャ機削除 + カード縮小+浮かせ + あとN削除 + 吹き出しスライド消去) — play.html のみ編集。 (1) .donguri-shop-v2-hedgehog の filter drop-shadow を除去 (partner_harinezumi.webp が RGB 不透明で四角影が出ていた)、 img に mix-blend-mode: multiply + aspect-ratio: auto + background: transparent を追加してクリーム四角を背景に同化。 (2) .daily-gacha-panel から transform transition を除去 (step 0→1 で 中央 translateX(-50%) → 右固定 へスライドしていた、 最初から右側固定で出す)。 (3) shop overlay 内の <div class="donguri-shop-v2-machine"> + 内部 <img daily_gacha_machine.png> を削除 (ガチャ機は #dailyGachaModal 専用)。 CSS rule は orphan として残置 (影響なし)。 (4) カードレイアウト: .donguri-shop-v2-slots bottom 26%→14% / right 4%→6% (テーブル面に近づける + 削除した gacha 機の余裕)、 .donguri-shop-v2-slot max-width 30%→24% / padding 6→4 / box-shadow を 2 段 drop-shadow に強化 (0 8px 16px + 0 2px 4px) で「テーブルの上に浮いてる」 感、 .donguri-shop-v2-thumb max-height 140→100。 (5) renderShopCatalog の canPurchase=false 分岐で actionHtml='' (button 自体を出さない silent disabled) — 「あと N 🌰」 / 「かえないよ」 テキストを廃止、 50 🌰 値段表示は維持。 既存 daily-gacha (machine / lever / 演出) / grantDailyGachaSticker / sign-click / 底部ナビ / 5 ゲーム / PonoDebugMode / PonoDailyQuest / PonoDonguriShop logic / v1590 経済 / v1591 layout / v1592 carve-out / v1593 reveal プレート 全て無改変。
// v1593: ガチャ reveal の名前プレートに 「やったね！」 デフォルトテキスト (空文字で縦潰れしていた表示の修正) — play.html setDailyGachaReward 内で #dailyGachaRewardName を空文字+hidden=true から 'やったね！'+hidden=false に変更、 茶色プレート枠 (daily_gacha_super_name_plate_luxury.png) が空っぽで縦潰れする問題を解消。 v1575 ユーザー指示の「シール名 (機械生成名) は出さない」 を維持しつつ「reveal で中央寄せに 『やったね！』」 を実現。 sticker.name データは不変、 resetDailyGachaModal の素状態 (空文字+hidden) は維持。
// v1592: MVP flag どんぐりのみ carve-out — common/mvp-flags.js の PONO_MVP_NO_REWARDS を元の true に戻し、 新フラグ PONO_MVP_ENABLE_ACORNS = true を追加。 common/acorns.js の add() / addDaily() 冒頭 gate を `if (PONO_MVP_NO_REWARDS && !PONO_MVP_ENABLE_ACORNS) return 0;` に書き換えてどんぐりだけ通す。 アクアリウム生き物解錠 (achievements) / 部屋アイテム (achievements + stickers マイルストーン) / ログインボーナスシール (stickers.checkDailyLogin) は再び block 状態に復元。 既存ガチャ/ショップの PonoGameStickers.grant は flag 経由しないので引き続き active。
// v1591: donguri shop layout fix (hedgehog 縮小 + cards 詰め + countdown 移動 + 残高バッジ shop中hide) — play.html .donguri-shop-v2-* CSS のみ調整 (logic 無改変)。 (A) hedgehog width 28%→20% / max 260→170 / bottom 14%→6% / left 5%→4% (B) slots row left 16%→26% / bottom 22%→26%、 slot padding 10/8/10→6/6/6 / gap 6→4、 thumb max-height 140px、 thumb-fallback 44→34、 price 15→13、 buy font 15→14 (min-height 44 維持) (C) title text-shadow 4-direction white plate 強化 + z-index 6 で hedgehog より前 (D) countdown bubble を bottom:4% → top:62px (title 直下) + max-width 60% で hamiでし解消、 z-index 5 (E) .acorn-balance-badge.is-occluded { display:none } + showShop/hideShop で classList toggle (shop 内に同等 balance pill があるため重複解消) (F) bubble max-width 56→44 / font 17→14 / padding 10/16→6/12。 既存 v1588 selector 名と spec 一致 (.donguri-shop-v2-hedgehog / -slots / -slot / -title / -countdown / -bubble)、 #acornBalanceBadge も既存 ID 一致。 daily-gacha / openDailyGacha / PonoDebugMode / PonoDonguriShop / 5 ゲーム / 底部ナビ無改変
// v1567: Revert 底部ナビ 4ボタン化 + おしらせボタン削除 — フクロウ博士「おしらせ」 ボタン + #newsModal + 5 ボタン bottom-nav (help/official/news/stickers/settings) を完全復元、 grid-template-columns repeat(5,1fr) / .bn-item flex 20% / bottom_nav_group_5_*.png 参照に戻し、 BOTTOM_NAV_PRESS_AREAS を 5 セル構成に戻す。 a991e0d で追加された 4 ボタン PNG は削除済。 ユーザー要請による完全 revert
// v1566: daily-challenge / daily-quest-banner 完全 rollback (既存 daily-gacha-entry と重複のため)
// v1565: daily-challenge CANDIDATES を MVP 5 に縮小 (maze/quizland/bento/puzzle/oto のみ、 breakout/starparodier/undersea-cave を除外)
// v1564: daily challenge + gacha 追加 (cross-review 反映: Promise.catch、 disable race 修正、 3歳向け文言簡素化、 setTimeout 1200→2000、 claim 戻り値伝播、 prefers-reduced-motion で flash/vibrate skip)
// v1554: お家の方へ タグラインを 「安心・安全」 → 「あんしん・あんぜん」 ひらがな化 (「ココが育つ！」 ステッカー alpha 透過版は素材未提供のため raw 版維持)
// v1551: Bento book tier adds nori face/shape parts and furikake decoration assets.
// v1550: LP secret-word memo adds a collapsible list of book-unlocked benefits in title-menu order.
// v1549: LP 5 fixes — お家の方へ詳細化 (個人情報の入力なし) / ひみつのことば 文頭 ※ 追加 / シールアルバム ここが育つ ロゴ画像化 / Amazon評価に日付 (2026年6月24日現在) / ハードカバー文章 1文ずつ改行
// v1548: Daily gacha applies the remaining silver rare stickers and brightens the gold capsule.
// v1547: Tier lock copy now routes free users to the book secret word and book users to the app.
// v1546: Bento free tier starts in simple self-made mode only and no longer falls back to all NPC requesters.
// v1543: play.html title bottom nav right edge aligns to the actual game plate right edge, accounting for card-list shadow padding.
// v1542: ゲーム詳細モーダル 「ここが そだつ」 ラベルをテキスト → 画像表示 (assets/ui/growth_heading_pop_sticker_raw.png 「ココが育つ！」 ポップステッカー) に復元 — 前セッションで stash 退避されていた CSS/HTML 差し替えを再適用、 CSS で width clamp + translateY(-24%) で上下余白を crop
// v1539: ゲーム詳細モーダルの一番上に各ゲームの 「ここがそだつ」 (growth) を追加 — GAME_MODAL_DATA に growth フィールド追加、 LP カードの pc-growth と同じ文言、 ゲームの accent 色で borders + b タグ強調
// v1537: ゲーム詳細モーダル スクロールチェーン修正 — overscroll-behavior:contain でモーダル内スクロールが背景 LP に漏れないように、 body scroll lock も併用
// v1535: ゲーム詳細モーダル画像のチルト (rotate) と translateX を削除して画像を真っ直ぐに表示、 縮小+左右交互配置はキープ
// v1498: play.html に capture.js Hookup 追加 (ガチャモーダルキャプチャ対応)
// v1495: LP play-cards maze/bento ビジュアルをモーダル内タイトル画面画像に差し替え
// v1494: Daily gacha reveal smooths capsule drop, separates note bubbles, centers plate text, and raises open shells.
// v1493: LP hero labels (HANDOFF 02) + Coming Soon banner (HANDOFF 01 latest Pono LP Brand Kit handoff).
// v1492: Daily gacha super reveal uses the user-cleaned alpha luxury name plate and aligns play cache busting.
// v1489: Daily gacha super reveal focuses the sticker, uses a generated luxury name plate, and keeps capsule shells fully visible.
// v1488: Daily gacha prompts use larger start text, side speech bubbles, bigger reward sticker, and separated capsule shells.
// v1487: Daily gacha reveal layout makes the reward sticker larger and moves the play note to the top.
// v1486: Daily gacha super rare capsule uses dedicated platinum closed/open assets.
// v1483: Daily gacha gold capsule assets refreshed and rarity/color weights made configurable.
// v1482: Daily gacha super-rare reveal gets a dedicated luxurious fanfare SFX.
// v1479: coming-soon を Stitch 案 B (Sticker Banner + 詳細モーダル) に置換 — 旧 .coming-soon-app (phone モック) 完全削除、 Mochiy Pop One フォント追加、 タップ展開モーダル + Esc/オーバーレイ閉じ + focus トラップ
// v1478: StickerBookThreeJS prototype assets bypass browser cache to avoid stale zukan/book modules.
// v1469: LP .announce を Stitch 完成版 (coming-soon-app teaser) に置換 — phone モックアップ + ポノ dance_hooray + chip 6 種 + halo glow + reduced-motion
// v1468: StickerBook cover adds binder spine, rings, and a thicker back cover plate.
// v1467: Daily gacha adds bubbles_v1 to the capsule opening moment.
// v1465: Bottom nav swaps the top button to an official-site button using user-cleaned alpha sprites.
// v1464: Bento simple mode requires OK to confirm box previews, clarifies tap-to-select copy, aligns side tabs, and makes cup priority start cup movement instead of editor.
// v1463: Daily gacha hides the close X, moves reveal actions to the top right, and opens the tray landing mask.
// v1462: StickerBook zukan page type settings and printed page margins.
// v1461: Bento simple mode treats Napolitan as a cup-side okazu, makes cups easy to reselect, crops complete-screen characters to bust shots, and keeps continue in simple mode.
// v1460: Bento tutorial frees nori choices, keeps guided targets active, refreshes size-1/tomato narration, and fixes complete-detail close guidance layout.
// v1459: LP a11y focus/reduced-motion/isolation fixes.
// v1458: LP 派手化 — announce + play-cards + herob-cta に統一波長 (4.8s shimmer / 2.4s breath / .42s overshoot) で「ぴょこ・ぴか・きら」演出。 5 色個別 glow / 紙吹雪 / sparkle / arrow 弾み。 既存 announce/bookcheer アクセントは維持。
// v1457: Daily gacha reveal gets generated home buttons, returns to the game top, and smooths the tray mask/background glow.
// v1456: StickerBook zukan six-item index and wider detail template.
// v1455: LP .announce / .bookcheer にアクセントモーション追加 (hover bounce / 弾けるバッジ / シール peel / 黄色ハイライト wiggle / 初回ポヨン入り)
// v1454: Bento tutorial locks guided-only items and refreshes okazu/favorite narration with Gemini 3.1 TTS.
// v1453: Daily gacha masks the capsule behind the outlet lip and uses sticker/home image buttons on reveal.
// v1452: StickerBook zukan per-card text tuning and wider field labels.
// v1450: Align app cache after daily gacha cue/mask polish and Bento narration update.
// v1449: Lower Bento opening narration energy after intro.
// v1448: Daily gacha aligns the outlet mask to the opening, unifies cue arrow color, and moves the idle guide hand/label apart.
// v1447: Speed up Bento opening narration with Gemini TTS.
// v1446: Regenerate Bento opening narration with unified calm Gemini TTS.
// v1445: Daily gacha guide hand now grips the lever's right end while turning, and capsule exit is clipped by an outlet mask.
// v1444: Regenerate Bento opening narration with Gemini 3.1 TTS.
// v1440: Daily gacha makes the turn cue a high-contrast animated arrow, moves the guide hand around the lever, and repositions the capsule drop to the outlet.
// v1439: StickerBook zukan page text positions can be tuned in local preview.
// v1438: Daily gacha uses a static open-hand guide, a blinking turn cue, one-full-turn lever input, and a smoother smaller capsule drop.
// v1437: Bento shop opening/request narration is wired, and title adds a tap-to-place simple bento mode.
// v1436: LP に 2 セクション追加 — Hero B 直後の「お知らせ (アプリ発売告知、 大々的)」と、 book-aside 直後の「ハードカバー応援 (控えめ)」。 既存 hero/play-cards/sticker-extra/book-aside/video-section は無改変、 純粋追加。 CSS prefix announce-* / bookcheer-* を追加。
// v1435: Daily gacha removes the side button/meter panel, centers the machine, and adds a hand-guided direct lever spin.
// v1433: Daily gacha raises the machine, uses stronger 3-step outlet zooms, and retunes the capsule drop to exit smaller and settle on the lip.
// v1432: Bento NPC position editor adds separate scaleX/scaleY controls and matches staff preview transform origin to runtime.
// v1431: Daily gacha final zoom now targets the outlet instead of drifting left, and the capsule exit uses more bounce frames while staying in the outlet area.
// v1430: Bento Pono wave frames crop lower body to match idle face scale.
// v1428: Daily gacha final notch no longer repeats capsule-toy SFX 01, and the opened sticker reveal layers a longer magic sparkle over the short sparkle.
// v1427: Daily gacha machine SFX switched to the new capsule-toy sounds — 01 plays for each lever notch, 02 plays only when the capsule exits.
// v1426: Daily gacha pacing retuned — 3 notches stay, lever drag now has heavier pull-to-notch feedback, and the capsule drop/closeup/open reveal keeps more suspense after the final turn.
// v1421: Daily gacha uses imported Suno-style audio: one consistent short low drum-roll turn SFX with staged gain/rate, a separate grand reveal SFX, and a subtle modal bed loop with mute/visibility handling.
// v1420: Daily gacha luxury light staging — the modal starts darker, each lever notch increases backlight/rays/sparkles, the final boom blooms to a bright gold stage, and the Pono-badge open capsule is the primary/default open view.
// v1419: Daily gacha repeat flow — lever visual center moved onto the machine axle, staged zoom now stays centered on the lever/machine, and the opened capsule view adds a "もういっかい" action so the gacha can be run repeatedly without the daily gate.
// v1417: play.html にアプリ版限定のデイリーシールガチャを追加。トップ画面から1日1回、レバーをドラッグして回し、カプセル落下→開封→既存 PonoGameStickers.grant(show:false) でシール付与する演出。assets/ui/gacha/ に alpha 済み本体・レバー・カプセル素材を追加。
// v1414: Bento tutorial UI fixes — (1) ナレ再生中の tutorialAdvance を queue 化して voice ended (or 8s timeout) まで遅延発火、 ユーザーが OK ボタン等を急いで押しても声が途中で切れない (cup-edit onEnded auto-advance は ended 発火時点で audio.ended=true なので queue されずそのまま通過、 既存挙動を保持)。 (2) せってい (⚙ tut-settings-btn) と おきにいり (⭐ fav-header-btn) の z-index を 8 → 9500 に底上げして game-title (9400) より常に前面に。 settings ボタンは背景 rgba 0.6 → 0.9 + box-shadow 追加で背後 UI の透けも抑制。
// v1413: LP ゲームカード5枚 (bento/maze/oto/puzzle/quizland) のビジュアル画像を play.html メニュー用 thumb_*.webp に統一 (pc-v-* の background-image url() を assets/ui/thumb_bento.webp / thumb_maze.webp / thumb_oto.webp / thumb_puzzle.webp / thumb_quizland_owl.webp に差し替え)。
// v1411: LP play-cards review fixes — oto card image swapped from title_logo.png (had baked logo text, duplicated h3 title) to title_back.jpg (no text), oto removed from background-size:contain rule (cover works for opaque background). Card scale relaxed 0.92->0.96 to reduce "shrunk" appearance while keeping scatter feel. bento background-position right 8% center to balance the square pono illustration on a 16/9 card.
// v1404: LP comprehensive copy refresh per morito — herob lead → "3〜6さい に おすすめ", titles bento/maze hiragana-ized, bubble copy retuned to keyword nouns (べんとう やさん / もり たんけん / ♪ おと あそび / みんなで パズル / なぞなぞ クイズ), modal detail rewritten for bento(customer scene)/maze(rescue lost animals)/oto(free+rhythm both modes)/puzzle(with partner animals), divider added between sticker-extra and book-aside with bolder book-aside styling.
// v1399: Bento tutorial UI: (1) 3 色グループモーダル (#sk-intro) のローテーション文字を撲滅し『あか・きいろ・みどりを ひとつずつ いれてみよう』 を常時大きめに固定表示 (font-size clamp(1.1rem, 2vw, 1.4rem)、 sk_intro_01-05 音声の連続再生は維持)、 (2) カップサイズツールバー (panel mode) の ↓↑ レイヤー切替ボタンを .free-layer-buttons でグループ化して flex-wrap 折り返し時も同段維持 (data-free-icon 属性はボタン側に残るためチュートリアル mark 経路は無事)、 (3) small-cup-food step のプチトマトバブルを tutorialPositionBubbleBeside でパレット要素近傍に動的配置 (画面左端固定で遠すぎる症状を解消)、 (4) tutorialOnCompleteDetailShown の「ともだちが よろこぶ...」 バブルを #complete-detail-page モーダル近傍に動的配置。
// v1396: capture.js html2canvas onclone を強化して bento の上層 DOM (⚙ tut-settings-btn / ⭐ fav-header-btn 等の小さな emoji ボタン) のぼけを解消。 clonedDoc 限定で box-shadow / filter を全要素 none 化し、 font-size ≤ 28px の単独 emoji ボタン (button/span で textContent <=2 文字) を 1.4x に拡大 + text-rendering:geometricPrecision を強制。 実 DOM 無触り、 既存 ellipsis 修正 (v1390) を保持。 検証: 実 PNG view loop で gear/star icon の中央穴・輪郭が鮮明化 (before: 形状が崩れ box-shadow が滲んだ blob、 after: 中央 dot とギア歯 + 星 outline 明瞭)。 せってい 木製 PNG ボタン (background-image) は元々鮮明で回帰なし。 Playwright capture 23 pass + 5 skip (T18 oto WebGL fixme 残置)。
// v1395: oto capture fix (true root cause) — html2canvas onclone で .stage の centering transform を解除して viewport にフィットさせる (v1392 の document.body target + viewport overrides だけでは html2canvas が translate(-50%,-50%) を展開できず stage が右下に押し込まれる症状が残っていた)。
// v1394: Oto rhythm tutorial sample hand appears early in a ready pose before the tap, stage-clear panel is smaller, rival speech bubble sits higher, and result text gets heavier faux-bold styling.

// v1391: LP play-cards bubble copy refined — "ゆうき そだつ" → "たんけん！" / "リズム なる" → "♪ おとあそび" / "じっくり あそぶ" → "えを かんせい！" / "あたま つかう" → "ひらめき ピン！" / "いま にんき！" → "いまにんき！"; natural Japanese phrasing per morito feedback.

// v1389: Bento tutorial cup-edit demo に layer-down / layer-up 矢印ボタン青枠 mark を追加 (basic_tut_10.mp3 「矢印で前後ろも変わるよ」 ナレに対応する UI 強調が抜けていた)。 tutorialLayerUpButtonEl ヘルパー新設 (tutorialLayerDownButtonEl と対称)。

// v1388: capture.js overlay 自身が html2canvas で焼き込まれていたバグを修正 (data-capture-hide 属性 + shoot 中 visibility:hidden の 2 重防御)。 bento / puzzle / quizland / oto の html2canvas ignoreElements が overlay UI を検出できるようになり、 さらに build 中は overlay を非描画にすることで属性検出が失敗しても焼き込みを防ぐ。

// v1383: Bento tutorial okazu-more step fix - メニューちらつき撲滅 (firstRender ガードで setFreeGuideStep + renderFreeLayoutControls() を 1 回のみ実行、 palette MutationObserver との無限再帰ループを遮断) + 「小さい おかずへ」 ボタンを正しく mark target (tutorialOkazuMoreAdvanceButton ヘルパー新設、 .free-action-row button.primary でラベル一致取得 → tutorialCompleteButton にフォールバック) + バブル/setSpeech/PonoCallout/modeLabel note を「おかずOK」 → 「小さい おかずへ」 表記に統一 (実 UI ボタンとの不一致解消)。

// v1372: LP play-cards each get a game-specific tape color (bento=tomato red / maze=night blue / oto=sky blue / puzzle=mint green / quizland=royal purple) and a click-to-open game detail modal with 2-3 screenshots, detail copy, and CTA. New CSS .game-modal / .game-card-clickable rules + GAME_MODAL_DATA object.

// v1365: Oto rhythm tutorial keeps the black cover through scene changes, rounds the difficulty spotlight, and blocks early rhythm-menu taps from leaking into the underlying UI.

// v1362: LP hero bg labels concentrated around CTA (left/right side bars at x 5-22% / 78-95%, y 50-90%) — avoids logo (top) + center text band; free copy changed from "きほんの あそびは いま みんなに ひらいてるよ" to "むりょうで あそべるよ！" per morito. bg_soft_playmat.webp / @2x rebuilt from washi-labels source PNG (deterministic seed 20260619); center clear-zone expanded to x 25-75% × y 0-100% (entire center column) — intrusion 0.

// v1360: LP hero bg labels resized to 0.55x — labels were too large per morito feedback. Same positions, same rotations, smaller scale for better balance with center title. bg_soft_playmat.webp (1920x1080) + @2x (3840x2160) rebuilt from washi-labels source PNG with deterministic seed 20260619; center clear-zone (25-75% x 30-70%) verified empty.

// v1358: LP hero redesign v2 — replaced brand_logo with all-in-one (Pono + wordmark + kicker baked in), replaced background with scattered category labels (chips moved to background, kicker removed from html); .herob-kicker/.herob-chips/.herob-logo-wrap rules removed. brand_logo.png 1595x475 → 1715x500. .herob-title-img max-width 720→800px (max-width:min(800px,92vw)). .herob padding-top/bottom unified to 24px (mobile) / 36px (PC) so scattered labels in bg corners are not cropped.

// v1356: Oto rhythm tutorial starts from a slower black fade and waits longer before the difficulty explanation.

// v1354: capture.js bento bugfix — target switched to document.body to include #sk-intro / #npc-intro / #npc-reaction / #bento-delivery body-level overlay scenes (was #app which excluded them, causing NPC scenes to capture as empty bento box). Same fix applied to puzzle (.page-wrapper → document.body) so #title-screen / #title-guide-choice / #puzzle-opening / #tut-dim / #tut-bubble and main.js body-appended coach/overlay/prompt nodes are included. quizland #stage / oto #app unchanged (no body-sibling overlays). Existing ignoreElements ([data-capture-hide]) preserved.
// v1353: Puzzle basic tutorial timing fixes (3 fixes) — (1) 「おてほんをみてね」 demo banner now syncs to basic_tut_01 (idx0) play event at ~3800ms (anchored to the phrase 「お手本を見てね」 in the opening narration) instead of firing too late after idx1; (2) 見る (peek) button finger/hand demo delayed to basic_tut_05 (idx4) play event at ~1800ms (anchored to the phrase 「長く押してみよう」) so the child sees the finger only AFTER being told what to do, not before; (3) REGRESSION FIX: basic tutorial no longer stuck after basic_tut_08 (idx7) 「困った時に使ってね」 — the v1346 setBasicCueWithRelease guard in startCommonHintPractice was breaking the basic→hint flow; chain restored. Cache-busts puzzle voice/main/style/partner-select to v1326.
// v1352: LP hero brand logo swapped from D (bear standing apart) to B (small bear reaching for text — correct pose per morito). Kicker repositioned over そびば area (right:4%, top:-4px, smaller clamp 110-180px, rotate -3deg). New brand_logo.png dimensions 1595x475 (was 1571x584).
// v1351: OtoTouch tutorial BGM uses Marble Candy Steps as a dedicated low-volume tutorial loop, restoring the previous BGM after the tutorial closes.
// v1350: LP hero full-bleed background + kicker repositioned to upper-right of brand logo (small + slight rotation). Brand logo re-processed as tight crop (1571×584, aspect 2.69) replacing prior 16:5 wide canvas with padding. .herob now width:100vw + margin-left:calc(50% - 50vw) so soft_playmat background reaches viewport edges (was max-width:1040px clipped to .page container). .herob-logo-wrap wraps h1 + kicker so kicker can absolute-position top-right of brand logo with -4deg rotation. .herob border-radius:0 (full-bleed has no rounded corners). Mobile (≤480px) tightens kicker offset to right:-4px.
// v1349: capture.js bento bugfix — switched build() target from #free-layout-stage (was only the empty bento box inner layer, dynamically created in .bento-inner) to #app (wraps left lunch box + right Pono/food tray + bottom guide UI). Same fix applied to puzzle (#puzzle-container → .page-wrapper to include header + sidebar peek/hint). Added ignoreElements for data-capture-hide attribute in bento/puzzle/quizland/oto (Phase 2.5 prep for tutorial overlay exclusion). quizland #stage and oto #app already correct.
// v1347: Admin narration defaults now use 明るく・落ち着き across narration tools, with separate Puzzle/Bento/Oto contexts; Oto rhythm tutorial adds the opening narration clip and regenerates 04/11 in the same tone.
// v1346: Puzzle basic tutorial fade+sync round-3 (4 fixes) — (1) bottom coach CTA 「やってみよう」 is now ORANGE FILLED with WHITE text (was orange text on cream pill); (2) ALL highlight/cue transitions FADE smoothly via alpha envelopes (orange tap-piece + blue kojika-move-target cues fade in ~260ms / fade out ~420ms with true cross-fade via cueOutgoing slot; button highlights fade out ~320ms; all 40+ raw partnerPracticeState.cue= assignments routed through setBasicCueWithRelease helper so no path bypasses the envelope); (3) drag-try (idx2) badge+voice+cue+input enable now synchronized to the basic_tut_03 play event at ~2180ms (single doSplit, guarded against double-fire via doSplitRan); (4) hint section no longer flashes an orange cue before basic_tut_09 narration anchors at ~2200ms (cue/banner cleared at startBasicHintPlaceTry entry, banner now lights INSIDE scheduleBasicHintSelectCueOnVoice with the cue). Cache-busts puzzle voice/main/style/partner-select to v1325.
// v1344: LP hero brand logo swap — h1 changed to brand_logo.png (Codex candidate D full-body bear); h1_calligraphy.png demoted to kicker (above h1, hiragana catch-copy 「みて さわって あそぼう」 retained as small decorative element). True site-name 「ポノのあそびば」 now lives in the sr-only span of h1 (was 「みて、さわって、あそぼう」). Preload swapped from h1_calligraphy → brand_logo (LCP). New .herob-kicker / .herob-kicker-img CSS, .herob-title-img max-width relaxed 640→720px, .herob padding-top trimmed 26→20px.
// v1343: Oto rhythm tutorial adds a full-challenge narration step, delays practice cues, removes the score-copy bubble, hides the "your turn" prompt, and cache-busts tutorial 04/11 narration audio.
// v1339: Oto rhythm tutorial delays hand cues, routes the sample through the おてほん button, and regenerates tutorial 05/06/08 narration audio.
// v1334: Oto rhythm tutorial narration audio is regenerated through the admin narration generator instead of manual splicing.
// v1333: Oto rhythm tutorial narration audio replaces the remaining spoken "line" wording with button-based timing, and cache-busts Oto tutorial audio.
// v1327: Oto rhythm tutorial plays imported narration audio during the guided rhythm menu steps.
// v1326: Oto rhythm tutorial narration line 1 is shorter and the TTS preset voice style is bright and calm.
// v1325: Puzzle basic tutorial adds a 12th closing voice step (basic_tut_12.mp3 「これで練習はおしまい。さあ、パズルで遊ぼう。」) that plays after idx10 before Stage 1, and shows the hint user-try 「やってみよう」 badge only once (suppressed on the move/retry step); cache-busts puzzle voice/main to v1315.
// v1324: Oto rhythm tutorial teaches button-overlap timing instead of the hit line and shows tutorial notes closer after countdown.
// v1321: Admin narration presets fill the read-aloud text fields directly when selected.
// v1320: Admin narration audio rows can be selected, inserted below the selection, right-click inserted, and drag-reordered.
// v1319: Admin voice generation is renamed to narration audio generation and adds an OtoTouch rhythm tutorial preset.
// v1318: Oto rhythm tutorial previews difficulty tabs, countdowns before sample/try notes, and keeps tutorial note fall speed equal to the game.
// v1317: Bento tutorial enlarges noriben seaweed, shifts the overlap target left, simplifies cup-size copy, and closes cup controls after OK.
// v1316: Puzzle basic tutorial expands to 10 voice steps (peek section gains the "困った時に使ってね" clip; hint section now plays intro/glow/finish), adds basic_tut_09/10.mp3, and bumps voice/main script cache-bust to v1312.
// v1315: Oto rhythm tutorial notes fade in immediately after the countdown starts.
// v1314: Oto rhythm tutorial shortens the single-note wait, adds a tap-start countdown, and removes duplicate tutorial note sounds.
// v1313: Oto rhythm tutorial advances only through real UI taps, highlights difficulty tabs first, and auto-continues after the sample note.
// v1309: Puzzle basic tutorial delays the opening demo badge and restores the full Look-button narration.
// v1308: Puzzle basic tutorial mixes old Look narration audio with the drag demo and delays blue target cues.
// v1307: Puzzle basic tutorial keeps settings inside the practice layout and restores the Look narration copy.
// v1306: Puzzle basic tutorial narrows the right rail and gives the board more horizontal room.
// v1305: Puzzle basic tutorial makes try glow stronger and uses a taller practice frame.
// v1304: Puzzle basic tutorial centers the layout, uses a center mode flash, and pulses the puzzle frame.
// v1303: Oto rhythm tutorial starts with a visible overview and uses real rhythm notes for the demo.
// v1302: Puzzle basic tutorial pins copy below the board while controls stay in the right rail.
// v1301: Puzzle basic tutorial moves the board left and pins copy plus controls in a right-side panel.
// v1300: Oto rhythm story tutorial shows the stage first, demos one falling note, and keeps prompts off controls.
// v1297: Oto tutorial bubbles avoid controls and add a next-time hide checkbox.
// v1295: Oto adds first-run tutorials for rhythm story and free 3D stage modes.
// v1283: Roll back the Bento staff/NPC staging bundle and restore the previous Bento defaults.
// v1281: Oto adds Alps Ichimanjaku as a new hard lion-rival rhythm stage.
// v1280: Oto lion-rival rhythm notes use a simple crown mark instead of claw/burst marks.
// v1278: Oto watches legacy sticker reward close events so next-stage openings continue on staging.
// v1277: Oto next-stage transitions close the result/name gate before sticker rewards and cleanly leave stuck rhythm states.
// v1276: SW update checks stay passive and no longer show a blocking in-page version prompt.
// v1275: Bento rolls back generated control button/frame sprites to the previous compact CSS controls.
// v1274: Oto Kero frustrated reaction uses imported fixed alpha art and left/right anger smoke.
// v1273: Oto rhythm stage select is open so uncleared stages can be chosen directly.
// v1272: Oto 3D note buttons share one closed top rim between side polygons and the textured top.
// v1271: Oto 3D note button top textures keep colored edges instead of dark rims.
// v1270: Bento text buttons use fixed-size slots across states while palette rows keep measured tile spacing.
// v1270: Oto 3D note button top textures are opaque so the beveled top has no groove.
// v1269: Bento palette rows use natural tile height and generated UI backgrounds keep measured PNG ratios.
// v1268: Bento applies NPC saved positions before showing portraits and stops stretching generated UI frames.
// v1267: Oto 3D note buttons use a rounded two-step bevel instead of a straight slab.
// v1266: Oto 3D note buttons remove the top-surface groove and silence audio immediately when inactive.
// v1265: Bento character position editor adds zoomed mask preview, undo, and 0.1% mask sliders.
// v1264: Oto rhythm rival openings use separate imported BGM tracks for the robot and lion rivals.
// v1263: Sea Album shows the key item art prominently when the hermit awards it.
// v1262: Sea Album coin rotation uses the imported alpha coin frames from the item folder.
// v1261: Bento staff waving-2 portraits reuse the matching staff art with alternate hand angles.
// v1260: Oto rhythm song menu uses a black backdrop, rival openings fade in from black, and Pono battle reactions are larger with FX.
// v1259: Bento character position editor can apply one placement to every expression or pose for a character.
// v1258: Sea Album adds story setup, broader SFX, stronger key handoff, and alpha-aware coin sprites.
// v1257: Oto adds imported title, rival dialogue, and stage-clear BGM with a settings toggle.
// v1256: Bento shop staff counter mask is adjustable in the character editor.

// v1255: Sea Album adds story setup, broader SFX, stronger key handoff, and alpha-aware coin sprites.
// v1254: Bento character position editor allows higher vertical placement for staff and NPC sprites.
// v1253: Sea Album caps pointer-follow speed, adds touch-offset flick jet, tougher enemies, staged feed lines, and generated coin sprites
// v1251: Oto reward stickers land from an enlarged impact with don SFX, and rhythm openings/results hide left battle cards while centering rivals in the main monitor.
// v1250: Bento shop opening uses layered staff background and alpha staff sprites with editable staff poses.
// v1249: StickerBookThreeJS uses generated transparent page-thickness textures instead of plain bottom rectangles.
// v1248: StickerBookThreeJS removes the outer vertical page-stack strips that appeared as cut-off pieces behind tabs.
// v1247: Oto rhythm rival lines are gentler, first rival openings introduce themselves, and sticker rewards use a richer celebration before next-stage openings.
// v1246: StickerBookThreeJS cover now fills the page ratio, and the binder uses internal split-ring sockets.
// v1244: Oto rhythm stage clear keeps defeated rival speech visible beside the result panel, including low-height screens.
// v1243: StickerBookThreeJS uses 20260617-596 cover/thickness assets for cache busting.
// v1242: Quizland stage question/answer phase layouts now reset stale inline geometry and stop answer preview from inheriting question-stage sizing.
// v1241: Bento squirrel NPC portraits use the consistent bright 20260614-120131 set.
// v1240: StickerBookThreeJS restores rich source-based covers and adds simulated left/right page-stack thickness.
// v1239: Oto rhythm stage clear composites the defeated rival and a final rival line over the clear background.
// v1238: Bento NPC position editor and runtime share versioned portraits and happy falls back to normal positioning.
// v1237: Bento squirrel NPC normal/almost portraits now match the newer round style.
// v1236: StickerBookThreeJS cover mode is now a closed-cover-only view, and inside pages use left list / right free sticker area.
// v1235: Bento uses imported alpha UI button/frame sprites for controls, group-colored palette tiles, and fixed selected-item toolbar.
// v1234: Oto free-mode choice thumbnails now use real screenshots, and Kero right-side sweat/action-line FX are flipped to face outward correctly.
// v1233: Oto rival openings are shorter and sticker rewards wait until result/high-score UI is dismissed; sticker toasts now defer behind visible game overlays.
// v1232: StickerBookThreeJS inside pages now use fixed production page render textures, with spine below pages and stable left page state.
// v1231: Bento tutorial requester now uses free-tier food (araiguma with taco wiener / tomato) to avoid locked yakizake.
// v1230: Oto free start asks for button/stage play style, renames free view tabs, and enlarges centered 3D Pono.
// v1481: Daily gacha gold capsule deepened and super-rare reveal made more distinct.
// v1493: LP hero labels (HANDOFF 02) + Coming Soon banner (HANDOFF 01 最新版: COMING SOON ピル + Mochiy + 3 行構成) per Pono LP Brand Kit handoff.
// v1497: LP に gacha セクション追加 (HANDOFF 完全準拠、 画像は後渡し)
// v1501: play-gacha capture target を .daily-gacha-shell (ガチャ機本体) に変更 — モーダル backdrop 除外で 16:9 ピッタリ
// v1502: LP sticker-extra を play-cards 2 枚 (ガチャ + シールアルバム) に置き換え HANDOFF v2 完全準拠
// v1503: daily gacha start panel and foreground stage fixed
// v1504: LP 1日1かい bubble (.pc-bubble--left) specificity fix — base .pc-bubble の right:-6px を上書きできず横伸びしていた問題を解消
// v1505: LP gacha bubble 文言を 「1日1かい」 → 「★いちにちいっかい」 に変更
// v1506: LP gacha bubble 文言を 「★１にち１かい」 (全角１) に修正
// v1507: daily gacha table placement, Pono start panel, and lever hit area fixed
// v1508: daily gacha table height, arrow marker, reward bubbles, and plate text alignment fixed
// v1509: daily gacha machine/table contact and delayed tomorrow bubble
// v1510: daily gacha arrowhead, centered rays, stronger sparkles, and shorter start panel
// v1511: LP play-cards 5 ゲーム (bento/maze/oto/puzzle/quizland) のコピー全面刷新 — chip / play / growth / 詳細モーダル detail を更新
// v1512: QuizLand difficulty buttons use GPT Image 2 wooden normal/pressed alpha frames.
// v1513: QuizLand difficulty selection uses generated star icons, no initial selection, and confirm-before-start.
// v1514: LP に絵本アドバンテージ訴求追加 — hero 直下匂わせ帯 + 絵本セクションそえがき + Puzzle/Oto カード画像を title_back.jpg に差し替え + book-aside に id 付与
// v1616: シール帳チュートリアル hand 動き 3 件改修 — find 中継 12→6 拍 (2.0x slower) + place 座標 viewport clamp (wanderSpan 0.32→0.22 + wander1 係数 1.40→0.95) + segment 別 cubic-bezier で「機械的」 解消
// v1619: シール帳チュートリアル 5 件一括改修 — place 直行 (wander 全廃, source→hover→drop 3 stop, rotate 0deg 固定) + rotate hand 位置補正 (rect 内 43→58%) + ok 押下後 tray 隠蔽 (:not(.is-sticker-tutorial-step-ok)) + page step hand 廃止 (矢印パルス + 自動 click) + 起動直後 markStickerTutorialSeen で再訪自動再生防止
// v1625: シール帳チュートリアル 3 件修正 — (1) scale demo を scale 値→thumb fraction 直マッピングに置換、 thumb 半径 8px 補正で起動瞬間 ~10% ズレ + settle phase 不整合を構造的に解消 (2) rotate demo を rotation 値→thumb fraction 直マッピングに置換、 right→left phase で hand が thumb を 14% 取り残す問題を解消 (3) OK ボタン押下動作実装 (triggerStickerTutorialOkButtonPress + .inline-sticker-ok.is-tutorial-pressing で押下風 translateY+scale+黄リング glow) + OK click 後の黄枠ページ飛び解消 (stickerTutorialLastOkRect cache)
// v1627: StickerBookThreeJS BGM 実装 — assets/audio/stickerbook/bgm/sticker-album-morning.mp3 (44.1kHz/128kbps/stereo/loudnorm I=-19, 100.6s loop) を Prototypes/StickerBookThreeJS/main.js から loop 再生。 pono_bgm_enabled 共有キー、 base 0.28 / duck 0.08、 user gesture unlock + visibilitychange pause/resume + tutorial narration ducking。 BGM パス /assets/audio/stickerbook/bgm/ も既存 BGM と同じく cache:'no-store' で fresh fetch しつつ SW cache をオフライン用に維持。
// v1628: シール帳チュートリアル 3 件修正 — (1) place step drop timing 短縮 (CSS keyframe hover→drop を 64.5/73/75.85/79/82.15% → 61/66/69.32/72.5/75.5% に圧縮、 ghost も同期、 JS open timer 13350→12200ms / addSticker timer 13500→12350ms に同期、 「シール置く瞬間」 を約 1.15s 前倒し)。 (2) ok step 「指で押されてない」 解消 (旧 stickerTutorialTap 1.35s infinite = ボタン右隣で「呼吸」 するだけだった keyframe を廃止、 stickerTutorialOkPressDemo 3.0s 1 回 = rest→OK center 押下→lift→rest の所作に置換、 stickerTutorialDemoPoints の "ok" 分岐で from=右隣 rest と to=center press を分離、 startStickerTutorialOkDemo の triggerStickerTutorialOkButtonPress 発火を 3150ms → 1560ms に前倒しして keyframe 押下 52% と同期)。 (3) page step spotlight 「一瞬下にずれる」 解消 (showStickerTutorialStep で spotlight.hidden=false の前に updateStickerTutorialLayout を同期 1 回実行、 CSS 変数を新 step rect に確定させてから visible 化、 旧仕様は前 step の OK ボタン rect が CSS 変数に残ったまま 1 フレーム描画 → rAF 内 layout 更新で矢印位置に snap する race condition)。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集、 page step DOM / mode/find/scale/rotate/view/final step 全て無改変。
// v1629: シール帳チュートリアル 3 件 思い切った再設計 (af35de7/v1628 後ユーザー「scroll もっと / drop もっと早く / spotlight 相変わらず」 3 連続不満) — (1) tray scroll 距離 強気拡大 (desiredTravel = max(2400, viewport*3.0, targetScroll)、 旧 max(1100, viewport*1.4) から約 2x+。 viewport 約 3 個分流れる体感、 蝶々が tray 後方にあれば targetScroll そのもの (= tray 先頭から流れる) を許容)。 (2) drop 動作 最小化 (CSS keyframe hover→drop を 61/66/69.32/72.5/75.5% → 61/63/63.5/64.5/67.5% に再圧縮、 hover→to を 5pp(880ms)→2pp(352ms) で「シュッと真下」、 to→drop を 3.32pp(584ms)→0.5pp(88ms) で「静止 = 同時にぐっ」、 ghost も同期、 JS open timer 12200→11176ms / addSticker timer 12350→11200ms に同期し +150ms オフセット → +24ms に短縮 = 「手が静止 = パッと離す = 同時にシールが貼られる」 体感を実現)。 (3) page step spotlight 「一瞬下にずれる」 真因解消 (旧 v1628 は親 stickerTutorial に CSS 変数を書くだけだったため iOS Safari の inherited cascade 遅延で 1 frame stale paint が残存。 updateStickerTutorialLayout で 子 stickerTutorialSpotlight 自身にも同じ inline 変数を複写 + hidden=false 直前に void offsetWidth で強制 reflow = 三重防護で完全解消)。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集、 全 step keyframe/DOM/他機能 無改変、 過去 commit 影響なし。
// v1631: シールのおみせ残高バッジを切れていた枠からCSS枠+透過どんぐりアイコンへ変更、吹き出し余白とカウンター拡大率を調整。play.html PAGE_CACHE_VERSION と同期。
// v1632: シール帳チュートリアル 3 件改修 — (1) テキスト UI を旧 PNG 吹き出し (daily_gacha_start_panel_pono_fixed.png 焼き込みポノ顔+茶フレーム) からノート左ページ rect 直書き chip に置換。 .sticker-tutorial-page-text を新規追加し JS が projectedMeshClientRect(leftPageInner) を毎フレーム CSS 変数 (--tutorial-leftpage-x/y/w/h) に注入、 Three.js mesh に追従する半透明便箋風枠でテキストを表示。 操作ボタン (あとで/もういちど/つぎ) は画面下端中央 (safe-area+16px) 固定で誤タップ防止 + min-width 78/86px に維持。 旧 PNG モード CSS は無傷保持し is-page-inscribed クラスで切替。 (2) OK ボタン押下位置補正 — press.y を rect.center.y → rect.top + rect.height * 0.30 に修正 (rect は expandedElementRect padding=12 で上下に膨張するため center は実 button 中心より低く出ていた) + stickerTutorialOkPressDemo keyframe 52% の translate Y を -28% → -38% に緩和 (48% -42% との差分が 14pp→4pp になり「3-4px だけ控えめに沈み込む」 自然な押下、 button 下端めり込みを排除)。 (3) 矢印スポットライト位置ずれ解消 — bookNextPage 本体の stickerTutorialArrowPulse (scale 1↔1.12) を完全停止 (animation: none !important / transform: none !important)。 真因は getBoundingClientRect が CSS transform を含むため pulse 進行中フレームで rect が 12% 拡縮し、 viewport 右端固定 (right:16px) のため右側だけ Math.min(window.innerWidth, ...) でクランプされ centerX が左に偏る非対称クランプ + showStickerTutorialStep の 3 回 (即時/180ms/720ms) 再サンプルで毎回違う rect が確定する race。 呼吸演出は ::after pseudo-element の stickerTutorialArrowHalo (pseudo は親 rect に影響しない) で完結維持。 Prototypes/StickerBookThreeJS/index.html + main.js + styles.css のみ編集、 過去 commit (af35de7/5471ed7/72f6c77) の page step spotlight cache / OK 押下発火 / drop timing は無改変で干渉なし。
// v1633: シール帳 正本統一 — 全 grant 動線 (clear/shop/daily gacha からの「ペタッとはる」 toast) を 2D 版 (sticker-book/index.html) から 3D 版 (Prototypes/StickerBookThreeJS) へ完全移行。 js/game-stickers.js:361 を 1 行修正し toast 押下後の遷移先を 3D book に統一、 result.gameId / result.stickerId / result.first を URL query (game=, pasteId=, firstEver=) として渡す。 3D book main.js は requestedGameId/requestedPasteStickerId/requestedFirstEver を受け取り、 applyStickerEntryQueryNavigation() で該当ページへ auto-open (pasteId 優先 > game)、 editor game filter も同 gameId に自動セットしてトレイ内で見つけやすくする。 buildEditorPageDefinitions() を catalog ベースに拡張し page→gameId マップを確立 (STICKER_ALBUM_PAGE_COUNT 固定長維持で既存 editorState.pages の page-keyed 保存位置を保護)。 firstEver=1 のときは新 #stickerFirstEverWelcome overlay (index.html 末尾 + styles.css 末尾) を表示 → tap → startStickerTutorial({manual:true}) でチュートリアル強制起動 (tutorial と二重表示しない排他制御)。 syncUrl() で firstEver/game/pasteId を next.delete し URL 汚染防止。 sticker-book/index.html は 41 KB の 2D Canvas 版から meta refresh + location.replace 短縮版に置換、 既存ブックマーク/PWA SW キャッシュ持ち端末も自動で 3D book に転送。 既存 grant callsite 12 箇所 (maze/quizland/oto/puzzle/bento/starparodier/undersea-cave/sea-album + donguri-shop + play.html daily gacha) は中央集約済 (game-stickers.js 経由) のため一切触らず 1 行修正で全動線追従、 PonoTier propagation 反省 [[feedback_ponotier_propagation]] を踏まえ全件 grep で確認済。 bento の pendingStickerGrant 仕様 (immediate:true onClose:finish) も遷移先変更のみで onClose は不変。 play.html PAGE_CACHE_VERSION と同期。
// v1634: シールのおみせ価格を rarity 別 15/25/35 へ変更し、取り置き中の1枚を左下の小枠へ分離。残高どんぐり縮小、吹き出し上寄せも play.html と同期。
// v1635: シール帳チュートリアル target を ?pasteId で動的化。 grant 動線 (clear/shop/daily gacha) から渡された pasteId が catalog に存在する場合、 demo 配置 sticker / hand point 照準先 tray button / silhouette 強調 main の全てを pasteId 指定 sticker に切り替え。 pasteId 未指定 or catalog 未マッチ時は既存 fallback chain (STICKER_TUTORIAL_PICK_STICKER_IDS 蝶々群 → 蝶々 regex → stickerOptions[0]) を完全温存で 100% 互換。 単一窓口 stickerTutorialPickSticker() に 1 箇所 hook (+7 行) するだけで demo 配置・hand point・silhouette・assetUrl 全て自動連動 (他箇所 zero touch)。 applyStickerEntryQueryNavigation() (page 移動 / filter 切替) は 4ad74da 既実装で温存、 syncUrl() の URL 衛生 (pasteId 起動後削除) も無改変。 Prototypes/StickerBookThreeJS/main.js のみ編集。
// v1636: シール帳 チュートリアル: target ±2 の未取得 SR (rarity==="super") を silhouette 化。 stickerOptions に既 load 済の rarity フィールドを参照、 owned 判定は window.PonoGameStickers.getOwned() 優先 + localStorage("pono_game_stickers_v1") fallback (両 shape 吸収)。 近傍 ±2 は collectionStickerTrayItems の DOM index 基準 (sort/filter 起因のズレ回避、 既存 stickerTutorialPickActiveStickers と同方式)。 target 自身は CSS で強制解除 (filter:none)、 取得済み SR は除外、 SR 不在時は何も変化しない。 既存 body.is-sticker-tutorial-tray-silhouette / .is-tutorial-target-sticker と完全独立 (新規 class .is-rarity-super-silhouette を per-card add/remove のみ、 body class 不要)。 呼び出し箇所は updateStickerTutorialTraySilhouettes と同パターン 8 箇所 (cleanup/abort/showStep/place/redraw)。 Prototypes/StickerBookThreeJS/main.js + styles.css のみ編集。
// v1637: シール帳 チュートリアル: 全 step を「ポノが見せる (demo) → 子供がやる (try) → 「つぎ」 (complete)」 の 2 段階モーダル化。 STICKER_TUTORIAL_STEPS に textDemo/textTry/tryMaxMs を追加し phase 状態機械 (demo / try / complete) を導入。 mode/place/move/scale/rotate/ok/page/view step の自動 click / 自動配置 / 自動値書換を全削除し、 hand cursor とジェスチャだけ見せて実操作は子供に委ねる。 move/scale/rotate demo は終了時に元値へ revert (「ポノが触ったあと」 を残さない)。 demo 中の「やってみる」 早押しボタン (#stickerTutorialDemoDo) と try 中 3 失敗 or 30s 経過で出る「とばす」 ボタン (#stickerTutorialStepSkip) を新設、 STICKER_TUTORIAL_STEP_WRONG_ACTIONS で step 別の誤操作カウンタを定義。 旧 15s セーフティ自動 advance を削除し操作主導に統一、 phase ゲートで demo 中の advanceOn notify を無視 (先回り正解を防止)。 「もういちど」 は complete 状態からも demo に戻して再演示可能 (failCount/skipShown もリセット)。 intro / final step は textTry を省略し旧来挙動を維持。 CSS は body.is-sticker-tutorial-phase-* で hand 表示 + spotlight pulse を切替、 stickerTutorialSpotlightTryPulse keyframe を新規追加。 Prototypes/StickerBookThreeJS/main.js + index.html + styles.css のみ編集、 audio/CACHE は本 sw.js のみバンプ。
// v1638: タイトル画面の右下メニュー押下をフル生成画像差し替えへ戻し、ゲーム一覧の縦ループスクロールとおべんとうカード表示を復元。
// v1639: シールのおみせの取り置き枠を縦に広げ、カード上の「やめる」を価格上中央へ移動。看板下に朝6時・夕方6時の入れ替え案内を追加。play.html PAGE_CACHE_VERSION と同期。
// v1642: タイトル画面の右下メニュー押下画像を、通常画像ベースのマスク生成4枚へ差し替え。
// v1644: タイトル画面の右下メニュー押下画像をプリロードし、通常画像を背景フォールバックにして初回押下の消えを防止。
// v1645: ガチャ結果画面のシール・カプセル・名前プレートを同一中心軸に揃え、名前プレート画像の縦横比を保持。
// v1646: シール帳チュートリアル 5 件確定仕様の追い込み修正 — (1) 左ページ overlay の位置を中央 70% (left 15% / top 18% / width 70% / height 36%) に再配置し AABB 由来の「左上に押し込まれている」 体感を解消。 (2) TRY 成功時の褒め言葉を全 8 step に展開 (mode/place/move/scale/rotate/ok/page/view 各専用 2 行コピー)、 stickerTutorialText に is-praise-pop class を 650ms 付与し 1.12 倍 scale + 暖色 pop で達成感を視覚化。 STICKER_TUTORIAL_PRAISE_BY_STEP マップを新規追加、 既存 place 専用リテラルを統合。 stickerTutorialState.praiseShown フラグで多重発火防止、 phase!=complete でリセット。 (3) place TRY 中の selectedPlacementId 保護: 左/右ページ空隙タップで pickEditablePage → selectedPlacementId=null になっていた経路を「place step かつ phase=try|complete のときは null 化しない」 ガードで保護。 加えて stickerTrayDropTarget が miss した場合に place TRY 限定で右ページ中央 (54, 42) に自動フォールバック配置するサルベージを endStickerTrayDrag に追加。 (4) 全 textDemo の 「ポノが やって みせるね」 → 「まずは おてほん だよ」 (8 件) に話者中立化。 音声 mp3 は textDemo と独立 (textContent のみ) のため副作用なし。 コメント文も追随。 (5) place TRY で tray scroll が起動しない問題: .sticker-tray-icon の touch-action: none → pan-x に緩和、 handleStickerTrayPointerDown 内の即時 event.preventDefault() を廃止 (drag threshold 超過の pointermove 側で preventDefault 維持)。 これで指をシール上に置いて横スライドしても native pan-x scroll が走り、 縦/斜め drag のみが drag-pickup を起動する。 Prototypes/StickerBookThreeJS/{main.js, styles.css} + index.html (v=20260626-1646) + play.html (PAGE_CACHE_VERSION 1646) + sw.js のみ編集、 過去 commit (b43544f / 2bad382 / e09803d / 4ad74da / 457eb29 / daa5543) は無破壊で上塗り。
// v1647: ガチャ結果画面の内側レイヤー幅を白枠内に収め、低め横長画面で中央軸が右へずれる問題を修正。
// v1648: タイトル画面のゲーム名は助詞を小さくし、ポノ/フクロウ/主題語へLPアクセント色を適用。左下ガチャバナーを少し上へ移動。
// v1649: シール帳 チュートリアル — 「やってみる」 (DemoDo) ボタンを廃止し、 TRY 開始の合図を stickerTutorialText の脈動 (色 #3a2618 ⇄ #c2531a + 黄 glow + scale 1.0 ⇄ 1.04, 1.4s loop) で表現。 index.html / main.js / styles.css の 3 ファイルで DemoDo の DOM・JS handler・CSS 色定義・pointer-events allowlist を削除し、 新 body.is-sticker-tutorial-phase-try #stickerTutorialText の @keyframes stickerTutorialTryGlow + reduced-motion フォールバックを追加。 phase-complete に切替わると pulse は自動停止 → 既存 .is-praise-pop (scale 1.12 / color #ff8a3d / 0.6s) と競合せず連続再生される設計。 intro / final finish step は phase-try に入らないため発火しない。 cache-bust と PAGE_CACHE_VERSION も 1649 に同期。
// v1651: タイトル画面のフクロウ色を分離、ランタンは通常色へ戻し、きょうのチャレンジ名を1行/2行で中央寄せ。
// v1652: フクロウ博士のなぞなぞ — 難易度ボタンの星位置、博士ヒント文字サイズ、最終問題 2 枚バナーの収まりを調整。play.html PAGE_CACHE_VERSION と同期。
// v1653: クリア時のどんぐり獲得モーダルをタイトル画面とゲームページ内の両方で表示。
// v1655: フクロウはかせのなぞなぞは同日再挑戦時にベスト報酬との差分だけ付与。
// v1656: シールのおみせ — 看板下の入れ替え案内を下げ、リス吹き出しを下しっぽ風に移動。一時リアクション後は idle ポーズへ戻す。play.html PAGE_CACHE_VERSION と同期。
// v1657: フクロウ博士のなぞなぞ — 本番用フレームから編集用中心点を除去し、編集ツールバーを折りたためるようにする。
// v1662: フクロウ博士のなぞなぞ — かずのじゅん問題の数字表示を1600x900ステージ基準の固定サイズにし、4:3/16:9でのサイズ揺れを解消。
// v1663: シールのおみせの吹き出し再作成と上部ボタン小型化を反映。
// v1664: フクロウはかせの結果画面は正解数コピーをやめ、どんぐり数のポップ演出を表示。
// v1680: タイトル画面 middle-3 検知の座標系統一 (getBoundingClientRect ベース化) + 4:3 (iPad landscape) レイアウト調整 (看板拡大+左寄せ / safe-w 1020→1080 / カード max-height 106→124px / タイトル 24→30px / cards-col padding-top 40→18px / 下余白 128→110px) + nav 内 acorn 残高アイコンを🌰 emoji から店舗内と同じ donguri_shop_acorn_icon_20260626.png PNG に統一 (font-size→width 制御へ切替)。play.html PAGE_CACHE_VERSION と同期。
// v1679: シールのおみせの4:3表示を再調整。商品カード/リス/取り置き枠を下げ、吹き出しと取り置き文字を拡大。こもれびや看板はPNG実比率で100%描画を明示。
// v1678: シールのおみせの4:3レイアウトを接地感優先で調整し、debug mode では初回ナレーションを毎回強制再生。
// v1674: シールのおみせ開店案内に Gemini TTS 音声2本と音声タイミング字幕を追加。play.html PAGE_CACHE_VERSION と同期。
// v1687: ガチャ画面 鍵なし時、 前面 #dailyGachaCenterMsg (PNG 吹き出し + 「チャレンジへ」 ボタン) と文言が重複していた背後の CSS パネル #dailyGachaAssist[data-mode="hint"] の locked 表示を抑止。 showDailyGachaAssistHint の 'locked' ブランチ削除で hidden に落とす。 used モード hint (「🌅 あした また あえるよ！」) は残す。 play.html PAGE_CACHE_VERSION と同期。
// v1686: 緊急 fix — play.html の bfcache 復元 pageshow→無条件 reload 無限ループ抑止。 sessionStorage で 1 セッション 1 回限定 + sw-update.js の isNavigating / __isReloading とコーディネーション。 LP「すぐあそぶ」→ play.html→ 戻る→ 再 navigate のシーケンスで体感「ずっと考え中」 stall を解消。
// v1672: シールのおみせ — リス吹き出しを左寄せし、初回来店/再訪問の開店セリフと字幕案内を追加。play.html PAGE_CACHE_VERSION と同期。
// v1692: もりのおみせ「こもれびや」 — (1) reaction map と return 文の text フィールドを全削除 (とっておけるよ/とりおきも あるよ/どんぐり あつめよう/guide/think 等) で v1689 で消し残った reactive bubble 表示を根絶 (CSS :empty で完全に隠れる)。 (2) 16:9 base 看板 top -16%→-34% で大胆に上、 rotation-note top 17%→16%、 bubble bottom 54%→48%、 subtitle 47%→41% で看板/字幕/吹き出しの重なりを 720p 〜 1080p で解消。 play.html PAGE_CACHE_VERSION と同期。
// v1678: タイトル画面 menu-card mask スケール大幅縮小 (W 93-94% → 80%、 H 85-89% → 65-68%) で paper 領域内側に確実収納、 木枠への peek 漏れを解消 + middle-3 検知ロジック (updateMiddleOverlay) を cardList.scrollTop+clientHeight/2 ベース → getBoundingClientRect ベースに全面刷新、 padding/peek 込みの幾何中央ズレを排除し aspect 5.8:1/16:9 等の breakpoint 跨ぎでも中央 3 枚が正しく overlay 発火するように修正。
// v1672: セーブデータ JSON エクスポート/インポート機能追加 (common/data-export.js 新規) + ヘルプ文言書き直し (help.html L185-186 Q&A 全面改稿 + データ管理セクション追加) + play.html 修正 (settingsModal 内に data 管理エントリ + tap-intro に「以前あそんだことがある方はこちら →」リンク + data-export.js script tag)。 sw.js は network-first 単独構成 (precache list 不在) のため CACHE_VERSION bump のみで配信。 セキュリティ層 4 段防御 (Object.create(null) sanitize / __proto__ 等の forbidden key / value string-only / tier/unlocked/admin denylist) で tier 詐欺を遮断。
// v1669: reduced-motion 静的 chevron CSS specificity 修正 (.scroll-hint.scroll-hint--down で L4677 global hide を上書き)
// v1668: card-dots breakpoint 640→768px (iPad mini 対応) + reduced-motion 静的 chevron CSS 単一ソース化
// v1667: タイトル画面 a11y/UX 修正 — card-dots 狭幅 hide (max-width:640px) + SR aria-live 200ms debounce + auto-scroll hint 発火 1600→2200ms + reduced-motion 時 ↓ chevron 静的表示 + cooking タイトル <wbr> 折返し対応 (game-title-accent--cooking 色追加)。play.html PAGE_CACHE_VERSION と同期。
// v1666: タイトル画面 メニュー再構成 (puzzle↔bento swap + writing-mori/cooking coming-soon 追加) + ピーク戦略 (5 枚目 38% reveal) + auto-scroll hint + ドットインジケータ
// v1665: タイトル画面 game-card peek hover regression 修正 (desktop 限定 + a11y 対応)。play.html PAGE_CACHE_VERSION と同期。
// v1691: タイトル画面 cooking タイトル — 「もりのキッチン」 の 「の」 を `.game-title-particle` で包んで小粒化 (他カードの 「の」「と」「は」 と同一規約)。 decorateGameTitle case 'cooking' のみ修正 (「コトコト もりのキッチン」 → 「コトコト」 + space particle + 「もり」 accent + 「の」 particle + 「キッチン」 accent)。 他 case は既に particle 化済みで対応不要 (quizland 「の」 / maze 「と・の」 / oto 「の」 / puzzle 「の」 / bento 「と」)。 play.html PAGE_CACHE_VERSION と同期。
// v1752: タイトル画面 bento/cooking カードの title font-size を 16:9 (min-aspect-ratio: 16/10) では 32px に拡大 (v1690 で 1 行強制のため 24/26px に縮小したが 16:9 では右側余裕があり過剰縮小だった)。 4:3 では引き続き 24/26px で 1 行収まり保証。 play.html PAGE_CACHE_VERSION と同期。
// v1690: タイトル画面 bento/cooking タイトル 1 行強制 (再修正)。 (a) decorateGameTitle bento/cooking から `<wbr><span class="game-title-break">` を完全撤廃 — iOS Safari 等が wbr + inline-block 連続箇所を「優先 break point」 と誤認して 2 行 wrap する事故 (v1689 で再発) を根本停止。 (b) 単語間半角空白を inline-block `.game-title-particle` で包み、 plain text としての break opportunity を消す。 (c) `.game-card__title` 共通 CSS を white-space:normal+clip → nowrap+ellipsis に戻す (はみ出し時は安全 fail)。 (d) bento 24px / cooking 26px を全 aspect 共通の overrides として `</style>` 直前に追加 — 他 breakpoint の `.game-card[data-id]` 29-32px を source order で上書き。 play.html PAGE_CACHE_VERSION と同期。
// v1689: もりのおみせ「こもれびや」 — 吹き出しはリス声ナレーションが乗る時のみ表示。 (1) shop open の welcome narration (_startShopOpeningGuide first/return) を停止 (音声がリス声でないため)。 (2) bubble の reactive text 設定 (こうかんしたよ / もうすぐかわるよ / とりおき系) を全削除し空文字化。 (3) _setShopkeeperReaction の bubble fallback (data.text / countdown) を削除し、 messageText 明示時のみ表示。 (4) CSS で .donguri-shop-v2-bubble:empty { display:none } で PNG bubble ごと隠蔽。 play.html PAGE_CACHE_VERSION と同期。
// v1704: ガチャ結果のレア/スーパーレア判別用に、シール右上へ R/SR バッジを追加。GPT Image 2 生成の銀台座/虹白金台座を透過PNG化し、文字はHTML重ねで視認性を確保。play.html PAGE_CACHE_VERSION と同期。
// v1703: モバイル portrait のガチャ画面 status bar 領域に出る薄い黒長方形を修正。 .daily-gacha-modal に env(safe-area-inset-top/bottom) padding を当てて、 .daily-gacha-shell::before の dim layer が status bar 領域に被らないように (@media max-width:900px and orientation:portrait 独立 block)。 desktop / landscape / iPad 影響なし、 rarity 演出の dim 強度も変更なし。 play.html PAGE_CACHE_VERSION と同期。
// v1702: Stream B finalize — common/preload-helper.js GAME_WARM_ASSETS bento 8 件を .png → .webp 修正 (hamburg2/ebi_fry2/rice_umeboshi/korokke2/fries2/broccoli2/mini_tomato2/ichigo2)。 PNG 実体は assets/images/Bento_parts/ に存在しない (WebP 移行済み) ため、 旧 path だと warm fetch が 404 → console error + 帯域浪費していた。 karaage2 のみ PNG 残存のため未変更。 play.html PAGE_CACHE_VERSION と同期。
// v1759: bottom-nav default breakpoint のみ追加微調整 — desktop 標準 (16:9 より横長) で default が発火し ごかんそう ⇔ sprite の gap が -6px (重なり気味) になっていた事故を修正。 default の .bn-item--feedback left -164→-180 (16px 左へ → sprite との gap 16px 確保)、 .acorn-balance-badge--nav left -274→-290 (どんぐりも 16px 左へ追従、 ごかんそうとの gap 維持)。 16:9 と 4:3 breakpoint (sw1757 で確定済) は無触。 width/height/画像/:active 押下挙動も無触。
// v1757: bottom-nav 配置微調整 — 「ごかんそう」 と 「どんぐり」 がくっついている事故を 3 breakpoint 一括解消。 ごかんそう left は絶対値を 10px 減らして sprite 寄り (default -174→-164 / 16:9 -152→-142 / 4:3 -130→-120)、 どんぐり left は絶対値を 14px 増やして更に左へ (default -260→-274 / 16:9 -244→-258 / 4:3 -240→-254)。 結果として ごかんそう ⇔ どんぐり gap は旧値 +24px 拡大 (くっつき解消)、 ごかんそう ⇔ sprite gap は 16px → 6px (僅かに接近するが視覚許容範囲)。 width/height/background-image/:active 押下挙動は無触。
// v1749: admin-debug-leak-fix-rollout (batch:887) — 「管理者解錠 (abcd) / book test password (1234) / URL 裏口 (?dev=1 / ?gachaRarity / ?npc / ?freeMask / ?tutreset / ?qzDebug / ?firstClearReset)」 が一般ユーザーから到達可能だった漏れを 6 fleet 並走で一括修正。 (Foundation) ManageDebugMode に個別機能トグル基盤 (isFeatureEnabled / setFeatureEnabled / listFeatures) + common/debug-features.js (9 features 全 default:false 登録) + play.html debugBoardModal に tabbed 構造 (「どんぐり調整」+「機能トグル」 / role=tablist/aria-selected/aria-controls a11y 完備)。 (Password) BOOK_PASSWORDS = ['1234'] → ['arigato_pono2026'] 1 本化 + verifyAdminPassword / ADMIN_PASSWORDS=['abcd'] 完全削除 (export 経路含む)、 play.html passwordUnlockSubmit から adminOk 分岐を削除し serial fallback で arigato_pono2026 を受理する 2 経路 (serial/debug) に簡素化、 docs/TIER_POLICY.md L142-146 + docs/BENTO_CONTENT_PLAN.md L129 を新パスワードへ追従。 (Comments) common/tier.js のヘッダコメントから 「Phase 1 = Web MVP 全機能無料公開」 を撤去し 「Phase 2 (3-tier locks active) 運用中」 へ書き換え、 docs/TIER_POLICY.md §11 に 「運用方針確定 (2026-06-28)」 サブセクション新設、 docs/MVP_CONTENT_AUDIT_2026-06-10.md §7 で §1-1 blocker 「tier 一括無効化」 を無効化通告 (一次ソース = tier.js + TIER_POLICY.md §11)。 (URL backdoors) maze/index.html _DEV_BYPASS_TIER (maze-dev-bypass) / common/acorns.js _isDevBypass (同上) / play.html refreshDeveloperAccessUI (play-dev-mode) + dailyGachaRarityOverride (gacha-rarity-override) / quizland/index.html QZ_DEBUG_ALL (quizland-debug-all) / bento/index.html isTutorialResetRequested (bento-tutreset) + getFreeMaskEditRequest + isMaskEditorAudioMuted (bento-maskedit) + _isBentoNpcForceAllowed 3 callsite (bento-npc-force) / common/first-clear.js window.resetFirstClearRewards 公開 (first-clear-reset) を全て PonoDebugMode.isFeatureEnabled() gate 配下に移動、 本番ユーザー (= 未 unlock) は ?dev=1 / ?gachaRarity / ?npc 等を直叩きしても何も起きない。 (Bento debug) bento/index.html [bento-debug] console.log/warn 29 箇所を _bentoDebugLog / _bentoDebugWarn ヘルパー経由に置換し bento-debug-log feature flag で gate (本番では console 出力ゼロ)。 (Shop) shop/index.html を家具ハードコード 3 件から js/donguri-shop.js + js/game-stickers.js 連動の 「3 枠シールローテーション」 に完全置換、 払い損絶対 NG ルール準拠で grant null 検知時 + Promise.catch 時 + balance 差分推定で必ず addAcorns refund、 既所持時は「もう なかよし♪」 toast で即 return (お金引かない)、 PonoDonguriShopPurchased event で残高 HUD 自動更新、 assets/data/game-stickers.json に donguri_shop unlockOn を 7 ゲーム 28 件追加。 既存 cache strategy / skipWaiting / clients.claim (install/activate で呼ばない) 設計は無改変、 rescue modal v1729-1730 / AcornModal Phase 2.5 (v1744) / maze 水面スケート (v1746) / SUNO ジングル (v1748) は無触。 sw.js CRITICAL_ASSETS_SCRIPTS に既登録の common/debug-mode.js + 新 common/debug-features.js を確認、 play.html PAGE_CACHE_VERSION は別 batch (v1745) のまま security-only 改修のため sw.js のみ bump。
// v1748: AcornModal default SE を universfield-game-bonus-03 から SUNO 生成 Short Cheerful Game Jingle (2.64s, ベル+キラキラ+ホルン) に差し替え (path 据え置きで上書き、 ユーザー判断「universfield 地味すぎる」)
// v1747: bottom-nav レイアウト修正 — 5 番目「ごかんそう」 ボタンの右端切れを解消するため、 sprite 右外配置 (left: calc(100%+8px)) → sprite 左外側へ移動 (left: -96px)、 既存どんぐりバッジを更に左へシフト (default -164→-260 / 1599:9 -148→-244 / 4:3 -118→-214) してごかんそうの右隣に並べる。 [どんぐり] [ごかんそう] [bottom-nav 4 ボタン sprite] の順で安定配置。 アイコン画像/枠/ラベル/絵文字は別担当 (Codex) のため一切触らず、 位置 CSS のみ変更。 play.html PAGE_CACHE_VERSION と同期。
// v1711: 迷路の旗あげ合戦に TTS 音声 9 本 (cmd 6 + miss 2 + win) + HP=4 ハートゲージ制 (1 ミス即敗北を 3 ミス猶予化) を実装 (batch:872-flag-game-voice-hp)。 9 cross-review fixes 統合: F1 miss voice setTimeout を _flagTunnelSetTimeout でトラッキング + 状態 guard、 F2 _resolveFlagGame に reason='hp' 分岐「ハートが ぜんぶ なくなった…」、 F3 HP=0 時の playMzSe('wrong') 二重発火抑制、 F4 cmd voice 900ms 遅延で「ミス→励まし→再コマンド」 順序化、 F5 _closeEncounter で _clearFlagTunnelTimers→null 化の順、 F6 gs.missVoiceId 追跡で確実 cancel、 AF-01 cmd_white_up/down 再生成 (whisper「シーロー」→「白あげて/白下げて」)、 AF-02 初回 miss = miss_02 (励まし) / 2 回目以降 = miss_01 (明確否定)、 AF-03 win voice を 180ms 遅延 (correct SE 被り回避)、 AF-04 _showFlagGame 冒頭で 9 voice preload (iOS user gesture 内)。 narration mp3 は runtime cache 任せ (precache list 不変)。
// v1780: base AcornModal __progress を白 → 焦げ茶 #6d3b07 (cream/maze 等で視認性確保)、 oto override #BEF5FF は維持、 dark panel ゲームは個別 override 追加。
// v1779: oto AcornModal 専用調整 — (1) __progress を白系に (海底ネイビーで視認性確保) (2) panel に大きめ border-radius で角丸化、 他ゲーム焦茶色は base 維持。
// v1796: えほんの unlock モーダル (#passwordUnlockModal) を 2 タブ仕様 (あいことば + 注文番号) に整理。 クイズタブ (#pwTabQuiz / #pwPanelQuiz) は display:none で非表示、 ただし DOM / JS / common/tier.js の verifyQuizAnswer は dormant 保持 (緊急時に display:none を消すだけで復活可能)。 .password-modal-tabs は flexbox (display:flex; gap:4px / .pw-tab flex:1) なので 3 番目を display:none にするだけで残り 2 タブが自動 reflow、 grid-template-columns 書換は不要。 ヘルプ文言 「したの どれか ひとつで」 → 「したの どちらかで」 に微調整 (2 タブ整合)。 play.html PAGE_CACHE_VERSION と同期。
// v1816: quizland Q113 (実 qid: weather_lv2_010 にじは なんしょく) を Q119 (weather_lv3_016) と同じレイアウトに合わせる (batch:945) — saved-layout.json の .stage-img-wrap|0@weather_lv2_010 を w/h="" tx=-21.0 ty=-11.76 に書き換え + bogus エントリ .stage-img-wrap|0@weather_lv2_002 (存在しない qid) を削除。v1814 で誤った qid (lv2_002 ≒ 実は lv1 範囲) に保存したのを訂正。play.html PAGE_CACHE_VERSION と同期。
// v1815: Bento 小おかず配置先UI再設計 (batch:959) — 右パネルの小さい「どこ？」選択帯を廃止し、弁当箱内のA-D/カップ丸マーカーを直接選ぶ方式へ変更。play.html PAGE_CACHE_VERSION と同期。
// v1818: revert quizland Q113 関連の誤 qid 修正 batch:944/945/946 (batch:947) — saved-layout.json を batch:944 前の状態に復元。元の問題 (Q113 weather_lv1_004 の虹左切れ) は未着手で残る。play.html PAGE_CACHE_VERSION と同期。
// v1814: quizland Q113 (weather_lv2_002 虹) 左切れ修正 (batch:944) — .stage-img-wrap|0@weather_lv2_002 に専用エントリ追加 (700x395px, tx=0, ty=0)。play.html PAGE_CACHE_VERSION と同期。
// v1813: quizland 画像本体 .emoji-main-img を resizable 対象から外す + saved-layout.json から関連エントリ全削除 (batch:943) — 二重バウンディングボックスと「左上貼り付き」を根治。.stage-img-wrap で間接管理に統一。play.html PAGE_CACHE_VERSION と同期。
// v1811: quizland Bug-B + Bug-C (batch:942) — layout-applier.js に 0/0 ガード / saved-layout.json クリーンアップ / layout-editor.js snapshot 改修 / _stopChoiceNarration の speechSynthesis.cancel を _playAllChoicesRunning ガードで保護。play.html PAGE_CACHE_VERSION と同期。
// v1810: oto ハイスコア入力「あとで」を「ほぞんしない」にラベル正直化 + 自動保存 revert (batch:941) — 元設計『保存しない選択肢』を復活、ユーザー意図反映。play.html PAGE_CACHE_VERSION と同期。
// v1805: oto 監査 fix 8件 (batch:940) — PonoSprite indexOf誤判定 / リズムmobile perspective ズレ調整 / チュートリアル cleanup / 「あとで」ボタン自動保存化 / silent fallback に console.warn / ★ repeat 静的キャッシュ / _clearTriggered リセット / Oscillator listener once 化 + 軽量化。play.html PAGE_CACHE_VERSION と同期。
// v1794: puzzle 監査 fix 5件 (batch:938) — loadStage null check / currentStageIndex 範囲チェック / OP narration 3.5s fallback / btnPlayAgain dead code 削除 / album STAGE_TITLES sync コメント + 軽量化。play.html PAGE_CACHE_VERSION と同期。
const CACHE_VERSION = 1866;
// v1560: シール 3D hit test (placementTextureBounds) を CSS .placed-sticker { clip-path: inset(5%) } と同期で 5% inset、 共通定数 STICKER_PLACEMENT_INSET=0.05 で管理。 これにより 3D 本のページ上での「カニ脇のもずく」 等の選択しづらさを解消 (前 v1558 では DOM 側のみ縮小、 3D 側が full bounds のままだった) + drawInlineStickerSelectionOverlay の点線セレクション枠も同期で縮小
// v1559: シール帳 チュートリアル ナレーション 3本 再生成 + 台本微調整 — tut_02 (find) は台本維持で再ロール、 tut_04 (place) 「はろう」 が HELLO 化する Chirp3-HD 誤読を回避するため 「ぺたっと はろう」 に変更 (オノマトペで pronunciation lock) + main.js text も追随、 tut_10 (final) 「シールちょう」 (帳/調 同音異義トラップ) を 「シールアルバム」 に言い換え (カタカナで明確化) + main.js text も追随。 faster-whisper small/medium で 3本とも transcript 一致確認済 (好きなシールを選ぼう / 好きなところにペタっと貼ろう / 好きなシールアルバムを作ろう)
// v1557: シール帳チュートリアル spotlight 反転 (背景 dim 撤廃 → 内側 radial-gradient 黄グロー + mix-blend-mode:screen)、 ハンドカーソル指先位置補正 (hand_point_left.png 計測値 fingertip=(1.3%, 32.4%) に合わせ transform Y -50% → -35%、 transform-origin 54%/58% → 50%/32%、 8 keyframes + slider-js steady-state 同期)
// v1556: お家の方へ タグライン 「つくっています」 → 「作っています」 漢字化、 注意文の 「詳しくはこちら」 リンクを改行 + 右端揃え (margin-left:auto + width:fit-content) でレイアウト整理
// v1555: お家の方へ タグライン (あんしん・あんぜん) を 15.5px → 19px max に拡大 (約 +20%)、 ホーム画面追加注意文も 12.5px → 14px max に拡大 + font-weight 500 + 濃いブラウン色で視認性向上
// v1554: お家の方へ タグラインを 「安心・安全」 → 「あんしん・あんぜん」 ひらがな化 (「ココが育つ！」 ステッカー alpha 透過版は素材未提供のため raw 版維持)
// v1552: お家の方へセクションに注意文 「ホーム画面に追加してからのご利用を推奨」 + 「詳しくはこちら →」 リンクを追加、 LP下部 .notice-card へ anchor scroll
// v1551: Bento book tier nori/furikake decoration assets.
// v1540: ゲーム詳細モーダル 「ここがそだつ」 パネルの枠囲い (border + background + radius) を解除し、 下端 dashed border のみで区切る形に変更
// v1537: ゲーム詳細モーダル スクロールチェーン修正 — .game-modal-body に overscroll-behavior:contain でモーダル内 scroll が背景 LP に伝播しないように、 body.modal-open{overflow:hidden;} も併用
// v1533: ゲーム詳細モーダル レイアウト再修正 — 画像 object-fit を contain → cover に戻す (v1532 の誤修正取り消し) + ヘッダー (60→40px) と CTA (40→36px) の高さを削減して中央スペースを拡大、 mobile での 1 画面表示時に画像が見やすく
// v1531: hero 匂わせ帯 2 行目 「遊べる」 → 「あそべる」 ひらがな化 + ゲーム詳細モーダルを 「画像+キャプション ×3」 の縦並びに再構成 (GAME_MODAL_DATA の scenes に caption フィールド追加、 旧 detail は削除、 モーダル JS/CSS を新構造対応)
// v1530: hero CTA 「すぐ あそぶ」 を中央固定 + 「推奨年齢 3〜6歳」 ラベルを button 右下のバッジ風に配置 — flex row 横並びから absolute 配置のバッジに変更、 button 位置のブレを解消、 ラベルは白半透明背景で視認性確保
// v1529: hero 匂わせ帯 文言更新 — 「無料で あそべるよ！」 → 「誰でも無料で遊べるよ！」 / 「えほんを よんで もっと たくさん あそべるように なろう」 → 「絵本を読めばもっとたくさん遊べるよ！」 (大幅漢字化+短縮、 「絵本」 オレンジ強調と 「もっとたくさん」 マーカーは維持)
// v1528: hero 推奨年齢ラベルを 「3〜6歳 向け」 → 「推奨年齢 3〜6歳」 に変更 (「向け」 削除、 「推奨年齢」 を頭に追加)
// v1527: hero 推奨年齢ラベルを 「3〜6さい むけ」 → 「3〜6歳 向け」 (漢字化) + 「すぐ あそぶ」 CTA の右隣に位置変更 (cta-wrap 内で横並び)
// v1526: play menu gacha entry aligned above book button, bottom nav wood tone softened
// v1524: hero 匂わせ帯の 3 ブロック順序変更 — 絵本リンクバナーを最下段に移動 (free → text → banner の順)
// v1521: hero 匂わせ帯の背景色を hero と統一 (黄色系) — 帯と hero CTA「すぐ あそぶ」 周辺が一体になって見えるよう調整、 3 ブロック構造と dashed border は維持
// v1520: hero 匂わせ帯を縦並び 3 ブロック化 — hero 内の .herob-free を削除し帯内に集約、 (1) 「むりょうで あそべるよ！」 太字 / (2) 絵本リンクバナー / (3) 「えほんを よんで…」 テキスト の順で配置、 上下 dashed border・クリーム背景は維持
// v1516: いろあそびラベル左切れ第2弾修正 — 前回 v1515 の transform-origin:right center は数学的に逆効果 (右軸で時計回り回転は左端を更に外側に押し出す) だったため、 transform-origin:left center に変更 (左軸からの距離 0 なので左端は x 方向に動かない)
// v1515: LP 微修正 — いろあそびラベルの左切れ解消 (transform-origin) / hero 匂わせ帯の重複削除&強調再調整 / ガチャ親向け 「むりょう」→「無料」 漢字化
// v1500: daily gacha に木の部屋の奥行き背景と Pono 開始ふきだしを追加
const CACHE_NAME = 'pono-v' + CACHE_VERSION;
// CACHE_VERSION bump 規約: sw.js / CRITICAL_ASSETS 配下 / play.html (PAGE_CACHE_VERSION) を
// 編集したら必ず +1 して deploy する。orchestrator が最後にバンプする運用 (CLAUDE.md 参照)。

// ── Critical asset precache list ──
// 目的: SW 更新後の完全コールドスタートを避け、 install 時にファーストビュー必須資産を
// 一括で取得しキャッシュへ載せる。 加えて fetch handler を cache-first に倒して
// 同一セッション内の HTTP 往復を排除する。
//
// 選定指針 (タスク提案 #2):
// - play.html (entry)
// - common/ 配下の必須 JS (sw-update.js, tier dispatcher, capture, acorns, data-export,
//   debug-mode, mvp-flags) + play.html が <script src> で読む js/ 3 本
// - カードサムネ thumb_*.webp 8 枚 (play.html L37-42 + bento/kitchen の予備)
// - メニューカード台座 menu_card_base_*.webp 4 枚 + paper_mask_*.png 4 枚 (タイトル4枚カード必須)
// - 任意: 主要 webp 系のみ。 bottom-nav PNG 5 枚 (合計 ~9MB) は <link rel=preload> で
//   ブラウザ HTTP cache に乗るため、 ここでは意図的に外す (precache 2MB 制約)。
//
// 合計見積: ~1.2MB (4G モバイルで許容範囲、 2MB 目標内)
const CRITICAL_ASSETS_HTML = ['/play.html', '/quizland/index.html'];
const CRITICAL_ASSETS_SCRIPTS = [
  '/common/sw-update.js',
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
  // v1745: AcornModal default SE (祝祭ジングル 1.20s)。 既存 don.mp3 と並列で precache。
  '/assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3',
];
const CRITICAL_ASSETS_IMAGES = [
  // v1718: ごかんそう (rating) — PNG asset; CRITICAL_ASSETS_SCRIPTS から分離 (semantic 整理)。
  // v1750: 焼き込み済み 木枠アイコン (通常 + 押下) に差し替え。 :active で pressed 版へ即時切替するため
  //        両方を precache し初回 tap の網経路遅延を防ぐ。
  '/assets/ui/icon_feedback_20260628.png',
  '/assets/ui/icon_feedback_20260628_pressed.png',
  // v1763: 実表示用の高解像度版。64px 版は小サイズ参照/互換のため残す。
  '/assets/ui/icon_feedback_20260628_512.png',
  '/assets/ui/icon_feedback_20260628_pressed_512.png',
];
const CRITICAL_ASSETS_THUMBS = [
  '/assets/ui/thumb_quizland_owl.webp',
  '/assets/ui/thumb_quiz-sound.webp',
  '/assets/ui/thumb_oto.webp',
  '/assets/ui/thumb_bento.webp',
  '/assets/ui/thumb_puzzle.webp',
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
];

// precache を 5 グループに分割: 1 グループ全失敗しても他は通る (allSettled)。
const CRITICAL_ASSET_GROUPS = [
  CRITICAL_ASSETS_HTML,
  CRITICAL_ASSETS_SCRIPTS,
  CRITICAL_ASSETS_THUMBS,
  CRITICAL_ASSETS_CARDS,
  CRITICAL_ASSETS_IMAGES,
];

// 個別 asset の失敗で install が落ちないように、 asset 単位の try/catch でラップする。
function precacheAssetGroup(cache, urls) {
  return Promise.allSettled(
    urls.map(url =>
      // cache: 'reload' で ブラウザ HTTP cache をバイパスし、 新版 SW の install 時に必ず
      // 最新を取得する。 個別 fetch で失敗しても他をブロックしない。
      fetch(new Request(url, { cache: 'reload' }))
        .then(response => {
          if (!response || !response.ok) {
            throw new Error('precache fetch failed: ' + url + ' status=' + (response && response.status));
          }
          return cache.put(url, response);
        })
        .catch(err => {
          // install 全体は失敗させない。 個別 asset の失敗は WARN レベルで握りつぶす。
          try { console.warn('[sw] precache skip', url, err && err.message); } catch (e) {}
        })
    )
  );
}

self.addEventListener('install', event => {
  // 開いているゲームへ新しいSWを即時適用すると、controllerchange経由で
  // ページがリロードされ、ゲームがタイトル状態へ戻ってしまう。
  // 待機状態にして、次回起動/遷移時に自然に切り替える。
  //
  // ただし precache は install 中に行い、 ファーストビュー資産だけは新版 SW でも
  // 即座に提供できるようにする (cold start 解消)。
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        CRITICAL_ASSET_GROUPS.map(group => precacheAssetGroup(cache, group))
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
  // ピボットツール / admin / illustrator 系から画像を差し替える際の cache-bust 規約:
  //   - 正本は ?v=<timestamp> (例: ?v=1693, ?v=20260627)
  //   - 既存実装の互換のため ?t=<timestamp> (tools/maze-editor.html 4374/4405/4408) も bypass 対象
  //   - 上記いずれかが URL に含まれていれば cache を bypass し、 必ず最新を取得する
  //   - 取得後は cache.put で更新もしておく (次回 cache-first hit 用)
  // ⚠️ 同名ファイルの上書きは NG (Same-URL Same-Filename Overwrite Risk):
  //   menu_card_base_01.webp などをそのまま上書き push すると、 cache-first 戦略下では
  //   旧 client は次の CACHE_VERSION bump (= 全 cache 退役) まで旧画像を引き続ける。
  //   画像更新は必ず (a) 新ファイル名、 (b) ?v=<ts> 付き参照、 (c) CACHE_VERSION bump
  //   のいずれかを伴うこと。 詳細は AGENTS.md / CLAUDE.md のデプロイ規約参照。
  if (event.request.destination === 'image') {
    const imgUrl = event.request.url;
    const bypassCache = /[?&](?:v|t)=/.test(imgUrl);
    if (bypassCache) {
      event.respondWith(
        fetch(event.request, { cache: 'no-store' })
          .then(response => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }
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

  // 動画 (宝箱・ハリネズミ等) も SW キャッシュをスキップ
  // 古い mp4 がキャッシュされると再生が止まる問題の対策
  if (event.request.destination === 'video'
      || event.request.url.includes('/assets/videos/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // items.js / rewards.json / tts manifest / BGM はデプロイ直後に即反映させたいので HTTP キャッシュも無効化。
  // BGM (assets/audio/bgm/*.mp3) はユーザーが差し替えても古いブラウザ HTTP キャッシュが
  // 居座って「差し替えた曲がなぜか鳴らない」現象の原因になりがち。cache:'no-store' で毎回
  // ネットワーク取得、SW キャッシュだけ更新してオフライン用に保持 (2026-04-21)。
  if (event.request.url.includes('/room/items.js')
      || event.request.url.includes('/assets/data/rewards.json')
      || event.request.url.includes('/assets/tts/manifest.json')
      || event.request.url.includes('/assets/audio/bgm/')
      || event.request.url.includes('/assets/audio/stickerbook/bgm/')
      || event.request.url.includes('/assets/audio/storyboard/')) {
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
