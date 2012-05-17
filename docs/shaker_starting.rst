
========
Getting started
========

Prerequisites
###############

Mojito npm package v0.3.2 or higher.

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

* Edit application.json to configure the mojitDirs and the HTMLFrame so that it looks like:

::

    [
        {
            "settings": [ "master" ],
            "mojitsDirs": ["mojits","node_modules/mojito-shaker/mojits"],
            "specs": {
                "htmlframe": {
                    "type": "ShakerHTMLFrame"
                }
            }
        }
    ]

Note: If you installed `mojito-shaker` globally you will have to point to the absolute path instead.

* Execute Shaker and Start the server:

    ``$ mojito-shake [--context "environment:{value}"] [--run]``

The option ``--run`` will make the server start automatically.

* Go to URL:
	``http://localhost:8666``

For a more in-depth tutorial, please see `Shaker: Example <shaker_example.html>`_. To learn more about Shaker, see the `Shaker Documentation <index.html>`_.
