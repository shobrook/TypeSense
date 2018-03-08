/* Globals */


const listenerPort = chrome.runtime.connect(window.localStorage.getItem('typesense-id'), {name: "listener"});
const eventListeners = function(getFBID) {
	// Pulls the current user's Facebook ID
	const getUserID = () => {
	  let messageList = document.querySelectorAll("[class='_1t_p clearfix']");
		messageList.forEach(function(messageNode) {
			(messageNode.getElementsByClassName("_41ud")).forEach(function(message) {
				if (message) {
					if (message.children[1].children[0].getAttribute("participants").split("\"fbid:")[2]) {
						return (message.children[1].children[0].getAttribute("participants").split("\"fbid:")[2].split("\"")[0]);
					}
				}
			});
		});
	}

	// Pulls the current recipient's Facebook ID
	const getRecipientID = () => {
	  let messageList = document.querySelectorAll("[class='_1t_p clearfix']");
		messageList.forEach(function(messageNode) {
			(messageNode.getElementsByClassName("_41ud")).forEach(function(message) {
				if (message) {
					return (message.children[1].children[0].getAttribute("participants").split("\"fbid:")[1].split("\"")[0])
				}
			});
		});
	}

	// Scrapes the last 23 messages in the current conversation
	const scrapeMessages = () => {
		let scrapedMessages = [];

		// TODO: Only scrape 23 messages

		let containerNode = document.getElementsByClassName('__i_')[0];
		containerNode.childNodes.forEach(function(child) {
			if (child.tagName == 'DIV' && child.id.length > 0) {
				child.childNodes.forEach(function(c) {
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
		return scrapedMessages;
	}

	// Listens for a new message
	document.getElementById("js_1").addEventListener('DOMNodeInserted', function(event) {
    if (event.target.parentNode.id == "js_1") {
			window.postMessage({type: "event-notifications", value: {"fb_id": getRecipientID(), "messages": scrapeMessages()}}, '*');
    }
	}, false);

	// TODO: Add event listener for conversation change
}

// Prepares the JS injection
const listenerInject = function() {
	var script = document.createElement("script");
	script.textContent = "(" + eventListeners.toString() + ")();";
	document.head.appendChild(script);
}


/* Main */


// Listens for the "inject-listeners" event from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "inject-listeners") {
		console.log("User has loaded messenger, or just signed-up/logged-in.");
		listenerInject();
	}
});

// Pulls scraped messages from JS injection and passes to background script
window.addEventListener("message", function(event) {
	if (event.data.type == "event-notifications")
		listenerPort.postMessage({fb_id: event.data.value.fb_id, messages: event.data.value.messages});
});
