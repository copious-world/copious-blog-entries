// get the system platform using node.js
const fs = require('fs')
const fsPromises = require('fs/promises')
const crypto = require('crypto')

// openssl ecparam -name secp384r1 -genkey -noout -out server.ec.key
// openssl pkcs8 -topk8 -in server.ec.key -out server.pem
// myecpassword1234
// openssl ec -in server.pem -pubout -out server-public.pem

// MultiPathRelayClient will make a connection for each configured path 
// in this case 2: 1) one for user; 2) the other for the meta data store, persistence.
const {MultiPathRelayClient} = require("categorical-handlers")

//
const Repository = require('repository-bridge')
const UCWID = require('UCWID')

/*
const options = {
  // Necessary only if the server requires client certificate authentication.
  key: fs.readFileSync('client-key.pem'),
  cert: fs.readFileSync('client-cert.pem'),

  // Necessary only if the server uses a self-signed certificate.
  ca: [ fs.readFileSync('server-cert.pem') ],

  // Necessary only if the server's cert isn't for "localhost".
  checkServerIdentity: () => { return null; },
};


let ucwid_service = new UCWID({
  "normalizer" : "normalized name"  :::  (text) => {}
  _wrapper_key : "my wrapper key"
})
let [key_wait,key_promise] = ucwid_service.wait_for_key()
if ( key_wait ) {
    await key_promise
}

let data = "this is a test"
let my_ucwid = await ucwid_service.ucwid(data)

console.dir(my_ucwid)


{
  ucwid: '0101!uAVUSIA!QED535eZMDB-XsQbawaYAtBJkxm2rxg7zfzNJkvB878',
  info: {
    ucwid_packet: {
      clear_cwid: 'uAVUSIA!Lpl1hUiXKo6IIq1H-hAX_3Lwbz_2oBaFH0XDmHMrxQw',
      crypto_cwid: 'uAVUSIA!Q0DHFf0wSt--hcPlSK4DtXx7n4lG7rZeEkJ4pnGFocY'
    },
    wrapped_key: 'Nn21CnPvAutMW1SOud7W0QcH6qX3WAACYcQjl15lOxeGOzd4CfUVAU_tw6J6dhpgriv_6IF5mowO7SlIdqxjZ0xifY7DS7Hlssygq5gz6uJnwzQuWau4-8mjnBzVnQi5YUL4-qGmvi-iAxAXVAzRSjjvOplrdTfFY-CWLBBawZRcy76fKtFc8o0f-XcEmPu8h7IzVz1fYhsB_r5RGb_76KBJCkzDhWsgMovcx82rJmjX5A3t5RcNKUF46vi_jmqcMUNd92_XztgyWtf9Ogkx6T7THUcOjT1AVGC8FnI7E8MPl-__AtEJoG-3WnW3HkH3AfLfqlzKCf_yiNtMb0nf8fcXYuJxsWxMWrjCrt36O0TqDobvZtMw_1HQcB7GK35OZursgJSwhwzPFSijU07vWKkiNnbD-tkz7LA7Gm0jcgMWJmhcKakJiXhIXlnf7vD7dE4iA9gteO0ZM6oFGu5fSjEbUpV7ovBFQ2faTE-h0wFDl-wTbwocYsbBXDrM-iGQklbdnkGb9V6VxyywMLe-bhJQ42BnWrGPyomwoiJXdJRXy2RUZci2-gDxSQn35qp8Khe5VXmTeDpXCeiozXxiAi61o2ZyC1Phxgc6-3XTJpfFaSWGliUn4ITSOn-4JCBRhBf9hMghE39odOJBDWbyfKhT1EEoKSz94SGZijPtYrw',
    nonce: 'w_t2iTJJsN0d9yo75_ycgw',
    cipher_text: 'Li_0i8B6dB0n3Vm0Uhv_UIqkP8wVC8JOQ5ngCnoqx8I',
    type_original: 'string'
  }
}

*/

/*
let g_algorithm = 'aes-256-cbc';
let g_key = '7x!A%D*G-JaNdRgUkXp2s5v8y/B?E(H+';
let g_iv = crypto.randomBytes(16);
*/


let g_conf = false

g_conf = fs.readFileSync('desk_app.config').toString()

try {
  g_conf = JSON.parse(g_conf)
console.dir(g_conf)
} catch (e) {
  console.log("COULD NOT READ CONFIG FILE " + 'desk_app.config')
  console.log(e)
}

var g_user_data = false


/*  [asset_type,media_type]
    stream/audio
    stream/video
    stream/image
    blog/text
    music_buzz/text
*/

