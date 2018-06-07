import React, { Component } from 'react';
import '../../styles/App.css';
import ProfilePicture from '../../images/profile-picture.jpg';
import Header from '../Header/Header';
import Body from '../Body/Body';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      profilePicture: ProfilePicture,
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
