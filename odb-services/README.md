# odb-services

This module provides classes which act as servers when they are instantiated. Their descendants will be servers as well. These services handle TCP/IP message traffic with payloads in JSON format. These classes outline certain types of database activity and pub/sub activity listening index servers.

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


## TransitionsODBEndpoint -- Class

This is the first descendant class of **PersistenceCategory** class from [categorical-handlers](https://www.npmjs.com/package/categorical-handlers). This class introduces code for storing objects or object collections in files and for publishing to mini link servers.

This class implementation provides a number of customizations of the suggested application based methods which are stubbed in the parent class. Some of the methods implemented are stubbed at the *common* level. For instance, the `user_action_keyfile` method is called in by `app_message_handler` which occurs across the category handler branched subclasses. The `user_action_keyfile` method is called via create and update methods. Processing is directed to it so that the application can do more than just write/read a file to/from a directory.

The implementations provided here places some restrictions on the object structure and the naming of files that contain specific objects, etc. These implementations still leave a lot of room for applications to shape data and further extend the class methods to accomodate them. Some of the additions to the objects (meta desriptors) passing through these servers 

### Methods

* **constructor**
* **app\_generate\_tracking**
* **make\_path**
* **publish\_mini\_link\_server**
* **application\_meta\_publication**
* **application\_meta\_remove**
* **app\_subscription\_handler**
* **application\_data\_update**
* **user\_manage\_date**
* **get\_entries**
* **get\_entries\_record**
* **write\_entry\_file**
* **create\_producer\_entry\_type**
* **update\_producer\_entry\_type**
* **update\_producer\_entry\_type\_field**
* **delete\_producer\_entry\_type**
* **user\_action\_keyfile**


### Methods -- details


#### constructor

>

**parameters**: (conf)

* conf -- A configuration object.

----


#### app\_generate\_tracking

> Returns the hash of a stringification of a JavaScript object

**parameters**: (p_obj)

* p_obj -- A JavaScript object. 

----


#### make\_path

> Extracts asset information from a particular field in the top level object. The field name that stores the asset information should be in a field named either `key_field` or `_transition_path`.  The value will be found as `obj[obj._transition_path]`. 
> 
> The value should be a '+' delimited string with at least three fields. This string will be split at the '+'s and the array of atomic results will be used to make a path to a file (linux file system path).
> 
> The expected format of the string should indicate the user who owns the file, the type of file (as in mimetype) and a file name (usually and asset ID such as a CID or UCWID).
> 
> The atoms will be used to construct a path to a file. The path will be in the reverse order of atoms in the `obj[obj._transition_path]` value.
> 
> For example, if a `obj[obj._transition_path]` contains the string `file-name+music+joe-smith`, a path to a file will be created along the lines of `my-users/joe-smith/music/file-name.json`.
> 
> The file name will likely be a UCWID. Instead of music, one might have `WAV` or `mp3`.
> 
> Much of the intention of the name format atomic parts will be decided by the application with some restrictions beginning with client code. This module just offers this naming and storage path for transport and the use and endpoints.

**parameters**: (obj)

* obj -- A JavaScript object. 

----



#### publish\_mini\_link\_server

> This method is called by methods that store the meta object descriptors and referenced file data in order to control the publication of the meta descriptor objects. The mini-link-servers injest the objects and place them in indexes. Client applications can query the mini-link-servers to find out how to reference the data the desciptors refer to.
> 
> The method is failry utilitarian, as it just makes a publication message and then calls `app_publish_on_path`. `app_publish_on_path` is pulled in from [message-relay-services](https://www.npmjs.com/package/message-relay-services) *ServeMessageEndpoint*. The method has default behavior which simply carries out publication.

**parameters**: (topic,msg_obj)

* topic -- A topic for publication. 
* msg_obj -- The meta descriptor object that is being handled by the endpoint

----



#### application\_meta\_publication

> Sends all or part of a meta descriptor object to one or more mini link servers via publication. Creates an `add` kind of topic for the link server based on the asset type and media type field in the meta descriptor object. 
> 
> If the object contains a list of `exclusion_fields` attached at a field of that name, those fields will be removed from the object before publication. The array of `exclusion_fields` strings expects a format of object paths using the dotted path format, e.g. `one.two.three`. The final field will be removed from the object at its depth.

**parameters**: (msg_obj)

* msg_obj -- The JavaScript object that acts as a meta-descriptor for data publication

----


#### application\_meta\_remove*

> Sends an identifying part of a meta descriptor object to one or more mini link servers via publication so that the object may be removed. The object should have a `_tracking` field use to index the object in the mini-link-server.

**parameters**: (p_obj)

* p_obj -- The JavaScript object that acts as a meta-descriptor for data publication.

----



#### app\_subscription\_handler

> This method is called after publication of a message bearing some topic. In this class implementation, if this option is being used, the publication object is updated to use the operations in then `user_action_keyfile` method. With this option, the application adds a pathway for messages into the database operations associated with the application implementation.

**parameters**: (topic,msg_obj)

* topic -- The message topic for pub/sub channels.
* msg_obj -- The JavaScript object that acts as a meta-descriptor for data publication

----


#### application\_data\_update

> When the persistence server message handler, `app_message_handler`, runs a `get` command (a message object with 'G' for `_tx_op`), it calls this method to finalize the stringification of the object.  This allows fields to be added or removed or data to be updated. 
> 
> The caller loads data from a file containing a JSON object that has rich meta descriptor information. This object is parsed and altered for transport. This method returns an object for client consumption indicating mime type and the data as a string. The returns object has the following format:

```
{
    "mime_type" : "application/json",
    "string" : JSON.stringify(data_obj)
}
```

**parameters**: (obj)

* msg_obj -- The JavaScript object that acts as a meta-descriptor for data publication
* data -- a JSON parseable string conaining the data that was previously set.

----


#### user\_manage\_date


> This method makes sure that the object contains a date object such as the following:
> 
```
{
    "created" : Date.now(),
    "updated" : Date.now()
}
```

This attached to a `date` field at the top level of the objec. The op parameter will influence the dates being set anew or updated only.


**parameters**: (op,msg\_obj)

* op -- an op for user\_action\_keyfile
* msg_obj -- The JavaScript object that acts as a meta-descriptor for data publication

----


#### put\_entries

> Writes an entries table to a file.

> Returns `entries_record_str`, the stringification of the entries record

**parameters**: (entries\_file,entries\_record)

* entries\_file -- The path to the entries record.
* entries\_record -- JavaScript object to write.

----


#### get\_entries

> Loads an entries file, which is a record containing a map of IDs to all the possible meta descriptors that will be stored file by file in a directory.

> Returns `entries_record`

**parameters**: (entries\_file)

* entries\_file -- The path to the entries record.

----


#### get\_entries\_record

> Loads the entries file after figuring out its name. This uses the type of asset to lookup application configured naming conventsion for directories containing. 

> Returns `[entries_record, producer_of_type, entries_file]`

**parameters**: (user\_path,entry\_type)

* user\_path -- A path to a directory, perhaps a user, containing an entries file.
* entry\_type -- a type of data file. 

----


#### write\_entry\_file


> Calls put\_entries to store the file locally. Publishes the entries as a string to a topic determined by the user and the producer of a type of data.

**parameters**: (entries\_file,entries\_record,producer\_of\_type,user\_id)

* entries\_file -- The file that will store the entries table
* entries\_record -- The entries record
* producer\_of\_type -- a producer identifier (an application determined label)
* user\_id -- the ID of the user entering the data into the system.

----


#### add\_producer\_entry\_type

> The entries\_record is partitioned by entry types (file types). Each entry type refers to an array of objects containing entries. Pushes the new entry on the appropriate array identified by type.

**parameters**: (entry\_obj,user\_path,entries\_record,entry\_type)

* conf -- A configuration object.

----


#### update\_producer\_entry\_field

> Searches the entries table array assigned to a particular entry type for an entry. Uses `_tracking` for matching. Once the entry is found, it is overwritten by the new entry.
> 
> returns: `[ref_entry,entry_obj]` or [false,false]

**parameters**: (entry\_obj,user\_path,entries\_record,entry\_type)

* conf -- A configuration object.

----


#### delete\_producer\_entry\_field

> Searches the entries table array assigned to a particular entry type for an entry. Uses `_tracking` for matching. Once the entry is found, the method deletes the entry from the array.
> 
> returns true on success

**parameters**: (entry\_obj,user\_path,entries\_record,entry\_type)

* conf -- A configuration object.

----


#### user\_action\_keyfile  

> This is an implementation of the PersistenceCategory class stub. The parameter `op` is one of the following:

C - create an object, save to local disk. Publish to mini link servers.
U - update an object, overrwrites previous values.
F - update an object at a field using the value parameter
D - delete an object, remove from local disk. Issues 'unpublish' comand to mini link servers.

An update requires that a `_tracking` field is present in an object. But, `_tracking` may be added during creation of an object. 


**parameters**: (op,u\_obj,field,value)

* op -- C,U,F,D as described above.
* u\_obj -- the object that is being handled
* field -- a field for use with the 'F' option.
* value -- a value to assign to the updated field.

----




## TransitionsODBRepoEndpoint -- Class

This class introduces methods that work with repositories. Other than that, it overrides the methods from **TransitionsODBEndpoint** that deal with storage of data. The overrides call on the repository interfacing methods in addition to the actions taken in the parent inplementation.

Each repository method looks for an array field, `repository_fields`, attached to the calling parameter object at the top level. The array elements, `repository_fields`, are strings that are paths to fields in the parameter object. The strings from the array are dot separated field names. E.g. `one.two.three`. Each path expression is supposed to lead to an object, a terminus object, nested within the parameter object. (The method's operation is performed for evey path in the `repository_fields`.)

Any terminus object itself should have a 'protocol' field. The protocol field attached to the terminus object is used to access yet another field of the terminus object. That field, so named for the protocol, should contain an ID value that can be used to indicate an object in the protocol's storage.

The existence of the ID signifies that some BLOB data has already been introduced into a storage system, the repository, but that its presence there is not finalized or permanent. The repository interfacing methods request final actions by the repositories via the repository bridges.

> Example: In the case of IPFS, when adding data, the ID of a file, a CID, will be stored in an `ipfs` field and the `protocol` field have the value 'ipfs'. The CID identifies a file that has been submitted to the repository, but has yet to be pinned.

Other repository implementations will have different IDs and methods of finalizing data.



### Methods

* **constructor**
* **repository\_initializer**
* **repo\_add**
* **repo\_replace**
* **repo\_remove**
* **create\_producer\_entry\_type**
* **update\_producer\_entry\_type**
* **update\_producer\_entry\_type\_field**
* **delete\_producer\_entry\_type**



### Methods -- details


#### constructor

>

**parameters**: (conf)

* conf -- A configuration object.

----



#### repository\_initializer

> This creates a repository object of the class Repository from [repository-bridge](https://www.npmjs.com/package/categorical-handlers).  The initialization is from conf. It defaults to using an IPFS repository.

**parameters**: (conf)

* conf -- A configuration object.

----




#### repo\_add

For each path found in the `repository_fields` of obj, the terminus object of a path is handed over to the repository bridge. The object repository will take action to finalize the object storage. 

**parameters**: (obj)

* obj -- A configuration object.

----


#### repo\_replace

For each matching path found in the `repository_fields` of two objects, each  terminus object of the path is handed over to the repository bridge's replace method. The object repository will take action to replace the old object with the new, and replace the BLOB data. 

> In IPFS, the replace method of the repository bridge will unpin the old BLOB and pin the new BLOB.

**parameters**: (old\_obj,new\_obj)

* obj -- A configuration object.

----


#### repo\_remove

For each path found in the `repository_fields` of obj, the terminus object of a path is handed over to the repository bridge. The object repository will take action to detach the object from storage. 


**parameters**: (obj)

* obj -- A configuration object.

----


#### update\_producer\_entry\_type

> Calls the super class version of this method. Then, it calls `repo_replace`. (see above)

**parameters**: (entry\_obj,user\_path,entries\_record,entry\_type)

* conf -- A configuration object.

----


#### update\_producer\_entry\_field

> Calls the super class version of this method. Then, it calls `repo_replace`. (see above)

**parameters**: (entry\_obj,user\_path,entries\_record,entry\_type)

* conf -- A configuration object.

----


#### delete\_producer\_entry\_field

> Calls the super class version of this method. Then, it calls `repo_remove`. (see above)

**parameters**: (entry\_obj,user\_path,entries\_record,entry\_type)

* conf -- A configuration object.

----

