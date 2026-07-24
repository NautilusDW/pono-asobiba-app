(() => {
  "use strict";

  const STAGE_W = 1280;
  const STAGE_H = 720;
  const DRAW_W = 900;
  const DRAW_H = 500;

  const pictures = {
    butterfly: {
      name: "ちょうちょ",
      color: "#ff78b6",
      points: [[450,90],[335,170],[210,120],[180,270],[330,315],[260,410],[450,340],[640,410],[570,315]],
      art: `
        <g class="art-body">
          <path d="M450 90 C385 105 345 140 330 180 C260 95 145 105 180 270 C195 338 275 335 330 315 C285 360 265 405 260 410 C340 425 410 385 450 340 C490 385 560 425 640 410 C635 405 615 360 570 315 C625 335 705 338 720 270 C755 105 640 95 570 180 C555 140 515 105 450 90Z" fill="#ff86bd" stroke="#7f477b" stroke-width="12"/>
          <path d="M450 115 C415 190 415 290 450 350 C485 290 485 190 450 115Z" fill="#6f4d87"/>
          <circle cx="430" cy="218" r="28" fill="#ffe36e"/><circle cx="287" cy="245" r="34" fill="#8be2ff"/>
          <circle cx="470" cy="218" r="28" fill="#ffe36e"/><circle cx="613" cy="245" r="34" fill="#8be2ff"/>
          <path d="M435 118 Q395 60 365 62 M465 118 Q505 60 535 62" fill="none" stroke="#6f4d87" stroke-width="10" stroke-linecap="round"/>
        </g>`
    },
    rocket: {
      name: "ロケット",
      color: "#5b8cff",
      points: [[450,48],[370,105],[325,205],[325,330],[255,410],[350,390],[405,440],[450,475],[495,440],[550,390],[645,410],[575,330],[575,205]],
      art: `
        <g class="art-body">
          <path d="M450 48 C370 95 325 190 325 330 L255 410 L350 390 L405 440 L450 475 L495 440 L550 390 L645 410 L575 330 L575 205 C545 120 510 78 450 48Z" fill="#f4f6ff" stroke="#375287" stroke-width="12"/>
          <path d="M450 48 C405 79 379 113 365 148 L535 148 C521 113 495 79 450 48Z" fill="#ff626d"/>
          <circle cx="450" cy="240" r="58" fill="#8de4ff" stroke="#375287" stroke-width="12"/>
          <path d="M405 440 Q450 490 495 440 Q480 390 450 367 Q420 390 405 440Z" fill="#ffb52e"/>
          <path d="M425 438 Q450 475 475 438 Q465 412 450 399 Q435 412 425 438Z" fill="#ff5d51"/>
        </g>`
    },
    dino: {
      name: "きょうりゅう",
      color: "#58bd75",
      points: [[170,325],[210,205],[315,150],[445,165],[565,115],[700,130],[790,200],[755,270],[650,280],[690,350],[760,405],[655,420],[560,355],[470,370],[430,445],[345,445],[330,360],[235,390]],
      art: `
        <g class="art-body">
          <path d="M170 325 Q170 230 210 205 Q250 160 315 150 Q380 145 445 165 Q510 145 565 115 Q650 90 700 130 Q780 145 790 200 Q800 250 755 270 Q710 292 650 280 Q655 325 690 350 L760 405 Q715 438 655 420 L560 355 Q520 375 470 370 L430 445 L345 445 L330 360 Q270 375 235 390 Q190 382 170 325Z" fill="#66cf80" stroke="#32694a" stroke-width="12" stroke-linejoin="round"/>
          <path d="M240 191 L265 120 L315 153 L355 91 L405 158 L455 100 L490 150" fill="#ffd861" stroke="#32694a" stroke-width="10" stroke-linejoin="round"/>
          <circle cx="706" cy="180" r="15" fill="#27374d"/><circle cx="712" cy="174" r="5" fill="#fff"/>
          <path d="M746 225 Q720 244 690 228" fill="none" stroke="#32694a" stroke-width="9" stroke-linecap="round"/>
          <circle cx="520" cy="245" r="20" fill="#95e5a7"/><circle cx="410" cy="260" r="15" fill="#95e5a7"/>
        </g>`
    }
  };

  const stage = document.getElementById("stage");
  const chooser = document.getElementById("chooser");
  const playArea = document.getElementById("playArea");
  const dots = document.getElementById("dots");
  const canvas = document.getElementById("lineCanvas");
  const ctx = canvas.getContext("2d");
  const art = document.getElementById("revealArt");
  const mission = document.getElementById("mission");
  const message = document.getElementById("message");
  const progressBar = document.getElementById("progressBar");
  const celebration = document.getElementById("celebration");
  const hintBtn = document.getElementById("hintBtn");
  let current = null;
  let next = 0;

  function fitStage() {
    const scale = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function selectPicture(key) {
    current = pictures[key];
    next = 0;
    chooser.hidden = true;
    playArea.hidden = false;
    celebration.hidden = true;
    dots.style.opacity = "1";
    art.classList.remove("finished");
    art.innerHTML = current.art;
    mission.textContent = `1から ${current.points.length}まで つなごう`;
    message.textContent = "1から じゅんばんに おしてね";
    progressBar.style.width = "0%";
    ctx.clearRect(0, 0, DRAW_W, DRAW_H);
    dots.replaceChildren();

    current.points.forEach(([x, y], index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `dot${index === 0 ? " next" : ""}`;
      button.textContent = String(index + 1);
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      button.setAttribute("aria-label", `${index + 1}`);
      button.addEventListener("click", () => pressPoint(index, button));
      dots.append(button);
    });
    requestAnimationFrame(() => dots.querySelector(".next")?.focus({ preventScroll: true }));
  }

  function pressPoint(index, button) {
    if (!current || index !== next) {
      button.classList.remove("wrong");
      void button.offsetWidth;
      button.classList.add("wrong");
      message.textContent = `${next + 1}は どこかな？`;
      return;
    }

    button.classList.remove("next");
    button.classList.add("done");
    if (next > 0) drawSegment(current.points[next - 1], current.points[next]);
    next += 1;
    progressBar.style.width = `${next / current.points.length * 100}%`;

    if (next === current.points.length) {
      drawSegment(current.points[current.points.length - 1], current.points[0]);
      finishPicture();
      return;
    }
    const upcoming = dots.children[next];
    upcoming.classList.add("next");
    message.textContent = next > current.points.length * .58 ? `もうすこし！ ${next + 1}は どこかな？` : `${next + 1}を みつけよう`;
    upcoming.focus({ preventScroll: true });
  }

  function drawSegment(from, to) {
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = current.color;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function finishPicture() {
    art.classList.add("finished");
    dots.style.opacity = ".05";
    mission.textContent = `${current.name}が できた！`;
    message.textContent = "すうじが えに なったよ！";
    celebration.hidden = false;
    createSparkles();
    document.getElementById("againBtn").focus({ preventScroll: true });
  }

  function createSparkles() {
    const box = document.getElementById("sparkles");
    box.replaceChildren();
    const colors = ["#ff557f", "#ffdc3d", "#4ad48b", "#58baff", "#b578f7"];
    for (let i = 0; i < 26; i += 1) {
      const spark = document.createElement("i");
      spark.className = "spark";
      spark.style.left = `${520 + Math.random() * 240}px`;
      spark.style.top = `${290 + Math.random() * 120}px`;
      spark.style.setProperty("--c", colors[i % colors.length]);
      spark.style.setProperty("--dx", `${(Math.random() - .5) * 720}px`);
      spark.style.setProperty("--dy", `${(Math.random() - .7) * 520}px`);
      box.append(spark);
    }
  }

  function showChooser() {
    current = null;
    chooser.hidden = false;
    playArea.hidden = true;
    celebration.hidden = true;
    dots.style.opacity = "1";
    mission.textContent = "えを えらんでね";
    message.textContent = "どの えを かこうかな？";
    chooser.querySelector("button")?.focus({ preventScroll: true });
  }

  hintBtn.addEventListener("click", () => {
    if (!current || next >= current.points.length) return;
    const target = dots.children[next];
    target.classList.remove("next");
    void target.offsetWidth;
    target.classList.add("next");
    message.textContent = `つぎは ${next + 1}だよ`;
    target.focus({ preventScroll: true });
  });
  document.querySelectorAll(".picture-card").forEach(card => card.addEventListener("click", () => selectPicture(card.dataset.picture)));
  document.getElementById("againBtn").addEventListener("click", () => selectPicture(Object.keys(pictures).find(key => pictures[key] === current)));
  document.getElementById("chooseBtn").addEventListener("click", showChooser);
  addEventListener("resize", fitStage);
  addEventListener("orientationchange", fitStage);
  fitStage();
})();
