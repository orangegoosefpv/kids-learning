/* Chess fundamentals — learn piece moves + identify / how-it-moves quizzes */
(function (global) {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const FILES = 'abcdefgh';

  const PIECES = {
    king: {
      id: 'king', name: 'King', glyph: '♔',
      tip: 'The king moves one square any way — up, down, side, or diagonal.',
      how: 'Move 1 square in any direction.',
      prek: true
    },
    queen: {
      id: 'queen', name: 'Queen', glyph: '♕',
      tip: 'The queen is super strong! She moves any number of squares in a straight line or diagonal.',
      how: 'Any direction, any number of empty squares.',
      prek: false
    },
    rook: {
      id: 'rook', name: 'Rook', glyph: '♖',
      tip: 'The rook slides like a castle tower — only straight lines: rows and columns.',
      how: 'Straight lines only (like a +).',
      prek: true
    },
    bishop: {
      id: 'bishop', name: 'Bishop', glyph: '♗',
      tip: 'The bishop slides on diagonals only — always staying on the same color squares.',
      how: 'Diagonals only (like an X).',
      prek: false
    },
    knight: {
      id: 'knight', name: 'Knight', glyph: '♘',
      tip: 'The knight jumps in an L shape: two squares one way, then one turn. It can jump over pieces!',
      how: 'L-shape jump (2 then 1). Can jump over.',
      prek: false
    },
    pawn: {
      id: 'pawn', name: 'Pawn', glyph: '♙',
      tip: 'Pawns walk forward one square. From the start row they may walk two. They capture one step diagonal.',
      how: 'Forward 1 (or 2 from start). Capture diagonal.',
      prek: true
    }
  };

  const ALL_IDS = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
  const PREK_IDS = ['pawn', 'rook', 'king'];

  function sq(f, r) { return { f: f, r: r, key: FILES[f] + (r + 1) }; }
  function inBounds(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }

  function rayMoves(f, r, dirs) {
    const out = [];
    dirs.forEach(([df, dr]) => {
      let cf = f + df, cr = r + dr;
      while (inBounds(cf, cr)) {
        out.push(sq(cf, cr));
        cf += df; cr += dr;
      }
    });
    return out;
  }

  function legalMoves(pieceId, f, r, opts) {
    opts = opts || {};
    const color = opts.color || 'w'; // white moves "up" (increasing rank)
    const fromStart = opts.fromStart;
    switch (pieceId) {
      case 'king': {
        const out = [];
        for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
          if (!df && !dr) continue;
          if (inBounds(f + df, r + dr)) out.push(sq(f + df, r + dr));
        }
        return out;
      }
      case 'queen':
        return rayMoves(f, r, [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
      case 'rook':
        return rayMoves(f, r, [[1,0],[-1,0],[0,1],[0,-1]]);
      case 'bishop':
        return rayMoves(f, r, [[1,1],[1,-1],[-1,1],[-1,-1]]);
      case 'knight': {
        const jumps = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
        return jumps.filter(([df, dr]) => inBounds(f + df, r + dr))
          .map(([df, dr]) => sq(f + df, r + dr));
      }
      case 'pawn': {
        const dir = color === 'w' ? 1 : -1;
        const out = [];
        if (inBounds(f, r + dir)) out.push(sq(f, r + dir));
        const startRank = color === 'w' ? 1 : 6;
        if ((fromStart || r === startRank) && inBounds(f, r + 2 * dir)) {
          out.push(sq(f, r + 2 * dir));
        }
        // capture squares shown for teaching
        if (inBounds(f - 1, r + dir)) out.push(sq(f - 1, r + dir));
        if (inBounds(f + 1, r + dir)) out.push(sq(f + 1, r + dir));
        return out;
      }
      default: return [];
    }
  }

  function piecesForGrade(grade) {
    if (grade === 'prek') return PREK_IDS.map(id => PIECES[id]);
    return ALL_IDS.map(id => PIECES[id]);
  }

  /* ---- Learn mode state ---- */
  let mode = 'menu'; // menu | learn | identify | moves
  let grade = 'grade2';
  let learnIdx = 0;
  let learnPiece = null;
  let learnPos = { f: 4, r: 3 }; // e4-ish
  let highlighted = [];
  let selectedKey = null;

  /* ---- Quiz state ---- */
  let quizDeck = [];
  let quizIdx = 0;
  let quizItem = null;
  let quizLocked = false;
  let quizScore = 0;
  let quizTotal = 6;
  let quizRound = 0;
  let quizChoices = null;
  let quizSelected = {}; // key -> bool for tap-squares mode

  function setGrade(g) {
    grade = g === 'prek' || g === 'grade3' || g === 'grade2' ? g : 'grade2';
  }

  function startMenu(g) {
    setGrade(g);
    mode = 'menu';
    return getState();
  }

  function startLearn(g) {
    setGrade(g);
    mode = 'learn';
    learnIdx = 0;
    const list = piecesForGrade(grade);
    learnPiece = list[0];
    // Place piece near center; pawn on start rank for teaching 2-step
    if (learnPiece.id === 'pawn') learnPos = { f: 4, r: 1 };
    else if (learnPiece.id === 'knight') learnPos = { f: 3, r: 3 };
    else learnPos = { f: 3, r: 3 };
    refreshHighlights();
    return getState();
  }

  function refreshHighlights() {
    if (!learnPiece) { highlighted = []; return; }
    const fromStart = learnPiece.id === 'pawn' && learnPos.r === 1;
    highlighted = legalMoves(learnPiece.id, learnPos.f, learnPos.r, { fromStart: fromStart });
    selectedKey = FILES[learnPos.f] + (learnPos.r + 1);
  }

  function learnSelectPiece(id) {
    const list = piecesForGrade(grade);
    const p = list.find(x => x.id === id);
    if (!p) return getState();
    learnPiece = p;
    learnIdx = list.findIndex(x => x.id === id);
    if (p.id === 'pawn') learnPos = { f: 4, r: 1 };
    else learnPos = { f: 3, r: 3 };
    refreshHighlights();
    return getState();
  }

  function learnNext() {
    const list = piecesForGrade(grade);
    learnIdx = (learnIdx + 1) % list.length;
    return learnSelectPiece(list[learnIdx].id);
  }

  function learnPrev() {
    const list = piecesForGrade(grade);
    learnIdx = (learnIdx - 1 + list.length) % list.length;
    return learnSelectPiece(list[learnIdx].id);
  }

  /** Tap a square in learn mode: if piece square, keep; if empty, move piece there to explore */
  function learnTapSquare(f, r) {
    if (mode !== 'learn' || !learnPiece) return getState();
    if (!inBounds(f, r)) return getState();
    learnPos = { f: f, r: r };
    refreshHighlights();
    return getState();
  }

  /* ---- Identify quiz ---- */
  function buildIdentifyDeck() {
    const ids = grade === 'prek' ? PREK_IDS.slice() : ALL_IDS.slice();
    return shuffle(ids).map(id => {
      const p = PIECES[id];
      const wrong = shuffle(ALL_IDS.filter(x => x !== id)).slice(0, 3)
        .map(x => PIECES[x].name);
      const choices = shuffle([p.name].concat(wrong));
      return {
        kind: 'identify',
        prompt: 'Which piece is this?',
        glyph: p.glyph,
        pieceId: id,
        answer: p.name,
        choices: choices
      };
    });
  }

  /* ---- How-it-moves quiz: tap all legal squares OR multi-choice ---- */
  function buildMovesDeck() {
    const ids = grade === 'prek' ? PREK_IDS.slice() : ALL_IDS.slice();
    const placements = {
      king: { f: 4, r: 3 },
      queen: { f: 3, r: 3 },
      rook: { f: 2, r: 2 },
      bishop: { f: 2, r: 2 },
      knight: { f: 3, r: 3 },
      pawn: { f: 4, r: 1 }
    };
    return shuffle(ids).map(id => {
      const p = PIECES[id];
      const pos = placements[id] || { f: 3, r: 3 };
      const fromStart = id === 'pawn';
      const legal = legalMoves(id, pos.f, pos.r, { fromStart: fromStart });
      // Multiple choice: pick the correct description
      const descs = {
        king: 'One square any way',
        queen: 'Any way, any number',
        rook: 'Straight lines only',
        bishop: 'Diagonals only',
        knight: 'L-shape jump',
        pawn: 'Forward (capture diagonal)'
      };
      const wrongDescs = shuffle(Object.keys(descs).filter(k => k !== id).map(k => descs[k])).slice(0, 3);
      const choices = shuffle([descs[id]].concat(wrongDescs));
      return {
        kind: 'moves-mc',
        prompt: 'How does the ' + p.name + ' move?',
        glyph: p.glyph,
        pieceId: id,
        pos: pos,
        legalKeys: legal.map(s => s.key),
        answer: descs[id],
        choices: choices
      };
    }).concat(shuffle(ids).slice(0, grade === 'prek' ? 2 : 3).map(id => {
      const p = PIECES[id];
      const pos = placements[id] || { f: 3, r: 3 };
      const fromStart = id === 'pawn';
      const legal = legalMoves(id, pos.f, pos.r, { fromStart: fromStart });
      // Ask: tap ONE square this piece can go to (pick a representative legal square)
      const target = legal[Math.floor(Math.random() * legal.length)];
      const distractors = [];
      // gather some illegal squares as MC options shown as keys
      for (let tries = 0; tries < 40 && distractors.length < 3; tries++) {
        const tf = Math.floor(Math.random() * 8);
        const tr = Math.floor(Math.random() * 8);
        const k = FILES[tf] + (tr + 1);
        if (k === FILES[pos.f] + (pos.r + 1)) continue;
        if (legal.some(s => s.key === k)) continue;
        if (!distractors.includes(k)) distractors.push(k);
      }
      const choices = shuffle([target.key].concat(distractors));
      return {
        kind: 'moves-square',
        prompt: 'The ' + p.name + ' is on the board. Which square can it go to?',
        glyph: p.glyph,
        pieceId: id,
        pos: pos,
        legalKeys: legal.map(s => s.key),
        answer: target.key,
        choices: choices,
        highlightLegal: false
      };
    }));
  }

  function startIdentify(g) {
    setGrade(g);
    mode = 'identify';
    quizDeck = buildIdentifyDeck();
    quizIdx = 0;
    quizLocked = false;
    quizScore = 0;
    quizRound = 0;
    quizTotal = Math.min(6, quizDeck.length);
    quizChoices = null;
    quizSelected = {};
    quizItem = quizDeck[0];
    return getState();
  }

  function startMovesQuiz(g) {
    setGrade(g);
    mode = 'moves';
    quizDeck = buildMovesDeck();
    quizIdx = 0;
    quizLocked = false;
    quizScore = 0;
    quizRound = 0;
    quizTotal = Math.min(6, quizDeck.length);
    quizChoices = null;
    quizSelected = {};
    quizItem = quizDeck[0];
    return getState();
  }

  function currentQuizChoices() {
    if (!quizItem) return [];
    if (!quizChoices) quizChoices = quizItem.choices.slice();
    return quizChoices;
  }

  function checkQuiz(answer) {
    if (quizLocked || !quizItem) return null;
    if (mode !== 'identify' && mode !== 'moves') return null;
    quizLocked = true;
    const ok = String(answer) === String(quizItem.answer);
    if (ok) {
      quizScore++;
      KidsAudio.correct();
    } else {
      KidsAudio.wrong();
    }
    return {
      ok: ok,
      correct: quizItem.answer,
      score: quizScore,
      round: quizRound,
      total: quizTotal,
      prompt: quizItem.prompt,
      pieceId: quizItem.pieceId
    };
  }

  function nextQuiz() {
    if (mode !== 'identify' && mode !== 'moves') return getState();
    quizLocked = false;
    quizChoices = null;
    quizSelected = {};
    quizRound++;
    quizIdx++;
    if (quizRound >= quizTotal || quizIdx >= quizDeck.length) {
      quizItem = null;
      return getState();
    }
    quizItem = quizDeck[quizIdx];
    return getState();
  }

  function emptyBoard() {
    const cells = [];
    for (let r = 7; r >= 0; r--) {
      for (let f = 0; f < 8; f++) {
        cells.push({
          f: f, r: r,
          key: FILES[f] + (r + 1),
          dark: (f + r) % 2 === 0,
          label: FILES[f] + (r + 1)
        });
      }
    }
    return cells;
  }

  function getState() {
    const list = piecesForGrade(grade);
    const done = (mode === 'identify' || mode === 'moves') && quizRound >= quizTotal;
    return {
      mode: mode,
      grade: grade,
      pieces: list,
      allPieces: ALL_IDS.map(id => PIECES[id]),
      learn: {
        piece: learnPiece,
        idx: learnIdx,
        pos: learnPos,
        selectedKey: selectedKey,
        highlights: highlighted.map(s => s.key),
        tip: learnPiece ? learnPiece.tip : '',
        how: learnPiece ? learnPiece.how : ''
      },
      quiz: {
        item: quizItem,
        choices: currentQuizChoices(),
        locked: quizLocked,
        score: quizScore,
        round: quizRound,
        total: quizTotal,
        done: done,
        selected: quizSelected
      },
      board: emptyBoard(),
      PIECES: PIECES
    };
  }

  global.ChessGame = {
    PIECES, ALL_IDS, PREK_IDS, legalMoves, piecesForGrade,
    startMenu, startLearn, learnSelectPiece, learnNext, learnPrev, learnTapSquare,
    startIdentify, startMovesQuiz, checkQuiz, nextQuiz, getState
  };
})(window);
