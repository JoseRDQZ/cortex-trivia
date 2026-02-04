import json
import os

current_folder = os.path.dirname(__file__)
json_path = os.path.join(current_folder, '..', '..', 'db', 'results.json')

# Function needs to be called with player and score parameters
# If player doesn't have a score it initiates at 0
# The function does not rewrite values for a new session
# TODO: Add section_id to the results or initiate results.json at the start of the game
def save_score(player, score):

    try:
        with open(json_path, 'r') as file:
            results = json.load(file)
    except:
        results = {}

    result = results.get(player, {"score": 0, "total": 0})
    result["score"] = result["score"] + int(score)
    result["total"] = result["total"] + 1
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

#This is a test The amount a player scores does not affect the other players /see results.json/
save_score("OHB", True)
save_score("OHB", True)
save_score("OHB", False)
save_score("OHB", True)
save_score("AHB", False)
print(calculate_final_score("OHB"))
#still haven't made a way to clear results.json, could be with a start game