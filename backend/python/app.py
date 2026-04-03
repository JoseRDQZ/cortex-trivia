import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

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

# Import for Upstash Redis (replaces in-memory storage for Vercel deployment)
from upstash_redis import Redis

# Import for scoring functions
from calculateScoring import (
    save_score,
    calculate_final_score,
    calculate_how_right,
    calculate_how_wrong,
    clear_results,
    certify_time_subdiv,
    time_multiplier  # Added to calculate time-based score multiplier
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
# - Category filtering is implemented through separate JSON question banks
# - Game sessions are stored in Upstash Redis (persists between requests on Vercel)
# - question_time and buffer_enabled added for host-customizable timer settings
# - Sprint 5 metrics layer added with minimal disruption to existing routes
# ==============================================================================

# Creates the Flask application
app = Flask(__name__)

# Enabling CORS in order for frontend to communicate with backend.
CORS(app)

# ==============================================================================
# Upstash Redis connection
# ==============================================================================
redis = Redis(
    url=os.environ["UPSTASH_REDIS_REST_URL"],
    token=os.environ["UPSTASH_REDIS_REST_TOKEN"]
)

# ==============================================================================
# Time scoring constants
# ==============================================================================
QUESTION_TOTAL_TIME = 30
QUESTION_TIME_SUBDIV = 4

# ==============================================================================
# Sprint 5 metrics constants
# ==============================================================================
MAX_POINTS_PER_QUESTION = 10
SESSION_EXPIRY_SECONDS = 7200


# ==============================================================================
# Redis helper functions
# ==============================================================================

def get_game_session(game_id):
    data = redis.get(f"game:{game_id}")
    return json.loads(data) if data else None

def set_game_session(game_id, session_data):
    redis.set(f"game:{game_id}", json.dumps(session_data), ex=SESSION_EXPIRY_SECONDS)

def get_lobby_session(session_code):
    data = redis.get(f"lobby:{session_code}")
    return json.loads(data) if data else None

def set_lobby_session(session_code, lobby_data):
    redis.set(f"lobby:{session_code}", json.dumps(lobby_data), ex=SESSION_EXPIRY_SECONDS)

def get_game_metrics(game_id):
    data = redis.get(f"metrics:{game_id}")
    return json.loads(data) if data else None

def set_game_metrics(game_id, metrics_data):
    redis.set(f"metrics:{game_id}", json.dumps(metrics_data), ex=SESSION_EXPIRY_SECONDS)

def set_latest_game_for_player(player, game_id):
    redis.set(f"player_latest_game:{player}", game_id, ex=SESSION_EXPIRY_SECONDS)

def get_latest_game_for_player(player):
    return redis.get(f"player_latest_game:{player}")


# ==============================================================================
# Small helpers
# ==============================================================================

def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)

def safe_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return int(default)


def carry_over_mult(curr_time):
    if curr_time == 0:
        return 0  # special case for zero

    step = QUESTION_TOTAL_TIME / QUESTION_TIME_SUBDIV
    # Generate subdivision thresholds
    subdivisions = [int(QUESTION_TOTAL_TIME - i * step) for i in range(QUESTION_TIME_SUBDIV)]

    # Determine which bucket curr_time belongs to
    for i in range(len(subdivisions)):
        if i == 0:
            lower = subdivisions[i + 1] if len(subdivisions) > 1 else 0
        elif i < len(subdivisions) - 1:
            lower = subdivisions[i + 1]
        else:
            lower = -1  # last bucket

        if lower < curr_time <= subdivisions[i]:
            return subdivisions[i]

    # fallback for smallest subdivision
    return subdivisions[-1]


def get_effective_multiplier(curr_time):
    legal_time = carry_over_mult(curr_time)
    mult = time_multiplier(QUESTION_TOTAL_TIME, QUESTION_TIME_SUBDIV, legal_time)
    if mult is not None:
        return float(mult)
    else:
        return 1.0

def performance_rating_from_percent(score_percent):
    if score_percent >= 90:
        return "Excellent"
    if score_percent >= 75:
        return "Strong"
    if score_percent >= 60:
        return "Good"
    if score_percent >= 40:
        return "Developing"
    return "Needs Improvement"


