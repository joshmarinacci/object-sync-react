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

* make future buffer coalesce events if the same propid
* when mouse is released flush future buffer to the present buffer and network
* add an indicator for the size of the future buffer to show when things are sending

* press button to disconnect from the network.
* move the rect. should still work.
* reconnect, changes should suddenly be reflected on the other screens automatically
* should be able to move either rect, everything renders correctly





