//
const {TimeManagedData} = require('time-managed-data')
const fs = require('fs')


// connect to a relay service...
// set by configuration (only one connection, will have two paths.)

const chat_consts = require('../defs/chat-constants')


// -- -- -- --
// -- -- -- --
//
class WSChatEndpoint extends TimeManagedData {

    //
    constructor(conf) {
        super(conf)
        //
        //
        //  meta_publication not used for chat
        //
        // ---------------->>  topic, client_name, relayer  (when relayer is false, topics will not be written to self)
        this.add_to_topic(chat_consts.REJECT_CHAT_TOPIC,'self',false)  // chat entries can be removed
        //
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    // app_subscription_handler
    //  -- Handle state changes...
    // this is the handler for the topics added directory above in the constructor  -- called post publication by endpoint in send_to_all
    app_subscription_handler(topic,msg_obj) {
        //
    }

    // ----
    app_publication_pre_fan_response(topic,msg_obj,ignore) {
        //
        super.app_publication_pre_fan_response(topic,msg_obj,ignore)
        //
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


let conf_file = 'ws-chat-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}

let conf = JSON.parse(fs.readFileSync(conf_file).toString())
let endpoint = conf

console.log(`Contact Server: PORT: ${endpoint.port} ADDRESS: ${endpoint.address}`)

let ws_endpoint = new WSChatEndpoint(endpoint)
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
