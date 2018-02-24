# Globals #


from bson.errors import InvalidId
from bson.objectid import ObjectId
from flask import Flask, jsonify, request, json, abort
from flask_pymongo import PyMongo

import utilities

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
        "email": request.json["email"],
        "password": request.json["password"],
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

@app.route("/TypeSense/api/new_connection", methods=["POST"])
def new_connection():
	"""Connects the existing user to a new connection. Request format: {'email': '...',
	   'facebook_id': '...', 'conversations': ['...', ...]}."""
	if not request.json or not "facebook_id" in request.json:
		abort(400, "new_connection(): request.json does not exist or does not contain 'facebook_id'")

	messages = {"Hash": 0} # TODO: Analyze the sentiment of each message, then hash the message and create a dictionary
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
				{$set: {"conversations" + str(user_id): conversation_id}}
			)

	if !connection_exists:
		connection_id = mongo.db.connections.insert({
			"facebook_id": request.json["facebook_id"],
			"has_acccount": has_account,
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
