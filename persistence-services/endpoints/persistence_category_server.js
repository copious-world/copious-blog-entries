//
const fs = require('fs')

const {TransitionsODBRepoEndpoint} = require('odb-services')

// This module extends the repository odb class of the odb-services module.
// This class adds interfaces to counting services... This provide meta descriptors to counting service.
//


function counting_service_security_check(msg_obj) {
    return true
}

// connect to a relay service...
// set by configuration (only one connection, will have two paths.)

// -- -- -- --
//
class TransitionsPersistenceEndpoint extends TransitionsODBRepoEndpoint {

    //
    constructor(conf) {
        //
        super(conf)
        //
        if ( conf.counting_service ) {
            this.counting_service = conf.counting_service
        } else {
            this.counting_service = false
        }
        //
        this.counting_service_list = []
        if ( this.counting_service ) {
            this.counting_service_list.push(this.counting_service)
        }
        //
    }


    async app_message_handler(msg_obj) {
        let op = msg_obj._tx_op
        let result = "OK"
        let user_id = msg_obj._user_dir_key ? msg_obj[msg_obj._user_dir_key] : msg_obj._id
        if ( (user_id === undefined) && (msg_obj._id !== undefined) ) {
            user_id = msg_obj._id
        }
        msg_obj._id = user_id
        //
        let counting_service_links = "false"
        switch ( op ) {         // from web client 
            case 'KP' : {
                if ( this.counting_service ) {
                    counting_service_links = this.counting_service_list
                } else {
                    result = "ERR"
                }
                break
            }
            
            case 'AKP' : {   // admin method .... add a counting service
                if ( counting_service_security_check(msg_obj) ) {
                    this.counting_service_list.push(msg_obj.counting_service)
                    counting_service_links = this.counting_service_list
                } else {
                    result = "ERR"
                }
                break;
            }

            case 'RKP' : {   // admin method .... remove a counting service
                if ( counting_service_security_check(msg_obj) ) {
                    let service_index = this.counting_service_list.findIndex((service) => {
                        if ( service === msg_obj.service_link ) return true
                        return false
                    })
                    this.counting_service_list.splice(service_index,1)
                    counting_service_links = this.counting_service_list
                } else {
                    result = "ERR"
                }
                break;
            }

            default: {
                return super.app_message_handler(msg_obj)
            }
        }
        return({ "status" : result, "explain" : `${op} performed`, "when" : Date.now(), "counting_links" : counting_service_links })
    }

}





let conf_file = 'relay-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}

let commerce = process.argv[3]

let endpoint = false
if ( commerce === undefined ) { commerce = "free" }
//
let conf = JSON.parse(fs.readFileSync(conf_file).toString())
if ( commerce === "free" ) {
    endpoint = conf.persistence_endpoint
} else {
    endpoint = conf.paid_persistence_endpoint
}

console.log(`Persistence Server: PORT: ${endpoint.port} ADDRESS: ${endpoint.address}`)

new TransitionsPersistenceEndpoint(endpoint)
