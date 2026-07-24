const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
];

async function installDeterministicSleepingAndAudioSpy(page) {
  await page.addInitScript(() => {
    window.__APP_BUILD__ = 1;
    Math.random = () => 0;
    window.__hhAudioEvents = [];

    let nextNodeId = 1;
    const record = (event) => window.__hhAudioEvents.push(event);

    class FakeAudioParam {
      constructor(nodeId, param) {
        this.nodeId = nodeId;
        this.param = param;
        this.value = 0;
      }

      setValueAtTime(value, time) {
        this.value = value;
        record({ kind: 'param', method: 'set', nodeId: this.nodeId, param: this.param, value, time });
      }

      exponentialRampToValueAtTime(value, time) {
        this.value = value;
        record({ kind: 'param', method: 'exponential', nodeId: this.nodeId, param: this.param, value, time });
      }
    }

    class FakeAudioNode {
      constructor(kind) {
        this.kind = kind;
        this.nodeId = nextNodeId++;
      }

      connect() {
        record({ kind: 'connect', nodeId: this.nodeId, nodeKind: this.kind });
      }

      disconnect() {
        record({ kind: 'disconnect', nodeId: this.nodeId, nodeKind: this.kind });
      }
    }

    class FakeOscillator extends FakeAudioNode {
      constructor() {
        super('oscillator');
        this.type = 'sine';
        this.frequency = new FakeAudioParam(this.nodeId, 'frequency');
        this.onended = null;
      }

      start(time) {
        record({ kind: 'osc-start', nodeId: this.nodeId, type: this.type, time });
      }

      stop(time) {
        record({ kind: 'osc-stop', nodeId: this.nodeId, time });
        Promise.resolve().then(() => {
          if (typeof this.onended === 'function') this.onended();
        });
      }
    }

    class FakeGain extends FakeAudioNode {
      constructor() {
        super('gain');
        this.gain = new FakeAudioParam(this.nodeId, 'gain');
      }
    }

    class FakeAudioContext {
      constructor() {
        this.currentTime = 10;
        this.destination = {};
        this.state = 'suspended';
        record({ kind: 'context-create' });
      }

      createOscillator() {
        return new FakeOscillator();
      }

      createGain() {
        return new FakeGain();
      }

      resume() {
        this.state = 'running';
        record({ kind: 'context-resume' });
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });
  });
}

async function waitForSleepingFriend(page, budgetMs = 5_000) {
  for (let advanced = 0; advanced <= budgetMs; advanced += 50) {
    const sleeping = page.locator('.hh-hole').filter({
      has: page.locator('.hh-char-wrap.is-visible.is-sleeping'),
    }).first();
    if (await sleeping.count()) return sleeping;
    await page.clock.runFor(50);
  }
  throw new Error('ねている おともだちが時間内に出現しませんでした');
}

async function startDeterministicGame(page) {
  await page.clock.install({ time: new Date('2026-07-24T00:00:00Z') });
  await installDeterministicSleepingAndAudioSpy(page);
  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => (
    document.body.classList.contains('pono-game-ready')
    && document.querySelectorAll('.hh-hole').length === 6
  ));
  await page.locator('#start-btn').click({ force: true });
  await page.clock.runFor(1_250);
  return waitForSleepingFriend(page);
}

async function startDeterministicGameRealTime(page) {
  await installDeterministicSleepingAndAudioSpy(page);
  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => (
    document.body.classList.contains('pono-game-ready')
    && document.querySelectorAll('.hh-hole').length === 6
  ));
  await page.locator('#start-btn').click({ force: true });
  const sleeping = page.locator('.hh-hole').filter({
    has: page.locator('.hh-char-wrap.is-visible.is-sleeping'),
  }).first();
  await sleeping.waitFor({ state: 'visible', timeout: 6_000 });
  return sleeping;
}

