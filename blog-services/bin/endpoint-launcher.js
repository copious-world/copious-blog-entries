const {spawn} = require('child_process')
const fs = require('fs')



const model_file = "relay-service.conf"
const conf_file = process.argv[2]
const conf = (conf_file == undefined) ? model_file : JSON.parse(fs.readFileSync(conf_file).toString())

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

for ( let endpoint in endpoint_procs ) {
    let endpoint_args = endpoint_procs[endpoint]
    let conf_index = endpoint_args.indexOf(model_file)
    if ( conf_index > 0 ) {
        endpoint_args[conf_index] = conf_file
    }
    
    spawn_node_file(endpoint_args)
}
