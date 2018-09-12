const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const index = require("./routes/index");
const port = process.env.PORT || 4001;
const db = require('./config/keys').mongoURI;
const User = require('./models/User');
const Game = require('./models/Game');

const app = express();
app.use(index);
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketIo(server);
server.listen(port, () => console.log(`Listening on port ${port}`));
mongoose.connect(db)
	.then(() => console.log("MongoDB connected"))
	.catch((err) => console.log(err))

let usersQueue = [];
let totalUsersCount = 0;

let interval;
io.on("connection", socket => {
  console.log("client connected!");

  if (interval) {
	  clearInterval(interval);
	}
	interval = setInterval(() => {
		if (usersQueue.length > 1) {
			while(usersQueue.length > 1) {
				console.log(usersQueue.length);
				let user1 = usersQueue.shift();
				let user2 = usersQueue.shift();
				console.log(usersQueue.length);
				createNewGame(socket, user1, user2);
			}
		}
	}, 3000);

  socket.on("userSubmit", async (data) => {
    console.log("user submitted");
    console.log(data);
    createNewUser(socket, data);
  });
  socket.on("moveSent", async (data) => {
    console.log("move sent");
    console.log(data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


const createNewUser = async (socket, data) => {
  try {
    const newUser = new User({
    	name: data
    });
    newUser.save().then(user => {
    	socket.emit("userCreated", user);
    	usersQueue.push(user);
    	totalUsersCount++;
    	console.log("created new user #" + totalUsersCount + " | " + user.name);
    	console.log("usersQueue is now at: " + usersQueue.length);
    })
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
};
const createNewGame = async (socket, user1, user2) => {
  try {
    const newGame = new Game({
    	users: [user1, user2]
    });
    newGame.save().then(async (game) => {
    	console.log(game._id);
    	Game.
    	  findOne({ id: game._id }).
    	  populate('users').
    	  exec(function (err, populatedGame) {
    	    console.log(populatedGame);
    	    // prints "The author is Ian Fleming"
    	  });

    	socket.emit("newGame", game);
    	console.log("created new game: " + game.id);
    	console.log("usersQueue is now at: " + usersQueue.length);
    })
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
};