
========
Usage
========
The Shaker recipe is one part convention and one part configuration. The convention lies in the structure of a mojit or application's assets directory. The configuration lies in a mojit or application's shaker.json file, which defines rollups and their contents.


Context Dimensions
###############
Before going any further, it's important to understand the core concept of Shaker rollups: context dimensions.

Context dimensions are the basic building blocks of Shaker rollups. Shaker supports the following dimensions by default:

- ``common`` - Resources not specific to any dimension.
- ``action`` - Action-specific resources (it matches the controller action).
- ``device`` - Device-specific resources.
- ``skin`` - Skin-specific resources.
- ``region`` - Region-specific resources.
- ``lang`` -Language-specific resources.

The default dimensions are listed here in ascending priority order. This means that a dimension that appears later in the list is capable of augmenting previous dimensions. 
In order to create new dimensions, you will have to define your own dimensions.json, and in runtime set those dimensions to some value since are not built in Mojito.
See section about Advanced Configuration.

It's also possible to create custom dimensions. To do that you will need to create your own dimensions.json. You can find more details 
in the Mojito Docs. (ToDo: Link)

Also, check the section on the Custom Dimensions for more info in how to integrate them with Shaker.
(ToDo:Link)


Convention: Assets Directory Structure.
##########

Shaker prefers a mojit or application's assets directory be structured according to the context dimensions it is sensitive to. A directory structure that follows these conventions is called conforming. A directory structure that does not follow these conventions is called non-conforming. 

A conforming directory structure is quite simple to configure (basically doesn't need any configuration at all). A non-conforming directory structure is also supported, but requires a bit more effort to configure. See the section on Advanced Configuration (TODO) for more information. 

**Example:** The basic assets directory structure of a conforming mojit. 
::


	[mojit]
	   /assets/
	      [dimension]/
	         [value]/
	            [file]
	            ...
	         ...
	      ...

**Example:** The assets directory structure of a conforming mojit, FooMojit, that is sensitive to the common and region dimensions. 
::

   FooMojit/
      assets/
         common/
            foo-common.css
         region/
            US/
               foo-US.css
            CA/
               foo-CA.css


In the the above example, FooMojit has common CSS regardless of the value of any other dimension. In addition, it has additional CSS when the region dimension value is *US* or *CA*.

**Example** of shaker configuration based on the previous folder structure:

::

	{
	  "dimensions": {
	    "common": {},
	    "region": {
	      "US": {},
	      "CA": {}
	    },
	    "lang": {
	      "en": {}
	    }
	  }
	}

The following table illustrates the contents of rollups for FooMojit for various values of the region dimension. 



+-----------------+-------------------------+
| Region Value    | Data Type               |
+=================+=========================+
| ``none``        | - common/foo-common.css |               
+-----------------+-------------------------+
| ``US``          | - common/foo-common.css |
|                 | - region/US/foo-US.css  |               
+-----------------+-------------------------+
| ``CA``          | - common/foo-common.css | 
|                 | - region/CA/foo-CA.css  | 
+-----------------+-------------------------+

In the above example, the dimensions region and en map directly to a conforming assets directory structure.

Because each dimension is declared with the empty object ({}), when Shaker generates a rollup from this configuration it will include all assets found within the corresponding directories (and subdirectories).

For more control over what gets included in a rollup, see the Advanced Configuration section.

Actions/binders
##########

The actions section tells Shaker which controller actions (binders) the mojit or application is sensitive to. 
Shaker will also anaylize which dimensions are sensible to you mojits and actions to generate at some point the rollups.

Actions at mojit level
----------------------
This is the representation fo the default shaker configuration at mojit level:

::

	{
		"actions": {
		    "*": {},
	    },
	    "order": "common-action-device-skin-region-lang"
	}

If you have any binder in your mojit, shaker will analize it for you, creating some structure like this:

**Example**: A mojit sensitive to the index and show controller actions (binders). 

::

	{
		"actions": {
			"*": {},
			"binderActionName1": {},
			"binderActionName2": {}
		},
		"order": "common-action-device-skin-region-lang"
	}

**Note that you don't have to write any configuration for any case if you uses the default folder structure.


Actions at app level
---------------------

The configuration at app level is exactly the same as the Mojit level one, with only one difference: You can specify which mojits you want to bundle per action.
Bundling a mojit means that the assets of this mojits will be included within the app rollup, avoiding to request any rollup for that mojit.

**Example**: App shaker configuration bundling different mojits per action:
::

	{
		"actions": {
			"*": {
				"mojits":["mojitA","mojitB"]
			},
			"appAction": {
				"mojits":["mojitA",",mojitB.index","mojitC"]
			},
			"appAction2": {
				"mojits":["mojitD","mojitE"]

			}
		},
		"order": "common-action-device-skin-region-lang"
	}


Environment Configuration
#########################

Shaker allows you to rollups your assets in many different ways, regarding the  deploying environment context.
In order to do that you wil have to include some configuration in the *application.json*

**Example:** An example of application.json configuration for several environments:

::

	[{
	    "settings": ["master"],
	    "//": default environment
	    "//": by default shaker will run in dev mode
	{
	    "settings": ["environment:test"],

	    "shaker": {
	        "type": "local",
	        "config": {
	            "root": "assets/compiled"
	        }
	    }
	},
	{
	    "settings": ["environment:prod"],

	    "shaker": {
	        "type": "mobstor",
	        "config": {
	            "root": "assets/compiled",
	            "client": {
	                "host": "playground.yahoofs.com",
	                "proxy": {
	                    "host": "yca-proxy.corp.yahoo.com",
	                    "port": 3128
	                }
	            }
	        }
	    }
	},
	{
	    "settings": ["environment:stage"],

	    "shaker": {
	        "type": "s3",
	        "config": {
	            "root": "rootFolder",
	            "client": {
	                "key": "YOUROWNKEY",
	                "secret": "yoursecret",
	                "bucket": "your bucket"
	            }
	        }
	    }
	}
	]

In order to run one of another you will have to run Shaker passing the context you want. Example: `` mojito shake --context "environment:prod``

As we saw in the Components section, we have different deployment tasks. Next we will see their API's and some examples.

Deploying raw (no rollups, developer mode) 
------------------------------------------

Deploying localy (rollups, developer mode) 
------------------------------------------

Deploying to Mobstor (Yahoo's! CDN) 
------------------------------------------

Deploying to  S2 (Amazon CDN) 
------------------------------------------


Advanced Configuration
#########################

Include/Exclude/Replace
-----------------------
If the default directory-based rollup behavior is not desirable, or, if the assets directory is non-conforming, it's still possible to configure rollups using the include, exclude and replace settings.

- ``include`` - Include one or more paths or files. (Useful for mojit- and application-level configuration.) 
- ``exclude`` - Exclude one or more paths or files. (Useful for application-level configuration.) 
- ``replace`` - Replace one or more paths or files with new paths or files. (Useful for application-level configuration.) 


Augmenting Dimensions
---------------------



