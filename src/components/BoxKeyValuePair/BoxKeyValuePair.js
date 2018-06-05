import React, { Component } from 'react';

export class BoxKeyValuePair extends Component {
    renderKey() {
        if(this.props.box.link) {
            return  <span className="Key">
                        <a href={this.props.box.link}>{this.props.box.key}</a>
                    </span>
        }
        else if(this.props.box.projectInformation) {
            return <span className="Key">
                <a href="" onClick={(e)=>this.props.setPageHandler(e, "projectView", this.props.box.key)}>{this.props.box.key}</a>
            </span>
        }
        else {
            return  <span className="Key">
                        {this.props.box.key}
                    </span>
        }
    }
    renderProjectInformation() {
        if(this.props.box.projectInformation) {
            return  <span className="Item">
                        Tools Used: {this.props.box.projectInformation.toolsUsed}
                    </span>
        }
    }
    render() {
        return  <div className="Box"> 
                    {this.renderKey()}
                    <span className="Item">
                        {this.props.box.item}
                    </span>
                    {this.renderProjectInformation()}
                </div>
    }
}

export default BoxKeyValuePair; 