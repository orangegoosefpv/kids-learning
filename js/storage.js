/* Progress persistence per kid profile + answer log for parent Excel tracker */
(function (global) {
  const KEY = 'kidsLearningLab_v1';
  const ANSWER_KEY = 'kidsLearningLab_answers_v1';
  const ANSWER_CAP = 2000;

  const GRADE_LABELS = {
    prek: 'Pre-K',
    grade2: 'Grade 2',
    grade3: 'Grade 3'
  };

  function blankProgress() {
    return {
      typing: { level: 0, bestWpm: 0, completed: 0 },
      math: { prek: 0, grade2: 0, grade3: 0 },
      reading: { completed: 0 },
      spelling: { completed: 0 },
      science: { completed: 0 },
      chess: { completed: 0, learned: [] },
      stem: { level: 0, completed: [] }
    };
  }

  const PROFILE_DEFAULTS = [
    { name: 'Zion', avatar: '🦊', grade: 'grade3' },
    { name: 'Joziah', avatar: '🐼', grade: 'grade2' },
    { name: 'Zachariah', avatar: '🦄', grade: 'prek' }
  ];

  const CHILD_NAMES = PROFILE_DEFAULTS.map(p => p.name);

  const LEGACY_NAMES = ['Player 1', 'Player 2', 'Player 3'];
  /* Misspellings / prior defaults → Joziah */
  const NAME_ALIASES = {
    Joiah: 'Joziah',
    Josiah: 'Joziah',
    joiah: 'Joziah',
    josiah: 'Joziah'
  };

  function makeProfile(i) {
    const base = PROFILE_DEFAULTS[i] || PROFILE_DEFAULTS[0];
    return Object.assign({ stars: 0 }, base, blankProgress());
  }

  const DEFAULTS = {
    activeProfile: 0,
    profiles: [makeProfile(0), makeProfile(1), makeProfile(2)],
    soundOn: true
  };

  function normalizeGrade(g) {
    if (g === 'prek' || g === 'grade2' || g === 'grade3') return g;
    return null;
  }

  function canonicalChildName(name) {
    if (!name || typeof name !== 'string') return name;
    const t = name.trim();
    if (NAME_ALIASES[t]) return NAME_ALIASES[t];
    // case-insensitive alias check
    const lower = t.toLowerCase();
    if (lower === 'joiah' || lower === 'josiah') return 'Joziah';
    return t;
  }

  function mergeProfile(defaults, saved, index) {
    const prog = blankProgress();
    const out = Object.assign({}, defaults, {
      typing: Object.assign({}, prog.typing, saved.typing || {}),
      math: Object.assign({}, prog.math, saved.math || {}),
      reading: Object.assign({}, prog.reading, saved.reading || {}),
      spelling: Object.assign({}, prog.spelling, saved.spelling || {}),
      science: Object.assign({}, prog.science, saved.science || {}),
      chess: Object.assign({}, prog.chess, saved.chess || {}),
      stem: Object.assign({}, prog.stem, saved.stem || {})
    });

    if (typeof saved.name === 'string' && saved.name.trim()) {
      out.name = canonicalChildName(saved.name.trim()).slice(0, 16);
    }
    if (typeof saved.avatar === 'string' && saved.avatar) {
      out.avatar = saved.avatar;
    }
    if (typeof saved.stars === 'number') out.stars = saved.stars;

    // Migrate legacy Player 1/2/3 → fixed kids (keep stars/progress)
    if (LEGACY_NAMES.includes(out.name) || !normalizeGrade(saved.grade)) {
      const fixed = PROFILE_DEFAULTS[index] || PROFILE_DEFAULTS[0];
      if (LEGACY_NAMES.includes(out.name) || !saved.name) {
        out.name = fixed.name;
        out.avatar = fixed.avatar;
      }
      out.grade = fixed.grade;
    } else {
      out.grade = normalizeGrade(saved.grade) || PROFILE_DEFAULTS[index].grade;
    }

    // Force slot-1 default spelling if still an old default misspelling
    if (index === 1 && (out.name === 'Joiah' || out.name === 'Josiah')) {
      out.name = 'Joziah';
    }

    if (!out.chess) out.chess = { completed: 0, learned: [] };
    if (!Array.isArray(out.chess.learned)) out.chess.learned = [];
    if (!Array.isArray(out.stem.completed)) out.stem.completed = [];
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const data = JSON.parse(raw);
      const merged = structuredClone(DEFAULTS);
      if (typeof data.activeProfile === 'number') {
        merged.activeProfile = Math.max(0, Math.min(2, data.activeProfile));
      }
      if (typeof data.soundOn === 'boolean') merged.soundOn = data.soundOn;
      if (Array.isArray(data.profiles)) {
        data.profiles.forEach((p, i) => {
          if (i < 3 && p) {
            merged.profiles[i] = mergeProfile(merged.profiles[i], p, i);
          }
        });
      }
      return merged;
    } catch (e) {
      return structuredClone(DEFAULTS);
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* quota / private mode */ }
  }

  function getProfile(state) {
    return state.profiles[state.activeProfile] || state.profiles[0];
  }

  function getGrade(state) {
    const p = getProfile(state);
    return normalizeGrade(p.grade) || 'prek';
  }

  function gradeLabel(grade) {
    return GRADE_LABELS[grade] || grade || 'Pre-K';
  }

  function addStars(state, n) {
    const p = getProfile(state);
    p.stars = (p.stars || 0) + n;
    save(state);
    return p.stars;
  }

  /* ---- Answer log (parent Excel tracker) ---- */

  function formatLocalTimestamp(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    // Readable local: 2026-09-23 19:15:42
    return (
      dt.getFullYear() + '-' +
      pad(dt.getMonth() + 1) + '-' +
      pad(dt.getDate()) + ' ' +
      pad(dt.getHours()) + ':' +
      pad(dt.getMinutes()) + ':' +
      pad(dt.getSeconds())
    );
  }

  function getAnswerLog() {
    try {
      const raw = localStorage.getItem(ANSWER_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map(row => {
        if (!row || typeof row !== 'object') return row;
        const child = canonicalChildName(row.child);
        if (child !== row.child) return Object.assign({}, row, { child });
        return row;
      });
    } catch (e) {
      return [];
    }
  }

  function saveAnswerLog(rows) {
    try {
      localStorage.setItem(ANSWER_KEY, JSON.stringify(rows));
    } catch (e) { /* quota */ }
  }

  /**
   * Append one answer attempt.
   * @param {{ child:string, subject:string, prompt:string, correct:boolean, detail?:string }} entry
   */
  function logAnswer(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const row = {
      ts: formatLocalTimestamp(new Date()),
      child: canonicalChildName(String(entry.child || 'Unknown')).slice(0, 32),
      subject: String(entry.subject || '').slice(0, 40),
      prompt: String(entry.prompt == null ? '' : entry.prompt).slice(0, 500),
      result: entry.correct ? 'Correct' : 'Incorrect',
      detail: entry.detail != null ? String(entry.detail).slice(0, 500) : ''
    };
    const log = getAnswerLog();
    log.push(row);
    while (log.length > ANSWER_CAP) log.shift();
    saveAnswerLog(log);
    return row;
  }

  function answerLogCount() {
    return getAnswerLog().length;
  }

  global.KidsStorage = {
    load, save, getProfile, getGrade, gradeLabel, addStars,
    logAnswer, getAnswerLog, answerLogCount, canonicalChildName,
    DEFAULTS, KEY, ANSWER_KEY, ANSWER_CAP, GRADE_LABELS, PROFILE_DEFAULTS, CHILD_NAMES
  };
})(window);
