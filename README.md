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
CURRENT STATUS (Sprint 5 – Deployment and Gameplay Enhancement)
-------------------------------------------

Sprint 5 focused on completing deployment, refining gameplay systems,
and improving the overall multiplayer experience.

The system now supports a fully hosted multiplayer gameplay flow:

    Lobby → Session Creation → Join Session → Timed Quiz Gameplay → Results

During Sprint 5, the team successfully deployed the application using
Vercel, making the project publicly accessible. Major gameplay systems
were further refined, including scoring multiplier behavior, timer
customization, answer choice randomization, multiplayer session flow,
and expanded results page performance metrics.

The architecture continues to follow a turn-based multiplayer model
rather than relying on real-time socket-based communication. This keeps
session progression controlled at the game-session level and supports
fair, consistent gameplay across all players.

-------------------------------------------
SPRINT 5 FEATURES
-------------------------------------------

Website Hosting and Deployment

- The application was successfully deployed using Vercel
- The trivia website is now publicly accessible
- Gameplay systems were validated in the hosted environment
- Deployment became part of the complete demo-ready workflow

Scoring Multiplier Refinement

- Scoring logic was refined to provide more accurate and fair results
- Time-based scoring behavior was further validated and adjusted
- Multiplayer gameplay now produces more reliable final scoring
- Scoring refinement was accepted during Sprint 5 review

Timer Customization and Gameplay Controls

- Hosts can now customize gameplay pacing
- Timer customization options were added to support different session
  preferences
- Buffer behavior can be adjusted as part of gameplay control
- Multiplayer session flow was improved with better countdown handling

Results Page Performance Metrics

- The results page now shows more detailed player performance metrics
- New metrics include performance indicators such as response time and
  accuracy
- Results visibility was expanded beyond simple final score display
- The updated results interface was validated during the sprint demo

Question Randomization and Gameplay Variety

- Answer choice randomization was implemented
- This improves gameplay fairness by preventing predictable answer
  patterns
- Gameplay variety was improved for repeated play sessions
- Question flow remained consistent across multiplayer participants

Multiplayer Session Flow Improvements

- Session flow was improved with a countdown and session locking
  mechanism
- Session locking helps keep gameplay synchronized across all players
- Final system validation confirmed that multiplayer systems, scoring,
  timers, and hosted deployment function correctly together

-------------------------------------------
SPRINT 5 OUTCOME
-------------------------------------------

The following Sprint 5 user stories were accepted by the product owner:

- User Story 1 – Website Hosting and Deployment
- User Story 2 – Scoring Multiplier Refinement
- User Story 3 – Timer Customization and Gameplay Controls
- User Story 4 – Results Page Performance Metrics
- User Story 5 – Question Randomization and Gameplay Variety

No Sprint 5 user stories were rejected.

Overall Sprint 5 outcome:

- Application successfully deployed and hosted using Vercel
- Scoring multiplier refined and validated
- Timer customization and gameplay controls implemented
- Results page expanded with richer player performance metrics
- Answer choice randomization added for gameplay fairness
- Multiplayer session flow improved with countdown and locking behavior
- Full system validated successfully in the hosted environment
- All planned Sprint 5 work was completed and accepted

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
- Displaying detailed player performance metrics

Backend

The backend is implemented using a Flask server.

Responsibilities include:

- Creating and managing game sessions
- Generating unique session IDs using UUID
- Selecting random trivia questions from the database
- Tracking player responses
- Calculating scores and score multipliers
- Managing session lifecycle states
- Supporting deployment-compatible session handling

Data Layer

Trivia questions are loaded from JSON-based question banks.

For each game session:

- 10 random non-repeating questions are selected
- Questions are distributed to all players in the session
- Results and performance metrics are tracked for display

The question database includes categories such as:

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
        Final scoreboard and player performance display

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
6. A countdown and buffer system prepares the question flow
7. Players answer questions within the configured time limit
8. Answer choices are randomized to improve fairness
9. Answers are submitted to the backend
10. The backend processes refined time-based scoring
11. Questions advance when all players answer or time expires
12. Final rankings and detailed performance metrics are displayed on
    the results page

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

Hosting / Deployment

- Vercel

Data Storage

- JSON question database

-------------------------------------------
TEAM RESPONSIBILITIES
-------------------------------------------

Jose Carlos Rodriguez

Team Leader, Product Owner, Frontend Lead
Responsible for frontend implementation, UI integration,
results page improvements, and deployment research.

Daniel Losa

Backend architecture, session lifecycle logic, and hosted environment
integration.

Renier Herba Borrego

Scoring system implementation, multiplier refinement,
and score calculation logic.

Deijen Severino

Timer system implementation, synchronization, and gameplay controls.

Diego A Sanchez

Trivia question databases, category expansion, and gameplay consistency.

-------------------------------------------
NEXT STEPS (Future Improvements)
-------------------------------------------

Future improvements will focus on expanding gameplay features,
improving usability, and continuing system refinement.

Potential improvements include:

- Further expanding results page performance metrics
- Improving the overall UI design and user experience
- Exploring additional gameplay customization options
- Continuing optimization of backend performance and scalability
- Allocating more time for early system-wide integration testing in
  future development cycles

-------------------------------------------

End of README
