(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const toast = document.getElementById("toast");
  const marks = [...document.querySelectorAll(".room-mark")];
  const rooms = [...document.querySelectorAll(".room")];
  let room = 1;
  let toastTimer = 0;

  function fitStage() {
    const scale = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.transform = `scale(${scale})`;
  }
  addEventListener("resize", fitStage);
  fitStage();

  function say(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1500);
  }

  function goTo(nextRoom) {
    room = nextRoom;
    rooms.forEach((el) => el.classList.toggle("active", Number(el.dataset.room) === room));
    marks.forEach((mark, index) => {
      mark.classList.toggle("current", index === room - 1);
      mark.classList.toggle("done", index < room - 1);
    });
  }

  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => goTo(Number(button.dataset.next)));
  });

  // へや1: 数字石を直接押すほど、谷に橋が組み上がる。
  const stonePositions = [
    [13, 64], [48, 7], [77, 59], [3, 16], [59, 40], [84, 12], [35, 71]
  ];
  const shuffledNumbers = [4, 2, 7, 1, 5, 6, 3];
  const stoneField = document.getElementById("stoneField");
  const bridge = document.getElementById("bridge");
  let expectedStone = 1;
  shuffledNumbers.forEach((number, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-stone";
    button.textContent = number;
    button.dataset.number = number;
    button.setAttribute("aria-label", `${number}のいし`);
    button.style.left = `${stonePositions[index][0]}%`;
    button.style.top = `${stonePositions[index][1]}%`;
    button.addEventListener("click", () => pressStone(button, number));
    stoneField.append(button);
  });
  for (let i = 0; i < 7; i += 1) {
    const step = document.createElement("span");
    step.className = "bridge-step";
    bridge.append(step);
  }

  function pressStone(button, number) {
    if (button.classList.contains("used")) return;
    if (number !== expectedStone) {
      say(`${expectedStone}は どこかな？`);
      button.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }],
        { duration: 280 }
      );
      return;
    }
    button.classList.add("used");
    bridge.children[number - 1].classList.add("show");
    expectedStone += 1;
    if (expectedStone === 8) {
      document.querySelector(".far-door span").style.cssText = "filter:none;opacity:1";
      document.querySelector('[data-next="2"]').classList.add("show");
      say("はしが できた！");
    }
  }

  // へや2: 目の前の火を数え、床そのものを踏む。
  const torches = document.getElementById("torches");
  for (let i = 0; i < 5; i += 1) {
    const flame = document.createElement("span");
    flame.className = "torch";
    flame.textContent = "🔥";
    flame.setAttribute("aria-label", "ひかっている たいまつ");
    torches.append(flame);
  }
  const floorPlates = document.getElementById("floorPlates");
  [3, 5, 7].forEach((number) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "floor-plate";
    button.textContent = number;
    button.setAttribute("aria-label", `${number}のゆか`);
    button.addEventListener("click", () => {
      if (number === 5) {
        button.classList.add("correct");
        [...floorPlates.children].forEach((plate) => { plate.disabled = true; });
        document.getElementById("stoneDoor").classList.add("open");
        document.querySelector('[data-next="3"]').classList.add("show");
        say("せいかい！ とびらが ひらいた");
      } else {
        button.classList.remove("wrong");
        void button.offsetWidth;
        button.classList.add("wrong");
        say("たいまつを もういちど かぞえよう");
      }
    });
    floorPlates.append(button);
  });

  // へや3: 文字を置くと、その意味どおりの鍵に変わる。
  const slots = document.getElementById("wordSlots");
  const letters = document.getElementById("letterBlocks");
  const target = ["か", "ぎ"];
  let builtWord = [];
  target.forEach(() => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "word-slot";
    slot.setAttribute("aria-label", "もじを おく ばしょ");
    slot.addEventListener("click", resetWord);
    slots.append(slot);
  });
  ["き", "か", "し", "ぎ"].forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-block";
    button.textContent = letter;
    button.dataset.letter = letter;
    button.addEventListener("click", () => chooseLetter(button));
    letters.append(button);
  });

  function chooseLetter(button) {
    if (builtWord.length >= target.length) return;
    const letter = button.dataset.letter;
    if (letter !== target[builtWord.length]) {
      say(`つぎは「${target[builtWord.length]}」だよ`);
      button.animate([{ transform: "rotate(0)" }, { transform: "rotate(-7deg)" }, { transform: "rotate(7deg)" }, { transform: "rotate(0)" }], { duration: 320 });
      return;
    }
    const index = builtWord.length;
    builtWord.push(letter);
    button.classList.add("used");
    slots.children[index].textContent = letter;
    slots.children[index].classList.add("filled");
    if (builtWord.length === target.length) createKey();
  }

  function resetWord() {
    if (builtWord.length === target.length) return;
    builtWord = [];
    [...slots.children].forEach((slot) => {
      slot.textContent = "";
      slot.classList.remove("filled");
    });
    [...letters.children].forEach((button) => button.classList.remove("used"));
  }

  function createKey() {
    const key = document.getElementById("magicKey");
    key.classList.add("fly");
    say("「かぎ」が ほんものに なった！");
    setTimeout(() => {
      document.getElementById("treasure").classList.add("open");
      document.querySelector(".celebration").classList.add("show");
      document.getElementById("finishButton").classList.add("show");
      marks[2].classList.add("done");
    }, 900);
  }

  document.getElementById("finishButton").addEventListener("click", () => location.reload());

  document.getElementById("hintButton").addEventListener("click", () => {
    document.querySelectorAll(".hint-pulse").forEach((el) => el.classList.remove("hint-pulse"));
    if (room === 1 && expectedStone <= 7) {
      document.querySelector(`.number-stone[data-number="${expectedStone}"]`).classList.add("hint-pulse");
      say(`${expectedStone}の いしが ひかっているよ`);
    } else if (room === 2 && !document.getElementById("stoneDoor").classList.contains("open")) {
      floorPlates.children[1].classList.add("hint-pulse");
      say("ひとつずつ ゆびで かぞえてみよう");
    } else if (room === 3 && builtWord.length < target.length) {
      const nextLetter = target[builtWord.length];
      document.querySelector(`.letter-block[data-letter="${nextLetter}"]`).classList.add("hint-pulse");
      say(`つぎは「${nextLetter}」だよ`);
    } else {
      say("みどりの ボタンで すすもう");
    }
  });

  // 矢印キーで部屋内のボタンを巡回し、Enter/Spaceで操作できる。
  document.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const focusable = [...document.querySelectorAll(".room.active button:not(:disabled), .hud button, .hud a")]
      .filter((element) => getComputedStyle(element).visibility !== "hidden");
    if (!focusable.length) return;
    event.preventDefault();
    const current = focusable.indexOf(document.activeElement);
    const direction = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
    focusable[(current + direction + focusable.length) % focusable.length].focus();
  });
})();
