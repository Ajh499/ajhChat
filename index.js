// set up the http server
const express = require("express");
const app = express();
const server = require("http").createServer(app);
// my library for using WebSockets server-side
const wss = require("./WebSockets")(server);
const fs = require("node:fs");
const escape = require("html-escaper")
// host everything in the public folder (this isn't hosted as url/public/content, it's hosted as url/content)
app.use(express.static(__dirname + "/public"));

// 'database' helper functions
function readDB(callback) {
	fs.readFile("db.json", function(err, data) {
		if (err) {
			throw err;
		}
		callback(JSON.parse(data));
	});
}

function updateDB(obj) {
	fs.writeFile("db.json", JSON.stringify(obj), function(err) {
		if (err) {
			throw err;
		}
	});
}

// array to store users online
const users = [];
// when a user connects
wss.on("connect", function(socket) {
	// store user data in object
	const user = {
		id: users.length,
		name: null
	};
	// add them to the users online
	users.push(user);

	// this tells all the clients how many users are online and their names (if they have them)
	wss.emit("users", {
		online: users.length,
		users: users.filter(function(user) { return !!user.name; }).map(function(user) { return user.name; })
	});

	// read the 'database' of previous messages
	readDB(function(db) {
		// remove any messages over 20 minutes old
		for (let i = 0; i < db.messages.length; i++) {
			if (Date.now() - db.messages[i].timestamp >= 1200000) {
				db.messages.splice(i, 1);
				i--;
			}
		}
		// write the new data to the 'database'
		updateDB(db);
		// send the previous messages to the client
		socket.emit("previous messages", db.messages);
	});

	// when the server receives a message from the client
	socket.on("message", function(data) {
		// I'm double checking if any of the strings are empty again here to prevent any issues from users meddling with inspect element and attempting to bypass the client-side empty input protection
		// if the user has changed/set their name
		if (user.name !== data.username && data.username.trim() !== "") {
			// update the user's name
			user.name = data.username;
			// tell the clients that the users online have changed
			wss.emit("users", {
				online: users.length,
				users: users.filter(function(user) { return !!user.name; }).map(function(user) { return user.name; })
			});
		}

		// tell all the other user's that this user sent a message
		if (data.username.trim() !== "" && escape.escape(data.content).trim() !== "") {
			socket.broadcast("message", {
				username: data.username,
				content: escape.escape(data.content)
			});
			// read the 'database' of previous messages
			readDB(function(db) {
				// remove any messages over 20 minutes old
				for (let i = 0; i < db.messages.length; i++) {
					if (Date.now() - db.messages[i].timestamp >= 1200000) {
						db.messages.splice(i, 1);
						i--;
					}
				}
				// add the message to the database
				db.messages.push({
					username: data.username,
					content: escape.escape(data.content),
					timestamp: Date.now()
				});
				// write the new data to the 'database'
				updateDB(db);
			});
		}
	});

	// when a user disconnects
	socket.on("disconnect", function() {
		// remove the user from the users online
		users.splice(user.id, 1);
		// tell the clients that the users online have changed
		socket.broadcast("users", {
			online: users.length,
			users: users.filter(function(user) { return !!user.name; }).map(function(user) { return user.name; })
		});
	});
});

// start the server
server.listen(8080);