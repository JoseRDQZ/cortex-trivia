# Cortex Trivia (Capstone)

Cortex Trivia is a web-based multiplayer turn-based trivia game built by our Spring
2026 Computer Science Capstone team. Players create or join a shared session,
answer timed questions, earn points, and view final rankings.

The system is designed around a multiplayer session architecture where all players
participate in the same sequence of questions. Gameplay progression is controlled
at the session level to ensure fairness across all players.

The project maintains separation between frontend interface logic, backend session
management, scoring logic, and the trivia question database.

-------------------------------------------
CURRENT STATUS (Sprint 3 – Multiplayer Foundation Complete)
-------------------------------------------

Sprint 3 expanded the project from a single-player demo into a multiplayer
session-based application.

The system now supports a full multiplayer gameplay loop:

    Lobby → Session Creation → Join Session → Quiz Gameplay → Results

During Sprint 3, the team implemented the core multiplayer infrastructure
required to support multiple players participating in the same trivia session.

The architecture intentionally uses a turn-based design rather than a
real-time socket-based system. This simplifies synchronization and ensures
consistent progression for all players.

-------------------------------------------
SPRINT 3 FEATURES
-------------------------------------------

Multiplayer Session System

- Host can create a new game session
- Players can join an existing session using a session ID
- Host controls when the game begins
- Late join prevention once the game starts

Session Lifecycle Management

Game sessions operate under defined states:

    Waiting
    In Progress
    Completed

These session states allow the backend to control game progression and
ensure consistent gameplay behavior.

Turn-Based Multiplayer Gameplay

- All players receive the same sequence of questions
- Questions progress when:
    1. All players submit their answers, or
    2. The question timer expires

This ensures all players remain synchronized throughout the session.

Timer Integration

A timer system has been introduced to support:

- Time-limited questions
- Automatic question progression
- Foundation for time-based scoring

Multiplayer Score Tracking

Scores are tracked at the session level, allowing:

- Score updates during gameplay
- Tracking multiple players in a single session
- Final ranking display after the session completes

Expanded Question Categories

The question database now includes categories such as:

- Computer Science
- Cybersecurity
- Data Science
- Information Technology

The database will continue expanding throughout development.

-------------------------------------------
SYSTEM ARCHITECTURE
-------------------------------------------

Frontend

The frontend provides the user interface for the game and communicates
with the backend through HTTP API requests.

Key responsibilities include:

- Lobby interface for creating and joining sessions
- Host and player game interfaces
- Displaying trivia questions
- Submitting answers to the backend
- Displaying session results

Backend

The backend is implemented using a Flask server.

Responsibilities include:

- Creating and managing game sessions
- Generating unique session IDs using UUID
- Selecting random trivia questions from the database
- Tracking player responses
- Calculating scores
- Managing session lifecycle states

Sessions are currently stored in memory on the server.

This means that restarting the backend will reset active sessions.

Data Layer

Trivia questions are loaded from a JSON seed file.

For each game session:

- 10 random non-repeating questions are selected
- Questions are distributed to all players in the session

-------------------------------------------
PROJECT STRUCTURE
-------------------------------------------

cortex-trivia/

frontend/

    index.html
        Lobby page where players create or join sessions

    host.html
        Host interface for managing the game session

    player.html
        Player interface for joining and participating in sessions

    quiz.html
        Main gameplay page where questions are presented

    results.html
        Final scoreboard and ranking display

    app.js
        Frontend logic and backend API communication

    styles.css
        UI styling and layout

backend/python/

    app.py
        Flask backend providing API endpoints for sessions and gameplay

    calculateScoring.py
        Scoring logic used to calculate player results

db/

    questions.seed.json
        Seed trivia question database

    results.json
        Stored game results (if applicable)

docs/

    architecture.md
        Additional project documentation and design notes

-------------------------------------------
HOW TO RUN THE APPLICATION
-------------------------------------------

1) Start Backend (Terminal 1)

From the project root:

    cd backend/python
    python3 app.py

Expected output:

    Server running on http://127.0.0.1:5000


2) Start Frontend Server (Terminal 2)

From the project root:

    python3 -m http.server 8000


3) Open in Browser

    http://localhost:8000/frontend/index.html

-------------------------------------------
GAMEPLAY FLOW
-------------------------------------------

1. Host creates a new session
2. Players join the session using the session ID
3. Host starts the game
4. The backend selects 10 random trivia questions
5. All players answer questions within the time limit
6. Answers are submitted to the backend
7. The backend processes scoring
8. Questions advance when all players answer or time expires
9. Final rankings are displayed on the results page

-------------------------------------------
TECH STACK
-------------------------------------------

Frontend

- HTML
- CSS
- Vanilla JavaScript

Backend

- Python
- Flask

Data Storage

- JSON question database

-------------------------------------------
TEAM RESPONSIBILITIES
-------------------------------------------

Jose Carlos Rodriguez

Team Leader, Product Owner, Frontend Lead
Responsible for frontend implementation, UI integration,
and deployment research.

Daniel Losa

Backend architecture and session lifecycle logic.

Renier Herba Borrego

Scoring system implementation and score calculation logic.

Deijen Severino

Timer system implementation and synchronization.

Diego A Sanchez

Trivia question databases and category expansion.

-------------------------------------------
NEXT STEPS (Sprint 4)
-------------------------------------------

Sprint 4 focuses on stabilizing the multiplayer system and preparing
the project for deployment.

Planned improvements include:

- Finalizing time-based scoring logic
- Improving timer synchronization across players
- Ensuring fair multiplayer progression
- Expanding the trivia question database
- Preparing the application for hosting and deployment

-------------------------------------------

End of README
