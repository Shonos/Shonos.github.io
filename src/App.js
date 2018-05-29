import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Hello World, my name is Shaun Daroya</h1>
        </header>
        <p className="App-intro">
          I wanted to create an online portfolio but I am still planning. Please wait!
        </p>
      </div>
    );
  }
}

export default App;
