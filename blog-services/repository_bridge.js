
// ---- ---- ---- ---- ----
//
const g_supported_repos = {
    //
    'ipfs' : {
        "init" : async (cnfg,IPFS) =>  {
            let container_dir = cnfg.repo_location
            if ( container_dir == undefined ) {
                container_dir =  process.cwd() + "/repos"
            }
            //
            let subdir = cnfg.dir
            if ( subdir[0] != '/' ) subdir = ('/' + subdir)
            let repo_dir = container_dir + subdir
            let node = await IPFS.create({
                repo: repo_dir,
                config: {
                    Addresses: {
                        Swarm: [
                        `/ip4/0.0.0.0/tcp/${cnfg.swarm_tcp}`,
                        `/ip4/127.0.0.1/tcp/${cnfg.swarm_ws}/ws`
                        ],
                        API: `/ip4/127.0.0.1/tcp/${cnfg.api_port}`,
                        Gateway: `/ip4/127.0.0.1/tcp/${cnfg.tcp_gateway}`
                    }
                }
            })
            //
            const id = await this.ipfs.id()
            console.log(id)
            //
            const version = await node.version()
            console.log('Version:', version.version)
            return ['ipfs',node]
        },
        "import" : () => {
            let mod = require('ipfs')
            return mod
        },
        "stringify" : (repo_record) => {
            let id_str = repo_record.cid.toString()
            return id_str
        }
    }

}


class Repository {

    constructor(config,kinds) {
        this.configs = {}
        this.repos = {}
        for ( let k of kinds ) {
            if ( k in g_supported_repos ) {
                this.configs[k] = config[k]
            }
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async init_repos() {
        let promises = []
        for ( let k in this.configs ) {
            let conf = this.configs[k]
            let factory = g_supported_repos[k].import()
            promises.push(g_supported_repos[k].init(conf,factory))
        }

        let connectors = Promise.all(promises)
        for ( let con in connectors ) {
            let [key,node] = con
            this.repos[key] = await node
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async store(entry_obj) {
        try {
            let repo_ky = entry_obj.protocol
            let repo = this.repos[repo_ky]
            let pin_id = entry_obj[repo_ky]
            await repo.pin.add(pin_id)
        } catch (e) {
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async remove(entry_obj) {
        try {
            let repo_ky = entry_obj.protocol
            let repo = this.repos[repo_ky]
            let pin_id = entry_obj[repo_ky]
            await repo.pin.rm(pin_id)
        } catch (e) {
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async replace(old_obj,new_obj) {
        await this.repository.remove(old_obj)
        await this.repository.store(new_obj)
    }


    async add(kind,object) {
        try {
            let repo = this.repos[kind]
            const repo_record = await repo.add(object)
            let repo_id_str = repo.stringify(repo_record)
            return repo_id_str
        } catch (e) {
        }
        return false
    }
    //
}


module.exports = Repository
