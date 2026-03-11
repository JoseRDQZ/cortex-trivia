# Using Flask since it helps connects Python to websites, and using jsonify since it translates Python data for websites.
from flask import Flask, request, jsonify

# This import allows cross-origin request (In other words, allows web page from one origin to fetch stuff from a different origin)
from flask_cors import CORS

# Generates unique IDs for each game session
import uuid

# Imports to connect and read questions.seed.json
import json
import os

# Import to be used for selecting questions randomly each game.
import random

# Import for scoring functions
from calculateScoring import (
    save_score,
    calculate_final_score,
    calculate_how_right,
    calculate_how_wrong,
    clear_results,
    time_miltiplier # new import
)

# ==============================================================================
# READ (IMPORTANT)
# ==============================================================================
#
# FOR FRONTEND TEAM - How to connect to this backend:
#
# 1. Make sure Flask is running: python app.py (runs on http://localhost:5000)
#
# 2. Install flask-cors if not already: pip install flask-cors
#
# ------------------------------------------------------------------------------
# NOTES:
# - Scoring is integrated from teammate's calculateScoring.py
# - Category filtering is NOT implemented yet (CS, Data Science, Cyber Security, IT)
# - Game sessions are stored in memory (resets when server restarts)
# ==============================================================================

# Creates the Flask application
app = Flask(__name__)

# Enabling CORS in order for frontend to communicate with backend.
CORS(app)

# Stores the current game data
game_sessions = {}

# JOSE PATCH: lightweight lobby/session storage for Sprint 3 host flow
# - This is separate from "game_sessions" because it represents pre-game state (host created session, players joined, etc.)
lobby_sessions = {}

# ==============================================================================
# Time scoring constants
# Agree on these values with your team if they need to change
# QUESTION_TOTAL_TIME = total seconds allowed per question
# QUESTION_TIME_SUBDIV = how many scoring brackets exist within that time
# ==============================================================================
QUESTION_TOTAL_TIME = 30
QUESTION_TIME_SUBDIV = 4


# ==============================================================
# Fetch questions from database
# ==============================================================

# Question bank files live in the /db folder (two levels above this file)
QUESTION_BANK_FILES = {
    "cs": "cs_question_bank.json",
    "cybersec": "cybersec_question_bank.json",
}

DEFAULT_BANK_ID = "cs"
_question_bank_cache = {}

def load_questions_from_db(filename):
    backend_dir = os.path.dirname(__file__)
    json_path = os.path.join(backend_dir, "..", "..", "db", filename)

    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_question_bank(bank_id):
    bank_id = (bank_id or DEFAULT_BANK_ID).lower().strip()

    if bank_id not in QUESTION_BANK_FILES:
        bank_id = DEFAULT_BANK_ID

    if bank_id not in _question_bank_cache:
        _question_bank_cache[bank_id] = load_questions_from_db(QUESTION_BANK_FILES[bank_id])

    return bank_id, _question_bank_cache[bank_id]

# Load default bank at startup so the server fails fast if file names are wrong
_default_bank_id, question_bank = get_question_bank(DEFAULT_BANK_ID)
print(f"Default bank loaded: {_default_bank_id} ({len(question_bank)} questions)")

@app.route("/question_banks", methods=["GET"])
def question_banks():
    banks = [
        {"id": "cs", "label": "Computer Science"},
        {"id": "cybersec", "label": "Cybersecurity"},
    ]
    return jsonify({"default": DEFAULT_BANK_ID, "banks": banks})


# JOSE PATCH: generate a short session code (host-friendly)
def _generate_session_code(length=6):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choice(alphabet) for _ in range(length))
        if code not in lobby_sessions:
            return code


# ====================================================================
# Manage answer validation (Checks if the answer selected is correct
# ====================================================================
# NEEDS FRONTEND TO SEND QUESTION ID AND ANSWER CHOICE 
# NOTE: Scoring not implemented here.

