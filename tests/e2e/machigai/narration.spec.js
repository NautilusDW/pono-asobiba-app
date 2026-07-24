const { test, expect } = require('@playwright/test');

async function installFakeAudio(page, options = {}) {
  await page.addInitScript(({ rejectAll }) => {
    window.__APP_BUILD__ = 1;
    try {
      window.sessionStorage.setItem('pono_debug_mode_session', '1');
      window.localStorage.setItem('msl_muted_v1', '0');
    } catch (_error) {
      /* storage unavailable */
    }

    const state = {
      rejectAll: !!rejectAll,
      rejectNext: false,
      nextId: 1,
      instances: [],
      events: []
    };

    function record(type, audio) {
      state.events.push({
        type,
        id: audio.id,
        src: audio.src,
        at: performance.now()
      });
    }

    class FakeAudio extends EventTarget {
      constructor() {
        super();
        this.id = state.nextId++;
        this.src = '';
        this.preload = '';
        this.volume = 1;
        this.defaultPlaybackRate = 1;
        this.playbackRate = 1;
        this.currentTime = 0;
        this.paused = true;
        this.loadCalls = 0;
        this.playCalls = 0;
        this.pauseCalls = 0;
        state.instances.push(this);
      }

      load() {
        this.loadCalls++;
        record('load', this);
      }

      play() {
        this.playCalls++;
        this.paused = false;
        record('play', this);

        const shouldReject = state.rejectAll || state.rejectNext;
        state.rejectNext = false;
        if (shouldReject) {
          this.paused = true;
          record('rejected', this);
          return Promise.reject(new DOMException('play blocked by test', 'NotAllowedError'));
        }
        return Promise.resolve();
      }

      pause() {
        this.pauseCalls++;
        this.paused = true;
        record('pause', this);
      }

      emit(type) {
        record(type, this);
        this.dispatchEvent(new Event(type));
      }
    }

    window.__fakeAudioState = state;
    window.Audio = FakeAudio;
  }, { rejectAll: !!options.rejectAll });
}

async function openFirstStageThroughUi(page) {
  await page.goto('/machigai/index.html');
  await expect(page.locator('.title-logo')).toBeVisible({ timeout: 10_000 });

  await page.locator('.title-play-btn').click();
  await expect(page.locator('.select-title')).toHaveText('ステージを えらんでね');

  const firstCard = page.locator('.stage-card:not(.disabled)').first();
  await expect(firstCard).toContainText('こうえん');
  await firstCard.click();
  await expect(page.locator('.game-stage-name')).toHaveText('こうえん');

  return page.evaluate(() => {
    const stage = window.STAGE_DATA.stages.find((candidate) => candidate.id === 'park2');
    return JSON.parse(JSON.stringify(stage));
  });
}

async function clickDifference(page, stage, index) {
  const panel = page.locator('.panel').first();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();

  const diff = stage.differences[index];
  await panel.click({
    position: {
      x: diff.x * box.width,
      y: diff.y * box.height
    }
  });
  await expect(page.locator('.stars-row .star.filled')).toHaveCount(index + 1);
}

async function waitForPlayCount(page, count, timeout = 3_000) {
  await expect.poll(
    () => page.evaluate(() =>
      window.__fakeAudioState.events.filter((event) => event.type === 'play').length
    ),
    { timeout }
  ).toBe(count);
}

async function latestPlay(page) {
  return page.evaluate(() => {
    const plays = window.__fakeAudioState.events.filter((event) => event.type === 'play');
    return plays[plays.length - 1] || null;
  });
}

async function endLatestAudio(page) {
  return page.evaluate(() => {
    const state = window.__fakeAudioState;
    const plays = state.events.filter((event) => event.type === 'play');
    const latest = plays[plays.length - 1];
    if (!latest) throw new Error('No FakeAudio play call to end');
    const audio = state.instances.find((candidate) => candidate.id === latest.id);
    if (!audio) throw new Error('FakeAudio instance not found');
    audio.emit('ended');
    return { id: audio.id, src: audio.src };
  });
}

async function finishFirstTwoDifferences(page, stage) {
  for (let index = 0; index < 2; index++) {
    await clickDifference(page, stage, index);
    await waitForPlayCount(page, index + 1);
    await endLatestAudio(page);
  }
}

