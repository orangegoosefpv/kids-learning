/* Parent Excel answer tracker — one Log sheet; SheetJS + optional File System Access */
(function (global) {
  const IDB_NAME = 'kidsLearningLab_fs_v1';
  const IDB_STORE = 'handles';
  const HANDLE_KEY = 'trackerXlsx';
  const DOWNLOAD_NAME = 'KidsLearningLab-tracker.xlsx';

  function supportsFSAccess() {
    return typeof window.showSaveFilePicker === 'function' &&
      typeof window.showOpenFilePicker === 'function' &&
      typeof indexedDB !== 'undefined';
  }

  function openIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IDB open failed'));
    });
  }

  async function idbGet(key) {
    try {
      const db = await openIdb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return null;
    }
  }

  async function idbSet(key, value) {
    try {
      const db = await openIdb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function idbDel(key) {
    try {
      const db = await openIdb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { /* ignore */ }
  }

  function ensureXLSX() {
    if (typeof global.XLSX === 'undefined' || !global.XLSX.utils) {
      throw new Error('SheetJS (XLSX) not loaded');
    }
    return global.XLSX;
  }

  function buildWorkbook(log) {
    const XLSX = ensureXLSX();
    const rows = Array.isArray(log) ? log : global.KidsStorage.getAnswerLog();

    // Single sheet "Log": Child | Section | Question/Prompt | Result | Timestamp
    const aoa = [
      ['Child', 'Section', 'Question/Prompt', 'Result', 'Timestamp']
    ];
    rows.forEach(r => {
      const child = global.KidsStorage.canonicalChildName
        ? global.KidsStorage.canonicalChildName(r.child)
        : (r.child || '');
      aoa.push([
        child,
        r.subject || r.section || '',
        r.prompt || '',
        r.result || '',
        r.ts || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 56 }, { wch: 10 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Log');
    return wb;
  }

  function workbookToBlob(wb) {
    const XLSX = ensureXLSX();
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || DOWNLOAD_NAME;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  async function downloadTracker() {
    const wb = buildWorkbook(global.KidsStorage.getAnswerLog());
    const blob = workbookToBlob(wb);
    triggerDownload(blob, DOWNLOAD_NAME);
    return { ok: true, mode: 'download', count: global.KidsStorage.answerLogCount() };
  }

  async function verifyPermission(handle, mode) {
    if (!handle) return false;
    const opts = { mode: mode || 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  async function getStoredHandle() {
    return idbGet(HANDLE_KEY);
  }

  async function writeToHandle(handle) {
    const wb = buildWorkbook(global.KidsStorage.getAnswerLog());
    const blob = workbookToBlob(wb);
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { ok: true, mode: 'update', count: global.KidsStorage.answerLogCount() };
  }

  async function pickSaveLocation() {
    if (!supportsFSAccess()) {
      return downloadTracker();
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: DOWNLOAD_NAME,
        types: [{
          description: 'Excel workbook',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
          }
        }]
      });
      await idbSet(HANDLE_KEY, handle);
      return await writeToHandle(handle);
    } catch (e) {
      if (e && e.name === 'AbortError') return { ok: false, aborted: true };
      return downloadTracker();
    }
  }

  async function pickExistingFile() {
    if (!supportsFSAccess()) {
      return { ok: false, unsupported: true };
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: 'Excel workbook',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
          }
        }]
      });
      await idbSet(HANDLE_KEY, handle);
      return await writeToHandle(handle);
    } catch (e) {
      if (e && e.name === 'AbortError') return { ok: false, aborted: true };
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function updateLinkedFileQuiet() {
    if (!supportsFSAccess()) return { ok: false, unsupported: true };
    const handle = await getStoredHandle();
    if (!handle) return { ok: false, noHandle: true };
    try {
      const ok = await verifyPermission(handle, 'readwrite');
      if (!ok) return { ok: false, denied: true };
      return await writeToHandle(handle);
    } catch (e) {
      await idbDel(HANDLE_KEY);
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function updateOrPick() {
    if (!supportsFSAccess()) {
      const r = await downloadTracker();
      return Object.assign(r, {
        note: 'Click Download to refresh the spreadsheet. (This browser cannot update a file in place.)'
      });
    }
    const handle = await getStoredHandle();
    if (handle) {
      try {
        const ok = await verifyPermission(handle, 'readwrite');
        if (ok) return await writeToHandle(handle);
      } catch (e) {
        await idbDel(HANDLE_KEY);
      }
    }
    const opened = await pickExistingFile();
    if (opened && opened.ok) return opened;
    if (opened && opened.aborted) {
      return pickSaveLocation();
    }
    return pickSaveLocation();
  }

  async function hasLinkedFile() {
    if (!supportsFSAccess()) return false;
    const h = await getStoredHandle();
    return !!h;
  }

  global.KidsTracker = {
    DOWNLOAD_NAME,
    supportsFSAccess,
    buildWorkbook,
    workbookToBlob,
    downloadTracker,
    pickSaveLocation,
    pickExistingFile,
    updateLinkedFileQuiet,
    updateOrPick,
    hasLinkedFile
  };
})(window);
