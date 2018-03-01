# Globals #


from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo
from textblob import TextBlob
from pprint import pprint
import collections
# import base64
import hashlib

DEBUG = True

app = Flask(__name__)

app.config['MONGO_DBNAME'] = 'typesensedb'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/typesensedb'

mongo = PyMongo(app)

"""
DATA MODEL
Collections: users, connections, conversations
Users: {"_id": ObjectId(), "fb_id": int(), "email": str(), "password": str(), "connections": [ObjectId(), ...]}
Connections: {"_id": ObjectId(), "fb_id": str(), "conversations": [{"user_id": ObjectId(), "conversation_id": ObjectId()}, ...]}
Conversations: {"_id": ObjectId(), "messages": [{"hash": str(), "sentiment": int(), "author": bool()}, ...]}
"""


# Helpers #


def analyze_sentiment(messages):
	"""Takes an ordered list of dictionaries in format: [ { "author" : "", "message" : "" }, ...]
	and returns dictionary in format: { "Hash": {"Sentiment" : 0, "Author" : "..."}, ...}. Sentiment between -1 and 1."""

	# TODO: Change output format to: [{"hash": str(), "sentiment": int(), "author": bool()}, ...]

	# https://pypi.python.org/pypi/textblob

	print("ANALYZE SENTIMENT")

	# Add dummy values to be able to calculate the impact on sentiment of all messages
	messages.insert(0, {"author": "dummy_author0", "message": "a "})
	messages.insert(0, {"author": "dummy_author1", "message": "b "})
	messages.insert(0, {"author": "dummy_author2", "message": "c "})

	# TODO: Write new sentiment isolation formula/figure out a way to get the sentiment change of the last message
	# TODO:     sent. I don't think this formula can be leveraged to do that as is.

	merged_messages = [(messages[i].get("message") + " " + messages[i + 1].get("message") + " " + messages[i + 2].get(
		"message"), messages[i + 2].get("author"), messages[i + 2].get("message")) for i in range(len(messages) - 2)]

	# merged_messages = ("mess1 + mess2 + mess3", author, last_message)

	message_sentiments = []

	for message in merged_messages:
		message_combo, author, last_message = message[0], message[1], message[2]
		print("COMBO:", message_combo)
		print("AUTHOR:", author)
		print("LAST_MESSAGE:", last_message)

		# Encode string and hash w/ SHA1
		last_message_hash = hashlib.sha1(str.encode(last_message)).hexdigest()

		# Get sentiment of each message combo.
		sentiment = TextBlob(message_combo).sentiment.polarity

		# message_sentiments = [(last_message_hash, sentiment, author), ... ]
		message_sentiments.append((last_message_hash, sentiment, author))

	# TODO: Isolate sentiment impact of each message

	# Code currently says:
	# Impact of last message is the difference between this message combo sentiment and the last message combo sentiment
	#
	# But say we've got these two clusters of messages.
	#
	#   Cluster 1: ABC
	#   Cluster 2: BCD
	#
	# The contextual sentiment score of Cluster 2 - score of Cluster 1 does not isolate the impact of D
	# on the conversation. It includes A's impact, too.
	#
	# TODO: Maybe store first_message as a property and look up in a dictionary with message hashes and sentiment impacts.

	sentiment_change = [message_sentiments[i][1] - message_sentiments[i - 1][1] for i in range(len(message_sentiments))]

	print("Change in sentiment due to last message")
	pprint(sentiment_change)

	list1 = [x[0] for x in message_sentiments]      # last_message hash
	list2 = [x for x in sentiment_change]           # sentiment change caused by last message
	list3 = [x[2] for x in message_sentiments]      # author

	# sentiment_impact: [(last_message_hash, change in sentiment of last message, author), ...]
	sentiment_impact = zip(list1, list2, list3)

	# return list of nested dicts: [{"Hash": {"Sentiment" : 0, "Author" : "a"}}, ... ]
	return [{element[0]: {"Sentiment": element[1], "Author": element[2]}} for element in sentiment_impact]


# Routing #


@app.route("/")
def main():
	"""Default response; returns an error code."""
	return 404


