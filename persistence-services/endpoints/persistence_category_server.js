//
const fs = require('fs')

const TransitionsPersistenceEndpoint = require('../lib/persistence_category_class')

let conf_file = 'relay-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}

let commerce = process.argv[3]

let endpoint = false
if ( commerce === undefined ) { commerce = "free" }
//
let conf = JSON.parse(fs.readFileSync(conf_file).toString())
if ( commerce === "free" ) {
    endpoint = conf.persistence_endpoint
} else {
    endpoint = conf.paid_persistence_endpoint
}

console.log(`Persistence Server: PORT: ${endpoint.port} ADDRESS: ${endpoint.address}`)

new TransitionsPersistenceEndpoint(endpoint)
