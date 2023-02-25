//
const {WSServeMessageEndpoint} = require('message-relay-websocket')
const {FileOperationsCache} = require('extra-file-class')


// connect to a relay service...
// set by configuration (only one connection, will have two paths.)

const cal_consts = require('../defs/calendar-constants')

// In particular this is a message queue...
// Message history may be stored elsewhere.
// These are message that are waiting to be delivered to latecoming subscribers.
// The aim is for continuity in a window of data...
//
class TimeManagedMessageQueue extends WSServeMessageEndpoint {

    constructor(conf) {
        super(conf)
        this.waiting_messages = {}
        this.stored_message_path = conf.stored_message_file
        this.fos = new FileOperationsCache(conf.stored_messages)
    }

    // do this on command... this may happen every few days or so...
    remove_old_messages(before_time) {
        for ( let topic in this.waiting_messages ) {
            let mlist = this.waiting_messages[topic]   /// This table is mapped from topic to lists of waiting messages
            while ( mlist.length ) {
                let mobj_pair = mlist[0]        // Each list element is a pair
                let tstamp = mobj_pair[0]       // first(elem) == time stamp
                if ( tstamp < before_time ) {   // prune old messages
                    mlist.shift()
                } else {
                    break
                }
            }
        }
    }

    async serialize() {
        await this.fos.output_json(this.stored_message_path,this.waiting_messages)
    }

    async deserialize() {
        this.waiting_messages = await this.fos.load_json_at_path(this.stored_message_path)
    }


}

// -- -- -- --
// -- -- -- --
//
class TimeManagedData extends TimeManagedMessageQueue {

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
        //
        this.add_to_topic(cal_consts.ADD_DATA_EVENT_TOPIC,'self',false)
        this.add_to_topic(cal_consts.DATA_EVENT_CHANGE_TOPIC,'self',false)
        this.add_to_topic(cal_consts.DATA_EVENT_DROP_TOPIC,'self',false)
        this.add_to_topic(cal_consts.APPRISE_NEW_MONTH_DATA,'self',false)
        //

        // descedants should an in topics for the type of data and conversation they manage

        //
        this.topic_producer = this.topic_producer_user
        if ( conf.system_wide_topics ) {
            this.topic_producer = this.topic_producer_system
        }

        this.restore_fields()

    }


    async shutdown() {
        await super.serialize()
    }


    async restore_fields() {
        await super.deserialize()
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async app_message_handler(msg_obj) {  // make a shell of connected messages... only react to ws transport
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
                p_obj._tracking = `${random_enough()}-${Date.now()}}`
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
    async app_post_start_subscription(topic,client_name,relayer) {  // a new subscribe comes in, they get old messages (some may be intended for them)
        if ( !this.waiting_messages ) return false
        if ( this.waiting_messages[topic] !== undefined ) {
            for ( let mobj_pair of this.waiting_messages[topic] ) {
                let msg_obj = mobj_pair[1]   // timestamp of entry is in 0
                this.send_to_one(relayer,msg_obj)
                return true
            }
        }
        return false
    }

    // ----
    app_publication_pre_fan_response(topic,msg_obj,ignore) {
        if ( topic === cal_consts.ADD_DATA_EVENT_TOPIC ) {           // manage date and tracking. for CRUD
            this.user_manage_date('C',msg_obj)
            this.app_generate_tracking(msg_obj)
        } else if ( topic === cal_consts.DATA_EVENT_CHANGE_TOPIC ) {
            this.user_manage_date('U',msg_obj) 
        } else if ( topic === cal_consts.DATA_EVENT_DROP_TOPIC ) {
            this.user_manage_date('D',msg_obj) 
        }

        if ( this.unknown_topic(topic) ) {
            if ( !this.waiting_messages ) return
            if ( this.waiting_messages[topic] === undefined ) {
                this.waiting_messages[topic] = []
            }
            this.waiting_messages[topic].push([Date.now(),msg_obj])
        }
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---
    // ---- don't implement user_action_keyfile ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
 
    //
    // app_publish(topic,msg_obj)
    // app_publish_on_path(topic,path,msg_obj)
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

}

module.exports = TimeManagedData