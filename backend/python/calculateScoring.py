import json
import os
import sys

# Add current directory to path so Vercel can find this module
sys.path.insert(0, os.path.dirname(__file__))

from upstash_redis import Redis

# ==============================================================================
# Upstash Redis connection
# Replaces results.json since Vercel has a read-only filesystem.
# Credentials are stored as environment variables (set in Vercel dashboard).
# ==============================================================================
redis = Redis(
    url=os.environ["UPSTASH_REDIS_REST_URL"],
    token=os.environ["UPSTASH_REDIS_REST_TOKEN"]
)

# ==============================================================================
# Constants
# ==============================================================================
POINTS_PER_QUESTION = 10

# ==============================================================================
# Redis helper functions to replace results.json
# OLD: open(json_path, 'r') / open(json_path, 'w')
# NEW: get_results_from_redis() / save_results_to_redis()
# ==============================================================================

def get_results_from_redis():
    data = redis.get("results")
    return json.loads(data) if data else {}

def save_results_to_redis(results):
    redis.set("results", json.dumps(results))


# ==============================================================================
# Helper functions
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

def round2(value):
    return round(safe_float(value, 0.0), 2)

def default_player_result():
    """
    Centralized default player scoring structure.
    Keeps old fields for compatibility and adds new Sprint 5 fields.
    """
    return {
        # Original / compatibility fields
        "score": 0.0,          # weighted points earned
        "total": 0.0,          # maximum possible points attempted
        "correct": 0,
        "wrong": 0,

        # Sprint 5 extended fields
        "answered": 0,
        "unanswered": 0,
        "points_earned": 0.0,
        "points_lost": 0.0,
        "max_possible": 0.0,
        "multiplier_sum": 0.0,
        "multiplier_count": 0
    }

def ensure_player_result_shape(result):
    """
    Makes sure older stored result entries still have all the new keys.
    """
    base = default_player_result()
    if not isinstance(result, dict):
        return base

    for key, value in base.items():
        if key not in result:
            result[key] = value

    return result


# ==============================================================================
# Original timing helpers
# ==============================================================================

# This creates the subdivision which we will use for which time brackets change the multiplier
# this is called by the time_multiplier function and turns the time brackets into whole numbers
# as to coincide with the actual time as it will be an int
def certify_time_subdiv(totalTime, subdiv):
    applicable_subdiv = []
    crude_subdiv = totalTime

    while crude_subdiv > 0:
        applicable_subdiv.append(crude_subdiv)
        crude_subdiv = crude_subdiv - (totalTime / subdiv)

    for i in range(len(applicable_subdiv)):
        applicable_subdiv[i] = int(applicable_subdiv[i])

    return applicable_subdiv

# The multiplier function that should be called to obtain a multiplier value, if currTime is not in time bracket
# then, it will output None
def time_multiplier(totalTime, subdiv, currTime):
    time_bracket = certify_time_subdiv(totalTime, subdiv)
    if currTime in time_bracket:
        return (1 - ((time_bracket.index(currTime) + 0.0) / subdiv))


# ==============================================================================
# Core scoring functions
# ==============================================================================

# Individual Player | True/False | multiplier
# Now tracks both original fields and richer Sprint 5 scoring metrics.
def save_score(player, score, mult):
    """
    Keeps the original function signature unchanged:
        save_score(player, score, mult)

    player -> player name
    score  -> True / False
    mult   -> multiplier value

    Existing code expects:
    - weighted score stored in "score"
    - max possible attempted score stored in "total"
    - correct / wrong counts

    This version preserves that and also stores:
    - points_earned
    - points_lost
    - max_possible
    - answered
    - multiplier average inputs
    """
    results = get_results_from_redis()

    result = ensure_player_result_shape(results.get(player, default_player_result()))

    is_correct = bool(score)
    multiplier = safe_float(mult, 1.0)

    max_points = float(POINTS_PER_QUESTION)
    earned_points = max_points * multiplier if is_correct else 0.0
    lost_points = (max_points - earned_points) if is_correct else 0.0

    # --------------------------------------------------------------------------
    # Original compatibility behavior
    # --------------------------------------------------------------------------
    result["score"] = round2(result["score"] + earned_points)
    result["total"] = round2(result["total"] + max_points)

    if is_correct:
        result["correct"] = safe_int(result.get("correct", 0)) + 1
    else:
        result["wrong"] = safe_int(result.get("wrong", 0)) + 1

    # --------------------------------------------------------------------------
    # Sprint 5 richer tracking
    # --------------------------------------------------------------------------
    result["answered"] = safe_int(result.get("answered", 0)) + 1
    result["points_earned"] = round2(result.get("points_earned", 0.0) + earned_points)
    result["points_lost"] = round2(result.get("points_lost", 0.0) + lost_points)
    result["max_possible"] = round2(result.get("max_possible", 0.0) + max_points)
    result["multiplier_sum"] = round2(result.get("multiplier_sum", 0.0) + multiplier)
    result["multiplier_count"] = safe_int(result.get("multiplier_count", 0)) + 1

    results[player] = result
    save_results_to_redis(results)


