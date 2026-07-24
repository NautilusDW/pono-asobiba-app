(() => {
  "use strict";
  const stage = document.querySelector("#stage");
  function fit() {
    stage.style.setProperty("--fit", String(Math.min(innerWidth / 1280, innerHeight / 720)));
  }
  addEventListener("resize", fit);
  fit();
})();
