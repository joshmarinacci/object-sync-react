* done: create a SharedObjectStore to manage the object graph
* done: create buffers for the future, present, and past.  
* done: on app load, fetch history from the document history for a current list of properties, then the property history until all properties are filled in.
* done: populate the history buffer
* done: generate current view from all three buffers
* done: render the current view using react + svg
* done: press a button to make the main rect move
* done: press another button to flush to the network. confirm the other side gets it.
* done:  listen for network changes. use them to fill the history buffer and remove from the 
present buffer (if needed)
* done: load a second client. it should be able to reload everything and make changes on it's own
* done: load a third client. it should still work.
* done: reload the first client, it should come back to the current state
* done: button to create a new rect.  adds a set of properties for the rect + x,y,w,h. also adds to 
the document channel
* done: use a document id as a channel prefix
* done: handle the case where the doc is empty
* done: button to delete a rect. removes from the document channel.
* done: make a mouse handler to move the rectangle around by putting changes into the future buffer 
and triggering a refresh

* done: make future buffer coalesce events if the same propid
* done: when mouse is released flush future buffer to the present buffer and network
* done: add an indicator for the size of the future buffer to show when things are sending

* done: press button to disconnect from the network.
* done: move the rect. should still work.
* done: reconnect, changes should suddenly be reflected on the other screens automatically
* done: should be able to move either rect, everything renders correctly


* done: retrieve all changes made while off the network using history. have to reconcile. do this before flushing to the network. 
* done: test it with a real network disconnection

figure out how to add unit tests
show properties of the selected rect
switch to promises for the network actions

------------



how to handle adding, moving, and deleting from an array when two people have chagnes that could 
collide. ex:   start with array = [x,y,z].  A and B are offline. A inserts q at index 1, moving y
 and z down. B inserts r at index 2, moving z down. When they come back we get two cchanges to 
 set the array. Array = [x,q,y,z] and [x,y,r,z].  Neither is correct. The correct answer should be
 [x,q,r,y,z] if A is applied first, or else [x,q,y,r,z] if B is applied first. How do we make 
 this work? 

Answer: expand the current possible changes. currently we have only an atomic set. set id to new 
value.  the array is something like set arrayid1 to [x,y,z].  Let's add a command for insert, 
delete, and move. This fixes the problem above, though it doesn't say which of the two answers is
possible. Also it complicates the view generation logic which specifies that we go backwards in 
time from the most recent change to the oldest looking for a value for every monitored object. 
when you go back as soon as you find a 'set' change for each object you can stop.  That's no longer
the case with adding new actions. With a series of add,move,delete you could potentially go back
very far.  We can solve this either by saving the current most recent structure in memory calculated
from the past buffer at load time (but present and future changes are still recalculated every 
time the view is generated). Alternatively, we introduce some sort of an array set change 
periodically so that we only need to scan back to the set.


There is another problem. We want to preserve the semantic intent. Suppose we have array [x,y,z].
 A inserts 'q' after 'y' while offline. In the meantime B inserts a bunch of other stuff before 
 'y'. imagine this sequence:
 
 online: [x,y,z]
 offline: A insert 'q' at index 2 (just after 'y')
 online: B insert a,b,c, at index 1 (just before 'y')
 online: new state = [x,a,b,c,y,z]
 online: A resyncs and applies it's insert.
 online: new state = [x,a,q,b,c,y,z]
 
This is not what A was expecting. A wanted to insert after Y. To handle this case we don't use 
indexes. Instead we make inserts based on it's adjacent objects. Since everything already has an 
id anyway this should be easy.

Now 

A insert 'q' after 'y', offline   = [x,y,z]
B insert a,b,c after 'x', online = [x,a,b,c,y,z]
A syncs: online: [x,a,b,c,y,q,z]

deleting is easy, since it doesn't depend on the position but rather the id to be deleted. ex:

state = [x,y,z]
A delete 'y', offline = [x,y,z]
A syncs: online = [x,z]

But what about when B depends on the position of an object that A has deleted?

state = [x,y,z]
B insert 'r' after 'y', offline = [x,y,z]
A delete 'y', online = [x,z]
B syncs: online,  = [x,z].  crash because y no longer exists to insert after.

however 'y' is still in the system. it's just deleted, but still exists in the history.
so we could go back to find the last time y existed and reference *it's* neighbor, which is 'x'. 
'x' still exists so we can insert after it.  if 'x' didn't exist then we'd search to find 'it's 
previous neighbor, and so on. if there is no previous neighbor left then it must be at the start 
of the array and we can delete it.


handling map updates involves the same logic as array updates except there is no position, so 'move'
has no meaning. deletes, again, are trivial. 'inserts' have no adjacency issues so they are 
trivial as well.
 
 
 
This *does* complicate the implementation some.  Gonna have to have a bunch of unit tests to make
sure all of the merge logic works. create a function to compare a JS struct to the calculated 
view. ex:

 state
makeRootArray(state,[1,2,3]) //gives it a root with an array of 3 props, with the names x,y,z
goOffline(state);
rootArrayInsertAfter(state,8,2);
createOtherUserChange(rootArrayInsertAfter(state,9,1));
goOnline(state);
compare(state.calculateView(), [1,9,2,8,3])

makeRootArray(state,[1,2,3]) //gives it a root with an array of 3 props, with the names x,y,z
goOffline(state);
delete(state,8,2);
createOtherUserChange(delete(state,9,1));
goOnline(state);
compare(state.calculateView(), [1,9,2,8,3])



=== how to handle case where delete array element, then insert array element, but insert happens 
before the delete?  right now insert and delete happens based on position. solution: instead of 
manipulating the array by index, we must manipulate it by id of the object at that index.

so deleting second element of array = [a,b,c]  would be delete object with id b from the array.
inserting depends on position of something else already in the array.  to insert between b and c
in the array = [a,b,c] means insert object with id x between the indexes of the objects with id b 
and c.  can just specify at index of b, then b and the rest shift to the right. if b has already
been deleted, we keep track of it's most recent index. 

to implement this we must track the positions of all objects inserted and deleted from the array 
during it's lifetime. always flatten the array, removing the deleted flags, before returning to the 
outside world.

array = [];
array = [{a:true}]; 
array = [{a:true},{b:true}];
array = [{a:true},{b:true},{c:true}];
now insert x after a 
array = [{a:true},{x:true},{b:true},{c:true}] = [a,x,b,c]
now delete b
array = [{a:true},{x:true},{b:false},{c:true}] = [a,x,c]
now insert y after b
array = [{a:true},{x:true},{b:false},{y:true},{c:true}] = [a,x,y,c]






 





new examples

do everything in local memory to confirm the algorithm works

//property remote set test
create local prop
merge
test first value
create remote prop
merge
test second value

//two property set test
create local prop p1
create remote prop p2
merge
confirm both props exist

//map insert test
create local map
merge
test map = {}
create local prop (p1), set as p1 on the map
test map = {p1:p1}
create remote prop (p2), set as p2 on the map
merge
test map = {p1:p1, p2:p2}
test 


// map delete test
create remote prop (p3) set as p3 on the map
delete local map
merge
test map = deleted


// array insert test
create local array
merge
create a1, insert as array[0]
create a2, insert as array[1]
create a3, insert as array[2]
merge
create remote a4, insert between 0 and 1
create local a5, insert between 1 and 2
merge
test array = [a1,a4,a2,a5,a3]



