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
# Original functions below - logic unchanged, only storage method changed
# ==============================================================================

# Function needs to be called with player and score parameters
# If player doesn't have a score it initiates at 0
# The function does not rewrite values for a new session

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
    time_bracket = certify_time_subdiv(totalTime, subdiv) # we can decide if this is an outside variable or not
    if currTime in time_bracket:
        return (1 - ((time_bracket.index(currTime) + 0.0) / subdiv))

# Individual Player | True/False | multiplier
# Now also tracks correct and wrong counts separately from weighted score
def save_score(player, score, mult):
    # OLD: read from results.json file
    # NEW: read from Redis
    results = get_results_from_redis()

    result = results.get(player, {"score": 0, "total": 0, "correct": 0, "wrong": 0})

    # Weighted score points (used for final score percentage)
    result["score"] = result["score"] + int(score) * 10 * mult
    result["total"] = result["total"] + 10

    # Simple correct/wrong count (used for display in results page)
    if score:
        result["correct"] = result.get("correct", 0) + 1
    else:
        result["wrong"] = result.get("wrong", 0) + 1

    results[player] = result

    # OLD: write to results.json file
    # NEW: write to Redis
    save_results_to_redis(results)


# Gives percentage value from results from total
def calculate_final_score(player):
    """Calculates the scoring of the game session"""
    # OLD: read from results.json file
    # NEW: read from Redis
    results = get_results_from_redis()
    result = results.get(player)

    return round(result["score"] * 100 / result["total"], 2)

def calculate_how_wrong(player):
    # OLD: read from results.json file
    # NEW: read from Redis
    # Now returns actual wrong count instead of weighted calculation
    results = get_results_from_redis()
    result = results.get(player)

    return result.get("wrong", 0)

def calculate_how_right(player):
    # OLD: read from results.json file
    # NEW: read from Redis
    # Now returns actual correct count instead of weighted score points
    results = get_results_from_redis()
    result = results.get(player)

    return result.get("correct", 0)

def clear_results():
    # OLD: write empty dict to results.json file
    # NEW: write empty dict to Redis
    save_results_to_redis({})