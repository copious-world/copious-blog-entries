# odb-services

This module provides two intermediate classes between the **PersistenceCategory** class from [categorical-handlers](https://www.npmjs.com/package/categorical-handlers) and applications requiring ODB (Object Data Base) capabilities. While **PersistenceCategory** provides operations that allow for set, get, update of objects, there are number of methods left for descendants to implement. Among these are the following:

* app\_generate\_tracking
* app\_subscription\_handler
* application\_data\_update
* application\_meta\_publication
* application\_meta\_remove
* make\_path
* user\_manage\_date
* user\_action\_keyfile

This module implements these methods, enabling the management of objects either as data or as meta descriptors to large data objects.

The classes provide two layers. The first layer, the first descendant of **PersistenceCategory**,  handles disk caching of objects or collections of objects. Also, it provides publication of objects to mini link servers.

The second layer, the second descendant, grandchild, of **PersistenceCategory**, adds capabilities for using the object managed by the first descendant as descriptors of large data objects that may be stored and managed by stores accessible via reppository bridges. Repository bridges provide a simple interface to file operations with such systems as the P2P file system IPFS or such as databases or such as regular file systems.


## Installation

```
npm install -g odb-services
```


```
npm install -s odb-services
```



## Usage

Applications should choose one of the classes to override and use it to create a server. A couple of servers are provided for use cases where the default funtionality of the classes is appropriate.

To run the servers, make sure the npm installation has use the global flag. Then, one of two commands can be run from a bash shell or similar. 

The first version does not use persistence:

```
#copious-odb
```

The secod version uses it:

```
copious-odb-repo
```

The second version expects that the configuration file will contain information for connecting to a repository bridge. 

Both of these command line versions expect a configuration file to be in the calling directory. It looks for a file named `odb-service.conf`. This configuration file, in JSON format, can contain configurations for either version or both.

In order to override the classes access them from the node.js require function. Check the following examples:

```
class PublishingEndpoint extends TransitionsODBEndpoint {
	constructor(conf) {
		super(conf)
		
		...
	}
	
	...
}


// for repository bridging use the following:

class PublishingRepoEndpoint extends TransitionsODBRepoEndpoint {
	constructor(conf) {
		super(conf)
		
		...
	}
	
	...
}


// if things are configured appropriately,
// the appliction can construct one of its 
// application class to start a server running.

let app = new TransitionsODBRepoEndpoint(conf)

// this will start running. There may be no reason to access the app object later. However, it might be useful to access the object for such operations as shutting down.

```


### Configuring



## Classes

* **TransitionsODBEndpoint**
* **TransitionsODBRepoEndpoint**

