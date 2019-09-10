import React, { Component } from 'react';
import '../../styles/App.css';
import Header from '../Header/Header';
import Body from '../Body/Body';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      profilePicture: 'https://media.licdn.com/dms/image/C5103AQFyeQ6iwGggaA/profile-displayphoto-shrink_200_200/0?e=1573689600&v=beta&t=Px_ybwXT9JSAhkFhvc0GLDawIOT3K99g7UUGtMtXgiY',
      currentPage: "home",
      project: ""
    };
    this.setPageHandler = this.setPageHandler.bind(this);
  }

  setPageHandler(e, page, param) {
    e.preventDefault();
    alert("Demo for " + param + " coming soon - shaun");
    /*this.setState({
      currentPage: "home",
      project: param
    })*/
  }

  renderPage() {
    if(this.state.currentPage === "home") {
        return  <div className="App App-container">
                  <Header profilePicture={this.state.profilePicture} />
                  <Body setPageHandler={this.setPageHandler} />
                </div>
    }
    else if(this.state.currentPage === "projectView") {
      return  <div className="App App-container">
                  <Body setPageHandler={this.setPageHandler} />
              </div>
    }
  }
  render() {
    return (
        <div>
            {this.renderPage()}
        </div>
    );
  }
}

export default App;
