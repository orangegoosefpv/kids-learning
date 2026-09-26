/* Science explorers — fun fact cards + questions by grade */
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
    { emoji: '🐶', fact: 'Dogs are animals that can be pets.', q: 'Which one is a dog?', choices: ['🐶', '🐟', '🚗', '🌳'], answer: '🐶' },
    { emoji: '🌧️', fact: 'Rain falls from clouds in the sky.', q: 'Where does rain come from?', choices: ['Clouds', 'Shoes', 'Books', 'Cakes'], answer: 'Clouds' },
    { emoji: '🌱', fact: 'Plants need water and sun to grow.', q: 'What helps a plant grow?', choices: ['Candy', 'Water & sun', 'TV', 'Socks'], answer: 'Water & sun' },
    { emoji: '🦋', fact: 'Butterflies start as tiny eggs, then caterpillars!', q: 'Which one can fly?', choices: ['🦋', '🐢', '🪨', '🏠'], answer: '🦋' },
    { emoji: '❄️', fact: 'Snow is cold and soft.', q: 'Is snow hot or cold?', choices: ['Cold', 'Hot', 'Spicy', 'Loud'], answer: 'Cold' },
    { emoji: '🧲', fact: 'Magnets can stick to some metal things.', q: 'What can a magnet stick to?', choices: ['Metal', 'Wood only', 'Clouds', 'Water'], answer: 'Metal' },
    { emoji: '🫀', fact: 'Your heart pumps blood around your body.', q: 'What does your heart do?', choices: ['Pumps blood', 'Sees', 'Hears', 'Smells'], answer: 'Pumps blood' },
    { emoji: '🌞', fact: 'The sun gives us light and warmth.', q: 'What gives us daytime light?', choices: ['The sun', 'A pillow', 'Ice', 'A sock'], answer: 'The sun' },
    { emoji: '🐸', fact: 'Frogs can hop and live near water.', q: 'Which animal hops?', choices: ['🐸', '🐟', '🐌', '🦅'], answer: '🐸' },
    { emoji: '🌬️', fact: 'Wind is air that is moving.', q: 'What is wind?', choices: ['Moving air', 'A rock', 'A tree', 'A book'], answer: 'Moving air' }
  ];

  const GRADE2 = [
    { emoji: '🐘', theme: 'Animals', fact: 'An elephant has a long trunk. It drinks and grabs food with it.', q: 'What does a trunk help an elephant do?', choices: ['Only sleep', 'Drink and grab food', 'Fly', 'Make silk'], answer: 'Drink and grab food' },
    { emoji: '🌈', theme: 'Weather', fact: 'A rainbow can show when sun shines in the rain.', q: 'When can you see a rainbow?', choices: ['Only at night', 'Sun in the rain', 'Under the ground', 'In a freezer'], answer: 'Sun in the rain' },
    { emoji: '🌳', theme: 'Plants', fact: 'Leaves use sunlight to help a plant make food.', q: 'What do leaves help a plant do?', choices: ['Make food with sun', 'Bark loudly', 'Swim', 'Melt ice'], answer: 'Make food with sun' },
    { emoji: '🦴', theme: 'Body', fact: 'Bones give your body shape. They also keep soft parts safe.', q: 'What do bones help with?', choices: ['Shape and safety', 'Only eating', 'Growing feathers', 'Making rain'], answer: 'Shape and safety' },
    { emoji: '🧲', theme: 'Magnets', fact: 'Magnets can pull some metals. North and south sides pull together.', q: 'What can a magnet pull?', choices: ['Some metals', 'Only wood', 'Clouds', 'Socks'], answer: 'Some metals' },
    { emoji: '🐧', theme: 'Animals', fact: 'Penguins are birds. They swim well. They do not fly.', q: 'What is true about penguins?', choices: ['They fly high', 'They swim but do not fly', 'They are fish', 'They live in deserts'], answer: 'They swim but do not fly' },
    { emoji: '☁️', theme: 'Weather', fact: 'Clouds are made of tiny drops of water or ice.', q: 'What are clouds made of?', choices: ['Candy', 'Water or ice', 'Only smoke', 'Plastic'], answer: 'Water or ice' },
    { emoji: '🫁', theme: 'Body', fact: 'Your lungs help you breathe. They take in air.', q: 'What do lungs help you do?', choices: ['Breathe', 'See', 'Hear', 'Smell'], answer: 'Breathe' }
  ];

  const GRADE3 = [
    { emoji: '🦇', theme: 'Animals', fact: 'Bats use echolocation: they make sounds and listen to echoes to find their way in the dark.', q: 'How do bats navigate in the dark?', choices: ['Flashlights', 'Echolocation', 'Reading maps', 'Asking owls'], answer: 'Echolocation' },
    { emoji: '🌪️', theme: 'Weather', fact: 'A tornado is a spinning column of air that stretches from a thunderstorm to the ground.', q: 'What is a tornado?', choices: ['A calm breeze', 'A spinning column of air', 'A type of cloud only', 'An ocean wave'], answer: 'A spinning column of air' },
    { emoji: '🌵', theme: 'Plants', fact: 'Cacti store water in thick stems so they can survive dry deserts.', q: 'Why do cacti have thick stems?', choices: ['To store water', 'To fly', 'To make music', 'To melt snow'], answer: 'To store water' },
    { emoji: '🧠', theme: 'Body', fact: 'Your brain controls thoughts, memory, and signals that tell your body how to move.', q: 'What does the brain help control?', choices: ['Only toenails', 'Thoughts, memory, and movement signals', 'Only weather', 'Ocean tides'], answer: 'Thoughts, memory, and movement signals' },
    { emoji: '⚡', theme: 'Physics', fact: 'Static electricity builds when certain materials rub and transfer tiny electric charges.', q: 'What can cause static electricity?', choices: ['Rubbing materials that transfer charge', 'Eating soup', 'Sleeping only', 'Painting walls blue'], answer: 'Rubbing materials that transfer charge' },
    { emoji: '🐝', theme: 'Animals', fact: 'Bees pollinate flowers, which helps plants make fruits and seeds.', q: 'How do bees help plants?', choices: ['By pollinating flowers', 'By eating all leaves', 'By flooding fields', 'By blocking sun'], answer: 'By pollinating flowers' },
    { emoji: '🌍', theme: 'Earth', fact: 'Earth orbits the sun once each year; that yearly trip helps create seasons.', q: 'About how long does Earth take to orbit the sun?', choices: ['One day', 'One year', 'One hour', 'One minute'], answer: 'One year' },
    { emoji: '🧊', theme: 'Physics', fact: 'Water can freeze into ice (solid), melt into liquid, or boil into steam (gas).', q: 'What are the three common states of water?', choices: ['Solid, liquid, gas', 'Hot, louder, purple', 'Rock, metal, wood', 'North, south, east'], answer: 'Solid, liquid, gas' }
  ];

  const BANK = { prek: PREK, grade2: GRADE2, grade3: GRADE3 };

  let grade = 'prek';
  let deck = [];
  let idx = 0;
  let item = null;
  let locked = false;
  let score = 0;
  let round = 0;
  let cachedChoices = null;
  const ROUNDS = 6;

  function setItem(it) {
    item = it;
    cachedChoices = it ? shuffle(it.choices.slice()) : null;
  }

  function start(g) {
    grade = BANK[g] ? g : 'prek';
    deck = shuffle(BANK[grade]);
    idx = 0;
    locked = false;
    score = 0;
    round = 0;
    setItem(deck[0]);
    return getState();
  }

  function check(answer) {
    if (locked || !item) return null;
    locked = true;
    const ok = String(answer) === String(item.answer);
    if (ok) {
      score++;
      KidsAudio.correct();
    } else {
      KidsAudio.wrong();
    }
    return { ok, correct: item.answer, score, round, total: ROUNDS };
  }

  function next() {
    locked = false;
    round++;
    idx++;
    if (idx >= deck.length) {
      deck = shuffle(BANK[grade]);
      idx = 0;
    }
    setItem(deck[idx]);
    return getState();
  }

  /** Re-open the same question after a wrong answer (flight unlock gate). */
  function retrySame() {
    locked = false;
    return getState();
  }

    function getState() {
    return {
      grade,
      round,
      total: ROUNDS,
      score,
      locked,
      done: round >= ROUNDS,
      item: item ? {
        emoji: item.emoji,
        theme: item.theme || '',
        fact: item.fact,
        q: item.q,
        choices: cachedChoices || item.choices.slice(),
        answer: item.answer
      } : null
    };
  }

  global.ScienceGame = { start, check, next, retrySame, getState };
})(window);
