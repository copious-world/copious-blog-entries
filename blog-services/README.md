# copious-endpoints

From the github repository for blog-entries.

This is a subdirectory and its own project.

Tools for entering bloggable content into directories and other stores for presentation by mini-link-server to blog interfaces.

See for example:

* [svelte-blogs](https://www.github.com/copious-world/svelte-blogs)
* [mini-link-servers](https://www.github.com/copious-world/mini_link_servers)

##### NOTE:

*All crypto keys in this repository are for examples only. Do not expect them to work on any data stored and retrievable by these tools.*


## blog-services .a.k.a copious-endpoints

This is a service node, running a tpc/ip service built on top of node.js. This service derives from [categorical-handlers](https://www.github.com/cooious-world/categorical-handlers), which is a specialization of the endpoint class from the [message-relay-services](https://www.github.com/cooious-world/message-relay-services) package.

This implements two types of **end-points**. One is a *user management node*, providing CRUD for user entries. The other is a *persistence managment node*, which keeps a records of links provding access to blogs services. The persistence service does not serve media. The persistence service writes entries to directories that may bve accessed by [mini-link-servers](https://www.github.com/copious-world/mini_link_servers) for example.

The entries these applications make are the JSON objects containing the link and other meta data about the links. User records retain some information about users, such as a human readable name.

The NW app will actually load files into IPFS. But, the blog services will only accept persistence record entries with IPFS CIDs in fields. The blog services may make sure the content identified by a CIDs are available for presentation by blog interfaces.




