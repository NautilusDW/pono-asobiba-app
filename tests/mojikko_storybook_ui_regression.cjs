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
const allowPendingAssets = process.env.MOJIKKO_ALLOW_PENDING_ASSETS === '1';

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
  'assets/images/quizland/Fukuro_frame_003.webp',
  'assets/images/quizland/progress-num.png',
  'assets/images/mojikko/writing/storybook/owl-riddle-frame-family/01_word_hole_task_995x1581.png',
  'assets/images/mojikko/writing/storybook/owl-riddle-frame-family/02_milmaru_reward_1305x1206.png',
  'assets/images/mojikko/writing/storybook/owl-riddle-frame-family/03_writing_board_1323x1189.png',
  'assets/images/mojikko/writing/storybook/owl-riddle-frame-family/04_stroke_order_centered_941x1672.png',
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
  if (!fs.existsSync(file) && allowPendingAssets && relative.includes('/owl-riddle-frame-family/')) {
    console.warn(`pending Owl-riddle frame: ${relative}`);
    continue;
  }
  assert.ok(fs.existsSync(file), `missing storybook asset: ${relative}`);
  assert.ok(fs.statSync(file).size > 0, `empty storybook asset: ${relative}`);
  assert.ok(fs.statSync(file).size < 3 * 1024 * 1024, `storybook asset exceeds 3MB: ${relative}`);
}

const frameAssetExpectations = Object.freeze({
  'assets/images/mojikko/writing/storybook/owl-riddle-frame-family/01_word_hole_task_995x1581.png': {
    dimensions: [995, 1581],
    sha256: 'ec8c9f2677143033d59fb9ac599cdc101c874436ea2616837eeda0ae34c9a17d'
  },
  'assets/images/mojikko/writing/storybook/owl-riddle-frame-family/02_milmaru_reward_1305x1206.png': {
    dimensions: [1305, 1206],
    sha256: '314ba523b79416c1e93888f547f91d28a412bf06bb909d9a27450fbe11eb3d52'
  },
  'assets/images/mojikko/writing/storybook/owl-riddle-frame-family/03_writing_board_1323x1189.png': {
    dimensions: [1323, 1189],
    sha256: 'db14e39fc984969b611e92f3e9d81d4a979aa8bab52b2c44b3d63f3dfb985166'
  },
  'assets/images/mojikko/writing/storybook/owl-riddle-frame-family/04_stroke_order_centered_941x1672.png': {
    dimensions: [941, 1672],
    sha256: 'ad8be1c49686f02f1c458bc9569075e9d37fdb5281536ea6f096ad7e95092f6e'
  }
});
for (const [source, expected] of Object.entries(frameAssetExpectations)) {
  if (!fs.existsSync(path.join(root, source)) && allowPendingAssets) continue;
  const png = fs.readFileSync(path.join(root, source));
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG', `${source}: special frame is not a PNG`);
  assert.deepEqual(
    [png.readUInt32BE(16), png.readUInt32BE(20)],
    expected.dimensions,
    `${source}: dimensions drifted`
  );
  assert.equal(sha256(png), expected.sha256, `${source}: accepted raw bytes drifted`);
}
assert.equal(
  sha256(fs.readFileSync(path.join(root, 'assets/images/quizland/Fukuro_frame_003.webp'))),
  '48fa73e70f17e738f59ebf8772c6d6d50af7a5ff12d45174491bca3908a35d2d',
  'the exact Quizland message-strip pixels drifted'
);
assert.equal(
  sha256(fs.readFileSync(path.join(root, 'assets/images/quizland/progress-num.png'))),
  '380b6303ae9598e8e08e5f65bd760e6d3d579cde0b24be690bd607eec91155ea',
  'the exact Quizland generic-paper pixels drifted'
);

