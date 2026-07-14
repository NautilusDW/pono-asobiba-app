"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { webkit } = require("playwright");

const root = "/Users/ndw_mac/AppDevelopment/pono-asobiba-app";
console.log("root=", root, fs.existsSync(path.join(root, "play.html")));

const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
};
async function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const rel = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
    const full = path.resolve(root, "." + decodeURIComponent(rel));
    fs.readFile(full, (err, body) => {
      if (err) { res.writeHead(404).end("nf"); return; }
      res.writeHead(200, { "content-type": mime[path.extname(full).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  return { base: `http://127.0.0.1:${addr.port}`, close: () => new Promise(r => server.close(r)) };
}

async function main() {
  const server = await startServer();
  const browser = await webkit.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log("pageerror:", e.message));
  page.on("console", m => { if (m.type() === "error") console.log("console.error:", m.text()); });
  await page.goto(server.base + "/play.html", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem('pono_cards_intro_hint_shown_v1', '1'));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#cardList .game-card", { timeout: 10000 });
  const info = await page.evaluate(() => {
    const list = document.getElementById('cardList');
    const cards = document.querySelectorAll('.game-card');
    const splash = document.getElementById('pono-game-splash');
    return {
      cardCount: cards.length,
      listScrollTop: list.scrollTop,
      splashHidden: splash ? splash.hidden : null,
      firstCardH: cards[0] ? cards[0].offsetHeight : null,
    };
  });
  console.log("info=", JSON.stringify(info));
  await browser.close();
  await server.close();
}
main().catch(e => { console.error("FAIL", e); process.exit(1); });
