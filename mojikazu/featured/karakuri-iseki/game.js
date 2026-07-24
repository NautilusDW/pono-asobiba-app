(() => {
  "use strict";
  const stage = document.querySelector("#stage");
  const mission = document.querySelector("#mission");
  const dots = document.querySelector("#roomDots");
  const feedback = document.querySelector("#feedback");
  const rooms = [document.querySelector("#roomWeight"), document.querySelector("#roomWater"), document.querySelector("#roomGear")];
  let room = 0;
  let weight = 0;
  let leftWater = 0;
  let rightWater = 0;
  let nextGear = 2;
  let timer = 0;

  function fit() {
    const scale = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.setProperty("--fit", String(scale));
  }

  function say(text) {
    clearTimeout(timer);
    feedback.textContent = text;
    feedback.classList.add("show");
    timer = setTimeout(() => feedback.classList.remove("show"), 1300);
  }

  function showRoom(index) {
    room = index;
    rooms.forEach((item, i) => {
      item.hidden = i !== index;
      item.classList.toggle("active", i === index);
    });
    dots.textContent = [0, 1, 2].map((i) => i <= index ? "●" : "○").join(" ");
    mission.textContent = index === 0 ? "おもさを 5に しよう" : index === 1 ? "みずを おなじに わけよう" : "2、4、6、8の じゅんに おそう";
  }

  function finishWeight() {
    rooms[0].classList.add("solved");
    document.querySelector("#weightDoor").classList.add("open");
    say("おもさ 5！ とびらが あいた！");
    setTimeout(() => showRoom(1), 1300);
  }

  document.querySelectorAll("[data-weight]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("used")) return;
      const value = Number(button.dataset.weight);
      if (weight + value > 5) {
        say("おもすぎるよ。べつの おもりを ためそう");
        button.animate([{ transform: "rotate(-5deg)" }, { transform: "rotate(5deg)" }, {}], { duration: 320 });
        return;
      }
      weight += value;
      button.classList.add("used");
      document.querySelector("#weightTotal").textContent = String(weight);
      say(`${value}を のせたよ。いまは ${weight}`);
      if (weight === 5) finishWeight();
    });
  });

  document.querySelector("#weightReset").addEventListener("click", () => {
    weight = 0;
    document.querySelector("#weightTotal").textContent = "0";
    document.querySelectorAll("[data-weight]").forEach((button) => button.classList.remove("used"));
    say("おもりを もどしたよ");
  });

  function paintWater() {
    document.querySelector("#leftBucket span").textContent = String(leftWater);
    document.querySelector("#rightBucket span").textContent = String(rightWater);
    document.querySelector("#dropsLeft").textContent = "💧".repeat(6 - leftWater - rightWater);
  }

  function addWater(side) {
    if (leftWater + rightWater >= 6) return;
    if (side === "left") leftWater += 1;
    else rightWater += 1;
    paintWater();
    if (leftWater + rightWater === 6) {
      if (leftWater === rightWater) {
        document.querySelector("#waterBridge").classList.add("open");
        say("3と 3！ はしが のびた！");
        setTimeout(() => showRoom(2), 1400);
      } else {
        say("かたむいたよ。おなじに してみよう");
      }
    } else {
      say(`ひだり ${leftWater}、みぎ ${rightWater}`);
    }
  }

  document.querySelector("#leftBucket").addEventListener("click", () => addWater("left"));
  document.querySelector("#rightBucket").addEventListener("click", () => addWater("right"));
  document.querySelector("#waterReset").addEventListener("click", () => {
    leftWater = 0;
    rightWater = 0;
    paintWater();
    say("みずを もどしたよ");
  });

  document.querySelectorAll("[data-number]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.number);
      if (value !== nextGear) {
        say(`つぎは ${nextGear}だよ`);
        button.animate([{ transform: "scale(.9)" }, {}], { duration: 250 });
        return;
      }
      button.disabled = true;
      button.style.opacity = ".35";
      document.querySelector("#gearChain").classList.add("turning");
      const elevator = document.querySelector("#elevator");
      elevator.style.bottom = `${20 + (value / 2) * 90}px`;
      say(`${value}！ エレベーターが あがった！`);
      nextGear += 2;
      if (nextGear > 8) {
        setTimeout(() => { document.querySelector("#finish").hidden = false; }, 900);
      }
    });
  });

  document.querySelector("#hint").addEventListener("click", () => {
    if (room === 0) say(weight === 0 ? "2と 3で 5になるよ" : `あと ${5 - weight}だよ`);
    else if (room === 1) say("6この みずを 3こと 3こに わけよう");
    else say(`つぎは ${nextGear}だよ`);
  });

  document.querySelector("#again").addEventListener("click", () => location.reload());
  addEventListener("resize", fit);
  fit();
  showRoom(0);
})();