# ==============================================================================
# Metrics helpers
# ==============================================================================

def initialize_game_metrics(game_id, session_code, players, bank_id, question_count, question_time):
    metrics = {
        "game_id": game_id,
        "session_code": session_code,
        "bank_id": bank_id,
        "question_count": question_count,
        "question_time": question_time,
        "max_points_per_question": MAX_POINTS_PER_QUESTION,
        "players": {}
    }

    for player in players:
        metrics["players"][player] = {
            "player": player,
            "attempts": {}
        }

    set_game_metrics(game_id, metrics)

def record_player_attempt(
    game_id,
    player,
    question_id,
    question_index,
    user_answer,
    is_correct,
    unanswered,
    curr_time,
    question_time,
    multiplier
):
    metrics = get_game_metrics(game_id)
    if metrics is None:
        return

    if "players" not in metrics:
        metrics["players"] = {}

    if player not in metrics["players"]:
        metrics["players"][player] = {
            "player": player,
            "attempts": {}
        }

    attempts = metrics["players"][player].setdefault("attempts", {})

    curr_time_value = safe_float(curr_time, 0.0)
    question_time_value = safe_float(question_time, QUESTION_TOTAL_TIME)
    response_time = max(question_time_value - curr_time_value, 0.0)
    max_points = safe_float(metrics.get("max_points_per_question", MAX_POINTS_PER_QUESTION), MAX_POINTS_PER_QUESTION)

    points_awarded = round(max_points * multiplier, 2) if is_correct else 0.0
    points_lost = round(max_points - points_awarded, 2) if is_correct else 0.0

    attempts[str(question_id)] = {
        "question_id": question_id,
        "question_index": question_index,
        "selected_answer_index": user_answer,
        "is_correct": bool(is_correct),
        "unanswered": bool(unanswered),
        "time_remaining": round(curr_time_value, 2),
        "response_time": round(response_time, 2),
        "question_time": round(question_time_value, 2),
        "multiplier": round(float(multiplier), 2),
        "points_awarded": round(points_awarded, 2),
        "points_lost": round(points_lost, 2),
        "max_points": round(max_points, 2)
    }

    set_game_metrics(game_id, metrics)
    set_latest_game_for_player(player, game_id)

def build_player_metrics_payload(game_id, player):
    metrics = get_game_metrics(game_id)
    if metrics is None:
        return None

    player_data = metrics.get("players", {}).get(player)
    if player_data is None:
        return None

    attempts_dict = player_data.get("attempts", {})
    attempts = list(attempts_dict.values())

    question_count = safe_int(metrics.get("question_count"), 0)
    max_points_per_question = safe_float(metrics.get("max_points_per_question"), MAX_POINTS_PER_QUESTION)
    max_score = round(question_count * max_points_per_question, 2)

    correct_attempts = [a for a in attempts if a.get("is_correct") is True]
    wrong_attempts = [a for a in attempts if a.get("is_correct") is False and a.get("unanswered") is False]
    unanswered_attempts = [a for a in attempts if a.get("unanswered") is True]

    correct = len(correct_attempts)
    wrong = len(wrong_attempts)
    unanswered_recorded = len(unanswered_attempts)
    answered = correct + wrong

    # If not every question was attempted, treat the remaining questions as unanswered too.
    unanswered = max(question_count - answered, unanswered_recorded)

    points_earned = round(sum(safe_float(a.get("points_awarded"), 0) for a in attempts), 2)
    points_lost = round(sum(safe_float(a.get("points_lost"), 0) for a in attempts), 2)

    response_times = [safe_float(a.get("response_time")) for a in attempts if a.get("response_time") is not None]
    correct_response_times = [safe_float(a.get("response_time")) for a in correct_attempts if a.get("response_time") is not None]
    multipliers = [safe_float(a.get("multiplier")) for a in attempts if a.get("multiplier") is not None]

    accuracy_percent = round((correct / answered) * 100, 2) if answered > 0 else 0.0
    score_percent = round((points_earned / max_score) * 100, 2) if max_score > 0 else 0.0

    avg_response_time = round(sum(response_times) / len(response_times), 2) if response_times else None
    fastest_correct_time = round(min(correct_response_times), 2) if correct_response_times else None
    slowest_correct_time = round(max(correct_response_times), 2) if correct_response_times else None
    avg_multiplier = round(sum(multipliers) / len(multipliers), 2) if multipliers else None

    # Keep teammate scoring as a compatibility value if available
    legacy_final_score = None
    legacy_correct = None
    legacy_wrong = None

    try:
        legacy_final_score = round(calculate_final_score(player), 2)
        legacy_correct = calculate_how_right(player)
        legacy_wrong = calculate_how_wrong(player)
    except Exception:
        legacy_final_score = None
        legacy_correct = None
        legacy_wrong = None

    return {
        "success": True,
        "game_id": game_id,
        "session_code": metrics.get("session_code"),
        "bank_id": metrics.get("bank_id"),
        "player": player,

        "correct": correct,
        "wrong": wrong,
        "answered": answered,
        "unanswered": unanswered,
        "question_count": question_count,
        "accuracy_percent": accuracy_percent,

        "final_score": points_earned,
        "points_earned": points_earned,
        "points_lost": points_lost,
        "max_points_per_question": round(max_points_per_question, 2),
        "max_score": max_score,
        "score_percent": score_percent,

        "avg_response_time": avg_response_time,
        "fastest_correct_time": fastest_correct_time,
        "slowest_correct_time": slowest_correct_time,
        "avg_multiplier": avg_multiplier,
        "performance_rating": performance_rating_from_percent(score_percent),

        # Compatibility fields for older frontend/testing
        "legacy_final_score": legacy_final_score,
        "legacy_correct": legacy_correct,
        "legacy_wrong": legacy_wrong
    }


