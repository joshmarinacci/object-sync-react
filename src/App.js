import React, { Component } from 'react';
import './App.css';
var SharedObjectStore = require("./SharedObjectStore");

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            view: SharedObjectStore.get().calculateCurrentView()
        };
        SharedObjectStore.get().onChange((view)=>{
            this.setState({view:view});
        });
    }
    move() {
        var store = SharedObjectStore.get();
        var prop = store.getProperty('x1');
        store.setProperty('x1',prop.value+10,'number');
    }
    moveBack() {
        var store = SharedObjectStore.get();
        var prop = store.getProperty('x1');
        store.setProperty('x1',prop.value-10,'number');
    }
    send() {
        var store = SharedObjectStore.get();
        store.sendToNetwork();
    }

    render() {
        var root = this.renderToTree(this.state.view);
        return (
            <div>
                <ul>{root}</ul>
                <button onClick={this.moveBack.bind(this)}>move left</button>
                <button onClick={this.move.bind(this)}>move right</button>
                <button onClick={this.send.bind(this)}>send</button>
                <svg>
                    {this.renderToSVG(this.state.view)}
                </svg>
            </div>
        );
    }

    renderToTree(view) {
        var nodes = view.values.map((ch,i)=>{
            var props = Object.keys(ch.props).map((name,i)=>{
                var prop = ch.props[name];
                return <li key={i}>
                    name = <b>{prop.name}</b>
                    id = <b>{prop.id}</b>
                    type = <b>{prop.type}</b>
                    value = <b>{prop.value}</b>
                </li>
            });
            return <li key={i}> id = {ch.id} <ul>{props}</ul></li>
        });
        return nodes;
    }

    renderToSVG(view) {
        return view.values.map((node,i) => {
            return <rect
                key={i}
                x={node.props.x.value}
                y={node.props.y.value}
                width="50px" height="50px" fill="red"/>
        });
    }
}

export default App;
