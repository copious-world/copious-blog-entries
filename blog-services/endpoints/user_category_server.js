//
const {UserCategory} = require("categorical-handlers")
//
let g_loaded_targets = false
//
const fs = require('fs')
const crypto = require('crypto')

let conf_file = 'relay-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}

let conf = JSON.parse(fs.readFileSync(conf_file).toString())

//  app_generate_tracking(msg_obj)

function do_hash (text) {
    const hash = crypto.createHash('sha256');
    hash.update(text);
    let ehash = hash.digest('base64');
    ehash = ehash.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    return(ehash)
}



class TransitionsUserEndpoint extends UserCategory {

    constructor(conf) {
        super(conf)
        this.user_tracking_table = {}        // keep track of all the user registration files.
        this.new_tracking = {}
        this.gen_targets = g_loaded_targets
    }

    app_generate_tracking(u_obj) {
        this.new_tracking[u_obj._id] = true   // calling create...
        let uobj_str = JSON.stringify(u_obj)
        return(do_hash(uobj_str))
    }


    /**
     * app_asset_generator
     * 
     * output assets map which is a key to a JSON object 
     * 
     * @param {object} u_obj 
     * @returns object 
     */
    app_asset_generator(u_obj) {
        let storables = {}
        if ( this.gen_targets ) {
            for ( let target in this.gen_targets ) {
                let generator = this.gen_targets[target]
                let output = generator(u_obj,target)
                storables[target] = output
            }
        }
        return storables
    }


    //
    make_path(u_obj) {
        let user_id = u_obj._id
        // password is a hash of the password, might encrypt it... (also might carry other info to the back..)
        if ( this.user_tracking_table[user_id] !== undefined ) {
            if ( this.new_tracking[user_id] ) {
                this.new_tracking[user_id] = false
                return false
            }
            // doing a get without tracking available to client
            u_obj._tracking = this.user_tracking_table[user_id]
        }
        let tracking = u_obj._tracking
        if ( tracking === undefined ) {     // trying to get something we never saw
            return false
        }
        let au = this.all_users.trim()
        user_id = user_id.trim()
        tracking = tracking.trim()
        let user_path = `${au}/${user_id}${this.user_file_sep}${tracking}.json`
        return(user_path)
    }


    /**
     * _startup_track_users_from_directory
     * 
     * prevent duplicates
     */
    _startup_track_users_from_directory() {
        let au = this.all_users.trim()
        let dir_list = fs.readdirSync(au)
        if ( dir_list ) {
            let ordered_stats = []
            for ( let file of dir_list ) {
                if ( file[0] !== '.' ) {
                    let fpath = (au + '/' + file)
                    let stats = fs.statSync(fpath)
                    ordered_stats.push(stats)
                    stats.path = fpath
                    stats.f_name = file
                }
            }
            ordered_stats.sort((a,b) => {
                if ( a.birthtime == b.birthtime) return 0
                return a.birthtime < b.birthtime ? -1 : 1
            })
            for ( let stat of ordered_stats ) {
                let key_parts = stat.f_name.split('+')
                let fname_key = key_parts[0]
                let tracking = key_parts[1].replace(".json","")
                if ( this.user_tracking_table[fname_key] === undefined )
                this.user_tracking_table[fname_key] = tracking
            }
        }
    }
    
}




function load_generators() {
    //
    let gen_dir = conf.generator_directory ? conf.generator_directory : "../generators"
    //
    try {
        g_loaded_targets = {}
        let gen_files = fs.readdirSync(gen_dir)
        for ( let file of gen_files ) {
            try {
                let gen_func = require(file).generator
                g_loaded_targets[file] = gen_func    
            } catch (e) {}
        }    
    } catch (e) {}
    //
}


console.log(`User Server: PORT: ${conf.user_endpoint.port} ADDRESS: ${conf.user_endpoint.address}`)

load_generators()
//
let tue = new TransitionsUserEndpoint(conf.user_endpoint)

// prevent duplicates
tue._startup_track_users_from_directory()
