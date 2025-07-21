const {PersistenceCategory} = require("categorical-handlers")
//
const crypto = require('crypto')


// connect to a relay service...
// set by configuration (only one connection, will have two paths.)

function faux_random_enough() {
    let rr = Math.random()
    rr = Math.floor(rr*1897271171)
    return "dashing" + rr
}


function do_hash (text) {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    let ehash = hash.digest('base64');
    ehash = ehash.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    return(ehash)
}


function terminus_unlink(obj,field_path) {
    let fpath = field_path.split('.')
    let tobj = obj
    let parent = false
    let f = false
    while ( fpath.length ) {
        f = fpath.shift()
        parent = tobj
        tobj = parent[f]
        if ( tobj === undefined ) return false
    }
    if ( f && parent ) {
        parent[f] = undefined
    }
    return tobj
}

// -- -- -- --

let g_type_to_consumer = {}    // e.g a dashboard will produce blog entries.

function map_entry_type_to_consumer(entry_type) {
    let consumer_of_type = g_type_to_consumer[entry_type]
    if ( consumer_of_type === undefined ) {
        consumer_of_type = "database"
    }
    return consumer_of_type
}


function needs_media_type(asset_type) {
    return false
    /*
    switch ( asset_type ) {
        case "stream" : {
            return true
        }
        default : {
            return false
        }
    }
    */
}

function non_stream_media(msg_obj) {
    let asset_type = msg_obj.asset_type         //  asset -type
    let media_type = msg_obj.media_type 

    if ( asset_type !== "stream" ) {
        return true
    }
    return false
}


// -- -- -- --
//
class TransitionsODBEndpoint extends PersistenceCategory {

    //
    constructor(conf) {
        super(conf.persistence)
        //
        this.conf = conf.odb_endpoint
        g_type_to_consumer = this.conf.entry_types_to_consumers   // e.g. the types of file to a client interface (this has changed)
        //
        this.path = `${conf.persistence.address}:${conf.persistence.port}`
        this.client_name = this.path
        //
        this.app_subscriptions_ok = true
        this.app_meta_universe = true
        // ---------------->>  topic, client_name, relayer  (when relayer is false, topics will not be written to self)
        this.add_to_topic("command-publish",'self',false)           // allow the client (front end) to use the pub/sub pathway to send state changes
        this.add_to_topic("command-rescind",'self',false)
        this.add_to_topic("command-delete",'self',false)
        this.add_to_topic("command-send",'self',false)
        //
        this.full_entry_consumer_type = conf.full_entry_consumer_type ? conf.full_entry_consumer_type : "full_meta"
        //
        this.topic_consumer = this.topic_consumer_user
        if ( conf.system_wide_topics ) {
            this.topic_consumer = this.topic_consumer_system
        }

        if ( (this.conf.multi_meta_hanlders !== undefined) && this.conf.multi_meta_hanlders ) {
            this.all_meta_topics = this.conf.multi_meta_hanlders
        }
        //
    }

    //
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    // ----
    topic_consumer_user(consumer_of_type,user_id) {
        return  `user-${consumer_of_type}-${user_id}`
    }

    // ----
    topic_consumer_system(consumer_of_type,user_id) {
        return `user-${consumer_of_type}`
    }

