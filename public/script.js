// import my client-side WebSocket library
import Socket from "./Socket.js";

// set up a connection to the server
const socket = new Socket();

function escapeHtml(encodedString) {
    var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
    var translate = {
        "nbsp":" ",
        "amp" : "&",
        "quot": "\"",
        "lt"  : "<",
        "gt"  : ">"
    };
    return encodedString.replace(translate_re, function(match, entity) {
        return translate[entity];
    }).replace(/&#(\d+);/gi, function(match, numStr) {
        var num = parseInt(numStr, 10);
        return String.fromCharCode(num);
    });
}
// just to make messaging easier and 'standard'
function message(username, message) {
	$("#chat-output").append("<p><b>" + username + ":</b> " + escapeHtml(message) + "</p>");
  var elem = document.getElementById('chat-output');
  if (elem.scrollTop != elem.scrollHeight)
  {
  $("#newmsg").show();
}
}

$(document).ready(function() {
  $("#chat-send").click(function() {
    var content = $("#chat-input").val();
    var username = $("#chat-username").val();
    if (content.trim() != "" && username.trim() != "") {
      message(username, content);
      // send message to the server
      socket.emit("message", {
        username: username,
        content: content
      });
      $("#chat-input").val("");
         var elem = document.getElementById('chat-output');
    elem.scrollTop = elem.scrollHeight;
    }
  });
});

socket.on("connect", function() {
  socket.emit("users");
});

socket.once("previous messages", function(messages) {
	for (let i = 0; i < messages.length; i++) {
		message(messages[i].username, messages[i].content);
	}
});

socket.on("users", function(data) {
  $("#online").text("users online (" + data.online + ") " + data.users.join(", "));
});

socket.on("message", function(data) {
  message(data.username, data.content);
});

var input = document.getElementById("chat-input");
input.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("chat-send").click();
  }
});
