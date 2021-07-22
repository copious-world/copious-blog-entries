




let g_punctuation = ".,;:\'\"~\~\`@#$%^&*()+=|\\][}{?/><"

function ispunct(c,add_dash) {
    let is = (g_punctuation.indexOf(c) >= 0 )
    if ( !(is) && add_dash ) {
        is = (c == '-' || c == '_')
    }
    return is
}

function trim_punct(key,add_dash) {
    while ( (key.length > 0) && ispunct(key[0],add_dash) ) {
        key = key.substr(1)
    }
    while ( (key.length > 0) && ispunct(key[key.length - 1],add_dash) ) {
        key = key.substr(0,(key.length - 1))
    }
    return(key)
}




class DataFromUi {

    constructor() {
        this._user_id = false
    }

    get_file(file_el) {
        //
        if ( file_el.files.length ) {
            return new Promise((resolve,reject) => {
                let file = file_el.files[0]
                let fname =  file.name
                let mtype = file.type
                let reader = new FileReader();
                let file_copy = Object.assign({},file)
                for ( let ky in file ) { 
                    if ( ky === 'arrayBuffer' ) continue
                    if ( ky === 'slice' ) continue
                    if ( ky == 'stream' ) continue
                    if ( ky == 'text' ) continue
                    if ( ky == 'webkitRelativePath' ) continue
                    file_copy[ky] = file[ky]
                }
                reader.onload = (e) => {
                    //
                    let loaded = {
                        "blob_url" : e.target.result,
                        "name" : fname,
                        "mtype" : mtype,
                        "file" : file_copy
                    }
                    //
                    resolve(loaded)
                };
                reader.readAsDataURL(file)
            })
        }
        //
        return false
    }

    async gather_user_fields() {
        let upload_record = {}
        try {
            let uid_fld = document.getElementById('user-id')
            if ( uid_fld ) {
                let uid = uid_fld.value
                if ( uid.length ) {
                    upload_record = {
                        "_id" : uid
                    }
                    this._user_id = uid
                    return upload_record
                }
            }
        } catch (e) {
            return false
        }
        return false
    }

    async gather_fields() {
        //
        let upload_record = {}
        try {
            let opt_fld = document.getElementById('rec-file-mtype')
            let title_fld = document.getElementById('rec-title')
            let subject_fld = document.getElementById('rec-subject')
            let keys_fld = document.getElementById('rec-keys')
            let abstract_fld = document.getElementById('rec-abstract')
            let full_text_fld = document.getElementById('rec-full-text')
            let file_name_fld = document.getElementById('rec-file-name')
            let poster_name_fld = document.getElementById('rec-poster-name')

            if ( !(opt_fld && title_fld && keys_fld && abstract_fld && full_text_fld && file_name_fld  && poster_name_fld) ) return {}

            let asset_pair = opt_fld.value
            let [asset_type,media_type] = asset_pair.split('/')
            /*
                streams/audio
                streams/video
                streams/image
                blog/text
                music_buzz/text
            */

            let poster = await this.get_file(poster_name_fld)        // file names for stream type media
            let media_data = await this.get_file(file_name_fld)

            if ( (media_type !== 'text') && (media_data === false) && (poster === false) ) {
                return upload_record
            }
            //
            let modDate = media_data ? media_data.file.lastModified : ( poster ? poster.file.lastModified : Date.now())
            //
            let keys = keys_fld.value
            keys = keys.split(' ').filter( key => {
                let ok = (key !== undefined)
                if ( ok ) ok = (key.length > 2)
                return ok
            })
            keys = keys.map(key => {
                key = trim_punct(key)
                key = key.trim()
                return(key)
            })
            keys = keys.filter( key => {
                let ok = (key !== undefined)
                if ( ok ) ok = (key.length > 2)
                return ok
            })
            keys = keys.map(key => {
                key = encodeURIComponent(key)
                return(key)
            })
            //
            upload_record = {
            "_tracking" : "",
            "_id" :  this._user_id,
            "title" : encodeURIComponent(title_fld.value),
            "subject" : encodeURIComponent(subject_fld.value),
            "keys" : keys,
            "asset_type" : asset_type,        // blog, stream, link-package, contact, ownership, etc...
            "media_type" : media_type,        // text, audio, video, image
            "abstract" : encodeURIComponent(abstract_fld.value),
            "media" : {
                "poster" : poster,
                "source" : media_data
            },
            "encode" : true,
            "txt_full" : encodeURIComponent(full_text_fld.value),
            "dates" : {
                "created" : Date.now(),
                "updated" : modDate
            }
            }
            //    
        } catch (e) {
            return false
        }

        return(upload_record)
    }

    async gather_asset_fields() {
        //
        let upload_record = {}
        try {
            let asset_fld = document.getElementById('asset-id')
            upload_record._id = asset_fld.value
        } catch (e) {
            return false
        }
        return upload_record
    }

}

// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
module.exports = new DataFromUi()
// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