test('寝ている子へのタップは中央×・局所反応・下降2音を1秒同期し、ロック中は再発火しない', async ({ page }) => {
  test.setTimeout(30_000);
  await page.setViewportSize({ width: 844, height: 390 });
  const sleepingHole = await startDeterministicGame(page);
  const sleepingWrap = sleepingHole.locator('.hh-char-wrap');
  const scoreBefore = await page.locator('#hud-score').textContent();

  // 開始直後の表示時間は約1.6秒。残り約0.2秒まで待ってから触れ、
  // 元の期限を越えても1秒の案内中は寝姿が残ることを実証する。
  await page.clock.runFor(1_350);
  await expect(sleepingWrap).toHaveClass(/is-visible/);
  await sleepingHole.locator('.hh-window').click({ force: true });
  await page.clock.runFor(40);

  await expect(page.locator('#hud-score')).toHaveText(scoreBefore || '');
  await expect(page.locator('#combo-count')).toHaveText('0');
  await expect(page.locator('#sleep-miss-feedback')).toHaveClass(/is-visible/);
  await expect(page.locator('#sleep-miss-feedback')).toContainText('×');
  await expect(page.locator('#sleep-miss-feedback')).toContainText('ねてるよ');
  await expect(page.locator('#combo-status-sr')).toHaveText('ねてるよ。おきるまで まってね');
  await expect(sleepingWrap).toHaveClass(/is-wobble/);
  await expect(sleepingWrap).toHaveClass(/is-sleep-miss/);
  await expect(sleepingHole).toHaveClass(/is-sleep-target/);
  expect(await sleepingHole.evaluate((hole) => Number.parseFloat(getComputedStyle(hole).opacity))).toBe(1);
  await expect(page.locator('.hh-hole.is-locked')).toHaveCount(6);

  const firstAudio = await page.evaluate(() => window.__hhAudioEvents);
  const oscillatorStarts = firstAudio.filter((event) => event.kind === 'osc-start');
  expect(oscillatorStarts).toHaveLength(2);
  expect(oscillatorStarts.map((event) => event.type)).toEqual(['triangle', 'triangle']);
  expect(oscillatorStarts[1].time - oscillatorStarts[0].time).toBeCloseTo(0.14, 5);
  expect(firstAudio.filter((event) => (
    event.kind === 'param'
    && event.param === 'frequency'
    && event.method === 'set'
  )).map((event) => event.value)).toEqual([392, 294]);
  expect(firstAudio.filter((event) => (
    event.kind === 'param'
    && event.param === 'frequency'
    && event.method === 'exponential'
  )).map((event) => event.value)).toEqual([330, 220]);
  expect(firstAudio.filter((event) => (
    event.kind === 'param'
    && event.param === 'gain'
    && event.method === 'exponential'
  )).map((event) => event.value).filter((value) => value > 0.001)).toEqual([0.075, 0.085]);
  expect(firstAudio.filter((event) => event.kind === 'context-resume')).toHaveLength(1);

  // 1秒ロック中の追いタップは、音や中央表示を最初からやり直さない。
  await sleepingHole.locator('.hh-window').click({ force: true });
  await sleepingHole.locator('.hh-window').click({ force: true });
  await sleepingHole.locator('.hh-window').click({ force: true });
  expect(await page.evaluate(() => window.__hhAudioEvents.filter((event) => event.kind === 'osc-start').length)).toBe(2);

  // 元の出現時間ぎりぎりでも、案内が終わるまでは寝姿と中央表示を保持する。
  await page.clock.runFor(700);
  await expect(page.locator('#sleep-miss-feedback')).toHaveClass(/is-visible/);
  await expect(sleepingWrap).toHaveClass(/is-visible/);
  await expect(sleepingWrap).toHaveClass(/is-sleeping/);

  await page.clock.runFor(300);
  await expect(page.locator('#sleep-miss-feedback')).not.toHaveClass(/is-visible/);
  await expect(page.locator('#combo-status-sr')).toHaveText('');
  await expect(page.locator('.hh-hole.is-locked')).toHaveCount(0);
  await expect(sleepingWrap).not.toHaveClass(/is-wobble/);
  await expect(sleepingWrap).not.toHaveClass(/is-sleep-miss/);
  await expect(sleepingHole).not.toHaveClass(/is-sleep-target/);
});

test('連打案内へ切り替わる時は、寝タップ側の中央・局所反応を残さない', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const sleepingHole = await startDeterministicGame(page);
  const sleepingWindow = sleepingHole.locator('.hh-window');
  const sleepingWrap = sleepingHole.locator('.hh-char-wrap');

  await sleepingWindow.click({ force: true });
  // 最初の寝タップを含む8タップで既存の連打案内へ切り替わる。
  for (let i = 0; i < 7; i += 1) {
    await sleepingWindow.click({ force: true });
  }
  await page.clock.runFor(40);

  await expect(page.locator('#overheat-banner')).toHaveClass(/show/);
  await expect(page.locator('#sleep-miss-feedback')).not.toHaveClass(/is-visible/);
  await expect(page.locator('#combo-status-sr')).not.toHaveText('ねてるよ。おきるまで まってね');
  await expect(sleepingWrap).not.toHaveClass(/is-wobble/);
  await expect(sleepingWrap).not.toHaveClass(/is-sleep-miss/);
  await expect(sleepingHole).not.toHaveClass(/is-sleep-target/);
  expect(await page.evaluate(() => window.__hhAudioEvents.filter((event) => event.kind === 'osc-start').length)).toBe(2);
});

test('遅れて届いた読み上げフレームは、1秒の案内終了後に文言を復活させない', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const sleepingHole = await startDeterministicGame(page);

  await page.evaluate(() => {
    const nativeRaf = window.requestAnimationFrame.bind(window);
    window.__hhNativeRaf = nativeRaf;
    window.__hhDelayedFeedbackFrames = [];
    window.requestAnimationFrame = (callback) => {
      // ゲームループは動かし、読み上げ更新用の匿名フレームだけ保留する。
      if (callback.name === 'loop') return nativeRaf(callback);
      window.__hhDelayedFeedbackFrames.push(callback);
      return 123456;
    };
  });

  await sleepingHole.locator('.hh-window').click({ force: true });
  await page.clock.runFor(1);
  expect(await page.evaluate(() => window.__hhDelayedFeedbackFrames.length)).toBeGreaterThan(0);
  await page.clock.runFor(999);
  await expect(page.locator('#sleep-miss-feedback')).not.toHaveClass(/is-visible/);
  await expect(page.locator('#combo-status-sr')).toHaveText('');

  await page.evaluate(() => {
    const callbacks = window.__hhDelayedFeedbackFrames.splice(0);
    window.requestAnimationFrame = window.__hhNativeRaf;
    callbacks.forEach((callback) => callback(performance.now()));
    delete window.__hhNativeRaf;
  });
  await expect(page.locator('#combo-status-sr')).toHaveText('');
});

