//
const {PersistenceCategory} = require("categorical-handlers")
const {WSMessageRelayer} = require('message-relay-websocket')
//
const fs = require('fs')
const cal_consts = require('../defs/calendar-constants')

const month_utils = require('month-utils')
const event_days = require('event-days')

const MonthContainer = event_days.MonthContainer()


const MINI_LINK_SERVER_ADD_TOPIC = "add-month"
const MINI_LINK_SERVER_REMOVE_TOPIC = "remove-month"


// connect to a relay service...
// set by configuration (only one connection, will have two paths.)

// -- -- -- --
// -- -- -- --

class MonthManagement extends PersistenceCategory {

    constructor(conf) {
        super(conf)
        //
        this.all_months = {}
    }

    //
    get_month_of_request(req) {
        let start_time = month_utils.first_day_of_month_ts(req.start_time)
        if ( this.all_months[start_time] === undefined ) {
            this.all_months[start_time] = new MonthContainer(start_time)
        }
        return this.all_months[start_time]
    }

    //
    get_agenda_of_request(req) {
        let a_month = this.get_month_of_request(req)
        if ( a_month ) {
            let a_day = a_month.day_of(req.start_time)
            let agenda = a_month.get_day_agenda(a_day)
            return agenda ? agenda : false
        }
        return false
    }

}




//
class TransitionsContactEndpoint extends MonthManagement {
    //
    constructor(conf) {
        super(conf)
        //
        this.asset_file = `${conf.assets_directory}/${Date.now()}.json`  // store the latest map
        this.entries_file = `${conf.updating_records_directory}/${Date.now()}.json` // write to the mini-link-server dir
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
        this.add_to_topic("publish-calendar",'self',false)           // allow the client (front end) to use the pub/sub pathway to send state changes
        this.add_to_topic("delete-calendar",'self',false)           // allow the client (front end) to use the pub/sub pathway to send state changes
        //
        this.topic_producer = this.topic_producer_user
        if ( conf.system_wide_topics ) {
            this.topic_producer = this.topic_producer_system
        }
        //
        this.web_ws_proxy = new WSMessageRelayer(conf.ws_proxy)
        this.web_ws_proxy.on('client-ready',() => {
            this.web_socket_subscriptions()
        })
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
    app_generate_tracking(p_obj) {          // a universal start of month (GMT)
        if ( p_obj._tracking === undefined ) {
            p_obj._tracking = p_obj.ucwid + '-' + Date.now()
        }
        return p_obj._tracking
    }


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

    // app_subscription_handler
    //  -- Handle state changes...
    // this is the handler for the topics added directory above in the constructor  -- called post publication by endpoint in send_to_all
    app_subscription_handler(topic,msg_obj) {
        //
        if ( topic === 'publish-calendar' ) {
            msg_obj._tx_op = 'P'
        } else if ( topic === 'delete-calendar' ) {
            msg_obj._tx_op = 'U'
        }
        //
        if ( topic === 'publish-calendar' ) {
            let op = 'C' // change one field
            let field = "ucwid"
            this.user_action_keyfile(op,msg_obj,field,false)
            this.publish_mini_link_server(MINI_LINK_SERVER_ADD_TOPIC,msg_obj)
        } else if (topic === 'delete-calendar' ) {
            let op = 'D' // change one field
            let field = "ucwid"
            this.user_action_keyfile(op,msg_obj,field,false)
            this.publish_mini_link_server(MINI_LINK_SERVER_REMOVE_TOPIC,msg_obj)
        }
    }


    app_publication_pre_fan_response(topic,msg_obj,ignore) {
        if ( topic === 'publish-calendar' ) {
            this.user_manage_date('C',msg_obj)
            this.app_generate_tracking(msg_obj)
        } else if ( topic === 'delete-calendar' ) {
            this.user_manage_date('U',msg_obj) 
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
        let entries_record_str = JSON.stringify(entries_record)         // STORE AS STRING
        await this.write_out_string(entries_file,entries_record_str,false)
        return entries_record_str
    }

    async put_entries_array(entries_file,entries_record) {
        let e_array = Object.keys(entries_record).map(ky => { return entries_record[ky] })
        let entries_record_str = JSON.stringify(e_array)         // STORE AS STRING
        await this.write_out_string(entries_file,entries_record_str,false)
        return entries_record_str
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    // changes go into the timeline ---
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
                await this.put_entries(this.asset_file,this.all_months)
                await put_entries_array(this.entries_file,entries_record)
                break;
            }
            case 'U' : {   // add a contact to the ledger
                let nowtime = u_obj.start_time
                if ( this.all_months[nowtime] === undefined ) break;
                else {
                    this.all_months[nowtime] = u_obj
                    await this.put_entries(this.asset_file,this.all_months)    
                    await put_entries_array(this.entries_file,entries_record)
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
                    await this.put_entries(this.asset_file,this.all_months)    
                    await put_entries_array(this.entries_file,entries_record)
                }
                //
                break;
            }
        }
    }


