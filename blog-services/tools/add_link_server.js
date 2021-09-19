

const fs = require('fs')
const http = require('http')


//
//
async function tell_link_server(endpoint,link_server_addr) {
    //
    let local_host = `${endpoint.address}:${endpoint.port}`
    local_host = encodeURIComponent(local_host)

    let url = `http://${link_server_addr}/persistence/add-publisher/${local_host}`
    http.get(url, (res) => {

        const { statusCode } = res;
        const contentType = res.headers['content-type'];

        let error;
        // Any 2xx status code signals a successful response but
        // here we're only checking for 200.
        if (statusCode !== 200) {
            error = new Error('Request Failed.\n' +
                            `Status Code: ${statusCode}`);
        } else if (!/^application\/json/.test(contentType)) {
            error = new Error('Invalid content-type.\n' +
                            `Expected application/json but received ${contentType}`);
        }
        if (error) {
            console.error(error.message);
            // Consume response data to free up memory
            res.resume();
            return;
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                console.log(parsedData);
            } catch (e) {
                console.error(e.message);
            }
        });
    }).on('error', (e) => {
        console.error(`Got error: ${e.message}`);
    });
}


let link_server_addr = ""
let conf_file = 'relay-service.conf'

link_server_addr = process.argv[3]
if ( link_server_addr === undefined ) {
    link_server_addr = process.argv[2]
} else {
    conf_file = process.argv[2]
}

if ( link_server_addr === undefined ) {
    console.log("no link server address provided on the command line")
    process.exit(0)
}

//
let conf_str = fs.readFileSync(conf_file).toString()
let conf = JSON.parse(conf_str)

// Just one mini link server connects to two difference persistence managers....
//
let endpoint = conf.persistence_endpoint
tell_link_server(endpoint,link_server_addr)

endpoint = conf.paid_persistence_endpoint
tell_link_server(endpoint,link_server_addr)
//
