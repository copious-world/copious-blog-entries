// 
const month_utils = require('month-utils')
const {EventDays} = require('event-days')
const MonthManagement = require('./month_managment')
const TimeManagedWSProxy = require('./time_managed_ws_proxy')


// ----
const TimeSlot = EventDays.TimeSlot
//

const MINI_LINK_SERVER_ADD_TOPIC = "add-month"
const MINI_LINK_SERVER_REMOVE_TOPIC = "remove-month"

// connect to a relay service...
// set by configuration (only one connection, will have two paths.)

// Serializing collection in memory as a collection 
// rather than serializing each object. 
//
class TimeManagedDataEndpoint extends TimeManagedWSProxy {
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
        this.conf = conf
        //
        this.setup_time_element(conf)
        //
        this.initalize(conf.slot_backup)
    }

    setup_time_element(conf) {
        let TimeClass = MonthManagement
        if ( conf.time_element ) {
            TimeClass = require(conf.time_element)
        }
        this.time_element = new TimeClass(conf)
    }

    // // ---- ---- ---- ---- ---- ---- ----

    // descendant implements  TimeManagedWSProxy

    get_agenda_of_request(req) {
        if ( this.time_element )  {
            return this.time_element.get_agenda_of_request(req)
        }
        return false
    }

    get_publishable(reg) {
        if ( this.time_element )  {
            return this.time_element.get_publishable(req)
        }
        return false
    }

    handle_no_date_data(message) {
        if ( this.time_element ) this.time_element.handle_no_date_data(topic,message)
    }

    handle_inoperable(topic,message) {
        if ( this.time_element ) this.time_element.handle_inoperable(topic,message)
    }

    ws_publisher(publishable) {
        if ( this.time_element ) {
            let [topic,message,pub_content] = this.time_element.ws_publisher(publishable)
            this.web_ws_proxy.publish(topic,cal_consts.USER_CHAT_PATH,message)
            this.publish_mini_link_server(MINI_LINK_SERVER_ADD_TOPIC,pub_content)
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    initalize(file_path) {
        if ( file_path ) {
            this.deserialize(file_path)
        }
    }

    shutdown() {
        this.serialize(this.conf.slot_backup)
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    make_path(msg_obj) {  // descendants have special cases
        return "./" + msg_obj._id
    }



    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----


    async serialize(file_path) {
        if ( this.time_element ) {
            await this.time_element.serialize(file_path)
        }
    }


    async deserialize(file_path) {
        if ( this.time_element ) {
            await this.time_element.deserialize(file_path)
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
    app_generate_tracking(p_obj) {          // a universal start of month (GMT)
        if ( p_obj._tracking === undefined ) {
            p_obj._tracking = p_obj.ucwid + '-' + Date.now()
        }
        return p_obj._tracking
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    // app_subscription_handler
    //  -- Handle state changes...
    // this is the handler for the topics added directory above in the constructor  -- called post publication by endpoint in send_to_all
    app_subscription_handler(topic,msg_obj) {  // publication of event/appointment
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

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    slot_from_descr(slt) {
        //
        let label = slt.label
        let use_case = slt.use_case
        let start_time = slt.start_time
        let end_time = slt.end_time
        let importance = slt.importance
        let weekends = slt.weekends
        let daily_dur = slt.daily_dur
        //
        let slot = new TimeSlot(label,use_case,start_time,end_time,true,importance,weekends,daily_dur)
        for ( let ky in slt ) {
            slot[ky] = slt[ky]
        }
        //
        return slot
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    generate_revised_months(mo_start,max_end,t_slots) {
        return this.all_months          // really stupid default
    }

    // changes go into the timeline ---
    // the timeline has already been written to a file.
    async user_action_keyfile(op,u_obj,field,value) {  // items coming from the editor  (change editor information and publish it back to consumers)
        //
        let slots = u_obj.time_slots
        slots = (typeof slots === "string") ? JSON.parse(slots) : slots
        //
        let t_slots = slots.map( slt => { return this.slot_from_descr(slt) } )
        //
        switch ( op ) {
            case 'C' : {   // add a item to the ledger

                let min_start = u_obj.start_all_time
                let max_end = u_obj.end_all_time ? u_obj.end_all_time : Infinity

                let mo_start = month_utils.first_day_of_month_ts(min_start)
                //
                this.all_months = this.generate_revised_months(mo_start,max_end,t_slots)
                //
                await this.put_entries(this.asset_file,this.all_months)
                await this.put_entries_array(this.entries_file,slots)

                break;
            }
            case 'D' : {        // add a delete action to the ledger
                let nowtime =  u_obj.start_time
                if ( nowtime === undefined ) break;
                if ( this.all_months[nowtime] === undefined ) break
                else {
                    let keyed_assets = this.all_months[nowtime]
                    if ( keyed_assets ) {
                        delete this.all_months[nowtime]
                    }
                    // need to remove -- ?? directories per file?
                    await this.put_entries(this.asset_file,this.all_months)    
                    await this.put_entries_array(this.entries_file,entries_record)
                }
                //
                break;
            }
        }
    }

}

module.exports = TimeManagedDataEndpoint
