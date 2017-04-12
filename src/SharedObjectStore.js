/**
 * Created by josh on 4/10/17.
 */

//var INITIAL_DOC_STATE = ["root","rect","x","y"];
//var INITIAL_CHANGES = [
//    { propid:'x1', value:55, type:'number' },
//    { propid:'y1', value:35, type:'number' },
//    { propid:'rect', type:'map', value:{x:'x1',y:'y1'}},
//    { propid:'root', type:'array', value:['rect']}
//];

const DOC_PREFIX = "randomdoc19_";
const DOC_CHANNEL = DOC_PREFIX+"document";
const CHANGE_CHANNEL = DOC_PREFIX+"changes";

var _store = null;

import PubNub from "pubnub";

class SharedObjectStore {
    constructor() {
        this.listeners = [];
        this._past = [];
        this._present = [];
        this._future = [];
        this._doc = [];
        this.autoSend = true;
        this.fakeConnected = true;

        this.pubnub = new PubNub({
            publishKey:"pub-c-119910eb-4bfc-4cfe-93c2-e0706aa01eb4",
            subscribeKey:"sub-c-19b3c544-1e22-11e7-a9ec-0619f8945a4f"
        });


        this.pubnub.history({channel:DOC_CHANNEL},(status,hist)=>{
            if(status.error) {
                console.log("MAJOR ERROR, could not retrieve doc channel history");
            }
            console.log(hist);
            if(hist.messages.length <= 0) {
                console.log("EMPTY history. probably a new doc");
                return this._initNewDoc();
            }

            var objs = hist.messages.slice().pop().entry.changes;
            this._setDocument(objs[0].value);
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
        this.rootID = 'root';
    }

    _initNewDoc() {
        console.log("initing a new doc");
        var initial_doc = {
            propid:'doc',
            value:['root'],
            type:'array'
        };
        this._future.push(initial_doc);
        this._setDocument(initial_doc.value);
        this.setProperty('root',[],'array');
    }
    _fireChange() {
        var view = this.calculateCurrentView();
        this.listeners.forEach(cb => cb(view));
    }
    _setDocument(objs) {
        this._doc = objs;
    }

    _initHistory(changes) {
        console.log('history messages length',changes.length)
        this._past = [];
        changes.forEach((msg)=>{
            msg.entry.changes.forEach((ch) => {
                ch.timetoken = msg.timetoken;
                this._past.push(ch);
            })
        });
        var view = this.calculateCurrentView();
        this.listeners.forEach(cb => cb(view));
    }


    setAutoSendEnabled(enabled) {
        this.autoSend = enabled;
    }

    isAutoSendEnabled() {
        return this.autoSend;
    }

    isFakeConnected() {
        return this.fakeConnected;
    }
    fakeConnect() {
        this.fakeConnected = true;
        this.fetchMissingMessages();
    }
    fakeDisconnect() {
        this.fakeConnected = false;
        this._fireChange();
    }
    isRealConnected() {
        return true;
    }

    fetchMissingMessages() {
        this.pubnub.history({channel:DOC_CHANNEL},(status,hist)=>{
            var mostRecent = hist.messages.slice().pop().entry.changes;
            this._doc = mostRecent[0].value;
            this.pubnub.history({channel:CHANGE_CHANNEL}, (status,hist)=>{
                var last = this._past[this._past.length-1];
                hist.messages.forEach((m,i)=>{
                    if(m.timetoken >= last.timetoken) {
                        m.entry.changes.forEach((ch)=>{
                            ch.timetoken = m.timetoken;
                            this._past.push(ch);
                            console.log('adding',ch);
                        });
                    }
                });
                this.flushToNetwork();
            });
        });
    }

    sendToNetwork() {
        if (this.autoSend) {
            this.flushToNetwork();
        } else {
            //console.log("autosend is disabled. not sending");
        }
    }
    flushToNetwork() {
        console.log("sending future changes", this._future.length);
        if(!this.fakeConnected) {
            console.log('not connected. cant flush');
            return;
        }
        //send to the network
        this.pubnub.publish({
            channel: CHANGE_CHANNEL,
            message: {
                changes: this._future
            }
        });
        var doc_changes = this._future.filter((ch)=>ch.propid === 'doc');
        if(doc_changes.length > 0) {
            this.pubnub.publish({
                channel:DOC_CHANNEL,
                message: {
                    changes:doc_changes
                }
            })
        }

        //move all items the present buffer
        this._future.forEach((change)=> {
            this._present.push(change);
        });
        this._future = [];
        this._fireChange();
    }

    processIncoming(env) {
        if(!this.fakeConnected) return console.log("Can't receive. disconnected!");
        if(env.channel === CHANGE_CHANNEL) {
            env.message.changes.forEach((ch)=> {
                //put this in the past
                ch.timetoken = env.timetoken;
                this._past.push(ch);
                //remove from present if it's there
                var n = this._present.findIndex(c => c.propid = ch.propid);
                if (n >= 0) this._present.splice(n, 1);
            });
            var view = this.calculateCurrentView();
            this.listeners.forEach(cb => cb(view));
        }
        if(env.channel === DOC_CHANNEL) {
            env.message.changes.forEach((ch) => {
                this._setDocument(ch.value);
            })
        }
    }

    onChange(cb) {
        this.listeners.push(cb);
    }
    getFutureCount() {
        return this._future.length;
    }
    getPresentCount() {
        return this._present.length;
    }
    getPastCount() {
        return this._past.length;
    }


    getProperty(propid) {
        var history = this._past.concat(this._future).reverse();
        return history.find((p)=>p.propid === propid);
    }

    setProperty(propid,value,type) {
        var existing = this._future.find((p)=>p.propid == propid);
        if(existing) {
            existing.value = value;
        } else {
            this._future.push(({
                propid: propid,
                value: value,
                type: type
            }));
        }
        this.sendToNetwork();
        this._fireChange();
    }
    deleteProperty(propid) {
        this._doc = this._doc.filter((id)=> id !== propid);
        var doc_change = {
            propid:'doc',
            value:this._doc.slice(),
            type:'array'
        };
        this._future.push(doc_change);
        this.sendToNetwork();
        this._fireChange();
    }

    calculateCurrentView() {
        var history = this._past.concat(this._present,this._future).reverse();

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
                if(!att) {
                    console.log("WARNING:  could not find property for ",name, id);
                } else {
                    props[name] = {
                        name: name,
                        id: att.propid,
                        type: att.type,
                        value: att.value
                    }
                }
            });
            return {
                id:prop.propid,
                type:prop.type,
                props:props
            }
        });
        return rt;
    }

    createProp(value, type) {
        var propid = this._generateRandomIdWithPrefix(type);
        var prop = {
            propid: propid,
            type: type,
            value: value
        };
        this._future.push(prop);
        this._doc.push(propid);

        var doc_change = {
            propid:'doc',
            value:this._doc.slice(),
            type:'array'
        };
        this._future.push(doc_change);
        this.sendToNetwork();
        return prop;
    }

    createMap(value) {
        return this.createProp(value, "map");
    }
    createNumber(value) {
        return this.createProp(value, "number");
    }
    createString(value) {
        return this.createProp(value, "string");
    }

    _generateRandomIdWithPrefix(prefix) {
        return prefix+"_"+Math.floor(Math.random()*1000*1000);
    }
}

module.exports = {
    get: function() {
        if(!_store) _store = new SharedObjectStore();
        return _store;
    }
}
