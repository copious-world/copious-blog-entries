#!/usr/bin/env node


const {spawn} = require('child_process')
const fs = require('fs')



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

/// LOAD CONFIGURATION AND SEE IF THE REPO FLAG IS SET

const model_file = "odb-service.conf"

let use_repo_conf = process.argv[2]

let f_index = 2
if ( use_repo_conf === "repo" ) {
    f_index = 3
} else {
    use_repo_conf = false
}


const conf_file = process.argv[f_index]
const conf = (conf_file == undefined) ? JSON.parse(fs.readFileSync(model_file).toString()) : JSON.parse(fs.readFileSync(conf_file).toString())


let endpoint_procs = conf.launch_endpoints

/*
"launch_endpoints" : {
    "odb_endpoint" : [ "endpoints/odb_category_server", "relay-service.conf", "free" ]
    "odb_repo_endpoint" : [ "endpoints/odb_category_repo_server", "relay-service.conf", "free" ]
}
*/



let endpoint =  (use_repo_conf === "repo") ? "odb_repo_endpoint" : "odb_endpoint" 

let endpoint_args = endpoint_procs[endpoint]
let conf_index = endpoint_args.indexOf(model_file)
if ( conf_index > 0 ) {     // make an array of arguments for the spawn call. Use defaults if necessary
    endpoint_args[conf_index] = conf_file ? conf_file : model_file
}

endpoint_args[0] = __dirname + '/../' + endpoint_args[0]


console.dir(endpoint_args)

spawn_node_file(endpoint_args)