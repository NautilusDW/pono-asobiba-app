// ---- script block 0 ----

    (function(){
      // 2 RAF 待ちで .page を可視化 (CSS 評価完了 + 1 フレーム描画後)
      function ready(){
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            document.body.classList.add('pono-game-ready');
          });
        });
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ready, { once: true });
      } else {
        ready();
      }
      // splash 自動非表示判定: #pono-tap-intro が出る局面 (= 音声未解禁 かつ BGM オン) では
      // そちらが既に全面覆っているので game-splash は不要 → 2 重表示しない
      // 注: sessionStorage 不可 (private/incognito) 環境では splash を残し、 タップ/Enter で
      //     dismiss 可能とする (安全側 fallback、 機能ブロックは絶対に避ける)
      document.addEventListener('DOMContentLoaded', function(){
        try {
          var splash = document.getElementById('pono-game-splash');
          if (!splash) return;
          // === ゲーム戻り / 既存ユーザー / セッション 2 回目以降の誤発火ガード ===
          // 1) ブラウザ back/forward ナビゲーションなら overlay 不要 (ゲームから戻ってきた局面)
          var navType = '';
          try {
            var navEntry = (performance && performance.getEntriesByType) ? performance.getEntriesByType('navigation')[0] : null;
            navType = navEntry ? navEntry.type : '';
          } catch (_) {}
          if (navType === 'back_forward') {
            splash.hidden = true;
            return;
          }
          // 2) このセッションで既に 1 度出していれば 2 回目以降は出さない
          var splashShown = false;
          try { splashShown = sessionStorage.getItem('pono_splash_shown_v1') === '1'; } catch (_) {}
          if (splashShown) {
            splash.hidden = true;
            return;
          }
          // 3) localStorage に何らかの pono_* 履歴があれば既存ユーザー → overlay skip
          var hasHistory = false;
          try {
            for (var i = 0; i < localStorage.length; i++) {
              var k = localStorage.key(i);
              if (k && k.indexOf('pono_') === 0) { hasHistory = true; break; }
            }
          } catch (_) {}
          if (hasHistory) {
            splash.hidden = true;
            try { sessionStorage.setItem('pono_splash_shown_v1', '1'); } catch (_) {}
            return;
          }
          var unlocked = sessionStorage.getItem('pono_audio_unlocked') === '1';
          var bgmOff   = localStorage.getItem('pono_bgm_enabled') === 'off';
          // pono-tap-intro が出ない条件 = 既に解禁済み or BGM オフ → game-splash で覆う
          if (!(unlocked || bgmOff)) {
            splash.hidden = true; // pono-tap-intro に主役を譲る
            return;
          }
          // ここまで来たら真の初回訪問 → overlay 表示。 セッション flag を立てて重複防止
          try { sessionStorage.setItem('pono_splash_shown_v1', '1'); } catch (_) {}
          var dismiss = function(e){
            if (e) { e.preventDefault(); e.stopPropagation(); }
            splash.hidden = true;
            splash.removeEventListener('pointerdown', dismiss);
            splash.removeEventListener('click', dismiss);
            splash.removeEventListener('keydown', onKey);
          };
          var onKey = function(e){
            if (e.key === 'Enter' || e.key === ' ') {
              dismiss(e);
            }
          };
          splash.addEventListener('pointerdown', dismiss, { passive: false });
          splash.addEventListener('click', dismiss);
          splash.addEventListener('keydown', onKey);
          // a11y: フォーカス可能にして Enter で dismiss できるようにする
          try { splash.setAttribute('tabindex', '0'); splash.focus(); } catch(_) {}
        } catch (_) { /* sessionStorage 禁止環境では splash 出し続け → タップ/Enter で消える */ }
      });
    })();
  
;
// ---- script block 1 ----
) to satisfy iOS
       Safari's autoplay restriction without showing a tap-to-start screen. -->
  <!-- BGM defer (v1699+, Stream D): preload="none" にして cold-start で 1.6MB の MP3 を即時 fetch しない。
       play() を呼ぶ直前に bgm.preload='auto' に昇格させてからロード開始する設計。
       iOS Safari は初回ユーザータップまで再生不能なため UX 劣化なし。 -->
  <audio id="play-bgm" src="assets/audio/play_bgm.mp3" loop preload="none"></audio>

  <!-- ===== Shop BGM (v1784: 専用 BGM honey_bell_shop.mp3 に差し替え、 sticker-book との兼用解消) ===== -->
  <audio id="shop-bgm" src="assets/audio/honey_bell_shop.mp3" loop preload="auto"></audio>

  <!-- v1895: shop 購入 SE (rarity 別 preloaded、 new Audio() の GuardedAudio silent-reject 経路を回避) -->
  <audio id="shop-sfx-normal" src="assets/audio/sfx/acorn/acorn_get_festive_20260628.mp3" preload="auto"></audio>
  <audio id="shop-sfx-rare"   src="assets/audio/gacha/daily_gacha_sticker_sparkle.mp3"     preload="auto"></audio>
  <audio id="shop-sfx-super"  src="assets/audio/gacha/daily_gacha_magic_sparkle_long.mp3"  preload="auto"></audio>

  <!-- ===== Tap-to-start intro overlay (first session only; landscape only) =====
       Single tap dismisses, unlocks BGM autoplay, and reveals the title screen
       behind. Suppressed automatically if Settings has muted audio or if the
       user has already entered the title in this browser session. -->
  <div class="tap-intro" id="tapIntro" hidden role="button" tabindex="0" aria-label="タップしてはじめる">
    <div class="tap-intro-card">
      <img class="tap-intro-logo" src="assets/ui/brand_sign_01.webp" alt="ポノのあそびば" draggable="false">
      <div class="tap-intro-sub">タップして はじめよう</div>
      <button class="tap-intro-restore" id="tapIntroRestore" type="button" aria-label="以前あそんだことがある方はデータをロード">
        以前あそんだことがある方はこちら →
      </button>
      <div class="tap-intro-ad" aria-label="広告">
        <div class="tap-intro-ad-label"><span class="tap-intro-ad-badge">PR</span> ポノの絵本 はつばいちゅう</div>
        <a class="tap-intro-ad-link" href="https://www.amazon.co.jp/dp/B0FFTBS9TM" target="_blank" rel="noopener noreferrer" aria-label="絵本『ありがとうって、うれしいね』をAmazonで見る">
          <picture>
            <source media="(max-width:768px)" srcset="assets/images/Amazon_mobile.webp" type="image/webp">
            <source srcset="assets/images/Amazon_pc.webp" type="image/webp">
            <source media="(max-width:768px)" srcset="assets/images/Amazon_mobile.png">
            <img src="assets/images/Amazonリンク.png" alt="絵本『ありがとうって、うれしいね 〜くまのこ ポノの ちいさな ものがたり〜』をAmazonで見る" loading="eager">
          </picture>
        </a>
      </div>
    </div>
  </div>

  <!-- ===== Portrait warning overlay (shown when device is held vertically) ===== -->
  <div class="portrait-warn" id="portraitWarn" hidden>
    <div class="pw-card">
      <div class="pw-icon">📱↻</div>
      <div class="pw-msg">よこむきに してね</div>
      <div class="pw-sub">きかいを よこに まわすと あそべるよ</div>
    </div>
  </div>

  <!-- ===== Settings Modal ===== -->
  <div class="modal" id="settingsModal" hidden role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
    <div class="modal-card">
      <h3 id="settingsTitle">せってい</h3>
      <div class="setting-row">
        <span>おとを ながす</span>
        <label class="toggle">
          <input type="checkbox" id="soundToggle">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="settings-action-list" aria-label="そのほか">
        <button class="settings-action" id="settingsBookUnlockBtn" type="button">
          <span class="settings-action__icon" aria-hidden="true">🔑</span>
          <span class="settings-action__text">
            <span class="settings-action__main">えほんの あいことば</span>
            <span class="settings-action__sub" id="settingsBookUnlockSub">あいことばを いれる</span>
          </span>
        </button>
        <button class="settings-action" id="settingsProfileBtn" type="button">
          <span class="settings-action__icon" aria-hidden="true">👤</span>
          <span class="settings-action__text">
            <span class="settings-action__main">プロフィール</span>
            <span class="settings-action__sub" id="settingsProfileSub">なまえを かえる</span>
          </span>
        </button>
        <button class="settings-action" id="settingsNewsBtn" type="button">
          <span class="settings-action__icon" aria-hidden="true">🔔</span>
          <span class="settings-action__text">
            <span class="settings-action__main">おしらせ</span>
            <span class="settings-action__sub" id="settingsNewsSub">あたらしい おしらせは ないよ</span>
          </span>
          <span class="settings-action__badge" id="settingsNewsBadge" hidden>0</span>
        </button>
        <button class="settings-action" id="settingsHelpBtn" type="button">
          <span class="settings-action__icon" aria-hidden="true">?</span>
          <span class="settings-action__text">
            <span class="settings-action__main">ヘルプ</span>
            <span class="settings-action__sub">こまった ときに みる</span>
          </span>
        </button>
        <button class="settings-action" id="settingsRefreshBtn" type="button">
          <span class="settings-action__icon" aria-hidden="true">↻</span>
          <span class="settings-action__text">
            <span class="settings-action__main">こうしんする</span>
            <span class="settings-action__sub" id="settingsRefreshSub">あたらしくする</span>
          </span>
        </button>
        <button class="settings-action" id="settingsDataManageBtn" type="button">
          <span class="settings-action__icon" aria-hidden="true">💾</span>
          <span class="settings-action__text">
            <span class="settings-action__main">データかんり (保護者の方へ)</span>
            <span class="settings-action__sub">きしゅへんこう・ブラウザ変更時に</span>
          </span>
        </button>
        <button class="settings-action" id="settingsDebugBoardBtn" type="button" hidden>
          <span class="settings-action__icon" aria-hidden="true">⚙</span>
          <span class="settings-action__text">
            <span class="settings-action__main">デバッグボード</span>
            <span class="settings-action__sub">どんぐりを ふやす</span>
          </span>
        </button>
        <a class="settings-action" href="index.html">
          <span class="settings-action__icon" aria-hidden="true">⌂</span>
          <span class="settings-action__text">
            <span class="settings-action__main">こうしきサイト</span>
            <span class="settings-action__sub">おうちのひとと みる</span>
          </span>
        </a>
      </div>
      <a href="play-all.html" class="dev-link">📋 ぜんぶみる（開発用）</a>

      <div class="dev-section">
        <h4>🍱 弁当 NPC テスト（開発用）</h4>
        <div class="dev-grid">
          <a href="bento/?npc=risu">🐿 りすちゃん</a>
          <a href="bento/?npc=inu">🐶 わんちゃん</a>
          <a href="bento/?npc=ahiru">🦆 あひる</a>
          <a href="bento/?npc=shika">🦌 しかさん</a>
          <a href="bento/?npc=lesser_panda">🐼 パンダ</a>
          <a href="bento/?npc=neko">🐱 ねこさん</a>
          <a href="bento/?npc=1">🎲 ランダム</a>
          <a href="bento/?npc=0">⏸ 自由モード</a>
        </div>
      </div>

      <button class="modal-close" type="button" data-close="settingsModal">とじる</button>
    </div>
  </div>

  <div class="modal profile-modal" id="profileModal" hidden role="dialog" aria-modal="true" aria-labelledby="profileTitle">
    <div class="modal-card profile-card">
      <h3 id="profileTitle">プロフィール</h3>
      <form class="profile-form" id="profileForm">
        <label class="profile-field" for="profileNameInput">
          <span>なまえ</span>
          <span class="profile-name-row">
            <input class="profile-input" id="profileNameInput" type="text" maxlength="8" autocomplete="off" inputmode="text" value="ポノ">
            <button class="profile-random" id="profileRandomBtn" type="button">ランダム</button>
          </span>
        </label>
        <div class="profile-field">
          <span>せいべつ</span>
          <div class="profile-gender-group" id="profileGenderGroup" role="radiogroup" aria-label="せいべつ">
            <button class="profile-gender-btn is-active" type="button" data-gender="none" role="radio" aria-checked="true">えらばない</button>
            <button class="profile-gender-btn" type="button" data-gender="girl" role="radio" aria-checked="false">おんなのこ</button>
            <button class="profile-gender-btn" type="button" data-gender="boy" role="radio" aria-checked="false">おとこのこ</button>
          </div>
        </div>
        <label class="profile-field" for="profileAgeSelect">
          <span>ねんれい</span>
          <select class="profile-select" id="profileAgeSelect">
            <option value="">えらばない</option>
            <option value="2">2さい</option>
            <option value="3">3さい</option>
            <option value="4">4さい</option>
            <option value="5">5さい</option>
            <option value="6">6さい</option>
            <option value="7">7さい</option>
            <option value="8">8さい</option>
            <option value="9">9さい</option>
            <option value="10">10さい</option>
            <option value="11">11さい</option>
            <option value="12">12さい</option>
          </select>
        </label>
        <p class="profile-note">※この ブラウザの なかだけで つかいます。そとには おくりません。</p>
        <button class="profile-save" type="submit">きめた</button>
      </form>
    </div>
  </div>

  <div class="modal profile-hub-modal" id="profileHubModal" hidden role="dialog" aria-modal="true" aria-labelledby="profileHubTitle">
    <div class="modal-card profile-hub-card">
      <button class="profile-hub-xclose" type="button" data-close="profileHubModal" aria-label="とじる">×</button>
      <div class="profile-hub-panel" id="profileHubMainPanel">
        <div class="profile-hub-head">
          <span class="pono-mini-avatar profile-hub-avatar" id="profileHubAvatar" data-variant="0" aria-hidden="true">
            <span class="pono-mini-avatar__tail"></span>
            <span class="pono-mini-avatar__leg-left"></span>
            <span class="pono-mini-avatar__leg-right"></span>
            <span class="pono-mini-avatar__shoe-left"></span>
            <span class="pono-mini-avatar__shoe-right"></span>
            <span class="pono-mini-avatar__arm-left"></span>
            <span class="pono-mini-avatar__arm-right"></span>
            <span class="pono-mini-avatar__body"></span>
            <span class="pono-mini-avatar__face"></span>
            <span class="pono-mini-avatar__eyes"></span>
            <span class="pono-mini-avatar__mouth"></span>
            <span class="pono-mini-avatar__hair"></span>
            <span class="pono-mini-avatar__mark"></span>
          </span>
          <div class="profile-hub-id">
            <h3 class="profile-hub-title" id="profileHubTitle">プロフィール</h3>
            <div class="profile-hub-name" id="profileHubName">ポノ</div>
            <div class="profile-hub-meta" id="profileHubMeta">ねんれい えらばない</div>
          </div>
        </div>
        <div class="profile-hub-actions">
          <button class="profile-hub-btn" id="profileHubEditBtn" type="button">なまえを かえる</button>
          <button class="profile-hub-btn" id="profileAvatarEditBtn" type="button">すがたを えらぶ</button>
          <button class="profile-hub-btn profile-hub-btn--wide" id="profileAchievementsBtn" type="button">できたことを くわしく</button>
        </div>
        <div class="profile-hub-summary" aria-label="できたこと">
          <div class="profile-hub-meter">
            <span class="profile-hub-meter__num" id="profileHubDoneCount">0</span>
            <span class="profile-hub-meter__label">できた</span>
          </div>
          <div class="profile-hub-meter">
            <span class="profile-hub-meter__num" id="profileHubBestPct">0%</span>
            <span class="profile-hub-meter__label">いちばん</span>
          </div>
          <div class="profile-hub-meter">
            <span class="profile-hub-meter__num" id="profileHubNextCount">0</span>
            <span class="profile-hub-meter__label">もうすぐ</span>
          </div>
        </div>
        <p class="profile-hub-empty" id="profileHubEmpty" hidden>ゲームで あそぶと できたことが ふえるよ</p>
      </div>

      <div class="profile-hub-panel" id="profileAvatarPanel" hidden>
        <div class="profile-panel-head">
          <button class="profile-hub-back" id="profileAvatarBackBtn" type="button">もどる</button>
          <h3 class="profile-panel-title">すがたを えらぶ</h3>
        </div>
        <div class="profile-avatar-builder">
          <div class="profile-avatar-preview" aria-label="えらんだ すがた">
            <span class="pono-mini-avatar" id="profileAvatarPreview" data-variant="0" aria-hidden="true">
              <span class="pono-mini-avatar__tail"></span>
              <span class="pono-mini-avatar__leg-left"></span>
              <span class="pono-mini-avatar__leg-right"></span>
              <span class="pono-mini-avatar__shoe-left"></span>
              <span class="pono-mini-avatar__shoe-right"></span>
              <span class="pono-mini-avatar__arm-left"></span>
              <span class="pono-mini-avatar__arm-right"></span>
              <span class="pono-mini-avatar__body"></span>
              <span class="pono-mini-avatar__face"></span>
              <span class="pono-mini-avatar__eyes"></span>
              <span class="pono-mini-avatar__mouth"></span>
              <span class="pono-mini-avatar__hair"></span>
              <span class="pono-mini-avatar__mark"></span>
            </span>
            <span class="profile-avatar-preview__name" id="profileAvatarPreviewName">ポノっこ</span>
          </div>
          <div class="profile-avatar-grid" id="profileAvatarControls" aria-label="すがたを えらぶ"></div>
        </div>
        <button class="profile-save profile-avatar-done" id="profileAvatarDoneBtn" type="button">きめた</button>
      </div>

      <div class="profile-hub-panel" id="profileAchievementsPanel" hidden>
        <div class="profile-panel-head">
          <button class="profile-hub-back" id="profileAchievementsBackBtn" type="button">もどる</button>
          <h3 class="profile-panel-title">できたこと</h3>
        </div>
        <div class="profile-achievement-summary" aria-label="できたこと まとめ">
          <div class="profile-hub-meter">
            <span class="profile-hub-meter__num" id="profileDetailDoneCount">0</span>
            <span class="profile-hub-meter__label">できた</span>
          </div>
          <div class="profile-hub-meter">
            <span class="profile-hub-meter__num" id="profileDetailTotalCount">0</span>
            <span class="profile-hub-meter__label">ぜんぶ</span>
          </div>
          <div class="profile-hub-meter">
            <span class="profile-hub-meter__num" id="profileDetailNextCount">0</span>
            <span class="profile-hub-meter__label">もうすぐ</span>
          </div>
        </div>
        <div class="profile-goal-list" id="profileGoalList"></div>
      </div>
      <button class="modal-close" type="button" data-close="profileHubModal">とじる</button>
    </div>
  </div>

  <!-- ===== Debug Board (manage password unlock only) ===== -->
  <div class="modal" id="debugBoardModal" hidden role="dialog" aria-modal="true" aria-labelledby="debugBoardTitle">
    <div class="modal-card debug-board-card">
      <h3 id="debugBoardTitle">デバッグボード</h3>
      <!-- v1731: タブ切替 (どんぐり調整 / 機能トグル) -->
      <div class="debug-board-tabs" role="tablist" aria-label="デバッグボード タブ">
        <button class="debug-board-tab" id="debugBoardTabAcorn" type="button"
                role="tab" aria-selected="true" aria-controls="debugBoardPanelAcorn"
                data-debug-board-tab="acorn">どんぐり</button>
        <button class="debug-board-tab" id="debugBoardTabStickers" type="button"
                role="tab" aria-selected="false" aria-controls="debugBoardPanelStickers"
                data-debug-board-tab="stickers" tabindex="-1">シール</button>
        <button class="debug-board-tab" id="debugBoardTabFeatures" type="button"
                role="tab" aria-selected="false" aria-controls="debugBoardPanelFeatures"
                data-debug-board-tab="features" tabindex="-1">機能</button>
      </div>
      <div class="debug-board-panel" id="debugBoardPanelAcorn" role="tabpanel" aria-labelledby="debugBoardTabAcorn" aria-label="どんぐりを ちょうせい">
        <p class="debug-board-help">すうじを いれて<br>どんぐりの かずを かえられるよ</p>
        <div class="debug-board-panel__head">
          <span>いまの どんぐり</span>
          <strong class="debug-board-current" id="debugAcornCurrent">0</strong>
        </div>
        <div class="debug-board-row">
          <label>
            <span class="debug-board-label">ふやすかず</span>
            <input class="debug-board-input" id="debugAcornAddAmount" type="number" min="0" max="9999" step="1" inputmode="numeric" value="50">
          </label>
          <button class="debug-board-btn" id="debugAcornAddBtn" type="button">ふやす</button>
        </div>
        <div class="debug-board-presets" aria-label="すぐふやす">
          <button class="debug-board-btn" type="button" data-debug-acorn-add="10">+10</button>
          <button class="debug-board-btn" type="button" data-debug-acorn-add="50">+50</button>
          <button class="debug-board-btn" type="button" data-debug-acorn-add="100">+100</button>
          <button class="debug-board-btn" type="button" data-debug-acorn-add="500">+500</button>
        </div>
        <div class="debug-board-row">
          <label>
            <span class="debug-board-label">かずを きめる</span>
            <input class="debug-board-input" id="debugAcornSetAmount" type="number" min="0" max="9999" step="1" inputmode="numeric" value="0">
          </label>
          <button class="debug-board-btn" id="debugAcornSetBtn" type="button">このかずにする</button>
        </div>
        <div class="debug-board-status" id="debugAcornStatus" role="status" aria-live="polite"></div>
      </div>
      <div class="debug-board-panel" id="debugBoardPanelStickers" role="tabpanel" aria-labelledby="debugBoardTabStickers" aria-label="シールを ちょうせい" hidden>
        <p class="debug-board-help">テスト用にシールを<br>まとめて ふやせるよ</p>
        <div class="debug-board-panel__head">
          <span>いまの シール</span>
          <strong class="debug-board-current" id="debugStickerCurrent">0 / 0</strong>
        </div>
        <div class="debug-sticker-tools">
          <button class="debug-board-btn" id="debugStickerGrantAllBtn" type="button">ぜんぶふやす</button>
          <button class="debug-board-btn" id="debugStickerOpenBookBtn" type="button">シールちょうへ</button>
          <!-- v1897: お店のシール/購入履歴/取り置きを全消し (rotation cache + purchases + reservation)。 PonoDebugMode.isAllowed() gate + confirm() 誤爆防止 -->
          <button class="debug-board-btn" id="debugShopResetBtn" type="button">お店をリセット</button>
        </div>
        <label class="debug-feature-item debug-sticker-toggle" for="debugStickerUseAllToggle">
          <input class="debug-feature-check" id="debugStickerUseAllToggle" type="checkbox">
          <span class="debug-feature-label">はるとき ぜんぶ つかう</span>
          <span class="debug-feature-desc">ふやしていないシールも、シールちょうで はれるようにする</span>
        </label>
        <div class="debug-board-status" id="debugStickerStatus" role="status" aria-live="polite"></div>
      </div>
      <div class="debug-board-panel" id="debugBoardPanelFeatures" role="tabpanel" aria-labelledby="debugBoardTabFeatures" aria-label="機能トグル" hidden>
        <p class="debug-board-help">スタッフ用の機能トグル<br>(staging + manage 解錠時のみ反映)</p>
        <div class="debug-features-list" id="debugFeaturesList" role="group" aria-label="機能トグル いちらん">
          <p class="debug-features-empty" id="debugFeaturesEmpty" hidden>機能トグルは まだ ないよ</p>
        </div>
        <div class="debug-board-status" id="debugFeaturesStatus" role="status" aria-live="polite"></div>
      </div>
      <button class="modal-close" type="button" data-close="debugBoardModal">とじる</button>
    </div>
  </div>

  <!-- ===== News Modal ===== -->
  <div class="modal" id="newsModal" hidden role="dialog" aria-modal="true" aria-labelledby="newsTitle">
    <div class="modal-card">
      <h3 id="newsTitle">おしらせ</h3>
      <div class="news-list" id="newsList">
        <p class="news-empty" id="newsEmpty">あたらしい おしらせは ありません。</p>
      </div>
      <button class="modal-close" type="button" data-close="newsModal">とじる</button>
    </div>
  </div>

  <!-- ===== Daily sticker gacha ===== -->
  <div class="daily-gacha-modal" id="dailyGachaModal" hidden role="dialog" aria-modal="true" aria-labelledby="dailyGachaTitle">
    <div class="daily-gacha-shell">
      <div class="daily-gacha-room-bg" aria-hidden="true"></div>
      <button class="daily-gacha-close" id="dailyGachaClose" type="button" aria-label="とじる">×</button>
      <div class="daily-gacha-fixed-actions" aria-label="ガチャのメニュー">
        <button class="daily-gacha-fixed-home" id="dailyGachaFixedHome" type="button" aria-label="トップへ">トップ</button>
        <button class="daily-gacha-shop-link" id="dailyGachaShopLink" type="button" aria-label="シールの おみせ">おみせ</button>
      </div>
      <div class="daily-gacha-center-msg" id="dailyGachaCenterMsg" hidden aria-live="polite"></div>
      <div class="daily-gacha-lux" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>

      <div class="daily-gacha-foreground-stage">
        <div class="daily-gacha-counter-foreground" aria-hidden="true"></div>
        <div class="daily-gacha-machine-wrap">
          <img class="daily-gacha-machine" src="assets/ui/gacha/daily_gacha_machine.webp" alt="" draggable="false">
          <button class="daily-gacha-lever" id="dailyGachaLever" type="button" aria-label="ガチャのレバー">
            <img src="assets/ui/gacha/daily_gacha_lever.png" alt="" draggable="false">
          </button>
          <div class="daily-gacha-turn-cue" aria-hidden="true">
            <div class="daily-gacha-turn-cue__spin">
              <svg viewBox="0 0 100 100" focusable="false">
                <path class="daily-gacha-turn-cue__arc-shadow" d="M 42 16 A 36 36 0 1 1 50 86"></path>
                <path class="daily-gacha-turn-cue__arc" d="M 42 16 A 36 36 0 1 1 50 86"></path>
                <polygon class="daily-gacha-turn-cue__arrowhead" points="50,91 42,78 58,78"></polygon>
              </svg>
              <span class="daily-gacha-turn-cue__head"></span>
            </div>
            <span class="daily-gacha-turn-cue__word">まわす</span>
          </div>
          <img class="daily-gacha-guide-hand" id="dailyGachaGuideHand" src="assets/images/puzzle/ui/tutorial/hand_open_hover.png" alt="" draggable="false" aria-hidden="true">
          <div class="daily-gacha-drop-mask" aria-hidden="true">
            <img class="daily-gacha-drop-capsule" id="dailyGachaDropCapsule" src="assets/ui/gacha/daily_gacha_capsule_closed_pink.png" alt="" draggable="false">
          </div>
        </div>
      </div>
      <div class="daily-gacha-direct-hint" id="dailyGachaDirectHint" aria-live="polite">つまみを ぐるっと まわしてね</div>

      <section class="daily-gacha-panel" aria-live="polite">
        <div class="daily-gacha-eyebrow">１にち１かい</div>
        <h3 class="daily-gacha-title" id="dailyGachaTitle">ポノガチャ</h3>
        <img class="daily-gacha-status-pono" src="assets/images/characters/pono/pono_face_circle.webp" alt="" draggable="false" aria-hidden="true">
        <p class="daily-gacha-status" id="dailyGachaStatus">１にち１かい まわせるよ</p>
        <div class="daily-gacha-meter" aria-hidden="true">
          <div class="daily-gacha-meter__bar" id="dailyGachaMeter"></div>
        </div>
        <div class="daily-gacha-actions">
          <button class="daily-gacha-action daily-gacha-action--assist" id="dailyGachaAssist" type="button" hidden>もういっかい まわす</button>
          <button class="daily-gacha-action daily-gacha-action--sub" id="dailyGachaBook" type="button" hidden>シールちょうへ</button>
        </div>
      </section>

      <div class="daily-gacha-closeup" aria-hidden="true">
        <div class="daily-gacha-closeup__inner">
          <img class="daily-gacha-closeup__closed" id="dailyGachaCloseCapsule" src="assets/ui/gacha/daily_gacha_capsule_closed_pink.png" alt="" draggable="false">
          <div class="daily-gacha-closeup__open-pair" aria-hidden="true">
            <img class="daily-gacha-closeup__open-half daily-gacha-closeup__open-half--left" id="dailyGachaOpenCapsuleLeft" src="assets/ui/gacha/daily_gacha_capsule_open_pink_pono.png" alt="" draggable="false">
            <img class="daily-gacha-closeup__open-half daily-gacha-closeup__open-half--right" id="dailyGachaOpenCapsuleRight" src="assets/ui/gacha/daily_gacha_capsule_open_pink_plain.png" alt="" draggable="false">
          </div>
          <div class="daily-gacha-reward" id="dailyGachaReward" aria-hidden="true">
            <img id="dailyGachaRewardImg" src="" alt="" draggable="false">
            <span class="daily-gacha-reward__emoji" id="dailyGachaRewardEmoji">⭐</span>
            <span class="daily-gacha-rarity-badge" id="dailyGachaRarityBadge" aria-hidden="true" hidden></span>
          </div>
          <div class="daily-gacha-sparkles" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="daily-gacha-reward-name" id="dailyGachaRewardName">シールを ゲット</div>
        </div>
        <div class="daily-gacha-closeup-actions">
          <button class="daily-gacha-closeup-book" id="dailyGachaCloseupBook" type="button" aria-label="シールちょうへ"></button>
        </div>
        <div class="daily-gacha-reward-note daily-gacha-reward-note--book" id="dailyGachaRewardNote"><span class="daily-gacha-reward-note__text">シールちょうに<br>はって あそぼう</span></div>
        <div class="daily-gacha-reward-note daily-gacha-reward-note--tomorrow" id="dailyGachaTomorrowNote"><span class="daily-gacha-reward-note__text">また あした<br>やろうね</span></div>
      </div>
    </div>
  </div>

  <!-- ===== Donguri Shop v2 (v1582: 3 slot rotation, hedgehog NPC, atarashii badge) ===== -->
  <div class="donguri-shop" id="donguriShop" hidden role="dialog" aria-modal="true" aria-labelledby="donguriShopTitle">
    <div class="donguri-shop-v2-stage">
      <div class="donguri-shop-v2-backdrop" aria-hidden="true"></div>
      <div class="donguri-shop-v2-character-safe" aria-hidden="true">
        <!-- v1615: shopkeeper is separated from the UI safe layer so the foreground counter can hide the lower body. -->
        <div class="donguri-shop-v2-shopkeeper">
          <img id="donguriShopkeeperImg" src="assets/ui/shop/sticker_shopkeeper_squirrel_pose_idle_highlight_20260626.png" alt="" draggable="false" />
        </div>
      </div>
      <div class="donguri-shop-v2-counter" aria-hidden="true"></div>
      <div class="donguri-shop-v2-safe">
        <div class="donguri-shop-v2-bubble" id="donguriShopBubble" role="status" aria-live="polite">もうすぐ かわるよ</div>
        <div class="donguri-shop-v2-subtitle" id="donguriShopSubtitle" role="note" aria-live="polite" hidden></div>
        <div class="donguri-shop-v2-reserve is-empty" id="donguriShopReserve" aria-live="polite"></div>
        <header class="donguri-shop-v2-head">
          <button class="donguri-shop-v2-close" id="donguriShopClose" type="button" aria-label="閉じる">×</button>
          <h2 class="donguri-shop-v2-title" id="donguriShopTitle">もりのおみせ こもれびや</h2>
          <div class="donguri-shop-v2-balance">
            <span class="donguri-shop-v2-balance-icon" aria-hidden="true"></span>
            <span id="donguriShopBalance">0</span>
          </div>
        </header>
        <div class="donguri-shop-v2-rotation-note">まいにち <span class="donguri-shop-v2-rotation-note__time">あさ6じ</span>・<span class="donguri-shop-v2-rotation-note__time">ゆうがた6じ</span>に しょうひんがかわるよ</div>
        <div class="donguri-shop-v2-slots" id="donguriShopSlots" role="list"></div>
        <!-- v1595: #donguriShopCountdown を削除 — countdown text は #donguriShopBubble に統合 (hedgehog 右下隣) -->
      </div>
    </div>
  </div>

  <!-- v1571 phase 5: ショップ購入演出オーバーレイ (zoom-in + 紙吹雪) -->
  <div class="donguri-shop-celebration" id="donguriShopCelebration" hidden aria-hidden="true"></div>

  <!-- ===== Password Unlock Modal (絵本パスワード入力 → premium 解錠) =====
       v1722: book tier unlock 3 経路化 (シリアル / Amazon 注文番号 / 絵本クイズ)。
       - .password-modal-help は後方互換のため class を維持しつつ id を付与し、
         success 表示時に display:none で隠す既存ロジックと共存。
       - 旧 #passwordUnlockInput / #passwordUnlockSubmit は シリアルタブ内に同 id で残置 (DOM 参照後方互換)。 -->
  <div class="modal" id="passwordUnlockModal" hidden role="dialog" aria-modal="true" aria-labelledby="passwordUnlockTitle">
    <div class="password-modal-card">
      <div class="password-modal-inner">
        <h3 id="passwordUnlockTitle" class="password-modal-title">えほんを もっているひとへ</h3>
        <p class="password-modal-help" id="passwordUnlockHelp">したの どちらかで<br>book メンバーが ひらくよ</p>

        <!-- 3 経路タブ (WAI-ARIA Tabs Pattern, Manual Activation) -->
        <div class="password-modal-tabs" role="tablist" aria-label="unlock ほうほう">
          <button type="button" class="pw-tab is-active" role="tab" id="pwTabSerial"
                  data-pw-tab="serial" aria-selected="true" aria-controls="pwPanelSerial" tabindex="0">
            <span class="pw-tab-icon" aria-hidden="true">🔑</span>
            <span class="pw-tab-label">あいことば</span>
          </button>
          <button type="button" class="pw-tab" role="tab" id="pwTabOrder"
                  data-pw-tab="order" aria-selected="false" aria-controls="pwPanelOrder" tabindex="-1">
            <span class="pw-tab-icon" aria-hidden="true">📦</span>
            <span class="pw-tab-label">Amazon</span>
          </button>
          <button type="button" class="pw-tab" role="tab" id="pwTabQuiz"
                  data-pw-tab="quiz" aria-selected="false" aria-controls="pwPanelQuiz" tabindex="-1">
            <span class="pw-tab-icon" aria-hidden="true">🐾</span>
            <span class="pw-tab-label">クイズ</span>
          </button>
        </div>

        <!-- Panel: シリアル (既存 #passwordUnlockInput / #passwordUnlockSubmit を内包) -->
        <section class="pw-panel" id="pwPanelSerial" role="tabpanel"
                 aria-labelledby="pwTabSerial" data-pw-panel="serial">
          <p class="pw-panel-lead">えほんの うらに かいてある<br>あいことばを いれてね</p>
          <input type="text" class="password-modal-input" id="passwordUnlockInput"
                 placeholder="あいことば" autocomplete="off" autocorrect="off"
                 spellcheck="false" inputmode="text" aria-describedby="pwHintSerial">
          <p class="pw-hint" id="pwHintSerial">えほんの うらを みてね</p>
          <button class="password-modal-submit" id="passwordUnlockSubmit" type="button">ひらく！</button>
        </section>

        <!-- Panel: Amazon 注文番号 -->
        <section class="pw-panel" id="pwPanelOrder" role="tabpanel" hidden
                 aria-labelledby="pwTabOrder" data-pw-panel="order">
          <p class="pw-panel-lead">Amazonで かった ひとは<br>ちゅうもんばんごうを いれてね</p>
          <input type="text" class="password-modal-input" id="pwOrderInput"
                 placeholder="250-1234567-1234567"
                 autocomplete="off" autocorrect="off" spellcheck="false"
                 inputmode="numeric" maxlength="19"
                 aria-describedby="pwHintOrder">
          <p class="pw-hint" id="pwHintOrder">3けた-7けた-7けた の すうじ</p>
          <button class="password-modal-submit" id="pwSubmitOrder" type="button">ひらく！</button>
        </section>

        <!-- Panel: 絵本クイズ -->
        <section class="pw-panel" id="pwPanelQuiz" role="tabpanel" hidden
                 aria-labelledby="pwTabQuiz" data-pw-panel="quiz">
          <p class="pw-panel-lead">えほんを よんだひとなら わかる クイズ</p>
          <div class="pw-quiz-question" id="pwQuizQuestion" aria-live="polite" data-qid="">
            (もんだいを よみこんでいるよ)
          </div>
          <input type="text" class="password-modal-input" id="pwQuizInput"
                 placeholder="こたえ" autocomplete="off" autocorrect="off"
                 spellcheck="false" inputmode="text" aria-describedby="pwHintQuiz">
          <p class="pw-hint" id="pwHintQuiz">ひらがな・カタカナ・かんじ どれでも OK</p>
          <button class="password-modal-submit" id="pwSubmitQuiz" type="button">ひらく！</button>
          <button type="button" class="pw-quiz-reroll" id="pwQuizReroll" aria-label="べつの もんだいに する">
            🔄 べつの もんだい
          </button>
        </section>

        <div class="password-modal-error" id="passwordUnlockError" hidden role="alert" aria-live="assertive">ちがうよ！ もういちど！</div>
        <div class="password-modal-success" id="passwordUnlockSuccess" hidden>
          <div class="password-modal-success-tag" id="passwordUnlockSuccessTag">✨ えほんの とくてんが ひらいたよ ✨</div>
          <p class="password-modal-success-body" id="passwordUnlockSuccessBody">あたらしい ステージや<br>あそびが ひらいたよ！</p>
          <button class="password-modal-close" type="button" data-close="passwordUnlockModal">あそびに もどる</button>
          <button class="password-modal-reset" id="passwordUnlockReset" type="button">🔄 デバッグ: フリーに もどす</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== v3: 「アプリで あそべる」 ゾーン誘導モーダル (feature_tier_v3 §5) =====
       book/free 共用。 コピー/ボタンは openAppZonePromo() が実行時に差し替える。 -->
  <div class="modal app-zone-promo-modal" id="appZonePromoModal" hidden role="dialog" aria-modal="true" aria-labelledby="appZonePromoBody">
    <div class="modal-card app-zone-promo-card">
      <button type="button" class="app-zone-promo-close" id="appZonePromoClose" aria-label="とじる">×</button>
      <div class="app-zone-promo-tag">アプリで あそべる</div>
      <p class="app-zone-promo-body" id="appZonePromoBody"></p>
      <div class="app-zone-promo-btnrow">
        <button type="button" class="azp-btn azp-btn--ghost" id="appZonePromoSecondary"></button>
        <button type="button" class="azp-btn azp-btn--primary" id="appZonePromoPrimary"></button>
      </div>
    </div>
  </div>

  <!-- ===== v3: book welcome 演出 (feature_tier_v3 §4.3, 生涯1回) =====
       あいことば解錠直後に発火する 6 ステップの演出。 skip は右上に常設し、
       skip でも grantBookBonus (book 特典 8 シール) は確定実行する。 -->
  <div class="book-welcome-overlay" id="bookWelcomeOverlay" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="ポノからの ようこそ えんしゅつ">
    <button type="button" class="book-welcome-skip" id="bookWelcomeSkip">スキップ ▶</button>
    <div class="book-welcome-stage" id="bookWelcomeStage">
      <img class="book-welcome-walker" id="bookWelcomeWalker" src="assets/images/characters/pono_side_fullbody.png" alt="" draggable="false" hidden>
      <div class="book-welcome-letter" id="bookWelcomeLetter" hidden>
        <div class="book-welcome-letter-card">
          <div class="book-welcome-letter-text" id="bookWelcomeLetterText">ありがとう。<br>えほんを よんでくれて。</div>
        </div>
      </div>
      <div class="book-welcome-reveal" id="bookWelcomeReveal" hidden>
        <div class="book-welcome-reveal-title">ポノからの プレゼント</div>
        <div class="book-welcome-reveal-grid" id="bookWelcomeRevealGrid"></div>
      </div>
      <div class="book-welcome-cover" id="bookWelcomeCover" hidden>
        <div class="book-welcome-cover-title">シールちょうの ひょうしも<br>とくべつに なったよ</div>
        <div class="book-welcome-cover-frame">
          <iframe class="book-welcome-cover-frame-iframe" id="bookWelcomeCoverFrame" src="" title="とくべつな シールちょう ひょうし" loading="lazy"></iframe>
        </div>
      </div>
      <div class="book-welcome-outro" id="bookWelcomeOutro" hidden>
        <div class="book-welcome-outro-text">いつでも シールちょうから<br>みれるよ</div>
        <button type="button" class="azp-btn azp-btn--primary" id="bookWelcomeDone">とじる</button>
      </div>
    </div>
  </div>

  <!-- ===== v3: 月1 おかえり演出 (feature_tier_v3 §4.4, book/sub 共通) ===== -->
  <div class="okaeri-toast" id="okaeriToast" hidden aria-live="polite">
    <img class="okaeri-toast-img" src="assets/images/bento/story/staff/pono_wave.png" alt="" draggable="false">
    <div class="okaeri-toast-text">えほんを かってくれて<br>ありがとうね</div>
  </div>

  <!-- 絵本パスワード解錠ロジック (PonoTier.verifyBookPassword) を提供 -->
  <script src="common/debug-mode.js">
;
// ---- script block 2 ----

  (function(){
    function regCapture(){
      if (!window.PonoCapture) return;
      window.PonoCapture.register({
        gameId: 'play-gacha',
        defaultLabel: 'gacha',
        build: async function(opts){
          // ガチャ機本体 (.daily-gacha-shell) だけを撮る。
          // shell は 1080x620 (≒16:9) のアスペクト比で、 16:9 フレームに contain で
          // 配置すると上下ほぼピッタリ + 左右に小余白で収まる。
          // モーダル全体 (#dailyGachaModal) を撮ると周囲の黒 backdrop が入って
          // 16:9 中央に shell が小さく浮く絵になるため、 target を shell に変更。
          var modal = document.getElementById('dailyGachaModal');
          if (!modal) {
            console.warn('[play-gacha capture] #dailyGachaModal not found');
            return null;
          }
          // モーダルが [hidden] 状態のときは shell も実質非表示なので撮影不可
          if (modal.hasAttribute('hidden')) {
            console.warn('[play-gacha capture] modal is hidden; open the gacha modal first');
            return null;
          }
          var container = document.querySelector('.daily-gacha-shell');
          if (!container) {
            console.warn('[play-gacha capture] .daily-gacha-shell not found');
            return null;
          }
          try {
            var mod = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
            var html2canvas = (mod && (mod.default || mod));
            if (typeof html2canvas !== 'function') {
              throw new Error('html2canvas module shape unexpected');
            }
            var h2cOpts = (window.PonoCapture && typeof window.PonoCapture.html2canvasOptions === 'function')
              ? window.PonoCapture.html2canvasOptions({ backgroundColor: null })
              : {
                  backgroundColor: null,
                  scale: 2,
                  useCORS: true,
                  allowTaint: false,
                  logging: false,
                  imageTimeout: 30000,
                  removeContainer: true,
                  ignoreElements: function(el){
                    try {
                      if (!el) return false;
                      if (el.hasAttribute && el.hasAttribute('data-capture-hide')) return true;
                      if (el.classList && el.classList.contains && el.classList.contains('pono-capture-overlay')) return true;
                    } catch(e) {}
                    return false;
                  }
                };
            return await html2canvas(container, h2cOpts);
          } catch (e) {
            console.warn('[play-gacha capture] html2canvas import/exec failed:', e);
            throw e;
          }
        }
      });
    }
    if (window.PonoCapture) regCapture();
    else window.addEventListener('DOMContentLoaded', regCapture, { once: true });
  })();
  
;
// ---- script block 3 ----

  (function () {
    'use strict';
    function bindBrandSignDebug() {
      var sign = document.querySelector('.brand-sign');
      if (!sign) return;
      if (sign.dataset.debugBound === '1') return;
      sign.dataset.debugBound = '1';
      // Cursor/title hints only when on staging host (avoid leaking affordance on prod).
      try {
        if (window.PonoDebugMode && typeof window.PonoDebugMode.isStagingHost === 'function'
            && window.PonoDebugMode.isStagingHost()) {
          sign.style.cursor = 'pointer';
          sign.setAttribute('title', 'Debug mode');
        }
      } catch (_e) { /* noop */ }
      sign.addEventListener('click', function (ev) {
        if (typeof window.PonoDebugMode === 'undefined') return;
        if (!window.PonoDebugMode.isStagingHost || !window.PonoDebugMode.isStagingHost()) return;
        if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        try { window.PonoDebugMode.promptUnlock(); } catch (_e) { /* noop */ }
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindBrandSignDebug, { once: true });
    } else {
      bindBrandSignDebug();
    }
  })();
  
;
// ---- script block 4 ----

    'use strict';

    function isManageDebugAllowed() {
      try {
        return !!(window.PonoDebugMode && typeof window.PonoDebugMode.isAllowed === 'function' && window.PonoDebugMode.isAllowed());
      } catch (_) {
        return false;
      }
    }
    function refreshDeveloperAccessUI() {
      // batch:887 admin-debug-leak-fix — ?dev=1 は manage unlock 後 + "play-dev-mode" ON でのみ有効。
      // 本番ユーザー (PonoDebugMode 未 unlock) は URL を直叩きしても dev-mode クラスが付かない。
      var urlDevParam = false;
      try { urlDevParam = new URLSearchParams(location.search).get('dev') === '1'; } catch (_) {}
      var urlDevAllowed = false;
      try {
        urlDevAllowed = !!(window.PonoDebugMode
          && typeof window.PonoDebugMode.isFeatureEnabled === 'function'
          && window.PonoDebugMode.isFeatureEnabled('play-dev-mode'));
      } catch (_) {}
      var urlDev = urlDevParam && urlDevAllowed;
      var manageDebug = isManageDebugAllowed();
      document.body.classList.toggle('dev-mode', !!(urlDev || manageDebug));
      document.body.classList.toggle('manage-debug-mode', !!manageDebug);
      var debugBoardBtn = document.getElementById('settingsDebugBoardBtn');
      if (debugBoardBtn) debugBoardBtn.hidden = !manageDebug;
      return manageDebug;
    }
    refreshDeveloperAccessUI();

    // ===== Game catalog (free MVP set) =====
    // panel: カード木枠の背景 (各ゲームで違う木目バリエーション)
    // thumb: カード左の丸サムネ (各ゲーム個別)
    // ----- Phase 1 launch ordering -----
    // 上段 5 本 (quizland → maze → oto → puzzle → bento) は無料公開済みの
    // 本実装ゲーム (tier:'free')。
    // 下段 4 本 (writing-mori / wordmatch / zukan / kitchen) は本リリースでは
    // 準備中扱いだが、開発者がリンク経由で挙動を確認できるよう
    // debugPlayable:true を付与して startGame ガードをすり抜けられるようにする。
    // (badge と is-coming-soon クラスは残るので一般ユーザーには「じゅんびちゅう」
    //  として見える)
    // quiz-sound は MENU_GAMES.filter で除外されるため順番は問わない。
    const GAMES = [
      {
        id: 'quizland',
        title: 'フクロウはかせのなぞなぞ',
        subtitle: 'ひらめき・ものしりクイズ',
        icon: '🦉',
        bg: 'assets/ui/play_quizland_title_back.webp',
        href: 'quizland/index.html',
        panel: 'assets/ui/menu_card_base_01.webp',
        // owl_professor_guide.png はフクロウ博士の単体立ち絵 (透過)。
        // 旧 thumb_quizland.png (教室シーン) はテーマと合わないため不使用。
        thumb: 'assets/ui/thumb_quizland_owl.webp',
        thumbPos: '50% 50%',
        peekPos: '67% 55%',
        tier: 'free'
      },
      {
        id: 'nazonazo-tunnel',
        title: 'ポノのなぞなぞトンネル',
        subtitle: 'こたえて トンネルを あけよう',
        icon: '🚂',
        bg: 'assets/ui/play_quiz_sound_title_back.webp',
        href: 'nazonazo-tunnel/index.html',
        panel: 'assets/ui/menu_card_base_03.webp',
        thumb: 'assets/ui/thumb_quiz-sound.webp',
        thumbPos: '50% 52%',
        peekPos: '50% 50%',
        tier: 'sub'
      },
      {
        id: 'mojicrane',
        title: 'ポノのもじもじクレーン',
        subtitle: 'もじを あつめて ことばを つくろう',
        icon: '🏗️',
        bg: 'assets/ui/play_wordmatch_title_back.webp',
        href: 'mojicrane/index.html',
        panel: 'assets/ui/menu_card_base_01.webp',
        thumb: 'assets/ui/thumb_wordmatch.webp',
        thumbPos: '50% 52%',
        peekPos: '50% 50%',
        tier: 'sub'
      },
      {
        id: 'maze',
        title: 'ポノとランタンのめいろ',
        subtitle: 'ランタンをもって まいごさがし',
        icon: '🏮',
        bg: 'assets/ui/play_maze_title_back.webp',
        href: 'maze/index.html',
        panel: 'assets/ui/menu_card_base_04.webp',
        // 本物の迷路絵 (ランタン+夜の小道) は thumb_quiz-sound.webp 側に
        // 入っているのでこちらを流用。 thumb_maze.webp は中身が
        // ずかん風 (本+きのこ) なので zukan カードで使用する。
        thumb: 'assets/ui/thumb_quiz-sound.webp',
        // 文字で顔の目元が隠れやすいため、背景を少し上へ寄せる。
        peekPos: '50% 62%',
        tier: 'free'
      },
      {
        id: 'oto',
        title: 'ポノのおとタッチ',
        subtitle: 'タップして おとを ならそう',
        icon: '🎵',
        bg: 'assets/ui/play_oto_title_back.webp',
        href: 'oto/index.html',
        panel: 'assets/ui/menu_card_base_01.webp',
        thumb: 'assets/ui/thumb_oto.webp',
        thumbPos: '34% 54%',
        // 音符と光の流れが主役の新背景。文字が多少重なっても
        // 全体の雰囲気でゲーム内容が伝わるように中央寄せで見せる。
        peekPos: '50% 50%',
        tier: 'free'
      },
      {
        id: 'bento',
        title: 'ポノとつくろう いろどりべんとう',
        subtitle: 'すきな おかずを つめよう',
        icon: '🍱',
        bg: 'assets/ui/play_bento_title_back.webp',
        href: 'bento/index.html',
        panel: 'assets/ui/menu_card_base_02.webp',
        thumb: 'assets/ui/thumb_bento.webp',
        thumbPos: '31% 58%',
        peekPos: '36% 52%',
        tier: 'free'
      },
      {
        id: 'puzzle',
        title: 'ポノのなかよしパズル',
        subtitle: 'ピースを あわせて えを つくろう',
        icon: '🧩',
        bg: 'assets/ui/play_puzzle_title_back.webp',
        href: 'puzzle/index.html',
        panel: 'assets/ui/menu_card_base_03.webp',
        thumb: 'assets/ui/thumb_puzzle.webp',
        thumbPos: '36% 52%',
        peekPos: '39% 49%',
        tier: 'free'
      },
      {
        id: 'starparodier',
        title: 'ポノのスターパロジャー',
        subtitle: 'うちゅうで メカと たたかおう',
        icon: '🚀',
        bg: 'assets/ui/play_starparodier_title_back.webp',
        href: 'starparodier/index.html',
        panel: 'assets/ui/menu_card_base_03.webp',
        thumb: 'assets/ui/thumb_starparodier.webp',
        thumbPos: '50% 52%',
        peekPos: '50% 50%',
        tier: 'sub'
      },
      {
        id: 'undersea-cave',
        title: 'ポノの海底洞窟たんけん',
        subtitle: 'ひかりのエサを とどけよう',
        icon: '🌊',
        bg: 'assets/images/undersea-cave/bg_wall_near.png',
        href: 'undersea-cave/index.html',
        panel: 'assets/ui/menu_card_base_01.webp',
        thumb: 'assets/images/undersea-cave/friend_whale_sleep.png',
        thumbPos: '48% 52%',
        peekPos: '50% 50%',
        tier: 'sub'
      },
      {
        id: 'sea-album',
        title: 'ポノの海底アルバム',
        subtitle: 'いきものを しらべて カードを あつめよう',
        icon: '🐚',
        bg: 'assets/images/sea-album/stage1/stage1_tidepool_scroll_panorama.png',
        href: 'sea-album/index.html',
        panel: 'assets/ui/menu_card_base_02.webp',
        thumb: 'assets/images/sea-album/stage1/stage1_tidepool_scroll_panorama.png',
        thumbPos: '50% 62%',
        peekPos: '50% 52%',
        tier: 'sub'
      },
      // ----- Coming-soon (debug-playable for devs) -----
      {
        id: 'writing-mori',
        title: 'もじっこファーム',
        subtitle: 'ひらがなを なぞって ミルマルを そだてよう',
        icon: '✏️',
        bg: 'assets/ui/play_wordmatch_title_back.webp',
        href: 'writing-mori/index.html',
        panel: 'assets/ui/menu_card_base_04.webp',
        thumb: 'assets/ui/thumb_wordmatch.webp',
        thumbPos: '45% 52%',
        peekPos: '50% 50%',
        comingSoon: true,
        debugPlayable: true,
        tier: 'sub'
      },
      {
        id: 'zukan',
        title: 'ポノのもりのずかん',
        subtitle: 'もりを たんけんして どうぶつを みつけよう',
        icon: '📕',
        bg: 'assets/ui/play_zukan_outer_bg_21x9.webp',
        href: 'zukan/index.html',
        panel: 'assets/ui/menu_card_base_04.webp',
        // thumb_maze.webp は実際は ずかん風 (本+葉+きのこ+まつぼっくり)
        // の絵なので、 ずかんカードで正しく使う。
        thumb: 'assets/ui/thumb_maze.webp',
        comingSoon: true,
        debugPlayable: true,
        tier: 'sub'
      },
      // cooking (コトコト もりのキッチン) は iredori bento と対になる料理ゲーム。
      // アセット (bg / thumb / panel) は launch 前に正規素材へ差し替え予定 (memory: feature_cooking_game)。
      {
        id: 'cooking',
        title: 'コトコト もりのキッチン',
        subtitle: 'ぐつぐつ おりょうりタイム',
        icon: '🍳',
        bg: 'assets/ui/play_quizland_title_back.webp',
        href: '#',
        panel: 'assets/ui/menu_card_base_02.webp',
        thumb: 'assets/ui/thumb_bento.webp',
        thumbPos: '50% 50%',
        peekPos: '50% 50%',
        tier: 'sub',
        comingSoon: true,
        debugPlayable: true
      },
      // ----- Hidden from menu (filtered out by MENU_GAMES) -----
      {
        id: 'quiz-sound',
        title: 'こだまのもりのこえさがし',
        subtitle: 'どうぶつのこえを きいて さがそう',
        icon: '🐦',
        bg: 'assets/ui/play_quiz_sound_title_back.webp',
        href: 'quiz-sound/index.html',
        panel: 'assets/ui/menu_card_base_02.webp',
        thumb: 'assets/ui/thumb_quiz-sound.webp'
      }
    ];
    // PonoTier.isAppBuild() を優先使用し、未ロード時は window.__APP_BUILD__ 直読みで fallback。
    // v3 以降も daily gacha 等の他ロジックから参照されるため isAppBuild 判定自体は維持。
    const __isAppBuild = (() => {
      try {
        if (window.PonoTier && typeof window.PonoTier.isAppBuild === 'function') {
          return window.PonoTier.isAppBuild();
        }
      } catch (_) {}
      return window.__APP_BUILD__ === 1 || window.__APP_BUILD__ === '1';
    })();

    // ===== tier v3: 3ゾーン UI (feature_tier_v3 §7) =====
    // zone は GAMES の既存フィールド (tier / comingSoon) から機械的に導出する。
    // 手動の個別分類はしない — GAMES 側で tier/comingSoon を変えれば自動で
    // ゾーンが追従する。
    //   playable    : tier:'free' (free=book, 機能差ゼロ) かつ comingSoon なし
    //   app_only    : tier:'sub' かつ comingSoon なし
    //   coming_soon : comingSoon:true (tier に関わらず最後尾ゾーン)
    function computeGameZone(game) {
      if (game.comingSoon) return 'coming_soon';
      if (game.tier === 'sub') return 'app_only';
      return 'playable';
    }
    GAMES.forEach((game) => { game.zone = computeGameZone(game); });

    const ZONE_ORDER = ['playable', 'app_only', 'coming_soon'];
    const ZONE_LABELS = {
      playable: 'いま あそべる',
      app_only: 'アプリで あそべる',
      coming_soon: 'じゅんびちゅう'
    };
    const ZONE_SUBLABELS = {
      playable: 'えほんを かってくれた ひとも みんな あそべるよ',
      app_only: 'アプリだけの とくべつな あそびだよ',
      coming_soon: 'いま つくっているよ。 もうすこし まっててね'
    };

    // v3: 「アプリで あそべる」 ゾーンを LP 版 (非アプリビルド) でもマーケティング露出
    // させるため、 旧 TITLE_MENU_IDS から漏れていた sub 専用ゲーム
    // (starparodier / undersea-cave / sea-album) をカタログに追加する。
    // zukan / writing-mori / cooking は GAMES 側で comingSoon:true 済のため
    // computeGameZone() が自動的に 「じゅんびちゅう」 ゾーンへ振り分ける。
    const TITLE_MENU_IDS = [
      'quizland', 'maze', 'oto', 'bento', 'puzzle',                                  // playable
      'nazonazo-tunnel', 'mojicrane', 'starparodier', 'undersea-cave', 'sea-album',   // app_only
      'writing-mori', 'zukan', 'cooking'                                             // coming_soon
    ];

    const __rawMenuGames = TITLE_MENU_IDS
      .map((id) => GAMES.find((game) => game.id === id))
      .filter(Boolean);

    // v3: 旧 「tier:'sub' は !__isAppBuild で完全非表示」 フィルタは撤去。
    // 「アプリで あそべる」 ゾーンは LP 版でもカードとして見せ、 タップ時に
    // book/free 別コピーの誘導モーダルを出す (feature_tier_v3 §5, startGame() 内)。
    // ゾーンの先頭には非インタラクティブな見出し疑似カード (isZoneHeader) を
    // 挿入し、 既存の無限ループカルーセル (LOOP_COPIES 等) にそのまま乗せる。
    function buildMenuGamesWithZoneHeaders(games) {
      const out = [];
      ZONE_ORDER.forEach((zone) => {
        const members = games.filter((g) => g.zone === zone);
        if (!members.length) return;
        out.push({
          id: '__zone_header_' + zone,
          isZoneHeader: true,
          zone,
          title: ZONE_LABELS[zone] || '',
          subtitle: ZONE_SUBLABELS[zone] || ''
        });
        members.forEach((g) => out.push(g));
      });
      return out;
    }
    const MENU_GAMES = buildMenuGamesWithZoneHeaders(__rawMenuGames);

    let currentIdx = 0;
    let activeBgEl = 'A';

    const $ = (id) => document.getElementById(id);
    const previewBgA = $('previewBgA');
    const previewBgB = $('previewBgB');
    const cardList = $('cardList');

    // ===== HTML escape (defensive: GAMES may become external in future) =====
    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Children's-book typography rhythm: shrink ONLY one-letter hiragana
    // particles (の, と, は, を, に, へ, が, も, で, や, か) that sit
    // *between* katakana / kanji words. Multi-character hiragana runs
    // (verbs, names) stay full size — only the connector particles recede.
    //
    // We don't try to fully parse Japanese; we just look for a single
    // hiragana letter sandwiched between non-hiragana glyphs.
    const PARTICLE_HIRA = /[のとはをにへがもでやかよりからまで]/;
    function decorateKana(rawTitle) {
      const escaped = esc(rawTitle);
      const withPonoParticles = escaped.replace(
        /(ポノ)([のと])/g,
        (_, head, particle) => `${head}<span class="hira">${particle}</span>`
      );
      // Match a single hiragana char preceded & followed by a non-hiragana
      // (katakana / kanji / latin / digit / punctuation). Use a lookbehind /
      // lookahead so we only wrap the one character itself.
      // The class "hira" is a leftover name; semantically these are particles.
      return withPonoParticles.replace(
        /(?<=[\u30A0-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F\u3005\w])([\u3041-\u3096])(?=[\u30A0-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F\u3005\w])/g,
        (m, ch) => PARTICLE_HIRA.test(ch) ? `<span class="hira">${ch}</span>` : ch
      );
    }

    function gameTitleAccent(kind, text) {
      return `<span class="game-title-accent game-title-accent--${kind}">${esc(text)}</span>`;
    }
    function gameTitleParticle(text) {
      return `<span class="game-title-particle">${esc(text)}</span>`;
    }
    function gameTitleBreak(modifierClass) {
      const extraClass = modifierClass ? ` ${esc(modifierClass)}` : '';
      return `<span class="game-title-break${extraClass}" aria-hidden="true"> </span>`;
    }
    function decorateGameTitle(gameId, rawTitle) {
      switch (gameId) {
        case 'quizland':
          return [
            gameTitleAccent('owl', 'フクロウ'),
            esc('はかせ'),
            gameTitleParticle('の'),
            gameTitleAccent('quizland', 'なぞなぞ')
          ].join('');
        case 'maze':
          return [
            gameTitleAccent('pono', 'ポノ'),
            gameTitleParticle('と'),
            esc('ランタン'),
            gameTitleParticle('の'),
            gameTitleAccent('maze', 'めいろ')
          ].join('');
        case 'nazonazo-tunnel':
          return [
            gameTitleAccent('pono', 'ポノ'),
            gameTitleParticle('の'),
            gameTitleAccent('quizland', 'なぞなぞ'),
            gameTitleAccent('maze', 'トンネル')
          ].join('');
        case 'mojicrane':
          return [
            gameTitleAccent('pono', 'ポノ'),
            gameTitleParticle('の'),
            gameTitleAccent('quizland', 'もじもじ'),
            gameTitleAccent('maze', 'クレーン')
          ].join('');
        case 'oto':
          return [
            gameTitleAccent('pono', 'ポノ'),
            gameTitleParticle('の'),
            gameTitleAccent('oto', 'おと'),
            esc('タッチ')
          ].join('');
        case 'puzzle':
          return [
            gameTitleAccent('pono', 'ポノ'),
            gameTitleParticle('の'),
            esc('なかよし'),
            gameTitleAccent('puzzle', 'パズル')
          ].join('');
        case 'bento':
          // v1765: きょうのチャレンジでは「ポノとつくろう」直後を明示改行点にする。
          // 通常カード側は nowrap のままなので、同じ marker は半角スペースとして表示される。
          return [
            gameTitleAccent('pono', 'ポノ'),
            gameTitleParticle('と'),
            esc('つくろう'),
            gameTitleBreak('game-title-break--bento'),
            gameTitleAccent('bento', 'いろどりべんとう')
          ].join('');
        case 'cooking':
          // v1690: 同上 (wbr 撤廃 + space は inline-block particle で wrap 不可化)。
          // v1691: 「もりのキッチン」 の 「の」 を particle 化 (他カードと同一規約)。
          return [
            esc('コトコト'),
            gameTitleParticle(' '),
            gameTitleAccent('cooking', 'もり'),
            gameTitleParticle('の'),
            gameTitleAccent('cooking', 'キッチン')
          ].join('');
        default:
          return decorateKana(rawTitle);
      }
    }

    // ===== Render cards =====
    // Cache-buster for Claude preview only (skirts a stale service worker
    // that returns broken responses for <img> while fetch() works).
    const __isPreview = /claudeusercontent\.com$/.test(location.hostname);
    // sw.js の CACHE_VERSION と揃える。Date.now() ベースだと iOS Safari で HTTP キャッシュが
    // 機能しなくなる (毎回 URL が変わる) ので、static な version を使う。デプロイ時に
    // CACHE_VERSION をバンプすれば自動でバスター値も変わり、SW 更新と同期する。
    const PAGE_CACHE_VERSION = 1990;
    const __bust = (url) => __isPreview ? `${url}${url.includes('?') ? '&' : '?'}_=v${PAGE_CACHE_VERSION}` : url;
    // ===== ごかんそう (rating) Apps Script Web App 連携 (v1951 で Google Forms から移行) =====
    // 星クリック時に rating-modal.js が hidden POST (no-cors) で送信。 hostname 分岐は不要 (Apps Script
    // 側で environment パラメータを見て localhost/staging/production/unknown を判別する 1 本構成)。
    window.PONO_FEEDBACK_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwAHRy0UyHRCktZdxpQEgUHj7jEuHA49lb6t5HgckVmYogQTDdB4AlRhT99rp94U4hLhA/exec';
    // batch:938 (v1953): rating-modal.js:217 の `String(window.PONO_SW_VERSION || '')` が
    // 空文字にならないよう、 sw.js CACHE_VERSION と同期した値を注入。 sw.js を bump するたびに
    // ここも同期させる (play.html PAGE_CACHE_VERSION と同じ運用)。
    window.PONO_SW_VERSION = 'v1990';

    // Keep the old vertical loop behavior: the viewport shows four cards,
    // with the fifth game reachable by scrolling up/down through duplicate sets.
    const LOOP_COPIES = 3;

    // v1694: FV (initial scroll = middle copy = rep 1) に物理的に入る最初の
    // 5 枚だけ eager+sync+high。 残りは lazy+async+low で同フレーム同時 request
    // を激減させる (旧: 21 枚 × 3 img = 63 img、 panel/play は loadingAttr=
    // 'eager' (rep<=1) で 14 並列発射 → 上下バラバラ paint の直接原因)。
    // v3: 先頭に「いま あそべる」ゾーン見出し疑似カードが 1 枚挿入されたため、
    // 実カード 5 枚 (quizland/maze/oto/bento/puzzle) を eager 対象に収めるには
    // +1 が必要 (見出し自体は img を持たないので実質コストは変わらない)。
    const PRIORITY_EAGER_COUNT = 6;
    const PRIORITY_REP = 1;          // 初期 scrollTop = oneSetH() の copy
    const PLAY_BTN_NORMAL_URL  = __bust('assets/ui/play_button_normal.webp');
    const PLAY_BTN_PRESSED_URL = __bust('assets/ui/play_button_pressed.webp');

    // v3: ゾーン見出し疑似カード。 通常カードと同じ .game-card シェル
    // (width:100% + aspect-ratio 継承) に乗せることで、 既存の無限ループ
    // カルーセル (uniform card height 前提の scroll 物理演算) を一切
    // 変更せずにそのまま組み込める。 <div> (非 button) なのでキーボード
    // Tab 順にも入らず、 onCardClick 側も data-id 無し + selectGame/startGame
    // 側の isZoneHeader ガードで安全に無害化される。
    function zoneHeaderMarkup(g, i, rep) {
      return `
        <div class="game-card game-card--zone-header" data-idx="${i}" data-rep="${rep}" data-zone="${esc(g.zone)}" role="presentation" aria-hidden="true">
          <div class="zone-header__inner">
            <span class="zone-header__label">${esc(g.title)}</span>
            <span class="zone-header__sub">${esc(g.subtitle)}</span>
          </div>
        </div>
      `;
    }

    function cardMarkup(g, i, rep) {
      if (g.isZoneHeader) return zoneHeaderMarkup(g, i, rep);
      // is-coming-soon: 通常の準備中カード (彩度↓ + play 半透明)
      // is-debug-playable: 上の彩度フィルタを打ち消して開発者だけが遷移できる扱い。
      //   バッジ自体は残す (一般ユーザーには「じゅんびちゅう」のまま見える)。
      const comingClass = g.comingSoon
        ? (g.debugPlayable ? ' is-coming-soon is-debug-playable' : ' is-coming-soon')
        : '';
      const comingBadge = g.comingSoon
        ? '<div class="game-card__soon">じゅんびちゅう</div>'
        : '';
      // Pair each panel image with its matching alpha mask. The mask cuts
      // the hover-peek layer to the cream paper region of the wood frame.
      // The actual mask file + offsets are applied via applyTweaks() so
      // they can be tuned at runtime; here we just stamp the panel number
      // on the card and provide a sensible default --card-mask.
      const panelMatch = String(g.panel || '').match(/menu_card_base_0?(\d+)\.(?:png|webp)/i);
      const panelN = panelMatch ? parseInt(panelMatch[1], 10) : ((i % 4) + 1);
      // v1678: paper-only mask derived from each panel itself
      // (same pixel size + aspect as the panel, so CSS mask-image lines up
      // 1:1 with the cream area and never leaks onto the wood frame).
      const defaultMaskPath = `assets/ui/menu_card_paper_mask_0${panelN}.png`;
      // v1694: 旧 (rep<=1) eager 規則を撤廃。 FV (rep=PRIORITY_REP, i<5) のみ
      // 高優先 (eager+sync+high)、 それ以外は lazy+async+low に揃える。
      // thumb は唯一の <img> なので fetchpriority を仕分けて並列発射を抑制。
      // v1947: 初期着地 set (rep=1) から teleport 直後に露出する隣接 set (rep=0)
      // でも lazy img の hydrate 待ちで blank タイルがちらつく症状があるため、
      // rep<=PRIORITY_REP を eager 対象に拡張 (FV 内は fetchpriority=high、
      // 隣接 set は eager+async+low で並列を抑えつつ事前 decode)。
      const isPriority = (rep === PRIORITY_REP) && (i < PRIORITY_EAGER_COUNT);
      const isEager    = rep <= PRIORITY_REP;
      const loadingAttr   = isEager    ? 'eager' : 'lazy';
      const decodingAttr  = isPriority ? 'sync'  : 'async';
      const priorityAttr  = isPriority ? 'high'  : 'low';
      const peekStyle = g.comingSoon ? 'none' : `url('${esc(__bust(g.bg))}')`;
      const panelUrl  = __bust(g.panel);
      const thumbMarkup = g.comingSoon
        ? '<span class="game-card__thumbPlaceholder" aria-hidden="true">?</span>'
        : `<img class="game-card__thumb" src="${esc(__bust(g.thumb))}" alt="" draggable="false" loading="${loadingAttr}" decoding="${decodingAttr}" fetchpriority="${priorityAttr}">`;
      // v1694: panel と play ボタンは <img> を廃止し CSS background-image に。
      // panel は per-card URL なので inline style、 play ボタンは全カード共通
      // URL なので :root の CSS variable から継承。
      return `
        <button class="game-card${comingClass}" type="button" data-idx="${i}" data-rep="${rep}" data-id="${esc(g.id)}" data-panel-n="${panelN}" aria-label="${esc(g.title)} ${esc(g.subtitle)}" style="--card-panel: url('${esc(panelUrl)}'); --card-peek: ${peekStyle}; --card-mask: url('${esc(__bust(defaultMaskPath))}'); --card-peek-size: ${esc(g.peekSize || 'cover')}; --card-peek-pos: ${esc(g.peekPos || 'center')}; --gc-thumb-pos: ${esc(g.thumbPos || 'center')};">
          <div class="game-card__peek" aria-hidden="true"></div>
          <div class="game-card__thumbWrap">
            ${thumbMarkup}
          </div>
          <div class="game-card__text">
            <div class="game-card__title">${decorateGameTitle(g.id, g.title)}</div>
            <div class="game-card__desc">${decorateKana(g.subtitle)}</div>
          </div>
          ${comingBadge}
          <span class="game-card__play" aria-hidden="true"></span>
        </button>
      `;
    }

    function renderCards() {
      // v1694: innerHTML 一括書換 → DocumentFragment + 直列 appendChild に変更。
      // 一時 container に各カードを HTML パースし、 fragment へ順に push。
      // ブラウザは fragment を 1 回の DOM 挿入でコミットするので reflow は 1 回。
      // 同フレーム request 数: 旧 63 img (panel 21 + thumb 21 + play 21、 うち
      // 14 eager) → 新 21 img (thumb のみ。 うち 5 が eager+sync+high、 残り
      // 16 は lazy で intersection 待ち)。 panel/play は CSS background-image
      // (panel: per-card 21 url、 play: 全カード共通 1 url) として
      // ブラウザのスタイル解決後、 表示要素のみ順次取得される。
      // 全カード共通の play ボタン URL を :root に注入 (CSS bg の :active 切替用)。
      const root = document.documentElement;
      root.style.setProperty('--play-btn-normal',  `url('${PLAY_BTN_NORMAL_URL}')`);
      root.style.setProperty('--play-btn-pressed', `url('${PLAY_BTN_PRESSED_URL}')`);

      const frag = document.createDocumentFragment();
      const tmp = document.createElement('template');
      for (let rep = 0; rep < LOOP_COPIES; rep++) {
        for (let i = 0; i < MENU_GAMES.length; i++) {
          tmp.innerHTML = cardMarkup(MENU_GAMES[i], i, rep).trim();
          // template.content の最初の子 = 1 枚分の <button.game-card>
          const node = tmp.content.firstElementChild;
          if (node) frag.appendChild(node);
        }
      }
      // 既存内容をクリアしてから fragment を 1 発で挿入 (reflow 1 回)。
      cardList.textContent = '';
      cardList.appendChild(frag);

      cardList.addEventListener('pointerdown', onCardPointerDown, { passive: true });
      cardList.addEventListener('pointercancel', clearCardPointerDown, { passive: true });
      cardList.addEventListener('click', onCardClick);
      // v1949: v1948 で追加した window pointerup/pointercancel 上の releaseCardDragFlag は
      // 撤去。 setupLoopScroll 内の handlePointerUp が window にも張られていて pointerId 一致
      // 経路で確実に isDragging/pointerId をクリアするので冗長かつ、 releaseCardDragFlag が
      // handlePointerUp より先に発火して teleport 判定を早期 return させる順序依存を招いていた。

      // Mark broken images so CSS fallbacks kick in (local preview without assets).
      // iOS Safari ではメモリ圧迫で <img> が一時的にロード失敗することがあるので、
      // 最大 2 回まで自動 retry を試みてからフォールバックする (2026-05-14 トップページ
      // 画像部分読込バグ対策)。retry は同 URL を一旦外してから次フレームで再代入する
      // ことでブラウザに再リクエストを強制させる。
      // v1694: 残った <img> は .game-card__thumb のみ (panel/play は CSS bg)。
      cardList.querySelectorAll('img').forEach((img) => {
        img.addEventListener('error', () => {
          const retries = Number(img.dataset.retries || 0);
          if (retries < 2) {
            img.dataset.retries = String(retries + 1);
            const src = img.src;
            setTimeout(() => {
              img.removeAttribute('src');
              requestAnimationFrame(() => { img.src = src; });
            }, 800);
          } else {
            img.classList.add('is-broken');
          }
        });
      });

      // Defer one frame so layout is committed and we can measure card height.
      requestAnimationFrame(setupLoopScroll);
    }

    // ===== v1672: scroll-hint dynamic color (up=orange when scrollable up, down=orange when scrollable down) =====
    const scrollHintUp = document.querySelector('.scroll-hint--up');
    const scrollHintDown = document.querySelector('.scroll-hint--down');
    let scrollHintRaf = 0;
    let middleOverlayRaf = 0;  // v1673: middle-3 overlay 更新 rAF throttle

    function updateScrollHints() {
      if (!scrollHintUp || !scrollHintDown) return;
      const list = document.getElementById('cardList');
      if (!list) return;
      const sTop = list.scrollTop;
      const sMax = list.scrollHeight - list.clientHeight;
      // しきい値 2px (rounding 誤差吸収)
      const canUp = sTop > 2;
      const canDown = sTop < (sMax - 2);
      scrollHintUp.classList.toggle('is-active', canUp);
      scrollHintDown.classList.toggle('is-active', canDown);
    }

    function setupLoopScroll() {
      const cards = cardList.querySelectorAll('.game-card');
      if (cards.length < MENU_GAMES.length * LOOP_COPIES) return;
      // v1950: handlePointerUp が window/cardList に登録されるのはこの関数末尾。
      // onCardPointerDown の isDragging gate を開放するのはここが最速で安全。
      cardScrollState.loopScrollReady = true;

      // Lock the list's visible height to exactly 4 cards + 3 gaps so
      // no 5th card peeks through the top/bottom edges. Recompute when
      // images finish loading (their natural size pushes the card height
      // up after layout) and on viewport resize.
      const VISIBLE = 4;
      const PEEK_RATIO = 0.38;  // 5 枚目を 38% 下から覗かせる (Phase 2 ピーク戦略)
      // Reserve a few px of vertical padding inside the list so sub-pixel
      // rounding doesn't let prev/next cards peek through at the top/bottom
      // edges. The padding extends the clip box; cards still snap to the
      // same step-based boundaries.
      const CLIP_PAD = 6;
      cardList.style.paddingTop = CLIP_PAD + 'px';
      cardList.style.paddingBottom = CLIP_PAD + 'px';
      // v1694: 連続 onload (thumb 21 枚) で同期実行されると layout thrash
      // を誘発するため rAF debounce。 同 frame 内の複数リクエストは 1 回に
      // 畳み込まれる。 実計算は recomputeHeightImpl()。
      // recomputeRaf: 0 = idle, >0 = rAF token, -1 = pending (drag 中に受付だけした)
      let recomputeRaf = 0;
      const recomputeHeightImpl = () => {
        recomputeRaf = 0;
        // v1949→v1950: isDragging 中は rAF 自己再スケジュール (spin loop = 60fps 空回り)
        // を止め、 pending flag (-1) だけ立てて次の pointerup で 1 回だけ消化する。
        // rAF スケジューリング競合 (updateMiddleOverlay / snap easing) の圧迫要因を排除。
        if (cardScrollState && cardScrollState.isDragging) {
          recomputeRaf = -1;
          return;
        }
        // Use offsetHeight (unscaled layout height), not getBoundingClientRect
        // which returns the post-transform value when an ancestor is scaled.
        const cardH = cards[0].offsetHeight;
        if (!cardH) return;
        const gap = parseFloat(getComputedStyle(cardList).rowGap || getComputedStyle(cardList).gap) || 0;
        const peek = Math.round(cardH * PEEK_RATIO);
        // 4 枚 + 4 gap (5 枚目分の gap も加算) + ピーク + CLIP_PAD×2
        const visibleH = cardH * VISIBLE + gap * VISIBLE + peek + CLIP_PAD * 2;
        cardList.style.height = visibleH + 'px';
        // v1672: card-list 寸法が変わると scrollHeight/clientHeight も変わるため scroll-hint 再判定
        updateScrollHints();
        if (typeof updateMiddleOverlay === 'function') updateMiddleOverlay();
      };
      const recomputeHeight = () => {
        // v1950: recomputeRaf > 0 (rAF pending) は当然抑止。 recomputeRaf === -1
        // (drag 中 pending) も再スケジュール禁止 — handlePointerUp 側で消化する。
        if (recomputeRaf) return;
        recomputeRaf = requestAnimationFrame(recomputeHeightImpl);
      };
      // v1680: middle-3 検知を完全 getBoundingClientRect ベースに統一。
      // v1678 では listRect.top (scaled) に padTop / cardH*4+gap*3 (unscaled) を
      // 加算しており、 ancestor scale や peek 込みの実高さとズレるとランキングが
      // 下方/上方に偏る不具合があった (16:9 実機で 「最下端しか overlay されない」 症状)。
      // 今は visible 帯の物理中央 = listRect の物理中央 と素直に定義し、
      // cardList の clip box 外のカードは候補から除外する。
      const OVERLAY_HYST = 8; // v1958: 既存 winner を 8px 優遇し境界 sub-pixel フリップ抑制
      const updateMiddleOverlay = () => {
        if (!cards.length) return;
        const listRect = cardList.getBoundingClientRect();
        // cardList 自体が scroll container なので listRect の物理中央が
        // 「ユーザーに見えている帯の真ん中」。 padding/gap/peek は無視してよい
        // (すべて scale 後の値に既に反映されている)。
        const visibleCenterY = listRect.top + listRect.height / 2;
        const top = listRect.top;
        const bottom = listRect.bottom;
        const ranked = [];
        for (let i = 0; i < cards.length; i++) {
          const r = cards[i].getBoundingClientRect();
          const cy = r.top + r.height / 2;
          // カード中心が clip box 内に居るものだけランキング対象
          if (cy < top || cy > bottom) continue;
          const bias = cards[i].classList.contains('is-overlay-active') ? OVERLAY_HYST : 0;
          ranked.push({ el: cards[i], dist: Math.abs(cy - visibleCenterY) - bias });
        }
        // 対象 < 3 枚なら全カード fallback (初期 layout 中など)
        if (ranked.length < 3) {
          ranked.length = 0;
          for (let i = 0; i < cards.length; i++) {
            const r = cards[i].getBoundingClientRect();
            const cy = r.top + r.height / 2;
            const bias = cards[i].classList.contains('is-overlay-active') ? OVERLAY_HYST : 0;
            ranked.push({ el: cards[i], dist: Math.abs(cy - visibleCenterY) - bias });
          }
        }
        ranked.sort((a, b) => a.dist - b.dist);
        const winners = new Set(ranked.slice(0, 3).map((r) => r.el));
        // class toggle (差分のみ DOM 操作)
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          const shouldOn = winners.has(c);
          if (shouldOn && !c.classList.contains('is-overlay-active')) {
            c.classList.add('is-overlay-active');
          } else if (!shouldOn && c.classList.contains('is-overlay-active')) {
            c.classList.remove('is-overlay-active');
          }
        }
      };
      recomputeHeight();
      // Re-measure after every image finishes loading (panel + thumb + play)
      cardList.querySelectorAll('img').forEach((img) => {
        if (!img.complete) {
          img.addEventListener('load', recomputeHeight, { once: true });
        }
      });
      window.addEventListener('resize', recomputeHeight);
      // Final safety pass after layout settles
      setTimeout(recomputeHeight, 300);
      setTimeout(recomputeHeight, 1000);

      if (LOOP_COPIES <= 1) {
        cardList.scrollTop = 0;
        cardScrollState.teleporting = false;
        cardScrollState.snapping = false;
        return;
      }

      // One set's height = N cards + N gaps (the gap *after* the last card
      // of a set is what separates it from the next set's first card).
      // Computing this from scrollHeight/LOOP_COPIES is wrong because the
      // very last set has no trailing gap, so the division leaks ~gap/COPIES
      // px per set and accumulates drift each loop teleport. Use the
      // step-based formula so every teleport lands on an exact card boundary.
      const oneSetH = () => {
        const cardH = cards[0].offsetHeight;
        const gap = parseFloat(getComputedStyle(cardList).rowGap || getComputedStyle(cardList).gap) || 0;
        return (cardH + gap) * MENU_GAMES.length;
      };
      // Start positioned at the middle copy so user can scroll either way.
      cardList.scrollTop = oneSetH();

      // v1673: 初期表示で middle-3 を即 overlay (scroll 待ち回避)
      requestAnimationFrame(updateMiddleOverlay);
      // 画像 lazy-load 後の height 確定で middle 候補がズレることがあるので safety pass
      setTimeout(updateMiddleOverlay, 350);
      setTimeout(updateMiddleOverlay, 1100);

      let snapTimer = null;
      cardScrollState.teleporting = false;
      cardScrollState.snapping = false;     // true while we're animating to a snap target
      let lastScrollTop = cardList.scrollTop;

      // Custom easing animation — feels softer than browser smooth-scroll.
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
      const animateScrollTo = (targetTop, duration = 380) => {
        const start = cardList.scrollTop;
        const dist = targetTop - start;
        if (Math.abs(dist) < 0.5) return;
        cardScrollState.snapping = true;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / duration);
          cardList.scrollTop = start + dist * easeOutCubic(p);
          if (p < 1) {
            requestAnimationFrame(tick);
          } else {
            cardScrollState.snapping = false;
          }
        };
        requestAnimationFrame(tick);
      };

      // After scrolling stops, glide to the nearest card boundary.
      const snapToNearest = () => {
        if (cardScrollState.teleporting || cardScrollState.snapping) return;
        const cardH = cards[0].offsetHeight;
        const gap = parseFloat(getComputedStyle(cardList).rowGap || getComputedStyle(cardList).gap) || 0;
        const step = cardH + gap;
        if (!step) return;
        const t = cardList.scrollTop;
        const target = Math.round(t / step) * step;
        animateScrollTo(target);
      };

      cardList.addEventListener('scroll', () => {
        const t = cardList.scrollTop;
        // Accumulate user-driven scroll only — exclude programmatic snap/
        // teleport so isCardTap doesn't misclassify a tap as a scroll when
        // animateScrollTo or the wrap-around teleport fires between
        // pointerdown and click. cardPointerDown != null gates the cost
        // to the window where we actually care.
        if (cardPointerDown && !cardScrollState.teleporting && !cardScrollState.snapping) {
          cardScrollState.userScrollDelta += (t - lastScrollTop);
        }
        lastScrollTop = t;

        if (cardScrollState.teleporting) return;
        const set = oneSetH();
        // v1947: 指ドラッグ中は LOOP teleport を pointerup まで遅延。
        // finger drag 中の同期 scrollTop ジャンプが GPU 合成と競合して
        // drop-shadow が 1 frame drop する 「一瞬消える」 症状を消す。
        // pointerup 後の handlePointerUp() で境界チェックしてまとめて teleport。
        if (!cardScrollState.isDragging) {
          if (t < set * 0.5) {
            cardScrollState.teleporting = true;
            cardList.scrollTop = t + set;
            lastScrollTop = cardList.scrollTop;
            requestAnimationFrame(() => { cardScrollState.teleporting = false; });
            return;
          } else if (t > set * 1.5) {
            cardScrollState.teleporting = true;
            cardList.scrollTop = t - set;
            lastScrollTop = cardList.scrollTop;
            requestAnimationFrame(() => { cardScrollState.teleporting = false; });
            return;
          }
        }
        // Debounced snap: wait for the user to stop scrolling.
        if (cardScrollState.snapping) return;
        clearTimeout(snapTimer);
        snapTimer = setTimeout(snapToNearest, 140);

        // v1672: scroll-hint 色更新 — rAF throttled
        if (!scrollHintRaf) {
          scrollHintRaf = requestAnimationFrame(() => {
            scrollHintRaf = 0;
            updateScrollHints();
          });
        }
        // v1673: middle-3 overlay 更新 (rAF throttle、 scrollHintRaf と同パターン)
        // v1947: ドラッグ中は overlay の class toggle を保留 (peek の連続点滅対策)
        if (!middleOverlayRaf && !cardScrollState.isDragging) {
          middleOverlayRaf = requestAnimationFrame(() => {
            middleOverlayRaf = 0;
            updateMiddleOverlay();
          });
        }
      }, { passive: true });

      // v1947: 指ドラッグ終了時に (1) middle overlay を再計算、
      // (2) 保留していた LOOP teleport 境界を再判定してまとめて teleport。
      // v1948:
      //   - `!isDragging` の早期 return を撤去。 clearCardPointerDown が isDragging を
      //     操作しなくなったので、 実 pointerup は必ず isDragging=true で入る想定だが、
      //     万一 false でも teleport/overlay 更新は冪等なので safe to run。
      //   - pointerId gate を追加。 window に登録した listener が bottom-nav / modal /
      //     capture.js overlay 等 cardList 外の pointerup を拾って、 進行中のドラッグの
      //     isDragging を早期に落とすのを防ぐ (二本指 iPad で頻発する race)。
      const handlePointerUp = (e) => {
        // v1948: 既に release 済み (isDragging=false かつ pointerId=null) なら何もしない。
        // window listener が bottom-nav 等の関係ない pointerup で毎回 teleport チェック +
        // rAF updateMiddleOverlay を回さないように早期 return。
        if (!cardScrollState.isDragging && cardScrollState.pointerId === null) return;
        if (
          e && e.pointerId !== undefined && cardScrollState.pointerId !== null &&
          e.pointerId !== cardScrollState.pointerId
        ) {
          return;
        }
        cardScrollState.isDragging = false;
        cardScrollState.pointerId = null;
        // v1950: v1949 の 「teleport 全体を rAF で 1 frame 遅延」 は iOS Safari の
        // momentum scroll (pointerup 後も 16ms で 10-30px 前進) と衝突し、 rAF 内で
        // 古い t 基準に代入することで 「momentum 逆流→急停止」 の新種 flicker を招く
        // ため撤回。 scrollTop 代入は同期に戻し (v1948 相当)、 pointerup 集中負荷は
        // updateMiddleOverlay 側の rAF (下記) 分散だけで担う。
        const t = cardList.scrollTop;
        const setNow = oneSetH();
        if (setNow) {
          if (t < setNow * 0.5) {
            cardScrollState.teleporting = true;
            cardList.scrollTop = t + setNow;
            lastScrollTop = cardList.scrollTop;
            requestAnimationFrame(() => { cardScrollState.teleporting = false; });
          } else if (t > setNow * 1.5) {
            cardScrollState.teleporting = true;
            cardList.scrollTop = t - setNow;
            lastScrollTop = cardList.scrollTop;
            requestAnimationFrame(() => { cardScrollState.teleporting = false; });
          }
        }
        // v1950: drag 中に保留された recomputeHeight を消化 (spin loop 回避)。
        if (recomputeRaf === -1) {
          recomputeRaf = 0;
          recomputeHeight();
        }
        if (!middleOverlayRaf) {
          middleOverlayRaf = requestAnimationFrame(() => {
            middleOverlayRaf = 0;
            updateMiddleOverlay();
          });
        }
      };
      cardList.addEventListener('pointerup', handlePointerUp, { passive: true });
      cardList.addEventListener('pointercancel', handlePointerUp, { passive: true });
      // Safari では touch を離す前に window の外へ抜けると pointerup が飛ばない
      // ケースがあるため window 側にも保険を張る (二重発火は isDragging guard で無害)。
      window.addEventListener('pointerup', handlePointerUp, { passive: true });
      window.addEventListener('pointercancel', handlePointerUp, { passive: true });

      // 初回 scroll-hint 状態反映
      updateScrollHints();

      // 初回 auto-scroll hint (Phase 2)
      // 1600 → 2200ms に後ろ倒し: 子供 (3歳〜) の視線が画面に届いてから動かす方が、
      // hint アニメ自体を伸ばすより注意持続を稼げる (アニメ延長は「自動操作」 感が出る)。
      setTimeout(playIntroScrollHint, 2200);

      // ====== Phase 2: auto-scroll hint (初回のみ) ======
      function playIntroScrollHint() {
        try {
          if (localStorage.getItem('pono_cards_intro_hint_shown_v1') === '1') return;
        } catch (e) { return; }
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
          // 静的 chevron 表示は CSS の @media (prefers-reduced-motion: reduce) ブロックが担当 (単一ソース)
          // ここでは LS フラグ更新のみ
          try { localStorage.setItem('pono_cards_intro_hint_shown_v1', '1'); } catch (e) {}
          return;
        }
        const startTop = cardList.scrollTop;
        const HINT_DISTANCE = 60;
        const FORWARD_MS = 600;
        const PAUSE_MS = 180;
        const RETURN_MS = 500;
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
        const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
        cardScrollState.snapping = true;  // 既存 snap を抑止
        let cancelled = false;
        const t0 = performance.now();
        const cleanup = () => {
          cardScrollState.snapping = false;
          try { localStorage.setItem('pono_cards_intro_hint_shown_v1', '1'); } catch (e) {}
          cardList.removeEventListener('pointerdown', onInterrupt);
        };
        const onInterrupt = () => { cancelled = true; };
        cardList.addEventListener('pointerdown', onInterrupt, { once: true, passive: true });
        const tick = (now) => {
          if (cancelled) { cleanup(); return; }
          const elapsed = now - t0;
          if (elapsed < FORWARD_MS) {
            const p = elapsed / FORWARD_MS;
            cardList.scrollTop = startTop + HINT_DISTANCE * easeOutCubic(p);
          } else if (elapsed < FORWARD_MS + PAUSE_MS) {
            cardList.scrollTop = startTop + HINT_DISTANCE;
          } else if (elapsed < FORWARD_MS + PAUSE_MS + RETURN_MS) {
            const p = (elapsed - FORWARD_MS - PAUSE_MS) / RETURN_MS;
            cardList.scrollTop = startTop + HINT_DISTANCE * (1 - easeInOutSine(p));
          } else {
            cardList.scrollTop = startTop;
            cleanup();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }

    function pulseStartBtn() { /* removed: start button no longer exists */ }

    const CARD_TAP_MOVE_TOLERANCE = 12;
    const CARD_TAP_STATE_TTL_MS = 800;
    // Short-press override: a quick tap (held < this many ms) always counts as
    // a tap regardless of scroll delta. Protects against programmatic snap/
    // teleport that mutates scrollTop between pointerdown and click and would
    // otherwise silently drop the user's intent.
    const CARD_TAP_FAST_MS = 300;
    let cardPointerDown = null;
    let cardPointerDownTimer = 0;
    // Shared scroll state exposed by setupLoopScroll so isCardTap can tell
    // user-driven scroll apart from programmatic snap/teleport.
    // v1947: isDragging を追加。 pointerdown〜pointerup 間は真になり、
    // scroll handler 内の rAF middle-overlay 更新 / LOOP teleport を保留する
    // ことでカードの連続点滅と 1 frame blank 消失を防ぐ。
    // v1948: pointerId を追加。 handlePointerUp を window にも登録している都合で、
    // bottom-nav や modal 等 cardList 外の pointerup も届くため、 pointerdown 時の
    // pointerId と一致した pointerup だけ isDragging を落とす (multi-touch でも
    // 「別の指が cardList 外で離れた」を無視できる)。
    // v1950: loopScrollReady を追加。 renderCards は onCardPointerDown を同期登録するが
    // handlePointerUp は 1 frame 後の setupLoopScroll でしか登録されないため、 cold start
    // 直後の 16ms 以内に fast tap すると pointerdown で isDragging=true が立ったまま
    // pointerup を拾う handler が居ない → 恒常的に isDragging=true でラッチ。 gate flag で
    // setupLoopScroll 完了までは isDragging を立てないようにして初期 1 frame race を封じる。
    const cardScrollState = { teleporting: false, snapping: false, userScrollDelta: 0, isDragging: false, pointerId: null, loopScrollReady: false };

    function isTapIntroBlockingInput() {
      const intro = document.getElementById('tapIntro');
      if (!intro || intro.hidden) return false;
      if (intro.classList.contains('is-closing')) return false;
      return true;
    }

    function onCardPointerDown(e) {
      if (isTapIntroBlockingInput()) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        clearCardPointerDown();
        return;
      }
      if (typeof e.button === 'number' && e.button > 0) return;
      // v1948: cardList (padding 24/32px と card 間 4px gap を含む) に触れた瞬間から
      // LOOP teleport / overlay toggle を保留する。 target が `.game-card` でなくても
      // padding/gap をタッチしたドラッグは十分あり得るため、 isDragging を先に立てる。
      // pointerId は handlePointerUp が bottom-nav 等の pointerup と混線しないための marker。
      // v1950: setupLoopScroll 未完了 (handlePointerUp 未登録) の間は isDragging を
      // 立てないことで、 cold start 直後 fast tap の permanent latch を防ぐ。
      if (cardScrollState.loopScrollReady) {
        cardScrollState.isDragging = true;
        if (e.pointerId !== undefined) cardScrollState.pointerId = e.pointerId;
      }
      const card = e.target.closest('.game-card');
      if (!card) return;
      clearTimeout(cardPointerDownTimer);
      cardScrollState.userScrollDelta = 0;
      cardPointerDown = {
        x: e.clientX,
        y: e.clientY,
        scrollTop: cardList.scrollTop,
        idx: card.dataset.idx,
        rep: card.dataset.rep,
        t: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
      };
      cardPointerDownTimer = setTimeout(clearCardPointerDown, CARD_TAP_STATE_TTL_MS);
    }

    function clearCardPointerDown() {
      clearTimeout(cardPointerDownTimer);
      cardPointerDownTimer = 0;
      cardPointerDown = null;
      // v1948→v1950: `isDragging=false` の同時解除を撤去。 CARD_TAP_STATE_TTL_MS (800ms)
      // 経由の stale-tap invalidate だけを担わせ、 ドラッグ抑止フラグは pointerup/pointercancel
      // ライフサイクル (setupLoopScroll 内 handlePointerUp が cardList + window の 2 経路に
      // 張った同一 handler) だけが操作する。 v1949 で releaseCardDragFlag 相当の外部 safety net
      // は撤去済み (順序依存 race を招くため)、 初期 1 frame の未登録期間は onCardPointerDown
      // 側の loopScrollReady gate で吸収する。 800ms を超える 「ゆっくり指ドラッグ」 が途中で
      // isDragging=false になり保留 LOOP teleport が指の途中で再開して drop-shadow が
      // 1 frame 落ちる v1947 の critical bug 対策としてこの撤去は維持。
    }

    function isCardTap(e, card) {
      if (!cardPointerDown) return true;
      const dx = Math.abs(e.clientX - cardPointerDown.x);
      const dy = Math.abs(e.clientY - cardPointerDown.y);
      // User-only scroll delta — programmatic snap/teleport between
      // pointerdown and click is excluded by the scroll listener above.
      // Falls back to raw delta if the listener never ran (defensive).
      const ds = Math.abs(cardScrollState.userScrollDelta);
      const sameCard = card.dataset.idx === cardPointerDown.idx && card.dataset.rep === cardPointerDown.rep;
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const heldMs = now - (cardPointerDown.t || now);
      clearCardPointerDown();
      if (!sameCard) return false;
      if (dx > CARD_TAP_MOVE_TOLERANCE || dy > CARD_TAP_MOVE_TOLERANCE) return false;
      // Fast-tap override: short presses bypass the scroll-delta gate.
      if (heldMs <= CARD_TAP_FAST_MS) return true;
      return ds <= CARD_TAP_MOVE_TOLERANCE;
    }

    function onCardClick(e) {
      if (isTapIntroBlockingInput()) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        return;
      }
      const card = e.target.closest('.game-card');
      if (!card) return;
      if (!isCardTap(e, card)) return;
      const idx = Number(card.dataset.idx);
      if (Number.isNaN(idx)) return;
      if (idx !== currentIdx) selectGame(idx);
      startGame(idx);
    }

    function onCardKeyDown(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (isTapIntroBlockingInput()) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        return;
      }
      const card = e.target.closest('.game-card');
      if (!card || e.target !== card) return;
      const idx = Number(card.dataset.idx);
      if (Number.isNaN(idx)) return;
      e.preventDefault();
      if (idx !== currentIdx) selectGame(idx);
      startGame(idx);
    }

    let pendingProfileStartIdx = null;
    function startGame(idx) {
      if (isTapIntroBlockingInput()) return;
      const game = MENU_GAMES[idx];
      if (!game || game.isZoneHeader) return;
      // Coming-soon entries are normally blocked. debugPlayable:true lets
      // devs still tap through to the real href so QA can verify destinations
      // without flipping comingSoon off (which would also hide the badge).
      const blocked = game.comingSoon && !game.debugPlayable;
      if (blocked || !game.href || game.href === '#') return;
      // v3 (feature_tier_v3 §5): 「アプリで あそべる」 ゾーンは LP 版でも
      // カードとして見せているが、 sub tier (= アプリ版 or capture override) 以外の
      // タップは実際のゲームへ遷移させず、 book/free 別コピーの誘導モーダルを出す。
      if (game.zone === 'app_only' && typeof openAppZonePromo === 'function' && openAppZonePromo(game)) {
        return;
      }
      if (window.PonoPlayerProfile && !window.PonoPlayerProfile.hasProfile()) {
        pendingProfileStartIdx = idx;
        window.PonoPlayerProfile.open();
        return;
      }
      try { sessionStorage.setItem('pono_audio_primed_ts', String(Date.now())); } catch(_) {}
      location.href = game.href;
    }

    // ===== Select / preview crossfade =====
    function selectGame(idx) {
      const game = MENU_GAMES[idx];
      if (!game || game.isZoneHeader) return;
      currentIdx = idx;

      // Update card highlight + current state
      const cards = cardList.querySelectorAll('.game-card');
      cards.forEach((c) => {
        const sel = (Number(c.dataset.idx) === idx);
        c.classList.toggle('is-selected', sel);
        c.toggleAttribute('aria-current', sel);
      });

      // Crossfade backgrounds — encode URI to keep CSS url() value safe
      const incoming = activeBgEl === 'A' ? previewBgB : previewBgA;
      const outgoing = activeBgEl === 'A' ? previewBgA : previewBgB;
      const safeBg = encodeURI(__bust(game.bg)).replace(/'/g, '%27');
      incoming.style.backgroundImage = `url('${safeBg}')`;
      // Double rAF: first frame commits the bg-image, second frame triggers opacity transition reliably
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          incoming.classList.add('is-active');
          outgoing.classList.remove('is-active');
        });
      });
      activeBgEl = activeBgEl === 'A' ? 'B' : 'A';

      // Fade text labels (preview overlay removed; no-op now)
      // previewTitle / previewDesc no longer exist — title is on each card.
    }

    // ===== Start button removed (each card has its own play button) =====

    // ===== Bottom nav =====
    const bottomNav = $('bottomNav');
    const settingsHelpBtn = $('settingsHelpBtn');
    const settingsNewsBtn = $('settingsNewsBtn');
    const settingsNewsSub = $('settingsNewsSub');
    const settingsNewsBadge = $('settingsNewsBadge');
    const bottomNavNewsBadge = $('bottomNavNewsBadge');
    const newsList = $('newsList');
    const newsEmpty = $('newsEmpty');
    const NEWS_READ_KEY = 'pono_news_read_ids_v1';
    const TITLE_NEWS_ITEMS = Array.isArray(window.PONO_NEWS_ITEMS) ? window.PONO_NEWS_ITEMS : [];
    const THREE_STICKER_BOOK_URL = 'Prototypes/StickerBookThreeJS/?surface=cover';

    function getBottomNavButton(target) {
      return target && target.closest ? target.closest('.bn-item') : null;
    }
    function setBottomNavPressed(action) {
      if (!bottomNav || !action) return;
      bottomNav.setAttribute('data-pressed', action);
    }
    function clearBottomNavPressed() {
      if (!bottomNav) return;
      bottomNav.removeAttribute('data-pressed');
    }
    bottomNav.addEventListener('pointerdown', (e) => {
      if (typeof e.button === 'number' && e.button !== 0) return;
      const btn = getBottomNavButton(e.target);
      if (!btn || !bottomNav.contains(btn)) return;
      setBottomNavPressed(btn.dataset.action);
    });
    bottomNav.addEventListener('pointerup', clearBottomNavPressed);
    bottomNav.addEventListener('pointercancel', clearBottomNavPressed);
    bottomNav.addEventListener('pointerleave', clearBottomNavPressed);
    bottomNav.addEventListener('blur', clearBottomNavPressed, true);
    bottomNav.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      const btn = getBottomNavButton(e.target);
      if (!btn || !bottomNav.contains(btn)) return;
      setBottomNavPressed(btn.dataset.action);
    });
    bottomNav.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') clearBottomNavPressed();
    });

    function readNewsReadIds() {
      try {
        const parsed = JSON.parse(localStorage.getItem(NEWS_READ_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch (_) {
        return [];
      }
    }
    function writeNewsReadIds(ids) {
      try { localStorage.setItem(NEWS_READ_KEY, JSON.stringify(ids)); } catch (_) {}
    }
    function unreadNewsCount() {
      const read = new Set(readNewsReadIds());
      return TITLE_NEWS_ITEMS.filter((item) => item && item.id && !read.has(String(item.id))).length;
    }
    function setCountBadge(el, count) {
      if (!el) return;
      const safeCount = Math.max(0, Math.min(99, Number(count) || 0));
      el.hidden = safeCount <= 0;
      el.textContent = safeCount >= 99 ? '99+' : String(safeCount);
    }
    function renderNewsBadges() {
      const count = unreadNewsCount();
      setCountBadge(bottomNavNewsBadge, count);
      setCountBadge(settingsNewsBadge, count);
      if (settingsNewsSub) {
        settingsNewsSub.textContent = count > 0 ? 'あたらしい おしらせ ' + count + 'けん' : 'あたらしい おしらせは ないよ';
      }
    }
    function renderNewsList() {
      if (!newsList) return;
      Array.from(newsList.querySelectorAll('.news-item')).forEach((el) => el.remove());
      if (!TITLE_NEWS_ITEMS.length) {
        if (newsEmpty) {
          newsEmpty.hidden = false;
          newsEmpty.textContent = 'あたらしい おしらせは ありません。';
        }
        return;
      }
      if (newsEmpty) newsEmpty.hidden = true;
      TITLE_NEWS_ITEMS.forEach((item) => {
        if (!item) return;
        const row = document.createElement('div');
        row.className = 'news-item';
        const title = document.createElement('span');
        title.className = 'news-item__title';
        title.textContent = String(item.title || 'おしらせ');
        const body = document.createElement('span');
        body.className = 'news-item__body';
        body.textContent = String(item.body || '');
        row.appendChild(title);
        if (body.textContent) row.appendChild(body);
        newsList.appendChild(row);
      });
    }
    function markNewsRead() {
      const ids = TITLE_NEWS_ITEMS.map((item) => item && item.id ? String(item.id) : '').filter(Boolean);
      if (!ids.length) return;
      writeNewsReadIds(Array.from(new Set(readNewsReadIds().concat(ids))));
      renderNewsBadges();
    }
    function openNewsModal() {
      renderNewsList();
      openModal('newsModal');
      markNewsRead();
    }

    bottomNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.bn-item');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'profile') {
        return;
      } else if (action === 'stickers') {
        location.href = THREE_STICKER_BOOK_URL;
      } else if (action === 'settings') {
        openModal('settingsModal');
      } else if (action === 'feedback') {
        // ごかんそう: PonoRating モーダルをタイトル経由で開く (defer ロード前は no-op)
        try { window.PonoRating && window.PonoRating.openFromTitle && window.PonoRating.openFromTitle(); } catch (e) {}
      }
    });
    if (settingsHelpBtn) {
      settingsHelpBtn.addEventListener('click', () => {
        location.href = 'help.html';
      });
    }
    if (settingsNewsBtn) {
      settingsNewsBtn.addEventListener('click', () => {
        closeModal('settingsModal');
        openNewsModal();
      });
    }
    renderNewsBadges();

    // ===== Sticker book entry =====
    const stickerBookEntry = document.getElementById('stickerBookEntry');
    if (stickerBookEntry) {
      stickerBookEntry.addEventListener('click', () => {
        location.href = THREE_STICKER_BOOK_URL;
      });
    }

    // ===== Daily sticker gacha =====
    const DAILY_GACHA_KEY = 'pono_daily_sticker_gacha_v1';
    const DAILY_GACHA_TURNS = 3;
    const DAILY_GACHA_TURN_THRESHOLD = 315;
    const DAILY_GACHA_TURN_ROTATION = 360;
    const DAILY_GACHA_DRAG_PREVIEW_ROTATION = 342;
    const DAILY_GACHA_TURN_LOCK_MS = 430;
    const DAILY_GACHA_FINAL_START_DELAY = 50;
    const DAILY_GACHA_DROP_DELAY = 3150;
    const DAILY_GACHA_EXIT_SOUND_LEAD_MS = 220;
    const DAILY_GACHA_CLOSEUP_DELAY = 4820;
    const DAILY_GACHA_OPEN_DELAY = 5600;
    const DAILY_GACHA_ACTIONS_DELAY = 6220;
    const DAILY_GACHA_START_PROMPT = '１にち１かい まわせるよ\nつまみを ぐるっと まわしてね';
    const DAILY_GACHA_STICKER_BOOK_PROMPT = 'シールちょうに\nはって あそぼう';
    const DAILY_GACHA_TOMORROW_PROMPT = 'また あした やろうね';
    const DAILY_GACHA_HAND_IMAGES = {
      open: 'assets/images/puzzle/ui/tutorial/hand_open_hover.png',
      ready: 'assets/images/puzzle/ui/tutorial/hand_grab_ready.png',
      grip: 'assets/images/puzzle/ui/tutorial/hand_grip.png'
    };
    const DAILY_GACHA_AUDIO_ASSETS = {
      turn: 'assets/audio/gacha/daily_gacha_capsule_toy_01.mp3',
      capsuleExit: 'assets/audio/gacha/daily_gacha_capsule_toy_02.mp3',
      bed: 'assets/audio/gacha/daily_gacha_bed_loop.mp3',
      finalStinger: 'assets/audio/gacha/daily_gacha_final_turn_stinger.mp3',
      superReveal: 'assets/audio/gacha/daily_gacha_super_rare_reveal.mp3',
      capsuleOpen: 'assets/sounds/se/bubbles_v1.mp3',
      sparkle: 'assets/audio/gacha/daily_gacha_sticker_sparkle.mp3',
      sparkleLong: 'assets/audio/gacha/daily_gacha_magic_sparkle_long.mp3'
    };
    const DAILY_GACHA_TURN_SOUND = {
      1: { volume: .7, rate: .98 },
      2: { volume: .76, rate: 1 },
      3: { volume: .84, rate: 1.025 }
    };
    const DAILY_GACHA_REVEAL_BACKDROPS = [
      'assets/ui/gacha/daily_gacha_reveal_bg_magic_book.webp',
      'assets/ui/gacha/daily_gacha_reveal_bg_holographic_pack.webp',
      'assets/ui/gacha/daily_gacha_reveal_bg_stage_burst.webp'
    ];
    const DAILY_GACHA_RARITY_DEFAULT = 'rare';
    const DAILY_GACHA_RARITY_ALIASES = {
      '1': 'normal',
      normal: 'normal',
      common: 'normal',
      standard: 'normal',
      n: 'normal',
      'ノーマル': 'normal',
      'ふつう': 'normal',
      '2': 'rare',
      rare: 'rare',
      r: 'rare',
      kira: 'rare',
      'キラ': 'rare',
      'きら': 'rare',
      '3': 'super',
      gold: 'rare',
      super: 'super',
      sr: 'super',
      ssr: 'super',
      special: 'super',
      platinum: 'super',
      premium: 'super',
      'とくべつ': 'super',
      'とくべつキラ': 'super',
      'とくべつきら': 'super',
      '特別キラ': 'super'
    };
    const DAILY_GACHA_RARITY_PROFILES = {
      normal: {
        capsuleGroup: 'normal',
        backdrops: [
          'assets/ui/gacha/daily_gacha_reveal_bg_stage_burst.webp'
        ],
        bedVolume: .16,
        dropDelay: DAILY_GACHA_DROP_DELAY,
        exitSoundLeadMs: 170,
        closeupDelay: 4680,
        openDelay: 5420,
        actionsDelay: 6040,
        exitVolume: .78,
        finalStingerVolume: .54,
        capsuleOpenVolume: .6,
        sparkleVolume: .58,
        sparkleLongVolume: 0
      },
      rare: {
        capsuleGroup: 'rare',
        backdrops: [
          'assets/ui/gacha/daily_gacha_reveal_bg_stage_burst.webp'
        ],
        bedVolume: .2,
        dropDelay: DAILY_GACHA_DROP_DELAY,
        exitSoundLeadMs: DAILY_GACHA_EXIT_SOUND_LEAD_MS,
        closeupDelay: DAILY_GACHA_CLOSEUP_DELAY,
        openDelay: DAILY_GACHA_OPEN_DELAY,
        actionsDelay: DAILY_GACHA_ACTIONS_DELAY,
        exitVolume: .92,
        finalStingerVolume: .74,
        capsuleOpenVolume: .74,
        sparkleVolume: .82,
        sparkleLongVolume: .56
      },
      super: {
        capsuleGroup: 'super',
        backdrops: [
          'assets/ui/gacha/daily_gacha_reveal_bg_holographic_pack.webp'
        ],
        bedVolume: .22,
        dropDelay: DAILY_GACHA_DROP_DELAY,
        exitSoundLeadMs: 290,
        closeupDelay: 5000,
        openDelay: 6150,
        actionsDelay: 7000,
        exitVolume: 1,
        finalStingerVolume: .9,
        finalStingerRate: .98,
        superRevealVolume: .92,
        capsuleOpenVolume: .68,
        sparkleVolume: .66,
        sparkleLongVolume: .42,
        turnVolumeBonus: .04,
        turnRateBonus: .02
      }
    };
    const DAILY_GACHA_STATIC_PRELOAD_IMAGES = [
      'assets/ui/gacha/daily_gacha_room_backdrop.webp',
      'assets/ui/gacha/daily_gacha_counter_foreground.png',
      'assets/ui/gacha/daily_gacha_machine.webp',
      'assets/ui/gacha/daily_gacha_lever.png',
      'assets/ui/gacha/daily_gacha_start_panel_pono_alpha_bleed_20260629.png',
      'assets/ui/gacha/daily_gacha_turn_arrow_generated.png',
      'assets/ui/gacha/daily_gacha_turn_word_badge_generated.png',
      'assets/ui/gacha/daily_gacha_more_turn_bubble_alpha_bleed_20260629.png',
      'assets/ui/gacha/daily_gacha_reward_speech_bubble.png',
      'assets/ui/gacha/daily_gacha_book_speech_bubble.png',
      'assets/ui/gacha/daily_gacha_super_name_plate_luxury.png',
      'assets/ui/gacha/daily_gacha_rarity_lettermark_r_silver_20260628.png',
      'assets/ui/gacha/daily_gacha_rarity_lettermark_sr_rainbow_gold_20260628.png',
      'assets/ui/gacha/daily_gacha_action_home_normal.png',
      'assets/ui/gacha/daily_gacha_action_home_pressed.png',
      'assets/ui/gacha/daily_gacha_action_sticker_book_normal.png',
      'assets/ui/gacha/daily_gacha_action_sticker_book_pressed.png',
      'assets/ui/daily_gacha_shop_button_single_color_20260625.png',
      'assets/ui/daily_challenge_banner_gacha_style_20260625.png',
      'assets/images/characters/pono/pono_face_circle.webp'
    ];
    const dailyGachaEntry = document.getElementById('dailyGachaEntry');
    const dailyGachaEntrySub = document.getElementById('dailyGachaEntrySub');
    const dailyGachaModal = document.getElementById('dailyGachaModal');
    const dailyGachaClose = document.getElementById('dailyGachaClose');
    const dailyGachaLever = document.getElementById('dailyGachaLever');
    const dailyGachaGuideHand = document.getElementById('dailyGachaGuideHand');
    const dailyGachaAssist = document.getElementById('dailyGachaAssist');
    const dailyGachaMeter = document.getElementById('dailyGachaMeter');
    const dailyGachaStatus = document.getElementById('dailyGachaStatus');
    const dailyGachaDirectHint = document.getElementById('dailyGachaDirectHint');
    const dailyGachaBook = document.getElementById('dailyGachaBook');
    const dailyGachaFixedHome = document.getElementById('dailyGachaFixedHome');
    const dailyGachaCloseupBook = document.getElementById('dailyGachaCloseupBook');
    const dailyGachaDropCapsule = document.getElementById('dailyGachaDropCapsule');
    const dailyGachaCloseCapsule = document.getElementById('dailyGachaCloseCapsule');
    const dailyGachaOpenCapsuleLeft = document.getElementById('dailyGachaOpenCapsuleLeft');
    const dailyGachaOpenCapsuleRight = document.getElementById('dailyGachaOpenCapsuleRight');
    const dailyGachaReward = document.getElementById('dailyGachaReward');
    const dailyGachaRewardImg = document.getElementById('dailyGachaRewardImg');
    const dailyGachaRewardEmoji = document.getElementById('dailyGachaRewardEmoji');
    const dailyGachaRarityBadge = document.getElementById('dailyGachaRarityBadge');
    const dailyGachaRewardName = document.getElementById('dailyGachaRewardName');
    const dailyGachaRewardNote = document.getElementById('dailyGachaRewardNote');
    const dailyGachaTomorrowNote = document.getElementById('dailyGachaTomorrowNote');
    const dailyGachaEnabled = __isAppBuild || document.body.classList.contains('dev-mode');
    const dailyGachaState = {
      dragging: false,
      lastAngle: 0,
      dragAngle: 0,
      step: 0,
      settledRotation: 0,
      turnLock: false,
      complete: false,
      timers: [],
      rarity: DAILY_GACHA_RARITY_DEFAULT,
      capsuleColor: 'pink',
      capsuleOpenLeft: '',
      capsuleOpenRight: '',
      revealBackdrop: DAILY_GACHA_REVEAL_BACKDROPS[0]
    };
    const dailyGachaAudio = {
      ready: false,
      turnPool: [],
      turnIndex: 0,
      capsuleExit: null,
      bed: null,
      finalStinger: null,
      superReveal: null,
      capsuleOpen: null,
      sparkle: null,
      sparkleLong: null,
      pausedTopBgm: false,
      resumeTopBgm: false
    };
    let dailyGachaAudioCtx = null;
    let dailyGachaBedRetryTimer = 0;

    function dailyGachaTodayKey() {
      // v1719: JST 境界 (js/daily-quest.js todayKeyJST と一致)。 JST = UTC+9、 日付は JST 0 時で切替。
      // 旧実装は new Date().getFullYear()/getMonth()/getDate() で local TZ 依存。 端末タイムゾーンが
      // JST 以外でも日付が一致するよう、 UTC + 9h を計算し getUTC*() で文字列化する。
      const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const y = jst.getUTCFullYear();
      const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
      const day = String(jst.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    // v1719: 今日の pull 数 (0/1/2)。 旧 record (count フィールド無し) は stickerId があれば 1 として後方互換。
    function getDailyGachaCount() {
      try {
        const raw = localStorage.getItem(DAILY_GACHA_KEY);
        if (!raw) return 0;
        const rec = JSON.parse(raw);
        if (!rec || rec.date !== dailyGachaTodayKey()) return 0;
        if (typeof rec.count === 'number') return rec.count;
        return rec.stickerId ? 1 : 0;
      } catch (_) { return 0; }
    }

    // v1719: いま引けるか (count<2 かつ (count=0 または チャレンジクリア済))
    function canPullDailyGachaNow() {
      const count = getDailyGachaCount();
      if (count >= 2) return false;
      if (count === 0) return true; // フリー pull はチャレンジ問わず
      try {
        return !!(window.PonoDailyQuest && window.PonoDailyQuest.isClearedToday());
      } catch (_) { return false; }
    }

    function getDailyGachaRecord() {
      try {
        const raw = localStorage.getItem(DAILY_GACHA_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    }

    function setDailyGachaRecord(record) {
      try { localStorage.setItem(DAILY_GACHA_KEY, JSON.stringify(record)); } catch (_) {}
    }

    function clearDailyGachaTimers() {
      dailyGachaState.timers.forEach((id) => clearTimeout(id));
      dailyGachaState.timers = [];
    }

    function setDailyGachaTimer(fn, ms) {
      const id = setTimeout(fn, ms);
      dailyGachaState.timers.push(id);
      return id;
    }

    function normalizeDailyGachaRarity(value) {
      if (value == null) return '';
      const raw = String(value).trim();
      if (!raw) return '';
      const lower = raw.toLowerCase().replace(/[\s_-]+/g, '');
      if (DAILY_GACHA_RARITY_PROFILES[lower]) return lower;
      if (DAILY_GACHA_RARITY_ALIASES[lower]) return DAILY_GACHA_RARITY_ALIASES[lower];
      if (lower.includes('とくべつ') || lower.includes('special') || lower.includes('super') || lower.includes('ssr') || lower.includes('platinum')) return 'super';
      if (lower.includes('キラ') || lower.includes('きら') || lower.includes('rare') || lower.includes('kira') || lower.includes('gold')) return 'rare';
      if (lower.includes('normal') || lower.includes('common') || lower.includes('ふつう') || lower.includes('ノーマル')) return 'normal';
      return '';
    }

    function dailyGachaRarityProfile(rarity = dailyGachaState.rarity) {
      const normalized = normalizeDailyGachaRarity(rarity) || DAILY_GACHA_RARITY_DEFAULT;
      return DAILY_GACHA_RARITY_PROFILES[normalized] || DAILY_GACHA_RARITY_PROFILES[DAILY_GACHA_RARITY_DEFAULT];
    }

    function dailyGachaRarityOverride() {
      // batch:887 admin-debug-leak-fix — ?gachaRarity / ?gacha は manage unlock 後 +
      // "gacha-rarity-override" feature ON でのみ反映。 本番ユーザーは常に '' (= 通常ガチャ確率テーブル)。
      try {
        if (!window.PonoDebugMode
            || typeof window.PonoDebugMode.isFeatureEnabled !== 'function'
            || !window.PonoDebugMode.isFeatureEnabled('gacha-rarity-override')) {
          return '';
        }
      } catch (_) { return ''; }
      try {
        const params = new URLSearchParams(location.search);
        return normalizeDailyGachaRarity(params.get('gachaRarity') || params.get('gacha'));
      } catch (_) {
        return '';
      }
    }

    function applyDailyGachaRarity(rarity) {
      const normalized = normalizeDailyGachaRarity(rarity) || DAILY_GACHA_RARITY_DEFAULT;
      dailyGachaState.rarity = normalized;
      if (dailyGachaModal) dailyGachaModal.dataset.gachaRarity = normalized;
      return normalized;
    }

    function setDailyGachaRarityBadge(rarity) {
      if (!dailyGachaRarityBadge) return;
      const normalized = normalizeDailyGachaRarity(rarity);
      if (normalized === 'rare' || normalized === 'super') {
        dailyGachaRarityBadge.dataset.rarity = normalized;
        dailyGachaRarityBadge.textContent = '';
        dailyGachaRarityBadge.hidden = false;
        return;
      }
      dailyGachaRarityBadge.hidden = true;
      dailyGachaRarityBadge.textContent = '';
      dailyGachaRarityBadge.removeAttribute('data-rarity');
    }

    function dailyGachaRewardTitleText(result, rarity) {
      const sticker = result && result.sticker ? result.sticker : {};
      const name = String(sticker.name || 'シール').trim() || 'シール';
      const normalized = normalizeDailyGachaRarity(rarity) || 'normal';
      if (normalized === 'super') return `やったー！すごい！\n${name}が でたよ！`;
      if (normalized === 'rare') return `すごいね！\n${name}を ゲット`;
      return `やったね！\n${name}を ゲット`;
    }

    function dailyGachaRarityFromResult(result) {
      if (!result) return '';
      const sticker = result.sticker || {};
      const page = result.page || {};
      return normalizeDailyGachaRarity(
        result.rarity ||
        result.gachaRarity ||
        result.rank ||
        sticker.rarity ||
        sticker.gachaRarity ||
        sticker.rank ||
        page.rarity ||
        page.gachaRarity
      );
    }

    function isDailyGachaUsedToday() {
      // v1719: count>=2 で「今日はもう終わり」 (フリー 1 + チャレンジ報酬 1 を消化)
      return getDailyGachaCount() >= 2;
    }

    function updateDailyGachaEntry() {
      if (!dailyGachaEntry) return;
      if (!dailyGachaEnabled) {
        dailyGachaEntry.classList.remove('is-visible');
        return;
      }
      dailyGachaEntry.classList.add('is-visible');
      dailyGachaEntry.classList.remove('is-used');
      if (dailyGachaEntrySub) dailyGachaEntrySub.textContent = 'シールを ひこう';
    }

    function setDailyGachaLeverRotation(rotation) {
      if (dailyGachaModal) dailyGachaModal.style.setProperty('--gacha-rot', rotation + 'deg');
    }

    function setDailyGachaHandOrbit(progress = 0) {
      if (!dailyGachaModal) return;
      const p = Math.max(0, Math.min(1, progress));
      const rad = (p * DAILY_GACHA_DRAG_PREVIEW_ROTATION) * Math.PI / 180;
      const leverWidth = dailyGachaLever ? dailyGachaLever.offsetWidth : 140;
      const radius = Math.max(36, leverWidth * .46);
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      const angle = -10 + p * 34;
      dailyGachaModal.style.setProperty('--gacha-hand-x', x.toFixed(1) + 'px');
      dailyGachaModal.style.setProperty('--gacha-hand-y', y.toFixed(1) + 'px');
      dailyGachaModal.style.setProperty('--gacha-hand-angle', angle.toFixed(1) + 'deg');
    }

    function setDailyGachaStep(step) {
      dailyGachaState.step = Math.max(0, Math.min(DAILY_GACHA_TURNS, step));
      const pct = Math.round((dailyGachaState.step / DAILY_GACHA_TURNS) * 100);
      if (dailyGachaModal) {
        dailyGachaModal.style.setProperty('--gacha-power', pct + '%');
        dailyGachaModal.dataset.gachaStep = String(dailyGachaState.step);
      }
      if (dailyGachaMeter) dailyGachaMeter.style.width = pct + '%';
    }

    function dailyGachaStepStatus(step) {
      if (step >= DAILY_GACHA_TURNS) return 'カプセルが でるよ!';
      if (step === 2) return 'あとひとまわし！';
      if (step === 1) return 'もっとまわすよ！';
      return DAILY_GACHA_START_PROMPT;
    }

    function setDailyGachaPrompt(text) {
      if (dailyGachaStatus) dailyGachaStatus.textContent = text;
      if (dailyGachaDirectHint) dailyGachaDirectHint.textContent = text;
    }

    function setDailyGachaNoteText(el, text) {
      if (!el) return;
      const textEl = el.querySelector('.daily-gacha-reward-note__text');
      if (textEl) {
        textEl.textContent = text;
      } else {
        el.textContent = text;
      }
    }

    function dailyGachaVersionedAsset(path) {
      const sep = path.includes('?') ? '&' : '?';
      return `${path}${sep}v=${PAGE_CACHE_VERSION}`;
    }

    function setDailyGachaHandState(state = 'open') {
      if (!dailyGachaGuideHand) return;
      const normalized = DAILY_GACHA_HAND_IMAGES[state] ? state : 'open';
      const src = dailyGachaVersionedAsset(DAILY_GACHA_HAND_IMAGES[normalized]);
      if (dailyGachaGuideHand.getAttribute('src') !== src) dailyGachaGuideHand.src = src;
      if (!dailyGachaModal) return;
      dailyGachaModal.classList.toggle('is-hand-ready', normalized === 'ready');
    }

    function dailyGachaAudioSrc(path) {
      return dailyGachaVersionedAsset(path);
    }

    function dailyGachaSoundMuted() {
      try { return localStorage.getItem(SOUND_KEY) === '1'; } catch (_) { return false; }
    }

    function topBgmForDailyGacha() {
      return document.getElementById('play-bgm');
    }

    function pauseTopBgmForDailyGacha() {
      const bgm = topBgmForDailyGacha();
      if (!bgm) return;
      // v1701: 無条件 pause (冪等)、 ガード撤去で残留フラグ問題を回避
      dailyGachaAudio.resumeTopBgm = !bgm.paused;
      try { bgm.pause(); } catch (_) {}
      dailyGachaAudio.pausedTopBgm = true;
    }

    function resumeTopBgmAfterDailyGacha() {
      if (!dailyGachaAudio.pausedTopBgm) return;
      const shouldResume = dailyGachaAudio.resumeTopBgm;
      dailyGachaAudio.pausedTopBgm = false;
      dailyGachaAudio.resumeTopBgm = false;
      if (!shouldResume || dailyGachaSoundMuted()) return;
      const bgm = topBgmForDailyGacha();
      if (!bgm) return;
      try {
        // v1699 (Stream D): preload="none" のため play() 前に auto へ昇格
        if (bgm.preload !== 'auto') bgm.preload = 'auto';
        const p = bgm.play();
        if (p && p.catch) p.catch(() => {});
      } catch (_) {}
    }

    // v1693: shop 内 BGM 制御。 daily-gacha のパターンを踏襲。
    var donguriShopAudio = { pausedTopBgm: false, resumeTopBgm: false };
    function topBgmForDonguriShop() {
      return document.getElementById('play-bgm');
    }
    function pauseTopBgmForDonguriShop() {
      var bgm = topBgmForDonguriShop();
      if (!bgm) return;
      // v1701: 無条件 pause (冪等)、 ガード撤去で残留フラグ問題を回避
      donguriShopAudio.resumeTopBgm = !bgm.paused;
      try { bgm.pause(); } catch (_) {}
      donguriShopAudio.pausedTopBgm = true;
    }
    function resumeTopBgmAfterDonguriShop() {
      var bgm = topBgmForDonguriShop();
      if (!bgm) return;
      if (donguriShopAudio.pausedTopBgm && donguriShopAudio.resumeTopBgm) {
        try {
          // v1699 (Stream D): preload="none" のため play() 前に auto へ昇格
          if (bgm.preload !== 'auto') bgm.preload = 'auto';
          var p = bgm.play();
          if (p && p.catch) p.catch(function () {});
        } catch (_) {}
      }
      donguriShopAudio.pausedTopBgm = false;
      donguriShopAudio.resumeTopBgm = false;
    }

    // v1699: shop 専用 BGM (sticker-album-morning.mp3) の再生制御。
    // play-bgm 用の mute フラグ (localStorage 'pono_sound_off') を尊重する。
    function shopBgmElement() {
      return document.getElementById('shop-bgm');
    }
    function _shopBgmIsMuted() {
      try { return localStorage.getItem('pono_sound_off') === '1'; } catch (_) { return false; }
    }
    function startDonguriShopBgm() {
      var bgm = shopBgmElement();
      if (!bgm) return;
      // v1699: グローバル mute (play-bgm 用) を尊重 — mute 中は shop でも無音
      if (_shopBgmIsMuted()) return;
      try {
        // 再生前に毎回頭出し (前回の半端な位置から復活して途切れて聞こえないよう)
        bgm.currentTime = 0;
        bgm.volume = 0.32;
        var p = bgm.play();
        if (p && p.catch) p.catch(function () {
          // v1701: autoplay block 等で fail したら 1 秒後にもう一度試す (user interaction 後にはほぼ通る)
          setTimeout(function () { try { bgm.play(); } catch (_) {} }, 1000);
        });
      } catch (_) {}
    }
    function stopDonguriShopBgm() {
      var bgm = shopBgmElement();
      if (!bgm) return;
      try {
        bgm.pause();
        bgm.currentTime = 0;
      } catch (_) {}
    }
    // v1895: PonoVisibilityAudioGuard (common/preload-helper.js) が HTMLMediaElement.play を wrap し、
    //         blur/visibilitychange 後は play() を silent reject するため、 __nativePlay を利用して bypass。
    //         また購入直後に click 由来 gesture を失う race で pause される事象へ multi-stage retry で対抗。
    function _nativeMediaPlay() {
      try {
        var proto = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
        return (proto && proto.play && proto.play.__nativePlay) || null;
      } catch (_) { return null; }
    }
    function _clearAudioInactiveGuard() {
      try {
        if (window.PonoVisibilityAudioGuard
            && typeof window.PonoVisibilityAudioGuard.clearFocusInactiveIfVisible === 'function') {
          window.PonoVisibilityAudioGuard.clearFocusInactiveIfVisible();
        }
      } catch (_) {}
    }
    // v1895 security-review Medium fix: __nativePlay bypass 時に guardedPlay の trackMedia が
    //   走らないので、 明示的に mediaEls に登録して background-audio-stop guard を維持する。
    function _trackShopMediaEl(el) {
      try {
        if (el && window.PonoVisibilityAudioGuard
            && typeof window.PonoVisibilityAudioGuard.trackMedia === 'function') {
          window.PonoVisibilityAudioGuard.trackMedia(el);
        }
      } catch (_) {}
    }
    // v1891→v1895: どんぐりショップ購入直後に shop-bgm が途切れないよう再開を保証する safety guard。
    //         v1895: PonoVisibilityAudioGuard が blur 後の play() を silent reject する問題に対し、
    //         __nativePlay bypass + 0/120/450/1100ms の multi-stage retry で対抗。
    function ensureShopBgmPlaying() {
      try {
        var bgm = shopBgmElement();
        if (!bgm) return;
        _trackShopMediaEl(bgm); // v1895 security fix: bypass 前に guard 追跡登録
        var np = _nativeMediaPlay();
        var tryPlay = function () {
          try {
            if (_shopBgmIsMuted()) return;
            // v1895 code-review HIGH fix: __nativePlay bypass が page-hidden 時に background-audio
            //   policy を defeat しないよう、 document.hidden を明示チェック。 遅延 retry でも尊重。
            if (document.hidden) return;
            if (!bgm.paused) return;
            if (bgm.preload !== 'auto') bgm.preload = 'auto';
            try { bgm.volume = 0.32; } catch (_) {}
            var p = np ? np.call(bgm) : bgm.play();
            if (p && p.catch) p.catch(function () {});
          } catch (_) {}
        };
        tryPlay();
        setTimeout(tryPlay, 120);
        setTimeout(tryPlay, 450);
        setTimeout(tryPlay, 1100);
      } catch (_) {}
    }
    // v1891→v1895: 購入時 SE (rarity 別、 既存 asset 再利用、 monotonic volume)。
    //   normal (15) → shop-sfx-normal (acorn_get_festive_20260628.mp3)      @ 0.55
    //   rare   (25) → shop-sfx-rare   (daily_gacha_sticker_sparkle.mp3)     @ 0.65
    //   super  (35) → shop-sfx-super  (daily_gacha_magic_sparkle_long.mp3)  @ 0.75
    //   v1895: new Audio() を廃止し preloaded <audio> 要素経由 + __nativePlay bypass + 250ms retry。
    //   showStickerToast 内の _playRewardImpactSfx との二重発火は suppressImpactSfx で回避 (呼出元 wire 済)。
    function playDonguriShopPurchaseSfx(stickerId) {
      try {
        if (_shopBgmIsMuted()) return;
        var price = 0;
        try {
          if (window.PonoDonguriShop && typeof window.PonoDonguriShop.getPrice === 'function') {
            price = window.PonoDonguriShop.getPrice(stickerId) | 0;
          }
        } catch (_) {}
        var id, vol;
        if (price >= 35)      { id = 'shop-sfx-super';  vol = 0.75; }
        else if (price >= 25) { id = 'shop-sfx-rare';   vol = 0.65; }
        else                  { id = 'shop-sfx-normal'; vol = 0.55; }
        var el = document.getElementById(id);
        if (!el) return;
        _trackShopMediaEl(el); // v1895 security fix: bypass 前に guard 追跡登録
        try { el.pause(); el.currentTime = 0; el.volume = vol; } catch (_) {}
        var np = _nativeMediaPlay();
        var doPlay = function () {
          try {
            // v1895 code-review HIGH fix: bypass でも page-hidden 時は再生しない (policy 尊重)
            if (document.hidden) return null;
            return np ? np.call(el) : el.play();
          } catch (_) { return null; }
        };
        var pr = doPlay();
        if (pr && pr.catch) pr.catch(function () {
          setTimeout(function () { try { doPlay(); } catch (_) {} }, 250);
        });
      } catch (_) {}
    }

    function createDailyGachaAudio(path, options = {}) {
      if (typeof Audio !== 'function') return null;
      const audio = new Audio(dailyGachaAudioSrc(path));
      audio.preload = 'auto';
      audio.loop = !!options.loop;
      audio.volume = options.volume ?? 1;
      return audio;
    }

    function trackDailyGachaMedia(audio) {
      try {
        if (audio && window.PonoVisibilityAudioGuard
            && typeof window.PonoVisibilityAudioGuard.trackMedia === 'function') {
          window.PonoVisibilityAudioGuard.trackMedia(audio);
        }
      } catch (_) {}
    }

    function playDailyGachaMedia(audio) {
      if (!audio || dailyGachaSoundMuted() || document.hidden) return null;
      try { _clearAudioInactiveGuard(); } catch (_) {}
      trackDailyGachaMedia(audio);
      const nativePlay = _nativeMediaPlay();
      return nativePlay ? nativePlay.call(audio) : audio.play();
    }

    function ensureDailyGachaAudio() {
      if (dailyGachaAudio.ready) return;
      dailyGachaAudio.turnPool = [
        createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.turn),
        createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.turn),
        createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.turn)
      ].filter(Boolean);
      dailyGachaAudio.capsuleExit = createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.capsuleExit, { volume: .9 });
      dailyGachaAudio.bed = createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.bed, { loop: true, volume: .5 });
      dailyGachaAudio.finalStinger = createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.finalStinger, { volume: .72 });
      dailyGachaAudio.superReveal = createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.superReveal, { volume: .86 });
      dailyGachaAudio.capsuleOpen = createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.capsuleOpen, { volume: .72 });
      dailyGachaAudio.sparkle = createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.sparkle, { volume: .78 });
      dailyGachaAudio.sparkleLong = createDailyGachaAudio(DAILY_GACHA_AUDIO_ASSETS.sparkleLong, { volume: .58 });
      dailyGachaAudio.ready = true;
    }

    function primeDailyGachaAudio() {
      ensureDailyGachaAudio();
      [
        ...dailyGachaAudio.turnPool,
        dailyGachaAudio.capsuleExit,
        dailyGachaAudio.bed,
        dailyGachaAudio.finalStinger,
        dailyGachaAudio.superReveal,
        dailyGachaAudio.capsuleOpen,
        dailyGachaAudio.sparkle,
        dailyGachaAudio.sparkleLong
      ].forEach((audio) => {
        try { if (audio) audio.load(); } catch (_) {}
      });
    }

    function playDailyGachaAudio(audio, options = {}) {
      if (!audio || dailyGachaSoundMuted()) return false;
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = options.volume ?? audio.volume ?? 1;
        audio.playbackRate = options.rate ?? 1;
        const p = playDailyGachaMedia(audio);
        if (!p) return false;
        if (p && p.catch) p.catch(() => {
          const retryMs = options.retryMs ?? 120;
          setTimeout(() => {
            try {
              const retry = playDailyGachaMedia(audio);
              if (retry && retry.catch) retry.catch(() => {
                if (typeof options.onReject === 'function') options.onReject();
              });
            } catch (_) {
              if (typeof options.onReject === 'function') options.onReject();
            }
          }, retryMs);
        });
        return true;
      } catch (_) {
        return false;
      }
    }

    function clearDailyGachaBedRetry() {
      if (!dailyGachaBedRetryTimer) return;
      clearTimeout(dailyGachaBedRetryTimer);
      dailyGachaBedRetryTimer = 0;
    }

    function shouldDailyGachaBedRun() {
      return !!(dailyGachaModal && !dailyGachaModal.hidden && !dailyGachaSoundMuted());
    }

    function startDailyGachaBed(allowRetry = true) {
      if (dailyGachaSoundMuted()) return;
      ensureDailyGachaAudio();
      const bed = dailyGachaAudio.bed;
      if (!bed) return;
      const profile = dailyGachaRarityProfile();
      try {
        bed.volume = profile.bedVolume ?? .2;
        bed.playbackRate = 1;
        if (bed.paused) bed.currentTime = 0;
        const p = playDailyGachaMedia(bed);
        if (p && p.catch) p.catch(() => {
          if (!allowRetry || !shouldDailyGachaBedRun()) return;
          clearDailyGachaBedRetry();
          dailyGachaBedRetryTimer = setTimeout(() => {
            dailyGachaBedRetryTimer = 0;
            if (shouldDailyGachaBedRun()) startDailyGachaBed(false);
          }, 450);
        });
      } catch (_) {}
    }

    function stopDailyGachaBed(reset = true) {
      clearDailyGachaBedRetry();
      const bed = dailyGachaAudio.bed;
      if (!bed) return;
      try {
        bed.pause();
        if (reset) bed.currentTime = 0;
      } catch (_) {}
    }

    function stopDailyGachaOneShotAudio(reset = true) {
      [
        ...dailyGachaAudio.turnPool,
        dailyGachaAudio.capsuleExit,
        dailyGachaAudio.finalStinger,
        dailyGachaAudio.superReveal,
        dailyGachaAudio.capsuleOpen,
        dailyGachaAudio.sparkle,
        dailyGachaAudio.sparkleLong
      ].forEach((audio) => {
        if (!audio) return;
        try {
          audio.pause();
          if (reset) audio.currentTime = 0;
        } catch (_) {}
      });
    }

    function playDailyGachaFallbackSfx(kind) {
      try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        if (!dailyGachaAudioCtx) dailyGachaAudioCtx = new AudioCtor();
        const ctx = dailyGachaAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (kind === 'sparkle') {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (_) {}
          [760, 1080, 1520].forEach((freq, index) => {
            const sparkleOsc = ctx.createOscillator();
            const sparkleGain = ctx.createGain();
            const start = now + index * .055;
            sparkleOsc.type = 'sine';
            sparkleOsc.frequency.setValueAtTime(freq, start);
            sparkleOsc.frequency.exponentialRampToValueAtTime(freq * 1.22, start + .18);
            sparkleGain.gain.setValueAtTime(.0001, start);
            sparkleGain.gain.exponentialRampToValueAtTime(.038, start + .018);
            sparkleGain.gain.exponentialRampToValueAtTime(.0001, start + .23);
            sparkleOsc.connect(sparkleGain);
            sparkleGain.connect(ctx.destination);
            sparkleOsc.start(start);
            sparkleOsc.stop(start + .24);
          });
        } else if (kind === 'boom') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(124, now);
          osc.frequency.exponentialRampToValueAtTime(46, now + .28);
          gain.gain.setValueAtTime(.0001, now);
          gain.gain.exponentialRampToValueAtTime(.13, now + .02);
          gain.gain.exponentialRampToValueAtTime(.0001, now + .34);
          osc.start(now);
          osc.stop(now + .36);
        } else {
          osc.type = 'square';
          osc.frequency.setValueAtTime(620, now);
          osc.frequency.exponentialRampToValueAtTime(430, now + .06);
          gain.gain.setValueAtTime(.0001, now);
          gain.gain.exponentialRampToValueAtTime(.045, now + .01);
          gain.gain.exponentialRampToValueAtTime(.0001, now + .08);
          osc.start(now);
          osc.stop(now + .09);
        }
      } catch (_) {}
    }

    function playDailyGachaSfx(kind, step = 0) {
      ensureDailyGachaAudio();
      if (dailyGachaSoundMuted()) return;
      const rarityProfile = dailyGachaRarityProfile();
      if (kind === 'sparkle') {
        let fallbackPlayed = false;
        const fallback = () => {
          if (fallbackPlayed) return;
          fallbackPlayed = true;
          playDailyGachaFallbackSfx(kind);
        };
        const played = playDailyGachaAudio(dailyGachaAudio.sparkle, { volume: rarityProfile.sparkleVolume ?? .82, rate: 1, onReject: fallback });
        const longVolume = rarityProfile.sparkleLongVolume ?? .56;
        const playedLong = longVolume > 0
          ? playDailyGachaAudio(dailyGachaAudio.sparkleLong, { volume: longVolume, rate: 1, onReject: fallback })
          : false;
        if (!played && !playedLong) playDailyGachaFallbackSfx(kind);
        return;
      }
      if (kind === 'capsuleExit') {
        if (dailyGachaAudio.bed) {
          try { dailyGachaAudio.bed.volume = .12; } catch (_) {}
        }
        const played = playDailyGachaAudio(dailyGachaAudio.capsuleExit, { volume: rarityProfile.exitVolume ?? .92, rate: 1, onReject: () => playDailyGachaFallbackSfx('boom') });
        if (!played) playDailyGachaFallbackSfx('boom');
        return;
      }
      if (kind === 'finalStinger') {
        const played = playDailyGachaAudio(dailyGachaAudio.finalStinger, {
          volume: rarityProfile.finalStingerVolume ?? .74,
          rate: rarityProfile.finalStingerRate ?? 1,
          onReject: () => playDailyGachaFallbackSfx('boom')
        });
        if (!played) playDailyGachaFallbackSfx('boom');
        return;
      }
      if (kind === 'capsuleOpen') {
        let fallbackPlayed = false;
        const fallback = () => {
          if (fallbackPlayed) return;
          fallbackPlayed = true;
          playDailyGachaFallbackSfx('click');
        };
        const superRevealVolume = rarityProfile.superRevealVolume ?? 0;
        const playedSuper = superRevealVolume > 0
          ? playDailyGachaAudio(dailyGachaAudio.superReveal, { volume: superRevealVolume, rate: 1, onReject: fallback })
          : false;
        const played = playDailyGachaAudio(dailyGachaAudio.capsuleOpen, { volume: rarityProfile.capsuleOpenVolume ?? .74, rate: 1, onReject: fallback });
        if (!played && !playedSuper) playDailyGachaFallbackSfx('click');
        return;
      }
      const profile = DAILY_GACHA_TURN_SOUND[step] || DAILY_GACHA_TURN_SOUND[1];
      const pool = dailyGachaAudio.turnPool;
      const audio = pool.length ? pool[dailyGachaAudio.turnIndex % pool.length] : null;
      dailyGachaAudio.turnIndex += 1;
      const played = playDailyGachaAudio(audio, {
        volume: Math.min(1, (profile.volume ?? .7) + (rarityProfile.turnVolumeBonus || 0)),
        rate: (profile.rate ?? 1) + (rarityProfile.turnRateBonus || 0),
        onReject: () => playDailyGachaFallbackSfx(kind)
      });
      if (!played) playDailyGachaFallbackSfx(kind);
    }

    function pulseDailyGachaHaptic(finalTurn = false) {
      // v1910: common/haptics.js 経由に統一 (throttle + opt-out + iOS fallback を共通化)。
      // Haptics 未読込時は bare vibrate に fallback (defer race safety)。
      try {
        if (window.Haptics && typeof window.Haptics.fire === 'function') {
          window.Haptics.fire(finalTurn ? 'gachaTurn3' : 'gachaTurn1_2');
          return;
        }
        if (navigator && typeof navigator.vibrate === 'function') {
          navigator.vibrate(finalTurn ? [18, 22, 34] : 16);
        }
      } catch (_) {}
    }

    // v1910: reveal moment (is-opened 付与時) の カプセル割れ振動。
    function fireDailyGachaCapsuleHaptic() {
      try {
        if (window.Haptics && typeof window.Haptics.fire === 'function') {
          window.Haptics.fire('capsuleCrack');
        }
      } catch (_) {}
    }

    // v1910: rare/super badge pop アニメーション (openDelay + 420ms) と同期する振動。
    function fireDailyGachaBadgeHaptic(rarity) {
      try {
        if (rarity !== 'rare' && rarity !== 'super') return;
        if (window.Haptics && typeof window.Haptics.fire === 'function') {
          window.Haptics.fire(rarity === 'super' ? 'superBadgePop' : 'rareBadgePop');
        }
      } catch (_) {}
    }

    // v1910: reveal 瞬間の DOM particle burst (rare=12粒90°扇 / super=20粒360°)。
    // 親は .daily-gacha-shell (closeup の overflow:hidden 回避、 modal ルート内で完結)。
    // opt-out: localStorage.pono_particles_off === '1' or prefers-reduced-motion。
    function spawnGachaParticles(rarity) {
      try {
        if (rarity !== 'rare' && rarity !== 'super') return;
        if (!dailyGachaModal) return;
        try {
          if (localStorage.getItem('pono_particles_off') === '1') return;
        } catch (_) {}
        try {
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        } catch (_) {}
        const host = dailyGachaModal.querySelector('.daily-gacha-shell') || dailyGachaModal;
        const isSuper = rarity === 'super';
        const count = isSuper ? 20 : 12;
        const duration = isSuper ? 1100 : 900;
        // rare: 上向き 90° 扇 (−180°〜0° の上半円中央)。 super: 360° 全方位。
        const angleStart = isSuper ? -90 : -180;
        const angleSpan = isSuper ? 360 : 180;
        const primary = isSuper ? '#e8f0d8' : '#a8c8a0';
        const accent = '#ffffff';
        for (let i = 0; i < count; i++) {
          const p = document.createElement('div');
          p.className = 'gacha-particle';
          const angle = angleStart + (angleSpan * (i + 0.5)) / count + (Math.random() * 10 - 5);
          const dist = (isSuper ? 130 : 110) + Math.floor(Math.random() * 40);
          const size = 8 + Math.floor(Math.random() * 6);
          const delay = Math.floor(Math.random() * 90);
          const color = i % 2 === 1 ? accent : primary;
          p.style.setProperty('--angle', angle + 'deg');
          p.style.setProperty('--dist', dist + 'px');
          p.style.setProperty('--delay', delay + 'ms');
          p.style.setProperty('--size', size + 'px');
          p.style.setProperty('--color', color);
          p.style.animationDuration = duration + 'ms';
          host.appendChild(p);
          p.addEventListener('animationend', () => { try { p.remove(); } catch (_) {} }, { once: true });
          // 保険 removal (animationend 未発火時)。
          setTimeout(() => { try { p.remove(); } catch (_) {} }, duration + 400);
        }
      } catch (_) {}
    }

    const DAILY_GACHA_CAPSULE_VARIANTS = {
      normal: [
        {
          rarity: 'normal',
          color: 'pink',
          closed: 'assets/ui/gacha/daily_gacha_capsule_closed_pink.png',
          openLeft: 'assets/ui/gacha/daily_gacha_capsule_open_pink_pono.png',
          openRight: 'assets/ui/gacha/daily_gacha_capsule_open_pink_plain.png'
        },
        {
          rarity: 'normal',
          color: 'blue',
          closed: 'assets/ui/gacha/daily_gacha_capsule_closed_blue.png',
          openLeft: 'assets/ui/gacha/daily_gacha_capsule_open_blue_pono.png',
          openRight: 'assets/ui/gacha/daily_gacha_capsule_open_blue_plain.png'
        }
      ],
      rare: [
        {
          rarity: 'rare',
          color: 'gold',
          closed: 'assets/ui/gacha/daily_gacha_capsule_closed_gold.png',
          openLeft: 'assets/ui/gacha/daily_gacha_capsule_open_gold_pono.png',
          openRight: 'assets/ui/gacha/daily_gacha_capsule_open_gold_plain.png'
        }
      ],
      super: [
        {
          rarity: 'super',
          color: 'platinum',
          closed: 'assets/ui/gacha/daily_gacha_capsule_closed_super.png',
          openLeft: 'assets/ui/gacha/daily_gacha_capsule_open_super_pono.png',
          openRight: 'assets/ui/gacha/daily_gacha_capsule_open_super_plain.png'
        }
      ]
    };
    const DAILY_GACHA_CAPSULE_ALL_VARIANTS = [
      ...DAILY_GACHA_CAPSULE_VARIANTS.normal,
      ...DAILY_GACHA_CAPSULE_VARIANTS.rare,
      ...DAILY_GACHA_CAPSULE_VARIANTS.super
    ];
    const DAILY_GACHA_VERSIONED_PRELOAD_IMAGES = new Set([
      ...DAILY_GACHA_REVEAL_BACKDROPS,
      ...Object.values(DAILY_GACHA_HAND_IMAGES)
    ]);
    let dailyGachaImagePreloadStarted = false;
    const dailyGachaImagePreloadCache = [];

    function dailyGachaPreloadImageSource(path) {
      return DAILY_GACHA_VERSIONED_PRELOAD_IMAGES.has(path) ? dailyGachaVersionedAsset(path) : path;
    }

    function dailyGachaImagePreloadList() {
      const capsuleImages = DAILY_GACHA_CAPSULE_ALL_VARIANTS.flatMap((variant) => [
        variant.closed,
        variant.openLeft,
        variant.openRight
      ]);
      return Array.from(new Set([
        ...DAILY_GACHA_STATIC_PRELOAD_IMAGES,
        ...DAILY_GACHA_REVEAL_BACKDROPS,
        ...Object.values(DAILY_GACHA_HAND_IMAGES),
        ...capsuleImages
      ]));
    }

    function preloadDailyGachaImage(path) {
      return new Promise((resolve) => {
        if (!path) { resolve(); return; }
        const img = new Image();
        dailyGachaImagePreloadCache.push(img);
        img.decoding = 'async';
        img.loading = 'eager';
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = dailyGachaPreloadImageSource(path);
        if (img.decode) {
          img.decode().then(resolve).catch(resolve);
        }
      });
    }

    function startDailyGachaImagePreload() {
      if (!dailyGachaEnabled || dailyGachaImagePreloadStarted) return;
      dailyGachaImagePreloadStarted = true;
      const images = dailyGachaImagePreloadList();
      // Fix 3 (2026-06-28): chrome (start_panel / counter / home / shop / machine 等)
      // と機械/ステータス周りの最初の 16 枚は即時連続発火 (gap=0)、 reveal/closeup の
      // 後続バッチのみ 90ms gap を維持して main thread を圧迫しないようにする。
      // 報告2+3 のモーダル open 後 chrome paint 1014ms→400ms (-600ms) を狙う。
      const FAST_BATCH_SIZE = 8;
      const SLOW_BATCH_SIZE = 4;
      const FAST_THRESHOLD = 16;
      let index = 0;
      const loadBatch = () => {
        const inFast = index < FAST_THRESHOLD;
        const size = inFast ? FAST_BATCH_SIZE : SLOW_BATCH_SIZE;
        const batch = images.slice(index, index + size);
        index += batch.length;
        batch.forEach(preloadDailyGachaImage);
        if (index < images.length) {
          const gap = index < FAST_THRESHOLD ? 0 : 90;
          window.setTimeout(loadBatch, gap);
        }
      };
      loadBatch();
    }

    function scheduleDailyGachaImagePreload() {
      if (!dailyGachaEnabled || dailyGachaImagePreloadStarted) return;
      let scheduledRunDone = false;
      const run = () => {
        if (scheduledRunDone) return;
        scheduledRunDone = true;
        startDailyGachaImagePreload();
      };
      window.setTimeout(run, 700);
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 1400 });
      }
    }

    function chooseDailyGachaRandomVariant(variants) {
      if (!Array.isArray(variants) || variants.length === 0) return null;
      return variants[Math.floor(Math.random() * variants.length)] || variants[0];
    }

    function chooseDailyGachaCapsuleVariant(rarity = '') {
      const normalized = normalizeDailyGachaRarity(rarity);
      if (!normalized) return chooseDailyGachaRandomVariant(DAILY_GACHA_CAPSULE_ALL_VARIANTS);
      const profile = dailyGachaRarityProfile(normalized);
      const group = profile.capsuleGroup || normalized;
      return chooseDailyGachaRandomVariant(DAILY_GACHA_CAPSULE_VARIANTS[group]);
    }

    function chooseDailyGachaCapsule(rarity = '') {
      const assets =
        chooseDailyGachaCapsuleVariant(rarity) ||
        DAILY_GACHA_CAPSULE_ALL_VARIANTS[0];
      applyDailyGachaRarity(assets.rarity || DAILY_GACHA_RARITY_DEFAULT);
      dailyGachaState.capsuleColor = assets.color;
      dailyGachaState.capsuleOpenLeft = assets.openLeft;
      dailyGachaState.capsuleOpenRight = assets.openRight;
      if (dailyGachaDropCapsule) dailyGachaDropCapsule.src = assets.closed;
      if (dailyGachaCloseCapsule) dailyGachaCloseCapsule.src = assets.closed;
      if (dailyGachaOpenCapsuleLeft) dailyGachaOpenCapsuleLeft.src = assets.openLeft;
      if (dailyGachaOpenCapsuleRight) dailyGachaOpenCapsuleRight.src = assets.openRight;
      return assets;
    }

    function chooseDailyGachaRevealBackdrop(rarity = dailyGachaState.rarity) {
      const profile = dailyGachaRarityProfile(rarity);
      const backdrops = profile.backdrops || DAILY_GACHA_REVEAL_BACKDROPS;
      const backdrop = backdrops[Math.floor(Math.random() * backdrops.length)] || DAILY_GACHA_REVEAL_BACKDROPS[0];
      dailyGachaState.revealBackdrop = backdrop;
      if (dailyGachaModal) {
        dailyGachaModal.style.setProperty('--gacha-reveal-bg', `url("${dailyGachaVersionedAsset(backdrop)}")`);
      }
    }

    function resetDailyGachaModal() {
      clearDailyGachaTimers();
      dailyGachaState.dragging = false;
      dailyGachaState.lastAngle = 0;
      dailyGachaState.dragAngle = 0;
      dailyGachaState.step = 0;
      dailyGachaState.settledRotation = 0;
      dailyGachaState.turnLock = false;
      dailyGachaState.complete = false;
      const capsule = chooseDailyGachaCapsule(dailyGachaRarityOverride());
      chooseDailyGachaRevealBackdrop(capsule && capsule.rarity);
      setDailyGachaStep(0);
      setDailyGachaLeverRotation(0);
      setDailyGachaHandOrbit(0);
      if (dailyGachaModal) {
        dailyGachaModal.classList.remove('is-used', 'is-armed', 'is-hand-ready', 'is-grabbing', 'is-notch', 'is-turning', 'is-final-zoom', 'is-boom', 'is-dropping', 'is-closeup', 'is-opened');
      }
      setDailyGachaHandState('open');
      setDailyGachaPrompt(dailyGachaStepStatus(0));
      if (dailyGachaAssist) {
        dailyGachaAssist.hidden = true;
        dailyGachaAssist.disabled = true;
        dailyGachaAssist.textContent = 'もういっかい まわす';
        dailyGachaAssist.removeAttribute('data-mode'); // v1577 M2: hint mode を解除
      }
      if (dailyGachaBook) dailyGachaBook.hidden = true;
      if (dailyGachaReward) dailyGachaReward.classList.remove('is-emoji');
      if (dailyGachaRewardImg) {
        dailyGachaRewardImg.removeAttribute('src');
        dailyGachaRewardImg.alt = '';
      }
      if (dailyGachaRewardEmoji) dailyGachaRewardEmoji.textContent = '⭐';
      setDailyGachaRarityBadge('');
      if (dailyGachaRewardName) {
        dailyGachaRewardName.textContent = '';
        dailyGachaRewardName.hidden = true;
        dailyGachaRewardName.removeAttribute('data-gacha-rarity');
        dailyGachaRewardName.removeAttribute('data-long-name');
      }
      setDailyGachaNoteText(dailyGachaRewardNote, '');
      setDailyGachaNoteText(dailyGachaTomorrowNote, '');
      if (dailyGachaLever) {
        dailyGachaLever.disabled = false;
        delete dailyGachaLever.dataset.blocked; // v1577 M2: blocked フラグも reset
        dailyGachaLever.classList.remove('is-blocked-bump');
      }
    }

    function setDailyGachaReward(result) {
      const resultRarity = dailyGachaRarityFromResult(result) || dailyGachaState.rarity;
      setDailyGachaRarityBadge(resultRarity);
      const sticker = result && result.sticker ? result.sticker : {};
      const page = result && result.page ? result.page : {};
      const resolver = window.PonoGameStickers && window.PonoGameStickers.resolveAsset;
      const src = sticker.img && typeof resolver === 'function'
        ? resolver(sticker.img)
        : (sticker.img || '');
      if (src && dailyGachaRewardImg) {
        dailyGachaRewardImg.src = src;
        dailyGachaRewardImg.alt = '';
        if (dailyGachaReward) dailyGachaReward.classList.remove('is-emoji');
      } else {
        if (dailyGachaReward) dailyGachaReward.classList.add('is-emoji');
        if (dailyGachaRewardEmoji) dailyGachaRewardEmoji.textContent = sticker.emoji || '⭐';
      }
      if (dailyGachaRewardName) {
        const titleText = dailyGachaRewardTitleText(result, resultRarity);
        dailyGachaRewardName.textContent = titleText;
        dailyGachaRewardName.dataset.gachaRarity = normalizeDailyGachaRarity(resultRarity) || 'normal';
        dailyGachaRewardName.dataset.longName = titleText.replace(/\s/g, '').length > 16 ? '1' : '0';
        dailyGachaRewardName.hidden = false;
      }
      setDailyGachaNoteText(dailyGachaRewardNote, DAILY_GACHA_STICKER_BOOK_PROMPT);
      setDailyGachaNoteText(dailyGachaTomorrowNote, DAILY_GACHA_TOMORROW_PROMPT.replace(' やろう', '\nやろう'));
    }

    function dailyGachaRecordFromResult(result, prevRecord) {
      const sticker = result && result.sticker ? result.sticker : {};
      const page = result && result.page ? result.page : {};
      // v1719: 引いた回数を carry-over。 prevRecord が同じ JST 日なら +1、 そうでなければ 1。
      // 旧 record (count フィールドなし) は stickerId 有を count=1 として後方互換扱い。
      const today = dailyGachaTodayKey();
      let prevCount = 0;
      if (prevRecord && prevRecord.date === today) {
        if (typeof prevRecord.count === 'number') prevCount = prevRecord.count;
        else if (prevRecord.stickerId) prevCount = 1;
      }
      return {
        date: today,
        count: prevCount + 1,
        gameId: result.gameId,
        stickerId: result.stickerId,
        stickerName: sticker.name || 'シール',
        stickerImg: sticker.img || '',
        stickerEmoji: sticker.emoji || '',
        pageTitle: page.title || '',
        rarity: normalizeDailyGachaRarity(result.rarity || result.gachaRarity || sticker.rarity || sticker.gachaRarity) || dailyGachaState.rarity,
        ts: Date.now()
      };
    }

    function dailyGachaStickerRarity(sticker = {}, page = {}) {
      return normalizeDailyGachaRarity(
        sticker.rarity ||
        sticker.gachaRarity ||
        sticker.rank ||
        page.rarity ||
        page.gachaRarity
      ) || 'normal';
    }

    function chooseDailyGachaStickerCandidate(candidates, preferredRarity) {
      const target = normalizeDailyGachaRarity(preferredRarity) || DAILY_GACHA_RARITY_DEFAULT;
      const pools = [
        candidates.filter((candidate) => candidate.rarity === target && !candidate.owned),
        candidates.filter((candidate) => candidate.rarity === target),
        candidates.filter((candidate) => !candidate.owned),
        candidates
      ];
      for (const pool of pools) {
        if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
      }
      return null;
    }

    async function grantDailyGachaSticker() {
      const api = window.PonoGameStickers;
      if (!api || typeof api.loadCatalog !== 'function' || typeof api.grant !== 'function') return null;
      const catalog = await api.loadCatalog();
      const pages = (catalog && catalog.pages) || {};
      const candidates = [];
      // v3 (feature_tier_v3 §7): daily gacha の抽選母数を tier でゲートする。
      //   sub  : 全ページ (bookOnly を除く)
      //   free/book (free=book, 機能差ゼロ) : quizland 1ページのみ
      // 旧 `page.appOnly && !__isAppBuild` ゲートは isSubTier 判定に包含される
      // (isAppBuild → PonoTier.getTier()==='sub' なので冗長化のため撤去)。
      const __gachaTier = window.PonoTier || null;
      const __gachaIsSub = __gachaTier && typeof __gachaTier.isSub === 'function' ? __gachaTier.isSub() : __isAppBuild;
      Object.keys(pages).forEach((id) => {
        const page = pages[id] || {};
        if (page.bookOnly) return false;
        if (!__gachaIsSub && id !== 'quizland') return false;
        if (!Array.isArray(page.stickers) || !page.stickers.length) return false;
        const owned = typeof api.getOwned === 'function' ? (api.getOwned(id) || {}) : {};
        page.stickers.forEach((sticker) => {
          if (!sticker || !sticker.id) return;
          const unlockOn = Array.isArray(sticker.unlockOn) ? sticker.unlockOn : [];
          if (unlockOn.length && !unlockOn.includes('daily_gacha')) return;
          candidates.push({
            gameId: id,
            sticker,
            rarity: dailyGachaStickerRarity(sticker, page),
            owned: !!owned[sticker.id]
          });
        });
      });
      const candidate = chooseDailyGachaStickerCandidate(candidates, dailyGachaState.rarity);
      if (!candidate) return null;
      const result = await api.grant({
        gameId: candidate.gameId,
        stickerId: candidate.sticker.id,
        event: 'daily_gacha',
        show: false
      });
      if (result && result.sticker) {
        const resultRarity = dailyGachaRarityFromResult(result) || candidate.rarity;
        if (resultRarity) result.rarity = resultRarity;
        // v1719: prev record を渡して count を加算 (1 or 2)
        setDailyGachaRecord(dailyGachaRecordFromResult(result, getDailyGachaRecord()));
        return result;
      }
      return null;
    }

    function angleForDailyGachaPointer(event) {
      const rect = dailyGachaLever.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI;
    }

    function commitDailyGachaTurn() {
      if (dailyGachaState.complete || dailyGachaState.turnLock) return;
      if (dailyGachaState.step >= DAILY_GACHA_TURNS) return;
      dailyGachaState.turnLock = true;
      dailyGachaState.dragAngle = 0;
      const nextStep = dailyGachaState.step + 1;
      dailyGachaState.settledRotation = nextStep * DAILY_GACHA_TURN_ROTATION;
      setDailyGachaHandOrbit(1);
      setDailyGachaStep(nextStep);
      setDailyGachaLeverRotation(dailyGachaState.settledRotation);
      setDailyGachaPrompt(dailyGachaStepStatus(nextStep));
      pulseDailyGachaHaptic(nextStep >= DAILY_GACHA_TURNS);
      setDailyGachaHandState('grip');
      if (dailyGachaModal) {
        dailyGachaModal.classList.remove('is-armed', 'is-hand-ready', 'is-grabbing', 'is-notch');
        void dailyGachaModal.offsetWidth;
        dailyGachaModal.classList.add('is-notch');
      }
      if (nextStep < DAILY_GACHA_TURNS) {
        playDailyGachaSfx('click', nextStep);
      } else {
        playDailyGachaSfx('finalStinger');
      }
      setDailyGachaTimer(() => {
        dailyGachaState.turnLock = false;
        setDailyGachaHandState('open');
        setDailyGachaHandOrbit(0);
        if (dailyGachaModal) dailyGachaModal.classList.remove('is-notch');
        if (!dailyGachaState.complete && dailyGachaModal) dailyGachaModal.classList.add('is-armed');
      }, DAILY_GACHA_TURN_LOCK_MS);
      if (nextStep >= DAILY_GACHA_TURNS) setDailyGachaTimer(runDailyGacha, DAILY_GACHA_FINAL_START_DELAY);
    }

    async function runDailyGacha() {
      if (!dailyGachaModal || dailyGachaState.complete) return;
      dailyGachaState.complete = true;
      setDailyGachaHandState('open');
      dailyGachaModal.classList.remove('is-armed', 'is-hand-ready', 'is-grabbing');
      dailyGachaModal.classList.add('is-turning', 'is-final-zoom', 'is-boom');
      setDailyGachaPrompt(dailyGachaStepStatus(DAILY_GACHA_TURNS));
      if (dailyGachaAssist) dailyGachaAssist.disabled = true;
      if (dailyGachaLever) dailyGachaLever.disabled = true;

      let result = null;
      try {
        result = await grantDailyGachaSticker();
      } catch (_) {
        result = null;
      }
      if (!result) {
        dailyGachaState.complete = false;
        dailyGachaState.turnLock = false;
        dailyGachaState.step = DAILY_GACHA_TURNS - 1;
        dailyGachaState.settledRotation = dailyGachaState.step * DAILY_GACHA_TURN_ROTATION;
        setDailyGachaStep(dailyGachaState.step);
        setDailyGachaLeverRotation(dailyGachaState.settledRotation);
        dailyGachaModal.classList.remove('is-turning', 'is-final-zoom', 'is-boom', 'is-notch', 'is-hand-ready');
        dailyGachaModal.classList.add('is-armed');
        setDailyGachaHandState('open');
        setDailyGachaPrompt('シールの じゅんびちゅう');
        if (dailyGachaAssist) dailyGachaAssist.disabled = true;
        if (dailyGachaLever) dailyGachaLever.disabled = false;
        startDailyGachaBed();
        return;
      }

      const resultRarity = dailyGachaRarityFromResult(result);
      if (resultRarity && resultRarity !== dailyGachaState.rarity) {
        applyDailyGachaRarity(resultRarity);
        chooseDailyGachaCapsule(resultRarity);
        chooseDailyGachaRevealBackdrop(resultRarity);
        // v1719: pullDailyGachaSticker で既に count++ 済み。 ここでは rarity だけ更新し count は不変にする。
        const existing = getDailyGachaRecord();
        if (existing && existing.date === dailyGachaTodayKey()) {
          existing.rarity = resultRarity;
          setDailyGachaRecord(existing);
        }
      }
      const revealProfile = dailyGachaRarityProfile();
      setDailyGachaReward(result);
      setDailyGachaTimer(
        () => playDailyGachaSfx('capsuleExit'),
        Math.max(0, revealProfile.dropDelay - revealProfile.exitSoundLeadMs)
      );
      setDailyGachaTimer(() => {
        dailyGachaModal.classList.add('is-dropping');
      }, revealProfile.dropDelay);
      setDailyGachaTimer(() => dailyGachaModal.classList.add('is-closeup'), revealProfile.closeupDelay);
      setDailyGachaTimer(() => {
        dailyGachaModal.classList.add('is-opened');
        playDailyGachaSfx('capsuleOpen');
        playDailyGachaSfx('sparkle');
        // v1910: reveal 瞬間の触覚 + 粒子。 rare/super のみ particle 発火。
        fireDailyGachaCapsuleHaptic();
        spawnGachaParticles(resultRarity);
      }, revealProfile.openDelay);
      // v1910: badge pop アニメ (CSS delay 420ms) と同期する rare/super 用触覚。
      setDailyGachaTimer(
        () => fireDailyGachaBadgeHaptic(resultRarity),
        (revealProfile.openDelay || 0) + 420
      );
      setDailyGachaTimer(() => {
        if (dailyGachaBook) dailyGachaBook.hidden = false;
        updateDailyGachaEntry();
      }, revealProfile.actionsDelay);
    }

    function showDailyGachaUsed(record) {
      if (!dailyGachaModal) return;
      dailyGachaModal.classList.add('is-used');
      if (dailyGachaStatus) {
        const name = record && record.stickerName ? `「${record.stickerName}」` : 'シール';
        setDailyGachaPrompt(`きょうは ${name}を ゲットしたよ\n${DAILY_GACHA_TOMORROW_PROMPT}`);
      }
      dailyGachaState.step = DAILY_GACHA_TURNS;
      dailyGachaState.settledRotation = DAILY_GACHA_TURNS * DAILY_GACHA_TURN_ROTATION;
      setDailyGachaStep(DAILY_GACHA_TURNS);
      setDailyGachaLeverRotation(dailyGachaState.settledRotation);
      if (dailyGachaAssist) {
        dailyGachaAssist.hidden = true;
        dailyGachaAssist.disabled = true;
      }
      if (dailyGachaLever) dailyGachaLever.disabled = true;
      if (dailyGachaBook) dailyGachaBook.hidden = false;
    }

    function armDailyGachaModal(interactive = true) {
      if (!dailyGachaModal) return;
      primeDailyGachaAudio();
      dailyGachaModal.hidden = false;
      setDailyGachaHandState('open');
      if (interactive) dailyGachaModal.classList.add('is-armed');
      pauseTopBgmForDailyGacha();
      startDailyGachaBed();
      if (interactive) {
        setTimeout(() => {
          try { dailyGachaLever && dailyGachaLever.focus({ preventScroll: true }); } catch (_) {}
        }, 80);
      }
    }

    function openDailyGacha() {
      if (!dailyGachaEnabled || !dailyGachaModal) return;
      startDailyGachaImagePreload();
      // Debug board 集約: ポノガチャの回数制限 bypass は機能トグル ON の時だけ有効。
      var __debugBypass = !!(window.PonoDebugMode
        && typeof window.PonoDebugMode.isFeatureEnabled === 'function'
        && window.PonoDebugMode.isFeatureEnabled('daily-gacha-unlimited'));
      // v1719: 1 日 2 回仕様。 状態は count (0/1/2) で判定。
      //   count===0: フリー pull (チャレンジ不要、 毎日 1 回保証)
      //   count===1 && !cleared: ロック (チャレンジクリアで解放)
      //   count===1 &&  cleared: 2 回目 pull (bonus 演出)
      //   count>=2: 引き済 (used)
      var count = __debugBypass ? 0 : getDailyGachaCount();
      var questCleared = !!(window.PonoDailyQuest && window.PonoDailyQuest.isClearedToday());
      if (count >= 2) {
        resetDailyGachaModal();
        armDailyGachaModal(false);
        showDailyGachaCenterMsg('used');
        // v1577 M2: disabled 属性は pointer event を dispatch しないので使わず、
        // data-blocked + listener 内ガード + tap 時 feedback で sub-silent化を回避
        if (dailyGachaLever) { dailyGachaLever.disabled = false; dailyGachaLever.dataset.blocked = '1'; }
        showDailyGachaAssistHint('used');
        dailyGachaModal.removeAttribute('data-quest-bonus');
        return;
      }
      if (count === 1 && !questCleared) {
        // フリー 1 回目を消化済み、 チャレンジ未達 → 2 回目はロック
        resetDailyGachaModal();
        armDailyGachaModal(false);
        showDailyGachaCenterMsg('locked');
        if (dailyGachaLever) { dailyGachaLever.disabled = false; dailyGachaLever.dataset.blocked = '1'; }
        showDailyGachaAssistHint('locked');
        dailyGachaModal.removeAttribute('data-quest-bonus');
        return;
      }
      // フリー (count===0) または チャレンジ達成済 (count===1 && cleared) → 通常 pull
      hideDailyGachaCenterMsg();
      // v1719: bonus FX 判定。 2 回目 (count===1 && cleared) は必ず bonus 演出に。
      var isBonus = false;
      if (count === 1 && questCleared) {
        isBonus = true;
      } else if (window.PonoDailyQuest && typeof window.PonoDailyQuest.isBonusActive === 'function') {
        try { isBonus = !!window.PonoDailyQuest.isBonusActive(); } catch (_) {}
      }
      if (isBonus) {
        dailyGachaModal.setAttribute('data-quest-bonus', '1');
        try { window.PonoDailyQuest && window.PonoDailyQuest.markBonusUsed && window.PonoDailyQuest.markBonusUsed(); } catch (_) {}
      } else {
        dailyGachaModal.removeAttribute('data-quest-bonus');
      }
      // data-blocked / disabled を念のため解除 (再 open 時の引き継ぎ防止)
      if (dailyGachaLever) {
        dailyGachaLever.disabled = false;
        delete dailyGachaLever.dataset.blocked;
      }
      resetDailyGachaModal();
      armDailyGachaModal();
    }

    function showDailyGachaCenterMsg(mode) {
      var el = document.getElementById('dailyGachaCenterMsg');
      if (!el) return;
      var text = '';
      var emoji = '';
      if (mode === 'locked') {
        // v1719: 「フリー 1 + チャレンジ報酬 1 = 1 日 2 回」 仕様化に伴い文言調整。
        // 「もう1かい まわせるよ」 で 1 回目は無料、 2 回目はチャレンジ達成のご褒美 という UX を明示。
        text = 'チャレンジを クリアすると\nもう1かい まわせるよ';
      } else if (mode === 'used') {
        text = 'きょうは もう ひいたよ\nまた あしたね';
        emoji = '🌙'; // v1577 M2: 「またあした」 の意味を 1 文字で伝える
      }
      if (!text) {
        el.hidden = true;
        el.textContent = '';
        el.removeAttribute('data-msg-mode');
        return;
      }
      el.setAttribute('data-msg-mode', mode);
      el.textContent = '';
      if (emoji) {
        var eEm = document.createElement('span');
        eEm.className = 'daily-gacha-center-msg__emoji';
        eEm.setAttribute('aria-hidden', 'true');
        eEm.textContent = emoji;
        el.appendChild(eEm);
      }
      var eTx = document.createElement('span');
      eTx.className = 'daily-gacha-center-msg__text';
      eTx.textContent = text;
      el.appendChild(eTx);
      if (mode === 'locked') {
        var action = document.createElement('button');
        action.className = 'daily-gacha-center-msg__action';
        action.type = 'button';
        action.textContent = 'チャレンジへ';
        action.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          _dailyQuestBannerActivate();
        });
        el.appendChild(action);
      }
      el.hidden = false;
    }
    function hideDailyGachaCenterMsg() {
      var el = document.getElementById('dailyGachaCenterMsg');
      if (el) { el.hidden = true; el.textContent = ''; el.removeAttribute('data-msg-mode'); el.classList.remove('is-blocked-pulse'); }
    }

    // v1577 M2: 鍵なし / 引き済み 時のアシスト hint。
    // 既存 dailyGachaAssist DOM を再利用し、 data-mode="hint" で tap 無効 + 文言差替。
    // 注: 「ショップで かぎを かおう」 は誤り (鍵はお題ゲームをクリアしてゲット)。 採用しない。
    function showDailyGachaAssistHint(mode) {
      if (!dailyGachaAssist) return;
      var text = '';
      // v1687: locked モードの assist hint は前面 #dailyGachaCenterMsg と文言が重複していたため削除。
      // used モードのみ独立 hint として残す ('🌅 あした また あえるよ！')。
      if (mode === 'used') {
        text = '🌅 あした また あえるよ！';
      }
      if (!text) {
        dailyGachaAssist.hidden = true;
        dailyGachaAssist.disabled = true;
        dailyGachaAssist.removeAttribute('data-mode');
        return;
      }
      dailyGachaAssist.textContent = text;
      dailyGachaAssist.setAttribute('data-mode', 'hint');
      dailyGachaAssist.hidden = false;
      dailyGachaAssist.disabled = true; // visual only (CSS pointer-events:none も併用)
    }

    // v1577 M2: blocked lever tap 時の触覚 + 視覚 feedback。
    // lever shake + center msg pulse + vibration (任意)。
    function triggerDailyGachaBlockedFeedback() {
      if (dailyGachaLever) {
        dailyGachaLever.classList.remove('is-blocked-bump');
        // reflow を強制して同 frame 内連打でも再生
        void dailyGachaLever.offsetWidth;
        dailyGachaLever.classList.add('is-blocked-bump');
        setTimeout(function () {
          if (dailyGachaLever) dailyGachaLever.classList.remove('is-blocked-bump');
        }, 420);
      }
      var msg = document.getElementById('dailyGachaCenterMsg');
      if (msg && !msg.hidden) {
        msg.classList.remove('is-blocked-pulse');
        void msg.offsetWidth;
        msg.classList.add('is-blocked-pulse');
        setTimeout(function () {
          if (msg) msg.classList.remove('is-blocked-pulse');
        }, 480);
      }
      try { if (navigator.vibrate) navigator.vibrate(30); } catch (_) {}
    }

    function closeDailyGacha() {
      if (!dailyGachaModal) return;
      clearDailyGachaTimers();
      stopDailyGachaBed();
      stopDailyGachaOneShotAudio();
      dailyGachaModal.hidden = true;
      resetDailyGachaModal();
      hideDailyGachaCenterMsg();
      updateDailyGachaEntry();
      try { renderDailyQuestInfoBanner(); } catch (_) {}
      resumeTopBgmAfterDailyGacha();
    }

    function goDailyGachaStickerBook() {
      location.href = THREE_STICKER_BOOK_URL;
    }

    function goDailyGachaHome() {
      closeDailyGacha();
    }

    const DAILY_QUEST_TITLE_LABELS = {
      maze: 'ポノとランタンのめいろ',
      quizland: 'フクロウはかせのなぞなぞ',
      oto: 'ポノのおとタッチ',
      puzzle: 'ポノのなかよしパズル',
      bento: 'ポノとつくろう いろどりべんとう'
    };

    function getDailyQuestTitleLabel(q) {
      if (!q) return 'おだい';
      return DAILY_QUEST_TITLE_LABELS[q.questId] || q.label || 'おだい';
    }

    function fitDailyQuestInfoBody() {
      var bodyEl = document.getElementById('dailyQuestInfoBody');
      var banner = document.getElementById('dailyQuestInfo');
      if (!bodyEl || !banner || banner.hidden) return;
      banner.setAttribute('data-title-lines', '1');
      bodyEl.style.setProperty('--daily-quest-body-scale', '1');
      window.requestAnimationFrame(function () {
        if (!bodyEl || !banner || banner.hidden) return;
        if (banner.getAttribute('data-state') === 'pending' && banner.getAttribute('data-quest-id') === 'bento') {
          banner.setAttribute('data-title-lines', '2');
          bodyEl.style.setProperty('--daily-quest-body-scale', '1');
          return;
        }
        var available = bodyEl.clientWidth || 1;
        var needed = bodyEl.scrollWidth || available;
        var scale = needed > available ? available / needed : 1;
        if (scale < 0.9) {
          banner.setAttribute('data-title-lines', '2');
          bodyEl.style.setProperty('--daily-quest-body-scale', '1');
          return;
        }
        banner.setAttribute('data-title-lines', '1');
        scale = needed > available ? Math.max(0.9, scale) : 1;
        bodyEl.style.setProperty('--daily-quest-body-scale', String(Math.round(scale * 1000) / 1000));
      });
    }

    // ===== お題 + ショップ phase 4→v1575 (バナー + 中央メッセージ + 常時ショップ) =====
    // チャレンジ情報バナー描画 (ガチャエントリの真上、 ボタン増設ではなく純情報)
    function renderDailyQuestInfoBanner() {
      var banner = document.getElementById('dailyQuestInfo');
      var titleEl = document.getElementById('dailyQuestInfoTitle');
      var bodyEl  = document.getElementById('dailyQuestInfoBody');
      var iconEl  = document.getElementById('dailyQuestInfoIcon');
      if (!banner || !titleEl || !bodyEl) return;
      if (!window.PonoDailyQuest) { banner.hidden = true; return; }
      var q;
      try { q = window.PonoDailyQuest.getToday(); } catch (_) { banner.hidden = true; return; }
      if (!q) { banner.hidden = true; return; }
      var questCardId = {
        maze: 'maze',
        quizland: 'quizland',
        puzzle: 'puzzle',
        oto: 'oto',
        bento: 'bento'
      }[q.questId] || 'maze';
      banner.setAttribute('data-quest-id', questCardId);
      if (iconEl) iconEl.textContent = '';
      if (q.bonusUsedAt) {
        // 達成済 + ボーナス消費後: クリア表示
        banner.hidden = false;
        banner.setAttribute('data-state', 'cleared');
        titleEl.textContent = 'きょうの チャレンジ';
        bodyEl.textContent = 'クリア！';
      } else if (q.clearedAt) {
        // 達成済 + ボーナス未消費
        banner.hidden = false;
        banner.setAttribute('data-state', 'done');
        titleEl.textContent = 'やったね！';
        bodyEl.textContent = 'ガチャに ボーナス！';
      } else {
        // 未達成
        banner.hidden = false;
        banner.setAttribute('data-state', 'pending');
        titleEl.textContent = 'きょうの チャレンジ';
        bodyEl.innerHTML = decorateGameTitle(questCardId, getDailyQuestTitleLabel(q));
      }
      banner.setAttribute('aria-label', titleEl.textContent + ' ' + bodyEl.textContent);
      fitDailyQuestInfoBody();
    }
    function _dailyQuestBannerActivate() {
      if (!window.PonoDailyQuest) return;
      var q;
      try { q = window.PonoDailyQuest.getToday(); } catch (_) { return; }
      if (q && q.href && !q.clearedAt) {
        location.href = q.href;
      }
    }
    function showShop() {
      var shop = document.getElementById('donguriShop');
      if (!shop) return;
      // v1699: shop 専用 BGM (sticker-album-morning.mp3) を導入。 play-bgm を pause + shop-bgm を start。
      //        v1698 でコメントアウトしていた pauseTopBgmForDonguriShop() を復活、
      //        さらに startDonguriShopBgm() を新規追加。 ヘルパー定義は L7090-7160 付近。
      // v1698: daily-gacha → shop 遷移で bed_loop が漏れていた場合に備えて確実に止める
      //        (これが v1693 で観測された「二重再生」 の真因)。
      try { if (typeof stopDailyGachaBed === 'function') stopDailyGachaBed(); } catch (_) {}
      pauseTopBgmForDonguriShop();
      startDonguriShopBgm();
      shop.hidden = false;
      // v1591: shop 表示中はメイン残高バッジを hide (shop 内に balance pill があり重複 + 隅で見切れる)
      var badge = document.getElementById('acornBalanceBadge');
      if (badge) badge.classList.add('is-occluded');
      var forceFirstGuide = _isShopDebugNarrationForced();
      var isFirstVisit = !_hasSeenShopIntro();
      if (isFirstVisit) {
        _markShopIntroSeen();
      }
      // 音声 narration はリス声でないため停止 (旧 v1689)。 字幕 bubble は表示する (v1696)。
      // 将来チュートリアル (本物のリス声) を入れる時に下の行を再度有効化する。
      // _startShopOpeningGuide((forceFirstGuide || isFirstVisit) ? 'first' : 'return', { forceAudio: forceFirstGuide });
      renderShopCatalog(DONGURI_SHOP_OPENING_MESSAGE, { duration: (forceFirstGuide || isFirstVisit) ? 5200 : 3800 });
    }
    function hideShop() {
      var shop = document.getElementById('donguriShop');
      if (shop) shop.hidden = true;
      _stopShopNarration();
      _clearShopkeeperNeutralTimer();
      _setShopSubtitle('');
      // v1699: shop 専用 BGM を停止して play-bgm を復帰。 順序固定 (stop shop → resume top)。
      stopDonguriShopBgm();
      resumeTopBgmAfterDonguriShop();
      // v1591: shop を閉じたらメイン残高バッジを復帰
      var badge = document.getElementById('acornBalanceBadge');
      if (badge) badge.classList.remove('is-occluded');
    }
    var DONGURI_SHOP_INTRO_SEEN_KEY = 'pono_donguri_shop_intro_seen_v1';
    var DONGURI_SHOP_OPENING_MESSAGE = 'いらっしゃい\nきょうは なににする？';
    var DONGURI_SHOP_FIRST_SUBTITLE = 'どんぐりで シールと こうかんできるよ';
    var DONGURI_SHOP_RETURN_SUBTITLE = 'きょうは なににする？';
    var DONGURI_SHOP_NARRATION = {
      first: {
        src: 'assets/audio/shop/donguri_shop_welcome_first_20260627.mp3',
        volume: .94,
        captionDuration: 8800,
        captions: [
          { at: 0, text: 'いらっしゃい' },
          { at: 2200, text: DONGURI_SHOP_RETURN_SUBTITLE },
          { at: 4900, text: 'どんぐりで シールと\nこうかんできるよ' }
        ]
      },
      return: {
        src: 'assets/audio/shop/donguri_shop_welcome_return_20260627.mp3',
        volume: .94,
        captionDuration: 4200,
        captions: [
          { at: 0, text: 'いらっしゃい' },
          { at: 1900, text: DONGURI_SHOP_RETURN_SUBTITLE }
        ]
      }
    };
    var donguriShopSubtitleTimer = 0;
    var donguriShopSubtitleSequenceTimers = [];
    var donguriShopNarrationAudio = {};
    var donguriShopNarrationPreloadStarted = false;
    var donguriShopCurrentNarration = null;
    function _hasSeenShopIntro() {
      try { return window.localStorage && window.localStorage.getItem(DONGURI_SHOP_INTRO_SEEN_KEY) === '1'; }
      catch (_) { return false; }
    }
    function _markShopIntroSeen() {
      try { if (window.localStorage) window.localStorage.setItem(DONGURI_SHOP_INTRO_SEEN_KEY, '1'); }
      catch (_) {}
    }
    function _isShopDebugNarrationForced() {
      try {
        return !!(window.PonoDebugMode
          && typeof window.PonoDebugMode.isFeatureEnabled === 'function'
          && window.PonoDebugMode.isFeatureEnabled('shop-force-guide'));
      } catch (_) { return false; }
    }
    function _clearShopSubtitleTimers() {
      if (donguriShopSubtitleTimer) {
        window.clearTimeout(donguriShopSubtitleTimer);
        donguriShopSubtitleTimer = 0;
      }
      if (donguriShopSubtitleSequenceTimers.length) {
        donguriShopSubtitleSequenceTimers.forEach(function (timerId) {
          window.clearTimeout(timerId);
        });
        donguriShopSubtitleSequenceTimers = [];
      }
    }
    function _showShopSubtitle(text) {
      var subtitle = document.getElementById('donguriShopSubtitle');
      if (!subtitle) return;
      subtitle.textContent = text || '';
      subtitle.hidden = !text;
    }
    function _setShopSubtitle(text, options) {
      options = options || {};
      _clearShopSubtitleTimers();
      _showShopSubtitle(text);
      if (text && options.duration) {
        donguriShopSubtitleTimer = window.setTimeout(function () {
          _showShopSubtitle('');
          donguriShopSubtitleTimer = 0;
        }, options.duration);
      }
    }
    function _runShopSubtitleSequence(captions, duration) {
      _clearShopSubtitleTimers();
      (captions || []).forEach(function (caption) {
        var at = Math.max(0, Number(caption && caption.at) || 0);
        if (at <= 0) {
          _showShopSubtitle(caption.text || '');
        } else {
          donguriShopSubtitleSequenceTimers.push(window.setTimeout(function () {
            _showShopSubtitle(caption.text || '');
          }, at));
        }
      });
      if (duration) {
        donguriShopSubtitleTimer = window.setTimeout(function () {
          _showShopSubtitle('');
          donguriShopSubtitleTimer = 0;
        }, duration);
      }
    }
    function _shopNarrationMuted(options) {
      options = options || {};
      if (options.forceAudio) return false;
      try { return window.localStorage && window.localStorage.getItem('pono_sound_off') === '1'; }
      catch (_) { return false; }
    }
    function _shopNarrationSrc(path) {
      return dailyGachaVersionedAsset(path);
    }
    function _ensureShopNarrationAudio(kind) {
      var config = DONGURI_SHOP_NARRATION[kind];
      if (!config || typeof Audio !== 'function') return null;
      if (!donguriShopNarrationAudio[kind]) {
        var audio = new Audio(_shopNarrationSrc(config.src));
        audio.preload = 'auto';
        audio.loop = false;  // v1693: 明示的に loop 禁止 (将来 narration 復活時に重複再生回避)
        audio.volume = config.volume == null ? .94 : config.volume;
        donguriShopNarrationAudio[kind] = audio;
      }
      return donguriShopNarrationAudio[kind];
    }
    function _primeShopNarrationAudio() {
      if (donguriShopNarrationPreloadStarted) return;
      donguriShopNarrationPreloadStarted = true;
      Object.keys(DONGURI_SHOP_NARRATION).forEach(function (kind) {
        var audio = _ensureShopNarrationAudio(kind);
        try { if (audio) audio.load(); } catch (_) {}
      });
    }
    function _scheduleShopNarrationPreload() {
      if (donguriShopNarrationPreloadStarted) return;
      var run = function () { _primeShopNarrationAudio(); };
      window.setTimeout(run, 900);
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 1600 });
      }
    }
    function _stopShopNarrationAudio() {
      Object.keys(donguriShopNarrationAudio).forEach(function (kind) {
        var audio = donguriShopNarrationAudio[kind];
        if (!audio) return;
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (_) {}
      });
      donguriShopCurrentNarration = null;
    }
    function _stopShopNarration() {
      _stopShopNarrationAudio();
      _clearShopSubtitleTimers();
    }
    function _playShopNarration(kind, options) {
      options = options || {};
      if (_shopNarrationMuted(options)) return false;
      var config = DONGURI_SHOP_NARRATION[kind];
      var audio = _ensureShopNarrationAudio(kind);
      if (!config || !audio) return false;
      _stopShopNarrationAudio();
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = config.volume == null ? .94 : config.volume;
        audio.playbackRate = 1;
        donguriShopCurrentNarration = kind;
        var played = audio.play();
        if (played && played.catch) {
          played.catch(function () {
            if (donguriShopCurrentNarration === kind) donguriShopCurrentNarration = null;
          });
        }
        return true;
      } catch (_) {
        donguriShopCurrentNarration = null;
        return false;
      }
    }
    function _startShopOpeningGuide(kind, options) {
      options = options || {};
      var config = DONGURI_SHOP_NARRATION[kind] || DONGURI_SHOP_NARRATION.return;
      _stopShopNarration();
      _runShopSubtitleSequence(config.captions, config.captionDuration);
      _playShopNarration(kind, options);
    }
    // v1623: shop rotation is twice daily (morning/evening), so countdown copy uses those anchors.
    function _formatShopCountdown() {
      try {
        if (!window.PonoDonguriShop || typeof window.PonoDonguriShop.getSlotTimeUntilNext !== 'function') {
          return 'もうすぐ かわるよ';
        }
        var info = window.PonoDonguriShop.getSlotTimeUntilNext();
        var hrs = info && typeof info.hoursRemaining === 'number' ? info.hoursRemaining : 0;
        if (hrs < 1) return 'もうすぐ かわるよ';
        var nextSlotJST = info && info.nextSlotJST;
        if (!nextSlotJST || typeof nextSlotJST.getUTCHours !== 'function') return 'もうすぐ かわるよ';
        // nextSlotJST は js/donguri-shop.js が UTC fields に JST 時刻を埋めた Date
        var jstHour = nextSlotJST.getUTCHours();
        var phrases = {
          6: 'あさごはんの あと',
          18: 'ばんごはんの あと'
        };
        return (phrases[jstHour] || 'もうすぐ') + ' かわるよ';
      } catch (_) { return 'もうすぐ かわるよ'; }
    }
    var DONGURI_SHOPKEEPER_POSES = {
      idle: 'assets/ui/shop/sticker_shopkeeper_squirrel_pose_idle_highlight_20260626.png',
      wave: 'assets/ui/shop/sticker_shopkeeper_squirrel_pose_wave_highlight_20260626.png',
      present: 'assets/ui/shop/sticker_shopkeeper_squirrel_pose_present_highlight_20260626.png',
      point: 'assets/ui/shop/sticker_shopkeeper_squirrel_pose_point_highlight_20260626.png',
      cheer: 'assets/ui/shop/sticker_shopkeeper_squirrel_pose_cheer_highlight_20260626.png',
      think: 'assets/ui/shop/sticker_shopkeeper_squirrel_pose_think_highlight_20260626.png',
      sad: 'assets/ui/shop/sticker_shopkeeper_squirrel_pose_sad_highlight_20260626.png',
      surprise: 'assets/ui/shop/sticker_shopkeeper_squirrel_pose_surprise_highlight_20260626.png'
    };
    // v1692: text フィールドは全削除 (v1689 の reactive bubble 残滓を根絶)。
    // pose / motion のみ残し、 bubble 表示は messageText 明示時に限定 (_setShopkeeperReaction 参照)。
    var DONGURI_SHOPKEEPER_REACTIONS = {
      welcome: { pose: 'idle', motion: 'calm' },
      guide: { pose: 'present', motion: 'guide' },
      reserve: { pose: 'point', motion: 'reserve' },
      happy: { pose: 'cheer', motion: 'happy' },
      worry: { pose: 'sad', motion: 'worry' },
      think: { pose: 'think', motion: 'worry' },
      full: { pose: 'surprise', motion: 'worry' },
      calm: { pose: 'idle', motion: 'calm' }
    };
    var DONGURI_SHOPKEEPER_NEUTRAL_REACTION = 'calm';
    // v1692: text 初期値を空文字化 (bubble は :empty で隠蔽、 ナレーション字幕時のみ表示)。
    var donguriShopkeeperNeutral = { reaction: 'calm', text: '' };
    var donguriShopkeeperNeutralTimer = 0;
    function _shopReactionForMessage(messageText) {
      var text = String(messageText || '');
      if (/1つまで/.test(text)) return 'full';
      if (/たりない|できない/.test(text)) return 'worry';
      if (/あつめよう/.test(text)) return 'think';
      if (/とって|とりおき/.test(text)) return 'reserve';
      if (/こうかん|なかよし|ありがとう/.test(text)) return 'happy';
      if (/ならべ|みて/.test(text)) return 'guide';
      return 'welcome';
    }
    function _clearShopkeeperNeutralTimer() {
      if (donguriShopkeeperNeutralTimer) {
        window.clearTimeout(donguriShopkeeperNeutralTimer);
        donguriShopkeeperNeutralTimer = 0;
      }
    }
    function _rememberShopkeeperNeutral(reactionKey, text) {
      // v1692: reaction map から text 削除。 fallback は明示渡し text のみ、 なければ空文字 (bubble は :empty で隠れる)。
      donguriShopkeeperNeutral = {
        reaction: DONGURI_SHOPKEEPER_NEUTRAL_REACTION,
        text: text || ''
      };
    }
    function _restoreShopkeeperNeutral() {
      var shop = document.getElementById('donguriShop');
      if (!shop || shop.hidden) return;
      _setShopkeeperReaction(donguriShopkeeperNeutral.reaction, donguriShopkeeperNeutral.text, { sticky: true, skipRemember: true });
    }
    function _setShopkeeperReaction(reactionKey, messageText, options) {
      options = options || {};
      var key = reactionKey || _shopReactionForMessage(messageText);
      var data = DONGURI_SHOPKEEPER_REACTIONS[key] || DONGURI_SHOPKEEPER_REACTIONS.welcome;
      var keeper = document.querySelector('.donguri-shop-v2-shopkeeper');
      var img = document.getElementById('donguriShopkeeperImg');
      var bubble = document.getElementById('donguriShopBubble');
      var poseSrc = DONGURI_SHOPKEEPER_POSES[data.pose] || DONGURI_SHOPKEEPER_POSES.idle;
      _clearShopkeeperNeutralTimer();
      if (img && img.getAttribute('src') !== poseSrc) img.setAttribute('src', poseSrc);
      // bubble は messageText > data.text > countdown の優先順で常に何かを表示 (v1696 復活)
      if (bubble) bubble.textContent = messageText || data.text || _formatShopCountdown();
      if (!options.transient && !options.skipRemember) {
        // v1692: data.text 廃止、 messageText のみで neutral を記憶 (なければ空文字)。
        _rememberShopkeeperNeutral(key, messageText || '');
      }
      if (keeper) {
        keeper.dataset.pose = data.pose;
        keeper.dataset.reaction = data.motion || key;
        keeper.classList.remove('is-reacting');
        if ((data.motion || key) !== 'calm') {
          void keeper.offsetWidth;
          keeper.classList.add('is-reacting');
        }
      }
      if (options.transient) {
        donguriShopkeeperNeutralTimer = window.setTimeout(_restoreShopkeeperNeutral, options.duration || 2400);
      }
    }
    function _shopDefaultReaction(balance, stickerIds, reservation) {
      var hasHoldable = false;
      try {
        (stickerIds || []).forEach(function (sid) {
          if (hasHoldable || !window.PonoDonguriShop) return;
          var ownState = window.PonoDonguriShop.getOwnershipState ? (window.PonoDonguriShop.getOwnershipState(sid) || {}) : {};
          var isGuaranteed = window.PonoDonguriShop.isGuaranteed
            ? !!window.PonoDonguriShop.isGuaranteed(sid)
            : !!window.PonoDonguriShop.isNew(sid);
          var canReserve = window.PonoDonguriShop.canReserve ? !!window.PonoDonguriShop.canReserve(sid) : false;
          hasHoldable = !ownState.owned && isGuaranteed && canReserve;
        });
      } catch (_) { hasHoldable = false; }
      // v1692: text 全削除 — bubble はナレーション字幕時のみ表示 (CSS :empty で隠蔽)。
      if (hasHoldable) return { reaction: 'calm' };
      if (reservation && reservation.stickerId) return { reaction: 'calm' };
      if ((balance | 0) < 15) return { reaction: 'calm' };
      return { reaction: 'calm' };
    }
    // v1582: load full catalog so stickerIndex (gameId/name/img) is hydrated for rotation rendering.
    function _hydrateShopCatalog() {
      if (!window.PonoDonguriShop || typeof window.PonoDonguriShop.getCatalog !== 'function') {
        return Promise.resolve([]);
      }
      return Promise.resolve(window.PonoDonguriShop.getCatalog()).catch(function () { return []; });
    }
    // v1582: resolve sticker img urls via PonoGameStickers catalog.
    function _resolveRotationStickerImages(stickerIds) {
      var out = {};
      var api = window.PonoGameStickers;
      if (!api || typeof api.loadCatalog !== 'function' || typeof api.resolveAsset !== 'function') {
        return Promise.resolve(out);
      }
      return Promise.resolve(api.loadCatalog()).then(function (raw) {
        try {
          var pages = (raw && raw.pages) || {};
          var ids = {};
          stickerIds.forEach(function (sid) { ids[sid] = true; });
          Object.keys(pages).forEach(function (gid) {
            var page = pages[gid] || {};
            var list = page.stickers || [];
            list.forEach(function (s) {
              if (s && s.id && ids[s.id] && s.img) {
                try { out[s.id] = { gameId: gid, name: s.name || s.id, rarity: s.rarity || 'normal', url: api.resolveAsset(s.img) }; } catch (_) {}
              }
            });
          });
        } catch (_) {}
        return out;
      }, function () { return out; });
    }
    function _shopDisplayStickerIds(rotation, reservation) {
      var stickerIds = (rotation && rotation.stickerIds) ? rotation.stickerIds.slice() : [];
      return stickerIds;
    }
    function _shopStickerPrice(stickerId) {
      var n = 15;
      try {
        if (window.PonoDonguriShop && typeof window.PonoDonguriShop.getPrice === 'function') {
          n = window.PonoDonguriShop.getPrice(stickerId) | 0;
        }
      } catch (_) { n = 15; }
      return n > 0 ? n : 15;
    }
    function _renderShopReservationPanel(reserveEl, reservation, imgIndex) {
      if (!reserveEl) return;
      reserveEl.innerHTML = '';
      reserveEl.className = 'donguri-shop-v2-reserve' + (!reservation || !reservation.stickerId ? ' is-empty' : '');

      var title = document.createElement('div');
      title.className = 'donguri-shop-v2-reserve-title';
      title.textContent = 'とりおき';
      reserveEl.appendChild(title);

      if (!reservation || !reservation.stickerId) {
        var empty = document.createElement('div');
        empty.className = 'donguri-shop-v2-reserve-empty';
        empty.textContent = 'なし';
        reserveEl.appendChild(empty);
        return;
      }

      var sid = reservation.stickerId;
      var info = imgIndex[sid] || { gameId: '', name: sid, url: null };
      var price = _shopStickerPrice(sid);
      var canBuy = false;
      try { canBuy = !!(window.PonoDonguriShop && window.PonoDonguriShop.canPurchase && window.PonoDonguriShop.canPurchase(sid)); } catch (_) {}

      var thumb = document.createElement('div');
      thumb.className = 'donguri-shop-v2-reserve-thumb';
      if (info.url) {
        var img = document.createElement('img');
        img.src = info.url;
        img.alt = '';
        img.draggable = false;
        thumb.appendChild(img);
      } else {
        var fallback = document.createElement('span');
        fallback.className = 'donguri-shop-v2-reserve-thumb-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = '★';
        thumb.appendChild(fallback);
      }
      reserveEl.appendChild(thumb);

      var body = document.createElement('div');
      body.className = 'donguri-shop-v2-reserve-body';

      var name = document.createElement('div');
      name.className = 'donguri-shop-v2-reserve-name';
      name.textContent = info.name || sid;
      body.appendChild(name);

      var priceEl = document.createElement('div');
      priceEl.className = 'donguri-shop-v2-reserve-price';
      priceEl.textContent = String(price);
      body.appendChild(priceEl);

      var actions = document.createElement('div');
      actions.className = 'donguri-shop-v2-reserve-actions';

      var buy = document.createElement('button');
      buy.type = 'button';
      buy.textContent = canBuy ? 'こうかん' : 'ためる';
      buy.disabled = !canBuy;
      buy.setAttribute('aria-label', 'とりおきのシールを こうかんする');
      buy.addEventListener('click', function () {
        if (buy.disabled || !window.PonoDonguriShop) return;
        buy.disabled = true;
        Promise.resolve(window.PonoDonguriShop.purchase(sid)).then(function (r) {
          if (r && r.success) {
            // v1891→v1895: 購入 SE (rarity 別) + shop-bgm 継続保証。 GuardedAudio の inactive
            //  状態を先に解除してから発火。 showStickerToast の SFX は suppressImpactSfx で抑制。
            try { _clearAudioInactiveGuard(); } catch (_) {}
            try { playDonguriShopPurchaseSfx(sid); } catch (_) {}
            try { ensureShopBgmPlaying(); } catch (_) {}
            if (window.PonoGameStickers && typeof window.PonoGameStickers.showStickerToast === 'function' && r.stickerResult) {
              try { window.PonoGameStickers.showStickerToast(r.stickerResult, { immediate: true, suppressImpactSfx: true, source: 'shop' }); } catch (_) {}
            }
          }
          renderShopCatalog(r && r.success ? 'こうかんしたよ' : undefined);
        });
      });
      actions.appendChild(buy);

      var clear = document.createElement('button');
      clear.type = 'button';
      clear.textContent = 'やめる';
      clear.setAttribute('aria-label', 'とりおきを やめる');
      clear.addEventListener('click', function () {
        try { window.PonoDonguriShop.clearReservation(sid); } catch (_) {}
        renderShopCatalog('また ならべるよ');
      });
      actions.appendChild(clear);

      body.appendChild(actions);
      reserveEl.appendChild(body);
    }
    function renderShopCatalog(messageText, options) {
      options = options || {};
      var slotsEl    = document.getElementById('donguriShopSlots');
      var balEl      = document.getElementById('donguriShopBalance');
      var bubbleEl   = document.getElementById('donguriShopBubble');
      var reserveEl  = document.getElementById('donguriShopReserve');
      // v1595: countEl (#donguriShopCountdown) 削除 — countdown text は bubbleEl 1 箇所に集約
      if (!slotsEl) return;
      var balance = (typeof window.getAcorns === 'function') ? (window.getAcorns() | 0) : 0;
      if (balEl) balEl.textContent = String(balance);
      // countdown text を bubble に表示 (音声 narration は別系統)
      var countdownText = messageText || _formatShopCountdown();
      if (messageText) _setShopkeeperReaction(null, messageText, { transient: true, duration: options.duration || 2400 });
      else if (bubbleEl) bubbleEl.textContent = countdownText;
      if (!window.PonoDonguriShop) {
        slotsEl.innerHTML = '<div class="donguri-shop-v2-slot"><div class="donguri-shop-v2-thumb"><span class="donguri-shop-v2-thumb-fallback">…</span></div></div>';
        _renderShopReservationPanel(reserveEl, null, {});
        if (!messageText) _setShopkeeperReaction('calm', countdownText, { sticky: true });
        return;
      }
      // Phase 1: hydrate full catalog to populate internal stickerIndex; then read rotation; then resolve images.
      _hydrateShopCatalog().then(function () {
        var rotation;
        var reservation = null;
        try { rotation = window.PonoDonguriShop.getRotation(); } catch (_) { rotation = { stickerIds: [], prevStickerIds: [], guaranteedStickerId: '' }; }
        try {
          if (typeof window.PonoDonguriShop.getReservation === 'function') {
            reservation = window.PonoDonguriShop.getReservation();
          }
        } catch (_) { reservation = null; }
        var stickerIds = _shopDisplayStickerIds(rotation, reservation);
          var defaultReaction = _shopDefaultReaction(balance, stickerIds, reservation);
          if (!messageText) {
            _setShopkeeperReaction(defaultReaction.reaction, defaultReaction.text, { sticky: true });
          } else {
            _rememberShopkeeperNeutral(defaultReaction.reaction, defaultReaction.text);
          }
        var resolveIds = stickerIds.slice();
        if (reservation && reservation.stickerId && resolveIds.indexOf(reservation.stickerId) < 0) {
          resolveIds.push(reservation.stickerId);
        }
        return _resolveRotationStickerImages(resolveIds).then(function (imgIndex) {
          _renderShopReservationPanel(reserveEl, reservation, imgIndex);
          slotsEl.innerHTML = '';
          if (!stickerIds.length) {
            var empty = document.createElement('div');
            empty.className = 'donguri-shop-v2-slot';
            empty.innerHTML = '<div class="donguri-shop-v2-thumb"><span class="donguri-shop-v2-thumb-fallback">…</span></div><div class="donguri-shop-v2-price">よみこみちゅう</div>';
            slotsEl.appendChild(empty);
            return;
          }
          stickerIds.forEach(function (sid) {
            var info = imgIndex[sid] || { gameId: '', name: sid, url: null };
            var price = _shopStickerPrice(sid);
            var ownState = { owned: false, count: 0 };
            try { ownState = window.PonoDonguriShop.getOwnershipState(sid) || ownState; } catch (_) {}
            var isGuaranteed = false;
            var isHeld = !!(reservation && reservation.stickerId === sid);
            try {
              if (typeof window.PonoDonguriShop.isGuaranteed === 'function') {
                isGuaranteed = !!window.PonoDonguriShop.isGuaranteed(sid);
              } else {
                isGuaranteed = !!window.PonoDonguriShop.isNew(sid);
              }
            } catch (_) {}
            var showsGuaranteed = isGuaranteed && !ownState.owned;
            // v1607: card frame background has normal / highlighted / muted variants.
            // canPurchase remains the source of truth for the buyable visual state.
            var canBuy = false;
            try { canBuy = !!window.PonoDonguriShop.canPurchase(sid); } catch (_) {}
            var slot = document.createElement('div');
            slot.className = 'donguri-shop-v2-slot'
              + (ownState.owned ? ' is-owned' : (canBuy ? ' is-buyable' : ' is-unavailable'))
              + (showsGuaranteed ? ' is-guaranteed' : '')
              + (isHeld ? ' is-held' : '');
            slot.setAttribute('role', 'listitem');
            slot.setAttribute('data-sticker-id', sid);
            slot.setAttribute('data-game-id', info.gameId || '');
            var badgeHtml = isHeld
              ? '<div class="donguri-shop-v2-badge donguri-shop-v2-badge--hold" aria-label="とりおき">とりおき</div>'
              : (showsGuaranteed ? '<div class="donguri-shop-v2-badge" aria-label="あたらしい">あたらしい！</div>' : '');
            var thumbInner = info.url
              ? '<img src="' + info.url + '" alt="" draggable="false" />'
              : '<span class="donguri-shop-v2-thumb-fallback" aria-hidden="true">🌟</span>';
            // v1588 NTH2: canPurchase を single source of truth として採用。
            // getOwnershipState は heart 演出判定のみに使う。
            var actionHtml;
            if (ownState.owned) {
              actionHtml = '<div class="donguri-shop-v2-owned-label" aria-label="こうかんしたよ">こうかんしたよ</div>';
            } else if (canBuy) {
              actionHtml = '<button class="donguri-shop-v2-buy" type="button" data-action="buy" aria-label="こうかんする"></button>';
            } else {
              // canPurchase=false かつ未所持 = balance不足 / rotation外。
              // v1607: generated card has a visible button plate, so keep the command label but disable it.
              actionHtml = '<button class="donguri-shop-v2-buy" type="button" data-action="buy" aria-label="こうかんする" disabled></button>';
            }
            var reserveHtml = '';
            if (!ownState.owned && (showsGuaranteed || isHeld)) {
              if (isHeld) {
                reserveHtml = '<button class="donguri-shop-v2-hold is-held" type="button" data-action="hold-clear" aria-label="とりおきを やめる">やめる</button>';
              } else {
                var canReserve = false;
                try {
                  canReserve = !!(window.PonoDonguriShop.canReserve && window.PonoDonguriShop.canReserve(sid));
                } catch (_) { canReserve = false; }
                reserveHtml = canReserve
                  ? '<button class="donguri-shop-v2-hold" type="button" data-action="hold" aria-label="とっておく">とっておく</button>'
                  : '';
              }
            }
            slot.innerHTML =
              badgeHtml +
              reserveHtml +
              '<div class="donguri-shop-v2-thumb">' + thumbInner + '</div>' +
              '<div class="donguri-shop-v2-price">' + price + '</div>' +
              actionHtml;
            var btn = slot.querySelector('[data-action="buy"]');
            if (btn) {
              var setBuyPressing = function (on) {
                if (btn.disabled) return;
                slot.classList.toggle('is-pressing', !!on);
              };
              btn.addEventListener('pointerdown', function () { setBuyPressing(true); });
              btn.addEventListener('pointerup', function () { setBuyPressing(false); });
              btn.addEventListener('pointercancel', function () { setBuyPressing(false); });
              btn.addEventListener('pointerleave', function () { setBuyPressing(false); });
              btn.addEventListener('blur', function () { setBuyPressing(false); });
              btn.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') setBuyPressing(true);
              });
              btn.addEventListener('keyup', function () { setBuyPressing(false); });
              btn.addEventListener('click', function () {
                setBuyPressing(false);
                btn.disabled = true;
                Promise.resolve(window.PonoDonguriShop.purchase(sid)).then(function (r) {
                  if (r && r.success) {
                    // v1891→v1895: 購入 SE (rarity 別) + shop-bgm 継続保証。 GuardedAudio inactive
                    //  を先に解除。 二重 SE は suppressImpactSfx で抑制。
                    try { _clearAudioInactiveGuard(); } catch (_) {}
                    try { playDonguriShopPurchaseSfx(sid); } catch (_) {}
                    try { ensureShopBgmPlaying(); } catch (_) {}
                    if (window.PonoGameStickers && typeof window.PonoGameStickers.showStickerToast === 'function' && r.stickerResult) {
                      try { window.PonoGameStickers.showStickerToast(r.stickerResult, { immediate: true, suppressImpactSfx: true, source: 'shop' }); } catch (_) {}
                    }
                  }
                  // either way: re-render so owned state / disabled flips correctly
                  renderShopCatalog(r && r.success ? 'こうかんしたよ' : undefined);
                });
              });
            }
            var holdBtn = slot.querySelector('[data-action="hold"]');
            if (holdBtn) {
              holdBtn.addEventListener('click', function () {
                var result = { success: false };
                try { result = window.PonoDonguriShop.reserve(sid) || result; } catch (_) {}
                renderShopCatalog(result.success ? 'とっておいたよ' : 'とりおきは 1つまで');
              });
            }
            var holdClearBtn = slot.querySelector('[data-action="hold-clear"]');
            if (holdClearBtn) {
              holdClearBtn.addEventListener('click', function () {
                try { window.PonoDonguriShop.clearReservation(sid); } catch (_) {}
                renderShopCatalog('また ならべるよ');
              });
            }
            slotsEl.appendChild(slot);
          });
        });
      });
    }

    // バナー + ショップ DOM listener wire (v1575: 誘導モーダル削除済)
    (function wireQuestAndShop() {
      var shopModal   = document.getElementById('donguriShop');
      var shopClose   = document.getElementById('donguriShopClose');
      var gachaShop   = document.getElementById('dailyGachaShopLink');
      var infoBanner  = document.getElementById('dailyQuestInfo');
      if (shopClose) shopClose.addEventListener('click', hideShop);
      if (shopModal) shopModal.addEventListener('click', function (e) {
        if (e.target === shopModal) hideShop();
      });
      // v1582: ESC to close shop overlay
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (shopModal && !shopModal.hidden) { e.preventDefault(); hideShop(); }
      });
      if (gachaShop) gachaShop.addEventListener('click', function () {
        // ガチャモーダルの 3 状態どこでも常時 active: モーダルを閉じずに overlay (z-index 99990 で勝つ)
        showShop();
      });
      if (infoBanner) {
        infoBanner.addEventListener('click', _dailyQuestBannerActivate);
      }
      // 初回描画 + 可視性復帰時に再描画
      try { renderDailyQuestInfoBanner(); } catch (_) {}
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          try { renderDailyQuestInfoBanner(); } catch (_) {}
        }
      });
      window.addEventListener('pageshow', function () {
        try { renderDailyQuestInfoBanner(); } catch (_) {}
      });
      window.addEventListener('resize', function () {
        try { fitDailyQuestInfoBody(); } catch (_) {}
      });
    })();

    // v1573 phase 6 must-fix #1: pending sticker queue を drain して daily-quest にフォワード
    // ゲーム pages (maze/quizland/...) は PonoGameStickerGranted を子 window で dispatch するため
    // play.html では subscribe できない。 game-stickers.js が LS persist している pending を
    // play.html に戻ってきた時に消化して markCleared を呼ぶ。
    (function drainPendingStickerGrants() {
      function drain() {
        if (!window.PonoGameStickers || !window.PonoDailyQuest) return;
        var consume = window.PonoGameStickers.consumePending;
        if (typeof consume !== 'function') return;
        var pending = null;
        try { pending = consume(); } catch (_) { pending = null; }
        if (!Array.isArray(pending) || !pending.length) return;
        var CLEAR_EVENTS = ['clear', 'stage_clear', 'perfect', 'complete'];
        pending.forEach(function (r) {
          if (!r || !r.gameId) return;
          var ev = r.event || 'clear';
          if (CLEAR_EVENTS.indexOf(ev) < 0) return;
          try {
            var result = window.PonoDailyQuest.markCleared(r.gameId);
            if (result && result.wasMatch && !result.alreadyCleared) {
              try {
                window.dispatchEvent(new CustomEvent('PonoDailyQuestCleared', {
                  detail: { questId: r.gameId, date: result.state && result.state.date }
                }));
              } catch (_) {}
            }
          } catch (_) {}
        });
      }
      // 起動時 drain
      drain();
      // tab 切り替え時 (ゲーム → play.html visible) でもう一度
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') drain();
      });
      // pageshow (bfcache 復帰) でも drain
      window.addEventListener('pageshow', function () { drain(); });
    })();

    // v1571 phase 5: PonoDonguriShopPurchased → 中央 zoom + 紙吹雪
    // v1573 phase 6 must-fix #4B: resolveAsset は path string を受けるので catalog lookup で正しい path を取得
    function _resolveStickerImgUrl(gameId, stickerId) {
      return new Promise(function (resolve) {
        try {
          var api = window.PonoGameStickers;
          if (!api || typeof api.loadCatalog !== 'function' || typeof api.resolveAsset !== 'function') {
            resolve(null); return;
          }
          if (!gameId || !stickerId) { resolve(null); return; }
          Promise.resolve(api.loadCatalog()).then(function (raw) {
            try {
              var page = raw && raw.pages && raw.pages[gameId];
              var list = (page && page.stickers) || [];
              for (var i = 0; i < list.length; i++) {
                if (list[i] && list[i].id === stickerId) {
                  var path = list[i].img || '';
                  if (path) { resolve(api.resolveAsset(path) || null); return; }
                  resolve(null); return;
                }
              }
              resolve(null);
            } catch (_) { resolve(null); }
          }, function () { resolve(null); });
        } catch (_) { resolve(null); }
      });
    }

    function _renderPurchaseCelebration(url, stickerName) {
      var host = document.getElementById('donguriShopCelebration');
      if (!host) return;
      host.innerHTML = '';
      var thumb = document.createElement('div');
      thumb.className = 'donguri-shop-celebration__thumb';
      thumb.innerHTML = url ? ('<img src="' + url + '" alt="" draggable="false" />') : '⭐';
      host.appendChild(thumb);
      var label = document.createElement('div');
      label.className = 'donguri-shop-celebration__name';
      label.textContent = String(stickerName || 'シール').trim() || 'シール';
      host.appendChild(label);
      var palette = ['#ffd34d','#ff9a3c','#7ed957','#5ec8ff','#ff6fb5','#fff7c0'];
      for (var i = 0; i < 16; i++) {
        var p = document.createElement('div');
        p.className = 'donguri-shop-celebration__confetti';
        var ang = (Math.PI * 2 * i) / 16 + (Math.random() * .35);
        var dist = 150 + Math.random() * 90;
        p.style.setProperty('--cx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--cy', Math.sin(ang) * dist + 'px');
        p.style.setProperty('--cr', (Math.random() * 720 - 360) + 'deg');
        p.style.background = palette[i % palette.length];
        p.style.animationDelay = (Math.random() * .08) + 's';
        host.appendChild(p);
      }
      host.hidden = false;
      window.setTimeout(function () { host.hidden = true; host.innerHTML = ''; }, 2450);
    }

    window.addEventListener('PonoDonguriShopPurchased', function (e) {
      var detail = (e && e.detail) || {};
      var gameId = detail.gameId;
      var stickerId = detail.stickerId || detail.id;
      var stickerName = '';
      try { stickerName = detail.stickerResult && detail.stickerResult.sticker && detail.stickerResult.sticker.name; } catch (_) { stickerName = ''; }
      if (!stickerName && detail.stickerName) stickerName = detail.stickerName;
      // v1891→v1895: 2 段目 safety guard — click handler が SE/BGM 保守を撃ち漏らした場合の retention。
      //         同一 toast へ二重発火しないよう ensureShopBgmPlaying のみ実行 (SE は click 側で発火済み)。
      //         inactive guard も念のため解除しておく。
      try { _clearAudioInactiveGuard(); } catch (_) {}
      try { ensureShopBgmPlaying(); } catch (_) {}
      _resolveStickerImgUrl(gameId, stickerId).then(function (url) {
        _renderPurchaseCelebration(url, stickerName);
      });
    });

    // PonoDailyQuestCleared: 情報バナーを再描画 (バッジ削除済み / v1575)
    window.addEventListener('PonoDailyQuestCleared', function () {
      try { renderDailyQuestInfoBanner(); } catch (_) {}
      window.setTimeout(function () { updateDailyGachaEntry(); }, 200);
    });

    // 初回 play.html 訪問でフクロウ TTS 自動発話 (mp3 未生成のため graceful skip)
    (function tryQuestNarration() {
      try {
        if (sessionStorage.getItem('pono_quest_narrated_today') === '1') return;
      } catch (_) { return; }
      if (!window.PonoDailyQuest) return;
      var n = window.Narration || window.PonoNarration;
      if (!n || typeof n.play !== 'function') return;
      try {
        var q = window.PonoDailyQuest.getToday();
        var key = 'pono_quest_' + q.questId + '_intro';
        if (typeof n.has === 'function' && !n.has(key)) return;
        n.play(key);
        try { sessionStorage.setItem('pono_quest_narrated_today', '1'); } catch (_) {}
      } catch (_) { /* graceful skip */ }
    })();

    if (dailyGachaEntry) {
      updateDailyGachaEntry();
      scheduleDailyGachaImagePreload();
      // ---- A: ガチャ画面 critical asset を idle warm (Stream A 2026-06-28) ----
      // preload-helper.js の GAME_WARM_ASSETS['gacha'] を <link rel=preload> で
      // バックグラウンド注入。 上記 scheduleDailyGachaImagePreload() は
      // new Image() ベースで browser の preload キャッシュには載らないが、
      // こちらは Cache API / Disk Cache に確実に乗る (二重保険)。
      // ※ preload-helper.js は <script defer> なので、 この inline script の同期実行時点では
      // まだ未ロード (window.PonoPreload === undefined)。 DOMContentLoaded を待ってから発火する。
      // 既に DOM 解析が完了している (readyState === 'interactive' | 'complete') 場合は即時実行。
      var __gachaIdleWarm = function () {
        try {
          if (window.PonoPreload && typeof window.PonoPreload.warmGameAssets === 'function') {
            window.PonoPreload.warmGameAssets('gacha', { fetchpriority: 'low' });
          }
        } catch (_) { /* preload-helper 未ロード時は静かにスキップ */ }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', __gachaIdleWarm, { once: true });
      } else {
        __gachaIdleWarm();
      }
      // ---- A: ガチャボタン hover/touch で preload を前倒し (ユーザー意図検知) ----
      // click 発火前に pointerenter / touchstart で startDailyGachaImagePreload を
      // 強制発火。 PC では hover で ~200-500ms、 iPad では touchstart で
      // ~50-150ms の head-start が稼げる。 idle 経路は dailyGachaImagePreloadStarted
      // flag で二重実行抑止されている。
      var __gachaWarmIntent = function () {
        try { startDailyGachaImagePreload(); } catch (_) {}
        try {
          if (window.PonoPreload && typeof window.PonoPreload.warmGameAssets === 'function') {
            window.PonoPreload.warmGameAssets('gacha', { fetchpriority: 'high' });
          }
        } catch (_) {}
      };
      dailyGachaEntry.addEventListener('pointerenter', __gachaWarmIntent, { once: true, passive: true });
      dailyGachaEntry.addEventListener('touchstart', __gachaWarmIntent, { once: true, passive: true, capture: true });
      _scheduleShopNarrationPreload();
      dailyGachaEntry.addEventListener('click', openDailyGacha);
    } else {
      _scheduleShopNarrationPreload();
    }
    if (dailyGachaClose) dailyGachaClose.addEventListener('click', closeDailyGacha);
    if (dailyGachaModal) {
      dailyGachaModal.addEventListener('click', (event) => {
        if (event.target === dailyGachaModal) closeDailyGacha();
      });
    }
    if (dailyGachaBook) dailyGachaBook.addEventListener('click', goDailyGachaStickerBook);
    if (dailyGachaFixedHome) dailyGachaFixedHome.addEventListener('click', goDailyGachaHome);
    if (dailyGachaCloseupBook) dailyGachaCloseupBook.addEventListener('click', goDailyGachaStickerBook);
    const dailyGachaSoundToggle = document.getElementById('soundToggle');
    if (dailyGachaSoundToggle) {
      dailyGachaSoundToggle.addEventListener('change', () => {
        if (dailyGachaSoundMuted()) {
          stopDailyGachaBed();
          stopDailyGachaOneShotAudio();
          _stopShopNarrationAudio();
        } else if (dailyGachaModal && !dailyGachaModal.hidden && !dailyGachaState.complete) {
          startDailyGachaBed();
        }
      });
    }
    const resumeDailyGachaBedFromVisibleGesture = () => {
      if (shouldDailyGachaBedRun()) startDailyGachaBed();
    };
    document.addEventListener('pointerdown', resumeDailyGachaBedFromVisibleGesture, { capture: true, passive: true });
    document.addEventListener('touchstart', resumeDailyGachaBedFromVisibleGesture, { capture: true, passive: true });
    document.addEventListener('keydown', resumeDailyGachaBedFromVisibleGesture, { capture: true });
    window.addEventListener('focus', resumeDailyGachaBedFromVisibleGesture, true);
    window.addEventListener('pageshow', resumeDailyGachaBedFromVisibleGesture, true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopDailyGachaBed(false);
        _stopShopNarrationAudio();
      } else if (dailyGachaModal && !dailyGachaModal.hidden && !dailyGachaState.complete && !dailyGachaSoundMuted()) {
        startDailyGachaBed();
      }
    });
    if (dailyGachaAssist) {
      dailyGachaAssist.addEventListener('click', () => {
        // v1577 M2: hint モードでは click は no-op (CSS pointer-events:none も併用しているが二重防御)
        if (dailyGachaAssist.getAttribute('data-mode') === 'hint') return;
        commitDailyGachaTurn();
      });
    }
    if (dailyGachaLever) {
      // v1577 M2: blocked (鍵なし / 引き済み) 判定 helper
      // disabled 属性は pointer event を dispatch しないため使わず data-blocked を見る
      var isDailyGachaLeverBlocked = function () {
        return dailyGachaLever.dataset && dailyGachaLever.dataset.blocked === '1';
      };
      dailyGachaLever.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse') return;
        if (dailyGachaState.complete || dailyGachaState.turnLock || dailyGachaLever.disabled || isDailyGachaLeverBlocked()) return;
        setDailyGachaHandState('ready');
      });
      dailyGachaLever.addEventListener('pointerleave', (event) => {
        if (event.pointerType !== 'mouse') return;
        if (dailyGachaState.dragging || dailyGachaState.complete || dailyGachaState.turnLock) return;
        setDailyGachaHandState('open');
      });
      dailyGachaLever.addEventListener('pointerdown', (event) => {
        // v1577 M2: blocked 状態なら turn は始めず、 代わりに shake + pulse + vibration
        if (isDailyGachaLeverBlocked()) {
          event.preventDefault();
          triggerDailyGachaBlockedFeedback();
          return;
        }
        if (dailyGachaState.complete || dailyGachaState.turnLock || dailyGachaLever.disabled) return;
        event.preventDefault();
        dailyGachaState.dragging = true;
        dailyGachaState.dragAngle = 0;
        dailyGachaState.lastAngle = angleForDailyGachaPointer(event);
        setDailyGachaHandOrbit(0);
        setDailyGachaHandState('grip');
        if (dailyGachaModal) {
          dailyGachaModal.classList.remove('is-armed', 'is-hand-ready', 'is-notch');
          dailyGachaModal.classList.add('is-grabbing');
        }
        try { dailyGachaLever.setPointerCapture(event.pointerId); } catch (_) {}
      });
      dailyGachaLever.addEventListener('pointermove', (event) => {
        if (!dailyGachaState.dragging || dailyGachaState.complete || dailyGachaState.turnLock) return;
        event.preventDefault();
        const angle = angleForDailyGachaPointer(event);
        let diff = angle - dailyGachaState.lastAngle;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        dailyGachaState.lastAngle = angle;
        if (diff > 0) {
          dailyGachaState.dragAngle += diff;
        } else if (diff < 0) {
          dailyGachaState.dragAngle = Math.max(0, dailyGachaState.dragAngle + diff * .25);
        }
        if (dailyGachaState.dragAngle >= DAILY_GACHA_TURN_THRESHOLD) {
          commitDailyGachaTurn();
          return;
        }
        const strain = Math.min(dailyGachaState.dragAngle, DAILY_GACHA_TURN_THRESHOLD - 1);
        const pull = Math.max(0, Math.min(1, strain / DAILY_GACHA_TURN_THRESHOLD));
        const previewRotation = DAILY_GACHA_DRAG_PREVIEW_ROTATION * Math.pow(pull, .78);
        setDailyGachaLeverRotation(dailyGachaState.settledRotation + previewRotation);
        setDailyGachaHandOrbit(pull);
      });
      dailyGachaLever.addEventListener('pointerup', (event) => {
        dailyGachaState.dragging = false;
        dailyGachaState.dragAngle = 0;
        try { dailyGachaLever.releasePointerCapture(event.pointerId); } catch (_) {}
        if (!dailyGachaState.complete && !dailyGachaState.turnLock) {
          setDailyGachaLeverRotation(dailyGachaState.settledRotation);
          setDailyGachaPrompt(dailyGachaState.step ? dailyGachaStepStatus(dailyGachaState.step) : 'もっとまわすよ！');
          setDailyGachaHandState('open');
          setDailyGachaHandOrbit(0);
          if (dailyGachaModal) {
            dailyGachaModal.classList.remove('is-grabbing');
            dailyGachaModal.classList.add('is-armed');
          }
        } else if (dailyGachaModal) {
          setDailyGachaHandState('open');
          setDailyGachaHandOrbit(0);
          dailyGachaModal.classList.remove('is-grabbing');
        }
      });
      dailyGachaLever.addEventListener('pointercancel', () => {
        dailyGachaState.dragging = false;
        dailyGachaState.dragAngle = 0;
        if (!dailyGachaState.complete && !dailyGachaState.turnLock) {
          setDailyGachaLeverRotation(dailyGachaState.settledRotation);
          setDailyGachaHandState('open');
          setDailyGachaHandOrbit(0);
          if (dailyGachaModal) {
            dailyGachaModal.classList.remove('is-grabbing', 'is-hand-ready');
            dailyGachaModal.classList.add('is-armed');
          }
        }
      });
      dailyGachaLever.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
          event.preventDefault();
          // v1577 M2: blocked 状態ならキーボードでも feedback のみ
          if (isDailyGachaLeverBlocked()) {
            triggerDailyGachaBlockedFeedback();
            return;
          }
          commitDailyGachaTurn();
        }
      });
    }

    // ===== えほんのあいことば → unlock flow =====
    // 紙の本にあるシリアル / Amazon 注文番号 / 絵本クイズ で book tier を解除する 3 経路の導線。
    // play.html 内のモーダル (#passwordUnlockModal) で完結させる。
    // 検証は common/tier.js の PonoTier.{verifySerialCode, verifyBookPassword, verifyOrderId, verifyQuizAnswer} に集約。
    // (v17XX: verifyAdminPassword 廃止、 BOOK_PASSWORDS = ['arigato_pono2026'] 1 本化)
    // モーダル open 時の解錠 state スナップショット (close 時の表示更新に使う)
    let pwSnapshot = null;
    const bookUnlockEntry = document.getElementById('bookUnlockEntry');
    const settingsBookUnlockBtn = document.getElementById('settingsBookUnlockBtn');
    const settingsBookUnlockSub = document.getElementById('settingsBookUnlockSub');

    function isBookBenefitUnlocked() {
      try { return localStorage.getItem('pono_premium') === '1'; } catch (e) { return false; }
    }

    /**
     * 成功時の success-tag / success-body コピーを mode で切替える。
     * 既存 'book' / 'debug' に加えて 'serial' / 'order_id' / 'quiz' を追加。
     * (v17XX: 'admin' mode は verifyAdminPassword 廃止に伴い撤去。 'serial' に統合)
     * @param {'book'|'debug'|'serial'|'order_id'|'quiz'} mode
     */
    function setPasswordUnlockSuccessCopy(mode) {
      const tagEl = document.getElementById('passwordUnlockSuccessTag');
      const bodyEl = document.getElementById('passwordUnlockSuccessBody');
      if (mode === 'debug') {
        if (tagEl) tagEl.textContent = 'デバッグを ひらいたよ';
        if (bodyEl) bodyEl.innerHTML = 'せっていから<br>デバッグボードを つかえるよ';
        return;
      }
      if (mode === 'order_id') {
        if (tagEl) tagEl.textContent = '📦 おかいあげ ありがとう！';
        if (bodyEl) bodyEl.innerHTML = 'あなたの えほんで<br>ひらいたよ！';
        return;
      }
      if (mode === 'quiz') {
        if (tagEl) tagEl.textContent = '🐾 ピンポン！ せいかい！';
        if (bodyEl) bodyEl.innerHTML = 'えほんを よんでくれて<br>ありがとう！';
        return;
      }
      // 'book' / 'serial' / default  (v17XX: 'admin' 撤去)
      if (tagEl) tagEl.textContent = '✨ えほんの とくてんが ひらいたよ ✨';
      if (bodyEl) bodyEl.innerHTML = 'あたらしい あそびと<br>とくてんシールが ひらいたよ！';
    }

    function updateBookUnlockEntry() {
      const unlocked = isBookBenefitUnlocked();
      if (bookUnlockEntry) bookUnlockEntry.hidden = unlocked;
      if (settingsBookUnlockSub) settingsBookUnlockSub.textContent = unlocked ? 'もういちど いれる' : 'あいことばを いれる';
      if (settingsBookUnlockBtn) {
        settingsBookUnlockBtn.setAttribute(
          'aria-label',
          unlocked ? 'えほんの あいことば もういちど いれる' : 'えほんの あいことば あいことばを いれる'
        );
      }
    }

    let bookBonusStickerGrantPromise = null;
    function ensureBookBonusStickersGranted() {
      if (!isBookBenefitUnlocked()) return null;
      if (bookBonusStickerGrantPromise) return bookBonusStickerGrantPromise;
      const api = window.PonoGameStickers;
      if (!api || typeof api.grantBookBonus !== 'function') return null;
      bookBonusStickerGrantPromise = api.grantBookBonus({ show: false }).catch(() => null);
      return bookBonusStickerGrantPromise;
    }

    // ===== v3: 「アプリで あそべる」 ゾーン誘導モーダル (feature_tier_v3 §5) =====
    // book/free それぞれタップ時のコピー・ボタンが違う 1 枚のモーダルを共用する。
    // book: 24h に 1 回だけ自動表示 (連打で毎回出さない)、 × dismiss で 7 日非表示。
    // free: 毎回表示 (絵本へ誘導する唯一の導線なので抑制しない)。
    const SUB_PROMO_BOOK_LAST_SHOWN_KEY = 'pono_sub_promo_book_last_shown_at';
    const SUB_PROMO_BOOK_DISMISSED_KEY = 'pono_sub_promo_book_dismissed_at';
    const SUB_PROMO_BOOK_THROTTLE_MS = 24 * 60 * 60 * 1000;      // 24h
    const SUB_PROMO_BOOK_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;   // 7day

    // 本版 (LP) から アプリ版 (App staging/production) への正規 URL。
    // memory: project_url_architecture / CLAUDE.md URL マトリクス準拠。
    function getAppBuildUrl() {
      try {
        const host = location.hostname;
        if (host.indexOf('pono-asobiba-staging') === 0 || host === 'localhost' || host === '127.0.0.1') {
          return 'https://pono-asobiba-app-staging.ndw.workers.dev/';
        }
      } catch (e) {}
      return 'https://pono-asobiba-app.ndw.workers.dev/';
    }

    function shouldShowBookSubPromo() {
      try {
        const dismissedAt = Number(localStorage.getItem(SUB_PROMO_BOOK_DISMISSED_KEY) || 0);
        if (dismissedAt && (Date.now() - dismissedAt) < SUB_PROMO_BOOK_DISMISS_MS) return false;
        const lastShownAt = Number(localStorage.getItem(SUB_PROMO_BOOK_LAST_SHOWN_KEY) || 0);
        if (lastShownAt && (Date.now() - lastShownAt) < SUB_PROMO_BOOK_THROTTLE_MS) return false;
      } catch (e) {}
      return true;
    }

    /**
     * 「アプリで あそべる」 ゾーンのカードをタップした時の誘導モーダル。
     * sub tier (アプリ版 / capture override) では何もせず false を返す
     * (= 呼び出し側でそのまま通常遷移させる)。
     * book/free では専用モーダルを表示して true を返す (= 遷移をブロックする)。
     * @param {object} game タップされた GAMES entry
     * @returns {boolean} true ならモーダルを出して遷移をブロックした
     */
    function openAppZonePromo(game) {
      const tier = window.PonoTier || null;
      const isSubTier = tier && typeof tier.isSub === 'function' ? tier.isSub() : __isAppBuild;
      if (isSubTier) return false;
      const isBookTier = tier && typeof tier.isBook === 'function' ? tier.isBook() : isBookBenefitUnlocked();
      if (isBookTier && !shouldShowBookSubPromo()) return false;
      if (document.querySelector('.app-zone-promo-modal.is-visible')) return true;

      const modal = document.getElementById('appZonePromoModal');
      if (!modal) return false;
      const titleEl = document.getElementById('appZonePromoBody');
      const primaryBtn = document.getElementById('appZonePromoPrimary');
      const secondaryBtn = document.getElementById('appZonePromoSecondary');
      if (!titleEl || !primaryBtn || !secondaryBtn) return false;

      if (isBookTier) {
        try { localStorage.setItem(SUB_PROMO_BOOK_LAST_SHOWN_KEY, String(Date.now())); } catch (e) {}
        titleEl.innerHTML = 'ありがとう、 えほんを よんでくれて。<br><br>'
          + 'book で あそべる ゲームは、 アプリでも おなじ。<br><br>'
          + 'でも、 アプリには アプリだけの ゲームが 7つ、<br>'
          + 'もらえる シールも たくさん あるよ。';
        primaryBtn.textContent = 'アプリを みてみる';
        secondaryBtn.textContent = 'いまは いいや';
        primaryBtn.dataset.action = 'goapp';
        secondaryBtn.dataset.action = 'dismiss-book';
      } else {
        titleEl.innerHTML = 'このゲームは、 えほんを かってくれた人と<br>'
          + 'アプリで あそんでくれる人 だけの ゲームだよ。<br><br>'
          + 'えほんには、 ポノからの あいことばが あるよ。';
        primaryBtn.textContent = 'えほんを みてみる';
        secondaryBtn.textContent = 'とじる';
        primaryBtn.dataset.action = 'openbook';
        secondaryBtn.dataset.action = 'close';
      }
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add('is-visible'));
      return true;
    }

    function closeAppZonePromo() {
      const modal = document.getElementById('appZonePromoModal');
      if (!modal) return;
      modal.classList.remove('is-visible');
      setTimeout(() => { modal.hidden = true; }, 220);
    }

    (function setupAppZonePromoButtons() {
      const primaryBtn = document.getElementById('appZonePromoPrimary');
      const secondaryBtn = document.getElementById('appZonePromoSecondary');
      const closeX = document.getElementById('appZonePromoClose');
      if (primaryBtn) {
        primaryBtn.addEventListener('click', () => {
          const action = primaryBtn.dataset.action;
          closeAppZonePromo();
          if (action === 'goapp') {
            try { window.location.href = getAppBuildUrl(); } catch (e) {}
          } else if (action === 'openbook') {
            openPasswordUnlockModal();
          }
        });
      }
      if (secondaryBtn) {
        secondaryBtn.addEventListener('click', () => {
          if (secondaryBtn.dataset.action === 'dismiss-book') {
            try { localStorage.setItem(SUB_PROMO_BOOK_DISMISSED_KEY, String(Date.now())); } catch (e) {}
          }
          closeAppZonePromo();
        });
      }
      if (closeX) closeX.addEventListener('click', closeAppZonePromo);
    })();

    // ===== タブ切替 (WAI-ARIA Tabs Pattern / Manual Activation) =====
    const PW_TAB_IDS = ['serial', 'order', 'quiz'];
    const pwTabEls = {
      serial: document.getElementById('pwTabSerial'),
      order:  document.getElementById('pwTabOrder'),
      quiz:   document.getElementById('pwTabQuiz'),
    };
    const pwPanelEls = {
      serial: document.getElementById('pwPanelSerial'),
      order:  document.getElementById('pwPanelOrder'),
      quiz:   document.getElementById('pwPanelQuiz'),
    };
    const pwPanelInputs = {
      serial: () => document.getElementById('passwordUnlockInput'),
      order:  () => document.getElementById('pwOrderInput'),
      quiz:   () => document.getElementById('pwQuizInput'),
    };
    let pwActiveTab = 'serial';

    function activatePwTab(tabId, opts) {
      if (PW_TAB_IDS.indexOf(tabId) < 0) return;
      pwActiveTab = tabId;
      PW_TAB_IDS.forEach((id) => {
        const tab = pwTabEls[id];
        const panel = pwPanelEls[id];
        const isActive = id === tabId;
        if (tab) {
          tab.classList.toggle('is-active', isActive);
          tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
          tab.setAttribute('tabindex', isActive ? '0' : '-1');
        }
        if (panel) panel.hidden = !isActive;
      });
      // タブ切替時は error / success を非表示に戻す (panel ごとの体験を独立させる)
      const errEl = document.getElementById('passwordUnlockError');
      if (errEl) errEl.hidden = true;
      // quiz タブを開いた瞬間に問題未表示なら抽選
      if (tabId === 'quiz') ensurePwQuizQuestion();
      // focus 移動 (init 時は skipFocus)
      if (!opts || !opts.skipFocus) {
        const inp = pwPanelInputs[tabId] && pwPanelInputs[tabId]();
        if (inp) setTimeout(() => { try { inp.focus(); } catch(e){} }, 30);
      }
    }

    // タブクリック + キーボードナビゲーション (ArrowLeft/Right/Home/End/Enter/Space)
    PW_TAB_IDS.forEach((id) => {
      const tab = pwTabEls[id];
      if (!tab) return;
      tab.addEventListener('click', () => activatePwTab(id));
      tab.addEventListener('keydown', (e) => {
        const cur = PW_TAB_IDS.indexOf(id);
        if (cur < 0) return;
        let nextIdx = -1;
        if (e.key === 'ArrowRight') nextIdx = (cur + 1) % PW_TAB_IDS.length;
        else if (e.key === 'ArrowLeft') nextIdx = (cur - 1 + PW_TAB_IDS.length) % PW_TAB_IDS.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = PW_TAB_IDS.length - 1;
        else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activatePwTab(id);
          return;
        }
        else return;
        e.preventDefault();
        const nextId = PW_TAB_IDS[nextIdx];
        const nextTab = pwTabEls[nextId];
        if (nextTab) {
          // Manual Activation: focus を移すだけ、 activate は Enter/Space で
          PW_TAB_IDS.forEach((tid) => {
            const t = pwTabEls[tid];
            if (t) t.setAttribute('tabindex', tid === nextId ? '0' : '-1');
          });
          nextTab.focus();
        }
      });
    });

    // ===== クイズ問題の抽選・表示 =====
    function ensurePwQuizQuestion(opts) {
      const qBox = document.getElementById('pwQuizQuestion');
      if (!qBox) return;
      const tier = window.PonoTier || {};
      if (typeof tier.pickRandomQuiz !== 'function') {
        qBox.textContent = 'クイズが よみこめなかったよ';
        qBox.dataset.qid = '';
        return;
      }
      // すでに表示中で reroll 指定なしなら何もしない (タブ切替時の問題保持)
      if (qBox.dataset.qid && !(opts && opts.reroll)) return;
      const q = tier.pickRandomQuiz();
      if (!q) {
        qBox.textContent = 'クイズが まだ ないよ';
        qBox.dataset.qid = '';
        return;
      }
      qBox.textContent = q.q;
      qBox.dataset.qid = q.id;
      const quizInput = document.getElementById('pwQuizInput');
      if (quizInput) quizInput.value = '';
    }

    const pwQuizReroll = document.getElementById('pwQuizReroll');
    if (pwQuizReroll) {
      pwQuizReroll.addEventListener('click', () => {
        ensurePwQuizQuestion({ reroll: true });
        const errEl = document.getElementById('passwordUnlockError');
        if (errEl) errEl.hidden = true;
        const quizInput = document.getElementById('pwQuizInput');
        if (quizInput) { try { quizInput.focus(); } catch(e){} }
      });
    }

    // ===== モーダル open =====
    function openPasswordUnlockModal() {
      const already = isBookBenefitUnlocked();
      const errEl = document.getElementById('passwordUnlockError');
      const successEl = document.getElementById('passwordUnlockSuccess');
      const helpEl = document.getElementById('passwordUnlockHelp');
      const tabsEl = document.querySelector('.password-modal-tabs');
      if (errEl) errEl.hidden = true;
      if (successEl) successEl.hidden = !already;
      setPasswordUnlockSuccessCopy('book');
      if (helpEl) helpEl.style.display = already ? 'none' : '';
      if (tabsEl) tabsEl.style.display = already ? 'none' : '';
      // 各 panel の input/submit を可視化 + value クリア (前回 success で display:none した分の復活)
      ['serial', 'order', 'quiz'].forEach((id) => {
        const panel = pwPanelEls[id];
        if (panel && !already) panel.hidden = (id !== pwActiveTab);
        else if (panel) panel.hidden = true;
        const inp = pwPanelInputs[id] && pwPanelInputs[id]();
        if (inp) {
          inp.style.display = '';
          inp.value = '';
        }
      });
      // 全 submit ボタンを可視化
      ['passwordUnlockSubmit', 'pwSubmitOrder', 'pwSubmitQuiz'].forEach((bid) => {
        const b = document.getElementById(bid);
        if (b) b.style.display = '';
      });
      // クイズ問題抽選 (初回 / 未表示時)
      ensurePwQuizQuestion();
      try {
        pwSnapshot = {
          premium: localStorage.getItem('pono_premium'),
          sub: localStorage.getItem('pono_sub_active'),
        };
      } catch (e) {
        pwSnapshot = null;
      }
      openModal('passwordUnlockModal');
      if (!already) {
        const inp = pwPanelInputs[pwActiveTab] && pwPanelInputs[pwActiveTab]();
        if (inp) setTimeout(() => { try { inp.focus(); } catch(e){} }, 40);
      }
    }
    if (bookUnlockEntry) bookUnlockEntry.addEventListener('click', openPasswordUnlockModal);
    if (settingsBookUnlockBtn) settingsBookUnlockBtn.addEventListener('click', openPasswordUnlockModal);
    updateBookUnlockEntry();
    ensureBookBonusStickersGranted();

    // ===== v3: book welcome 演出シーケンサ (feature_tier_v3 §4.3) =====
    // LS pono_book_welcome_pending_v1 == '1' && pono_book_welcome_shown_v1 != '1' で発火。
    // pending は pwFinalizeSuccess() (成功時、 debug 経路以外) が立てる。
    const BOOK_WELCOME_PENDING_KEY = 'pono_book_welcome_pending_v1';
    const BOOK_WELCOME_SHOWN_KEY = 'pono_book_welcome_shown_v1';
    let bookWelcomeRunning = false;

    function maybeStartBookWelcome() {
      if (bookWelcomeRunning) return;
      try {
        if (localStorage.getItem(BOOK_WELCOME_PENDING_KEY) !== '1') return;
        if (localStorage.getItem(BOOK_WELCOME_SHOWN_KEY) === '1') {
          localStorage.removeItem(BOOK_WELCOME_PENDING_KEY);
          return;
        }
      } catch (e) { return; }
      runBookWelcomeSequence();
    }

    function finishBookWelcome() {
      if (!bookWelcomeRunning) return;
      bookWelcomeRunning = false;
      try {
        localStorage.setItem(BOOK_WELCOME_SHOWN_KEY, '1');
        localStorage.removeItem(BOOK_WELCOME_PENDING_KEY);
      } catch (e) {}
      // skip でも grant は確定実行する (spec §4.3 「skip でも特典 grant 確定」)。
      ensureBookBonusStickersGranted();
      const overlay = document.getElementById('bookWelcomeOverlay');
      if (overlay) {
        overlay.classList.remove('is-visible');
        setTimeout(() => { overlay.hidden = true; }, 420);
      }
    }

    function runBookWelcomeSequence() {
      const overlay = document.getElementById('bookWelcomeOverlay');
      if (!overlay) return;
      bookWelcomeRunning = true;
      const walker = document.getElementById('bookWelcomeWalker');
      const letter = document.getElementById('bookWelcomeLetter');
      const reveal = document.getElementById('bookWelcomeReveal');
      const revealGrid = document.getElementById('bookWelcomeRevealGrid');
      const cover = document.getElementById('bookWelcomeCover');
      const coverFrame = document.getElementById('bookWelcomeCoverFrame');
      const outro = document.getElementById('bookWelcomeOutro');
      const skipBtn = document.getElementById('bookWelcomeSkip');
      const doneBtn = document.getElementById('bookWelcomeDone');
      const timers = [];
      function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
      function clearAllTimers() { timers.forEach((id) => clearTimeout(id)); timers.length = 0; }

      function onSkip() {
        clearAllTimers();
        if (skipBtn) skipBtn.removeEventListener('click', onSkip);
        if (doneBtn) doneBtn.removeEventListener('click', onDone);
        finishBookWelcome();
      }
      function onDone() { onSkip(); }
      if (skipBtn) skipBtn.addEventListener('click', onSkip);
      if (doneBtn) doneBtn.addEventListener('click', onDone);

      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-visible'));

      // ステップ1: 「ピンポン」 SE。 専用アセット未生成のため既存の陽性チャイム
      // (daily gacha sticker sparkle) を暫定流用。 音声生成タスクは別途 track で
      // whisper 検証込みで正式アセットに差し替える想定 (feedback_tts_whisper_verify_required)。
      try {
        const chime = new Audio('assets/audio/gacha/daily_gacha_sticker_sparkle.mp3');
        chime.volume = 0.8;
        chime.play().catch(() => {});
      } catch (e) {}

      // ステップ2: 暗転 (背景は元々 #000) → ポノが手紙持って歩く 2秒アニメ
      later(() => {
        if (!walker) return;
        walker.hidden = false;
        void walker.offsetWidth;
        walker.classList.add('is-walking');
      }, 250);

      // ステップ3: 手紙カード表示 + TTS「ありがとう」ボイス。
      // manifest 未反映キーは Narration.play() 内部で無音フォールバックする設計
      // (common/narration.js) なので、 音声未生成でも UI は壊れない。
      later(() => {
        if (walker) walker.hidden = true;
        if (letter) {
          letter.hidden = false;
          requestAnimationFrame(() => letter.classList.add('is-visible'));
        }
        try {
          if (window.Narration && typeof window.Narration.play === 'function') {
            window.Narration.play('play:book_welcome:thanks');
          }
        } catch (e) {}
      }, 2500);

      // ステップ4: 「ポノからのプレゼント」 → book-bonus ページのシールを 0.4秒間隔で reveal
      later(() => { if (letter) letter.classList.remove('is-visible'); }, 5000);
      const STICKER_STEP_MS = 400;
      let stickerCount = 8; // フォールバック既定値。 実カタログ取得後に実数へ補正
      later(async () => {
        if (letter) letter.hidden = true;
        if (!reveal) return;
        reveal.hidden = false;
        requestAnimationFrame(() => reveal.classList.add('is-visible'));
        if (!revealGrid) return;
        revealGrid.textContent = '';
        let stickers = [];
        try {
          const api = window.PonoGameStickers;
          if (api && typeof api.loadCatalog === 'function') {
            const catalog = await api.loadCatalog();
            const page = catalog && catalog.pages && catalog.pages['book-bonus'];
            stickers = (page && Array.isArray(page.stickers)) ? page.stickers : [];
          }
        } catch (e) {}
        const resolver = window.PonoGameStickers && window.PonoGameStickers.resolveAsset;
        stickers.forEach((sticker, i) => {
          const cell = document.createElement('div');
          cell.className = 'bw-sticker';
          const src = sticker.img && typeof resolver === 'function' ? resolver(sticker.img) : sticker.img;
          if (src) {
            const img = document.createElement('img');
            img.src = src;
            img.alt = '';
            cell.appendChild(img);
          } else {
            const em = document.createElement('span');
            em.className = 'bw-sticker-emoji';
            em.textContent = sticker.emoji || '⭐';
            cell.appendChild(em);
          }
          revealGrid.appendChild(cell);
          later(() => cell.classList.add('is-in'), i * STICKER_STEP_MS);
        });
      }, 5350);

      // ステップ5/6 のタイミングは実際の枚数が確定してから (async 後) 再計算したいところだが、
      // reveal 表示中に await を挟むと後続 later() の起点がずれるため、 既定枚数 (8) 基準の
      // 見込み待ち時間で先に予約する (実際のカタログが 8 枚未満でも reveal 演出は早く終わるだけで
      // 後続ステップの発火自体は遅れない安全側の設計)。
      const revealDoneAt = 5350 + stickerCount * STICKER_STEP_MS + 1400;
      later(() => { if (reveal) reveal.classList.remove('is-visible'); }, revealDoneAt);
      later(() => {
        if (reveal) reveal.hidden = true;
        if (!cover) return;
        cover.hidden = false;
        requestAnimationFrame(() => cover.classList.add('is-visible'));
        if (coverFrame) {
          try { coverFrame.src = 'Prototypes/StickerBookThreeJS/?surface=cover&book=book_buyer_edition'; } catch (e) {}
        }
      }, revealDoneAt + 300);

      // ステップ6: 「いつでもシールちょうからみれるよ」→ 閉じる (自動)。 手動でも
      // #bookWelcomeDone / スキップで即座に閉じられる。
      const coverShownAt = revealDoneAt + 300;
      later(() => { if (cover) cover.classList.remove('is-visible'); }, coverShownAt + 3400);
      later(() => {
        if (cover) cover.hidden = true;
        if (!outro) return;
        outro.hidden = false;
        requestAnimationFrame(() => outro.classList.add('is-visible'));
      }, coverShownAt + 3700);
    }

    // 初回起動時 (パスワード成功直後の modal close を待たずに reload された場合等) にも
    // pending が残っていれば拾う safety net。
    maybeStartBookWelcome();

    // ===== v3: 月1 おかえり演出 (feature_tier_v3 §4.4, book/sub 共通) =====
    const OKAERI_LAST_SHOWN_KEY = 'pono_last_okaeri_shown_at';
    // JST (UTC+9) 基準の "YYYY-MM" キー。 端末ローカルタイムゾーンに依存させない簡易実装。
    function jstYearMonthKey(d) {
      d = d || new Date();
      const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      return jst.getUTCFullYear() + '-' + String(jst.getUTCMonth() + 1).padStart(2, '0');
    }
    function maybeShowMonthlyOkaeri() {
      try {
        const tier = window.PonoTier || null;
        const t = tier && typeof tier.getTier === 'function' ? tier.getTier() : 'free';
        if (t !== 'book' && t !== 'sub') return; // free には出さない
        if (bookWelcomeRunning) return;          // welcome 演出と競合させない
        const key = jstYearMonthKey();
        if (localStorage.getItem(OKAERI_LAST_SHOWN_KEY) === key) return;
        localStorage.setItem(OKAERI_LAST_SHOWN_KEY, key);
      } catch (e) { return; }
      const toast = document.getElementById('okaeriToast');
      if (!toast) return;
      toast.hidden = false;
      requestAnimationFrame(() => toast.classList.add('is-visible'));
      const hide = () => {
        toast.classList.remove('is-visible');
        setTimeout(() => { toast.hidden = true; }, 320);
      };
      setTimeout(hide, 3800);
      toast.addEventListener('click', hide, { once: true });
    }
    // welcome 演出 (該当時) が先に走り終えてから判定させるための遅延実行。
    setTimeout(maybeShowMonthlyOkaeri, 1600);

    // ===== unlock 成功時の共通 finalize =====
    /**
     * 解錠成功時の UI 共通処理。 method ごとに localStorage 記録とコピー切替。
     * (v17XX: 'admin' method は廃止 → 'serial' に統合)
     * @param {'serial'|'order_id'|'quiz'|'debug'} method
     * @param {{orderId?: string}=} extras
     */
    function pwFinalizeSuccess(method, extras) {
      extras = extras || {};
      const errEl = document.getElementById('passwordUnlockError');
      const successEl = document.getElementById('passwordUnlockSuccess');
      const helpEl = document.getElementById('passwordUnlockHelp');
      const tabsEl = document.querySelector('.password-modal-tabs');
      // debug 経路は localStorage を触らず developer access UI 側で扱う
      if (method !== 'debug') {
        try {
          localStorage.setItem('pono_premium', '1');
          localStorage.setItem('pono_book_unlock_method', method);
          localStorage.setItem('pono_book_unlock_at', new Date().toISOString());
          // v3 (feature_tier_v3 §4.3): welcome 演出は生涯 1 回限定。
          // 既に見せ済み (pono_book_welcome_shown_v1) なら pending は立てない
          // (再入力のたびに演出が再発火するのを防ぐ)。
          if (localStorage.getItem('pono_book_welcome_shown_v1') !== '1') {
            localStorage.setItem('pono_book_welcome_pending_v1', '1');
          }
          if (method === 'order_id' && extras.orderId) {
            let arr = [];
            try { arr = JSON.parse(localStorage.getItem('pono_unlocked_orders') || '[]'); } catch (e) { arr = []; }
            if (!Array.isArray(arr)) arr = [];
            if (arr.indexOf(extras.orderId) < 0) arr.push(extras.orderId);
            while (arr.length > 30) arr.shift();
            localStorage.setItem('pono_unlocked_orders', JSON.stringify(arr));
          }
        } catch (e) {}
      }
      if (errEl) errEl.hidden = true;
      if (method !== 'debug') {
        ensureBookBonusStickersGranted();
      }
      // すべての panel を hidden に + すべての submit を非表示
      ['serial', 'order', 'quiz'].forEach((id) => {
        const panel = pwPanelEls[id];
        if (panel) panel.hidden = true;
      });
      ['passwordUnlockSubmit', 'pwSubmitOrder', 'pwSubmitQuiz'].forEach((bid) => {
        const b = document.getElementById(bid);
        if (b) b.style.display = 'none';
      });
      if (helpEl) helpEl.style.display = 'none';
      if (tabsEl) tabsEl.style.display = 'none';
      setPasswordUnlockSuccessCopy(method);
      if (successEl) successEl.hidden = false;
      if (method === 'debug' && typeof refreshDeveloperAccessUI === 'function') refreshDeveloperAccessUI();
      updateBookUnlockEntry();
    }

    /**
     * 失敗時の UI 共通処理。 error 表示 + input クリア + 再 focus。
     * @param {HTMLInputElement|null} inputEl
     * @param {string=} msg
     * @param {{keepValue?:boolean}=} opts
     */
    function pwShowError(inputEl, msg, opts) {
      opts = opts || {};
      const errEl = document.getElementById('passwordUnlockError');
      if (errEl) {
        errEl.textContent = msg || 'ちがうよ！ もういちど！';
        errEl.hidden = false;
      }
      if (inputEl) {
        if (!opts.keepValue) inputEl.value = '';
        try { inputEl.focus(); } catch (e) {}
      }
    }

    // ===== Serial / Admin / Debug 経路 (既存 #passwordUnlockSubmit 互換) =====
    const pwSubmit = document.getElementById('passwordUnlockSubmit');
    if (pwSubmit) {
      pwSubmit.addEventListener('click', () => {
        const input = document.getElementById('passwordUnlockInput');
        const val = (input && input.value) || '';
        if (!String(val).trim()) {
          pwShowError(input, 'なにか いれてね');
          return;
        }
        const tier = window.PonoTier || {};
        // 新 verifySerialCode は内部で BOOK_PASSWORDS + SERIAL_CODES の両方を見るが、
        // 万一未提供のビルドでも壊さないよう verifyBookPassword フォールバックを残す。
        // v17XX: verifyAdminPassword (abcd) は廃止。 BOOK_PASSWORDS = ['arigato_pono2026'] に
        // 統合済なので、 旧 admin 経路の入力もこの serialOk 1 本で解錠される。
        const serialOk = (typeof tier.verifySerialCode === 'function' && tier.verifySerialCode(val))
                      || (typeof tier.verifyBookPassword === 'function' && tier.verifyBookPassword(val));
        const debugOk = !serialOk
          && window.PonoDebugMode
          && typeof window.PonoDebugMode.unlock === 'function'
          && window.PonoDebugMode.unlock(val);
        if (serialOk)      pwFinalizeSuccess('serial');
        else if (debugOk)  pwFinalizeSuccess('debug');
        else               pwShowError(input, 'ちがうよ！ もういちど あいことばを かくにんしてね');
      });
    }

    // ===== Amazon 注文番号 経路 =====
    const pwSubmitOrder = document.getElementById('pwSubmitOrder');
    if (pwSubmitOrder) {
      pwSubmitOrder.addEventListener('click', () => {
        const input = document.getElementById('pwOrderInput');
        const val = (input && input.value) || '';
        if (!String(val).trim()) {
          pwShowError(input, 'ばんごうを いれてね');
          return;
        }
        const tier = window.PonoTier || {};
        const ok = typeof tier.verifyOrderId === 'function' && tier.verifyOrderId(val);
        if (!ok) {
          pwShowError(input, 'ばんごうの かたちが ちがうよ (れい: 250-1234567-1234567)', { keepValue: true });
          return;
        }
        // 重複利用検知 (柔らかい通知のみ。 unlock は通す)
        let isDuplicate = false;
        try {
          const norm = String(val).trim()
            .replace(/[\s　]/g, '')
            .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
            .replace(/[ー–—−]/g, '-');
          const arr = JSON.parse(localStorage.getItem('pono_unlocked_orders') || '[]');
          if (Array.isArray(arr) && arr.indexOf(norm) >= 0) isDuplicate = true;
          pwFinalizeSuccess('order_id', { orderId: norm });
        } catch (e) {
          pwFinalizeSuccess('order_id', { orderId: String(val).trim() });
        }
        // duplicate は success body にだけ柔らかく追記 (block はしない)
        if (isDuplicate) {
          const bodyEl = document.getElementById('passwordUnlockSuccessBody');
          if (bodyEl) bodyEl.innerHTML = 'この ばんごうは すでに つかってあるよ —<br>そのまま ひらいたよ';
        }
      });
    }

    // ===== 絵本クイズ 経路 =====
    const pwSubmitQuiz = document.getElementById('pwSubmitQuiz');
    if (pwSubmitQuiz) {
      pwSubmitQuiz.addEventListener('click', () => {
        const input = document.getElementById('pwQuizInput');
        const qBox = document.getElementById('pwQuizQuestion');
        const qid = (qBox && qBox.dataset && qBox.dataset.qid) || '';
        const val = (input && input.value) || '';
        if (!String(val).trim()) {
          pwShowError(input, 'こたえを いれてね');
          return;
        }
        if (!qid) {
          pwShowError(input, 'クイズが よみこめなかったよ');
          return;
        }
        const tier = window.PonoTier || {};
        const ok = typeof tier.verifyQuizAnswer === 'function' && tier.verifyQuizAnswer(qid, val);
        if (ok) pwFinalizeSuccess('quiz');
        else    pwShowError(input, 'おしい！ えほんを よみかえしてみて', { keepValue: true });
      });
    }

    // Enter キーで panel 内 submit を発火 (a11y / キーボードユーザー対応)
    [
      ['passwordUnlockInput', 'passwordUnlockSubmit'],
      ['pwOrderInput', 'pwSubmitOrder'],
      ['pwQuizInput', 'pwSubmitQuiz'],
    ].forEach(([inputId, btnId]) => {
      const inp = document.getElementById(inputId);
      const btn = document.getElementById(btnId);
      if (!inp || !btn) return;
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
      });
    });

    // デバッグ用リセットボタン: 解錠状態を解除して free に戻す
    // (success div 内に存在するため、success が hidden の間は表示されない)
    const pwReset = document.getElementById('passwordUnlockReset');
    if (pwReset) {
      pwReset.addEventListener('click', () => {
        try {
          localStorage.removeItem('pono_premium');
          localStorage.removeItem('pono_sub_active');
          localStorage.removeItem('pono_welcome_book_seen');
          localStorage.removeItem('pono_book_unlock_method');
          localStorage.removeItem('pono_book_unlock_at');
          localStorage.removeItem('pono_unlocked_orders');
          // v3: welcome / 誘導モーダル抑制系 LS もデバッグリセット対象に含める。
          localStorage.removeItem('pono_book_welcome_pending_v1');
          localStorage.removeItem('pono_book_welcome_shown_v1');
          localStorage.removeItem('pono_sub_promo_book_last_shown_at');
          localStorage.removeItem('pono_sub_promo_book_dismissed_at');
          localStorage.removeItem('pono_last_okaeri_shown_at');
        } catch (e) {}
        setTimeout(() => location.reload(), 100);
      });
    }

    // パスワード解錠モーダルを閉じた時に、 このモーダルセッション中の
    // 解錠 state 変化をタイトル画面へ即時反映する。
    // 閉じパス ([data-close] / backdrop click) のどちらでも同じ処理を走らせるため
    // ヘルパに切り出して、 pwSnapshot と同じ IIFE モジュールスコープで 1 度だけ宣言。
    function handlePasswordModalClose() {
      try {
        if (pwSnapshot) {
          const curPremium = localStorage.getItem('pono_premium');
          const curSub = localStorage.getItem('pono_sub_active');
          if (curPremium !== pwSnapshot.premium || curSub !== pwSnapshot.sub) {
            updateBookUnlockEntry();
          }
        }
      } catch (e) {}
      pwSnapshot = null;
      // v3: あいことば解錠モーダルを閉じた直後に welcome pending が立っていれば
      // すぐ発火させる (openPasswordUnlockModal → 成功 → 「あそびに もどる」で閉じる、
      // という自然な導線の直後に演出が始まる)。
      if (typeof maybeStartBookWelcome === 'function') {
        setTimeout(maybeStartBookWelcome, 260);
      }
    }
    document.addEventListener('click', (e) => {
      const closer = e.target.closest('[data-close="passwordUnlockModal"]');
      if (closer) {
        handlePasswordModalClose();
        // 注: 汎用 [data-close] ハンドラが closeModal を呼ぶのは別 listener なので
        // return しても event 伝播は止まらない。 ただし本 listener 内の早期離脱として明示。
        return;
      }
    });

    // ===== Modal helpers =====
    function openModal(id) {
      const m = $(id);
      if (m) m.hidden = false;
    }
    function closeModal(id) {
      const m = $(id);
      if (m) m.hidden = true;
    }
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-close]');
      if (closeBtn) {
        closeModal(closeBtn.dataset.close);
        return;
      }
      // Click on backdrop closes
      if (e.target.classList && e.target.classList.contains('modal')) {
        // passwordUnlockModal を backdrop で閉じた場合も snapshot 比較 + reload を走らせる。
        // (data-close 経由ではなくこのパスを通る場合、 別途定義の handlePasswordModalClose
        // ハンドラには到達しないので、 ここで明示的に呼ぶ)
        if (e.target.id === 'passwordUnlockModal' && typeof handlePasswordModalClose === 'function') {
          handlePasswordModalClose();
        }
        e.target.hidden = true;
      }
    });

    // ===== Player profile (local-only, used by games for names/scores) =====
    (function () {
      const PROFILE_KEY = 'pono_player_profile_v1';
      const RANDOM_NAMES = ['ポノ', 'そら', 'はな', 'ゆう', 'まる', 'ココ', 'ミミ', 'ルル', 'ナナ', 'トト', 'モモ', 'ララ'];
      const profileModal = document.getElementById('profileModal');
      const profileForm = document.getElementById('profileForm');
      const profileNameInput = document.getElementById('profileNameInput');
      const profileRandomBtn = document.getElementById('profileRandomBtn');
      const profileAgeSelect = document.getElementById('profileAgeSelect');
      const profileGenderGroup = document.getElementById('profileGenderGroup');
      const settingsProfileBtn = document.getElementById('settingsProfileBtn');
      const settingsProfileSub = document.getElementById('settingsProfileSub');
      const profileHomeBtn = document.getElementById('profileHomeBtn');
      const profileHomeAvatar = document.getElementById('profileHomeAvatar');
      const profileHomeName = document.getElementById('profileHomeName');
      const profileHomeSub = document.getElementById('profileHomeSub');
      const profileHomeCount = document.getElementById('profileHomeCount');
      const profileHubModal = document.getElementById('profileHubModal');
      const profileHubAvatar = document.getElementById('profileHubAvatar');
      const profileHubName = document.getElementById('profileHubName');
      const profileHubMeta = document.getElementById('profileHubMeta');
      const profileHubEditBtn = document.getElementById('profileHubEditBtn');
      const profileHubMainPanel = document.getElementById('profileHubMainPanel');
      const profileAvatarEditBtn = document.getElementById('profileAvatarEditBtn');
      const profileAchievementsBtn = document.getElementById('profileAchievementsBtn');
      const profileHubDoneCount = document.getElementById('profileHubDoneCount');
      const profileHubBestPct = document.getElementById('profileHubBestPct');
      const profileHubNextCount = document.getElementById('profileHubNextCount');
      const profileAvatarPanel = document.getElementById('profileAvatarPanel');
      const profileAvatarBackBtn = document.getElementById('profileAvatarBackBtn');
      const profileAvatarPreview = document.getElementById('profileAvatarPreview');
      const profileAvatarPreviewName = document.getElementById('profileAvatarPreviewName');
      const profileAvatarControls = document.getElementById('profileAvatarControls');
      const profileAvatarDoneBtn = document.getElementById('profileAvatarDoneBtn');
      const profileAchievementsPanel = document.getElementById('profileAchievementsPanel');
      const profileAchievementsBackBtn = document.getElementById('profileAchievementsBackBtn');
      const profileDetailDoneCount = document.getElementById('profileDetailDoneCount');
      const profileDetailTotalCount = document.getElementById('profileDetailTotalCount');
      const profileDetailNextCount = document.getElementById('profileDetailNextCount');
      const profileGoalList = document.getElementById('profileGoalList');
      const profileHubEmpty = document.getElementById('profileHubEmpty');
      const STATS_KEY = 'pono_stats';
      const ACHIEVEMENTS_KEY = 'pono_achievements';
      const PROFILE_GOALS = [
        { id: 'first_profile', group: 'profile', groupLabel: 'プロフィール', title: 'なまえを きめた', stat: 'profile_set', target: 1, profile: true },
        { id: 'first_quizland', group: 'quizland', groupLabel: 'なぞなぞ', title: 'クイズ 1もん', stat: 'quizland_correct', target: 1 },
        { id: 'quizland_5', group: 'quizland', groupLabel: 'なぞなぞ', title: 'クイズ 5もん', stat: 'quizland_correct', target: 5 },
        { id: 'quizland_15', group: 'quizland', groupLabel: 'なぞなぞ', title: 'クイズ 15もん', stat: 'quizland_correct', target: 15 },
        { id: 'quizland_30', group: 'quizland', groupLabel: 'なぞなぞ', title: 'クイズ 30もん', stat: 'quizland_correct', target: 30 },
        { id: 'first_maze', group: 'maze', groupLabel: 'めいろ', title: 'めいろ 1こ', stat: 'maze_clears', target: 1 },
        { id: 'maze_4', group: 'maze', groupLabel: 'めいろ', title: 'めいろ 4こ', stat: 'maze_clears', target: 4 },
        { id: 'maze_6', group: 'maze', groupLabel: 'めいろ', title: 'めいろ 6こ', stat: 'maze_clears', target: 6 },
        { id: 'first_oto', group: 'oto', groupLabel: 'おと', title: 'おと 1かい', stat: 'oto_taps', target: 1 },
        { id: 'oto_50', group: 'oto', groupLabel: 'おと', title: 'おと 50かい', stat: 'oto_taps', target: 50 },
        { id: 'oto_300', group: 'oto', groupLabel: 'おと', title: 'おと 300かい', stat: 'oto_taps', target: 300 },
        { id: 'first_bento', group: 'bento', groupLabel: 'おべんとう', title: 'おべんとう 1かい', stat: 'bento_complete', target: 1 },
        { id: 'bento_3', group: 'bento', groupLabel: 'おべんとう', title: 'おべんとう 3かい', stat: 'bento_complete', target: 3 },
        { id: 'bento_10', group: 'bento', groupLabel: 'おべんとう', title: 'おべんとう 10かい', stat: 'bento_complete', target: 10 },
        { id: 'first_puzzle', group: 'puzzle', groupLabel: 'パズル', title: 'パズル 1こ', stat: 'puzzle_clears', target: 1 },
        { id: 'puzzle_3', group: 'puzzle', groupLabel: 'パズル', title: 'パズル 3こ', stat: 'puzzle_clears', target: 3 },
        { id: 'puzzle_20', group: 'puzzle', groupLabel: 'パズル', title: 'パズル 20こ', stat: 'puzzle_clears', target: 20 }
      ];
      const AVATAR_PRESETS = [
        { id: 'pono_kko', name: 'ポノっこ', kind: 'human', bg: '#fff1c4', skin: '#f2bf8a', hair: '#6b4226', shirt: '#6fc2d4', accent: '#f2a65a', hairStyle: 'round', markShape: 'leaf' },
        { id: 'leaf_kko', name: 'はっぱっこ', kind: 'human', bg: '#dff7ec', skin: '#d99b6b', hair: '#2f4a33', shirt: '#f5c84c', accent: '#75b86a', hairStyle: 'long', markShape: 'leaf' },
        { id: 'sky_kko', name: 'そらっこ', kind: 'human', bg: '#dff4ff', skin: '#f0c7a5', hair: '#365b83', shirt: '#8bd17c', accent: '#9b72d0', hairStyle: 'short', markShape: 'dot' },
        { id: 'berry_kko', name: 'いちごっこ', kind: 'human', bg: '#ffe4ed', skin: '#f0c7a5', hair: '#8b5835', shirt: '#ff8b8b', accent: '#ff7aa2', hairStyle: 'cap', markShape: 'ribbon' },
        { id: 'acorn_kko', name: 'どんぐりっこ', kind: 'human', bg: '#fff1c4', skin: '#f0c7a5', hair: '#8b5835', shirt: '#f2c27b', accent: '#75b86a', hairStyle: 'cap', markShape: 'leaf' },
        { id: 'umi_kko', name: 'うみっこ', kind: 'human', bg: '#dff4ff', skin: '#f0c7a5', hair: '#3fa9bd', shirt: '#6fc2d4', accent: '#58d8ff', hairStyle: 'short', markShape: 'dot' },
        { id: 'yuki_kko', name: 'ゆきっこ', kind: 'human', bg: '#eef8ff', skin: '#f5efe3', hair: '#d7e5ec', shirt: '#b9d8e8', accent: '#58d8ff', hairStyle: 'cap', markShape: 'dot' },
        { id: 'hoshi_kko', name: 'ほしっこ', kind: 'human', bg: '#ede6ff', skin: '#f0c7a5', hair: '#8b5835', shirt: '#f5c84c', accent: '#ffd84d', hairStyle: 'short', markShape: 'star' },
        { id: 'hana_kko', name: 'おはなっこ', kind: 'human', bg: '#fff0d8', skin: '#f0c7a5', hair: '#8b5835', shirt: '#f29f58', accent: '#ffd84d', hairStyle: 'long', markShape: 'leaf' },
        { id: 'niji_kko', name: 'にじっこ', kind: 'human', bg: '#ffe4ed', skin: '#f0c7a5', hair: '#9b72d0', shirt: '#ff8b8b', accent: '#75b86a', hairStyle: 'long', markShape: 'ribbon' },
        { id: 'kinoko_kko', name: 'きのこっこ', kind: 'human', bg: '#fff0d8', skin: '#f0c7a5', hair: '#f3c26e', shirt: '#f1d0aa', accent: '#d94a4a', hairStyle: 'cap', markShape: 'dot' },
        { id: 'lantern_kko', name: 'ランタンっこ', kind: 'human', bg: '#fff4c6', skin: '#f0c7a5', hair: '#6b4226', shirt: '#f29f58', accent: '#ffd84d', hairStyle: 'cap', markShape: 'star' },
        { id: 'tsuki_kko', name: 'つきっこ', kind: 'human', bg: '#ede6ff', skin: '#f0c7a5', hair: '#8b5835', shirt: '#365b83', accent: '#ffd84d', hairStyle: 'cap', markShape: 'star' },
        { id: 'mori_kko', name: 'もりっこ', kind: 'human', bg: '#dff7ec', skin: '#d99b6b', hair: '#6b4226', shirt: '#75b86a', accent: '#8a6230', hairStyle: 'cap', markShape: 'leaf' },
        { id: 'pudding_kko', name: 'プリンっこ', kind: 'human', bg: '#fff1c4', skin: '#f0c7a5', hair: '#6b4226', shirt: '#f5c84c', accent: '#8a6230', hairStyle: 'cap', markShape: 'dot' },
        { id: 'oto_kko', name: 'おとっこ', kind: 'human', bg: '#dff4ff', skin: '#f0c7a5', hair: '#6b4226', shirt: '#6fc2d4', accent: '#ffd84d', hairStyle: 'short', markShape: 'star' },
        { id: 'hon_kko', name: 'ほんっこ', kind: 'human', bg: '#dff7ec', skin: '#f0c7a5', hair: '#8b5835', shirt: '#75b86a', accent: '#f2a65a', hairStyle: 'long', markShape: 'leaf' },
        { id: 'puzzle_kko', name: 'パズルっこ', kind: 'human', bg: '#fff0d8', skin: '#f0c7a5', hair: '#6b4226', shirt: '#f29f58', accent: '#58d8ff', hairStyle: 'short', markShape: 'square' },
        { id: 'garden_kko', name: 'にわっこ', kind: 'human', bg: '#dff7ec', skin: '#f0c7a5', hair: '#8b5835', shirt: '#6fc2d4', accent: '#ffd84d', hairStyle: 'long', markShape: 'leaf' },
        { id: 'cocoa_kko', name: 'ココアっこ', kind: 'human', bg: '#fff0d8', skin: '#d99b6b', hair: '#6b4226', shirt: '#8a6230', accent: '#f5efe3', hairStyle: 'cap', markShape: 'dot' },
        { id: 'fox', name: 'きつね', kind: 'fox', bg: '#fff0d8', skin: '#f3b56d', hair: '#c8682a', shirt: '#6fc2d4', accent: '#fff1c4', hairStyle: 'round', markShape: 'leaf' },
        { id: 'rabbit', name: 'うさぎ', kind: 'rabbit', bg: '#ffeaf1', skin: '#f7d5c9', hair: '#f3a6c3', shirt: '#f5c84c', accent: '#ff7aa2', hairStyle: 'round', markShape: 'dot' },
        { id: 'bear', name: 'くま', kind: 'bear', bg: '#fff1c4', skin: '#c98245', hair: '#7a4a24', shirt: '#8bd17c', accent: '#f2a65a', hairStyle: 'round', markShape: 'leaf' },
        { id: 'cat', name: 'ねこ', kind: 'cat', bg: '#dff4ff', skin: '#ead0a0', hair: '#5f5a50', shirt: '#ff8b8b', accent: '#ffd84d', hairStyle: 'round', markShape: 'ribbon' },
        { id: 'squirrel', name: 'りす', kind: 'squirrel', bg: '#fff4d8', skin: '#d99b6b', hair: '#9b5b29', shirt: '#6fc2d4', accent: '#75b86a', hairStyle: 'round', markShape: 'leaf' },
        { id: 'owl', name: 'ふくろう', kind: 'owl', bg: '#ede6cf', skin: '#d7b47c', hair: '#8a6230', shirt: '#9b72d0', accent: '#ffd84d', hairStyle: 'round', markShape: 'dot' },
        { id: 'tanuki', name: 'たぬき', kind: 'tanuki', bg: '#e8f4e2', skin: '#bd8a63', hair: '#59432e', shirt: '#f5c84c', accent: '#75b86a', hairStyle: 'round', markShape: 'square' },
        { id: 'polar', name: 'しろくま', kind: 'bear', bg: '#e8f8ff', skin: '#f5efe3', hair: '#d7e5ec', shirt: '#6fc2d4', accent: '#365b83', hairStyle: 'round', markShape: 'dot' },
        { id: 'robot_blue', name: 'ロボあお', kind: 'robot', bg: '#dff4ff', skin: '#b9d8e8', hair: '#365b83', shirt: '#6fc2d4', accent: '#58d8ff', hairStyle: 'round', markShape: 'square' },
        { id: 'robot_yellow', name: 'ロボきいろ', kind: 'robot', bg: '#fff4c6', skin: '#e7d6a4', hair: '#8a6230', shirt: '#f5c84c', accent: '#ffcf4a', hairStyle: 'round', markShape: 'dot' },
        { id: 'star_mon', name: 'ほしモン', kind: 'monster', bg: '#efe7ff', skin: '#9b72d0', hair: '#6d4db0', shirt: '#f5c84c', accent: '#ffd84d', hairStyle: 'round', markShape: 'dot' },
        { id: 'leaf_mon', name: 'はっぱモン', kind: 'monster', bg: '#dff7ec', skin: '#75b86a', hair: '#2f4a33', shirt: '#8bd17c', accent: '#fff1c4', hairStyle: 'round', markShape: 'leaf' },
        { id: 'moko_mon', name: 'もこモン', kind: 'monster', bg: '#ffe4ed', skin: '#ff9ec1', hair: '#d05f90', shirt: '#9b72d0', accent: '#fff1c4', hairStyle: 'round', markShape: 'ribbon' },
        { id: 'mushroom', name: 'きのこ', kind: 'mushroom', bg: '#fff0d8', skin: '#f1d0aa', hair: '#d94a4a', shirt: '#f5c84c', accent: '#fff1c4', hairStyle: 'round', markShape: 'dot' },
        { id: 'acorn', name: 'どんぐり', kind: 'acorn', bg: '#fff1c4', skin: '#c98562', hair: '#6b4226', shirt: '#8bd17c', accent: '#f2a65a', hairStyle: 'round', markShape: 'leaf' },
        { id: 'water', name: 'みずのこ', kind: 'monster', bg: '#dff4ff', skin: '#6fc2d4', hair: '#365b83', shirt: '#9b72d0', accent: '#fff1c4', hairStyle: 'round', markShape: 'dot' },
        { id: 'snow', name: 'ゆきのこ', kind: 'monster', bg: '#eef8ff', skin: '#f5efe3', hair: '#b9d8e8', shirt: '#6fc2d4', accent: '#58d8ff', hairStyle: 'round', markShape: 'dot' },
        { id: 'lantern', name: 'ランタン', kind: 'robot', bg: '#fff4c6', skin: '#f3c26e', hair: '#7a4a24', shirt: '#f29f58', accent: '#ffd84d', hairStyle: 'round', markShape: 'leaf' },
        { id: 'moon', name: 'つきのこ', kind: 'monster', bg: '#ede6ff', skin: '#c7b5ee', hair: '#3f2d68', shirt: '#9b72d0', accent: '#ffd84d', hairStyle: 'round', markShape: 'ribbon' },
        { id: 'puka_mon', name: 'もりドラ', kind: 'monster', bg: '#dff7ec', skin: '#75b86a', hair: '#2f4a33', shirt: '#8bd17c', accent: '#ffd84d', hairStyle: 'round', markShape: 'leaf' }
      ];
      const AVATAR_DEFAULT_ID = 'pono_kko';
      const AVATAR_PART_DOM = ['tail', 'leg-left', 'leg-right', 'shoe-left', 'shoe-right', 'arm-left', 'arm-right', 'body', 'face', 'eyes', 'mouth', 'hair', 'ears', 'mark'];
      const AVATAR_PART_OPTIONS = {
        bodyType: [
          { id: 'balanced', label: 'ふつう' },
          { id: 'small', label: 'ちいさめ' },
          { id: 'round', label: 'まるめ' },
          { id: 'tall', label: 'すらり' },
          { id: 'robot', label: 'ロボがた' },
          { id: 'monster', label: 'モンがた' }
        ],
        kind: [
          { id: 'human', label: 'ひと' },
          { id: 'fox', label: 'きつね' },
          { id: 'rabbit', label: 'うさぎ' },
          { id: 'cat', label: 'ねこ' },
          { id: 'bear', label: 'くま' },
          { id: 'robot', label: 'ロボ' },
          { id: 'monster', label: 'モン' }
        ],
        hairStyle: [
          { id: 'round', label: 'ふんわり' },
          { id: 'short', label: 'みじかめ' },
          { id: 'long', label: 'ながめ' },
          { id: 'side', label: 'よこながし' },
          { id: 'cap', label: 'ぼうし' },
          { id: 'spike', label: 'つんつん' },
          { id: 'none', label: 'なし' }
        ],
        eyes: [
          { id: 'dot', label: 'まるめ' },
          { id: 'smile', label: 'にこめ' },
          { id: 'star', label: 'きらり' },
          { id: 'sleepy', label: 'すやすや' }
        ],
        mouth: [
          { id: 'smile', label: 'にこ' },
          { id: 'open', label: 'わらい' },
          { id: 'flat', label: 'むー' }
        ],
        outfit: [
          { id: 'tee', label: 'シャツ' },
          { id: 'hoodie', label: 'パーカー' },
          { id: 'dress', label: 'ワンピ' },
          { id: 'overall', label: 'つなぎ' }
        ],
        bottomStyle: [
          { id: 'pants', label: 'ズボン' },
          { id: 'shorts', label: 'みじかい' },
          { id: 'skirt', label: 'スカート' }
        ],
        shoesStyle: [
          { id: 'shoes', label: 'くつ' },
          { id: 'boots', label: 'ブーツ' },
          { id: 'bare', label: 'はだし' }
        ],
        tailStyle: [
          { id: 'none', label: 'なし' },
          { id: 'fluffy', label: 'ふさふさ' },
          { id: 'round', label: 'まる' },
          { id: 'long', label: 'ながい' }
        ],
        markShape: [
          { id: 'none', label: 'なし' },
          { id: 'leaf', label: 'はっぱ' },
          { id: 'dot', label: 'まる' },
          { id: 'ribbon', label: 'リボン' },
          { id: 'star', label: 'ほし' },
          { id: 'square', label: 'しかく' },
          { id: 'heart', label: 'ハート' },
          { id: 'sparkle', label: 'きらり' }
        ]
      };
      const AVATAR_PART_GROUPS = [
        { key: 'bodyType', title: 'からだ' },
        { key: 'kind', title: 'なかま' },
        { key: 'hairStyle', title: 'かみ・みみ' },
        { key: 'eyes', title: 'め' },
        { key: 'mouth', title: 'くち' },
        { key: 'outfit', title: 'うわぎ' },
        { key: 'bottomStyle', title: 'した' },
        { key: 'shoesStyle', title: 'くつ' },
        { key: 'tailStyle', title: 'しっぽ' },
        { key: 'markShape', title: 'しるし' }
      ];
      const AVATAR_COLOR_OPTIONS = {
        skin: [
          { id: '#f2bf8a', label: 'もも' },
          { id: '#d99b6b', label: 'こむぎ' },
          { id: '#bd8a63', label: 'ちゃ' },
          { id: '#f5efe3', label: 'しろ' },
          { id: '#9bd7d0', label: 'みず' },
          { id: '#c7b5ee', label: 'ゆめ' }
        ],
        hair: [
          { id: '#6b4226', label: 'ちゃ' },
          { id: '#2f4a33', label: 'みどり' },
          { id: '#365b83', label: 'あお' },
          { id: '#8b5835', label: 'こげ' },
          { id: '#d05f90', label: 'ピンク' },
          { id: '#f3c26e', label: 'きいろ' }
        ],
        shirt: [
          { id: '#6fc2d4', label: 'そら' },
          { id: '#8bd17c', label: 'はっぱ' },
          { id: '#f5c84c', label: 'たんぽぽ' },
          { id: '#ff8b8b', label: 'あか' },
          { id: '#9b72d0', label: 'むらさき' },
          { id: '#f29f58', label: 'オレンジ' }
        ],
        bottom: [
          { id: '#6b8bd6', label: 'あお' },
          { id: '#7fb46b', label: 'みどり' },
          { id: '#8a6230', label: 'ちゃ' },
          { id: '#d978a0', label: 'ピンク' },
          { id: '#5f5a50', label: 'くろ' },
          { id: '#f5c84c', label: 'きいろ' }
        ],
        shoes: [
          { id: '#7a4a24', label: 'ちゃ' },
          { id: '#5f5a50', label: 'くろ' },
          { id: '#ff8b8b', label: 'あか' },
          { id: '#365b83', label: 'あお' },
          { id: '#f5efe3', label: 'しろ' },
          { id: '#f29f58', label: 'オレンジ' }
        ],
        accent: [
          { id: '#f2a65a', label: 'きのみ' },
          { id: '#75b86a', label: 'はっぱ' },
          { id: '#ffd84d', label: 'ほし' },
          { id: '#ff7aa2', label: 'リボン' },
          { id: '#58d8ff', label: 'ひかり' },
          { id: '#9b72d0', label: 'ゆめ' }
        ],
        bg: [
          { id: '#fff1c4', label: 'ひだまり' },
          { id: '#dff7ec', label: 'もり' },
          { id: '#dff4ff', label: 'そら' },
          { id: '#ffe4ed', label: 'はな' },
          { id: '#ede6ff', label: 'ゆめ' },
          { id: '#fff0d8', label: 'きのこ' }
        ]
      };
      const AVATAR_COLOR_GROUPS = [
        { key: 'skin', title: 'からだのいろ' },
        { key: 'hair', title: 'かみのいろ' },
        { key: 'shirt', title: 'うわぎのいろ' },
        { key: 'bottom', title: 'したのいろ' },
        { key: 'shoes', title: 'くつのいろ' },
        { key: 'accent', title: 'しるしのいろ' },
        { key: 'bg', title: 'まわりのいろ' }
      ];
      let profileGender = 'none';
      let openHubAfterProfileSave = false;
      let avatarDraft = null;

      function sanitizeProfileName(name) {
        const text = String(name || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
        return Array.from(text || 'ポノ').slice(0, 8).join('');
      }
      function normalizeGender(value) {
        return value === 'girl' || value === 'boy' ? value : 'none';
      }
      function normalizeAge(value) {
        const age = parseInt(value, 10);
        return age >= 2 && age <= 12 ? String(age) : '';
      }
      function avatarPresetById(id) {
        return AVATAR_PRESETS.find((preset) => preset.id === id) || AVATAR_PRESETS[0];
      }
      function avatarPresetImage(id) {
        const preset = avatarPresetById(id || AVATAR_DEFAULT_ID);
        return 'assets/images/avatars/avatar_' + preset.id + '_20260706.webp';
      }
      function avatarColor(value, fallback) {
        return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
      }
      function avatarOptionValue(key, value, fallback) {
        const list = AVATAR_PART_OPTIONS[key] || [];
        return list.some((option) => option.id === value) ? value : fallback;
      }
      function avatarColorFromList(key, value, fallback) {
        const color = avatarColor(value, fallback);
        const list = AVATAR_COLOR_OPTIONS[key] || [];
        return list.some((option) => option.id.toLowerCase() === color.toLowerCase()) ? color : fallback;
      }
      function profileSeed(profile) {
        const source = String(((profile && profile.name) || 'ポノ') + ((profile && profile.age) || '') + ((profile && profile.gender) || 'none'));
        let seed = 0;
        for (const ch of source) seed = (seed + ch.charCodeAt(0) * 17) % 9973;
        return seed;
      }
      function presetParts(preset) {
        const id = preset && preset.id;
        const kind = (preset && preset.kind) || 'human';
        const animalTail = kind === 'fox' || kind === 'cat' || kind === 'squirrel' || kind === 'tanuki';
        const bodyType = kind === 'robot'
          ? 'robot'
          : (kind === 'monster'
            ? 'monster'
            : (kind === 'rabbit'
              ? 'small'
              : (kind === 'bear' || id === 'moko_mon' ? 'round' : 'balanced')));
        return {
          bodyType: bodyType,
          kind: kind,
          hairStyle: (preset && preset.hairStyle) || 'round',
          eyes: kind === 'monster' ? 'star' : 'dot',
          mouth: 'smile',
          outfit: kind === 'robot' ? 'overall' : (id === 'berry_kko' || id === 'moko_mon' || id === 'moon' ? 'dress' : 'tee'),
          bottomStyle: id === 'berry_kko' || id === 'moko_mon' || id === 'moon' ? 'skirt' : 'pants',
          shoesStyle: kind === 'monster' || kind === 'mushroom' || kind === 'acorn' ? 'bare' : (kind === 'robot' ? 'boots' : 'shoes'),
          tailStyle: animalTail ? 'fluffy' : (kind === 'rabbit' || kind === 'bear' ? 'round' : 'none'),
          markShape: (preset && preset.markShape) || 'leaf'
        };
      }
      function avatarFromPreset(id) {
        const preset = avatarPresetById(id || AVATAR_DEFAULT_ID);
        const parts = presetParts(preset);
        return {
          custom: true,
          preset: preset.id,
          name: preset.name,
          image: avatarPresetImage(preset.id),
          bodyType: avatarOptionValue('bodyType', parts.bodyType, 'balanced'),
          kind: avatarOptionValue('kind', parts.kind, 'human'),
          hairStyle: avatarOptionValue('hairStyle', parts.hairStyle, 'round'),
          eyes: avatarOptionValue('eyes', parts.eyes, 'dot'),
          mouth: avatarOptionValue('mouth', parts.mouth, 'smile'),
          outfit: avatarOptionValue('outfit', parts.outfit, 'tee'),
          bottomStyle: avatarOptionValue('bottomStyle', parts.bottomStyle, 'pants'),
          shoesStyle: avatarOptionValue('shoesStyle', parts.shoesStyle, 'shoes'),
          tailStyle: avatarOptionValue('tailStyle', parts.tailStyle, 'none'),
          markShape: avatarOptionValue('markShape', parts.markShape, 'leaf'),
          bg: avatarColor(preset.bg, '#fff1c4'),
          skin: avatarColor(preset.skin, '#f2bf8a'),
          hair: avatarColor(preset.hair, '#6b4226'),
          shirt: avatarColor(preset.shirt, '#6fc2d4'),
          bottom: avatarColor(preset.shirt, '#6b8bd6'),
          shoes: parts.shoesStyle === 'bare' ? avatarColor(preset.skin, '#f2bf8a') : '#7a4a24',
          accent: avatarColor(preset.accent, '#f2a65a')
        };
      }
      function defaultAvatarForProfile(profile) {
        const seed = profileSeed(profile);
        const index = AVATAR_PRESETS.length ? seed % AVATAR_PRESETS.length : 0;
        return avatarFromPreset((AVATAR_PRESETS[index] || AVATAR_PRESETS[0]).id);
      }
      function normalizeAvatar(avatar, profile) {
        if (!avatar || typeof avatar !== 'object') {
          return defaultAvatarForProfile(profile || {});
        }
        const presetId = avatarPresetById(avatar.preset).id === avatar.preset ? avatar.preset : AVATAR_DEFAULT_ID;
        return avatarFromPreset(presetId);
      }
      function cloneAvatar(avatar) {
        return Object.assign({}, normalizeAvatar(avatar, {}));
      }
      function defaultProfile() {
        const profile = { name: 'ポノ', gender: 'none', age: '' };
        profile.avatar = normalizeAvatar(null, profile);
        return profile;
      }
      function loadProfile() {
        try {
          const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
          if (parsed && typeof parsed === 'object') {
            const profile = {
              name: sanitizeProfileName(parsed.name),
              gender: normalizeGender(parsed.gender),
              age: normalizeAge(parsed.age)
            };
            profile.avatar = normalizeAvatar(parsed.avatar, profile);
            return profile;
          }
        } catch (_) {}
        return defaultProfile();
      }
      function hasProfile() {
        try { return !!localStorage.getItem(PROFILE_KEY); } catch (_) { return false; }
      }
      function readLocalJSON(key, fallback) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || 'null');
          return parsed && typeof parsed === 'object' ? parsed : fallback;
        } catch (_) {
          return fallback;
        }
      }
      function writeLocalJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
      }
      function markProfileStat() {
        const stats = readLocalJSON(STATS_KEY, {});
        if (Number(stats.profile_set || 0) < 1) {
          stats.profile_set = 1;
          writeLocalJSON(STATS_KEY, stats);
          try {
            if (typeof window.checkAchievements === 'function') window.checkAchievements();
          } catch (_) {}
        }
      }
      function ensureAvatarPieces(el) {
        if (!el) return;
        AVATAR_PART_DOM.forEach((part) => {
          if (el.querySelector('.pono-mini-avatar__' + part)) return;
          const piece = document.createElement('span');
          piece.className = 'pono-mini-avatar__' + part;
          const body = el.querySelector('.pono-mini-avatar__body');
          if (body && ['tail', 'leg-left', 'leg-right', 'shoe-left', 'shoe-right', 'arm-left', 'arm-right'].includes(part)) {
            el.insertBefore(piece, body);
          } else {
            el.appendChild(piece);
          }
        });
      }
      function applyAvatarToElement(el, avatarOrProfile) {
        if (!el) return;
        ensureAvatarPieces(el);
        const isProfile = !!(avatarOrProfile && avatarOrProfile.avatar);
        const avatar = normalizeAvatar(isProfile ? avatarOrProfile.avatar : avatarOrProfile, isProfile ? avatarOrProfile : {});
        el.dataset.avatarMode = 'full';
        el.dataset.variant = 'custom';
        el.dataset.bodyType = avatar.bodyType || 'balanced';
        el.dataset.kind = avatar.kind || 'human';
        el.dataset.hairStyle = avatar.hairStyle;
        el.dataset.eyes = avatar.eyes;
        el.dataset.mouth = avatar.mouth;
        el.dataset.outfit = avatar.outfit;
        el.dataset.bottomStyle = avatar.bottomStyle;
        el.dataset.shoesStyle = avatar.shoesStyle;
        el.dataset.tailStyle = avatar.tailStyle;
        el.dataset.markShape = avatar.markShape;
        if (avatar.image) {
          el.dataset.avatarImage = '1';
          el.style.setProperty('--av-img', 'url("' + avatar.image + '")');
        } else {
          delete el.dataset.avatarImage;
          el.style.removeProperty('--av-img');
        }
        el.style.setProperty('--av-bg', avatar.bg);
        el.style.setProperty('--av-skin', avatar.skin);
        el.style.setProperty('--av-hair', avatar.hair);
        el.style.setProperty('--av-shirt', avatar.shirt);
        el.style.setProperty('--av-bottom', avatar.bottom);
        el.style.setProperty('--av-shoes', avatar.shoes);
        el.style.setProperty('--av-accent', avatar.accent);
      }
      function genderLabel(value) {
        if (value === 'girl') return 'おんなのこ';
        if (value === 'boy') return 'おとこのこ';
        return 'えらばない';
      }
      function ageLabel(value) {
        return value ? value + 'さい' : 'えらばない';
      }
      function profileMetaText(profile) {
        return 'ねんれい ' + ageLabel(profile && profile.age) + ' ・ せいべつ ' + genderLabel(profile && profile.gender);
      }
      function profileGoalRows() {
        const stats = readLocalJSON(STATS_KEY, {});
        const unlocked = readLocalJSON(ACHIEVEMENTS_KEY, {});
        return PROFILE_GOALS.map((goal) => {
          const target = Math.max(1, Number(goal.target) || 1);
          let current = goal.profile ? (hasProfile() ? 1 : 0) : Math.max(0, Number(stats[goal.stat] || 0));
          const doneByAchievement = !!(unlocked && unlocked[goal.id]);
          if (doneByAchievement) current = Math.max(current, target);
          const capped = Math.min(current, target);
          const pct = Math.max(0, Math.min(100, Math.round((capped / target) * 100)));
          return {
            goal: goal,
            current: current,
            target: target,
            pct: pct,
            done: doneByAchievement || current >= target
          };
        });
      }
      function profileProgressSummary() {
        const rows = profileGoalRows();
        const done = rows.filter((row) => row.done).length;
        const best = rows.length ? Math.max.apply(null, rows.map((row) => row.pct)) : 0;
        const next = rows.filter((row) => !row.done && row.pct >= 60).length;
        const hasGameProgress = rows.some((row) => !row.goal.profile && row.current > 0);
        return { rows: rows, done: done, total: rows.length, best: best, next: next, hasGameProgress: hasGameProgress };
      }
      function updateProfileHome(profile) {
        profile = profile || loadProfile();
        const summary = profileProgressSummary();
        if (profileHomeName) profileHomeName.textContent = 'プロフィール';
        if (profileHomeSub) profileHomeSub.textContent = hasProfile() ? (profile.name || 'ポノ') : 'つくる';
        if (profileHomeCount) profileHomeCount.textContent = summary.done + 'こ';
        if (profileHomeBtn) {
          profileHomeBtn.setAttribute(
            'aria-label',
            hasProfile()
              ? 'プロフィール。できたこと ' + summary.done + 'こ'
              : 'プロフィールを つくる'
          );
        }
        applyAvatarToElement(profileHomeAvatar, profile);
      }
      function showProfilePanel(name) {
        if (profileHubMainPanel) profileHubMainPanel.hidden = name !== 'main';
        if (profileAvatarPanel) profileAvatarPanel.hidden = name !== 'avatar';
        if (profileAchievementsPanel) profileAchievementsPanel.hidden = name !== 'achievements';
      }
      function createGoalRow(row) {
        const item = document.createElement('div');
        item.className = 'profile-goal-row' + (row.done ? ' is-done' : '');

        const icon = document.createElement('span');
        icon.className = 'profile-goal-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = row.done ? '✓' : '○';

        const main = document.createElement('span');
        main.className = 'profile-goal-main';

        const title = document.createElement('span');
        title.className = 'profile-goal-title';
        title.textContent = row.goal.title;

        const bar = document.createElement('span');
        bar.className = 'profile-goal-bar';
        const fill = document.createElement('span');
        fill.style.setProperty('--goal-pct', row.pct + '%');
        bar.appendChild(fill);

        const count = document.createElement('span');
        count.className = 'profile-goal-count';
        count.textContent = Math.min(Math.floor(row.current), row.target) + '/' + row.target;

        main.appendChild(title);
        main.appendChild(bar);
        item.appendChild(icon);
        item.appendChild(main);
        item.appendChild(count);
        return item;
      }
      function renderAchievementDetails() {
        const summary = profileProgressSummary();
        if (profileDetailDoneCount) profileDetailDoneCount.textContent = String(summary.done);
        if (profileDetailTotalCount) profileDetailTotalCount.textContent = String(summary.total);
        if (profileDetailNextCount) profileDetailNextCount.textContent = String(summary.next);
        if (!profileGoalList) return;

        profileGoalList.textContent = '';
        const groups = [];
        const groupMap = {};
        summary.rows.forEach((row) => {
          const key = row.goal.group || 'other';
          if (!groupMap[key]) {
            groupMap[key] = {
              label: row.goal.groupLabel || 'そのほか',
              rows: []
            };
            groups.push(groupMap[key]);
          }
          groupMap[key].rows.push(row);
        });

        groups.forEach((group) => {
          const section = document.createElement('section');
          section.className = 'profile-goal-section';

          const title = document.createElement('h4');
          title.className = 'profile-goal-section__title';
          title.textContent = group.label;
          section.appendChild(title);

          group.rows.forEach((row) => {
            section.appendChild(createGoalRow(row));
          });
          profileGoalList.appendChild(section);
        });
      }
      function avatarButtonLabel(key, value) {
        const list = AVATAR_PART_OPTIONS[key] || [];
        const item = list.find((option) => option.id === value);
        return item ? item.label : String(value || '');
      }
      function createAvatarPresetButton(preset) {
        const avatar = avatarFromPreset(preset && preset.id);
        const btn = document.createElement('button');
        btn.className = 'profile-avatar-preset';
        btn.type = 'button';
        btn.dataset.avatarPreset = avatar.preset;
        btn.setAttribute('aria-pressed', avatarDraft && avatarDraft.preset === avatar.preset ? 'true' : 'false');
        btn.classList.toggle('is-active', !!avatarDraft && avatarDraft.preset === avatar.preset);

        const thumb = document.createElement('span');
        thumb.className = 'pono-mini-avatar';
        thumb.setAttribute('aria-hidden', 'true');
        applyAvatarToElement(thumb, avatar);

        const name = document.createElement('span');
        name.className = 'profile-avatar-preset__name';
        name.textContent = avatar.name || 'すがた';

        btn.appendChild(thumb);
        btn.appendChild(name);
        return btn;
      }
      function createAvatarChoiceButton(group, option) {
        const btn = document.createElement('button');
        btn.className = 'avatar-choice';
        btn.type = 'button';
        btn.dataset.avatarPart = group.key;
        btn.dataset.avatarValue = option.id;
        btn.setAttribute('aria-pressed', avatarDraft && avatarDraft[group.key] === option.id ? 'true' : 'false');
        btn.classList.toggle('is-active', !!avatarDraft && avatarDraft[group.key] === option.id);
        btn.textContent = option.label;
        return btn;
      }
      function createAvatarSwatchButton(group, option) {
        const btn = document.createElement('button');
        btn.className = 'avatar-swatch';
        btn.type = 'button';
        btn.dataset.avatarColorKey = group.key;
        btn.dataset.avatarColor = option.id;
        btn.style.setProperty('--swatch-color', option.id);
        btn.setAttribute('aria-label', group.title + ' ' + option.label);
        btn.setAttribute('aria-pressed', avatarDraft && String(avatarDraft[group.key]).toLowerCase() === option.id.toLowerCase() ? 'true' : 'false');
        btn.classList.toggle('is-active', !!avatarDraft && String(avatarDraft[group.key]).toLowerCase() === option.id.toLowerCase());
        btn.textContent = option.label;
        return btn;
      }
      function appendAvatarGroup(parent, titleText, rowClass) {
        const section = document.createElement('section');
        section.className = 'avatar-edit-group';
        const title = document.createElement('div');
        title.className = 'avatar-edit-group__title';
        title.textContent = titleText;
        const row = document.createElement('div');
        row.className = rowClass;
        section.appendChild(title);
        section.appendChild(row);
        parent.appendChild(section);
        return row;
      }
      function renderAvatarEditorControls() {
        if (!profileAvatarControls || !avatarDraft) return;
        profileAvatarControls.textContent = '';
        AVATAR_PRESETS.forEach((preset) => {
          profileAvatarControls.appendChild(createAvatarPresetButton(preset));
        });
      }
      function renderAvatarPreview() {
        if (profileAvatarPreview) applyAvatarToElement(profileAvatarPreview, avatarDraft);
        if (profileAvatarPreviewName) {
          profileAvatarPreviewName.textContent = avatarDraft && avatarDraft.name ? avatarDraft.name : 'じぶんの すがた';
        }
      }
      function renderAvatarBuilder() {
        const profile = loadProfile();
        avatarDraft = cloneAvatar(profile.avatar);
        renderAvatarPreview();
        renderAvatarEditorControls();
      }
      function setAvatarDraftPreset(id) {
        avatarDraft = avatarFromPreset(id || AVATAR_DEFAULT_ID);
        renderAvatarPreview();
        renderAvatarEditorControls();
      }
      function setAvatarDraftPart(key, value) {
        if (!avatarDraft || !AVATAR_PART_OPTIONS[key] || !AVATAR_PART_OPTIONS[key].some((option) => option.id === value)) return;
        avatarDraft[key] = value;
        avatarDraft.name = 'じぶんの すがた';
        renderAvatarPreview();
        renderAvatarEditorControls();
      }
      function setAvatarDraftColor(key, value) {
        if (!avatarDraft || !AVATAR_COLOR_OPTIONS[key] || !AVATAR_COLOR_OPTIONS[key].some((option) => option.id.toLowerCase() === String(value).toLowerCase())) return;
        avatarDraft[key] = value;
        avatarDraft.name = 'じぶんの すがた';
        renderAvatarPreview();
        renderAvatarEditorControls();
      }
      function saveAvatarDraft() {
        const profile = loadProfile();
        profile.avatar = cloneAvatar(avatarDraft || profile.avatar);
        saveProfile(profile);
        renderProfileHub();
        showProfilePanel('main');
      }
      function renderProfileHub() {
        const profile = loadProfile();
        const summary = profileProgressSummary();
        if (profileHubName) profileHubName.textContent = profile.name || 'ポノ';
        if (profileHubMeta) profileHubMeta.textContent = profileMetaText(profile);
        if (profileHubDoneCount) profileHubDoneCount.textContent = String(summary.done);
        if (profileHubBestPct) profileHubBestPct.textContent = summary.best + '%';
        if (profileHubNextCount) profileHubNextCount.textContent = String(summary.next);
        if (profileHubEmpty) profileHubEmpty.hidden = summary.hasGameProgress;
        applyAvatarToElement(profileHubAvatar, profile);
        updateProfileHome(profile);
      }
      function openProfileHub() {
        if (!hasProfile()) {
          openHubAfterProfileSave = true;
          openProfileModal();
          return;
        }
        renderProfileHub();
        showProfilePanel('main');
        openModal('profileHubModal');
      }
      function saveProfile(profile) {
        const previous = hasProfile() ? loadProfile() : null;
        const next = {
          name: sanitizeProfileName(profile && profile.name),
          gender: normalizeGender(profile && profile.gender),
          age: normalizeAge(profile && profile.age),
          updatedAt: new Date().toISOString()
        };
        next.avatar = normalizeAvatar((profile && profile.avatar) || (previous && previous.avatar), next);
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch (_) {}
        markProfileStat();
        updateProfileSettingsLabel(next);
        updateProfileHome(next);
        return next;
      }
      function updateProfileSettingsLabel(profile) {
        if (!settingsProfileSub) return;
        profile = profile || loadProfile();
        settingsProfileSub.textContent = (profile.name || 'ポノ') + 'で あそぶ';
      }
      function setGender(value) {
        profileGender = normalizeGender(value);
        if (!profileGenderGroup) return;
        profileGenderGroup.querySelectorAll('[data-gender]').forEach((btn) => {
          const active = btn.dataset.gender === profileGender;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-checked', active ? 'true' : 'false');
        });
      }
      function fillProfileForm(profile) {
        profile = profile || loadProfile();
        if (profileNameInput) profileNameInput.value = profile.name || 'ポノ';
        if (profileAgeSelect) profileAgeSelect.value = profile.age || '';
        setGender(profile.gender);
      }
      function openProfileModal() {
        fillProfileForm(loadProfile());
        openModal('profileModal');
        setTimeout(() => {
          try { profileNameInput && profileNameInput.focus(); profileNameInput && profileNameInput.select(); } catch (_) {}
        }, 80);
      }
      function maybeOpenFirstProfile() {
        if (hasProfile() || !profileModal) return;
        const intro = document.getElementById('tapIntro');
        const portraitWarn = document.getElementById('portraitWarn');
        if (document.body.classList.contains('tap-intro-open') || (intro && !intro.hidden) || (portraitWarn && !portraitWarn.hidden)) {
          setTimeout(maybeOpenFirstProfile, 700);
          return;
        }
        openProfileModal();
      }

      if (profileGenderGroup) {
        profileGenderGroup.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-gender]');
          if (!btn) return;
          e.preventDefault();
          setGender(btn.dataset.gender);
        });
      }
      if (profileRandomBtn) {
        profileRandomBtn.addEventListener('click', () => {
          if (!profileNameInput) return;
          const idx = Math.floor(Math.random() * RANDOM_NAMES.length);
          profileNameInput.value = RANDOM_NAMES[idx] || 'ポノ';
          try { profileNameInput.focus(); profileNameInput.select(); } catch (_) {}
        });
      }
      if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
          e.preventDefault();
          saveProfile({
            name: profileNameInput ? profileNameInput.value : 'ポノ',
            gender: profileGender,
            age: profileAgeSelect ? profileAgeSelect.value : ''
          });
          closeModal('profileModal');
          const shouldOpenHub = openHubAfterProfileSave;
          openHubAfterProfileSave = false;
          if (pendingProfileStartIdx != null) {
            const idx = pendingProfileStartIdx;
            pendingProfileStartIdx = null;
            setTimeout(() => startGame(idx), 0);
          } else if (shouldOpenHub) {
            setTimeout(openProfileHub, 0);
          }
        });
      }
      if (profileModal) {
        profileModal.addEventListener('click', (e) => {
          if (e.target === profileModal) {
            pendingProfileStartIdx = null;
            openHubAfterProfileSave = false;
          }
        });
      }
      if (profileHomeBtn) {
        profileHomeBtn.addEventListener('click', openProfileHub);
      }
      if (profileHubEditBtn) {
        profileHubEditBtn.addEventListener('click', () => {
          closeModal('profileHubModal');
          pendingProfileStartIdx = null;
          openHubAfterProfileSave = true;
          openProfileModal();
        });
      }
      if (profileAvatarEditBtn) {
        profileAvatarEditBtn.addEventListener('click', () => {
          renderAvatarBuilder();
          showProfilePanel('avatar');
        });
      }
      if (profileAchievementsBtn) {
        profileAchievementsBtn.addEventListener('click', () => {
          renderAchievementDetails();
          showProfilePanel('achievements');
        });
      }
      if (profileAvatarBackBtn) {
        profileAvatarBackBtn.addEventListener('click', () => {
          avatarDraft = null;
          renderProfileHub();
          showProfilePanel('main');
        });
      }
      if (profileAchievementsBackBtn) {
        profileAchievementsBackBtn.addEventListener('click', () => {
          renderProfileHub();
          showProfilePanel('main');
        });
      }
      if (profileAvatarControls) {
        profileAvatarControls.addEventListener('click', (e) => {
          const presetBtn = e.target.closest('[data-avatar-preset]');
          const partBtn = e.target.closest('[data-avatar-part]');
          const colorBtn = e.target.closest('[data-avatar-color-key]');
          const btn = presetBtn || partBtn || colorBtn;
          if (!btn) return;
          e.preventDefault();
          if (presetBtn) {
            setAvatarDraftPreset(presetBtn.dataset.avatarPreset);
          } else if (partBtn) {
            setAvatarDraftPart(partBtn.dataset.avatarPart, partBtn.dataset.avatarValue);
          } else {
            setAvatarDraftColor(colorBtn.dataset.avatarColorKey, colorBtn.dataset.avatarColor);
          }
        });
      }
      if (profileAvatarDoneBtn) {
        profileAvatarDoneBtn.addEventListener('click', saveAvatarDraft);
      }
      if (settingsProfileBtn) {
        settingsProfileBtn.addEventListener('click', () => {
          closeModal('settingsModal');
          pendingProfileStartIdx = null;
          openHubAfterProfileSave = false;
          openProfileModal();
        });
      }

      window.PonoPlayerProfile = {
        key: PROFILE_KEY,
        get: loadProfile,
        save: saveProfile,
        hasProfile: hasProfile,
        open: openProfileModal,
        openHub: openProfileHub
      };
      updateProfileSettingsLabel(loadProfile());
      updateProfileHome(loadProfile());
      setTimeout(maybeOpenFirstProfile, 900);
    })();

    // ===== Settings: app refresh entry =====
    const settingsRefreshBtn = document.getElementById('settingsRefreshBtn');
    const settingsRefreshSub = document.getElementById('settingsRefreshSub');
    function setSettingsRefreshText(text) {
      if (settingsRefreshSub) settingsRefreshSub.textContent = text;
    }
    function reloadFromSettingsRefresh(delay) {
      window.setTimeout(() => { location.reload(); }, delay || 500);
    }
    function requestSettingsRefresh() {
      if (!settingsRefreshBtn || settingsRefreshBtn.disabled) return;
      settingsRefreshBtn.disabled = true;
      setSettingsRefreshText('かくにんちゅう');
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.getRegistration) {
        setSettingsRefreshText('よみなおすよ');
        reloadFromSettingsRefresh(450);
        return;
      }
      navigator.serviceWorker.getRegistration()
        .then((reg) => {
          if (!reg) {
            setSettingsRefreshText('よみなおすよ');
            reloadFromSettingsRefresh(450);
            return null;
          }
          return reg.update().then(() => {
            const waiting = reg.waiting;
            if (waiting) {
              setSettingsRefreshText('こうしんちゅう');
              try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) {}
              reloadFromSettingsRefresh(1400);
            } else {
              setSettingsRefreshText('よみなおすよ');
              reloadFromSettingsRefresh(450);
            }
            return null;
          });
        })
        .catch(() => {
          setSettingsRefreshText('よみなおすよ');
          reloadFromSettingsRefresh(450);
        });
    }
    if (settingsRefreshBtn) settingsRefreshBtn.addEventListener('click', requestSettingsRefresh);

    // ===== Settings: data management (v1672 - export/import) =====
    const settingsDataManageBtn = document.getElementById('settingsDataManageBtn');
    if (settingsDataManageBtn) {
      settingsDataManageBtn.addEventListener('click', () => {
        // settings モーダルを閉じてからデータ管理モーダルを開く
        closeModal('settingsModal');
        if (window.PonoDataExport && typeof window.PonoDataExport.openModal === 'function') {
          window.PonoDataExport.openModal();
        } else {
          console.warn('[play] PonoDataExport not loaded');
        }
      });
    }

    // ===== Manage debug board: acorn balance tools =====
    const settingsDebugBoardBtn = document.getElementById('settingsDebugBoardBtn');
    const debugAcornCurrent = document.getElementById('debugAcornCurrent');
    const debugAcornAddAmount = document.getElementById('debugAcornAddAmount');
    const debugAcornSetAmount = document.getElementById('debugAcornSetAmount');
    const debugAcornAddBtn = document.getElementById('debugAcornAddBtn');
    const debugAcornSetBtn = document.getElementById('debugAcornSetBtn');
    const debugAcornStatus = document.getElementById('debugAcornStatus');
    const debugStickerCurrent = document.getElementById('debugStickerCurrent');
    const debugStickerGrantAllBtn = document.getElementById('debugStickerGrantAllBtn');
    const debugStickerOpenBookBtn = document.getElementById('debugStickerOpenBookBtn');
    const debugShopResetBtn = document.getElementById('debugShopResetBtn');
    const debugStickerUseAllToggle = document.getElementById('debugStickerUseAllToggle');
    const debugStickerStatus = document.getElementById('debugStickerStatus');
    const DEBUG_STICKER_STATE_KEY = 'pono_game_stickers_v1';
    const DEBUG_STICKER_USE_ALL_FEATURE = 'stickerbook-use-all';
    const DEBUG_STICKER_LEGACY_USE_ALL_KEY = 'sb3d_debug_all_stickers_v1';

    function getDebugAcornBalance() {
      try { return (typeof window.getAcorns === 'function') ? (window.getAcorns() | 0) : 0; }
      catch (_) { return 0; }
    }
    function readDebugAcornInput(el) {
      if (!el) return 0;
      var raw = String(el.value || '').replace(/[^\d]/g, '');
      var n = parseInt(raw || '0', 10);
      if (isNaN(n)) n = 0;
      return Math.max(0, Math.min(9999, n | 0));
    }
    function setDebugAcornStatus(text) {
      if (debugAcornStatus) debugAcornStatus.textContent = text || '';
    }
    function renderDebugAcornBoard() {
      var current = getDebugAcornBalance();
      if (debugAcornCurrent) debugAcornCurrent.textContent = String(current);
      if (debugAcornSetAmount && !debugAcornSetAmount.matches(':focus')) {
        debugAcornSetAmount.value = String(current);
      }
    }
    function refreshShopAfterDebugAcorns() {
      var shop = document.getElementById('donguriShop');
      if (shop && !shop.hidden && typeof renderShopCatalog === 'function') {
        renderShopCatalog();
      }
    }
    function setDebugStickerStatus(text) {
      if (debugStickerStatus) debugStickerStatus.textContent = text || '';
    }
    function loadDebugStickerCatalog() {
      try {
        if (window.PonoGameStickers && typeof window.PonoGameStickers.loadCatalog === 'function') {
          return window.PonoGameStickers.loadCatalog();
        }
      } catch (_) {}
      return fetch('assets/data/game-stickers.json?_=v' + encodeURIComponent(String(PAGE_CACHE_VERSION)), { cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('catalog fetch failed: ' + res.status);
          return res.json();
        });
    }
    function readDebugStickerState() {
      try {
        var raw = localStorage.getItem(DEBUG_STICKER_STATE_KEY);
        var state = raw ? JSON.parse(raw) : {};
        if (!state || typeof state !== 'object') state = {};
        if (!state.pages || typeof state.pages !== 'object') state.pages = {};
        if (!state.version) state.version = 1;
        return state;
      } catch (_) {
        return { version: 1, pages: {} };
      }
    }
    function writeDebugStickerState(state) {
      try {
        state.updatedAt = Date.now();
        localStorage.setItem(DEBUG_STICKER_STATE_KEY, JSON.stringify(state));
        return true;
      } catch (_) {
        return false;
      }
    }
    function debugStickerPageState(state, gameId) {
      if (!state.pages[gameId] || typeof state.pages[gameId] !== 'object') {
        state.pages[gameId] = { owned: {} };
      }
      if (!state.pages[gameId].owned || typeof state.pages[gameId].owned !== 'object') {
        state.pages[gameId].owned = {};
      }
      return state.pages[gameId];
    }
    function countDebugCatalogStickers(catalog) {
      var pages = catalog && catalog.pages ? catalog.pages : {};
      return Object.keys(pages).reduce(function (sum, gameId) {
        var list = pages[gameId] && Array.isArray(pages[gameId].stickers) ? pages[gameId].stickers : [];
        return sum + list.filter(function (sticker) { return sticker && sticker.id; }).length;
      }, 0);
    }
    function countDebugOwnedStickers() {
      var state = readDebugStickerState();
      var owned = new Set();
      Object.keys(state.pages || {}).forEach(function (gameId) {
        var map = state.pages[gameId] && state.pages[gameId].owned ? state.pages[gameId].owned : {};
        Object.keys(map).forEach(function (id) {
          if (map[id] && map[id].count > 0) owned.add(id);
        });
      });
      return owned.size;
    }
    function readDebugStickerUseAll() {
      if (!isManageDebugAllowed()) return false;
      try {
        if (window.PonoDebugMode && typeof window.PonoDebugMode.isFeatureEnabled === 'function') {
          if (window.PonoDebugMode.isFeatureEnabled(DEBUG_STICKER_USE_ALL_FEATURE)) return true;
        }
      } catch (_) {}
      try {
        return localStorage.getItem(DEBUG_STICKER_LEGACY_USE_ALL_KEY) === '1';
      } catch (_) {
        return false;
      }
    }
    function writeDebugStickerUseAll(on) {
      if (!isManageDebugAllowed()) return false;
      var ok = false;
      try {
        if (window.PonoDebugMode && typeof window.PonoDebugMode.setFeatureEnabled === 'function') {
          ok = !!window.PonoDebugMode.setFeatureEnabled(DEBUG_STICKER_USE_ALL_FEATURE, !!on);
        }
      } catch (_) {}
      try {
        localStorage.setItem(DEBUG_STICKER_LEGACY_USE_ALL_KEY, on ? '1' : '0');
      } catch (_) {}
      return ok || true;
    }
    function renderDebugStickerBoard() {
      if (debugStickerUseAllToggle) {
        debugStickerUseAllToggle.checked = readDebugStickerUseAll();
        debugStickerUseAllToggle.disabled = !isManageDebugAllowed();
      }
      if (!debugStickerCurrent) return Promise.resolve();
      debugStickerCurrent.textContent = countDebugOwnedStickers() + ' / ...';
      return loadDebugStickerCatalog().then(function (catalog) {
        debugStickerCurrent.textContent = countDebugOwnedStickers() + ' / ' + countDebugCatalogStickers(catalog);
      }).catch(function () {
        debugStickerCurrent.textContent = countDebugOwnedStickers() + ' / ?';
      });
    }
    function grantAllDebugStickers() {
      if (!isManageDebugAllowed()) return;
      setDebugStickerStatus('シールを ふやしているよ');
      loadDebugStickerCatalog().then(function (catalog) {
        var pages = catalog && catalog.pages ? catalog.pages : {};
        var state = readDebugStickerState();
        var now = Date.now();
        var added = 0;
        Object.keys(pages).forEach(function (gameId) {
          var page = pages[gameId] || {};
          var stickers = Array.isArray(page.stickers) ? page.stickers : [];
          var pageState = debugStickerPageState(state, gameId);
          stickers.forEach(function (sticker) {
            if (!sticker || !sticker.id) return;
            var current = pageState.owned[sticker.id];
            if (current && current.count > 0) return;
            pageState.owned[sticker.id] = {
              count: 1,
              firstAt: now,
              lastAt: now,
              name: sticker.name || ''
            };
            added++;
          });
        });
        if (!writeDebugStickerState(state)) {
          setDebugStickerStatus('シールを ほぞんできません');
          return;
        }
        if (added > 0) {
          try {
            window.dispatchEvent(new CustomEvent('PonoGameStickerGranted', {
              detail: { event: 'debug_all', count: added, ts: now }
            }));
          } catch (_) {}
        }
        renderDebugStickerBoard();
        setDebugStickerStatus(added > 0
          ? String(added) + 'まい ふやしたよ'
          : 'もう ぜんぶ あるよ');
      }).catch(function () {
        setDebugStickerStatus('シールを よみこめません');
      });
    }
    function addDebugAcorns(amount) {
      if (!isManageDebugAllowed()) return;
      var n = Math.max(0, Math.min(9999, amount | 0));
      if (n <= 0) {
        setDebugAcornStatus('1いじょうの かずを いれてね');
        return;
      }
      var before = getDebugAcornBalance();
      var after = before;
      try {
        after = (typeof window.addAcorns === 'function')
          ? (window.addAcorns(n, { reason: 'debug-board-add' }) | 0)
          : before;
      } catch (_) {
        after = before;
      }
      renderDebugAcornBoard();
      refreshShopAfterDebugAcorns();
      setDebugAcornStatus('+' + String(Math.max(0, after - before)) + ' ふやしたよ');
    }
    function setDebugAcorns(target) {
      if (!isManageDebugAllowed()) return;
      var next = Math.max(0, Math.min(9999, target | 0));
      var before = getDebugAcornBalance();
      var delta = next - before;
      if (delta !== 0) {
        try {
          if (typeof window.addAcorns === 'function') {
            window.addAcorns(delta, { reason: 'debug-board-set' });
          }
        } catch (_) {}
      }
      renderDebugAcornBoard();
      refreshShopAfterDebugAcorns();
      setDebugAcornStatus(String(getDebugAcornBalance()) + ' にしたよ');
    }
    if (settingsDebugBoardBtn) {
      settingsDebugBoardBtn.addEventListener('click', function () {
        if (!refreshDeveloperAccessUI()) return;
        renderDebugAcornBoard();
        renderDebugStickerBoard();
        setDebugAcornStatus('');
        setDebugStickerStatus('');
        // v1731: 開くたびに acorn タブへ戻し、 機能トグル一覧を最新化
        try { selectDebugBoardTab('acorn'); } catch (_) {}
        try { renderDebugFeatureToggles(); } catch (_) {}
        openModal('debugBoardModal');
      });
    }
    if (debugAcornAddBtn) {
      debugAcornAddBtn.addEventListener('click', function () {
        addDebugAcorns(readDebugAcornInput(debugAcornAddAmount));
      });
    }
    if (debugAcornSetBtn) {
      debugAcornSetBtn.addEventListener('click', function () {
        setDebugAcorns(readDebugAcornInput(debugAcornSetAmount));
      });
    }
    if (debugStickerGrantAllBtn) {
      debugStickerGrantAllBtn.addEventListener('click', grantAllDebugStickers);
    }
    if (debugStickerOpenBookBtn) {
      debugStickerOpenBookBtn.addEventListener('click', function () {
        if (!isManageDebugAllowed()) return;
        location.href = 'Prototypes/StickerBookThreeJS/?surface=inside';
      });
    }
    // v1897: お店をリセット — rotation cache + purchase history + reservation を全消しして再抽選。
    // PonoDebugMode.isAllowed() gate + confirm() 誤爆防止。 実行後、 shop 開いていれば hideShop→showShop で redraw。
    if (debugShopResetBtn) {
      debugShopResetBtn.addEventListener('click', function () {
        if (!isManageDebugAllowed()) return;
        if (!window.PonoDonguriShop) {
          setDebugStickerStatus('PonoDonguriShop が よみこまれていません');
          return;
        }
        var ok = false;
        try { ok = window.confirm('お店のシールと 購入記録を ぜんぶ消してもいい? (取り置き / いま の 抽選もリセットされるよ)'); }
        catch (_) { ok = false; } // v1897 code-review CRITICAL fix: confirm 不能環境は 安全側 (実行しない) に倒す
        if (!ok) return;
        try {
          if (typeof window.PonoDonguriShop.__resetRotationLock === 'function') {
            window.PonoDonguriShop.__resetRotationLock();
          }
          if (typeof window.PonoDonguriShop.__clearRotationStore === 'function') {
            window.PonoDonguriShop.__clearRotationStore();
          }
          if (typeof window.PonoDonguriShop.__clearReservationStore === 'function') {
            window.PonoDonguriShop.__clearReservationStore();
          }
          if (typeof window.PonoDonguriShop.__clearPurchaseStore === 'function') {
            window.PonoDonguriShop.__clearPurchaseStore();
          }
        } catch (err) {
          setDebugStickerStatus('リセットに しっぱいしたよ');
          console.warn('[debug] shop reset failed', err);
          return;
        }
        // 開いていたら再描画
        try {
          var shop = document.getElementById('donguriShop');
          if (shop && !shop.hidden) {
            if (typeof hideShop === 'function') hideShop();
            if (typeof showShop === 'function') showShop();
          } else if (typeof renderShopCatalog === 'function') {
            renderShopCatalog();
          }
        } catch (_) {}
        setDebugStickerStatus('お店をリセットしたよ');
        try { window.alert('お店をリセットしたよ'); } catch (_) {}
      });
    }
    if (debugStickerUseAllToggle) {
      debugStickerUseAllToggle.addEventListener('change', function () {
        var on = !!debugStickerUseAllToggle.checked;
        writeDebugStickerUseAll(on);
        debugStickerUseAllToggle.checked = readDebugStickerUseAll();
        setDebugStickerStatus(on
          ? 'シールちょうで ぜんぶ つかえるよ'
          : 'もっている シールだけに もどしたよ');
      });
    }
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var preset = e.target.closest('[data-debug-acorn-add]');
      if (!preset) return;
      addDebugAcorns(parseInt(preset.getAttribute('data-debug-acorn-add') || '0', 10) || 0);
    });
    window.addEventListener('pono-acorns-changed', renderDebugAcornBoard);
    window.addEventListener('PonoGameStickerGranted', renderDebugStickerBoard);
    window.addEventListener('pono-game-sticker-bonus-granted', renderDebugStickerBoard);
    window.addEventListener('storage', function (event) {
      if (!event || event.key === DEBUG_STICKER_STATE_KEY || event.key === DEBUG_STICKER_LEGACY_USE_ALL_KEY || event.key === 'pono_debug_feature_' + DEBUG_STICKER_USE_ALL_FEATURE) {
        renderDebugStickerBoard();
      }
    });
    renderDebugAcornBoard();
    renderDebugStickerBoard();

    // ===== v1731: Manage debug board — tab switch + feature toggles =====
    // 「どんぐり調整」 と 「機能トグル」 をタブ切替。 機能トグルは
    // window.PonoDebugFeatures (catalog) と PonoDebugMode.{isFeatureEnabled,
    // setFeatureEnabled} を介して localStorage に保存。 staging + manage 解錠時のみ
    // 効果が出る (PonoDebugMode 側で isAllowed gate)。
    const debugBoardTabAcorn = document.getElementById('debugBoardTabAcorn');
    const debugBoardTabStickers = document.getElementById('debugBoardTabStickers');
    const debugBoardTabFeatures = document.getElementById('debugBoardTabFeatures');
    const debugBoardPanelAcorn = document.getElementById('debugBoardPanelAcorn');
    const debugBoardPanelStickers = document.getElementById('debugBoardPanelStickers');
    const debugBoardPanelFeatures = document.getElementById('debugBoardPanelFeatures');
    const debugFeaturesList = document.getElementById('debugFeaturesList');
    const debugFeaturesEmpty = document.getElementById('debugFeaturesEmpty');
    const debugFeaturesStatus = document.getElementById('debugFeaturesStatus');

    function selectDebugBoardTab(tabKey) {
      var activeKey = (tabKey === 'stickers' || tabKey === 'features') ? tabKey : 'acorn';
      if (debugBoardTabAcorn) {
        debugBoardTabAcorn.setAttribute('aria-selected', activeKey === 'acorn' ? 'true' : 'false');
        debugBoardTabAcorn.tabIndex = activeKey === 'acorn' ? 0 : -1;
      }
      if (debugBoardTabStickers) {
        debugBoardTabStickers.setAttribute('aria-selected', activeKey === 'stickers' ? 'true' : 'false');
        debugBoardTabStickers.tabIndex = activeKey === 'stickers' ? 0 : -1;
      }
      if (debugBoardTabFeatures) {
        debugBoardTabFeatures.setAttribute('aria-selected', activeKey === 'features' ? 'true' : 'false');
        debugBoardTabFeatures.tabIndex = activeKey === 'features' ? 0 : -1;
      }
      if (debugBoardPanelAcorn) debugBoardPanelAcorn.hidden = activeKey !== 'acorn';
      if (debugBoardPanelStickers) debugBoardPanelStickers.hidden = activeKey !== 'stickers';
      if (debugBoardPanelFeatures) debugBoardPanelFeatures.hidden = activeKey !== 'features';
      if (activeKey === 'stickers') {
        try { renderDebugStickerBoard(); } catch (_) {}
      } else if (activeKey === 'features') {
        // タブ切替のたびに最新の localStorage 状態に追従
        try { renderDebugFeatureToggles(); } catch (_) {}
      }
    }

    function setDebugFeaturesStatus(text) {
      if (debugFeaturesStatus) debugFeaturesStatus.textContent = text || '';
    }

    function getDebugFeatureCatalog() {
      try {
        if (window.PonoDebugMode && typeof window.PonoDebugMode.listFeatures === 'function') {
          return window.PonoDebugMode.listFeatures();
        }
      } catch (_) {}
      return [];
    }

    function isDebugFeatureCurrentlyEnabled(id) {
      try {
        return !!(window.PonoDebugMode
          && typeof window.PonoDebugMode.isFeatureEnabled === 'function'
          && window.PonoDebugMode.isFeatureEnabled(id));
      } catch (_) {
        return false;
      }
    }

    function setDebugFeatureCurrentlyEnabled(id, on) {
      try {
        return !!(window.PonoDebugMode
          && typeof window.PonoDebugMode.setFeatureEnabled === 'function'
          && window.PonoDebugMode.setFeatureEnabled(id, !!on));
      } catch (_) {
        return false;
      }
    }

    function renderDebugFeatureToggles() {
      if (!debugFeaturesList) return;
      var features = getDebugFeatureCatalog();
      // 既存項目 (empty placeholder 以外) を全削除して再構築。
      // (項目数は 10 件前後なので innerHTML 再構築コストは無視できる)
      var children = debugFeaturesList.querySelectorAll('.debug-feature-item');
      for (var i = 0; i < children.length; i++) {
        debugFeaturesList.removeChild(children[i]);
      }
      if (!features.length) {
        if (debugFeaturesEmpty) debugFeaturesEmpty.hidden = false;
        return;
      }
      if (debugFeaturesEmpty) debugFeaturesEmpty.hidden = true;
      for (var j = 0; j < features.length; j++) {
        var f = features[j];
        var on = isDebugFeatureCurrentlyEnabled(f.id);
        var item = document.createElement('div');
        item.className = 'debug-feature-item' + (on ? ' is-on' : '');
        item.setAttribute('data-debug-feature-id', f.id);

        var inputId = 'debugFeatureChk_' + f.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        var chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'debug-feature-check';
        chk.id = inputId;
        chk.checked = on;
        chk.setAttribute('data-debug-feature-toggle', f.id);

        var labelEl = document.createElement('label');
        labelEl.className = 'debug-feature-label';
        labelEl.htmlFor = inputId;
        labelEl.textContent = f.label;

        item.appendChild(chk);
        item.appendChild(labelEl);

        if (f.description) {
          var desc = document.createElement('p');
          desc.className = 'debug-feature-desc';
          desc.textContent = f.description;
          item.appendChild(desc);
        }
        debugFeaturesList.appendChild(item);
      }
    }

    if (debugBoardTabAcorn) {
      debugBoardTabAcorn.addEventListener('click', function () { selectDebugBoardTab('acorn'); });
    }
    if (debugBoardTabStickers) {
      debugBoardTabStickers.addEventListener('click', function () { selectDebugBoardTab('stickers'); });
    }
    if (debugBoardTabFeatures) {
      debugBoardTabFeatures.addEventListener('click', function () { selectDebugBoardTab('features'); });
    }

    if (debugFeaturesList) {
      debugFeaturesList.addEventListener('change', function (e) {
        var target = e && e.target;
        if (!target || !target.matches || !target.matches('[data-debug-feature-toggle]')) return;
        var featureId = target.getAttribute('data-debug-feature-toggle') || '';
        if (!featureId) return;
        // manage 解錠が外れている場合は setFeatureEnabled が false を返す。
        var ok = setDebugFeatureCurrentlyEnabled(featureId, !!target.checked);
        if (!ok) {
          // 失敗時は checkbox 表示を実状態に戻す
          target.checked = isDebugFeatureCurrentlyEnabled(featureId);
          setDebugFeaturesStatus('manage 解錠が必要だよ');
          return;
        }
        var item = target.closest('.debug-feature-item');
        if (item) item.classList.toggle('is-on', !!target.checked);
        setDebugFeaturesStatus(target.checked
          ? (featureId + ' を ON にしたよ')
          : (featureId + ' を OFF にしたよ'));
      });
    }

    // ===== Sound toggle (persisted) =====
    const SOUND_KEY = 'pono_sound_off';
    const soundToggle = $('soundToggle');
    function loadSoundPref() {
      let off = false;
      try { off = localStorage.getItem(SOUND_KEY) === '1'; } catch(_) {}
      soundToggle.checked = !off;
    }
    soundToggle.addEventListener('change', () => {
      const on = soundToggle.checked;
      try { localStorage.setItem(SOUND_KEY, on ? '0' : '1'); } catch(_) {}
      if (!on) _stopShopNarrationAudio();
    });
    loadSoundPref();

    // ===== BGM + tap-to-start intro =====
    // iOS Safari requires a user gesture to start <audio>. We show the
    // tap-intro overlay only on a fresh session (sessionStorage-gated) so
    // that returning from a child game doesn't re-prompt. The single tap
    // both starts BGM and dismisses the overlay → user lands on the title.
    (function () {
      const bgm = document.getElementById('play-bgm');
      const intro = document.getElementById('tapIntro');
      if (!bgm) return;
      bgm.volume = 0.25;

      function isMuted() {
        try { return localStorage.getItem(SOUND_KEY) === '1'; } catch (_) { return false; }
      }
      function isUnlocked() {
        try { return sessionStorage.getItem('pono_audio_unlocked') === '1'; } catch (_) { return false; }
      }
      function markUnlocked() {
        try {
          sessionStorage.setItem('pono_audio_unlocked', '1');
          sessionStorage.setItem('pono_audio_primed_ts', String(Date.now()));
        } catch (_) {}
      }

      function tryPlay() {
        if (isMuted()) return;
        if (!bgm.paused) return;
        // v1699 (Stream D): <audio preload="none"> で出荷しているため play() 前に auto へ昇格
        try { if (bgm.preload !== 'auto') bgm.preload = 'auto'; } catch (_) {}
        const p = bgm.play();
        if (p && p.then) p.then(markUnlocked).catch(() => {});
      }

      // ----- Tap-intro overlay control -----
      function showIntroIfNeeded() {
        if (!intro) return false;
        // Don't show if: muted in Settings, already unlocked this session,
        // or device held in portrait (portrait-warn takes priority anyway).
        if (isMuted() || isUnlocked()) {
          document.body.classList.remove('tap-intro-open');
          return false;
        }
        if (window.innerHeight > window.innerWidth) {
          document.body.classList.remove('tap-intro-open');
          return false;
        }
        document.body.classList.add('tap-intro-open');
        intro.hidden = false;
        return true;
      }

      function stopIntroEvent(e) {
        if (!e) return;
        if (e.target && e.target.closest && e.target.closest('.tap-intro-ad-link')) {
          e.stopPropagation();
          return;
        }
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }

      function dismissIntro(e) {
        stopIntroEvent(e);
        if (!intro || intro.hidden) return;
        if (intro.classList.contains('is-closing')) return;
        // We're inside a user gesture → playing is allowed by iOS.
        if (!isMuted()) {
          // v1699 (Stream D): preload="none" のため play() 前に auto へ昇格
          try { if (bgm.preload !== 'auto') bgm.preload = 'auto'; } catch (_) {}
          const p = bgm.play();
          if (p && p.then) p.then(markUnlocked).catch(() => { markUnlocked(); });
          else markUnlocked();
        } else {
          markUnlocked();
        }
        intro.classList.add('is-closing');
        setTimeout(() => {
          intro.hidden = true;
          intro.classList.remove('is-closing');
          document.body.classList.remove('tap-intro-open');
        }, 380);
      }

      if (intro) {
        intro.addEventListener('pointerdown', dismissIntro);
        intro.addEventListener('pointerup', stopIntroEvent);
        intro.addEventListener('click', stopIntroEvent);
        intro.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { dismissIntro(e); }
        });
        // Ad banner: tapping the Amazon link should open Amazon in a new tab
        // ONLY — it must not also dismiss the intro / start BGM. Stop the
        // event from bubbling to the parent .tap-intro pointerdown handler.
        const adLink = intro.querySelector('.tap-intro-ad-link');
        if (adLink) {
          ['pointerdown', 'click', 'keydown'].forEach(evt => {
            adLink.addEventListener(evt, (e) => {
              e.stopPropagation();
            });
          });
        }
        // v1672: 「以前あそんだことがある方はこちら →」 リンク。
        // tap-intro の dismiss / BGM unlock は走らせない (誤タップで splash 抜けて
        // しまうと保護者操作の途中でスタートしてしまう)。 stopPropagation + 明示
        // click のみでデータ管理モーダルを開く。
        const restoreBtn = intro.querySelector('#tapIntroRestore');
        if (restoreBtn) {
          // v1672 (review fix): iOS Safari の一部経路で touchstart/touchend が
          // pointer event より先に親 (.tap-intro) の dismiss 系へ届く可能性に
          // 備えて、 pointer/touch 両系統で stopPropagation を入れる
          // (touchstart 側は preventDefault も付与し、 合成 click が親に
          // 伝播するのを防ぐ; passive:false 必須)。
          ['pointerdown', 'pointerup'].forEach(evt => {
            restoreBtn.addEventListener(evt, (e) => {
              e.stopPropagation();
            });
          });
          restoreBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
          }, { passive: false });
          restoreBtn.addEventListener('touchend', (e) => {
            e.stopPropagation();
          }, { passive: true });
          restoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
            if (window.PonoDataExport && typeof window.PonoDataExport.openModal === 'function') {
              // Step C: 「以前あそんだことがある方」 導線なので、 クラウドの
              // 「ロード」ボタンをモーダル最上段に置く (prefer:'load')。
              window.PonoDataExport.openModal({ prefer: 'load' });
            } else {
              console.warn('[play] PonoDataExport not loaded (tapIntroRestore)');
            }
          });
        }
      }

      // ----- Wire-up at startup -----
      const introShown = showIntroIfNeeded();
      if (!introShown) {
        // Returning from a child game (already unlocked) — try to resume
        // immediately. iOS keeps the audio session warm in many cases.
        tryPlay();
      }

      // Settings toggle: pause/resume on the spot.
      soundToggle.addEventListener('change', () => {
        if (isMuted()) bgm.pause();
        else tryPlay();
      });

      // Tab hidden → pause; returning → resume (only if already unlocked).
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) bgm.pause();
        else if (isUnlocked()) tryPlay();
      });
    })();

    // ===== Init =====
    renderCards();
    selectGame(0);

    // ===== v1590: 🌰 acorn balance badge wiring (MF3: 戻り時 bump 発火対応) =====
    (function wireAcornBalanceBadge() {
      var el = document.getElementById('acornBalanceBadge');
      var countEl = document.getElementById('acornBalanceCount');
      if (!el || !countEl) return;

      // v1590 MF3 fix: MVP flag が true なら badge 非表示 (defensive)
      if (window.PONO_MVP_NO_REWARDS === true) {
        el.hidden = true;
        return;
      }

      var SS_LAST_SEEN = 'pono_acorns_last_seen_v1';
      var bumpTimer = null;
      var rewardModal = document.getElementById('acornRewardModal');
      var rewardClose = document.getElementById('acornRewardClose');
      var rewardAmount = document.getElementById('acornRewardAmount');
      var rewardAmountPill = document.getElementById('acornRewardAmountPill');
      var rewardTimer = null;

      function render(newAmount) {
        var v = (typeof newAmount === 'number')
          ? newAmount
          : ((typeof window.getAcorns === 'function') ? (window.getAcorns() | 0) : 0);
        countEl.textContent = String(v | 0);
      }
      function hideRewardModal() {
        if (!rewardModal) return;
        if (rewardTimer) {
          clearTimeout(rewardTimer);
          rewardTimer = null;
        }
        rewardModal.hidden = true;
        rewardModal.classList.remove('is-visible');
      }
      function showRewardModal(delta, after) {
        delta = delta | 0;
        if (delta <= 0 || !rewardModal || !rewardAmount) return;
        rewardAmount.textContent = String(delta);
        if (rewardAmountPill) {
          rewardAmountPill.setAttribute('aria-label', 'どんぐり ' + delta + 'こ');
        }
        rewardModal.hidden = false;
        rewardModal.classList.remove('is-visible');
        void rewardModal.offsetWidth;
        rewardModal.classList.add('is-visible');
        if (rewardTimer) {
          clearTimeout(rewardTimer);
          rewardTimer = null;
        }
      }
      function bump() {
        if (bumpTimer) { clearTimeout(bumpTimer); bumpTimer = null; }
        el.classList.remove('is-bumping');
        // force reflow so the animation re-triggers even on consecutive deltas
        void el.offsetWidth;
        el.classList.add('is-bumping');
        bumpTimer = setTimeout(function () {
          el.classList.remove('is-bumping');
          bumpTimer = null;
        }, 500);
      }

      // game→戻り時の差分検出 (MF3 fix): pageshow / visibilitychange の度に
      // 前回見た残高と現残高を比較し、 増えていれば bump 演出。
      function checkChangeSinceLastSeen() {
        var current = (typeof window.getAcorns === 'function') ? (window.getAcorns() | 0) : 0;
        try {
          var raw = sessionStorage.getItem(SS_LAST_SEEN);
          var lastSeen = parseInt(raw || '0', 10);
          var hasLastSeen = raw !== null;
          if (hasLastSeen && !isNaN(lastSeen) && current > lastSeen) {
            var delta = current - lastSeen;
            bump();
            showRewardModal(delta, current);
          }
          sessionStorage.setItem(SS_LAST_SEEN, String(current));
        } catch (_) { /* private mode etc. */ }
        render(current);
      }

      // 同セッション内 同ページ内 加算リスナー (acorns.js dispatch)
      window.addEventListener('pono-acorns-changed', function (e) {
        var after = (e && e.detail && typeof e.detail.after === 'number') ? e.detail.after : null;
        render(after);
        var delta = (e && e.detail && typeof e.detail.delta === 'number') ? e.detail.delta : 0;
        if (delta > 0) {
          bump();
          showRewardModal(delta, after);
        }
        try {
          if (after !== null) sessionStorage.setItem(SS_LAST_SEEN, String(after));
        } catch (_) {}
      });

      if (rewardClose) rewardClose.addEventListener('click', hideRewardModal);
      if (rewardModal) {
        rewardModal.addEventListener('click', function (event) {
          if (event.target === rewardModal) hideRewardModal();
        });
        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && !rewardModal.hidden) hideRewardModal();
        });
      }

      // 初期 paint + 戻り時差分検出
      checkChangeSinceLastSeen();

      // visibilitychange / pageshow でも再チェック (タブ切替戻り / bfcache)
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') checkChangeSinceLastSeen();
      });
      window.addEventListener('pageshow', function () { checkChangeSinceLastSeen(); });
    })();

    // ===== Service worker =====
    // 登録 + 更新検知を common/sw-update.js に集約。更新待ちUIは出さず、
    // Claude preview 判定もそちらで吸収する。
    (function () {
      var s = document.createElement('script');
      s.src = '/common/sw-update.js?v=' + encodeURIComponent(String(PAGE_CACHE_VERSION));
      s.defer = true;
      document.head.appendChild(s);
    })();

    // ===== First-visit SW catch-up overlay (Fix 4 / 2026-06-28) =====
    // 「v1709 を push したのに体感変わらない」 メタ症状対策:
    // 初回 visit でクライアントが PAGE_CACHE_VERSION 未到達 (lastSeen が古い or 未設定) の場合、
    // splash に小さなローディング overlay を 500ms 出して、 そのまま自動 reload する。
    // sessionStorage で 1 回限定 (リロードループ防止)。
    //
    // CRITICAL: PAGE_CACHE_VERSION は sw.js の CACHE_VERSION と必ず同期させること。
    // 両者が divergeすると lastSeenCacheVer < PAGE_CACHE_VERSION でも SW が新しくならず
    // catch-up が空振り → 無限 reload ループの恐れあり (sessionStorage FLAG で抑止しているが)。
    (function () {
      if (!('serviceWorker' in navigator)) return;
      try {
        if (/claudeusercontent\.com$/.test(location.hostname)) return;
      } catch (e) { return; }
      var FLAG = '__ponoSwCatchupV' + PAGE_CACHE_VERSION;
      var LAST = 'ponoLastSeenCacheVer';
      var lastSeen = null;
      try { lastSeen = parseInt(localStorage.getItem(LAST) || '0', 10) || 0; } catch (e) {}
      // 既に最新を見ている → 何もしない
      if (lastSeen >= PAGE_CACHE_VERSION) return;
      // このセッションで既に catch-up 済 → 何もしない
      try { if (sessionStorage.getItem(FLAG) === '1') return; } catch (e) { return; }
      // 初回 (lastSeen=0) かつ controller が無い → SW 自体まだ未登録なので reload しても意味なし
      if (!navigator.serviceWorker.controller && lastSeen === 0) {
        try { localStorage.setItem(LAST, String(PAGE_CACHE_VERSION)); } catch (e) {}
        return;
      }
      // controller あり & lastSeen < 現バージョン → 旧 SW が動いてる可能性大。
      // 短い overlay を出して 1 度だけ reload。
      try { sessionStorage.setItem(FLAG, '1'); } catch (e) { return; }
      var overlay = document.createElement('div');
      overlay.id = 'ponoSwCatchupOverlay';
      overlay.style.cssText = [
        'position:fixed;inset:0;z-index:2147483647;',
        'background:rgba(10,14,22,0.86);color:#fff;',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'font:600 16px/1.5 system-ui,sans-serif;text-align:center;padding:24px;',
        'animation:ponoSwCatchupFade .2s ease both;'
      ].join('');
      overlay.innerHTML = [
        '<div style="font-size:28px;margin-bottom:12px;">🔄</div>',
        '<div>あたらしい バージョンに こうしんしています...</div>',
        '<div style="font-size:13px;opacity:.75;margin-top:8px;">すこし まってね</div>',
        '<style>@keyframes ponoSwCatchupFade{from{opacity:0}to{opacity:1}}</style>'
      ].join('');
      // body がまだなら DOMContentLoaded を待つ
      function mount() {
        try { document.body.appendChild(overlay); } catch (e) {}
        try { localStorage.setItem(LAST, String(PAGE_CACHE_VERSION)); } catch (e) {}
        setTimeout(function () {
          try { window.__isReloading = true; } catch (e) {}
          // __isReloading は通常 reload navigation で page unload するので
          // 自動解除されるが、 reload が navigate しなかった (失敗/キャンセル)
          // 場合に備えて 2 秒後にフラグを解除して stale 状態を防ぐ。
          setTimeout(function () {
            try { window.__isReloading = false; } catch (e) {}
          }, 2000);
          window.location.reload();
        }, 500);
      }
      if (document.body) {
        mount();
      } else {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
      }
    })();
  
;
// ---- script block 5 ----

    (function () {
      'use strict';
      const stage = document.getElementById('stage');
      const portraitWarn = document.getElementById('portraitWarn');
      const CANVAS_W = 1920;
      const CANVAS_H = 823;

      function fit() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Show portrait warning if the viewport is taller than wide
        // (pure orientation detection — works on all devices/browsers).
        const isPortrait = vh > vw;
        portraitWarn.hidden = !isPortrait;

        if (isPortrait) {
          // No need to scale the stage while it's hidden.
          stage.style.transform = 'scale(1)';
          return;
        }
        // Cover-fit: pick the LARGER scale so one axis snaps to the viewport
        // edge and the other (the 21:9 side decoration) overflows + clips.
        // This kills letterbox black bars and gives ~1.1–1.3x more size on
        // typical phone landscapes vs. the previous Math.min letterbox.
        // Safe: all UI lives inside the 16:9 safe-area, only the side
        // decoration art gets cropped on tall viewports.
        const baseScale = Math.max(vw / CANVAS_W, vh / CANVAS_H);
        // Optional extra zoom (>1.0 grows further; main UI may start to
        // crop into the 16:9 safe-area if pushed too high). 1.0 keeps
        // safe-area fully visible.
        const SCALE_MULTIPLY = 1.0;
        stage.style.transform = `scale(${baseScale * SCALE_MULTIPLY})`;
      }

      fit();
      window.addEventListener('resize', fit);
      window.addEventListener('orientationchange', fit);

      // bfcache 復元時の表示崩れ対策:
      // ゲームページから戻るボタンで戻ってきた時、ブラウザが page-state
      // memory snapshot をそのまま再表示することがある (event.persisted = true)。
      // その状態だと scale 計算 / SW更新後の最新アセットがどちらも適用されず、
      // 黒帯が出たり一部画像 (例: 図鑑サムネ) が抜けたりする。検出して 1回だけリロード。
      //
      // v1686 緊急 fix: 「リロード ループ」 再発対応。
      // 旧実装は無条件 location.reload() のため、 sw-update.js の controllerchange→safeReload と
      // 同時発火するとリロード後に再度 pageshow→reload が走り、 体感「ずっと考え中」 のまま停滞。
      // 多層ガード:
      //   1) sessionStorage で「このタブで bfcache reload 既に実行済」 を記録 → 1 セッション 1 回限定
      //   2) SW がまさに更新通知中 (sw-update.js が pendingReload を立てている) なら任せる
      //   3) sw-update.js の isNavigating ガードと race しないよう先に window.__isReloading フラグを立てる
      window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        try {
          if (window.__isReloading) return;
          if (sessionStorage.getItem('__bfcacheReloaded') === '1') return;
          sessionStorage.setItem('__bfcacheReloaded', '1');
          window.__isReloading = true;
        } catch (_) {
          // sessionStorage 不可 (private mode 等) — 安全側に倒し reload しない
          return;
        }
        location.reload();
      });
    })();
  
;
// ---- script block 6 ----

    'use strict';

    // Defaults mirror the original CSS (.card-list custom properties).
    // Aspect is stored as width:height numbers so we can drive a slider.
    const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
      "aspectW": 5.8,
      "aspectH": 1,
      "radius": 22,
      "thumbHPct": 73,
      "thumbZoom": 1.15,
      "playHPct": 52,
      "sideWPct": 3,
      "textLeftWPct": 17,
      "textRightWPct": 13,
      "maskFile1": 1,
      "maskX1": 49.9,
      "maskY1": 43.9,
      "maskW1": 80.0,
      "maskH1": 68.0,
      "maskFile2": 4,
      "maskX2": 49.7,
      "maskY2": 42.8,
      "maskW2": 80.0,
      "maskH2": 65.0,
      "maskFile3": 2,
      "maskX3": 49.9,
      "maskY3": 44.5,
      "maskW3": 80.0,
      "maskH3": 66.0,
      "maskFile4": 3,
      "maskX4": 49.9,
      "maskY4": 44.2,
      "maskW4": 80.0,
      "maskH4": 65.0,
      "peekAlways": false
    }/*EDITMODE-END*/;

    function applyTweaks(t) {
      const el = document.getElementById('cardList');
      if (!el) return;
      el.style.setProperty('--gc-aspect',         `${t.aspectW} / ${t.aspectH}`);
      el.style.setProperty('--gc-radius',         `${t.radius}px`);
      el.style.setProperty('--gc-thumb-h-pct',    `${t.thumbHPct}%`);
      el.style.setProperty('--gc-thumb-zoom',     `${t.thumbZoom}`);
      el.style.setProperty('--gc-play-h-pct',     `${t.playHPct}%`);
      el.style.setProperty('--gc-side-w-pct',     `${t.sideWPct}%`);
      el.style.setProperty('--gc-text-left-w-pct',  `${t.textLeftWPct}%`);
      el.style.setProperty('--gc-text-right-w-pct', `${t.textRightWPct}%`);

      // Toggle "always show peek" body class for live mask alignment.
      document.body.classList.toggle('peek-always', !!t.peekAlways);

      // Apply per-panel mask tweaks. Each card's panel number (1..4) is
      // encoded in data-panel-n on the card root; we set the mask vars on
      // every card matching that panel.
      for (let n = 1; n <= 4; n++) {
        const fileN = t[`maskFile${n}`] ?? n;
        const x = t[`maskX${n}`] ?? 0;
        const y = t[`maskY${n}`] ?? 0;
        const w = t[`maskW${n}`] ?? 100;
        const h = t[`maskH${n}`] ?? 100;
        const url = `assets/ui/wood_panel_mask${fileN}.png`;
        document.querySelectorAll(`.game-card[data-panel-n="${n}"]`).forEach((card) => {
          card.style.setProperty('--card-mask', `url('${url}')`);
          card.style.setProperty('--mask-x', `${x}%`);
          card.style.setProperty('--mask-y', `${y}%`);
          card.style.setProperty('--mask-w', `${w}%`);
          card.style.setProperty('--mask-h', `${h}%`);
        });
      }
    }

    // Apply once on first paint so the initial render uses tweak values
    // (covers the case where Tweaks panel hasn't been toggled open yet).
    applyTweaks(TWEAK_DEFAULTS);

    // Apply cache-busted src to brand images (preview SW workaround).
    // Date.now() ベースだと iOS Safari の HTTP キャッシュが効かず毎回再取得されて
    // 部分的に画像読込が止まる原因になる。PAGE_CACHE_VERSION (sw.js と揃った値) を
    // バスターに使うことで、同一バージョン中は HTTP キャッシュが効き、デプロイ時の
    // バンプで自動的に新しい URL になる。
    const __isPv = /claudeusercontent\.com$/.test(location.hostname);
    const __bustUrl = (url) => __isPv ? `${url}${url.includes('?') ? '&' : '?'}_=v${PAGE_CACHE_VERSION}` : url;
    document.querySelectorAll('img[data-src]').forEach((img) => {
      const url = img.getAttribute('data-src');
      img.src = __bustUrl(url);
      img.addEventListener('error', () => {
        const retries = Number(img.dataset.retries || 0);
        if (retries < 2) {
          img.dataset.retries = String(retries + 1);
          setTimeout(() => {
            img.removeAttribute('src');
            requestAnimationFrame(() => { img.src = __bustUrl(url); });
          }, 800);
        }
      });
    });

    function CardTweaks() {
      const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
      const [maskCard, setMaskCard] = React.useState(1);   // which panel# we're tuning

      React.useEffect(() => { applyTweaks(t); }, [t]);

      const reset = () => setTweak({ ...TWEAK_DEFAULTS });

      const cardLabels = {
        1: 'カード1: なぞなぞ',
        2: 'カード2: こだまの森',
        3: 'カード3: ポノのもりずかん',
        4: 'カード4: ランタンめいろ',
      };
      const n = maskCard;
      const fileKey = `maskFile${n}`, xKey = `maskX${n}`, yKey = `maskY${n}`,
            wKey = `maskW${n}`, hKey = `maskH${n}`;

      return (
        <TweaksPanel title="カードのレイアウト">
          <TweakSection label="カードのかたち" />
          <TweakSlider label="よこ:たて (横)" value={t.aspectW}
                       min={2} max={10} step={0.1}
                       onChange={(v) => setTweak('aspectW', v)} />
          <TweakSlider label="よこ:たて (縦)" value={t.aspectH}
                       min={0.5} max={3} step={0.1}
                       onChange={(v) => setTweak('aspectH', v)} />
          <TweakSlider label="角丸 (radius)" value={t.radius}
                       min={0} max={60} step={1} unit="px"
                       onChange={(v) => setTweak('radius', v)} />

          <TweakSection label="サムネ・再生ボタン (高さ%)" />
          <TweakSlider label="左サムネ" value={t.thumbHPct}
                       min={30} max={100} step={1} unit="%"
                       onChange={(v) => setTweak('thumbHPct', v)} />
          <TweakSlider label="サムネ拡大" value={t.thumbZoom}
                       min={1} max={2} step={0.01} unit="×"
                       onChange={(v) => setTweak('thumbZoom', v)} />
          <TweakSlider label="右ボタン" value={t.playHPct}
                       min={30} max={100} step={1} unit="%"
                       onChange={(v) => setTweak('playHPct', v)} />

          <TweakSection label="左右の余白 (幅%)" />
          <TweakSlider label="サイド余白" value={t.sideWPct}
                       min={0} max={10} step={0.1} unit="%"
                       onChange={(v) => setTweak('sideWPct', v)} />
          <TweakSlider label="テキスト左" value={t.textLeftWPct}
                       min={5} max={40} step={0.5} unit="%"
                       onChange={(v) => setTweak('textLeftWPct', v)} />
          <TweakSlider label="テキスト右" value={t.textRightWPct}
                       min={5} max={40} step={0.5} unit="%"
                       onChange={(v) => setTweak('textRightWPct', v)} />

          <TweakSection label="紙マスクの調整" />
          <TweakToggle label="ホバーなしで常時表示" value={!!t.peekAlways}
                       onChange={(v) => setTweak('peekAlways', v)} />
          <TweakSelect label="調整するカード" value={String(n)}
                       options={[
                         { value: '1', label: cardLabels[1] },
                         { value: '2', label: cardLabels[2] },
                         { value: '3', label: cardLabels[3] },
                         { value: '4', label: cardLabels[4] },
                       ]}
                       onChange={(v) => setMaskCard(parseInt(v, 10))} />
          <TweakSelect label="マスクファイル" value={String(t[fileKey])}
                       options={[
                         { value: '1', label: 'mask1.png' },
                         { value: '2', label: 'mask2.png' },
                         { value: '3', label: 'mask3.png' },
                         { value: '4', label: 'mask4.png' },
                       ]}
                       onChange={(v) => setTweak(fileKey, parseInt(v, 10))} />
          <TweakSlider label="左右位置 X" value={t[xKey]}
                       min={-100} max={100} step={0.1} unit="%"
                       onChange={(v) => setTweak(xKey, v)} />
          <TweakSlider label="上下位置 Y" value={t[yKey]}
                       min={-100} max={100} step={0.1} unit="%"
                       onChange={(v) => setTweak(yKey, v)} />
          <TweakSlider label="幅" value={t[wKey]}
                       min={20} max={200} step={0.5} unit="%"
                       onChange={(v) => setTweak(wKey, v)} />
          <TweakSlider label="高さ" value={t[hKey]}
                       min={10} max={200} step={0.5} unit="%"
                       onChange={(v) => setTweak(hKey, v)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <TweakButton label="リセット" onClick={reset} secondary />
          </div>
        </TweaksPanel>
      );
    }

    ReactDOM.createRoot(document.getElementById('tweaksRoot')).render(<CardTweaks />);
  
;
