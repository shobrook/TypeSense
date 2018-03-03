# Globals #


# from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, abort
from flask.ext.bcrypt import Bcrypt
from flask_pymongo import PyMongo
from textblob import TextBlob
from pprint import pprint
import hashlib

DEBUG = True

app = Flask(__name__)
bcrypt = Bcrypt(app)

app.config['MONGO_DBNAME'] = 'typesensedb'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/typesensedb'

mongo = PyMongo(app)

"""
DATA MODEL
Collections: users, connections, conversations
Users: {"_id": ObjectId(), "fb_id": int(), "email": str(), "password_hash": str(), "connections": [ObjectId(), ...]}
Connections: {"_id": ObjectId(), "fb_id": str(), "conversations": [{"user_id": ObjectId(), "conversation_id": ObjectId()}, ...]}
Conversations: {"_id": ObjectId(), "messages": [{"hash": str(), "sentiment": int(), "author": bool()}, ...]}
"""


# Helpers #


def analyze_sentiment(messages, conversation):
	"""Takes an ordered list of dictionaries in format: [ { "author" : "", "message" : "" }, ...]
	and returns dictionary in format: { "Hash": {"Sentiment" : 0, "Author" : "..."}, ...}. Sentiment between -1 and 1.
	:param messages:
	:param conversation: """

	# https://pypi.python.org/pypi/textblob

	print("ANALYZE SENTIMENT")

	# To isolate sentiment impact of each msg, sentiment scores of (four msg) Cluster 1 - (three msg) Cluster 2
	#
	#   Cluster 1: ABCD
	#   Cluster 2: ABC
	#
	# Cluster 1 - Cluster 2 isolates the impact of D, in context

	trips_of_messages = [messages[i].get("message") + " " + messages[i + 1].get("message") + " " + messages[i + 2].get("message") for i in range(len(messages) - 2)]

	quads_of_messages = [(messages[i]["message"] + " " + messages[i + 1]["message"] + " " + messages[i + 2]["message"] + " " + messages[i + 3]["message"], messages[i + 3]["author"], messages[i + 3]["message"]) for i in range(len(messages) - 3)]

	message_sentiments = []

	for index in range(len(quads_of_messages)):
		four_msg_combo, author, last_message = quads_of_messages[index][0], quads_of_messages[index][1], quads_of_messages[index][2]
		three_msg_combo = trips_of_messages[index]
		print("Four COMBO:", four_msg_combo)
		print("AUTHOR:", author)
		print("LAST_MESSAGE:", last_message)

		# Hash last message w/ SHA1
		last_message_hash = hashlib.sha1(str.encode(last_message)).hexdigest()
		filtered_message = [msg for msg in conversation if msg["hash"] == last_message_hash]

		# Memoization.
		# If sent analysis needed
		if not filtered_message:
			# Get sentiment of each message combo.
			four_msg_sentiment = TextBlob(four_msg_combo).sentiment.polarity
			three_msg_sentiment = TextBlob(three_msg_combo).sentiment.polarity

			# message_sentiments = [(last_message_hash, sentiment, author), ... ]
			message_sentiments.append((last_message_hash, four_msg_sentiment - three_msg_sentiment, author))

		# Sentiment analysis not needed. Lookup in db
		else:
			message_sentiments.append((last_message_hash, filtered_message[0]["sentiment"], author))

	print("Change in sentiment due to last message")
	pprint(message_sentiments)

	# Output format: [{"hash": str(), "sentiment": int(), "author": bool()}, ...]
	return [{"hash": element[0], "sentiment": element[1], "author": element[2]} for element in message_sentiments]


# Routing #


@app.route("/")
def main():
	"""Default response; returns an error code."""
	return 404

@app.route("/TypeSense/api/get_salt", methods=["GET"])
def get_salt():
	"""Returns user's email address to be used as a salt for hashing in background.js"""
	if not request.json or not "email" in request.json:
		abort(400, "new_user(): request.json does not exist or does not contain 'email'")

	# Return salt in format: { "salt" : str(email) }
	for user in mongo.db.users.find():
		if user["email"] == request.json["email"]:
			return jsonify({"salt": user["email"]})


