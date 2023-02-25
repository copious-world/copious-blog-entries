//
const {TransitionsODBEndpoint} = require("odb-services")
const {WSMessageRelayer} = require('message-relay-websocket')
//

const {FileOperationsCache} = require('extra-file-class')
const cal_consts = require('../defs/calendar-constants')

const month_utils = require('month-utils')
const {EventDays} = require('event-days')

// ----
const MonthContainer = EventDays.MonthContainer
const TimeSlotAgenda = EventDays.TimeSlotAgenda
const TimeSlot = EventDays.TimeSlot
//


const MINI_LINK_SERVER_ADD_TOPIC = "add-month"
const MINI_LINK_SERVER_REMOVE_TOPIC = "remove-month"

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


class SafeStorageAgendaInterface extends TimeSlotAgenda {

    // ----
    constructor(day,index) {
        super(day,index)
    }

    alter_proposed_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }

    drop_published_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }

    add_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }

    drop_proposed_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }

    publish_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }

}




// MonthManagement --
//      Update and create call user_action_keyfile -- 
//      MonthManagement takes in the slot definitions and stores them as month objects.
//      On WS paths, ws_action_keyfile take in updates to the month agendas. 


class MonthManagement extends TransitionsODBEndpoint {

    constructor(conf) {
        super(conf)
        //
        this.agenda_class = conf.agenda_class ? conf.agenda_class : SafeStorageAgendaInterface
        //
        this.all_months = {}
        this.planned_changes = {}
        //
        this.fos = new FileOperationsCache(conf.time_archived_data)
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

    deserialize_month_filler(agenda,src_agenda) {
        throw new Error("deserialize_month_filler in MonthManagement in time_managed_category_server must be implemented by descendant class")
    }

    months_from_data(cls_mo,agenda_class) {
        let start_time = cls_mo.start_time
        let mo = new MonthContainer(start_time,agenda_class)
        //
        let mo_cal = mo.cal.map
        for ( let aky in mo_cal ) {
            let agenda = mo_cal[aky]
            let src_agenda = cls_mo[aky]
            this.deserialize_month_filler(agenda,src_agenda)
        }
        return mo
    }

    async serialize(file_path) {
        //
        let storable = {
            "all_months" : this.all_months,
            "planned_changes" : this.planned_changes
        }
        //
        await this.fos.output_json(file_path,storable)
    }

    async deserialize(file_path) {
        let storable = await this.fos.load_json_at_path(file_path)
        if ( storable ) {
            this.planned_changes = storable.planned_changes
            let classless = storable.all_months
            for ( let cls_mo_ky in classless ) {
                let cls_mo = classless[cls_mo_ky]
                classless[cls_mo_ky] = this.months_from_data(cls_mo,this.agenda_class)

            }
            this.all_months = classless    
        }
    }

}



// Serializing collection in memory as a collection 
// rather than serializing each object. 
//
class TimeManagedDataEndpoint extends MonthManagement {
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

        this.conf = conf

        this.initalize(conf.slot_backup)
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    initalize(file_path) {
        if ( file_path ) {
            this.deserialize(file_path)
        }
    }

    shutdown() {
        this.deserialize(this.conf.slot_backup)
    }

    make_path(msg_obj) {  // descendants have special cases
        return "./" + msg_obj._id
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


    generate_month_tracking(mo) {
        // use date and hash
        let str = `${mo.start_time}-${mo.day}-${mo.year}`
        return do_hash(str)
    }


    // Two mini link servers are connected... 
    // one is for public searches, the second is for owner/admin allowing for responses to user_id....
    publish_mini_link_server(topic,msg_obj) {
        // admin pulication -- may not be in every type of application
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
    
    
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---
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
                let max_end = u_obj.end_all_time

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


    ws_publish_month(a_mo) {
        //
        let message = {
            "start_time" : a_mo.start_time,
            "year" : a_mo.year,
            "month" : a_mo.month
        }
        //
        this.web_ws_proxy.publish(cal_consts.APPRISE_NEW_MONTH_DATA,cal_consts.USER_CHAT_PATH,message)
        this.publish_mini_link_server(MINI_LINK_SERVER_ADD_TOPIC,a_mo)
    }


    add_planned_change(req) {
        this.planned_changes[req.begin_at] = req
    }

    ws_subscribe_and_handler(topic,agenda_op) {
        let self = this
        this.web_ws_proxy.subscribe(topic,cal_consts.USER_CHAT_PATH,(message) => {
            let the_agenda = self.get_agenda_of_request(message)
            let slot_req = message.slot_req
            if ( the_agenda && slot_req && agenda_op(the_agenda,slot_req) ) {
                let the_month = self.get_month_of_request(message)
                self.ws_publish_month(the_month)
            } else {
                this.add_planned_change(slot_req)
            }
        })
    }

    // // ---- ---- ---- ---- ---- ---- ----
    web_socket_subscriptions() {
        //
        this.ws_subscribe_and_handler(cal_consts.ACCEPT_EVENT_TOPIC,(the_agenda,slot_req) => { return the_agenda.publish_data(slot_req) })
        this.ws_subscribe_and_handler(cal_consts.SCHEDULER_ACCEPTED_TOPIC,(the_agenda,slot_req) => { return the_agenda.publish_data(slot_req) })
        //
        this.ws_subscribe_and_handler(cal_consts.REJECT_DATA_TOPIC,(the_agenda,slot_req) => { return the_agenda.drop_proposed_data(slot_req) })
        this.ws_subscribe_and_handler(cal_consts.ADD_DATA_EVENT_TOPIC,(the_agenda,slot_req) => { return the_agenda.add_data(slot_req) })
        this.ws_subscribe_and_handler(cal_consts.DATA_EVENT_CHANGE_TOPIC,(the_agenda,slot_req) => { return the_agenda.alter_proposed_data(slot_req) })
        this.ws_subscribe_and_handler(cal_consts.DATA_EVENT_DROP_TOPIC,(the_agenda,slot_req) => { return the_agenda.drop_published_data(slot_req) })
        //
    }

}


module.exports = TimeManagedDataEndpoint
module.exports.SafeStorageAgendaInterface = SafeStorageAgendaInterface

