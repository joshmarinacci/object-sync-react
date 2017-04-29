/*

next up

turn on prop sheet again
//make delete rect work again

 */
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

class App extends Component {
    constructor(props) {
        super(props);
        //this.store = new PubNubStore("test-channel-"+Math.floor(Math.random()*100000),"STORE");
        this.store = new PubNubStore("test-channel-012","STORE");
        this.store.on('merge', () =>  this.setState({view:this.store.getValue('root')}));
        this.store.on("future",() =>  this.setState({view:this.store.getValue('root')}));
        this.store.connect()
            .then(()=> {
                var r1 = this.store.getValue('root');
                if(r1) {
                    console.log("the root already exists", r1);
                } else {
                    console.log("no root. must recreate");
                    return Promise.resolve()
                        .then(()=> this.store.addToFuture({id: 'x1', type: 'number', value:10, action: 'create'}))
                        .then(()=> this.store.addToFuture({id: 'y1', type: 'number', value:10, action: 'create'}))
                        .then(()=> this.store.addToFuture({id: 'r1', type: 'map', value:{}, action: 'create'}))
                        .then(()=> this.store.addToFuture({id: 'r1', action: 'insert', target: 'x1', at: 'x'}))
                        .then(()=> this.store.addToFuture({id: 'r1', action: 'insert', target: 'y1', at: 'y'}))
                        .then(()=> this.store.addToFuture({id: 'root', type: 'array', value:[], action: 'create'}))
                        .then(()=> this.store.addToFuture({id: 'root', action: 'insert', target: 'r1', at: -1}))
                }
            })
            .then(()=>{
                this.setState({view:this.store.getValue('root')});
            })
        ;


        this.state = {
            view: null,
            selected:null,
            pressed:false
        };

        this.drag_handler = (e)=>{
            if(this.state.pressed && this.state.selected !== null) {
                var dx = e.clientX - this.state.px;
                var dy = e.clientY - this.state.py;
                var obj = this.store.getObject(this.state.selected.id);
                var nx = obj.value.x.value + dx;
                var ny = obj.value.y.value + dy;
                this.store.addToFuture({action: 'update', id: obj.value.x.id, value:nx})
                    .then(()=> this.store.addToFuture({action:'update',id:obj.value.y.id,value:ny}))
                    .then(()=>{
                        this.setState({
                            px: e.clientX,
                            py: e.clientY
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
        var root = this.store.getObject('root');
        Promise.all([
            this.store.createNumber(10),
            this.store.createNumber(10),
            this.store.createMap()
            ]).then((props)=>{
            var x = props[0];
            var y = props[1];
            var r = props[2];
            return Promise.resolve()
                .then(()=> this.store.insertAt(r,x,'x'))
                .then(()=> this.store.insertAt(r,y,'y'))
                .then(()=> this.store.insertAt(root,r,-1))
        })
        .catch((e)=>console.log(e));

    }

    deleteFirstRect() {
        //find first rect
        var rect = this.state.selected;
        if(rect) {
            //remove rect from the doc stream
            this.store.addToFuture({action:'remove',id:'root',at:rect.id});
            this.setState({selected:null})
        }
    }

    render() {
        var root = this.renderToTree(this.store.getObject('root'),0);
        return (
            <div>
                <div>
                    <button onClick={this.createRect.bind(this)}>+ rect</button>
                    <button onClick={this.deleteFirstRect.bind(this)}>- rect</button>
                </div>
                {this.renderToSVG(this.store.getObject('root'))}
                {this.renderPropSheet(this.state.selected)}
                <div>future changes = {this.store.future.length}</div>
                <div>present changes = {this.store.present.length}</div>
                <div>past changes = {this.store.past.length}</div>
                <div>auto send status = {true?"true":"false"}</div>
                <div>network real connected {true?"true":"false"}</div>
                <ul>{root}</ul>
            </div>
        );
    }

    renderToTree(view,i) {
        if(!view) return "empty";
        //array
        if(view.type === 'array') {
            var chs = view.value.map((ch,i)=>this.renderToTree(ch,i));
            return <li key={i}>
                 <b>{view.id}:{view.type}</b>
                <ul>{chs}</ul>
            </li>
        }
        //array marker
        if(view.target) {
            return <b key={i}>{view.exists?"exists":"deleted"} {this.renderToTree(view.value,i)}</b>;
        }
        //map
        if(view.type === 'map') {
            var chs = Object.keys(view.value).map((key,i)=>{
                var ch = view.value[key];
                return <li key={i}>{key} <ul>{this.renderToTree(ch,i)}</ul></li>
            });
            return <li key={i}>
                <b>{view.id}:{view.type}</b>
                <ul>{chs}</ul>
            </li>
        }
        if(view.type == 'number') {
            return <li key={i}>
                <b>{view.id}:{view.type}: {view.value}</b>
                </li>
        }
        return "nothing";
    }

    renderToSVG(root) {
        if(!root) return <svg></svg>;
        return <svg>{
        root.value.map((nd,i) => {
            if(!nd) return "";
            if(nd.exists === false) return "";
            var node = nd.value;
            var clss = "";
            if(this.state.selected && this.state.selected.id == node.id) clss = "selected";
            return <rect
                key={i}
                className={clss}
                x={node.value.x.value}
                y={node.value.y.value}
                width="50px" height="50px" fill="red"
                onMouseDown={this.pressRect.bind(this,node)}
            />
        })}</svg>;
    }

    renderPropSheet(node) {
        if(!node) return <ul></ul>
        return <ul>
            {Object.keys(node.value).map((name,i) => {
                var prop = node.value[name];
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
