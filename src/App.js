import React, { Component } from 'react';
import './App.css';
var SharedObjectStore = require("./SharedObjectStore");

class App extends Component {
    constructor(props) {
        super(props);
        this.store = SharedObjectStore.get();
        this.state = {
            view: this.store.calculateCurrentView(),
            selected:null,
            pressed:false
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
        //make the rect and parts
        var x = this.store.createNumber(0);
        var y = this.store.createNumber(0);
        var name = this.store.createString("my cool rect");
        var rect = this.store.createMap({x: x.propid, y: y.propid, name:name.propid});

        //make root
        var root = this.store.getProperty('root');
        var root_val = root.value.slice();
        root_val.push(rect.propid);
        this.store.setProperty(root.propid,root_val,'array');
    }

    deleteFirstRect() {
        //find first rect
        var rect = this.state.selected;
        if(rect) {
            //remove rect from the doc stream
            this.store.deleteProperty(rect.id);
            //remove rect from the root
            var root = this.store.getProperty('root');
            var root_val = root.value.slice();
            root_val = root_val.filter((id) => id!=rect.id);
            this.store.setProperty(root.propid,root_val,'array');
            this.setState({selected:null})
        }
    }

    render() {
        var root = this.renderToTree(this.state.view);
        return (
            <div>
                <div>
                    <button onClick={this.moveBack.bind(this)}>move left</button>
                    <button onClick={this.move.bind(this)}>move right</button>
                    <button onClick={this.send.bind(this)}>send</button>
                    <button onClick={this.createRect.bind(this)}>+ rect</button>
                    <button onClick={this.deleteFirstRect.bind(this)}>- rect</button>
                </div>
                {this.renderToSVG(this.state.view)}
                <div>future changes = {this.store.getFutureCount()}</div>
                <div>present changes = {this.store.getPresentCount()}</div>
                <div>past changes = {this.store.getPastCount()}</div>
                <ul>{root}</ul>
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
        return <svg
            onMouseUp={this.clearMouse.bind(this)}
        >{
        view.values.map((node,i) => {
            var clss = "";
            if(this.state.selected) {
                if(this.state.selected.id == node.id) {
                    clss = "selected";
                }
            }
            return <rect
                key={i}
                className={clss}
                x={node.props.x.value}
                y={node.props.y.value}
                width="50px" height="50px" fill="red"
                onClick={this.clickRect.bind(this,node)}

                onMouseDown={this.pressRect.bind(this,node)}
                onMouseMove={this.dragRect.bind(this,node)}
                onMouseUp={this.releaseRect.bind(this,node)}
            />
        })}</svg>;
    }
    clickRect(node,e) {
        this.setState({
            selected:node
        })
    }

    pressRect(node,e) {
        this.setState({pressed:true, px: e.clientX, py: e.clientY});
    }
    dragRect(node,e) {
        if(this.state.pressed === true) {
            var dx = e.clientX - this.state.px;
            var dy = e.clientY - this.state.py;
            this.store.setProperty(node.props.x.id, node.props.x.value+dx,'number');
            this.store.setProperty(node.props.y.id, node.props.y.value+dy,'number');
            this.setState({px: e.clientX, py: e.clientY});

        }
    }
    releaseRect(node,e) {
        this.setState({pressed:false});
    }
    clearMouse() {
        this.setState({pressed:false, px:0, py:0});
    }
}

export default App;
