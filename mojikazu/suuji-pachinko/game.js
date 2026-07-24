(() => {
  "use strict";

  const ROUNDS = 5;
  const LOGICAL_W = 960;
  const LOGICAL_H = 430;
  const COLORS = ["#ffd25c", "#ff8c82", "#70d8a5", "#75c7f0", "#c79aef", "#ffac5e"];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const board = document.querySelector("#board");
  const ballLayer = document.querySelector("#ballLayer");
  const sparkLayer = document.querySelector("#sparkLayer");
  const prompt = document.querySelector("#prompt");
  const roundLabel = document.querySelector("#roundLabel");
  const progress = document.querySelector("#progress");
  const message = document.querySelector("#message");
  const startScreen = document.querySelector("#startScreen");
  const resultScreen = document.querySelector("#resultScreen");
  const hintButton = document.querySelector("#hintButton");

  let engine;
  let runnerFrame = 0;
  let lastTime = 0;
  let balls = [];
  let level = "easy";
  let round = 0;
  let targetsLeft = 0;
  let condition = () => false;
  let messageTimer = 0;
  let roundTimer = 0;
  let worldScale = { x: 1, y: 1 };

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffled(values) {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function say(text) {
    clearTimeout(messageTimer);
    message.textContent = text;
    message.classList.add("show");
    messageTimer = setTimeout(() => message.classList.remove("show"), 950);
  }

  function setMission() {
    const target = randomInt(1, 9);
    if (level === "easy") {
      targetsLeft = 1;
      condition = (number) => number === target;
      prompt.textContent = `${target}を みつけよう！`;
    } else if (level === "same") {
      targetsLeft = 3;
      condition = (number) => number === target;
      prompt.textContent = `${target}を 3こ あつめよう！`;
    } else {
      const border = randomInt(3, 6);
      targetsLeft = 3;
      condition = (number) => number > border;
      prompt.textContent = `${border}より おおきい すうじ！`;
    }
    roundLabel.textContent = `${round + 1} / ${ROUNDS}`;
    updateProgress();
  }

  function updateProgress() {
    if (level === "easy") {
      progress.textContent = "";
    } else {
      progress.textContent = `あと ${targetsLeft}こ`;
    }
  }

  function makeNumbers() {
    if (level === "easy") {
      const target = Number(prompt.textContent.match(/\d+/)?.[0] || 1);
      return shuffled([target, ...Array.from({ length: 9 }, () => randomInt(1, 9))])
        .map((number, index, all) => index > 0 && number === target && all.indexOf(number) !== index ? (number % 9) + 1 : number);
    }
    if (level === "same") {
      const target = Number(prompt.textContent.match(/\d+/)?.[0] || 1);
      return shuffled([target, target, target, ...Array.from({ length: 9 }, () => {
        let value = randomInt(1, 9);
        while (value === target) value = randomInt(1, 9);
        return value;
      })]);
    }
    const border = Number(prompt.textContent.match(/\d+/)?.[0] || 5);
    const valid = shuffled(Array.from({ length: 9 - border }, (_, i) => border + i + 1)).slice(0, 3);
    const invalid = Array.from({ length: 9 }, () => randomInt(1, border));
    return shuffled([...valid, ...invalid]);
  }

  function clearWorld() {
    cancelAnimationFrame(runnerFrame);
    runnerFrame = 0;
    lastTime = 0;
    balls.forEach(({ element }) => element.remove());
    balls = [];
    if (engine) Matter.Engine.clear(engine);
  }

  function setupWorld() {
    clearWorld();
    engine = Matter.Engine.create({ enableSleeping: true });
    engine.gravity.y = reducedMotion ? 0.12 : 0.24;
    const { Bodies, Composite } = Matter;
    const walls = [
      Bodies.rectangle(LOGICAL_W / 2, LOGICAL_H + 28, LOGICAL_W, 56, { isStatic: true }),
      Bodies.rectangle(-28, LOGICAL_H / 2, 56, LOGICAL_H, { isStatic: true }),
      Bodies.rectangle(LOGICAL_W + 28, LOGICAL_H / 2, 56, LOGICAL_H, { isStatic: true }),
      Bodies.circle(200, 135, 25, { isStatic: true }),
      Bodies.circle(410, 260, 25, { isStatic: true }),
      Bodies.circle(625, 120, 25, { isStatic: true }),
      Bodies.circle(790, 275, 25, { isStatic: true }),
      Bodies.circle(305, 350, 25, { isStatic: true })
    ];
    Composite.add(engine.world, walls);

    makeNumbers().forEach((number, index) => {
      const body = Bodies.circle(
        68 + (index % 6) * 155 + randomInt(-20, 20),
        45 + Math.floor(index / 6) * 82,
        37,
        {
          restitution: reducedMotion ? 0.25 : 0.72,
          friction: 0.04,
          frictionAir: reducedMotion ? 0.055 : 0.025,
          density: 0.002
        }
      );
      Matter.Body.setVelocity(body, {
        x: reducedMotion ? 0 : randomInt(-12, 12) / 10,
        y: reducedMotion ? 0 : randomInt(-2, 4) / 10
      });
      const element = document.createElement("button");
      element.type = "button";
      element.className = "number-ball";
      element.textContent = String(number);
      element.setAttribute("aria-label", `すうじ ${number}`);
      element.style.setProperty("--ball-color", COLORS[index % COLORS.length]);
      element.addEventListener("click", () => chooseBall({ number, body, element }));
      ballLayer.appendChild(element);
      balls.push({ number, body, element, found: false });
      Composite.add(engine.world, body);
    });
    resizeWorld();
    runnerFrame = requestAnimationFrame(step);
  }

  function resizeWorld() {
    const rect = board.getBoundingClientRect();
    worldScale = { x: rect.width / LOGICAL_W, y: rect.height / LOGICAL_H };
  }

  function step(time) {
    if (!engine) return;
    const delta = Math.min(25, Math.max(8, lastTime ? time - lastTime : 16.67));
    lastTime = time;
    Matter.Engine.update(engine, delta);
    balls.forEach(({ body, element, found }) => {
      if (found) return;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      element.style.transform =
        `translate(${body.position.x * worldScale.x - width / 2}px, ${body.position.y * worldScale.y - height / 2}px)`;
    });
    runnerFrame = requestAnimationFrame(step);
  }

  function chooseBall(ball) {
    if (ball.found || roundTimer) return;
    document.querySelectorAll(".number-ball.hinting").forEach((el) => el.classList.remove("hinting"));
    if (!condition(ball.number)) {
      ball.element.classList.remove("soft-no");
      void ball.element.offsetWidth;
      ball.element.classList.add("soft-no");
      say("おしい！ もういちど みてみよう");
      return;
    }
    ball.found = true;
    targetsLeft -= 1;
    Matter.Composite.remove(engine.world, ball.body);
    ball.element.classList.add("found");
    makeSparks(ball.body.position);
    updateProgress();
    say(targetsLeft > 0 ? "みつけた！" : "できたね！");
    if (targetsLeft === 0) {
      roundTimer = setTimeout(nextRound, 720);
    }
  }

  function makeSparks(position) {
    if (reducedMotion) return;
    for (let i = 0; i < 8; i += 1) {
      const spark = document.createElement("span");
      spark.className = "spark";
      spark.textContent = "★";
      spark.style.left = `${position.x * worldScale.x}px`;
      spark.style.top = `${position.y * worldScale.y}px`;
      spark.style.setProperty("--dx", `${randomInt(-70, 70)}px`);
      spark.style.setProperty("--dy", `${randomInt(-65, 45)}px`);
      sparkLayer.appendChild(spark);
      setTimeout(() => spark.remove(), 700);
    }
  }

  function nextRound() {
    roundTimer = 0;
    round += 1;
    if (round >= ROUNDS) {
      clearWorld();
      resultScreen.classList.remove("hidden");
      document.querySelector("#againButton").focus();
      return;
    }
    setMission();
    setupWorld();
  }

  function start(selectedLevel) {
    level = selectedLevel;
    round = 0;
    startScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    setMission();
    setupWorld();
    setTimeout(() => balls[0]?.element.focus(), 80);
  }

  function showLevels() {
    clearWorld();
    resultScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    document.querySelector("[data-level='easy']").focus();
  }

  document.querySelectorAll("[data-level]").forEach((button) => {
    button.addEventListener("click", () => start(button.dataset.level));
  });
  document.querySelector("#againButton").addEventListener("click", () => start(level));
  document.querySelector("#levelButton").addEventListener("click", showLevels);
  hintButton.addEventListener("click", () => {
    const candidates = balls.filter((ball) => !ball.found && condition(ball.number));
    candidates.forEach(({ element }) => element.classList.add("hinting"));
    say("キラキラしている ボールだよ");
    candidates[0]?.element.focus();
  });
  window.addEventListener("resize", resizeWorld);
  window.addEventListener("pagehide", clearWorld);
})();
