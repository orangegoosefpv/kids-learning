/* Space Fox Flyer — top-down arena shooter
   Hangar shop · map upgrade stations · points · 2-min timed flights.
   Waves · player HP · FPV/Shahed drones. Original kid-friendly game. */
(function (global) {
  const SESSION_SECONDS = 2 * 60;
  const QUESTIONS_TO_UNLOCK = 10;
  const GATE_SUBJECTS = ['Math', 'Reading', 'Spelling', 'Science'];
  /** Pull camera OUT so plane, bullets, and enemies are clearly visible. */
  const CAM_ZOOM = 0.48;
  const MAX_EQUIP_PERKS = 2;
  const PLAYER_MAX_HP = 5;
  const HIT_INVULN = 90; // frames (~1.5s) after a hit
  const WINGMEN_DURATION = 20; // friend-jets perk lifetime (seconds)
  /** Escalating waves across the 2-minute session (at = elapsed seconds). */
  const WAVE_DEFS = [
    { id: 1, at: 0,   title: 'Wave 1', subtitle: 'Easy patrol',   speedMul: 0.42, densMul: 0.65, hp: 1,   shoot: 0,    boss: false, color: '#55efc4' },
    { id: 2, at: 30,  title: 'Wave 2', subtitle: 'Medium swarm',  speedMul: 0.55, densMul: 0.95, hp: 1,   shoot: 0.14, boss: false, color: '#74b9ff' },
    { id: 3, at: 60,  title: 'Wave 3', subtitle: 'Hard chase',    speedMul: 0.68, densMul: 1.2,  hp: 1.5, shoot: 0.3,  boss: false, color: '#ffeaa7' },
    { id: 4, at: 90,  title: 'Wave 4', subtitle: 'Heavy drones',  speedMul: 0.82, densMul: 1.4,  hp: 2,   shoot: 0.42, boss: false, color: '#ff7675' },
    { id: 5, at: 105, title: 'Wave 5', subtitle: 'Boss rush!',    speedMul: 0.95, densMul: 1.2,  hp: 3,   shoot: 0.55, boss: true,  color: '#a29bfe' }
  ];

  const WORLDS = [
    {
      id: 0,
      key: 'meadow',
      name: 'Meadow Skies',
      emoji: '🌿',
      tip: 'Soft hills · blast floaty drones!',
      skyTop: '#87CEEB',
      skyBot: '#c8f0a8',
      ground: '#5cb85c',
      accent: '#ffd93d',
      arena: 2000,
      enemies: 8,
      asteroids: 5,
      stars: 6,
      enemyEmoji: '🚁',
      rockEmoji: '☁️',
      starEmoji: '⭐',
      bgBits: ['🌳', '🌼', '🏡', '🦋']
    },
    {
      id: 1,
      key: 'rocks',
      name: 'Rock Belt',
      emoji: '☄️',
      tip: 'Zap soft space rocks and grab stars!',
      skyTop: '#1a1033',
      skyBot: '#3d2b6b',
      ground: '#2a1a4a',
      accent: '#ff9f43',
      arena: 2200,
      enemies: 10,
      asteroids: 8,
      stars: 8,
      enemyEmoji: '🛸',
      rockEmoji: '🌑',
      starEmoji: '⭐',
      bgBits: ['✨', '🪐', '💫', '🌙']
    },
    {
      id: 2,
      key: 'islands',
      name: 'Sky Islands',
      emoji: '🏝️',
      tip: 'Island hop · blast balloon drones!',
      skyTop: '#6ec6ff',
      skyBot: '#ffeaa7',
      ground: '#74b9ff',
      accent: '#fd79a8',
      arena: 2100,
      enemies: 9,
      asteroids: 6,
      stars: 7,
      enemyEmoji: '✈️',
      rockEmoji: '🪨',
      starEmoji: '🌟',
      bgBits: ['☁️', '🌈', '🏝️', '🕊️']
    }
  ];

  const SHIPS = [
    {
      id: 'scout',
      name: 'Scout Flutter',
      emoji: '🛩️',
      color: '#74b9ff',
      tip: 'Easy turns · free starter',
      turn: 1.12,
      thrust: 0.95,
      fire: 1,
      cost: 0,
      tier: 1
    },
    {
      id: 'zippy',
      name: 'Zippy Dart',
      emoji: '✈️',
      color: '#fd79a8',
      tip: 'Speedy · zip around!',
      turn: 1,
      thrust: 1.2,
      fire: 1.05,
      cost: 0,
      tier: 1
    },
    {
      id: 'foxjet',
      name: 'Fox Jet',
      emoji: '🦊',
      color: '#ff9f43',
      tip: 'Fox power · balanced blast',
      turn: 1.05,
      thrust: 1.05,
      fire: 1.15,
      cost: 0,
      tier: 1
    },
    {
      id: 'nova',
      name: 'Nova Racer',
      emoji: '🚀',
      color: '#00cec9',
      tip: 'Sleek · snappy shots',
      turn: 1.15,
      thrust: 1.25,
      fire: 1.25,
      cost: 200,
      tier: 2
    },
    {
      id: 'phoenix',
      name: 'Star Phoenix',
      emoji: '🔥',
      color: '#e17055',
      tip: 'Hot wings · punchy bolts',
      turn: 1.08,
      thrust: 1.18,
      fire: 1.35,
      cost: 380,
      tier: 3
    },
    {
      id: 'cosmic',
      name: 'Cosmic Fox',
      emoji: '✨',
      color: '#a29bfe',
      tip: 'Legendary · all-around ace',
      turn: 1.2,
      thrust: 1.3,
      fire: 1.4,
      cost: 600,
      tier: 4
    }
  ];

  const WEAPON_SHOP = [
    { id: 'damage', label: 'Power Bolts', emoji: '💥', tip: 'Bigger boom damage', cost: 140, maxLevel: 3 },
    { id: 'firerate', label: 'Quick Trigger', emoji: '⚡', tip: 'Shoot faster', cost: 160, maxLevel: 3 },
    { id: 'multishot', label: 'Twin Cannons', emoji: '🎯', tip: 'Extra bullets', cost: 240, maxLevel: 2 }
  ];

  const PERK_SHOP = [
    { id: 'speed', label: 'Speed Boost', emoji: '💨', tip: 'Zoom faster', cost: 100 },
    { id: 'shield', label: 'Shield Pack', emoji: '🛡️', tip: 'Extra soft bump buffer', cost: 120 },
    { id: 'magnet', label: 'Star Magnet', emoji: '🧲', tip: 'Pull nearby stars', cost: 140 },
    { id: 'burst', label: 'Long Burst', emoji: '🌟', tip: 'Bullets fly farther', cost: 160 },
    { id: 'wingmen', label: 'Friend Jets', emoji: '🛫', tip: 'Friendly jets fight with you ~20s', cost: 220 }
  ];

  /** Map landmarks — fly into / overlap to equip for this run. */
  const STATIONS = [
    { id: 'rapid', name: 'Rapid Fire', short: 'Rapid', emoji: '🔥', color: '#ff7675', weapon: 'rapid', tip: 'Super-fast shots!' },
    { id: 'spread', name: 'Spread Shot', short: 'Spread', emoji: '💫', color: '#a29bfe', weapon: 'spread', tip: 'Fan of bolts!' },
    { id: 'shieldpad', name: 'Shield Buoy', short: 'Shield', emoji: '🛡️', color: '#74b9ff', weapon: 'shieldpad', tip: 'Shield refill!' },
    { id: 'missile', name: 'Missile Pad', short: 'Missile', emoji: '🚀', color: '#fd79a8', weapon: 'missile', tip: 'Big seeking boom!' }
  ];

  // Legacy alias used by older UI copy
  const UPGRADES = PERK_SHOP.map(p => ({ id: p.id, label: p.label, emoji: p.emoji, tip: p.tip }));

  let grade = 'grade2';
  let hooks = {};
  let mode = 'menu'; // menu | build | countdown | fly | results
  let worldIdx = 0;
  let shipId = 'foxjet';
  let equippedPerks = { speed: false, fire: false, shield: false, magnet: false, burst: false, wingmen: false };
  let raf = 0;
  let keys = {};
  let pad = { up: false, down: false, left: false, right: false, fire: false };
  let plane = null;
  let bullets = [];
  let entities = [];
  let particles = [];
  let score = 0;
  let pointsEarnedRun = 0;
  let collected = { stars: 0, kills: 0 };
  let flightDone = false;
  let flavor = '';
  let bound = false;
  let sessionLeft = SESSION_SECONDS;
  let sessionStartedAt = 0;
  let fireCooldown = 0;
  let countdownTimer = 0;
  let lastTs = 0;
  let cam = { x: 0, y: 0 };
  let fireHeld = false;
  let activeWeapon = 'normal';
  let stationCooldown = {};
  let enemyBullets = [];
  let currentWaveIdx = 0;
  let waveBannerT = 0;
  let waveBannerTitle = '';
  let waveBannerSub = '';
  let waveBannerColor = '#55efc4';
  let wingmen = [];
  let wingmenLeft = 0;
  let thrusting = false;
  let spawnClock = 0;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function world() {
    return WORLDS[worldIdx] || WORLDS[0];
  }

  function ship() {
    return SHIPS.find(s => s.id === shipId) || SHIPS[2];
  }

  function isPrek() { return grade === 'prek'; }

  function difficulty() {
    // enemySpeed kept low so kids can see and dodge; waves scale it further.
    // Thrust is snappy so W/↑ clearly accelerates along heading.
    if (grade === 'prek') {
      return { thrust: 0.38, turn: 0.08, maxSpeed: 4.5, fireMs: 320, bulletSpeed: 9, enemySpeed: 0.45, hitPad: 10 };
    }
    if (grade === 'grade3') {
      return { thrust: 0.48, turn: 0.1, maxSpeed: 6.0, fireMs: 220, bulletSpeed: 11, enemySpeed: 0.75, hitPad: 4 };
    }
    return { thrust: 0.42, turn: 0.09, maxSpeed: 5.4, fireMs: 260, bulletSpeed: 10, enemySpeed: 0.6, hitPad: 6 };
  }

  function waveDef(idx) {
    return WAVE_DEFS[Math.max(0, Math.min(WAVE_DEFS.length - 1, idx))];
  }

  function waveForElapsed(elapsed) {
    let idx = 0;
    for (let i = 0; i < WAVE_DEFS.length; i++) {
      if (elapsed >= WAVE_DEFS[i].at) idx = i;
    }
    return idx;
  }

  function enemyTint(kind, boss) {
    if (boss) return { fill: 'rgba(45,52,54,0.85)', ring: '#ffeaa7', glow: '#a29bfe' };
    if (kind === 'asteroid') return { fill: 'rgba(255,159,67,0.5)', ring: '#fff', glow: '#ff9f43' };
    if (kind === 'shahed') return { fill: 'rgba(45,52,54,0.9)', ring: '#ff7675', glow: '#e17055' };
    if (kind === 'fpv') return { fill: 'rgba(45,52,54,0.85)', ring: '#74b9ff', glow: '#0984e3' };
    return { fill: 'rgba(255,118,117,0.55)', ring: '#fff', glow: '#ff6b6b' };
  }

  function defaultProgress() {
    return {
      completed: 0,
      bestScore: 0,
      unlockedWorlds: [0],
      questionsTowardUnlock: 0,
      flightLocked: false,
      lastShipId: 'foxjet',
      lastUpgrades: { speed: false, fire: false, shield: false, magnet: false, burst: false, wingmen: false },
      points: 0,
      ownedShips: ['scout', 'zippy', 'foxjet'],
      weaponLevels: { damage: 0, firerate: 0, multishot: 0 },
      ownedPerks: []
    };
  }

  function progress() {
    const p = (hooks.getProgress && hooks.getProgress()) || defaultProgress();
    return normalizeFlightProgress(p);
  }

  function normalizeFlightProgress(fp) {
    const base = fp && typeof fp === 'object' ? fp : {};
    if (!Array.isArray(base.unlockedWorlds)) base.unlockedWorlds = [0];
    if (!base.unlockedWorlds.includes(0)) base.unlockedWorlds.push(0);
    if (typeof base.completed !== 'number') base.completed = 0;
    if (typeof base.bestScore !== 'number') base.bestScore = 0;
    if (typeof base.questionsTowardUnlock !== 'number') base.questionsTowardUnlock = 0;
    if (typeof base.flightLocked !== 'boolean') base.flightLocked = !!base.flightLocked;
    if (!base.lastShipId) base.lastShipId = 'foxjet';
    if (!base.lastUpgrades || typeof base.lastUpgrades !== 'object') {
      base.lastUpgrades = { speed: false, fire: false, shield: false, magnet: false, burst: false, wingmen: false };
    }
    if (typeof base.points !== 'number' || base.points < 0) base.points = Math.max(0, Number(base.points) || 0);
    if (!Array.isArray(base.ownedShips)) base.ownedShips = ['scout', 'zippy', 'foxjet'];
    ['scout', 'zippy', 'foxjet'].forEach(id => {
      if (!base.ownedShips.includes(id)) base.ownedShips.push(id);
    });
    if (!base.weaponLevels || typeof base.weaponLevels !== 'object') {
      base.weaponLevels = { damage: 0, firerate: 0, multishot: 0 };
    }
    ['damage', 'firerate', 'multishot'].forEach(k => {
      if (typeof base.weaponLevels[k] !== 'number') base.weaponLevels[k] = 0;
      base.weaponLevels[k] = Math.max(0, Math.min(5, base.weaponLevels[k] | 0));
    });
    if (!Array.isArray(base.ownedPerks)) base.ownedPerks = [];
    // Migrate old free-toggle boosts into owned perks if they were ever selected
    const lu = base.lastUpgrades || {};
    ['speed', 'shield', 'magnet', 'burst', 'wingmen'].forEach(id => {
      if (lu[id] && !base.ownedPerks.includes(id)) base.ownedPerks.push(id);
    });
    if (lu.fire && (base.weaponLevels.firerate || 0) < 1) base.weaponLevels.firerate = 1;
    return base;
  }

  function saveProgressPatch(patch) {
    const cur = progress();
    const next = Object.assign({}, cur, patch || {});
    if (hooks.saveProgress) hooks.saveProgress(next);
    else if (hooks.onSaveProgress) hooks.onSaveProgress(next);
  }

  function perkEquippedCount() {
    return PERK_SHOP.filter(p => equippedPerks[p.id]).length;
  }

  function isLocked() {
    return !!(progress().flightLocked);
  }

  function questionsDone() {
    return Math.max(0, Math.min(QUESTIONS_TO_UNLOCK, Number(progress().questionsTowardUnlock) || 0));
  }

  function setPrompt(text) {
    const el = $('#flight-prompt');
    if (el) el.textContent = text || '';
    if (hooks.onPrompt) hooks.onPrompt(text || '');
  }

  function showPanel(name) {
    ['menu', 'build', 'countdown', 'fly', 'results'].forEach(m => {
      const el = $('#flight-panel-' + m);
      if (el) el.classList.toggle('hidden', m !== name);
    });
    mode = name;
    const screen = $('#screen-flight');
    if (screen) {
      screen.classList.toggle('flight-playing', name === 'fly' || name === 'countdown');
    }
  }

  function scrollPlayIntoView() {
    const stage = $('#flight-panel-fly') || $('#flight-fly-canvas');
    if (!stage || !stage.scrollIntoView) return;
    try {
      stage.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    } catch (err) {
      stage.scrollIntoView(true);
    }
  }

  function stopLoop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (countdownTimer) {
      clearTimeout(countdownTimer);
      countdownTimer = 0;
    }
  }

  function unlockedSet() {
    const prog = progress();
    const arr = Array.isArray(prog.unlockedWorlds) ? prog.unlockedWorlds.slice() : [0];
    if (!arr.includes(0)) arr.push(0);
    return new Set(arr);
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  function updatePointsUi() {
    const pts = progress().points || 0;
    $$('.flight-points-bal').forEach(el => { el.textContent = String(pts); });
  }

  function updateLockBanner() {
    const banner = $('#flight-lock-banner');
    if (!banner) return;
    const locked = isLocked();
    banner.classList.toggle('hidden', !locked);
    const done = questionsDone();
    const msg = $('#flight-lock-msg');
    if (msg) {
      msg.textContent = locked
        ? `Get ${QUESTIONS_TO_UNLOCK} questions correct in Science (or Math / Reading / Spelling) to unlock more flight. Wrong answers must be fixed — only correct counts! Correct: ${done}/${QUESTIONS_TO_UNLOCK}.`
        : '';
    }
    const progEl = $('#flight-lock-progress');
    if (progEl) {
      progEl.textContent = `Correct: ${done}/${QUESTIONS_TO_UNLOCK}`;
      progEl.style.setProperty('--pct', String((done / QUESTIONS_TO_UNLOCK) * 100));
    }
    const worlds = $('#flight-worlds');
    if (worlds) worlds.classList.toggle('flight-worlds-locked', locked);
    updatePointsUi();
  }

  function renderMenu() {
    showPanel('menu');
    stopLoop();
    updateLockBanner();
    const unlocked = unlockedSet();
    const locked = isLocked();
    const grid = $('#flight-worlds');
    if (!grid) return;
    grid.innerHTML = WORLDS.map(w => {
      const open = unlocked.has(w.id) && !locked;
      const hint = locked
        ? 'Get 10 correct to fly again!'
        : (unlocked.has(w.id) ? w.tip : 'Finish a flight to unlock!');
      return `<button type="button" class="btn btn-xl flight-world-btn ${open ? '' : 'locked'}" data-world="${w.id}" ${open ? '' : 'disabled'} aria-label="${w.name}">
        <span class="emoji">${w.emoji}</span>
        <span class="label">${w.name}</span>
        <span class="hint">${hint}</span>
      </button>`;
    }).join('');
    grid.querySelectorAll('[data-world]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
        worldIdx = Number(btn.dataset.world);
        startBuild();
      });
    });
    const tip = locked
      ? `Fly time's up! Get ${QUESTIONS_TO_UNLOCK} questions correct (Science / Math / Reading / Spelling) to unlock more flight. Only correct answers count!`
      : (isPrek()
        ? 'Pick a world, visit the hangar shop, then blast soft targets!'
        : 'Top-down flyer · hangar shop · map upgrade pads · 2 minutes!');
    setPrompt(tip);
    const badge = $('#flight-grade-tip');
    if (badge) {
      badge.classList.toggle('hidden', grade !== 'grade2');
      badge.textContent = '📗 Grade 2 favorite — top-down fox flyer with hangar upgrades!';
    }
    const menuPts = $('#flight-menu-points');
    if (menuPts) menuPts.innerHTML = `🪙 Hangar points: <strong class="flight-points-bal">${progress().points || 0}</strong>`;
  }

  function startBuild() {
    if (isLocked()) {
      renderMenu();
      return;
    }
    const prog = progress();
    if (prog.lastShipId && prog.ownedShips.includes(prog.lastShipId) && SHIPS.some(s => s.id === prog.lastShipId)) {
      shipId = prog.lastShipId;
    } else {
      shipId = 'foxjet';
    }
    const lu = prog.lastUpgrades || {};
    equippedPerks = {
      speed: !!(lu.speed && prog.ownedPerks.includes('speed')),
      fire: false,
      shield: !!(lu.shield && prog.ownedPerks.includes('shield')),
      magnet: !!(lu.magnet && prog.ownedPerks.includes('magnet')),
      burst: !!(lu.burst && prog.ownedPerks.includes('burst')),
      wingmen: !!(lu.wingmen && prog.ownedPerks.includes('wingmen'))
    };
    while (perkEquippedCount() > MAX_EQUIP_PERKS) {
      const order = ['burst', 'magnet', 'shield', 'speed', 'wingmen'];
      for (const id of order) {
        if (equippedPerks[id]) { equippedPerks[id] = false; break; }
      }
    }
    showPanel('build');
    stopLoop();
    const w = world();
    setPrompt(`${w.emoji} ${w.name}: spend points in the hangar, equip a ship, then Launch!`);
    renderHangarShop();
  }

  function renderHangarShop() {
    const prog = progress();
    updatePointsUi();
    const bal = $('#flight-shop-points');
    if (bal) bal.innerHTML = `🪙 Points: <strong class="flight-points-bal">${prog.points || 0}</strong>`;

    renderShips();
    renderWeaponShop();
    renderPerkShop();
    updateLoadoutSummary();
  }

  function ownsShip(id) {
    const owned = progress().ownedShips || [];
    return owned.includes(id);
  }

  function renderShips() {
    const row = $('#flight-ships');
    if (!row) return;
    const prog = progress();
    row.innerHTML = SHIPS.map(s => {
      const owned = ownsShip(s.id);
      const selected = s.id === shipId;
      const costLabel = owned ? (selected ? 'Equipped' : 'Owned') : `🪙 ${s.cost}`;
      return `<button type="button" class="flight-ship-btn ${selected ? 'selected' : ''} ${owned ? '' : 'locked'}" data-ship="${s.id}" aria-pressed="${selected}">
        <span class="flight-ship-tier">T${s.tier}</span>
        <span class="flight-ship-emoji">${s.emoji}</span>
        <span class="flight-ship-name">${s.name}</span>
        <span class="flight-ship-tip">${s.tip}</span>
        <span class="flight-shop-cost">${costLabel}</span>
      </button>`;
    }).join('');
    row.querySelectorAll('[data-ship]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.ship;
        const s = SHIPS.find(x => x.id === id);
        if (!s) return;
        if (ownsShip(id)) {
          shipId = id;
          if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
          persistLoadout();
          renderHangarShop();
          return;
        }
        if ((prog.points || 0) < s.cost) {
          setPrompt(`Need ${s.cost} points for ${s.name} — keep flying to earn more!`);
          if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
          return;
        }
        buyShip(s);
      });
    });
  }

  function buyShip(s) {
    const prog = progress();
    if (ownsShip(s.id)) return;
    if ((prog.points || 0) < s.cost) return;
    const owned = prog.ownedShips.slice();
    owned.push(s.id);
    saveProgressPatch({
      points: prog.points - s.cost,
      ownedShips: owned,
      lastShipId: s.id
    });
    shipId = s.id;
    if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
    setPrompt(`Bought ${s.emoji} ${s.name}! Equipped and ready.`);
    renderHangarShop();
  }

  function renderWeaponShop() {
    const row = $('#flight-weapon-shop');
    if (!row) return;
    const prog = progress();
    const levels = prog.weaponLevels || {};
    row.innerHTML = WEAPON_SHOP.map(w => {
      const lvl = levels[w.id] || 0;
      const maxed = lvl >= w.maxLevel;
      const nextCost = w.cost + lvl * Math.round(w.cost * 0.5);
      const costLabel = maxed ? `Lv ${lvl} MAX` : `Lv ${lvl} → ${lvl + 1} · 🪙 ${nextCost}`;
      return `<button type="button" class="flight-upgrade-btn flight-shop-btn ${lvl > 0 ? 'owned' : ''} ${maxed ? 'maxed' : ''}" data-weapon-buy="${w.id}">
        <span class="flight-upgrade-emoji">${w.emoji}</span>
        <span class="flight-upgrade-name">${w.label}</span>
        <span class="flight-upgrade-tip">${w.tip}</span>
        <span class="flight-shop-cost">${costLabel}</span>
      </button>`;
    }).join('');
    row.querySelectorAll('[data-weapon-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.weaponBuy;
        buyWeaponLevel(id);
      });
    });
  }

  function buyWeaponLevel(id) {
    const def = WEAPON_SHOP.find(w => w.id === id);
    if (!def) return;
    const prog = progress();
    const levels = Object.assign({ damage: 0, firerate: 0, multishot: 0 }, prog.weaponLevels || {});
    const lvl = levels[id] || 0;
    if (lvl >= def.maxLevel) {
      setPrompt(`${def.label} is already maxed!`);
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      return;
    }
    const cost = def.cost + lvl * Math.round(def.cost * 0.5);
    if ((prog.points || 0) < cost) {
      setPrompt(`Need ${cost} points for ${def.label} — earn more in flight!`);
      if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
      return;
    }
    levels[id] = lvl + 1;
    saveProgressPatch({ points: prog.points - cost, weaponLevels: levels });
    if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
    setPrompt(`${def.emoji} ${def.label} upgraded to level ${levels[id]}!`);
    renderHangarShop();
  }

  function renderPerkShop() {
    const row = $('#flight-upgrades');
    if (!row) return;
    const prog = progress();
    row.innerHTML = PERK_SHOP.map(u => {
      const owned = prog.ownedPerks.includes(u.id);
      const on = !!equippedPerks[u.id];
      let costLabel;
      if (!owned) costLabel = `Buy · 🪙 ${u.cost}`;
      else if (on) costLabel = 'Equipped ✓';
      else costLabel = 'Tap to equip';
      return `<button type="button" class="flight-upgrade-btn ${on ? 'selected' : ''} ${owned ? 'owned' : 'locked'}" data-perk="${u.id}" aria-pressed="${on}">
        <span class="flight-upgrade-emoji">${u.emoji}</span>
        <span class="flight-upgrade-name">${u.label}</span>
        <span class="flight-upgrade-tip">${u.tip}</span>
        <span class="flight-shop-cost">${costLabel}</span>
      </button>`;
    }).join('');
    row.querySelectorAll('[data-perk]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.perk;
        const def = PERK_SHOP.find(p => p.id === id);
        if (!def) return;
        const p = progress();
        if (!p.ownedPerks.includes(id)) {
          if ((p.points || 0) < def.cost) {
            setPrompt(`Need ${def.cost} points for ${def.label}!`);
            if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
            return;
          }
          const owned = p.ownedPerks.slice();
          owned.push(id);
          saveProgressPatch({ points: p.points - def.cost, ownedPerks: owned });
          equippedPerks[id] = true;
          // Cap equip
          while (perkEquippedCount() > MAX_EQUIP_PERKS) {
            const other = PERK_SHOP.map(x => x.id).find(x => x !== id && equippedPerks[x]);
            if (other) equippedPerks[other] = false;
            else break;
          }
          if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
          setPrompt(`Bought ${def.emoji} ${def.label}! Equipped for this flight.`);
          persistLoadout();
          renderHangarShop();
          return;
        }
        if (equippedPerks[id]) {
          equippedPerks[id] = false;
        } else if (perkEquippedCount() < MAX_EQUIP_PERKS) {
          equippedPerks[id] = true;
        } else {
          setPrompt(`Equip only ${MAX_EQUIP_PERKS} perks — tap one to turn it off first!`);
          if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
          return;
        }
        if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
        persistLoadout();
        renderHangarShop();
      });
    });
  }

  function updateLoadoutSummary() {
    const s = ship();
    const prog = progress();
    const perkList = PERK_SHOP.filter(u => equippedPerks[u.id]).map(u => u.emoji + ' ' + u.label);
    const wl = prog.weaponLevels || {};
    const wBits = [];
    if (wl.damage) wBits.push('💥×' + wl.damage);
    if (wl.firerate) wBits.push('⚡×' + wl.firerate);
    if (wl.multishot) wBits.push('🎯×' + wl.multishot);
    const preview = $('#flight-plane-preview');
    if (preview) {
      preview.textContent = s.emoji + (perkList.length ? ' ' + perkList.map(b => b.split(' ')[0]).join('') : '');
    }
    const sum = $('#flight-loadout-summary');
    if (sum) {
      const parts = [s.name];
      if (wBits.length) parts.push(wBits.join(' '));
      if (perkList.length) parts.push(perkList.join(' · '));
      else parts.push('no perks');
      sum.textContent = parts.join(' · ');
    }
    const status = $('#flight-build-status');
    if (status) {
      status.textContent = `✅ ${s.name}` + (perkList.length ? ` + ${perkList.length} perk${perkList.length > 1 ? 's' : ''}` : ' ready');
    }
    const startBtn = $('#flight-start-flight');
    if (startBtn) {
      const locked = isLocked();
      startBtn.disabled = locked;
      startBtn.classList.toggle('ready', !locked);
      if (locked) startBtn.title = 'Flight locked — get 10 correct answers first';
      else startBtn.removeAttribute('title');
    }
  }

  function persistLoadout() {
    saveProgressPatch({
      lastShipId: shipId,
      lastUpgrades: {
        speed: !!equippedPerks.speed,
        fire: false,
        shield: !!equippedPerks.shield,
        magnet: !!equippedPerks.magnet,
        burst: !!equippedPerks.burst,
        wingmen: !!equippedPerks.wingmen
      }
    });
  }

  function sizeCanvas(canvas) {
    const wrap = canvas.parentElement;
    const w = Math.max(280, Math.min(wrap ? wrap.clientWidth : 640, 720));
    const h = Math.max(220, Math.round(w * 0.62));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h, ctx, dpr };
  }

  function beginCountdown() {
    if (isLocked()) {
      renderMenu();
      return;
    }
    stopLoop();
    persistLoadout();
    prepareArena();
    updateHud();
    setPrompt('Get ready…');
    showPanel('countdown');
    scrollPlayIntoView();
    const num = $('#flight-countdown-num');
    const msg = $('#flight-countdown-msg');
    let cn = 3;
    const panelTick = () => {
      if (mode !== 'countdown') return;
      if (num) {
        num.textContent = cn > 0 ? String(cn) : 'GO!';
        num.style.animation = 'none';
        void num.offsetWidth;
        num.style.animation = '';
      }
      if (msg) msg.textContent = cn > 0 ? 'Get ready, pilot!' : 'Blast off!';
      if (cn <= 0) {
        if (global.KidsAudio && KidsAudio.correct) KidsAudio.correct();
        countdownTimer = setTimeout(() => {
          if (mode !== 'countdown') return;
          beginFlight();
        }, 400);
        return;
      }
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      cn -= 1;
      countdownTimer = setTimeout(panelTick, 700);
    };
    panelTick();
  }

  function prepareArena() {
    const wd = world();
    const diff = difficulty();
    const sh = ship();
    const prog = progress();
    const wl = prog.weaponLevels || {};
    const arena = wd.arena;
    const speedMul = (equippedPerks.speed ? 1.28 : 1);
    const fireMul = (1 + (wl.firerate || 0) * 0.22);
    const maxSpeed = diff.maxSpeed * sh.thrust * speedMul;
    const fireMs = diff.fireMs / (sh.fire * fireMul);
    plane = {
      x: arena / 2,
      y: arena / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      alive: true,
      invuln: HIT_INVULN * 0.4,
      shield: equippedPerks.shield ? 3 : 1,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      maxSpeed,
      fireMs,
      turn: diff.turn * sh.turn,
      thrust: diff.thrust * sh.thrust * (equippedPerks.speed ? 1.2 : 1),
      r: isPrek() ? 22 : 18,
      damageLvl: wl.damage || 0,
      multiLvl: wl.multishot || 0,
      magnet: !!equippedPerks.magnet,
      longBurst: !!equippedPerks.burst
    };
    bullets = [];
    enemyBullets = [];
    particles = [];
    score = 0;
    pointsEarnedRun = 0;
    collected = { stars: 0, kills: 0 };
    flightDone = false;
    fireCooldown = 0;
    flavor = pickFlavor();
    activeWeapon = 'normal';
    stationCooldown = {};
    currentWaveIdx = 0;
    spawnClock = 0;
    const w0 = waveDef(0);
    waveBannerTitle = w0.title;
    waveBannerSub = w0.subtitle;
    waveBannerColor = w0.color;
    waveBannerT = 2.8;
    entities = spawnArena(wd, arena, w0);
    cam = { x: plane.x, y: plane.y };
    // Do NOT wipe keys here — kid may already be holding W/↑ during countdown.
    pad = { up: false, down: false, left: false, right: false, fire: false };
    fireHeld = false;
    thrusting = false;
    wingmen = [];
    wingmenLeft = 0;
  }

  function summonWingmen() {
    wingmen = [];
    wingmenLeft = 0;
    if (!plane || !equippedPerks.wingmen) return;
    wingmenLeft = WINGMEN_DURATION;
    const offsets = [-55, 55];
    offsets.forEach((off, i) => {
      wingmen.push({
        x: plane.x + Math.cos(plane.angle + Math.PI / 2) * off,
        y: plane.y + Math.sin(plane.angle + Math.PI / 2) * off,
        vx: 0,
        vy: 0,
        angle: plane.angle,
        fireCd: 0.4 + i * 0.2,
        color: i === 0 ? '#55efc4' : '#74b9ff',
        r: 14
      });
    });
    flavor = '🛫 Friend jets inbound — they help for ~20 seconds!';
  }

  function beginFlight() {
    if (isLocked()) {
      renderMenu();
      return;
    }
    showPanel('fly');
    const canvas = $('#flight-fly-canvas');
    if (!canvas) return;
    sizeCanvas(canvas);
    if (!plane) prepareArena();
    sessionLeft = SESSION_SECONDS;
    sessionStartedAt = performance.now();
    lastTs = performance.now();
    summonWingmen();
    setPrompt(`${world().emoji} ${world().name} · ${flavor}`);
    updateHud();
    scrollPlayIntoView();
    // Focus canvas so keyboard thrust works immediately (no stray button focus).
    try { canvas.setAttribute('tabindex', '-1'); canvas.focus({ preventScroll: true }); } catch (err) { /* */ }
    stopLoop();
    raf = requestAnimationFrame(tickFly);
  }

  function pickFlavor() {
    const lines = [
      'Blast those soft targets!',
      'Fly into glowing upgrade pads!',
      'Fox power — keep flying!',
      'Stars ahead, pilot!',
      'Zap drones · grab stars!'
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function stationPositions(arena) {
    const m = arena * 0.22;
    const c = arena / 2;
    return [
      { x: m, y: m },
      { x: arena - m, y: m },
      { x: m, y: arena - m },
      { x: arena - m, y: arena - m }
    ];
  }

  function waveTargetCounts(wd, wave) {
    const dens = wave && wave.densMul != null ? wave.densMul : 1;
    const baseE = isPrek() ? Math.max(3, wd.enemies - 3) : wd.enemies;
    const baseR = isPrek() ? Math.max(2, wd.asteroids - 2) : wd.asteroids;
    return {
      enemies: Math.max(2, Math.round(baseE * dens)),
      asteroids: Math.max(1, Math.round(baseR * Math.min(1.35, dens)))
    };
  }

  function pickEnemyKind(wave, boss) {
    if (boss) return 'shahed'; // heavy Shahed mothership silhouette
    const wid = (wave && wave.id) || 1;
    // Early waves lean FPV quadcopters; later mix in Shahed loitering munitions
    if (wid <= 2) return Math.random() < 0.75 ? 'fpv' : 'shahed';
    if (wid === 3) return Math.random() < 0.5 ? 'fpv' : 'shahed';
    return Math.random() < 0.35 ? 'fpv' : 'shahed';
  }

  function makeEnemy(wd, x, y, wave, opts) {
    const o = opts || {};
    const boss = !!o.boss || !!(wave && wave.boss && o.forceBoss);
    const ang = Math.random() * Math.PI * 2;
    const speedMul = (wave && wave.speedMul) || 0.5;
    const baseSpd = (0.25 + Math.random() * 0.45) * speedMul;
    const kind = o.kind || pickEnemyKind(wave, boss);
    const tint = enemyTint(kind, boss);
    const hpBase = (wave && wave.hp) || 1;
    // Boss: chunky HP so Wave 5 needs practice (still beatable for Grade 2)
    const hp = boss ? Math.max(22, Math.ceil(hpBase * 9)) : Math.max(1, Math.ceil(hpBase));
    return {
      type: 'enemy',
      x, y,
      vx: Math.cos(ang) * baseSpd,
      vy: Math.sin(ang) * baseSpd,
      r: boss ? (isPrek() ? 56 : 50) : (isPrek() ? 32 : 28),
      emoji: boss ? '🛸' : (kind === 'shahed' ? '🛩️' : '🚁'),
      kind,
      hp,
      maxHp: hp,
      // Coin nerf ~1/3–1/4 of prior rewards
      points: boss ? 28 : (4 + Math.round(hp * 2)),
      boss,
      helper: !!o.helper,
      shootCd: boss ? 0.55 + Math.random() * 0.35 : (1.2 + Math.random() * 1.5),
      canShoot: !!(wave && wave.shoot > 0) || boss,
      shootChance: boss ? 0.9 : ((wave && wave.shoot) || 0),
      tint,
      pulse: Math.random() * Math.PI * 2,
      propSpin: Math.random() * Math.PI * 2
    };
  }

  function makeAsteroid(wd, x, y, wave) {
    const ang = Math.random() * Math.PI * 2;
    const speedMul = (wave && wave.speedMul) || 0.5;
    const spd = (0.18 + Math.random() * 0.35) * speedMul;
    const hp = Math.max(1, Math.ceil(((wave && wave.hp) || 1) * 0.85));
    const tint = enemyTint('asteroid', false);
    return {
      type: 'asteroid',
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: (isPrek() ? 26 : 22) + Math.random() * 12,
      emoji: wd.rockEmoji,
      hp,
      maxHp: hp,
      points: 3 + hp,
      spin: (Math.random() - 0.5) * 0.03,
      tint,
      pulse: Math.random() * Math.PI * 2
    };
  }

  function randAway(arena, margin, minDist) {
    let x, y, tries = 0;
    const cx = plane ? plane.x : arena / 2;
    const cy = plane ? plane.y : arena / 2;
    do {
      x = margin + Math.random() * (arena - margin * 2);
      y = margin + Math.random() * (arena - margin * 2);
      tries++;
    } while (tries < 28 && Math.hypot(x - cx, y - cy) < (minDist || 260));
    return { x, y };
  }

  function spawnArena(wd, arena, wave) {
    const list = [];
    const margin = 100;
    const rand = (a, b) => a + Math.random() * (b - a);
    const wv = wave || waveDef(0);
    const awayFromCenter = () => {
      let x, y, tries = 0;
      do {
        x = rand(margin, arena - margin);
        y = rand(margin, arena - margin);
        tries++;
      } while (tries < 20 && Math.hypot(x - arena / 2, y - arena / 2) < 220);
      return { x, y };
    };

    const spots = stationPositions(arena);
    STATIONS.forEach((st, i) => {
      const p = spots[i] || awayFromCenter();
      list.push({
        type: 'station',
        stationId: st.id,
        weapon: st.weapon,
        name: st.name,
        short: st.short,
        emoji: st.emoji,
        color: st.color,
        tip: st.tip,
        x: p.x,
        y: p.y,
        r: 42,
        glow: 0,
        got: false
      });
    });

    const counts = waveTargetCounts(wd, wv);
    for (let i = 0; i < counts.enemies; i++) {
      const p = awayFromCenter();
      list.push(makeEnemy(wd, p.x, p.y, wv, {}));
    }
    for (let i = 0; i < counts.asteroids; i++) {
      const p = awayFromCenter();
      list.push(makeAsteroid(wd, p.x, p.y, wv));
    }
    for (let i = 0; i < wd.stars; i++) {
      const p = awayFromCenter();
      list.push({
        type: 'star',
        x: p.x,
        y: p.y,
        r: isPrek() ? 28 : 24,
        emoji: wd.starEmoji,
        got: false,
        points: 8,
        bob: Math.random() * Math.PI * 2
      });
    }
    for (let i = 0; i < 18; i++) {
      list.push({
        type: 'bg',
        x: rand(40, arena - 40),
        y: rand(40, arena - 40),
        r: 10,
        emoji: wd.bgBits[i % wd.bgBits.length],
        parallax: 0.25 + Math.random() * 0.35
      });
    }
    return list;
  }

  function respawnTarget(type) {
    const wd = world();
    const arena = wd.arena;
    const wave = waveDef(currentWaveIdx);
    const p = randAway(arena, 100, 260);
    if (type === 'enemy') return makeEnemy(wd, p.x, p.y, wave, {});
    if (type === 'asteroid') return makeAsteroid(wd, p.x, p.y, wave);
    return {
      type: 'star',
      x: p.x, y: p.y,
      r: isPrek() ? 28 : 24,
      emoji: wd.starEmoji,
      got: false,
      points: 8,
      bob: Math.random() * Math.PI * 2
    };
  }

  function startWave(idx, announce) {
    currentWaveIdx = idx;
    const wv = waveDef(idx);
    if (announce) {
      waveBannerTitle = wv.title;
      waveBannerSub = wv.subtitle;
      waveBannerColor = wv.color;
      waveBannerT = 2.8;
      flavor = `${wv.title} — ${wv.subtitle}!`;
    }
    const wd = world();
    const arena = wd.arena;
    const counts = waveTargetCounts(wd, wv);
    let enemies = entities.filter(e => e.type === 'enemy').length;
    let rocks = entities.filter(e => e.type === 'asteroid').length;
    // Burst-spawn up to target density for the new wave
    while (enemies < counts.enemies) {
      const p = randAway(arena, 100, 280);
      entities.push(makeEnemy(wd, p.x, p.y, wv, {}));
      enemies++;
    }
    while (rocks < counts.asteroids) {
      const p = randAway(arena, 100, 280);
      entities.push(makeAsteroid(wd, p.x, p.y, wv));
      rocks++;
    }
    if (wv.boss) {
      const p = randAway(arena, 120, 320);
      entities.push(makeEnemy(wd, p.x, p.y, wv, { forceBoss: true, kind: 'shahed' }));
      // Escort helpers — small FPV drones that swarm with the boss
      for (let h = 0; h < 3; h++) {
        const hp = randAway(arena, 100, 240);
        entities.push(makeEnemy(wd, hp.x, hp.y, wv, { kind: 'fpv', helper: true }));
      }
      flavor = '🛸 Heavy Shahed boss + escort drones — stay sharp!';
    }
  }

  function maintainWaveSpawns(dt) {
    spawnClock += dt;
    if (spawnClock < 1.1) return;
    spawnClock = 0;
    if (!plane || flightDone) return;
    const wd = world();
    const arena = wd.arena;
    const wv = waveDef(currentWaveIdx);
    const counts = waveTargetCounts(wd, wv);
    const enemies = entities.filter(e => e.type === 'enemy').length;
    const rocks = entities.filter(e => e.type === 'asteroid').length;
    if (enemies < counts.enemies) {
      const p = randAway(arena, 100, 300);
      entities.push(makeEnemy(wd, p.x, p.y, wv, {}));
    }
    if (rocks < counts.asteroids) {
      const p = randAway(arena, 100, 300);
      entities.push(makeAsteroid(wd, p.x, p.y, wv));
    }
  }

  function updateHud() {
    const s = $('#flight-score');
    if (s) s.textContent = String(score);
    const k = $('#flight-kills');
    if (k) k.textContent = String(collected.kills);
    const st = $('#flight-stars-got');
    if (st) st.textContent = String(collected.stars);
    const fl = $('#flight-flavor');
    if (fl) fl.textContent = flavor;
    const t = $('#flight-timer');
    if (t) {
      t.textContent = formatTime(sessionLeft);
      t.parentElement && t.parentElement.classList.toggle('flight-timer-low', sessionLeft <= 30);
    }
    const we = $('#flight-weapon-hud');
    if (we) {
      const stDef = STATIONS.find(x => x.weapon === activeWeapon);
      we.textContent = stDef ? `${stDef.emoji} ${stDef.short}` : '🔫 Normal';
    }
    const wv = waveDef(currentWaveIdx);
    const waveEl = $('#flight-wave-hud');
    if (waveEl) {
      waveEl.textContent = wv.title;
      waveEl.style.borderColor = wv.color;
      waveEl.style.color = '#2d3436';
      waveEl.style.background = wv.color;
    }
    const hpFill = $('#flight-hp-fill');
    const hpLabel = $('#flight-hp-label');
    if (plane && hpFill) {
      const pct = Math.max(0, Math.min(100, (plane.hp / (plane.maxHp || PLAYER_MAX_HP)) * 100));
      hpFill.style.width = pct + '%';
      hpFill.classList.toggle('low', plane.hp <= 2);
      hpFill.classList.toggle('mid', plane.hp === 3);
    }
    if (plane && hpLabel) {
      hpLabel.textContent = `❤️ ${plane.hp}/${plane.maxHp || PLAYER_MAX_HP}`;
    }
  }

  function tickFly(ts) {
    raf = 0;
    if (mode !== 'fly' || !plane || flightDone) return;
    const canvas = $('#flight-fly-canvas');
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const dt = Math.min(0.05, (ts - lastTs) / 1000) || 0.016;
    lastTs = ts;

    sessionLeft = Math.max(0, SESSION_SECONDS - (ts - sessionStartedAt) / 1000);
    if (sessionLeft <= 0) {
      finishFlight(true, 'timeup');
      return;
    }

    const elapsed = SESSION_SECONDS - sessionLeft;
    const wantWave = waveForElapsed(elapsed);
    if (wantWave > currentWaveIdx) {
      startWave(wantWave, true);
    }
    if (waveBannerT > 0) waveBannerT = Math.max(0, waveBannerT - dt);

    stepPhysics(w, h, dt);
    if (flightDone) return;
    drawFly(ctx, w, h);
    updateHud();

    if (!flightDone) raf = requestAnimationFrame(tickFly);
  }

  function wantsFire() {
    return !!(keys[' '] || keys.Spacebar || pad.fire || fireHeld);
  }

  function addScore(pts) {
    score += pts;
    pointsEarnedRun += pts;
  }

  function applyStation(e) {
    const id = e.stationId || e.weapon;
    const now = performance.now();
    if (stationCooldown[id] && now - stationCooldown[id] < 2500) return;
    stationCooldown[id] = now;

    if (e.weapon === 'shieldpad') {
      plane.shield = Math.min(5, (plane.shield || 0) + 2);
      plane.invuln = Math.max(plane.invuln, HIT_INVULN * 0.6);
      plane.hp = Math.min(plane.maxHp || PLAYER_MAX_HP, plane.hp + 1);
      flavor = '🛡️ Shield buoy — bubbles + a heart!';
    } else {
      activeWeapon = e.weapon;
      flavor = `${e.emoji} ${e.name} unlocked for this flight!`;
    }
    spawnSparks(e.x, e.y, e.color || '#ffeaa7', 14);
    if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
    // Small point bonus for visiting
    addScore(2);
  }

  function inputHeld(names) {
    for (let i = 0; i < names.length; i++) {
      if (keys[names[i]]) return true;
    }
    return false;
  }

  function wantsThrust() {
    // Prefer e.code aliases (KeyW/ArrowUp) so layout / Shift / Caps Lock cannot break thrust.
    return !!(
      pad.up ||
      inputHeld(['ArrowUp', 'Up', 'KeyW', 'w', 'W', 'thrust'])
    );
  }

  function wantsBrake() {
    return !!(
      pad.down ||
      inputHeld(['ArrowDown', 'Down', 'KeyS', 's', 'S', 'brake'])
    );
  }

  function wantsTurnLeft() {
    return !!(pad.left || inputHeld(['ArrowLeft', 'Left', 'KeyA', 'a', 'A']));
  }

  function wantsTurnRight() {
    return !!(pad.right || inputHeld(['ArrowRight', 'Right', 'KeyD', 'd', 'D']));
  }

  function stepPhysics(viewW, viewH, dt) {
    const wd = world();
    const arena = wd.arena;
    const diff = difficulty();
    const turnL = wantsTurnLeft();
    const turnR = wantsTurnRight();
    const thrust = wantsThrust();
    const brake = wantsBrake() && !thrust; // thrust wins over brake if both held
    thrusting = !!thrust;

    if (turnL) plane.angle -= plane.turn * (dt * 60);
    if (turnR) plane.angle += plane.turn * (dt * 60);

    // Accelerate forward along heading — reliable with keyboard + on-screen pad.
    if (thrust) {
      const accel = plane.thrust * (dt * 60);
      plane.vx += Math.cos(plane.angle) * accel;
      plane.vy += Math.sin(plane.angle) * accel;
    }
    if (brake) {
      plane.vx *= Math.pow(0.9, dt * 60);
      plane.vy *= Math.pow(0.9, dt * 60);
      plane.vx -= Math.cos(plane.angle) * plane.thrust * 0.35 * (dt * 60);
      plane.vy -= Math.sin(plane.angle) * plane.thrust * 0.35 * (dt * 60);
    }

    // Lighter drag so thrust coast feels responsive (was 0.985 — felt stuck).
    plane.vx *= Math.pow(0.992, dt * 60);
    plane.vy *= Math.pow(0.992, dt * 60);

    const spd = Math.hypot(plane.vx, plane.vy);
    if (spd > plane.maxSpeed) {
      plane.vx = (plane.vx / spd) * plane.maxSpeed;
      plane.vy = (plane.vy / spd) * plane.maxSpeed;
    }

    plane.x += plane.vx * (dt * 60);
    plane.y += plane.vy * (dt * 60);

    const padWall = plane.r + 8;
    if (plane.x < padWall) { plane.x = padWall; plane.vx = Math.abs(plane.vx) * 0.55; }
    if (plane.x > arena - padWall) { plane.x = arena - padWall; plane.vx = -Math.abs(plane.vx) * 0.55; }
    if (plane.y < padWall) { plane.y = padWall; plane.vy = Math.abs(plane.vy) * 0.55; }
    if (plane.y > arena - padWall) { plane.y = arena - padWall; plane.vy = -Math.abs(plane.vy) * 0.55; }

    if (plane.invuln > 0) plane.invuln -= dt * 60;

    cam.x += (plane.x - cam.x) * Math.min(1, 0.12 * (dt * 60));
    cam.y += (plane.y - cam.y) * Math.min(1, 0.12 * (dt * 60));

    // Fire rate: rapid station overrides
    let fireMs = plane.fireMs;
    if (activeWeapon === 'rapid') fireMs = Math.max(90, plane.fireMs * 0.45);
    else if (activeWeapon === 'missile') fireMs = plane.fireMs * 1.55;

    fireCooldown = Math.max(0, fireCooldown - dt * 1000);
    if (wantsFire() && fireCooldown <= 0) {
      shoot();
      fireCooldown = fireMs;
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.seek && plane) {
        // Mild seek toward nearest enemy
        let best = null;
        let bestD = 280;
        for (const e of entities) {
          if (e.type !== 'enemy' && e.type !== 'asteroid') continue;
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < bestD) { bestD = d; best = e; }
        }
        if (best) {
          const ang = Math.atan2(best.y - b.y, best.x - b.x);
          const spdB = Math.hypot(b.vx, b.vy) || 10;
          b.vx = b.vx * 0.85 + Math.cos(ang) * spdB * 0.15;
          b.vy = b.vy * 0.85 + Math.sin(ang) * spdB * 0.15;
        }
      }
      b.x += b.vx * (dt * 60);
      b.y += b.vy * (dt * 60);
      b.life -= dt;
      if (b.life <= 0 || b.x < -80 || b.y < -80 || b.x > arena + 80 || b.y > arena + 80) {
        bullets.splice(i, 1);
        continue;
      }
      for (let j = entities.length - 1; j >= 0; j--) {
        const e = entities[j];
        if (e.type !== 'enemy' && e.type !== 'asteroid') continue;
        if (e.hp <= 0) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
          const dmg = b.damage || 1;
          e.hp -= dmg;
          bullets.splice(i, 1);
          if (e.hp <= 0) {
            const kind = e.type;
            const wasBoss = !!e.boss;
            popDestroy(e);
            addScore(e.points);
            collected.kills++;
            entities.splice(j, 1);
            if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
            flavor = wasBoss
              ? '🛸 Boss down — amazing!'
              : (kind === 'enemy' ? 'Drone down — nice shot!' : 'Rock blasted — soft pop!');
          } else {
            spawnSparks(e.x, e.y, '#ffeaa7', 4);
          }
          break;
        }
      }
    }

    // Move enemies / asteroids; bob stars; glow stations
    for (const e of entities) {
      if (e.type === 'bg') continue;
      if (e.type === 'station') {
        e.glow = (e.glow || 0) + dt * 3;
        continue;
      }
      if (e.type === 'star') {
        e.bob = (e.bob || 0) + dt * 3;
        // Magnet perk
        if (plane && plane.magnet) {
          const dx = plane.x - e.x;
          const dy = plane.y - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 160 && dist > 1) {
            e.x += (dx / dist) * 2.2 * (dt * 60);
            e.y += (dy / dist) * 2.2 * (dt * 60);
          }
        }
        continue;
      }
      if (e.type === 'enemy' || e.type === 'asteroid') {
        e.pulse = (e.pulse || 0) + dt * 3.2;
        if (e.type === 'enemy' && plane) {
          const dx = plane.x - e.x;
          const dy = plane.y - e.y;
          const dist = Math.hypot(dx, dy) || 1;
          const wv = waveDef(currentWaveIdx);
          const bossMul = e.boss ? 2.15 : (e.helper ? 1.35 : 1);
          const chase = diff.enemySpeed * wv.speedMul * 0.012 * bossMul * (dt * 60);
          e.vx += (dx / dist) * chase;
          e.vy += (dy / dist) * chase;
          const es = Math.hypot(e.vx, e.vy);
          const maxE = diff.enemySpeed * wv.speedMul * (isPrek() ? 1.15 : 1.55) * (e.boss ? 2.4 : (e.helper ? 1.7 : 1));
          if (es > maxE) {
            e.vx = (e.vx / es) * maxE;
            e.vy = (e.vy / es) * maxE;
          }
          // Face travel / chase direction for silhouette drawing
          e.angle = Math.atan2(e.vy, e.vx);
          e.propSpin = (e.propSpin || 0) + dt * (e.kind === 'fpv' ? 14 : 4);
          if (e.canShoot && e.shootChance > 0) {
            e.shootCd = (e.shootCd || 1.5) - dt;
            if (e.shootCd <= 0 && dist < (e.boss ? 640 : 520)) {
              e.shootCd = e.boss ? 0.55 : (2.2 + Math.random() * 1.5);
              if (Math.random() < e.shootChance) {
                fireEnemyShot(e);
                if (e.boss) {
                  // Boss volley — extra angled shots
                  fireEnemyShot(e, -0.22);
                  fireEnemyShot(e, 0.22);
                }
              }
            }
          }
        }
        e.x += e.vx * (dt * 60);
        e.y += e.vy * (dt * 60);
        if (e.spin) e.angle = (e.angle || 0) + e.spin * (dt * 60);
        const er = e.r;
        if (e.x < er) { e.x = er; e.vx = Math.abs(e.vx); }
        if (e.x > arena - er) { e.x = arena - er; e.vx = -Math.abs(e.vx); }
        if (e.y < er) { e.y = er; e.vy = Math.abs(e.vy); }
        if (e.y > arena - er) { e.y = arena - er; e.vy = -Math.abs(e.vy); }
      }
    }

    // Soft enemy shots (slow glowing orbs)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx * (dt * 60);
      b.y += b.vy * (dt * 60);
      b.life -= dt;
      if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > arena + 40 || b.y > arena + 40) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (plane && plane.invuln <= 0 && Math.hypot(b.x - plane.x, b.y - plane.y) < b.r + plane.r - 2) {
        enemyBullets.splice(i, 1);
        hurtPlayer(1, b);
        if (flightDone) return;
      }
    }

    // Plane vs collectibles / stations / bumps
    for (let j = entities.length - 1; j >= 0; j--) {
      const e = entities[j];
      if (e.type === 'bg') continue;
      if (e.got) continue;
      const dist = Math.hypot(e.x - plane.x, e.y - plane.y);
      if (e.type === 'station') {
        if (dist < e.r + plane.r - 4) applyStation(e);
        continue;
      }
      if (dist < e.r + plane.r - diff.hitPad) {
        if (e.type === 'star') {
          e.got = true;
          addScore(e.points);
          collected.stars++;
          spawnSparks(e.x, e.y, '#ffd93d', 8);
          if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
          entities.splice(j, 1);
          setTimeout(() => {
            if (mode === 'fly' && !flightDone) entities.push(respawnTarget('star'));
          }, 1500);
          flavor = 'Star grabbed!';
        } else if ((e.type === 'enemy' || e.type === 'asteroid') && plane.invuln <= 0) {
          softBump(e);
          if (flightDone) return;
        }
      }
    }

    stepWingmen(dt, arena, diff);

    maintainWaveSpawns(dt);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * (dt * 60);
      p.y += p.vy * (dt * 60);
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function hurtPlayer(amount, knockFrom) {
    if (!plane || plane.invuln > 0 || flightDone) return;
    const dmg = Math.max(1, amount || 1);
    if (knockFrom) {
      const dx = plane.x - knockFrom.x;
      const dy = plane.y - knockFrom.y;
      const dist = Math.hypot(dx, dy) || 1;
      plane.vx += (dx / dist) * 3.2;
      plane.vy += (dy / dist) * 3.2;
      if (knockFrom.vx != null) {
        knockFrom.vx -= (dx / dist) * 1.4;
        knockFrom.vy -= (dy / dist) * 1.4;
      }
    }
    plane.invuln = HIT_INVULN;
    if (plane.shield > 0) {
      plane.shield -= 1;
      score = Math.max(0, score - 1);
      flavor = plane.shield > 0 ? '🛡️ Shield soaked it!' : '🛡️ Shield gone — watch your HP!';
      spawnSparks(plane.x, plane.y, '#74b9ff', 8);
    } else {
      plane.hp = Math.max(0, plane.hp - dmg);
      score = Math.max(0, score - 2);
      flavor = plane.hp > 0 ? `Ouch! HP ${plane.hp}/${plane.maxHp}` : 'Hull empty — limping home…';
      spawnSparks(plane.x, plane.y, '#ff7675', 10);
    }
    if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
    if (plane.hp <= 0) {
      finishFlight(true, 'ko');
    }
  }

  function softBump(e) {
    hurtPlayer(1, e);
  }

  function stepWingmen(dt, arena, diff) {
    if (!plane) { wingmen = []; wingmenLeft = 0; return; }
    if (wingmenLeft <= 0 || !wingmen.length) {
      if (wingmen.length && wingmenLeft <= 0) {
        flavor = '🛫 Friend jets peeling off — fly safe!';
        spawnSparks(plane.x, plane.y, '#55efc4', 10);
      }
      wingmen = [];
      wingmenLeft = 0;
      return;
    }
    wingmenLeft = Math.max(0, wingmenLeft - dt);
    const slots = [-48, 48];
    for (let i = 0; i < wingmen.length; i++) {
      const w = wingmen[i];
      const slot = slots[i % slots.length];
      const tx = plane.x + Math.cos(plane.angle + Math.PI / 2) * slot - Math.cos(plane.angle) * 28;
      const ty = plane.y + Math.sin(plane.angle + Math.PI / 2) * slot - Math.sin(plane.angle) * 28;
      w.vx += (tx - w.x) * 0.08 * (dt * 60);
      w.vy += (ty - w.y) * 0.08 * (dt * 60);
      w.vx *= Math.pow(0.9, dt * 60);
      w.vy *= Math.pow(0.9, dt * 60);
      w.x += w.vx * (dt * 60);
      w.y += w.vy * (dt * 60);
      w.angle = plane.angle;
      w.fireCd = (w.fireCd || 0) - dt;
      if (w.fireCd <= 0) {
        // Shoot nearest hostile
        let best = null;
        let bestD = 420;
        for (const e of entities) {
          if (e.type !== 'enemy' && e.type !== 'asteroid') continue;
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.x - w.x, e.y - w.y);
          if (d < bestD) { bestD = d; best = e; }
        }
        if (best) {
          const ang = Math.atan2(best.y - w.y, best.x - w.x);
          const spd = (diff.bulletSpeed || 10) * 0.85;
          bullets.push({
            x: w.x + Math.cos(ang) * (w.r + 4),
            y: w.y + Math.sin(ang) * (w.r + 4),
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 5,
            life: 1.0,
            color: w.color,
            damage: 1,
            seek: false,
            friendly: true
          });
          w.fireCd = 0.45;
        } else {
          w.fireCd = 0.25;
        }
      }
      // Soft clamp inside arena
      const er = w.r + 4;
      if (w.x < er) w.x = er;
      if (w.y < er) w.y = er;
      if (w.x > arena - er) w.x = arena - er;
      if (w.y > arena - er) w.y = arena - er;
    }
  }

  function fireEnemyShot(e, angOff) {
    if (!plane) return;
    const ang = Math.atan2(plane.y - e.y, plane.x - e.x) + (angOff || 0);
    const spd = e.boss ? 2.85 : 1.55;
    enemyBullets.push({
      x: e.x,
      y: e.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      r: e.boss ? 13 : 9,
      life: e.boss ? 3.6 : 3.2,
      color: e.boss ? '#a29bfe' : '#ff7675'
    });
  }

  function pushBullet(ang, speed, opts) {
    const o = opts || {};
    const lifeBase = plane.longBurst ? 1.55 : 1.1;
    const dmgBonus = 1 + (plane.damageLvl || 0) * 0.35;
    const rBonus = 5 + (plane.damageLvl || 0) * 1.5 + (o.big ? 4 : 0);
    bullets.push({
      x: plane.x + Math.cos(ang) * (plane.r + 6),
      y: plane.y + Math.sin(ang) * (plane.r + 6),
      vx: Math.cos(ang) * speed + plane.vx * 0.3,
      vy: Math.sin(ang) * speed + plane.vy * 0.3,
      r: o.r || rBonus,
      life: o.life || lifeBase,
      color: o.color || ship().color,
      damage: o.damage || dmgBonus,
      seek: !!o.seek
    });
  }

  function shoot() {
    if (!plane) return;
    const diff = difficulty();
    const sh = ship();
    const ang = plane.angle;
    let speed = diff.bulletSpeed;
    const multi = plane.multiLvl || 0;

    if (activeWeapon === 'missile') {
      speed = diff.bulletSpeed * 0.75;
      pushBullet(ang, speed, { color: '#fd79a8', r: 9 + (plane.damageLvl || 0), life: plane.longBurst ? 2.1 : 1.6, damage: 2 + (plane.damageLvl || 0), seek: true, big: true });
    } else if (activeWeapon === 'spread') {
      const spread = [-0.28, -0.12, 0, 0.12, 0.28];
      const use = multi >= 2 ? spread : (multi >= 1 ? [-0.22, 0, 0.22] : [-0.2, 0, 0.2]);
      use.forEach(off => pushBullet(ang + off, speed * 0.95, { color: '#a29bfe' }));
    } else if (activeWeapon === 'rapid') {
      pushBullet(ang, speed * 1.1, { color: '#ff7675', life: plane.longBurst ? 1.2 : 0.85 });
      if (multi >= 1) {
        pushBullet(ang - 0.08, speed * 1.05, { color: '#ff7675', life: 0.8 });
        pushBullet(ang + 0.08, speed * 1.05, { color: '#ff7675', life: 0.8 });
      }
    } else {
      // Normal + permanent multi-shot levels
      if (multi >= 2) {
        [-0.18, 0, 0.18].forEach(off => pushBullet(ang + off, speed, { color: sh.color }));
      } else if (multi >= 1) {
        [-0.12, 0.12].forEach(off => pushBullet(ang + off, speed, { color: sh.color }));
        pushBullet(ang, speed, { color: sh.color });
      } else {
        pushBullet(ang, speed, { color: sh.color });
      }
    }

    spawnSparks(
      plane.x + Math.cos(ang) * plane.r,
      plane.y + Math.sin(ang) * plane.r,
      sh.color,
      3
    );
    if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
  }

  function popDestroy(e) {
    spawnSparks(e.x, e.y, '#ffeaa7', 12);
    spawnSparks(e.x, e.y, '#74b9ff', 6);
    particles.push({
      x: e.x, y: e.y, vx: 0, vy: -0.6, life: 0.55,
      emoji: '💨', size: 22
    });
  }

  function spawnSparks(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.35,
        color,
        size: 3 + Math.random() * 3
      });
    }
  }

  function drawFly(ctx, w, h) {
    const wd = world();
    const arena = wd.arena;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, wd.skyTop);
    grad.addColorStop(1, wd.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Zoomed-out camera: scale world so more arena fits on screen
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(CAM_ZOOM, CAM_ZOOM);
    ctx.translate(-cam.x, -cam.y);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, arena, arena);

    ctx.strokeStyle = wd.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 14;
    ctx.strokeRect(4, 4, arena - 8, arena - 8);
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 28;
    ctx.strokeRect(0, 0, arena, arena);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let gx = 100; gx < arena; gx += 100) {
      for (let gy = 100; gy < arena; gy += 100) {
        ctx.beginPath();
        ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const e of entities) {
      if (e.type !== 'bg') continue;
      ctx.globalAlpha = 0.4;
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, e.x, e.y);
      ctx.globalAlpha = 1;
    }

    // Upgrade stations — glow + label
    for (const e of entities) {
      if (e.type !== 'station') continue;
      const pulse = 0.55 + Math.sin(e.glow || 0) * 0.25;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      ctx.fillStyle = e.color;
      ctx.globalAlpha = 0.2 * pulse;
      ctx.arc(0, 0, e.r + 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.55 * pulse;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, 0, -4);
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 3;
      ctx.strokeText(e.short || e.name, 0, e.r + 14);
      ctx.fillText(e.short || e.name, 0, e.r + 14);
      ctx.restore();
    }

    for (const e of entities) {
      if (e.type === 'bg' || e.type === 'station' || e.got) continue;
      const bobY = e.type === 'star' ? Math.sin(e.bob || 0) * 4 : 0;
      ctx.save();
      ctx.translate(e.x, e.y + bobY);
      if (e.type === 'enemy') {
        drawHostileDrone(ctx, e);
        if (e.maxHp && e.maxHp > 1) {
          const bw = e.r * 1.6;
          const pct = Math.max(0, e.hp / e.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(-bw / 2, -e.r - 14, bw, 6);
          ctx.fillStyle = e.boss ? '#ffeaa7' : '#55efc4';
          ctx.fillRect(-bw / 2, -e.r - 14, bw * pct, 6);
        }
      } else if (e.type === 'asteroid') {
        const tint = e.tint || enemyTint('asteroid', false);
        const pulse = 0.55 + Math.sin(e.pulse || 0) * 0.35;
        if (e.angle) ctx.rotate(e.angle);
        ctx.beginPath();
        ctx.fillStyle = tint.fill;
        ctx.globalAlpha = 0.4 + pulse * 0.3;
        ctx.arc(0, 0, e.r + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.fillStyle = '#636e72';
        ctx.strokeStyle = tint.ring;
        ctx.lineWidth = 3;
        ctx.moveTo(e.r * 0.9, 0);
        for (let i = 1; i <= 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const rr = e.r * (0.7 + ((i % 2) * 0.25));
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (e.maxHp && e.maxHp > 1) {
          const bw = e.r * 1.6;
          const pct = Math.max(0, e.hp / e.maxHp);
          ctx.rotate(-(e.angle || 0));
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(-bw / 2, -e.r - 14, bw, 6);
          ctx.fillStyle = '#55efc4';
          ctx.fillRect(-bw / 2, -e.r - 14, bw * pct, 6);
        }
      } else if (e.type === 'star') {
        // Clear 5-point gold star (not a plain bubble)
        const outer = e.r * 0.95;
        const inner = outer * 0.42;
        ctx.shadowColor = '#ffd93d';
        ctx.shadowBlur = 16;
        drawStarShape(ctx, outer, inner);
        ctx.fillStyle = '#ffd93d';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff6a5';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        drawStarShape(ctx, outer * 0.55, inner * 0.55);
        ctx.fillStyle = '#ffeaa7';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        drawStarShape(ctx, outer, inner);
        ctx.stroke();
      } else {
        ctx.font = `${Math.round(e.r * 1.7)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.emoji, 0, 0);
      }
      ctx.restore();
    }

    // Friend jets (wingmen)
    for (const w of wingmen) {
      drawFriendJet(ctx, w);
    }

    for (const b of bullets) {
      ctx.beginPath();
      ctx.fillStyle = b.color || '#ffeaa7';
      ctx.shadowColor = b.color || '#ffeaa7';
      ctx.shadowBlur = 8;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const b of enemyBullets) {
      ctx.beginPath();
      ctx.fillStyle = b.color || '#ff7675';
      ctx.shadowColor = b.color || '#ff7675';
      ctx.shadowBlur = 12;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const p of particles) {
      if (p.emoji) {
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.font = `${p.size || 18}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, p.x, p.y);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillStyle = p.color || '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    if (plane) {
      const blink = plane.invuln > 0 && (Math.floor(plane.invuln) % 6 < 3);
      if (!blink) drawPlaneTopDown(ctx, plane.x, plane.y, plane.angle, thrusting);
      if (plane.shield > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(116,185,255,0.65)';
        ctx.lineWidth = 3;
        ctx.arc(plane.x, plane.y, plane.r + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Wingmen timer chip near player
      if (wingmenLeft > 0) {
        ctx.save();
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const label = `🛫 ${Math.ceil(wingmenLeft)}s`;
        const tw = ctx.measureText(label).width + 14;
        ctx.fillRect(plane.x - tw / 2, plane.y - plane.r - 34, tw, 18);
        ctx.fillStyle = '#55efc4';
        ctx.fillText(label, plane.x, plane.y - plane.r - 21);
        ctx.restore();
      }
    }

    ctx.restore();

    drawMinimap(ctx, w, h, arena);

    if (plane) {
      const near = 140;
      if (plane.x < near || plane.y < near || plane.x > arena - near || plane.y > arena - near) {
        ctx.strokeStyle = 'rgba(255,217,61,0.35)';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);
      }
    }

    // Wave banner overlay (screen space)
    if (waveBannerT > 0) {
      const fadeIn = Math.min(1, (2.8 - waveBannerT) / 0.35 + 0.15);
      const fadeOut = Math.min(1, waveBannerT / 0.4);
      const alpha = Math.min(fadeIn, fadeOut);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(w * 0.15, h * 0.18, w * 0.7, 78);
      ctx.strokeStyle = waveBannerColor || '#55efc4';
      ctx.lineWidth = 4;
      ctx.strokeRect(w * 0.15, h * 0.18, w * 0.7, 78);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.fillText(waveBannerTitle || 'Wave', w / 2, h * 0.18 + 30);
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = waveBannerColor || '#55efc4';
      ctx.fillText(waveBannerSub || '', w / 2, h * 0.18 + 56);
      ctx.restore();
    }
  }

  function drawHostileDrone(ctx, e) {
    const tint = e.tint || enemyTint(e.kind || 'fpv', e.boss);
    const pulse = 0.55 + Math.sin(e.pulse || 0) * 0.35;
    const ang = e.angle || 0;
    ctx.save();
    // Soft hostile glow
    ctx.beginPath();
    ctx.fillStyle = tint.glow;
    ctx.globalAlpha = 0.2 + pulse * 0.25;
    ctx.arc(0, 0, e.r + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.rotate(ang);
    if (e.kind === 'shahed' || e.boss) {
      // Shahed-style delta / winged loitering munition
      const s = e.boss ? 1.35 : 1;
      ctx.fillStyle = e.boss ? '#2d3436' : '#1e272e';
      ctx.strokeStyle = tint.ring;
      ctx.lineWidth = e.boss ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(e.r * 1.15 * s, 0);
      ctx.lineTo(-e.r * 0.55 * s, e.r * 0.95 * s);
      ctx.lineTo(-e.r * 0.25 * s, 0);
      ctx.lineTo(-e.r * 0.55 * s, -e.r * 0.95 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Wing tips
      ctx.fillStyle = '#ff7675';
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.15 * s, e.r * 0.55 * s);
      ctx.lineTo(-e.r * 0.55 * s, e.r * 0.95 * s);
      ctx.lineTo(-e.r * 0.35 * s, e.r * 0.35 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.15 * s, -e.r * 0.55 * s);
      ctx.lineTo(-e.r * 0.55 * s, -e.r * 0.95 * s);
      ctx.lineTo(-e.r * 0.35 * s, -e.r * 0.35 * s);
      ctx.closePath();
      ctx.fill();
      // Nose cone
      ctx.fillStyle = e.boss ? '#ffeaa7' : '#dfe6e9';
      ctx.beginPath();
      ctx.moveTo(e.r * 1.15 * s, 0);
      ctx.lineTo(e.r * 0.55 * s, 5 * s);
      ctx.lineTo(e.r * 0.55 * s, -5 * s);
      ctx.closePath();
      ctx.fill();
      if (e.boss) {
        // Mothership twin engine glow
        ctx.fillStyle = '#a29bfe';
        ctx.globalAlpha = 0.7 + pulse * 0.3;
        ctx.beginPath();
        ctx.arc(-e.r * 0.45, 10, 5, 0, Math.PI * 2);
        ctx.arc(-e.r * 0.45, -10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      // FPV quadcopter — central body + 4 spinning props
      const body = e.r * 0.42;
      ctx.fillStyle = '#2d3436';
      ctx.strokeStyle = tint.ring;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.rect(-body, -body * 0.7, body * 2, body * 1.4);
      ctx.fill();
      ctx.stroke();
      // Arms
      const arm = e.r * 0.85;
      ctx.strokeStyle = '#636e72';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-arm, -arm); ctx.lineTo(arm, arm);
      ctx.moveTo(-arm, arm); ctx.lineTo(arm, -arm);
      ctx.stroke();
      // Props
      const spin = e.propSpin || 0;
      const props = [[-arm, -arm], [arm, -arm], [-arm, arm], [arm, arm]];
      props.forEach((p, i) => {
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(spin + i * 0.4);
        ctx.strokeStyle = '#74b9ff';
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, e.r * 0.38, e.r * 0.12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, e.r * 0.12, e.r * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#dfe6e9';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      // Camera dome
      ctx.fillStyle = '#00cec9';
      ctx.beginPath();
      ctx.arc(body * 0.55, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }


  /** Classic 5-point star silhouette (collectible pickup). */
  function drawStarShape(ctx, outerR, innerR) {
    const spikes = 5;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(0, -outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }

  function drawFriendJet(ctx, w) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.angle || 0);
    // Friendly teal/blue fighter silhouette
    ctx.fillStyle = w.color || '#55efc4';
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, 8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-4, 12);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-4, -12);
    ctx.closePath();
    ctx.fill();
    // Soft friendly ring so kids know "good guy"
    ctx.rotate(-(w.angle || 0));
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(85,239,196,0.55)';
    ctx.lineWidth = 2;
    ctx.arc(0, 0, w.r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlaneTopDown(ctx, x, y, angle, isThrusting) {
    const sh = ship();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (isThrusting) {
      // Exhaust flame — visual proof thrust is firing
      const flicker = 0.75 + Math.random() * 0.5;
      ctx.fillStyle = '#ffeaa7';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(-18 - 10 * flicker, 0);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff7675';
      ctx.beginPath();
      ctx.moveTo(-10, -3);
      ctx.lineTo(-14 - 6 * flicker, 0);
      ctx.lineTo(-10, 3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = sh.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, 11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-5, 16);
    ctx.lineTo(-9, 0);
    ctx.lineTo(-5, -16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(4, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(-angle);
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sh.emoji, 0, -22);
    ctx.restore();
  }

  function drawMinimap(ctx, w, h, arena) {
    const mw = 78;
    const mh = 78;
    const mx = w - mw - 10;
    const my = 10;
    const scale = mw / arena;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(mx, my, mw, mh);
    for (const e of entities) {
      if (e.type === 'bg' || e.got) continue;
      if (e.type === 'station') {
        ctx.fillStyle = e.color || '#fff';
        ctx.beginPath();
        ctx.arc(mx + e.x * scale, my + e.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = e.type === 'star' ? '#ffd93d' : (e.type === 'enemy' ? '#ff7675' : '#dfe6e9');
      ctx.fillRect(mx + e.x * scale - 1.5, my + e.y * scale - 1.5, 3, 3);
    }
    for (const w of wingmen) {
      ctx.fillStyle = w.color || '#55efc4';
      ctx.beginPath();
      ctx.arc(mx + w.x * scale, my + w.y * scale, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (plane) {
      ctx.fillStyle = ship().color;
      ctx.beginPath();
      ctx.arc(mx + plane.x * scale, my + plane.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function finishFlight(success, reason) {
    if (flightDone) return;
    flightDone = true;
    stopLoop();

    let earned = 0;
    if (collected.kills >= 3) earned += 1;
    if (collected.kills >= 8) earned += 1;
    if (collected.stars >= 3) earned += 1;
    if (score >= 80) earned += 1;
    if (score >= 150) earned += 1;
    earned = Math.max(success ? 1 : 0, Math.min(5, earned));

    const timeup = reason === 'timeup';
    const ko = reason === 'ko';
    const nextUnlock = worldIdx + 1;
    const pointsGained = Math.max(0, Math.round(pointsEarnedRun || score));
    // Time-up still locks flight (question gate). HP=0 ends the run but does NOT lock.
    const didOk = !!success || ko;

    const progressPatch = {
      completedDelta: didOk ? 1 : 0,
      score,
      pointsGained,
      starsEarned: earned,
      worldId: worldIdx,
      unlockWorld: (didOk && !ko && nextUnlock < WORLDS.length) ? nextUnlock : null,
      rings: collected.kills,
      stars: collected.stars,
      kills: collected.kills,
      cleared: collected.kills >= 5 || collected.stars >= 3,
      timeup: !!timeup,
      lockFlight: !!timeup,
      shipId,
      upgrades: {
        speed: !!equippedPerks.speed,
        fire: false,
        shield: !!equippedPerks.shield,
        magnet: !!equippedPerks.magnet,
        burst: !!equippedPerks.burst,
        wingmen: !!equippedPerks.wingmen
      }
    };

    showPanel('results');
    const title = $('#flight-results-title');
    const body = $('#flight-results-body');
    const starsEl = $('#flight-results-stars');
    const emojiEl = $('#flight-results-emoji');
    const gate = $('#flight-results-gate');
    const retry = $('#flight-retry');

    if (emojiEl) emojiEl.textContent = timeup ? '⏰' : (ko ? '🛟' : '🦊');
    if (title) {
      title.textContent = timeup
        ? "Fly time's up!"
        : (ko
          ? 'Limp home — hull empty!'
          : (progressPatch.cleared ? 'Flight complete!' : 'Nice flying, pilot!'));
    }
    if (body) {
      body.textContent =
        `${world().emoji} ${world().name} · ${waveDef(currentWaveIdx).title} · Score ${score} · Hits ${collected.kills} · Stars ${collected.stars}` +
        ` · 🪙 +${pointsGained} hangar points` +
        (progressPatch.unlockWorld != null ? ' · New world unlocked!' : '') +
        (timeup ? ' · Session saved.' : '') +
        (ko ? ' · Brief invuln on hits — try again!' : '');
    }
    if (starsEl) starsEl.textContent = '⭐'.repeat(earned) || '💫';

    if (gate) gate.classList.toggle('hidden', !timeup);
    if (retry) {
      retry.classList.toggle('hidden', !!timeup);
      retry.textContent = ko ? '🚀 Try again' : '🚀 Fly again';
    }

    // Timer expiry: persist lock immediately (same channel as hangar saves).
    // Limp-home (ko) must NOT lock — only timeup does.
    if (timeup) {
      saveProgressPatch({ flightLocked: true, questionsTowardUnlock: 0 });
      const gateMsg = $('#flight-results-gate-msg');
      if (gateMsg) {
        gateMsg.textContent =
          `Get ${QUESTIONS_TO_UNLOCK} questions correct in Science (or Math / Reading / Spelling) to unlock more flight. Only correct answers count!`;
      }
      const gateProg = $('#flight-results-gate-progress');
      if (gateProg) gateProg.textContent = `Correct: 0/${QUESTIONS_TO_UNLOCK}`;
    }

    if (global.KidsAudio && success && !ko && KidsAudio.win) KidsAudio.win();
    else if (global.KidsAudio && KidsAudio.correct) KidsAudio.correct();

    if (hooks.onComplete) hooks.onComplete(progressPatch);

    setPrompt(
      timeup
        ? `Fly time's up! Get ${QUESTIONS_TO_UNLOCK} questions correct in Science (or Math / Reading / Spelling) to unlock more flight.`
        : (ko
          ? `Hull empty at ${waveDef(currentWaveIdx).title}. Score saved — launch again when ready!`
          : `Great run! +${pointsGained} points — spend them in the hangar!`)
    );
  }

  function setFlightKey(e, down) {
    // Store both code and key so thrust never depends on keyboard layout / shift.
    if (e.code) keys[e.code] = down;
    if (e.key) keys[e.key] = down;
    if (e.code === 'ArrowUp' || e.key === 'ArrowUp' || e.code === 'KeyW') keys.thrust = down;
    if (e.code === 'ArrowDown' || e.key === 'ArrowDown' || e.code === 'KeyS') keys.brake = down;
  }

  function onKeyDown(e) {
    // Record during countdown too so holding W/↑ at GO actually thrusts.
    if (mode !== 'fly' && mode !== 'countdown') return;
    setFlightKey(e, true);
    const block = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'];
    if (block.includes(e.key) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
      e.preventDefault();
    }
    if (mode === 'fly' && (e.key === ' ' || e.code === 'Space')) {
      fireHeld = true;
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    if (mode !== 'fly' && mode !== 'countdown') return;
    setFlightKey(e, false);
    if (e.key === ' ' || e.code === 'Space') fireHeld = false;
  }

  function onWindowBlur() {
    keys = {};
    pad = { up: false, down: false, left: false, right: false, fire: false };
    fireHeld = false;
    thrusting = false;
  }

  function bindPad() {
    const root = $('#flight-dpad');
    if (!root) return;
    root.querySelectorAll('[data-dir]').forEach(btn => {
      const dir = btn.dataset.dir;
      const set = (v) => { pad[dir] = v; };
      btn.addEventListener('pointerdown', e => { e.preventDefault(); set(true); try { btn.setPointerCapture(e.pointerId); } catch (err) { /* */ } });
      btn.addEventListener('pointerup', () => set(false));
      btn.addEventListener('pointercancel', () => set(false));
      btn.addEventListener('lostpointercapture', () => set(false));
    });
    const fireBtn = $('#flight-fire');
    if (fireBtn) {
      const setFire = (v) => { pad.fire = v; fireHeld = v; };
      fireBtn.addEventListener('pointerdown', e => { e.preventDefault(); setFire(true); try { fireBtn.setPointerCapture(e.pointerId); } catch (err) { /* */ } });
      fireBtn.addEventListener('pointerup', () => setFire(false));
      fireBtn.addEventListener('pointercancel', () => setFire(false));
      fireBtn.addEventListener('lostpointercapture', () => setFire(false));
    }
  }

  function goSubject(subject) {
    if (hooks.onOpenSubject) hooks.onOpenSubject(subject);
  }

  function bindSubjectLinks(root) {
    $$(root ? root + ' [data-flight-subject]' : '[data-flight-subject]').forEach(btn => {
      if (btn.dataset.boundFlight) return;
      btn.dataset.boundFlight = '1';
      btn.addEventListener('click', () => {
        if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
        goSubject(btn.dataset.flightSubject);
      });
    });
  }

  function bindUi() {
    if (bound) return;
    bound = true;
    $('#flight-start-flight')?.addEventListener('click', () => {
      if (isLocked()) {
        renderMenu();
        return;
      }
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      beginCountdown();
    });
    $('#flight-back-menu')?.addEventListener('click', () => {
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      renderMenu();
    });
    $('#flight-retry')?.addEventListener('click', () => {
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      if (isLocked()) {
        renderMenu();
        return;
      }
      startBuild();
    });
    $('#flight-again')?.addEventListener('click', () => {
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      // Always go to menu — renderMenu enforces lock (worlds disabled + banner).
      renderMenu();
    });
    bindPad();
    bindSubjectLinks();
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onWindowBlur);
  }

  function start(g, h) {
    grade = g || 'grade2';
    hooks = h || {};
    bindUi();
    bindSubjectLinks();
    const screen = $('#screen-flight');
    if (screen) {
      screen.classList.remove('grade-prek', 'grade-grade2', 'grade-grade3');
      screen.classList.add('grade-' + grade);
    }
    renderMenu();
  }

  function stop() {
    stopLoop();
    mode = 'menu';
    keys = {};
    pad = { up: false, down: false, left: false, right: false, fire: false };
    fireHeld = false;
    thrusting = false;
    wingmen = [];
    wingmenLeft = 0;
    flightDone = true;
    const screen = $('#screen-flight');
    if (screen) screen.classList.remove('flight-playing');
  }

  function notifyGateAnswer(subject) {
    const name = String(subject || '');
    const ok = GATE_SUBJECTS.some(s => s.toLowerCase() === name.toLowerCase());
    if (!ok) return null;
    if (!hooks.onGateAnswer) return null;
    return hooks.onGateAnswer(name);
  }

  function refreshLockUi() {
    if (mode === 'menu') updateLockBanner();
    if (mode === 'results') {
      const gate = $('#flight-results-gate');
      const locked = isLocked();
      if (gate) gate.classList.toggle('hidden', !locked);
      if (locked) {
        const done = questionsDone();
        const gateProg = $('#flight-results-gate-progress');
        if (gateProg) gateProg.textContent = `Correct: ${done}/${QUESTIONS_TO_UNLOCK}`;
        const gateMsg = $('#flight-results-gate-msg');
        if (gateMsg) {
          gateMsg.textContent =
            `Get ${QUESTIONS_TO_UNLOCK} questions correct in Science (or Math / Reading / Spelling) to unlock more flight. Only correct answers count! Correct: ${done}/${QUESTIONS_TO_UNLOCK}.`;
        }
        const retry = $('#flight-retry');
        if (retry) retry.classList.add('hidden');
      }
    }
    updatePointsUi();
  }

  global.FlightGame = {
    WORLDS,
    SHIPS,
    UPGRADES,
    WEAPON_SHOP,
    PERK_SHOP,
    STATIONS,
    SESSION_SECONDS,
    QUESTIONS_TO_UNLOCK,
    GATE_SUBJECTS,
    CAM_ZOOM,
    start,
    stop,
    getMode: () => mode,
    isLocked,
    questionsDone,
    notifyGateAnswer,
    refreshLockUi,
    renderMenu
  };
})(window);
