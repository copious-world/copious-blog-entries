//
const {TransitionsODBRepoEndpoint} = require('odb-services')

// This module extends the repository odb class of the odb-services module.
// This class adds interfaces for counting services... This provide meta descriptors to counting service.
//

// This counting service, as far as this module is concerned, is a link to a service. 

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


    counting_service_security_check(msg_obj) {
        return true
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
                if ( this.counting_service_security_check(msg_obj) ) {
                    this.counting_service_list.push(msg_obj.counting_service)
                    counting_service_links = this.counting_service_list
                } else {
                    result = "ERR"
                }
                break;
            }

            case 'RKP' : {   // admin method .... remove a counting service
                if ( this.counting_service_security_check(msg_obj) ) {
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


module.exports = TransitionsPersistenceEndpoint