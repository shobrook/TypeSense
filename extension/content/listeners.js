/* Globals */

var listenerPort = chrome.runtime.connect(window.localStorage.getItem('typesense-id'), {name: "listener"});


/* Main */


var eventListeners = function(getFBID) {
	function getUserID() {
	  var messageList = document.querySelectorAll("[class='_1t_p clearfix']");
		messageList.forEach(function(messageNode) {
			(messageNode.getElementsByClassName("_41ud")).forEach(function(message) {
				if (message) {
					if (message.children[1].children[0].getAttribute("participants").split("\"fbid:")[2]) {
						return (message.children[1].children[0].getAttribute("participants").split("\"fbid:")[2].split("\"")[0]);
					}
				}
			});
		});

	function getRecipientID() {
	  var messageList = document.querySelectorAll("[class='_1t_p clearfix']");
		messageList.forEach(function(messageNode) {
			(messageNode.getElementsByClassName("_41ud")).forEach(function(message) {
				if (message) {
					return (message.children[1].children[0].getAttribute("participants").split("\"fbid:")[1].split("\"")[0])
				}
			});
		});
	}

	/*
	function getElementByAttribute(attr, value, root) {
	    root = root || document.body;
	    if(root.hasAttribute(attr) && root.getAttribute(attr) == value) {
	        return root;
	    }
	    var children = root.children,
	        element;
	    for(var i = children.length; i--; ) {
	        element = getElementByAttribute(attr, value, children[i]);
	        if(element) {
	            return element;
	        }
	    }
	    return null;
	}

	window.onload = function () {
	  console.log("getUserId: " + getUserId());
	  console.log("getRecipientId: " + getRecipientId());
	  injectButton();
	  document.getElementById('js_1').addEventListener('DOMNodeInserted', function(event) {
	    if(event.target.parentNode.id == 'js_1') {
	      console.log("sdsa");
	      POST("http://localhost:5000/TypeSense/api/new_connection", {email: "shobrookj@gmail.com", fb_id: getRecipientId(), messages: []}, function(responseData) {
	        chrome.extension.onConnect.addListener(function(port) {
	              console.log("Connected .....");
	              port.postMessage(responseData);
	         });
	      });
	    }
	  }, false);
	};
	*/

	// TODO: Add event listener for new messages
	// TODO: Add event listener for conversation change

	window.postMessage({type: "event-notifications", value: {"fb_id": getRecipientID(), "messages": function() {
		var scrapedMessages = [];

		var containerNode = document.getElementsByClassName('__i_')[0];
		containerNode.childNodes.forEach(function(child) {
			if (child.tagName == 'DIV' && child.id.length > 0) {
				child.childNodes.forEach(function(c) {
					if (c.tagName == 'DIV') {
						var msgWrapperNodes = c.childNodes[0].getElementsByClassName('clearfix');

						for (var i = 0; i < msgWrapperNodes.length; i++) {
							var msgNode = msgWrapperNodes[i].childNodes[0].childNodes[0];

							if (msgNode == undefined || msgNode == null) continue; // Detects if message is rich media content

							// TODO: Check for emojis

							var author = true;
							if (window.getComputedStyle(msgWrapperNodes[i].childNodes[0], null).getPropertyValue("background-color") == "rgb(241, 240, 240)")
								author = false;
							var position = msgNode.getBoundingClientRect();

							scrapedMessages.push({"author": author, "message": msgNode.textContent, "coordinates": [position.left + window.pageXOffset, position.top + window.pageYOffset]});
						}
					}
				});
			}
		});

		console.log("Scraped all loaded messages.");
		return scrapedMessages;
	}}}, '*'); // TODO: Run this whenever an event is detected
}

// Prepares the JS injection
var listenerInject = function() {
	var script = document.createElement("script");
	script.textContent = "(" + eventListeners.toString() + ")();";
	document.head.appendChild(script);
}

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
