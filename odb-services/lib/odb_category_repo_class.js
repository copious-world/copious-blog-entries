//
const TransitionsODBRepoEndpoint = require("./odb_category_server")
const Repository = require('repository-bridge')

//
// This module adds repository interfaces to the functional apparatus of obd_caterogy_server
//



function terminus(obj,field_path) {
    let fpath = field_path.split('.')
    let tobj = obj
    for ( let f of fpath ) {
        tobj = tobj[f]
        if ( tobj === undefined ) return false
    }
    return tobj
}

// -- -- -- --
//
class TransitionsODBRepoEndpoint extends TransitionsODBRepoEndpoint {

    //
    constructor(conf) {
        super(conf)
        this.repository_initalizer(conf)
    }

    //
    async repository_initalizer(conf) {
        this.repository = new Repository(conf,['ipfs'])
        await this.repository.init_repos()
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    repo_add(obj) {
        let storage_fields = obj.repository_fields
        if ( (storage_fields !== undefined) && storage_fields ) {
            for ( let field_path of storage_fields ) {
                let tobj = terminus(obj,field_path)
                if ( tobj ) {
                    if ( tobj.protocol && tobj[tobj.protocol] ) {
                        this.repository.store(tobj)
                    }
                }
            }
        }
    }

    repo_replace(old_obj,new_obj) {
        let storage_fields = obj.repository_fields
        if ( (storage_fields !== undefined) && storage_fields ) {
            for ( let field_path of storage_fields ) {
                let tobj_old = terminus(old_obj,field_path)
                if ( !(tobj_old) ) {
                    return
                }
                let tobj_new = terminus(new_obj,field_path)
                if ( !(tobj_new) ) {
                    return
                }
                if ( tobj_old.protocol && tobj_old[tobj_old.protocol] && tobj_new.protocol && tobj_new[tobj_new.protocol] ) {
                    this.repository.replace(tobj_old,tobj_new)
                }
            }
        }
    }

    repo_remove(obj) {
        let storage_fields = obj.repository_fields
        if ( (storage_fields !== undefined) && storage_fields ) {
            for ( let field_path of storage_fields ) {
                let tobj = terminus(obj,field_path)
                if ( tobj ) {
                    if ( tobj.protocol && tobj[tobj.protocol] ) {
                        this.repository.remove(tobj)
                    }
                }
            }
        }
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    create_producer_entry_type(entry_obj,user_path,entries_record,entry_type) {
        super.create_producer_entry_type(entry_obj,user_path,entries_record,entry_type)
        this.repo_add(entry_obj)
    }


    update_producer_entry_type(entry_obj,user_path,entries_record,entry_type) {
        let [rep_prev,repo_new] = super.update_producer_entry_type(entry_obj,user_path,entries_record,entry_type)
        if ( rep_prev ) {
            this.repo_replace(rep_prev,repo_new)
        }
    }


    update_producer_entry_type_field(entry_obj,user_path,entries_record,entry_type,field) {
        let [rep_prev,repo_new] = super.update_producer_entry_type_field(entry_obj,user_path,entries_record,entry_type,field)
        if ( rep_prev ) {
            this.repo_replace(rep_prev,repo_new)
        }
    }


    delete_producer_entry_type(entry_obj,entries_record,entry_type) {
        let status = super. delete_producer_entry_type(entry_obj,entries_record,entry_type)
        if ( status ) {
            this.repo_remove(entry_obj)
        }
    }


}



module.exports.TransitionsODBRepoEndpoint = TransitionsODBRepoEndpoint

