========================
Shaker Configuration API
========================

.. _shaker_config-files:

Shaker Configuration Files
==========================

You configure Shaker in the ``application.json`` file or create a separate file 
called ``shaker.json``. For simplicity, we recommend using ``application.json``. 
If both exist, Shaker will merge the configurations of both files, giving precedence
to configurations in ``application.json``.

.. _shaker_config-env_dimension:

Environment and Dimension Configuration
=======================================

In Mojito, most of the JSON configuration files use 
`Yahoo! Configuration Bundle (YCB) <https://github.com/yahoo/ycb>`_, meaning your 
configurations get merged based on the context being used and the order 
of the contexts set in your ``dimension.json`` file. For more information, see 
`Using Context Configurations <http://developer.yahoo.com/cocktails/mojito/docs/topics/mojito_using_contexts.html>`_
in the `Mojito documentation <http://developer.yahoo.com/cocktails/mojito/docs/>`_.

.. code-block:: javascript

	[
	   {
	       "settings": [ "master" ],
	       "shaker": {
	       	//shaker default config
	       }
	   },
	   {
	       "settings": [ "environment:dev" ],
	       "shaker": {
	       		//shaker config for dev
	       }
	   },
	   	"settings": ["environment: my-syntethic-env"],
	   	"shaker":{
	   		//other config
	   	}
	]

As we mention in the `Usage chapter <shaker_usage.html>`_, Shaker and Mojito will choose 
the configuration set for a particular context. For example, the following command will 
merge the configurations of ``"settings: master"`` and ``"settings: environment:dev"``:

``$ mojito shake --context "environment:dev"``

.. _shaker_config-api:

API Table
=========

.. _api_table-shaker_config:

Shaker Configuration
--------------------

+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| Property                  | Data Type     | Required?     | Default Value       | Possible Values                                | Description                                    | 
+===========================+===============+===============+=====================+================================================+================================================+
| ``task``                  | string        | no            | raw                 | raw, local, s3, mobstor, your own              | Defines how the rollups will be deployed.      |
|                           |               |               |                     | See :ref:`Env and Context                      |                                                | 
|                           |               |               |                     | Configuration <env-context>`.                  |                                                |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``module``                | string        | no            | null                | N/A                                            | Defines how the rollups will be deployed.      |
|                           |               |               |                     |                                                |                                                | 
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``taskConfig``            | object        | no            | null                | See:                                           | Defines how the rollups will be deployed.      |
|                           |               |               |                     | :ref:`Object taskConfig <obj_taskCfg>`.        |                                                | 
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``minify``                | boolean/Object| no            | true                | See:                                           | Specifies whether to minify the rollups.       |
|                           |               |               |                     | :ref:`Object minifyConfig <obj_minifyCfg>`.    |                                                |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``jslint``                | boolean       | no            | true                | N/A                                            | Specifies whether to jslint the rollups.       |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``regexp``                | string        | yes, if       | null                | Regular expression to match                    | Defines a regular expression to match in the   |
|                           |               | replaced      |                     |                                                | rollups.                                       |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``replace``               | string        | no            | null                | Replacement string                             | Defines the string that replaces what is       |
|                           |               |               |                     |                                                | matched by the regular expression.             |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``comboCDN``              | boolean       | no            | false               | N/A                                            | Specifies to push all the application          |
|                           |               |               |                     |                                                | resources to CDN.                              |    
|                           |               |               |                     |                                                | YUI and ``taskConfig`` are needed.             |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``optimizeBootstrap``     | boolean       | no            | false               | N/A                                            | Creates a optimized way to load all bootstrap  |
|                           |               |               |                     |                                                | JS files in parallel without blocking          |
|                           |               |               |                     |                                                | the rendering of the page.  See                |
|                           |               |               |                     |                                                |  `Usage <shaker_usage.html>`_ for more info.   |   
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``rollupConfig``          | object        | no            | null                | See                                            | Specifies which resources to rollup for each   |
|                           |               |               |                     | :ref:`Object rollupConfig <obj_rollupConfig>`. | mojit (views, langs, controller, ...).         |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``routeBundle``           | object        | no            | null                | See                                            | Specifies which mojits to bundle together for  |
|                           |               |               |                     | :ref:`Object routeBundle <obj_routeBundle>`.   | each entry point defined in our application.   |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``appBundle``             | boolean       | no            | false               | N/A                                            | Bundles all the resources of our application.  |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+
| ``filterInCore``          | array         | no            | null                | Mojito core modules                            | Filters the specified Mojito core modules      |
|                           |               |               |                     |                                                | from being included in the core bundle.        |
+---------------------------+---------------+---------------+---------------------+------------------------------------------------+------------------------------------------------+

