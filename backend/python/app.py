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
    clear_results
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
        save_score(player, is_correct) # True = 1 point, False = 0 points

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

