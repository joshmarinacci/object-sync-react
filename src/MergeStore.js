/**
 * Created by josh on 4/28/17.
 */

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

module.exports = MergeStore;