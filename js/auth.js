/* Optional Google Auth + Firestore household sync (Firebase compat CDN).
   No-ops when KidsFirebaseConfig.enabled is false — guest mode unchanged. */
(function (global) {
  const SAVE_DEBOUNCE_MS = 800;

  let enabled = false;
  let app = null;
  let auth = null;
  let db = null;
  let currentUser = null;
  let authListener = null;
  let saveTimer = null;
  let saving = false;
  let pendingState = null;
  let ready = false;

  function cfg() {
    return global.KidsFirebaseConfig || { enabled: false };
  }

  function isEnabled() {
    return enabled;
  }

  function isSignedIn() {
    return !!(currentUser && currentUser.uid);
  }

  function getUser() {
    return currentUser;
  }

  function init() {
    const c = cfg();
    enabled = !!(c && c.enabled && c.apiKey && c.projectId && c.appId);
    if (!enabled) {
      ready = true;
      if (typeof authListener === 'function') {
        try { authListener(null); } catch (e) { /* ignore */ }
      }
      return false;
    }
    if (typeof global.firebase === 'undefined') {
      console.warn('[KidsAuth] Firebase SDK not loaded; cloud save disabled.');
      enabled = false;
      ready = true;
      return false;
    }
    try {
      if (!global.firebase.apps || !global.firebase.apps.length) {
        app = global.firebase.initializeApp({
          apiKey: c.apiKey,
          authDomain: c.authDomain,
          projectId: c.projectId,
          storageBucket: c.storageBucket,
          messagingSenderId: c.messagingSenderId,
          appId: c.appId
        });
      } else {
        app = global.firebase.app();
      }
      auth = global.firebase.auth();
      db = global.firebase.firestore();
      // Complete redirect-based sign-in if we returned from Google
      auth.getRedirectResult().catch(function (e) {
        console.warn('[KidsAuth] getRedirectResult', e);
      });
      auth.onAuthStateChanged(async (user) => {
        currentUser = user || null;
        if (typeof authListener === 'function') {
          try {
            await authListener(currentUser);
          } catch (e) {
            console.warn('[KidsAuth] auth listener error', e);
          }
        }
      });
      ready = true;
      return true;
    } catch (e) {
      console.warn('[KidsAuth] init failed', e);
      enabled = false;
      ready = true;
      return false;
    }
  }

  function onAuthStateChanged(cb) {
    authListener = typeof cb === 'function' ? cb : null;
    if (ready && typeof authListener === 'function') {
      try { authListener(currentUser); } catch (e) { /* ignore */ }
    }
  }

  async function signInWithGoogle() {
    if (!enabled || !auth) {
      return { ok: false, error: 'Cloud save is not enabled yet.' };
    }
    const provider = new global.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await auth.signInWithPopup(provider);
      return { ok: true, user: result.user };
    } catch (err) {
      const code = err && err.code;
      // Only fall back to redirect when the popup was blocked (not user cancel)
      if (code === 'auth/popup-blocked') {
        try {
          await auth.signInWithRedirect(provider);
          return { ok: true, redirect: true };
        } catch (err2) {
          return { ok: false, error: (err2 && err2.message) || 'Sign-in failed' };
        }
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { ok: false, cancelled: true, error: 'Sign-in cancelled' };
      }
      return { ok: false, error: (err && err.message) || 'Sign-in failed' };
    }
  }

  async function signOut() {
    flushSave();
    if (!auth) {
      currentUser = null;
      return { ok: true };
    }
    try {
      await auth.signOut();
      currentUser = null;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'Sign-out failed' };
    }
  }

  function householdRef(uid) {
    return db.collection('households').doc(uid);
  }

  async function loadHousehold(uid) {
    if (!enabled || !db || !uid) return null;
    // Prefer cache when offline
    const cached = global.KidsStorage && KidsStorage.loadCloudCache
      ? KidsStorage.loadCloudCache(uid)
      : null;
    try {
      const snap = await householdRef(uid).get();
      if (!snap.exists) {
        return { empty: true, cached: cached };
      }
      const data = snap.data() || {};
      const state = KidsStorage.normalizeHouseholdState(data, uid);
      // Keep a local offline copy
      KidsStorage.save(state);
      return { empty: false, state: state };
    } catch (e) {
      console.warn('[KidsAuth] loadHousehold failed', e);
      if (cached) return { empty: false, state: cached, fromCache: true };
      return { empty: true, error: e, cached: cached };
    }
  }

  function householdDocFromState(state, user) {
    const u = user || currentUser;
    return {
      version: 1,
      email: (state && state.email) || (u && u.email) || '',
      displayName: (state && state.displayName) || (u && u.displayName) || '',
      updatedAt: (state && state.updatedAt) || Date.now(),
      activeProfile: state.activeProfile | 0,
      soundOn: state.soundOn !== false,
      profiles: state.profiles || [],
      answerLog: Array.isArray(state.answerLog) ? state.answerLog.slice(-KidsStorage.ANSWER_CAP) : []
    };
  }

  async function saveHousehold(uid, state) {
    if (!enabled || !db || !uid || !state) return { ok: false };
    const doc = householdDocFromState(state);
    state.updatedAt = doc.updatedAt;
    state.email = doc.email;
    state.displayName = doc.displayName;
    // Always refresh local cloud cache
    if (global.KidsStorage) {
      state.mode = 'household';
      state.uid = uid;
      KidsStorage.save(state);
    }
    try {
      await householdRef(uid).set(doc, { merge: true });
      return { ok: true };
    } catch (e) {
      console.warn('[KidsAuth] saveHousehold failed (kept local cache)', e);
      return { ok: false, error: e, cached: true };
    }
  }

  function scheduleSave(state) {
    if (!isSignedIn() || !state || !KidsStorage.isHousehold(state)) return;
    pendingState = state;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flushSave();
    }, SAVE_DEBOUNCE_MS);
  }

  function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!pendingState || !isSignedIn() || saving) return;
    const snap = pendingState;
    pendingState = null;
    saving = true;
    saveHousehold(currentUser.uid, snap).finally(() => {
      saving = false;
      // If more edits arrived while saving, schedule again
      if (pendingState) scheduleSave(pendingState);
    });
  }

  /**
   * After login: load cloud household, or seed from guest if empty.
   * Returns the household state to apply in the app.
   */
  async function adoptHouseholdAfterLogin(user) {
    if (!user || !user.uid) return null;
    const result = await loadHousehold(user.uid);
    if (result && result.state && !result.empty) {
      result.state.email = user.email || result.state.email || '';
      result.state.displayName = user.displayName || result.state.displayName || '';
      result.state.uid = user.uid;
      result.state.mode = 'household';
      return result.state;
    }
    // Empty cloud → seed from guest once
    const seeded = KidsStorage.seedHouseholdFromGuest(user);
    await saveHousehold(user.uid, seeded);
    return seeded;
  }

  global.KidsAuth = {
    init,
    isEnabled,
    isSignedIn,
    getUser,
    onAuthStateChanged,
    signInWithGoogle,
    signOut,
    loadHousehold,
    saveHousehold,
    scheduleSave,
    flushSave,
    adoptHouseholdAfterLogin,
    householdDocFromState
  };
})(window);
