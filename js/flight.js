/* Space Fox Flyer — build a plane, pull-back launch, fly & collect stars
   Original kid-friendly game (emoji/canvas art). No third-party IP assets. */
(function (global) {
  const WORLDS = [
    {
      id: 0,
      key: 'meadow',
      name: 'Meadow Skies',
      emoji: '🌿',
      tip: 'Soft green hills and shiny rings!',
      skyTop: '#87CEEB',
      skyBot: '#c8f0a8',
      ground: '#5cb85c',
      accent: '#ffd93d',
      length: 4200,
      rings: 8,
      stars: 5,
      obstacles: 4,
      obstacleEmoji: '☁️',
      collectRing: '⭕',
      collectStar: '⭐',
      bgBits: ['🌳', '🌼', '🏡']
    },
    {
      id: 1,
      key: 'rocks',
      name: 'Rock Belt',
      emoji: '☄️',
      tip: 'Dodge soft space rocks and grab stars!',
      skyTop: '#1a1033',
      skyBot: '#3d2b6b',
      ground: '#2a1a4a',
      accent: '#ff9f43',
      length: 4800,
      rings: 7,
      stars: 7,
      obstacles: 7,
      obstacleEmoji: '🌑',
      collectRing: '💠',
      collectStar: '⭐',
      bgBits: ['✨', '🪐', '💫']
    },
    {
      id: 2,
      key: 'islands',
      name: 'Sky Islands',
      emoji: '🏝️',
      tip: 'Float past cloudy islands — do a barrel roll!',
      skyTop: '#6ec6ff',
      skyBot: '#ffeaa7',
      ground: '#74b9ff',
      accent: '#fd79a8',
      length: 5000,
      rings: 9,
      stars: 6,
      obstacles: 5,
      obstacleEmoji: '🪨',
      collectRing: '💍',
      collectStar: '🌟',
      bgBits: ['☁️', '🎈', '🌈']
    }
  ];

  const PARTS = [
    { id: 'fuselage', label: 'Body', emoji: '📦', required: true, slot: 'body' },
    { id: 'wings', label: 'Wings', emoji: '🪽', required: true, slot: 'wings' },
    { id: 'engine', label: 'Engine', emoji: '🚀', required: true, slot: 'engine' },
    { id: 'tail', label: 'Tail', emoji: '🔼', required: false, slot: 'tail' },
    { id: 'nose', label: 'Nose', emoji: '🔺', required: false, slot: 'nose' },
    { id: 'decal', label: 'Decal', emoji: '🦊', required: false, slot: 'decal' }
  ];

  const PRESETS = [
    {
      id: 'scout',
      name: 'Scout Flutter',
      emoji: '🛩️',
      parts: { body: 'fuselage', wings: 'wings', engine: 'engine', tail: 'tail', nose: null, decal: 'decal' }
    },
    {
      id: 'zippy',
      name: 'Zippy Dart',
      emoji: '✈️',
      parts: { body: 'fuselage', wings: 'wings', engine: 'engine', tail: null, nose: 'nose', decal: null }
    },
    {
      id: 'foxjet',
      name: 'Fox Jet',
      emoji: '🦊',
      parts: { body: 'fuselage', wings: 'wings', engine: 'engine', tail: 'tail', nose: 'nose', decal: 'decal' }
    }
  ];

  let grade = 'grade2';
  let hooks = {};
  let mode = 'menu'; // menu | build | launch | fly | results
  let worldIdx = 0;
  let placed = {}; // slot -> partId
  let dragPart = null;
  let raf = 0;
  let keys = {};
  let pad = { up: false, down: false, left: false, right: false };
  let plane = null;
  let entities = [];
  let score = 0;
  let collected = { rings: 0, stars: 0 };
  let flightDone = false;
  let flavor = '';
  let launch = { pulling: false, ox: 0, oy: 0, dx: 0, dy: 0, power: 0, angle: 0 };
  let bound = false;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function world() {
    return WORLDS[worldIdx] || WORLDS[0];
  }

  function isPrek() { return grade === 'prek'; }

  function difficulty() {
    if (grade === 'prek') {
      return { speed: 2.2, gravity: 0.08, lift: 0.22, obstacleSlow: 0.55, hitPadding: 18, targetStars: 2 };
    }
    if (grade === 'grade3') {
      return { speed: 3.4, gravity: 0.12, lift: 0.28, obstacleSlow: 0.7, hitPadding: 8, targetStars: 4 };
    }
    return { speed: 2.8, gravity: 0.1, lift: 0.25, obstacleSlow: 0.65, hitPadding: 12, targetStars: 3 };
  }

  function requiredReady() {
    return !!(placed.body && placed.wings && placed.engine);
  }

  function partById(id) {
    return PARTS.find(p => p.id === id);
  }

  function setPrompt(text) {
    const el = $('#flight-prompt');
    if (el) el.textContent = text || '';
    if (hooks.onPrompt) hooks.onPrompt(text || '');
  }

  function showPanel(name) {
    ['menu', 'build', 'launch', 'fly', 'results'].forEach(m => {
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
  }

  function unlockedSet() {
    const prog = (hooks.getProgress && hooks.getProgress()) || { unlockedWorlds: [0] };
    const arr = Array.isArray(prog.unlockedWorlds) ? prog.unlockedWorlds.slice() : [0];
    if (!arr.includes(0)) arr.push(0);
    return new Set(arr);
  }

  function renderMenu() {
    showPanel('menu');
    stopLoop();
    const unlocked = unlockedSet();
    const grid = $('#flight-worlds');
    if (!grid) return;
    grid.innerHTML = WORLDS.map(w => {
      const open = unlocked.has(w.id);
      return `<button type="button" class="btn btn-xl flight-world-btn ${open ? '' : 'locked'}" data-world="${w.id}" ${open ? '' : 'disabled'} aria-label="${w.name}">
        <span class="emoji">${w.emoji}</span>
        <span class="label">${w.name}</span>
        <span class="hint">${open ? w.tip : 'Finish a flight to unlock!'}</span>
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
    const tip = isPrek()
      ? 'Pick a sky world, build a plane, pull back, and fly!'
      : 'Choose a world · build your flyer · pull back · collect rings & stars!';
    setPrompt(tip);
    const badge = $('#flight-grade-tip');
    if (badge) {
      badge.classList.toggle('hidden', grade !== 'grade2');
      badge.textContent = '📗 Grade 2 favorite — build, launch, and barrel-roll flavor awaits!';
    }
  }

  function startBuild() {
    placed = {};
    showPanel('build');
    stopLoop();
    const w = world();
    setPrompt(`${w.emoji} ${w.name}: drag parts onto the pad. Need body + wings + engine!`);
    renderPartsTray();
    renderBuildPad();
    renderPresets();
    updateStartFlightBtn();
  }

  function renderPartsTray() {
    const tray = $('#flight-parts');
    if (!tray) return;
    tray.innerHTML = PARTS.map(p =>
      `<button type="button" class="flight-part" draggable="true" data-part="${p.id}" aria-label="${p.label}">
        <span class="flight-part-emoji">${p.emoji}</span>
        <span class="flight-part-label">${p.label}${p.required ? ' ★' : ''}</span>
      </button>`
    ).join('');
    tray.querySelectorAll('.flight-part').forEach(el => {
      el.addEventListener('dragstart', onPartDragStart);
      el.addEventListener('touchstart', onPartTouchStart, { passive: false });
      el.addEventListener('click', () => {
        // Tap-to-place for mobile: place into first empty matching slot
        const part = partById(el.dataset.part);
        if (!part) return;
        if (!placed[part.slot]) {
          placed[part.slot] = part.id;
          if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
          renderBuildPad();
          updateStartFlightBtn();
          flashSlot(part.slot);
        }
      });
    });
  }

  function renderPresets() {
    const row = $('#flight-presets');
    if (!row) return;
    row.innerHTML = PRESETS.map(pr =>
      `<button type="button" class="btn btn-sm flight-preset-btn" data-preset="${pr.id}">${pr.emoji} ${pr.name}</button>`
    ).join('');
    row.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pr = PRESETS.find(p => p.id === btn.dataset.preset);
        if (!pr) return;
        placed = {};
        Object.keys(pr.parts).forEach(slot => {
          if (pr.parts[slot]) placed[slot] = pr.parts[slot];
        });
        if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
        renderBuildPad();
        updateStartFlightBtn();
        setPrompt(`Preset ready: ${pr.name}! Tap Start flight when you like it.`);
      });
    });
  }

  function renderBuildPad() {
    const padEl = $('#flight-build-pad');
    if (!padEl) return;
    const slots = [
      { id: 'nose', label: 'Nose' },
      { id: 'body', label: 'Body' },
      { id: 'wings', label: 'Wings' },
      { id: 'engine', label: 'Engine' },
      { id: 'tail', label: 'Tail' },
      { id: 'decal', label: 'Decal' }
    ];
    padEl.innerHTML = slots.map(s => {
      const pid = placed[s.id];
      const part = pid ? partById(pid) : null;
      return `<div class="flight-slot ${part ? 'filled' : ''}" data-slot="${s.id}" data-label="${s.label}">
        <span class="flight-slot-label">${s.label}</span>
        <span class="flight-slot-emoji">${part ? part.emoji : '➕'}</span>
      </div>`;
    }).join('');
    padEl.querySelectorAll('.flight-slot').forEach(slot => {
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', e => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        const partId = e.dataTransfer.getData('text/part') || dragPart;
        placePart(partId, slot.dataset.slot);
      });
      slot.addEventListener('click', () => {
        // Clear optional or swap
        if (placed[slot.dataset.slot]) {
          delete placed[slot.dataset.slot];
          renderBuildPad();
          updateStartFlightBtn();
        }
      });
    });
    updatePlanePreview();
  }

  function placePart(partId, slotId) {
    const part = partById(partId);
    if (!part) return;
    // Snap to the part's intended slot if dropping on wrong one
    const target = part.slot === slotId ? slotId : part.slot;
    placed[target] = part.id;
    if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
    renderBuildPad();
    updateStartFlightBtn();
    flashSlot(target);
  }

  function flashSlot(slotId) {
    const el = $(`.flight-slot[data-slot="${slotId}"]`);
    if (!el) return;
    el.classList.add('just-placed');
    setTimeout(() => el.classList.remove('just-placed'), 450);
  }

  function updateStartFlightBtn() {
    const btn = $('#flight-start-flight');
    if (!btn) return;
    const ok = requiredReady();
    btn.disabled = !ok;
    btn.classList.toggle('ready', ok);
    const status = $('#flight-build-status');
    if (status) {
      status.textContent = ok
        ? '✅ Ready for launch!'
        : 'Need: body + wings + engine';
    }
  }

  function updatePlanePreview() {
    const el = $('#flight-plane-preview');
    if (!el) return;
    const order = ['nose', 'body', 'wings', 'engine', 'tail', 'decal'];
    el.innerHTML = order.map(s => {
      const pid = placed[s];
      const part = pid ? partById(pid) : null;
      return part ? `<span class="pv-part pv-${s}">${part.emoji}</span>` : '';
    }).join('') || '<span class="pv-empty">Build me!</span>';
  }

  function onPartDragStart(e) {
    dragPart = e.currentTarget.dataset.part;
    e.dataTransfer.setData('text/part', dragPart);
    e.dataTransfer.effectAllowed = 'copy';
  }

  let touchGhost = null;
  function onPartTouchStart(e) {
    const partId = e.currentTarget.dataset.part;
    dragPart = partId;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    touchGhost = document.createElement('div');
    touchGhost.className = 'flight-touch-ghost';
    touchGhost.textContent = partById(partId).emoji;
    document.body.appendChild(touchGhost);
    moveGhost(touch.clientX, touch.clientY);
    const move = (ev) => {
      const t = ev.touches[0];
      if (t) moveGhost(t.clientX, t.clientY);
    };
    const end = (ev) => {
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      if (touchGhost) { touchGhost.remove(); touchGhost = null; }
      const t = ev.changedTouches[0];
      if (!t) return;
      const under = document.elementFromPoint(t.clientX, t.clientY);
      const slot = under && under.closest && under.closest('.flight-slot');
      if (slot) placePart(partId, slot.dataset.slot);
      else {
        // Drop near pad → auto place intended slot
        const padEl = $('#flight-build-pad');
        if (padEl) {
          const r = padEl.getBoundingClientRect();
          if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) {
            const part = partById(partId);
            if (part) placePart(partId, part.slot);
          }
        }
      }
    };
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
  }

  function moveGhost(x, y) {
    if (!touchGhost) return;
    touchGhost.style.left = x + 'px';
    touchGhost.style.top = y + 'px';
  }

  function startLaunch() {
    if (!requiredReady()) return;
    showPanel('launch');
    stopLoop();
    launch = { pulling: false, ox: 0, oy: 0, dx: 0, dy: 0, power: 0, angle: -0.35 };
    setPrompt('Pull the plane back like a slingshot, then let go to launch!');
    const canvas = $('#flight-launch-canvas');
    if (!canvas) return;
    sizeCanvas(canvas);
    drawLaunch(canvas);
    bindLaunch(canvas);
    updatePowerMeter(0);
  }

  function sizeCanvas(canvas) {
    const wrap = canvas.parentElement;
    const w = Math.max(280, Math.min(wrap ? wrap.clientWidth : 640, 720));
    const h = Math.max(200, Math.round(w * 0.55));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h, ctx };
  }

  function planeVisual() {
    return {
      body: placed.body ? partById(placed.body).emoji : '📦',
      wings: placed.wings ? partById(placed.wings).emoji : '',
      engine: placed.engine ? partById(placed.engine).emoji : '',
      tail: placed.tail ? partById(placed.tail).emoji : '',
      nose: placed.nose ? partById(placed.nose).emoji : '',
      decal: placed.decal ? partById(placed.decal).emoji : '🦊'
    };
  }

  function drawPlaneEmoji(ctx, x, y, scale, angle) {
    const v = planeVisual();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.font = `${Math.round(28 * scale)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (v.tail) ctx.fillText(v.tail, -28 * scale, 0);
    if (v.wings) ctx.fillText(v.wings, 0, -10 * scale);
    ctx.fillText(v.body, 0, 0);
    if (v.nose) ctx.fillText(v.nose, 26 * scale, 0);
    if (v.engine) ctx.fillText(v.engine, -8 * scale, 14 * scale);
    if (v.decal) {
      ctx.font = `${Math.round(16 * scale)}px serif`;
      ctx.fillText(v.decal, 4 * scale, -16 * scale);
    }
    ctx.restore();
  }

  function drawLaunch(canvas) {
    const { w, h, ctx } = sizeCanvas(canvas);
    const wd = world();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, wd.skyTop);
    grad.addColorStop(1, wd.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = wd.ground;
    ctx.fillRect(0, h - 36, w, 36);

    const anchorX = w * 0.28;
    const anchorY = h * 0.55;
    const px = anchorX + launch.dx;
    const py = anchorY + launch.dy;

    // Slingshot bands
    ctx.strokeStyle = 'rgba(80,40,20,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(anchorX - 40, anchorY - 30);
    ctx.lineTo(px, py);
    ctx.lineTo(anchorX - 40, anchorY + 30);
    ctx.stroke();

    // Power arc hint
    if (launch.power > 0.05) {
      ctx.strokeStyle = 'rgba(255,200,60,0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      const ang = launch.angle;
      const pow = launch.power;
      let lx = px;
      let ly = py;
      let vx = Math.cos(ang) * pow * 18;
      let vy = Math.sin(ang) * pow * 18;
      ctx.moveTo(lx, ly);
      for (let i = 0; i < 18; i++) {
        lx += vx;
        ly += vy;
        vy += 0.35;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawPlaneEmoji(ctx, px, py, 1.15, launch.angle * 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Grab · pull back · release!', w / 2, 28);
  }

  function updatePowerMeter(p) {
    const fill = $('#flight-power-fill');
    if (fill) fill.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%';
    const label = $('#flight-power-label');
    if (label) {
      if (p < 0.2) label.textContent = 'Power: soft';
      else if (p < 0.55) label.textContent = 'Power: good';
      else if (p < 0.85) label.textContent = 'Power: strong!';
      else label.textContent = 'Power: MAX! 🚀';
    }
  }

  function bindLaunch(canvas) {
    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };

    const onDown = (e) => {
      e.preventDefault();
      const p = getPos(e);
      const { w, h } = sizeCanvas(canvas);
      const anchorX = w * 0.28;
      const anchorY = h * 0.55;
      const px = anchorX + launch.dx;
      const py = anchorY + launch.dy;
      const dist = Math.hypot(p.x - px, p.y - py);
      if (dist < 80) {
        launch.pulling = true;
        launch.ox = p.x;
        launch.oy = p.y;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    };
    const onMove = (e) => {
      if (!launch.pulling) return;
      e.preventDefault();
      const p = getPos(e);
      const { w, h } = sizeCanvas(canvas);
      const anchorX = w * 0.28;
      const anchorY = h * 0.55;
      let dx = p.x - anchorX;
      let dy = p.y - anchorY;
      // Prefer pull back (left) and a bit down/up
      dx = Math.max(-140, Math.min(20, dx));
      dy = Math.max(-80, Math.min(90, dy));
      launch.dx = dx;
      launch.dy = dy;
      const pull = Math.hypot(dx, dy);
      launch.power = Math.min(1, pull / 130);
      launch.angle = Math.atan2(-dy * 0.35 - 20, Math.max(30, -dx + 40)) ;
      // Prefer upward-ish launch
      if (launch.angle > 0.2) launch.angle = 0.2;
      if (launch.angle < -1.1) launch.angle = -1.1;
      updatePowerMeter(launch.power);
      drawLaunch(canvas);
    };
    const onUp = (e) => {
      if (!launch.pulling) return;
      e.preventDefault();
      launch.pulling = false;
      const power = launch.power;
      const angle = launch.angle;
      if (power < 0.12) {
        launch.dx = 0;
        launch.dy = 0;
        launch.power = 0;
        updatePowerMeter(0);
        drawLaunch(canvas);
        setPrompt('Pull farther back to charge power!');
        return;
      }
      if (global.KidsAudio && KidsAudio.correct) KidsAudio.correct();
      beginFlight(power, angle);
    };

    canvas.onpointerdown = onDown;
    canvas.onpointermove = onMove;
    canvas.onpointerup = onUp;
    canvas.onpointercancel = onUp;
    canvas.style.touchAction = 'none';
  }

  function beginFlight(power, angle) {
    showPanel('fly');
    const canvas = $('#flight-fly-canvas');
    if (!canvas) return;
    sizeCanvas(canvas);
    const diff = difficulty();
    const wd = world();
    const { w, h } = { w: parseFloat(canvas.style.width), h: parseFloat(canvas.style.height) };

    const boost = 2.5 + power * 5.5;
    plane = {
      x: 90,
      y: h * 0.55,
      vx: Math.cos(angle) * boost + diff.speed,
      vy: Math.sin(angle) * boost * 0.9,
      angle: angle,
      alive: true,
      invuln: 0
    };
    score = 0;
    collected = { rings: 0, stars: 0 };
    flightDone = false;
    flavor = pickFlavor();
    entities = spawnWorld(wd, diff, w, h);
    keys = {};
    pad = { up: false, down: false, left: false, right: false };
    setPrompt(`${wd.emoji} ${wd.name} · ${flavor}`);
    updateHud();
    stopLoop();
    raf = requestAnimationFrame(tickFly);
  }

  function pickFlavor() {
    const lines = [
      'Do a barrel roll!',
      'Fox power — keep flying!',
      'Rings ahead, pilot!',
      'Soft clouds only — you got this!',
      'Wings steady, stars shiny!'
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function spawnWorld(wd, diff, viewW, viewH) {
    const list = [];
    const len = wd.length;
    const margin = 280;
    for (let i = 0; i < wd.rings; i++) {
      list.push({
        type: 'ring',
        x: margin + (i + 0.5) * (len - margin) / wd.rings + (Math.random() * 80 - 40),
        y: 60 + Math.random() * (viewH - 140),
        r: isPrek() ? 34 : 28,
        emoji: wd.collectRing,
        got: false,
        points: 10
      });
    }
    for (let i = 0; i < wd.stars; i++) {
      list.push({
        type: 'star',
        x: margin + (i + 0.3) * (len - margin) / wd.stars + (Math.random() * 60 - 30),
        y: 50 + Math.random() * (viewH - 130),
        r: isPrek() ? 30 : 24,
        emoji: wd.collectStar,
        got: false,
        points: 25
      });
    }
    const obsCount = isPrek() ? Math.max(2, wd.obstacles - 2) : wd.obstacles;
    for (let i = 0; i < obsCount; i++) {
      list.push({
        type: 'obstacle',
        x: margin + 200 + i * (len - margin - 200) / Math.max(1, obsCount) + (Math.random() * 100 - 50),
        y: 70 + Math.random() * (viewH - 160),
        r: isPrek() ? 26 : 32,
        emoji: wd.obstacleEmoji,
        soft: true
      });
    }
    // Finish gate
    list.push({
      type: 'finish',
      x: len - 40,
      y: viewH / 2,
      r: 50,
      emoji: '🏁'
    });
    // Background bits (decorative)
    for (let i = 0; i < 14; i++) {
      list.push({
        type: 'bg',
        x: 100 + Math.random() * len,
        y: 30 + Math.random() * (viewH - 80),
        r: 10,
        emoji: wd.bgBits[i % wd.bgBits.length],
        parallax: 0.3 + Math.random() * 0.4
      });
    }
    return list;
  }

  function updateHud() {
    const s = $('#flight-score');
    if (s) s.textContent = String(score);
    const r = $('#flight-rings');
    if (r) r.textContent = String(collected.rings);
    const st = $('#flight-stars-got');
    if (st) st.textContent = String(collected.stars);
    const fl = $('#flight-flavor');
    if (fl) fl.textContent = flavor;
  }

  function tickFly() {
    raf = 0;
    if (mode !== 'fly' || !plane || flightDone) return;
    const canvas = $('#flight-fly-canvas');
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stepPhysics(w, h);
    drawFly(ctx, w, h);

    if (!flightDone) raf = requestAnimationFrame(tickFly);
  }

  function stepPhysics(w, h) {
    const diff = difficulty();
    const up = keys.ArrowUp || keys.w || keys.W || pad.up;
    const down = keys.ArrowDown || keys.s || keys.S || pad.down;
    const left = keys.ArrowLeft || keys.a || keys.A || pad.left;
    const right = keys.ArrowRight || keys.d || keys.D || pad.right;

    if (up) plane.vy -= diff.lift;
    if (down) plane.vy += diff.lift * 0.9;
    if (left) plane.vx = Math.max(diff.speed * 0.55, plane.vx - 0.08);
    if (right) plane.vx = Math.min(diff.speed * 1.6, plane.vx + 0.12);

    plane.vy += diff.gravity;
    plane.vx += (diff.speed - plane.vx) * 0.02;
    plane.x += plane.vx;
    plane.y += plane.vy;
    plane.angle = Math.atan2(plane.vy, Math.max(0.5, plane.vx)) * 0.65;

    // Soft bounds
    if (plane.y < 28) { plane.y = 28; plane.vy = Math.abs(plane.vy) * 0.3; }
    if (plane.y > h - 40) { plane.y = h - 40; plane.vy = -Math.abs(plane.vy) * 0.35; }

    if (plane.invuln > 0) plane.invuln--;

    const cam = plane.x - w * 0.28;
    for (const e of entities) {
      if (e.type === 'bg' || e.got) continue;
      const ex = e.x - cam;
      const dx = ex - (plane.x - cam);
      // plane screen x is ~w*0.28
      const pScreenX = w * 0.28;
      const pScreenY = plane.y;
      const eScreenX = e.x - cam;
      const eScreenY = e.y;
      const dist = Math.hypot(eScreenX - pScreenX, eScreenY - pScreenY);
      const hitR = e.r + diff.hitPadding;
      if (dist < hitR) {
        if (e.type === 'ring' || e.type === 'star') {
          e.got = true;
          score += e.points;
          if (e.type === 'ring') collected.rings++;
          else collected.stars++;
          if (global.KidsAudio && KidsAudio.star) KidsAudio.star();
          updateHud();
        } else if (e.type === 'obstacle' && plane.invuln <= 0) {
          plane.vx *= diff.obstacleSlow;
          plane.vy *= -0.4;
          plane.invuln = 35;
          score = Math.max(0, score - 3);
          if (global.KidsAudio && KidsAudio.wrong) KidsAudio.wrong();
          flavor = 'Whoops — soft bump! Keep flying!';
          updateHud();
        } else if (e.type === 'finish') {
          finishFlight(true);
          return;
        }
      }
    }

    // End of world fallback
    if (plane.x > world().length + 20) finishFlight(true);
  }

  function drawFly(ctx, w, h) {
    const wd = world();
    const cam = plane.x - w * 0.28;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, wd.skyTop);
    grad.addColorStop(1, wd.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ground parallax strip
    ctx.fillStyle = wd.ground;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, h - 28, w, 28);
    ctx.globalAlpha = 1;

    // Entities
    for (const e of entities) {
      if (e.got) continue;
      const parallax = e.parallax || 1;
      const sx = e.x - cam * parallax;
      if (sx < -60 || sx > w + 60) continue;
      const alpha = e.type === 'bg' ? 0.45 : 1;
      ctx.globalAlpha = alpha;
      ctx.font = `${e.type === 'bg' ? 22 : e.type === 'finish' ? 40 : 30}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, sx, e.y);
      if (e.type === 'ring' || e.type === 'star') {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.arc(sx, e.y, e.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Plane
    const blink = plane.invuln > 0 && (plane.invuln % 6 < 3);
    if (!blink) drawPlaneEmoji(ctx, w * 0.28, plane.y, 1.1, plane.angle);

    // Progress bar
    const prog = Math.min(1, plane.x / world().length);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(12, 10, w - 24, 10);
    ctx.fillStyle = wd.accent;
    ctx.fillRect(12, 10, (w - 24) * prog, 10);
  }

  function finishFlight(success) {
    if (flightDone) return;
    flightDone = true;
    stopLoop();
    const diff = difficulty();
    const starBonus = collected.stars;
    const ringBonus = collected.rings;
    const cleared = success && (starBonus >= diff.targetStars || plane.x > world().length * 0.85);
    let earned = 0;
    if (cleared) earned += 1;
    if (starBonus >= diff.targetStars) earned += 1;
    if (ringBonus >= 3) earned += 1;
    if (score >= 80) earned += 1;
    earned = Math.max(success ? 1 : 0, Math.min(5, earned));

    const nextUnlock = worldIdx + 1;
    const progressPatch = {
      completedDelta: success ? 1 : 0,
      score,
      starsEarned: earned,
      worldId: worldIdx,
      unlockWorld: (success && nextUnlock < WORLDS.length) ? nextUnlock : null,
      rings: collected.rings,
      stars: collected.stars,
      cleared: !!cleared
    };

    showPanel('results');
    const title = $('#flight-results-title');
    const body = $('#flight-results-body');
    const starsEl = $('#flight-results-stars');
    if (title) title.textContent = cleared ? 'Flight complete!' : (success ? 'Nice try, pilot!' : 'Flight over');
    if (body) {
      body.textContent = `${world().emoji} ${world().name} · Score ${score} · Rings ${collected.rings} · Stars ${collected.stars}` +
        (progressPatch.unlockWorld != null ? ` · New world unlocked!` : '');
    }
    if (starsEl) starsEl.textContent = '⭐'.repeat(earned) || '💫';

    if (global.KidsAudio && success && KidsAudio.win) KidsAudio.win();
    else if (global.KidsAudio && KidsAudio.correct) KidsAudio.correct();

    if (hooks.onComplete) hooks.onComplete(progressPatch);
    setPrompt(cleared ? 'You did it! Pick another world or fly again.' : 'Collect more stars next time — you can do it!');
  }

  function onKeyDown(e) {
    if (mode !== 'fly') return;
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  }
  function onKeyUp(e) {
    keys[e.key] = false;
  }

  function bindPad() {
    const root = $('#flight-dpad');
    if (!root) return;
    root.querySelectorAll('[data-dir]').forEach(btn => {
      const dir = btn.dataset.dir;
      const set = (v) => { pad[dir] = v; };
      btn.addEventListener('pointerdown', e => { e.preventDefault(); set(true); btn.setPointerCapture(e.pointerId); });
      btn.addEventListener('pointerup', () => set(false));
      btn.addEventListener('pointercancel', () => set(false));
      btn.addEventListener('lostpointercapture', () => set(false));
    });
  }

  function bindUi() {
    if (bound) return;
    bound = true;
    $('#flight-start-flight')?.addEventListener('click', () => {
      if (!requiredReady()) return;
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      startLaunch();
    });
    $('#flight-back-menu')?.addEventListener('click', () => {
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      renderMenu();
    });
    $('#flight-back-build')?.addEventListener('click', () => {
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      startBuild();
    });
    $('#flight-retry')?.addEventListener('click', () => {
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      startBuild();
    });
    $('#flight-again')?.addEventListener('click', () => {
      if (global.KidsAudio && KidsAudio.click) KidsAudio.click();
      renderMenu();
    });
    bindPad();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function start(g, h) {
    grade = g || 'grade2';
    hooks = h || {};
    bindUi();
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
    pad = { up: false, down: false, left: false, right: false };
  }

  global.FlightGame = {
    WORLDS,
    PARTS,
    PRESETS,
    start,
    stop,
    getMode: () => mode
  };
})(window);
