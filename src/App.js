import React, { Component } from 'react';
import './App.css';
var SharedObjectStore = require("./SharedObjectStore");

class App extends Component {
    render() {
        var store= SharedObjectStore.get();
        var view = store.calculateCurrentView();
        var root = this.renderToTree(view);
        return (
            <div>
                <ul>{root}</ul>
                <svg>
                    {this.renderToSVG(view)}
                </svg>
            </div>
        );
    }

    renderToTree(view) {
        console.log("the initial view is",view);
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
