/**
 * Created by josh on 4/21/17.
 */

var test = require('tape');
var PubNub = require('pubnub');
var deepEqual = require('deep-equal');

class MergeStore {
    constructor() {
        this.past = [];
        this.present = [];
        this.future = [];
        this.remote = [];
    }
    addToFuture(ch) {
        this.future.push(ch);
    }
    addToRemote(ch) {
        this.remote.push(ch);
    }
    publish(ch) {
        console.log("publishing",ch.action, `'${ch.id}'`);
    }
    merge() {
        /*
        //publish all changes to the network
        this.future.forEach((ch)=>{
            this.publish(ch);
            this.present.push(ch);
        });
        this.future = [];

        //pull in all remote changes
        this.remote.forEach((ch) => {
            this.past.push(ch);
        });
        this.remote = [];

        //process locally published changes
        this.present.forEach((ch) => {
            this.past.push(ch);
        });
        this.present = [];
        */
    }

    getValue(id) {
        var buf = this.past.concat(this.present, this.future);

        //re-create the history of this object
        //find any sub objects for the requested id
        var matches = buf.filter((ch) => ch.id === id);
        var obj = null;
        var type = null;
        matches.forEach((ch) => {
            if(ch.action === 'create') {
                obj = ch.value;
                type = ch.type;
            }
            if(ch.action === 'insert') {
                var val = this.getValue(ch.target);
                //console.log("inserting", ch);
                if(type === 'map') {
                    obj[ch.at] = val;
                }
                if(type === 'array') {
                    obj = obj.slice();
                    var record = { target: ch.target, exists:true};
                    if(ch.at === -1) {
                        //console.log('inserting at the end');
                        obj.push(record);
                    } else {
                        //console.log("inserting elsewhere");
                        var o2 = [];
                        for(var i=0; i<obj.length; i++) {
                            var r = obj[i];
                            o2.push(r);
                            if(r.target === ch.at) {
                                //console.log("found the place");
                                o2.push(record);
                            }
                        }
                        obj = o2;
                    }
                }
                //console.log("now obj = ", obj);
            }
            if(ch.action === 'remove') {
                //console.log("removing at", ch.at, 'value', type);
                obj.forEach((r) => {
                    //console.log("looking at the record",r,ch.at);
                    if(r.target === ch.at) {
                        r.exists = false;
                    }
                })
            }
            if(ch.action === 'update') {
                obj = ch.value;
            }
        });

        if(type === 'array') {
            //console.log("must flatten the array");
            var o2 = [];
            for(let i=0; i<obj.length; i++) {
                let r = obj[i];
                //console.log("flattening",r);
                let val = this.getValue(r.target);
                if(r.exists) o2.push(val);
            }
            obj = o2;
            //console.log("final array", obj);
        }

        return obj;
    }
}

