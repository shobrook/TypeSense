/* Globals */


// For calling GET and SET to the extension's local storage
const storage = chrome.storage.local;

// Endpoint for analyzing message sentiment on the TypeSense REST API
const endpoint = "http://127.0.0.1:5000/TypeSense/api/analyze_sentiment"

// Creates an HTTP GET request
const get = (url, credentials, callback) => {
  let xhr = new XMLHttpRequest();
  xhr.onreadystatechange = () => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      callback(xhr.responseText);
    }
  }

  xhr.open("GET", url, true);
  xhr.setRequestHeader("Authorization", "Basic " + btoa(credentials["username"] + ':' + credentials["password"]));
  xhr.send(null);
}

// Creates an HTTP POST request
const post = (url, payload, callback) => {
	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = () => {
		if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) { // readyState == 4
			callback(xhr.responseText, payload["threadID"]);
    }
	}
	xhr.send(JSON.stringify(payload["messages"]));
}

// Sends a message to content scripts running in the current tab
const message = (content) => {
	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		let activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, content);
	});
}

storage.set({"100003186456548": []}, () => { return; }); // TEMP: For testing


/* Event Handlers */


// Listens for messenger.com to be loaded and tells listeners.js to inject the event handlers
chrome.webNavigation.onCompleted.addListener((details) => {
	if (details.url.includes("messenger.com")) {
		message({"message": "injectListeners"});
	}
});

// Listens for when the extension is first installed or updated
chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason == "install") {
		console.log("User has installed TypeSense for the first time on this device.");
	} else if (details.reason == "update") {
		let thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});

// Opens long-lived port connections with content scripts
chrome.runtime.onConnect.addListener((port) => {
	port.onMessage.addListener((msg) => {
    if (port.name == "listener") { // Handles requests from listeners.js
			storage.get(msg["threadID"], (conversation) => {
				// Memoization of analyzed messages (only works for the inIsolation() method)
				var newMessages = msg["messages"];
				var oldMessages = conversation[msg["threadID"]];

				for (let newIdx = 0; newIdx < newMessages.length; newIdx++) {
					for (let oldIdx = 0; oldIdx < oldMessages.length; oldIdx++) {
						// Stores sentiment of matching message in cache
						if (newMessages[newIdx]["message"] == oldMessages[oldIdx]["message"]) {
							newMessages[newIdx]["sentiment"] = oldMessages[oldIdx]["sentiment"];
							break;
						}
					}
				}

        let payload = {"messages": newMessages, "threadID": msg["threadID"]};
				post(endpoint, payload, (response, threadID) => {
					let sentimentTable = JSON.parse(response)["sentiment_table"];
					sentimentTable.sort((m, n) => { return m["id"] - n["id"]; });

					if (sentimentTable.length > 17) {
						sentimentTable = sentimentTable.slice(sentimentTable.length - 17);
					}

          storage.set({threadID: sentimentTable}, () => {
            console.log("Updated thread's sentiment table.");
          });

          storage.set({"currentThread": sentimentTable}, () => {
            console.log("Updated current thread's sentiment table.");
          });

          // Updates the browser action icon according to sentiment change
          if (sentimentTable[sentimentTable.length - 1]["sentiment"] >= sentimentTable[sentimentTable.length - 2]["sentiment"]) { // Sentiment increased
            chrome.browserAction.setIcon({path: "../assets/icon_green.png"});
          } else { // Sentiment decreased
            chrome.browserAction.setIcon({path: "../assets/icon_red.png"});
          }
				});
			});
    }
  });
});