test('正解ラベルのMP3を再生し、次の正解とミュートで再生中音声を即停止する', async ({ page }) => {
  await installFakeAudio(page);
  const stage = await openFirstStageThroughUi(page);

  await clickDifference(page, stage, 0);
  await waitForPlayCount(page, 1);
  const firstPlay = await latestPlay(page);
  expect(firstPlay.src).toBe('assets/audio/narration/tts31-leda-v1/park2_01.mp3');

  await clickDifference(page, stage, 1);
  await waitForPlayCount(page, 2);
  const secondPlay = await latestPlay(page);
  expect(secondPlay.src).toBe('assets/audio/narration/tts31-leda-v1/park2_02.mp3');
  expect(secondPlay.id).toBe(firstPlay.id);

  const afterReplacement = await page.evaluate((playerId) => {
    const state = window.__fakeAudioState;
    const player = state.instances.find((audio) => audio.id === playerId);
    return {
      player: {
        pauseCalls: player.pauseCalls,
        paused: player.paused,
        currentTime: player.currentTime,
        playCalls: player.playCalls,
        src: player.src
      },
      instanceCount: state.instances.length,
      activeText: window.MSL.Speech.getActiveText()
    };
  }, firstPlay.id);
  expect(afterReplacement.player).toEqual({
    pauseCalls: 1,
    paused: false,
    currentTime: 0,
    playCalls: 2,
    src: 'assets/audio/narration/tts31-leda-v1/park2_02.mp3'
  });
  expect(afterReplacement.instanceCount).toBe(1);
  expect(afterReplacement.activeText).toBe('ことり');

  await page.locator('.game-topbar .mute-toggle').click();
  await expect.poll(() => page.evaluate(() => window.MSL.Audio.isMuted())).toBe(true);

  const afterMute = await page.evaluate((secondId) => {
    const second = window.__fakeAudioState.instances.find((audio) => audio.id === secondId);
    return {
      pauseCalls: second.pauseCalls,
      paused: second.paused,
      currentTime: second.currentTime,
      activeText: window.MSL.Speech.getActiveText()
    };
  }, firstPlay.id);
  expect(afterMute).toEqual({
    pauseCalls: 2,
    paused: true,
    currentTime: 0,
    activeText: ''
  });
});

test('最終ラベル音声が先にendedしてもクリア画面まで最低1.4秒待つ', async ({ page }) => {
  await installFakeAudio(page);
  const stage = await openFirstStageThroughUi(page);
  await finishFirstTwoDifferences(page, stage);

  const startedAt = await page.evaluate(() => performance.now());
  await clickDifference(page, stage, 2);
  await waitForPlayCount(page, 3);
  await endLatestAudio(page);

  await page.waitForTimeout(1_100);
  await expect(page.locator('.clear-title')).toHaveCount(0);
  await expect(page.locator('.game-stage-name')).toHaveText('こうえん');

  await expect(page.locator('.clear-title')).toHaveText('できた！', { timeout: 1_500 });
  const elapsed = await page.evaluate((start) => performance.now() - start, startedAt);
  expect(elapsed).toBeGreaterThanOrEqual(1_400);
});

test('1.4秒を過ぎても最終ラベルのendedまで待ち、クリア文言MP3を再生する', async ({ page }) => {
  await installFakeAudio(page);
  const stage = await openFirstStageThroughUi(page);
  await finishFirstTwoDifferences(page, stage);

  await clickDifference(page, stage, 2);
  await waitForPlayCount(page, 3);

  await page.waitForTimeout(1_550);
  await expect(page.locator('.clear-title')).toHaveCount(0);
  await expect(page.locator('.game-stage-name')).toHaveText('こうえん');

  await endLatestAudio(page);
  await expect(page.locator('.clear-title')).toHaveText('できた！', { timeout: 1_000 });

  await waitForPlayCount(page, 4, 2_500);
  const completionPlay = await latestPlay(page);
  expect(completionPlay.src).toBe(
    'assets/audio/narration/tts31-leda-v1/completion_all_found.mp3'
  );
});

test('Audio.playが拒否されても全正解からクリアへ進み、クリア文言も試行する', async ({ page }) => {
  await installFakeAudio(page, { rejectAll: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  const stage = await openFirstStageThroughUi(page);

  for (let index = 0; index < stage.differences.length; index++) {
    await clickDifference(page, stage, index);
    await waitForPlayCount(page, index + 1);
  }

  await expect(page.locator('.clear-title')).toHaveText('できた！', { timeout: 3_000 });
  await waitForPlayCount(page, 4, 2_500);

  const summary = await page.evaluate(() => ({
    played: window.__fakeAudioState.events
      .filter((event) => event.type === 'play')
      .map((event) => event.src),
    rejected: window.__fakeAudioState.events
      .filter((event) => event.type === 'rejected')
      .map((event) => event.src)
  }));
  expect(summary.played).toEqual([
    'assets/audio/narration/tts31-leda-v1/park2_01.mp3',
    'assets/audio/narration/tts31-leda-v1/park2_02.mp3',
    'assets/audio/narration/tts31-leda-v1/park2_03.mp3',
    'assets/audio/narration/tts31-leda-v1/completion_all_found.mp3'
  ]);
  expect(summary.rejected).toEqual(summary.played);
  expect(errors).toEqual([]);
});
