const popupPort = chrome.runtime.connect(window.localStorage.getItem('typesense-id'), {name: "popup"});

// function openIndex() {
//  chrome.tabs.create({active: true, url: "https://www.facebook.com/dialog/oauth?client_id=1905953259716133&response_type=token&redirect_uri=https://www.facebook.com/connect/login_success.html"});
// }

// document.addEventListener('DOMContentLoaded', function() {
//    document.getElementById("index_link").addEventListener("click", openIndex);
// }

//Attempt at loading Facebook Javascript SDK

// This is called with the results from from FB.getLoginStatus().
  function statusChangeCallback(response) {
    console.log('statusChangeCallback');
    console.log(response);
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected') {
      // Logged into your app and Facebook.
      testAPI();
    } else {
      // The person is not logged into your app or we are unable to tell.
      document.getElementById('status').innerHTML = 'Please log ' +
        'into this app.';
    }
  }

  // This function is called when someone finishes with the Login
  // Button.  See the onlogin handler attached to it in the sample
  // code below.
  function checkLoginState() {
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });
  }

  window.fbAsyncInit = function() {
    FB.init({
      appId      : '1905953259716133',
      cookie     : true,  // enable cookies to allow the server to access
                          // the session
      xfbml      : true,  // parse social plugins on this page
      version    : 'v2.8' // use graph api version 2.8
    });

    // Now that we've initialized the JavaScript SDK, we call
    // FB.getLoginStatus().  This function gets the state of the
    // person visiting this page and can return one of three states to
    // the callback you provide.  They can be:
    //
    // 1. Logged into your app ('connected')
    // 2. Logged into Facebook, but not your app ('not_authorized')
    // 3. Not logged into Facebook and can't tell if they are logged into
    //    your app or not.
    //
    // These three cases are handled in the callback function.

    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });

  };

  // Load the SDK asynchronously
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

  // Here we run a very simple test of the Graph API after login is
  // successful.  See statusChangeCallback() for when this call is made.
  function testAPI() {
    console.log('Welcome!  Fetching your information.... ');
    FB.api('/me', function(response) {
      console.log('Successful login for: ' + response.name);
      document.getElementById('status').innerHTML =
        'Thanks for logging in, ' + response.name + '!';
    });
  }


const createGraph = (data) => {
	var data = data.reverse();

	// Listens for the "conversation-update" event from the background script
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.message == "conversation-update") {
			console.log("A new message was received or a conversation was changed.");
			data = (request.messages).reverse();
		}
	});

	var margin = {top: 0, right: 0, bottom: 0, left: 0},
	width = 400;
	height = 320;

	// Add svg to
	var svg = d3.select('#graph')
				.append('svg')
				.attr('width', width + margin.left + margin.right)
				.attr('height', height + margin.top + margin.bottom)
				.append('g')
				.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	// set the ranges
	var y = d3.scaleBand().range([height, 0]).padding(0.52);

	var x = d3.scaleLinear().range([0, width]);

	// Scale the range of the data in the domains
	x.domain(d3.extent(data, function (d) {
	return d.sentiment;
	}));
	y.domain(data.map(function (d) {
	return d.id;
	}));

	// append the rectangles for the bar chart
	svg.selectAll(".bar")
	   .data(data)
	   .enter()
	   .append("rect")
	   .attr("class", function (d) {
			return "bar bar--" + (d.sentiment < 0 ? "negative" : "positive");
	})
	.attr("x", function (d) {
		return x(Math.min(7, d.sentiment * 0.5));
	})
	.attr("y", function (d) {
		return y(d.id);
	})
	.attr("width", function (d) {
		return Math.abs(x(d.sentiment * 0.55) - x(0));
	})
	.attr("fill", function(d) {
		if (d.author) {
			if (d.sentiment < 0) {
				return "#ff5e66";
			} else {
				return "#6dd792";
			}
		} else {
			return "rgba(0, 0, 0, 0.0)"
		}
	})
	.attr("stroke-linecap", "round")
	.attr("stroke", function(d) {
		if (d.sentiment < 0) {
			return "#ff5e66";
		} else {
			return "#6dd792";
		}
	})
	.attr("stroke-width", "2px")
	.attr("height", y.bandwidth())
	.attr("rx", "1.5px");

	svg.append("line")
	   .attr("x1", (width / 2))
	   .attr("y1", 0)
	   .attr("x2", (width / 2))
	   .attr("y2", height)
	   .style("stroke-width", 2)
	   .style("stroke", "#F1F0F0")
	   .style("fill", "1");

	svg.append("line")
	   .attr("x1", 0)
	   .attr("y1", height - 1)
	   .attr("x2", width)
	   .attr("y2", height - 1)
	   .style("stroke-width", 2)
	   .style("stroke", "#F1F0F0")
	   .style("fill", "1");
}

chrome.storage.local.get("signed-up", (signup) => {
	if (signup["signed-up"]) {
		chrome.storage.local.get("data", (data) => {
			console.log(data["data"]);
			console.log(data["data"].messages);
			console.log((data["data"])["messages"]);
			console.log(data["data"]["messages"]);
			createGraph(data["data"]["messages"]);
		});
	} else {
		popupPort.postMessage({browser_action_clicked: true}); // Tells background.js that the browser action was clicked
	}
});