# ==============================================================
# Fetch questions from database
# ==============================================================

QUESTION_BANK_FILES = {
    "cs": "cs_question_bank.json",
    "cybersec": "cybersec_question_bank.json",
    "it": "information_technology_question_bank.json",
    "datasci": "data_science_question_bank.json",
}

DEFAULT_BANK_ID = "cs"
_question_bank_cache = {}

def load_questions_from_db(filename):
    backend_dir = os.path.dirname(os.path.abspath(__file__))
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
        {"id": "it", "label": "Information Technology"},
        {"id": "datasci", "label": "Data Science"},
    ]
    return jsonify({"default": DEFAULT_BANK_ID, "banks": banks})


# JOSE PATCH: generate a short session code (host-friendly)
def _generate_session_code(length=6):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choice(alphabet) for _ in range(length))
        if get_lobby_session(code) is None:
            return code


# ==============================================================================
# Shared game creation helper
# ==============================================================================
def _create_game(session_code, players, bank_id, question_time=30, buffer_enabled=True):
    """Creates a game session in Redis and returns its details."""

    bank_id, active_bank = get_question_bank(bank_id)
    clear_results()

    game_id = str(uuid.uuid4())
    num_questions = min(10, len(active_bank))
    selected_questions = random.sample(active_bank, num_questions)

    set_game_session(game_id, {
        "game_id": game_id,
        "session_code": session_code,
        "players": players,
        "bank_id": bank_id,
        "questions": selected_questions,
        "question_time": question_time,
        "buffer_enabled": buffer_enabled
    })

    # Sprint 5 metrics setup
    initialize_game_metrics(
        game_id=game_id,
        session_code=session_code,
        players=players,
        bank_id=bank_id,
        question_count=num_questions,
        question_time=question_time
    )

    print(f"Game started: {game_id} with {len(players)} player(s)")
    return game_id, num_questions, players


