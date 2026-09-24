/* Reading / phonics — content by grade (grade2: early-reader supports) */
(function (global) {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const PREK = [
    { kind: 'letter', prompt: 'Find the letter A', show: '🅰️', answer: 'A', choices: ['A', 'B', 'C', 'D'] },
    { kind: 'letter', prompt: 'Find the letter B', show: '🅱️', answer: 'B', choices: ['A', 'B', 'M', 'S'] },
    { kind: 'letter', prompt: 'Find the letter C', show: 'C', answer: 'C', choices: ['C', 'O', 'G', 'Q'] },
    { kind: 'letter', prompt: 'Find the letter M', show: 'M', answer: 'M', choices: ['N', 'M', 'W', 'H'] },
    { kind: 'letter', prompt: 'Find the letter S', show: 'S', answer: 'S', choices: ['Z', 'S', 'C', 'X'] },
    { kind: 'sound', prompt: 'Which letter says /m/ (mmm)?', show: '👄', answer: 'M', choices: ['M', 'B', 'T', 'S'] },
    { kind: 'sound', prompt: 'Which letter says /s/ (sss)?', show: '🐍', answer: 'S', choices: ['S', 'F', 'Z', 'C'] },
    { kind: 'sound', prompt: 'Which letter says /b/ (buh)?', show: '🐝', answer: 'B', choices: ['D', 'P', 'B', 'G'] },
    { kind: 'sound', prompt: 'Which letter says /t/ (tuh)?', show: '🦷', answer: 'T', choices: ['T', 'D', 'P', 'K'] },
    { kind: 'cvc', prompt: 'What word matches the picture?', show: '🐱', answer: 'cat', choices: ['cat', 'dog', 'hat', 'car'] },
    { kind: 'cvc', prompt: 'What word matches the picture?', show: '🐶', answer: 'dog', choices: ['dig', 'dog', 'log', 'dot'] },
    { kind: 'cvc', prompt: 'What word matches the picture?', show: '☀️', answer: 'sun', choices: ['sun', 'run', 'fun', 'bun'] },
    { kind: 'cvc', prompt: 'What word matches the picture?', show: '🎩', answer: 'hat', choices: ['hot', 'hit', 'hat', 'hut'] },
    { kind: 'cvc', prompt: 'What word matches the picture?', show: '🐷', answer: 'pig', choices: ['pig', 'big', 'dig', 'pin'] },
    { kind: 'cvc', prompt: 'What word matches the picture?', show: '🚗', answer: 'car', choices: ['cat', 'car', 'can', 'cup'] },
    { kind: 'cvc', prompt: 'Pick the word for 🐟', show: '🐟', answer: 'fish', choices: ['fish', 'frog', 'bird', 'ship'] }
  ];

  /* Grade 2 phonics warm-up: sounds → blends → short words (WWC-friendly) */
  const GRADE2_PHONICS = [
    { kind: 'sound', prompt: '', show: 'S', answer: '/s/', choices: ['/s/', '/m/', '/t/', '/b/'] },
    { kind: 'sound', prompt: '', show: 'M', answer: '/m/', choices: ['/m/', '/n/', '/p/', '/r/'] },
    { kind: 'blend', prompt: '', show: '/c/ /a/ /t/', answer: 'cat', choices: ['cat', 'cap', 'cut', 'cot'] },
    { kind: 'blend', prompt: '', show: '/s/ /u/ /n/', answer: 'sun', choices: ['sun', 'sit', 'run', 'sip'] },
    { kind: 'blend', prompt: '', show: '/f/ /r/ /o/ /g/', answer: 'frog', choices: ['frog', 'flag', 'from', 'fog'] },
    { kind: 'cvc', prompt: '', show: '🚢', answer: 'ship', choices: ['ship', 'shop', 'chip', 'sip'] },
    { kind: 'cvc', prompt: '', show: '🌳', answer: 'tree', choices: ['tree', 'try', 'trap', 'three'] },
    { kind: 'sight', prompt: '', show: 'the', answer: 'the', choices: ['the', 'teh', 'hte', 'tha'] },
    { kind: 'sight', prompt: '', show: 'said', answer: 'said', choices: ['said', 'siad', 'sed', 'saed'] },
    { kind: 'sight', prompt: '', show: 'was', answer: 'was', choices: ['was', 'saw', 'waz', 'wus'] },
    { kind: 'sight', prompt: '', show: 'you', answer: 'you', choices: ['you', 'yuo', 'yoo', 'yu'] },
    { kind: 'sight', prompt: '', show: 'come', answer: 'come', choices: ['come', 'came', 'cuom', 'coem'] },
    { kind: 'blend', prompt: '', show: '/st/ /o/ /p/', answer: 'stop', choices: ['stop', 'spot', 'step', 'top'] }
  ];

  /* Grade 2 passages: short sentences, emoji cue, chunked lines, simple vocab */
  const GRADE2_PASSAGES = [
    {
      emoji: '🪁',
      sentences: ['Mia has a red kite.', 'She runs in the park.', 'The wind lifts the kite.', 'Mia smiles.'],
      questions: [
        { q: 'What color is the kite?', choices: ['Blue', 'Red', 'Green', 'Black'], answer: 'Red' },
        { q: 'Where does Mia run?', choices: ['School', 'Home', 'Park', 'Store'], answer: 'Park' }
      ]
    },
    {
      emoji: '🐠',
      sentences: ['Tom has a fish.', 'He feeds it each day.', 'The fish swims up.', 'Tom is glad.'],
      questions: [
        { q: 'What pet does Tom have?', choices: ['Dog', 'Cat', 'Fish', 'Bird'], answer: 'Fish' },
        { q: 'When does Tom feed it?', choices: ['At night', 'Each day', 'Once a year', 'Never'], answer: 'Each day' }
      ]
    },
    {
      emoji: '🌱',
      sentences: ['The kids plant seeds.', 'They give them water.', 'They wait.', 'Green plants grow!'],
      questions: [
        { q: 'What did the kids plant?', choices: ['Rocks', 'Seeds', 'Toys', 'Cars'], answer: 'Seeds' },
        { q: 'What grew?', choices: ['Green plants', 'Snow', 'Cars', 'Clouds'], answer: 'Green plants' }
      ]
    },
    {
      emoji: '🥾',
      sentences: ['Sam packs a lunch.', 'He takes a bun and an apple.', 'He takes water too.', 'The path is cool.'],
      questions: [
        { q: 'What did Sam pack?', choices: ['Toys', 'A lunch', 'Books', 'Hats'], answer: 'A lunch' },
        { q: 'How is the path?', choices: ['Hot', 'Cool', 'Icy', 'Loud'], answer: 'Cool' }
      ]
    },
    {
      emoji: '⛈️',
      sentences: ['Lila hears a boom.', 'She shuts the window.', 'Rain taps on the roof.', 'Her cat hides under the bed.'],
      questions: [
        { q: 'What does Lila hear?', choices: ['Music', 'A boom', 'A bell', 'A song'], answer: 'A boom' },
        { q: 'Where does the cat hide?', choices: ['On the roof', 'Under the bed', 'Outside', 'In a tree'], answer: 'Under the bed' }
      ]
    },
    {
      emoji: '🧱',
      sentences: ['Ben makes a tall tower.', 'It is as tall as a chair.', 'One block tips.', 'The tower falls.', 'Ben laughs and tries again.'],
      questions: [
        { q: 'What does Ben make?', choices: ['A cake', 'A tower', 'A boat', 'A map'], answer: 'A tower' },
        { q: 'What does Ben do when it falls?', choices: ['Cry', 'Laugh', 'Sleep', 'Leave'], answer: 'Laugh' }
      ]
    },
    {
      emoji: '🚌',
      sentences: ['Kim gets on the bus.', 'She sits by a friend.', 'They talk and smile.', 'Soon they are at school.'],
      questions: [
        { q: 'Where does Kim go?', choices: ['Store', 'School', 'Beach', 'Farm'], answer: 'School' },
        { q: 'Who does Kim sit by?', choices: ['A dog', 'A friend', 'A frog', 'A teacher'], answer: 'A friend' }
      ]
    },
    {
      emoji: '🐕',
      sentences: ['Max has a dog.', 'The dog likes to run.', 'Max throws a ball.', 'The dog brings it back.'],
      questions: [
        { q: 'What does Max have?', choices: ['A cat', 'A dog', 'A bird', 'A fish'], answer: 'A dog' },
        { q: 'What does Max throw?', choices: ['A stick', 'A ball', 'A hat', 'A book'], answer: 'A ball' }
      ]
    }
  ];

  const GRADE3 = [
    {
      passage: 'Owls are mostly night hunters. Soft feathers help them fly almost silently. Their large eyes gather light so they can see in dim forests. Many owls eat mice and other small animals. Because they hunt at night, people often hear them more than they see them.',
      questions: [
        { q: 'Why can owls fly quietly?', choices: ['They are small', 'Soft feathers', 'They glide only', 'Bright eyes'], answer: 'Soft feathers' },
        { q: 'In the passage, "dim" most nearly means…', choices: ['Bright', 'Noisy', 'Dark / low light', 'Warm'], answer: 'Dark / low light' }
      ]
    },
    {
      passage: 'Recycling turns used materials into new products. Paper can become notebooks again. Plastic bottles may be remade into fabric or containers. When we sort trash carefully, less waste ends up in landfills. Small habits at home can help the whole community.',
      questions: [
        { q: 'What is one benefit of sorting trash?', choices: ['More landfills', 'Less waste in landfills', 'Dirtier parks', 'Faster trash trucks'], answer: 'Less waste in landfills' },
        { q: 'In this passage, "habits" means…', choices: ['Clothes', 'Regular actions we do', 'Animals', 'Tools'], answer: 'Regular actions we do' }
      ]
    },
    {
      passage: 'Volcanoes form where melted rock, called magma, rises toward Earth\'s surface. When pressure builds, magma can erupt as lava, ash, and gases. Some volcanoes erupt gently; others explode violently. Scientists monitor shaking and gas to warn people nearby. Over time, cooled lava builds tall mountains.',
      questions: [
        { q: 'What is magma?', choices: ['Ice', 'Melted rock', 'Clouds', 'Sand'], answer: 'Melted rock' },
        { q: '"Monitor" in this passage means…', choices: ['A computer screen only', 'Watch carefully', 'Ignore', 'Build'], answer: 'Watch carefully' }
      ]
    },
    {
      passage: 'Honeybees visit flowers to collect nectar. Back at the hive, they turn nectar into honey and store it as food. While moving from flower to flower, bees also carry pollen. That helps plants make seeds and fruit. Without pollinators like bees, many crops would struggle to grow.',
      questions: [
        { q: 'How do bees help plants?', choices: ['They eat leaves', 'They carry pollen', 'They dig roots', 'They scare birds'], answer: 'They carry pollen' },
        { q: '"Pollinators" are animals that…', choices: ['Only make honey', 'Help plants reproduce by moving pollen', 'Eat all fruit', 'Live in oceans'], answer: 'Help plants reproduce by moving pollen' }
      ]
    },
    {
      passage: 'Maps use symbols to show information clearly. A legend (or key) explains what each symbol means. Scale tells how distance on the map compares to distance in the real world. Compass roses show north, south, east, and west. Learning these tools helps you find places and plan trips.',
      questions: [
        { q: 'What does a map legend do?', choices: ['Measures rain', 'Explains symbols', 'Shows only roads', 'Tells the time'], answer: 'Explains symbols' },
        { q: 'In this passage, "scale" refers to…', choices: ['A fish covering', 'Distance comparison on a map', 'A song', 'Weight only'], answer: 'Distance comparison on a map' }
      ]
    }
  ];

  let grade = 'prek';
  let deck = [];
  let idx = 0;
  let item = null;
  let qIdx = 0;
  let locked = false;
  let score = 0;
  let total = 0;
  let round = 0;
  let cachedChoices = null;
  const ROUNDS = 8; // grade2: a few phonics + passage Qs
  const ROUNDS_OTHER = 6;

  function buildDeck(g) {
    if (g === 'prek') return shuffle(PREK);
    if (g === 'grade2') {
      // 3 phonics warm-ups first (shuffled), then shuffled passages
      const phonics = shuffle(GRADE2_PHONICS).slice(0, 3).map(p =>
        Object.assign({ type: 'phonics' }, p)
      );
      const passages = shuffle(GRADE2_PASSAGES).map(p =>
        Object.assign({ type: 'passage' }, p)
      );
      return phonics.concat(passages);
    }
    return shuffle(GRADE3).map(p => Object.assign({ type: 'passage' }, p));
  }

  function start(g) {
    grade = g === 'grade2' || g === 'grade3' ? g : 'prek';
    deck = buildDeck(grade);
    idx = 0;
    qIdx = 0;
    locked = false;
    score = 0;
    round = 0;
    total = grade === 'grade2' ? ROUNDS : ROUNDS_OTHER;
    cachedChoices = null;
    loadCurrent();
    return getState();
  }

  function loadCurrent() {
    item = deck[idx % deck.length];
    qIdx = 0;
    locked = false;
    cachedChoices = null;
  }

  function passageText(it) {
    if (!it) return '';
    if (it.sentences && it.sentences.length) return it.sentences.join(' ');
    return it.passage || '';
  }

  function currentQuestion() {
    if (!item) return null;
    if (grade === 'prek') {
      if (!cachedChoices) cachedChoices = shuffle(item.choices.slice());
      return {
        mode: 'prek',
        prompt: item.prompt,
        show: item.show,
        choices: cachedChoices,
        answer: item.answer,
        kind: item.kind
      };
    }
    // Grade 2 phonics warm-up items
    if (item.type === 'phonics' || (!item.questions && item.answer)) {
      if (!cachedChoices) cachedChoices = shuffle(item.choices.slice());
      return {
        mode: 'phonics',
        prompt: item.prompt,
        show: item.show || item.emoji || '',
        choices: cachedChoices,
        answer: item.answer,
        kind: item.kind || 'phonics',
      };
    }
    const q = item.questions[qIdx];
    if (!cachedChoices) cachedChoices = shuffle(q.choices.slice());
    const sentences = item.sentences || null;
    return {
      mode: grade === 'grade2' ? 'chunked' : 'passage',
      passage: passageText(item),
      sentences: sentences,
      emoji: item.emoji || '',
      prompt: q.q,
      choices: cachedChoices,
      answer: q.answer,
      qNum: qIdx + 1,
      qTotal: item.questions.length,
      chunked: !!(sentences && sentences.length)
    };
  }

  function check(answer) {
    if (locked || !item) return null;
    locked = true;
    const cur = currentQuestion();
    const ok = String(answer) === String(cur.answer);
    if (ok) {
      score++;
      KidsAudio.correct();
    } else {
      KidsAudio.wrong();
    }
    return { ok, correct: cur.answer, score, round, total };
  }

  function next() {
    locked = false;
    cachedChoices = null;
    round++;
    if (grade === 'prek') {
      idx++;
      if (idx >= deck.length) {
        deck = buildDeck(grade);
        idx = 0;
      }
      loadCurrent();
    } else if (item.type === 'phonics' || (!item.questions && item.answer)) {
      idx++;
      if (idx >= deck.length) {
        deck = buildDeck(grade);
        idx = 0;
      }
      loadCurrent();
    } else {
      qIdx++;
      if (qIdx >= item.questions.length) {
        idx++;
        qIdx = 0;
        if (idx >= deck.length) {
          deck = buildDeck(grade);
          idx = 0;
        }
        loadCurrent();
      }
    }
    return getState();
  }

  function getState() {
    return {
      grade,
      round,
      total,
      score,
      locked,
      done: round >= total,
      question: currentQuestion()
    };
  }

  global.ReadingGame = { start, check, next, getState };
})(window);
