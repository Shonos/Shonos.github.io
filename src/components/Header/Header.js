import React, { Component } from 'react';
import twitterLogo from '../../images/Twitter_Bird.svg';
import linkedinLogo from '../../images/linked_in.png';
import facebookLogo from '../../images/facebook.svg';

export class Header extends Component {
    render() {
        return <header className="Header">
                    <div className="Header-left-box">
                        <img className="Header-profile-image" src={this.props.profilePicture}/>
                    </div>
                    <div className="Header-middle-box">
                        <span className="Dev-name">
                            Shaun Daroya
                        </span>
                        <span className="Dev-skills">
                            Front End | Back End | Database 
                        </span>
                        <span className="Dev-links">
                            <a href="https://twitter.com/ShaunTheRoya">
                                <img src={twitterLogo} alt="@ShaunTheRoya"/>
                            </a>
                            <a href="https://linkedin.com/in/shaundaroya/">
                                <img src={linkedinLogo} alt="Shaun Daroya Linked In"/>
                            </a>
                            <a href="https://facebook.com/shaun.daroya">
                                <img src={facebookLogo} alt="Shaun Daroya Facebook"/>
                            </a>
                        </span>
                    </div>
                    <div className="Header-right-box">
                    </div>
                </header>
    }
}

export default Header; //<img className="Header-profile-image" src={this.props.profilePicture}/>