@app.route('/game/<game_id>/submit', methods=['POST'])
def submit_answer(game_id):
    """ Checks if selected answer from frontend is correct (scoring handled elsewhere)"""

    if game_id not in game_sessions:
        return jsonify({
            "success": False,
            "message": "Game not found"
        }), 404

    game = game_sessions[game_id]
    data = request.get_json()
    
    user_answer = data.get("answer_index") # 0, 1, 2, or 3
    question_id = data.get("question_id") # "E001" and so on
    player = data.get("player") # Player name for scoring

    #Find question from question bank
    question = None
    for i in game["questions"]:
        if i["id"] == question_id:
            question = i
            break

    # Question found or not check
    if question is None:
        return jsonify({
            "success": False, 
            "message": "Question not found"
        })

    # Get correct answer and check if it is correct.
    correct_answer = question["answerIndex"]
    is_correct = (user_answer == correct_answer)

    # Scoring integration
    if player:
        # Frontend sends currTime (seconds remaining when player answered)
        # 30 second timer split into 4 quarters (7.5s each):
        # 22.5-30s remaining = 1.0, 15-22.5s = 0.75, 7.5-15s = 0.50, 0-7.5s = 0.25
        curr_time = data.get("currTime")

        if curr_time is not None:
            if curr_time >= 22.5:
                mult = 1.0
            elif curr_time >= 15:
                mult = 0.75
            elif curr_time >= 7.5:
                mult = 0.50
            else:
                mult = 0.25
        else:
            # If frontend hasn't implemented currTime yet, default to full multiplier
            mult = time_multiplier(QUESTION_TOTAL_TIME, QUESTION_TIME_SUBDIV, QUESTION_TOTAL_TIME)

        save_score(player, is_correct, mult) # score weighted by how fast they answered

    # Return results for a proper translation for the site to read them. (Python uses "True" while website uses "true")
    return jsonify({
        "success": True,
        "is_correct": is_correct,
        "correct_index": correct_answer,
        "correct_text": question["choices"][correct_answer]
    })


# ==========================================================
# Start Game Section
# ==========================================================

# When someone visits /start and sends data, run "handle_start_game()" which is below.
@app.route('/start', methods=['POST'])
def handle_start_game():
    """Creates a new session when Start button is clicked"""
    
    # Get the game settings sent from the website
    data = request.get_json() or {}
    bank_request = data.get("bank_id")  # "cs" or "cybersec"
    bank_id, active_bank = get_question_bank(bank_request)
    
    session_code = data.get('session_code')
    players = data.get('players', [])

    # JOSE PATCH: if frontend did not send players, try using lobby session players
    if session_code and (not players or len(players) == 0) and session_code in lobby_sessions:
        players = lobby_sessions[session_code].get("players", [])

    # Validate required data
    if not session_code:
        return jsonify({
            "success": False,
            "message": "Session code is required"
        }), 400

    if not players or len(players) == 0:
        return jsonify({
            "success": False,
            "message": "At least one player is required to start the game"
        }), 400

    # Clear previous results
    clear_results()

    # Generation of unique game ID
    game_id = str(uuid.uuid4())

    # Selection of ten random questions
    num_questions = min(10, len(active_bank))
    selected_questions = random.sample(active_bank, num_questions)

    # Store game session
    game_sessions[game_id] = {
    "game_id": game_id,
    "session_code": session_code,
    "players": players,
    "bank_id": bank_id,
    "questions": selected_questions,
    }

    print(f"Game started: {game_id} with {len(players)} players(s)")

    # JOSE PATCH: attach game_id to lobby session (helps the host page poll and redirect players)
    if session_code in lobby_sessions:
        lobby_sessions[session_code]["game_id"] = game_id
        lobby_sessions[session_code]["started"] = True

    # Send a response back to the website
    return jsonify({
        "success": True,
        "game_id": game_id,
        "session_code": session_code,
        "question_count": num_questions,
        "players": players,
        "message": "The game started properly."
    })


# ==============================================
# Return questions for a game session
# ==============================================

@app.route('/game/<game_id>/questions', methods=['GET'])
def get_game_questions(game_id):
    """Returns questions for a game"""

    if game_id not in game_sessions:
        return jsonify({
            "success": False,
            "message": "Game not found"
        }), 404
        
    game = game_sessions[game_id]

    return jsonify({
        "success": True,
        "game_id": game_id,
        "questions": game["questions"],
        "total": len(game["questions"])
    })


# JOSE PATCH: compatibility route
# Some frontend versions call GET /questions?game_id=...
# Your server previously returned 404 here, which caused "Fetching question set..." to hang.
@app.route('/questions', methods=['GET'])
def questions_alias():
    game_id = request.args.get("game_id")

    # If they passed session_code instead, map it to the started game's id (Sprint 3 host flow)
    if not game_id:
        session_code = request.args.get("session_code")
        if session_code and session_code in lobby_sessions:
            game_id = lobby_sessions[session_code].get("game_id")

    if not game_id:
        return jsonify({
            "success": False,
            "message": "Missing game_id (or session_code)"
        }), 400

    return get_game_questions(game_id)


