# Globals #


from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo
from textblob import TextBlob
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
Users: {"_id": ObjectId("..."), "fb_id": "...", "email": "...", "password": "...", "connections": [ObjectId("..."), ...]}
Connections: {"_id": ObjectId("..."), "fb_id": "...", "conversations": {ObjectId("..."): ObjectId("..."), ...}}
Conversations: {"_id": ObjectId("..."), "messages": [{"Hash": {"Sentiment": 0, "Author": "..."}}, ...]}
"""


# Helpers #

def analyze_sentiment(messages):
	"""Takes an ordered list of dictionaries in format: [ { "author" : "", "message" : "" }, ...]
	and returns dictionary in format: { "Hash": {"Sentiment" : 0, "Author" : "..."}, ...}. Sentiment between -1 and 1."""

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

	# merged_messages = ("mess1 + mess2 + mess3", author)

	print(merged_messages)
	message_sentiments = []

	for message in merged_messages:
		message_combo, author, last_message = message[0], message[1], message[2]
		print(message_combo)

		# Encode string as bytes before hashing w/ SHA1
		last_message_hash = hashlib.sha1(str.encode(last_message)).hexdigest()

		# Get sentiment of each message combo.
		sentiment = TextBlob(last_message).sentiment.polarity
		message_sentiments.append((last_message_hash, sentiment, author))

	# Isolate sentiment impact of each message
	# TODO: proof this line
	sentiment_change = [message_sentiments[i][1] - message_sentiments[i - 1][1] for i in range(len(message_sentiments))]

	print("Change in sentiment due to last message", sentiment_change)

	list1 = [x[0] for x in message_sentiments]      # last_message hash
	list2 = [x for x in sentiment_change]           # sentiment change caused by last message
	list3 = [x[2] for x in message_sentiments]      # author

	# sentiment_impact in format: [(last_message_hash, change in sentiment of last message, author), ...]
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
    format: {'email': '...', 'password': '...', 'fb_id': '...'}."""
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
	"""Checks if login credentials are valid. Payload format: {'email': '...',
    'password': '...'}."""
	if not request.json or not "email" in request.json:
		abort(400, "check_user(): request.json does not exist or does not contain 'email'")

	for user in mongo.db.users.find():
		if user["email"] == request.json["email"] and u["password"] == request.json["password"]:
			return jsonify({"logged_in": True})

	return jsonify({"logged_in": False})


@app.route("/TypeSense/api/change_conversation", methods=["POST"])
def change_conversation():
	"""Handles a conversation change. Returns sentiment scores for the new conversation's
	most recent messages. Payload format: {'email': '...', 'fb_id': '...',
	'messages': [{'author': True, 'message': '...'}, ...]}."""
	if not request.json or not "fb_id" in request.json:
		abort(400, "new_connection(): request.json does not exist or does not contain 'fb_id'")

	user = mongo.db.users.find_one({"email": request.json["email"]})
	messages = analyze_sentiment(request.json["messages"])

	print(messages)

	for cxn in mongo.db.connections.find():
		# Connection exists
		if cxn["fb_id"] == request.json["fb_id"]:
			for user_cxn in user["connections"]:
				# Connection already has a conversation open with user
				connection = mongo.db.connections.find_one({"_id": ObjectId(str(user_cxn))})
				if connection["fb_id"] == request.json["fb_id"]:
					conversation = \
						mongo.db.conversations.find_one({"_id": connection["Conversations"][str(user["_id"])]})[
							"Messages"]

					db_hashes = [message_hash for message_hash in list(conversation.keys())]

					payload_hashes = [{hashlib.sha1(str.encode(message["message"])).hexdigest(): message["message"]} for
					                  message in request.json["messages"]]

					filtered_messages = [payload_hashes[message] for message in payload_hashes.keys() if
					                     message not in all_hashes]

					analysis_input = [message for message in request.json["messages"] if
					                  message["message"] in filtered_messages]
					analyzed_messages = analyze_sentiment(analysis_input)

					final_messages = (conversation + analyzed_messages)
					final_messages = final_messages[len(final_messages) - 20:]

					mongo.db.conversations.insert(
						{"_id": connection["Conversations"][str(user["_id"])]},
						{"messages": final_messages}
					)

					return jsonify({"messages": final_messages})
			conversation = mongo.db.conversations.insert({"messages": messages})
			connect_update = mongo.db.connections.update(
				{"fb_id": cxn["fb_id"]},
				{"$set": {"conversations." + str(user["_id"]): ObjectId(str(conversation))}}
			)
			connection = mongo.db.connections.find_one({"fb_id": cxn["fb_id"]})
			print(connection["_id"])
			user_update = mongo.db.users.update({
				{"fb_id": user["fb_id"]},
				{"$push": {"connections": connection["_id"]}}
			})

			return jsonify({"messages": messages})

		# Connection doesn't exist
	conversation = mongo.db.conversations.insert({"messages": messages})
	print(user)
	print(conversation)
	connection = mongo.db.connections.insert({
		"fb_id"        : request.json["fb_id"],
		"conversations": {str(user["_id"]): ObjectId(str(conversation))}
	})
	print(connection)
	mongo.db.users.update({
		{"fb_id": user["fb_id"]},
		{"$push": {"connections": ObjectId(str(connection))}}
	})

	return jsonify({"messages": messages})


@app.route("/TypeSense/api/new_message", methods=["POST"])
def new_message():
	return


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
