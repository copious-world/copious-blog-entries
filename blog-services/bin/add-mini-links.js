#!/usr/bin/env node

const {spawn} = require('child_process')


let ml_type = process.argv[2]
let link_server_addr = process.argv[3]

let model_file = "@-service.conf"
model_file = ml_type ? model_file.replace("@",ml_type) : "relay-service.conf"
//

function spawn_node_file(endpoint_args) {
    let proc = spawn("node",endpoint_args)
    proc.on('close',(code) => {
        console.log(`child process closed with code ${code}`)
    })
    proc.stderr.on('data',(chunk) => {
        console.log(chunk.toString())
    })
    proc.stdout.on('data',(chunk) => {
        console.log(chunk.toString())
    })
}


let endpoint_args = ["","",""]

if ( ml_type === "contact" ) {
    endpoint_args[0] = __dirname + '/../tools/add_contact_server.js'
} else if ( ml_type === "pesistence" ) {
    endpoint_args[0] = __dirname + '/../tools/add_link_server.js'
}
endpoint_args[1] = model_file
endpoint_args[2] = link_server_addr
//
console.dir(endpoint_args)

spawn_node_file(endpoint_args)