/*
test("simple prop test", (t)=> {
    var store = new MergeStore();
    // create a local prop
    var p1 = { id:"a", value:6, type:'number', action:'create' };
    store.addToFuture(p1);
    // merge
    store.merge();
    //test the first value
    t.equal(store.getValue("a"),6,'a is equal to 6');

    // create a remote prop
    var p2 = { id:'a', value:7, action:'update'};
    store.addToRemote(p2);
    t.equal(store.getValue("a"),6,'a is still 6');
    store.merge();
    // test the updated value
    t.equal(store.getValue("a"),7,'now a is 7');
    t.end();
});


test("map insert test", (t) => {
    var store = new MergeStore();
    // create a local map
    var map = {id: "map", value: {}, type: 'map', action: 'create'};
    store.addToFuture(map);
    store.merge();
    t.deepEqual(store.getValue("map"), {});

    // create a local property, add to the map
    var a = { id:'a', value:7, action:'create'};
    store.addToFuture(a);
    store.addToFuture({action:'insert', target:'a', id:'map', at:"a"});
    t.deepEqual(store.getValue('map'),{a:7});

    // create a remote property
    var b = { id:'b', value:9, action:'create', type:'number'};
    store.addToRemote(b);
    store.addToRemote({action:'insert', target:'b', id:'map', at:"b"});
    t.deepEqual(store.getValue('map'),{a:7});

    // merge and confirm
    store.merge();
    t.deepEqual(store.getValue("map"),{a:7, b:9});

    t.end();
});


test("array insert test", (t)=>{
    var store = new MergeStore();
    //create array
    var arr = { id:'array', type:'array', value:[], action:'create'};
    store.addToFuture(arr);
    //create properties in the array
    store.addToFuture({ id:"a", value:1, type:'number', action:'create' });
    store.addToFuture({ id:"b", value:2, type:'number', action:'create' });
    store.addToFuture({ id:"c", value:3, type:'number', action:'create' });
    store.addToFuture({action:'insert', target:'a', id:'array', at:-1});
    store.addToFuture({action:'insert', target:'b', id:'array', at:-1});
    store.addToFuture({action:'insert', target:'c', id:'array', at:-1});

    // merge and test
    store.merge();
    t.deepEqual(store.getValue("array"),[1,2,3],'initial array');

    //insert x locally after 'a'
    store.addToFuture({ id: 'x', value: 7, type:'number', action:'create'});
    store.addToFuture({action:'insert', target:'x', id:'array', at:'a'});
    t.deepEqual(store.getValue("array"),[1,7,2,3]);


    //insert y remotely after 'b'
    store.addToRemote({ id: 'y', value: 8, type:'number', action:'create'});
    store.addToRemote({action:'insert', target:'y', id:'array', at:'b'});

    // merge and test
    store.merge();
    t.deepEqual(store.getValue("array"),[1,7,2,8,3]);

    //delete local prop x
    store.addToFuture({action:'remove', id:'array', at:'x'});
    t.deepEqual(store.getValue("array"),[1,2,8,3]);

    //create remote prop z after x
    store.addToRemote({ id: 'z', value: 9, type:'number', action:'create'});
    store.addToRemote({action:'insert', target:'z', id:'array', at:'x'});

    //merge and test
    store.merge();
    t.deepEqual(store.getValue("array"),[1,9,2,8,3]);
    return t.end();

});
*/

class PubNubStore extends MergeStore {
    constructor(channel, name) {
        super();
        this.name = name?name:'unnamed_store';
        this.listeners = {};
        this.CHANNEL = channel;
        this.connected = false;
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
    _fire(type) {
        if(!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].forEach(cb=>cb());
    }
    _networkConnected() {
        this.connected = true;
        this._fetchMissingHistory()
            .then(() => this._publishDeferred())
            .then(()=>  this._fire('connect'))
    }
    _networkDisconnected() {
        this.connected = false;
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
        });
    }

    _publishDeferred() {
        if(!this.connected) {
            //console.log(this.name,"deferring future changes. pending = ", this.future.length);
            return Promise.resolve();
        }
        //console.log("publishing future changes", this.future.length);
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
        return Promise.all(proms).then(()=>{
            //console.log('all future posts sent to the present', this.future.length);
            this.future = [];
        });
    }
    addToFuture(ch) {
        //add to future
        ch.uuid = "uuid_"+Math.floor(Math.random()*1000*1000);
        super.addToFuture(ch);
        return this._publishDeferred();
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
}