const canonicalSettingsPng = fs.readFileSync(path.join(root, 'assets/_legacy/preview-placeholders/ctrl-btn-settings.png'));
assert.equal(canonicalSettingsPng.subarray(1, 4).toString('ascii'), 'PNG', 'canonical settings control is not a PNG');
assert.deepEqual(
  [canonicalSettingsPng.readUInt32BE(16), canonicalSettingsPng.readUInt32BE(20)],
  [120, 120],
  'canonical settings control must keep its square natural ratio'
);
assert.equal(
  sha256(canonicalSettingsPng),
  '296a555c4baafc4e1e19d5bcb1f9c4330ae18cc52c49501fdfbd9fb2074edccd',
  'canonical settings control pixels drifted'
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

const nativeCoverageRegressions = Object.keys(frameAssetExpectations);
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
  /#stage-wrap\s*\{\s*background:\s*var\(--story-yard-bg\) right center \/ cover no-repeat;\s*\}\s*#stage\s*\{\s*background:\s*var\(--story-yard-bg\) right center \/ cover no-repeat;/s,
  'the wrapper letterbox and stage must both keep the original yard artwork'
);
assert.doesNotMatch(
  between(html, '#stage::before {', '.bg-cloud,'),
  /repeating-linear-gradient/,
  'the old scanline overlay must stay removed'
);
assert.doesNotMatch(html, /menu_card_base_0[1-4]\.webp/, 'rejected menu-card assets must not be referenced by writing-mori');
const frameVariableExpectations = Object.freeze({
  strip: ['--owl-strip-frame', '../assets/images/quizland/Fukuro_frame_003.webp'],
  generic: ['--owl-generic-frame', '../assets/images/quizland/progress-num.png'],
  task: ['--owl-special-task', '../assets/images/mojikko/writing/storybook/owl-riddle-frame-family/01_word_hole_task_995x1581.png'],
  milmaru: ['--owl-special-milmaru', '../assets/images/mojikko/writing/storybook/owl-riddle-frame-family/02_milmaru_reward_1305x1206.png'],
  writing: ['--owl-special-writing', '../assets/images/mojikko/writing/storybook/owl-riddle-frame-family/03_writing_board_1323x1189.png'],
  stroke: ['--owl-special-stroke', '../assets/images/mojikko/writing/storybook/owl-riddle-frame-family/04_stroke_order_centered_941x1672.png']
});
for (const [role, [variable, source]] of Object.entries(frameVariableExpectations)) {
  assert.ok(html.includes(`${variable}: url('${source}');`), `${role}: Owl-riddle source must remain a literal same-origin asset`);
}
assert.match(html, /--owl-generic-slice:\s*18 fill;/, 'Quizland progress paper slice drifted');
assert.match(html, /--owl-generic-rail:\s*8px;/, 'normal Quizland rail width drifted');
assert.doesNotMatch(html, /--story-settings\b/, 'the rejected settings-frame variable must not remain reusable');
assert.doesNotMatch(
  html,
  /white-ornate|assets\/images\/mojikko\/writing\/storybook\/(?:frame-family|settings-gauge-family)\//,
  'the superseded frame families must not be referenced at runtime'
);
const owlFrameCss = between(
  html,
  'Owl-doctor runtime materials (batch:1328e)',
  '</style>'
);
assert.doesNotMatch(
  html,
  /background-size:\s*100%\s+100%|object-fit:\s*fill/,
  'Owl-riddle frame art must never be stretched away from its native ratio'
);
assert.doesNotMatch(
  html,
  /--story-(?:button-(?:primary|secondary)-pressed|choice-pressed)|Fukuro_frame_002_pressed|story_choice_pressed/,
  'normal frame art must stay fixed during pressed states'
);
assert.doesNotMatch(
  html,
  /assets\/(?:zukan\/ui\/(?:hint|discovery|investigation|map)|images\/StickerBook\/)/,
  'the writing screen must not mix unrelated frame families back in'
);
const specialBaseRule = between(owlFrameCss, '.character-panel,', '\n}\n\n.character-panel {');
for (const selector of [
  '.character-panel', '.companion-card', '.writing-board', '.prompt-bar', '.message-box'
]) {
  assert.ok(specialBaseRule.includes(selector), selector + ': escaped the native-ratio surface rule');
}
assert.doesNotMatch(specialBaseRule, /\.stroke-panel/, 'the centered stroke crop must not use the full-image contain path');
assert.match(specialBaseRule, /border-image:\s*none !important;/);
assert.match(specialBaseRule, /background-size:\s*contain !important;/);
assert.match(specialBaseRule, /background-color:\s*transparent !important;/);

