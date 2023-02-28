# time managed data 

This module provide classes that address the creation of a complex of endpoint servers that work together to move data through Web Sockets types of interfaces to clients, admins, and logging databases.

The classes provide methods for storing data in buckets assigned to days of months. As data is stored, the month buckets will be published or updated via publication to index servers for which there are user interfaces for perusing and searching the data.

## Purpose

This module began with some classes for managing scheduling future events. It can also be used in conjunction with message logging, time stamped message history, chats, etc. That is, it also works with the past and its record of events passing through channels established by application servers utilitizing these classes.


## Installation

```
npm install -s time-managed-data
```


## Usage

Coming soon


## Configuring

Coming soon

## Classes

There are four basic classes that are provided by this module. Applications should override these classes and follow the API format they provide.

* **TimeManagedData**
* **TimeManagedDataEndpoint**
* **MonthManagement**
* **SafeStorageAgendaInterface**


Two of the class form the basis of server implementations. These are **TimeManagedData** and **TimeManagedDataEndpoint**. **TimeManagedData** is a web socket server that provides flow through publication to peer clients. **TimeManagedDataEndpoint** is a client of the **TimeManagedData**  and provides data caching, logging, and filtering. **TimeManagedData** also has the option of connecting to a [copious-transitions](https://www.npmjs.com/package/copious-transitions) application that performs session validation before message are forwarded on the publication pathways.

Two classes are exemplary and are not part of the server hierarchy. There are **MonthManagement** and **SafeStorageAgendaInterface**. 

The **MonthManagement** provides some default behavior for the time element required in the configuration of **TimeManagedDataEndpoint** instances. **MonthManagement** has member fields that derived from EventDays.MonthContainer from the [event-days](https://www.npmjs.com/package/event-days) module. The **MonthManagement** provides a set of methods that classes should use or override in order to be used by **TimeManagedDataEndpoint** instances.

In turn, **MonthManagement** makes use of extensions of EventDays.TimeSlotAgenda derived from **SafeStorageAgendaInterface**. The **SafeStorageAgendaInterface** provides a set of methods which are triggered to crash the application is they are not overridden by applciation versions. The class is set up to force the override as an abstract class would stop complication without implementations. **SafeStorageAgendaInterface** follows a method API that allows processes to store data in the days of the months according to timestamps. 


## TimeManagedData -- Class

This class is a descendant of **WSServeMessageEndpoint** from [message-relay-websocket](https://www.npmjs.com/package/message-relay-websocket). Write descendant of this class in order to set up a WS Server.

This class provides its own serialization and moves messages between clients and to the **TimeManagedDataEndpoint** instances. 

The constructor of this class set up pub/sub relays for the following topics:

* ADD\_DATA\_EVENT\_TOPIC
* DATA\_EVENT\_CHANGE\_TOPIC
* DATA\_EVENT\_DROP\_TOPIC
* REJECT\_DATA\_TOPIC

This class also provides the option of working with a session checking server. The methods, init\_session\_management and session\_check, are provided for this purpose.

### Methods

* **remove\_old\_messages**
* **serialize**
* **deserialize**
* **shutdown**			-- calls serialize
* **restore\_fields**	-- calls deserialize
* **app\_message\_handler**
* **init\_session\_management**
* **session\_check**
* **app\_generate\_tracking**
* **app\_subscription\_handler**
* **app\_post\_start\_subscription**
* **app\_publication\_pre\_fan\_response**

### Methods -- details


#### remove\_old\_messages

> This method provides the service of removing messages from its in RAM caches of messages if they are old. This class does not set up any calls to this method. Application or descendants of this class should decide when to call this method.

**parameters**:

* before\_time -- Removes messages older than this parameter

----


#### serialize

> Provides serialization for this class. For this class, this is the set of messages that are waiting to be published or that are being reserved for some time for new client sessions

**no parameters**:

----

#### deserialize

> Restores the list of waiting messages.

**no parameters**:

----


#### app\_message\_handler

> This is an override of the endpoint method, expected of endpoint subclasses. The implementation actually removes any activity of the handler and echoes back to clients. Removing message handling in this method essentially restricts the service to WS messages that are on publication pathways.

**parameters**:

* msg\_obj -- a message from the client (such as a browser)

----


#### init\_session\_management

> This method is called if the conf parameter of the constructor has a field `session_manager` set to the configuration object for the session manager operations. The field, `session_manager`, should be a configuration parameter for the class *MessageRelayer* from [message-relay-services](https://www.npmjs.com/package/message-relay-services).
> 
> Constructs a *MessageRelayer* making a connection with a backend session checking service.

**parameters**:

* sess\_conf -- a configuration object for a *MessageRelayer* class instance.

----


#### session\_check

> Calls out to a session checking service to see if a session is current for the user and session id.
> 
> The message sent to the service will be of this form:

```
    let message = {
        "ucwid" : ucwid,
        "session" : sess_id,
        "action" : 'session-check'
    }
```

**parameters**: (ucwid,sess\_id)

* ucwid -- a user identity
* sess\_id -- a session identity


----

#### app\_generate\_tracking

> An override of a method from the original *ServeMessageEndpoint* from [message-relay-services](https://www.npmjs.com/package/message-relay-services). Adds a `_tracking` field to the object being relayed in case it does not exist.
> 
> This is similar to other tracking methods found in other modules, except that the tracking field has the date attached to the end. E.g. `<ucwis>-<date>`.

**parameters**:

* pub\_obj -- An object passing through publication or being "set".

----


#### app\_subscription\_handler

> An override of a method from the original *ServeMessageEndpoint* from [message-relay-services](https://www.npmjs.com/package/message-relay-services). This is the handler for the topics added by the constructor; it is called post publication by endpoints in send\_to\_all. In this class, it is left as a stub, and descendants may decide to implement it.

**parameters**: (topic,pub\_obj)

* topic -- the topic being subscribed to by some client
* pub\_obj -- An object passing through publication or being "set".

----


#### app\_post\_start\_subscription

> An override of a method from the original *ServeMessageEndpoint* from [message-relay-services](https://www.npmjs.com/package/message-relay-services). This method is implemented, in this class, so that pending messages may be sent to a newly subscribed client. The messages will likley be those that are still relevant at the time a client subscribes to the topic. As such, fairly recent messages will be sent to a client, while some messages will have been pruned away and will never be sent. However, clients may use an interface to a type of little searcher that offers historical data in search results.

**parameters**: (topic,client\_name,relayer)

* topic -- the topic being subscribed to by some client
* client\_name -- a key to the client subscriber data structures
* relayer -- a communicaiton object that may be used to write to a client

----


#### app\_publication\_pre\_fan\_response

> An override of a method from the original *ServeMessageEndpoint* from [message-relay-services](https://www.npmjs.com/package/message-relay-services).  This method has the capacity to block the publication of a message passing through the pub/sub channels.
> 
> Often, this method is used just to setup date for creation and update. This implementation offers the option of checking the message for session permission and also offers a chance to save a message if it is publishing a topic still waiting for subscriptions.

**parameters**: (topic,pub\_obj,ignore)

* topic -- the topic being subscribed to by some client
* pub\_obj -- An object passing through publication or being "set".
* ignore -- from the caller, the caller is not sending a message to connection associated with the `ignore` parameter.

----


## TimeManagedDataEndpoint -- Class

This class is a descendant of **TimeManagedWSProxy**, which in turn is a descendant of **TransitionsODBEndpoint**, from [odb-services](https://www.npmjs.com/package/odb-services). Write descendant of this class in order to set up an endpoint server for working with admin, publication, and persistant storage such as a database.

### Methods

Methods for initialization.

* **setup\_time\_element**
* **web\_socket\_subscriptions**
* **ws\_subscribe\_and\_handler**
* **serialize**
* **deserialize**

Methods related to endpoint usage.

* **app\_generate\_tracking**
* **app\_subscription\_handler**
* **app\_publication\_pre\_fan\_response**
* **put\_entries**
* **put\_entries\_array**
* **slot\_from\_descr**
* **generate\_revised\_months**
* **user\_action\_keyfile**

Methods for handling the timed requests

* **get\_agenda\_of\_request**
* **get\_publishable**
* **handle\_no\_date\_data**
* **handle\_inoperable**
* **ws\_publisher**


### Methods -- details


***Methods for initialization***.

#### setup\_time\_element

> Creates a time-element or defaults to making a MonthManagement instance. The class is implemented with a field `time_element` that refers to this object.
> 
> Applications that have their own version of a MonthManagment implementation shoud specify a `time_element` field in the class configuration. The field will either `require` the time element or use it as a constructor if its type is 'function'.
> 
> The time element constructor will be passed the conf object passed to the constructor of this class. 

**parameters**:

* req -- a request

----


#### web\_socket\_subscriptions

> This method is an initialization method. It calls upon `ws_subscribe_and_handler` for a number of topics that are default subscriptions for this class. These are the following:

* ACCEPT\_EVENT\_TOPIC
* FILTER\_ACCEPTED\_TOPIC
* REJECT\_DATA\_TOPIC
* ADD\_DATA\_EVENT\_TOPIC
* DATA\_EVENT\_CHANGE\_TOPIC
* DATA\_EVENT\_DROP\_TOPIC

Each of these topic is assigned a data handling method to be used within a generic callback use by `ws_subscribe_and_handler`

**no parameters**:

----


#### ws\_subscribe\_and\_handler

> This method general subscription handling for a number of topcis. (See *web\_socket\_subscriptions*).
> 
> Here is the body of the handler this method assigns to publication responses:

```
(message) => {
    let the_agenda = self.get_agenda_of_request(message)
    let slot_req = message.slot_req
    if ( the_agenda && slot_req && agenda_op(the_agenda,slot_req) ) {
        let publishable = self.get_publishable(message)
        if ( publishable ) {
            self.ws_publisher(publishable)
        }
    } else {
        if ( !(the_agenda )) self.handle_no_date_data(message)
        else self.handle_inoperable(topic,slot_req)
    }
}
```

Note that this method calls `agenda_op` which is the specific handler associated with a topic. The following is a mapping of the topics provided to the handlers provided by application dependent agenda methods:

* ACCEPT\_EVENT\_TOPIC -- `publish_data(slot_req)`
* FILTER\_ACCEPTED\_TOPIC -- `publish_data(slot_req)`
* REJECT\_DATA\_TOPIC -- `drop_proposed_data(slot_req)`
* ADD\_DATA\_EVENT\_TOPIC -- `add_proposed_data(slot_req)`
* DATA\_EVENT\_CHANGE\_TOPIC -- `alter_proposed_data(slot_req)`
* DATA\_EVENT\_DROP\_TOPIC -- `drop_published_data(slot_req)`


**no parameters**:


----


#### serialize

> Calls on the time-element method of the same name.

**parameters**:

* req -- a request

----


#### deserialize

> Calls on the time-element method of the same name.

**parameters**:

* req -- a request

----


***Methods related to endpoint usage.***

#### app\_generate\_tracking

> if `_tracking` is not defined for the object this will be the ucwid with the server date appended: `<ucwid>-<date>`. 

**parameters**:

* req -- a request

----


#### app\_subscription\_handler

An override of a method from the original *ServeMessageEndpoint* from [message-relay-services](https://www.npmjs.com/package/message-relay-services).  

> This method takes pub/sub messages out of the publication channel, updates fields, and then sends them along to mini link servers. Calls the user action key file method for making changes to local databases that track the messages sent through the endpoint.

**parameters**: (topic,msg_obj)

* topic - the topic of the request that failed
* pub\_obj -- An object passing through publication.


----


#### app\_publication\_pre\_fan\_response

> For this class, the method just addresses date management and `_tracking`.

**parameters**: (topic,pub\_obj,ignore)

* topic -- the topic being subscribed to by some client
* pub\_obj -- An object passing through publication or being "set".
* ignore -- from the caller, the caller is not sending a message to connection associated with the `ignore` parameter.

----


#### put\_entries

> For this class, this method writes out all the entries (message passing through with some changes) stored in the memory. This method does not write files per entry.

**parameters**: (entries\_file,entries\_record)

* entries\_file -- the file that will stored the entries
* entries\_record -- the complete set of entries managed by instances of this class

----

#### put\_entries\_array

> The method takes the values of a map of entries, and then write the array to the file. 

**parameters**:(entries\_file,entries\_record)

* entries\_file -- the file that will stored the entries
* entries\_record -- the complete set of entries managed by instances of this class

----


#### slot\_from\_descr

> This method takes a slot from a list of slots born by a message. This mehtod turns the slot into a *EventDays.TimeSlot*. This method is used by *user\_action\_keyfile*. The nessage bearing the slot list would be a message coming from communication, publication or set or update. The message will be a JavaScript object, but it will reside in memory stores as a class instance within an agenda.

**parameters**:

* req -- a request

----


#### generate\_revised\_months

> Given a list of slots generated by slot\_from\_descr and a time interval (passed as two parameters), this generates the data structures that server to contain the messages arriving from clients. This is in some sense a structuring of the database of data entries.
> 
> All the slots that are sent in a list cut up days into sections over a span of months. 

**parameters**: (mo\_start,max\_end,t\_slots)

* mo\_start -- a timestamp that will occur in the first month of a list of months this method makes.
* max\_end -- the method makes months in a list up to the final included timestamp.
* t\_slots -- a list of slots that will be placed in the months 

----


#### user\_action\_keyfile

> This method either creates or deletes a structure of slots over a number of months forming a substrate of months that can hold timed entries.
> 
> The intention of this endpoint method implementation is to allow an administrator to command layout of the data store for timed data coming from clients.

**parameters**: (op,pub_obj)

* op -- 'C' for create, 'D' for delete
* pub\_obj -- a communication object normalized by methods on the publication pathways that will contain a list of slots froming or changing the structure of data containers for timed data.


----



***Methods for handling the timed requests***

#### get\_agenda\_of\_request

> Calls on the time-element method of the same name.

**parameters**:

* req -- a request

----


#### get\_publishable

> Calls on the time-element method of the same name. The time-element method should add any fields germaine to the application.

**parameters**:

* req -- a request

----


#### handle\_no\_date\_data

> Calls on the time-element method of the same name

**parameters**:

* req -- a request

----


#### handle\_inoperable

> Calls on the time-element method of the same name

**parameters**:

* req -- a request

----


#### ws\_publisher

> Calls on the time-element method of the same name to construct a message to send out to interested parties. Publishes the message on pub/sub paths to the subscribing clients. Sends the asset descriptor retrieved from the time element to mini link servers.
> 
> The data publishable object should contain fields indicating user identitity (ucwid), year and month at the very least.
> 
> The publishable will have been returned by get\_publishable(message), where message is the pub/sub message.

**parameters**:(publishable)

* publishable -- a data object that is passing through the pub/sub paths. 

----





## MonthManagement -- Class


### Methods

* **serialize**
* **deserialize**
* **get\_agenda\_of\_request**
* **get\_publishable**
* **ws\_publisher**
* **handle\_inoperable**
* **handle\_no\_date\_data**
* **deserialize\_month\_filler**
* **months\_from\_data**
* **get\_month\_of\_request**
* **add\_planned\_change**

### Methods -- details


#### async serialize(file\_path,storable)

Required of a `time_element` belonging to a **TimeManagedDataEndpoint** instances.

Use or override and call to super.

> Takes a path to a file that will hold the data. Before writing the object to the file, adds a field `all_months` to the object. The field `all_months` holds all the month objects created to hold data that has passed into the dominion of the instances of this class. 
> 
> Subclasses should call this method from the `super` class after adding their own data. As such:

```
	let storable = {}
	storable.my_data = this.gen_my_data() // or whatever the app requires
	await super.serialize(file_name,storable)
```

**parameters**:

* file\_path -- A path to a file that will hold the serialized data
* storable -- the object to be serialized -- will be read in by deserialize

----

#### async deserialize(file\_path)

Required of a `time_element` belonging to a **TimeManagedDataEndpoint** instances.

Use or override and call to super.

> Reads the data from the file. This method restores the `all_months` field. There are methods that help convert the month object into a class instance, and those methods can be overridden. 
> 
> Methods that override this class should use the restored object that this method returns in order to convert any other data from a storage format to one needed by the program.


```
	let restored = await super.deserialize(file_name)
	this.deserialize_more(restored) // or whatever the application uses
```

**parameters**:

* file\_path -- A path to a file that will hold the serialized data

----


#### get\_agenda\_of\_request(req)


Required of a `time_element` belonging to a **TimeManagedDataEndpoint** instances.


> This method is called by the **TimeManagedDataEndpoint** instances. This method returns an angenda of a data (or log of a day) indicated by the `start_time` provided by the request.

**parameters**:

* req -- a request

----


#### get\_publishable(req)

Required of a `time_element` belonging to a **TimeManagedDataEndpoint** instances.


> Returns the data that may be published by an endpoint. In most cases, this will be the month container, an *EventDays.MonthContainer*. However, the application may have its own object.
> 
> The default implementation calls *get\_month\_of\_request*.

**parameters**:

* req -- a request

----

#### ws\_publisher(publishable)

Required of a `time_element` belonging to a **TimeManagedDataEndpoint** instances.

> This method uses a publishable, a month container object in the default case, to create new message object containing the year, the month, and the start time of the data. This method of the default class returns a tripple containing the topic, the new message object and the month that was passed.
> 
> The returns tripple should be of this form `[topic,message,pub_content]`. The `pub_content` will be sent to a mini link server. It does not have to be the same as the value that was passed.

**parameters**:

* req -- a request

----

#### handle\_inoperable(topic,req)

Required of a `time_element` belonging to a **TimeManagedDataEndpoint** instances.

> When some filtering process rejects the use of the data, **TimeManagedDataEndpoint** instances call this method. The object being used as the `time_element` may use this call to mark data as undesirable, remove it or plan to use it at a later date. 

**parameters**:

* topic - the topic of the request that failed
* req -- a request

----

 
#### handle\_no\_date\_data(message)

Required of a `time_element` belonging to a **TimeManagedDataEndpoint** instances.

> If the mesage cannot be used to ascertain what time slot this message belongs, the **TimeManagedDataEndpoint** instances call this method. The object being used as the `time_element` may use this call in anyway the application defines the handling of out of band data. 

**parameters**:

* message -- a request

----


#### deserialize\_month\_filler(agenda,src\_agenda)

Override -- descendants must override this class.

> Performs application specific data internalization into fields of the application specific agenda instance, a instance of a descendat of **EventDays.TimeSlotAgenda**.

**parameters**:

* agenda -- an instance of a EventDays.TimeSlotAgenda descendant
* src\_agenda -- agenda data from deserialized storage

----


#### months\_from\_data(cls\_mo,agenda\_class)

> This method is used in initialization for deserialization. This method calls upon *deserialize\_month\_filler* to put existing data into a class instnace of the provided *agenda\_class*.

**parameters**:

* cls\_mo -- a month container made by instantiating a class
* agenda\_class -- an instance of EventDays.TimeSlotAgenda

----


#### get\_month\_of\_request(req)

> Finds the month container stored by this month manager and returns it for use by other methods. Uses the `start_time` of the request to find the month that contains it.

**parameters**:

* req -- a request

----


#### add\_planned\_change(req)

> This method is provided in the default class. Planned changes are for future updates, the kind that an event schedular requires. This method does not have to be implmented by descendant classes. However, applications that use future planning may use it if that works for them.

**parameters**:

* req -- a request

----



## SafeStorageAgendaInterface -- Class

Methods for handling the recording of data with connection list keepers or databases.  This class is a subclass of TimeSlotAgenda from the module [even-days](https://www.npmjs.com/package/event-days).

### Override this Class

This is an interface class. In JavaScript, this is a class that has a set of methods, all of which throw exceptions on call. Override this class to make a working application.

### Methods


* **add\_proposed\_data**
* **alter\_proposed\_data**
* **drop\_proposed\_data**
* **publish\_data**
* **drop\_ published\_data**


### Methods -- details

#### add\_proposed\_data

> Add a request to store data in some DB structure.
> 
> DB structed depends on the application impelementation

**parameters**:

* s\_req -- A time slot request object -- application dependent

----


#### alter\_proposed\_data

> Change data that is waiting to be stored in some DB structure.
> 
> DB structed depends on the application impelementation

**parameters**:

* s\_req -- A time slot request object -- application dependent

----


#### drop\_proposed\_data

> Delete data that is waiting to be stored in some DB structure. Consequently, it will not be stored.
> 
> DB structed depends on the application impelementation

**parameters**:

* s\_req -- A time slot request object -- application dependent

----


#### publish\_data

> Permit the storage of data and send it through to the application DB.  At the same time, publish the data for public consumption
> 
> DB structed depends on the application impelementation

**parameters**:

* s\_req -- A time slot request object -- application dependent

----


#### drop\_ published\_data

> Delete data that has already been published. Alert any search engines that the data is gone. Remove from the applicatiob database.
> 
> DB structed depends on the application impelementation

**parameters**:

* s\_req -- A time slot request object -- application dependent

----


