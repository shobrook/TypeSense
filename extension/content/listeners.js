/* Globals */


const listenerPort = chrome.runtime.connect(window.localStorage.getItem('typesense-id'), {name: "listener"});
const eventListeners = (getFBID) => {
	// Pulls the current recipient's Facebook ID
	const getRecipientID = () => {
	  let messageList = document.querySelectorAll("[class='_1t_p clearfix']");
		Array.from(messageList).forEach((messageNode) => {
			Array.from(messageNode.getElementsByClassName("_41ud")).forEach((message) => {
				if (message) {
					let map = message.children[1].children[0].getAttribute("participants");

					if (map != null)
						return int(map.split("\"fbid:")[1].split("\"")[0]);
				}
			});
		});
	}

	// Scrapes the last 23 messages in the current conversation
	const scrapeMessages = () => {
		let scrapedMessages = [];

		let containerNode = document.getElementsByClassName('__i_')[0];
		Array.from(containerNode.childNodes).forEach((child) => {
			if (child.tagName == 'DIV' && child.id.length > 0) {
				Array.from(child.childNodes).forEach((c) => {
					if (c.tagName == 'DIV') {
						let msgWrapperNodes = c.childNodes[0].getElementsByClassName('clearfix');

						for (let i = 0; i < msgWrapperNodes.length; i++) {
							let msgNode = msgWrapperNodes[i].childNodes[0].childNodes[0];

							// Passes if message has rich media content
							if (msgNode == undefined || msgNode == null)
								continue;

							// TODO: Check for emojis

							let author = true;
							if (window.getComputedStyle(msgWrapperNodes[i].childNodes[0], null).getPropertyValue("background-color") == "rgb(241, 240, 240)")
								author = false;

							scrapedMessages.push({"author": author, "message": msgNode.textContent});
						}
					}
				});
			}
		});

		console.log("Scraped all loaded messages.");

		if (scrapedMessages.length > 23)
			return scrapedMessages.slice(scrapedMessages.length - 23);
		else
			return scrapedMessages;
	}

	// Listens for a new message
	document.getElementById("js_1").addEventListener('DOMNodeInserted', (event) => {
    if (event.target.parentNode.id == "js_1") {
			window.postMessage({type: "event-notifications", value: {"fb_id": getRecipientID(), "messages": scrapeMessages()}}, '*');
    }
	}, false);

	// Listens for a conversation change (technically a URL change)
	var oldLocation = location.href;
	setInterval(function() {
		if (location.href != oldLocation) {
			// TODO: Detect non-convo URLs
			window.postMessage({type: "event-notifications", value: {"fb_id": getRecipientID(), "messages": scrapeMessages()}}, '*');
			oldLocation = location.href;
		}
	}, 100);

	window.postMessage({type: "event-notifications", value: {"fb_id": getRecipientID(), "messages": scrapeMessages()}}, '*');
}

// Prepares the JS injection
const listenerInject = () => {
	var script = document.createElement("script");
	script.textContent = "(" + eventListeners.toString() + ")();";
	document.head.appendChild(script);
}


/* Main */


// Listens for the "inject-listeners" event from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.message == "inject-listeners") {
		console.log("User has loaded messenger, or just signed-up/logged-in.");
		listenerInject();
	}
});

// Pulls scraped messages from JS injection and passes to background script
window.addEventListener("message", (event) => {
	if (event.data.type == "event-notifications")
		listenerPort.postMessage({fb_id: event.data.value.fb_id, messages: event.data.value.messages});
});
