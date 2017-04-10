import React, { Component } from 'react';
import './App.css';
var SharedObjectStore = require("./SharedObjectStore");

class App extends Component {
    constructor(props) {
        super(props);
        this.store = SharedObjectStore.get();
        this.state = {
            view: this.store.calculateCurrentView()
        };
        this.store.onChange((view)=>{
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
    createRect() {
        //make x
        var x = this.store.createNumber();
        this.store.setProperty(x.propid,0,'number');
        //make y
        var y = this.store.createNumber();
        this.store.setProperty(y.propid,0,'number');

        //make rect
        var rect = this.store.createMap();
        this.store.setProperty(rect.propid, {x: x.propid, y: y.propid},'map');

        //make root
        var root = this.store.getProperty('root');
        var root_val = root.value.slice();
        root_val.push(rect.propid);
        console.log('new root value = ',root_val);
        this.store.setProperty(root.propid,root_val,'array');

    }

    render() {
        var root = this.renderToTree(this.state.view);
        return (
            <div>
                <ul>{root}</ul>
                <button onClick={this.moveBack.bind(this)}>move left</button>
                <button onClick={this.move.bind(this)}>move right</button>
                <button onClick={this.send.bind(this)}>send</button>
                <button onClick={this.createRect.bind(this)}>+ rect</button>
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
