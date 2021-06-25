
const UserMessageEndpoint = require("categorical-handlers/users.js")
const user_dashboard_generator = require("../transitions/dashboard").generator
const user_profile_generator = require("../transitions/profile").generator


const fs = require('fs')
const crypto = require('crypto')

let conf_file = 'relay-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}

let conf = JSON.parse(fs.readFileSync(conf_file).toString())

// _gen_targets is used each time a new user is created...
conf.user_endpoint._gen_targets = {
    "profile" : user_profile_generator,         // generator function...
    "dashboard" : user_dashboard_generator,     // generator function...
    "extension" : ".json"
}


//  app_generate_tracking(msg_obj)

function do_hash (text) {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    let ehash = hash.digest('hex');
    return(ehash)
}



class TransitionsUserEndpoint extends UserMessageEndpoint {

    constructor(conf) {
        super(conf)
    }

    app_generate_tracking(u_obj) {
        let uobj_str = JSON.stringify(u_obj)
        return(do_hash(uobj_str))
    }
}

new TransitionsUserEndpoint(conf.user_endpoint)
