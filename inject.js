function getUserId() {
  var element = document.querySelectorAll('[class="_1t_p clearfix"]');
  for (var x = 0; x < element.length; x++) {
    var msgs = element[x].getElementsByClassName("_41ud");
    for (var y = 0; y < msgs.length; y++) {
      if (msgs[y]) {
        if (msgs[y].children[1].children[0].getAttribute('participants').split("\"fbid:")[2]) {
          return (msgs[y].children[1].children[0].getAttribute('participants').split("\"fbid:")[2].split("\"")[0]);
        }
      }
    }
  }
}
//
function getRecipientId() {
  var element = document.querySelectorAll('[class="_1t_p clearfix"]');
  for (var x = 0; x < element.length; x++) {
    var msgs = element[x].getElementsByClassName("_41ud");
    for (var y = 0; y < msgs.length; y++) {
      if (msgs[y]) {
        return (msgs[y].children[1].children[0].getAttribute('participants').split("\"fbid:")[1].split("\"")[0]);
      }
    }
  }
}
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

window.onload = function () { alert("It's loaded!") };

window.onload = function () {
  //console.log("getUserId: " + getUserId());
  //console.log("getRecipientId: " + getRecipientId());
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
