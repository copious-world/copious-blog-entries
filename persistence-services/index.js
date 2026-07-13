
const {ServeMessageRelay,MessageRelayer} = require("message-relay-services")
//
// and also a pub/sub client
// ---- ---- ---- ---- ---- ---- ---- ----
const USER_PATH = 'user'                // to a user endpoint
const PERSISTENCE_PATH = 'persistence'  // most things take this path (data object are used to discern sub categories)
//
const EMAIL_PATH = 'outgo_email'        // app email -- likely to a spool file or mailbox file
const CONTACT_PATH = 'contact'          // intake spool similar to email or same with proper interface
const NOTIFICATION_PATH = 'notify'      // admin or user to user (should be a special endpoint)
//
//  PERSISTENCE TYPES
//
const PERSISTENCE_TYPE_ASSETS = "assets"
const PERSISTENCE_TYPE_BLOG = "blog"
const PERSISTENCE_TYPE_DEMO = "demo"
const PERSISTENCE_TYPE_OWNERSHIP = "ownership"
const PERSISTENCE_TYPE_STREAM = "stream"
//


// ---- ---- ---- ---- ---- ---- ---- ----

const fs = require('fs')

let conf_file = 'relay-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}

let conf = JSON.parse(fs.readFileSync(conf_file).toString())
let server = new ServeMessageRelay(conf,MessageRelayer)

console.log(`${server.address}:${server.port}`)

