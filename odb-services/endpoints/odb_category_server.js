
const TransitionsODBEndpoint = require('../lib/odb_category_class')



let conf_file = 'relay-service.conf'
let conf_par = process.argv[2]
if ( conf_par !== undefined ) {
    conf_file = conf_par
}


let conf = JSON.parse(fs.readFileSync(conf_file).toString())

console.log(`Persistence Server: PORT: ${conf.port} ADDRESS: ${conf.address}`)

new TransitionsODBEndpoint(conf)
