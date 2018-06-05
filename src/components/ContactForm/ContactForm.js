import React, { Component } from 'react';

class ContactForm extends Component {
    constructor(props) {
      super(props);
      this.state = {
        firstName: '',
        lastName: '',
        emailAddress: '',
        subject: '',
        message: ''
      };
  
      this.handleInputChange = this.handleInputChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
    }
  
    handleInputChange(event) {
      const target = event.target;
      const value = target.type === 'checkbox' ? target.checked : target.value;
      const name = target.name;
  
      this.setState({
        [name]: value
      });
    }

    handleSubmit(event) {
        alert('A name was submitted: ' + this.state.value);
        event.preventDefault();
    }
  
    render() {
      return (
            <div className="ContactForm"> 
                <form onSubmit={this.handleSubmit}>
                <label>Keep in Touch!</label>
                    <div className="container">
                      <label>Name</label>
                      <div className="firstName">
                        <input
                          name="firstName"
                          type="text"
                          onChange={this.handleInputChange} />
                          <label>First Name</label>
                      </div>
                      <div className="lastName">
                        <input
                          name="lastName"
                          type="text"
                          onChange={this.handleInputChange} />
                          <label>Last Name</label>
                      </div>
                    </div>
                    <div className="container">
                        <label>Email</label>
                        <input
                          name="email"
                          type="text"
                          onChange={this.handleInputChange} />
                    </div>
                    <div className="container">
                        <label>Subject</label>
                        <input
                          name="subject"
                          type="text"
                          onChange={this.handleInputChange} />
                    </div>

                    <br />
                    <input type="submit" value="Submit" />
                </form>
            </div>
      );
    }
  }

export default ContactForm; 