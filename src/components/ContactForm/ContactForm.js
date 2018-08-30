import React, { Component } from 'react';

class ContactForm extends Component {
    constructor(props) {
      super(props);
      this.state = {
        firstName: '',
        firstNameValid: false,
        lastName: '',
        lastNameIdValid: false,
        email: '',
        emailValid: false,
        subject: '',
        subjectValid: false,
        message: 'Write your message here....',
        messageValid: false,
        formErrors: {
          firstName: '',
          lastName: '',
          email: '',
          subject: '',
          message: ''
        },
        formValid: false
      };
  
      this.handleInputChange = this.handleInputChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
    }
  
    handleInputChange(event) {
      const target = event.target;
      const value = target.type === 'checkbox' ? target.checked : target.value;
      const name = target.name;
  
      this.setState({[name]: value},
        () => { this.validateField(name, value) });
    }

    validateField(fieldName, value) {
      let fieldValidationErrors = this.state.formErrors;
      let emailValid = this.state.emailValid;
      let firstNameValid = this.state.firstNameValid;
      let lastNameValid = this.state.lastNameValid;
  
      switch(fieldName) {
        case 'email':
          emailValid = value.match(/^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i);
          fieldValidationErrors.email = emailValid ? '' : ' is invalid';
          break;
        case 'firstName':
          firstNameValid = value.length >= 1;
          fieldValidationErrors.firstName = firstNameValid ? '': ' is too short';
          break;
        case 'lastName':
          lastNameValid = true; //value.length >= 1;
          fieldValidationErrors.lastName = lastNameValid ? '': ' is too short';
          break;
        default:
          break;
      }
      
      this.setState({formErrors: fieldValidationErrors,
                      emailValid: emailValid,
                      firstNameValid: firstNameValid,
                      lastNameValid: lastNameValid,
                    }, this.validateForm);
    }

    validateForm() {
      this.setState({formValid: this.state.emailValid 
                                && this.state.firstNameValid
                                && this.state.lastNameValid});
    }

    errorClass(error) {
      return(error.length === 0 ? '' : 'has-error');
    }

    showError(field, errorMessage) {
      if(errorMessage) {
        return (
          <p className="error-message">
            {field + " " + errorMessage}
          </p>
        )
      }
    }

    handleSubmit(event) {
        alert("You will be redirected to a formspree page to continue sending the email.");
    }
  
    render() {
      return (
            <div className="ContactForm"> 
                <form onSubmit={this.handleSubmit} 
                      action="https://formspree.io/spdaroya2014@gmail.com" 
                      method="post"
                      target="_blank">
                  <div className="container">
                    <label className="title">Keep in Touch!</label>
                    <label>Name*</label>
                    <div className="firstName">
                      <input
                        name="firstName"
                        type="text"
                        onChange={this.handleInputChange}
                        value={this.state.firstName}
                        className={this.errorClass(this.state.formErrors.firstName)}
                        />
                        {this.showError("First Name", this.state.formErrors.firstName)}
                        <label className="caption">First Name</label>
                    </div>
                    <div className="lastName">
                      <input
                        name="lastName"
                        type="text"
                        onChange={this.handleInputChange}
                        value={this.state.lastName}
                        className={this.errorClass(this.state.formErrors.lastName)}
                        />
                        {this.showError("Last Name", this.state.formErrors.lastName)}
                        <label className="caption">Last Name</label>
                    </div>
                  </div>
                  <br/>
                  <div className="container">
                      <label>Email*</label>
                      <input
                        name="email"
                        type="text"
                        onChange={this.handleInputChange}
                        value={this.state.email} />
                        {this.showError("Email", this.state.formErrors.email)}
                  </div>
                  <br/>
                  <div className="container">
                      <label>Subject</label>
                      <input
                        name="subject"
                        type="text"
                        onChange={this.handleInputChange}
                        value={this.state.subject} />
                        {this.showError("Subject", this.state.formErrors.subject)}
                  </div>
                  <br/>
                  <div className="container">
                      <label>Message</label>
                      <textarea name="message" rows="4" cols="50" value={this.state.message} onChange={this.handleInputChange} />
                      <input className="form-submit" type="submit" value="Submit" disabled={!this.state.formValid} />
                  </div>
                  <br/>

                </form>
            </div>
      );
    }
  }

export default ContactForm; 