.. _obj_taskConfig:

Object taskConfig
-----------------

Allows you to configure your task in case you create your own task or are using some 
third-party module to push to a CDN.

+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| Property                  | Data Type     | Required?     | Default Value       | Possible Values                   | Description                                    | 
+===========================+===============+===============+=====================+===================================+================================================+
| ``prefix``                | string        | no            | null                | raw, local, s3, mobstor, your own | Defines how the rollups will be deployed.      |
|                           |               |               |                     | See :ref:`Env and Context         |                                                | 
|                           |               |               |                     | Configuration <env-context>`.     |                                                |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``<taskName>``            | object        | no            | null                | N/A                               | Defines the configuration properties for a     |
|                           |               |               |                     |                                   | given task (for more info check the FAQ).      | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+

.. _obj_minifyConfig:

Object minifyConfig
-------------------

Further JS/CSS minify options.

+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| Property                  | Data Type     | Required?     | Default Value       | Possible Values                   | Description                                    | 
+===========================+===============+===============+=====================+===================================+================================================+
| ``js``                    | object        | no            | null                | See :ref:`Object jsminifyConfig   | Defines JS minify options.                     |
|                           |               |               |                     | <obj_jsminifyCfg>`.               |                                                | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``css``                   | object        | no            | null                | N/A                               | Defines CSS minify options. Currently not      |
|                           |               |               |                     |                                   | supported.                                     | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+

.. _obj_jsminifyConfig:

Object jsminifyConfig
-------------------

+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| Property                  | Data Type     | Required?     | Default Value       | Possible Values                   | Description                                    | 
+===========================+===============+===============+=====================+===================================+================================================+
| ``mangle``                | boolean       | no            | false               | N/A                               | Whether mangle variable names.                 |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``squeeze``               | boolean       | no            | false               | N/A                               | Does various optimizations that result in      |
|                           |               |               |                     |                                   | smaller, less readable code.                   | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+

.. _obj_rollupConfig:

Object rollupConfig
-------------------

You can define which parts you want to rollup for each mojit. If your application is  
offline, you may want to rollup all the components. If you just want to have the minimum 
shipped to the client, use the default for ``bundleBinders``.

+---------------------------+---------------+---------------+---------------------+--------------------------------------------+------------------------------------------------+
| Property                  | Data Type     | Required?     | Default Value       | Possible Values                            | Description                                    | 
+===========================+===============+===============+=====================+============================================+================================================+
| ``bundleBinders``         | boolean       | no            | true                | N/A                                        | Includes binders and their dependencies in     |
|                           |               |               |                     |                                            | the rollups.                                   | 
+---------------------------+---------------+---------------+---------------------+--------------------------------------------+------------------------------------------------+
| ``bundleViews``           | boolean       | no            | false               | N/A                                        | Includes and compile (as a JS module) views    |
|                           |               |               |                     |                                            | in the rollups.                                | 
+---------------------------+---------------+---------------+---------------------+--------------------------------------------+------------------------------------------------+
| ``bundleController``      | boolean       | no            | false               | See                                        | Includes controller and its dependencies and   |
|                           |               |               |                     | :ref:`Object taskConfig <obj_taskConfig>`. | the proper languages in the rollups.           | 
+---------------------------+---------------+---------------+---------------------+--------------------------------------------+------------------------------------------------+
| ``bundleAll``             | boolean       | no            | false               | See                                        | Bundles all possible resources for each mojit. |
|                           |               |               |                     | :ref:`Object taskConfig <obj_taskConfig>`. |                                                | 
+---------------------------+---------------+---------------+---------------------+--------------------------------------------+------------------------------------------------+

.. _obj_routeBundle:

Object routeBundle
------------------

Route bundle allow you to precompute and rollup high-coverage mojits (see 
:ref:`Bundle Mojits <bundle-mojits>` for detailed information), so you can optimize your 
startup time. The keys of the object correspont to **routes** you define in ``routes.json``, 
and the **values** are arrays of mojits and their actions to bundle together. The default
action is ``index``.

The example ``shaker`` configuration below maps routes to mojit actions with
``routeBundle``:

.. code-block:: javascript

	 "shaker": {
		 "routeBundle": {
			 "myRoute1": [
				 Mojit1.index,
				 Mojit2.index,
				 Mojit3.otherAction
			 ],
			 "myRoute2": [
				 //mojit and action list
			 ]
		 }
	 }




