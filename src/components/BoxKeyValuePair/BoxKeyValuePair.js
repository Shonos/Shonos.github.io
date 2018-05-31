import React, { Component } from 'react';

export class BoxKeyValuePair extends Component {
    render() {
        return  <div className="Box"> 
                    <span className="Key">
                        {this.props.box.key}
                    </span>
                    <span className="Item">
                        {this.props.box.item}
                    </span>
                </div>
    }
}

export default BoxKeyValuePair; 