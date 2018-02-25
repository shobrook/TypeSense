function myFunction() {
  // make single API call
}

function injectButton() {
  var button = "<ul class=\"_39bj\"><li class=\"_39bk\"><form action=\"https://upload.messenger.com/ajax/mercury/upload.php\" class=\"_vzk\" title=\"Add Photos\" method=\"post\"><input type=\"hidden\" name=\"attach_id\"><input type=\"hidden\" name=\"images_only\" value=\"true\"><div class=\"_m _4q60 _3rzn _6a\"><input type=\"file\" class=\"_260t _n _2__f\" name=\"attachment[]\" multiple=\"\" accept=\"image/*\" title=\"Add Photos\"><a class=\"_4q61 _5f0v _509v _30yy _260u\" tabindex=\"-1\" href=\"#\"><i class=\"_5vn8\" alt=\"Camera\"></i></a></div></form></li><li><a class=\"_30yy _4rv6 _39bk\" role=\"button\" href=\"#\"></a></li><li><div style=\"display: none;\"><form action=\"https://upload.messenger.com/ajax/mercury/upload.php\" class=\"_vzk\" title=\"Add Files\" method=\"post\"><input type=\"hidden\" name=\"attach_id\"><input type=\"hidden\" name=\"images_only\" value=\"false\"><div class=\"_m _4q60 _3rzn _6a\"><input type=\"file\" class=\"_n _2__f\" name=\"attachment[]\" multiple=\"\" accept=\"*\" title=\"Add Files\"><a class=\"_4q61 _5f0v _509v\" tabindex=\"-1\" href=\"#\"><i class=\"_509w\" alt=\"Camera\"></i></a></div></form></div><a class=\"_30yy _yht _39bk\" role=\"button\" href=\"#\"></a></li><li><a class=\"_30yy _5s2p _39bk\" role=\"button\" href=\"#\"></a></li><li><a class=\"_4rv7 _39bk _30yy\" role=\"button\" href=\"#\"></a></li><li><a alignh=\"center\" class=\"_30yy _25pc _39bk  _3ggc\" href=\"#\" position=\"above\" role=\"button\" title=\"Send Money\"><i class=\"_5s8l\"></i></a></li><li><a class=\"_39bk _30yy _4ce_\" role=\"button\" href=\"#\"></a></li><a class=\"_4rv5 _39bk\" role=\"button\" href=\"#\"></a><button onclick=\"myFunction()\" style=\"\">Analyze Me</button></ul><a data-hover=\"tooltip\" data-tooltip-content=\"Press Enter to send\r\nPress Shift+Enter to add a new paragraph\" class=\"_30yy _38lh _39bl\" href=\"#\">Send</a>";
  document.getElementsByClassName("_4rv4")[0].innerHTML = button;
}
//
//
//
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
