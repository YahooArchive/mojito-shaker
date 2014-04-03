===============
Getting Started
===============

.. _gs-prereqs:

Prerequisites
#############

- `Node.js (>= 0.6.0) <http://nodejs.org/>`_, `npm (> 1.0.0) <https://npmjs.org/>`_
- `Mojito >=v0.5.x <https://npmjs.org/package/mojito>`_

.. note:: To use Shaker with other versions of Mojito,
          see :ref:`Compatibility Table <gs-compatibility>`.

.. _gs-install:

Installation Steps
##################

#. Go to your Mojito application directory:

   ``$ cd myApp``

#. Get Shaker from the npm registry and install it under your Mojito application
   (or globally using ``-g`` option) so that it can be run from the command line.

   ``$ npm install mojito-shaker [-g]``

#. Confirm that Shaker has been installed correctly by running the ``shaker`` command:

   ``$ mojito-shake``

#. If you get an error, check if you have correctly configured the
   `Node environment <http://nodejs.org/api/modules.html#modules>`_. Also, try setting the
   right ``$NODE_PATH`` to the modules using the following:

   ``$ export NODE_PATH=:$NODE_PATH:\`npm root -g\```

.. _gs-running:

Running Shaker
##############

Within a Mojito application root folder:

#. Edit the ``application.json`` file to configure and use the ``ShakerHTMLFrameMojit``.
   It should look like the following:

   .. code-block:: javascript

      [
        {
          "settings": [ "master" ],
          "specs": {
            "htmlframe": {
              "type": "ShakerHTMLFrameMojit"
            }
          }
        }
      ]


#. Execute the Shaker compiler and start the application:

   ``$ mojito-shake [--context "{key1}:{value1}[,{key2}:{value2}]"] [--run]``

   The option ``--run`` will make the application start automatically.

#. Go to following URL: http://localhost:8666

.. _gs-when:

When to Run Shaker Compiler
###########################

The Shaker compiler does not need to be ran every time the application starts. If the "locations" option is not being used, then
the compiler only needs to be ran if an asset is renamed or added after an intial compilation. If the "locations" option is used, then the compiler must be
ran whenever there is a change in a resource that is stored in a location, otherwise the stored resource would be out of date (note that resources with server affinity are never processed by Shaker).
Also, changing a runtime setting, does not require re-compilation unless a serve location, that was not used during compilation, is specified.


.. _gs-compatibility:

Compatibility Table
###################

Since Mojito 3.x.x, many API's have changed, and a lot of new features were introduced,
so Shaker has had to adapt to be compatible with Mojito. Thus, you may
encounter some incompatibilities depending upon the version of Mojito you're using.


To avoid compatibility issues, refer to the table below to use the most stable
version of ``Shaker`` for each Mojito minor version:


+-----------------+---------------------------------+
| Mojito Version  | Shaker Most Stable Version      |
+=================+=================================+
| 0.3.x           | 0.8.x                           |
+-----------------+---------------------------------+
| 0.4.x           | 2.0.32                          |
+-----------------+---------------------------------+
| 0.5.x           | 4.0.x                           |
+-----------------+---------------------------------+