# ==========================================================
# JOSE PATCH: Sprint 3 lobby endpoints (host page support)
# ==========================================================

@app.route('/session/create', methods=['POST'])
def create_session():
    """Creates a lobby session (pre-game) for the host page"""

    data = request.get_json() or {}
    host = (data.get("host") or "").strip()
    bank_request = data.get("bank_id")
    bank_id, _ = get_question_bank(bank_request)

    if not host:
        return jsonify({
            "success": False,
            "message": "Host name is required"
        }), 400

    session_code = _generate_session_code()

    lobby_sessions[session_code] = {
        "session_code": session_code,
        "host": host,
        "bank_id": bank_id,
        "players": [host],   # I’m counting host as present in the lobby (easy for display and consistency)
        "started": False,
        "game_id": None
    }

    return jsonify({
        "success": True,
        "session_code": session_code,
        "host": host,
        "bank_id": bank_id,
        "players": lobby_sessions[session_code]["players"]
    })


@app.route('/session/join', methods=['POST'])
def join_session():
    """Player joins a lobby session"""

    data = request.get_json() or {}
    session_code = (data.get("session_code") or "").strip().upper()
    player = (data.get("player") or "").strip()

    if not session_code:
        return jsonify({"success": False, "message": "Session code is required"}), 400
    if not player:
        return jsonify({"success": False, "message": "Player name is required"}), 400
    if session_code not in lobby_sessions:
        return jsonify({"success": False, "message": "Session not found"}), 404

    lobby = lobby_sessions[session_code]

    if lobby.get("started"):
        return jsonify({"success": False, "message": "Game already started"}), 409

    if player not in lobby["players"]:
        lobby["players"].append(player)

    return jsonify({
        "success": True,
        "session_code": session_code,
        "players": lobby["players"],
        "bank_id": lobby["bank_id"]
    })


@app.route('/session/<session_code>', methods=['GET'])
def get_session(session_code):
    """Host page can poll this to see players join + when game starts"""

    session_code = (session_code or "").strip().upper()

    if session_code not in lobby_sessions:
        return jsonify({"success": False, "message": "Session not found"}), 404

    lobby = lobby_sessions[session_code]

    return jsonify({
        "success": True,
        "session_code": lobby["session_code"],
        "host": lobby["host"],
        "bank_id": lobby["bank_id"],
        "players": lobby["players"],
        "started": lobby.get("started", False),
        "game_id": lobby.get("game_id")
    })


@app.route('/session/<session_code>/start', methods=['POST'])
def start_session(session_code):
    """Starts the game from the lobby (host page). This calls Daniel's /start logic."""

    session_code = (session_code or "").strip().upper()

    if session_code not in lobby_sessions:
        return jsonify({"success": False, "message": "Session not found"}), 404

    lobby = lobby_sessions[session_code]

    if lobby.get("started"):
        return jsonify({"success": True, "message": "Game already started", "game_id": lobby.get("game_id")})

    # I reuse Daniel's handle_start_game flow so we don't rewrite the core logic.
    payload = {
        "session_code": session_code,
        "players": lobby.get("players", []),
        "bank_id": lobby.get("bank_id")
    }

    # JOSE PATCH: manually call the same logic by mimicking a request
    # (keeps Daniel’s core behavior intact)
    with app.test_request_context('/start', method='POST', json=payload):
        return handle_start_game()


# ===========================================
# Get Results Section
# ===========================================
@app.route('/results/<player>', methods=['GET'])
def get_results(player):
    """Returns the final score for a player"""

    try:
        final_score = calculate_final_score(player)
        correct = calculate_how_right(player)
        wrong = calculate_how_wrong(player)

        return jsonify({
            "success": True,
            "player": player,
            "correct": correct,
            "wrong": wrong,
            "final_score": final_score
        })
    except:
        return jsonify({
            "success": False,
            "message": "No results found for this player"
        }), 404


# ==============================================
# Run server
# ==============================================

# If this file is run directly, start the server
if __name__ == '__main__':

    print(f"Loaded {len(question_bank)} questions")
    print("Server running on http://localhost:5000")
    # Start Flask server on port 5000 with debug mode on
    app.run(debug=True, port=5000)


