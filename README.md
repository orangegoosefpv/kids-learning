# Kids Learning Lab

A colorful, offline-friendly learning app for three kids with fixed grade profiles:

| Player | Grade (locked) |
|--------|----------------|
| **Zion** | Grade 3 |
| **Joziah** | Grade 2 |
| **Zachariah** | Pre-K |

Once a player is selected, **every subject** uses that child’s grade only — no grade pickers after profile select.

Progress is saved in the browser (`localStorage`) per player profile. An optional **Excel answer tracker** logs correct vs incorrect answers for parents.

## What’s included

| Area | Features |
|------|----------|
| **Home** | Profiles + stars, calm **learning journey** map (Monkey Code path + subject meters), **Excel tracker** |
| **Pre-K TTS** | Zachariah auto read-aloud (Web Speech `speechSynthesis`); 🔊 replay on every grade; respects Sound off |
| **Typing** | Home-row → words → short sentences; WPM/accuracy; **Press Enter for next** after each item |
| **Math** | Auto-starts at the kid’s grade; wrong answers show CRA visual teach (arrays / grids / break-apart) then Next |
| **Reading** | Pre-K phonics/letters/CVC · **Joziah (G2):** phonics warm-ups + sight words + chunked passages with **sentence / Hear it / word-tap** assists · G3 passages + comprehension |
| **Spelling** | Memorize beat, then type; wrong → show model & **re-type** before Next; stars on first-try only; **Joziah** decodable / HF words |
| **Science** | Fun fact cards + light questions (animals, weather, plants, body, magnets) |
| **Monkey Code** | Jungle coding path (CodeMonkey-inspired): 🐵 collect all 🍌 then 🧰 — 12 levels teaching sequencing → turns → loops → conditionals; grade-aware labels; PLAY + stars |
| **Chess** | Fundamentals only: learn how pieces move on a mini board · quizzes to name pieces and how they move (♔♕♖♗♘♙) |
| **Excel tracker** | Parent control on Home: download a lightweight `.xlsx` log (Child · Section · Question/Prompt · Result · Timestamp). Optional “Update Excel file…” when the browser supports File System Access |

No CDNs, no external images/fonts/audio. Soft beeps use the Web Audio API. SheetJS is vendored at `js/vendor/xlsx.full.min.js`.

## Open on Windows (simple)

1. Copy the whole `kids-learning` folder to the laptop (e.g. `C:\KidsLearning\`).
2. Double-click **`index.html`** — it should open in Edge or your default browser.
3. Optional: press **⛶ Fullscreen** in the app (or `F11` in Edge).

`file://` works because everything is self-contained.

## Local static server (recommended)

From a terminal in the `kids-learning` folder:

```bash
python3 -m http.server 8080
```

On Windows (Python installed from python.org or Store):

```bat
python -m http.server 8080
```

Then open: [http://localhost:8080/](http://localhost:8080/)

In-place Excel “Update file…” works best over `http://` in a Chromium browser that supports the File System Access API. **Download Excel tracker** always works.

## Edge kiosk / fullscreen later (notes)

- **Fullscreen:** use the in-app button or `F11`.
- **Kiosk-style (advanced):** create an Edge shortcut, for example:

  ```text
  msedge.exe --kiosk "http://localhost:8080/" --edge-kiosk-type=fullscreen
  ```

  Or point the shortcut at the `index.html` file path if you prefer `file://`.

- Start a tiny server on login (Task Scheduler + `python -m http.server`) if you use `http://localhost`.

## Files

```
kids-learning/
  index.html          Entry point
  README.md
  css/styles.css
  js/storage.js       localStorage profiles + grade lock + answer log
  js/tracker.js       Excel workbook builder (SheetJS) + optional file link
  js/vendor/xlsx.full.min.js
  js/audio.js         Web Audio SFX + Web Speech
  js/typing.js
  js/math.js
  js/reading.js       G2 phonics / chunked passages
  js/spelling.js
  js/science.js
  js/stem.js          Monkey Code engine (bananas + chest, grade-aware)
  js/chess.js         Piece lessons + quizzes
  js/app.js           UI glue
```

## Parent tips

- Edit player **names** with **✏️ Names** on the home screen (grades stay fixed). Misspellings **Joiah** / **Josiah** migrate to **Joziah**.
- Toggle **🔊 Sound** if headphones aren’t on.
- After answers, kids can press **Enter** or tap the big **Next ▶** button — never stuck.
- Big **🏠 Home** on every activity screen.
- Pre-K (**Zachariah**) hears prompts aloud; tap **🔊** to replay (any grade). Sound off mutes TTS too.
- **Joziah (Grade 2) reading:** short sentences, emoji cues, phonics first; use **◀ / 🔊 Hear it / ▶** or tap a word to hear it — not just a wall of text.
- **📊 Excel tracker** on Home: Download a spreadsheet of correct/incorrect answers per child to tailor practice later (log capped at ~2000 rows).
- Stars and progress survive refresh (same browser/profile).
- Old “Player 1/2/3” saves migrate to Zion/Joziah/Zachariah and keep stars when possible.


## Feedback pedagogy (educator review)

- **Touch targets:** Primary taps (choices, Monkey Code commands, level pills, PLAY) are ≥48–56px; ~56–64px on narrow screens for Pre-K / mobile.
- **Monkey Code heading:** The monkey cell shows a large facing chevron + direction emoji under 🐵, with a tinted cell edge toward the facing direction (plus the text line “Monkey is looking …”).
- **TTS / Hear-it:** Web Speech only. Prefers natural en-US voices when available. Word taps use a clearer slower rate; Hear-it / passages use sentence mode with light pauses between sentences. Quality depends on the device’s installed voices.
- **Spelling — active correction:** A wrong answer shows the correct spelling as a scaffold and clears the input. The child must **re-type the correct word** before Next unlocks. Stars only on **first-try** correct; a successful correction advances without an extra star (Excel detail: `corrected after miss`).
- **Math — visual process (CRA):** On a wrong answer, a teach panel shows emoji arrays / grids / crossed-out sets or a break-apart hint (capped ~24 icons), then Next. Immediate visual correction — no forced re-try for math facts.
- **Home journey:** Calm “My learning journey” strip — 12 Monkey Code step dots + subject checkmarks/counts (not extra gamification clutter).

## Limitations

- Typing/spelling use a text input (best with a physical keyboard).
- Web Audio may stay silent until the first tap/click (browser autoplay policy).
- Fullscreen API may require a user gesture; some embedded WebViews block it.
- Progress is per-browser; clearing site data resets stars and the answer log.
- Chess is fundamentals only (no full games).
