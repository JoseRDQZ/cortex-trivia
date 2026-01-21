# Using Flask since it helps connects Python to websites, and using jsonify since it translates Python data for websites.
from flask import Flask, request, jsonify

# Generates unique IDs for each game session
import uuid

# Creates the Flask application
app = Flask(__name__)

# Stores the current game data
current_game = None


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