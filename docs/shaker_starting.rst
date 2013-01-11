
========
Getting started
========

Prerequisites
###############

Mojito npm package v0.3.2 or higher. (See compatibility table below.)

Installation Steps
##################

#. Install ``npm``.

   ``$ curl http://npmjs.org/install.sh | sh``

   If npm fails to install, try running the above command with ``sudo``:

   ``$ curl http://npmjs.org/install.sh | sudo sh``

#. Go to your app directory

   ``$ cd myApp``

#. Get Shaker from the npm registry and install it under your Mojito application (or globally using ``-g`` option) so that it can be run from the command line.

   ``$ npm install mojito-shaker [-g]``

#. Confirm that Shaker has been installed correctly by running the shaker command:

   ``$ mojito-shake``

#. If you got some error, check if you have correctly configured the `Node environment <http://nodejs.org/api/modules.html#modules>`_. You can try to set the right $NODE_PATH to the modules using:

	``$ export NODE_PATH=:$NODE_PATH:\`npm root -g\```


Running Shaker
###############

Within a Mojito application root folder:

* Edit application.json to configure and use the ShakerHTMLFrame. It looks like:

::

    [
        {
            "settings": [ "master" ],
            "specs": {
                "htmlframe": {
                    "type": "ShakerHTMLFrame"
                }
            }
        }
    ]


* Execute Shaker and Start the server:

    ``$ mojito-shake [--context "environment:{value}"] [--run]``

The option ``--run`` will make the server start automatically.

* Go to URL:
	``http://localhost:8666``

For a more in-depth tutorial, please see `Shaker: Example <shaker_example.html>`_. To learn more about Shaker, see the `Shaker Documentation <index.html>`_.

Compatibility Table
###################

Since mojito 3.x.x, many api's have changed, a lot of new features were introduced, etc. Which means that shaker had to adapt to this evolution as well. That's why you may encounter some incompatibilities depending the version of Mojito you're using.

**Note:** This documentation is updated and ment to be used with ``Shaker 3`` and ``Mojito 0.5.x``.

Nontherless here a table where you can find the most stable version of ``Shaker`` for each mojito mayor version:


+-----------------+---------------------------------+
| Mojito version  | Shaker most stable version      |
+=================+=================================+
| 0.3.x           | 0.8.x                           |
+-----------------+---------------------------------+
| 0.4.x           | 2.0.32                          |
+-----------------+---------------------------------+
| 0.5.x           | 3.0.x                           |
+-----------------+---------------------------------+


