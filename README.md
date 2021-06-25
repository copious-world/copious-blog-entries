# copious-blog-entries
Tools for entering bloggable content into directories and other stores for presentation by mini-link-server to blog interfaces.

See for example:

* [svelte-blogs](https://www.github.com/copious-world/svelte-blogs)
* [mini-link-servers](https://www.github.com/copious-world/mini_link_servers)

##### NOTE:

*All crypto keys in this repository are for examples only. Do not expect them to work on any data stored and retrievable by these tools.*


# Sub Projects

This repository contains a few subprojects. They preform similar functions. One does its work as a backend service. The other does its work as an Electron App.

## copious-ipfs-electron

Electron provides a desktop packaging of web and node.js.

This project makes use of Electron to allow the basic operations of submititng prepared files to the storage services used by copious-blog projects (the first in use is [svelte-blogs](https://www.github.com/copious-world/svelte-blogs).

This is a very simple application with just one page for entering data. It includes controls for uploading media files, poster images, etc. Blog entries may also be stored.

The app optionally stores media in IPFS and will encrypt data before storage.


## blog-services

This is a service node, running a tpc/ip service built on top of node.js. This service makes use of [message-relay-services](https://www.github.com/message-relay-services). The specialization of the classes provided by the message-relay-services module is that of an end-point.

This implements two types of end-points. One is a user entry management node. The other is a persistence managment node, which makes a record of links for access by the blogs. This service does not serve media. All this service does is write entries to directories that may bve accessed by [mini-link-servers](https://www.github.com/copious-world/mini_link_servers).

The entries these applications make are the JSON objects containing the link and other meta data about the links.

The electron app will actually load files into IPFS. But, the blog serivces will only accept IPFS entries and make sure the are available for prentation by blog interfaces.



