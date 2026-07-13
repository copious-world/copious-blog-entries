# copious-blog-entries
Tools for entering bloggable content into directories and other stores for presentation by mini-link-server to blog interfaces.

See for example:

* [svelte-blogs](https://www.github.com/copious-world/svelte-blogs)
* [mini-link-servers](https://www.github.com/copious-world/mini_link_servers)

##### NOTE:

*All crypto keys in this repository are for examples only. Do not expect them to work on any data stored and retrievable by these tools.*


# Sub Projects

This repository contains a few subprojects. They preform similar functions. One does its work as a backend service. The other does its work as an Electron App.

## NW-app

NW provides a desktop packaging of web and node.js javascript code.

This project makes use of NW to allow the basic operations of submititng prepared files to the storage services used by copious-blog projects (the first in use is [svelte-blogs](https://www.github.com/copious-world/svelte-blogs).

This is a very simple application with just one page for entering data. It includes controls for uploading media files, poster images, etc. Blog entries may also be stored.

The app optionally stores media in IPFS and will encrypt data before storage.


## blog-services

This is a service node, running a tpc/ip service built on top of node.js. This service derives from [categorical-handlers](https://www.github.com/cooious-world/categorical-handlers), which is a specialization of the endpoint class from the [message-relay-services](https://www.github.com/cooious-world/message-relay-services) package.


This implements two types of **end-points**. One is a *user management node*, providing CRUD for user entriess. The other is a *persistence managment node*, which keeps a records of links provding access to blogs services. The persistence service does not serve media. The persistence service writes entries to directories that may bve accessed by [mini-link-servers](https://www.github.com/copious-world/mini_link_servers) for example.

The entries these applications make are the JSON objects containing the link and other meta data about the links. User records retain some information about users, such as a human readable name.

The NW app will actually load files into IPFS. But, the blog services will only accept persistence record entries with IPFS CIDs in fields. The blog services may make sure the content identified by a CIDs are available for presentation by blog interfaces.



