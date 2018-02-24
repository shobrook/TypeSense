# Globals #

from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo
import http.client
import urllib.request, urllib.parse, urllib.error
import collections
# import base64
import hashlib

# import utilities
# from pprint import pprint

DEBUG = True

app = Flask(__name__)

app.config['MONGO_DBNAME'] = 'typesensedb'
app.config['MONGO_URI'] = 'mongodb://localhost:27017/typesensedb'

mongo = PyMongo(app)

"""
DATA MODEL
Collections: users, connections, conversations
Users: {"_id": ObjectId("..."), "facebook_id": "...", "email": "...", "password": "...", "connections": [ObjectId(...), ...]}
Connections: {"_id": ObjectId("..."), "facebook_id": "...", "has_account": False, "conversations": {ObjectId("..."): ObjectId("..."), ...}}
Conversations: {"_id": ObjectId("..."), "messages": {"Hash": 0, ...}}
"""


# Routing #


@app.route("/")
def main():
	"""Default response; returns an error code."""
	return 404


@app.route("/typesense/api/new_user", methods=["POST"])
def new_user():
	"""Initializes and populates a new user's documents; also checks for valid
	   email. Request format: {'email': '...', 'password': '...', 'facebook_id':
	   '...', 'connections': []}."""
	if not request.json or not "email" in request.json:
		abort(400, "new_user(): request.json does not exist or does not contain 'email'")

	for u in mongo.db.users.find():
		if u["email"] == request.json["email"]:
			return jsonify({"registered": False})

	user_id = mongo.db.users.insert({
		"email"      : request.json["email"],
		"password"   : request.json["password"],
		"facebook_id": request.json["facebook_id"],
		"connections": []
	})

	return jsonify({"registered": True})


@app.route("/TypeSense/api/check_user", methods=["POST"])
def check_user():
	"""Checks for valid login credentials. Request format: {'email': '...',
	   'password': '...'}."""
	if not request.json or not "email" in request.json:
		abort(400, "check_user(): request.json does not exist or does not contain 'email'")

	valid = False
	for u in mongo.db.users.find():
		if u["email"] == request.json["email"] and u["password"] == request.json["password"]:
			valid = True
			break

	return jsonify({"logged_in": valid})


def prepare_message_json(message):
	message_json = {"documents":
		[
			{
				"language": "en",
				"id"      : "1",
				"text"    : "{}".format(message)
			}
		]
	}

	print(message_json)
	return message_json


def analyze_sentiment(chron_message_list):
	"""Takes a chronologically ordered list of messages in format: (author, message, timestamp)
	and returns an ordered dictionary of message hashes and their corresponding sentiment values, scaled between -1 and 1."""

	# Surprise! Actually returns a chronologically ordered list of tuples
	#   Format: (author, message_hash, normalized_sentiment, timestamp)

	# Azure sentiment analysis
	# TODO: Remove API_keys/figure out how to store those
	#
	# key1: 0d67adf8bc524458ab03de128db96426

	# https://github.com/MicrosoftDocs/azure-docs/blob/master/articles/cognitive-services/text-analytics/how-tos/text-analytics-how-to-sentiment-analysis.md

	message_sentiment_list = []

	for message in chron_message_list:
		author, text, timestamp = message[0], message[1], message[2]

		# Encode string as bytes before hashing w/ SHA1
		message_hash = hashlib.sha1(str.encode(text)).hexdigest()

		# Get normalized sentiment (between -1.0 and 1.0) score for each message.
		print(json.dumps(sentiment_api_request(text)))
		# TODO: Test this
		try:
			sentiment_score = json.loads(sentiment_api_request(text))["documents"][0]["score"]
			normalized_sentiment = (sentiment_score - 0.5) * 2
			message_sentiment_list.extend((author, message_hash, normalized_sentiment, timestamp))
		except Exception as e:
			print("Sentiment Analysis Error")
			print("[Errno {0}] {1}".format(e.errno, e.strerror))

	return message_sentiment_list


def sentiment_api_request(message):
	"""Make request to Azure Sentiment API with conversation text."""

	# API endpoint -> https://westcentralus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment

	# https://westus.dev.cognitive.microsoft.com/docs/services/TextAnalytics.V2.0/operations/56f30ceeeda5650db055a3c9
	# https://docs.microsoft.com/en-us/azure/cognitive-services/text-analytics/how-tos/text-analytics-how-to-sentiment-analysis
	# https://github.com/MicrosoftDocs/azure-docs/blob/master/articles/cognitive-services/text-analytics/how-tos/text-analytics-how-to-sentiment-analysis.md

	subscription_key = "fc250c2ad92544d983593f1595fb473a"

	# Request headers
	headers = {
		'Content-Type': 'application/json',
		'Ocp-Apim-Subscription-Key': '{}'.format(subscription_key),
	}

	params = urllib.parse.urlencode({})

	try:
		conn = http.client.HTTPSConnection('westus.api.cognitive.microsoft.com')
		request_json = prepare_message_json(message)
		# TODO: Solve `can't concat str to bytes` JSON issue -> https://stackoverflow.com/a/45037777/8740440
		conn.request("POST", "/text/analytics/v2.0/sentiment?%s" % params, request_json, headers)
		response = conn.getresponse()
		# https://docs.microsoft.com/en-us/azure/cognitive-services/text-analytics/how-tos/text-analytics-how-to-sentiment-analysis
		sentiment_score = json.dumps(response.read())
		print(message, "\t->\t", sentiment_score)
		conn.close()
		return sentiment_score
	except Exception as e:
		print("[Errno {0}] {1}".format(e.errno, e.strerror))


@app.route("/TypeSense/api/new_connection", methods=["POST"])
def new_connection():
	"""Connects the existing user to a new connection. Request format: {'email': '...',
	   'facebook_id': '...', 'conversations': ['...', ...]}."""
	if not request.json or not "facebook_id" in request.json:
		abort(400, "new_connection(): request.json does not exist or does not contain 'facebook_id'")

	messages = {"Hash": 0}  # TODO: Analyze the sentiment of each message, then hash the message and create a dictionary
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
			mongo.db.connections.update(
				{"facebook_id": c["facebook_id"]},
				{set: {"conversations" + str(user_id): conversation_id}}
			)

	if not connection_exists:
		connection_id = mongo.db.connections.insert({
			"facebook_id"  : request.json["facebook_id"],
			"has_acccount" : has_account,
			"conversations": {str(user_id): conversation_id}
		})


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
