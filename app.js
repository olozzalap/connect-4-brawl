const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");

const port = process.env.PORT || 4001;
const index = require("./routes/index");
const app = express();
app.use(index);

const server = http.createServer(app);
const io = socketIo(server);
server.listen(port, () => console.log(`Listening on port ${port}`));

// Each sub-array represents each of the seven game board columns going from top to bottom
// Each value is null when unused and will be updated with a users id once the space is occupied. For example from this newBoard if a user (id: '123') selects the third column than newBoard[2][5] === '123'. If the competing user (id: '456') then selects the third column again, since the bottom position (newBoard[2][5]) is occupied, than newBoard[2][4] === '456'
const newBoard = [
	[null, null, null, null, null, null],
	[null, null, null, null, null, null],
	[null, null, null, null, null, null],
	[null, null, null, null, null, null],
	[null, null, null, null, null, null],
	[null, null, null, null, null, null],
	[null, null, null, null, null, null]
];
let usersQueue = [];


io.on("connection", socket => {
  console.log("New user joining queue");
  createNewUser(socket);

  socket.on("moveSent", (data) => {
    console.log("move sent");
    console.log(data);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


// let counter = 1;
const createNewUser = async (socket) => {
  try {
    // const response = await axios.get(
    //   "https://www.omdbapi.com/?apikey=aba065d3&s=interstellar"
    // );
    console.log("created new user");
    setTimeout( () => socket.emit("newUser", "blorgalflooorpzz"), 3777);
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
};