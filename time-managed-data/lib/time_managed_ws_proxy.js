//
const {TransitionsODBEndpoint} = require("odb-services")
const {WSMessageRelayer} = require('message-relay-websocket')
const cal_consts = require('../defs/calendar-constants')
//


class TimeManagedWSProxy extends TransitionsODBEndpoint {

    //
    constructor(conf) {
        super(conf)
        //
        this.web_ws_proxy = new WSMessageRelayer(conf.ws_proxy)
        this.web_ws_proxy.on('client-ready',() => {
            this.web_socket_subscriptions()
        })
    }


    // // ---- ---- ---- ---- ---- ---- ----

    // descendant implements
    get_agenda_of_request(req) { return false }
    get_publishable(reg) { return false }
    handle_no_date_data(message) {}
    handle_inoperable(topic,message) {}
    ws_publisher(publishable) {}
    ////
    // ws_subscribe_and_handler
    //
    ws_subscribe_and_handler(topic,agenda_op) {
        if ( agenda_op === undefined ) return
        let self = this
        this.web_ws_proxy.subscribe(topic,cal_consts.USER_CHAT_PATH,(message) => {
            let the_agenda = self.get_agenda_of_request(message)
            let slot_req = message.slot_req
            if ( the_agenda && slot_req && agenda_op(the_agenda,slot_req) ) {
                let publishable = self.get_publishable(message)
                if ( publishable ) {
                    self.ws_publisher(publishable)
                }
            } else {
                if ( !(the_agenda )) self.handle_no_date_data(message)
                else self.handle_inoperable(topic,slot_req)
            }
        })
    }

    // // ---- ---- ---- ---- ---- ---- ----
    web_socket_subscriptions() {
        //
        this.ws_subscribe_and_handler(cal_consts.ACCEPT_EVENT_TOPIC,(the_agenda,slot_req) => { return the_agenda.publish_data(slot_req) })
        this.ws_subscribe_and_handler(cal_consts.FILTER_ACCEPTED_TOPIC,(the_agenda,slot_req) => { return the_agenda.publish_data(slot_req) })
        //
        this.ws_subscribe_and_handler(cal_consts.REJECT_DATA_TOPIC,(the_agenda,slot_req) => { return the_agenda.drop_proposed_data(slot_req) })
        this.ws_subscribe_and_handler(cal_consts.ADD_DATA_EVENT_TOPIC,(the_agenda,slot_req) => { return the_agenda.add_proposed_data(slot_req) })
        this.ws_subscribe_and_handler(cal_consts.DATA_EVENT_CHANGE_TOPIC,(the_agenda,slot_req) => { return the_agenda.alter_proposed_data(slot_req) })
        this.ws_subscribe_and_handler(cal_consts.DATA_EVENT_DROP_TOPIC,(the_agenda,slot_req) => { return the_agenda.drop_published_data(slot_req) })
        //
    }

}



module.exports = TimeManagedWSProxy