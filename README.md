# Cortex Trivia (Capstone)

Cortex Trivia is a web-based multiplayer trivia game built by our Spring
2026 Capstone team. Players create or join a shared session, answer
timed questions, earn points, and view final rankings.

This project maintains clear separation between frontend UI
responsibilities, backend session logic, and scoring logic.

  -------------------------------------------
  CURRENT STATUS (Sprint 2 – Demo Complete)
  -------------------------------------------

Sprint 2 successfully demonstrates a full working demo flow:

    Lobby → Quiz → Results → Lobby

The system currently includes:

-   Working session creation and join flow
-   Backend session management using Flask
-   Real question loading from seed data
-   10 random non-repeating questions per game
-   Submit / Next question navigation
-   Scoring integration via calculateScoring.py
-   Final results page displaying calculated scores
-   Return-to-lobby functionality
-   Fully integrated frontend and backend for demo purposes

The demo run has been tested successfully.

  -------------------
  PROJECT STRUCTURE
  -------------------

cortex-trivia/

frontend/ index.html → Lobby page (create/join/start session) quiz.html
→ Quiz gameplay page results.html → Final results page app.js → Frontend
logic + backend integration styles.css → UI styling

backend/python/ app.py → Flask backend (session + API endpoints)
calculateScoring.py → Scoring logic (Renier)

db/ questions.seed.json → Seed question bank results.json → Stored game
results (if applicable)

  --------------------------
  HOW TO RUN THE FULL DEMO
  --------------------------

1)  Start Backend (Terminal 1)

From project root:

    cd backend/python
    python3 app.py

You should see:

    Server running on http://127.0.0.1:5000

2)  Start Frontend Server (Terminal 2)

From project root:

    python3 -m http.server 8000

3)  Open in Browser

    http://localhost:8000/frontend/index.html

  -----------
  DEMO FLOW
  -----------

1.  Host creates session
2.  Player joins using session ID
3.  Host starts game
4.  Quiz loads 10 random non-repeating questions
5.  Player submits answers
6.  Backend scoring calculates results
7.  Results page displays rankings
8.  Return to lobby available

  ------------
  TECH STACK
  ------------

Frontend: - HTML - CSS - Vanilla JavaScript

Backend: - Python - Flask

Data: - JSON seed question bank

  ------------------
  SPRINT 2 OUTCOME
  ------------------

-   Full working demo achieved
-   Clear separation of concerns
-   Successful integration of frontend, backend, and scoring
-   Branch merged via pull request
-   Demo recording confirms working state

End of README
