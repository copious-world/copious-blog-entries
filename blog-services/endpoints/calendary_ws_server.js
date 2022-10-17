//
const {WSServeMessageEndpoint} = require('message-relay-websocket')



const fs = require('fs')


// connect to a relay service...
// set by configuration (only one connection, will have two paths.)



const USER_CHAT_PATH = 'calendar-owner-contact'
//
const SUGGEST_CHANGE_EVENT_TOPIC = 'owner-ask-event-calendar-change'
const ACCEPT_EVENT_TOPIC = 'owner-accept-event-calendar'
const SCHEDULER_ACCEPTED_TOPIC = 'owner-accept-event-calendar'
const REJECT_EVENT_TOPIC = 'owner-drop-event-calendar'
const NOTIFY_TIMELINE_CHANGE = 'owner-change-timeline-calendar'

const TIMELINE_UPDATE_READY = 'timeline-update-available'
//
const REQUEST_EVENT_TOPIC = 'user-request-event-calendar'
const REQUEST_EVENT_CHANGE_TOPIC = 'user-request-change-event-calendar'
const REQUEST_EVENT_DROP_TOPIC = 'user-request-drop-event-calendar'
//

// -- -- -- --
// -- -- -- --
//
class WSCalendarEndpoint extends WSServeMessageEndpoint {

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
        this.add_to_topic(SUGGEST_CHANGE_EVENT_TOPIC,'self',false)
        this.add_to_topic(ACCEPT_EVENT_TOPIC,'self',false)
        this.add_to_topic(SCHEDULER_ACCEPTED_TOPIC,'self',false)
        this.add_to_topic(REJECT_EVENT_TOPIC,'self',false)
        //
        this.add_to_topic(NOTIFY_TIMELINE_CHANGE,'self',false)
        //
        this.add_to_topic(TIMELINE_UPDATE_READY,'self',false)
        this.add_to_topic(REQUEST_EVENT_TOPIC,'self',false)
        this.add_to_topic(REQUEST_EVENT_CHANGE_TOPIC,'self',false)
        this.add_to_topic(REQUEST_EVENT_DROP_TOPIC,'self',false)
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
        //
        return({ "status" : result, "explain" : `${op} performed`, "when" : Date.now() })
    }



    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    // ----
    app_generate_tracking(p_obj) {
        if ( p_obj._tracking === undefined ) {
            p_obj._tracking = p_obj.ucwid + '-' + Date.now()
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


    app_publication_pre_fan_response(topic,msg_obj,ignore) {
        if ( topic === REQUEST_EVENT_TOPIC ) {
            this.user_manage_date('C',msg_obj)
            this.app_generate_tracking(msg_obj)
        } else if ( topic === REQUEST_EVENT_CHANGE_TOPIC ) {
            this.user_manage_date('U',msg_obj) 
        } else if ( topic === REQUEST_EVENT_DROP_TOPIC ) {
            this.user_manage_date('D',msg_obj) 
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
                let nowtime =  u_obj.start_time
                if ( this.all_months[nowtime] === undefined ) this.all_months[nowtime] = u_obj
                //
                await this.put_entries(this.entries_file,this.all_months)
                break;
            }
            case 'U' : {   // add a contact to the ledger
                let nowtime = u_obj.start_time
                if ( this.all_months[nowtime] === undefined ) break;
                else {
                    this.all_months[nowtime] = u_obj
                    await this.put_entries(this.entries_file,this.all_months)    
                }
                break;
            }
            case 'D' : {        // add a delete action to the ledger
                let nowtime =  u_obj.start_time
                if ( this.all_months[nowtime] === undefined ) break
                else {
                    let keyed_assets = this.all_months[nowtime]
                    if ( keyed_assets ) {
                        delete this.all_months[nowtime]
                    }
                    // need to remove -- ?? directories per file?
                    await this.put_entries(this.entries_file,this.all_months)    
                }
                //
                break;
            }
        }
    }

 
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

new WSCalendarEndpoint(endpoint)

// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------
// (end file)
