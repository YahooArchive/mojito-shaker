
========
Getting started
========

Prerequisites
###############

**System:** Unix-based system.
**Software:** Mojito  npm package v0.3.2 or higher.

Installation Steps
##################

#. Install ``npm``.

   ``$ curl http://npmjs.org/install.sh | sh``

   If npm fails to install, try running the above command with ``sudo``:

   ``$ curl http://npmjs.org/install.sh | sudo sh``

#. Go to your app directory
	
	``$ cd myApp``

#. Get Shaker from the npm registry and install it under your Mojito application so that it can be run from the command line.

   ``$ npm install shaker``

#. Confirm that Shaker has been installed by running unit tests.

   ``$ mojito shake``


Running Shaker
###############

#. From the ``myApp`` application directory, start Shaker and run Mojit:

   ``$ mojito shake --run``

#. Go to http://localhost:8666/ to see your application.

For a more in-depth tutorial, please see `Shaker: Example <shaker_example.html>`_. To learn more about Shaker, see 
the `Shaker Documentation <index.html>`_.