/* Globals */


// For calling GET and SET to the extension's local storage
const storage = chrome.storage.local;

/*
// Pulls user's unique authentication token
chrome.identity.getAuthToken({interactive: true}, (token) => {
	if (chrome.runtime.lastError) {
		console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
		return;
	}
	var oauth = token;
	console.log(oauth);
});
*/

// REST API endpoints
const CREATE_USER = "http://localhost:5000/TypeSense/api/create_user";
const VALIDATE_USER = "http://localhost:5000/TypeSense/api/validate_user";
const UPDATE_CONVERSATION = "http://localhost:5000/TypeSense/api/update_conversation";

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

/*
// Hashes a password with the salt being the user's email address
const HASH = (email, password) => dcodeIO.bcrypt.hashSync(password, GET(GET_SALT, {"email": email}));
*/

// Sends a message to content scripts running in the current tab
const MESSAGE = (content) => {
	chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
		let activeTab = tabs[0];
		chrome.tabs.sendMessage(activeTab.id, content);
	});
}

// NOTE: Set to "false" for testing only
storage.set({"signed-up": false}, function() {
	console.log("Signed-up is set to false.");
});


/* Event Listeners */


// Listens for messenger.com to be loaded and sends "inject-listeners" to listeners.js
chrome.webNavigation.onCompleted.addListener((details) => {
	if (details.url.includes("messenger.com")) {
		storage.get("signed-up", (signup) => {
			if (signup["signed-up"]) {
				MESSAGE({"message": "inject-listeners"}); // Tells listeners.js to inject event listeners
			}
		});
	}
});

// Sets "signed-up" to false on first install
chrome.runtime.onInstalled.addListener((details) => {
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

// Listens for long-lived port connections (from content scripts)
chrome.runtime.onConnect.addListener((port) => {
	port.onMessage.addListener((msg) => {
		if (port.name == "register") { // Handles requests from the "register" port (registration.js)
			let addUser = (user) => {
				if (JSON.parse(user).registered) { // Successful registration
					console.log("Email is valid. Registering user.");

					storage.set({"credentials": {"email": msg.email, "password": msg.password}}, () => {
						port.postMessage({type: "registered", value: true});
						storage.set({"onboarding": true}, () => {
							console.log("Onboarding set to true.");
						});
						storage.set({"signed-up": true}, () => {
							console.log("Signed-up set to true.");
						});

						MESSAGE({"message": "first-signup"}); // Tells onboarding.js to prompt the onboarding dialog
					});

					MESSAGE({"message": "inject-listeners"}); // Tells listeners.js to inject event listeners
				} else { // Unsuccessful registration
					console.log("Email is already in use. Try again.");
					port.postMessage({type: "registered", value: false});
				}
			}
			POST(CREATE_USER, {"email": msg.email, "fbid": msg.fbid, "password": msg.password}, addUser);
		} else if (port.name == "login") { // Handles requests from the "login" port (registration.js)
			let validateUser = (user) => {
				if (JSON.parse(user).logged_in) { // Successful validation
					console.log("Valid credentials. Logging in user.");
					port.postMessage({type: "logged-in", value: true});
					storage.set({"signed-up": true}, () => {
						console.log("Signed-up set to true.");
					});
					storage.set({"onboarding": false}, () => {
						console.log("Onboarding set to false.");
					});

					MESSAGE({"message": "inject-listeners"}); // Tells listeners.js to inject event listeners
				} else { // Unsuccessful validation
					console.log("Invalid credentials. Try again.");
					port.postMessage({type: "logged-in", value: false});
				}
			}
			POST(VALIDATE_USER, {"email": msg.email, "password": msg.password}, validateUser);
		} else if (port.name == "listener") { // Handles requests from listeners.js
		 	let updateConversation = (messages) => {
				storage.set({"data": messages}, () => {
					console.log("Populated local data storage.");
				});
				MESSAGE({"message": "conversation-update", "messages": JSON.parse(messages)}); // Tells popup.js to update the graph
			}
			storage.get("credentials", (creds) => {
				POST(UPDATE_CONVERSATION, {"email": creds["credentials"]["email"], "fbid": "test"/*msg.fbid*/, "messages": msg.messages}, updateConversation);
			});
		} else if (port.name == "popup") {
			if (msg.browser_action_clicked)
				MESSAGE({"message": "prompt-signup"});
		}
	});
});