var g_media_types = {
  "audio" : { "encrypted" : true, "store_local" : true, "store_repo" : true },
  "video" : { "encrypted" : false, "store_local" : true, "store_repo" : true },
  "image" : { "encrypted" : true, "store_local" : true, "store_repo" : true },
  "text" : { "encrypted" : true, "store_local" : true, "store_repo" : false }
}


// decryption in back directory....

class MediaHandler {
  //
  constructor(conf) {
    //
    this.media_dir = conf.media_dir
    this.entries_dir = conf.entries_dir
    //
    this.media_types = conf && conf.media_type ? conf.media_type : g_media_types 
    this.repository = false
    for ( let mt in this.media_types ) {
      this.media_types[mt].dir =  this.media_dir.replace('$media_type',mt)
    }
    //
  }

  // _media_storage
  // FOR IMAGE AND STREAM
  //      media_name is for local disk storage only...
  //    What goes to the ipfs like repository is the encode blob of data. The same as the local file...
  //

  async _media_storage(repo_kind,media_name,media_type,enc_blob) {
      //
      try {
        let media_dir = this.media_types[media_type].dir
        let out_file = media_dir + media_name
        // store to the local drive
        let store_local = this.media_types[media_type].store_local
        if ( store_local ) {
          fs.writeFileSync(out_file,enc_blob)
        }
        // store to the local drive
        let store_repo = this.media_types[media_type].store_repo
        if ( store_repo && this.repository ) {
          const repo_id = await this.repository.add(repo_kind,enc_blob)
          if ( repo_id !== false ) {
            return {
              "protocol" : repo_kind,
              "id" : repo_id
            }  
          }
        }
        return true
      } catch (e) {
        return false
      }
      //
  }

  storable(source) {
    let blob_data = source.blob_url
    delete source.blob_url  // this is only used to go from the interface to storage 
    //
    let bdata_parts = blob_data.split(',')
    let blob_bytes = bdata_parts[1]
    let blob = Buffer.from(blob_bytes, 'base64');
    return blob
  }


  // store_media
  //      ---- store the actual data... and edit the fields of the meta data object
  async store_media(blob,media,media_name,media_type) {
    // 
    if ( media_type in this.media_types ) {
      let result = await this._media_storage('ipfs',media_name,media_type,blob)
      if ( typeof result === 'boolean' ) {
        return result
      } else {
        media.protocol = result.protocol
        media[media.protocol] = result.id
      }
      return true
    }
    return false
  }

}


/*

  async store_image(media,media_type) {   // the image may be a poster for another media type e.g. audio or video
    //
    if ( this.media_types.image !== undefined ) {
      //
      let poster = media.poster
      let image_name = poster.file.name
      let blob_data = poster.blob_url
      delete poster.blob_url
      //
      let bdata_parts = blob_data.split(',')
      let blob_bytes = bdata_parts[1]
      const blob = Buffer.from(blob_bytes, 'base64');
      //
      let result = await this._media_storage('ipfs',image_name,"image",blob)
      if ( typeof result === 'boolean' ) {
        return result
      } else {
        if ( media_type === 'image' ) {
          media.protocol = result.protocol
          media.ipfs = result.id  
        } else {
          poster.protocol = result.protocol
          poster.ipfs = result.id  
        }
      }
      return true
    }
    return false
  }

}

function check_crypto_config(conf) {
  if ( conf.crypto ) {
    if ( conf.crypto.key && (conf.crypto.key !== "nothing") ) {
      g_key = conf.crypto.key
    } else {
      throw new Error("configuration does not include crypto components")
    }
    if ( conf.crypto.algorithm  && (conf.crypto.algorithm !== "nothing")  ) {
      g_algorithm = conf.crypto.algorithm
    } else {
      throw new Error("configuration does not include crypto components")
    }
    if ( conf.crypto.iv && (conf.crypto.iv !== "nothing") ) {
      g_iv = Buffer.from(conf.crypto.iv, 'base64');
    } else {
      g_iv = crypto.randomBytes(16);
      conf.crypto.iv = g_iv.toString('base64')
      fs.writeFileSync('desk_app.config',JSON.stringify(conf,null,2))
    }
  } else {
    throw new Error("configuration does not include crypto")
  }
}

*/

// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
//
// INTERFACE THE REST OF THE APPS
//
// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

class AppLogic {
    //
    constructor(conf) {
        this.conf = conf
        this.ipfs_conf = conf.ipfs
        //check_crypto_config(conf)
        this.media_handler = new MediaHandler(conf)
        //
        this.ready = false
        this.setup_relays()
    }

