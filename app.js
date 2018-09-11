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


let interval;
io.on("connection", socket => {
  console.log("Client connected");
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => getApiAndEmit(socket), 7000);
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});


let counter = 1;
const getApiAndEmit = async (socket) => {
  try {
  	counter++;
  	console.log(counter);
    const response = await axios.get(
      "https://www.omdbapi.com/?apikey=aba065d3&s=interstellar"
    ); // test query from OMDBAPI
    // console.log(response.data);
    // console.log(response.status);
    // console.log(response.statusText);
    // console.log(response.headers);
    // console.log(response.config);
    socket.emit("socketResponse", {"counter": counter, "OMDBResponse": response.data}); // Emitting a new message. It will be consumed by the client
  } catch (error) {
  	// console.log(error);
    console.error(`Error: ${error.code}`);
  }
};


server.listen(port, () => console.log(`Listening on port ${port}`));