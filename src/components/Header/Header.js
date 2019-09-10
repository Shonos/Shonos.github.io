import React, { Component } from 'react';
import BoxKeyValuePair from '../BoxKeyValuePair/BoxKeyValuePair';
import twitterLogo from '../../images/Twitter_Bird.svg';
import linkedinLogo from '../../images/linked_in.png';
import facebookLogo from '../../images/facebook.svg';

let rightItemBoxes = [
    {
        "id": 1,
        "key": "location",
        "item": "Quezon City, Philippines"
    },
    {
        "id": 2,
        "key": "website last updated",
        "item": "September 10, 2019"
    },
    {
        "id": 3,
        "key": "work",
        "item": "Software Engineer at Blast Asia"
    },
];

export class Header extends Component {
    constructor(props) {
        super(props);
        this.state = {
            rightItemBoxes: rightItemBoxes
        };
    }
    render() {
        return <header className="Header">
                    <div className="Header-left-box">
                          <img className="Header-profile-image" src={this.props.profilePicture}/>
                    </div>
                    <div className="Header-middle-box">
                        <span className="Dev-name">
                            Shaun Daroya
                        </span>
                        <span className="Dev-description">
                            Web Developer from Manila/Quezon City, Philippines
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
                        { rightItemBoxes.map(x => {return <BoxKeyValuePair key={x.id} box={x} />;}) } 
                    </div>
                </header>
    }
}

export default Header;