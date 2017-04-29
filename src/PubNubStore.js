/**
 * Created by josh on 4/28/17.
 */

var PubNub = require('pubnub');
var MergeStore = require('../src/MergeStore');


class PubNubStore extends MergeStore {
    constructor(channel, name) {
        super();
        this.name = name?name:'unnamed_store';
        this.listeners = {};
        this.CHANNEL = channel;
        this.connected = false;
        this.autoSend = true;
        this.subscribed = false;
        this.pubnub = new PubNub({
            publishKey:"pub-c-119910eb-4bfc-4cfe-93c2-e0706aa01eb4",
            subscribeKey:"sub-c-19b3c544-1e22-11e7-a9ec-0619f8945a4f"
        });
        this.pubnub.addListener({
            status: (e) => {
                //console.log('status message', e);
                if(e.category === 'PNNetworkIssuesCategory' ||  e.category === 'PNNetworkDownCategory') return this._networkDisconnected();
                if(e.category === 'PNConnectedCategory') return this._networkConnected();
                if(e.category === 'PNNetworkUpCategory') return this._networkConnected();
                if(e.operation === 'PNUnsubscribeOperation') return this._networkDisconnected();
            },
            message: (msg) =>{
                msg.message.timetoken = msg.timetoken;
                this._processIncoming(msg.message);
            }
        });
    }

    on(type, cb) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(cb);
        return cb;
    }
    off(type, cb) {
        var n = this.listeners[type].indexOf(cb);
        this.listeners[type].splice(n,1);
    }

    setAutoSendEnabled(autoSend) {
        this.autoSend = autoSend;
    }

    _fire(type) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].forEach(cb=>cb());
    }
    _networkConnected() {
        this.connected = true;
        this._fetchMissingHistory()
            .then(() => {
                if(!this.subscribed) return this.connect();
            })
            .then(() => this._publishDeferred())
            .then(()=>  this._fire('connect'))
    }
    _networkDisconnected() {
        this.connected = false;
        this.subscribed = false;
        this._fire('disconnect');
    }
    isConnected() {
        return this.connected;
    }
    _dump() {
        function da(arr) {
            arr.forEach((ch)=> console.log("    "+JSON.stringify(ch)));
        }
        console.log("=== PubNub Change Store: ", this.name);
        console.log('  - past'); da(this.past);
        console.log("  - present"); da(this.present);
        console.log("  - future"); da(this.future);
    }
    _fetchMissingHistory() {
        return new Promise((res,rej)=>{
            this.pubnub.history({channel:this.CHANNEL},(status,hist)=>{
                if(status.error) {
                    console.log("MAJOR ERROR, could not retrieve history");
                }
                //console.log("history status",status);
                //console.log(hist);
                if(hist.messages.length === 0) {
                    //console.log("empty history. returning");
                    return res();
                }
                var last = 0;
                if(this.past.length > 0) last = this.past[this.past.length-1].timetoken;
                hist.messages.forEach((m,i)=>{
                    //console.log(this.name,'comparing', m.timetoken, last);
                    if(m.timetoken > last) {
                        //console.log(this.name,"from history", m.entry);
                        m.entry.timetoken = m.timetoken;
                        this._processIncoming(m.entry);
                    } else {
                        //console.log(this.name, 'already have it', m.entry);
                    }
                });
                //this._dump();
                return res();
            });
        })
    }

    _processIncoming(ch) {
        //console.log(this.name,"incoming change",ch);
        //add to past
        this.past.push(ch);
        //remove from present, if it's there
        let n = this.present.findIndex((it) => ch.uuid === it.uuid);
        //console.log("found match at index",n);
        if(n >= 0) {
            this.present.splice(n, 1);
        }
        //this._dump();
        this._fire("merge");
    }

    connect() {
        return new Promise((res,rej)=>{
            var unsub = this.on('connect',()=>{
                this.off('connect',unsub);
                res(this);
            });
            this.pubnub.subscribe({channels:[this.CHANNEL]});
            this.subscribed = true;
        });
    }

    _publishDeferred() {
        if(!this.connected) {
            //console.log(this.name,"deferring future changes. pending = ", this.future.length);
            return Promise.resolve();
        }
        if(!this.autoSend) {
            return Promise.resolve();
        }
        console.log("publishing future changes", this.future.length);
        //move to present
        var proms = this.future.map((ch)=>{
            return new Promise((res,rej)=>{
                this.present.push(ch);
                //publish
                this.pubnub.publish({
                    channel:this.CHANNEL,
                    message:ch
                }, (status)=>{
                    //console.log("the publish is done", status);
                    if(status.error === true) {
                        rej();
                    } else {
                        res();
                    }
                });
            });
        });
        this.future = [];
        return Promise.all(proms).then(()=>{
            //console.log('all future posts sent to the present', this.future.length);
        });
    }
    addToFuture(ch) {
        //add to future
        ch.uuid = "uuid_"+Math.floor(Math.random()*1000*1000);
        super.addToFuture(ch);
        this._fire("future");
        return this._publishDeferred().then(()=> ch);
    }

    _waitUntilMerged() {
        if(this.present.length == 0) return Promise.resolve();
        return new Promise((res,rej)=>{
            var unsub = this.on('merge', () => {
                if(this.present.length == 0) {
                    this.off('merge',unsub);
                    res();
                }
            })
        })
    }

    disconnect() {
        return new Promise((res,rej)=> {
            var unsub = this.on('disconnect', ()=>{
                this.off('disconnect',unsub);
                res(this);
            });
            this.pubnub.unsubscribe({channels:[this.CHANNEL]});
        });
    }
    shutdown() {
        this.pubnub.stop();
    }


    createNumber(value) {
        return this.addToFuture({
            id : "id_"+Math.floor(Math.random()*1000*1000),
            type:'number',
            action:'create',
            value:value
        })
    }
    createMap() {
        return this.addToFuture({
            id : "id_"+Math.floor(Math.random()*1000*1000),
            type:'map',
            action:'create',
            value:{}
        })
    }
    insertAt(map, target, position) {
        return this.addToFuture({
            id:map.id,
            action:'insert',
            target:target.id,
            at:position
        })
    }
}

module.exports = PubNubStore;