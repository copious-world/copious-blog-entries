//
const TransitionsODBEndpoint = require("./odb_category_server")
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
class TransitionsODBRepoEndpoint extends TransitionsODBEndpoint {

    //
    constructor(conf) {
        super(conf)
        this.conf = conf.odb_repo_endpoint
        this.repository_initializer(this.conf.repository)
    }

    //
    async repository_initializer(rconf) {
        this.repository = new Repository(rconf,rconf.supported_repo_types)
        await this.repository.init_repos()
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * This method adds the media of a meta object to local storage for management in the sense that
     * the object can be pulled from a P2P storage system. This addition is a claim of curration and safekeeping 
     * for parties interested in its permanence.
     * 
     * @param {object} obj - the meta object of some media that is being passed into the system.
     */
    repo_add(obj) {
        let storage_fields = obj.repository_fields
        if ( (storage_fields !== undefined) && storage_fields ) {
            for ( let field_path of storage_fields ) {
                let tobj = terminus(obj,field_path)     // look for the object that will be stored... 
                if ( tobj ) {
                    if ( tobj.protocol && tobj[tobj.protocol] ) {       // the object has a protocol which identifies a rep bridge
                        this.repository.store(tobj)
                    }
                }
            }
        }
    }

    /**
     * This action acknowledges that the meta data will be mostly unchanged maintaining some old id (not necessarily in sycn with the new data).
     * But, that new ids and data will now be under the governance of the metadata. 
     * The media that was previously stored will be removed from the care of this processes and its directories. New media will be put in its 
     * place. The new media will have new ids (hashes) etc.
     * 
     * @param {object} old_obj  - the meta object of some media that previously was passed into the system.
     * @param {object} new_obj  - the meta object of some media that is being passed into the system to replace the old object
     * @returns 
     */
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

    /**
     * This action removes a file from the care of the local repository. In the IPFS sense, it will be unpinned.
     * In the bittorrent sense, it will be removed from local trackers and the source file will be deleted from local 
     * directories.
     * 
     * @param {object} obj - the meta object of some media that previously was passed into the system.
     */
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