test("live pubnub test", (t)=>{
    let store = new PubNubStore("test-channel-"+Math.floor(Math.random()*100000));

    store.connect()
        //send all changes live
        .then(() => store.addToFuture({id: 'array', type: 'array', value: [], action: 'create'}))
        .then(() => store.addToFuture({id: 'a', type: 'number', value: 1, action: 'create'}))
        .then(() => store.addToFuture({id: "b", value: 2, type: 'number', action: 'create'}))
        .then(() => store.addToFuture({id: "c", value: 3, type: 'number', action: 'create'}))
        //create properties in the array
        .then(()=>store.addToFuture({action: 'insert', target: 'a', id: 'array', at: -1}))
        .then(()=>store.addToFuture({action: 'insert', target: 'b', id: 'array', at: -1}))
        .then(()=>store.addToFuture({action: 'insert', target: 'c', id: 'array', at: -1}))
        //wait
        .then(() => store._waitUntilMerged())

        //insert a number while disconnected
        .then(()=> store.disconnect())
        .then(()=>{
            t.equal(store.isConnected(),false);
            store.addToFuture({ id: 'x', value: 7, type:'number', action:'create'});
            store.addToFuture({action:'insert', target:'x', id:'array', at:'a'});
            t.deepEqual(store.getValue("array"), [1, 7, 2, 3]);
        })
        //re-connect and verify that everything synced up okay
        .then(() =>  store.connect())
        .then(()=> {
            console.log("back to connected");
            t.equal(store.isConnected(), true);
            t.deepEqual(store.getValue("array"), [1, 7, 2, 3]);
        })
        .then(() => store._waitUntilMerged())
        .then(()=> {
            t.equal(store.present.length,0,'present buffer should be empty');
            t.equal(store.future.length,0, 'future buffer should be empty');
        })
        .then(()=> store.shutdown())
        .then(()=> t.end())
        .catch((e) =>{
            console.log("crashed",e);
            t.fail();
        });
});


function sleep(dur) {
    return new Promise((res,rej)=>{
        setTimeout(()=>{
            res();
        },dur);
    });
}
test("remote merge test", (t)=>{
    var channel = "test-channel-"+Math.floor(Math.random()*100000);
    let store1 = new PubNubStore(channel,'foo');
    let store2 = new PubNubStore(channel,'bar');
    const delay = 2000;

    store1.connect()
        //send all changes live
        .then(()=> store1.addToFuture({id: 'array', type: 'array', value: [], action: 'create'}))
        //create properties in the array
        .then(()=>  store1.addToFuture({id: "a", value: 1, type: 'number', action: 'create'}))
        .then(()=>  store1.addToFuture({id: "b", value: 2, type: 'number', action: 'create'}))
        .then(()=>  store1.addToFuture({id: "c", value: 3, type: 'number', action: 'create'}))
        .then(()=>  store1.addToFuture({action: 'insert', target: 'a', id: 'array', at: -1}))
        .then(()=>  store1.addToFuture({action: 'insert', target: 'b', id: 'array', at: -1}))
        .then(()=>  store1.addToFuture({action: 'insert', target: 'c', id: 'array', at: -1}))
        .then(() => store1._waitUntilMerged())
        .then(() => sleep(delay))
        .then(() => t.deepEqual(store1.getValue("array"), [1, 2, 3]))

        //disconnect then make a change
        .then(()=> store1.disconnect())
        .then(() => store1.addToFuture({ id: 'x', value: 7, type:'number', action:'create'}))
        .then(() => store1.addToFuture({action:'insert', target:'x', id:'array', at:'a'}))

        //another client publishes a conflicting change
        .then(() => store2.connect())
        //validate that everything is okay
        .then(() => sleep(delay))
        .then(() => t.deepEqual(store2.getValue("array"), [1, 2, 3]))
        //insert y remotely after 'b'
        .then(() => store2.addToFuture({ id: 'y', value: 8, type:'number', action:'create'}))
        .then(() => store2.addToFuture({action:'insert', target:'y', id:'array', at:'b'}))
        .then(() => store2._waitUntilMerged())
        .then(() => sleep(delay))
        .then(() => t.deepEqual(store2.getValue("array"), [1, 2, 8, 3]))
        .then(() => store2.disconnect())

        //reconnect the main store. everything should be resolved correctly
        .then(() => store1.connect())
        .then(() => store1._waitUntilMerged())
        .then(() => sleep(delay))
        .then(() => {
            t.deepEqual(store1.getValue("array"),[1,7,2,8,3],store1.name +" is valid");
        })

        //reconnect remote store. everything should be resolved correctly
        .then(()=> store2.connect())
        .then(()=> store2._waitUntilMerged())
        .then(()=> sleep(delay))
        .then(()=> t.deepEqual(store2.getValue("array"),[1,7,2,8,3]))
        .then(()=> store1.shutdown())
        .then(()=> store2.shutdown())
        .then(()=> t.end())
        .catch((e) =>{
            console.log("crashed",e);
            t.fail();
        });

});
