import React, { Component } from 'react';
//import logo from '../../logo.svg';
import '../../styles/App.css';
import ProfilePicture from '../../images/profile-picture.jpg';
import Header from '../Header/Header'

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      profilePicture: ProfilePicture
    };
  }
  render() {
    return (
      <div className="App App-container">
        <Header profilePicture={this.state.profilePicture} />
      </div>
    );
  }
}

export default App;
