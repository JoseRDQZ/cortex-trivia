# Cortex Trivia (Capstone)

Cortex Trivia is a web-based, multiplayer, turn-based trivia game built by our Spring 2026 Computer Science Capstone team. Players create or join a shared session, answer timed questions, earn points, and view final rankings. The system keeps a clear separation between frontend UI, backend session/state management, scoring logic, and the question banks.

-------------------------------------------
CURRENT STATUS (Sprint 6 – Stabilization, Validation, and Polish)
-------------------------------------------

Sprint 6 focused on finishing the product: stability, end-to-end validation, UI/UX clarity, robust error handling, and final documentation polish. All planned user stories for Sprint 6 were completed and accepted.

Highlights
- System stability & bug fixing: Multiplayer flow hardened; timers and scoring revalidated; smoother lobby/host/player hand-offs.
- End-to-end gameplay validation: Full flow (join → play → score → results) exercised repeatedly to confirm consistency.
- UI/UX refinement & clarity: New navy/lime theme, clearer CTAs, better status messaging, refreshed quiz/results visuals.
- Error & edge handling: More defensive flows for missing sessions, timer/buffer settings, and backend fallbacks.
- System polish & documentation: README updated for Sprint 6; setup/run steps clarified; guidance added for demos and validation.

Sprint 6 outcome
- Accepted user stories: 1) System Stability & Bug Fixing, 2) End-to-End Gameplay Validation, 3) UI/UX Refinement and Clarity, 4) Error Handling & Edge Case Handling, 5) System Polish & Documentation.
- Rejections: None. All Sprint 6 work was accepted.

Key lessons (retro)
- Velocity estimate was on target; validation tasks required the most time due to multi-scenario testing.
- Start integration/validation earlier in the cycle to reduce late sprint testing crunch.
- Use structured test plans for faster regression coverage.

-------------------------------------------
SPRINT 6 FEATURE SUMMARY
-------------------------------------------

Stability & flow
- Multiplayer session flow hardened; clearer host/player state resets.
- Timer/buffer settings respected end-to-end; safer fallbacks when backend endpoints differ.

UI/UX refresh
- Navy + lime theme, rounded cards, focus rings, hover lift, and micro-animations.
- Lobby/host/player pages include concise “how to” strips and status pills.
- Quiz page shows live progress and timer pill; answer states are clearer.
- Results page decluttered with summary cards and visual score meter.

Error handling & resilience
- Clear status copy for missing sessions or backend timeouts.
- Clipboard copy feedback for session codes; safer redirects when state is absent.

Docs & demo readiness
- README now reflects Sprint 6 scope, accepted stories, and up-to-date run steps.
- Demo-friendly notes so the flow remains testable even if a backend endpoint changes.

-------------------------------------------
SYSTEM ARCHITECTURE
-------------------------------------------

Frontend
- Lobby interface for creating/joining sessions
- Host dashboard for session control, timer/buffer settings, and player visibility
- Player waiting room with status checks
- Quiz view for timed questions and submissions
- Results view for scores and visual summaries
- Tech: HTML, CSS, Vanilla JS (single-page-per-role, no framework dependency)

Backend
- Flask API managing sessions, questions, scoring, and lifecycle
- Endpoints tolerate fallback names to survive iterative backend changes

Data layer
- JSON-based question banks
- Per-session selection of 10 non-repeating questions distributed to all players

-------------------------------------------
PROJECT STRUCTURE
-------------------------------------------

cortex-trivia/

    frontend/
      index.html      – Lobby
      host.html       – Host dashboard
      player.html     – Player waiting room
      quiz.html       – Quiz gameplay
      results.html    – Final scoreboard
      app.js          – Frontend logic + API calls
      styles.css      – Theme and layout

    backend/python/
      app.py          – Flask server + endpoints
      calculateScoring.py – Scoring logic

    db/
      questions.seed.json – Seed trivia questions
      results.json        – Stored results (if applicable)

    docs/
      architecture.md     – Additional design notes

-------------------------------------------
HOW TO RUN THE APPLICATION (LOCAL)
-------------------------------------------

1) Start backend (Terminal 1)
   cd backend/python
   python3 app.py
   # Expected: Server running on http://127.0.0.1:5000

2) Start frontend (Terminal 2)
   # from repo root
   python3 -m http.server 8000

3) Open in browser
   http://localhost:8000/frontend/index.html

-------------------------------------------
GAMEPLAY FLOW
-------------------------------------------

1. Host creates a session (gets a code)
2. Players join with the code
3. Host starts the game (timer/buffer options applied)
4. Backend serves 10 randomized questions
5. All players answer the same sequence within the timer
6. Answers are submitted; scoring uses validated timing logic
7. Flow advances after answers or timeout
8. Results page shows scores and visual summaries

-------------------------------------------
TECH STACK
-------------------------------------------

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Python, Flask
- Hosting/Deployment: Vercel
- Data Storage: JSON question database

-------------------------------------------
TEAM RESPONSIBILITIES
-------------------------------------------

Jose Carlos Rodriguez — Team Lead / Product Owner / Frontend Lead (UI/UX, results, deployment/readiness)
Daniel Losa — Backend architecture, session lifecycle, deployment integration
Renier Herba Borrego — Scoring system and multiplier refinement
Deijen Severino — Timer system, synchronization, gameplay controls
Diego A Sanchez — Question banks, category expansion, gameplay consistency

-------------------------------------------
NEXT STEPS / FUTURE IMPROVEMENTS
-------------------------------------------

- Start integration and validation testing earlier in each cycle.
- Add richer player performance visuals (speed/accuracy trends) and audio/FX toggles.
- Expand question banks and categories; consider scalability for higher concurrency.
- Continue UI/UX refinement for mobile and accessibility.
- Explore structured regression test plans for faster releases.

-------------------------------------------

End of README

