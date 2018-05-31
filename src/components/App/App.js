import React, { Component } from 'react';
import '../../styles/App.css';
import ProfilePicture from '../../images/profile-picture.jpg';
import Header from '../Header/Header';
import Body from '../Body/Body';

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
        <Body />
      </div>
    );
  }
}

export default App;
