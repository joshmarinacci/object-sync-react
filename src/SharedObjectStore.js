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

        /*
        this.pubnub = new PubNub({
            subscribeKey:"",
            publishKey:""
        });

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
