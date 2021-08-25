const UCWID = require('ucwid')
const fs = require('fs')



let output_file = process.argv[2]
if ( output_file === undefined ) {
    console.log("useage: node gen_keys.js outputfile ")
    process.exit(0)
}

async function gen_keys() {


    let ucwid_service = new UCWID()

    let [key_wait,key_promise] = ucwid_service.wait_for_key()
    if ( key_wait ) {
        await key_promise
    }

    let keys = ucwid_service.key_package()
    let keystr = JSON.stringify(keys,null,2)
    fs.writeFileSync(output_file,keystr)

}


gen_keys()

