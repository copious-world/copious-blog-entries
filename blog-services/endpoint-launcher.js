const {spawn} = require('child_process')
const fs = require('fs')




const conf_file = process.argv[2]
const conf = JSON.parse(fs.readFileSync(conf_file).toString())

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

let endpoint_procs = conf.launch_endoints

for ( let endpoint in endpoint_procs ) {
    let endpoint_args = endpoint_procs[endpoint]
    spawn_node_file(endpoint_args)
}
