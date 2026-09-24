/* Soft Web Audio beeps — no external files */
(function (global) {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol) {
    const c = getCtx();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.value = vol || 0.08;
    o.connect(g);
    g.connect(c.destination);
    const now = c.currentTime;
    g.gain.setValueAtTime(vol || 0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  function enabled() {
    try {
      const s = KidsStorage.load();
      return s.soundOn !== false;
    } catch (e) { return true; }
  }

  const SFX = {
    click() { if (!enabled()) return; tone(520, 0.06, 'sine', 0.06); },
    correct() {
      if (!enabled()) return;
      tone(523, 0.08, 'sine', 0.08);
      setTimeout(() => tone(659, 0.08, 'sine', 0.08), 70);
      setTimeout(() => tone(784, 0.12, 'sine', 0.08), 140);
    },
    wrong() { if (!enabled()) return; tone(180, 0.18, 'triangle', 0.07); },
    star() {
      if (!enabled()) return;
      tone(880, 0.1, 'sine', 0.07);
      setTimeout(() => tone(1175, 0.15, 'sine', 0.07), 90);
    },
    win() {
      if (!enabled()) return;
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.08), i * 100));
    },
    type() { if (!enabled()) return; tone(640, 0.03, 'square', 0.03); }
  };

  /* Pre-K read-aloud via Web Speech API (no CDN) */
  let lastSpoken = '';

  function cancelSpeak() {
    try {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    } catch (e) { /* ignore */ }
  }

  function pickEnVoice() {
    try {
      const voices = speechSynthesis.getVoices() || [];
      return (
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => /^en(-|$)/i.test(v.lang)) ||
        null
      );
    } catch (e) {
      return null;
    }
  }

  function speak(text) {
    if (!enabled()) return false;
    if (typeof speechSynthesis === 'undefined') return false;
    const str = String(text || '').replace(/\s+/g, ' ').trim();
    if (!str) return false;
    cancelSpeak();
    lastSpoken = str;
    const u = new SpeechSynthesisUtterance(str);
    u.lang = 'en-US';
    u.rate = 0.92;
    u.pitch = 1.05;
    const voice = pickEnVoice();
    if (voice) u.voice = voice;
    try {
      speechSynthesis.speak(u);
    } catch (e) {
      return false;
    }
    return true;
  }

  function speakSaved() {
    return lastSpoken ? speak(lastSpoken) : false;
  }

  function setSpoken(text) {
    lastSpoken = String(text || '').replace(/\s+/g, ' ').trim();
  }

  // Chrome often loads voices async
  if (typeof speechSynthesis !== 'undefined') {
    try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () { pickEnVoice(); }; } catch (e) {}
  }

  SFX.cancelSpeak = cancelSpeak;
  SFX.speak = speak;
  SFX.speakSaved = speakSaved;
  SFX.setSpoken = setSpoken;

  global.KidsAudio = SFX;
})(window);
