import json


def fetch_question(question_id):
    db = json.loads(open('db.json').read())

    for question in db:
        if question['id'] == question_id:
            return question

    return None


def calculate_scoring(question_id, answer_id):
    """Calculates the scoring of the game session"""
    question = fetch_question(question_id)
    if question["answerIndex"] == answer_id:
        return 1
    else:
        return 0


def save_score(player, score):
    results = json.loads(open('results.json').read())

    result = results.get(player, {"score": 0, "total": 0})

    result["score"] = result["score"] + score
    result["total"] = result["total"] + 1

    results[player] = result

    json.dump(results, open('results.json', 'w'))

def calculate_final_score(player):
    """Calculates the scoring of the game session"""
    results = json.loads(open('results.json').read())
    result = results.get(player)

    return result["score"] * 100 / result["total"]


save_score("OHB", calculate_scoring("E004", 3))
save_score("OHB", calculate_scoring("E003", 1))
print(calculate_final_score("OHB"))
