/**
 * Created by josh on 4/21/17.
 */

var test = require('tape');
var MergeStore = require('../src/MergeStore');
var PubNubStore = require('../src/PubNubStore');
var deepEqual = require('deep-equal');


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


test("pubnub map test", (t)=>{
    let store = new PubNubStore("test-channel-"+Math.floor(Math.random()*100000));
    store.connect()
        .then(()=> store.addToFuture({id: 'x1', type: 'number', value:10, action: 'create'}))
        .then(()=> store.addToFuture({id: 'y1', type: 'number', value:10, action: 'create'}))
        .then(()=> store.addToFuture({id: 'r1', type: 'map',    value:{}, action: 'create'}))
        .then(()=> store.addToFuture({id:'r1',  action: 'insert', target: 'x1', at: 'x'}))
        .then(() => store._waitUntilMerged())
        .then(() => t.deepEqual(store.getValue("r1"), {x:10}))
        .then(()=>{
        })

        // set x to 20
        .then(()=> store.addToFuture({action: 'update', id: 'x1', value:20}))
        .then(() => store._waitUntilMerged())
        .then(() => t.deepEqual(store.getValue("r1"), {x:20}))

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
