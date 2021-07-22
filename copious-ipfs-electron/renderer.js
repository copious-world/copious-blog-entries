// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.


// In the Renderer process
const { ipcRenderer } = require('electron')


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



function get_file(file_el) {
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




/*
// big display
export let color;
export let entry;
export let title;
export let dates;

export let keys;
export let media_type;

export let abstract;
export let media
export let isplaying
export let protocol;

// grid element
export let color;
export let entry;
export let title;
export let dates;

export let keys;
export let media_type;

export let abstract;
export let media
//
export let score;
export let id;
*/

let g_user_id = false

async function gather_user_data() {
    let upload_record = {}
    try {
        let uid_fld = document.getElementById('user-id')
        if ( uid_fld ) {
            let uid = uid_fld.value
            if ( uid.length ) {
                upload_record = {
                    "_id" : uid
                }
                g_user_id = uid
                return upload_record
            }
        }
    } catch (e) {
        return false
    }
    return false
}

async function gather_fields() {
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

        let poster = await get_file(poster_name_fld)        // file names for stream type media
        let media_data = await get_file(file_name_fld)

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
          "_id" : g_user_id,
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


async function gather_fields() {
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

// ---- ---- ---- ---- ---- ---- ---- ----

async function when_i_say() {
    let good_data = await gather_fields()
    if ( good_data ) {
        ipcRenderer.invoke('new-entry',good_data)
    }
}

async function when_i_publish() {
    let good_data = await gather_fields()
    if ( good_data ) {
        ipcRenderer.invoke('publish-entry',good_data)
    }
}

async function when_i_unpublish() {
    let good_data = await gather_fields()
    if ( good_data ) {
        ipcRenderer.invoke('unpublish-entry',good_data)
    }
}


async function when_user_says() {
    let good_data = await gather_user_field()
    if ( good_data ) {
        ipcRenderer.invoke('user-ready',good_data)
    }
}

// ---- ---- ---- ---- ---- ---- ---- ----
let u_button = document.getElementById("user-id-btn")
if ( u_button ) {
    u_button.addEventListener('click',() => { when_user_says() })
}
//
let p_button = document.getElementById("upload")
if ( p_button ) {
    p_button.addEventListener('click',() => { when_i_say() })
}
let u_button = document.getElementById("publish")
if ( u_button ) {
    u_button.addEventListener('click',() => { when_i_publish() })
}


