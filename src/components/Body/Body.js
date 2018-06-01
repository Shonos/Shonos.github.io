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
        "item": "new project member, research, freelance, anything related to coding ;)" 
    }
];

let rightItemBoxes = [
    {
        "id": 1,
        "key": "shonos.github.io",
        "item": "source code for this page you are viewing",
        "link": "https://github.com/Shonos/Shonos.github.io"
    }
]



export class Body extends Component {
    constructor(props) {
        super(props);
        this.state = {
            leftItemBoxes: leftItemBoxes,
            rightItemBoxes: rightItemBoxes
        };
    }
    render() {
        return  <div className="Body-section">
                    <div className="Left-items">
                        { leftItemBoxes.map(x => {return <BoxKeyValuePair key={x.id} box={x} />;}) }  
                    </div>
                    <div className="Middle-items">

                    </div>
                    <div className="Right-items">
                        { rightItemBoxes.map(x => {return <BoxKeyValuePair key={x.id} box={x} />;}) }
                    </div>
                </div>
    }
}

export default Body; 