    // // ---- ---- ---- ---- ---- ---- ----
    web_socket_subscriptions() {
        let self = this
        this.web_ws_proxy.subscribe(cal_consts.ACCEPT_EVENT_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            // what has to be done to the message?
            let the_agenda = self.get_agenda_of_request(message)
            let a_slot = message.slot
            the_agenda.remove_slot(message.start_time)
            the_agenda.add_slot(a_slot)
            let the_month = self.get_month_of_request(message)
            self.user_action_keyfile('U',the_month) 
        })
        this.web_ws_proxy.subscribe(cal_consts.SCHEDULER_ACCEPTED_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            // what has to be done to the message?
            let the_agenda = self.get_agenda_of_request(message)
            let a_slot = message.slot
            the_agenda.remove_slot(message.start_time)
            the_agenda.add_slot(a_slot)
            let the_month = self.get_month_of_request(message)
            self.user_action_keyfile('U',the_month) 
        })
        this.web_ws_proxy.subscribe(cal_consts.REJECT_EVENT_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            // what has to be done to the message?
            let the_agenda = self.get_agenda_of_request(message)
            the_agenda.remove_slot(message.start_time)
            let the_month = self.get_month_of_request(message)
            self.user_action_keyfile('D',the_month) 
        })

        // cal_consts.SUGGEST_CHANGE_EVENT_TOPIC  ... this might be captured for notification... but just needs to go between browsers

        // emit cal_consts.NOTIFY_TIMELINE_CHANGE  ... this can be published after injesting a new timeline... it would not be captured by the server
        // emit cal_consts.TIMELINE_UPDATE_READY   ...  this is the same idea... after the admin submits the change, browsers may be notified to load the new time line

        this.web_ws_proxy.subscribe(cal_consts.REQUEST_EVENT_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            // what has to be done to the message?
            let the_agenda = self.get_agenda_of_request(message)
            let a_slot = message.slot
            the_agenda.remove_slot(message.start_time)
            the_agenda.add_slot(a_slot)
            let the_month = self.get_month_of_request(message)
            self.user_action_keyfile('C',the_month)   // create the request... put it into the timelien and then publish the change...
        })

        this.web_ws_proxy.subscribe(cal_consts.REQUEST_EVENT_CHANGE_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            // The user or admin wants to change the event but not cancel (long shorter different time)
            // what has to be done to the message?
            let the_agenda = self.get_agenda_of_request(message)
            let a_slot = message.slot
            the_agenda.remove_slot(message.start_time)
            the_agenda.add_slot(a_slot)
            let the_month = self.get_month_of_request(message)
            self.user_action_keyfile('U',the_month)   // create the request... put it into the timelien and then publish the change...
        })

        this.web_ws_proxy.subscribe(cal_consts.REQUEST_EVENT_DROP_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            // what has to be done to the message?
            let the_agenda = self.get_agenda_of_request(message)
            the_agenda.remove_slot(message.start_time)
            let the_month = self.get_month_of_request(message)
            self.user_action_keyfile('D',the_month)   // create the request... put it into the timelien and then publish the change...
        })

    }

}


// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------
// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------


let conf_file = 'calendar-service.conf'
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
