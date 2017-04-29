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
        var found = this.future.find((p)=>p.id == ch.id);
        if(found) {
            found.value = ch.value;
        } else {
            this.future.push(ch);
        }
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
    getObject(id) {
        var buf = this.past.concat(this.present, this.future);
        //re-create the history of this object
        //find any sub objects for the requested id
        var matches = buf.filter((ch) => ch.id === id);
        if(matches.length === 0) return null;
        var obj = {};
        matches.forEach((ch) => {
            if(ch.action === 'create') {
                obj.id = ch.id;
                obj.value = ch.value;
                obj.type = ch.type;
                return;
            }
            if(ch.action === 'insert') {
                var val = this.getObject(ch.target);
                if(obj.type === 'map') {
                    obj.value[ch.at] = val;
                }
                if(obj.type === 'array') {
                    obj.value = obj.value.slice();
                    var record = { target: ch.target, exists:true, value: val};
                    if(ch.at === -1) {
                        obj.value.push(record);
                    } else {
                        var o2 = [];
                        for(var i=0; i<obj.value.length; i++) {
                            var r = obj.value[i];
                            o2.push(r);
                            if(r.target === ch.at) {
                                o2.push(record);
                            }
                        }
                        obj.value = o2;
                    }
                }
            }
            if(ch.action === 'remove') {
                obj.value.forEach((r) => {
                    if(r.target === ch.at) {
                        r.exists = false;
                    }
                })
            }
            if(ch.action === 'update') {
                obj.value = ch.value;
            }
        });
        return obj;
    }
    getValue(id) {
        return this.flatten(this.getObject(id));
    }
    flatten(obj) {
        if(!obj) return null;
        if(obj.type === 'map') {
            var o2 = {};
            Object.keys(obj.value).forEach((key,i)=> o2[key] = this.flatten(obj.value[key]));
            return o2;
        }
        if(obj.type === 'array') return obj.value
            .filter(val => val.exists)
            .map((val)=>this.flatten(val.value));
        if(obj.type === 'number') return obj.value;
        console.log("DIDNT MATCH A TYPE");
        return obj;
    }
}

module.exports = MergeStore;