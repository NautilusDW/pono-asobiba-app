'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const mazeHtmlPath = path.join(repoRoot, 'maze', 'index.html');
const source = fs.readFileSync(mazeHtmlPath, 'utf8');

function extractFunction(name) {
  const marker = 'function ' + name;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, 'missing function: ' + name);
  const braceStart = source.indexOf('{', start);
  assert.notEqual(braceStart, -1, 'missing function body: ' + name);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('unterminated function: ' + name);
}

[
  '_jankenLossStreak',
  '_jankenGuaranteedWinKeys',
  '_isStage2FirstJankenCreature',
  'playerWinChance',
  'winChance',
].forEach((token) => {
  assert.equal(source.includes(token), false, 'janken must not use cumulative chance token: ' + token);
});

const code = [
  '_jankenSafeHand',
  '_jankenEncounterKey',
  '_jankenCpuHandForPlayerWin',
  '_jankenCpuHandForPlayerLoss',
  '_chooseJankenCpuHand',
].map(extractFunction).join('\n');

const math = Object.create(Math);
math.random = () => 0;

const context = {
  Math: math,
  stageIdx: 5,
  _currentCreature: { id: 'c1', kind: 'mayoi' },
  _jankenNextPlayerWinKeys: Object.create(null),
};
vm.createContext(context);
vm.runInContext(code, context);
const api = vm.runInContext('({ safe: _jankenSafeHand, key: _jankenEncounterKey, playerWin: _jankenCpuHandForPlayerWin, playerLoss: _jankenCpuHandForPlayerLoss, choose: _chooseJankenCpuHand })', context);

const playerBeats = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
const hands = ['rock', 'scissors', 'paper'];

function outcome(playerHand, cpuHand) {
  const player = api.safe(playerHand);
  const cpu = api.safe(cpuHand);
  if (player === cpu) return 'draw';
  return playerBeats[player] === cpu ? 'win' : 'lose';
}

hands.forEach((hand) => {
  assert.equal(outcome(hand, api.playerWin(hand)), 'win', 'playerWin helper must make Pono win for ' + hand);
  assert.equal(outcome(hand, api.playerLoss(hand)), 'lose', 'playerLoss helper must make Pono lose for ' + hand);
});

const encounterKey = api.key(context._currentCreature);
hands.forEach((hand) => {
  context._jankenNextPlayerWinKeys = Object.create(null);
  context._jankenNextPlayerWinKeys[encounterKey] = true;
  assert.equal(outcome(hand, api.choose(hand)), 'win', 'next-player-win rescue must make Pono win for ' + hand);
});

[
  { roll: 0.0, expected: 'win' },
  { roll: 0.34, expected: 'draw' },
  { roll: 0.67, expected: 'lose' },
].forEach(({ roll, expected }) => {
  hands.forEach((hand) => {
    context._jankenNextPlayerWinKeys = Object.create(null);
    context.Math.random = () => roll;
    assert.equal(outcome(hand, api.choose(hand)), expected, 'roll ' + roll + ' should produce ' + expected + ' for ' + hand);
  });
});

console.log('maze janken logic ok');