@app.route("/TypeSense/api/create_user", methods=["POST"])
def create_user():
	"""Creates a new user document; also checks if email already exists. Payload
    format: {'email': str(), 'password': str(), 'fb_id': int()}."""
	if not request.json or not "email" in request.json:
		abort(400, "new_user(): request.json does not exist or does not contain 'email'")

	for user in mongo.db.users.find():
		if user["email"] == request.json["email"]:
			return jsonify({"registered": False})

	user_id = mongo.db.users.insert({
		"email"      : request.json["email"],
		"password"   : request.json["password"],  # NOTE: Password is stored insecurely
		"fb_id"      : request.json["fb_id"],
		"connections": []
	})

	return jsonify({"registered": True})


@app.route("/TypeSense/api/validate_user", methods=["POST"])
def validate_user():
	"""Checks if login credentials are valid. Payload format: {'email': str(),
    'password': str()}."""
	if not request.json or not "email" in request.json:
		abort(400, "check_user(): request.json does not exist or does not contain 'email'")

	for user in mongo.db.users.find():
		if user["email"] == request.json["email"] and u["password"] == request.json["password"]:
			return jsonify({"logged_in": True})

	return jsonify({"logged_in": False})


@app.route("/TypeSense/api/update_conversation", methods=["POST"])
def update_conversation():
	"""Handles new conversations and conversation updates (new messages). Returns sentiment scores
	for the new conversation's most recent messages. Payload format: {'email': str(), 'fb_id': int(),
	'messages': [{'author': bool(), 'message': str()}, ...]}."""
	if not request.json or not "fb_id" in request.json:
		abort(400, "new_connection(): request.json does not exist or does not contain 'fb_id'")

	user = mongo.db.users.find_one({"email": request.json["email"]})

	for cxn in mongo.db.connections.find():
		# Connection already exists
		if cxn["fb_id"] == request.json["fb_id"]:
			for user_cxn in user["connections"]:
				# Connection has a conversation open with user (memoization)
				connection = mongo.db.connections.find_one({"_id": ObjectId(str(user_cxn))})
				if connection["fb_id"] == request.json["fb_id"]:
					conversation = (mongo.db.conversations.find_one({"_id": connection["conversations"][str(user["_id"])]}))["messages"]

					db_hashes = [msg["hash"] for msg in conversation]
					payload_hashes  = [{hashlib.sha1(str.encode(msg["message"])).hexdigest(): msg["message"]} for msg in request.json["messages"]]

					target_messages = [payload_hashes[msg] for msg in payload_hashes.keys() if msg not in db_hashes]
					analysis_input = [msg for msg in request.json["messages"] if msg["message"] in target_messages]
					analyzed_messages = analyze_sentiment(analysis_input)

					updated_messages = (conversation + analyzed_messages)
					updated_messages = updated_messages[len(updated_messages) - 20:]

					mongo.db.conversations.insert(
						{"_id": connection["conversations"][str(user["_id"])]},
						{"messages": updated_messages}
					)

					# NOTE: analysis_input does not include past messages for context

					return jsonify({"messages": updated_messages})
			# User's first conversation with connection
			messages = analyze_sentiment(request.json["messages"])
			conversation = mongo.db.conversations.insert({"messages": messages})
			mongo.db.connections.update(
				{"fb_id": cxn["fb_id"]},
				{"$push": {"conversations": {"user_id": ObjectId(str(user["_id"])), "conversation_id": ObjectId(str(conversation))}}}
			)
			connection = mongo.db.connections.find_one({"fb_id": cxn["fb_id"]})
			user_update = mongo.db.users.update(
				{"fb_id": user["fb_id"]},
				{"$push": {"connections": ObjectId(str(connection["_id"]))}}
			)

			return jsonify({"messages": messages})

	# Connection doesn't exist
	messages = analyze_sentiment(request.json["messages"])
	conversation = mongo.db.conversations.insert({"messages": messages})
	connection = mongo.db.connections.insert({
		"fb_id": request.json["fb_id"],
		"conversations": [{"user_id": ObjectId(str(user["_id"])), "conversation_id": ObjectId(str(conversation))}]
	})
	print(connection)
	mongo.db.users.update(
		{"fb_id": user["fb_id"]},
		{"$push": {"connections": ObjectId(str(connection))}}
	)

	return jsonify({"messages": messages})


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
