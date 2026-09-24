/**
 * Optional Firebase (Google Auth + Firestore) for household cloud save.
 *
 * Guest mode (enabled: false) needs NO Firebase project — the site works
 * entirely from localStorage with Zion / Joziah / Zachariah.
 *
 * To turn on cloud save:
 * 1. Create a Firebase project and web app (see README).
 * 2. Enable Google sign-in and create a Firestore database.
 * 3. Paste the web config values below and set enabled: true.
 * 4. Authorized domains (Authentication → Settings):
 *      - orangegoosefpv.github.io
 *      - localhost
 */
(function (global) {
  global.KidsFirebaseConfig = {
    enabled: false,
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  };
})(window);
