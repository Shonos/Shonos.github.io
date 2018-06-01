import React, { Component } from 'react';

export class BoxKeyValuePair extends Component {
    renderKey() {
        if(this.props.box.link) {
            return  <span className="Key">
                        <a href={this.props.box.link}>{this.props.box.key}</a>
                    </span>
        }
        else {
            return  <span className="Key">
                        {this.props.box.key}
                    </span>
        }
    }
    render() {
        return  <div className="Box"> 
                    {this.renderKey()}
                    <span className="Item">
                        {this.props.box.item}
                    </span>
                </div>
    }
}

export default BoxKeyValuePair; 