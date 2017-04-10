/**
 * Created by josh on 4/10/17.
 */

var _store = null;
var DOC_CHANNEL = "document";
var CHANGE_CHANNEL = "changes";
import PubNub from "pubnub";

class SharedObjectStore {
    constructor() {
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

    calculateCurrentView() {
        var root = this._past.find((p)=>p.propid == this.rootID);
        var rt = {
            id:root.propid,
            type:root.type,
        };
        rt.values = root.value.map((name)=>{
            var prop = this._past.find((pp)=>pp.propid === name);
            console.log("got the prop",prop);
            var props = {};
            Object.keys(prop.value).map((name)=>{
                console.log("looking for",name);
                var id = prop.value[name];
                console.log("id = ",id);
                var att = this._past.find((pp)=>pp.propid === id);
                console.log("got att", att);
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
