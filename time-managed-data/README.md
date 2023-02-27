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



## Configuring



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


## TimeManagedDataEndpoint -- Class


## MonthManagement -- Class


## SafeStorageAgendaInterface -- Class

Methods for handling the recording of data with connection list keepers or databases.  This class is a subclass of TimeSlotAgenda from the module [even-days](https://www.npmjs.com/package/event-days).

### Override this Class

This is an interface class. In JavaScript, this is a class that has a set of methods, all of which throw exceptions on call. Override this class to make a working application.

### Methods



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


