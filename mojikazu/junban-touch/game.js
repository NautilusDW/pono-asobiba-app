(() => {
  "use strict";

  const board = document.getElementById("numberBoard");
  const playArea = document.getElementById("playArea");
  const nextNumber = document.getElementById("nextNumber");
  const goalBadge = document.getElementById("goalBadge");
  const trail = document.getElementById("trail");
  const celebration = document.getElementById("celebration");
  const difficultyButtons = [...document.querySelectorAll("[data-limit]")];
  const colors = ["#ff8a69", "#ffd65a", "#72dfbd", "#8dd1ff", "#d5a5ff"];

  let limit = 5;
  let expected = 1;
  let lastPoint = null;
  let firstPoint = null;
  let hintTimer = 0;

  const SHAPES = {
    5: [
      [50, 9], [62, 76], [9, 32], [91, 32], [38, 76]
    ],
    10: [
      [9, 51], [28, 27], [54, 17], [75, 31], [92, 14],
      [84, 50], [92, 86], [70, 69], [45, 80], [24, 68]
    ]
  };

  function shuffled(values) {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function clearHint() {
    window.clearTimeout(hintTimer);
    board.querySelectorAll(".hint").forEach((button) => button.classList.remove("hint"));
  }

  function showHint() {
    clearHint();
    const target = board.querySelector(`[data-number="${expected}"]`);
    if (!target) return;
    target.classList.add("hint");
    hintTimer = window.setTimeout(() => target.classList.remove("hint"), 1400);
  }

  function centerOf(button) {
    const areaRect = playArea.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      x: buttonRect.left - areaRect.left + buttonRect.width / 2,
      y: buttonRect.top - areaRect.top + buttonRect.height / 2
    };
  }

  function addTrail(point) {
    if (lastPoint) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", lastPoint.x);
      line.setAttribute("y1", lastPoint.y);
      line.setAttribute("x2", point.x);
      line.setAttribute("y2", point.y);
      trail.append(line);
    }
    if (!firstPoint) firstPoint = point;
    lastPoint = point;
  }

  function closeTrail() {
    if (!lastPoint || !firstPoint || limit === 20) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", lastPoint.x);
    line.setAttribute("y1", lastPoint.y);
    line.setAttribute("x2", firstPoint.x);
    line.setAttribute("y2", firstPoint.y);
    trail.append(line);
  }

  function finishGame() {
    closeTrail();
    document.getElementById("finishMessage").textContent =
      limit === 5 ? "おほしさま！" : limit === 10 ? "おさかな！" : "ぜんぶ みつけた！";
    goalBadge.hidden = true;
    window.setTimeout(() => {
      celebration.hidden = false;
      document.getElementById("playAgainButton").focus();
    }, 220);
  }

  function chooseNumber(button) {
    const value = Number(button.dataset.number);
    if (value !== expected) {
      button.classList.remove("wrong");
      void button.offsetWidth;
      button.classList.add("wrong");
      window.setTimeout(() => button.classList.remove("wrong"), 320);
      showHint();
      return;
    }

    clearHint();
    addTrail(centerOf(button));
    button.classList.add("done");
    button.setAttribute("aria-pressed", "true");

    if (expected === limit) {
      finishGame();
      return;
    }

    expected += 1;
    nextNumber.textContent = String(expected);
  }

  function startGame() {
    expected = 1;
    lastPoint = null;
    firstPoint = null;
    clearHint();
    trail.replaceChildren();
    board.replaceChildren();
    celebration.hidden = true;
    goalBadge.hidden = false;
    nextNumber.textContent = "1";

    const numbers = shuffled(Array.from({ length: limit }, (_, index) => index + 1));
    const randomPoints = [];
    const boardRect = board.getBoundingClientRect();
    while (randomPoints.length < limit) {
      const candidate = {
        x: 7 + Math.random() * 82,
        y: 9 + Math.random() * 78
      };
      const farEnough = randomPoints.every((point) => {
        const dx = (point.x - candidate.x) * boardRect.width / 100;
        const dy = (point.y - candidate.y) * boardRect.height / 100;
        const minimumGap = limit === 20 ? 52 : 70;
        return Math.abs(dx) >= minimumGap || Math.abs(dy) >= minimumGap;
      });
      if (farEnough) randomPoints.push(candidate);
    }
    const shape = SHAPES[limit];
    const mirror = Math.random() > .5;
    const positions = shape
      ? shape.map(([x, y]) => ({ x: mirror ? 100 - x : x, y }))
      : randomPoints;

    numbers.forEach((number) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "number-button";
      button.dataset.number = String(number);
      button.textContent = String(number);
      button.setAttribute("aria-label", `${number}`);
      button.setAttribute("aria-pressed", "false");
      button.style.setProperty("--ball-color", colors[(number - 1) % colors.length]);
      const point = positions[number - 1];
      button.style.left = `${point.x}%`;
      button.style.top = `${point.y}%`;
      button.addEventListener("click", () => chooseNumber(button));
      board.append(button);
    });
    trail.style.display = limit === 20 ? "none" : "";
  }

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      limit = Number(button.dataset.limit);
      difficultyButtons.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      startGame();
    });
  });

  document.getElementById("newGameButton").addEventListener("click", startGame);
  document.getElementById("playAgainButton").addEventListener("click", startGame);

  document.addEventListener("keydown", (event) => {
    if (celebration.hidden === false) return;
    if (!/^\d$/.test(event.key)) return;

    const digit = Number(event.key);
    const candidates = [...board.querySelectorAll(".number-button:not(.done)")];
    const exact = candidates.find((button) => Number(button.dataset.number) === digit);
    const expectedButton = board.querySelector(`[data-number="${expected}"]:not(.done)`);

    if (exact) {
      chooseNumber(exact);
    } else if (expected >= 10 && digit === expected % 10 && expectedButton) {
      chooseNumber(expectedButton);
    }
  });

  window.addEventListener("resize", () => {
    if (expected > 1) {
      trail.replaceChildren();
      lastPoint = null;
    }
  });

  startGame();
})();
