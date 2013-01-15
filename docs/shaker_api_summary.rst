
========================
Shaker configuration API
========================

Shaker configuration files
==========================

In order to define the Shaker configuration, you can either do it directly into ``application.json`` or create a separate file called ``shaker.json``
For simplicity we recommend you to use application.json. If both exists, Shaker will merge them with priority on ``application.json``


Environment and dimension configuration
=========================================

In mojito, most of the json configuration files use ``ycb`` (Yahoo! Configuration Bundle https://github.com/yahoo/ycb), which means that your config will get merged depending on the the context you are in and in the order you set in your dimension.json (for more information look into the mojito documentation http://developer.yahoo.com/cocktails/mojito/docs/topics/mojito_using_contexts.html)

::

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
	   	"settings": ["environement: my-syntethic-env"],
	   	"shaker":{
	   		//other config
	   	}
	]

As we mention on the Usage section shaker and mojito will pick the configuration you pass in throught the context:

**Example:** ``mojito shake --context "environment:dev"`` Will merge the config of "settings: master" with "settings: environment:dev"


API Table
==========

Shaker configuration
------------------------

+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| Property                  | Data Type     | Required?     | Default Value       | Possible Values                   | Description                                    | 
+===========================+===============+===============+=====================+===================================+================================================+
| ``task``                  | string        | no            | raw                 | raw, local, s3, mobstor, your own | Defines how the rollups will be deployed       |
|                           |               |               |                     | See :ref:`Env and context         |                                                | 
|                           |               |               |                     | configuration <env-context>`.     |                                                |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``module``                | string        | no            | null                | N/A                               | Defines how the rollups will be deployed       |
|                           |               |               |                     |                                   |                                                | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``taskConfig``            | object        | no            | null                | See:                              | Defines how the rollups will be deployed       |
|                           |               |               |                     | :ref:`taskConfig<taskCfg>`.       |                                                | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``minify``                | boolean       | no            | true                | N/A                               | Specifies whether to minify the rollups or not |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``jslint``                | boolean       | no            | true                | N/A                               | Specifies whether to jslint the rollups or not |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``regexp``                | string        | yes, if       | null                | Regular expression to match       | Defines a regular expression to match in the   |
|                           |               | replace       |                     |                                   | rollups                                        |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``replace``               | string        | no            | null                | String to replace with            | Defines a string which be replaced when the    |
|                           |               |               |                     |                                   | regexp matches                                 |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``comboCDN``              | boolean       | no            | false               | N/A                               | Specifies to push all the application resources|
|                           |               |               |                     |                                   | to CDN. (YUI and taskConfiguration needed)     |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``optimizeBootstrap``     | boolean       | no            | false               | N/A                               | Creates a optimized way to load all bootstrap  |
|                           |               |               |                     |                                   | JS files on parallel and without blocking      |
|                           |               |               |                     |                                   | the rendering of the page.                     |
|                           |               |               |                     |                                   | See: :ref:`usage section<foo>`.                |   
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``rollupConfig``          | object        | no            | null                | See:                              | Specifies which resources to rollup for each   |
|                           |               |               |                     | :ref:`rollupConfig<rollupCfg>`.   | mojit (views, langs, controller, ...)          |
|                           |               |               |                     |                                   |                                                |
|                           |               |               |                     |                                   |                                                |   
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``routeBundle``           | object        | no            | null                | See:                              | Specifies which mojits to bundle together for  |
|                           |               |               |                     |  :ref:`routeBudnel<routeBndl>`.   | each entry point defined in our application.   |
|                           |               |               |                     |                                   |                                                |
|                           |               |               |                     |                                   |                                                |   
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``appBundle``             | boolean       | no            | false               | N/A                               | Bundle all resources of our application        |
|                           |               |               |                     |                                   | together.                                      |
|                           |               |               |                     |                                   |                                                |
|                           |               |               |                     |                                   |                                                |   
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``filterInCore``          | array         | no            | null                | Mojito core modules               | Filters which mojito core modules we don't     |
|                           |               |               |                     |                                   | want to ship in the core bundle.               |
|                           |               |               |                     |                                   |                                                |
|                           |               |               |                     |                                   |                                                |   
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+



Object taskConfig
------------------------

Allows you to configure your task in case you create your own task, or you are using some third party module to push to any given CDN.

+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| Property                  | Data Type     | Required?     | Default Value       | Possible Values                   | Description                                    | 
+===========================+===============+===============+=====================+===================================+================================================+
| ``prefix``                | string        | no            | null                | raw, local, s3, mobstor, your own | Defines how the rollups will be deployed       |
|                           |               |               |                     | See :ref:`Env and context         |                                                | 
|                           |               |               |                     | configuration <env-context>`.     |                                                |
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``<taskName>``            | object        | no            | null                | N/A                               | Defines the configuration properties for a     |
|                           |               |               |                     |                                   | given task (for more info check the faq.       | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+


Object rollupConfig
------------------------

You can define which parts you want to rollup for each mojit. If your app is totally offline, you may want to rollup all the components. If you just want to have the minimum shipped to the client the default bundleBinders is the right choice.

+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| Property                  | Data Type     | Required?     | Default Value       | Possible Values                   | Description                                    | 
+===========================+===============+===============+=====================+===================================+================================================+
| ``bundleBinders``         | boolean       | no            | true                | N/A                               | Include binders and it's dependencies in the   |
|                           |               |               |                     |                                   | rollups                                        | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``bundleViews``           | boolean       | no            | false               | N/A                               | Include and compile (as a JS module) views in  |
|                           |               |               |                     |                                   | the rollups                                    | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``bundleController``      | boolean       | no            | false               | See:                              | Include controller and it's dependencies  and  |
|                           |               |               |                     | :ref:`taskConfig<taskCfg>`.       | the proper langs in the rollups.               | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+
| ``bundleAll``             | boolean       | no            | false               | See:                              | Bundle all possible resources for each mojit   |
|                           |               |               |                     | :ref:`taskConfig<taskCfg>`.       |                                                | 
+---------------------------+---------------+---------------+---------------------+-----------------------------------+------------------------------------------------+


Object routeBundle
------------------------

Route bundle allow you to precompute and rollup high coverage mojits (see section :ref:`Bundle Mojits <bundle-mojits>` for detailed information) so you can optimize your startup time.
The keys of the object correspont to **routes** you define in ``routes.json`` and the **values** are arrays of Mojits and its actions to bundle together. If you don't provide an action, index will be taken as default.


::

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




