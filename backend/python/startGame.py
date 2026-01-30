# Using Flask since it helps connects Python to websites, and using jsonify since it translates Python data for websites.
from flask import Flask, request, jsonify

# Generates unique IDs for each game session
import uuid

# Imports to connect and read questions.seed.json
import json
import os

# Creates the Flask application
app = Flask(__name__)

# Stores the current game data
current_game = None


# ==============================================================
# Fetch questions from databse
# ==============================================================

def load_questions():
    # Reads and loads questions from questions.seed.json
    current_folder = os.path.dirname(__file__)
    json_path = os.path.join(current_folder, '..', '..', 'db', 'questions.seed.json')

    with open(json_path, 'r') as file:
        return json.load(file)

# Load questions at start of server.
question_bank = load_questions()


# ==============================================================
# Manage answer validation
# ==============================================================
# NEEDS FRONTEND TO SEND QUESTION ID AND ANSWER CHOICE 

@app.route('/submit-answer', methods=['POST'])
def submit_answer():
    # Checks if selected answer from frontend is correct
    data = request.get_json()
    user_answer = data.get("answer_index") # 0, 1, 2, or 3
    question_id = data.get("question_id") # "E001" and so on

    #Find question from question bank
    question = None
    for i in question_bank:
        if i["id"] == question_id:
            question = i
            break

    # Question found or not check
    if question is None:
        return jsonify({
            "success": False, 
            "message": "Question not found"
        })

    # Get correect answer
    correct_answer = question["answerIndex"]

    # Check if correct
    is_correct = (user_answer == correct_answer)

    # Return results for a proper translation for the site to read them. (Python uses "True" while website uses "true")
    return jsonify({
        "success": True,
        "is_correct": is_correct,
        "correct_index": correct_answer,
        "correct_text": question["choices"][correct_answer],
        "message": "Correct" if is_correct else f"Incorrect. Answer was: {question['choices'][correct_answer]}"
    })

def start_game(config):
    """Creates a new game session and returns its unique ID"""
    
    # Access the global variable
    global current_game
    
    # Generate a random unique ID for this game session
    session_id = str(uuid.uuid4())
    
    # Store the game data
    current_game = {
        "session_id": session_id,   # Unique game ID
        "config": config,           # Game settings from the website
        "status": "active",         # Game is now running
        "players": [],              # List of players in the game
        "current_question": 0       # Tracks which question is currently active
    }

    return session_id


# When someone visits /start and sends data, run "handle_start_game()" which is below.
@app.route('/start', methods=['POST'])
def handle_start_game():
    """Receives Start Game button click from website"""
    
    # Get the game settings sent from the website
    data = request.get_json()
    
    # Create a new game and get its unique ID
    session_id = start_game(data)
    
    # Send a response back to the website
    return jsonify({
        "success": True,            # Tell website it worked
        "session_id": session_id    # Send back the game ID
    })


# If this file is run directly, start the server
if __name__ == '__main__':
    # Start Flask server on port 5000 with debug mode on

    app.run(debug=True, port=5000)
