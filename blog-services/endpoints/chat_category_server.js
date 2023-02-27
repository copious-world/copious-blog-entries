//
const {TimeManagedDataEndpoint,SafeStorageAgendaInterface,MonthManagement} = require("time-managed-data")
//

const fs = require('fs')
const chat_consts = require('../defs/chat-constants')
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



class ChatStorageAgenda extends SafeStorageAgendaInterface {

    // ----
    constructor(day,index) {
        super(day,index)
        this.flagged = {}   // possibly keeps record of chat entries that are not wanted
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


    // the require method interfaces (implemented with methods germaine to the application)
    // ----
    add_proposed_data(s_req) {
        if ( s_req.topic === chat_consts.ADD_DATA_EVENT_TOPIC ) {
            if ( s_req.when ) {
                s_req.begin_at = s_req.when
                s_req.end_at = s_req.when // may put in delta, forcing spacing between comments
            }
            let cat_slot = this.add_slot(s_req)  // get the conflicts
            if ( !(cat_slot) ) {  // no conflic
                return true
            }
        }
        return false
    }

    // ----
    alter_proposed_data(s_req) {
        return false
    }

    // ----
    drop_proposed_data(s_req) {
        this.remove_slot(s_req)     // should have begin_at
        return true                 // if it wasn't there, it's still true
    }

    // ----
    publish_data(s_req) {
        let ts = s_req.begin_at
        let slot = this.find_slot(ts)
        return (slot !== false)
    }

    // ----
    drop_published_data(s_req) {
        this.remove_slot(s_req)     // should have begin_at
        this.flagged[s_req.begin_at] = s_req
        return true                 // if it wasn't there, it's still true
    }


}



// MonthManagement --
//      Update and create call user_action_keyfile -- 
//      MonthManagement takes in the slot definitions and stores them as month objects.
//      On WS paths, ws_action_keyfile take in updates to the month agendas. 


class AppMonthManagement extends MonthManagement {

    constructor(conf) {
        super(conf)
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    async serialize(file_path) {
        let storable = {}  // adding nothing on this level
        await super.serialize(file_path,storable)
    }

    async deserialize(file_path) {
        let storable = await super.deserialize(file_path)       // months only
        return storable
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----



    // hanlders for time managment ws proxy
    // ---------------------------------------------------------------------

    handle_inoperable(topic,s_req) {
        let ag = this.get_day_agenda(s_req.index)
        if ( ag ) {
            ag.drop_published_data(s_req)
        }
    }

    handle_no_date_data(message) {
        // ???
    }

    deserialize_month_filler(agenda,src_agenda) {
        //
        let prevs = Object.assign({},agenda.all_day)
        agenda.clear()
        for ( let rky in prevs ) {
            let rq = prevs[rky]
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
    "message" : "This is a test of tests",  // the chat message....  was description in calendar and other asset publishers
    //
    "start_time"  : 0,
    "end_time" : 0,
    "begin_at" : 0,
    "end_at" : 0
}
*/


// Serializing collection in memory as a collection 
// rather than serializing each object. 
//
class TransitionsEventEndpoint extends TimeManagedDataEndpoint {
    //
    constructor(conf) {

        conf.agenda_class = ChatStorageAgenda
        conf.time_element = AppMonthManagement

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