    async setup_relays() {
      let conf = this.conf
      this.msg_relay = new MultiPathRelayClient(conf.relayer)
      this.path_ucwids = false
      if ( conf._wrapper_key === undefined ) {
        this.await_ready()
      } else {
        this.ucwid_factory = new UCWID({  "_wrapper_key" : conf._wrapper_key  })
        this.path_ucwids = {
          "persistence" : {}, "paid-persistence" : {}
        }
        for ( let path in conf._wrapper_keys ) {  // plural
          let asset_wrapper = conf._wrapper_keys[path]
          for ( let a_type in asset_wrapper ) {
            this.path_ucwids[path][a_type] = new UCWID({ "_wrapper_key" : asset_wrapper[a_type] })
          }
        }
        await this.await_ready()  
      }
    }

    async wait_for_key(user_id) {
      if ( this.ready ) {
        let message = {
          "_id" : user_id
        }
        this.conf._wrapper_keys = {}
        for ( let path of [ "persistence", "paid-persistence" ]) {
          this.conf._wrapper_keys[path] = {}
          this.path_ucwids[path] = {}
          let result = await this.msg_relay.send_op_on_path(message, path,"KP")
          if ( result.status === "OK" ) {
            let counter_links = result.counting_links
            let endpoint = `creative-gets-public-key/${user_id}`
            for ( let clink in counter_links ) {
              let counter_link = counter_links[clink]
              let key_query_result = await window.fetchEndPoint(endpoint,counter_link)  // /creative-gets-public-key/:creative
              if ( key_query_result.status === "OK" ) {
                this.conf._wrapper_keys[path][clink] = key_query_result.public_wrapper_key
                this.path_ucwids[path][clink] = new UCWID({ "_wrapper_key" : key_query_result.public_wrapper_key })
                this.path_ucwids[path][clink]._x_link_counter = counter_link
              }  
            }
          }  
        }
        //
      }
    }


    async await_ready() {
      try {
        await this.msg_relay.await_ready("persistence")
        this.ready = true
      } catch (e) {
      }
    }


    // ----
    async startup() {
        //
        try {
          this.repository = new Repository(this.conf,['ipfs'])
          this.media_handler.repository = this.repository
          await this.repository.init_repos()
        } catch (err) {
            console.error(err)
        }
        //
    }


    async doWrite_test() {
        let user_path = "./test.json"
        let msg_obj = { "test" : "A", "b" : "C" }
        await fsPromises.writeFile(user_path,JSON.stringify(msg_obj),{ 'flag' : 'w' })
    }

    alert_page(ui_msg) {
        //
    }


    update_backup_process(the_backup) {
      // TBD
    }

    // // // // // // // // // //

