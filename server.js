const express = require("express");
const path = require('path');
const http = require("http");
const socketIO = require("socket.io");
const axios = require("axios");
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const index = require("./routes/index");
const PORT = process.env.PORT || 4000;
// Static port needed to ensure React frontend can connect to Socket.io when deployed
const ioPort = 4797;
const db = require('./config/keys').mongoURI;
const User = require('./models/User');
const Game = require('./models/Game');
// Express server
const app = express()
  .use(express.static(path.join(__dirname, 'client/build')))
  .get('/', (req, res) => {
    res.sendFile(path.join(__dirname+'/client/build/index.html'));
  })

const server = require('http').createServer(app);
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
// Socket.io instance
const io = require("socket.io")(server);

// io.listen(ioPort);
// MongoDB
mongoose.connect(db)
	.then(() => console.log("MongoDB connected"))
	.catch((err) => console.log(err))

let usersQueue = [];
let playingUsersPool = [];
let totalUsersCount = 0;
let interval;

io.on("connection", socket => {
  // Periodic check to spawn new games from the usersQueue. Also maintains the userObj.coket by pushing it into playingUsersPool
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
  }, 1800);

  socket.on("createUser", async (data) => {
    console.log("New user created");
    createNewUser(socket, data);
  });
  socket.on("sendMove", async (data) => {
    sendMove(data);
  });
  socket.on("sendChat", async (data) => {
    sendChat(data);
  });
  socket.on("newMatch", async (data) => {
    console.log("User: " + data.user.name + " wants a new match!");
    usersQueue.push({
    	user: data.user,
    	socket: socket
    });
  });

  socket.on("disconnect", () => {
    let sendingUserInPool = playingUsersPool.filter( (user) => user.socket === socket);
    if (sendingUserInPool[0]) {
    	playingUsersPool.splice(playingUsersPool.indexOf(sendingUserInPool[0]), 1);
    	let usersOpponentInPool = playingUsersPool.filter( (user) => user.user._id === sendingUserInPool[0].opponentId);
    	// Gracefully send a message to the disconnected users opponent and then reset them back to waiting for an opponent after 4 seconds
    	if (usersOpponentInPool[0]) {
    		usersOpponentInPool[0].socket.emit("newChat", {
          userId: "admin", 
          text: "Your opponent left the match so you win by forfeit. We automatically added you back to the queue for the next match",
          date: Date.now()
        });
    		setTimeout(() => usersOpponentInPool[0].socket.emit("gameReset"), 4000)
    		playingUsersPool.splice(playingUsersPool.indexOf(usersOpponentInPool[0]), 1);
    	}
    	console.log("playingUsersPool now is at: " + playingUsersPool.length);
    }
    let sendingUserInQueue = usersQueue.filter( (user) => user.socket === socket);
    if (sendingUserInQueue[0]) {
    	usersQueue.splice(usersQueue.indexOf(sendingUserInQueue[0]), 1);
    	console.log("usersQueue now is at: " + usersQueue.length);
    }
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
    	console.log("created new user #" + totalUsersCount + " | " + user.name + ". usersQueue is now at: " + usersQueue.length);
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
    newGame.save().then(async (game) => {
    	user1.socket.emit("updatedBoardState", game);
    	user2.socket.emit("updatedBoardState", game);
    	console.log("usersQueue is now at: " + usersQueue.length);
    	user1.opponentId = user2.user._id;
    	user2.opponentId = user1.user._id;
    	playingUsersPool.push(user1);
    	playingUsersPool.push(user2);
    })
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
};
const sendMove = (data) => {
	try {
		Game.findById(data.gameId, (err, gameObj) => {
			let game = new Game(gameObj);
			if (game.boardState[data.columnIndex].filter((space) => space === false).length === 0) {
				console.error("This column has no available spaces!");
				let sendingUserInPool = playingUsersPool.filter( (user) => user.user._id.toString() === data.userId.toString());
				sendingUserInPool[0].socket.emit("updatedBoardState", gameObj);
				return false;
			}
			let topAvailableRowIndex;
			for (let i = 0; i < game.boardState[data.columnIndex].length; i++) {
				if (game.boardState[data.columnIndex][i] !== false) {
					topAvailableRowIndex = i - 1;
					break;
				}
				else if (i === game.boardState[data.columnIndex].length - 1) {
					topAvailableRowIndex = i;
				}
			}
			// Update the board state with the users id
			game.boardState[data.columnIndex][topAvailableRowIndex] = data.userId.toString();
			// Now that the boardState is updated let's see if that was a winning move
			if (checkWinCondition(game.boardState, data.columnIndex, topAvailableRowIndex) === true) {
				game.winner = data.userId.toString();
				console.log(data.userId + " is the game winner!");
			}
			// Checks through all game spaces to see if any are still false, otherwise all spaces are taken and its a draw!
			else if (JSON.stringify(game.boardState.map((object, i) => 
					game.boardState[i].filter((space) => space === false).length === 0)
				) === JSON.stringify([true, true, true, true, true, true, true])
			) {
				console.log("its a draw!");
				game.winner = "DRAW";
			}
			else {
				game.users[0].isTurn = !game.users[0].isTurn;
				game.users[1].isTurn = !game.users[1].isTurn;
			}

			game.save((err, savedGame) => {
				let user1InPool = playingUsersPool.filter( (user) => user.user._id.toString() === savedGame.users[0].userId.toString());
				let user2InPool = playingUsersPool.filter( (user) => user.user._id.toString() === savedGame.users[1].userId.toString());
				if (user1InPool.length === 1 && user2InPool.length === 1) {
					user1InPool[0].socket.emit("updatedBoardState", savedGame);
					user2InPool[0].socket.emit("updatedBoardState", savedGame);
					if (savedGame.winner) {
						playingUsersPool.splice(playingUsersPool.indexOf(user1InPool[0]), 1);
						playingUsersPool.splice(playingUsersPool.indexOf(user2InPool[0]), 1);
					}
				}
				else {
					console.error("cant match users to their socket, strange");
				}
			});
		})
	} catch (error) {
		console.error(`Error: ${error.code}`);
	}
};
const sendChat = async(data) => {
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

const checkWinCondition = (boardState, colIndex, rowIndex) => {
	// Up or Down
  if(checkAdjacentSpace(boardState,colIndex,rowIndex,0,1) + checkAdjacentSpace(boardState,colIndex,rowIndex,0,-1) > 2){
    return true;
  }
  // Left or Right
	else if(checkAdjacentSpace(boardState,colIndex,rowIndex,1,0) + checkAdjacentSpace(boardState,colIndex,rowIndex,-1,0) > 2) {
    return true;
  }
  // Diagonals
  else if(checkAdjacentSpace(boardState,colIndex,rowIndex,-1,1) + checkAdjacentSpace(boardState,colIndex,rowIndex,1,-1) > 2) {
      return true;
  }
  else if (checkAdjacentSpace(boardState,colIndex,rowIndex,1,1) + checkAdjacentSpace(boardState,colIndex,rowIndex,-1,-1) > 2) {
  	return true;
  }
  else {
  	return false;
  }
}
const checkAdjacentSpace = (boardState, colIndex, rowIndex, colInc, rowInc) => {
  if( boardState[colIndex] && boardState[colIndex+colInc] &&
  	boardState[colIndex][rowIndex] && boardState[colIndex+colInc][rowIndex+rowInc] &&
  	boardState[colIndex][rowIndex] === boardState[colIndex+colInc][rowIndex+rowInc]
  ){
  	// console.log(colIndex, rowIndex);
  	// console.log(" matches with: ");
  	// console.log(colIndex+colInc, rowIndex+rowInc);
    return 1 + checkAdjacentSpace(boardState, colIndex+colInc, rowIndex+rowInc, colInc, rowInc);
  } else {
    return 0;
  }
}