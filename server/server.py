# Globals #

# import base64
import hashlib

import requests

from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo

import collections
import hashlib


DEBUG = True

app = Flask(__name__)

app.config['MONGO_DBNAME'] = 'typesensedb'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/typesensedb'

mongo = PyMongo(app)

"""
DATA MODEL
Collections: users, connections, conversations
Users: {"_id": ObjectId("..."), "fb_username": "...", "email": "...", "password": "...", "connections": [ObjectId("..."), ...]}
Connections: {"_id": ObjectId("..."), "fb_username": "...", "has_account": False, "conversations": {ObjectId("..."): ObjectId("..."), ...}}
Conversations: {"_id": ObjectId("..."), "messages": {"Hash": 0, ...}}
"""


# Helpers #

def analyze_sentiment(messages_list):
	"""Takes an ordered list of dictionaries in format: { "author" : "", "message" : "" }
	and returns dictionary in format: { "Hash": {"Sentiment" : 0, "Author" : "..."}, ...}
    Normalized sentiment values scaled between -1 and 1. Uses Azure sentiment analysis API."""

	# https://github.com/MicrosoftDocs/azure-docs/blob/master/articles/cognitive-services/text-analytics/how-tos/text-analytics-how-to-sentiment-analysis.md

    # Add dummy values to be able to calculate the impact on sentiment of all messages
    messages_list.insert(0, { "author" : "dummy_author0", "message" : " " } )
    messages_list.insert(0, { "author" : "dummy_author1", "message" : " " } )
    messages_list.insert(0, { "author" : "dummy_author2", "message" : " " } )

    merged_messages = [(messages_list[i].get("message") + " " + messages_list[i+1].get("message") + " " + messages_list[i+2].get("message"), messages_list[i+2].get("author"), messages_list[i+2].get("message")) for i in range(len(messages_list))]

    message_sentiments = []

    for message in merged_messages:
        message_combo, author, last_message = message[0], message[1], message[2]
        # Encode string as bytes before hashing w/ SHA1
        last_message_hash = hashlib.sha1(str.encode(last_message)).hexdigest()

        # Get normalized sentiment (between -1.0 and 1.0) score for each message combo.
        normalized_sentiment_impact = sentiment_api_request(message_combo)
        message_sentiments.extend((last_message_hash, normalized_sentiment_impact, author))

    # Isolate sentiment impact of each message
    sentiment_change = [message_sentiments[i][1] - message_sentiments[i-1][1] for i in range(len(message_sentiments))[1:]]
    messages_sentiment_impact = zip(message_sentiments[0], sentiment_change, message_sentiments[2])

    # message_sentiment_impact in format: [(last_message_hash, change in sentiment of last message, author), ...]
    # return list in format: [{"Hash": {"Sentiment" : 0, "Author" : "..."}}, ...]

	return [ { item[0]:{"Sentiment": item[1], "Author": item[2] } } for item in message_sentiment_impact]


def sentiment_api_request(message):
	"""Make request to Azure Sentiment API with text. Returns normalized sentiment score (between -1 and 1)"""

	# https://westus.dev.cognitive.microsoft.com/docs/services/TextAnalytics.V2.0/operations/56f30ceeeda5650db055a3c9
	# https://docs.microsoft.com/en-us/azure/cognitive-services/text-analytics/how-tos/text-analytics-how-to-sentiment-analysis
	# https://github.com/MicrosoftDocs/azure-docs/blob/master/articles/cognitive-services/text-analytics/how-tos/text-analytics-how-to-sentiment-analysis.md

    subscription_key = "0d67adf8bc524458ab03de128db96426"
    api_endpoint = 'https://westcentralus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment'

    # Request headers
    headers = {
    	'Content-Type': 'application/json',
    	'Ocp-Apim-Subscription-Key': subscription_key
    }

    values = {"documents":
    	[
    		{
    			"language": "en",
    			"id"      : "1",
    			"text"    : message
    		}
    	]
    }

    response = requests.post(api_endpoint, data=json.dumps(values), headers=headers).text
    sentiment_score = json.loads(response)["documents"][0]["score"]
    # Normalization
    return (sentiment_score - 0.5) * 2


# Routing #


@app.route("/")
def main():
    """Default response; returns an error code."""
    return 404


