

const {EventDays} = require('event-days')
const TimeSlotAgenda = EventDays.TimeSlotAgenda


// this is an interface for mamaging DB interaction within the context of the WS server for Timeslot Agendas.
// This class must be subclassed for an application to work.


class SafeStorageAgendaInterface extends TimeSlotAgenda {

    // ----
    constructor(day,index) {
        super(day,index)
    }

    add_proposed_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }

    alter_proposed_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }

    drop_proposed_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }


    publish_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }

    drop_published_data(s_req) {
        throw new Error("class needs to implement .. SafeStorageAgendaInterface and pass it in configuration.agenda_class for TimeManagedDataEndpoint subclasses")
    }


}





module.SafeStorageAgendaInterface = SafeStorageAgendaInterface
