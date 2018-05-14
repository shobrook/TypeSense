/* Globals */


const listenerPort = chrome.runtime.connect(window.localStorage.getItem("typesense-id"), {name: "listener"});
const eventListeners = () => {
	/*
	// Pulls the current recipient's Facebook ID
	const getRecipientID = () => {
		console.log("getRecipientID called");
	  let messageList = document.querySelectorAll("[class='_1t_p clearfix']");
		Array.from(messageList).forEach((messageNode) => {
			Array.from(messageNode.getElementsByClassName("_41ud")).forEach((message) => {
				if (message) {
					let map = message.children[1].children[0].getAttribute("participants");
					console.log("MAP", map);
					// TODO: Only return if map has two instances of "fb_id"
					if (map != null) {
						console.log("MAP", map);
						return (map.split("\"fb_id:")[1].split("\"")[0]).toString();
					}
				}
			});
		});
		console.log("Got Facebook ID.");
	}
	*/

	// TODO: Pull the the thread ID from the current URL

	// Scrapes the last 23 messages in the current conversation (in chronological order)
	const scrapeMessages = () => {
		let scrapedMessages = [];

		let messageNodes = document.getElementsByClassName("_3058 _ui9 _hh7 _s1- _52mr _3oh-"); // BUG: Doesn't include emojis
		Array.from(messageNodes).forEach((node) => {
			let received = node.getAttribute("customcolor") == '' ? true : false;
			scrapedMessages.push({"received": received, "message": node.getAttribute("body")});
		});

		console.log("Scraped all loaded messages.");

		if (scrapedMessages.length > 23)
			return scrapedMessages.slice(scrapedMessages.length - 23);
		else
			return scrapedMessages;
	}

	// Listens for a new message
	document.getElementById("js_1").addEventListener("DOMNodeInserted", (event) => {
    if (event.target.parentNode.id == "js_1") {
			window.postMessage({type: "eventNotifications", value: {"threadID": getThreadID(), "messages": scrapeMessages()}}, '*');
    }
	}, false);

	// Listens for a conversation change (technically a URL change)
	var oldLocation = location.href;
	setInterval(function() {
		if (location.href != oldLocation) {
			// TODO: Handle changes to non-convo URLs (or the same URL but a change from thread ID to FB username)
			window.postMessage({type: "eventNotifications", value: {"threadID": getThreadID(), "messages": scrapeMessages()}}, '*');
			oldLocation = location.href;
		}
	}, 100);

	window.postMessage({type: "eventNotifications", value: {"threadID": getThreadID(), "messages": scrapeMessages()}}, '*');
}

// Prepares the JS injection
const injectListeners = () => {
	var script = document.createElement("script");
	script.textContent = "(" + eventListeners.toString() + ")();";
	document.head.appendChild(script);
}


/* Main */


// Listens for the "injectListeners" event from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.message == "injectListeners") {
		console.log("User has loaded messenger.");
		injectListeners();
	}
});

// Pulls scraped messages from JS injection and passes to background script
window.addEventListener("message", (event) => {
	if (event.data.type == "eventNotifications")
		listenerPort.postMessage({threadID: event.data.value.threadID, messages: event.data.value.messages});
});
