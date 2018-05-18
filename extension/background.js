/* Globals */


// For calling GET and SET to the extension's local storage
const storage = chrome.storage.local;

// Endpoint for analyzing message sentiment on the TypeSense REST API
const endpoint = "http://127.0.0.1:5000/TypeSense/api/analyze_sentiment"

/*
// Endpoint and login credentials for analyzing tone with IBM Watson
const endpoint = "https://gateway.watsonplatform.net/tone-analyzer/api/v3/tone?version=2018-05-01&text=";
const credentials = {"username": "21a9e424-69e0-4a8f-995c-19d1b5f9e72e", "password": "xctC0k8jpWZy"};
*/

/*
// Creates an asynchronous HTTP GET request
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
*/

// Creates an asynchronous HTTP POST request
const post = (url, payload, callback) => {
	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = () => {
		if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) { // readyState == 4
			callback(xhr.responseText);
    }
	}
	xhr.send(JSON.stringify(payload));
}

// Sends a message to content scripts running in the current tab
const message = (content) => {
	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		let activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, content);
	});
}

/*
// +/- signs for Watson tone categories
const toneSigns = {
  "sadness": -1,
  "anger": -1,
  "fear": -1,
  "tentative": -1,
  "joy": 1,
  "analytical": 1,
  "confident": 1
}

// Transforms a messages object into a sentimentTable object
const analyzeSentiment = (messages) => {
  var sentimentTable = [];

  let windows = Array.apply(null, Array(messages.length)).map((_, idx) => {
    let slicedMessageObjs = messages.slice(0, idx + 1);
    let messageWindows = slicedMessageObjs.map((messageObj) => { return messageObj["message"]; });

    return messageWindows;
  });
  for (let idx = 0; idx < messages.length; idx++) {
    let payload = windows[idx].join(' ').replace(/ /g, "%20");
    let newMessages = messages;

    get(endpoint + payload, credentials, (response) => {
      let tones = JSON.parse(response)["document_tone"]["tones"];
      let sentimentScores = tones.map((tone) => { return toneSigns[tone["tone_id"]] * tone["score"]; });
      let newMessages = messages;

      sentimentTable.push({
        "id": idx,
        "message": newMessages[idx]["message"],
        "received": newMessages[idx]["received"],
        "sentiment": sentimentScores.length > 0 ? Math.round(100 * (sentimentScores.reduce((sum, score) => { return sum + score; }, 0) / sentimentScores.length)) : 50
      });
    });
  }

  return sentimentTable;
}
*/


/* Event Handlers */


// Listens for messenger.com to be loaded and tells listeners.js to inject the event handlers
chrome.webNavigation.onCompleted.addListener((details) => {
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
      post(endpoint, msg, (response) => {
        let sentimentTable = JSON.parse(response)["sentiment_table"];
        sentimentTable.sort((m, n) => { return m["id"] - n["id"]; });

        if (sentimentTable.length > 17) {
          sentimentTable = sentimentTable.slice(sentimentTable.length - 17);
        }

        storage.set({"currentThread": sentimentTable}, () => { // TODO: Memoize conversations
          console.log(sentimentTable);
        });

        // Updates the browser action icon according to sentiment change
        if (sentimentTable[sentimentTable.length - 1]["sentiment"] >= sentimentTable[sentimentTable.length - 2]["sentiment"]) { // Sentiment increased
          chrome.browserAction.setIcon({path: "../assets/icon_green.png"});
        } else { // Sentiment decreased
          chrome.browserAction.setIcon({path: "../assets/icon_red.png"});
        }
      });
    }
  });
});
