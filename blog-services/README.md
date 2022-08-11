# copious-endpoints

This module is from the github repository for [copious-blog-entries](https://github.com/copious-world/copious-blog-entries).  This is a subdirectory and its own project.

This module provides servers that enter bloggable content into directories and other stores for access by **mini-link-server** applications which present media links to blog interfaces and their search mechanism.

Two kinds of command line interfaces are provided:

* **copious-users**
* **copious-persistence**

User applications stored records which aid in associating a kind of user identity with assets. This is for the operation of the system as an asset tracker and has little to do with authorization which is handled elsewhere with distributed identities.

Persistence applications manage assets and provide the means of managing asset publication and linking assets with counting services, which provide mechanisms for paying asset creators.  


## Installation

```
npm install -g copious-endpoints
```

> **Note**: npm has been touchy about installation. Please refer to this article for a smoother installation process: [my article](https://dev.to)

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


See for example:

* [svelte-blogs](https://www.github.com/copious-world/svelte-blogs)
* [mini-link-servers](https://www.github.com/copious-world/mini_link_servers)



This is a service node, running a tpc/ip service built on top of node.js. This service derives from [categorical-handlers](https://www.github.com/cooious-world/categorical-handlers), which is a specialization of the endpoint class from the [message-relay-services](https://www.github.com/cooious-world/message-relay-services) package.

This implements two types of **end-points**. One is a *user management node*, providing CRUD for user entries. The other is a *persistence managment node*, which keeps a records of links provding access to blogs services. The persistence service does not serve media. The persistence service writes entries to directories that may bve accessed by [mini-link-servers](https://www.github.com/copious-world/mini_link_servers) for example.

The entries these applications make are the JSON objects containing the link and other meta data about the links. User records retain some information about users, such as a human readable name.

These applications can be run from the command line (provided installation goes according to plan).




The NW app will actually load files into IPFS. But, the blog services will only accept persistence record entries with IPFS CIDs in fields. The blog services may make sure the content identified by a CIDs are available for presentation by blog interfaces.




