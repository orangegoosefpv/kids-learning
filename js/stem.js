/* Code Path — sequence arrows/loops to reach the goal */
(function (global) {
  /*
    Grid cells: '.' empty, '#' wall, 'S' start, 'G' goal
    Facing: 0N 1E 2S 3W
    Commands: F forward, L left turn, R right turn,
              LOOP2 / LOOP3 (repeat next cmd), IF_CLEAR (do next only if forward clear)
  */

  const LEVELS = [
    {
      id: 1,
      title: 'First Steps',
      tip: 'Tap Go forward until you reach the star. Then press GO!',
      rows: ['S..G'],
      allowed: ['F'],
      maxCmds: 6
    },
    {
      id: 2,
      title: 'Turn Time',
      tip: 'Turn left or right so the robot faces the path, then Go forward.',
      rows: [
        'S...',
        '###.',
        '...G'
      ],
      allowed: ['F', 'L', 'R'],
      maxCmds: 10
    },
    {
      id: 3,
      title: 'Zigzag',
      tip: 'Tap moves to go around the dark walls. Then press GO!',
      rows: [
        'S.#..',
        '..#..',
        '..#.G'
      ],
      allowed: ['F', 'L', 'R'],
      maxCmds: 14
    },
    {
      id: 4,
      title: 'Loop Magic',
      tip: 'Tap ×2 or ×3, then a move — the robot does that move more than once!',
      rows: ['S....G'],
      allowed: ['F', 'LOOP2', 'LOOP3'],
      maxCmds: 6
    },
    {
      id: 5,
      title: 'Loop Corner',
      tip: 'Try ×2 or ×3 before Go forward or a turn to save taps.',
      rows: [
        'S....',
        '####.',
        '....G'
      ],
      allowed: ['F', 'L', 'R', 'LOOP2', 'LOOP3'],
      maxCmds: 12
    },
    {
      id: 6,
      title: 'Maze Lite',
      tip: 'Make a plan, press GO!, and if you bump a wall — try a new plan!',
      rows: [
        'S#...',
        '.#.#.',
        '...#G'
      ],
      allowed: ['F', 'L', 'R'],
      maxCmds: 16
    },
    {
      id: 7,
      title: 'If Clear',
      tip: 'Use ❓ If path is open before a move when you might bump a wall.',
      rows: [
        'S.#G',
        '..#.',
        '....'
      ],
      allowed: ['F', 'L', 'R', 'IF_CLEAR'],
      maxCmds: 14
    },
    {
      id: 8,
      title: 'Spiral',
      tip: 'Long path? Use ×2 or ×3 before Go forward!',
      rows: [
        'S....',
        '####.',
        '.....',
        '.####',
        '....G'
      ],
      allowed: ['F', 'L', 'R', 'LOOP2', 'LOOP3'],
      maxCmds: 18
    },
    {
      id: 9,
      title: 'Two Paths',
      tip: 'Two ways to the star — pick either one and press GO!',
      rows: [
        '..G..',
        '.###.',
        'S... .'
      ].map(r => r.replace(' ', '')),
      allowed: ['F', 'L', 'R', 'LOOP2'],
      maxCmds: 16,
      // fix: make clean grid
      _fix: true
    },
    {
      id: 10,
      title: 'Condition Corner',
      tip: 'When a wall is ahead, try ❓ If path is open with a turn.',
      rows: [
        'S..#G',
        '##.#.',
        '.....'
      ],
      allowed: ['F', 'L', 'R', 'IF_CLEAR', 'LOOP2'],
      maxCmds: 16
    },
    {
      id: 11,
      title: 'Long Hall',
      tip: 'A long hallway — try ×3 Do it 3 times + Go forward!',
      rows: [
        'S.........',
        '#########.',
        '.........G'
      ],
      allowed: ['F', 'L', 'R', 'LOOP2', 'LOOP3'],
      maxCmds: 14
    },
    {
      id: 12,
      title: 'Boss Maze',
      tip: 'You\'ve got this — tap your moves carefully, then press GO!',
      rows: [
        'S#...#..',
        '.#.#.#.#',
        '...#...#',
        '##.###.#',
        '.......G'
      ],
      allowed: ['F', 'L', 'R', 'LOOP2', 'LOOP3', 'IF_CLEAR'],
      maxCmds: 28
    }
  ];

  // Fix level 9 rows
  LEVELS[8].rows = [
    '..G..',
    '.###.',
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

  const CMD_META = {
    F: { label: '⬆️ Go forward', title: 'Go forward' },
    L: { label: '⬅️ Turn left', title: 'Turn left' },
    R: { label: '➡️ Turn right', title: 'Turn right' },
    LOOP2: { label: '×2 Do it twice', title: 'Do the next move twice', cls: 'loop' },
    LOOP3: { label: '×3 Do it 3 times', title: 'Do the next move 3 times', cls: 'loop' },
    IF_CLEAR: { label: '❓ If path is open', title: 'Only if the path ahead is open', cls: 'if' }
  };

  let levelIdx = 0;
  let program = [];
  let grid = [];
  let rows = 0, cols = 0;
  let startR = 0, startC = 0, startF = 1;
  let robot = { r: 0, c: 0, f: 1 };
  let running = false;
  let goal = { r: 0, c: 0 };

  function parseLevel(lv) {
    const g = lv.rows.map(r => r.split(''));
    rows = g.length;
    cols = Math.max(...g.map(r => r.length));
    // pad
    g.forEach((r, i) => { while (r.length < cols) r.push('.'); g[i] = r; });
    grid = g;
    startF = lv.startFacing != null ? lv.startFacing : 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (g[r][c] === 'S') { startR = r; startC = c; }
        if (g[r][c] === 'G') { goal = { r, c }; }
      }
    }
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

  function resetRobot() {
    robot = { r: startR, c: startC, f: startF };
  }

  function addCmd(cmd) {
    if (running) return false;
    const lv = LEVELS[levelIdx];
    if (program.length >= lv.maxCmds) return false;
    if (!lv.allowed.includes(cmd)) return false;
    program.push(cmd);
    KidsAudio.click();
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
    // Expand LOOP and IF into a flat executable list with tracking indices
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
          // orphan loop — skip
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
      return 'ok';
    }
    return 'ok';
  }

  function forwardClear() {
    const d = DIR[robot.f];
    return !isBlocked(robot.r + d.dr, robot.c + d.dc);
  }

  function atGoal() {
    return robot.r === goal.r && robot.c === goal.c;
  }

  /**
   * Run program with async steps. onStep({srcIndex, robot, status})
   * returns Promise<{won, bumped}>
   */
  function run(onStep, delayMs) {
    if (running) return Promise.resolve({ won: false, bumped: false });
    running = true;
    resetRobot();
    const expanded = expandProgram(program);
    const delay = delayMs || 320;

    return new Promise((resolve) => {
      let i = 0;
      let bumped = false;

      function tick() {
        if (i >= expanded.length) {
          running = false;
          const won = atGoal();
          if (won) KidsAudio.win();
          else KidsAudio.wrong();
          resolve({ won, bumped });
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

        if (status === 'bump') bumped = true;

        if (onStep) onStep({ srcIndex: src, robot: Object.assign({}, robot), status, facingEmoji: DIR[robot.f].emoji });

        if (atGoal()) {
          running = false;
          KidsAudio.win();
          resolve({ won: true, bumped });
          return;
        }

        i++;
        setTimeout(tick, delay);
      }

      // initial paint
      if (onStep) onStep({ srcIndex: -1, robot: Object.assign({}, robot), status: 'start', facingEmoji: DIR[robot.f].emoji });
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
      goal: Object.assign({}, goal),
      running,
      facingEmoji: DIR[robot.f].emoji,
      facingWord: FACE_WORDS[robot.f].word,
      facingArrow: FACE_WORDS[robot.f].arrow,
      CMD_META
    };
  }

  global.StemGame = {
    LEVELS, CMD_META, loadLevel, addCmd, removeCmd, clearProgram,
    run, stop, resetRobot, getState, atGoal
  };
})(window);
