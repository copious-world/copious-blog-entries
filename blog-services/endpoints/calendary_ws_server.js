//
const {WSServeMessageEndpoint} = require('message-relay-websocket')
const fs = require('fs')


// connect to a relay service...
// set by configuration (only one connection, will have two paths.)

const cal_consts = require('../defs/calendar-constants')


class TimeManagedData extends WSServeMessageEndpoint {

    constructor(conf) {
        super(conf)
        this.waiting_messages = {}
        this.stored_message_path = conf.stored_message_file
    }

    // do this on command... this may happen every few days or so...
    remove_old_messages(before_time) {
        for ( let topic in this.waiting_messages ) {
            let mlist = this.waiting_messages[topic]
            while ( mlist.length ) {
                let mobj_pair = mlist[0]
                let tstamp = mobj_pair[0]
                if ( tstamp < before_time ) {
                    mlist.shift()
                } else {
                    break
                }
            }
        }
    }

    serialize() {
        try {
            let output = JSON.stringify(this.waiting_messages)
            fs.writeFileSync(this.stored_message_path,output)
        } catch (e) {}
    }

    deserialize() {
        try {
            let data = fs.readFileSync(file_path)
            let json = data.toString()
            this.stored_message_path = JSON.parse(json)
        } catch (e) {
        }
    }
}

// -- -- -- --
// -- -- -- --
//
class WSCalendarEndpoint extends TimeManagedData {

    //
    constructor(conf) {
        super(conf)
        //
        this.all_months = {}
        this.entries_file = `${conf.contacts_directory}/${Date.now()}.json`
        this.entries_sep = ""
        this.app_handles_subscriptions = true
        this.app_can_block_and_respond = true
        //
        this.path = `${conf.address}:${conf.port}`
        this.client_name = this.path
        //
        //  meta_publication not used for calendars
        //
        this.app_subscriptions_ok = true
        // ---------------->>  topic, client_name, relayer  (when relayer is false, topics will not be written to self)
        this.add_to_topic(cal_consts.SUGGEST_CHANGE_EVENT_TOPIC,'self',false)
        this.add_to_topic(cal_consts.ACCEPT_EVENT_TOPIC,'self',false)
        this.add_to_topic(cal_consts.SCHEDULER_ACCEPTED_TOPIC,'self',false)
        this.add_to_topic(cal_consts.REJECT_EVENT_TOPIC,'self',false)
        //
        this.add_to_topic(cal_consts.NOTIFY_TIMELINE_CHANGE,'self',false)
        //
        this.add_to_topic(cal_consts.TIMELINE_UPDATE_READY,'self',false)
        this.add_to_topic(cal_consts.REQUEST_EVENT_TOPIC,'self',false)
        this.add_to_topic(cal_consts.REQUEST_EVENT_CHANGE_TOPIC,'self',false)
        this.add_to_topic(cal_consts.REQUEST_EVENT_DROP_TOPIC,'self',false)

        this.add_to_topic(cal_consts.APPRISE_NEW_MONTH_DATA,'self',false)

        //
        this.topic_producer = this.topic_producer_user
        if ( conf.system_wide_topics ) {
            this.topic_producer = this.topic_producer_system
        }

        this.restore_fields()

    }


    shutdown() {
        super.serialize()
    }


    restore_fields() {
        super.deserialize()
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async app_message_handler(msg_obj) {
        let op = msg_obj._tx_op
        let result = "OK"
        //
        return({ "status" : result, "explain" : `${op} performed`, "when" : Date.now() })
    }



    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    // ----
    app_generate_tracking(p_obj) {
        if ( p_obj._tracking === undefined ) {
            if (  p_obj.ucwid ) {
                p_obj._tracking = p_obj.ucwid + '-' + Date.now()
            } else if (  p_obj.user_id ) {
                p_obj._tracking = p_obj.user_id + '-' + Date.now()
            } else {
                p_obj._tracking = `${random_enough()-${Date.now()}}`
            }
        }
        return p_obj._tracking
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    // app_subscription_handler
    //  -- Handle state changes...
    // this is the handler for the topics added directory above in the constructor  -- called post publication by endpoint in send_to_all
    app_subscription_handler(topic,msg_obj) {
        //
    }

    // ----
    async app_post_start_subscription(topic,client_name,relayer) {
        if ( this.waiting_messages[topic] !== undefined ) {
            for ( let mobj_pair of this.waiting_messages[topic] ) {
                let msg_obj = mobj_pair[1]   // timestamp of entry is in 0
                this.send_to_one(relayer,msg_obj)
            }
        }
    }

    // ----
    app_publication_pre_fan_response(topic,msg_obj,ignore) {
        if ( topic === cal_consts.REQUEST_EVENT_TOPIC ) {
            this.user_manage_date('C',msg_obj)
            this.app_generate_tracking(msg_obj)
        } else if ( topic === cal_consts.REQUEST_EVENT_CHANGE_TOPIC ) {
            this.user_manage_date('U',msg_obj) 
        } else if ( topic === cal_consts.REQUEST_EVENT_DROP_TOPIC ) {
            this.user_manage_date('D',msg_obj) 
        }

        if ( this.unknown_topic(topic) ) {
            if ( this.waiting_messages[topic] === undefined ) {
                this.waiting_messages[topic] = []
            }
            this.waiting_messages[topic].push([Date.now(),msg_obj])
        }
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


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---
    // ---- don't implement user_action_keyfile ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
 
    //
    // app_publish(topic,msg_obj)
    // app_publish_on_path(topic,path,msg_obj)
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

}


// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------
// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------


let conf_file = 'ws-calendar-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}

let conf = JSON.parse(fs.readFileSync(conf_file).toString())
let endpoint = conf

console.log(`Contact Server: PORT: ${endpoint.port} ADDRESS: ${endpoint.address}`)

let ws_endpoint = new WSCalendarEndpoint(endpoint)
let hit_count = 0
process.on('SIGINT',() => {
    if ( hit_count ) {
        process.exit(0)
    }
    ws_endpoint.shutdown()
    hit_count++
    process.exit(0)
})

// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------
// (end file)
