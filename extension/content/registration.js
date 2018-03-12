/* Globals */


const registerPort = chrome.runtime.connect(window.localStorage.getItem('typesense-id'), {name: "register"});
const loginPort = chrome.runtime.connect(window.localStorage.getItem('typesense-id'), {name: "login"});

const registerPayload = function() {
	console.log("Prompting sign-up dialog.");

	let canvas = document.createElement('div');
	let signUpDialog = document.createElement("div");

	let formDefs = `<div id="typesenseHeader">
      							<img id="typesenseWordmark" src="https://preview.ibb.co/ncnTq7/Type_Sense_Wordmark.png">
							      <img id="registerExit" src="https://image.ibb.co/drrQfF/Exit_Button.png">
							    </div><!--#typesenseHeader-->
							    <div id="dialogTabsWrapper">
							      <div class="dialogTabs">
							        <h3 id="signUpTab">SIGN UP</h3>
							        <h3 id="loginTab">LOGIN</h3>
							      </div><!--.dialogTabs-->
							    </div><!--#dialogTabsWrapper-->

							    <hr id="selector">

							    <div id="tabContent">
							      <div id="signUpTabContent">
							        <div id="invalidEmailError" class="formValidErrors" style="display: none;">
							          <p>Email is already in use.</p>
							        </div><!--#invalidEmailError-->
							        <form id="signUpForm">
							          <input type="email" class="inputFields" id="typesenseEmail" autocomplete="off" placeholder="Email Address">
							          <input type="password" class="inputFields" id="typesensePass" autocomplete="off" placeholder="Password">
							          <img id="greyPassCheckMark" class="passCheckMark" src="https://image.ibb.co/eKg0Ea/Password_Check_GREY.png">
							          <img id="greenPassCheckMark" class="passCheckMark" src="https://image.ibb.co/gOdafF/Password_Check_GREEN.png" style="display: none;">
							          <input id="signUpButton" class="signUpLoginButton" type="submit" value="Get Started">
							          <div id="passwordHelpText">
							            <p>Passwords must be at least 10 characters long.</p>
							          </div><!--passwordHelpText-->
							        </form><!--signUpForm-->
							      </div><!--signUpTabContent-->
							      <div id="loginTabContent" style="display: none; transition: .2s;">
							        <div id="invalidCredentialsError" class="formValidErrors" style="display: none;">
							          <p>Incorrect email or password.</p>
							        </div><!--#invalidCredentialsError-->
							        <form id="loginForm">
							          <input type="email" class="inputFields" id="typesenseEmail" autocomplete="off" placeholder="Email Address">
							          <input type="password" class="inputFields" id="typesensePass" autocomplete="off" placeholder="Password">
							          <input id="loginButton" type="submit" class="signUpLoginButton" value="Continue">
							          <div id="forgotYourPassword">
							            <p>Forgot your password?</p>
							          </div><!--forgotYourPassword-->
							        </form><!--loginForm-->
							      </div><!--tabContent-->`;

  // Assigns CSS attributes to the canvas and signup dialog container
	canvas.style.backgroundColor = "rgba(0,0,0,.35)";
	canvas.style.zIndex = "2147483647";
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	canvas.style.top = "0px";
	canvas.style.left = "0px";
	canvas.style.display = "block";
	canvas.style.position = "absolute";

	signUpDialog.style.position = "fixed";
	signUpDialog.style.width = "538px";
	signUpDialog.style.height = "288px";
	signUpDialog.style.top = "50%";
	signUpDialog.style.left = "50%";
	signUpDialog.style.marginLeft = "-269px";
	signUpDialog.style.transform = "translateY(-50%)";
	signUpDialog.style.borderRadius = "10px";
	signUpDialog.style.backgroundColor = "#FFFFFF";
	signUpDialog.style.zIndex = "2147483647";

	signUpDialog.innerHTML = formDefs; // Wraps the signup form and tabs with the dialog container

	// Assigns CSS to the signup form and tabs
	document.getElementsByTagName('style')[0].innerHTML = `#typesenseHeader {
																												  background-color: #2C9ED4;
																												  position: relative;
																												  height: 42px;
																												  margin-top: -19px;
																												  border-radius: 10px 10px 0px 0px;
																												}

																												#typesenseWordmark {
																												  position: relative;
																												  height: 16px;
																												  margin-top: 12px;
																												  margin-left: 30px;
																												  pointer-events: none;
																												}

																												#registerExit {
																												  position: relative;
																												  height: 15px;
																												  margin-left: 402px;
																												  cursor: pointer;
																												}

																												#dialogTabsWrapper {
																												  overflow-x: hidden;
																												  padding-bottom: 10px;
																												}

																												.dialogTabs {
																													height: 60px;
																												  font-family: Helvetica;
																												  overflow: hidden;
																												  box-shadow: 0px 1px 3px #D9D9D9;
																												}

																												#signUpTab {
																												  display: block;
																												  float: left;
																												  width: 298px;
																												  padding: 1.75em 0;
																												  font-size: 13px;
																												  font-weight: 600;
																												  color: #2C9ED4;
																												  text-align: center;
																												  cursor: pointer;
																												}

																												#loginTab {
																												  display: block;
																												  float: left;
																												  width: 180px;
																												  padding: 1.75em 0;
																												  font-size: 13px;
																												  font-weight: 600;
																												  color: rgb(195,208,225);
																												  text-align: center;
																												  cursor: pointer;
																												}

																												#signUpTab:hover {
																												  color: #2C9ED4;
																												}

																												#loginTab:hover {
																												  color: #2C9ED4;
																												}

																												#selector {
																												  background-color: #2C9ED4;
																												  height: 1px;
																												  width: 239px;
																												  margin-top: -11px;
																												  margin-left: 30px;
																												  border: none;
																												  transition: .2s;
																												}

																												#tabContent {
																												  position: relative;
																												  top: 20px;
																												  left: 30px;
																												}

																												.inputFields {
																												  display: inline-block;
																												  box-sizing: border-box;
																												  width: 478px;
																												  height: 42px;
																												  padding: 20px;
																												  outline: none;
																												  margin: 0 0 15px 0px;
																												  border: none;
																												  border-radius: 1px;
																												  box-shadow: 0px 1px 3px #D9D9D9;
																												  font-family: Helvetica;
																												  font-weight: 400;
																												  font-size: 13px;
																												  color: #7D858E;
																												}

																												#typesenseEmail::-webkit-input-placeholder {
																												  color: #CDD8E6;
																												}

																												#typesensePass::-webkit-input-placeholder {
																												  color: #CDD8E6;
																												}

																												#passwordHelpText {
																												  display: inline-block;
																												  position: relative;
																												  top: -53px;
																												  font-family: Helvetica;
																												  font-weight: 500;
																												  font-size: 11px;
																												  color: #CDD8E6;
																												}

																												#forgotYourPassword {
																												  display: inline-block;
																												  position: relative;
																												  top: -53px;
																												  font-family: Helvetica;
																												  font-weight: 500;
																												  font-size: 11px;
																												  color: #2C9ED4;
																												  text-decoration: underline;
																												  cursor: pointer;
																												}

																												.signUpLoginButton {
																												  display: inline-block;
																												  float: left;
																												  position: relative;
																												  background-color: #2C9ED4;
																												  text-align: center;
																												  width: 135px;
																												  height: 42px;
																												  border: none;
																												  color: #FFFFFF;
																												  font-family: Helvetica;
																												  font-weight: 600;
																												  font-size: 13px;
																												  cursor: pointer;
																												  border-radius: 10px 1px 10px 1px;
																												  margin-left: 343px;
																												  margin-top: 0px;
																												  overflow: hidden;
																												  border: none;
																												  outline: none;
																												}

																												.signUpLoginButton:hover {
																												  background-color: #2890C1;
																												}

																												.formValidErrors {
																												  font-family: Helvetica;
																												  font-size: 13px;
																												  font-weight: 600;
																												  color: #EC3D3D;
																													position: relative;
																													top: -9px;
																												}

																												.passCheckMark {
																												  height: 21px;
																												  margin-left: -45px;
																												  position: relative;
																												  vertical-align: middle;
																												  pointer-events: none;
																												}`;

	document.body.appendChild(canvas); // Imposes a low-opacity canvas on entire page
	document.body.appendChild(signUpDialog); // Prompts the signup dialog

	let signUpTab = document.getElementById("signUpTab");
	let loginTab = document.getElementById("loginTab");

	let loginTabContent = document.getElementById("loginTabContent");
	let signUpTabContent = document.getElementById("signUpTabContent");
	let selector = document.getElementById("selector");

	let signUpForm = document.getElementById("signUpForm");
	let loginForm = document.getElementById("loginForm");

	let greyPassCheckMark = document.getElementById("greyPassCheckMark");
	let greenPassCheckMark = document.getElementById("greenPassCheckMark");
	let passwordField = document.getElementById("typesensePass");

	let passwordHelpText = document.getElementById("passwordHelpText");
	let invalidEmailError = document.getElementById("invalidEmailError");
	let invalidCredentialsError = document.getElementById("invalidCredentialsError");

	let exitButton = document.getElementById("registerExit");

	// Changes grey checkmark to green when user types a password >= 10 characters
	passwordField.onkeyup = function() {
  	if (((this).value).length >= 10) {
    	greyPassCheckMark.style.display = "none";
    	greenPassCheckMark.style.display = "initial";
  	} else {
    	greenPassCheckMark.style.display = "none";
    	greyPassCheckMark.style.display = "initial";
  	}
	}

	// Exits dialog when user clicks "X" button
	exitButton.onclick = function() {
		document.body.removeChild(signUpDialog);
		document.body.removeChild(canvas);
		console.log("User clicked exit.");
	}

	// Exits dialog when user clicks back into messenger
	canvas.onclick = function() {
		//window.postMessage({type: "canvas-click", value: false}, '*');
		document.body.removeChild(signUpDialog);
		document.body.removeChild(canvas);
		console.log("User clicked canvas.");
	}

	// Loads login form when login tab is clicked
	loginTab.onclick = function() {
	  signUpTab.style.color = "rgb(195,208,225)";
	  loginTab.style.color = "rgb(44,158,212)";
		signUpTabContent.style.display = "none";
		loginTabContent.style.display = "initial";
		selector.style.marginLeft = "279px";
		invalidEmailError.style.display = "none";
		passwordHelpText.style.color = "#CDD8E6";
		signUpDialog.style.height = "288px";
		signUpForm.reset();
	}

	// Loads signup form when signup tab is clicked
	signUpTab.onclick = function() {
	  signUpTab.style.color = "rgb(44,158,212)";
	  loginTab.style.color = "rgb(195,208,225)";
		loginTabContent.style.display = "none";
	  signUpTabContent.style.display = "initial";
		selector.style.marginLeft = "40px";
		invalidCredentialsError.style.display = "none";
		invalidEmailError.style.display = "none";
		passwordHelpText.style.color = "#CDD8E6";
		signUpDialog.style.height = "288px";
		loginForm.reset();
	}

	// Pulls the current user's Facebook ID
	let getUserID = () => {
	  let messageList = document.querySelectorAll("[class='_1t_p clearfix']");
		Array.from(messageList).forEach(function(messageNode) {
			Array.from(messageNode.getElementsByClassName("_41ud")).forEach(function(message) {
				if (message) {
					if (message.children[1].children[0].getAttribute("participants").split("\"fbid:")[2]) {
						return (message.children[1].children[0].getAttribute("participants").split("\"fbid:")[2].split("\"")[0]);
					}
				}
			});
		});
	}

	// Pull inputs from signup form and passes credentials to content script
	signUpForm.onsubmit = function() {
		let email = (this).typesenseEmail.value;
		let password = (this).typesensePass.value;

		if (password.length < 10) {
			console.log("User's password is too short.");
			passwordHelpText.style.color = "#EC3D3D";
			(this).typesensePass.value = "";
			invalidEmailError.style.display = "none";
			signUpDialog.style.height = "288px";
		} else {
			window.postMessage({type: "signup-credentials", value: {"fb_id": getUserID(), "email": email, "password": password}}, '*');
		}

	}

	// Pull inputs from login form and pass credentials to content script
	loginForm.onsubmit = function() {
		let email = (this).typesenseEmail.value;
		let password = (this).typesensePass.value;
		window.postMessage({type: "login-credentials", value: {"email": email, "password": password}}, '*');
	}

	// Signup and login validation
	window.addEventListener('message', function(event) {
		if (event.data.type == "registered" && event.data.value) {
			document.body.removeChild(signUpDialog);
			document.body.removeChild(canvas);
			console.log("User successfully registered.");
		} else if (event.data.type == "registered" && !(event.data.value)) {
			signUpForm.reset();
			passwordHelpText.style.color = "#CDD8E6";
			invalidEmailError.style.display = "initial";
			signUpDialog.style.height = "320px";
			console.log("User tried signing up with invalid email.");
		} else if (event.data.type == "logged-in" && event.data.value) {
			document.body.removeChild(signUpDialog);
			document.body.removeChild(canvas);
			console.log("User successfully logged in.");
		} else if (event.data.type == "logged-in" && !(event.data.value)) {
			loginForm.reset();
			invalidCredentialsError.style.display = "initial";
			signUpDialog.style.height = "320px";
			console.log("User inputted incorrect login credentials.");
		}
	});

	console.log("Displayed sign-up dialog.");
}

// Prepares the JS injection
const registerInject = function() {
	let script = document.createElement('script');
	script.textContent = "(" + registerPayload.toString() + ")();";
	document.head.appendChild(script);
}


/* Main */


// Listens for the "prompt-signup" event from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "prompt-signup") {
		console.log("User hasn't signed up for (or logged in) typesense.");
		registerInject();
	}
});

// Pulls credentials from JS injection and passes to background script
window.addEventListener('message', function(event) {
	if (event.data.type == "signup-credentials")
		registerPort.postMessage({fb_id: event.data.value.fb_id, email: event.data.value.email, password: event.data.value.password});
	else if (event.data.type == "login-credentials")
		loginPort.postMessage({email: event.data.value.email, password: event.data.value.password});
});

// Listens for signup validation and passes to JS injection
registerPort.onMessage.addListener(function(msg) {
	if (msg.type == "registered")
		window.postMessage({type: "registered", value: msg.value}, '*');
});

// Listens for login validation and passes to JS injection
loginPort.onMessage.addListener(function(msg) {
	if (msg.type == "logged-in")
		window.postMessage({type: "logged-in", value: msg.value}, '*');
});
