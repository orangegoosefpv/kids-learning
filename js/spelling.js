/* Spelling trainer — type the word; Enter submits / continues */
(function (global) {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const WORDS = {
    prek: [
      { word: 'cat', emoji: '🐱' },
      { word: 'dog', emoji: '🐶' },
      { word: 'sun', emoji: '☀️' },
      { word: 'hat', emoji: '🎩' },
      { word: 'pig', emoji: '🐷' },
      { word: 'cup', emoji: '☕' },
      { word: 'bed', emoji: '🛏️' },
      { word: 'red', emoji: '🔴' },
      { word: 'big', emoji: '🐘' },
      { word: 'mom', emoji: '👩' },
      { word: 'dad', emoji: '👨' },
      { word: 'run', emoji: '🏃' }
    ],
    grade2: [
      /* Decodable / common patterns + a few high-frequency sight words */
      { word: 'ship', emoji: '🚢' },
      { word: 'frog', emoji: '🐸' },
      { word: 'flag', emoji: '🚩' },
      { word: 'stop', emoji: '🛑' },
      { word: 'jump', emoji: '🦘' },
      { word: 'help', emoji: '🆘' },
      { word: 'rain', emoji: '🌧️' },
      { word: 'boat', emoji: '⛵' },
      { word: 'tree', emoji: '🌳' },
      { word: 'play', emoji: '🎮' },
      { word: 'said', emoji: '💬' },
      { word: 'they', emoji: '👥' },
      { word: 'come', emoji: '👋' },
      { word: 'have', emoji: '✋' },
      { word: 'like', emoji: '❤️' },
      { word: 'when', emoji: '⏰' }
    ],
    grade3: [
      { word: 'beautiful', emoji: '🌸' },
      { word: 'important', emoji: '⭐' },
      { word: 'different', emoji: '🔀' },
      { word: 'together', emoji: '🧩' },
      { word: 'through', emoji: '🚪' },
      { word: 'enough', emoji: '⚖️' },
      { word: 'believe', emoji: '💫' },
      { word: 'surprise', emoji: '🎁' },
      { word: 'favorite', emoji: '❤️' },
      { word: 'probably', emoji: '🤔' },
      { word: 'scientists', emoji: '🔬' },
      { word: 'environment', emoji: '🌍' },
      { word: 'knowledge', emoji: '📚' },
      { word: 'paragraph', emoji: '📝' },
      { word: 'carefully', emoji: '👀' }
    ]
  };

  let grade = 'prek';
  let deck = [];
  let idx = 0;
  let item = null;
  let phase = 'show'; // show | hide | typing | done | awaitEnter
  let scrambled = '';
  let locked = false;

  function scramble(word) {
    if (word.length <= 2) return word.split('').join(' ');
    let chars = word.split('');
    let out = shuffle(chars).join('');
    let guard = 0;
    while (out === word && guard++ < 20) out = shuffle(word.split('')).join('');
    return out.split('').join(' ');
  }

  function start(g) {
    grade = WORDS[g] ? g : 'prek';
    deck = shuffle(WORDS[grade]);
    idx = 0;
    locked = false;
    nextItem(true);
    return getState();
  }

  function nextItem(resetIdx) {
    if (!resetIdx) {
      idx++;
      if (idx >= deck.length) {
        deck = shuffle(WORDS[grade]);
        idx = 0;
      }
    }
    item = deck[idx];
    scrambled = scramble(item.word);
    phase = 'show';
    locked = false;
  }

  function beginTyping() {
    if (phase === 'show' || phase === 'hide') {
      phase = 'typing';
      locked = false;
    }
  }

  function hideWord() {
    if (phase === 'show') phase = 'hide';
  }

  function check(typed) {
    if (locked || !item || (phase !== 'typing' && phase !== 'hide' && phase !== 'show')) return null;
    const guess = String(typed || '').trim().toLowerCase();
    if (!guess) return null;
    locked = true;
    const ok = guess === item.word.toLowerCase();
    phase = 'awaitEnter';
    if (ok) KidsAudio.correct();
    else KidsAudio.wrong();
    return { ok, correct: item.word, word: item.word };
  }

  function continueNext() {
    if (phase !== 'awaitEnter') return getState();
    nextItem(false);
    return getState();
  }

  function getState() {
    return {
      grade,
      phase,
      locked,
      word: item ? item.word : '',
      emoji: item ? item.emoji : '',
      scrambled,
      showWord: phase === 'show',
      awaitEnter: phase === 'awaitEnter'
    };
  }

  global.SpellingGame = {
    start, check, continueNext, beginTyping, hideWord, getState, WORDS
  };
})(window);