# ====================================================================
# Manage answer validation
# ====================================================================
@app.route('/game/<game_id>/submit', methods=['POST'])
def submit_answer(game_id):
    """Checks if selected answer from frontend is correct and records richer gameplay metrics."""

    game = get_game_session(game_id)
    if game is None:
        return jsonify({
            "success": False,
            "message": "Game not found"
        }), 404

    data = request.get_json() or {}

    user_answer = data.get("answer_index")
    question_id = data.get("question_id")
    player = data.get("player")

    question = None
    question_index = -1
    for idx, i in enumerate(game["questions"]):
        if i["id"] == question_id:
            question = i
            question_index = idx
            break

    if question is None:
        return jsonify({
            "success": False,
            "message": "Question not found"
        }), 404

    correct_answer = question["answerIndex"]
    is_correct = (user_answer == correct_answer)

    curr_time = data.get("currTime")
    question_time_value = safe_float(game.get("question_time", QUESTION_TOTAL_TIME), QUESTION_TOTAL_TIME)

    if curr_time is not None:
        curr_time_value = safe_float(curr_time, question_time_value)
        curr_time_value = max(min(curr_time_value, question_time_value), 0.0)
    else:
        curr_time_value = question_time_value

    multiplier = get_effective_multiplier(curr_time_value)
    unanswered = user_answer in (None, -1, "")

    if player:
        # Keep existing teammate scoring call intact
        save_score(player, is_correct, multiplier)

        # Record richer metrics with minimal disruption
        record_player_attempt(
            game_id=game_id,
            player=player,
            question_id=question_id,
            question_index=question_index,
            user_answer=user_answer,
            is_correct=is_correct,
            unanswered=unanswered,
            curr_time=curr_time_value,
            question_time=question_time_value,
            multiplier=multiplier
        )

    max_points = MAX_POINTS_PER_QUESTION
    points_awarded = round(max_points * multiplier, 2) if is_correct else 0.0
    points_lost = round(max_points - points_awarded, 2) if is_correct else 0.0
    response_time = round(max(question_time_value - curr_time_value, 0.0), 2)

    return jsonify({
        "success": True,
        "is_correct": is_correct,
        "correct_index": correct_answer,
        "correct_text": question["choices"][correct_answer],

        # Sprint 5 metrics fields for richer frontend results
        "question_id": question_id,
        "question_index": question_index,
        "unanswered": unanswered,
        "time_remaining": round(curr_time_value, 2),
        "response_time": response_time,
        "question_time": round(question_time_value, 2),
        "multiplier": round(multiplier, 2),
        "max_points": max_points,
        "points_awarded": points_awarded,
        "points_lost": points_lost
    })


# ==========================================================
# Start Game Section
# ==========================================================

@app.route('/start', methods=['POST'])
def handle_start_game():
    """Creates a new session when Start button is clicked"""

    data = request.get_json() or {}
    bank_request = data.get("bank_id")
    bank_id, _ = get_question_bank(bank_request)

    question_time = data.get("question_time", 30)
    buffer_enabled = data.get("buffer_enabled", True)

    session_code = data.get('session_code')
    players = data.get('players', [])

    if session_code and (not players or len(players) == 0):
        lobby = get_lobby_session(session_code)
        if lobby:
            players = lobby.get("players", [])

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

    game_id, num_questions, players = _create_game(
        session_code, players, bank_id, question_time, buffer_enabled
    )

    lobby = get_lobby_session(session_code)
    if lobby:
        lobby["game_id"] = game_id
        lobby["started"] = True
        set_lobby_session(session_code, lobby)

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

    game = get_game_session(game_id)
    if game is None:
        return jsonify({
            "success": False,
            "message": "Game not found"
        }), 404

    return jsonify({
        "success": True,
        "game_id": game_id,
        "questions": game["questions"],
        "total": len(game["questions"])
    })


@app.route('/questions', methods=['GET'])
def questions_alias():
    game_id = request.args.get("game_id")

    if not game_id:
        session_code = request.args.get("session_code")
        if session_code:
            lobby = get_lobby_session(session_code.upper())
            if lobby:
                game_id = lobby.get("game_id")

    if not game_id:
        return jsonify({
            "success": False,
            "message": "Missing game_id (or session_code)"
        }), 400

    return get_game_questions(game_id)


