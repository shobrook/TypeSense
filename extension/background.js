/* Globals */


// For calling GET and SET to the extension's local storage
var storage = chrome.storage.local;

/*
// Pulls user's unique authentication token
var oauth;
chrome.identity.getAuthToken({interactive: true}, function(token) {
	if (chrome.runtime.lastError) {
		console.log("Error retrieving authToken: " + chrome.runtime.lastError.message);
		return;
	}
	oauth = token;
	console.log(oauth);
});
*/

// Dev REST API endpoints
const NEW_USER = "http://localhost:5000/TypeSense/api/new_user";
const CHECK_USER = "http://localhost:5000/TypeSense/api/check_user";
const NEW_CONNECTION = "http://localhost:5000/TypeSense/api/new_connection";
const NEW_MESSAGE = "http://localhost:5000/TypeSense/api/new_message";

// Prod REST API endpoints
// const NEW_USER = "http://localhost:5000/TypeSense/api/new_user";
// const CHECK_USER = "http://localhost:5000/TypeSense/api/check_user";
// const NEW_CONNECTION = "http://localhost:5000/TypeSense/api/new_connection";
// const NEW_MESSAGE = "http://localhost:5000/TypeSense/api/new_message";

// Creates an HTTP POST request
var POST = function(url, payload, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json");
	xhr.onreadystatechange = function() {
		if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) // readyState == 4
			callback(xhr.responseText);
	}
	xhr.send(JSON.stringify(payload));
}

// NOTE: Set to "true" for testing only
storage.set({"signup": true}, function() {
	console.log("Signup is set to true.");
});


/* Main */


//
// Prompts the sign-up dialog on "first-install"; provides handler for extension updates
// QUESTION: Is a listener for a "first-load" of messenger.com needed? The "onInstalled" event
// probably fires before a user visits messenger
chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
		console.log("User has installed TypeSense for the first time on this device.");
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
		});
		storage.set({"signup": true}, function() {
			console.log("Signup is set to true.");
		});
	} else if (details.reason == "update") {
		var thisVersion = chrome.runtime.getManifest().version;
		console.log("Updated from " + details.previousVersion + " to " + thisVersion + " :)");
	}
});

// Listens for the browser action to be clicked
chrome.browserAction.onClicked.addListener(function(tab) {
	storage.get("signup", function(signup) {
		if (signup["signup"]) { // If user hasn't signed up or logged in yet, prompt the register process
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {"message": "prompt-signup"});
			});
		} else { // If user has signed up or logged in, prompt the select messages canvas
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var saveDialog = function(folders) {
					var activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {"message": "clicked-browser-action", "folders": JSON.parse(folders).folders});
					console.log("Passed folder references to save dialog.");
				}
				storage.get("credentials", function(creds) {
					POST(GET_FOLDERS, {"email": creds["credentials"]["email"]}, saveDialog); // Pass user's folder references to the save dialog
				});
			});
		}
	});
});

// Listens for long-lived port connections (from content scripts)
chrome.runtime.onConnect.addListener(function(port) {
	port.onMessage.addListener(function(msg) {
		if (port.name == "register") { // Handles requests from the "register" port
			var addUser = function(user) {
				if (JSON.parse(user).registered) {
					console.log("Email is valid. Registering user.");
					storage.set({"credentials": {"email": msg.email, "password": msg.password}}, function() {
						port.postMessage({type: "registered", value: true});
						storage.set({"onboarding": true}, function() {
							console.log("Onboarding set to true.");
						});
						storage.set({"signup": false}, function() {
							console.log("Signup set to false.");
						});
						chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
							var activeTab = tabs[0];
							chrome.tabs.sendMessage(activeTab.id, {"message": "first-signup"});
						});
					});
				} else if (!(JSON.parse(user).registered)) {
					console.log("Email is already in use. Try again.");
					port.postMessage({type: "registered", value: false});
				}
			}
			POST(NEW_USER, {"email": msg.email, "password": msg.password}, addUser);
		} else if (port.name == "login") { // Handles requests from the "login" port
			var updateUser = function(user) {
				if (JSON.parse(user).logged_in) {
					console.log("Valid credentials. Logging in user.");
					port.postMessage({type: "logged-in", value: true});
					storage.set({"signup": false}, function() {
						console.log("Signup set to false.");
					});
					storage.set({"onboarding": false}, function() {
						console.log("Onboarding set to false.");
					});
				} else if (!(JSON.parse(user).logged_in)) {
					console.log("Invalid credentials. Try again.");
					port.postMessage({type: "logged-in", value: false});
				}
			}
			POST(CHECK_USER, {"email": msg.email, "password": msg.password}, updateUser);
		}
	});
});
