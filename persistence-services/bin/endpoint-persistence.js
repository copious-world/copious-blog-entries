#!/usr/bin/env node

const {spawn} = require('child_process')
const fs = require('fs')

const model_file = "persistence-service.conf"
const conf_file = process.argv[2]
const conf = (conf_file == undefined) ? JSON.parse(fs.readFileSync(model_file).toString()) : JSON.parse(fs.readFileSync(conf_file).toString())

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
 

let endpoint_procs = conf.launch_endpoints

/*
"launch_endpoints" : {
    "user_endpoint" : [ "endpoints/user_category_server", "relay-service.conf" ], 
    "persistence_endpoint" : [ "endpoints/persistence_category_server", "relay-service.conf", "free" ], 
    "paid_persistence_endpoint" : [ "endpoints/persistence_category_server", "relay-service.conf", "paid" ]
}
*/

for ( let endpoint in endpoint_procs ) {

    if ( endpoint !== undefined ) {
        let endpoint_args = endpoint_procs[endpoint]
        let conf_index = endpoint_args.indexOf(model_file)
        if ( conf_index > 0 ) {
            endpoint_args[conf_index] = conf_file ? conf_file : model_file
        }
    
        if ( endpoint_args[0].indexOf("--inspect") === 0 ) {
            endpoint_args[1] = __dirname + '/../' + endpoint_args[1]
        } else {
            endpoint_args[0] = __dirname + '/../' + endpoint_args[0]
        }
        
        spawn_node_file(endpoint_args)
    }
}

