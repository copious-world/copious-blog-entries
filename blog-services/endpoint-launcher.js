const {spawn} = require('child_process')
const fs = require('fs')




const conf_file = process.argv[2]
const conf = JSON.parse(fs.readFileSync(conf_file).toString())

function spawn_node_file(endpoint) {
    let proc = spawn("node",[endpoint,conf_file])
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

let endpoint_procs = conf.launch_endoints

for ( let endpoint of endpoint_procs ) {

    spawn_node_file(endpoint)

}