@app.route("/TypeSense/api/create_user", methods=["POST"])
def create_user():
	"""Creates a new user document; also checks if email already exists. Payload
    format: {'email': str(), 'password_hash': str(), 'fb_id': int()}."""
	if not request.json or not "email" and "password_hash" and "fb_id" and "connections" in request.json:
		abort(400, "new_user(): request.json does not exist or does not contain 'email'")

	# Make sure the email doesn't already correspond to an account.
	for user in mongo.db.users.find():
		if user["email"] == request.json["email"]:
			return jsonify({"registered": False})

	# https://flask-bcrypt.readthedocs.io/en/latest/
	# Hash already hashed and salted pw again, and store that hash in Mongo
	double_pw_hash = bcrypt.generate_password_hash(request.json["password_hash"]).decode(‘utf-8’)

	mongo.db.users.insert({
		"email"      : request.json["email"],
		"password_hash"   : double_pw_hash,
		"fb_id"      : request.json["fb_id"],
		"connections": []
	})

	return jsonify({"registered": True})


@app.route("/TypeSense/api/validate_user", methods=["POST"])
def validate_user():
	"""Checks if login credentials are valid. Payload format: {'email': str(),
    'password_hash': str()}."""
	if not request.json or not "email" and "password_hash" in request.json:
		abort(400, "check_user(): request.json does not exist or does not contain 'email' or 'password_hash'")

	# Password Authentication W/ bcrypt
	# https://flask-bcrypt.readthedocs.io/en/latest/

	for user in mongo.db.users.find():
		if user["email"] == request.json["email"]:

			# Hash singly hashed password from request.json and compare it to the value in mongoDB
			mongo_doubly_hashed_pw = mongo.db.users.find_one( {"email" : request.json["email"]} )["password_hash"]
			valid_pw = bcrypt.check_password_hash(mongo_doubly_hashed_pw, request.json["password_hash"])
			# Valid_pw is a boolean
			return jsonify({"logged_in": valid_pw})

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
				# Connection has a conversation open with user
				connection = mongo.db.connections.find_one({"_id": ObjectId(str(user_cxn))})
				if connection["fb_id"] == request.json["fb_id"]:
					conversation = (mongo.db.conversations.find_one({"_id": connection["conversations"][str(user["_id"])]}))["messages"]
					analyzed_messages = analyze_sentiment(request.json["messages"], conversation)

					# Overwrite previous conversation with updated conversation
					mongo.db.conversations.insert(
						{"_id": connection["conversations"][str(user["_id"])]},
						{"messages": analyzed_messages}
					)

					return jsonify({"messages": analyzed_messages})

			# User's first conversation with connection

			# Pass in empty list because we're not always going to memoize
			messages = analyze_sentiment(request.json["messages"], [])
			conversation = mongo.db.conversations.insert({"messages": messages})
			mongo.db.connections.update(
				{"fb_id": cxn["fb_id"]},
				{"$push": {"conversations": {"user_id": ObjectId(str(user["_id"])), "conversation_id": ObjectId(str(conversation))}}}
			)
			connection = mongo.db.connections.find_one({"fb_id": cxn["fb_id"]})

			# Updates user object
			mongo.db.users.update(
				{"fb_id": user["fb_id"]},
				{"$push": {"connections": ObjectId(str(connection["_id"]))}}
			)

			return jsonify({"messages": messages})

	# Connection doesn't exist

	# Pass in empty list because we're not always going to memoize
	messages = analyze_sentiment(request.json["messages"], [])
	conversation = mongo.db.conversations.insert({"messages": messages})
	connection = mongo.db.connections.insert({
		"fb_id": request.json["fb_id"],
		"conversations": [{"user_id": ObjectId(str(user["_id"])), "conversation_id": ObjectId(str(conversation))}]
	})

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
