/* Progress persistence per kid profile + answer log for parent Excel tracker
   Guest mode: kidsLearningLab_v1 (3 fixed-grade slots) + kidsLearningLab_answers_v1
   Household mode: kidsLearningLab_cloud_{uid} (+ answerLog on the state object) */
(function (global) {
  const KEY = 'kidsLearningLab_v1';
  const ANSWER_KEY = 'kidsLearningLab_answers_v1';
  const ANSWER_CAP = 2000;
  const MAX_KIDS = 8;
  const CLOUD_KEY_PREFIX = 'kidsLearningLab_cloud_';

  const GRADE_LABELS = {
    prek: 'Pre-K',
    grade2: 'Grade 2',
    grade3: 'Grade 3'
  };

  const AVATAR_CHOICES = [
    '🦊', '🐼', '🦄', '🐯', '🐸', '🐵',
    '🦁', '🐰', '🐻', '🐶', '🐱', '🐲'
  ];

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

  function makeBlankKid(opts) {
    const o = opts || {};
    const grade = normalizeGrade(o.grade) || 'prek';
    const avatar = (typeof o.avatar === 'string' && o.avatar) ? o.avatar : AVATAR_CHOICES[0];
    const name = (typeof o.name === 'string' && o.name.trim())
      ? canonicalChildName(o.name.trim()).slice(0, 16)
      : 'Kid';
    return Object.assign({ name: name, avatar: avatar, grade: grade, stars: 0 }, blankProgress());
  }

  const DEFAULTS = {
    mode: 'guest',
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
    const lower = t.toLowerCase();
    if (lower === 'joiah' || lower === 'josiah') return 'Joziah';
    return t;
  }

  function normalizeProfile(p, index) {
    const prog = blankProgress();
    const fallback = PROFILE_DEFAULTS[typeof index === 'number' ? index : 0] || PROFILE_DEFAULTS[0];
    const saved = p && typeof p === 'object' ? p : {};
    const out = Object.assign({}, fallback, {
      stars: 0,
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

    const g = normalizeGrade(saved.grade);
    out.grade = g || fallback.grade;

    if (!out.chess) out.chess = { completed: 0, learned: [] };
    if (!Array.isArray(out.chess.learned)) out.chess.learned = [];
    if (!out.stem) out.stem = { level: 0, completed: [] };
    if (!Array.isArray(out.stem.completed)) out.stem.completed = [];
    return out;
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

    if (index === 1 && (out.name === 'Joiah' || out.name === 'Josiah')) {
      out.name = 'Joziah';
    }

    if (!out.chess) out.chess = { completed: 0, learned: [] };
    if (!Array.isArray(out.chess.learned)) out.chess.learned = [];
    if (!Array.isArray(out.stem.completed)) out.stem.completed = [];
    return out;
  }

  function clampActiveProfile(state) {
    if (!state || !Array.isArray(state.profiles) || !state.profiles.length) {
      if (state) state.activeProfile = 0;
      return 0;
    }
    let i = typeof state.activeProfile === 'number' ? state.activeProfile : 0;
    if (i < 0) i = 0;
    if (i >= state.profiles.length) i = state.profiles.length - 1;
    state.activeProfile = i;
    return i;
  }

  function isHousehold(state) {
    return !!(state && (state.mode === 'household' || state.uid));
  }

  function cloudKey(uid) {
    return CLOUD_KEY_PREFIX + String(uid || '');
  }

  /** Guest load — always merges into 3 default slots */
  function loadGuest() {
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
      merged.mode = 'guest';
      delete merged.uid;
      delete merged.email;
      delete merged.displayName;
      delete merged.answerLog;
      return merged;
    } catch (e) {
      return structuredClone(DEFAULTS);
    }
  }

  function load() {
    return loadGuest();
  }

  function loadCloudCache(uid) {
    if (!uid) return null;
    try {
      const raw = localStorage.getItem(cloudKey(uid));
      if (!raw) return null;
      const data = JSON.parse(raw);
      return normalizeHouseholdState(data, uid);
    } catch (e) {
      return null;
    }
  }

  function normalizeHouseholdState(data, uid) {
    const src = data && typeof data === 'object' ? data : {};
    const profilesSrc = Array.isArray(src.profiles) ? src.profiles : [];
    let profiles = profilesSrc
      .filter(Boolean)
      .slice(0, MAX_KIDS)
      .map((p, i) => normalizeProfile(p, i));
    if (!profiles.length) {
      profiles = PROFILE_DEFAULTS.map((_, i) => makeProfile(i));
    }
    const state = {
      version: 1,
      mode: 'household',
      uid: uid || src.uid || '',
      email: typeof src.email === 'string' ? src.email : '',
      displayName: typeof src.displayName === 'string' ? src.displayName : '',
      updatedAt: typeof src.updatedAt === 'number' ? src.updatedAt : Date.now(),
      activeProfile: typeof src.activeProfile === 'number' ? src.activeProfile : 0,
      soundOn: typeof src.soundOn === 'boolean' ? src.soundOn : true,
      profiles: profiles,
      answerLog: Array.isArray(src.answerLog) ? src.answerLog.slice(-ANSWER_CAP) : []
    };
    clampActiveProfile(state);
    return state;
  }

  /** Build a household state by copying current guest profiles + guest answer log */
  function seedHouseholdFromGuest(user) {
    const guest = loadGuest();
    const answers = getGuestAnswerLog();
    return normalizeHouseholdState({
      version: 1,
      email: (user && user.email) || '',
      displayName: (user && user.displayName) || '',
      updatedAt: Date.now(),
      activeProfile: guest.activeProfile,
      soundOn: guest.soundOn,
      profiles: guest.profiles,
      answerLog: answers
    }, user && user.uid);
  }

  function save(state) {
    try {
      if (isHousehold(state) && state.uid) {
        const payload = {
          version: 1,
          mode: 'household',
          uid: state.uid,
          email: state.email || '',
          displayName: state.displayName || '',
          updatedAt: Date.now(),
          activeProfile: state.activeProfile,
          soundOn: state.soundOn !== false,
          profiles: state.profiles,
          answerLog: Array.isArray(state.answerLog) ? state.answerLog.slice(-ANSWER_CAP) : []
        };
        state.updatedAt = payload.updatedAt;
        localStorage.setItem(cloudKey(state.uid), JSON.stringify(payload));
      } else {
        // Guest: never write household fields into the guest key
        const guestPayload = {
          activeProfile: Math.max(0, Math.min(2, state.activeProfile | 0)),
          soundOn: state.soundOn !== false,
          profiles: (state.profiles || []).slice(0, 3)
        };
        localStorage.setItem(KEY, JSON.stringify(guestPayload));
      }
    } catch (e) { /* quota / private mode */ }
  }

  function getProfile(state) {
    clampActiveProfile(state);
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
    if (isHousehold(state) && global.KidsAuth && KidsAuth.scheduleSave) {
      KidsAuth.scheduleSave(state);
    }
    return p.stars;
  }

  function kidHasProgress(p) {
    if (!p) return false;
    if ((p.stars || 0) > 0) return true;
    const t = p.typing || {};
    if ((t.completed || 0) > 0 || (t.level || 0) > 0) return true;
    const m = p.math || {};
    if ((m.prek || 0) + (m.grade2 || 0) + (m.grade3 || 0) > 0) return true;
    if ((p.reading && p.reading.completed) || 0) return true;
    if ((p.spelling && p.spelling.completed) || 0) return true;
    if ((p.science && p.science.completed) || 0) return true;
    if ((p.chess && p.chess.completed) || 0) return true;
    if (p.stem && Array.isArray(p.stem.completed) && p.stem.completed.length) return true;
    return false;
  }

  /* ---- Answer log (parent Excel tracker) ---- */

  let _boundStateGetter = null;

  /** App binds its live state so getAnswerLog/logAnswer see household answerLog */
  function bindState(getter) {
    _boundStateGetter = typeof getter === 'function' ? getter : null;
  }

  function resolveBoundState() {
    try {
      return _boundStateGetter ? _boundStateGetter() : null;
    } catch (e) {
      return null;
    }
  }

  function formatLocalTimestamp(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return (
      dt.getFullYear() + '-' +
      pad(dt.getMonth() + 1) + '-' +
      pad(dt.getDate()) + ' ' +
      pad(dt.getHours()) + ':' +
      pad(dt.getMinutes()) + ':' +
      pad(dt.getSeconds())
    );
  }

  function getGuestAnswerLog() {
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

  function saveGuestAnswerLog(rows) {
    try {
      localStorage.setItem(ANSWER_KEY, JSON.stringify(rows));
    } catch (e) { /* quota */ }
  }

  function getAnswerLog() {
    const s = resolveBoundState();
    if (isHousehold(s)) {
      const log = Array.isArray(s.answerLog) ? s.answerLog : [];
      return log.map(row => {
        if (!row || typeof row !== 'object') return row;
        const child = canonicalChildName(row.child);
        if (child !== row.child) return Object.assign({}, row, { child });
        return row;
      });
    }
    return getGuestAnswerLog();
  }

  function saveAnswerLog(rows) {
    const s = resolveBoundState();
    if (isHousehold(s)) {
      s.answerLog = Array.isArray(rows) ? rows.slice(-ANSWER_CAP) : [];
      return;
    }
    saveGuestAnswerLog(rows);
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
    const s = resolveBoundState();
    if (isHousehold(s)) {
      if (!Array.isArray(s.answerLog)) s.answerLog = [];
      s.answerLog.push(row);
      while (s.answerLog.length > ANSWER_CAP) s.answerLog.shift();
      return row;
    }
    const log = getGuestAnswerLog();
    log.push(row);
    while (log.length > ANSWER_CAP) log.shift();
    saveGuestAnswerLog(log);
    return row;
  }

  function answerLogCount() {
    return getAnswerLog().length;
  }

  global.KidsStorage = {
    load, save, getProfile, getGrade, gradeLabel, addStars,
    logAnswer, getAnswerLog, saveAnswerLog, answerLogCount, canonicalChildName,
    blankProgress, makeBlankKid, normalizeProfile, clampActiveProfile,
    loadGuest, loadCloudCache, seedHouseholdFromGuest, normalizeHouseholdState,
    isHousehold, kidHasProgress, bindState, cloudKey, getGuestAnswerLog,
    DEFAULTS, KEY, ANSWER_KEY, ANSWER_CAP, MAX_KIDS, GRADE_LABELS,
    PROFILE_DEFAULTS, CHILD_NAMES, AVATAR_CHOICES, CLOUD_KEY_PREFIX
  };
})(window);
