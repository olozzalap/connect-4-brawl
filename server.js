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
  // Periodic check to spawn new games from the usersQueue
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => {
  	console.log(usersQueue.length);
  	if (usersQueue.length > 1) {
  		while(usersQueue.length > 1) {
  			let user1 = usersQueue.shift();
  			let user2 = usersQueue.shift();
  			createNewGame(user1, user2);
  		}
  	}
  }, 3000);

  socket.on("createUser", async (data) => {
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
    	usersQueue.push({
    		user: user,
    		socket: socket
    	});
    	totalUsersCount++;
    	console.log("created new user #" + totalUsersCount + " | " + user.name);
    	console.log("usersQueue is now at: " + usersQueue.length);
    })
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
};
const createNewGame = async (user1, user2) => {
  try {
    const newGame = new Game({
    	users: [{
    		name: user1.user.name,
    		userId: user1.user._id
    	}, {
    		name: user2.user.name,
    		userId: user2.user._id
    	}]
    });
    newGame.save().then(async (game) => {
    	console.log(game);
    	user1.socket.emit("newGame", game);
    	user2.socket.emit("newGame", game);
    	console.log("usersQueue is now at: " + usersQueue.length);
    })
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
};