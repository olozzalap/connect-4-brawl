import React, { Component } from "react";
import socketIOClient from "socket.io-client";

class App extends Component {
  constructor() {
    super();
    this.state = {
      endpoint: "http://127.0.0.1:4001",
      userNameText: '',
      chatText: '',
      user: null,
      board: null,
      opponent: null,
      gameId: null,
      chats: []
    };
  }
  componentDidMount() {
    const { endpoint } = this.state;
    this.socket = socketIOClient(endpoint);
    this.socket.on("userCreated", (data) => {
      console.log(data);
      this.setState({ user: data });
    });
    this.socket.on("updatedBoardState", (data) => {
      let opponent;
      if (data.users[0].name !== this.state.user.name) {
        opponent = data.users[0];
      }
      else if (data.users[1].name !== this.state.user.name) {
        opponent = data.users[1];
      }
      else {
        alert("strange we didn't get the opponents username");
      }
      this.setState({ board: data.boardState, opponent: opponent, gameId: data._id });
      console.log(this.state);
    });
    this.socket.on("newChat", (data) => {
      console.log(data);
      console.log(this.state.chats);
      let newChats = this.state.chats;
      newChats.push(data);
      this.setState({ chats: newChats});
      console.log(this.state.chats);
    });
  }
  updateUserNameText(event) {
    this.setState({userNameText: event.target.value});
  }
  updateChatText(event) {
    this.setState({chatText: event.target.value});
  }
  createUser(event) {
    event.preventDefault();
    this.socket.emit('createUser', this.state.userNameText);
  }
  parseBoardMarkup() {
    // console.log("parsing board markup");
    // console.log(this.state.board);
    let board = []

    for (let i = 0; i < this.state.board.length; i++) {
      let columnSpaces = []
      for (let j = 0; j < this.state.board[i].length; j++) {
        let classes = "board-space ";
        if (this.state.board[i][j] === this.state.user._id) {
          classes += 'users';
        }
        else if (this.state.board[i][j] === this.state.opponent.userId) {
          classes += 'opponents';
        }
        columnSpaces.push(<div className={classes} key={i + ", " + j}></div>)
      }
      let columnClasses = "board-column ";
      if (this.state.board[i].filter( (space) => space === false).length === 0 ) {
        columnClasses += 'full-column';
      }
      board.push(<article className={columnClasses} key={i} onClick={
        (e) => columnClasses.indexOf('full-column') === -1 ? this.sendMove(i, e) : null}>
          {columnSpaces}
        </article>);
    }
    return board
  }
  parseChats() {
    let chatsArr = [];
    for (let i = 0; i < this.state.chats.length; i++) {
      chatsArr.push(<div style={{clear: "both"}} key={this.state.chats[i].userId + this.state.chats[i].text}><p className={this.state.chats[i].userId === this.state.opponent.userId ? 'opponents' : 'users'}>{this.state.chats[i].text}</p></div>)
    }
    return chatsArr;
  }
  sendMove(columnIndex, event) {
    console.log(columnIndex);

    this.socket.emit('sendMove', {columnIndex: columnIndex, gameId: this.state.gameId, userId: this.state.user._id});
  }
  sendChat(event) {
    event.preventDefault();
    this.socket.emit('sendChat', {text: this.state.chatText, userId: this.state.user._id, gameId: this.state.gameId}); 
    this.setState({chatText: ""});
  }

  render() {
    const { user, opponent, chats } = this.state;
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
              {opponent ? 
                <div>
                  {opponent.isTurn ?
                    <p>Waiting on {opponent.name} to make a move!</p>
                  : <p>Your opponent is {opponent.name}</p>}

                  <section className={(opponent.isTurn) ? 'board opponents-turn' : 'board'}>
                    {this.parseBoardMarkup()}
                  </section>

                  <aside className="chat">
                    <h2>Chat</h2>
                    {this.parseChats()}
                    <form onSubmit={(e) => this.sendChat(e)}>
                      <label>
                        Chat with {opponent.name}
                        <textarea value={this.state.chatText} onChange={(e) => this.updateChatText(e)} ></textarea>
                      </label>
                      <input type="submit" value="Submit" />
                    </form>
                  </aside>
                </div>
                : <h3> Waiting for an opponent, prepare for the brawl</h3>
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