/* Globals */


// For calling GET and SET to the extension's local storage
const storage = chrome.storage.local;

/*
// Pulls user's unique authentication token
chrome.identity.getAuthToken({interactive: true}, function(token) {
	if (chrome.runtime.lastError) {
		console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
		return;
	}
	var oauth = token;
	console.log(oauth);
});
*/

// REST API endpoints
const CREATE_USER = "http://localhost:5000/TypeSense/api/new_user";
const VALIDATE_USER = "http://localhost:5000/TypeSense/api/check_user";
const UPDATE_CONVERSATION = "http://localhost:5000/TypeSense/api/new_connection";

// Creates an HTTP POST request
const POST = (url, payload, callback) => {
	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = () => {
		if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) // readyState == 4
			callback(xhr.responseText);
	}
	xhr.send(JSON.stringify(payload));
}

// Hashes a password with the salt being the user's email address
const HASH = (email, password) => dcodeIO.bcrypt.hashSync(password, GET(GET_SALT, {"email": email})); // QUESTION: Are you trying to make a get request @alichtman? If so, you need to implement a GET function and define a GET_SALT endpoint

// NOTE: Set to "false" for testing only
storage.set({"signed-up": false}, function() {
	console.log("Signed-up is set to false.");
});


/* Event Listeners */


// Listens for messenger.com to be loaded and sends "inject-listeners" to listeners.js
chrome.webNavigation.onCompleted.addListener(function(details) {
	if (details.url.includes("messenger.com")) {
		storage.get("signed-up", function(signup) {
			if (signup["signed-up"]) {
				// Tells listeners.js to inject event listeners
				chrome.tabs.query({active: true, currentWindow: true, function(tabs) {
					let activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "inject-listeners"});
				}});
			}
		});
	}
});

// Sets "signed-up" to false on first install
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
		console.log("User has installed TypeSense for the first time on this device.");
		storage.set({"signed-up": false}, function() {
			console.log("Signed-up is set to false.");
		});
	} else if (details.reason == "update") {
		let thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});

// Listens for the browser action to be clicked
chrome.browserAction.onClicked.addListener(function(tab) {
	storage.get("signed-up", function(signup) {
		if (!signup["signed-up"]) { // If user hasn't signed up or logged in yet, prompt the register process
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				let activeTab = tabs[0];
				console.log("Browser action clicked – prompting signup dialog.");
				chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
			});
		}
	});
});

// Listens for long-lived port connections (from content scripts)
chrome.runtime.onConnect.addListener(function(port) {
	port.onMessage.addListener(function(msg) {
		if (port.name == "register") { // Handles requests from the "register" port (registration.js)
			let addUser = function(user) {
				if (JSON.parse(user).registered) { // Successful registration
					console.log("Email is valid. Registering user.");

					storage.set({"credentials": {"email": msg.email, "password": msg.password}}, function() {
						port.postMessage({type: "registered", value: true});
						storage.set({"onboarding": true}, function() {
							console.log("Onboarding set to true.");
						});
						storage.set({"signed-up": true}, function() {
							console.log("Signed-up set to true.");
						});

						// Tells onboarding.js to prompt the onboarding dialog
						chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
							let activeTab = tabs[0];
							chrome.tabs.sendMessage(activeTab.id, {"message": "first-signup"});
						});
					});

					// Tells listeners.js to inject event listeners
					chrome.tabs.query({active: true, currentWindow: true, function(tabs) {
						let activeTab = tabs[0];
						chrome.tabs.sendMessage(activeTab.id, {"message": "inject-listeners"});
					}});
				} else { // Unsuccessful registration
					console.log("Email is already in use. Try again.");
					port.postMessage({type: "registered", value: false});
				}
			}
			POST(CREATE_USER, {"email": msg.email, "password_hash": HASH(msg.email, msg.password), "fb_id": msg.fb_id}, addUser);
		} else if (port.name == "login") { // Handles requests from the "login" port (registration.js)
			let validateUser = function(user) {
				if (JSON.parse(user).logged_in) { // Successful validation
					console.log("Valid credentials. Logging in user.");
					port.postMessage({type: "logged-in", value: true});
					storage.set({"signed-up": true}, function() {
						console.log("Signed-up set to true.");
					});
					storage.set({"onboarding": false}, function() {
						console.log("Onboarding set to false.");
					});

					// Tells listeners.js to inject event listeners
					chrome.tabs.query({active: true, currentWindow: true, function(tabs) {
						let activeTab = tabs[0];
						chrome.tabs.sendMessage(activeTab.id, {"message": "inject-listeners"});
					}});
				} else { // Unsuccessful validation
					console.log("Invalid credentials. Try again.");
					port.postMessage({type: "logged-in", value: false});
				}
			}
			POST(VALIDATE_USER, {"email": msg.email, "password_hash": HASH(msg.email, msg.password)}, validateUser);
		} else if (port.name == "listener") { // Handles requests from listeners.js
		 	let updateConversation = function(messages) {
				// Tells popup.js to update the graph
				chrome.tabs.query({active: true, currentWindow: true, function(tabs) {
					let activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "conversation-update", "messages": JSON.parse(messages)});
				}});
			}
			storage.get("credentials", function(creds) {
				POST(UPDATE_CONVERSATION, {"email": creds["credentials"]["email"], "fb_id": msg.fb_id, "messages": msg.messages}, updateConversation);
			});
		}
	});
});
