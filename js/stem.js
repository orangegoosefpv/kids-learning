/* Monkey Code — sequence moves to collect bananas 🍌 then reach the chest 🧰 */
(function (global) {
  /*
    Grid cells: '.' path, '#' wall, 'S' start, 'T' treasure, 'B' banana
    Legacy 'G' maps to 'T'.
    Facing: 0N 1E 2S 3W (default east)
    Commands: F, L, R, LOOP2, LOOP3, IF_CLEAR
  */

  const LEVELS = [
    {
      id: 1,
      title: 'First Banana',
      tip: 'Tap Go forward so the monkey picks up the banana, then walks to the chest!',
      hint: 'Tap Go forward twice, then press PLAY.',
      teachConcept: 'sequencing',
      rows: ['SBT'],
      allowed: ['F'],
      maxCmds: 4,
      optimalCmds: 2
    },
    {
      id: 2,
      title: 'Turn for Fruit',
      tip: 'Turn so the monkey faces the banana path, then go forward to the chest.',
      hint: 'Go forward twice, turn right, then go forward twice.',
      teachConcept: 'turns',
      rows: [
        'S.B',
        '#..',
        '#.T'
      ],
      allowed: ['F', 'L', 'R'],
      maxCmds: 8,
      optimalCmds: 5
    },
    {
      id: 3,
      title: 'Two Bananas',
      tip: 'Grab BOTH bananas before the chest counts!',
      hint: 'Walk the whole line: forward past each banana, then into the chest.',
      teachConcept: 'sequencing',
      rows: ['S.B.BT'],
      allowed: ['F'],
      maxCmds: 8,
      optimalCmds: 5
    },
    {
      id: 4,
      title: 'Around the Rock',
      tip: 'Dark cells are rocks — go around them to the banana and chest.',
      hint: 'Go forward twice, turn right, forward, turn left, forward, turn right, forward.',
      teachConcept: 'turns',
      rows: [
        'S..#',
        '.#B.',
        '..#T'
      ],
      allowed: ['F', 'L', 'R'],
      maxCmds: 12,
      optimalCmds: 8
    },
    {
      id: 5,
      title: 'Loop Stretch',
      tip: 'Long banana path! Try ×2 or ×3 before Go forward to save taps.',
      hint: 'Try Do it 3 times + Go forward, then again, then one more Go forward.',
      teachConcept: 'loops',
      rows: ['S.B.B.BT'],
      allowed: ['F', 'LOOP2', 'LOOP3'],
      maxCmds: 8,
      optimalCmds: 5
    },
    {
      id: 6,
      title: 'Loop + Turn',
      tip: 'Use a loop for the long stretch, then turn toward the chest.',
      hint: 'Do it 2 times + forward twice (or ×3 + forward), turn right, then forward twice.',
      teachConcept: 'loops',
      rows: [
        'S.B..',
        '####.',
        '....T'
      ],
      allowed: ['F', 'L', 'R', 'LOOP2', 'LOOP3'],
      maxCmds: 12,
      optimalCmds: 6
    },
    {
      id: 7,
      title: 'Jungle Zigzag',
      tip: 'Zigzag around rocks — collect every banana, then open the chest!',
      hint: 'Forward twice, turn right, forward twice, turn left, forward.',
      teachConcept: 'turns',
      rows: [
        'SB..',
        '.#B.',
        '...T'
      ],
      allowed: ['F', 'L', 'R'],
      maxCmds: 14,
      optimalCmds: 7
    },
    {
      id: 8,
      title: 'If Clear Intro',
      tip: '❓ Only if open does the next move when the path ahead is free.',
      hint: 'Try forward, then Only if open + forward near the rock, and turn when blocked.',
      teachConcept: 'conditionals',
      rows: [
        'S.#T',
        '.B#.',
        '....'
      ],
      allowed: ['F', 'L', 'R', 'IF_CLEAR'],
      maxCmds: 14,
      optimalCmds: 7
    },
    {
      id: 9,
      title: 'Two Routes',
      tip: 'Two jungle paths lead to bananas and the chest — pick either route!',
      hint: 'Upper path: forward twice, left, forward, right, forward. Grab the banana on the way.',
      teachConcept: 'planning',
      rows: [
        '.B.T.',
        '.#.#.',
        'S... .'
      ].map(r => r.replace(/ /g, '')),
      allowed: ['F', 'L', 'R', 'LOOP2'],
      maxCmds: 16,
      optimalCmds: 7
    },
    {
      id: 10,
      title: 'Loop Hallway',
      tip: 'A long hallway of bananas — loops make this easier!',
      hint: 'Do it 3 times + forward a few times, turn at the corner, then loop again.',
      teachConcept: 'loops',
      rows: [
        'S.B.B.B..',
        '#########.',
        '.......BT'
      ],
      allowed: ['F', 'L', 'R', 'LOOP2', 'LOOP3'],
      maxCmds: 18,
      optimalCmds: 10
    },
    {
      id: 11,
      title: 'Condition Corner',
      tip: 'When a rock is ahead, use Only if open — or turn the other way.',
      hint: 'Forward to the banana, turn when blocked, then reach the chest with care.',
      teachConcept: 'conditionals',
      rows: [
        'S.B#T',
        '##.#.',
        '.....'
      ],
      allowed: ['F', 'L', 'R', 'IF_CLEAR', 'LOOP2'],
      maxCmds: 16,
      optimalCmds: 8
    },
    {
      id: 12,
      title: 'Boss Jungle',
      tip: 'Boss level! Collect every banana, dodge rocks, then open the chest.',
      hint: 'Plan short stretches with loops. Grab all bananas before the chest.',
      teachConcept: 'mix',
      rows: [
        'S#..B#..',
        '.#.#.#.#',
        'B..#..B#',
        '##.###.#',
        '.....B.T'
      ],
      allowed: ['F', 'L', 'R', 'LOOP2', 'LOOP3', 'IF_CLEAR'],
      maxCmds: 32,
      optimalCmds: 20
    }
  ];

  // Ensure level 9 rows are clean (replace accidental spaces)
  LEVELS[8].rows = [
    '.B.T.',
    '.#.#.',
    'S....'
  ];

  const DIR = [
    { dr: -1, dc: 0, emoji: '⬆️' },
    { dr: 0, dc: 1, emoji: '➡️' },
    { dr: 1, dc: 0, emoji: '⬇️' },
    { dr: 0, dc: -1, emoji: '⬅️' }
  ];

  const FACE_WORDS = [
    { word: 'UP', arrow: '↑' },
    { word: 'RIGHT', arrow: '→' },
    { word: 'DOWN', arrow: '↓' },
    { word: 'LEFT', arrow: '←' }
  ];

  /* Default (friendly) labels — used when grade unknown */
  const CMD_META = {
    F: { label: '⬆️ Go forward', title: 'Go forward', short: 'Go forward' },
    L: { label: '⬅️ Turn left', title: 'Turn left', short: 'Turn left' },
    R: { label: '➡️ Turn right', title: 'Turn right', short: 'Turn right' },
    LOOP2: { label: '×2 Do it 2 times', title: 'Do the next move twice', cls: 'loop', short: 'Do it 2 times' },
    LOOP3: { label: '×3 Do it 3 times', title: 'Do the next move 3 times', cls: 'loop', short: 'Do it 3 times' },
    IF_CLEAR: { label: '❓ Only if open', title: 'Only if the path ahead is open', cls: 'if', short: 'Only if open' }
  };

  const CMD_META_BY_GRADE = {
    prek: {
      F: { label: '⬆️ Go forward', title: 'Go forward', short: 'Go forward' },
      L: { label: '⬅️ Turn left', title: 'Turn left', short: 'Turn left' },
      R: { label: '➡️ Turn right', title: 'Turn right', short: 'Turn right' },
      LOOP2: { label: '×2 Do it 2 times', title: 'Do the next move twice', cls: 'loop', short: 'Do it 2 times' },
      LOOP3: { label: '×3 Do it 3 times', title: 'Do the next move 3 times', cls: 'loop', short: 'Do it 3 times' },
      IF_CLEAR: { label: '❓ Only if open', title: 'Only if the path ahead is open', cls: 'if', short: 'Only if open' }
    },
    grade2: {
      F: { label: '⬆️ Go forward', title: 'step()', short: 'Go forward', code: 'step()' },
      L: { label: '⬅️ Turn left', title: 'turnLeft()', short: 'Turn left', code: 'turnLeft()' },
      R: { label: '➡️ Turn right', title: 'turnRight()', short: 'Turn right', code: 'turnRight()' },
      LOOP2: { label: '×2 repeat 2', title: 'repeat 2', cls: 'loop', short: 'repeat 2', code: 'repeat(2)' },
      LOOP3: { label: '×3 repeat 3', title: 'repeat 3', cls: 'loop', short: 'repeat 3', code: 'repeat(3)' },
      IF_CLEAR: { label: '❓ if clear', title: 'if clear', cls: 'if', short: 'if clear', code: 'ifClear()' }
    },
    grade3: {
      F: { label: 'step()', title: 'step()', short: 'step()', code: 'step()' },
      L: { label: 'turnLeft()', title: 'turnLeft()', short: 'turnLeft()', code: 'turnLeft()' },
      R: { label: 'turnRight()', title: 'turnRight()', short: 'turnRight()', code: 'turnRight()' },
      LOOP2: { label: 'times(2)', title: 'times(2)', cls: 'loop', short: 'times(2)', code: 'times(2)' },
      LOOP3: { label: 'times(3)', title: 'times(3)', cls: 'loop', short: 'times(3)', code: 'times(3)' },
      IF_CLEAR: { label: 'ifClear()', title: 'ifClear()', cls: 'if', short: 'ifClear()', code: 'ifClear()' }
    }
  };

  function getCmdMeta(grade) {
    const g = grade || 'prek';
    return CMD_META_BY_GRADE[g] || CMD_META_BY_GRADE.prek;
  }

  let levelIdx = 0;
  let program = [];
  let grid = [];
  let rows = 0, cols = 0;
  let startR = 0, startC = 0, startF = 1;
  let robot = { r: 0, c: 0, f: 1 };
  let running = false;
  let treasure = { r: 0, c: 0 };
  let bananaCells = []; // [{r,c}, ...] from level (immutable per load)
  let collectedKeys = {}; // key "r,c" -> true for current run / display state

  function cellKey(r, c) { return r + ',' + c; }

  function parseLevel(lv) {
    const g = lv.rows.map(r => r.split(''));
    rows = g.length;
    cols = Math.max(...g.map(r => r.length));
    g.forEach((r, i) => { while (r.length < cols) r.push('.'); g[i] = r; });
    // Normalize legacy G -> T
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (g[r][c] === 'G') g[r][c] = 'T';
      }
    }
    grid = g;
    startF = lv.startFacing != null ? lv.startFacing : 1;
    bananaCells = [];
    treasure = { r: -1, c: -1 };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (g[r][c] === 'S') { startR = r; startC = c; }
        if (g[r][c] === 'T') { treasure = { r, c }; }
        if (g[r][c] === 'B') bananaCells.push({ r, c });
      }
    }
    collectedKeys = {};
    robot = { r: startR, c: startC, f: startF };
  }

  function loadLevel(i) {
    levelIdx = Math.max(0, Math.min(LEVELS.length - 1, i));
    program = [];
    running = false;
    parseLevel(LEVELS[levelIdx]);
    return getState();
  }

  function cellAt(r, c) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return '#';
    return grid[r][c];
  }

  function isBlocked(r, c) {
    const ch = cellAt(r, c);
    return ch === '#' || ch === undefined;
  }

  function resetCollected() {
    collectedKeys = {};
  }

  function resetRobot() {
    robot = { r: startR, c: startC, f: startF };
    resetCollected();
  }

  function bananasTotal() {
    return bananaCells.length;
  }

  function bananasCollectedCount() {
    return Object.keys(collectedKeys).length;
  }

  function bananasRemaining() {
    return Math.max(0, bananasTotal() - bananasCollectedCount());
  }

  function tryCollectAt(r, c) {
    if (cellAt(r, c) !== 'B') return false;
    const k = cellKey(r, c);
    if (collectedKeys[k]) return false;
    collectedKeys[k] = true;
    return true;
  }

  function isBananaCollected(r, c) {
    return !!collectedKeys[cellKey(r, c)];
  }

  function atTreasure() {
    return robot.r === treasure.r && robot.c === treasure.c;
  }

  function allBananasCollected() {
    return bananasRemaining() === 0;
  }

  function hasWon() {
    return atTreasure() && allBananasCollected();
  }

  function estimateOptimal(lv) {
    if (lv.optimalCmds != null) return lv.optimalCmds;
    // Rough estimate: path length heuristic from bananas + treasure span
    const n = (lv.rows && lv.rows.join('').match(/B/g) || []).length;
    const w = Math.max(...(lv.rows || ['']).map(r => r.length));
    const h = (lv.rows || []).length;
    return Math.max(2, Math.min(lv.maxCmds || 12, w + h + n));
  }

  function starsForWin(programLen) {
    const lv = LEVELS[levelIdx];
    const opt = estimateOptimal(lv);
    const len = programLen != null ? programLen : program.length;
    if (len <= opt) return 3;
    if (len <= opt + 3) return 2;
    return 1;
  }

  function addCmd(cmd) {
    if (running) return false;
    const lv = LEVELS[levelIdx];
    if (program.length >= lv.maxCmds) return false;
    if (!lv.allowed.includes(cmd)) return false;
    program.push(cmd);
    if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
    return true;
  }

  function removeCmd(i) {
    if (running) return;
    program.splice(i, 1);
  }

  function clearProgram() {
    if (running) return;
    program = [];
  }

  function expandProgram(cmds) {
    const out = [];
    let i = 0;
    while (i < cmds.length) {
      const c = cmds[i];
      if (c === 'LOOP2' || c === 'LOOP3') {
        const times = c === 'LOOP2' ? 2 : 3;
        const next = cmds[i + 1];
        if (next && next !== 'LOOP2' && next !== 'LOOP3' && next !== 'IF_CLEAR') {
          for (let t = 0; t < times; t++) out.push({ cmd: next, src: i + 1 });
          i += 2;
        } else {
          i += 1;
        }
      } else if (c === 'IF_CLEAR') {
        const next = cmds[i + 1];
        if (next && next !== 'LOOP2' && next !== 'LOOP3' && next !== 'IF_CLEAR') {
          out.push({ cmd: 'IF_CLEAR', src: i, then: next, thenSrc: i + 1 });
          i += 2;
        } else {
          i += 1;
        }
      } else {
        out.push({ cmd: c, src: i });
        i += 1;
      }
    }
    return out;
  }

  function stepOnce(cmd) {
    if (cmd === 'L') { robot.f = (robot.f + 3) % 4; return 'ok'; }
    if (cmd === 'R') { robot.f = (robot.f + 1) % 4; return 'ok'; }
    if (cmd === 'F') {
      const d = DIR[robot.f];
      const nr = robot.r + d.dr, nc = robot.c + d.dc;
      if (isBlocked(nr, nc)) return 'bump';
      robot.r = nr; robot.c = nc;
      tryCollectAt(robot.r, robot.c);
      return 'ok';
    }
    return 'ok';
  }

  function forwardClear() {
    const d = DIR[robot.f];
    return !isBlocked(robot.r + d.dr, robot.c + d.dc);
  }

  /** Legacy alias — treasure cell (not full win) */
  function atGoal() {
    return atTreasure();
  }

  function collectedList() {
    return Object.keys(collectedKeys).map(k => {
      const parts = k.split(',');
      return { r: Number(parts[0]), c: Number(parts[1]) };
    });
  }

  /**
   * Run program with async steps. onStep({srcIndex, robot, status, collected, bananasRemaining})
   * returns Promise<{won, bumped, bananasLeft, collected, missedChest, atTreasure}>
   */
  function run(onStep, delayMs) {
    if (running) {
      return Promise.resolve({
        won: false, bumped: false, bananasLeft: bananasRemaining(),
        collected: bananasCollectedCount(), missedChest: true, atTreasure: false
      });
    }
    running = true;
    resetRobot();
    // Collect if somehow starting on a banana (unusual)
    tryCollectAt(robot.r, robot.c);

    const expanded = expandProgram(program);
    const delay = delayMs || 320;

    return new Promise((resolve) => {
      let i = 0;
      let bumped = false;
      let stoppedEarly = false;

      function finish() {
        running = false;
        const atT = atTreasure();
        const left = bananasRemaining();
        const won = atT && left === 0;
        const collected = bananasCollectedCount();
        if (won) {
          if (global.KidsAudio && KidsAudio.win) KidsAudio.win();
        } else {
          if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
        }
        resolve({
          won,
          bumped,
          bananasLeft: left,
          collected,
          missedChest: !atT,
          atTreasure: atT,
          stoppedEarly
        });
      }

      function tick() {
        if (!running) {
          // stopped externally
          resolve({
            won: false, bumped, bananasLeft: bananasRemaining(),
            collected: bananasCollectedCount(), missedChest: true, atTreasure: atTreasure(),
            stoppedEarly: true
          });
          return;
        }

        if (i >= expanded.length) {
          finish();
          return;
        }

        const step = expanded[i];
        let status = 'ok';
        let src = step.src;

        if (step.cmd === 'IF_CLEAR') {
          if (forwardClear()) {
            status = stepOnce(step.then);
            src = step.thenSrc;
          } else {
            status = 'skip';
          }
        } else {
          status = stepOnce(step.cmd);
        }

        if (status === 'bump') {
          bumped = true;
          stoppedEarly = true;
          if (onStep) {
            onStep({
              srcIndex: src,
              robot: Object.assign({}, robot),
              status,
              facingEmoji: DIR[robot.f].emoji,
              collected: collectedList(),
              bananasRemaining: bananasRemaining(),
              bananasTotal: bananasTotal()
            });
          }
          finish();
          return;
        }

        if (onStep) {
          onStep({
            srcIndex: src,
            robot: Object.assign({}, robot),
            status,
            facingEmoji: DIR[robot.f].emoji,
            collected: collectedList(),
            bananasRemaining: bananasRemaining(),
            bananasTotal: bananasTotal()
          });
        }

        // Win as soon as treasure + all bananas
        if (hasWon()) {
          finish();
          return;
        }

        // At treasure but bananas left — keep going (might loop back); don't win yet
        i++;
        setTimeout(tick, delay);
      }

      if (onStep) {
        onStep({
          srcIndex: -1,
          robot: Object.assign({}, robot),
          status: 'start',
          facingEmoji: DIR[robot.f].emoji,
          collected: collectedList(),
          bananasRemaining: bananasRemaining(),
          bananasTotal: bananasTotal()
        });
      }
      setTimeout(tick, delay);
    });
  }

  function stop() { running = false; }

  function getState() {
    return {
      levelIdx,
      level: LEVELS[levelIdx],
      levels: LEVELS,
      program: program.slice(),
      grid,
      rows,
      cols,
      robot: Object.assign({}, robot),
      goal: Object.assign({}, treasure), // legacy
      treasure: Object.assign({}, treasure),
      bananaCells: bananaCells.map(b => Object.assign({}, b)),
      collected: collectedList(),
      bananasTotal: bananasTotal(),
      bananasRemaining: bananasRemaining(),
      bananasCollected: bananasCollectedCount(),
      running,
      facingEmoji: DIR[robot.f].emoji,
      facingWord: FACE_WORDS[robot.f].word,
      facingArrow: FACE_WORDS[robot.f].arrow,
      CMD_META,
      CMD_META_BY_GRADE
    };
  }

  global.StemGame = {
    LEVELS,
    CMD_META,
    CMD_META_BY_GRADE,
    getCmdMeta,
    loadLevel,
    addCmd,
    removeCmd,
    clearProgram,
    run,
    stop,
    resetRobot,
    getState,
    atGoal,
    atTreasure,
    starsForWin,
    bananasRemaining,
    bananasTotal
  };
})(typeof window !== 'undefined' ? window : global);
