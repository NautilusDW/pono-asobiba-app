#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const generatedStoryAssets = [
  '/assets/images/mojikko/writing/storybook/icon_moji_milk_20260716.webp',
  '/assets/images/mojikko/writing/storybook/word_himawari_20260716.webp',
  '/assets/images/mojikko/writing/storybook/milmaru_grown_wave_20260716.webp',
  '/assets/images/mojikko/writing/storybook/milmaru_yochiyochi_front_20260716.webp',
  '/assets/images/mojikko/writing/storybook/milmaru_shell_baby_idle_20260716.webp',
  '/assets/images/mojikko/writing/storybook/milmaru_egg_idle_20260716.webp'
];
const frameAssets = [
  '/assets/images/mojikko/care/yard_background_wide_v2.png',
  '/assets/images/mojikko/writing/storybook/frame-family/01_mojikko_unified_board_frame.png',
  '/assets/images/mojikko/writing/storybook/frame-family/02_mojikko_character_list_frame.png',
  '/assets/images/mojikko/writing/storybook/frame-family/03_mojikko_companion_frame.png',
  '/assets/images/mojikko/writing/storybook/frame-family/04_mojikko_stroke_order_frame.png',
  '/assets/images/mojikko/writing/storybook/frame-family/05_mojikko_message_frame.png',
  '/assets/images/mojikko/writing/storybook/frame-family/06_mojikko_mode_chooser_base.png',
  '/assets/images/mojikko/writing/storybook/frame-family/07_mojikko_result_frame.png',
  '/assets/images/mojikko/writing/storybook/frame-family/10_mojikko_secondary_button_normal.png',
  '/assets/images/mojikko/writing/storybook/frame-family/11_mojikko_primary_button_normal.png',
  '/assets/images/mojikko/writing/storybook/frame-family/12_mojikko_star_counter_regular.png',
  '/assets/images/mojikko/writing/storybook/frame-family/12_mojikko_star_counter_short.png',
  '/assets/images/mojikko/writing/storybook/frame-family/13_mojikko_settings_button_normal.png',
  '/assets/images/mojikko/writing/storybook/frame-family/14_mojikko_kana_tab_main_normal.png',
  '/assets/images/mojikko/writing/storybook/frame-family/14_mojikko_kana_tab_short_normal.png',
  '/assets/images/mojikko/writing/storybook/frame-family/15_mojikko_character_tile_main_normal.png',
  '/assets/images/mojikko/writing/storybook/frame-family/15_mojikko_character_tile_short_normal.png'
];
const unifiedFrameDimensions = Object.freeze({
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
const milmaruVisualStates = Object.freeze([
  {
    id: 'egg',
    visualClass: 'visual-egg',
    stateClasses: ['egg-state'],
    asset: 'milmaru_egg_idle_20260716.webp',
    care: { hatched: false, sukusuku: 0, stars: 0, foodSystemVersion: 2 }
  },
  {
    id: 'baby',
    visualClass: 'visual-baby',
    stateClasses: ['hatched-state', 'baby-state'],
    asset: 'milmaru_shell_baby_idle_20260716.webp',
    care: { hatched: true, sukusuku: 10, stars: 0, foodSystemVersion: 2 }
  },
  {
    id: 'yochiyochi',
    visualClass: 'visual-yochiyochi',
    stateClasses: ['hatched-state', 'yochiyochi-state'],
    asset: 'milmaru_yochiyochi_front_20260716.webp',
    care: { hatched: true, sukusuku: 30, stars: 0, foodSystemVersion: 2 }
  },
  {
    id: 'grown',
    visualClass: 'visual-grown',
    stateClasses: ['hatched-state'],
    asset: 'milmaru_grown_wave_20260716.webp',
    care: { hatched: true, sukusuku: 80, stars: 0, foodSystemVersion: 2 }
  }
]);
const kanaAFixture = Object.freeze({
  strokes: [
    'M660,689C637,689 616,679 597,668C570,655 542,648 514,639C464,626 414,615 363,609C319,606 273,607 231,622C211,630 195,646 174,652C167,652 162,643 167,637C181,607 209,587 239,575C284,557 335,556 384,560C462,568 538,593 615,610C639,616 665,619 686,633C695,639 705,646 709,656C712,666 706,676 697,679C685,685 672,689 660,689Z',
    'M334,772C328,770 318,766 320,757C325,746 337,742 346,735C356,729 369,722 369,708C370,687 365,667 363,646C347,530 335,412 345,294C349,258 354,221 366,185C376,158 389,132 410,112C422,103 441,105 449,119C459,136 457,157 448,174C439,190 424,201 415,218C402,245 399,276 396,305C388,397 397,489 415,579C422,613 429,648 447,677C454,692 462,708 459,725C455,740 441,748 427,753C398,764 366,770 334,772Z',
    'M559,469C556,469 552,465 555,462C565,445 581,429 580,408C580,388 567,371 558,355C517,288 461,230 402,179C361,146 315,120 264,108C249,105 232,105 220,116C207,129 208,149 210,166C216,210 244,247 278,275C306,298 337,320 372,335C372,348 372,360 373,373C326,357 282,332 241,304C201,275 165,237 151,188C139,151 143,107 168,76C183,57 206,44 230,43C278,40 324,59 364,83C440,130 506,192 558,264C581,298 602,333 619,370C626,386 632,403 629,419C625,433 615,444 604,453C591,463 575,469 559,469Z M602,416C565,415 528,411 492,406C447,399 405,385 363,369C363,357 363,344 363,332C414,352 467,370 523,376C563,382 604,385 644,381C689,376 736,363 769,331C793,309 806,278 807,246C808,225 806,203 800,183C776,126 725,83 671,54C627,29 580,10 531,-2C521,-6 509,-9 501,-17C498,-21 497,-25 498,-30C549,-27 600,-18 650,-6C715,11 780,39 830,86C861,116 887,155 891,199C899,269 861,343 796,374C736,404 668,416 602,416Z'
  ],
  medians: [
    [[174, 642], [251, 592], [440, 594], [697, 659]],
    [[331, 763], [420, 715], [373, 512], [367, 268], [409, 172], [431, 123]],
    [[570, 460], [610, 416], [460, 173], [200, 64], [181, 218], [342, 344], [466, 386], [641, 401], [754, 380], [838, 294], [845, 137], [703, 31], [508, -22]]
  ]
});
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
      const file = path.resolve(root, `.${relative}`);
      if (!file.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end('forbidden');
        return;
      }
      fs.readFile(file, (error, data) => {
        if (error) {
          response.writeHead(404).end('not found');
          return;
        }
        response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
        response.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

function assertInsideViewport(rect, viewport, label) {
  const epsilon = 1.1;
  assert.ok(rect.left >= -epsilon, `${label}: left overflow ${rect.left}`);
  assert.ok(rect.top >= -epsilon, `${label}: top overflow ${rect.top}`);
  assert.ok(rect.right <= viewport.width + epsilon, `${label}: right overflow ${rect.right}`);
  assert.ok(rect.bottom <= viewport.height + epsilon, `${label}: bottom overflow ${rect.bottom}`);
}

function assertRectContained(inner, outer, label) {
  const epsilon = 1.1;
  assert.ok(inner.left >= outer.left - epsilon, `${label}: text clips left (${inner.left} < ${outer.left})`);
  assert.ok(inner.top >= outer.top - epsilon, `${label}: text clips top (${inner.top} < ${outer.top})`);
  assert.ok(inner.right <= outer.right + epsilon, `${label}: text clips right (${inner.right} > ${outer.right})`);
  assert.ok(inner.bottom <= outer.bottom + epsilon, `${label}: text clips bottom (${inner.bottom} > ${outer.bottom})`);
}

function rectanglesOverlap(first, second) {
  return first.left < second.right - 0.5
    && first.right > second.left + 0.5
    && first.top < second.bottom - 0.5
    && first.bottom > second.top + 0.5;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function assertNoWhiteCornerRectangles(screenshot, rects, label) {
  const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
  for (const [name, rect] of Object.entries(rects)) {
    const sampleSize = Math.max(2, Math.min(8, Math.floor(Math.min(rect.width, rect.height) * 0.09)));
    const samples = [
      [Math.floor(rect.left) + 1, Math.floor(rect.top) + 1],
      [Math.ceil(rect.right) - sampleSize - 1, Math.floor(rect.top) + 1],
      [Math.floor(rect.left) + 1, Math.ceil(rect.bottom) - sampleSize - 1],
      [Math.ceil(rect.right) - sampleSize - 1, Math.ceil(rect.bottom) - sampleSize - 1]
    ];
    for (const [cornerIndex, [startX, startY]] of samples.entries()) {
      let warmPaperPixels = 0;
      let sampledPixels = 0;
      for (let y = startY; y < startY + sampleSize; y += 1) {
        for (let x = startX; x < startX + sampleSize; x += 1) {
          if (x < 0 || y < 0 || x >= info.width || y >= info.height) continue;
          const index = (y * info.width + x) * info.channels;
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          if (red >= 230 && green >= 218 && blue >= 180 && red - blue <= 75) {
            warmPaperPixels += 1;
          }
          sampledPixels += 1;
        }
      }
      const coverage = sampledPixels > 0 ? warmPaperPixels / sampledPixels : 0;
      assert.ok(coverage < 0.98, `${label}:${name}: corner ${cornerIndex + 1} retained a uniform CSS-paper rectangle (${coverage})`);
    }
  }
}

async function auditCompanionFallbackLayout(browser, base) {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await context.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem('pono_bgm_enabled', 'off');
  });
  const page = await context.newPage();
  const pageErrors = [];
  const localFailures = [];
  const localHttpErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(base)) localFailures.push(request.url());
  });
  page.on('response', (response) => {
    if (response.url().startsWith(base) && response.status() >= 400) {
      localHttpErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('https://fonts.googleapis.com/') || url.startsWith('https://fonts.gstatic.com/')) {
      route.abort();
      return;
    }
    if (url.includes('cdn.jsdelivr.net') && decodeURIComponent(new URL(url).pathname).endsWith('/あ.json')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(kanaAFixture)
      });
      return;
    }
    if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) {
      route.continue();
    } else {
      route.abort();
    }
  });

  try {
    await page.goto(`${base}/writing-mori/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MojikkoWritingGame && document.querySelector('.companion-name'));
    const fallback = await page.evaluate(() => {
      const stageScale = document.querySelector('#stage').getBoundingClientRect().height / 900;
      const name = document.querySelector('.companion-name');
      const cardRect = document.querySelector('#companionCard').getBoundingClientRect();
      const boxRect = name.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(name);
      const glyphRect = range.getBoundingClientRect();
      const style = getComputedStyle(name);
      return {
        boxTop: (boxRect.top - cardRect.top) / stageScale,
        boxBottom: (boxRect.bottom - cardRect.top) / stageScale,
        boxHeight: boxRect.height / stageScale,
        glyphTop: (glyphRect.top - cardRect.top) / stageScale,
        glyphBottom: (glyphRect.bottom - cardRect.top) / stageScale,
        glyphBottomAbsolute: glyphRect.bottom,
        speechTop: document.querySelector('.companion-speech').getBoundingClientRect().top,
        creatureTop: document.querySelector('.pixel-creature').getBoundingClientRect().top,
        display: style.display,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
        fontSize: parseFloat(style.fontSize),
        lineHeight: parseFloat(style.lineHeight),
        visualFontSize: parseFloat(style.fontSize) * stageScale
      };
    });
    assert.ok(Math.abs(fallback.boxTop - 31) <= 0.1, 'font-offline: companion title box did not start inside its paper well');
    assert.ok(Math.abs(fallback.boxBottom - 59) <= 0.1, 'font-offline: companion title box did not end inside its paper well');
    assert.ok(Math.abs(fallback.boxHeight - 28) <= 0.1, 'font-offline: companion title box height drifted');
    assert.ok(fallback.glyphTop >= 30, 'font-offline: companion title escapes its paper well top');
    assert.ok(fallback.glyphBottom <= 60, 'font-offline: companion title escapes its paper well bottom');
    assert.ok(Math.abs((fallback.glyphTop + fallback.glyphBottom) / 2 - 45) <= 2, 'font-offline: companion title is not centered');
    assert.equal(fallback.display, 'flex', 'font-offline: companion title lost fixed flex layout');
    assert.equal(fallback.alignItems, 'center', 'font-offline: companion title lost vertical centering');
    assert.equal(fallback.justifyContent, 'center', 'font-offline: companion title lost horizontal centering');
    assert.ok(Math.abs(fallback.lineHeight / fallback.fontSize - 1) <= 0.01, 'font-offline: companion title line-height drifted from 1');
    assert.ok(fallback.visualFontSize >= 12, 'font-offline: companion title fell below the short-landscape font floor');
    assert.ok(fallback.glyphBottomAbsolute <= fallback.speechTop + 2, 'font-offline: companion title overlaps its speech');
    assert.ok(fallback.glyphBottomAbsolute < fallback.creatureTop, 'font-offline: companion title overlaps Milmaru');
    assert.deepEqual(pageErrors, [], 'font-offline: page errors');
    assert.deepEqual(localFailures, [], 'font-offline: local request failures');
    assert.deepEqual(localHttpErrors, [], 'font-offline: local HTTP errors');
  } finally {
    await context.close();
  }
}

async function auditMilmaruInitialNetwork(browser, base, state) {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await context.addInitScript(({ care }) => {
    window.__APP_BUILD__ = 1;
    localStorage.setItem('pono_bgm_enabled', 'off');
    localStorage.setItem('mojikkoFarmCareStateV1', JSON.stringify(care));
  }, { care: state.care });

  const page = await context.newPage();
  const pageErrors = [];
  const localFailures = [];
  const localHttpErrors = [];
  const milmaruRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (/\/assets\/images\/mojikko\/writing\/storybook\/milmaru_[^/?]+\.webp(?:[?#]|$)/.test(url)) {
      milmaruRequests.push(path.basename(new URL(url).pathname));
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(base)) localFailures.push({ url: request.url(), error: request.failure()?.errorText });
  });
  page.on('response', (response) => {
    if (response.url().startsWith(base) && response.status() >= 400) {
      localHttpErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('cdn.jsdelivr.net') && decodeURIComponent(new URL(url).pathname).endsWith('/あ.json')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(kanaAFixture)
      });
      return;
    }
    if (url.startsWith('https://fonts.googleapis.com/') || url.startsWith('https://fonts.gstatic.com/')) {
      route.continue();
      return;
    }
    if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) {
      route.continue();
    } else {
      route.abort();
    }
  });

  try {
    await page.goto(`${base}/writing-mori/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(({ visualClass, asset }) => {
      const card = document.querySelector('#companionCard');
      const creature = document.querySelector('.pixel-creature');
      return window.MojikkoWritingGame
        && card.classList.contains(visualClass)
        && getComputedStyle(creature).backgroundImage.includes(asset);
    }, { visualClass: state.visualClass, asset: state.asset });
    await page.waitForFunction((asset) => performance.getEntriesByType('resource').some((entry) => entry.name.includes(asset)), state.asset);
    await page.waitForTimeout(80);

    const initial = await page.evaluate(() => {
      const card = document.querySelector('#companionCard');
      const creature = document.querySelector('.pixel-creature');
      return {
        visualClasses: Array.from(card.classList).filter((name) => name.startsWith('visual-')),
        stateClasses: Array.from(card.classList).filter((name) => (
          ['egg-state', 'hatched-state', 'baby-state', 'yochiyochi-state'].includes(name)
        )),
        background: getComputedStyle(creature).backgroundImage,
        hasImageElement: creature.querySelector('img') !== null,
        speech: document.querySelector('#companionSpeech').textContent.trim(),
        buttonTag: card.tagName
      };
    });
    assert.deepEqual(initial.visualClasses, [state.visualClass], `${state.id}: visual class is not exclusive`);
    assert.deepEqual(initial.stateClasses, state.stateClasses, `${state.id}: care-stage classes drifted`);
    assert.match(initial.background, new RegExp(state.asset.replaceAll('.', '\\.')), `${state.id}: wrong initial art`);
    assert.equal(initial.hasImageElement, false, `${state.id}: CSS art regressed to a broken-icon-prone img`);
    assert.ok(initial.speech.length > 0, `${state.id}: companion speech disappeared`);
    assert.equal(initial.buttonTag, 'BUTTON', `${state.id}: care navigation control changed`);
    assert.deepEqual(milmaruRequests, [state.asset], `${state.id}: initial load requested extra Milmaru art`);
    assert.deepEqual(localFailures, [], `${state.id}: local request failure`);
    assert.deepEqual(localHttpErrors, [], `${state.id}: local HTTP error`);
    assert.deepEqual(pageErrors, [], `${state.id}: page error`);

    const requestCountBeforeCelebrate = milmaruRequests.length;
    const celebrate = await page.evaluate(() => {
      const card = document.querySelector('#companionCard');
      const creature = document.querySelector('.pixel-creature');
      const before = getComputedStyle(creature).backgroundImage;
      card.classList.add('celebrate');
      return {
        before,
        after: getComputedStyle(creature).backgroundImage,
        animation: getComputedStyle(creature).animationName
      };
    });
    await page.waitForTimeout(100);
    assert.equal(celebrate.after, celebrate.before, `${state.id}: celebration replaced the current art`);
    assert.match(celebrate.animation, /creatureCheer/, `${state.id}: celebration motion disappeared`);
    assert.equal(milmaruRequests.length, requestCountBeforeCelebrate, `${state.id}: celebration requested extra art`);
    assert.deepEqual(localFailures, [], `${state.id}: celebration caused a request failure`);
    assert.deepEqual(pageErrors, [], `${state.id}: celebration caused a page error`);
  } finally {
    await context.close();
  }
}

