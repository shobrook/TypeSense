/* Globals */


var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
var natural_language_understanding = new NaturalLanguageUnderstandingV1({
  'username': '0fb95a85-04ac-4f6f-b056-41d8ef359906',
  'password': 'WZERggRjjvkS',
  'version': '2018-03-16'
});

// For calling GET and SET to the extension's local storage
const storage = chrome.storage.local;

/*
// Creates an HTTP POST request
const post = (url, payload, callback) => {
	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = () => {
		if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) // readyState == 4
			callback(xhr.responseText);
	}
	xhr.send(JSON.stringify(payload));
}
*/

// Sends a message to content scripts running in the current tab
const message = (content) => {
	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		let activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, content);
	});
}

// Transforms a Messages object into a SentimentTable object
const analyzeSentiment = (messages) => {
	// TODO: Use VADER-js to analyze the compound valence of the conversation
	// TODO: Output ordered list of dictionaries, formatted as [{"message": "...", "received": "...", "sentiment": 0}, ...]

	// TODO: Process each message individually

	sentimentTable = []

	allMessages = ""

	// Iterate through messages and analyze sentiment for each message.
	messages.forEach(function(element) {
		// Create string of all messages.
		allMessages = allMessages.concat("\n" + element)

		var parameters = {
	  		'html': element,
	  		'features': {
	   			'emotion': {}
	  		}
		};

		natural_language_understanding.analyze(parameters, function(err, response) {
		  if (err)
		    console.log('error:', err);
		  else
		  	var emotions_dict = response["emotion"]["document"]["emotion"];
		  	// TODO: Get key with largest absolute value and append that to the sentimentTable arr.
		  	// sentimentTable.push()
		    // console.log(JSON.stringify(response, null, 2));
		});
	});

	// Process all messages in one string to get conversation emotion score
	var parameters = {
	  	'html': allMessages,
	  	'features': {
	   		'emotion': {}
	  	}
	};

	natural_language_understanding.analyze(parameters, function(err, response) {
	  if (err)
	    console.log('error:', err);
	  else
	  	// Get key with largest absolute value and save that as the text to be displayed on bottom of graph.
	    console.log(JSON.stringify(response, null, 2));
	});

	return [
		{"message": "", "received": true, "sentiment": .25, "id": 0},
		{"message": "", "received": true, "sentiment": .25, "id": 1},
		{"message": "", "received": true, "sentiment": .25, "id": 2},
		{"message": "", "received": false, "sentiment": -.50, "id": 3},
		{"message": "", "received": false, "sentiment": -.50, "id": 4},
		{"message": "", "received": false, "sentiment": -.50, "id": 5},
		{"message": "", "received": true, "sentiment": .25, "id": 6},
		{"message": "", "received": true, "sentiment": .25, "id": 7},
		{"message": "", "received": true, "sentiment": .25, "id": 8},
		{"message": "", "received": true, "sentiment": .25, "id": 9},
		{"message": "", "received": true, "sentiment": .25, "id": 10},
		{"message": "", "received": true, "sentiment": .25, "id": 11},
		{"message": "", "received": false, "sentiment": -.50, "id": 12},
		{"message": "", "received": false, "sentiment": -.50, "id": 13},
		{"message": "", "received": false, "sentiment": -.50, "id": 14},
		{"message": "", "received": true, "sentiment": .25, "id": 15},
		{"message": "", "received": true, "sentiment": .25, "id": 16},
		{"message": "", "received": true, "sentiment": .25, "id": 17},
		{"message": "", "received": false, "sentiment": -.50, "id": 18},
		{"message": "", "received": false, "sentiment": -.40, "id": 19}
	] // TEMP
}


/* Event Handlers */


// Listens for messenger.com to be loaded and tells listeners.js to inject the event handlers
chrome.webNavigation.onCompleted.addListener((details) => {
	// BUG: Message is sometimes sent before the DOM is fully loaded
	if (details.url.includes("messenger.com")) {
		message({"message": "injectListeners"});
	}
});

/*
// Listens for when the extension is first installed or updated
chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason == "install") {
		console.log("User has installed TypeSense for the first time on this device.");
	} else if (details.reason == "update") {
		let thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});
*/

// Opens long-lived port connections with content scripts
chrome.runtime.onConnect.addListener((port) => {
	port.onMessage.addListener((msg) => {
		if (port.name == "listener") { // Handles requests from listeners.js
			let sentimentTable = analyzeSentiment(msg.messages);

			storage.set({"currentThread": sentimentTable}, () => { // TODO: Memoize conversations
				console.log("Populated conversation's sentiment table.");
			});

			// Updates the browser action icon according to sentiment change
			if (sentimentTable[sentimentTable.length - 1]["sentiment"] >= sentimentTable[sentimentTable.length - 2]["sentiment"]) { // Sentiment increased
				chrome.browserAction.setIcon({path: "../assets/icon_green.png"});
			} else // Sentiment decreased
				chrome.browserAction.setIcon({path: "../assets/icon_red.png"});
			}
		}
	});
});
