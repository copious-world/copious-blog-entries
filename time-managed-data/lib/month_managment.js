
//
const {FileOperationsCache} = require('extra-file-class')
const month_utils = require('month-utils')
const {EventDays} = require('event-days')

// ----
const MonthContainer = EventDays.MonthContainer
//
const SafeStorageAgendaInterface = require('./safe_storage_agenda_interface')       // default .. allows starting up, but crashes unless overriden


// MonthManagement --
//      Update and create call user_action_keyfile -- 
//      MonthManagement takes in the slot definitions and stores them as month objects.
//      On WS paths, ws_action_keyfile take in updates to the month agendas. 


class MonthManagement {

    constructor(conf) {
        //
        this.agenda_class = conf.agenda_class ? conf.agenda_class : SafeStorageAgendaInterface
        //
        this.all_months = {}
        this.planned_changes = {}
        //
        this.fos = new FileOperationsCache(conf.time_archived_data)
    }


    add_planned_change(req) {
        this.planned_changes[req.begin_at] = req
    }


    //
    get_month_of_request(req) {
        let start_time = month_utils.first_day_of_month_ts(req.start_time)
        if ( this.all_months[start_time] === undefined ) {
            this.all_months[start_time] = new MonthContainer(start_time)
        }
        return this.all_months[start_time]
    }

    // hanlders for time managment ws proxy
    // ---------------------------------------------------------------------

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
    
    get_publishable(req) { 
        return self.get_month_of_request(message)
    }

    ws_publisher(the_month) {
        let message = {
            "start_time" : a_mo.start_time,
            "year" : a_mo.year,
            "month" : a_mo.month
        }
        return [cal_consts.APPRISE_NEW_MONTH_DATA,message,a_mo]
    }

    handle_inoperable(topic,req) {
        this.add_planned_change(req)
    }

    handle_no_date_data(message) {
        // ???
    }

    // ---------------------------------------------------------------------

    deserialize_month_filler(agenda,src_agenda) {
        throw new Error("deserialize_month_filler in MonthManagement in time_managed_category_server must be implemented by descendant class")
    }

    months_from_data(cls_mo,agenda_class) {
        let start_time = cls_mo.start_time
        let mo = new MonthContainer(start_time,agenda_class)
        //
        let mo_cal = mo.cal.map
        for ( let aky in mo_cal ) {
            let agenda = mo_cal[aky]
            let src_agenda = cls_mo[aky]
            this.deserialize_month_filler(agenda,src_agenda)
        }
        return mo
    }


    // callouts wrapped by calling class

    async serialize(file_path) {
        //
        let storable = {
            "all_months" : this.all_months,
            "planned_changes" : this.planned_changes
        }
        //
        await this.fos.output_json(file_path,storable)
    }

    async deserialize(file_path) {
        let storable = await this.fos.load_json_at_path(file_path)
        if ( storable ) {
            this.planned_changes = storable.planned_changes
            let classless = storable.all_months
            for ( let cls_mo_ky in classless ) {
                let cls_mo = classless[cls_mo_ky]
                classless[cls_mo_ky] = this.months_from_data(cls_mo,this.agenda_class)

            }
            this.all_months = classless    
        }
    }

}


module.exports = MonthManagement