# ==========================================================
# JOSE PATCH: Sprint 3 lobby endpoints
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

    lobby_data = {
        "session_code": session_code,
        "host": host,
        "bank_id": bank_id,
        "players": [host],
        "started": False,
        "game_id": None
    }

    set_lobby_session(session_code, lobby_data)

    return jsonify({
        "success": True,
        "session_code": session_code,
        "host": host,
        "bank_id": bank_id,
        "players": lobby_data["players"]
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

    lobby = get_lobby_session(session_code)
    if lobby is None:
        return jsonify({"success": False, "message": "Session not found"}), 404

    if lobby.get("started"):
        return jsonify({"success": False, "message": "Game already started"}), 409

    if player not in lobby["players"]:
        lobby["players"].append(player)
        set_lobby_session(session_code, lobby)

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

    lobby = get_lobby_session(session_code)
    if lobby is None:
        return jsonify({"success": False, "message": "Session not found"}), 404

    game_id = lobby.get("game_id")
    question_time = 30
    buffer_enabled = True

    game = get_game_session(game_id) if game_id else None
    if game:
        question_time = game.get("question_time", 30)
        buffer_enabled = game.get("buffer_enabled", True)

    return jsonify({
        "success": True,
        "session_code": lobby["session_code"],
        "host": lobby["host"],
        "bank_id": lobby["bank_id"],
        "players": lobby["players"],
        "started": lobby.get("started", False),
        "game_id": game_id,
        "question_time": question_time,
        "buffer_enabled": buffer_enabled
    })


@app.route('/session/<session_code>/start', methods=['POST'])
def start_session(session_code):
    """Starts the game from the lobby (host page)."""

    session_code = (session_code or "").strip().upper()

    lobby = get_lobby_session(session_code)
    if lobby is None:
        return jsonify({"success": False, "message": "Session not found"}), 404

    if lobby.get("started"):
        return jsonify({
            "success": True,
            "message": "Game already started",
            "game_id": lobby.get("game_id")
        })

    players = lobby.get("players", [])

    if not players or len(players) == 0:
        return jsonify({
            "success": False,
            "message": "At least one player is required"
        }), 400

    data = request.get_json() or {}
    question_time = data.get("question_time", 30)
    buffer_enabled = data.get("buffer_enabled", True)

    game_id, num_questions, players = _create_game(
        session_code, players, lobby.get("bank_id"), question_time, buffer_enabled
    )

    lobby["game_id"] = game_id
    lobby["started"] = True
    set_lobby_session(session_code, lobby)

    return jsonify({
        "success": True,
        "game_id": game_id,
        "session_code": session_code,
        "question_count": num_questions,
        "players": players,
        "message": "The game started properly."
    })


# ===========================================
# Get Results Section
# ===========================================
@app.route('/results/<player>', methods=['GET'])
def get_results(player):
    """Returns richer final results for a player while keeping legacy compatibility."""

    # First try to use the player's latest tracked game metrics
    latest_game_id = get_latest_game_for_player(player)
    if latest_game_id:
        payload = build_player_metrics_payload(latest_game_id, player)
        if payload:
            return jsonify(payload)

    # Legacy fallback keeps existing behavior if metrics are unavailable
    try:
        final_score = calculate_final_score(player)
        correct = calculate_how_right(player)
        wrong = calculate_how_wrong(player)

        return jsonify({
            "success": True,
            "player": player,
            "correct": correct,
            "wrong": wrong,
            "answered": correct + wrong,
            "unanswered": 0,
            "question_count": correct + wrong,
            "accuracy_percent": round((correct / (correct + wrong)) * 100, 2) if (correct + wrong) > 0 else 0.0,
            "final_score": round(final_score, 2),
            "points_earned": round(final_score, 2),
            "points_lost": 0.0,
            "max_points_per_question": MAX_POINTS_PER_QUESTION,
            "max_score": round((correct + wrong) * MAX_POINTS_PER_QUESTION, 2),
            "score_percent": 0.0,
            "avg_response_time": None,
            "fastest_correct_time": None,
            "slowest_correct_time": None,
            "avg_multiplier": None,
            "performance_rating": "Unavailable"
        })
    except Exception:
        return jsonify({
            "success": False,
            "message": "No results found for this player"
        }), 404


# ==============================================
# Run server
# ==============================================

if __name__ == '__main__':
    print(f"Loaded {len(question_bank)} questions")
    print("Server running on http://localhost:5000")
    app.run(debug=True, port=5000)
