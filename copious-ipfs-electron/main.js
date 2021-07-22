//'use strict'

const { app, BrowserWindow } = require('electron')

// MultiPathRelayClient will make a connection for each configured path 
// in this case 2: 1) one for user; 2) the other for the meta data store, persistence.
const {MultiPathRelayClient} = require("categorical-handlers")
const {nanoid} = require('nanoid')


let g_algorithm = 'aes-256-cbc';
let g_key = '7x!A%D*G-JaNdRgUkXp2s5v8y/B?E(H+';
let g_iv = crypto.randomBytes(16);

let g_conf = fs.readFileSync('desk_app.config').toString()

try {
  g_conf = JSON.parse(g_conf)
} catch (e) {
  console.log("COULD NOT READ CONFIG FILE " + 'desk_app.config')
}

var g_user_data = false

/*  [asset_type,media_type]
    streams/audio
    streams/video
    streams/image
    blog/text
    music_buzz/text
*/

var g_media_types = {
  "audio" : { "ecrypted" : true, "store_local" : true, "store_ipfs" : true },
  "video" : { "ecrypted" : false, "store_local" : true, "store_ipfs" : true },
  "image" : { "ecrypted" : true, "store_local" : true, "store_ipfs" : true },
  "text" : { "ecrypted" : true, "store_local" : true, "store_ipfs" : true }
}

var g_asset_types = {
  "streams" : { "dir" : "." },
  "blog" : { "dir" : "." },
  "music_buzz" : { "dir" : "." },
}


function user_dashboard_update(message) {

}


class MediaHandler {
  //
  constructor(conf) {
    //
    this.media_types = conf && conf.media_type ? conf.media_type : g_media_types 
    this.ifps = g_ipfs_node
    for ( let mt in this.media_types ) {
      this.media_types[mt].dir =  this.media_dir.replace('$media_type',mt)
    }
    //
  }


  async _media_storage(media_name,media_type,blob) {
      //
      try {
        let media_dir = this.media_types[media_type].dir
        let out_file = media_dir + media_name
        //      some types are encrypted
        let do_encrypt = this.media_types[media_type].encrypted
        let enc_blob = do_encrypt ? encryptMedia(blob) : blob
        // 
        // store to the local drive
        let store_local = this.media_types[media_type].store_local
        if ( store_local ) {
          fs.writeFileSync(out_file,enc_blob)
        }
        // store to the local drive
        let store_ipfs = this.media_types[media_type].store_ipfs
        if ( store_ipfs ) {
          const file = await this.ifps.add({
              "path": media_name,
              "content": enc_blob
          })
          //
          let cid = file.cid.toString()
          return {
            "protocol" : 'ipfs',
            "id" : cid
          }
        }
        return true
      } catch (e) {
        return false
      }
      //
  }

  // store_media
  //      ---- store the actual data... and edit the fields of the meta data object
  async store_media(media,media_type) {
    // 
    if ( media_type in this.media_types ) {
      //
      let source = media.source
      let media_name = source.file.name
      let blob_data = source.blob_url
      delete source.blob_url  // this is only used to go from the interface to storage 
      //
      let bdata_parts = blob_data.split(',')
      let blob_bytes = bdata_parts[1]
      const blob = Buffer.from(blob_bytes, 'base64');

      let result = await this._media_storage(media_name,media_type,blob)
      if ( typeof result === 'boolean' ) {
        return result
      } else {
        media.protocol = result.protocol
        media.ipfs = result.id
      }
      return true
    }
    return false
  }