const roleFrameRules = Object.freeze([
  ['.character-panel {', '.companion-card {', '--owl-special-task', '995 / 1581', '14px'],
  ['.companion-card {', '.stroke-panel {', '--owl-special-milmaru', '1305 / 1206', '15px'],
  ['.writing-board {', '.prompt-bar,', '--owl-special-writing', '1323 / 1189', '22px']
]);
for (const [start, end, sourceVariable, ratio, radius] of roleFrameRules) {
  const rule = between(owlFrameCss, start, end);
  assert.match(rule, new RegExp('background-image:\\s*var\\(' + sourceVariable + '\\) !important;'));
  assert.match(rule, new RegExp('aspect-ratio:\\s*' + ratio.replaceAll(' ', '\\s*') + ';'));
  assert.match(rule, new RegExp('border-radius:\\s*' + radius.replace('.', '\\.') + ' !important;'));
  assert.match(rule, /background-clip:\s*border-box !important;/, sourceVariable + ': rounded clipping drifted');
}

const strokeFrameRule = between(owlFrameCss, '.stroke-panel {', '.writing-board {');
assert.match(strokeFrameRule, /aspect-ratio:\s*496\s*\/\s*1759;/);
assert.match(strokeFrameRule, /border-image:\s*none !important;/);
assert.match(strokeFrameRule, /background-image:\s*var\(--owl-special-stroke\) !important;/);
assert.match(strokeFrameRule, /background-position:\s*center !important;/);
assert.match(strokeFrameRule, /background-repeat:\s*no-repeat !important;/);
assert.match(strokeFrameRule, /background-size:\s*auto 100% !important;/);
assert.match(strokeFrameRule, /border-radius:\s*12px !important;/);
assert.match(strokeFrameRule, /background-clip:\s*border-box !important;/);
assert.match(strokeFrameRule, /overflow:\s*hidden;/);
assert.doesNotMatch(strokeFrameRule, /border-image-(?:source|slice|width)|background-size:\s*(?:contain|100%\s+100%)/, 'stroke must use one uniform centered height-fit crop only');

const messageFrameRule = between(owlFrameCss, '.prompt-bar,\n.message-box {', '.writing-board::before,');
assert.match(messageFrameRule, /box-sizing:\s*border-box;/);
assert.match(messageFrameRule, /aspect-ratio:\s*1252\s*\/\s*201;/, 'the exact Quizland strip ratio drifted');
assert.match(messageFrameRule, /background-image:\s*var\(--owl-strip-frame\) !important;/);
assert.match(messageFrameRule, /padding-inline:\s*54px !important;/, 'the shallow message frame lost its 32px+ text safety area');
assert.match(
  html,
  /\.settings-btn\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1;[^}]*background:\s*url\('\.\.\/assets\/_legacy\/preview-placeholders\/ctrl-btn-settings\.png'\) center \/ contain no-repeat !important;/s
);

