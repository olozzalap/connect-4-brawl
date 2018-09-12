import React, { Component } from "react";
import socketIOClient from "socket.io-client";
class App extends Component {
  constructor() {
    super();
    this.state = {
      endpoint: "http://127.0.0.1:4001",
      user: null,
      board: null
    };
  }
  componentDidMount() {
    const { endpoint } = this.state;
    this.socket = socketIOClient(endpoint);
    this.socket.on("newUser", (data) => {
      console.log(data);
      this.setState({ user: data });
    });
  }
  sendMove(boardSpace, event) {
    console.log(boardSpace);
    console.log(event);
    console.log(this.socket);
    this.socket.emit('moveSent', boardSpace);
  }
  render() {
    const { user } = this.state;
    return (
      <div style={{ textAlign: "center" }}>
        {user ? 
          <div>
            <h1>
              {user}
            </h1>
          </div>
          : <p>Loading...</p>
        }

        <button onClick={(e) => this.sendMove([3, 5], e)}>Send yer move@!</button>
      </div>
    );
  }
}
export default App;