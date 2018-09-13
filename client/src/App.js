import React, { Component } from "react";
import socketIOClient from "socket.io-client";

class App extends Component {
  constructor() {
    super();
    this.state = {
      endpoint: "http://127.0.0.1:4001",
      userNameText: '',
      user: null,
      board: null,
      opponentName: null
    };
  }
  componentDidMount() {
    const { endpoint } = this.state;
    this.socket = socketIOClient(endpoint);
    this.socket.on("userCreated", (data) => {
      console.log(data);
      this.setState({ user: data });
    });
    this.socket.on("newGame", (data) => {
      let opponentName;
      if (data.users[0].name !== this.state.user.name) {
        opponentName = data.users[0].name;
      }
      else if (data.users[1].name !== this.state.user.name) {
        opponentName = data.users[1].name;
      }
      else {
        alert("strange we didn't get the opponents username");
      }
      this.setState({ board: data.boardState, opponentName: opponentName });
      console.log(this.state);
    });
  }
  updateUserNameText(event) {
    this.setState({userNameText: event.target.value});
  }
  createUser(event) {
    event.preventDefault();
    this.socket.emit('createUser', this.state.userNameText);
  }
  sendMove(boardSpace, event) {
    console.log(boardSpace);
    console.log(event);
    console.log(this.socket);
    this.socket.emit('moveSent', boardSpace);
  }

  render() {
    const { user, board, opponentName } = this.state;
    return (
      <div>
        <header>
          <h1>CONNECT4 Brawl</h1>
        </header>
        <main>
          {user ? 
            <div>
              <h2>
                Hello {user.name}, good luck!
              </h2>
              {opponentName ? 
                <div>
                  <p>Your opponent is {opponentName}</p>
                  <button onClick={(e) => this.sendMove([3, 5], e)}>Send yer move@!</button>
                </div>
                : <h3> Waiting for an opponet, prepare for the brawl</h3>
              }
            </div>
            :  <form onSubmit={(e) => this.createUser(e)}>
                <label>
                  Enter your name for the Brawl!:
                  <input type="text" value={this.state.userNameText} onChange={(e) => this.updateUserNameText(e)} />
                </label>
                <input type="submit" value="Submit" />
              </form>
          }
        </main>
      </div>
    );
  }
}
export default App;