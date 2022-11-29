//
const {PersistenceCategory} = require("categorical-handlers")
const {WSMessageRelayer} = require('message-relay-websocket')
//

const fs = require('fs')
const cal_consts = require('../defs/calendar-constants')

const month_utils = require('month-utils')
const {EventDays} = require('event-days')

// ----
const MonthContainer = EventDays.MonthContainer
const TimeSlotAgenda = EventDays.TimeSlotAgenda
const TimeSlot = EventDays.TimeSlot
//


// 11. Local time  -- solution
    // 11.a. solution:   store the blocking schedule and just load it onto the client page.
    // 11.b. timestamps are stored (these convert to local time... the display is done in terms of local time and there array is
    //         determined by my local clock... ) {{ test on the timezone -- show the clock and see the schedule update for the selected
    //         timezone. Need modulo index intot the display array... }}
// 17. off line subscribers (send when connected... )  (!1/2)

// 1. request chat works with more months shown (!1/2)
// ! 2. serialize and deserialize here (server)
// 3. ws server can set some config flags to false !* ... some methods don't have to be implemented
// 4. owner page in human frame ! 1/3
    // 4.a. transitions application runs in context
    // 4.b. transitions application sends timeline defs to the category server (calendar)
// !* 5. a way to launch the page independently in the frame (human page has some tooling tab)
// 6. update security keys (maybe tuesday)
// ! 7. human frame retains session key and does not give it out ... gets it from login .. then uses other path.
    // 7.a. may need a secure worker to provide session to new tabs containing the session key (otherwise surf within human frame)
    // 7.b. security key comes from main page in most cases, OK. (if main page closes, then need seconday openers)
// 8. mini link server (serve months fluidly) -- 
    // 8.a two servers (one is for the owner only ... security check searches... via transition server)
// 9. visitor identity checking  (if not requiring UCWID, then what?)
// 10. time line generation... really just redefines the static page for the day planner from the app level
    // 10.note: OK to load time slots
    // 10.note(2): timeline is truly a background decision filter (need to check on the server side)

// 12. keep request chat from over running
    // 12.a one way is that the events are conflicting... (all colored slots are blocked from scheduling)
// 13. owner event subscription is only possible if verified
// 14. is a sliding window necessary? (show previous months - past activity confidence)
// 15. encrypt publication in all cases ... will send key (identity verification)
    // 15.a identity is not for everyone to see (only owner search can have identity) (two calendar servers?)
// 16. Store list of personal notifications -- notification window is like everyone else's.
    // 16.a local DB for just that ... (need to all delete)

// 18. Updates show up (1. request update...  2. accept or reject a change 3. If accepted change on user page )
// 19. https://github.com/Bunlong/svelte-clock