# Gives percentage value from results from total
def calculate_final_score(player):
    """Calculates the scoring percentage of the game session"""
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))

    total = safe_float(result.get("total", 0.0), 0.0)
    score = safe_float(result.get("score", 0.0), 0.0)

    if total <= 0:
        return 0.0

    return round((score * 100) / total, 2)

def calculate_how_wrong(player):
    """Returns actual wrong count"""
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))
    return safe_int(result.get("wrong", 0), 0)

def calculate_how_right(player):
    """Returns actual correct count"""
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))
    return safe_int(result.get("correct", 0), 0)


# ==============================================================================
# Additional Sprint 5 getters
# These do not break old code because they are new helpers only.
# ==============================================================================

def calculate_answered(player):
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))
    return safe_int(result.get("answered", 0), 0)

def calculate_unanswered(player, question_count=None):
    """
    If total questions are known, derive unanswered from:
        question_count - answered
    Otherwise return stored unanswered value (default 0).
    """
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))

    if question_count is not None:
        return max(safe_int(question_count, 0) - safe_int(result.get("answered", 0), 0), 0)

    return safe_int(result.get("unanswered", 0), 0)

def calculate_points_earned(player):
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))
    return round2(result.get("points_earned", 0.0))

def calculate_points_lost(player):
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))
    return round2(result.get("points_lost", 0.0))

def calculate_max_possible(player):
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))
    return round2(result.get("max_possible", 0.0))

def calculate_accuracy(player):
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))

    correct = safe_int(result.get("correct", 0), 0)
    answered = safe_int(result.get("answered", 0), 0)

    if answered <= 0:
        return 0.0

    return round((correct / answered) * 100, 2)

def calculate_average_multiplier(player):
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))

    mult_sum = safe_float(result.get("multiplier_sum", 0.0), 0.0)
    mult_count = safe_int(result.get("multiplier_count", 0), 0)

    if mult_count <= 0:
        return 0.0

    return round(mult_sum / mult_count, 2)

def calculate_score_summary(player, question_count=None):
    """
    Convenience helper for richer result payloads.
    Safe to use if backend wants one object with all major fields.
    """
    results = get_results_from_redis()
    result = ensure_player_result_shape(results.get(player, default_player_result()))

    correct = safe_int(result.get("correct", 0), 0)
    wrong = safe_int(result.get("wrong", 0), 0)
    answered = safe_int(result.get("answered", 0), 0)

    if question_count is not None:
        unanswered = max(safe_int(question_count, 0) - answered, 0)
    else:
        unanswered = safe_int(result.get("unanswered", 0), 0)

    final_score = calculate_final_score(player)
    points_earned = calculate_points_earned(player)
    points_lost = calculate_points_lost(player)
    max_possible = calculate_max_possible(player)
    accuracy = calculate_accuracy(player)
    avg_multiplier = calculate_average_multiplier(player)

    return {
        "player": player,
        "correct": correct,
        "wrong": wrong,
        "answered": answered,
        "unanswered": unanswered,
        "final_score": final_score,
        "points_earned": points_earned,
        "points_lost": points_lost,
        "max_possible": max_possible,
        "accuracy_percent": accuracy,
        "avg_multiplier": avg_multiplier
    }


def clear_results():
    """
    Clears all stored scoring results.
    Kept exactly the same name so existing code does not break.
    """
    save_results_to_redis({})
