import json
import os

current_folder = os.path.dirname(__file__)
json_path = os.path.join(current_folder, '..', '..', 'db', 'results.json')

# Function needs to be called with player and score parameters
# If player doesn't have a score it initiates at 0
# The function does not rewrite values for a new session
def save_score(player, score):

    try:
        with open(json_path, 'r') as file:
            results = json.load(file)
    except:
        results = {}

    result = results.get(player, {"score": 0, "total": 0})
    result["score"] = result["score"] + int(score) * 10
    result["total"] = result["total"] + 10
    results[player] = result

    with open(json_path, 'w') as file:
        return json.dump(results, file)


# Gives percentage value from results from total
def calculate_final_score(player):
    """Calculates the scoring of the game session"""
    with open(json_path, 'r') as file:
        results = json.load(file)
    result = results.get(player)

    return result["score"] * 100 / result["total"]

def calculate_how_wrong(player):
    with open(json_path, 'r') as file:
        results = json.load(file)
    result = results.get(player)

    return  result["total"] - result["score"]

def calculate_how_right(player):
    with open(json_path, 'r') as file:
        results = json.load(file)
    result = results.get(player)

    return  result["score"]

def clear_results():
    with open(json_path, 'w') as file:
        return json.dump({}, file)


