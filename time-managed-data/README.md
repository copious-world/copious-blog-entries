# time managed data 

This module provide classes that address the creation of a complex of endpoint servers that work together to move data through Web Sockets types of interfaces to clients, admins, and logging databases.

## Purpose

This module began with some classes for managing scheduling future events. It can also be used in conjunction with message logging, time stamped message history, chats, etc. That is, it also works with the past and its record of events passing through channels established by application servers utilitizing these classes.


## Installation

```
npm install -s time-managed-data
```


## Usage



## Configuring



## Classes

## TimeManagedData 

## TimeManagedDataEndpoint



## SafeStorageAgendaInterface

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


