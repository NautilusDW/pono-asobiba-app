(() => {
  "use strict";
  const start = document.querySelector("#start");
  const finish = document.querySelector("#finish");
  const target = document.querySelector("#target");
  const platforms = document.querySelector("#platforms");
  const friend = document.querySelector("#friend");
  const message = document.querySelector("#message");
  const progress = document.querySelector("#progress");
  const hint = document.querySelector("#hint");
  const again = document.querySelector("#again");
  let max = 5;
  let current = 1;
  let locked = false;
  let hintTimer = 0;

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function choicesFor(answer) {
    const values = new Set([answer]);
    while (values.size < 3) {
      const offset = Math.floor(Math.random() * 5) - 2;
      const candidate = Math.min(max, Math.max(1, answer + (offset || 2)));
      values.add(candidate);
    }
    return shuffle([...values]);
  }

  function showMessage(text) {
    message.textContent = text;
    message.classList.remove("show");
    void message.offsetWidth;
    message.classList.add("show");
  }

  function renderProgress() {
    progress.replaceChildren();
    for (let value = 2; value <= max; value += 1) {
      const dot = document.createElement("span");
      dot.className = `dot${value <= current ? " done" : ""}`;
      progress.append(dot);
    }
  }

  function renderRound() {
    const answer = current + 1;
    target.textContent = String(answer);
    platforms.replaceChildren();
    choicesFor(answer).forEach((value, index) => {
      const button = document.createElement("button");
      button.className = "platform";
      button.type = "button";
      button.textContent = String(value);
      button.dataset.value = String(value);
      button.setAttribute("aria-label", `${value}へ ジャンプ`);
      button.addEventListener("click", () => choose(button, value, index));
      platforms.append(button);
    });
    renderProgress();
  }

  function choose(button, value, index) {
    if (locked) return;
    const answer = current + 1;
    if (value !== answer) {
      button.classList.remove("wrong");
      void button.offsetWidth;
      button.classList.add("wrong");
      showMessage("もういちど みてみよう");
      return;
    }
    locked = true;
    clearTimeout(hintTimer);
    document.querySelectorAll(".platform").forEach((item) => { item.disabled = true; });
    friend.classList.add("jumping");
    friend.style.left = `${18 + index * 32}%`;
    showMessage("やった！");
    window.setTimeout(() => {
      friend.classList.remove("jumping");
      current = answer;
      renderProgress();
      if (current >= max) {
        window.setTimeout(() => { finish.hidden = false; }, 260);
        return;
      }
      locked = false;
      renderRound();
    }, 620);
  }

  function begin(level) {
    max = level;
    current = 1;
    locked = false;
    friend.style.left = "9%";
    start.hidden = true;
    finish.hidden = true;
    renderRound();
  }

  document.querySelectorAll("[data-level]").forEach((button) => {
    button.addEventListener("click", () => begin(Number(button.dataset.level)));
  });
  hint.addEventListener("click", () => {
    const answer = String(current + 1);
    const correct = [...document.querySelectorAll(".platform")].find((button) => button.dataset.value === answer);
    if (!correct) return;
    correct.classList.add("hint");
    clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => correct.classList.remove("hint"), 1600);
  });
  again.addEventListener("click", () => begin(max));
})();
