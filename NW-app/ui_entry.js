/*


*/

//
// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
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
        this._current_asset_history = false
        this._current_asset_prev_text = ""
        this._current_asset_text_ucwid_info = false
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
                let tracking = ""
                let tracker = document.getElementById("user-tracking")
                if ( tracker ) {
                    let t = tracker.value
                    if ( t.length ) tracking = t
                }
                //
                let uid = uid_fld.value
                if ( uid.length ) {
                    upload_record = {
                        "_id" : uid,
                        "_tracking" : tracking
                    }
                    this._user_id = uid
                    this._author_tracking = tracking
                    return upload_record
                }
            }
        } catch (e) {
            return false
        }
        return false
    }

    //  ----  ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async gather_fields() {
        //
        if ( this._user_id === false ) {
            return false
        }
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
            let paid_fld = document.getElementById('paid-checkbox')

            if ( !(opt_fld && title_fld && keys_fld && abstract_fld && full_text_fld && file_name_fld && poster_name_fld) ) return false

            let full_text = full_text_fld.value
            //
            let title = title_fld.value
            if ( title.length === 0 ) return false
            //
            let subject = subject_fld.value
            if ( subject.length === 0 ) return false
            //
            let abstract =  abstract_fld.value

            let asset_pair = opt_fld.value
            if ( asset_pair.length === 0 ) return false
            //
            let [asset_type,media_type] = asset_pair.split('/')
            /*
                stream/audio
                stream/video
                stream/image
                blog/text
                music_buzz/text
            */
            let poster = await this.get_file(poster_name_fld)        // file names for stream type media
            let media_data = await this.get_file(file_name_fld)

            if ( (media_type !== 'text') && (media_data === false) && (poster === false) ) {
                return false
            }

            if ( ( media_type === 'text' ) && ( full_text.length === 0 ) ) {
                return false
            } else if ( media_type !== 'text' ) {
                full_text = file_name_fld.files[0].name
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
            let tracking = ""       // if it has been created
            let tracker = document.getElementById("asset-id")
            if ( tracker ) {
                let t = tracker.value
                if ( t.length ) tracking = t
            }


            let paid = paid_fld ? paid_fld.checked : false

            let exclusion_fields = [
                "_history","_prev_text",
                "_transition_path", "encode",
                "media.poster.ucwid_info", "media.source.ucwid_info",
                "media.poster.protocol", "media.source.protocol",
                "media.poster.ipfs", "media.source.ipfs"
            ]
            let repository_fields = [ "media.source", "media.poster" ]  // field that contain id's useful to pin object at the server
            //
            upload_record = {
                "_tracking" : tracking,             // tracking of the asset
                "_id" :  this._user_id,             // should be a UCWID
                "_author_tracking" :  this._author_tracking,
                "_paid" : paid,
                "_transition_path" : "asset_path",
                "asset_path" : `${tracking}+${asset_type}+${this._user_id}`,
                "title" : encodeURIComponent(title),
                "subject" : encodeURIComponent(subject),
                "keys" : keys,
                "asset_type" : asset_type,        // blog, stream, link-package, contact, ownership, etc...
                "media_type" : media_type,        // text, audio, video, image
                "abstract" : encodeURIComponent(abstract),
                "media" : {
                    "poster" : poster,
                    "source" : media_data
                },
                "encode" : true,
                "txt_full" : encodeURIComponent(full_text),
                "dates" : {
                    "created" : Date.now(),
                    "updated" : modDate
                },
                "_history" : this._current_asset_history ? this._current_asset_history : [],
                "_prev_text" : this._current_asset_prev_text,
                "text_ucwid_info" : this._current_asset_text_ucwid_info,
                "repository_fields" : repository_fields,
                "exclusion_fields" : exclusion_fields
            }
            this._current_asset_history = false   // reset it when it is retrieved
            //    
        } catch (e) {
            return false
        }

        return(upload_record)
    }



    //  ----  ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async gather_identifying_fields() {
        //
        if ( this._user_id === false ) {
            return false
        }
        //
        let upload_record = {}
        try {
            let tracker = document.getElementById("asset-id")
            let opt_fld = document.getElementById('rec-file-mtype')
            if ( !(opt_fld && tracker) ) return false

            let asset_pair = opt_fld.value
            if ( asset_pair.length === 0 ) return false
            //
            let [asset_type,media_type] = asset_pair.split('/')
            /*
                stream/audio
                stream/video
                stream/image
                blog/text
                music_buzz/text
            */
            //
            //
            let tracking = ""       // if it has been created
            if ( tracker ) {
                let t = tracker.value
                if ( t.length ) tracking = t
                else return false
            }

            //
            let exclusion_fields = [
                "_history","_prev_text",
                "_transition_path", "encode",
                "media.poster.ucwid_info", "media.source.ucwid_info",
                "media.poster.protocol", "media.source.protocol",
                "media.poster.ipfs", "media.source.ipfs"
            ]

            //
            upload_record = {
                "_tracking" : tracking,
                "_id" :  this._user_id,
                "_transition_path" : "asset_path",
                "asset_path" : `${tracking}+${asset_type}+${this._user_id}`,
                "asset_type" : asset_type,        // blog, stream, link-package, contact, ownership, etc...
                "media_type" : media_type,
                "exclusion_fields" : exclusion_fields
            }
            //
        } catch (e) {
            return false
        }

        return(upload_record)
    }

    // put_fields ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    put_fields(obj) {
        let opt_fld = document.getElementById('rec-file-mtype')
        let title_fld = document.getElementById('rec-title')
        let subject_fld = document.getElementById('rec-subject')
        let keys_fld = document.getElementById('rec-keys')
        let abstract_fld = document.getElementById('rec-abstract')
        let full_text_fld = document.getElementById('rec-full-text')
        let file_name_fld = document.getElementById('rec-file-name')
        let poster_name_fld = document.getElementById('rec-poster-name')
        if ( !(opt_fld && title_fld && keys_fld && abstract_fld && full_text_fld && file_name_fld  && poster_name_fld) ) return false
        
        title_fld.value = decodeURIComponent(obj.title)
        subject_fld.value = decodeURIComponent(obj.subject)
        keys_fld.value = decodeURIComponent(obj.keys)
        opt_fld.value = [obj.asset_type,obj.media_type].join('/')
        abstract_fld.value = decodeURIComponent(obj.abstract)
        full_text_fld.value = decodeURIComponent(obj.txt_full)

        this._current_asset_history = obj._history
        this._current_asset_prev_text = obj.txt_full
        this._current_asset_text_ucwid_info = obj.text_ucwid_info ? obj.text_ucwid_info : false
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