    async new_entry(data,update) {
        //
        if ( (g_user_data === false) || !(this.ready) ) {
            this.alert_page("user not ready")
            return;
        }
        //
        let persistence_path = data._paid ? "paid-persistence" : "persistence"
        //
        let the_backup = update ? {} : false
        // ... do actions on behalf of the Renderer
        //
        let asset_type = data.asset_type
        let media_type = data.media_type
        //
        let _tracking = false
        // STORE MAIN MEDIA 
        if ( data.media && data.media.source ) {
            if ( (data.media_type !== 'image') && this.media_handler ) {
              let media = data.media.source                     // media is poster
              let media_name = media.name
              //  media type is top level for source
              //
              let blob = this.media_handler.storable(media)
              let no_string = true
              let ucwid_packet = false
              if ( this.path_ucwids == false || (this.path_ucwids[persistence_path][asset_type] === undefined)) {
                ucwid_packet = await this.ucwid_factory.ucwid(blob,no_string)
              } else {
                ucwid_packet = await this.path_ucwids[persistence_path][asset_type].ucwid(blob,no_string)
                media._x_link_counter = this.path_ucwids[persistence_path][asset_type]._x_link_counter 
              }
              // TRACKING
              _tracking = ucwid_packet.ucwid
              media._is_encrypted = this.media_handler.media_types[media_type].encrypted
              let enc_blob = media._is_encrypted ? ucwid_packet.info.cipher_buffer : blob
              if ( this.media_handler.media_types[media_type].store_repo ) {
                delete ucwid_packet.info.cipher_text
                delete ucwid_packet.info.cipher_buffer
              }
              if ( update ) {
                the_backup.source = Object.assign({},media)
              }
              media.ucwid_info = ucwid_packet.info
              if ( !(await this.media_handler.store_media(enc_blob,media,media_name,media_type)) ) {
                  console.error("did not write media")
              } else {      // copy to top level
                data.media.protocol = media.protocol
                data.media[media.protocol] = media[media.protocol]
                data.media._x_link_counter = media._x_link_counter
              }
            } else {
                delete data.media.source  // only storing the image .. field is 'poster'
            }
        }

        // STORE POSTER 
        if ( data.media && data.media.poster && this.media_handler ) {
            let media = data.media.poster             // media is poster
            let media_name = data.media.poster.name
            let media_type = 'image'
            //
            let blob = this.media_handler.storable(data.media.poster)
            let no_string = true
            let ucwid_packet = false
            if ( this.path_ucwids == false || (this.path_ucwids[persistence_path][asset_type] === undefined)) {
              ucwid_packet = await this.ucwid_factory.ucwid(blob,no_string)
            } else {
              ucwid_packet = await this.path_ucwids[persistence_path][asset_type].ucwid(blob,no_string)
              media._x_link_counter = this.path_ucwids[persistence_path][asset_type]._x_link_counter 
            }
            if ( _tracking === false ) {
              _tracking = ucwid_packet.ucwid
            }
            media._is_encrypted = this.media_handler.media_types[media_type].encrypted
            let enc_blob = media._is_encrypted ? ucwid_packet.info.cipher_buffer : blob
            if ( this.media_handler.media_types[media_type].store_repo ) {
              delete ucwid_packet.info.cipher_text
              delete ucwid_packet.info.cipher_buffer
            }
            if ( update ) {
              the_backup.poster = Object.assign({},media)
            }
            media.ucwid_info = ucwid_packet.info
            if ( !(await this.media_handler.store_media(enc_blob,media,media_name,media_type)) ) {
                console.error("did not write media")
            } else if ( data.media.source === undefined ) {  // copy to top level
              data.media.protocol = media.protocol
              data.media[media.protocol] = media[media.protocol]
              data.media._x_link_counter = media._x_link_counter
          }
        }

        if (( _tracking === false) && (media_type === 'text') ) {   // assuming blog text will be short
          if ( update ) {
            the_backup.text = data._prev_text
            the_backup.text_ucwid_info = data.text_ucwid_info
          }
          let blob = data.txt_full
          let ucwid_packet = false
          if ( this.path_ucwids == false || (this.path_ucwids[persistence_path][asset_type] === undefined)) {
            ucwid_packet = await this.ucwid_factory.ucwid(blob)
          } else {
              ucwid_packet = await this.path_ucwids[persistence_path][asset_type].ucwid(blob)
              data._x_link_counter = this.path_ucwids[persistence_path][asset_type]._x_link_counter 
          }

          _tracking = ucwid_packet.ucwid      // handle tracking > next block
          data.text_ucwid_info = ucwid_packet.info
        }

        if ( update && (the_backup !== false) ) {
          this.update_backup_process(the_backup)
        }
 
        if ( _tracking !== false ) {      // TRACKING IS SET ONCE FOR THE LIFE OF THE OBJECT
          if ( !update ) {
            data._tracking = _tracking  // provide tracking for the server or else the server has to fetch the asset, calculate tracking, and set it 
          } else if ( data._tracking === undefined ) {
            data._tracking = _tracking
            data._current_rev = _tracking
            data._history = []
          } else {        // don't change the tracking for DB consideration.. Do keep a history of tracking
            if ( data._history === undefined ) {
              data._history = []
            }
            data._history.push(_tracking)
            data._current_rev = _tracking
          }
        }

        let id = data._id;
        // IF ADMIN GO AHEAD AN STORE IN PUBLICATION DIRECTORY
        // OTHERWISE SEND IT TO THE ENDPOINT AND STORE IT IN THE USER DIRECTORY
        //
        if ( id === 'admin' ) {
            try {
                let dir = g_conf.entries_dir
                dir = dir.replace("$asset_type",asset_type)
                let out_file = dir + _tracking + '+' + id + ".json"
                //
                fs.writeFileSync(out_file,JSON.stringify(data,false,2))
            } catch (e) {
                console.error("did not write image")
            }  
        } else {
            if ( update ) {
                let resp = await this.msg_relay.update_on_path(data,persistence_path)
                if ( resp.status === "OK" ) {
                    return resp._tracking
                }
            } else {
                let asset_path = `${_tracking}+${asset_type}+${id}`   // the tracking just got made, so the asset_path is new (used by storage)
                data.asset_path = asset_path
                let resp = await this.msg_relay.create_on_path(data,persistence_path)
                if ( resp.status === "OK" ) {
                    //add_to_manifest(resp.data)
                    console.log("stored")
                    return resp._tracking
                }    
            }
        }
    }