(async () => {
  const { server, base } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 390, height: 844, name: 'portrait' },
    { width: 667, height: 375, name: 'short-landscape' },
    { width: 844, height: 390, name: 'mobile-landscape' },
    { width: 1024, height: 768, name: 'tablet' },
    { width: 1366, height: 768, name: 'desktop' },
    { width: 1600, height: 900, name: 'design-size' }
  ];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const seededModeBytes = {
        mojikkoFarmWritingModeV1: '{"seed":"mode-storybook"}',
        mojikkoFarmWordHoleV1: '{"seed":"word-storybook"}',
        mojikkoFarmDailyThreeV1: '{"seed":"daily-storybook"}'
      };
      await context.addInitScript(({ seed, portrait }) => {
        window.__APP_BUILD__ = 1;
        localStorage.setItem('pono_bgm_enabled', 'off');
        if (portrait) {
          Object.entries(seed).forEach(([key, value]) => localStorage.setItem(key, value));
        }
      }, { seed: seededModeBytes, portrait: viewport.name === 'portrait' });

      const pageErrors = [];
      const localFailures = [];
      const localHttpErrors = [];
      const page = await context.newPage();
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('requestfailed', (request) => {
        if (request.url().startsWith(base)) localFailures.push(request.url());
      });
      page.on('response', (response) => {
        if (response.url().startsWith(base) && response.status() >= 400) {
          localHttpErrors.push(`${response.status()} ${response.url()}`);
        }
      });
      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (url.includes('cdn.jsdelivr.net') && decodeURIComponent(new URL(url).pathname).endsWith('/あ.json')) {
          route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify(kanaAFixture)
          });
          return;
        }
        if (url.startsWith('https://fonts.googleapis.com/') || url.startsWith('https://fonts.gstatic.com/')) {
          route.continue();
          return;
        }
        if (url.startsWith(base) || url.startsWith('data:') || url.startsWith('blob:')) {
          route.continue();
        } else {
          route.abort();
        }
      });

      await page.goto(`${base}/writing-mori/`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.MojikkoWritingGame);
      const zenFontAudit = await page.evaluate(async () => {
        if (!document.fonts) return { loaded: false, check: false, faces: [] };
        try {
          const defaultFaces = await document.fonts.load('16px "Zen Maru Gothic"', 'あ');
          const companionFaces = await document.fonts.load('900 16px "Zen Maru Gothic"', 'あ');
          await document.fonts.ready;
          const faces = [...defaultFaces, ...companionFaces].map((face) => ({
            family: face.family,
            weight: face.weight,
            status: face.status
          }));
          return {
            loaded: companionFaces.some((face) => /Zen Maru Gothic/.test(face.family) && face.status === 'loaded'),
            check: document.fonts.check('900 16px "Zen Maru Gothic"', 'あ'),
            faces
          };
        } catch (error) {
          return { loaded: false, check: false, faces: [], error: String(error) };
        }
      });

      assert.deepEqual(pageErrors, [], `${viewport.name}: page errors`);
      assert.deepEqual(localFailures, [], `${viewport.name}: local request failures`);
      assert.deepEqual(localHttpErrors, [], `${viewport.name}: local HTTP errors`);

      if (viewport.name === 'portrait') {
        const portraitState = await page.evaluate((seed) => ({
          orientationCopy: getComputedStyle(document.body, '::before').content,
          overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
          values: Object.fromEntries(Object.keys(seed).map((key) => [key, localStorage.getItem(key)]))
        }), seededModeBytes);
        assert.match(portraitState.orientationCopy, /よこむきに してね/);
        assert.equal(portraitState.overflowX, false);
        assert.deepEqual(portraitState.values, seededModeBytes, 'portrait must not rewrite mode snapshots');
        await context.close();
        continue;
      }

      await page.waitForFunction(() => (
        typeof currentWriterSize === 'number'
        && currentCharData
        && pixelLetter
        && document.querySelectorAll('#writerTarget svg path').length > 0
      ));

      const initial = await page.evaluate(() => {
        const rectOf = (selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const compactRect = (rect) => ({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        });
        const stageRect = document.querySelector('#stage').getBoundingClientRect();
        const stageScale = stageRect.height / 900;
        const textAudit = (selector) => {
          const element = document.querySelector(selector);
          const range = document.createRange();
          range.selectNodeContents(element);
          const clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
          for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor);
            if (!/(?:hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) continue;
            const rect = ancestor.getBoundingClientRect();
            clip.left = Math.max(clip.left, rect.left);
            clip.top = Math.max(clip.top, rect.top);
            clip.right = Math.min(clip.right, rect.right);
            clip.bottom = Math.min(clip.bottom, rect.bottom);
          }
          return {
            visualFontSize: parseFloat(getComputedStyle(element).fontSize) * stageScale,
            text: compactRect(range.getBoundingClientRect()),
            clip
          };
        };
        const surfaceAudit = (selector, pseudo = null) => {
          const element = document.querySelector(selector);
          const style = getComputedStyle(element, pseudo);
          return {
            selector,
            pseudo,
            display: style.display,
            content: style.content,
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            backgroundSize: style.backgroundSize,
            borderImageSource: style.borderImageSource,
            borderImageSlice: style.borderImageSlice,
            borderWidths: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
            boxShadow: style.boxShadow,
            filter: style.filter,
            transform: style.transform
          };
        };
        const visibleImages = Array.from(document.images)
          .filter((image) => image.getBoundingClientRect().width > 0 && image.getBoundingClientRect().height > 0)
          .map((image) => ({ src: image.currentSrc || image.src, complete: image.complete, width: image.naturalWidth }));
        const companionCardRect = document.querySelector('#companionCard').getBoundingClientRect();
        const companionName = document.querySelector('.companion-name');
        const companionNameRange = document.createRange();
        companionNameRange.selectNodeContents(companionName);
        const companionNameRect = companionNameRange.getBoundingClientRect();
        const companionNameBoxRect = companionName.getBoundingClientRect();
        const companionSpeechRect = document.querySelector('.companion-speech').getBoundingClientRect();
        const companionCreatureRect = document.querySelector('.pixel-creature').getBoundingClientRect();
        const modeSwitch = document.querySelector('#modeSwitchBtn');
        const modeSwitchRect = modeSwitch.getBoundingClientRect();
        const modeSwitchLines = Array.from(modeSwitch.children).filter((element) => element.tagName === 'SPAN').map((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return {
            glyph: compactRect(range.getBoundingClientRect()),
            lineBox: compactRect(element.getBoundingClientRect())
          };
        });
        const cornerSelectors = Object.freeze({
          settings: '#settingsBtn',
          mode: '#modeSwitchBtn',
          prompt: '#promptText',
          characters: '.character-panel',
          companion: '#companionCard',
          board: '#writingBoard',
          strokes: '.stroke-panel',
          reset: '#resetBtn',
          done: '#doneBtn'
        });
        return {
          overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
          overflowY: document.documentElement.scrollHeight > window.innerHeight + 1,
          uiFont: getComputedStyle(document.querySelector('#modeSwitchBtn')).fontFamily,
          writerFont: getComputedStyle(document.querySelector('#writerTarget')).fontFamily,
          wrapBackground: getComputedStyle(document.querySelector('#stage-wrap')).backgroundImage,
          stageBackground: getComputedStyle(document.querySelector('#stage')).backgroundImage,
          stageBackgroundPosition: getComputedStyle(document.querySelector('#stage')).backgroundPosition,
          stageBackgroundSize: getComputedStyle(document.querySelector('#stage')).backgroundSize,
          stageBackgroundRepeat: getComputedStyle(document.querySelector('#stage')).backgroundRepeat,
          scanlineBackground: getComputedStyle(document.querySelector('#stage'), '::before').backgroundImage,
          stageScale,
          stageGeometry: {
            ...compactRect(stageRect),
            transform: getComputedStyle(document.querySelector('#stage')).transform
          },
          wrapScroll: {
            left: document.querySelector('#stage-wrap').scrollLeft,
            top: document.querySelector('#stage-wrap').scrollTop
          },
          standaloneBackMissing: document.querySelector('#backBtn') === null,
          settingsInitial: {
            expanded: document.querySelector('#settingsBtn').getAttribute('aria-expanded'),
            hidden: document.querySelector('#settingsPopover').hidden,
            ariaHidden: document.querySelector('#settingsPopover').getAttribute('aria-hidden'),
            itemTabIndex: document.querySelector('#settingsBackBtn').tabIndex,
            itemText: document.querySelector('#settingsBackBtn').textContent.trim()
          },
          modeCenterDelta: Math.abs(
            (modeSwitchRect.left + modeSwitchRect.right) / 2
              - (stageRect.left + stageRect.right) / 2
          ),
          textAudits: Object.fromEntries([
            ['mode', '#modeSwitchBtn'],
            ['currentMode', '.current-mode-name'],
            ['stars', '.star-box'],
            ['panelTitle', '.panel-title'],
            ['kana', '.kana-tab'],
            ['character', '.char-button'],
            ['companionName', '.companion-name'],
            ['companionLevel', '.companion-level'],
            ['companionSpeech', '.companion-speech'],
            ['prompt', '#promptText'],
            ['reset', '#resetBtn'],
            ['done', '#doneBtn'],
            ['rewardTitle', '.reward-title'],
            ['rewardItem', '.reward-item']
          ].map(([name, selector]) => [name, textAudit(selector)])),
          boardFrame: getComputedStyle(document.querySelector('#writingBoard'), '::before').backgroundImage,
          promptFrame: getComputedStyle(document.querySelector('#promptText')).backgroundImage,
          peripheralFrames: ['.character-panel', '#companionCard', '.stroke-panel'].map((selector) => surfaceAudit(selector)),
          mainFrameSources: [
            getComputedStyle(document.querySelector('.character-panel')).backgroundImage,
            getComputedStyle(document.querySelector('#companionCard')).backgroundImage,
            getComputedStyle(document.querySelector('#writingBoard'), '::before').backgroundImage,
            getComputedStyle(document.querySelector('.stroke-panel')).backgroundImage,
            getComputedStyle(document.querySelector('#promptText')).backgroundImage,
            getComputedStyle(document.querySelector('#modeSwitchBtn')).backgroundImage,
            getComputedStyle(document.querySelector('#resetBtn')).backgroundImage,
            getComputedStyle(document.querySelector('#doneBtn')).backgroundImage
          ],
          resultFrame: getComputedStyle(document.querySelector('.result-card')).backgroundImage,
          chooserFrame: getComputedStyle(document.querySelector('.mode-choice-card')).backgroundImage,
          imageOnlySurfaces: [
            ['characters', '.character-panel'],
            ['companion', '#companionCard'],
            ['strokes', '.stroke-panel'],
            ['prompt', '#promptText'],
            ['message', '#messageBox'],
            ['mode', '#modeSwitchBtn'],
            ['reset', '#resetBtn'],
            ['done', '#doneBtn'],
            ['chooser', '.mode-choice-card'],
            ['choice', '.mode-choice-button'],
            ['choiceClose', '#modeChoiceCloseBtn'],
            ['result', '.result-card'],
            ['care', '#careBtn'],
            ['retry', '#modalRetryBtn']
          ].map(([name, selector]) => ({ name, ...surfaceAudit(selector) })),
          settingsSurface: surfaceAudit('#settingsBtn'),
          imageOnlyPseudos: [
            '#modeSwitchBtn', '#resetBtn', '#doneBtn', '#careBtn', '#modalRetryBtn',
            '.character-panel', '#companionCard', '.stroke-panel', '#promptText', '#messageBox',
            '.mode-choice-card', '.result-card'
          ].flatMap((selector) => [surfaceAudit(selector, '::before'), surfaceAudit(selector, '::after')]),
          nestedSurfaces: [
            '.current-mode-name', '.panel-title', '.companion-speech', '.reward-box',
            '.reward-large', '.stroke-card', '.stroke-preview', '.stroke-mini svg'
          ].filter((selector) => document.querySelector(selector)).map((selector) => surfaceAudit(selector)),
          speechAfter: surfaceAudit('.companion-speech', '::after'),
          writingBoardLayers: {
            board: surfaceAudit('#writingBoard'),
            frame: surfaceAudit('#writingBoard', '::before'),
            paper: surfaceAudit('#writingBoard', '::after')
          },
          companionTitle: {
            boxRelativeTop: (companionNameBoxRect.top - companionCardRect.top) / stageScale,
            boxRelativeBottom: (companionNameBoxRect.bottom - companionCardRect.top) / stageScale,
            boxRelativeHeight: companionNameBoxRect.height / stageScale,
            relativeTop: (companionNameRect.top - companionCardRect.top) / stageScale,
            relativeBottom: (companionNameRect.bottom - companionCardRect.top) / stageScale,
            bottom: companionNameRect.bottom,
            speechTop: companionSpeechRect.top,
            creatureTop: companionCreatureRect.top,
            display: getComputedStyle(companionName).display,
            alignItems: getComputedStyle(companionName).alignItems,
            justifyContent: getComputedStyle(companionName).justifyContent,
            fontSize: parseFloat(getComputedStyle(companionName).fontSize),
            lineHeight: parseFloat(getComputedStyle(companionName).lineHeight)
          },
          modeSwitchGlyphs: {
            button: compactRect(modeSwitchRect),
            spans: modeSwitchLines.map((line) => line.glyph),
            lineBoxes: modeSwitchLines.map((line) => line.lineBox)
          },
          frameCornerRects: Object.fromEntries(
            Object.entries(cornerSelectors).map(([name, selector]) => [name, compactRect(document.querySelector(selector).getBoundingClientRect())])
          ),
          companionArt: getComputedStyle(document.querySelector('.pixel-creature')).backgroundImage,
          companionArtDisplay: getComputedStyle(document.querySelector('.pixel-creature')).display,
          rects: Object.fromEntries([
            ['mode', '#modeSwitchBtn'],
            ['settings', '#settingsBtn'],
            ['kana', '.kana-tab'],
            ['character', '.char-button'],
            ['characters', '.character-panel'],
            ['companion', '#companionCard'],
            ['prompt', '#promptText'],
            ['board', '#writingBoard'],
            ['writer', '#writerTarget'],
            ['reset', '#resetBtn'],
            ['done', '#doneBtn'],
            ['strokes', '.stroke-panel']
          ].map(([name, selector]) => [name, rectOf(selector)])),
          visibleImages,
          resources: performance.getEntriesByType('resource').map((entry) => entry.name),
          writerRuntime: {
            currentWriterSize,
            totalMaskCells: pixelLetter.totalMaskCells,
            strokeMaskCells: pixelLetter.strokeMasks.map((mask) => mask.reduce((sum, value) => sum + value, 0)),
            strokes: currentCharData.strokes,
            medians: currentCharData.medians,
            svgPaths: Array.from(document.querySelectorAll('#writerTarget svg path')).map((path) => path.getAttribute('d'))
          }
        };
      });

      assert.equal(initial.overflowX, false, `${viewport.name}: horizontal overflow`);
      assert.equal(initial.overflowY, false, `${viewport.name}: vertical overflow`);
      assert.deepEqual(initial.wrapScroll, { left: 0, top: 0 }, `${viewport.name}: stage wrapper started scrolled`);
      assert.equal(initial.standaloneBackMissing, true, `${viewport.name}: standalone return button is still present`);
      assert.deepEqual(initial.settingsInitial, {
        expanded: 'false',
        hidden: true,
        ariaHidden: 'true',
        itemTabIndex: -1,
        itemText: 'もどる'
      }, `${viewport.name}: settings menu did not start in a closed accessible state`);
      assert.ok(initial.modeCenterDelta < 0.1, `${viewport.name}: mode switch is not centered in the header`);
      assert.match(initial.uiFont, /Zen Maru Gothic/);
      assert.match(initial.writerFont, /Yu Mincho/);
      assert.equal(initial.wrapBackground, 'none');
      assert.match(initial.stageBackground, /yard_background_wide_v2\.png/);
      assert.equal(initial.stageBackgroundPosition, '100% 50%');
      assert.equal(initial.stageBackgroundSize, 'cover');
      assert.equal(initial.stageBackgroundRepeat, 'no-repeat');
      assert.doesNotMatch(initial.scanlineBackground, /repeating-linear-gradient/);
      assert.match(initial.boardFrame, /01_mojikko_unified_board_frame\.png/);
      assert.match(initial.promptFrame, /05_mojikko_message_frame\.png/);
      assert.deepEqual(
        initial.peripheralFrames.map((frame) => path.basename(new URL(frame.backgroundImage.slice(5, -2)).pathname)),
        [
          '02_mojikko_character_list_frame.png',
          '03_mojikko_companion_frame.png',
          '04_mojikko_stroke_order_frame.png'
        ],
        `${viewport.name}: peripheral frames are not role-specific`
      );
      for (const frame of initial.peripheralFrames) {
        assert.equal(frame.borderImageSource, 'none', `${viewport.name}:${frame.selector} retained a sliced frame layer`);
        assert.deepEqual(frame.borderWidths, ['0px', '0px', '0px', '0px'], `${viewport.name}:${frame.selector} retained a CSS border`);
        assert.equal(frame.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}:${frame.selector} retained a CSS paper layer`);
        assert.equal(frame.boxShadow, 'none', `${viewport.name}:${frame.selector} retained a rectangular CSS shadow`);
      }
      assert.ok(new Set(initial.mainFrameSources).size >= 7, `${viewport.name}: main screen frame sources repeat too much`);
      assert.ok(initial.mainFrameSources.every((source) => !/07_mojikko_result_frame\.png/.test(source)), `${viewport.name}: result frame leaked onto the main screen`);
      assert.match(initial.resultFrame, /07_mojikko_result_frame\.png/);
      assert.match(initial.chooserFrame, /06_mojikko_mode_chooser_base\.png/);
      assert.match(initial.settingsSurface.backgroundImage, /assets\/_legacy\/preview-placeholders\/ctrl-btn-settings\.png/);
      assert.deepEqual(initial.settingsSurface.borderWidths, ['0px', '0px', '0px', '0px'], `${viewport.name}: settings paints a CSS border`);
      assert.equal(initial.settingsSurface.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}: settings paints a CSS paper`);
      assert.equal(initial.settingsSurface.boxShadow, 'none', `${viewport.name}: settings paints a rectangular CSS shadow`);
      assert.equal(initial.settingsSurface.backgroundSize, 'contain', `${viewport.name}: settings image is stretched`);
      for (const surface of initial.imageOnlySurfaces) {
        assert.equal(surface.borderImageSource, 'none', `${viewport.name}:${surface.name} retained border-image chrome`);
        assert.deepEqual(surface.borderWidths, ['0px', '0px', '0px', '0px'], `${viewport.name}:${surface.name} retained a CSS border`);
        assert.equal(surface.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}:${surface.name} retained a CSS paper layer`);
        assert.equal(surface.boxShadow, 'none', `${viewport.name}:${surface.name} retained a rectangular CSS shadow`);
        if (surface.name === 'choice' || surface.name === 'choiceClose') {
          assert.equal(surface.backgroundImage, 'none', `${viewport.name}:${surface.name} must use the chooser's baked window`);
        } else {
          assert.match(surface.backgroundImage, /mojikko\/writing\/storybook\/frame-family\/(?:0[2-7]|1[01])_mojikko_/, `${viewport.name}:${surface.name} lost its single unified image surface`);
          assert.equal(surface.backgroundSize, 'contain', `${viewport.name}:${surface.name} stretches its generated surface`);
        }
      }
      for (const pseudo of initial.imageOnlyPseudos) {
        assert.equal(pseudo.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}:${pseudo.selector}${pseudo.pseudo} paints a pseudo paper`);
        assert.equal(pseudo.boxShadow, 'none', `${viewport.name}:${pseudo.selector}${pseudo.pseudo} paints a pseudo shadow`);
        assert.deepEqual(pseudo.borderWidths, ['0px', '0px', '0px', '0px'], `${viewport.name}:${pseudo.selector}${pseudo.pseudo} paints a pseudo border`);
      }
      for (const surface of initial.nestedSurfaces) {
        assert.equal(surface.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}:${surface.selector} retained an extra white box`);
        assert.equal(surface.backgroundImage, 'none', `${viewport.name}:${surface.selector} retained a nested image box`);
        assert.equal(surface.boxShadow, 'none', `${viewport.name}:${surface.selector} retained a nested box shadow`);
      }
      assert.equal(initial.speechAfter.content, 'none', `${viewport.name}: companion speech tail returned as a second box`);
      assert.equal(initial.writingBoardLayers.board.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}: board host paints an extra paper`);
      assert.equal(initial.writingBoardLayers.board.backgroundImage, 'none', `${viewport.name}: board host paints an extra image`);
      assert.equal(initial.writingBoardLayers.frame.borderImageSource, 'none', `${viewport.name}: writing frame retained border slicing`);
      assert.match(initial.writingBoardLayers.frame.backgroundImage, /01_mojikko_unified_board_frame\.png/, `${viewport.name}: writing frame disappeared`);
      assert.equal(initial.writingBoardLayers.frame.backgroundSize, 'contain', `${viewport.name}: writing frame was stretched`);
      assert.equal(initial.writingBoardLayers.frame.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}: writing frame paints a paper center`);
      assert.equal(initial.writingBoardLayers.paper.content, 'none', `${viewport.name}: a second writing paper layer returned`);
      assert.equal(initial.writingBoardLayers.paper.display, 'none', `${viewport.name}: a second writing paper layer is visible`);
      assert.equal(initial.writingBoardLayers.paper.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}: extra writing paper retained a fill`);
      assert.equal(initial.writingBoardLayers.paper.backgroundImage, 'none', `${viewport.name}: extra writing paper gained an image`);
      assert.ok(Math.abs(initial.companionTitle.boxRelativeTop - 31) <= 0.1, `${viewport.name}: companion title box did not start inside its baked sign`);
      assert.ok(Math.abs(initial.companionTitle.boxRelativeBottom - 59) <= 0.1, `${viewport.name}: companion title box did not end inside its baked sign`);
      assert.ok(Math.abs(initial.companionTitle.boxRelativeHeight - 28) <= 0.1, `${viewport.name}: companion title box height drifted from its baked sign`);
      assert.equal(initial.companionTitle.display, 'flex', `${viewport.name}: companion title lost its fixed flex box`);
      assert.equal(initial.companionTitle.alignItems, 'center', `${viewport.name}: companion title lost vertical centering`);
      assert.equal(initial.companionTitle.justifyContent, 'center', `${viewport.name}: companion title lost horizontal centering`);
      assert.ok(
        Math.abs(initial.companionTitle.lineHeight / initial.companionTitle.fontSize - 1) <= 0.01,
        `${viewport.name}: companion title line-height drifted from 1`
      );
      if (zenFontAudit.loaded) {
        assert.equal(zenFontAudit.check, true, `${viewport.name}: loaded Zen Maru Gothic did not pass FontFaceSet.check`);
      }
      assert.ok(initial.companionTitle.bottom <= initial.companionTitle.speechTop + 2, `${viewport.name}: companion title overlaps its speech`);
      assert.ok(initial.companionTitle.bottom < initial.companionTitle.creatureTop, `${viewport.name}: companion title overlaps Milmaru`);
      assert.equal(initial.modeSwitchGlyphs.spans.length, 2, `${viewport.name}: mode switch no longer has two stable text lines`);
      const [modeLabelGlyph, currentModeGlyph] = initial.modeSwitchGlyphs.spans;
      assertRectContained(modeLabelGlyph, initial.modeSwitchGlyphs.button, `${viewport.name}:mode-label-glyph`);
      assertRectContained(currentModeGlyph, initial.modeSwitchGlyphs.button, `${viewport.name}:current-mode-glyph`);
      assert.ok(
        modeLabelGlyph.top - initial.modeSwitchGlyphs.button.top >= 5,
        `${viewport.name}: mode label lost its 5px screen-space top safety inset`
      );
      assert.ok(
        initial.modeSwitchGlyphs.button.bottom - currentModeGlyph.bottom >= 5,
        `${viewport.name}: current mode crossed the lower stitched 5px safety edge`
      );
      const [modeLabelLineBox, currentModeLineBox] = initial.modeSwitchGlyphs.lineBoxes;
      assert.equal(
        rectanglesOverlap(modeLabelLineBox, currentModeLineBox),
        false,
        `${viewport.name}: mode switch line boxes overlap`
      );
      assert.ok(modeLabelLineBox.bottom <= currentModeLineBox.top + 0.1, `${viewport.name}: mode switch text line order drifted`);
      assert.match(initial.companionArt, /milmaru_egg_idle_20260716\.webp/);
      assert.equal(initial.companionArtDisplay, 'block');
      for (const [name, rect] of Object.entries(initial.rects)) {
        assertInsideViewport(rect, viewport, `${viewport.name}:${name}`);
      }
      for (const [name, audit] of Object.entries(initial.textAudits)) {
        assertInsideViewport(audit.text, viewport, `${viewport.name}:${name}-text`);
        assertRectContained(audit.text, audit.clip, `${viewport.name}:${name}`);
      }
      if (viewport.height <= 500) {
        for (const name of ['currentMode', 'stars', 'kana', 'companionName', 'companionLevel', 'companionSpeech', 'rewardTitle', 'rewardItem']) {
          assert.ok(initial.textAudits[name].visualFontSize >= 12, `${viewport.name}:${name} supporting text is below 12px`);
        }
        for (const name of ['mode', 'panelTitle', 'character', 'prompt', 'reset', 'done']) {
          assert.ok(initial.textAudits[name].visualFontSize >= 13.5, `${viewport.name}:${name} primary text is below 13.5px`);
        }
      }
      assert.ok(
        Math.abs(initial.rects.writer.width / initial.rects.board.width - 0.785) < 0.001,
        `${viewport.name}: story frame changed the writer/board ratio`
      );
      assert.ok(
        Math.abs(initial.writerRuntime.currentWriterSize - Math.max(360, Math.round(initial.rects.writer.width))) <= 1,
        `${viewport.name}: HanziWriter size drifted from its target`
      );
      if (viewport.name === 'design-size') {
        assert.ok(Math.abs(initial.rects.writer.width - 502.390625) < 0.02, `design-size: writer target drifted from baseline (${initial.rects.writer.width})`);
        assert.equal(initial.writerRuntime.currentWriterSize, 502, 'design-size: HanziWriter runtime size drifted');
        assert.equal(initial.writerRuntime.totalMaskCells, 2054, 'design-size: guide mask drifted');
        assert.deepEqual(initial.writerRuntime.strokeMaskCells, [341, 442, 1271], 'design-size: per-stroke masks drifted');
        assert.equal(initial.writerRuntime.svgPaths.length, 18, 'design-size: writer SVG path count drifted');
        assert.equal(sha256(JSON.stringify(initial.writerRuntime.strokes)), '852b4b7cf9df4d005430f45247420cd3bd1df549dfcc95465f6781eb212f3714');
        assert.equal(sha256(JSON.stringify(initial.writerRuntime.medians)), '2ae3ae6f7b3d38a66b2bcb8bcb14992d10eb02604e84888a54408fc2e1e86e70');
        assert.equal(sha256(JSON.stringify(initial.writerRuntime.svgPaths)), 'e525a8c2015d101afa8f809c7865ff44bc6c07d6fef233695db46b0f627cc330');
      }
      for (const name of ['mode', 'settings', 'kana', 'character', 'reset', 'done']) {
        assert.ok(initial.rects[name].height >= 44, `${viewport.name}:${name} is below 44px`);
      }
      for (const [name, expectedRatio] of Object.entries({
        mode: 1223 / 363,
        settings: 1,
        kana: viewport.height <= 500 ? 723 / 720 : 570 / 331,
        character: viewport.height <= 500 ? 559 / 561 : 404 / 564,
        reset: 1223 / 363,
        done: 1334 / 530,
        prompt: 1751 / 282,
        characters: 907 / 1442,
        companion: 1128 / 1043,
        board: 1203 / 1081,
        strokes: 496 / 1759
      })) {
        const actualRatio = initial.rects[name].width / initial.rects[name].height;
        assert.ok(Math.abs(actualRatio - expectedRatio) < 0.006, `${viewport.name}:${name} image surface stretched (${actualRatio})`);
      }
      assert.ok(initial.visibleImages.every((image) => image.complete && image.width > 0), `${viewport.name}: visible image failed to decode`);
      await assertNoWhiteCornerRectangles(await page.screenshot(), initial.frameCornerRects, `${viewport.name}:main`);
      [
        'yard_background_wide_v2.png',
        '01_mojikko_unified_board_frame.png',
        '02_mojikko_character_list_frame.png',
        '03_mojikko_companion_frame.png',
        '04_mojikko_stroke_order_frame.png',
        '05_mojikko_message_frame.png',
        '06_mojikko_mode_chooser_base.png',
        '07_mojikko_result_frame.png',
        '10_mojikko_secondary_button_normal.png',
        '11_mojikko_primary_button_normal.png',
        viewport.height <= 500 ? '12_mojikko_star_counter_short.png' : '12_mojikko_star_counter_regular.png',
        'ctrl-btn-settings.png',
        viewport.height <= 500 ? '14_mojikko_kana_tab_short_normal.png' : '14_mojikko_kana_tab_main_normal.png',
        viewport.height <= 500 ? '15_mojikko_character_tile_short_normal.png' : '15_mojikko_character_tile_main_normal.png',
        'milmaru_egg_idle_20260716.webp'
      ]
        .forEach((asset) => assert.ok(initial.resources.some((url) => url.includes(asset)), `${viewport.name}: ${asset} was not loaded`));

      await page.locator('#settingsBtn').click();
      await page.waitForFunction(() => !document.querySelector('#settingsPopover').hidden);
      const pointerSettings = await page.evaluate(() => {
        const rect = (selector) => {
          const value = document.querySelector(selector).getBoundingClientRect();
          return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
        };
        return {
          expanded: settingsBtn.getAttribute('aria-expanded'),
          hidden: settingsPopover.hidden,
          ariaHidden: settingsPopover.getAttribute('aria-hidden'),
          itemTabIndex: settingsBackBtn.tabIndex,
          activeId: document.activeElement && document.activeElement.id,
          popover: rect('#settingsPopover'),
          item: rect('#settingsBackBtn')
        };
      });
      assert.equal(pointerSettings.expanded, 'true', `${viewport.name}: pointer did not expand settings`);
      assert.equal(pointerSettings.hidden, false, `${viewport.name}: pointer-open settings stayed hidden`);
      assert.equal(pointerSettings.ariaHidden, 'false', `${viewport.name}: pointer-open settings stayed hidden from assistive tech`);
      assert.equal(pointerSettings.itemTabIndex, 0, `${viewport.name}: open settings item stayed outside tab order`);
      assert.equal(pointerSettings.activeId, 'settingsBtn', `${viewport.name}: pointer open moved focus unexpectedly`);
      assertInsideViewport(pointerSettings.popover, viewport, `${viewport.name}:settings-popover`);
      assertInsideViewport(pointerSettings.item, viewport, `${viewport.name}:settings-return`);
      assert.ok(pointerSettings.item.width >= 44 && pointerSettings.item.height >= 44, `${viewport.name}: settings return is below 44px`);

      await page.locator('#modeSwitchBtn').click();
      await page.waitForFunction(() => document.querySelector('#settingsPopover').hidden);
      const outsideDismissal = await page.evaluate(() => ({
        expanded: settingsBtn.getAttribute('aria-expanded'),
        ariaHidden: settingsPopover.getAttribute('aria-hidden'),
        chooserOpen: modeChoiceOverlay.classList.contains('show'),
        activeId: document.activeElement && document.activeElement.id
      }));
      assert.deepEqual(outsideDismissal, {
        expanded: 'false',
        ariaHidden: 'true',
        chooserOpen: false,
        activeId: 'settingsBtn'
      }, `${viewport.name}: outside dismissal leaked its tap or lost focus`);

      await page.locator('#settingsBtn').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'settingsBackBtn');
      for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
        await page.keyboard.press(key);
        assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'settingsBackBtn', `${viewport.name}: settings ${key} lost its menu item`);
      }
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('#settingsPopover').hidden);
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'settingsBtn', `${viewport.name}: settings Escape did not restore focus`);

      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'settingsBackBtn');
      await page.keyboard.press('Tab');
      await page.waitForFunction(() => document.querySelector('#settingsPopover').hidden);
      assert.notEqual(await page.evaluate(() => document.activeElement && document.activeElement.id), 'settingsBackBtn', `${viewport.name}: focus left a hidden settings item active`);

      const chooserFromSettings = await page.evaluate(() => {
        setSettingsMenuOpen(true);
        focusElementWithoutScroll(settingsBackBtn);
        openModeChoice();
        return {
          settingsHidden: settingsPopover.hidden,
          settingsExpanded: settingsBtn.getAttribute('aria-expanded'),
          chooserOpen: modeChoiceOverlay.classList.contains('show'),
          activeMode: document.activeElement && document.activeElement.dataset.writingMode
        };
      });
      assert.deepEqual(chooserFromSettings, {
        settingsHidden: true,
        settingsExpanded: 'false',
        chooserOpen: true,
        activeMode: 'sequence'
      }, `${viewport.name}: mode chooser did not replace settings cleanly`);
      await page.locator('#modeChoiceCloseBtn').click();
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'settingsBtn', `${viewport.name}: chooser did not return focus to settings`);

      const resultFromSettings = await page.evaluate(() => {
        setSettingsMenuOpen(true);
        focusElementWithoutScroll(settingsBackBtn);
        const opened = openResultOverlay();
        return {
          opened,
          settingsHidden: settingsPopover.hidden,
          settingsExpanded: settingsBtn.getAttribute('aria-expanded'),
          resultOpen: resultOverlay.classList.contains('show')
        };
      });
      assert.deepEqual(resultFromSettings, {
        opened: true,
        settingsHidden: true,
        settingsExpanded: 'false',
        resultOpen: true
      }, `${viewport.name}: result overlay did not replace settings cleanly`);
      await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'modalRetryBtn');
      await page.evaluate(() => closeResultOverlay());
      await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'settingsBtn');

      if (viewport.name === 'short-landscape' || viewport.name === 'design-size') {
        const stateTintAudit = await page.evaluate(() => {
          const tab = document.querySelector('.kana-tab');
          const activeCharacter = document.querySelector('.char-button.active') || document.querySelector('.char-button');
          const doneCharacter = Array.from(document.querySelectorAll('.char-button')).find((button) => button !== activeCharacter);
          const saved = [tab, activeCharacter, doneCharacter].map((element) => element.className);
          const read = (element) => {
            const surface = getComputedStyle(element);
            const tint = getComputedStyle(element, '::before');
            return {
              backgroundImage: surface.backgroundImage,
              tint: tint.backgroundColor,
              inset: [tint.top, tint.right, tint.bottom, tint.left].map(parseFloat),
              size: [element.offsetWidth, element.offsetHeight]
            };
          };
          tab.classList.add('active');
          activeCharacter.classList.add('active');
          activeCharacter.classList.remove('done');
          doneCharacter.classList.add('done');
          doneCharacter.classList.remove('active');
          const result = {
            tab: read(tab),
            activeCharacter: read(activeCharacter),
            doneCharacter: read(doneCharacter)
          };
          [tab, activeCharacter, doneCharacter].forEach((element, index) => {
            element.className = saved[index];
          });
          return result;
        });
        const short = viewport.height <= 500;
        const tabAsset = short ? '14_mojikko_kana_tab_short_normal.png' : '14_mojikko_kana_tab_main_normal.png';
        const characterAsset = short ? '15_mojikko_character_tile_short_normal.png' : '15_mojikko_character_tile_main_normal.png';
        assert.match(stateTintAudit.tab.backgroundImage, new RegExp(tabAsset.replaceAll('.', '\\.')), `${viewport.name}: active kana replaced its fixed base`);
        assert.match(stateTintAudit.activeCharacter.backgroundImage, new RegExp(characterAsset.replaceAll('.', '\\.')), `${viewport.name}: active character replaced its fixed base`);
        assert.match(stateTintAudit.doneCharacter.backgroundImage, new RegExp(characterAsset.replaceAll('.', '\\.')), `${viewport.name}: completed character replaced its fixed base`);
        assert.equal(stateTintAudit.tab.tint, 'rgba(247, 229, 167, 0.68)', `${viewport.name}: active kana tint drifted`);
        assert.equal(stateTintAudit.activeCharacter.tint, 'rgba(247, 229, 167, 0.68)', `${viewport.name}: active character tint drifted`);
        assert.equal(stateTintAudit.doneCharacter.tint, 'rgba(222, 234, 200, 0.72)', `${viewport.name}: completed character tint drifted`);
        const assertInsetPercent = (audit, expected, label) => {
          const [width, height] = audit.size;
          const actual = [
            audit.inset[0] / height * 100,
            audit.inset[1] / width * 100,
            audit.inset[2] / height * 100,
            audit.inset[3] / width * 100
          ];
          actual.forEach((value, index) => {
            assert.ok(Math.abs(value - expected[index]) < 0.08, `${label}: inset ${index + 1} drifted (${value})`);
          });
        };
        assertInsetPercent(
          stateTintAudit.tab,
          short ? [4.6, 4.6, 4.5, 4.6] : [7.9, 4.4, 7.6, 4.4],
          `${viewport.name}: kana tint escaped its paper well`
        );
        assertInsetPercent(
          stateTintAudit.activeCharacter,
          short ? [7.5, 7.2, 7.3, 7.3] : [5.2, 6.2, 4.8, 6.9],
          `${viewport.name}: character tint escaped its paper well`
        );
      }
      assert.equal(initial.resources.some((url) => url.includes('stage-bg.webp')), false, `${viewport.name}: QuizLand background was requested`);
      const initialMilmaruResources = initial.resources
        .filter((url) => /\/assets\/images\/mojikko\/writing\/storybook\/milmaru_[^/?]+\.webp(?:[?#]|$)/.test(url))
        .map((url) => path.basename(new URL(url).pathname));
      assert.deepEqual(
        initialMilmaruResources,
        ['milmaru_egg_idle_20260716.webp'],
        `${viewport.name}: fresh egg state requested unrelated Milmaru art`
      );
      assert.equal(
        initial.resources.some((url) => /assets\/images\/mojikko\/(?:writing\/(?!storybook\/)|care\/(?!yard_background_wide_v2\.png))/.test(url)),
        false,
        `${viewport.name}: former pixel UI asset was requested`
      );

      if (viewport.name === 'desktop') {
        const frameAudit = await page.evaluate(async (sources) => Promise.all(sources.map(async (src) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context2d = canvas.getContext('2d', { willReadFrequently: true });
          context2d.drawImage(image, 0, 0);
          const pixels = context2d.getImageData(0, 0, canvas.width, canvas.height).data;
          const cornerIndexes = [
            3,
            (canvas.width - 1) * 4 + 3,
            ((canvas.height - 1) * canvas.width) * 4 + 3,
            ((canvas.height * canvas.width) - 1) * 4 + 3
          ];
          return {
            src,
            complete: image.complete,
            width: image.naturalWidth,
            height: image.naturalHeight,
            transparentCorners: cornerIndexes.filter((index) => pixels[index] < 8).length
          };
        })), frameAssets);
        for (const asset of frameAudit) {
          assert.equal(asset.complete, true, `${asset.src}: frame decode did not complete`);
          assert.ok(asset.width > 0 && asset.height > 0, `${asset.src}: frame has no pixels`);
          if (!asset.src.includes('yard_background_wide_v2.png')) {
            const name = path.basename(asset.src);
            assert.deepEqual(
              [asset.width, asset.height],
              unifiedFrameDimensions[name],
              `${asset.src}: native dimensions drifted`
            );
            assert.ok(asset.transparentCorners >= 3, `${asset.src}: transparent outer corners were lost`);
          }
        }

        const generatedAudit = await page.evaluate(async (sources) => Promise.all(sources.map(async (src) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context2d = canvas.getContext('2d', { willReadFrequently: true });
          context2d.drawImage(image, 0, 0);
          const pixels = context2d.getImageData(0, 0, canvas.width, canvas.height).data;
          let visible = 0;
          let transparent = 0;
          for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] > 8) visible += 1;
            if (pixels[index] < 247) transparent += 1;
          }
          const cornerIndexes = [
            3,
            (canvas.width - 1) * 4 + 3,
            ((canvas.height - 1) * canvas.width) * 4 + 3,
            ((canvas.height * canvas.width) - 1) * 4 + 3
          ];
          return {
            src,
            complete: image.complete,
            width: image.naturalWidth,
            height: image.naturalHeight,
            coverage: visible / (canvas.width * canvas.height),
            hasAlpha: transparent > 0,
            transparentCorners: cornerIndexes.filter((index) => pixels[index] < 8).length
          };
        })), generatedStoryAssets);
        for (const asset of generatedAudit) {
          assert.equal(asset.complete, true, `${asset.src}: decode did not complete`);
          assert.equal(asset.width, 512, `${asset.src}: unexpected width`);
          assert.equal(asset.height, 512, `${asset.src}: unexpected height`);
          assert.equal(asset.hasAlpha, true, `${asset.src}: transparent background was lost`);
          assert.ok(asset.transparentCorners >= 3, `${asset.src}: transparent safety margin is missing`);
          assert.ok(asset.coverage > 0.08 && asset.coverage < 0.9, `${asset.src}: implausible visible coverage ${asset.coverage}`);
        }

        const wordArtAudit = await page.evaluate(async () => Promise.all(wordHoleCatalog.map(async (task) => {
          const image = new Image();
          image.src = task.art;
          await image.decode();
          return {
            word: task.word,
            art: task.art,
            mappedArt: WORD_HOLE_STORYBOOK_ART[task.word],
            width: image.naturalWidth,
            height: image.naturalHeight,
            complete: image.complete
          };
        })));
        assert.equal(wordArtAudit.length, 18, 'all 18 word-hole clues must remain in the catalog');
        assert.equal(new Set(wordArtAudit.map((task) => task.word)).size, 18, 'word-hole clue meanings must remain unique');
        for (const task of wordArtAudit) {
          assert.equal(task.art, task.mappedArt, `${task.word}: displayed art no longer matches its semantic map`);
          assert.match(task.art, /^\.\.\/assets\//, `${task.word}: clue art is not same-origin`);
          assert.equal(task.complete, true, `${task.word}: clue art did not decode`);
          assert.ok(task.width > 0 && task.height > 0, `${task.word}: clue art has no pixels`);
        }

        const growthStateAudit = await page.evaluate(() => {
          const card = document.querySelector('#companionCard');
          const creature = document.querySelector('.pixel-creature');
          const audits = [];
          const states = [
            { id: 'egg', classes: ['egg-state', 'visual-egg'], asset: 'milmaru_egg_idle_20260716.webp' },
            { id: 'baby', classes: ['hatched-state', 'baby-state', 'visual-baby'], asset: 'milmaru_shell_baby_idle_20260716.webp' },
            { id: 'yochiyochi', classes: ['hatched-state', 'yochiyochi-state', 'visual-yochiyochi'], asset: 'milmaru_yochiyochi_front_20260716.webp' },
            { id: 'grown', classes: ['hatched-state', 'visual-grown'], asset: 'milmaru_grown_wave_20260716.webp' }
          ];
          for (const state of states) {
            card.classList.remove(
              'egg-state', 'hatched-state', 'baby-state', 'yochiyochi-state',
              'visual-egg', 'visual-baby', 'visual-yochiyochi', 'visual-grown', 'celebrate'
            );
            card.classList.add(...state.classes);
            const normal = getComputedStyle(creature).backgroundImage;
            card.classList.add('celebrate');
            const celebrating = getComputedStyle(creature).backgroundImage;
            const animation = getComputedStyle(creature).animationName;
            audits.push({ ...state, normal, celebrating, animation });
          }
          return audits;
        });
        for (const state of growthStateAudit) {
          assert.match(state.normal, new RegExp(state.asset.replaceAll('.', '\\.')));
          assert.equal(state.celebrating, state.normal, `${state.id}: celebration replaced the growth art`);
          assert.match(state.animation, /creatureCheer/, `${state.id}: celebration motion is missing`);
        }
        await page.evaluate(() => updateCompanionCard());
      }

      const closedResultState = await page.evaluate(() => {
        const overlay = document.querySelector('#resultOverlay');
        document.querySelector('#careBtn').focus();
        return {
          ariaHidden: overlay.getAttribute('aria-hidden'),
          inert: overlay.inert,
          shown: overlay.classList.contains('show'),
          activeId: document.activeElement && document.activeElement.id,
          backgroundInert: getResultBackgroundElements().map((element) => element.inert)
        };
      });
      assert.equal(closedResultState.ariaHidden, 'true', `${viewport.name}: closed result is exposed to assistive tech`);
      assert.equal(closedResultState.inert, true, `${viewport.name}: closed result buttons remain focusable`);
      assert.equal(closedResultState.shown, false, `${viewport.name}: result starts open`);
      assert.notEqual(closedResultState.activeId, 'careBtn', `${viewport.name}: inert care action accepted focus`);

      async function auditImageButtonPress(selector, fixedAsset, label) {
        const locator = page.locator(selector);
        const beforeRect = await locator.boundingBox();
        const beforeSurface = await locator.evaluate((element) => ({
          image: getComputedStyle(element).backgroundImage,
          transform: getComputedStyle(element).transform
        }));
        assert.match(beforeSurface.image, new RegExp(fixedAsset.replaceAll('.', '\\.')), `${viewport.name}:${label} normal image`);
        assert.equal(beforeSurface.transform, 'none', `${viewport.name}:${label} normal transform shifted`);
        await page.mouse.move(beforeRect.x + beforeRect.width / 2, beforeRect.y + beforeRect.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(100);
        const pressedSurface = await locator.evaluate((element) => ({
          image: getComputedStyle(element).backgroundImage,
          transform: getComputedStyle(element).transform
        }));
        assert.match(pressedSurface.image, new RegExp(fixedAsset.replaceAll('.', '\\.')), `${viewport.name}:${label} pointerdown changed the fixed base image`);
        assert.notEqual(pressedSurface.transform, 'none', `${viewport.name}:${label} pointerdown lost tactile motion`);
        await page.mouse.up();
        await page.waitForTimeout(180);
        const afterRect = await locator.boundingBox();
        const afterSurface = await locator.evaluate((element) => ({
          image: getComputedStyle(element).backgroundImage,
          transform: getComputedStyle(element).transform
        }));
        assert.match(afterSurface.image, new RegExp(fixedAsset.replaceAll('.', '\\.')), `${viewport.name}:${label} pointerup changed the fixed base image`);
        assert.equal(afterSurface.transform, 'none', `${viewport.name}:${label} pointerup did not settle`);
        for (const key of ['x', 'y', 'width', 'height']) {
          assert.ok(Math.abs(beforeRect[key] - afterRect[key]) < 0.1, `${viewport.name}:${label} pointerup ${key} shifted`);
        }
      }

      await auditImageButtonPress(
        '#resetBtn',
        '10_mojikko_secondary_button_normal.png',
        'reset'
      );
      await auditImageButtonPress(
        '#doneBtn',
        '11_mojikko_primary_button_normal.png',
        'done'
      );

      async function auditFeedback(expected, label) {
        await page.waitForFunction(() => !document.querySelector('#messageBox').hidden);
        const feedback = await page.evaluate(() => {
          const rectOf = (selector) => {
            const rect = document.querySelector(selector).getBoundingClientRect();
            return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
          };
          const message = document.querySelector('#messageBox');
          const style = getComputedStyle(message);
          const messageRange = document.createRange();
          messageRange.selectNodeContents(message);
          return {
            text: message.textContent,
            hidden: message.hidden,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            visualFontSize: parseFloat(style.fontSize) * (document.querySelector('#stage').getBoundingClientRect().height / 900),
            messageText: rectOf('#messageBox'),
            textRect: (() => {
              const rect = messageRange.getBoundingClientRect();
              return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
            })(),
            promptVisibility: getComputedStyle(document.querySelector('#promptText')).visibility,
            promptAriaHidden: document.querySelector('#promptText').getAttribute('aria-hidden'),
            message: rectOf('#messageBox'),
            board: rectOf('#writingBoard'),
            writer: rectOf('#writerTarget'),
            reset: rectOf('#resetBtn'),
            done: rectOf('#doneBtn')
          };
        });
        assert.match(feedback.text, expected, `${viewport.name}:${label} feedback copy`);
        assert.equal(feedback.hidden, false, `${viewport.name}:${label} feedback is hidden`);
        assert.equal(feedback.display, 'flex', `${viewport.name}:${label} feedback display`);
        assert.equal(feedback.visibility, 'visible', `${viewport.name}:${label} feedback visibility`);
        assert.equal(feedback.opacity, '1', `${viewport.name}:${label} feedback opacity`);
        assertInsideViewport(feedback.textRect, viewport, `${viewport.name}:${label}-feedback-text`);
        assertRectContained(feedback.textRect, feedback.messageText, `${viewport.name}:${label}-feedback-text`);
        if (viewport.height <= 500) {
          assert.ok(feedback.visualFontSize >= 13.5, `${viewport.name}:${label} feedback text is below 13.5px`);
        }
        assert.equal(feedback.promptVisibility, 'hidden', `${viewport.name}:${label} prompt was not replaced`);
        assert.equal(feedback.promptAriaHidden, 'true', `${viewport.name}:${label} duplicate prompt remained announced`);
        assertInsideViewport(feedback.message, viewport, `${viewport.name}:${label}-message`);
        for (const target of ['board', 'writer', 'reset', 'done']) {
          assert.equal(rectanglesOverlap(feedback.message, feedback[target]), false, `${viewport.name}:${label} overlaps ${target}`);
        }
      }

      await auditFeedback(/まだ かけていない せん/, 'too-early');
      await page.evaluate(() => onCorrectStroke({ strokeNum: 2 }));
      await auditFeedback(/1かくめを なぞってね/, 'stroke-order');
      await page.evaluate(() => onWriterComplete({}));
      await auditFeedback(/1かくめ、さいごまで なぞってね/, 'partial');
      await page.evaluate(() => onMistake({ strokeNum: 0 }));
      await auditFeedback(/1かくめを もういちど なぞってね/, 'mistake');

      await page.evaluate(() => resetWriting({ skipModeBoundary: true }));
      await page.waitForFunction(() => currentCharData && pixelLetter && document.querySelector('#messageBox').hidden);
      await page.evaluate(() => focusElementWithoutScroll(doneBtn));
      await page.evaluate(async () => {
        const item = getCurrentCharacter();
        strokesCompleted = item.strokes;
        fillAllLetterPixels();
        await completeWriting(true, { totalStrokes: item.strokes });
      });
      await auditFeedback(/すごい！ じょうずに かけたね！/, 'success');
      await page.waitForFunction(() => isResultOverlayOpen());
      await page.waitForTimeout(40);
      const openedResult = await page.evaluate(() => {
        const rectOf = (id) => {
          const rect = document.getElementById(id).getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const contentRectOf = (id) => {
          const range = document.createRange();
          range.selectNodeContents(document.getElementById(id));
          const rect = range.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const resultCardRect = document.querySelector('.result-card').getBoundingClientRect();
        const hint = document.getElementById('ach-next-hint');
        const hintRect = hint.getBoundingClientRect();
        const hintStyle = getComputedStyle(hint);
        return {
          ariaHidden: resultOverlay.getAttribute('aria-hidden'),
          inert: resultOverlay.inert,
          activeId: document.activeElement && document.activeElement.id,
          backgroundInert: getResultBackgroundElements().map((element) => element.inert),
          wrapScroll: {
            left: document.querySelector('#stage-wrap').scrollLeft,
            top: document.querySelector('#stage-wrap').scrollTop
          },
          stageGeometry: {
            left: stageEl.getBoundingClientRect().left,
            top: stageEl.getBoundingClientRect().top,
            transform: getComputedStyle(stageEl).transform
          },
          fonts: Object.fromEntries([
            ['title', '#resultTitle'],
            ['copy', '#resultCopy'],
            ['reward', '#resultRewardWrap'],
            ['care', '#careBtn'],
            ['retry', '#modalRetryBtn']
          ].map(([name, selector]) => [name, parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)
            * (stageEl.getBoundingClientRect().height / 900)])),
          card: {
            left: resultCardRect.left,
            top: resultCardRect.top,
            right: resultCardRect.right,
            bottom: resultCardRect.bottom,
            width: resultCardRect.width,
            height: resultCardRect.height
          },
          text: {
            title: contentRectOf('resultTitle'),
            copy: contentRectOf('resultCopy'),
            reward: contentRectOf('resultRewardWrap'),
            care: contentRectOf('careBtn'),
            retry: contentRectOf('modalRetryBtn')
          },
          care: rectOf('careBtn'),
          retry: rectOf('modalRetryBtn'),
          hint: {
            left: hintRect.left,
            top: hintRect.top,
            right: hintRect.right,
            bottom: hintRect.bottom,
            width: hintRect.width,
            height: hintRect.height,
            text: hint.textContent,
            shown: hint.classList.contains('show'),
            opacity: hintStyle.opacity,
            backgroundImage: hintStyle.backgroundImage,
            backgroundSize: hintStyle.backgroundSize,
            borderRadius: hintStyle.borderRadius,
            boxShadow: hintStyle.boxShadow,
            pointerEvents: hintStyle.pointerEvents
          }
        };
      });
      assert.equal(openedResult.ariaHidden, 'false', `${viewport.name}: open result remains aria-hidden`);
      assert.equal(openedResult.inert, false, `${viewport.name}: open result remains inert`);
      assert.equal(openedResult.activeId, 'modalRetryBtn', `${viewport.name}: result primary action did not receive focus`);
      assert.ok(openedResult.backgroundInert.every(Boolean), `${viewport.name}: result background remains interactive`);
      assert.deepEqual(openedResult.wrapScroll, { left: 0, top: 0 }, `${viewport.name}: result focus scrolled the stage wrapper`);
      assert.ok(Math.abs(openedResult.stageGeometry.left - initial.stageGeometry.left) < 0.1, `${viewport.name}: result focus shifted the stage horizontally`);
      assert.ok(Math.abs(openedResult.stageGeometry.top - initial.stageGeometry.top) < 0.1, `${viewport.name}: result focus shifted the stage vertically`);
      assert.equal(openedResult.stageGeometry.transform, initial.stageGeometry.transform, `${viewport.name}: result focus changed the stage transform`);
      assert.equal(openedResult.hint.shown, true, `${viewport.name}: achievement notice timing changed`);
      assert.equal(openedResult.hint.opacity, '1', `${viewport.name}: achievement notice is not visible`);
      assert.match(openedResult.hint.text, /あと \d+ で/);
      assert.match(openedResult.hint.backgroundImage, /05_mojikko_message_frame\.png/);
      assert.equal(openedResult.hint.backgroundSize, 'contain');
      assert.equal(openedResult.hint.borderRadius, '0px');
      assert.equal(openedResult.hint.boxShadow, 'none');
      assert.equal(openedResult.hint.pointerEvents, 'none');
      assert.ok(Math.abs(openedResult.hint.width / openedResult.hint.height - 1751 / 282) < 0.006, `${viewport.name}: achievement notice frame stretched`);
      assertInsideViewport(openedResult.hint, viewport, `${viewport.name}:achievement-notice`);
      assert.equal(rectanglesOverlap(openedResult.hint, openedResult.card), false, `${viewport.name}: achievement notice overlaps result frame`);
      assert.equal(rectanglesOverlap(openedResult.hint, openedResult.care), false, `${viewport.name}: achievement notice overlaps care action`);
      assert.equal(rectanglesOverlap(openedResult.hint, openedResult.retry), false, `${viewport.name}: achievement notice overlaps retry action`);
      await page.waitForTimeout(260);
      const settledResultCard = await page.locator('.result-card').boundingBox();
      await assertNoWhiteCornerRectangles(
        await page.screenshot(),
        {
          result: {
            left: settledResultCard.x,
            top: settledResultCard.y,
            right: settledResultCard.x + settledResultCard.width,
            bottom: settledResultCard.y + settledResultCard.height,
            width: settledResultCard.width,
            height: settledResultCard.height
          }
        },
        `${viewport.name}:result`
      );
      for (const name of ['title', 'copy', 'reward']) {
        assertRectContained(openedResult.text[name], openedResult.card, `${viewport.name}:result-${name}`);
      }
      assertRectContained(openedResult.text.care, openedResult.care, `${viewport.name}:result-care`);
      assertRectContained(openedResult.text.retry, openedResult.retry, `${viewport.name}:result-retry`);
      if (viewport.height <= 500) {
        for (const name of ['copy', 'reward']) {
          assert.ok(openedResult.fonts[name] >= 12, `${viewport.name}:result-${name} supporting text is below 12px`);
        }
        for (const name of ['title', 'care', 'retry']) {
          assert.ok(openedResult.fonts[name] >= 13.5, `${viewport.name}:result-${name} primary text is below 13.5px`);
        }
      }
      for (const [name, rect] of [['care', openedResult.care], ['retry', openedResult.retry]]) {
        assertInsideViewport(rect, viewport, `${viewport.name}:result-${name}`);
        assert.ok(rect.height >= 44, `${viewport.name}:result-${name} below 44px`);
      }
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'careBtn', `${viewport.name}: result Tab did not wrap`);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'modalRetryBtn', `${viewport.name}: result Shift+Tab did not wrap`);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => isResultOverlayOpen()), true, `${viewport.name}: Escape dismissed a required result`);
      assert.deepEqual(
        await page.evaluate(() => {
          const wrap = document.querySelector('#stage-wrap');
          return { left: wrap.scrollLeft, top: wrap.scrollTop };
        }),
        { left: 0, top: 0 },
        `${viewport.name}: result focus trap scrolled the stage wrapper`
      );
      await page.locator('#modalRetryBtn').click();
      await page.waitForFunction(() => resultOverlay.inert && resultOverlay.getAttribute('aria-hidden') === 'true');
      await page.waitForTimeout(40);
      const closedAfterAction = await page.evaluate(() => ({
        shown: isResultOverlayOpen(),
        activeId: document.activeElement && document.activeElement.id,
        backgroundInert: getResultBackgroundElements().map((element) => element.inert),
        wrapScroll: {
          left: document.querySelector('#stage-wrap').scrollLeft,
          top: document.querySelector('#stage-wrap').scrollTop
        },
        stageLeft: stageEl.getBoundingClientRect().left
      }));
      assert.equal(closedAfterAction.shown, false, `${viewport.name}: result did not close after its action`);
      assert.equal(closedAfterAction.activeId, 'doneBtn', `${viewport.name}: focus did not return to the writing action`);
      assert.deepEqual(closedAfterAction.backgroundInert, closedResultState.backgroundInert, `${viewport.name}: background inert state was not restored`);
      assert.deepEqual(closedAfterAction.wrapScroll, { left: 0, top: 0 }, `${viewport.name}: result close scrolled the stage wrapper`);
      assert.ok(Math.abs(closedAfterAction.stageLeft - initial.stageGeometry.left) < 0.1, `${viewport.name}: result close shifted the stage`);

      await page.locator('#modeSwitchBtn').click();
      await page.waitForTimeout(230);
      const chooser = await page.evaluate(() => {
        const compactRect = (value) => ({
          left: value.left,
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          width: value.width,
          height: value.height
        });
        const rect = (selector) => {
          const value = document.querySelector(selector).getBoundingClientRect();
          return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
        };
        const contentRect = (element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return compactRect(range.getBoundingClientRect());
        };
        return {
          card: rect('.mode-choice-card'),
          close: rect('#modeChoiceCloseBtn'),
          wrapScroll: {
            left: document.querySelector('#stage-wrap').scrollLeft,
            top: document.querySelector('#stage-wrap').scrollTop
          },
          stageGeometry: {
            left: stageEl.getBoundingClientRect().left,
            top: stageEl.getBoundingClientRect().top,
            transform: getComputedStyle(stageEl).transform
          },
          fonts: Object.fromEntries([
            ['title', '.mode-choice-title'],
            ['choiceTitle', '.mode-choice-button strong'],
            ['choiceCopy', '.mode-choice-button span'],
            ['close', '#modeChoiceCloseBtn']
          ].map(([name, selector]) => [name, parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)
            * (stageEl.getBoundingClientRect().height / 900)])),
          choiceGap: parseFloat(getComputedStyle(document.querySelector('.mode-choice-button')).gap),
          choices: Array.from(document.querySelectorAll('.mode-choice-button')).map((button) => {
            const title = button.querySelector('strong') || button;
            const copy = button.querySelector('span');
            return {
              tag: button.tagName,
              id: button.id,
              mode: button.dataset.writingMode || '',
              button: compactRect(button.getBoundingClientRect()),
              title: contentRect(title),
              copy: copy ? contentRect(copy) : null,
              surface: {
                backgroundColor: getComputedStyle(button).backgroundColor,
                backgroundImage: getComputedStyle(button).backgroundImage,
                borderWidths: [
                  getComputedStyle(button).borderTopWidth,
                  getComputedStyle(button).borderRightWidth,
                  getComputedStyle(button).borderBottomWidth,
                  getComputedStyle(button).borderLeftWidth
                ],
                boxShadow: getComputedStyle(button).boxShadow
              },
              tint: {
                backgroundColor: getComputedStyle(button, '::before').backgroundColor,
                opacity: getComputedStyle(button, '::before').opacity
              }
            };
          })
        };
      });
      assertInsideViewport(chooser.card, viewport, `${viewport.name}:chooser-card`);
      assert.deepEqual(chooser.wrapScroll, { left: 0, top: 0 }, `${viewport.name}: chooser focus scrolled the stage wrapper`);
      assert.ok(Math.abs(chooser.stageGeometry.left - initial.stageGeometry.left) < 0.1, `${viewport.name}: chooser focus shifted the stage horizontally`);
      assert.ok(Math.abs(chooser.stageGeometry.top - initial.stageGeometry.top) < 0.1, `${viewport.name}: chooser focus shifted the stage vertically`);
      assert.equal(chooser.stageGeometry.transform, initial.stageGeometry.transform, `${viewport.name}: chooser focus changed the stage transform`);
      await assertNoWhiteCornerRectangles(
        await page.screenshot(),
        { chooser: chooser.card },
        `${viewport.name}:chooser`
      );
      if (viewport.height <= 500) {
        assert.ok(chooser.choiceGap >= 8, `${viewport.name}: chooser title/copy gap is below 8px`);
        assert.ok(chooser.fonts.choiceCopy >= 12, `${viewport.name}: chooser supporting text is below 12px`);
        for (const name of ['title', 'choiceTitle', 'close']) {
          assert.ok(chooser.fonts[name] >= 13.5, `${viewport.name}:chooser-${name} primary text is below 13.5px`);
        }
      }
      assert.ok(chooser.close.height >= 44, `${viewport.name}:chooser close below 44px`);
      assert.equal(chooser.choices.length, 4, `${viewport.name}:chooser does not expose four hit areas`);
      assert.ok(chooser.choices.every((choice) => choice.tag === 'BUTTON'), `${viewport.name}:chooser hit area is not a real button`);
      assert.equal(chooser.choices[3].id, 'modeChoiceCloseBtn', `${viewport.name}:chooser fourth window is not the return action`);
      assert.ok(chooser.choices.every((choice) => choice.button.height >= 44), `${viewport.name}:chooser choice below 44px`);
      chooser.choices.forEach((choice, index) => {
        assertRectContained(choice.title, choice.button, `${viewport.name}:chooser-${index + 1}-title`);
        if (choice.copy) {
          assertRectContained(choice.copy, choice.button, `${viewport.name}:chooser-${index + 1}-copy`);
          assert.equal(rectanglesOverlap(choice.title, choice.copy), false, `${viewport.name}:chooser-${index + 1} title overlaps its copy`);
        }
        assert.equal(choice.surface.backgroundColor, 'rgba(0, 0, 0, 0)', `${viewport.name}:chooser-${index + 1} paints a CSS paper`);
        assert.deepEqual(choice.surface.borderWidths, ['0px', '0px', '0px', '0px'], `${viewport.name}:chooser-${index + 1} paints a CSS border`);
        assert.equal(choice.surface.boxShadow, 'none', `${viewport.name}:chooser-${index + 1} paints a CSS shadow`);
      });
      assert.ok(chooser.choices.every((choice) => choice.surface.backgroundImage === 'none'), `${viewport.name}:chooser choices replaced the fixed base art`);
      assert.equal(chooser.choices[0].tint.backgroundColor, 'rgb(247, 229, 167)', `${viewport.name}:current mode lost its paper-well tint`);
      assert.equal(chooser.choices[0].tint.opacity, '0.72', `${viewport.name}:current mode tint opacity drifted`);
      assert.ok(chooser.choices.slice(1).every((choice) => choice.tint.backgroundColor === 'rgba(0, 0, 0, 0)'), `${viewport.name}:inactive chooser well retained tint`);
      assert.ok(Math.abs(chooser.card.width / chooser.card.height - 1159 / 1079) < 0.003, `${viewport.name}:chooser natural aspect ratio drifted`);
      assert.ok(Math.abs(chooser.choices[0].button.top - chooser.choices[1].button.top) < 0.1, `${viewport.name}:chooser top row is uneven`);
      assert.ok(Math.abs(chooser.choices[2].button.top - chooser.choices[3].button.top) < 0.1, `${viewport.name}:chooser bottom row is uneven`);
      assert.ok(chooser.choices[2].button.top >= chooser.choices[0].button.bottom - 0.1, `${viewport.name}:chooser rows overlap`);
      assert.equal(
        await page.evaluate(() => document.activeElement && document.activeElement.dataset.writingMode),
        'sequence',
        `${viewport.name}: chooser did not focus the current mode`
      );
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'modeChoiceCloseBtn', `${viewport.name}: chooser Shift+Tab did not wrap`);
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => document.activeElement && document.activeElement.dataset.writingMode),
        'sequence',
        `${viewport.name}: chooser Tab did not wrap`
      );
      assert.deepEqual(
        await page.evaluate(() => {
          const wrap = document.querySelector('#stage-wrap');
          return { left: wrap.scrollLeft, top: wrap.scrollTop };
        }),
        { left: 0, top: 0 },
        `${viewport.name}: chooser focus trap scrolled the stage wrapper`
      );

      const trChoice = page.locator('[data-writing-mode="word-hole"]');
      const trBefore = await trChoice.boundingBox();
      assert.equal(await trChoice.evaluate((element) => getComputedStyle(element).backgroundImage), 'none', `${viewport.name}:TR choice starts with a nested image`);
      await page.mouse.move(trBefore.x + trBefore.width / 2, trBefore.y + trBefore.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(100);
      const trPressed = await trChoice.evaluate((element) => ({
        image: getComputedStyle(element).backgroundImage,
        transform: getComputedStyle(element).transform,
        tint: getComputedStyle(element, '::before').backgroundColor,
        opacity: getComputedStyle(element, '::before').opacity
      }));
      assert.equal(trPressed.image, 'none', `${viewport.name}:TR pointerdown replaced the fixed chooser base`);
      assert.notEqual(trPressed.transform, 'none', `${viewport.name}:TR pointerdown lost tactile motion`);
      assert.equal(trPressed.tint, 'rgb(247, 229, 167)', `${viewport.name}:TR pointerdown lost its paper-well tint`);
      assert.equal(trPressed.opacity, '0.72', `${viewport.name}:TR pointerdown tint opacity drifted`);
      await page.mouse.move(2, 2);
      await page.mouse.up();
      await page.waitForTimeout(100);
      assert.equal(await trChoice.evaluate((element) => getComputedStyle(element).backgroundImage), 'none', `${viewport.name}:TR pointerup changed the fixed chooser base`);
      assert.equal(await trChoice.evaluate((element) => getComputedStyle(element, '::before').backgroundColor), 'rgba(0, 0, 0, 0)', `${viewport.name}:TR pointerup retained tint`);
      assert.equal(await page.evaluate(() => activeMode), 'sequence', `${viewport.name}:canceled TR press changed the mode`);

      await page.locator('[data-writing-mode="word-hole"]').click();
      await page.waitForTimeout(230);
      const wordClue = await page.evaluate(() => {
        const image = document.querySelector('.word-clue-image');
        const emoji = document.querySelector('.word-clue-emoji');
        return {
          image: image ? { complete: image.complete, width: image.naturalWidth, src: image.currentSrc || image.src } : null,
          emoji: emoji ? emoji.textContent : '',
          chooserVisible: document.querySelector('#modeChoiceOverlay').classList.contains('show')
        };
      });
      assert.equal(wordClue.chooserVisible, false, `${viewport.name}: chooser did not settle`);
      if (wordClue.image) {
        assert.ok(wordClue.image.complete && wordClue.image.width > 0, `${viewport.name}: word clue failed to decode`);
        assert.match(wordClue.image.src, /\/assets\//);
      } else {
        assert.ok(wordClue.emoji.length > 0, `${viewport.name}: missing word clue art fallback`);
      }

      const wordTaskBeforeCompletion = await page.evaluate(() => activeModeTaskId);
      await page.evaluate(async () => {
        const item = getCurrentCharacter();
        strokesCompleted = item.strokes;
        await completeWriting(true, { totalStrokes: item.strokes });
      });
      const wordIntermediate = await page.evaluate(() => ({
        overlayOpen: isResultOverlayOpen(),
        messageHidden: messageBox.hidden,
        prompt: promptText.textContent,
        pendingAdvance: pendingModeAdvanceTimer !== null
      }));
      assert.equal(wordIntermediate.overlayOpen, false, `${viewport.name}: intermediate word opened the final result`);
      assert.equal(wordIntermediate.messageHidden, true, `${viewport.name}: intermediate feedback obscured the reward prompt`);
      assert.match(wordIntermediate.prompt, /スター \+10/, `${viewport.name}: intermediate reward was not visible`);
      assert.equal(wordIntermediate.pendingAdvance, true, `${viewport.name}: 900ms word advance was not scheduled`);
      await page.waitForFunction((previousTask) => activeModeTaskId !== previousTask, wordTaskBeforeCompletion, { timeout: 2500 });
      assert.equal(await page.evaluate(() => isResultOverlayOpen()), false, `${viewport.name}: word auto-advance leaked a result modal`);

      await page.locator('#modeSwitchBtn').click();
      await page.locator('[data-writing-mode="daily-three"]').click();
      await page.waitForTimeout(80);
      const dailyState = await page.evaluate(() => ({
        activeMode,
        cells: document.querySelectorAll('.daily-clue-cell').length,
        currentCells: document.querySelectorAll('.daily-clue-cell.current').length,
        progress: modeProgressCount.textContent,
        overlayOpen: isResultOverlayOpen()
      }));
      assert.equal(dailyState.activeMode, 'daily-three', `${viewport.name}: daily mode did not activate`);
      assert.equal(dailyState.cells, 3, `${viewport.name}: daily mode did not render three characters`);
      assert.equal(dailyState.currentCells, 1, `${viewport.name}: daily mode current character is ambiguous`);
      assert.match(dailyState.progress, /1 \/ 3/, `${viewport.name}: daily progress is wrong`);
      assert.equal(dailyState.overlayOpen, false, `${viewport.name}: daily mode inherited a stale result`);

      if (viewport.name === 'tablet') {
        await page.locator('#modeSwitchBtn').click();
        await page.locator('[data-writing-mode="sequence"]').click();
        await page.waitForFunction(() => !document.querySelector('#modeChoiceOverlay').classList.contains('show'));
        await page.evaluate(() => focusElementWithoutScroll(doneBtn));
        await page.evaluate(async () => {
          const item = getCurrentCharacter();
          strokesCompleted = item.strokes;
          fillAllLetterPixels();
          await completeWriting(true, { totalStrokes: item.strokes });
        });
        await page.waitForFunction(() => isResultOverlayOpen());
        const chooserToResult = await page.evaluate(() => {
          const wrap = document.querySelector('#stage-wrap');
          const card = document.querySelector('.result-card').getBoundingClientRect();
          return {
            wrapScroll: { left: wrap.scrollLeft, top: wrap.scrollTop },
            stageLeft: stageEl.getBoundingClientRect().left,
            card: { left: card.left, top: card.top, right: card.right, bottom: card.bottom, width: card.width, height: card.height },
            activeId: document.activeElement && document.activeElement.id
          };
        });
        assert.deepEqual(chooserToResult.wrapScroll, { left: 0, top: 0 }, 'tablet: chooser-to-result focus scrolled the stage wrapper');
        assert.ok(Math.abs(chooserToResult.stageLeft - initial.stageGeometry.left) < 0.1, 'tablet: chooser-to-result shifted the compact stage');
        assertInsideViewport(chooserToResult.card, viewport, 'tablet:chooser-to-result-card');
        assert.equal(chooserToResult.activeId, 'modalRetryBtn', 'tablet: chooser-to-result did not focus the primary result action');
        await page.locator('#modalRetryBtn').click();
        await page.waitForFunction(() => !isResultOverlayOpen());
      }

      assert.deepEqual(pageErrors, [], `${viewport.name}: late page errors`);
      assert.deepEqual(localFailures, [], `${viewport.name}: late local request failures`);
      assert.deepEqual(localHttpErrors, [], `${viewport.name}: late local HTTP errors`);
      if (viewport.name === 'desktop') {
        await page.evaluate(() => focusElementWithoutScroll(doneBtn));
        assert.equal(await page.evaluate(() => openResultOverlay()), true, 'desktop: care result could not open');
        await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'modalRetryBtn');
        await Promise.all([
          page.waitForURL(/\/writing-mori\/care\.html\?from=writing$/, { waitUntil: 'commit' }),
          page.locator('#careBtn').click()
        ]);
        assert.match(page.url(), /\/writing-mori\/care\.html\?from=writing$/);
      }
      await context.close();
    }
    await auditCompanionFallbackLayout(browser, base);
    for (const state of milmaruVisualStates) {
      await auditMilmaruInitialNetwork(browser, base, state);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('Mojikko storybook UI browser regression: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
