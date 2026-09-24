/* Math course — Pre-K, Grade 2, Grade 3 */
(function (global) {
  const EMOJIS = ['⭐', '🍎', '🐱', '🔵', '🌟', '🐶', '🎈', '🦋', '🐸', '🍪'];

  function rand(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function choicesAround(answer, count, min, max) {
    const set = new Set([answer]);
    let guard = 0;
    while (set.size < count && guard++ < 80) {
      const delta = rand(-5, 5) || 1;
      let v = answer + delta;
      if (v < min) v = min + rand(0, 3);
      if (v > max) v = max - rand(0, 3);
      set.add(v);
    }
    while (set.size < count) set.add(rand(min, max));
    return shuffle([...set]);
  }

  /* ---- Pre-K ---- */
  function genPreK() {
    const kind = pick(['count', 'match', 'which', 'more']);
    const emoji = pick(EMOJIS);
    if (kind === 'count') {
      const n = rand(1, 10);
      return {
        mode: 'choice',
        prompt: 'How many?',
        visualArr: Array(n).fill(emoji),
        answer: n,
        choices: choicesAround(n, 4, 1, 10),
        speak: `Count the ${emoji}`
      };
    }
    if (kind === 'match') {
      const n = rand(1, 10);
      return {
        mode: 'choice',
        prompt: `Find the number ${n}`,
        visualArr: [],
        bigNumber: n,
        answer: n,
        choices: choicesAround(n, 4, 1, 10),
        speak: `Tap ${n}`
      };
    }
    if (kind === 'which') {
      const n = rand(1, 10);
      return {
        mode: 'choice',
        prompt: `Which number is ${n}?`,
        visualArr: Array(n).fill(emoji),
        answer: n,
        choices: choicesAround(n, 4, 1, 10),
        speak: 'Match the count'
      };
    }
    // more
    const a = rand(1, 8);
    const b = rand(1, 8);
    if (a === b) return genPreK();
    const answer = a > b ? a : b;
    return {
      mode: 'choice',
      prompt: 'Which pile has MORE?',
      compare: [
        { label: String(a), visualArr: Array(a).fill(emoji), value: a },
        { label: String(b), visualArr: Array(b).fill(pick(EMOJIS)), value: b }
      ],
      answer,
      choices: [a, b],
      speak: 'Pick the bigger number'
    };
  }

  /* ---- Grade 2 ---- */
  function genGrade2() {
    const kind = pick(['add', 'sub', 'skip', 'place', 'add2', 'sub2']);
    if (kind === 'add') {
      const a = rand(1, 20), b = rand(1, 20);
      const ans = a + b;
      return { mode: 'choice', prompt: `${a} + ${b} = ?`, answer: ans, choices: choicesAround(ans, 4, 0, 40) };
    }
    if (kind === 'add2') {
      const a = rand(10, 50), b = rand(10, 49);
      const ans = a + b;
      return { mode: 'typed', prompt: `${a} + ${b} = ?`, answer: ans };
    }
    if (kind === 'sub') {
      const a = rand(5, 20), b = rand(0, a);
      const ans = a - b;
      return { mode: 'choice', prompt: `${a} − ${b} = ?`, answer: ans, choices: choicesAround(ans, 4, 0, 20) };
    }
    if (kind === 'sub2') {
      const a = rand(20, 99), b = rand(1, Math.min(40, a));
      const ans = a - b;
      return { mode: 'typed', prompt: `${a} − ${b} = ?`, answer: ans };
    }
    if (kind === 'skip') {
      const step = pick([2, 5, 10]);
      const start = step;
      const seq = [start, start + step, start + 2 * step, '?'];
      const ans = start + 3 * step;
      return {
        mode: 'choice',
        prompt: `Skip count by ${step}: ${seq.join(', ')}`,
        answer: ans,
        choices: choicesAround(ans, 4, 0, 100)
      };
    }
    // place value
    const tens = rand(1, 9), ones = rand(0, 9);
    const n = tens * 10 + ones;
    if (Math.random() < 0.5) {
      return {
        mode: 'choice',
        prompt: `How many TENS in ${n}?`,
        answer: tens,
        choices: choicesAround(tens, 4, 0, 9)
      };
    }
    return {
      mode: 'choice',
      prompt: `How many ONES in ${n}?`,
      answer: ones,
      choices: choicesAround(ones, 4, 0, 9)
    };
  }

  /* ---- Grade 3 ---- */
  function genGrade3() {
    const kind = pick(['mul', 'div', 'word', 'frac', 'mul2']);
    if (kind === 'mul') {
      const a = rand(2, 10), b = rand(2, 10);
      const ans = a * b;
      return { mode: 'choice', prompt: `${a} × ${b} = ?`, answer: ans, choices: choicesAround(ans, 4, 0, 100) };
    }
    if (kind === 'mul2') {
      const a = rand(2, 12), b = rand(2, 12);
      const ans = a * b;
      return { mode: 'typed', prompt: `${a} × ${b} = ?`, answer: ans };
    }
    if (kind === 'div') {
      const b = rand(2, 10), ans = rand(2, 10), a = b * ans;
      return { mode: 'choice', prompt: `${a} ÷ ${b} = ?`, answer: ans, choices: choicesAround(ans, 4, 1, 12) };
    }
    if (kind === 'frac') {
      const whole = pick([4, 8, 12]);
      const part = pick(['half', 'quarter']);
      let ans, prompt;
      if (part === 'half') {
        ans = whole / 2;
        prompt = `What is half of ${whole}?`;
      } else {
        ans = whole / 4;
        prompt = `What is a quarter of ${whole}?`;
      }
      return { mode: 'choice', prompt, answer: ans, choices: choicesAround(ans, 4, 1, whole) };
    }
    // word
    const templates = [
      () => {
        const a = rand(2, 9), b = rand(2, 9);
        return { mode: 'typed', prompt: `Sam has ${a} bags with ${b} apples each. How many apples?`, answer: a * b };
      },
      () => {
        const a = rand(12, 40), b = rand(3, 15);
        return { mode: 'typed', prompt: `There are ${a} stickers. ${b} are used. How many left?`, answer: a - b };
      },
      () => {
        const a = rand(3, 8), b = rand(2, 6);
        return { mode: 'choice', prompt: `${a} friends share ${a * b} cookies evenly. Each gets?`, answer: b, choices: choicesAround(b, 4, 1, 12) };
      },
      () => {
        const a = rand(5, 20), b = rand(5, 20);
        return { mode: 'choice', prompt: `A robot walked ${a} steps, then ${b} more. Total steps?`, answer: a + b, choices: choicesAround(a + b, 4, 0, 50) };
      }
    ];
    return pick(templates)();
  }

  const COURSES = {
    prek: { id: 'prek', name: 'Pre-K (~4)', emoji: '🐣', gen: genPreK, rounds: 8 },
    grade2: { id: 'grade2', name: 'Grade 2 (~6)', emoji: '📗', gen: genGrade2, rounds: 10 },
    grade3: { id: 'grade3', name: 'Grade 3 (~8)', emoji: '📘', gen: genGrade3, rounds: 10 }
  };

  let courseId = 'prek';
  let round = 0;
  let score = 0;
  let problem = null;
  let locked = false;

  function start(id) {
    courseId = COURSES[id] ? id : 'prek';
    round = 0;
    score = 0;
    locked = false;
    problem = COURSES[courseId].gen();
    return getState();
  }

  function next() {
    locked = false;
    round++;
    problem = COURSES[courseId].gen();
    return getState();
  }

  function check(answer) {
    if (locked || !problem) return null;
    if (answer === '' || answer === null || answer === undefined) return null;
    const num = Number(answer);
    if (Number.isNaN(num)) return null;
    locked = true;
    const ok = num === Number(problem.answer);
    if (ok) {
      score++;
      KidsAudio.correct();
    } else {
      KidsAudio.wrong();
    }
    return { ok, correct: problem.answer, score, round, total: COURSES[courseId].rounds };
  }

  function getState() {
    const c = COURSES[courseId];
    return {
      courseId,
      course: c,
      round,
      total: c.rounds,
      score,
      problem,
      done: round >= c.rounds,
      locked
    };
  }

  function isDone() {
    return round >= COURSES[courseId].rounds;
  }

  global.MathCourse = { COURSES, start, next, check, getState, isDone };
})(window);
