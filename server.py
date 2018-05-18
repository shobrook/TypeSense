## Globals ##


from bson.objectid import ObjectId
from flask import Flask, jsonify, request, abort
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from pprint import pprint

APP = Flask(__name__)

DEBUG = True
ANALYZER = SentimentIntensityAnalyzer()
TONE_SIGNS = {
    "sadness": -1,
    "anger": -1,
    "fear": -1,
    "tentative": -1,
    "joy": 1,
    "analytical": 1,
    "confident": 1
}


## Helpers ##


def growingWindow(messages):
    windows = [[message["message"] for message in messages[:idx + 1]] for idx in range(len(messages))]

    print(windows)
    sentiment_table =  [{
        "id": idx,
        "message": messages[idx]["message"],
        "received": messages[idx]["received"],
        "sentiment": round(100 * ANALYZER.polarity_scores(' '.join(windows[idx]))["compound"])
    } for idx in range(len(messages))]
    print(sentiment_table)
    return sentiment_table


## Routes ##


@APP.route("/TypeSense/api/analyze_sentiment", methods=["POST"])
def analyze_sentiment():
    if not request.json or not "messages" in request.json:
        abort(400, "new_connection(): request.json does not exist or does not contain 'messages'")

    return jsonify({"sentiment_table": growingWindow(request.json["messages"])})


## Main ##


if __name__ == "__main__":
	APP.run(debug=DEBUG)