const MINI_LINK_SERVER_ADD_TOPIC = "add-month"
const MINI_LINK_SERVER_REMOVE_TOPIC = "remove-month"
const MINI_LINK_ADMIN_PATH = 'admin-calendars'
const MINI_LINK_ADMIN_PUBLIC_PATH = 'admin-public-calendars'

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
function slot_from_descr(slt) {
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



class SafeStorageAgenda extends TimeSlotAgenda {

    // ----
    constructor(day,index) {
        super(day,index)
        //
        this.requested = {}
        this.scheduled = {}
    }

    // ----
    // have decided that this will create the month container.
    // the reason is that predefined timelines will have one of two purposes:
    // 1) they are filters and background categories that events may land into.
    // 2) they are presets for ongoing activities. 
    //
    // so, instead of searching for the slot, it will add it.
    // if there are conflicts, no calendar update will be offered to the public
    //
    add_slot_request(s_req) {
        if ( s_req.topic === cal_consts.REQUEST_EVENT_TOPIC ) {
            let cat_slot = this.add_slot(s_req)  // get the conflicts
            if ( !(cat_slot) ) {
                if ( cat_slot.use === s_req.use ) {
                    this.requested[s_req.begin_at] = s_req
                    return true
                }
            }
        }
        return false
    }

    schedule_request(s_req) {
        let req = this.requested[s_req.begin_at]
        if ( req ) {
            delete this.requested[s_req.begin_at]
            this.scheduled[req.begin_at] = s_req
            return true
        }
        return false
    }

    drop_request(s_req) {
        let req = this.requested[s_req.begin_at]
        if ( req ) {
            delete this.requested[s_req.begin_at]
        }
    }

    cancel_scheduled(s_req) {
        let req = this.scheduled[s_req.begin_at]
        if ( req ) {
            delete this.scheduled[s_req.begin_at]
        }
    }


    alter_request(s_req) {
        let req = this.requested[s_req.begin_at]
        if ( req ) {
          for ( let ky in s_req ) {
            req[ky] = s_req[ky]
          }
        }
    }
}



function months_from_data(cls_mo) {
    let start_time = cls_mo.start_time
    let mo = new MonthContainer(start_time,SafeStorageAgenda)
    //

    let mo_cal = mo.cal.map

    for ( let aky in mo_cal ) {
        let agenda = mo_cal[aky]
        let src_agenda = cls_mo[aky]
        for ( let rky in agenda.requested ) {
            let rq = agenda.requested[rky]
            src_agenda.add_slot_request(rq)
        }
        for ( let sky in agenda.scheduled ) {
            let rq = agenda.scheduled[sky]
            src_agenda.add_slot_request(rq)
        }
    }
    
    return mo
}



// MonthManagement --
//      Update and create call user_action_keyfile -- 
//      MonthManagement takes in the slot definitions and stores them as month objects.
//      On WS paths, ws_action_keyfile take in updates to the month agendas. 


class MonthManagement extends PersistenceCategory {

    constructor(conf) {
        super(conf)
        //
        this.all_months = {}
        this.planned_changes = {}
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


    serialize(file_path) {
        //
        let storable = {
            "all_months" : this.all_months,
            "planned_changes" : this.planned_changes
        }

        let output = JSON.stringify(storable)
        try {
            fs.writeFileSync(file_path,output)
        } catch (e) {
        }
    }

    deserialize(file_path) {
        let storable = {}
        try {
            let data = fs.readFileSync(file_path)
            let json = data.toString()
            storable = JSON.parse(json)
        } catch (e) {
        }
        this.planned_changes = storable.planned_changes
        let classless = storable.all_months
        for ( let cls_mo_ky in classless ) {
            let cls_mo = classless[cls_mo_ky]
            classless[cls_mo_ky] = months_from_data(cls_mo)
        }
        this.all_months = classless
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

        this.conf = conf

        this.initalize(conf.slot_backup)
    }

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
        msg_obj.client_name = this.client_name
        let pub = {
            "data" : JSON.stringify(msg_obj),
            "_tracking" : msg_obj._tracking,
            "client_name" : this.client_name
        }
        this.app_publish_on_path(topic,MINI_LINK_ADMIN_PATH,pub)
        delete msg_obj.user_id
        pub = {
            "data" : JSON.stringify(msg_obj),
            "_tracking" : msg_obj._tracking,
            "client_name" : this.client_name
        }
        this.app_publish_on_path(topic,MINI_LINK_ADMIN_PUBLIC_PATH,pub)
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

/*
{
    "name" : false,
    "slot_name" : "",
    "start_day" : "9/29",
    "end_day"  : "10/29",
    "description" : "This is a test of tests",
    //
    "start_time"  : 0,
    "end_time" : 0,
    "begin_at" : 0,
    "end_at" : 0,
    "pattern" : {
        "sunday" :false,
        "monday" :false,
        "tuesday" :false,
        "wednesday" :false,
        "thursday" :false,
        "friday" :false,
        "staturday" :false
    },
    "activity" : USE_AS_OPEN,
    "allow_in_person" : false,
    "allow_zoom" : false
}
*/

    // changes go into the timeline ---
    // the timeline has already been written to a file.
    async user_action_keyfile(op,u_obj,field,value) {  // items coming from the editor  (change editor information and publish it back to consumers)
        //
        let slots = u_obj.time_slots
        slots = (typeof slots === "string") ? JSON.parse(slots) : slots
        //
        let t_slots = slots.map( slt => { return slot_from_descr(slt) } )
        //
        switch ( op ) {
            case 'C' : {   // add a contact to the ledger

                let min_start = u_obj.start_all_time
                let max_end = u_obj.end_all_time

                let mo_start = month_utils.first_day_of_month_ts(min_start)

                let revised_months = {}
                //
                while ( mo_start < max_end ) {
                    let mo = new MonthContainer(mo_start,SafeStorageAgenda)
                    mo._tracking = this.generate_month_tracking(mo)
                    revised_months[mo_start] = mo
                    for ( let slt of t_slots ) {
                        mo.add_time_slot(slt)
                    }
                    mo_start = month_utils.first_day_of_next_month_ts(mo_start)
                }
                //
                for ( let ky in this.all_months ) {
                    let prev_mo = this.all_months[ky]
                    let new_mo = revised_months[ky]
                    if ( new_mo === undefined ) {
                        revised_months[ky] = prev_mo
                    } else {
                        for ( let i = 0; i < 31; i++ ) {
                            let ag = prev_mo.get_day_agenda(i)
                            if ( ag ) {
                                new_mo.add_agenda_list(ag)
                            }
                        }
                    }
                }
                //
                this.all_months = revised_months
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


    // // ---- ---- ---- ---- ---- ---- ----
    web_socket_subscriptions() {
        let self = this
        this.web_ws_proxy.subscribe(cal_consts.ACCEPT_EVENT_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            let the_agenda = self.get_agenda_of_request(message)
            let slot_req = message.slot_req
            if ( the_agenda.schedule_request(slot_req) ) {
                let the_month = self.get_month_of_request(message)
                self.ws_publish_month(the_month)
            } else {
                this.add_planned_change(slot_req)
            }
        })
        this.web_ws_proxy.subscribe(cal_consts.SCHEDULER_ACCEPTED_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            // what has to be done to the message?
            let the_agenda = self.get_agenda_of_request(message)
            let slot_req = message.slot_req
            if ( the_agenda.schedule_request(slot_req) ) {
                let the_month = self.get_month_of_request(message)
                self.ws_publish_month(the_month)     
            } else {
                this.add_planned_change(slot_req)
            }
        })
        this.web_ws_proxy.subscribe(cal_consts.REJECT_EVENT_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            let the_agenda = self.get_agenda_of_request(message)
            let slot_req = message.slot_req
            if ( the_agenda.drop_request(slot_req) ) {
                let the_month = self.get_month_of_request(message)
                self.ws_publish_month(the_month)     
            } else {
                this.add_planned_change(slot_req)
            }
        })

        // cal_consts.SUGGEST_CHANGE_EVENT_TOPIC  ... this might be captured for notification... but just needs to go between browsers

        // emit cal_consts.NOTIFY_TIMELINE_CHANGE  ... this can be published after injesting a new timeline... it would not be captured by the server
        // emit cal_consts.TIMELINE_UPDATE_READY   ...  this is the same idea... after the admin submits the change, browsers may be notified to load the new time line
        this.web_ws_proxy.subscribe(cal_consts.REQUEST_EVENT_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            let the_agenda = self.get_agenda_of_request(message)
            let slot_req = message.slot_req
            if ( the_agenda.add_slot_request(slot_req) ) {
                let the_month = self.get_month_of_request(message)
                self.ws_publish_month(the_month)
            } else {
                this.add_planned_change(slot_req)
            }
        })

        this.web_ws_proxy.subscribe(cal_consts.REQUEST_EVENT_CHANGE_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            // The user or admin wants to change the event but not cancel (long shorter different time)
           let the_agenda = self.get_agenda_of_request(message)
           let slot_req = message.slot_req
           if ( the_agenda.alter_request(slot_req) ) {
               let the_month = self.get_month_of_request(message)
               self.ws_publish_month(the_month)
            } else {
                this.add_planned_change(slot_req)
            }
        })

        this.web_ws_proxy.subscribe(cal_consts.REQUEST_EVENT_DROP_TOPIC,cal_consts.USER_CHAT_PATH,(message) => {
            let the_agenda = self.get_agenda_of_request(message)
            let slot_req = message.slot_req
            if ( the_agenda.cancel_scheduled(slot_req) ) {
                let the_month = self.get_month_of_request(message)
                self.ws_publish_month(the_month)
            } else {
                this.add_planned_change(slot_req)
            }
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

let tce = new TransitionsContactEndpoint(endpoint)

let hit_count = 0
process.on('SIGINT',() => {
    if ( hit_count ) {
        process.exit(0)
    }
    tce.shutdown()
    hit_count++
    process.exit(0)
})

// ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- ------- -------
// (end file)
