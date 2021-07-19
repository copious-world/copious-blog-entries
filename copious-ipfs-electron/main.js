//'use strict'

const { app, BrowserWindow } = require('electron')
const IPFS = require('ipfs')
const fs = require('fs')
const uuid = require('uuid/v4')
const crypto = require('crypto')


const FileType = require('file-type');

const {MessageRelayer} = require("category-handlers")


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


function decryptMedia(data) {
  try {
      const decipher = crypto.createDecipheriv(g_algorithm, g_key, g_iv);
      const decrpyted = Buffer.concat([decipher.update(data), decipher.final()]);
      return decrpyted
  } catch (e) {
      throw e;
  }
}
//

class DecryptStream {
  constructor() {
    this.decipher = crypto.createDecipheriv(g_algorithm, g_key, g_iv);
  }

  decrypt_chunk(data) {
    const decrpyted = Buffer.concat([this.decipher.update(data)]);   //, decipher.final()
    return decrpyted
  }

  decrypt_chunk_last() {
    const decrpyted = Buffer.concat([this.decipher.final()]); 
    return decrpyted
  }
}


check_crypto_config(g_conf)
/*
async function test_decrypt() {
  let media_name = 'clip_0012.mp4' //'cloudsdrift_cdb.mp3'
  let in_file = g_conf.media_dir + media_name

  try {
    let enc_blob = fs.readFileSync(in_file)

    let clear_blob = decryptMedia(enc_blob)

    let out_file = g_conf.media_dir + "clear_" + media_name
    fs.writeFileSync(out_file,clear_blob)

    let cid = "QmPC4L1b4fwWQ7As6joafAo2ezvF2K9a3un8YPgoTV7dmi" //"Qme18G3xXNW9qDgkTGsrvFieEbfnjDhHzHs7f7CA5yRwbk"

    let out_file_2 = g_conf.media_dir + "ipfs_clear_" + media_name
    let decrypt_eng = new DecryptStream()
    let writeStream = fs.createWriteStream(out_file_2)

    let detected = false
    let chunk_wait = []
    let mime_type = "nothing"
    for await ( const chunk of g_ipfs_node.cat(cid) ) {
      //chunks.push(chunk)
      let dec_chunk = decrypt_eng.decrypt_chunk(chunk)
      if ( !detected ) {
        mime_type = await FileType.fromBuffer(dec_chunk)
        if ( mime_type === undefined ) {
          chunk_wait.push(dec_chunk)
        } else {
          detected = true
          for ( let chunk of chunk_wait ) {
            writeStream.write(chunk)
          }
          writeStream.write(dec_chunk)
          console.log(mime_type)
        }
      } else {
        writeStream.write(dec_chunk)
      }
    }
    let dec_chunk = decrypt_eng.decrypt_chunk_last()
    writeStream.write(dec_chunk)
    writeStream.close()
    

  } catch (e) {
    console.error("did not write media")
  }

}
*/
// ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

let mainWindow

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

app.on('ready', async () => {
  g_message_relay = new MessageRelayer(g_conf.relayer)
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
  if ( g_user_data === false ) {
    alert_page("user not ready")
    return;
  }
  //
  // ... do actions on behalf of the Renderer
  //
  let _tracking =  uuid()
  //
  // 
  let do_encrypt = true
  let asset_type = data.asset_type
  let media_type = data.media_type

console.log(data.asset_type)
console.log(data.media_type)

  if ( data.media_type === 'video' ) {
    do_encrypt = false
  }
  let blob_data = false
  let media_dir = g_conf.media_dir
  media_dir = media_dir.replace('$media_type',media_type)
  //
  if ( data.media && data.media.source && (data.media_type !== 'image') ) {
    console.log(data.media.source.file)
    //
    blob_data = data.media.source.blob_url
    delete data.media.source.blob_url
    //
    let bdata_parts = blob_data.split(',')
    let blob_bytes = bdata_parts[1]
    //
    const blob = Buffer.from(blob_bytes, 'base64');
    //
    let media_name = data.media.source.file.name
  
    let out_file = media_dir + media_name
    try {
      //
      let enc_blob = do_encrypt ? encryptMedia(blob) : blob
      fs.writeFileSync(out_file,enc_blob)
      //
      const file = await g_ipfs_node.add({
          "path": media_name,
          "content": enc_blob
      })
      //
      let cid = file.cid.toString()
      data.media.protocol = 'ipfs'
      data.media.ipfs = cid

    } catch (e) {
      console.error("did not write media")
    }
    //

    //
  } else if ( data.media && data.media.source && (data.media_type === 'image') ) {
    delete data.media.source  // only storing the image
  }

  if ( data.media && data.media.poster ) {
    //
    blob_data = data.media.poster.blob_url
    delete data.media.poster.blob_url
    //
    let bdata_parts = blob_data.split(',')
    let blob_bytes = bdata_parts[1]
    //
    const blob = Buffer.from(blob_bytes, 'base64');
    //
    let image_name = data.media.poster.file.name
    let out_file = media_dir + image_name
    try {
      //
      let enc_blob = do_encrypt ? encryptMedia(blob) : blob
      fs.writeFileSync(out_file,enc_blob)
      //
      const file = await g_ipfs_node.add({
          "path": image_name,
          "content": enc_blob
      })
      //
      let cid = file.cid.toString()
      if ( data.media_type === 'image' ) {
        data.media.protocol = 'ipfs'
        data.media.ipfs = cid  
      } else {
        data.media.poster.protocol = 'ipfs'
        data.media.poster.ipfs = cid  
      }

    } catch (e) {
      console.error("did not write media")
    }

  }

  data._tracking = _tracking
  let email = data.email
  if ( email === undefined ) {
    email = 'admin'
  }
  //
  try {
    let dir = g_conf.entries_dir
    dir = dir.replace("$asset_type",asset_type)
    let out_file = dir + _tracking + '+' + email + ".json"

console.log(out_file)
    fs.writeFileSync(out_file,JSON.stringify(data,false,2))
  } catch (e) {
    console.error("did not write image")
  }

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
        }
      }
    }
  }
})