    // // // // // // // // // //

    async update_entry(data) {
        return await this.new_entry(data,true)
    }


    // // // // // // // // // //

    async get_entry(data) {
        if ( (this.msg_relay === false) || !(this.ready) ) return
        if ( g_user_data === false ) {
            alert_page("user not ready")
            return;
        }
        // ... do actions on behalf of the Renderer
        if ( data && data._id ) {
          let persistence_path = data._paid ? "paid-persistence" : "persistence"
          let resp = await this.msg_relay.get_on_path(data,persistence_path)
          if ( resp.status === "OK" ) {
              let output = JSON.parse(resp.data)
              if ( output.mime_type.indexOf("/json") > 0 ) {
                  output = JSON.parse(output.string)
              }
              return output
          }
        }
    }


    // // // // // // // // // //

    async delete_entry(data) {
        if ( (this.msg_relay === false) || !(this.ready) ) return
        if ( g_user_data === false ) {
            alert_page("user not ready")
            return;
        }
        // ... do actions on behalf of the Renderer
        if ( data && data._id ) {
          let persistence_path = data._paid ? "paid-persistence" : "persistence"
          let resp = await this.msg_relay.del_on_path(data,persistence_path)
          if ( resp.status === "OK" ) {
              console.log("deleted")
          }
        }
    }

    // // // // // // // // // //

    async publish_entry(data) {
        //
        if ( (this.msg_relay === false) || !(this.ready) ) return
        if ( g_user_data === false ) {
            alert_page("user not ready")
            return;
        }
        // ... do actions on behalf of the Renderer
        if ( data && data._id ) {
          let persistence_path = data._paid ? "paid-persistence" : "persistence"
          let resp = await this.msg_relay.publication_on_path(data,persistence_path)
          if ( resp.status === "OK" ) {
              //add_to_manifest(resp.data)
              console.log("published")
              return resp._tracking
          }
          //
        }
        //
    }

    // // // // // // // // // //

    async unpublish_entry(data) {
        //
        if ( (this.msg_relay === false) || !(this.ready) ) return
        if ( g_user_data === false ) {
            alert_page("user not ready")
            return;
        }
        // ... do actions on behalf of the Renderer
        if ( data && data._id ) {
          let persistence_path = data._paid ? "paid-persistence" : "persistence"
          let resp = await this.msg_relay.unpublish_on_path(data,persistence_path)
          if ( resp.status === "OK" ) {
              //add_to_manifest(resp.data)
              console.log("unpublish")
              return resp._tracking
          }
          //
        }
        //
    }
    
    // // // // // // // // // //

    async user_ready(data) {
        if ( (this.msg_relay === false) || !(this.ready) ) return
        if ( data && data._id ) {
            let u_data = await this.msg_relay.get_on_path(data,'user')
            // { "status" : stat, "data" : data,  "explain" : "get", "when" : Date.now() }
            if ( u_data && u_data.status !== "ERR" ) {
                let u_obj = JSON.parse(u_data.data)
                g_user_data = Object.assign({},u_obj)
                this.msg_relay.subscribe(`user-dashboard-${g_user_data._id}`,'persistence',u_obj)
                this.msg_relay.subscribe(`user-dashboard-${g_user_data._id}`,'paid-persistence',u_obj)
                await this.wait_for_key(g_user_data._id)
                return u_obj._tracking
            } else {
                let resp = await this.msg_relay.create_on_path(data,'user')
                if ( resp.status === "OK" ) {
                    data._tracking = resp._tracking
                    u_data = await this.msg_relay.get_on_path(data,'user')
                    // { "status" : stat, "data" : data,  "explain" : "get", "when" : Date.now() }
                    if ( u_data && u_data.status !== "ERR" ) {
                        let u_obj = JSON.parse(u_data.data)
                        g_user_data = Object.assign({},u_obj) 
                        this.msg_relay.subscribe(`user-dashboard-${g_user_data._id}`,'persistence',u_obj)
                        this.msg_relay.subscribe(`user-dashboard-${g_user_data._id}`,'paid-persistence',u_obj)
                        await this.wait_for_key(g_user_data._id)
                        return u_obj._tracking
                    }
                }
            }
        }
        return false
    }
}



let b = new AppLogic(g_conf)




module.exports = b
