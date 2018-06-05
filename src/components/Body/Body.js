import React, { Component } from 'react';
import BoxKeyValuePair from '../BoxKeyValuePair/BoxKeyValuePair';

let leftItemBoxes = [
    {
        "id": 1,
        "key": "skills/languages",
        "item": "VanillaJS, C#, CSS, HTML, AngularJS, SQL Server"
    },
    {
        "id": 2,
        "key": "learning/trying",
        "item": "ReactJS, SASS, Angular(5+?)"
    },
    {
        "id": 3,
        "key": "available for",
        "item": "new project member, research, freelance, anything related to coding" 
    }
];

let centerItemBoxes = [
    {
        "id": 1,
        "key": "Gurukool",
        "item": "A web app for competing with other users in a quiz duel manner. Gurukool was designed to make users learn about different subjects. My role was implementing real time responsive UI as players answer quizzes simultaneously to show proper statistics.",
        "projectInformation": {
            "dateStart": "",
            "dateEnd": "",
            "toolsUsed": "AngularJS, HTML5/CSS, C#, SQL"
        }
    },
    {
        "id": 2,
        "key": "AcumenData CAAPS",
        "item": "CAAPS is a web app designed to fully integrate, customize and automate accounts payable functions. My role was implementing user interfaces and its required API, database maintenance and stored procedures with SQL",
        "projectInformation": {
            "dateStart": "",
            "dateEnd": "",
            "toolsUsed": "AngularJS, HTML5/CSS, C#, SQL Reporting Services"
        }
    }
]

let rightItemBoxes = [
    {
        "id": 1,
        "key": "shonos.github.io",
        "item": "source code for this page you are viewing",
        "link": "https://github.com/Shonos/Shonos.github.io/tree/develop"
    }
]


export class Body extends Component {
    constructor(props) {
        super(props);
        this.state = {
            leftItemBoxes: leftItemBoxes,
            rightItemBoxes: rightItemBoxes,
            centerItemBoxes: centerItemBoxes
        };
    }
    render() {
        return  <div className="Body-section">
                    <div className="Left-items">
                        { leftItemBoxes.map(x => {return <BoxKeyValuePair key={x.id} box={x} setPageHandler={this.props.setPageHandler} />;}) }  
                    </div>
                    <div className="Middle-items">
                        { centerItemBoxes.map(x => {return <BoxKeyValuePair key={x.id} box={x} setPageHandler={this.props.setPageHandler} />;}) }   
                    </div>
                    <div className="Right-items">
                        { rightItemBoxes.map(x => {return <BoxKeyValuePair key={x.id} box={x} setPageHandler={this.props.setPageHandler} />;}) }
                    </div>
                </div>
    }
}

export default Body; 