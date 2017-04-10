/**
 * Created by josh on 4/10/17.
 */

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

        /*
        this.pubnub.getHistory(DOC_CHANNEL,(status,hist)=>{
            console.log("got the doc",status,hist);
            var objs = hist[0];
            console.log('the current objects are',objs);
            this._setDocument(objs);
            this.pubnub.getHistory(CHANGE_CHANNEL, (status, hist) => {
                console.log("got the changes",status,hist);
                var changes = hist[0];
                console.log("the previous changes are", changes);
                this._initHistory(changes);
            });
        })*/
        this.pubnub.addListener(({
            status: (e) => console.log(e),
            message: this.processIncoming.bind(this)
        }));
        this.pubnub.subscribe({channels:[DOC_CHANNEL,CHANGE_CHANNEL]});

        this._setDocument(["root","rect","x","y"]);
        this._initHistory([
            { propid:'x1', value:55, type:'number' },
            { propid:'y1', value:35, type:'number' },
            { propid:'rect', type:'map', value:{x:'x1',y:'y1'}},
            { propid:'root', type:'array', value:['rect']}
        ]);

        this.rootID = 'root';

    }

    _setDocument(objs) {
        console.log('the properties we must track are',objs);
        this._doc = objs;
    }

    _initHistory(changes) {
        console.log('the history is',changes);
        this._past = changes;
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
