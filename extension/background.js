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
	// TODO: Use VADER-js to analyze the compound valence of the conversation
	// TODO: Output ordered list of dictionaries, formatted as [{"message": "...", "received": "...", "sentiment": 0}, ...]

	return [
    {sentiment: -10, id: 0, received: true},
    {sentiment: 40, id: 1, received: false},
    {sentiment: -10, id: 2, received: true},
    {sentiment: -50, id: 3, received: true},
    {sentiment: 30, id: 4, received: false},
    {sentiment: 60, id: 5, received: true},
    {sentiment: 50, id: 6, received: true},
    {sentiment: -20, id: 7, received: false},
    {sentiment: -10, id: 8, received: true},
    {sentiment: 40, id: 9, received: false},
    {sentiment: -10, id: 10, received: true},
    {sentiment: -50, id: 11, received: true},
    {sentiment: 30, id: 12, received: false},
    {sentiment: 60, id: 13, received: true},
    {sentiment: 50, id: 14, received: true},
    {sentiment: -20, id: 15, received: false},
    {sentiment: -20, id: 16, received: false}
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
      } else { // Sentiment decreased
        chrome.browserAction.setIcon({path: "../assets/icon_red.png"});
      }
    }
  });
});
