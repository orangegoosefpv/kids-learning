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

  /* Pre-K / Hear-it read-aloud via Web Speech API (no CDN) */
  let lastSpoken = '';
  let speakChainToken = 0;

  function cancelSpeak() {
    speakChainToken++;
    try {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    } catch (e) { /* ignore */ }
  }

  function scoreVoice(v) {
    if (!v || !v.lang) return -1;
    const lang = String(v.lang).toLowerCase();
    const name = String(v.name || '').toLowerCase();
    if (!/^en/.test(lang)) return -1;
    let score = 10;
    if (lang === 'en-us') score += 40;
    else if (lang.startsWith('en-us')) score += 35;
    else if (lang === 'en-gb' || lang.startsWith('en-gb')) score += 15;
    else score += 5;
    // Prefer natural named voices when available
    const preferred = [
      'google us english',
      'google uk english female',
      'google uk english male',
      'samantha',
      'karen',
      'moira',
      'daniel',
      'alex',
      'victoria',
      'fred',
      'microsoft zira',
      'microsoft aria',
      'microsoft guy',
      'microsoft jenny',
      'natural'
    ];
    for (let i = 0; i < preferred.length; i++) {
      if (name.indexOf(preferred[i]) !== -1) {
        score += 50 - i;
        break;
      }
    }
    if (v.localService) score += 5;
    if (/compact|robot|whisper/i.test(name)) score -= 20;
    return score;
  }

  function pickEnVoice() {
    try {
      const voices = speechSynthesis.getVoices() || [];
      if (!voices.length) return null;
      let best = null;
      let bestScore = -1;
      voices.forEach(v => {
        const s = scoreVoice(v);
        if (s > bestScore) {
          bestScore = s;
          best = v;
        }
      });
      return best;
    } catch (e) {
      return null;
    }
  }

  function normalizeProsodyText(text) {
    let s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    // Ensure light pauses: space after commas/periods/question/exclamation
    s = s.replace(/([,.!?;:])(?=\S)/g, '$1 ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function modeDefaults(mode) {
    if (mode === 'word') return { rate: 0.82, pitch: 1.0, gapMs: 0, split: false };
    if (mode === 'phrase') return { rate: 0.9, pitch: 1.0, gapMs: 180, split: true };
    // sentence (default for longer hear-it / passages)
    return { rate: 0.88, pitch: 1.0, gapMs: 220, split: true };
  }

  function splitSentences(text) {
    const parts = String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    if (!parts) return [text];
    return parts.map(p => p.trim()).filter(Boolean);
  }

  function speakUtterance(str, opts, onEnd) {
    const u = new SpeechSynthesisUtterance(str);
    u.lang = 'en-US';
    u.rate = opts.rate;
    u.pitch = opts.pitch;
    const voice = pickEnVoice();
    if (voice) {
      u.voice = voice;
      if (voice.lang) u.lang = voice.lang;
    }
    u.onend = function () { if (onEnd) onEnd(); };
    u.onerror = function () { if (onEnd) onEnd(); };
    try {
      speechSynthesis.speak(u);
    } catch (e) {
      if (onEnd) onEnd();
      return false;
    }
    return true;
  }

  /**
   * speak(text, opts?)
   * opts.mode: 'word' | 'phrase' | 'sentence'
   * opts.rate / opts.pitch override defaults
   */
  function speak(text, opts) {
    if (!enabled()) return false;
    if (typeof speechSynthesis === 'undefined') return false;
    const options = opts || {};
    const mode = options.mode || (String(text || '').split(/\s+/).length <= 2 ? 'word' : 'sentence');
    const defaults = modeDefaults(mode);
    const rate = options.rate != null ? options.rate : defaults.rate;
    const pitch = options.pitch != null ? options.pitch : defaults.pitch;
    const gapMs = options.gapMs != null ? options.gapMs : defaults.gapMs;
    const doSplit = options.split != null ? options.split : defaults.split;

    const str = normalizeProsodyText(text);
    if (!str) return false;
    cancelSpeak();
    lastSpoken = str;
    const token = speakChainToken;
    const conf = { rate, pitch };

    if (!doSplit || mode === 'word') {
      return speakUtterance(str, conf, null);
    }

    const chunks = splitSentences(str);
    if (chunks.length <= 1) {
      return speakUtterance(str, conf, null);
    }

    let i = 0;
    function next() {
      if (token !== speakChainToken) return;
      if (i >= chunks.length) return;
      const chunk = chunks[i++];
      speakUtterance(chunk, conf, function () {
        if (token !== speakChainToken) return;
        if (i >= chunks.length) return;
        setTimeout(next, gapMs);
      });
    }
    next();
    return true;
  }

  function speakSaved(opts) {
    return lastSpoken ? speak(lastSpoken, opts || { mode: 'sentence' }) : false;
  }

  function setSpoken(text) {
    lastSpoken = normalizeProsodyText(text);
  }

  // Chrome often loads voices async
  if (typeof speechSynthesis !== 'undefined') {
    try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () { pickEnVoice(); }; } catch (e) {}
  }

  SFX.cancelSpeak = cancelSpeak;
  SFX.speak = speak;
  SFX.speakSaved = speakSaved;
  SFX.setSpoken = setSpoken;
  SFX.pickEnVoice = pickEnVoice;

  global.KidsAudio = SFX;
})(window);
