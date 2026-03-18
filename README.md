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
CURRENT STATUS (Sprint 4 – Gameplay Integration and Refinement)
-------------------------------------------

Sprint 4 focused on integrating major gameplay systems into the multiplayer
environment and refining the overall game experience.

The system now supports a more complete multiplayer gameplay flow:

    Lobby → Session Creation → Join Session → Timed Quiz Gameplay → Results

During Sprint 4, the team successfully integrated time-based scoring,
timer behavior, automatic question progression, and expanded quiz category
support into the multiplayer session flow. These systems were tested
together during the sprint demo, confirming that multiplayer sessions,
timer progression, scoring updates, and category selection function
cohesively during gameplay.

The architecture continues to follow a turn-based multiplayer model rather
than relying on real-time socket-based communication. This keeps session
progression controlled at the game-session level and supports fair,
consistent behavior across all players.

-------------------------------------------
SPRINT 4 FEATURES
-------------------------------------------

Time-Based Scoring Implementation

- Scoring now incorporates response time in addition to correctness
- Faster correct answers earn more points
- Incorrect answers receive zero points
- Scoring logic was integrated into multiplayer gameplay and accepted
  during Sprint 4 review

Timer and Auto-Advance Integration

- A question timer system has been fully integrated into gameplay
- Questions automatically advance when:
    1. All players submit their answers, or
    2. The timer expires
- A 3-second reading buffer was added before players begin answering
- Timer progression was tested successfully during multiplayer sessions

Question and Category Consistency in Multiplayer

- Multiplayer sessions maintain consistent question delivery across players
- Additional quiz databases were integrated into the system
- New categories successfully connected and validated include:
    - Data Science
    - Information Technology
- Category selection and gameplay consistency were confirmed during demo
  testing

Gameplay System Integration

- Timer behavior, scoring logic, and database expansion were successfully
  integrated together
- Multiplayer sessions, timer progression, scoring updates, and category
  selection were validated in the sprint demo
- The complete gameplay loop was tested from session creation through
  final results display

-------------------------------------------
SPRINT 4 OUTCOME
-------------------------------------------

The following Sprint 4 user stories were accepted by the product owner:

- User Story 2 – Time-Based Scoring Implementation
- User Story 3 – Timer and Auto-Advance Integration
- User Story 4 – Question and Category Consistency in Multiplayer

The following Sprint 4 user stories were not accepted and were returned
to the product backlog for refinement in Sprint 5:

- User Story 1 – Multiplayer Session Completion and Stability
- User Story 5 – Multiplayer Results and Interface Refinement

Overall Sprint 4 outcome:

- Time-based scoring implemented and validated
- Timer behavior and automatic progression integrated into gameplay
- 3-second reading buffer added successfully
- Expanded quiz databases integrated into the multiplayer system
- Full gameplay loop demonstrated successfully during the sprint demo
- Team communication and integration testing remained consistent
  throughout the sprint

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

The question database now includes categories such as:

- Computer Science
- Cybersecurity
- Data Science
- Information Technology

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
5. All players receive the same question sequence
6. A reading buffer is shown before answering begins
7. Players answer questions within the time limit
8. Answers are submitted to the backend
9. The backend processes time-based scoring
10. Questions advance when all players answer or time expires
11. Final rankings are displayed on the results page

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
NEXT STEPS (Sprint 5)
-------------------------------------------

Sprint 5 will focus on refinement, stability, and deployment readiness.

Planned improvements include:

- Refining the scoring multiplier for fairness across player response times
- Improving multiplayer session stability and completion behavior
- Enhancing the multiplayer results interface
- Continuing deployment and hosting preparation
- Allocating more time for integration testing earlier in the sprint
- Exploring additional gameplay improvements such as:
    - Question shuffling for replayability
    - Adjustable timer duration within a defined range
    - Optional reading buffer enable/disable control
    - More detailed player performance metrics on the results page

-------------------------------------------

End of README
