/* Kids Learning Lab — UI controller */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let state = KidsStorage.load();

  function profile() { return KidsStorage.getProfile(state); }
  function kidGrade() { return KidsStorage.getGrade(state); }
  function persist() { KidsStorage.save(state); }

  function trackAnswer(section, prompt, correct, detail) {
    const child = profile().name || 'Unknown';
    KidsStorage.logAnswer({
      child: child,
      subject: section,
      prompt: prompt,
      correct: !!correct,
      detail: detail || ''
    });
    updateTrackerCount();
    // Quiet rewrite of linked Excel when File System Access is available
    if (window.KidsTracker && KidsTracker.updateLinkedFileQuiet) {
      KidsTracker.updateLinkedFileQuiet().catch(() => {});
    }
  }

  function updateTrackerCount() {
    const el = $('#tracker-count');
    if (!el) return;
    const n = KidsStorage.answerLogCount ? KidsStorage.answerLogCount() : 0;
    el.textContent = '📊 Excel tracker · ' + n + ' answers';
  }



  /* ---- Pre-K read-aloud (Web Speech) ---- */
  let speakTimer = null;
  let lastSpeakScript = '';

  function isPrek() { return kidGrade() === 'prek'; }

  function cancelReadAloud() {
    if (speakTimer) { clearTimeout(speakTimer); speakTimer = null; }
    KidsAudio.cancelSpeak && KidsAudio.cancelSpeak();
  }

  function setReadAloud(script, { auto = true } = {}) {
    lastSpeakScript = String(script || '').replace(/\s+/g, ' ').trim();
    KidsAudio.setSpoken && KidsAudio.setSpoken(lastSpeakScript);
    cancelReadAloud();
    if (!lastSpeakScript) return;
    if (auto && isPrek()) {
      // Short delay so UI paints; voices may load async
      speakTimer = setTimeout(() => {
        speakTimer = null;
        KidsAudio.speak && KidsAudio.speak(lastSpeakScript);
      }, 280);
    }
  }

  function replayReadAloud() {
    if (!lastSpeakScript) return;
    cancelReadAloud();
    KidsAudio.speak && KidsAudio.speak(lastSpeakScript);
  }

  function choicesPhrase(list) {
    const arr = (list || []).map(c => String(c));
    if (!arr.length) return '';
    if (arr.length === 1) return ` Choices: ${arr[0]}.`;
    return ` Choices: ${arr.slice(0, -1).join(', ')}, or ${arr[arr.length - 1]}.`;
  }


  function showScreen(id) {
    if (id === 'screen-home') cancelReadAloud();
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#' + id);
    if (el) el.classList.add('active');
    updateChrome();
  }

  function updateChrome() {
    const p = profile();
    $$('.stars-count').forEach(el => { el.textContent = String(p.stars || 0); });
    renderProfiles();
    const soundBtn = $('#btn-sound');
    if (soundBtn) {
      soundBtn.classList.toggle('active', state.soundOn !== false);
      soundBtn.classList.toggle('sound-toggle', true);
    }
  }

  function renderProfiles() {
    const row = $('#profile-row');
    if (!row) return;
    row.innerHTML = state.profiles.map((p, i) => `
      <button type="button" class="profile-chip ${i === state.activeProfile ? 'active' : ''}" data-profile="${i}">
        <span class="avatar">${p.avatar}</span>
        <span class="profile-meta">
          <span class="profile-name">${escapeHtml(p.name)}</span>
          <span class="grade-badge">${escapeHtml(KidsStorage.gradeLabel(p.grade))}</span>
        </span>
      </button>
    `).join('') + `<button type="button" class="profile-edit" id="btn-edit-name" title="Edit names">✏️ Names</button>`;

    $$('.profile-chip', row).forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeProfile = Number(btn.dataset.profile);
        persist();
        updateChrome();
        refreshHubStats();
        KidsAudio.click();
      });
    });
    const edit = $('#btn-edit-name');
    if (edit) edit.addEventListener('click', openNameEditor);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function refreshHubStats() {
    const p = profile();
    const el = $('#hub-stats');
    if (!el) return;
    const stemDone = (p.stem.completed || []).length;
    const grade = KidsStorage.gradeLabel(p.grade);
    el.innerHTML = `
      <div class="stat-pill">👤 <span>${escapeHtml(p.name)}</span> · ${escapeHtml(grade)}</div>
      <div class="stat-pill">⭐ Stars: <span>${p.stars || 0}</span></div>
      <div class="stat-pill">⌨️ Typing: <span>${p.typing.completed || 0}</span></div>
      <div class="stat-pill">📖 Reading: <span>${(p.reading && p.reading.completed) || 0}</span></div>
      <div class="stat-pill">✏️ Spelling: <span>${(p.spelling && p.spelling.completed) || 0}</span></div>
      <div class="stat-pill">🔬 Science: <span>${(p.science && p.science.completed) || 0}</span></div>
      <div class="stat-pill">🔢 Math best: <span>${p.math[kidGrade()] || 0}</span></div>
      <div class="stat-pill">🐵 Monkey Code: <span>${stemDone}/12</span></div>
      <div class="stat-pill">♟️ Chess: <span>${(p.chess && p.chess.completed) || 0}</span></div>
    `;
    updateTrackerCount();
  }

  function confettiBurst() {
    const emojis = ['⭐', '🎉', '✨', '🌟', '💫', '🎊'];
    for (let i = 0; i < 18; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.textContent = emojis[i % emojis.length];
      el.style.left = Math.random() * 100 + 'vw';
      el.style.top = (-10 - Math.random() * 20) + 'vh';
      el.style.animationDelay = (Math.random() * 0.3) + 's';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    }
  }

  function showModal({ emoji, title, body, stars, primary, secondary }) {
    const overlay = $('#modal');
    $('#modal-emoji').textContent = emoji || '🎉';
    $('#modal-title').textContent = title || 'Nice!';
    $('#modal-body').textContent = body || '';
    const starsEl = $('#modal-stars');
    if (stars) {
      starsEl.textContent = '⭐'.repeat(Math.min(5, stars)) + (stars > 5 ? ` +${stars - 5}` : '');
      starsEl.classList.remove('hidden');
    } else {
      starsEl.classList.add('hidden');
    }
    const btnP = $('#modal-primary');
    const btnS = $('#modal-secondary');
    btnP.textContent = primary?.label || 'OK';
    btnS.textContent = secondary?.label || 'Back';
    btnS.classList.toggle('hidden', !secondary);
    overlay.classList.add('show');

    const cleanup = () => {
      btnP.onclick = null;
      btnS.onclick = null;
      overlay.classList.remove('show');
    };
    btnP.onclick = () => { cleanup(); primary?.fn && primary.fn(); };
    btnS.onclick = () => { cleanup(); secondary?.fn && secondary.fn(); };
  }

  function openNameEditor() {
    const overlay = $('#modal');
    $('#modal-emoji').textContent = '✏️';
    $('#modal-title').textContent = 'Player Names';
    $('#modal-body').innerHTML = state.profiles.map((p, i) =>
      `<div class="edit-row"><label class="edit-grade">${escapeHtml(KidsStorage.gradeLabel(p.grade))}</label>
       <input class="edit-field" data-i="${i}" value="${escapeHtml(p.name)}" maxlength="16" /></div>`
    ).join('');
    $('#modal-stars').classList.add('hidden');
    const btnP = $('#modal-primary');
    const btnS = $('#modal-secondary');
    btnP.textContent = 'Save';
    btnS.textContent = 'Cancel';
    btnS.classList.remove('hidden');
    overlay.classList.add('show');
    btnP.onclick = () => {
      $$('.edit-field', overlay).forEach(inp => {
        const i = Number(inp.dataset.i);
        const fixed = KidsStorage.PROFILE_DEFAULTS[i];
        const v = inp.value.trim() || (fixed ? fixed.name : `Player ${i + 1}`);
        const canon = KidsStorage.canonicalChildName ? KidsStorage.canonicalChildName(v) : v;
        state.profiles[i].name = String(canon).slice(0, 16);
      });
      persist();
      overlay.classList.remove('show');
      updateChrome();
      KidsAudio.star();
    };
    btnS.onclick = () => overlay.classList.remove('show');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    persist();
    updateChrome();
    if (!state.soundOn) cancelReadAloud();
    else KidsAudio.click();
  }

  /* ================= TYPING ================= */
  let typingDone = false;
  let typingAwaitEnter = false;

  function openTyping() {
    cancelReadAloud();
    showScreen('screen-typing');
    TypingGame.setLevel(profile().typing.level || 0);
    renderTypingLevels();
    startTypingRound();
  }

  function renderTypingLevels() {
    const wrap = $('#typing-levels');
    wrap.innerHTML = TypingGame.getLevels().map((lv, i) =>
      `<button type="button" class="level-pill ${i === TypingGame.getState().levelIdx ? 'active' : ''}" data-lv="${i}">${lv.name}</button>`
    ).join('');
    $$('.level-pill', wrap).forEach(btn => {
      btn.addEventListener('click', () => {
        TypingGame.setLevel(Number(btn.dataset.lv));
        state.profiles[state.activeProfile].typing.level = Number(btn.dataset.lv);
        persist();
        renderTypingLevels();
        startTypingRound();
        KidsAudio.click();
      });
    });
  }

  function startTypingRound() {
    typingDone = false;
    typingAwaitEnter = false;
    const lv = TypingGame.getLevel();
    $('#typing-hint').textContent = lv.hint;
    TypingGame.renderTarget($('#typing-target'));
    const input = $('#typing-input');
    input.value = '';
    input.disabled = false;
    input.readOnly = false;
    input.focus();
    updateTypingMeta();
    $('#typing-streak').textContent = '';
    $('#typing-feedback').textContent = '';
    $('#typing-feedback').className = 'feedback';
    $('#typing-next-row')?.classList.add('hidden');
    setReadAloud('Type the letters you see.');
  }

  function updateTypingMeta() {
    const s = TypingGame.getState();
    $('#typing-wpm').textContent = String(s.wpm);
    $('#typing-acc').textContent = String(s.accuracy) + '%';
    $('#typing-streak-num').textContent = String(s.streak);
  }

  function onTypingInput(e) {
    if (typingAwaitEnter) return;
    const input = e.target;
    const s0 = TypingGame.getState();
    let val = input.value;
    if (val.length < s0.typed.length) {
      input.value = s0.typed;
      return;
    }
    while (TypingGame.getState().typed.length < val.length && !typingDone) {
      const ch = val[TypingGame.getState().typed.length];
      const res = TypingGame.onKey(ch);
      if (!res) break;
      TypingGame.renderTarget($('#typing-target'));
      updateTypingMeta();
      if (res.ok === false) {
        $('#typing-streak').textContent = 'Keep going!';
        input.value = TypingGame.getState().typed;
        break;
      }
      if (res.streak >= 5 && res.streak % 5 === 0) {
        $('#typing-streak').textContent = `🔥 ${res.streak} streak!`;
      }
      if (res.done) {
        typingDone = true;
        finishTypingRound(res);
        break;
      }
    }
  }

  function finishTypingRound(res) {
    const p = profile();
    p.typing.completed = (p.typing.completed || 0) + 1;
    if (res.wpm > (p.typing.bestWpm || 0)) p.typing.bestWpm = res.wpm;
    let stars = 1;
    if (res.accuracy >= 90) stars++;
    if (res.wpm >= 15) stars++;
    const target = TypingGame.getState().target || '';
    trackAnswer('Typing', target, true, res.wpm + ' WPM · ' + res.accuracy + '%');
    KidsStorage.addStars(state, stars);
    KidsAudio.star();
    confettiBurst();
    typingAwaitEnter = true;
    const input = $('#typing-input');
    // readOnly (not disabled) so Enter still reaches keydown listeners
    input.readOnly = true;
    input.disabled = false;
    input.blur();
    $('#typing-feedback').textContent = `Done! ${res.wpm} WPM · ${res.accuracy}% · +${stars}⭐`;
    $('#typing-feedback').className = 'feedback ok';
    $('#typing-next-row')?.classList.remove('hidden');
    updateChrome();
  }

  function advanceTyping() {
    if (!typingAwaitEnter) return;
    cancelReadAloud();
    TypingGame.nextPrompt();
    startTypingRound();
  }

  /* ================= MATH ================= */
  let mathAwaitEnter = false;
  let mathAdvanceTimer = null;

  function openMath() {
    cancelReadAloud();
    showScreen('screen-math');
    mathAwaitEnter = false;
    if (mathAdvanceTimer) { clearTimeout(mathAdvanceTimer); mathAdvanceTimer = null; }
    // Grade lock: jump straight into profile grade — no picker
    $('#math-course-pick').classList.add('hidden');
    startMathCourse(kidGrade());
  }

  function startMathCourse(id) {
    MathCourse.start(id);
    $('#math-course-pick').classList.add('hidden');
    $('#math-play').classList.remove('hidden');
    const c = MathCourse.COURSES[id];
    $('#math-title').textContent = `${c.emoji} ${c.name}`;
    renderMathProblem();
  }

  function renderMathProblem() {
    const st = MathCourse.getState();
    if (st.round >= st.total) {
      finishMathCourse();
      return;
    }
    mathAwaitEnter = false;
    if (mathAdvanceTimer) { clearTimeout(mathAdvanceTimer); mathAdvanceTimer = null; }
    const prob = st.problem;
    const pct = Math.round((st.round / st.total) * 100);
    $('#math-progress-fill').style.width = pct + '%';
    $('#math-round-label').textContent = `Round ${st.round + 1} / ${st.total} · Score ${st.score} · ${KidsStorage.gradeLabel(kidGrade())}`;
    $('#math-feedback').textContent = '';
    $('#math-feedback').className = 'feedback';
    $('#math-next-row')?.classList.add('hidden');

    const prompt = $('#math-prompt');
    const visual = $('#math-visual');
    const choices = $('#math-choices');
    const typedRow = $('#math-typed-row');
    visual.innerHTML = '';
    choices.innerHTML = '';
    typedRow.classList.add('hidden');
    choices.classList.remove('hidden');

    if (prob.compare) {
      prompt.textContent = prob.prompt;
      visual.innerHTML = prob.compare.map(c =>
        `<div style="text-align:center;padding:8px;"><div>${c.visualArr.join('')}</div></div>`
      ).join('<div style="font-size:1.5rem;align-self:center;">vs</div>');
    } else if (prob.bigNumber != null) {
      prompt.textContent = prob.prompt;
      visual.innerHTML = `<div style="font-size:4rem;font-weight:900;color:#7c5cff;">${prob.bigNumber}</div>`;
    } else {
      prompt.textContent = prob.prompt;
      if (prob.visualArr && prob.visualArr.length) {
        visual.innerHTML = prob.visualArr.map(e => `<span>${e}</span>`).join('');
      }
    }

    if (prob.mode === 'typed') {
      choices.classList.add('hidden');
      typedRow.classList.remove('hidden');
      const inp = $('#math-answer-input');
      inp.value = '';
      inp.focus();
      $('#math-submit').onclick = () => submitMath(inp.value);
      inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submitMath(inp.value); } };
    } else {
      (prob.choices || []).forEach(ch => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn';
        btn.textContent = String(ch);
        btn.addEventListener('click', () => {
          if (MathCourse.getState().locked) return;
          submitMath(ch, btn);
        });
        choices.appendChild(btn);
      });
    }

    let mathScript = String(prob.prompt || '');
    if (prob.bigNumber != null) mathScript += ` The number is ${prob.bigNumber}.`;
    if (prob.mode !== 'typed' && prob.choices && prob.choices.length) {
      mathScript += choicesPhrase(prob.choices);
    } else if (prob.mode === 'typed') {
      mathScript += ' Type your answer.';
    }
    setReadAloud(mathScript);
  }

  function submitMath(answer, btnEl) {
    const res = MathCourse.check(answer);
    if (!res) return;
    const prob = MathCourse.getState().problem;
    trackAnswer('Math', (prob && prob.prompt) || 'Math problem', res.ok, 'answer: ' + answer);
    if (btnEl) {
      btnEl.classList.add(res.ok ? 'correct' : 'wrong');
      if (!res.ok) {
        $$('.choice-btn', $('#math-choices')).forEach(b => {
          if (Number(b.textContent) === Number(res.correct)) b.classList.add('correct');
        });
      }
    }
    $('#math-feedback').textContent = res.ok ? '⭐ Yes!' : `Almost — answer is ${res.correct}`;
    $('#math-feedback').className = 'feedback ' + (res.ok ? 'ok' : 'bad');

    mathAwaitEnter = true;
    $('#math-next-row')?.classList.remove('hidden');
    if (mathAdvanceTimer) clearTimeout(mathAdvanceTimer);
    mathAdvanceTimer = setTimeout(() => advanceMath(), res.ok ? 650 : 1100);
  }

  function advanceMath() {
    if (!mathAwaitEnter) return;
    mathAwaitEnter = false;
    cancelReadAloud();
    if (mathAdvanceTimer) { clearTimeout(mathAdvanceTimer); mathAdvanceTimer = null; }
    $('#math-next-row')?.classList.add('hidden');
    MathCourse.next();
    const st = MathCourse.getState();
    if (st.round >= st.total) finishMathCourse();
    else renderMathProblem();
  }

  function finishMathCourse() {
    const st = MathCourse.getState();
    const p = profile();
    const key = st.courseId;
    const stars = Math.max(1, Math.round((st.score / st.total) * 5));
    if ((p.math[key] || 0) < st.score) p.math[key] = st.score;
    KidsStorage.addStars(state, stars);
    confettiBurst();
    KidsAudio.star();
    showModal({
      emoji: '🔢',
      title: 'Math complete!',
      body: `You got ${st.score} / ${st.total} correct.`,
      stars,
      primary: { label: 'Play again', fn: () => startMathCourse(st.courseId) },
      secondary: { label: 'Home', fn: () => { showScreen('screen-home'); refreshHubStats(); } }
    });
    refreshHubStats();
  }

  /* ================= READING ================= */
  let readingAwaitEnter = false;
  let readingSentences = [];
  let readingSentenceIdx = 0;

  function openReading() {
    cancelReadAloud();
    showScreen('screen-reading');
    readingAwaitEnter = false;
    readingSentences = [];
    readingSentenceIdx = 0;
    ReadingGame.start(kidGrade());
    $('#reading-title').textContent = `📖 Reading · ${KidsStorage.gradeLabel(kidGrade())}`;
    const tip = $('#reading-grade-tip');
    if (tip) {
      tip.classList.toggle('hidden', kidGrade() !== 'grade2');
      tip.textContent = 'Tip: read one sentence at a time · tap 🔊 Hear it if you need help';
    }
    const speak = $('#reading-speak');
    if (speak) speak.title = kidGrade() === 'grade2' ? 'Read to me' : 'Read aloud';
    renderReading();
  }

  function paintReadingAssist() {
    const view = $('#reading-chunk-view');
    const pos = $('#reading-sent-pos');
    if (!view) return;
    if (!readingSentences.length) {
      view.innerHTML = '';
      if (pos) pos.textContent = '';
      return;
    }
    view.innerHTML = readingSentences.map((s, i) => {
      const words = String(s).split(/(\s+)/).map(tok => {
        if (/^\s+$/.test(tok) || !tok) return escapeHtml(tok);
        return `<span class="reading-word" tabindex="0" role="button" data-word="${escapeHtml(tok)}">${escapeHtml(tok)}</span>`;
      }).join('');
      return `<div class="reading-sentence ${i === readingSentenceIdx ? 'active' : ''}" role="button" tabindex="0" data-si="${i}">${words}</div>`;
    }).join('');
    if (pos) pos.textContent = `Sentence ${readingSentenceIdx + 1} / ${readingSentences.length}`;
    $$('.reading-sentence', view).forEach(el => {
      const activate = () => {
        readingSentenceIdx = Number(el.dataset.si) || 0;
        paintReadingAssist();
        KidsAudio.click();
      };
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('reading-word')) return;
        activate();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });
    $$('.reading-word', view).forEach(el => {
      const speakWord = (e) => {
        e.stopPropagation();
        const w = el.dataset.word || el.textContent;
        KidsAudio.speak && KidsAudio.speak(w);
      };
      el.addEventListener('click', speakWord);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); speakWord(e); }
      });
    });
  }

  function hearCurrentSentence() {
    if (!readingSentences.length) {
      replayReadAloud();
      return;
    }
    const s = readingSentences[readingSentenceIdx] || readingSentences[0];
    KidsAudio.speak && KidsAudio.speak(s);
  }

  function shiftReadingSentence(delta) {
    if (!readingSentences.length) return;
    readingSentenceIdx = Math.max(0, Math.min(readingSentences.length - 1, readingSentenceIdx + delta));
    paintReadingAssist();
  }

  function renderReading() {
    const st = ReadingGame.getState();
    if (st.done) {
      finishReading();
      return;
    }
    readingAwaitEnter = false;
    const q = st.question;
    const pct = Math.round((st.round / st.total) * 100);
    $('#reading-progress-fill').style.width = pct + '%';
    const phaseLabel = q.mode === 'phonics' ? 'Phonics warm-up' : 'Reading';
    $('#reading-round-label').textContent = `${phaseLabel} · ${st.round + 1} / ${st.total} · Score ${st.score}`;
    $('#reading-feedback').textContent = '';
    $('#reading-feedback').className = 'feedback';
    $('#reading-next-row')?.classList.add('hidden');

    const showEl = $('#reading-show');
    const passEl = $('#reading-passage');
    const assistEl = $('#reading-assist');
    const prompt = $('#reading-prompt');
    const choices = $('#reading-choices');
    choices.innerHTML = '';
    readingSentences = [];
    readingSentenceIdx = 0;

    if (q.mode === 'prek' || q.mode === 'phonics') {
      passEl.classList.add('hidden');
      if (assistEl) assistEl.classList.add('hidden');
      showEl.classList.remove('hidden');
      showEl.textContent = q.show || '';
      prompt.textContent = q.prompt;
    } else if (q.mode === 'chunked' && q.sentences && q.sentences.length) {
      // Grade 2 early-reader: one sentence at a time + Hear it / word tap
      showEl.classList.remove('hidden');
      showEl.textContent = q.emoji || '';
      passEl.classList.add('hidden');
      if (assistEl) assistEl.classList.remove('hidden');
      readingSentences = q.sentences.slice();
      readingSentenceIdx = 0;
      paintReadingAssist();
      prompt.textContent = `Q${q.qNum}/${q.qTotal}: ${q.prompt}`;
    } else {
      showEl.classList.add('hidden');
      if (assistEl) assistEl.classList.add('hidden');
      passEl.classList.remove('hidden');
      passEl.textContent = q.passage;
      prompt.textContent = `Q${q.qNum}/${q.qTotal}: ${q.prompt}`;
    }

    (q.choices || []).forEach(ch => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = String(ch);
      btn.addEventListener('click', () => {
        if (ReadingGame.getState().locked || readingAwaitEnter) return;
        submitReading(ch, btn);
      });
      choices.appendChild(btn);
    });

    let readScript = '';
    if (q.mode === 'prek' || q.mode === 'phonics') {
      if (q.show) readScript += `Look. `;
      readScript += String(q.prompt || '');
    } else if (q.sentences && q.sentences.length) {
      // Store full passage for header 🔊; grade2 uses Hear-it for one sentence
      readScript += q.sentences.join(' ') + ' ';
      readScript += String(q.prompt || '');
    } else {
      if (q.passage) readScript += `${q.passage} `;
      readScript += String(q.prompt || '');
    }
    readScript += choicesPhrase(q.choices);
    // Pre-K auto; grade2 chunked stays quiet until Hear it (avoid dumping full block)
    const autoSpeak = isPrek();
    setReadAloud(readScript, { auto: autoSpeak });
  }

  function submitReading(answer, btnEl) {
    const res = ReadingGame.check(answer);
    if (!res) return;
    const q = ReadingGame.getState().question;
    trackAnswer('Reading', (q && q.prompt) || 'Reading', res.ok, 'answer: ' + answer);
    if (btnEl) {
      btnEl.classList.add(res.ok ? 'correct' : 'wrong');
      if (!res.ok) {
        $$('.choice-btn', $('#reading-choices')).forEach(b => {
          if (b.textContent === String(res.correct)) b.classList.add('correct');
        });
      }
    }
    $('#reading-feedback').textContent = res.ok ? '⭐ Yes!' : `Answer: ${res.correct}`;
    $('#reading-feedback').className = 'feedback ' + (res.ok ? 'ok' : 'bad');
    readingAwaitEnter = true;
    $('#reading-next-row')?.classList.remove('hidden');
  }

  function advanceReading() {
    if (!readingAwaitEnter) return;
    readingAwaitEnter = false;
    cancelReadAloud();
    ReadingGame.next();
    const st = ReadingGame.getState();
    if (st.done) finishReading();
    else renderReading();
  }

  function finishReading() {
    const st = ReadingGame.getState();
    const p = profile();
    if (!p.reading) p.reading = { completed: 0 };
    p.reading.completed = (p.reading.completed || 0) + 1;
    const stars = Math.max(1, Math.round((st.score / st.total) * 4));
    KidsStorage.addStars(state, stars);
    confettiBurst();
    KidsAudio.star();
    showModal({
      emoji: '📖',
      title: 'Reading complete!',
      body: `You got ${st.score} / ${st.total} correct.`,
      stars,
      primary: { label: 'Play again', fn: () => openReading() },
      secondary: { label: 'Home', fn: () => { showScreen('screen-home'); refreshHubStats(); } }
    });
    refreshHubStats();
  }

  /* ================= SPELLING ================= */
  let spellingMemTimer = null;

  function openSpelling() {
    cancelReadAloud();
    showScreen('screen-spelling');
    if (spellingMemTimer) clearTimeout(spellingMemTimer);
    SpellingGame.start(kidGrade());
    $('#spelling-title').textContent = `✏️ Spelling · ${KidsStorage.gradeLabel(kidGrade())}`;
    const spSpeak = $('#spelling-speak');
    if (spSpeak) spSpeak.title = kidGrade() === 'grade2' ? 'Read to me' : 'Read aloud';
    renderSpelling();
  }

  function renderSpelling() {
    const st = SpellingGame.getState();
    $('#spelling-emoji').textContent = st.emoji || '';
    $('#spelling-feedback').textContent = '';
    $('#spelling-feedback').className = 'feedback';
    $('#spelling-next-row')?.classList.add('hidden');
    const input = $('#spelling-input');
    input.value = '';
    input.disabled = false;
    input.readOnly = false;

    const wordEl = $('#spelling-word');
    const scramEl = $('#spelling-scramble');

    if (st.awaitEnter) {
      wordEl.textContent = st.word;
      wordEl.classList.remove('hidden-word');
      scramEl.textContent = '';
      input.readOnly = true;
      input.disabled = false;
      input.blur();
      $('#spelling-next-row')?.classList.remove('hidden');
      return;
    }

    // Memorize beat: show word briefly, then hide / show scramble
    wordEl.textContent = st.word;
    wordEl.classList.remove('hidden-word');
    scramEl.textContent = '';
    $('#spelling-hint').textContent = 'Look carefully… then type it!';
    input.disabled = true;
    input.readOnly = false;

    const letters = st.word.split('').join(', ');
    setReadAloud(`Look carefully. The word is ${st.word}. ${letters}.`, { auto: isPrek() });

    if (spellingMemTimer) clearTimeout(spellingMemTimer);
    spellingMemTimer = setTimeout(() => {
      SpellingGame.hideWord();
      SpellingGame.beginTyping();
      wordEl.textContent = '•'.repeat(st.word.length);
      wordEl.classList.add('hidden-word');
      scramEl.textContent = kidGrade() === 'prek' ? '' : `Letters: ${st.scrambled}`;
      $('#spelling-hint').textContent = 'Type the word, then press Enter!';
      input.disabled = false;
      input.readOnly = false;
      input.focus();
      // Keep full word on 🔊 replay; only nudge prek to type now
      lastSpeakScript = `Look carefully. The word is ${st.word}. ${letters}. Now type the word.`;
      KidsAudio.setSpoken && KidsAudio.setSpoken(lastSpeakScript);
      if (isPrek()) {
        KidsAudio.cancelSpeak && KidsAudio.cancelSpeak();
        KidsAudio.speak && KidsAudio.speak('Now type the word.');
      }
    }, kidGrade() === 'prek' ? 3200 : 1800);
  }

  function submitSpelling() {
    const st = SpellingGame.getState();
    if (st.awaitEnter) {
      advanceSpelling();
      return;
    }
    if (st.phase !== 'typing' && st.phase !== 'hide' && st.phase !== 'show') return;
    const input = $('#spelling-input');
    const res = SpellingGame.check(input.value);
    if (!res) return;
    trackAnswer('Spelling', 'Spell: ' + (res.correct || st.word), res.ok, 'typed: ' + input.value);
    // readOnly so document Enter still works for Next
    input.readOnly = true;
    input.disabled = false;
    input.blur();
    if (res.ok) {
      const p = profile();
      if (!p.spelling) p.spelling = { completed: 0 };
      p.spelling.completed = (p.spelling.completed || 0) + 1;
      KidsStorage.addStars(state, 1);
      $('#spelling-feedback').textContent = `⭐ Correct! +1⭐`;
      $('#spelling-feedback').className = 'feedback ok';
      confettiBurst();
      updateChrome();
    } else {
      $('#spelling-feedback').textContent = `Almost — it's "${res.correct}"`;
      $('#spelling-feedback').className = 'feedback bad';
      $('#spelling-word').textContent = res.correct;
      $('#spelling-word').classList.remove('hidden-word');
    }
    $('#spelling-next-row')?.classList.remove('hidden');
  }

  function advanceSpelling() {
    const st = SpellingGame.getState();
    if (!st.awaitEnter) return;
    cancelReadAloud();
    SpellingGame.continueNext();
    renderSpelling();
  }

  /* ================= SCIENCE ================= */
  let scienceAwaitEnter = false;

  function openScience() {
    cancelReadAloud();
    showScreen('screen-science');
    scienceAwaitEnter = false;
    ScienceGame.start(kidGrade());
    $('#science-title').textContent = `🔬 Science · ${KidsStorage.gradeLabel(kidGrade())}`;
    const scSpeak = $('#science-speak');
    if (scSpeak) scSpeak.title = kidGrade() === 'grade2' ? 'Read to me' : 'Read aloud';
    renderScience();
  }

  function renderScience() {
    const st = ScienceGame.getState();
    if (st.done) {
      finishScience();
      return;
    }
    scienceAwaitEnter = false;
    const item = st.item;
    const pct = Math.round((st.round / st.total) * 100);
    $('#science-progress-fill').style.width = pct + '%';
    $('#science-round-label').textContent = `Explorer ${st.round + 1} / ${st.total} · Score ${st.score}`;
    $('#science-feedback').textContent = '';
    $('#science-feedback').className = 'feedback';
    $('#science-next-row')?.classList.add('hidden');
    $('#science-emoji').textContent = item.emoji || '';
    $('#science-theme').textContent = item.theme || 'Discover!';
    $('#science-fact').textContent = item.fact || '';
    $('#science-prompt').textContent = item.q || '';
    const choices = $('#science-choices');
    choices.innerHTML = '';
    (item.choices || []).forEach(ch => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = String(ch);
      btn.addEventListener('click', () => {
        if (ScienceGame.getState().locked || scienceAwaitEnter) return;
        submitScience(ch, btn);
      });
      choices.appendChild(btn);
    });

    let sciScript = '';
    if (item.theme) sciScript += `${item.theme}. `;
    if (item.fact) sciScript += `${item.fact} `;
    if (item.q) sciScript += String(item.q);
    sciScript += choicesPhrase(item.choices);
    setReadAloud(sciScript);
  }

  function submitScience(answer, btnEl) {
    const res = ScienceGame.check(answer);
    if (!res) return;
    const item = ScienceGame.getState().item;
    trackAnswer('Science', (item && item.q) || 'Science', res.ok, 'answer: ' + answer);
    if (btnEl) {
      btnEl.classList.add(res.ok ? 'correct' : 'wrong');
      if (!res.ok) {
        $$('.choice-btn', $('#science-choices')).forEach(b => {
          if (b.textContent === String(res.correct)) b.classList.add('correct');
        });
      }
    }
    $('#science-feedback').textContent = res.ok ? '⭐ Cool!' : `Answer: ${res.correct}`;
    $('#science-feedback').className = 'feedback ' + (res.ok ? 'ok' : 'bad');
    scienceAwaitEnter = true;
    $('#science-next-row')?.classList.remove('hidden');
  }

  function advanceScience() {
    if (!scienceAwaitEnter) return;
    scienceAwaitEnter = false;
    cancelReadAloud();
    ScienceGame.next();
    const st = ScienceGame.getState();
    if (st.done) finishScience();
    else renderScience();
  }

  function finishScience() {
    const st = ScienceGame.getState();
    const p = profile();
    if (!p.science) p.science = { completed: 0 };
    p.science.completed = (p.science.completed || 0) + 1;
    const stars = Math.max(1, Math.round((st.score / st.total) * 4));
    KidsStorage.addStars(state, stars);
    confettiBurst();
    KidsAudio.star();
    showModal({
      emoji: '🔬',
      title: 'Science explore done!',
      body: `You got ${st.score} / ${st.total} correct.`,
      stars,
      primary: { label: 'Explore again', fn: () => openScience() },
      secondary: { label: 'Home', fn: () => { showScreen('screen-home'); refreshHubStats(); } }
    });
    refreshHubStats();
  }

  /* ================= STEM / Monkey Code ================= */
  function stemCmdMeta() {
    const grade = kidGrade();
    if (StemGame.getCmdMeta) return StemGame.getCmdMeta(grade);
    const by = StemGame.CMD_META_BY_GRADE;
    if (by && by[grade]) return by[grade];
    return StemGame.CMD_META || {};
  }

  function openStem() {
    cancelReadAloud();
    showScreen('screen-stem');
    const screen = $('#screen-stem');
    if (screen) {
      screen.classList.remove('grade-prek', 'grade-grade2', 'grade-grade3');
      screen.classList.add('grade-' + kidGrade());
    }
    const p = profile();
    const startLv = Math.min(p.stem.level || 0, StemGame.LEVELS.length - 1);
    StemGame.loadLevel(startLv);
    renderStem();
  }

  function stemFacingLabel(st, emoji) {
    const word = (st && st.facingWord) || 'RIGHT';
    const arrow = (st && st.facingArrow) || '→';
    const byEmoji = {
      '⬆️': { word: 'UP', arrow: '↑' },
      '➡️': { word: 'RIGHT', arrow: '→' },
      '⬇️': { word: 'DOWN', arrow: '↓' },
      '⬅️': { word: 'LEFT', arrow: '←' }
    };
    const mapped = emoji && byEmoji[emoji];
    const w = mapped ? mapped.word : word;
    const a = mapped ? mapped.arrow : arrow;
    return `Monkey is looking ${w} ${a}`;
  }

  function updateStemFacing(emoji) {
    const el = $('#stem-facing');
    if (!el) return;
    const st = StemGame.getState();
    el.textContent = stemFacingLabel(st, emoji || st.facingEmoji);
  }

  function updateStemMax() {
    const st = StemGame.getState();
    const lv = st.level;
    const el = $('#stem-max');
    if (el) el.textContent = `${st.program.length} of ${lv.maxCmds} moves in your plan`;
  }

  function updateStemBananas(st) {
    const el = $('#stem-bananas');
    if (!el) return;
    const s = st || StemGame.getState();
    const got = s.bananasCollected != null ? s.bananasCollected : (s.collected ? s.collected.length : 0);
    const total = s.bananasTotal != null ? s.bananasTotal : 0;
    el.textContent = `🍌 ${got} / ${total} bananas`;
  }

  function maybeSpeakStemTip(lv) {
    if (!isPrek() || !lv) return;
    const tip = lv.tip || '';
    const script = tip
      ? `Monkey Code. ${lv.title}. ${tip}`
      : `Monkey Code level ${lv.id}. Tap moves, then press PLAY. Get all bananas, then the chest.`;
    setReadAloud(script, { auto: true });
  }

  function renderStem() {
    const st = StemGame.getState();
    const lv = st.level;
    const screen = $('#screen-stem');
    if (screen) {
      screen.classList.remove('grade-prek', 'grade-grade2', 'grade-grade3');
      screen.classList.add('grade-' + kidGrade());
    }
    $('#stem-level-label').textContent = `Level ${lv.id}: ${lv.title}`;
    $('#stem-tip').textContent = lv.tip;
    updateStemMax();
    updateStemFacing(st.facingEmoji);
    updateStemBananas(st);

    const pills = $('#stem-levels');
    const completed = profile().stem.completed || [];
    pills.innerHTML = st.levels.map((l, i) => {
      const done = completed.includes(l.id);
      return `<button type="button" class="level-pill ${i === st.levelIdx ? 'active' : ''}" data-i="${i}">${done ? '✅' : ''} ${l.id}</button>`;
    }).join('');
    $$('.level-pill', pills).forEach(btn => {
      btn.addEventListener('click', () => {
        StemGame.loadLevel(Number(btn.dataset.i));
        renderStem();
        KidsAudio.click();
      });
    });

    const metaMap = stemCmdMeta();
    const pal = $('#stem-palette');
    pal.innerHTML = '';
    const grade = kidGrade();
    lv.allowed.forEach(cmd => {
      const meta = metaMap[cmd] || StemGame.CMD_META[cmd];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cmd-btn' + (meta.cls ? ' ' + meta.cls : '');
      b.title = meta.title || meta.label;
      if (grade === 'grade2' && meta.code) {
        b.innerHTML = `${escapeHtml(meta.label)}<span class="cmd-sub">${escapeHtml(meta.code)}</span>`;
      } else {
        b.textContent = meta.label;
      }
      b.addEventListener('click', () => {
        if (StemGame.addCmd(cmd)) {
          renderStemProgram();
          updateStemMax();
          const fb = $('#stem-feedback');
          if (fb) { fb.textContent = ''; fb.className = 'feedback'; }
        }
      });
      pal.appendChild(b);
    });

    const ifTip = $('#stem-if-tip');
    if (ifTip) ifTip.hidden = !lv.allowed.includes('IF_CLEAR');

    const fb = $('#stem-feedback');
    if (fb) { fb.textContent = ''; fb.className = 'feedback'; }

    renderStemGrid();
    renderStemProgram();
    maybeSpeakStemTip(lv);
  }

  function collectedKeySet(st) {
    const set = {};
    const list = (st && st.collected) || [];
    list.forEach(b => { set[b.r + ',' + b.c] = true; });
    return set;
  }

  function renderStemGrid(highlightRobot, facingEmoji, stepInfo) {
    const st = StemGame.getState();
    const wrap = $('#stem-grid');
    const cellSize = window.matchMedia('(max-width: 520px)').matches ? 40 : 48;
    wrap.style.gridTemplateColumns = `repeat(${st.cols}, ${cellSize}px)`;
    const robot = highlightRobot || st.robot;
    const face = facingEmoji || (highlightRobot && highlightRobot.facingEmoji) || st.facingEmoji;
    const collected = stepInfo && stepInfo.collected
      ? (function () {
          const set = {};
          (stepInfo.collected || []).forEach(b => { set[b.r + ',' + b.c] = true; });
          return set;
        })()
      : collectedKeySet(st);
    const executing = !!(stepInfo && stepInfo.status && stepInfo.status !== 'start');

    let html = '';
    for (let r = 0; r < st.rows; r++) {
      for (let c = 0; c < st.cols; c++) {
        const ch = st.grid[r][c];
        let cls = 'cell';
        let content = '';
        if (ch === '#') cls += ' wall';
        else if (ch === 'T' || ch === 'G') {
          cls += ' treasure goal';
          content = '<span class="treasure-emoji">🧰</span>';
        } else if (ch === 'B') {
          if (collected[r + ',' + c]) {
            cls += ' banana-gone';
          } else {
            cls += ' banana';
            content = '<span class="banana-emoji">🍌</span>';
          }
        }
        html += `<div class="${cls}" data-r="${r}" data-c="${c}">${content}</div>`;
      }
    }
    wrap.innerHTML = html;
    const cell = wrap.querySelector(`[data-r="${robot.r}"][data-c="${robot.c}"]`);
    if (cell) {
      const bounce = executing ? ' executing' : '';
      cell.innerHTML = `<span class="monkey robot${bounce}" title="${stemFacingLabel(st, face)}">🐵${face || ''}</span>`;
    }
    updateStemFacing(face);
    if (stepInfo) {
      updateStemBananas({
        bananasCollected: stepInfo.collected ? stepInfo.collected.length : (st.bananasTotal - (stepInfo.bananasRemaining || 0)),
        bananasTotal: stepInfo.bananasTotal != null ? stepInfo.bananasTotal : st.bananasTotal
      });
    } else {
      updateStemBananas(st);
    }
  }

  function renderStemProgram(execSrc) {
    const st = StemGame.getState();
    const list = $('#stem-program');
    const metaMap = stemCmdMeta();
    list.innerHTML = '';
    if (!st.program.length) {
      list.innerHTML = '<p class="program-empty">Your plan is empty — tap a move!</p>';
      return;
    }
    const grade = kidGrade();
    st.program.forEach((cmd, i) => {
      const meta = metaMap[cmd] || StemGame.CMD_META[cmd];
      const chip = document.createElement('div');
      chip.className = 'prog-chip' + (meta.cls ? ' ' + meta.cls : '') + (execSrc === i ? ' executing' : '');
      const label = grade === 'grade3' && meta.code ? meta.code : meta.label;
      chip.innerHTML = `<span class="prog-num">${i + 1}.</span><span class="prog-label">${escapeHtml(label)}</span><button type="button" aria-label="Remove step ${i + 1}">&times;</button>`;
      chip.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        StemGame.removeCmd(i);
        renderStemProgram();
        updateStemMax();
      });
      list.appendChild(chip);
    });
  }

  function stemFailMessage(result) {
    if (result && result.bumped) {
      return '🐵 Oof! Monkey bumped a rock. Try a new plan.';
    }
    if (result && result.atTreasure && result.bananasLeft > 0) {
      return `🍌 Almost! ${result.bananasLeft} banana${result.bananasLeft === 1 ? '' : 's'} still out there — then the chest.`;
    }
    if (result && result.bananasLeft > 0 && result.missedChest) {
      return '🍌 Monkey missed some bananas (and the chest). Try again!';
    }
    if (result && result.missedChest) {
      return '🧰 Monkey didn’t reach the treasure chest. Keep trying!';
    }
    return 'Oops — try a new plan!';
  }

  async function runStem() {
    const runBtn = $('#stem-run');
    const startBtn = $('#stem-startover');
    const hintBtn = $('#stem-hint');
    if (StemGame.getState().program.length === 0) {
      const fb = $('#stem-feedback');
      fb.textContent = 'Tap a move first, then press PLAY!';
      fb.className = 'feedback bad';
      return;
    }
    runBtn.disabled = true;
    if (startBtn) startBtn.disabled = true;
    if (hintBtn) hintBtn.disabled = true;
    StemGame.resetRobot();
    renderStemGrid();
    const result = await StemGame.run((step) => {
      renderStemProgram(step.srcIndex);
      renderStemGrid(step.robot, step.facingEmoji, step);
    }, 300);
    runBtn.disabled = false;
    if (startBtn) startBtn.disabled = false;
    if (hintBtn) hintBtn.disabled = false;
    renderStemProgram();

    {
      const st0 = StemGame.getState();
      const title = (st0.level && (st0.level.title || ('Level ' + st0.level.id))) || 'Monkey Code';
      let detail = 'did not finish';
      if (result.won) detail = 'bananas + chest';
      else if (result.bumped) detail = 'bumped wall';
      else if (result.atTreasure && result.bananasLeft > 0) detail = 'chest but bananas left';
      else if (result.bananasLeft > 0) detail = 'missed bananas';
      else if (result.missedChest) detail = 'missed chest';
      trackAnswer('Monkey Code', title, !!result.won, detail);
    }

    if (result.won) {
      const st = StemGame.getState();
      const p = profile();
      const id = st.level.id;
      if (!p.stem.completed.includes(id)) p.stem.completed.push(id);
      p.stem.level = Math.max(p.stem.level || 0, st.levelIdx + 1);
      const stars = StemGame.starsForWin ? StemGame.starsForWin(st.program.length) : 2;
      KidsStorage.addStars(state, stars);
      confettiBurst();
      const nextIdx = st.levelIdx + 1;
      const starStr = '⭐'.repeat(stars);
      showModal({
        emoji: '🐵',
        title: 'Bananas caught!',
        body: `Level ${id} complete. ${starStr} (+${stars})`,
        stars,
        primary: {
          label: nextIdx < StemGame.LEVELS.length ? 'Next level' : 'You beat them all!',
          fn: () => {
            if (nextIdx < StemGame.LEVELS.length) {
              StemGame.loadLevel(nextIdx);
              renderStem();
            } else {
              showScreen('screen-home');
              refreshHubStats();
            }
          }
        },
        secondary: {
          label: 'Play again',
          fn: () => { StemGame.clearProgram(); StemGame.resetRobot(); renderStem(); }
        }
      });
      refreshHubStats();
    } else {
      $('#stem-feedback').textContent = stemFailMessage(result);
      $('#stem-feedback').className = 'feedback bad';
      StemGame.resetRobot();
      renderStemGrid();
      setTimeout(() => {
        const fb = $('#stem-feedback');
        if (fb && fb.classList.contains('bad')) { fb.textContent = ''; fb.className = 'feedback'; }
      }, 3200);
    }
  }

  function startOverStem() {
    StemGame.stop();
    StemGame.clearProgram();
    StemGame.resetRobot();
    renderStem();
    const fb = $('#stem-feedback');
    if (fb) { fb.textContent = ''; fb.className = 'feedback'; }
  }

  function hintStem() {
    const st = StemGame.getState();
    const lv = st.level || {};
    const fb = $('#stem-feedback');
    if (!fb) return;
    if (lv.hint) {
      fb.textContent = '💡 ' + lv.hint;
      fb.className = 'feedback ok';
      if (isPrek()) setReadAloud(lv.hint, { auto: true });
    } else {
      fb.textContent = '💡 Try a shorter plan — collect every 🍌 before the 🧰 chest.';
      fb.className = 'feedback ok';
    }
  }


  /* ================= CHESS ================= */
  let chessAwaitEnter = false;

  function openChess() {
    cancelReadAloud();
    showScreen('screen-chess');
    chessAwaitEnter = false;
    ChessGame.startMenu(kidGrade());
    $('#chess-title').textContent = `♟️ Chess · ${KidsStorage.gradeLabel(kidGrade())}`;
    showChessPanel('menu');
    const speak = $('#chess-speak');
    if (speak) speak.title = kidGrade() === 'grade2' ? 'Read to me' : 'Read aloud';
    setReadAloud('Chess. Learn pieces, or try a quiz.', { auto: isPrek() });
  }

  function showChessPanel(which) {
    $('#chess-menu')?.classList.toggle('hidden', which !== 'menu');
    $('#chess-learn')?.classList.toggle('hidden', which !== 'learn');
    $('#chess-quiz')?.classList.toggle('hidden', which !== 'quiz');
  }

  function renderChessBoard(containerId, opts) {
    opts = opts || {};
    const wrap = $('#' + containerId);
    if (!wrap) return;
    const st = ChessGame.getState();
    const highlights = new Set(opts.highlights || []);
    const pieceAt = opts.pieceAt || null; // {f,r,glyph}
    wrap.innerHTML = '';
    st.board.forEach(cell => {
      const div = document.createElement('button');
      div.type = 'button';
      div.className = 'chess-sq' + (cell.dark ? ' dark' : ' light');
      if (highlights.has(cell.key)) div.classList.add('hl');
      if (pieceAt && pieceAt.f === cell.f && pieceAt.r === cell.r) {
        div.classList.add('has-piece');
        div.innerHTML = `<span class="chess-piece">${pieceAt.glyph}</span>`;
      }
      div.dataset.f = String(cell.f);
      div.dataset.r = String(cell.r);
      div.dataset.key = cell.key;
      div.title = cell.key;
      div.setAttribute('aria-label', cell.key);
      if (opts.onTap) {
        div.addEventListener('click', () => opts.onTap(cell.f, cell.r, cell.key));
      }
      wrap.appendChild(div);
    });
  }

  function renderChessLearn() {
    const st = ChessGame.getState();
    const learn = st.learn;
    const piece = learn.piece;
    if (!piece) return;
    showChessPanel('learn');
    const pills = $('#chess-piece-pills');
    pills.innerHTML = st.pieces.map(pc =>
      `<button type="button" class="level-pill ${pc.id === piece.id ? 'active' : ''}" data-pid="${pc.id}">${pc.glyph} ${pc.name}</button>`
    ).join('');
    $$('.level-pill', pills).forEach(btn => {
      btn.addEventListener('click', () => {
        ChessGame.learnSelectPiece(btn.dataset.pid);
        renderChessLearn();
        KidsAudio.click();
      });
    });
    $('#chess-learn-glyph').textContent = piece.glyph;
    $('#chess-learn-name').textContent = piece.name;
    $('#chess-learn-how').textContent = piece.how;
    $('#chess-learn-tip').textContent = piece.tip;
    renderChessBoard('chess-board-learn', {
      highlights: learn.highlights,
      pieceAt: { f: learn.pos.f, r: learn.pos.r, glyph: piece.glyph },
      onTap: (f, r) => {
        ChessGame.learnTapSquare(f, r);
        renderChessLearn();
      }
    });
    setReadAloud(`${piece.name}. ${piece.tip}`, { auto: isPrek() });
    const p = profile();
    if (!p.chess) p.chess = { completed: 0, learned: [] };
    if (!Array.isArray(p.chess.learned)) p.chess.learned = [];
    if (!p.chess.learned.includes(piece.id)) {
      p.chess.learned.push(piece.id);
      persist();
    }
  }

  function startChessIdentify() {
    chessAwaitEnter = false;
    ChessGame.startIdentify(kidGrade());
    showChessPanel('quiz');
    renderChessQuiz();
  }

  function startChessMoves() {
    chessAwaitEnter = false;
    ChessGame.startMovesQuiz(kidGrade());
    showChessPanel('quiz');
    renderChessQuiz();
  }

  function renderChessQuiz() {
    const st = ChessGame.getState();
    const q = st.quiz;
    if (q.done || !q.item) {
      finishChessQuiz();
      return;
    }
    chessAwaitEnter = false;
    $('#chess-next-row')?.classList.add('hidden');
    $('#chess-feedback').textContent = '';
    $('#chess-feedback').className = 'feedback';
    const pct = Math.round((q.round / q.total) * 100);
    $('#chess-progress-fill').style.width = pct + '%';
    $('#chess-quiz-label').textContent =
      (st.mode === 'identify' ? 'Name the piece' : 'How does it move?') +
      ` · ${q.round + 1} / ${q.total} · Score ${q.score}`;

    const item = q.item;
    $('#chess-quiz-glyph').textContent = item.glyph || '';
    const boardWrap = $('#chess-quiz-board-wrap');
    if (item.kind === 'moves-square' || item.kind === 'moves-mc') {
      boardWrap.classList.remove('hidden');
      const piece = ChessGame.PIECES[item.pieceId];
      renderChessBoard('chess-board-quiz', {
        highlights: [],
        pieceAt: { f: item.pos.f, r: item.pos.r, glyph: piece.glyph }
      });
    } else {
      boardWrap.classList.add('hidden');
    }

    $('#chess-quiz-prompt').textContent = item.prompt;
    const choices = $('#chess-quiz-choices');
    choices.innerHTML = '';
    (q.choices || []).forEach(ch => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = String(ch);
      btn.addEventListener('click', () => {
        if (ChessGame.getState().quiz.locked || chessAwaitEnter) return;
        submitChessQuiz(ch, btn);
      });
      choices.appendChild(btn);
    });

    setReadAloud(`${item.prompt}. ${choicesPhrase(q.choices)}`, { auto: isPrek() });
  }

  function submitChessQuiz(answer, btnEl) {
    const stBefore = ChessGame.getState();
    const item = stBefore.quiz.item;
    const res = ChessGame.checkQuiz(answer);
    if (!res) return;
    trackAnswer('Chess', (item && item.prompt) || 'Chess', res.ok, 'answer: ' + answer);
    if (btnEl) {
      btnEl.classList.add(res.ok ? 'correct' : 'wrong');
      if (!res.ok) {
        $$('.choice-btn', $('#chess-quiz-choices')).forEach(b => {
          if (b.textContent === String(res.correct)) b.classList.add('correct');
        });
      }
    }
    $('#chess-feedback').textContent = res.ok ? '⭐ Yes!' : `Answer: ${res.correct}`;
    $('#chess-feedback').className = 'feedback ' + (res.ok ? 'ok' : 'bad');
    chessAwaitEnter = true;
    $('#chess-next-row')?.classList.remove('hidden');
  }

  function advanceChessQuiz() {
    if (!chessAwaitEnter) return;
    chessAwaitEnter = false;
    cancelReadAloud();
    ChessGame.nextQuiz();
    const st = ChessGame.getState();
    if (st.quiz.done || !st.quiz.item) finishChessQuiz();
    else renderChessQuiz();
  }

  function finishChessQuiz() {
    const st = ChessGame.getState();
    const p = profile();
    if (!p.chess) p.chess = { completed: 0, learned: [] };
    p.chess.completed = (p.chess.completed || 0) + 1;
    const total = st.quiz.total || 1;
    const stars = Math.max(1, Math.round((st.quiz.score / total) * 4));
    KidsStorage.addStars(state, stars);
    persist();
    confettiBurst();
    KidsAudio.star();
    showModal({
      emoji: '♟️',
      title: 'Chess quiz done!',
      body: `You got ${st.quiz.score} / ${total} correct.`,
      stars,
      primary: { label: 'Try again', fn: () => {
        if (st.mode === 'identify') startChessIdentify();
        else startChessMoves();
      }},
      secondary: { label: 'Chess menu', fn: () => openChess() }
    });
    refreshHubStats();
  }

  /* One document-level Enter for typing / spelling / reading / science / math */
  function onGlobalKeydown(e) {
    if (e.key !== 'Enter') return;
    if ($('#modal')?.classList.contains('show')) return;
    const active = $('.screen.active');
    if (!active) return;
    const id = active.id;
    if (id === 'screen-typing' && typingAwaitEnter) {
      e.preventDefault();
      advanceTyping();
    } else if (id === 'screen-spelling') {
      const st = SpellingGame.getState();
      if (st.awaitEnter) {
        e.preventDefault();
        advanceSpelling();
      } else if (st.phase === 'typing') {
        e.preventDefault();
        submitSpelling();
      }
    } else if (id === 'screen-reading' && readingAwaitEnter) {
      e.preventDefault();
      advanceReading();
    } else if (id === 'screen-science' && scienceAwaitEnter) {
      e.preventDefault();
      advanceScience();
    } else if (id === 'screen-math' && mathAwaitEnter) {
      e.preventDefault();
      advanceMath();
    } else if (id === 'screen-chess' && chessAwaitEnter) {
      e.preventDefault();
      advanceChessQuiz();
    }
  }

  /* ---- Wire UI ---- */
  function init() {
    // Persist migrated defaults once
    persist();
    updateChrome();
    refreshHubStats();
    showScreen('screen-home');

    $('#btn-fullscreen')?.addEventListener('click', toggleFullscreen);
    $('#btn-sound')?.addEventListener('click', toggleSound);

    $('#nav-typing')?.addEventListener('click', () => { KidsAudio.click(); openTyping(); });
    $('#nav-math')?.addEventListener('click', () => { KidsAudio.click(); openMath(); });
    $('#nav-reading')?.addEventListener('click', () => { KidsAudio.click(); openReading(); });
    $('#nav-spelling')?.addEventListener('click', () => { KidsAudio.click(); openSpelling(); });
    $('#nav-science')?.addEventListener('click', () => { KidsAudio.click(); openScience(); });
    $('#nav-stem')?.addEventListener('click', () => { KidsAudio.click(); openStem(); });
    $('#nav-chess')?.addEventListener('click', () => { KidsAudio.click(); openChess(); });

    $$('.btn-home').forEach(b => b.addEventListener('click', () => {
      KidsAudio.click();
      cancelReadAloud();
      showScreen('screen-home');
      refreshHubStats();
    }));

    $('#typing-input')?.addEventListener('input', onTypingInput);
    document.addEventListener('keydown', onGlobalKeydown);

    $('#typing-speak')?.addEventListener('click', () => { KidsAudio.click(); replayReadAloud(); });
    $('#math-speak')?.addEventListener('click', () => { KidsAudio.click(); replayReadAloud(); });
    $('#reading-speak')?.addEventListener('click', () => { KidsAudio.click(); replayReadAloud(); });
    $('#spelling-speak')?.addEventListener('click', () => { KidsAudio.click(); replayReadAloud(); });
    $('#science-speak')?.addEventListener('click', () => { KidsAudio.click(); replayReadAloud(); });

    $('#typing-next')?.addEventListener('click', () => { KidsAudio.click(); advanceTyping(); });
    $('#spelling-next')?.addEventListener('click', () => { KidsAudio.click(); advanceSpelling(); });
    $('#reading-next')?.addEventListener('click', () => { KidsAudio.click(); advanceReading(); });
    $('#reading-sent-prev')?.addEventListener('click', () => { KidsAudio.click(); shiftReadingSentence(-1); });
    $('#reading-sent-next')?.addEventListener('click', () => { KidsAudio.click(); shiftReadingSentence(1); });
    $('#reading-hear-sent')?.addEventListener('click', () => { KidsAudio.click(); hearCurrentSentence(); });
    $('#science-next')?.addEventListener('click', () => { KidsAudio.click(); advanceScience(); });
    $('#math-next')?.addEventListener('click', () => { KidsAudio.click(); advanceMath(); });

    $$('[data-math-course]').forEach(btn => {
      btn.addEventListener('click', () => {
        KidsAudio.click();
        startMathCourse(btn.dataset.mathCourse);
      });
    });

    $('#stem-run')?.addEventListener('click', () => { KidsAudio.click(); runStem(); });
    $('#stem-startover')?.addEventListener('click', () => {
      KidsAudio.click();
      startOverStem();
    });

    $('#chess-speak')?.addEventListener('click', () => { KidsAudio.click(); replayReadAloud(); });
    $('#chess-nav-learn')?.addEventListener('click', () => {
      KidsAudio.click();
      ChessGame.startLearn(kidGrade());
      renderChessLearn();
      const p = profile();
      if (!p.chess) p.chess = { completed: 0, learned: [] };
      persist();
    });
    $('#chess-nav-identify')?.addEventListener('click', () => { KidsAudio.click(); startChessIdentify(); });
    $('#chess-nav-moves')?.addEventListener('click', () => { KidsAudio.click(); startChessMoves(); });
    $('#chess-learn-next')?.addEventListener('click', () => { KidsAudio.click(); ChessGame.learnNext(); renderChessLearn(); });
    $('#chess-learn-prev')?.addEventListener('click', () => { KidsAudio.click(); ChessGame.learnPrev(); renderChessLearn(); });
    $('#chess-learn-back')?.addEventListener('click', () => { KidsAudio.click(); openChess(); });
    $('#chess-quiz-back')?.addEventListener('click', () => { KidsAudio.click(); openChess(); });
    $('#chess-next')?.addEventListener('click', () => { KidsAudio.click(); advanceChessQuiz(); });

    $('#btn-tracker-download')?.addEventListener('click', async () => {
      KidsAudio.click();
      try {
        const r = await KidsTracker.downloadTracker();
        const note = $('#tracker-note');
        if (note) note.textContent = `Downloaded ${KidsTracker.DOWNLOAD_NAME} (${r.count || 0} rows).`;
      } catch (err) {
        const note = $('#tracker-note');
        if (note) note.textContent = 'Could not build Excel. Check that the SheetJS file is present.';
      }
    });
    $('#btn-tracker-update')?.addEventListener('click', async () => {
      KidsAudio.click();
      const note = $('#tracker-note');
      try {
        const r = await KidsTracker.updateOrPick();
        if (r.aborted) return;
        if (r.note) {
          if (note) note.textContent = r.note;
        } else if (r.ok && r.mode === 'update') {
          if (note) note.textContent = `Excel file updated (${r.count || 0} rows).`;
        } else if (r.ok && r.mode === 'download') {
          if (note) note.textContent = 'Click Download to refresh the spreadsheet.';
        }
      } catch (err) {
        if (note) note.textContent = 'Click Download to refresh the spreadsheet.';
      }
    });
    updateTrackerCount();
    if (window.KidsTracker && !KidsTracker.supportsFSAccess()) {
      const note = $('#tracker-note');
      if (note) note.textContent = 'Parents: download a spreadsheet of every answer. Click Download to refresh (in-place update needs a newer browser over http).';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
