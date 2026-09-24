/* Spelling trainer — type the word; Enter submits / continues.
   Wrong answers require active correction (re-type the correct word). */
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
  let phase = 'show'; // show | hide | typing | correcting | awaitEnter
  let scrambled = '';
  let locked = false;
  let missedOnce = false; // true if first attempt was wrong
  let firstTryCorrect = false;

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
    missedOnce = false;
    firstTryCorrect = false;
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
    missedOnce = false;
    firstTryCorrect = false;
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

  /**
   * check(typed)
   * Returns:
   *   { ok, correct, word, star, correcting, correctedAfterMiss }
   * - First-try correct → ok, star, awaitEnter
   * - Wrong → correcting phase (must re-type); no advance
   * - Correction match → ok without star, awaitEnter, correctedAfterMiss
   */
  function check(typed) {
    if (locked || !item) return null;
    if (phase !== 'typing' && phase !== 'hide' && phase !== 'show' && phase !== 'correcting') return null;
    const guess = String(typed || '').trim().toLowerCase();
    if (!guess) return null;

    const target = item.word.toLowerCase();
    const ok = guess === target;

    if (phase === 'correcting') {
      if (!ok) {
        KidsAudio.wrong();
        return {
          ok: false,
          correct: item.word,
          word: item.word,
          star: false,
          correcting: true,
          stillCorrecting: true,
          correctedAfterMiss: false
        };
      }
      locked = true;
      phase = 'awaitEnter';
      KidsAudio.correct();
      return {
        ok: true,
        correct: item.word,
        word: item.word,
        star: false,
        correcting: false,
        correctedAfterMiss: true
      };
    }

    // First attempt (typing / hide / show)
    locked = true;
    if (ok) {
      firstTryCorrect = true;
      missedOnce = false;
      phase = 'awaitEnter';
      KidsAudio.correct();
      return {
        ok: true,
        correct: item.word,
        word: item.word,
        star: true,
        correcting: false,
        correctedAfterMiss: false
      };
    }

    // Wrong — enter active correction; unlock so they can re-type
    missedOnce = true;
    firstTryCorrect = false;
    locked = false;
    phase = 'correcting';
    KidsAudio.wrong();
    return {
      ok: false,
      correct: item.word,
      word: item.word,
      star: false,
      correcting: true,
      stillCorrecting: true,
      correctedAfterMiss: false
    };
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
      awaitEnter: phase === 'awaitEnter',
      correcting: phase === 'correcting',
      missedOnce,
      firstTryCorrect
    };
  }

  global.SpellingGame = {
    start, check, continueNext, beginTyping, hideWord, getState, WORDS
  };
})(window);
