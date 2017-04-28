import React, { Component } from 'react';
import './App.css';
import PubNubStore from "./PubNubStore";

class PropInput extends Component {
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
            this.props.store.setProperty(prop.id, num, 'number');
        }
        if(prop.type === 'string') {
            this.props.store.setProperty(prop.id, nval, 'string');
        }

    }

    render() {
        return <input ref='input'
                      type="text"
                      value={this.state.value}
                      onChange={this.propChanged.bind(this)}
                      onBlur={this.commit.bind(this)}
        />
    }
}

class App extends Component {
    constructor(props) {
        super(props);
        //this.store = new PubNubStore("test-channel-"+Math.floor(Math.random()*100000),"STORE");
        this.store = new PubNubStore("test-channel-004","STORE");
        this.store.on('merge', () =>  this.setState({view:this.store.getValue('r1')}));
        this.store.on("future",() =>  this.setState({view:this.store.getValue('r1')}));
        this.store.connect()
            .then(()=> {
                var r1 = this.store.getValue('r1');
                if(r1) {
                    console.log("the rect already exists", r1);
                } else {
                    console.log("no rect. must recreate");
                    return Promise.resolve()
                        .then(()=> this.store.addToFuture({id: 'x1', type: 'number', value:10, action: 'create'}))
                        .then(()=> this.store.addToFuture({id: 'y1', type: 'number', value:10, action: 'create'}))
                        .then(()=> this.store.addToFuture({id: 'r1', type: 'map', value:{}, action: 'create'}))
                        .then(()=> this.store.addToFuture({id:'r1', action: 'insert', target: 'x1', at: 'x'}))
                        .then(()=> this.store.addToFuture({id:'r1', action: 'insert', target: 'y1', at: 'y'}))
                }
            })
            .then(()=>{
                this.setState({view:this.store.getValue('r1')});
            })
        ;


        this.state = {
            view: null,
            selected:null,
            pressed:false
        };
        //this.store.onChange((view)=> this.setState({view:view}));

        this.drag_handler = (e)=>{
            if(this.state.pressed && this.state.selected !== null) {
                var dx = e.clientX - this.state.px;
                var dy = e.clientY - this.state.py;
                var obj = this.store.getObject('r1');
                var nx = obj.value.x.value + dx;
                var ny = obj.value.y.value + dy;
                this.store.addToFuture({action: 'update', id: 'x1', value:nx})
                    .then(()=> this.store.addToFuture({action:'update',id:'y1',value:ny}))
                    .then(()=>{
                        this.setState({
                            px: e.clientX,
                            py: e.clientY,
                        });
                    });
            }
        };
        this.release_handler = (e)=>{
            this.setState({pressed:false});
            document.removeEventListener('mousemove',this.drag_handler);
            document.removeEventListener('mouseup',this.release_handler);
            this.store.setAutoSendEnabled(true);
            this.store._publishDeferred();
        };

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
        //if(this.state.selected) {
        //    var sview = this.store.calculateObject(this.state.selected.id);
        //} else {
            var sview = null;
        //}
        return (
            <div>
                <div>
                    <button onClick={this.createRect.bind(this)}>+ rect</button>
                    <button onClick={this.deleteFirstRect.bind(this)}>- rect</button>
                </div>
                {this.renderToSVG(this.state.view)}
                {this.renderPropSheet(sview)}
                <div>future changes = {this.store.future.length}</div>
                <div>present changes = {this.store.present.length}</div>
                <div>past changes = {this.store.past.length}</div>
                <div>auto send status = {true?"true":"false"}</div>
                <div>network real connected {true?"true":"false"}</div>
                <ul>{root}</ul>
            </div>
        );
    }

    renderToTree(view) {
        if(!view) return "empty";
        var props = Object.keys(view).map((key,i)=>{
            var value = view[key];
            return <li key={i}>
                <span>key</span> = <b>{key}</b>
                <span>value</span> = <b>{value}</b>
            </li>
        });

        return props;
    }

    renderToSVG(view) {
        if(!view) return <svg></svg>;
        var rect = <rect x={view.x} y={view.y} width="50px" height="50px" fill="red"
                         onMouseDown={this.pressRect.bind(this,view)}
        />
        return <svg>{rect}</svg>
        /*
        return <svg>{
        view.values.map((node,i) => {
            if(!node) return "";
            var clss = "";
            if(this.state.selected && this.state.selected.id == node.id) clss = "selected";
            return <rect
                key={i}
                className={clss}
                x={node.props.x.value}
                y={node.props.y.value}
                width="50px" height="50px" fill="red"
                onMouseDown={this.pressRect.bind(this,node)}
            />
        })}</svg>;
        */
    }

    renderPropSheet(node) {
        if(!node) return <ul></ul>
        return <ul>
            {Object.keys(node.props).map((name,i) => {
                var prop = node.props[name];
                if(!prop) return <li key={i}></li>
                return <li key={i}>
                    <label>{name}</label>
                    <PropInput prop={prop} store={this.store}/>
                </li>
            })}
        </ul>
    }
    pressRect(node,e) {
        this.setState({pressed:true, px: e.clientX, py: e.clientY, selected: node});
        this.store.setAutoSendEnabled(false);
        document.addEventListener('mousemove',this.drag_handler);
        document.addEventListener('mouseup',this.release_handler)
    }
}

export default App;
