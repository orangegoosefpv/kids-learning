/* Space Fox Flyer — top-down arena shooter
   Pick a ship + boosts, 7-min timed flights, soft targets (no gore).
   Original kid-friendly game (emoji/canvas art). No third-party IP assets. */
(function (global) {
  const SESSION_SECONDS = 7 * 60;
  const QUESTIONS_TO_UNLOCK = 10;
  const GATE_SUBJECTS = ['Math', 'Reading', 'Spelling', 'Science'];

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
      arena: 1600,
      enemies: 8,
      asteroids: 5,
      stars: 6,
      enemyEmoji: '🛸',
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
      arena: 1800,
      enemies: 10,
      asteroids: 8,
      stars: 8,
      enemyEmoji: '👾',
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
      arena: 1700,
      enemies: 9,
      asteroids: 6,
      stars: 7,
      enemyEmoji: '🎈',
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
      tip: 'Easy turns · great starter',
      turn: 1.12,
      thrust: 0.95,
      fire: 1
    },
    {
      id: 'zippy',
      name: 'Zippy Dart',
      emoji: '✈️',
      color: '#fd79a8',
      tip: 'Speedy · zip around!',
      turn: 1,
      thrust: 1.2,
      fire: 1.05
    },
    {
      id: 'foxjet',
      name: 'Fox Jet',
      emoji: '🦊',
      color: '#ff9f43',
      tip: 'Fox power · balanced blast',
      turn: 1.05,
      thrust: 1.05,
      fire: 1.15
    }
  ];

  const UPGRADES = [
    { id: 'speed', label: 'Speed', emoji: '⚡', tip: 'Zoom faster' },
    { id: 'fire', label: 'Fire rate', emoji: '🔥', tip: 'Shoot quicker' },
    { id: 'shield', label: 'Shield', emoji: '🛡️', tip: 'Extra soft bump buffer' }
  ];

  let grade = 'grade2';
  let hooks = {};
  let mode = 'menu'; // menu | build | countdown | fly | results
  let worldIdx = 0;
  let shipId = 'foxjet';
  let upgrades = { speed: false, fire: false, shield: false };
  let raf = 0;
  let keys = {};
  let pad = { up: false, down: false, left: false, right: false, fire: false };
  let plane = null;
  let bullets = [];
  let entities = [];
  let particles = [];
  let score = 0;
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
    if (grade === 'prek') {
      return { thrust: 0.22, turn: 0.08, maxSpeed: 4.2, fireMs: 320, bulletSpeed: 9, enemySpeed: 0.9, hitPad: 10 };
    }
    if (grade === 'grade3') {
      return { thrust: 0.28, turn: 0.1, maxSpeed: 5.6, fireMs: 220, bulletSpeed: 11, enemySpeed: 1.5, hitPad: 4 };
    }
    return { thrust: 0.25, turn: 0.09, maxSpeed: 5, fireMs: 260, bulletSpeed: 10, enemySpeed: 1.2, hitPad: 6 };
  }

  function upgradeCount() {
    return (upgrades.speed ? 1 : 0) + (upgrades.fire ? 1 : 0) + (upgrades.shield ? 1 : 0);
  }

  function progress() {
    return (hooks.getProgress && hooks.getProgress()) || defaultProgress();
  }

  function defaultProgress() {
    return {
      completed: 0,
      bestScore: 0,
      unlockedWorlds: [0],
      questionsTowardUnlock: 0,
      flightLocked: false,
      lastShipId: 'foxjet',
      lastUpgrades: { speed: false, fire: false, shield: false }
    };
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

  function updateLockBanner() {
    const banner = $('#flight-lock-banner');
    if (!banner) return;
    const locked = isLocked();
    banner.classList.toggle('hidden', !locked);
    const done = questionsDone();
    const msg = $('#flight-lock-msg');
    if (msg) {
      msg.textContent = locked
        ? `Answer ${QUESTIONS_TO_UNLOCK} questions in Science (or Math / Reading / Spelling) to unlock more flight. Progress: ${done} / ${QUESTIONS_TO_UNLOCK}.`
        : '';
    }
    const progEl = $('#flight-lock-progress');
    if (progEl) {
      progEl.textContent = `${done} / ${QUESTIONS_TO_UNLOCK}`;
      progEl.style.setProperty('--pct', String((done / QUESTIONS_TO_UNLOCK) * 100));
    }
    const worlds = $('#flight-worlds');
    if (worlds) worlds.classList.toggle('flight-worlds-locked', locked);
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
        ? 'Finish 10 questions to fly again!'
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
      ? `Fly time's up! Answer ${QUESTIONS_TO_UNLOCK} questions (Science / Math / Reading / Spelling) to unlock more flight.`
      : (isPrek()
        ? 'Pick a world, choose a ship, then blast soft targets!'
        : 'Top-down flyer · pick a ship · blast drones & rocks · 7 minutes!');
    setPrompt(tip);
    const badge = $('#flight-grade-tip');
    if (badge) {
      badge.classList.toggle('hidden', grade !== 'grade2');
      badge.textContent = '📗 Grade 2 favorite — top-down fox flyer with blasters!';
    }
  }

  function startBuild() {
    if (isLocked()) {
      renderMenu();
      return;
    }
    const prog = progress();
    if (prog.lastShipId && SHIPS.some(s => s.id === prog.lastShipId)) shipId = prog.lastShipId;
    const lu = prog.lastUpgrades || {};
    upgrades = {
      speed: !!lu.speed,
      fire: !!lu.fire,
      shield: !!lu.shield
    };
    // Cap to 2 if somehow more
    while (upgradeCount() > 2) {
      if (upgrades.shield) upgrades.shield = false;
      else if (upgrades.fire) upgrades.fire = false;
      else upgrades.speed = false;
    }
    showPanel('build');
    stopLoop();
    const w = world();
    setPrompt(`${w.emoji} ${w.name}: pick a ship and up to 2 boosts, then Launch!`);
    renderShips();
    renderUpgrades();
    updateLoadoutSummary();
  }

  function renderShips() {
    const row = $('#flight-ships');
    if (!row) return;
    row.innerHTML = SHIPS.map(s =>
      `<button type="button" class="flight-ship-btn ${s.id === shipId ? 'selected' : ''}" data-ship="${s.id}" aria-pressed="${s.id === shipId}">
        <span class="flight-ship-emoji">${s.emoji}</span>
        <span class="flight-ship-name">${s.name}</span>
        <span class="flight-ship-tip">${s.tip}</span>
      </button>`
    ).join('');
    row.querySelectorAll('[data-ship]').forEach(btn => {
      btn.addEventListener('click', () => {
        shipId = btn.dataset.ship;
        if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
        renderShips();
        updateLoadoutSummary();
      });
    });
  }

  function renderUpgrades() {
    const row = $('#flight-upgrades');
    if (!row) return;
    row.innerHTML = UPGRADES.map(u => {
      const on = !!upgrades[u.id];
      return `<button type="button" class="flight-upgrade-btn ${on ? 'selected' : ''}" data-upgrade="${u.id}" aria-pressed="${on}">
        <span class="flight-upgrade-emoji">${u.emoji}</span>
        <span class="flight-upgrade-name">${u.label}</span>
        <span class="flight-upgrade-tip">${u.tip}</span>
      </button>`;
    }).join('');
    row.querySelectorAll('[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.upgrade;
        if (upgrades[id]) {
          upgrades[id] = false;
        } else if (upgradeCount() < 2) {
          upgrades[id] = true;
        } else {
          setPrompt('Pick only 2 boosts — tap one to turn it off first!');
          if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
          return;
        }
        if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
        renderUpgrades();
        updateLoadoutSummary();
      });
    });
  }

  function updateLoadoutSummary() {
    const s = ship();
    const boosts = UPGRADES.filter(u => upgrades[u.id]).map(u => u.emoji + ' ' + u.label);
    const preview = $('#flight-plane-preview');
    if (preview) preview.textContent = s.emoji + (boosts.length ? ' ' + boosts.map(b => b.split(' ')[0]).join('') : '');
    const sum = $('#flight-loadout-summary');
    if (sum) {
      sum.textContent = boosts.length
        ? `${s.name} · ${boosts.join(' · ')}`
        : `${s.name} · no boosts (still fun!)`;
    }
    const status = $('#flight-build-status');
    if (status) {
      status.textContent = boosts.length
        ? `✅ ${s.name} + ${boosts.length} boost${boosts.length > 1 ? 's' : ''}`
        : `✅ ${s.name} ready — boosts optional`;
    }
    const startBtn = $('#flight-start-flight');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.classList.add('ready');
    }
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
    prepareArena();
    updateHud();
    setPrompt('Get ready…');
    showPanel('countdown');
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
    const arena = wd.arena;
    const maxSpeed = diff.maxSpeed * sh.thrust * (upgrades.speed ? 1.28 : 1);
    const fireMs = diff.fireMs / (sh.fire * (upgrades.fire ? 1.45 : 1));
    plane = {
      x: arena / 2,
      y: arena / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      alive: true,
      invuln: 0,
      shield: upgrades.shield ? 3 : 1,
      maxSpeed,
      fireMs,
      turn: diff.turn * sh.turn,
      thrust: diff.thrust * sh.thrust * (upgrades.speed ? 1.2 : 1),
      r: isPrek() ? 26 : 22
    };
    bullets = [];
    particles = [];
    score = 0;
    collected = { stars: 0, kills: 0 };
    flightDone = false;
    fireCooldown = 0;
    flavor = pickFlavor();
    entities = spawnArena(wd, arena);
    cam = { x: plane.x, y: plane.y };
    keys = {};
    pad = { up: false, down: false, left: false, right: false, fire: false };
    fireHeld = false;
  }

  function beginFlight() {
    showPanel('fly');
    const canvas = $('#flight-fly-canvas');
    if (!canvas) return;
    sizeCanvas(canvas);
    if (!plane) prepareArena();
    sessionLeft = SESSION_SECONDS;
    sessionStartedAt = performance.now();
    lastTs = performance.now();
    setPrompt(`${world().emoji} ${world().name} · ${flavor}`);
    updateHud();
    stopLoop();
    raf = requestAnimationFrame(tickFly);
  }

  function pickFlavor() {
    const lines = [
      'Blast those soft targets!',
      'Fox power — keep flying!',
      'Stars ahead, pilot!',
      'Bounce off the soft walls!',
      'Zap drones · grab stars!'
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function spawnArena(wd, arena) {
    const list = [];
    const margin = 80;
    const rand = (a, b) => a + Math.random() * (b - a);
    const awayFromCenter = () => {
      let x, y, tries = 0;
      do {
        x = rand(margin, arena - margin);
        y = rand(margin, arena - margin);
        tries++;
      } while (tries < 20 && Math.hypot(x - arena / 2, y - arena / 2) < 180);
      return { x, y };
    };

    const enemyN = isPrek() ? Math.max(4, wd.enemies - 3) : wd.enemies;
    for (let i = 0; i < enemyN; i++) {
      const p = awayFromCenter();
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.6 + Math.random() * 1.1;
      list.push({
        type: 'enemy',
        x: p.x,
        y: p.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: isPrek() ? 28 : 24,
        emoji: wd.enemyEmoji,
        hp: 1,
        points: 15
      });
    }
    const rockN = isPrek() ? Math.max(3, wd.asteroids - 2) : wd.asteroids;
    for (let i = 0; i < rockN; i++) {
      const p = awayFromCenter();
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.35 + Math.random() * 0.7;
      list.push({
        type: 'asteroid',
        x: p.x,
        y: p.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 20 + Math.random() * 16,
        emoji: wd.rockEmoji,
        hp: 1,
        points: 10,
        spin: (Math.random() - 0.5) * 0.04
      });
    }
    for (let i = 0; i < wd.stars; i++) {
      const p = awayFromCenter();
      list.push({
        type: 'star',
        x: p.x,
        y: p.y,
        r: isPrek() ? 26 : 22,
        emoji: wd.starEmoji,
        got: false,
        points: 25,
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
    const margin = 80;
    let x, y, tries = 0;
    do {
      x = margin + Math.random() * (arena - margin * 2);
      y = margin + Math.random() * (arena - margin * 2);
      tries++;
    } while (tries < 25 && plane && Math.hypot(x - plane.x, y - plane.y) < 220);
    const ang = Math.random() * Math.PI * 2;
    if (type === 'enemy') {
      const spd = 0.6 + Math.random() * 1.1;
      return {
        type: 'enemy',
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: isPrek() ? 28 : 24,
        emoji: wd.enemyEmoji,
        hp: 1,
        points: 15
      };
    }
    if (type === 'asteroid') {
      const spd = 0.35 + Math.random() * 0.7;
      return {
        type: 'asteroid',
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 20 + Math.random() * 16,
        emoji: wd.rockEmoji,
        hp: 1,
        points: 10,
        spin: (Math.random() - 0.5) * 0.04
      };
    }
    return {
      type: 'star',
      x, y,
      r: isPrek() ? 26 : 22,
      emoji: wd.starEmoji,
      got: false,
      points: 25,
      bob: Math.random() * Math.PI * 2
    };
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
      t.parentElement && t.parentElement.classList.toggle('flight-timer-low', sessionLeft <= 60);
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

    stepPhysics(w, h, dt);
    drawFly(ctx, w, h);
    updateHud();

    if (!flightDone) raf = requestAnimationFrame(tickFly);
  }

  function wantsFire() {
    return !!(keys[' '] || keys.Spacebar || pad.fire || fireHeld);
  }

  function stepPhysics(viewW, viewH, dt) {
    const wd = world();
    const arena = wd.arena;
    const diff = difficulty();
    const turnL = keys.ArrowLeft || keys.a || keys.A || pad.left;
    const turnR = keys.ArrowRight || keys.d || keys.D || pad.right;
    const thrust = keys.ArrowUp || keys.w || keys.W || pad.up;
    const brake = keys.ArrowDown || keys.s || keys.S || pad.down;

    if (turnL) plane.angle -= plane.turn * (dt * 60);
    if (turnR) plane.angle += plane.turn * (dt * 60);

    if (thrust) {
      plane.vx += Math.cos(plane.angle) * plane.thrust * (dt * 60);
      plane.vy += Math.sin(plane.angle) * plane.thrust * (dt * 60);
    }
    if (brake) {
      plane.vx *= Math.pow(0.92, dt * 60);
      plane.vy *= Math.pow(0.92, dt * 60);
      // gentle reverse
      plane.vx -= Math.cos(plane.angle) * plane.thrust * 0.35 * (dt * 60);
      plane.vy -= Math.sin(plane.angle) * plane.thrust * 0.35 * (dt * 60);
    }

    // Drag
    plane.vx *= Math.pow(0.985, dt * 60);
    plane.vy *= Math.pow(0.985, dt * 60);

    const spd = Math.hypot(plane.vx, plane.vy);
    if (spd > plane.maxSpeed) {
      plane.vx = (plane.vx / spd) * plane.maxSpeed;
      plane.vy = (plane.vy / spd) * plane.maxSpeed;
    }

    plane.x += plane.vx * (dt * 60);
    plane.y += plane.vy * (dt * 60);

    // Soft walls — bounce, never fall off
    const padWall = plane.r + 8;
    if (plane.x < padWall) { plane.x = padWall; plane.vx = Math.abs(plane.vx) * 0.55; }
    if (plane.x > arena - padWall) { plane.x = arena - padWall; plane.vx = -Math.abs(plane.vx) * 0.55; }
    if (plane.y < padWall) { plane.y = padWall; plane.vy = Math.abs(plane.vy) * 0.55; }
    if (plane.y > arena - padWall) { plane.y = arena - padWall; plane.vy = -Math.abs(plane.vy) * 0.55; }

    if (plane.invuln > 0) plane.invuln -= dt * 60;

    // Camera follow
    cam.x += (plane.x - cam.x) * Math.min(1, 0.12 * (dt * 60));
    cam.y += (plane.y - cam.y) * Math.min(1, 0.12 * (dt * 60));

    // Fire
    fireCooldown = Math.max(0, fireCooldown - dt * 1000);
    if (wantsFire() && fireCooldown <= 0) {
      shoot();
      fireCooldown = plane.fireMs;
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * (dt * 60);
      b.y += b.vy * (dt * 60);
      b.life -= dt;
      if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > arena + 40 || b.y > arena + 40) {
        bullets.splice(i, 1);
        continue;
      }
      // Hit enemies / asteroids
      for (let j = entities.length - 1; j >= 0; j--) {
        const e = entities[j];
        if (e.type !== 'enemy' && e.type !== 'asteroid') continue;
        if (e.hp <= 0) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
          e.hp -= 1;
          bullets.splice(i, 1);
          if (e.hp <= 0) {
            popDestroy(e);
            score += e.points;
            collected.kills++;
            const kind = e.type;
            entities.splice(j, 1);
            // Respawn after a beat so arena stays lively
            setTimeout(() => {
              if (mode === 'fly' && !flightDone) entities.push(respawnTarget(kind));
            }, 900 + Math.random() * 1200);
            if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
            flavor = kind === 'enemy' ? 'Drone down — nice shot!' : 'Rock blasted — soft pop!';
          } else {
            spawnSparks(e.x, e.y, '#ffeaa7', 4);
          }
          break;
        }
      }
    }

    // Move enemies / asteroids with soft walls
    for (const e of entities) {
      if (e.type === 'bg' || e.type === 'star') {
        if (e.type === 'star') e.bob = (e.bob || 0) + dt * 3;
        continue;
      }
      if (e.type === 'enemy' || e.type === 'asteroid') {
        // Mild chase for enemies
        if (e.type === 'enemy' && plane) {
          const dx = plane.x - e.x;
          const dy = plane.y - e.y;
          const dist = Math.hypot(dx, dy) || 1;
          const chase = diff.enemySpeed * 0.015 * (dt * 60);
          e.vx += (dx / dist) * chase;
          e.vy += (dy / dist) * chase;
          const es = Math.hypot(e.vx, e.vy);
          const maxE = diff.enemySpeed * (isPrek() ? 1.4 : 2.2);
          if (es > maxE) {
            e.vx = (e.vx / es) * maxE;
            e.vy = (e.vy / es) * maxE;
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

    // Plane vs collectibles / bumps
    for (let j = entities.length - 1; j >= 0; j--) {
      const e = entities[j];
      if (e.type === 'bg') continue;
      if (e.got) continue;
      const dist = Math.hypot(e.x - plane.x, e.y - plane.y);
      if (dist < e.r + plane.r - diff.hitPad) {
        if (e.type === 'star') {
          e.got = true;
          score += e.points;
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
        }
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * (dt * 60);
      p.y += p.vy * (dt * 60);
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function softBump(e) {
    // Bounce plane away; spend shield pip if any
    const dx = plane.x - e.x;
    const dy = plane.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    plane.vx += (dx / dist) * 3.5;
    plane.vy += (dy / dist) * 3.5;
    e.vx -= (dx / dist) * 1.5;
    e.vy -= (dy / dist) * 1.5;
    plane.invuln = 40;
    if (plane.shield > 0) {
      plane.shield -= 1;
      score = Math.max(0, score - 1);
      flavor = plane.shield > 0 ? 'Shield soaked it — keep flying!' : 'Shield gone — still soft bumps only!';
    } else {
      score = Math.max(0, score - 3);
      flavor = 'Whoops — soft bump! Keep flying!';
    }
    spawnSparks(plane.x, plane.y, '#a29bfe', 6);
    if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
  }

  function shoot() {
    if (!plane) return;
    const diff = difficulty();
    const sh = ship();
    const ang = plane.angle;
    const speed = diff.bulletSpeed;
    bullets.push({
      x: plane.x + Math.cos(ang) * (plane.r + 6),
      y: plane.y + Math.sin(ang) * (plane.r + 6),
      vx: Math.cos(ang) * speed + plane.vx * 0.3,
      vy: Math.sin(ang) * speed + plane.vy * 0.3,
      r: 5,
      life: 1.1,
      color: sh.color
    });
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
    // Soft “poof” emoji particle
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

    const ox = w / 2 - cam.x;
    const oy = h / 2 - cam.y;

    // Arena floor tint
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, arena, arena);

    // Soft wall glow
    ctx.strokeStyle = wd.accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 10;
    ctx.strokeRect(4, 4, arena - 8, arena - 8);
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 22;
    ctx.strokeRect(0, 0, arena, arena);
    ctx.globalAlpha = 1;

    // Grid dots for orientation
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let gx = 80; gx < arena; gx += 80) {
      for (let gy = 80; gy < arena; gy += 80) {
        ctx.beginPath();
        ctx.arc(gx, gy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Background bits
    for (const e of entities) {
      if (e.type !== 'bg') continue;
      ctx.globalAlpha = 0.4;
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, e.x, e.y);
      ctx.globalAlpha = 1;
    }

    // Stars / enemies / asteroids
    for (const e of entities) {
      if (e.type === 'bg' || e.got) continue;
      const bobY = e.type === 'star' ? Math.sin(e.bob || 0) * 4 : 0;
      ctx.save();
      ctx.translate(e.x, e.y + bobY);
      if (e.angle) ctx.rotate(e.angle);
      ctx.font = `${e.type === 'asteroid' ? Math.round(e.r * 1.6) : 30}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, 0, 0);
      if (e.type === 'star') {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bullets
    for (const b of bullets) {
      ctx.beginPath();
      ctx.fillStyle = b.color || '#ffeaa7';
      ctx.shadowColor = b.color || '#ffeaa7';
      ctx.shadowBlur = 8;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Particles
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

    // Plane — faces travel/aim direction (top-down)
    if (plane) {
      const blink = plane.invuln > 0 && (Math.floor(plane.invuln) % 6 < 3);
      if (!blink) drawPlaneTopDown(ctx, plane.x, plane.y, plane.angle);
      // Shield ring
      if (plane.shield > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(116,185,255,0.65)';
        ctx.lineWidth = 3;
        ctx.arc(plane.x, plane.y, plane.r + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    // Mini-map
    drawMinimap(ctx, w, h, arena);

    // Edge vignette hint when near wall
    if (plane) {
      const near = 120;
      if (plane.x < near || plane.y < near || plane.x > arena - near || plane.y > arena - near) {
        ctx.strokeStyle = 'rgba(255,217,61,0.35)';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);
      }
    }
  }

  function drawPlaneTopDown(ctx, x, y, angle) {
    const sh = ship();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // Simple geometric plane (nose points +X / angle direction)
    ctx.fillStyle = sh.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-14, 12);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Wings
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-6, 18);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-6, -18);
    ctx.closePath();
    ctx.fill();
    // Cockpit
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(4, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Emoji badge
    ctx.rotate(-angle);
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sh.emoji, 0, -26);
    ctx.restore();
  }

  function drawMinimap(ctx, w, h, arena) {
    const mw = 72;
    const mh = 72;
    const mx = w - mw - 10;
    const my = 10;
    const scale = mw / arena;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(mx, my, mw, mh);
    for (const e of entities) {
      if (e.type === 'bg' || e.got) continue;
      ctx.fillStyle = e.type === 'star' ? '#ffd93d' : (e.type === 'enemy' ? '#ff7675' : '#dfe6e9');
      ctx.fillRect(mx + e.x * scale - 1.5, my + e.y * scale - 1.5, 3, 3);
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
    const nextUnlock = worldIdx + 1;

    const progressPatch = {
      completedDelta: success ? 1 : 0,
      score,
      starsEarned: earned,
      worldId: worldIdx,
      unlockWorld: (success && nextUnlock < WORLDS.length) ? nextUnlock : null,
      rings: collected.kills,
      stars: collected.stars,
      kills: collected.kills,
      cleared: collected.kills >= 5 || collected.stars >= 3,
      timeup: !!timeup,
      lockFlight: !!timeup,
      shipId,
      upgrades: Object.assign({}, upgrades)
    };

    showPanel('results');
    const title = $('#flight-results-title');
    const body = $('#flight-results-body');
    const starsEl = $('#flight-results-stars');
    const emojiEl = $('#flight-results-emoji');
    const gate = $('#flight-results-gate');
    const retry = $('#flight-retry');

    if (emojiEl) emojiEl.textContent = timeup ? '⏰' : '🦊';
    if (title) {
      title.textContent = timeup
        ? "Fly time's up!"
        : (progressPatch.cleared ? 'Flight complete!' : 'Nice flying, pilot!');
    }
    if (body) {
      body.textContent =
        `${world().emoji} ${world().name} · Score ${score} · Hits ${collected.kills} · Stars ${collected.stars}` +
        (progressPatch.unlockWorld != null ? ' · New world unlocked!' : '') +
        (timeup ? ' · Session saved.' : '');
    }
    if (starsEl) starsEl.textContent = '⭐'.repeat(earned) || '💫';

    if (gate) gate.classList.toggle('hidden', !timeup);
    if (retry) {
      retry.classList.toggle('hidden', !!timeup);
      retry.textContent = '🚀 Fly again';
    }

    if (global.KidsAudio && success && KidsAudio.win) KidsAudio.win();
    else if (global.KidsAudio && KidsAudio.correct) KidsAudio.correct();

    if (hooks.onComplete) hooks.onComplete(progressPatch);

    setPrompt(
      timeup
        ? `Fly time's up! Answer ${QUESTIONS_TO_UNLOCK} questions in Science (or Math / Reading / Spelling) to unlock more flight.`
        : 'Great run! Fly again or pick another world.'
    );
  }

  function onKeyDown(e) {
    if (mode !== 'fly') return;
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.key === ' ' || e.code === 'Space') {
      fireHeld = true;
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys[e.key] = false;
    if (e.key === ' ' || e.code === 'Space') fireHeld = false;
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
      renderMenu();
    });
    bindPad();
    bindSubjectLinks();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
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
    flightDone = true;
  }

  /** Called by app when a Math/Reading/Spelling/Science answer is logged while gate is active. */
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
      if (gate) gate.classList.toggle('hidden', !isLocked());
    }
  }

  global.FlightGame = {
    WORLDS,
    SHIPS,
    UPGRADES,
    SESSION_SECONDS,
    QUESTIONS_TO_UNLOCK,
    GATE_SUBJECTS,
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
