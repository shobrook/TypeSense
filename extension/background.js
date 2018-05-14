/* Globals */


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
	// TODO: Require VADER-js
	// TODO: Output ordered list of dictionaries, formatted as [{"message": "...", "author": "...", "sentiment": 0}, ...]
}


/* Event Listeners */


// Listens for messenger.com to be loaded and sends "inject-listeners" to listeners.js
chrome.webNavigation.onCompleted.addListener((details) => {
	if (details.url.includes("messenger.com")) {
		MESSAGE({"message": "injectListeners"}); // Tells listeners.js to inject event listeners
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

// Listens for long-lived port connections (from content scripts)
chrome.runtime.onConnect.addListener((port) => {
	port.onMessage.addListener((msg) => {
		if (port.name == "listener") { // Handles requests from listeners.js
		 	let updateConversation = (messages) => {
				storage.set({"sentimentTable": messages}, () => {
					console.log("Populated local data storage.");
				});
				MESSAGE({"message": "conversationUpdate", "messages": JSON.parse(messages)}); // Tells popup.js to update the graph
			}
			storage.get("credentials", (creds) => {
				POST(UPDATE_CONVERSATION, {"email": creds["credentials"]["email"], "fb_id": "test"/*msg.fb_id*/, "messages": msg.messages}, updateConversation);
			});
		}
	});
});
