# end point persistence



## Top down

### First level: endpoint server

The endpoint server is required (imported) from [message-relay-services](https://www.npmjs.com/package/odb-services).  This class name is **ServerMessageEndpoint**.

1. The endpoint server takes care of the pub/sub framework, moving messages to subscribers, and will call overridable messages for handling the message going on this path. 

2. The endpoint server (when not handling a publication) will allow the endpoint application take some action via the method, `app_message_handler`.

#### Publication Pathway

if `app_can_block_and_respond` is set by configuration, the method `send_to_all`  will call `app_publication_pre_fan_response` which must be implemented by a descendant of the endpont class.  The parameters to this method are: `(topic,msg_obj,ignore)`.  `Topic` is the publication topic. `msg_obj` is the message object recevied from th client (JSON parsed); this object must have pub/sub fields set to be here. This call may block further publication. `ignore` is the sender connection, to be ignored when publishing from the endpoint.

If publication is not blocked, each subscriber who is not the sender (the ignore parameter) will be passed to a method, `send_to_one`, which actually writes to a connection.

After sending messages, if the member variable `app_handles_subscriptions` is set, the `send_to_all method` will call `app_subscription_handler(topic,msg_obj)`, which must be implemented by a descendant of the endpont class.

On this level the pub/sub pathway will be used if `_ps_op` is set to a value, which must be one of 'pub', 'sub', or 'unsub'.


#### Set/Get Pathway

The endpoint server will supply a method that handles messages and returns a response to clients. This is `app_message_handler(msg_obj)`. This method must be implemented by the descendant class. `msg_obj` is the message received from a client that sent a TCP/IP message JSON format to the server.

The only requirement on this level is that the message be JSON parsable. There are no other requirements except for the presence of a field `_response_id` that the client must provide if it is using it to key messages.

#### Summary 

The class, **ServerMessageEndpoint** exported by [message-relay-services](https://www.npmjs.com/package/odb-services) provides pub/sub action which in the least ends a message from a publisher to subscribers. 

This class provides a way to call an endpoint method  `app_message_handler(msg_obj)`


### Second level: categorical handler : persistence

One of the **persistence** classes is taken from the module [categorical-handlers](https://www.npmjs.com/package/categorical-handlers). This class provides methods and responses to messages that interact with disk storage. Messages will be written to disk causing files to be created. Then, future messages may send idenifying fields so that the file may be read, updated, deleted, etc.

The set/get pathway methods implemented by categorical handlers provide for handling messages with **CRUD** operations. However, pub/sub pathways may also introduce messages to **CRUD** operations by implementing special methods. 


#### Publication Pathway

On this level little is done with the pub/sub pathway. 

There is one method, `app_subscription_handler(topic,msg_obj)`, that is implemented.

On this level the publication coming from a client is taken in and passed on to local disk publication (moving a file from a private to a public directory) by the method, `app_message_handler(msg_obj)`, with the 'P' option being set.


#### Set/Get Pathway

On this level, the method `app_message_handler(msg_obj)` is implemented o provide basic **CRUD** operations.  This is the endpoint action expected by the higher level class, **ServerMessageEndpoint** when a message is not on the pub/sub pathway.

`msg_obj` must contain the field `_tx_op`. The field may have the values, 'P', 'U', 'G', 'D', 'S'. 

'P' is a publication operation having to do with the disk. Hence, this is not a pub/sub pathway operation. The operation results in the copying of a file from one directory to another. (This means, that the file must already be present in a local directory accessible by a path constuctable from the message object fields.)

'U' unpublish - removes the file from the publication directory but does not remove the file. 

'G' is a get operation. Reads the file from disk and sends it in the return message to the calling client.

'D' removes the file from disk.

'S' puts the file on disk, either creating or updating. A `_user_op` field is required.


Methods passed through given the options 'G', 'D', 'S' will call `user_action_keyfile`. This level does not implement ``user_action_keyfile` but provides a stub.

The 'P' and 'U' options cause operations on the publication directory. If a member field, `app_meta_universe` is true, then meta publication management methods will be called. The methods must be implemented by descendant classes.

#### summary

Persistance classes from [categorical-handlers](https://www.npmjs.com/package/categorical-handlers) provide disk operations for storing and managing messages. 

The entry point to the disk operations is though the method `app_message_handler(msg_obj)`. This method provide endpoint operations and returns the results of the operation to the client.

The pub/sub pathway may capture publications (if so configured) and submit them to `app_message_handler(msg_obj)` for publication. The affect is to copy an existing file to a public (publication) directory. This operation does not block publication passing through the pub/sub pathway.


### Third level: odb-persistence

On this level, dynamically controlled manifests refering to persistence files can be managed. Applications can actively **publish** entries to search engines such as mini link servers. Also, there is an option for delivering large data objects to repositories via repository bridges.

In the odb classes, the method `app_subscription_handler` is overridden, and no call is made to the super. Instead, when a message is taken from the pub/sub pathway, the pub/sub topic determines how the method `app_message_handler(msg_obj)` will be called.



#### Set/Get Pathway

On this level `app_message_handler(msg_obj)` operations 'G', 'S', 'D' will be the default established by the parent. However, on this level the method `user_action_keyfile` is implemented.

When 'P' and 'U' operations are used in `app_message_handler(msg_obj)`, the `app_meta_universe` flag will be ignored and the meta actions will be taken. The 'P' operation results in a call to `publish_mini_link_server` for adding meta descriptors of data. The 'U' operation results in a call to `publish_mini_link_server` for removing meta descriptors of data. 
`publish_mini_link_server` is a publication to mini link servers that have subscribed to receive new publication information. This is a pub/sub pathway hop.

The mini link server publication is a message to those servers and does not touch the local publication directories.

'G' the get operation prepares data to be sent to the client by calling `application_data_update`. On this level, the method is implemneted. On this level, certain fields are changed and the data object is wrapped in an Object with enough information that clients can figured out what they are getting. In particular, it tells the client it is getting the data as a JSON packet:

```
{
	"mime_type" : "application/json",
	"string" : JSON.stringify(d_obj)  // after alterations
}
```


On this level the objects `user_action_keyfile(op,u_obj,field,value)` receives messages undergoing 'CRUD' operations and updates a manifest (table) containing meta records about the data. The table exists for audit and lookup.  It is stored at some interval of time in while the server runs.

If the Repo version of the class is being used, `user_action_keyfile` will interact with the repository bridge when it alls on methods that update the entries table, the local file manifest.


#### Publication Pathway

The following topics map to their prescribed settings.

* **command-publish** -> 'P' ... causes the file to be copied to the publication directory
* **command-recind** -> 'U' ... causes the file to be removed from the publication directory
* **command-delete** -> 'D' ... deletes the file from local storage


The topics **command-publish** and **command-recind** both result in calls to the `user_action_keyfile` with a single field 'published' being updated in the object stored in the manifest table, the entries record in the entries file.


#### summary

As far as publication goes, specific topics will move and remove files in the publication directory. 

Command based publication 'P' results in publication to mini link servers.

When repository bridges are used, files may be ported to wide area P2P storage repositories at the time the manifest is updated.