const genericSurfaceRule = between(owlFrameCss, '.star-box,', '\n}\n\n#modeSwitchBtn,');
for (const selector of [
  '.star-box', '#modeSwitchBtn', '#resetBtn', '#doneBtn', '#careBtn', '#modalRetryBtn',
  '.kana-tab', '.char-button', '.word-clue-cell.blank', '.daily-clue-cell',
  '.mode-progress-count', '.settings-popover', '.mode-choice-card', '.result-card'
]) {
  assert.ok(genericSurfaceRule.includes(selector), selector + ': escaped the Quizland generic surface rule');
}
assert.doesNotMatch(genericSurfaceRule, /\.mode-progress-dot/, '28px progress dots must never receive a 9-slice rail');
assert.match(genericSurfaceRule, /border:\s*0 solid transparent !important;/);
assert.match(genericSurfaceRule, /border-image-source:\s*var\(--owl-generic-frame\) !important;/);
assert.match(genericSurfaceRule, /border-image-slice:\s*var\(--owl-generic-slice\) !important;/);
assert.match(genericSurfaceRule, /border-image-width:\s*var\(--owl-generic-rail\) !important;/);
assert.match(genericSurfaceRule, /border-image-outset:\s*0 !important;/);
assert.match(genericSurfaceRule, /border-image-repeat:\s*stretch !important;/);
assert.match(genericSurfaceRule, /background:\s*none !important;/);
assert.doesNotMatch(genericSurfaceRule, /\.settings-btn|\.settings-menu-item|\.mode-choice-button/, 'exceptions must not gain nested frames');
assert.match(
  html,
  /\.mode-progress-dot\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px;[^}]*border-radius:\s*50%;/s,
  'mode progress must remain a native 28px circular marker'
);
assert.match(
  owlFrameCss,
  /@media \(max-height:\s*500px\)[^]*:root\s*\{[^}]*--owl-generic-rail:\s*14\.5px;/s,
  'short landscape must preserve the generic visible rail'
);
assert.match(
  owlFrameCss,
  /\.writing-board::before,[^}]*\.message-box::after\s*\{[^}]*content:\s*none !important;[^}]*display:\s*none !important;[^}]*border-image:\s*none !important;/s,
  'native-ratio frames must not keep a second pseudo-frame layer'
);
assert.match(
  owlFrameCss,
  /body #ach-next-hint\s*\{[^}]*aspect-ratio:\s*1252\s*\/\s*201;[^}]*border-image:\s*none !important;[^}]*background:\s*var\(--owl-strip-frame\) center \/ contain no-repeat !important;/s,
  'the transient achievement hint must use one native Owl-doctor strip instead of a sliced rail'
);
assert.match(
  owlFrameCss,
  /body:has\(#ach-next-hint\.show\) #stage \.feedback-row \.pixel-button\s*\{[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;[^}]*border-image-source:\s*none !important;[^}]*background:\s*none !important;/s,
  'the transient achievement hint must fully occlude the normal operation frames'
);
assert.match(
  owlFrameCss,
  /\.settings-menu-item,[^}]*\.mode-choice-close\s*\{[^}]*border-image:\s*none !important;[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;/s,
  'settings must have one outer frame, not a nested return frame'
);
assert.match(
  owlFrameCss,
  /\.mode-choice-buttons\s*\{[^}]*inset:\s*var\(--owl-generic-rail\);/s,
  'chooser hit areas must stay inside the one outer rail'
);
assert.match(
  owlFrameCss,
  /\.mode-choice-button:nth-child\(odd\)\s*\{[^}]*border-right:\s*1px solid/s,
  'chooser columns must use only a one-pixel HTML separator'
);
assert.match(
  owlFrameCss,
  /\.mode-choice-button:nth-child\(-n \+ 2\)\s*\{[^}]*border-bottom:\s*1px solid/s,
  'chooser rows must use only a one-pixel HTML separator'
);
assert.match(
  html,
  /\.mode-choice-button\.active::before\s*\{[^}]*background:\s*rgba\(239, 216, 154, 0\.42\);/s,
  'mode selection feedback must tint only its unframed quadrant'
);
assert.match(
  owlFrameCss,
  /\.panel-title,[^}]*\.stroke-mini svg\s*\{[^}]*background-color:\s*transparent !important;[^}]*background-image:\s*none !important;[^}]*box-shadow:\s*none !important;/s,
  'inner text surfaces must not add a second frame'
);
assert.match(
  html,
  /\.mode-choice-buttons\s*\{[^}]*grid-template-columns:\s*1fr 1fr;[^}]*grid-template-rows:\s*1fr 1fr;/s,
  'the chooser must expose four equal 2x2 hit areas'
);
assert.equal((html.match(/class="pixel-button[^\"]*mode-choice-button/g) || []).length, 4, 'the chooser must contain exactly four real buttons');
assert.match(html, /class="star-icon" aria-hidden="true"/, 'the universal star counter must restore its separate icon');
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
  html,
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
