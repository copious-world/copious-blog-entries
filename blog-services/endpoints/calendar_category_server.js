//
const {TimeManagedDataEndpoint} = require("time-managed-data")
//

const fs = require('fs')
const cal_consts = require('../defs/calendar-constants')

const month_utils = require('month-utils')
const {EventDays} = require('event-days')

// ----
const MonthContainer = EventDays.MonthContainer
const TimeSlotAgenda = EventDays.TimeSlotAgenda
//

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



class SafeStorageAgenda extends TimeSlotAgenda {

    // ----
    constructor(day,index) {
        super(day,index)
        //
        this.requested = {}     // For the event request system, there are two stages... request first
        this.scheduled = {}     // then after approval, it may be moved into the scheduled list
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
        if ( s_req.topic === cal_consts.ADD_DATA_EVENT_TOPIC ) {
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
            return true
        }
        return false
    }

    cancel_scheduled(s_req) {
        let req = this.scheduled[s_req.begin_at]
        if ( req ) {
            delete this.scheduled[s_req.begin_at]
            return true
        }
        return false
    }


    alter_request(s_req) {
        let req = this.requested[s_req.begin_at]
        if ( req ) {
          for ( let ky in s_req ) {
            req[ky] = s_req[ky]
          }
          return true
        }
        return false
    }


    // the require method interfaces (implemented with methods germaine to the application)
    add_proposed_data(s_req) {
        this.add_slot_request(s_req)
    }

    alter_propsed_data(s_req) {
        this.alter_request(s_req)
    }

    drop_proposed_data(s_req) {
        this.drop_request(s_req)
    }

    publish_data(s_req) {
        this.schedule_request(s_req)
    }

    drop_published_data(s_req) {
        this.cancel_scheduled(s_req)
    }




}





// MonthManagement --
//      Update and create call user_action_keyfile -- 
//      MonthManagement takes in the slot definitions and stores them as month objects.
//      On WS paths, ws_action_keyfile take in updates to the month agendas. 


class MonthManagement extends TimeManagedDataEndpoint {

    constructor(conf) {
        super(conf)
        //
        this.all_months = {}
        this.planned_changes = {}
    }

    deserialize_month_filler(agenda,src_agenda) {
        //
        for ( let rky in agenda.requested ) {
            let rq = agenda.requested[rky]
            src_agenda.add_slot_request(rq)
        }
        //
        for ( let sky in agenda.scheduled ) {
            let rq = agenda.scheduled[sky]
            src_agenda.add_slot_request(rq)
        }
        //
    }

}


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
s

// Serializing collection in memory as a collection 
// rather than serializing each object. 
//
class TransitionsEventEndpoint extends MonthManagement {
    //
    constructor(conf) {

        conf.agenda_class = SafeStorageAgenda

        super(conf)  // handles much of the initizization
        //
        this.app_handles_subscriptions = true
        this.app_can_block_and_respond = true
        //
        this.path = `${conf.address}:${conf.port}`
        this.client_name = this.path
        //
        //  meta_publication not used for calendars
        //
        this.app_subscriptions_ok = true
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----


    // Two mini link servers are connected... 
    // one is for public searches, the second is for owner/admin allowing for responses to user_id....
    // This method usage represents the utilization of a path from client to admin.
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
    

    generate_month_tracking(mo) {
        // use date and hash
        let str = `${mo.start_time}-${mo.day}-${mo.year}`
        return do_hash(str)
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    generate_revised_months(mo_start,max_end,t_slots) {
        //
        let revised_months = {}
        while ( mo_start < max_end ) {
            let mo = new MonthContainer(mo_start,this.agenda_class)
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

        return revised_months
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

let tce = new TransitionsEventEndpoint(endpoint)

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
