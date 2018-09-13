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
let playingUsersPool = [];
let totalUsersCount = 0;
let interval;

io.on("connection", socket => {
  console.log("client connected!");
  // Periodic check to spawn new games from the usersQueue
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => {
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
  socket.on("sendMove", async (data) => {
    console.log("move sent");
    console.log(data);
    sendMove(data);
  });
  socket.on("sendChat", async (data) => {
    console.log("chat sent");
    console.log(data);
    sendChat(data);
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
    		userId: user1.user._id,
    		isTurn: false
    	}, {
    		name: user2.user.name,
    		userId: user2.user._id,
    		isTurn: true
    	}]
    });
    console.log(newGame.users);
    newGame.save().then(async (game) => {
    	console.log(game.users);
    	user1.socket.emit("updatedBoardState", game);
    	user2.socket.emit("updatedBoardState", game);
    	console.log("usersQueue is now at: " + usersQueue.length);
    	playingUsersPool.push(user1);
    	playingUsersPool.push(user2);
    })
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
};
const sendMove = async(data) => {
	Game.findById(data.gameId, (err, game) => {
		if (game.boardState[data.columnIndex].filter((space) => space === false).length === 0) {
			console.error("This column has no available spaces!");
		}
		let topAvailableSpace;
		for (let i = 0; i < game.boardState[data.columnIndex].length; i++) {
			if (game.boardState[data.columnIndex][i] !== false) {
				topAvailableSpace = i - 1;
				break;
			}
			else if (i === game.boardState[data.columnIndex].length - 1) {
				topAvailableSpace = i;
			}
		}
		console.log(topAvailableSpace);
		game.boardState[data.columnIndex][topAvailableSpace] = String(data.userId);
		console.log(game.boardState[data.columnIndex][topAvailableSpace]);
		game.users[0].isTurn = !game.users[0].isTurn;
		game.users[1].isTurn = !game.users[1].isTurn;

		game.save().then(async (savedGame) => {
			let user1InPool = playingUsersPool.filter( (user) => user.user._id.toString() === game.users[0].userId.toString());
			let user2InPool = playingUsersPool.filter( (user) => user.user._id.toString() === game.users[1].userId.toString());
			if (user1InPool.length === 1 && user2InPool.length === 1) {
				user1InPool[0].socket.emit("updatedBoardState", savedGame);
				user2InPool[0].socket.emit("updatedBoardState", savedGame);
			}
			else {
				console.error("cant match users to their socket, strange");
			}
		})
	})
};
const sendChat = async(data) => {
	console.log(data);
	Game.findById(data.gameId, (err, game) => {
		let user1InPool = playingUsersPool.filter( (user) => user.user._id.toString() === game.users[0].userId.toString());
		let user2InPool = playingUsersPool.filter( (user) => user.user._id.toString() === game.users[1].userId.toString());
		if (user1InPool.length === 1 && user2InPool.length === 1) {
			user1InPool[0].socket.emit("newChat", data);
			user2InPool[0].socket.emit("newChat", data);
		}
		else {
			console.error("cant match users to their socket, strange");
		}
	});
}