@app.route("/typesense/api/new_user", methods=["POST"])
def create_user():
	"""Creates a new user document; also checks if email already exists. Payload
	   format: {'email': '...', 'password': '...', 'fb_username': '...'}."""
    if not request.json or not "email" in request.json:
        abort(400, "new_user(): request.json does not exist or does not contain 'email'")

    for user in mongo.db.users.find():
        if user["email"] == request.json["email"]:
            return jsonify({"registered": False})

    user_id = mongo.db.users.insert({
        "email": request.json["email"],
        "password": request.json["password"], # NOTE: Password is stored insecurely
        "fb_username": request.json["fb_username"],
        "connections": []
    })

    return jsonify({"registered": True})


@app.route("/TypeSense/api/check_user", methods=["POST"])
def validate_user():
	"""Checks if login credentials are valid. Payload format: {'email': '...',
	   'password': '...'}."""
    if not request.json or not "email" in request.json:
        abort(400, "check_user(): request.json does not exist or does not contain 'email'")

    for user in mongo.db.users.find():
        if user["email"] == request.json["email"] and u["password"] == request.json["password"]:
            return jsonify({"logged_in": True})

    return jsonify({"logged_in": False})



@app.route("/TypeSense/api/new_connection", methods=["POST"])
def switch_conversation():
	"""Handles a conversation change. Returns sentiment scores for the new conversation's
	   most recent messages. Payload format: {'email': '...', 'fb_username': '...',
	   'messages': [('author', 'message', 'timestamp'), ...]}."""
    if not request.json or not "facebook_id" in request.json:
        abort(400, "new_connection(): request.json does not exist or does not contain 'facebook_id'")

	# Pull current user ID
	# Check if connection already exists
		# If yes, then check if conversation already exists
			# If yes, then hash messages, filter messages that are already analyzed, analyze the remaining messages, and then push analyzed messages to the conversation dict (or list, idk)
			# If no, analyze all messages, create converstaion entry, and then append to connection's conversations
		# If no, insert new connection and link up with the user's connections array

	user = mongo.db.users.find_one({"email": request.json["email"]})

	conversation_exists = False
	for connection in user["connections"]:
		if request.json["fb_username"] == (mongo.db.connections.find_one({"_id": connection}))["fb_username"]:
			conversation_exists = True
			# Hash messages, filter messages that have already been analyzed, analyze the remaining messages, and then push
			# analyzed messages to the conversation dict (or list, idk)

	if not conversation_exists:

    	# Iterate through user's connections, check if any match w/ current connections
    		# If so, then conversation already exists and do shit
    		# If no, then iterate through all connections and see if any match w/ this guy
    			# If yes, then

    # messages = analyze_sentiment(request.json["conversations"])
    has_account = False

    for u in mongo.db.users.find():
        if u["facebook_id"] == request.json["facebook_id"]:
            has_account = True

    user_id = mongo.db.users.find({"email": request.json["email"]})
    conversation_id = mongo.db.conversations.insert({"messages": messages})

    connection_exists = False
    for c in mongo.db.connections.find():
        if c["facebook_id"] == request.json["facebook_id"]:
            connection_exists = True
            connection_id = mongo.db.connections.update(
                {"facebook_id": c["facebook_id"]},
                {"$set": {"conversations" + ObjectId(str(user_id)): ObjectId(str(conversation_id))}}
            )

    if not connection_exists:
        connection_id = mongo.db.connections.insert({
            "facebook_id": request.json["facebook_id"],
            "has_acccount": has_account,
            "conversations": {str(user_id): conversation_id}
        })

    mongo.db.users.find(
        {"email": request.json["email"]},
        {"$push": {"connections": connection_id}}
    )

    return messages


@app.route("/TypeSense/api/new_message", methods=["POST"])
def new_message():

    # Error Handling #


def error_print(status_code, error):
    if DEBUG:
        print("------------")
        print("ERROR (" + str(status_code) + "): " + error)
        print("------------")


@app.errorhandler(400)
def bad_request(error):
    error_print(400, error.description)
    return "Bad Request", 400


@app.errorhandler(401)
def bad_request(error):
    error_print(401, error.description)
    return "Unauthorized", 401


@app.errorhandler(500)
def internal_error(error):
    error_print(500, error.description)
    return "Internal Error", 500


if __name__ == "__main__":
    app.run(debug=True)
