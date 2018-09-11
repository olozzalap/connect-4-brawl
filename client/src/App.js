import React, { Component } from "react";
import socketIOClient from "socket.io-client";
class App extends Component {
  constructor() {
    super();
    this.state = {
      response: false,
      endpoint: "http://127.0.0.1:4001"
    };
  }
  componentDidMount() {
    const { endpoint } = this.state;
    const socket = socketIOClient(endpoint);
    socket.on("socketResponse", (data) => {
      console.log(data);
      this.setState({ response: data });
    });
  }
  render() {
    const { response } = this.state;
    return (
      <div style={{ textAlign: "center" }}>
        {response ? 
          <div>
            <h1>
              COunting at: {response.counter}
            </h1>
          

            {response.OMDBResponse.Response === 'True' ? 
              <div>
                <h2>We've got {response.OMDBResponse.totalResults} Movies for ya!</h2>
                <ul>
                { response.OMDBResponse.Search.map( (movie, index) =>
                  <li key={movie.imdbID}>#{index} | {movie.Title}</li>
                )}
                </ul>
              </div>
            : <p>No response!??!?!!</p>}
          </div>

          : <p>Loading...</p>}
      </div>
    );
  }
}
export default App;