test('中央の×とかな表示は4画面サイズでステージ内に収まり、操作を塞がない', async ({ page }) => {
  await installDeterministicSleepingAndAudioSpy(page);
  await page.goto('/hyokkori-hightouch/index.html');
  await page.waitForFunction(() => document.body.classList.contains('pono-game-ready'));
  await page.evaluate(() => {
    document.getElementById('start-screen').style.display = 'none';
    const feedback = document.getElementById('sleep-miss-feedback');
    feedback.classList.add('is-visible');
    feedback.style.animation = 'none';
    feedback.style.opacity = '1';
    feedback.style.visibility = 'visible';
    feedback.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const stage = document.getElementById('stage').getBoundingClientRect();
      const feedback = document.getElementById('sleep-miss-feedback');
      const feedbackRect = feedback.getBoundingClientRect();
      const mark = document.querySelector('.sleep-miss-mark');
      const copy = document.querySelector('.sleep-miss-copy');
      return {
        stage: { left: stage.left, top: stage.top, right: stage.right, bottom: stage.bottom },
        feedback: {
          left: feedbackRect.left,
          top: feedbackRect.top,
          right: feedbackRect.right,
          bottom: feedbackRect.bottom,
          centerX: feedbackRect.left + feedbackRect.width / 2,
          centerY: feedbackRect.top + feedbackRect.height / 2,
        },
        stageCenterX: stage.left + stage.width / 2,
        stageCenterY: stage.top + stage.height / 2,
        markSize: Number.parseFloat(getComputedStyle(mark).fontSize),
        copySize: Number.parseFloat(getComputedStyle(copy).fontSize),
        pointerEvents: getComputedStyle(feedback).pointerEvents,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(Math.abs(geometry.feedback.centerX - geometry.stageCenterX), `${viewport.width}x${viewport.height}: 横中央`).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.feedback.centerY - geometry.stageCenterY), `${viewport.width}x${viewport.height}: 縦中央`).toBeLessThanOrEqual(1);
    expect(geometry.feedback.left, `${viewport.width}x${viewport.height}: 左端`).toBeGreaterThanOrEqual(geometry.stage.left - 1);
    expect(geometry.feedback.right, `${viewport.width}x${viewport.height}: 右端`).toBeLessThanOrEqual(geometry.stage.right + 1);
    expect(geometry.feedback.top, `${viewport.width}x${viewport.height}: 上端`).toBeGreaterThanOrEqual(geometry.stage.top - 1);
    expect(geometry.feedback.bottom, `${viewport.width}x${viewport.height}: 下端`).toBeLessThanOrEqual(geometry.stage.bottom + 1);
    expect(geometry.markSize, `${viewport.width}x${viewport.height}: ×の大きさ`).toBeGreaterThanOrEqual(64);
    expect(geometry.copySize, `${viewport.width}x${viewport.height}: かなの大きさ`).toBeGreaterThanOrEqual(22);
    expect(geometry.pointerEvents).toBe('none');
    expect(geometry.overflowX).toBeLessThanOrEqual(0);
  }
});

test('うごきをへらす設定でも中央表示は1秒静止し、寝姿と月は動かさない', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 844, height: 390 });
  // WebKitの仮想時計はreduced-motionの再計算を飛ばすことがあるため、
  // この視覚契約だけは実時間で製品と同じ描画経路を確認する。
  const sleepingHole = await startDeterministicGameRealTime(page);
  await sleepingHole.locator('.hh-window').click({ force: true });
  await page.waitForTimeout(40);

  const styles = await sleepingHole.evaluate((hole) => {
    const feedback = document.getElementById('sleep-miss-feedback');
    return {
      feedbackAnimation: getComputedStyle(feedback).animationName,
      feedbackOpacity: Number.parseFloat(getComputedStyle(feedback).opacity),
      charRiseAnimation: getComputedStyle(hole.querySelector('.hh-char-rise')).animationName,
      moonAnimation: getComputedStyle(hole.querySelector('.hh-sleep-fx')).animationName,
    };
  });
  expect(styles.feedbackAnimation).toBe('none');
  expect(styles.feedbackOpacity).toBe(1);
  expect(styles.charRiseAnimation).toBe('none');
  expect(styles.moonAnimation).toBe('none');

  await page.waitForTimeout(960);
  await expect(page.locator('#sleep-miss-feedback')).not.toHaveClass(/is-visible/);
});