    // ----
    app_generate_tracking(p_obj) {
        if ( p_obj._tracking === undefined ) {
            let pobj_str = JSON.stringify(p_obj)
            return(do_hash(pobj_str))    
        } else {
            return p_obj._tracking
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    make_path(u_obj) {
        let key_field = u_obj.key_field ? u_obj.key_field : u_obj._transition_path
        let asset_info = u_obj[key_field]   // dashboard+striking@pp.com  profile+striking@pp.com
        if ( !(asset_info) ) return(false)
        if ( asset_info.indexOf('+') < 0 ) {
            console.log(`malformed file specifier in ${__filename}`)
            console.dir(u_obj)
            return(false)
        }
        asset_info = asset_info.split('+')
        let user_path = this.user_directory
        let user_id = asset_info.pop()
        //
        user_path += '/' + user_id
        let entry_type = asset_info.pop()
        user_path += '/' + entry_type
        //
        if ( asset_info.length ) {
            let file = asset_info.pop()
            if ( file.length === 0 ) {
                file = u_obj._tracking
                u_obj[key_field] = file + u_obj[key_field]
            }
            user_path += '/' + file + ".json"
        } else {
            user_path += ".json"
        }
        return(user_path)
    }



    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    /**
     * publish_mini_link_server
     * 
     * The mini link servers provide a public view of data.
     * This data view must be filtered of keys and other private information.
     * 
     * See `application_meta_publication`, which does filtering
     * 
     * invokes `app_publish_on_path` which sends a message to all subscribers
     * 
     * @param {string} topic 
     * @param {object} msg_obj - the searchable media meta descriptor
     */
    publish_mini_link_server(topic,msg_obj) {
        msg_obj.client_name = this.client_name
        let pub = {
            "data" : JSON.stringify(msg_obj),
            "_tracking" : msg_obj._tracking,
            "client_name" : this.client_name
        }
        this.app_publish_on_path(topic,this.path,pub)
    }



    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    /**
     * application_meta_publication
     * 
     * called as as of result of a publication message being sent to the endpoint
     * 
     * `app_message_handler` calls `publish` which in turn calls this method, `application_meta_publication`
     * 
     * Operates on the meta-object. The meta-object may have fields that should be removed from a search facility.
     * The searcher will not need such things as public keys. That will be required in a counting serivce, but
     * the general public would not need to have them and they add extra weight to the data size.
     * 
     * calls needs_media_type if the asset type should be further distinguished
     * 
     * Take note of the `exclusion_fields`. These are added by authorization services and not provided by client operations.
     * 
     * @param {object} meta_obj 
     * @param {boolean} app_meta_universe  -- ignored
     */
    application_meta_publication(meta_obj,app_meta_universe) {        // publications going to mini link servers
        //
        //if ( !app_meta_universe ) return;
        //
        let exclusion_fields = meta_obj.exclusion_fields         // exclusion_fields shall be an array
        if ( ((exclusion_fields !== undefined) && exclusion_fields ) || non_stream_media(meta_obj) ) {   // the client decides which fields to remove from meta data before pushing to discovery systems...
            let asset_type = meta_obj.asset_type         //  asset -type
            let media_type = meta_obj.media_type
            let projection = Object.assign({},meta_obj)  
            if ( exclusion_fields ) {
                for ( let field_path of exclusion_fields ) {
                    terminus_unlink(projection,field_path)
                }
                delete projection.exclusion_fields
            }
            //
            let topic = `add_${this.all_meta_topics["meta"]}_${asset_type}`   // mini link server subscribes to this
            if ( needs_media_type(asset_type) ) {
                topic += '_' + media_type
            }
            this.publish_mini_link_server(topic,projection)  // projection ... the scaled down message object
        }
    }


    // ----
    /**
     * application_meta_remove
     * 
     * 
     * calls needs_media_type if the asset type should be further distinguished
     * 
     * @param {object} msg_obj 
     * @param {boolean} app_meta_universe 
     */
    application_meta_remove(meta_obj,app_meta_universe) {
        let asset_type = meta_obj.asset_type
        let media_type = meta_obj.media_type
        //if ( !app_meta_universe ) return;
        let topic = `remove_${this.all_meta_topics["meta"]}_${asset_type}`
        if ( needs_media_type(asset_type) ) {
            topic += '_' + media_type
        }
        this.publish_mini_link_server(topic,meta_obj)
    }


    /**
     * app_subscription_handler
     * 
     *  -- Handle state changes...
     * 
     * this is the handler for the topics added directly above in the constructor
     * 
     * @param {string} topic 
     * @param {object} msg_obj 
     */
    app_subscription_handler(topic,msg_obj) {
        //
        if ( topic === 'command-publish' ) {
            msg_obj._tx_op = 'P'
        } else if ( topic === 'command-recind' ) {
            msg_obj._tx_op = 'U'
        } else if ( topic === 'command-delete' ) {
            msg_obj._tx_op = 'D'
        }
        //
        this.app_message_handler(msg_obj)           // run the handler (often gotten to by relay to endpoint messaging ... this is pub/sub pathway)
        //
        if ( ( topic === 'command-publish' ) || ( topic === 'command-recind' ) ) {
            let op = 'F' // change one field
            let field = 'published'
            let value = msg_obj.published
            this.user_action_keyfile(op,msg_obj,field,value)
        }
    }

    // ----
    /**
     * application_data_update
     * 
     * A user sends a get message. 
     * As a result requested data will be loaded.
     * This method allows for modifications to the record being sent. 
     * 
     * For instance, the message may be sent by a different owner than the one stored.
     * (Usually this helps if those fields were omitted when stored. But, usually they should be the same)
     * 
     * The object returned is one that can be sent to a web browser that handles the meta descriptors.
     * 
     * @param {object} msg_obj - the operation object sent by the user
     * @param {object} d_obj - the meta data descriptor of interest to subscribers
     * @returns object
     */
    application_data_update(msg_obj,d_obj) {       // data is passed as an object d_obj
        try {
            //
            let key_field = msg_obj.key_field ?  msg_obj.key_field : msg_obj._transition_path
            let asset_info = msg_obj[key_field]   // dashboard+striking@pp.com  profile+striking@pp.com
            if ( asset_info )  {
                asset_info = asset_info.split('+')
                let user_id = asset_info.pop()
                d_obj.owner = user_id
                d_obj.info = asset_info
                d_obj._id = user_id
                let path_key = d_obj.path_key
                if ( path_key ) {
                    d_obj[`which_${path_key}`] = faux_random_enough()  // a name for the application tab...
                } else {
                    d_obj.which_tab_name = faux_random_enough()
                }
                let data = {
                    "mime_type" : "application/json",
                    "string" : JSON.stringify(d_obj)
                }
                data = JSON.stringify(data)
            }
        } catch (e) {
            return(JSON.stringify(d_obj))
        }
        return(data)
    }

    // ---- user_manage_date
    // ---- ---- ---- ----   always call this before writing the file... The parent class should be like this.
    user_manage_date(op,u_obj) {
        switch ( op ) {
            case 'C' : {
                u_obj.dates = {         // creating the object... perhaps this overwrites something. But, as far as these services go, this is where this starts
                    "created" : Date.now(),
                    "updated" : Date.now()
                }
                break;
            }
            case 'U' :
            default: {  // until someone thinks of another default
                if ( u_obj.dates === undefined ) {  /// really it should be defined by the time this gets here... but maybe someone dropped something in a directory
                    u_obj.dates = {         // creating the object... perhaps this overwrites something. But, as far as these services go, this is where this starts
                        "created" : Date.now(),
                        "updated" : Date.now()
                    }    
                } else {
                    u_obj.dates.updated = Date.now()
                    if ( u_obj.dates.created === undefined ) {       // in the event that the object is messed up somehow
                        u_obj.dates.created = Date.now()
                    }
                }
                break;
            }
        }
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * get_entries
     * 
     * @param {string} entries_file - the name of a file containing a map of object ids to objects
     * @returns object - the map object
     */
    async get_entries(entries_file) {
        let entries_record = await this.fos.load_json_data_at_path(entries_file)
        return entries_record
    }

    /**
     * put_entries
     * 
     * @param {string} entries_file -- the path to the entries file
     * @param {obj} entries_record 
     */
    async put_entries(entries_file,entries_record) {
        await this.fos.write_out_json(entries_file,entries_record)
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * get_entries_record
     * 
     * The assumes that the user will have a table of entries in a file. 
     * And, more than one type of asset may be in the table. The file name of the type of asset 
     * is determined. And, that file is loaded by `get_entries`.
     * 
     * 
     * 
     * @param {string} user_path - a user directory for all 
     * @param {string} entry_type - the kind of asset being entered into the tables 
     * @returns triple - object map, the cluster name for the objects, the file path
     */
    async get_entries_record(user_path,entry_type) {
        let consumer_of_type = map_entry_type_to_consumer(entry_type)
        let entries_file = user_path + `/${consumer_of_type}.json`
        try {
            let entries_record = await this.get_entries(entries_file)
            if ( entries_record ) return [entries_record, entries_file]    
        } catch (e) {}
        return [false,false]
    }


    get_consumer_list(pub_type) {
        let consumer_of_type = map_entry_type_to_consumer(pub_type)
        if ( !(Array.isArray(consumer_of_type)) ) {
            consumer_of_type = [consumer_of_type]
        }
        return consumer_of_type
    }

    /**
     * publish_entry
     * 
     * This makes the topic having to do with the update of this media so that the data 
     * (not filtered data as for mini-link-service) can be published to subscribers.
     * 
     * Most subcribers will be admin and couting services.
     * 
     * This method publishes the new/updated record to subscibers (counting services)
     * 
     * @param {string} entries_file - the name of the file that holds the entries record
     * @param {object} entries_record - a single meta record for a larger media file
     * @param {string} consumer_of_type - a subscriber identifies its type by subscibing to publish_$type
     * @param {string} user_id - the user id of the owner/creator of the media
     */
    async publish_entry(u_obj,consumer_of_type,user_id) {
        let topic = `publish_${consumer_of_type}`
        let pub_obj = {
            "_id" : user_id
        }
        pub_obj[consumer_of_type] = encodeURIComponent(JSON.stringify(u_obj))        
        this.app_publish(topic,pub_obj)     // send the dashboard or profile back to DB closers to the UI client
    }


    /**
     * unpublish_entry
     * 
     * This makes the topic having to do with the update of this media so that the data 
     * (not filtered data as for mini-link-service) can be published to subscribers.
     * 
     * Most subcribers will be admin and couting services.
     * 
     * This method publishes the new/updated record to subscibers (counting services)
     * 
     * @param {string} entries_file - the name of the file that holds the entries record
     * @param {object} entries_record - a single meta record for a larger media file
     * @param {string} consumer_of_type - a subscriber identifies its type by subscibing to unpublish_$type
     * @param {string} user_id - the user id of the owner/creator of the media
     */
    async unpublish_entry(u_obj,consumer_of_type,user_id) {
        let topic = `delete_${consumer_of_type}`
        let pub_obj = {
            "_id" : user_id
        }
        pub_obj[consumer_of_type] = encodeURIComponent(JSON.stringify(u_obj))        
        this.app_publish(topic,pub_obj)     // send the dashboard or profile back to DB closers to the UI client
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * create_consumer_entry_type
     * 
     * the entries record is a log in some sense (as it is now.)
     * 
     * Puts the new meta object into the table of entries
     * 
     * @param {object} entry_obj - the new meta object coming into the system 
     * @param {string} user_path - file naem for the particular entry object under the user (creator)
     * @param {object} entries_record - the record map for the entry type
     * @param {string} entry_type - the entry type
     */
    create_consumer_entry_type(entry_obj,user_path,entries_record,entry_type) {
        entry_obj.file_name = user_path
        if ( entries_record.entries[entry_type] === undefined ) {
            entries_record.entries[entry_type] = []
        }
        entries_record.entries[entry_type].push(entry_obj)
    }


    /**
     * update_consumer_entry_type
     * 
     * This does a clumsy linear search for the object
     * swaps it out
     * 
     * @param {object} entry_obj 
     * @param {string} user_path 
     * @param {object} entries_record 
     * @param {string} entry_type 
     * @returns pair -- <a copy of the entry obj as stored, the entry obj sent by update>, [false,false] on failure
     */
    update_consumer_entry_type(entry_obj,user_path,entries_record,entry_type) {
        entry_obj.file_name = user_path
        if ( entries_record.entries[entry_type] !== undefined ) {
            let entry_list = entries_record.entries[entry_type]
            for ( let i = 0; i < entry_list.length; i++ ) {
                let entry = entry_list[i]
                if ( entry._tracking == entry_obj._tracking ) {
                    let ref_entry = Object.assign({},entry)
                    entry_list[i] = entry_obj               // EDITED change the right object == _id match (overwrite)
                    return [ref_entry,entry_obj]
                }
            }
        }
        return [false,false]
    }


    /**
     * update_consumer_entry_type_field
     * 
     * This does a clumsy linear search for the object
     * 
     * changes the one field indicated by the field string parameter
     * 
     * @param {object} entry_obj 
     * @param {string} user_path 
     * @param {object} entries_record 
     * @param {string} entry_type 
     * @param {string} field 
     * @returns pair -- <a copy of the entry obj as stored, the entry obj sent by update>, [false,false] on failure
     */
    update_consumer_entry_type_field(entry_obj,user_path,entries_record,entry_type,field) {
        entry_obj.file_name = user_path
        if ( entries_record.entries[entry_type] !== undefined ) {
            let entry_list = entries_record.entries[entry_type]
            for ( let i = 0; i < entry_list.length; i++ ) {
                let entry = entry_list[i]
                if ( entry._tracking == entry_obj._tracking ) {
                    let ref_entry = Object.assign({},entry)
                    let value = entry_obj[field]
                    entry[field] = value     // entry has been edited EDITED change value
                    return [ref_entry,entry]
                }
            }
        }
        return [false,false]
    }


    /**
     * delete_consumer_entry_type
     * 
     * This does a clumsy linear search for the object
     * removes it from the array by splicing
     * 
     * @param {object} entry_obj 
     * @param {object} entries_record 
     * @param {string} entry_type 
     * @returns  boolean
     */
    delete_consumer_entry_type(entry_obj,entries_record,entry_type) {
        //
        if ( entries_record.entries[entry_type] !== undefined ) {
            let entry_list = entries_record.entries[entry_type]
            let del_index = -1
            for ( let i = 0; i < entry_list.length; i++ ) {
                let entry = entry_list[i]
                if ( entry._tracking == entry_obj._tracking ) {
                    del_index = i
                    break;
                }
            }
            if ( del_index >= 0 ) {
                entry_list.splice(del_index,1)      // entries have been edited EDITED delete
                return true
            }
        }
        return false
        //
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * user_action_keyfile
     * 
     * This updates the general log table for a user's meta descriptions. And, it manages subscription publication.
     * 
     * Most of this has to do with the update of auditing data. A file introduced through this process, 
     * if altered will move through upload channels, and the change will be recorded here. Records will be shared 
     * via a process of publication with subscribed databases. 
     * 
     * In the case of a `repoisitory` based operation, a file may in fact move from one machine to another in order to pin it.
     * Otherwise, if the repository is `local` the file will be stored at one disk location and the repository will 'pin' simply
     * by marking the file as a keepsake, i.e. it may not be deleted.
     * 
     * 
     * Each object that comes in should have a `_transition_path` or a `key_field` field.
     * This field will be a filed that names another filed to find a structured string wtih three parts delimited by '+'.
     * The string is separated into three parts from left to right.
     * The first part is a user id, the second part is an entry type (a media type), the third and final part
     * is a string refered to as the `asset file base`, which will either be a name or a key field for the data object.
     * This will be used to find the object when it is lated requested. 
     * 
     * The `asset file base` is usually the ucwid of the file, which is a sha255 hash of other hashes made from hashing the file and
     * some other versions of it.
     * 
     * Each operation, C, U, F, D first gets the entries record for the type associated with the user.
     * The user ID part is the directory under the configured `user_directory` where the types of data will be found.
     * This path is given to `get_entries_record`.
     * 
     * The operation can make changes to the table, etc.
     * Then, the `user_action_keyfile` method writes the table to the directory (immediate update per user... might be more graceful)
     * 
     * This method `user_action_keyfile` does not (DOES NOT) write the record to the file ( that is done by the caller for each operation)
     * 
     * So, this only updates the general log table. And, it manages subscription publication.
     * 
     * 
     * Call path: PersistenceMessageEndpoint::app_message_handler (on receipt of message to endpoint {message-relay-services})
     * Operation 'op' is 'S' with 'action' in {create,update}. OR 'op' is 'D' 
     * `app_message_handler` calls `create_entry_type`, `update_entry_type` -> `user_action_keyfile`
     * `app_message_handler` calls `delete` -> `user_action_keyfile`
     * 
     * 
     * @param {string} op 
     * @param {object} u_obj - the message object bearing meta data for a media asset
     * @param {string} field 
     * @param {object} value -- included for regularity (other uses use value)
     */
    async user_action_keyfile(op,u_obj,field,value) {  // items coming from the editor  (change editor information and publish it back to consumers)
        //
        let key_field = u_obj.key_field ? u_obj.key_field : u_obj._transition_path
        let asset_info = u_obj[key_field]   // dashboard+striking@pp.com  profile+striking@pp.com
        //
        asset_info = asset_info.split('+')
        let user_path = this.user_directory
        let user_id = asset_info.pop()
        let entry_type = asset_info.pop()
        let asset_file_base = asset_info.pop()
        user_path += '/' + user_id
        //
        switch ( op ) {
            case 'C' : {
                //
                let [entries_record, entries_file] = await this.get_entries_record(user_path,entry_type)
                user_path += `/${entry_type}/${asset_file_base}.json`
                //
                this.create_consumer_entry_type(u_obj,user_path,entries_record,entry_type)
                //
                await this.put_entries(entries_file,entries_record)
                //
                let consumers_of_type = this.get_consumer_list(this.full_entry_consumer_type)
                //
                for ( let cot of consumers_of_type ) {      // publish full meta to these consumer
                    await this.publish_entry(u_obj,cot,user_id)
                }
                break;
            }
            case 'U' : {    // update (read asset_file_base, change, write new)
                //
                let [entries_record, entries_file] = await this.get_entries_record(user_path,entry_type)
                user_path += `/${entry_type}/${asset_file_base}.json`
                //
                this.update_consumer_entry_type(u_obj,user_path,entries_record,entry_type)
                //
                await this.put_entries(entries_file,entries_record)
                //
                let consumers_of_type = this.get_consumer_list(this.full_entry_consumer_type)
                //
                for ( let cot of consumers_of_type ) {
                    await this.publish_entry(u_obj,cot,user_id)
                }
                break;
            }
            case 'F' : {        // change one field
                //
                let [entries_record, entries_file] = await this.get_entries_record(user_path,entry_type)
                user_path += `/${entry_type}/${asset_file_base}.json`
                //
                this.update_consumer_entry_type_field(u_obj,user_path,entries_record,entry_type,field)
                //
                await this.put_entries(entries_file,entries_record)
                //
                let consumers_of_type = this.get_consumer_list(this.full_entry_consumer_type)
                //
                for ( let cot of consumers_of_type ) {
                    await this.publish_entry(u_obj,cot,user_id)
                }
                break;
            }
            case 'D' : {
                //
                let [entries_record, entries_file] = await this.get_entries_record(user_path,entry_type)
                //
                this.delete_consumer_entry_type(u_obj,entries_record,entry_type)
                //
                await this.put_entries(entries_file,entries_record)
                //
                let consumers_of_type = this.get_consumer_list(this.full_entry_consumer_type)
                //
                for ( let cot of consumers_of_type ) {
                    await this.unpublish_entry(u_obj,cot,user_id)
                }
                break;
            }
        }
    }
}



module.exports = TransitionsODBEndpoint
