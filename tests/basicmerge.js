/**
 * Created by josh on 4/21/17.
 */

var test = require('tape');
console.log('doing a basic merge test');
var SharedObjectStore = require('../src/SharedObjectStore');

test('simple property edit', (t) => {
    var store = SharedObjectStore.get();
    //turn off sending to the network
    store.setAutoSendEnabled(false);
    // create a local property
    var p1 = store.createNumber(5);
    store._test_future_to_past();

    // create a remote property change
    store._test_remote_setProperty(p1.propid, 6, 'number');
    t.equal(store.getProperty(p1.propid).value,5);
    store._test_remote_merge();
    t.equal(store.getProperty(p1.propid).value,6);

    //create a local property with a map containing the first property
    var map = store.createMap({p1:p1.propid});
    var p2 = store.createNumber(15);
    store._test_future_to_past();

    //add a remote property to the map
    var pr = store._test_remote_createNumber(25);
    store._test_remote_setProperty(map.propid, {pr:pr.propid},'map');
    //doc should still have three items
    t.equal(store._doc.length,3);

    //update the local property in the map to p2
    t.equal(store.getProperty(map.propid).value.p1,p1.propid);
    store.setProperty(map.propid, {p1:p2.propid},'map');
    t.equal(store.getProperty(map.propid).value.p1,p2.propid);

    store._test_future_to_past();

    store._test_dump();
    store._test_remote_merge();
    //doc should now have 4 items
    t.equal(store._doc.length,4);

    var mp = store.getProperty(map.propid);
    console.log("now the map is",mp);

    t.equal(store.getProperty(map.propid).value.p1,p2.propid);
    t.equal(store.getProperty(map.propid).value.pr,pr.propid);
    store._test_dump();



    t.end();
});

// merge the change
// verify the correct final value


// create a local property with an array matching the first property
// create a remote property with a new value
// update the remote array property with an insert
// update the local array property with an insert
// merge the changes
// verify the final array property contains both properties

