(() => {
  'use strict';

  const chooser = document.querySelector('#chooser');
  const play = document.querySelector('#play');
  const finish = document.querySelector('#finish');
  const slots = document.querySelector('#slots');
  const pieces = document.querySelector('#pieces');
  const prompt = document.querySelector('#prompt');
  const help = document.querySelector('#helpDialog');
  let mode = 'five';
  let answer = [];
  let selected = null;
  let dragPiece = null;

  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function numbersForMode() {
    return Array.from({ length: mode === 'five' ? 5 : 10 }, (_, i) => i + 1);
  }

  function buildRound() {
    const numbers = numbersForMode();
    const missing = mode === 'missing' ? shuffle(numbers.slice(1, -1)).slice(0, 3) : numbers;
    answer = [];
    selected = null;
    slots.replaceChildren();
    pieces.replaceChildren();

    numbers.forEach((number) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'slot';
      slot.dataset.number = String(number);
      slot.setAttribute('aria-label', `${number}の ばしょ`);
      if (mode === 'missing' && !missing.includes(number)) {
        slot.textContent = number;
        slot.classList.add('prefilled');
        slot.disabled = true;
        answer.push(number);
      } else {
        slot.addEventListener('click', () => selected && tryPlace(selected, slot));
      }
      slots.append(slot);
    });

    shuffle(mode === 'missing' ? missing : numbers).forEach((number) => {
      const piece = document.createElement('button');
      piece.type = 'button';
      piece.className = 'piece';
      piece.textContent = number;
      piece.dataset.number = String(number);
      piece.setAttribute('aria-label', `${number}の しゃりょう`);
      piece.draggable = true;
      piece.addEventListener('click', () => choosePiece(piece));
      piece.addEventListener('dragstart', () => { dragPiece = piece; });
      piece.addEventListener('dragend', () => { dragPiece = null; });
      pieces.append(piece);
    });

    slots.querySelectorAll('.slot:not(.prefilled)').forEach((slot) => {
      slot.addEventListener('dragover', (event) => event.preventDefault());
      slot.addEventListener('drop', (event) => {
        event.preventDefault();
        if (dragPiece) tryPlace(dragPiece, slot);
      });
    });
    updateNext();
  }

  function choosePiece(piece) {
    pieces.querySelectorAll('.piece').forEach((item) => item.classList.remove('selected'));
    selected = piece;
    piece.classList.add('selected');
    const openSlot = slots.querySelector(`.slot[data-number="${piece.dataset.number}"]:not(.filled)`);
    if (openSlot) openSlot.focus();
  }

  function tryPlace(piece, slot) {
    const pieceNumber = Number(piece.dataset.number);
    const slotNumber = Number(slot.dataset.number);
    const nextSlot = slots.querySelector('.slot:not(.prefilled)');
    if (pieceNumber !== slotNumber || slot !== nextSlot || slot.classList.contains('filled')) {
      piece.classList.remove('wrong');
      void piece.offsetWidth;
      piece.classList.add('wrong');
      prompt.textContent = 'だいじょうぶ！ もういちど ためそう';
      return;
    }
    slot.textContent = pieceNumber;
    slot.classList.add('filled', 'prefilled');
    piece.hidden = true;
    selected = null;
    answer.push(pieceNumber);
    prompt.textContent = `${pieceNumber}、つながった！`;
    updateNext();
    if (!pieces.querySelector('.piece:not([hidden])')) {
      window.setTimeout(showFinish, 450);
    }
  }

  function updateNext() {
    slots.querySelectorAll('.slot').forEach((slot) => slot.classList.remove('next'));
    const next = slots.querySelector('.slot:not(.prefilled)');
    if (next) next.classList.add('next');
  }

  function start(nextMode = mode) {
    mode = nextMode;
    chooser.hidden = true;
    finish.hidden = true;
    play.hidden = false;
    prompt.textContent = mode === 'missing' ? '？に はいる すうじを つなごう！' : '1から じゅんばんに つなごう！';
    buildRound();
    pieces.querySelector('.piece')?.focus();
  }

  function showFinish() {
    play.hidden = true;
    finish.hidden = false;
    document.querySelector('#againButton').focus();
  }

  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => start(button.dataset.mode));
  });
  document.querySelector('#againButton').addEventListener('click', () => start());
  document.querySelector('#chooseButton').addEventListener('click', () => {
    finish.hidden = true;
    chooser.hidden = false;
    document.querySelector('[data-mode="five"]').focus();
  });
  document.querySelector('#helpButton').addEventListener('click', () => help.showModal());
  document.querySelector('#closeHelp').addEventListener('click', () => help.close());
  help.addEventListener('click', (event) => {
    if (event.target === help) help.close();
  });
})();
