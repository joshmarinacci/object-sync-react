/**
 * Created by josh on 4/21/17.
 */

var test = require('tape');

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
        //publish all changes to the network
        this.future.forEach((ch)=>{
            this.publish(ch);
            this.present.push(ch);
        });
        this.future = [];

        //pull in all remote changes
        this.remote.forEach((ch) => {
            //console.log("integrating remote chnage",ch);
            this.past.push(ch);
        });
        this.remote = [];

        //process locally published changes
        this.present.forEach((ch) => {
            this.past.push(ch);
        });
        this.present = [];
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
                console.log("inserting", ch);
                if(type === 'map') {
                    obj[ch.at] = val;
                }
                if(type === 'array') {
                    obj = obj.slice();
                    var record = { target: ch.target, exists:true};
                    if(ch.at === -1) {
                        console.log('inserting at the end');
                        obj.push(record);
                    } else {
                        console.log("inserting elsewhere");
                        var o2 = [];
                        for(var i=0; i<obj.length; i++) {
                            var r = obj[i];
                            o2.push(r);
                            if(r.target === ch.at) {
                                console.log("found the place");
                                o2.push(record);
                            }
                        }
                        obj = o2;
                    }
                }
                console.log("now obj = ", obj);
            }
            if(ch.action === 'remove') {
                console.log("removing at", ch.at, 'value', type);
                obj.forEach((r) => {
                    console.log("looking at the record",r,ch.at);
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
            console.log("must flatten the array");
            var o2 = [];
            for(let i=0; i<obj.length; i++) {
                let r = obj[i];
                console.log("flattening",r);
                let val = this.getValue(r.target);
                if(r.exists) o2.push(val);
            }
            obj = o2;
            console.log("final array", obj);
        }

        return obj;
    }
}

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


