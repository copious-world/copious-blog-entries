# persistence-endpoints

This module is from the github repository for [copious-blog-entries](https://github.com/copious-world/copious-blog-entries).  This is a subdirectory and its own project.

This module provides a kind of server that pins media and writes meta descriptions of the media into directories and other stores for access by **mini-link-server** applications. These search applications present meta data which includes information to allow media access through a streaming service.

This module has been separated from the other endpoint implementations to stand on its own:

* **copious-persistence**

Persistence applications manage assets and provide the means of managing asset publication and linking assets with counting services, which provide mechanisms for paying asset creators.

User endpoints from the [copious-endpoints](https://www.npmjs.com/package/copious-endpoints) module may take in user information from publishers necessary to arrange for payment for the use of the media.

The presistence endpoint comprises more code and features than other endpoint packages. In paricular, it uses a repository bridge to configurable types of respositories such as IPFS. The persitence endpoint server will pin files for which it receives identifiers e.g a CID for IPFS. Pinning media files will cause them to be moved (copied prior to garbage collection) from uploader services provided by such systems as the [copious-transitions](https://www.npmjs.com/package/copious-transitions) applications igid-uploader.

## Installation

```
npm install -g persistence-endpoints
```

As the persistence endpoint may make use of a user endpoint from the [copious-endpoints](https://www.npmjs.com/package/copious-endpoints) module, users may want to install the more basic endpoints as well.

```
npm install -g copious-endpoints
```

> **Note**: npm has been touchy about installation. Please refer to this article for a smoother installation process: [my article](https://dev.to)
> 

## Running

Once the module is installed, you can run the programs from the command line. Use the two commands as follows:

```
copious-users relay-service.conf
```


```
copious-persitence relay-service.conf
```

The first command will launch the user record managment service. This service is fairly local to the server. It will look for keys in **keys** directory.

The second command will launch all the differents kinds of persistence services that are specified in the configureations. It will also look for keys in **keys** directory.

Some other directories may need to be created on the top level. It may help to issue the following commands prior to running the services.

```
mkdir users
mkdir assets
mkdir data
```

## Configuring

The configuration file specifies all that will be needed to make connections, startup as a server, idenitify directories for storage, etc.  Here is an example of the configuration file:

```

{
    "port" : 5112,
    "address" : "localhost",
    "path_types" : {
        "outgo_email" : {
            "relay" : {
                "files_only" : true,
                "file_per_message" : false,
                "output_dir" : "mail",
                "output_file" : "outgoing",
                "wrap_limit" : 50
            }
        },
        "contact" : {
            "relay" : {
                "files_only" : true,
                "file_per_message" : false, 
                "output_dir" :  "contacts",
                "output_file" : "contacts",
                "wrap_limit" : 50
            }
        },
        "user" : {
            "relay" : {
                "files_only" : false,
                "output_dir" : "fail_over_user",
                "output_file" : "/user_data.json",
                "port" : 5114,
                "address" : "localhost",
                "max_pending_messages" : false,
                "file_shunting" : false,
                "max_reconnect" : 24,
                "reconnect_wait" : 5,
                "attempt_reconnect" : true
            }
        },
        "persistence" : {
            "relay" : {
                "files_only" : false,
                "output_dir" : "fail_over_persistence",
                "output_file" : "/user_data.json",
                "port" : 5116,
                "address" : "localhost",
                "max_pending_messages" : false,
                "file_shunting" : false,
                "max_reconnect" : 24,
                "reconnect_wait" : 5,
                "attempt_reconnect" : true
            },
            "types" : [ "assets", "blog", "demo", "ownership", "stream" ]
        },
        "paid-persistence" : {
            "relay" : {
                "files_only" : false,
                "output_dir" : "fail_over_persistence",
                "output_file" : "/user_data.json",
                "port" : 5117,
                "address" : "localhost",
                "max_pending_messages" : false,
                "file_shunting" : false,
                "max_reconnect" : 24,
                "reconnect_wait" : 5,
                "attempt_reconnect" : true
            },
            "types" : [ "assets", "blog", "demo", "ownership", "stream" ]
        }
    },
    "launch_endpoints" : {
        "user_endpoint" : [ "endpoints/user_category_server", "relay-service.conf" ], 
        "persistence_endpoint" : [ "endpoints/persistence_category_server", "relay-service.conf", "free" ], 
        "paid_persistence_endpoint" : [ "endpoints/persistence_category_server", "relay-service.conf", "paid" ]
    },
    "user_endpoint" : {
        "port" : 5114,
        "address" : "localhost",
        "app_handles_subscriptions" : true,
        "user_directory" :  "test/assets/users",
        "directories" : [ "blog", "stream", "demo", "links" , "ownership", "wallet", "assets"  ],
        "create_OK" : true,
        "remove_OK" : true,
        "all_users" : "test/users",
        "_gen_targets" : ["dashboard", "profile"],
        "user_file_sep" : "+",
        "tls" : {
            "server_key" : "keys/ec_key.pem",
            "server_cert" : "keys/ec_crt.crt",
            "client_cert" : "keys/cl_ec_crt.crt"
        }
    },
    "persistence_endpoint" : {
        "port" : 5116,
        "address" : "localhost",
        "user_directory" : "test/assets/users",
        "directories" : [ "blog", "stream", "demo", "links" , "ownership", "wallet", "assets"  ],
        "counting_service" : "localhost:6767",
        "multi_meta_hanlders" : {
           "meta" : "meta_searching",
           "counting" : "counting_service" 
        },
        "tls" : {
            "server_key" : "keys/ec_key.pem",
            "server_cert" : "keys/ec_crt.crt",
            "client_cert" : "keys/cl_ec_crt.crt"
        },
        "ucwid" : {
            "pk_str": "public key",
            "priv_key": "private key"
        },
        "ipfs": {
            "dir" : "persistence-ipfs-repo",
            "swarm_tcp" : 4026,
            "swarm_ws" : 4027,
            "api_port" : 5026,
            "tcp_gateway" : 9294
        },
        "publication_directories" : {
            "blog" :  "test/persistence/blog",
            "stream" :  "test/persistence/stream",
            "demo" :  "test/persistence/demo",
            "links" :  "test/persistence/links",
            
            "contacts" : "test/persistence/links",
            "ownership" : "test/persistence/ownership",
            "wallet" : "test/persistence/wallet",
            "assets" :  "test/persistence/assets"
        },
        "entry_types_to_producers" : {
            "blog" :    "dashboard",
            "stream" :  "dashboard",
            "demo" :    "dashboard",
            "links" :   "dashboard",

            "contacts" :    "profile",
            "ownership" :   "profile",
            "wallet" :      "profile",
            "assets" :      "profile"
        },
        "all_users" : "test/users",
        "create_OK" : true,
        "remove_OK" : true
    },
    "paid_persistence_endpoint" : {
        "port" : 5117,
        "address" : "localhost",
        "user_directory" : "test/assets/users",
        "directories" : [ "blog", "stream", "demo", "links" , "ownership", "wallet", "assets"  ],
        "counting_service" : "localhost:6767",
        "multi_meta_hanlders" : {
           "meta" : "meta_searching",
           "counting" : "counting_service" 
        },
        "tls" : {
            "server_key" : "keys/ec_key.pem",
            "server_cert" : "keys/ec_crt.crt",
            "client_cert" : "keys/cl_ec_crt.crt"
        },
        "ucwid" : {
            "pk_str": "public key",
            "priv_key": "private key"
        },
        "ipfs": {
            "dir" : "paid-persistence-ipfs-repo",
            "swarm_tcp" : 4028,
            "swarm_ws" : 4029,
            "api_port" : 5028,
            "tcp_gateway" : 9296
        },
        "publication_directories" : {
            "blog" :  "test/paid-persistence/blog",
            "stream" :  "test/paid-persistence/stream",
            "demo" :  "test/paid-persistence/demo",
            "links" :  "test/persistence/links",
            
            "contacts" : "test/paid-persistence/links",
            "ownership" : "test/paid-persistence/ownership",
            "wallet" : "test/paid-persistence/wallet",
            "assets" :  "test/paid-persistence/assets"
        },
        "entry_types_to_producers" : {
            "blog" :    "dashboard",
            "stream" :  "dashboard",
            "demo" :    "dashboard",
            "links" :   "dashboard",

            "contacts" :    "profile",
            "ownership" :   "profile",
            "wallet" :      "profile",
            "assets" :      "profile"
        },
        "all_users" : "test/users",
        "create_OK" : true,
        "remove_OK" : true
    }
}


```



##### NOTE:

*All crypto keys in this repository are for examples only. Do not expect them to work on any data stored and retrievable by these tools.*


## blog-services .a.k.a copious-endpoints


Theses services run a tpc/ip service built on top of node.js, making use of the **net** module and its TLS provisions. This service derives from [categorical-handlers](https://www.github.com/cooious-world/categorical-handlers), which is a specialization of the endpoint class from the [message-relay-services](https://www.github.com/cooious-world/message-relay-services) package.

The entries, these applications make, are the JSON objects containing the link and other meta data about the links.

For instance, the persistence services interact with the mini-link-servers, which provide asset searching, with blogs and streamers, and with counting services.

See for example:

* [svelte-blogs](https://www.github.com/copious-world/svelte-blogs)
* [mini-link-servers](https://www.github.com/copious-world/mini_link_servers)


## client examples

### NW App

Some of the client operations that interact with these services can be found in the desktop application provided by [copious-blog-entries desktop tool](https://github.com/copious-world/copious-blog-entries/tree/main/NW-app)

The NW app will actually load files into IPFS. But, the blog services will only accept persistence record entries with IPFS CIDs in fields. The blog services may make sure the content identified by a CIDs are available for presentation by blog interfaces.

### Svelte Blog streams-manager

This application is provided as part of the copious.world website and the popsong.now website for uploading media to the blogs and streamer services.

When a user obtains a Intergalactic Identity (a UCWID) for use in establishing a session with the website, the user may view blogs within their human-frame under their subdomain *.of-this.world. When the user logs in (a distributed identity login), the human-frame page belonging to the user will host a dashboard provided by copious.world (or popsong.now). The dashboard will provide the same functionality as the NW App, but will use crypto authorization pathways provided by copious-transitions applications. 


## Operations APIs

The endpoint server expects certain kinds of messages to be sent to it. These messages will handle files and publications for media.


### > CRUD

The persistence service provides basic CRUD operations with a varient on READ.

**CREATE** - a new media file may be uploaded with its meta data. Its UCWID and derivable CID will be allow the persistence services to pin files and enter the meta data into storage. 

**READ** - The media files may be streamed by streaming services known by counting services. API commands exists to make the persistence server be aware of counting services. API commands also exist to make the persistence server aware of searching services which work with media meta data to identify streaming services which fetch the media for user consumption after negotiating with counting services. 

**UPDATE** - Meta data may be changed, while UCWIDs (IGIDs) will not change per se. It may be possible to change the metadata to refer to different IGIDs while retaining the same tracking numbers used by searching services. Alternatively, IGID replacement may best be performed by deleting an entry and then adding a new one. Changes to the meta data becomes publically obserable when entries are published.  Updating means that counting services and search searvices (all those connected to the persistence server) will be sent changes.

**DELETE** - A media element may be erased from the pinning service and its meta data removed form publication. Deletion commands will be relayed through counting services to streaming services.


### > PUBLICATION

Media meta data does not find its way to search services nor to counting services without publication. Publication messages are custom to publication and are sent from their source without an expected response. 

The persistence service takes in a publication command from a dashboard interface or from an intermediaary such as the copious-transitions application (copious-publication).  The persistence service updates the local metat data records to indicate publication and the passes the publication message on to search services. Search services using the meta data are made aware of counting services allowed to handle transactions with regard to public media by links to them being inserted in the metadata. The counting service link eventually becomes the primary link by which a user (media viewer) gains access to the media whose IGID is stored in the meta data.








