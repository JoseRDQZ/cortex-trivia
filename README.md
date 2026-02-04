# Cortex Trivia (Capstone)

Cortex Trivia is a web-based multiplayer trivia game built by a capstone team. Players join a shared session, answer timed questions, earn points, and see final rankings.

---

## Current Status (Sprint 2)
Early scaffold with a demo-focused frontend.

The current Sprint 2 goal is to demonstrate:
- Website page flow (Lobby → Quiz → Results → Lobby)
- Trivia question display using real seed data
- Clear ownership boundaries between frontend UI, quiz display logic, and scoring/session logic

Backend, scoring, and multiplayer/session wiring are intentionally incomplete at this stage and will be implemented by other team members.

---

## Repo Structure (Early)
- `frontend/` — frontend UI (HTML/CSS/JS)
  - Lobby, Quiz, and Results pages
  - Quiz page fetches questions from seed data and displays 10 random non-repeating questions
  - Buttons for submit/next/scoring are present but intentionally not wired
- `backend/` — backend code owned by the backend team (Python/Java decisions may evolve)
  - `backend/python/startGame.py` — early backend starter file (will evolve)
- `db/` — database assets owned by the DB team
  - `questions.seed.json` — seed question bank used by the frontend quiz demo
- `docs/` — optional engineering notes (API shape, schema notes, decisions)

---

## How to Run the Frontend Demo (Important)

⚠️ **Do not open HTML files directly from Finder.**  
The quiz page uses `fetch()` to load `db/questions.seed.json`, which browsers block when opening files via `file://`.

### Option A — Terminal (Recommended)
1. Open Terminal
2. Navigate to the project root (the folder that contains `frontend/` and `db/`):
   ```bash
   cd path/to/cortex-trivia
   ```
3. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```
4. Open the site in your browser:
   - http://localhost:8000/frontend/index.html

To stop the server, press `Ctrl + C` in the Terminal window.

---

### Option B — VS Code (No Terminal Commands)
1. Open the project folder in **VS Code**
2. Install the extension **Live Server**
3. Right-click `frontend/index.html` → **Open with Live Server**
4. Use the browser tab that opens (the folder will be served correctly)

---
