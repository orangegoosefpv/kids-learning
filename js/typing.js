/* Typing trainer — progressive levels */
(function (global) {
  const LEVELS = [
    {
      id: 'home',
      name: 'Home Row',
      hint: 'Warm up with home-row letters!',
      prompts: ['asdf', 'jkl;', 'asdf jkl', 'aaa', 'fff', 'jjj', 'ddd', 'kkk', 'fjfj', 'dkdk', 'as as', 'jk jk', 'fall', 'dad', 'salad', 'flask']
    },
    {
      id: 'words',
      name: 'Easy Words',
      hint: 'Type whole words — take your time!',
      prompts: ['cat', 'dog', 'sun', 'moon', 'star', 'play', 'happy', 'friend', 'robot', 'space', 'apple', 'banana', 'rainbow', 'rocket', 'dragon', 'castle']
    },
    {
      id: 'sentences',
      name: 'Short Sentences',
      hint: 'Small sentences. Spaces and punctuation count!',
      prompts: [
        'I like cats.',
        'The sun is hot.',
        'We play games.',
        'My dog runs fast.',
        'Stars shine at night.',
        'Robots can help.',
        'I can type well!',
        'Math is fun today.',
        'Let us build a robot.',
        'Coding is awesome.'
      ]
    }
  ];

  let levelIdx = 0;
  let promptIdx = 0;
  let typed = '';
  let startTime = null;
  let errors = 0;
  let streak = 0;
  let bestStreak = 0;
  let finished = false;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let deck = [];

  function ensureDeck() {
    if (!deck.length) deck = shuffle(LEVELS[levelIdx].prompts);
  }

  function currentPrompt() {
    ensureDeck();
    return deck[promptIdx % deck.length];
  }

  function renderTarget(el) {
    const target = currentPrompt();
    let html = '';
    for (let i = 0; i < target.length; i++) {
      const ch = target[i] === ' ' ? '&nbsp;' : escapeHtml(target[i]);
      if (i < typed.length) {
        if (typed[i] === target[i]) html += `<span class="done">${ch}</span>`;
        else html += `<span class="wrong">${ch}</span>`;
      } else if (i === typed.length) {
        html += `<span class="current">${ch}</span>`;
      } else {
        html += `<span class="todo">${ch}</span>`;
      }
    }
    el.innerHTML = html;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function wpm() {
    if (!startTime || typed.length < 2) return 0;
    const minutes = (Date.now() - startTime) / 60000;
    if (minutes <= 0) return 0;
    return Math.round((typed.length / 5) / minutes);
  }

  function accuracy() {
    const total = typed.length + errors;
    if (total === 0) return 100;
    return Math.max(0, Math.round((typed.length / (typed.length + errors)) * 100));
  }

  function onKey(ch) {
    if (finished) return null;
    const target = currentPrompt();
    if (!startTime) startTime = Date.now();

    if (ch === target[typed.length]) {
      typed += ch;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      KidsAudio.type();
      if (typed === target) {
        finished = true;
        KidsAudio.correct();
        return { done: true, wpm: wpm(), accuracy: accuracy(), streak: bestStreak };
      }
      return { done: false, ok: true, streak };
    } else {
      errors++;
      streak = 0;
      KidsAudio.wrong();
      return { done: false, ok: false, streak: 0 };
    }
  }

  function nextPrompt() {
    promptIdx++;
    if (promptIdx >= deck.length) {
      deck = shuffle(LEVELS[levelIdx].prompts);
      promptIdx = 0;
    }
    typed = '';
    startTime = null;
    errors = 0;
    finished = false;
  }

  function setLevel(i) {
    levelIdx = Math.max(0, Math.min(LEVELS.length - 1, i));
    promptIdx = 0;
    deck = shuffle(LEVELS[levelIdx].prompts);
    typed = '';
    startTime = null;
    errors = 0;
    streak = 0;
    bestStreak = 0;
    finished = false;
  }

  function getLevel() { return LEVELS[levelIdx]; }
  function getLevels() { return LEVELS; }
  function getState() {
    return { typed, target: currentPrompt(), wpm: wpm(), accuracy: accuracy(), streak, bestStreak, levelIdx };
  }

  global.TypingGame = {
    LEVELS, setLevel, getLevel, getLevels, getState,
    renderTarget, onKey, nextPrompt, currentPrompt
  };
})(window);
