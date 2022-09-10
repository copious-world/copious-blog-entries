const {PersistenceCategory} = require("categorical-handlers")
//
const fs = require('fs')
const crypto = require('crypto')


// connect to a relay service...
// set by configuration (only one connection, will have two paths.)

function do_hash (text) {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    let ehash = hash.digest('base64');
    ehash = ehash.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    return(ehash)
}

// -- -- -- --
// -- -- -- --
//
class TransitionsContactEndpoint extends PersistenceCategory {

    //
    constructor(conf) {
        super(conf)
        //
        this.all_contacts = {}
        this.entries_file = `${conf.contacts_directory}/${Date.now()}.json`
        this.entries_sep = ""
        this.app_handles_subscriptions = true
        //
        this.path = `${conf.address}:${conf.port}`
        this.client_name = this.path
        //
        this.app_subscriptions_ok = true
        this.app_meta_universe = true
        // ---------------->>  topic, client_name, relayer  (when relayer is false, topics will not be written to self)
        this.add_to_topic("publish-contact",'self',false)           // allow the client (front end) to use the pub/sub pathway to send state changes
        this.add_to_topic("delete-contact",'self',false)           // allow the client (front end) to use the pub/sub pathway to send state changes
        //
        this.topic_producer = this.topic_producer_user
        if ( conf.system_wide_topics ) {
            this.topic_producer = this.topic_producer_system
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async app_message_handler(msg_obj) {
        let op = msg_obj._tx_op
        let result = "OK"
        let user_id = msg_obj._user_dir_key ? msg_obj[msg_obj._user_dir_key] : msg_obj._id
        if ( (user_id === undefined) && (msg_obj._id !== undefined) ) {
            user_id = msg_obj._id
        }
        msg_obj._id = user_id
        //
        return({ "status" : result, "explain" : `${op} performed`, "when" : Date.now() })
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----


    // ----
    topic_producer_user(producer_of_type,user_id) {
        return  `user-${producer_of_type}-${user_id}`
    }

    // ----
    topic_producer_system(producer_of_type,user_id) {
        return `user-${producer_of_type}`
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
    application_meta_publication(msg_obj,app_meta_universe) {        // publications going to mini link servers
        let conversation = msg_obj.conversation         //  asset -type
        let topic = `add_contact_${conversation}`  // in persistence, the conversation is a media type or meta type
        this.publish_mini_link_server(topic,msg_obj)
    }


    // ----
    application_meta_remove(msg_obj,app_meta_universe) {
        let conversation = msg_obj.conversation
        //if ( !app_meta_universe ) return;
        let topic = `remove_contact_${conversation}`  // in persistence, the conversation is a media type or meta type
        this.publish_mini_link_server(topic,msg_obj)
    }


    // app_subscription_handler
    //  -- Handle state changes...
    // this is the handler for the topics added directory above in the constructor
    app_subscription_handler(topic,msg_obj) {
        //
        if ( topic === 'publish-contact' ) {
            msg_obj._tx_op = 'P'
        } else if ( topic === 'delete-contact' ) {
            msg_obj._tx_op = 'D'
        }
        //
        this.app_message_handler(msg_obj)           // run the handler (often gotten to by relay to endpoint messaging ... this is pub/sub pathway)
        //
        if ( topic === 'publish-contact' ) {
            let op = 'C' // change one field
            let field = "ucwid"
            this.user_action_keyfile(op,msg_obj,field,false)
        } else if (topic === 'delete-contact' ) {
            let op = 'D // change one field
            let field = "ucwid"
            this.user_action_keyfile(op,msg_obj,field,false)
        }
    }

    // ----
    application_data_update(u_obj,data) {
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

    async put_entries(entries_file,entries_record) {
        let entries_record_str = this.entries_sep + JSON.stringify(entries_record) +'\n'    // STORE AS STRING
        this.entries_sep = ','
        await this.write_append_string(entries_file,entries_record_str,false)
        return entries_record_str
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    async user_action_keyfile(op,u_obj,field,value) {  // items coming from the editor  (change editor information and publish it back to consumers)
        //
        let asset_info = u_obj[field]   // dashboard+striking@pp.com  profile+striking@pp.com
        //
        let user_path = this.user_directory
        user_path += '/' + asset_info
        //
        switch ( op ) {
            case 'C' : {   // add a contact to the ledger
                let nowtime =  Date.now()
                u_obj.when = nowtime
                if ( this.all_contacts[asset_info] === undefined ) this.all_contacts[asset_info] = {}
                let keyed_assets = this.all_contacts[asset_info]
                keyed_assets[nowtime] = u_obj
                //
                await this.put_entries(this.entries_file,u_obj)
                break;
            }
            case 'D' : {        // add a delete action to the ledger
                let nowtime =  Date.now()
                u_obj.deleted = nowtime
                if ( this.all_contacts[asset_info] === undefined ) break
                else {
                    let keyed_assets = this.all_contacts[asset_info]
                    keyed_assets[nowtime] = u_obj
                    await this.put_entries(this.entries_file,u_obj)    
                }
                //
                break;
            }
        }
    }
}


// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------
// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------


let conf_file = 'contact-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}

let conf = JSON.parse(fs.readFileSync(conf_file).toString())
let endpoint = conf

console.log(`Contact Server: PORT: ${endpoint.port} ADDRESS: ${endpoint.address}`)

new TransitionsContactEndpoint(endpoint)

// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------
// (end file)