  async store_image(media,media_type) {   // the image may be a poster for another media type e.g. audio or video
    //
    if ( this.media_types.image !== undefined ) {
      //
      let poster = media.poster
      let blob_data = poster.blob_url
      delete poster.blob_url
      //
      let bdata_parts = blob_data.split(',')
      let blob_bytes = bdata_parts[1]
      const blob = Buffer.from(blob_bytes, 'base64');
      //
      let image_name = poster.file.name
      let result = await this._media_storage(image_name,"image",blob)
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



function encryptMedia(data) {
  const cipher = crypto.createCipheriv(g_algorithm, g_key, g_iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return encrypted
}


// decryption in back directory....


check_crypto_config(g_conf)

// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

let mainWindow = false

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

var g_ipfs_node = false
var g_message_relay = false
var g_media_handler = false

app.on('ready', async () => {
  //
  g_message_relay = new MultiPathRelayClient(g_conf.relayer)  
  g_media_handler = new MediaHandler()
  //
  createWindow()

  try {
    //
    g_ipfs_node = await IPFS.create()
    const id = await g_ipfs_node.id()
    console.log(id)

    //test_decrypt()

  } catch (err) {
    console.error(err)
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit() }
})

app.on('activate', () => {
  if (mainWindow === null) { createWindow() }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// In the Main process
const { ipcMain } = require('electron')

function alert_page(ui_msg) {
  //
}

ipcMain.handle('new-entry', async (event,data) => {
  //
  if ( g_user_data === false ) {
    alert_page("user not ready")
    return;
  }
  // ... do actions on behalf of the Renderer
  //
  let asset_type = data.asset_type
  let media_type = data.media_type

  // STORE MAIN MEDIA 
  if ( data.media && data.media.source) {
    if ( data.media_type !== 'image' ) {
      if ( !(await g_media_handler.store_media(media,media_type)) ) {
        console.error("did not write media")
      }
    } else {
      delete data.media.source  // only storing the image .. field is 'poster'
    }
  }
  // STORE POSTER 
  if ( data.media && data.media.poster ) {
    if ( !(await g_media_handler.store_image(media,media_type)) ) {
      console.error("did not write media")
    }
  }

  // IF ADMIN GO AHEAD AN STORE IN PUBLICATION DIRECTORY
  // OTHERWISE SEND IT TO THE ENDPOINT AND STORE IT IN THE USER DIRECTORY
  //
  let id = data._id
  if (  id === undefined || id == 'admin' ) {
    let _tracking =  nanoid()
    data._tracking = _tracking
    id = 'admin'
  }
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
    let resp = g_message_relay.create_on_path(data,'persistence')
    if ( resp.status === "OK" ) {
      add_to_manifest(resp.data)
      console.log("stored")
      // 
    }
  }

})


ipcMain.handle('publish-entry', async (event,data) => {
  //
  if ( g_message_relay === false ) return
  if ( g_user_data === false ) {
    alert_page("user not ready")
    return;
  }
  // ... do actions on behalf of the Renderer
  if ( data && data._id ) {
    let resp = g_message_relay.publication_on_path(data,'persistence')
    if ( resp.status === "OK" ) {
      add_to_manifest(resp.data)
      console.log("published")
    }
    //
  }
  //
})


ipcMain.handle('unpublish-entry', async (event,data) => {
  //
  if ( g_message_relay === false ) return
  if ( g_user_data === false ) {
    alert_page("user not ready")
    return;
  }
  // ... do actions on behalf of the Renderer
  if ( data && data._id ) {
    let resp = g_message_relay.unpublish_on_path(data,'persistence')
    if ( resp.status === "OK" ) {
      add_to_manifest(resp.data)
      console.log("unpublish")
    }
    //
  }
  //
})


// // // // // // // // // //
ipcMain.handle('user-ready', async (event,data) => {
  if ( g_message_relay === false ) return
  if ( data && data._id ) {
    let u_data = g_message_relay.get_on_path(data,'user')
    // { "status" : stat, "data" : data,  "explain" : "get", "when" : Date.now() }
    if ( u_data && u_data.status !== "ERR" ) {
      g_user_data = Object.assign({},u_data) 
    } else {
      let resp = g_message_relay.create_on_path(data,'user')
      if ( resp.status === "OK" ) {
        u_data = g_message_relay.get_on_path(data,'user')
        // { "status" : stat, "data" : data,  "explain" : "get", "when" : Date.now() }
        if ( u_data && u_data.status !== "ERR" ) {
          g_user_data = Object.assign({},u_data) 
          g_message_relay.subscribe(`user-dashboard-${g_user_data._id}`,'persistence',user_dashboard_update)
        }
      }
    }
  }
})
