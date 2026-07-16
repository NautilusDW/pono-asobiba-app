#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'writing-mori/index.html'), 'utf8');
const nativeManifest = JSON.parse(fs.readFileSync(path.join(root, 'native/content-manifest.json'), 'utf8'));

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing source range: ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeManifestSource(value) {
  return path.posix.normalize(String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')).replace(/\/$/, '');
}

function normalizeWritingAssetLiteral(value) {
  const withoutQueryOrHash = value.split(/[?#]/, 1)[0];
  return normalizeManifestSource(path.posix.join('writing-mori', withoutQueryOrHash));
}

function getManifestCoverage(entries) {
  const exactFiles = new Set();
  const directories = [];
  for (const entry of entries) {
    const source = normalizeManifestSource(entry.source);
    if (entry.type === 'directory') {
      directories.push(source);
      continue;
    }
    if (entry.type === 'file') {
      exactFiles.add(source);
      continue;
    }
    if (entry.type === 'file-list') {
      for (const file of entry.files || []) {
        exactFiles.add(normalizeManifestSource(path.posix.join(source, file)));
      }
    }
  }
  return {
    covers(source) {
      return exactFiles.has(source) || directories.some((directory) => source.startsWith(`${directory}/`));
    }
  };
}

assert.doesNotMatch(html, /DotGothic16|--pixel-font/, 'retro dot font must not return');
assert.match(
  html,
  /family=Zen\+Maru\+Gothic:wght@500;700;900/,
  'the child-facing UI must request Zen Maru Gothic'
);
assert.match(
  html,
  /--round-font:\s*'Zen Maru Gothic',\s*'Hiragino Maru Gothic ProN',\s*sans-serif/,
  'the rounded UI font stack must remain explicit'
);
assert.match(
  html,
  /--moji-font:\s*'Yu Mincho',\s*'Hiragino Mincho ProN',\s*'Hiragino Mincho Pro',\s*serif/,
  'the exemplar fallback must remain a Mincho stack'
);
assert.match(html, /#writerTarget\s*\{\s*font-family:\s*var\(--moji-font\)/);
assert.match(html, /\.stroke-preview\s*\{[^}]*font-family:\s*var\(--moji-font\)/s);

const expectedStoryAssets = [
  'assets/images/mojikko/care/yard_background_wide_v2.png',
  'assets/images/mojikko/writing/storybook/frame-family/01_mojikko_unified_board_frame.png',
  'assets/images/mojikko/writing/storybook/frame-family/02_mojikko_character_list_frame.png',
  'assets/images/mojikko/writing/storybook/frame-family/03_mojikko_companion_frame.png',
  'assets/images/mojikko/writing/storybook/frame-family/04_mojikko_stroke_order_frame.png',
  'assets/images/mojikko/writing/storybook/frame-family/05_mojikko_message_frame.png',
  'assets/images/mojikko/writing/storybook/frame-family/06_mojikko_mode_chooser_base.png',
  'assets/images/mojikko/writing/storybook/frame-family/07_mojikko_result_frame.png',
  'assets/images/mojikko/writing/storybook/frame-family/10_mojikko_secondary_button_normal.png',
  'assets/images/mojikko/writing/storybook/frame-family/11_mojikko_primary_button_normal.png',
  'assets/images/mojikko/writing/storybook/frame-family/12_mojikko_star_counter_regular.png',
  'assets/images/mojikko/writing/storybook/frame-family/12_mojikko_star_counter_short.png',
  'assets/images/mojikko/writing/storybook/frame-family/13_mojikko_settings_button_normal.png',
  'assets/images/mojikko/writing/storybook/frame-family/14_mojikko_kana_tab_main_normal.png',
  'assets/images/mojikko/writing/storybook/frame-family/14_mojikko_kana_tab_short_normal.png',
  'assets/images/mojikko/writing/storybook/frame-family/15_mojikko_character_tile_main_normal.png',
  'assets/images/mojikko/writing/storybook/frame-family/15_mojikko_character_tile_short_normal.png',
  'assets/_legacy/preview-placeholders/ctrl-btn-settings.png',
  'assets/images/quizland/quizland_difficulty_star_gold_gpt_image2_20260623.png',
  'assets/images/Bento_parts/cookie.webp',
  'assets/images/nazonazo-tunnel/quiz-art/quiz_onigiri_20260714.webp',
  'assets/images/nazonazo-tunnel/quiz-art/quiz_pencil_20260714.webp',
  'assets/images/mojikko/writing/storybook/icon_moji_milk_20260716.webp',
  'assets/images/mojikko/writing/storybook/word_himawari_20260716.webp',
  'assets/images/mojikko/writing/storybook/milmaru_grown_wave_20260716.webp',
  'assets/images/mojikko/writing/storybook/milmaru_yochiyochi_front_20260716.webp',
  'assets/images/mojikko/writing/storybook/milmaru_shell_baby_idle_20260716.webp',
  'assets/images/mojikko/writing/storybook/milmaru_egg_idle_20260716.webp'
];
for (const relative of expectedStoryAssets) {
  const file = path.join(root, relative);
  assert.ok(fs.existsSync(file), `missing storybook asset: ${relative}`);
  assert.ok(fs.statSync(file).size > 0, `empty storybook asset: ${relative}`);
  assert.ok(fs.statSync(file).size < 3 * 1024 * 1024, `storybook asset exceeds 3MB: ${relative}`);
}

const expectedFrameDimensions = Object.freeze({
  '01_mojikko_unified_board_frame.png': [1203, 1081],
  '02_mojikko_character_list_frame.png': [907, 1442],
  '03_mojikko_companion_frame.png': [1128, 1043],
  '04_mojikko_stroke_order_frame.png': [496, 1759],
  '05_mojikko_message_frame.png': [1751, 282],
  '06_mojikko_mode_chooser_base.png': [1159, 1079],
  '07_mojikko_result_frame.png': [1597, 763],
  '10_mojikko_secondary_button_normal.png': [1223, 363],
  '11_mojikko_primary_button_normal.png': [1334, 530],
  '12_mojikko_star_counter_regular.png': [933, 346],
  '12_mojikko_star_counter_short.png': [787, 416],
  '13_mojikko_settings_button_normal.png': [581, 601],
  '14_mojikko_kana_tab_main_normal.png': [570, 331],
  '14_mojikko_kana_tab_short_normal.png': [723, 720],
  '15_mojikko_character_tile_main_normal.png': [404, 564],
  '15_mojikko_character_tile_short_normal.png': [559, 561]
});
const frameFamilyDirectory = path.join(root, 'assets/images/mojikko/writing/storybook/frame-family');
assert.deepEqual(
  fs.readdirSync(frameFamilyDirectory).filter((name) => name.endsWith('.png')).sort(),
  Object.keys(expectedFrameDimensions).sort(),
  'the unified frame-family directory must contain exactly the approved 16 PNGs'
);
for (const [name, dimensions] of Object.entries(expectedFrameDimensions)) {
  const png = fs.readFileSync(path.join(frameFamilyDirectory, name));
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG', `${name}: invalid PNG signature`);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], dimensions, `${name}: dimensions drifted`);
  assert.equal(png[25], 6, `${name}: processed frame must remain RGBA`);
}

const canonicalSettingsPng = fs.readFileSync(path.join(root, 'assets/_legacy/preview-placeholders/ctrl-btn-settings.png'));
assert.equal(canonicalSettingsPng.subarray(1, 4).toString('ascii'), 'PNG', 'canonical settings control is not a PNG');
assert.deepEqual(
  [canonicalSettingsPng.readUInt32BE(16), canonicalSettingsPng.readUInt32BE(20)],
  [120, 120],
  'canonical settings control must keep its square natural ratio'
);

assert.ok(Array.isArray(nativeManifest.entries), 'native content manifest entries are missing');
const writingAssetLiterals = new Set();
for (const match of html.matchAll(/(['"])(\.\.\/assets\/[^'"\r\n]+)\1/g)) {
  const literal = match[2];
  if (literal.includes('${')) continue;
  if (!/\.[a-z0-9]+(?:[?#].*)?$/i.test(literal)) continue;
  const normalized = normalizeWritingAssetLiteral(literal);
  assert.match(normalized, /^assets\//, `writing asset literal escaped the asset root: ${literal}`);
  writingAssetLiterals.add(normalized);
}
assert.ok(writingAssetLiterals.size > 0, 'no literal writing assets were found for native coverage');

const nativeCoverage = getManifestCoverage(nativeManifest.entries);
const uncoveredWritingAssets = [...writingAssetLiterals].filter((source) => !nativeCoverage.covers(source)).sort();
assert.deepEqual(
  uncoveredWritingAssets,
  [],
  `native content manifest misses literal writing assets:\n${uncoveredWritingAssets.join('\n')}`
);

const nativeCoverageRegressions = expectedStoryAssets.filter((source) => source.includes('/frame-family/'));
for (const source of nativeCoverageRegressions) {
  assert.ok(writingAssetLiterals.has(source), `${source}: native regression asset escaped literal extraction`);
  assert.ok(nativeCoverage.covers(source), `${source}: native regression asset is not packaged`);
}

assert.match(html, /--story-yard-bg:\s*url\('\.\.\/assets\/images\/mojikko\/care\/yard_background_wide_v2\.png'\)/);
assert.doesNotMatch(html, /stage-bg\.webp/, 'the QuizLand background must not return');
assert.match(html, /--story-milk:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/icon_moji_milk_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-grown:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_grown_wave_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-yochiyochi:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_yochiyochi_front_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-baby:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_shell_baby_idle_20260716\.webp'\)/);
assert.match(html, /--story-milmaru-egg:\s*url\('\.\.\/assets\/images\/mojikko\/writing\/storybook\/milmaru_egg_idle_20260716\.webp'\)/);
assert.match(
  html,
  /#stage-wrap\s*\{\s*background:\s*#243b33;\s*\}\s*#stage\s*\{\s*background:\s*var\(--story-yard-bg\) right center \/ cover no-repeat;/s,
  'the dark wrapper fallback and original right-aligned yard must stay exact'
);
assert.doesNotMatch(
  between(html, '#stage::before {', '.bg-cloud,'),
  /repeating-linear-gradient/,
  'the old scanline overlay must stay removed'
);
assert.doesNotMatch(html, /menu_card_base_0[1-4]\.webp/, 'rejected menu-card assets must not be referenced by writing-mori');
const expectedImageOnlyVariables = Object.freeze({
  '--story-frame-board': '../assets/images/mojikko/writing/storybook/frame-family/01_mojikko_unified_board_frame.png',
  '--story-frame-character': '../assets/images/mojikko/writing/storybook/frame-family/02_mojikko_character_list_frame.png',
  '--story-frame-companion': '../assets/images/mojikko/writing/storybook/frame-family/03_mojikko_companion_frame.png',
  '--story-frame-stroke': '../assets/images/mojikko/writing/storybook/frame-family/04_mojikko_stroke_order_frame.png',
  '--story-frame-prompt': '../assets/images/mojikko/writing/storybook/frame-family/05_mojikko_message_frame.png',
  '--story-frame-chooser': '../assets/images/mojikko/writing/storybook/frame-family/06_mojikko_mode_chooser_base.png',
  '--story-frame-result': '../assets/images/mojikko/writing/storybook/frame-family/07_mojikko_result_frame.png',
  '--story-button-secondary': '../assets/images/mojikko/writing/storybook/frame-family/10_mojikko_secondary_button_normal.png',
  '--story-button-primary': '../assets/images/mojikko/writing/storybook/frame-family/11_mojikko_primary_button_normal.png',
  '--story-star-counter': '../assets/images/mojikko/writing/storybook/frame-family/12_mojikko_star_counter_regular.png',
  '--story-star-counter-short': '../assets/images/mojikko/writing/storybook/frame-family/12_mojikko_star_counter_short.png',
  '--story-settings': '../assets/images/mojikko/writing/storybook/frame-family/13_mojikko_settings_button_normal.png',
  '--story-kana-tab': '../assets/images/mojikko/writing/storybook/frame-family/14_mojikko_kana_tab_main_normal.png',
  '--story-kana-tab-short': '../assets/images/mojikko/writing/storybook/frame-family/14_mojikko_kana_tab_short_normal.png',
  '--story-char-tile': '../assets/images/mojikko/writing/storybook/frame-family/15_mojikko_character_tile_main_normal.png',
  '--story-char-tile-short': '../assets/images/mojikko/writing/storybook/frame-family/15_mojikko_character_tile_short_normal.png'
});
for (const [variable, source] of Object.entries(expectedImageOnlyVariables)) {
  assert.match(
    html,
    new RegExp(`${variable.replaceAll('-', '\\-')}:\\s*url\\(['\"]${source.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}['\"]\\)`),
    `${variable}: image-only asset mapping drifted`
  );
}
const unifiedFrameCss = between(
  html,
  'Unified frame family (batch:1328b)',
  '</style>'
);
assert.doesNotMatch(
  html,
  /background-size:\s*100%\s+100%/,
  'generated frame art must never be stretched away from its native ratio'
);
assert.doesNotMatch(
  html,
  /--story-(?:button-(?:primary|secondary)-pressed|choice-pressed)|Fukuro_frame_002_pressed|story_choice_pressed/,
  'normal frame art must stay fixed during pressed states'
);
assert.doesNotMatch(
  html,
  /assets\/(?:zukan\/ui\/(?:hint|discovery|investigation|map)|images\/Fukuro_frame_|images\/StickerBook\/)/,
  'the writing screen must not mix legacy frame families back in'
);
assert.match(
  unifiedFrameCss,
  /\.character-panel\s*\{[^}]*aspect-ratio:\s*907\s*\/\s*1442;[^}]*background-image:\s*var\(--story-frame-character\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /\.companion-card\s*\{[^}]*aspect-ratio:\s*1128\s*\/\s*1043;[^}]*background-image:\s*var\(--story-frame-companion\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /\.stroke-panel\s*\{[^}]*aspect-ratio:\s*496\s*\/\s*1759;[^}]*background-image:\s*var\(--story-frame-stroke\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /\.prompt-bar,\s*\.message-box\s*\{[^}]*aspect-ratio:\s*1751\s*\/\s*282;[^}]*background-image:\s*var\(--story-frame-prompt\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /\.mode-choice-card\s*\{[^}]*aspect-ratio:\s*1159\s*\/\s*1079;[^}]*background-image:\s*var\(--story-frame-chooser\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /\.result-card\s*\{[^}]*aspect-ratio:\s*1597\s*\/\s*763;[^}]*background-image:\s*var\(--story-frame-result\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /\.star-box\s*\{[^}]*aspect-ratio:\s*933\s*\/\s*346;[^}]*background:\s*var\(--story-star-counter\) center \/ contain no-repeat;/s
);
assert.match(
  unifiedFrameCss,
  /\.settings-btn\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1;[^}]*background:\s*url\('\.\.\/assets\/_legacy\/preview-placeholders\/ctrl-btn-settings\.png'\) center \/ contain no-repeat !important;/s
);
assert.match(
  unifiedFrameCss,
  /#modeSwitchBtn,\s*#resetBtn,\s*#careBtn\s*\{[^}]*aspect-ratio:\s*1223\s*\/\s*363;[^}]*background-image:\s*var\(--story-button-secondary\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /#doneBtn,\s*#modalRetryBtn\s*\{[^}]*aspect-ratio:\s*1334\s*\/\s*530;[^}]*background-image:\s*var\(--story-button-primary\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /\.kana-tab\s*\{[^}]*aspect-ratio:\s*570\s*\/\s*331;[^}]*background-image:\s*var\(--story-kana-tab\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /\.char-button,\s*\.char-spacer\s*\{[^}]*aspect-ratio:\s*404\s*\/\s*564;/s
);
assert.match(
  unifiedFrameCss,
  /@media \(max-height:\s*500px\)[^]*\.star-box\s*\{[^}]*aspect-ratio:\s*787\s*\/\s*416;[^}]*background-image:\s*var\(--story-star-counter-short\);/s
);
assert.match(
  unifiedFrameCss,
  /@media \(max-height:\s*500px\)[^]*\.kana-tab\s*\{[^}]*aspect-ratio:\s*723\s*\/\s*720;[^}]*background-image:\s*var\(--story-kana-tab-short\) !important;/s
);
assert.match(
  unifiedFrameCss,
  /@media \(max-height:\s*500px\)[^]*\.char-button,\s*\.char-spacer\s*\{[^}]*aspect-ratio:\s*559\s*\/\s*561;/s
);
assert.match(
  unifiedFrameCss,
  /@media \(max-height:\s*500px\)[^]*#stage #careBtn,\s*#stage #modalRetryBtn\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*44px;/s,
  'short landscape must release the legacy fixed button height'
);
assert.match(
  unifiedFrameCss,
  /\.kana-tab\.active::before,\s*\.char-button\.active::before,\s*\.char-button\.done\.active::before\s*\{[^}]*background:\s*rgba\(247, 229, 167, 0\.68\);/s,
  'selection feedback must tint only the baked paper well'
);
assert.match(
  unifiedFrameCss,
  /\.mode-choice-button\.active::before,\s*\.mode-choice-button:active:not\(:disabled\)::before\s*\{[^}]*background:\s*#f7e5a7;[^}]*opacity:\s*0\.72;/s,
  'mode selection feedback must tint only its baked quadrant'
);
assert.match(
  unifiedFrameCss,
  /\.panel-title,\s*\.companion-speech,\s*\.reward-box,\s*\.reward-large\s*\{[^}]*border:\s*0 !important;[^}]*border-radius:\s*0 !important;/s,
  'nested text boxes must not add a second frame inside the generated windows'
);
assert.match(
  unifiedFrameCss,
  /body #ach-next-hint\s*\{[^}]*aspect-ratio:\s*1751\s*\/\s*282;[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*background:\s*var\(--story-frame-prompt\) center \/ contain no-repeat;[^}]*box-shadow:\s*none;/s,
  'the achievement progress notice must reuse the fixed message-frame base without CSS pill chrome'
);
assert.match(
  html,
  /\.mode-choice-buttons\s*\{[^}]*grid-template-columns:\s*1fr 1fr;[^}]*grid-template-rows:\s*1fr 1fr;/s,
  'F002 must expose its four baked windows as a 2x2 hit-area grid'
);
assert.equal((html.match(/class="pixel-button[^\"]*mode-choice-button/g) || []).length, 4, 'F002 must contain exactly four real buttons');
assert.match(
  unifiedFrameCss,
  /\.writing-board\s*\{[^}]*height:\s*100%;[^}]*aspect-ratio:\s*1203\s*\/\s*1081;[^}]*background:\s*transparent;/s,
  'the story frame must keep its native ratio without shrinking the writer'
);
assert.match(
  unifiedFrameCss,
  /\.writing-board::before\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*border:\s*0 !important;[^}]*background:\s*var\(--story-frame-board\) center \/ contain no-repeat;/s,
  'the generated board must be a fixed non-sizing overlay'
);
assert.match(
  unifiedFrameCss,
  /\.writing-board::after\s*\{[^}]*content:\s*none !important;[^}]*display:\s*none !important;/s,
  'the generated board paper must not be covered by an extra opaque box'
);
assert.doesNotMatch(html, /class="star-icon"/, 'the generated star counter must not duplicate its baked icon');
assert.doesNotMatch(html, /settings-btn[^>]*>\s*<img/, 'the canonical settings button must remain a single CSS image');
assert.doesNotMatch(html, /\bid="backBtn"/, 'the standalone return button must stay inside settings');
assert.match(
  html,
  /id="settingsBtn"[^>]*aria-haspopup="menu"[^>]*aria-controls="settingsPopover"[^>]*aria-expanded="false"/,
  'the settings trigger must expose its menu relationship'
);
assert.match(
  html,
  /id="settingsPopover"[^>]*role="menu"[^>]*aria-label="せってい"[^>]*aria-hidden="true"[^>]*hidden/,
  'the settings popover must start hidden from sight and assistive technology'
);
assert.match(
  html,
  /id="settingsBackBtn"[^>]*role="menuitem"[^>]*tabindex="-1"[^>]*>もどる<\/button>/,
  'the first settings item must be the kana return action'
);
assert.match(
  unifiedFrameCss,
  /\.stage-header\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\);/s,
  'the mode switch must stay centered between equal header tracks'
);
assert.match(
  html,
  /function setSettingsMenuOpen\([^]*settingsPopover\.hidden\s*=\s*!next;[^]*settingsPopover\.setAttribute\('aria-hidden', next \? 'false' : 'true'\);[^]*settingsBtn\.setAttribute\('aria-expanded', next \? 'true' : 'false'\);[^]*item\.tabIndex\s*=\s*next \? 0 : -1;/s,
  'the settings menu must keep hidden, ARIA, and tab stops synchronized'
);
assert.match(html, /event\.key === 'ArrowDown'[^]*event\.key === 'ArrowUp'[^]*event\.key === 'Home'[^]*event\.key === 'End'/s);
assert.match(html, /event\.key === 'Escape'[^]*closeSettingsMenu\(\{ restoreFocus: true \}\)/s);
assert.match(
  html,
  /document\.addEventListener\('pointerdown', \(event\) => \{[^]*settingsOutsideClickUntil = Date\.now\(\) \+ 500;[^]*event\.preventDefault\(\);[^]*event\.stopImmediatePropagation\(\);[^]*closeSettingsMenu\(\{ restoreFocus: true \}\);[^]*\}, true\);/s,
  'outside pointer dismissal must stop tap-through and restore a valid focus target'
);
assert.match(
  html,
  /function refreshWritingLayoutAndModeRuntime\(\)[^]*isSettingsMenuOpen\(\)\) closeSettingsMenu\(\{ restoreFocus: false \}\);/s,
  'portrait or tier lock must close settings before blocking the writing runtime'
);
assert.match(
  html,
  /function openResultOverlay\(\)[^]*isSettingsMenuOpen\(\)\) closeSettingsMenu\(\{ restoreFocus: true \}\);[^]*const activeElement = document\.activeElement;/s,
  'the settings menu must close before result focus is captured'
);
assert.match(
  html,
  /function openModeChoice\(\)[^]*isSettingsMenuOpen\(\)\) closeSettingsMenu\(\{ restoreFocus: true \}\);/s,
  'the settings menu must close before the mode chooser opens'
);
assert.match(
  html,
  /settingsBackBtn\.addEventListener\('click', \(event\) => \{[^]*clearPendingWritingCompletionTimers\(\);[^]*saveCareState\(\);[^]*window\.location\.href = '\.\.\/play\.html';/s,
  'returning through settings must cancel completion work, save care, then navigate home'
);

assert.doesNotMatch(
  html,
  /assets\/images\/mojikko\/(?:writing\/(?!storybook\/)|care\/(?!yard_background_wide_v2\.png))/,
  'the writing screen must not load the former pixel UI asset set'
);
const pixelatedDeclarations = html.match(/image-rendering:\s*pixelated/g) || [];
assert.equal(pixelatedDeclarations.length, 1, 'only the handwriting trail may remain pixel-rendered');
assert.match(html, /#pixelTrailCanvas\s*\{\s*image-rendering:\s*pixelated/);
assert.doesNotMatch(html, /ドット/, 'child-facing storybook copy must not describe the guide as dots');
assert.match(html, /id="messageBox"[^>]*role="status"[^>]*aria-live="polite"[^>]*hidden/);
assert.match(html, /\.message-box\s*\{[^}]*top:\s*0;[^}]*width:\s*min\(820px, 100%\)[^}]*display:\s*flex/s);
assert.match(html, /\.prompt-bar\.feedback-hidden\s*\{\s*visibility:\s*hidden/);
assert.match(html, /function setMessage\([^]*messageBox\.hidden\s*=\s*!nextMessage;[^]*promptText\.classList\.toggle\('feedback-hidden'/);
assert.match(html, /#doneBtn\s*\{[^}]*width:\s*196px/s);
assert.match(html, /#resetBtn\s*\{[^}]*width:\s*235px/s);
assert.match(html, /\.pixel-creature\s*\{[^}]*background:\s*none center \/ contain no-repeat/s);
assert.match(html, /\.companion-card\.visual-grown \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-grown\)/s);
assert.match(html, /\.companion-card\.visual-egg \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-egg\)/s);
assert.match(html, /\.companion-card\.visual-baby \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-baby\)/s);
assert.match(html, /\.companion-card\.visual-yochiyochi \.pixel-creature\s*\{[^}]*background-image:\s*var\(--story-milmaru-yochiyochi\)/s);
assert.match(html, /classList\.remove\('visual-egg', 'visual-baby', 'visual-yochiyochi', 'visual-grown'\);\s*companionCard\.classList\.add\(visualClass\);/);
assert.match(html, /if \(sukusuku < 50\) return 'yochiyochi';\s*if \(sukusuku < 80\) return 'kids';/);
assert.match(html, /\.food-pixel\.milk\s*\{[^}]*background:\s*var\(--story-milk\)/s);
assert.match(html, /#careBtn\.reward-milk::before\s*\{[^}]*background:\s*var\(--story-milk\)/s);
assert.doesNotMatch(html, /(?:\.food-pixel\.milk|#careBtn\.reward-milk::before|\.companion-cookie\.milk)\s*\{[^}]*linear-gradient/s);
const celebrateBlocks = html.match(/\.companion-card(?:\.[\w-]+)*\.celebrate \.pixel-creature\s*\{[^}]*\}/g) || [];
assert.ok(celebrateBlocks.length >= 1, 'the current Milmaru state must still animate on celebration');
assert.ok(
  celebrateBlocks.every((block) => !/background(?:-image)?\s*:/.test(block)),
  'celebration must not replace the current growth-stage art'
);

const artSource = between(
  html,
  'const WORD_HOLE_STORYBOOK_ART = Object.freeze({',
  'const FOOD_SYSTEM_VERSION ='
);
const artContext = {};
vm.createContext(artContext);
vm.runInContext(`${artSource}\nglobalThis.art = WORD_HOLE_STORYBOOK_ART;`, artContext);
const art = JSON.parse(JSON.stringify(artContext.art));
assert.equal(Object.keys(art).length, 18, 'every word clue must use storybook art');
assert.equal(
  art['ひまわり'],
  '../assets/images/mojikko/writing/storybook/word_himawari_20260716.webp',
  'the delivered sunflower must replace its emoji fallback'
);
for (const [word, src] of Object.entries(art)) {
  assert.match(src, /^\.\.\/assets\//, `${word}: art must remain same-origin`);
  const file = path.resolve(root, 'writing-mori', src);
  assert.ok(file.startsWith(`${root}${path.sep}`), `${word}: art escaped repository root`);
  assert.ok(fs.existsSync(file), `${word}: missing mapped art ${src}`);
  assert.ok(fs.statSync(file).size > 0, `${word}: mapped art is empty`);
}
assert.match(html, /clueArt\.src\s*=\s*currentTask\.art/);
assert.match(html, /clueArt\.decoding\s*=\s*'async'/);

const protectedRanges = [
  {
    start: 'function getHanziGridTransform(',
    end: 'function renderPixelLetter(',
    hash: 'ad9ee0fd496becff71ac3d1b6d0554110ff0279a5d0d8d2be4abab9fe88df518'
  },
  {
    start: 'function renderPixelLetter(',
    end: 'function resetWriting(',
    hash: '5c451465e5958a2d132478bface72667192cc9aed85f4b26c4e6a55ed87c2232'
  },
  {
    start: 'function getWritingReadiness(',
    end: 'async function completeWriting(',
    hash: '70188513f41329e3fccf99ab65a1bd11fd314fda5be01432628dd9bea9154929'
  }
];
for (const range of protectedRanges) {
  assert.equal(
    sha256(between(html, range.start, range.end)),
    range.hash,
    `protected handwriting implementation drifted: ${range.start}`
  );
}

console.log('Mojikko storybook UI regression: PASS');
