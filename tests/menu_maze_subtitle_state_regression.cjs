"use strict";

// batch:1246 regression: めいろの説明は通常の紙面で焦げ茶、
// 写真の peek が実際に出ている状態だけ明るい文字にする。

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "play.html"), "utf8");

const stateComment = "/* めいろも通常時は他カードと同じ焦げ茶。写真が実際に見える";
const start = html.indexOf(stateComment);
const end = html.indexOf("    .game-card__play {", start);
assert.ok(start >= 0 && end > start, "final maze subtitle state block must exist");
const css = html.slice(start, end);

assert.match(css,
  /\.game-card\[data-id="maze"\] \.game-card__desc\s*\{\s*color:\s*#4a2e15;/,
  "normal maze subtitle must match the other dark-brown subtitles");
assert.match(css,
  /\.game-card\[data-id="maze"\]:not\(\.is-coming-soon\)\.is-overlay-active \.game-card__desc,[\s\S]*?body\.peek-always \.game-card\[data-id="maze"\]:not\(\.is-coming-soon\) \.game-card__desc\s*\{\s*color:\s*#fff0c8;/,
  "scroll/tweak peek states must switch the maze subtitle to the readable light color");
assert.match(css,
  /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.game-card\[data-id="maze"\]:not\(\.is-coming-soon\):hover \.game-card__desc,[\s\S]*?\.game-card\[data-id="maze"\]:not\(\.is-coming-soon\):focus-visible \.game-card__desc\s*\{\s*color:\s*#fff0c8;/,
  "hover/focus light text must be gated to the same fine-pointer state that reveals the image");
assert.doesNotMatch(css,
  /(?:^|,)\s*\.game-card\[data-id="maze"\]:focus-visible \.game-card__desc\s*\{/m,
  "touch focus without a visible peek must not turn the subtitle light");
assert.doesNotMatch(css,
  /\.game-card\[data-id="maze"\]\.is-selected \.game-card__desc/,
  "selection alone is a visual no-op and must not imply a visible image");

// Editing the CSS must not damage any classic inline script.
const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let parsed = 0;
while ((match = scriptPattern.exec(htmlWithoutComments))) {
  const attrs = match[1] || "";
  if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']text\/babel["']/.test(attrs)) continue;
  assert.doesNotThrow(() => new vm.Script(match[2], { filename: "play-inline-" + parsed + ".js" }));
  parsed += 1;
}
assert.ok(parsed >= 4, "expected multiple classic inline scripts");

console.log("menu maze subtitle state regression: PASS");
