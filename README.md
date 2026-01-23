# Cortex Trivia (Capstone)

Cortex Trivia is a web-based multiplayer trivia game built by a capstone team. Players join a shared session, answer timed questions, earn points, and see final rankings.

## Current status
Early scaffold. We’re keeping things simple and evolving the code as the team implements features over time.

## Repo structure (early)
- `frontend/` — starter UI (HTML/CSS/JS). **Not complete yet.**
- `backend/` — backend code owned by the backend team (Python/Java decisions may evolve).
  - `backend/python/startGame.py` — early backend starter file (will evolve).
- `db/` — database code owned by the DB team (schema/migrations/seeds later).
- `docs/` — optional engineering notes (API shape, schema notes, decisions), added when needed.

## How to run (for now)
Frontend:
- Open `frontend/index.html` in your browser.

Backend / DB:
- Not wired to the frontend yet.

## Team workflow (GitHub)
- We work on feature branches and merge via Pull Requests.
- Keep commits small and descriptive.
- Avoid pushing secrets (use `.env.example` when needed).

