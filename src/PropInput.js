import React, { Component } from 'react';


export default class PropInput extends Component {
    constructor(props) {
        super(props);
        if(props.prop) {
            this.state = {
                value: props.prop.value
            }
        }
    }
    componentWillReceiveProps(nextProps) {
        if(nextProps.prop && nextProps.prop.value != this.state.value) {
            this.setState({
                value: nextProps.prop.value
            })
        }
    }
    propChanged() {
        var nval = this.refs.input.value;
        this.setState({
            value:nval
        });
    }
    commit() {
        var prop = this.props.prop;
        var nval = this.state.value;
        if(prop.type === 'number') {
            var num = parseFloat(nval);
            this.props.store.updateValue(prop,num);
        }
        if(prop.type === 'string') {
            this.props.store.updateValue(prop,nval);
        }

    }
    keypressed(e) {
        if(e.keyCode === 13) return this.commit();
    }

    render() {
        return <input ref='input'
                      type="text"
                      value={this.state.value}
                      onChange={this.propChanged.bind(this)}
                      onKeyDown={this.keypressed.bind(this)}
                      onBlur={this.commit.bind(this)}
        />
    }
}

