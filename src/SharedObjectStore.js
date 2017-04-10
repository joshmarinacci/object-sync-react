/**
 * Created by josh on 4/10/17.
 */

var INITIAL_DOC_STATE = ["root","rect","x","y"];
var INITIAL_CHANGES = [
    { propid:'x1', value:55, type:'number' },
    { propid:'y1', value:35, type:'number' },
    { propid:'rect', type:'map', value:{x:'x1',y:'y1'}},
    { propid:'root', type:'array', value:['rect']}
];

var _store = null;
var DOC_CHANNEL = "document";
var CHANGE_CHANNEL = "changes";
import PubNub from "pubnub";

class SharedObjectStore {
    constructor() {
        this.listeners = [];
        this._past = [];
        this._present = [];
        this._future = [];
        this._doc = [];

        this.pubnub = new PubNub({
            publishKey:"pub-c-119910eb-4bfc-4cfe-93c2-e0706aa01eb4",
            subscribeKey:"sub-c-19b3c544-1e22-11e7-a9ec-0619f8945a4f"
        });


        this.pubnub.history({channel:DOC_CHANNEL},(status,hist)=>{
            var objs = hist.messages.slice().pop().entry.props;
            this._setDocument(objs);
            this.pubnub.history({channel:CHANGE_CHANNEL}, (status, hist) => {
                var changes = hist.messages;
                this._initHistory(changes.slice());
            });
        });

        this.pubnub.addListener(({
            status: (e) => console.log(e),
            message: this.processIncoming.bind(this)
        }));
        this.pubnub.subscribe({channels:[DOC_CHANNEL,CHANGE_CHANNEL]});

        //this.pubnub.publish({channel:DOC_CHANNEL, message:{props:INITIAL_DOC_STATE}})
        //this.pubnub.publish({channel:CHANGE_CHANNEL, message:{changes:INITIAL_CHANGES}});
        //this._setDocument(INITIAL_DOC_STATE);
        //this._initHistory(INITIAL_CHANGES);

        this.rootID = 'root';

    }

    _setDocument(objs) {
        console.log('the properties we must track are',objs);
        this._doc = objs;
    }

    _initHistory(changes) {
        this._past = [];
        changes.forEach((msg)=>{
            msg.entry.changes.forEach((ch) => {
                this._past.push(ch);
            })
        });
        var view = this.calculateCurrentView();
        this.listeners.forEach(cb => cb(view));
    }

    sendToNetwork() {
        console.log("sending future changes",this._future);
        //send to the network
        this.pubnub.publish({
            channel:CHANGE_CHANNEL,
            message: {
                changes: this._future
            }
        });

        //move all items the present buffer
        this._future.forEach((change)=>{
            this._present.push(change);
        });
        this._future = [];
    }

    processIncoming(env) {
        if(env.channel === CHANGE_CHANNEL) {
            console.log('got incoming messages', env);
            console.log("before present is", this._present.slice());
            env.message.changes.forEach((ch)=> {
                console.log("moving change from present to past", ch);
                this._past.push(ch);
                var n = this._present.findIndex(c => c.propid = ch.propid);
                if (n >= 0) this._present.splice(n, 1);
            });
            console.log("after present is", this._present.slice());
            var view = this.calculateCurrentView();
            this.listeners.forEach(cb => cb(view));
        }
    }

    onChange(cb) {
        this.listeners.push(cb);
    }

    getProperty(propid) {
        var history = this._past.concat(this._future).reverse();
        return history.find((p)=>p.propid === propid);
    }
    setProperty(propid,value,type) {
        this._future.push(({
            propid:propid,
            value:value,
            type:type
        }));
        var view = this.calculateCurrentView();
        this.listeners.forEach(cb => cb(view));
    }

    calculateCurrentView() {
        var history = this._past.concat(this._future).reverse();

        var root = history.find((p)=>p.propid == this.rootID);
        if(!root) {
            return {
                id:'root',
                type:'array',
                values:[],
            }
        }
        var rt = {
            id:root.propid,
            type:root.type
        };
        rt.values = root.value.map((name)=>{
            var prop = history.find((pp)=>pp.propid === name);
            var props = {};
            Object.keys(prop.value).map((name)=>{
                var id = prop.value[name];
                var att = history.find((pp)=>pp.propid === id);
                props[name] = {
                    name:name,
                    id:att.propid,
                    type:att.type,
                    value:att.value
                }
            });
            return {
                id:prop.propid,
                type:prop.type,
                props:props
            }
        });
        console.log("the past is",history);
        console.log("found root",rt);
        return rt;
    }
}

module.exports = {
    get: function() {
        if(!_store) _store = new SharedObjectStore();
        return _store;
    }
}
