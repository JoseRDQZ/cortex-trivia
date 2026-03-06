import json
import os

current_folder = os.path.dirname(__file__)
json_path = os.path.join(current_folder, '..', '..', 'db', 'results.json')

# Function needs to be called with player and score parameters
# If player doesn't have a score it initiates at 0
# The function does not rewrite values for a new session


#This creates the subdivision which we will use for which time brackets change the multiplier
#this is called by the time_multiplier function and turns the time brackets into whole numbers
#as to coincide with the actual time as it will be an int
def certify_time_subdiv(totalTime, subdiv):
    applicable_subdiv = []
    crude_subdiv = totalTime

    while crude_subdiv > 0:
        applicable_subdiv.append(crude_subdiv)
        crude_subdiv = crude_subdiv - (totalTime / subdiv)

    for i in range (len(applicable_subdiv)):
        applicable_subdiv[i] = int(applicable_subdiv[i])

    return applicable_subdiv


def time_multiplier(totalTime, subdiv, currTime):
    time_bracket = certify_time_subdiv(totalTime, subdiv) #we can decide if this is an outside variable or not
    if currTime in time_bracket:
        return (1-((time_bracket.index(currTime)+0.0)/subdiv))


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
