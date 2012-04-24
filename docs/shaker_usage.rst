
========
Usage
========
<<<<<<< HEAD
The Shaker recipe is one part convention and one part configuration. The convention lies in the structure of a mojit or application's ``assets`` directory. The configuration lies in a mojit or application's ``shaker.json`` file, which defines rollups and their contents.
=======
The Shaker recipe is one part convention and one part configuration. The convention lies in the structure of a mojit or application's assets directory. The configuration lies in a mojit or application's shaker.json file, which defines rollups and their contents.
>>>>>>> Restructured shaker in preparation for open sourcing


Context Dimensions
###############
<<<<<<< HEAD
Before going any further, it is important to understand the core concept of Shaker rollups: context dimensions.
=======
Before going any further, it's important to understand the core concept of Shaker rollups: context dimensions.
>>>>>>> Restructured shaker in preparation for open sourcing

Context dimensions are the basic building blocks of Shaker rollups. Shaker supports the following dimensions by default:

- ``common`` - Resources not specific to any dimension.
- ``action`` - Action-specific resources (it matches the controller action).
- ``device`` - Device-specific resources.
- ``skin`` - Skin-specific resources.
- ``region`` - Region-specific resources.
<<<<<<< HEAD
- ``lang`` - Language-specific resources.

The default dimensions are listed here in ascending priority order. This means that a dimension that appears later in the list is capable of augmenting previous dimensions. In order to create new dimensions, you will have to define your own ``dimensions.json`` file, and at runtime set those dimensions to some value since they are not built into Mojito. See the section about Advanced Configuration.
=======
- ``lang`` -Language-specific resources.

The default dimensions are listed here in ascending priority order. This means that a dimension that appears later in the list is capable of augmenting previous dimensions. 
In order to create new dimensions, you will have to define your own dimensions.json, and in runtime set those dimensions to some value since are not built in Mojito.
See section about Advanced Configuration.

It's also possible to create custom dimensions. To do that you will need to create your own dimensions.json. You can find more details 
in the Mojito Docs. (ToDo: Link)

Also, check the section on the Custom Dimensions for more info in how to integrate them with Shaker.
(ToDo:Link)

>>>>>>> Restructured shaker in preparation for open sourcing

Convention: Assets Directory Structure.
##########

<<<<<<< HEAD
Shaker prefers a mojit or application's ``assets`` directory be structured according to the context dimensions it is sensitive to. A directory structure that follows these conventions is called conforming. A directory structure that does not follow these conventions is called non-conforming.

A conforming directory structure is quite simple to configure (basically, it does not need any configuration at all). A non-conforming directory structure is also supported, but requires a bit more effort to configure. See the section on Advanced Configuration for more information.

**Example:** The basic ``assets`` directory structure of a conforming mojit.
::


    [mojit]
       /assets/
          [dimension]/
             [value]/
                [file]
                ...
             ...
          ...

**Example:** The ``assets`` directory structure of a conforming mojit, ``FooMojit``, that is sensitive to the ``common`` and ``region`` dimensions.
=======
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
>>>>>>> Restructured shaker in preparation for open sourcing
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


<<<<<<< HEAD
In the the above example, ``FooMojit`` has ``common`` CSS regardless of the value of any other dimension. In addition, it has additional CSS when the ``region`` dimension value is *US* or *CA*.
=======
In the the above example, FooMojit has common CSS regardless of the value of any other dimension. In addition, it has additional CSS when the region dimension value is *US* or *CA*.
>>>>>>> Restructured shaker in preparation for open sourcing

**Example** of shaker configuration based on the previous folder structure:

::

<<<<<<< HEAD
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

The following table illustrates the content of the rollups for ``FooMojit`` for various values of the ``region`` dimension.



+-----------------+------------------------------+
| Region Value    | Data Type                    |
+=================+================+++++=========+
| ``none``        | - common/foo-common.css      |
+-----------------+------------------------------+
| ``US``          | - common/foo-common.css      |
|                 | - region/US/foo-US.css       |
+-----------------+------------------------------+
| ``CA``          | - common/foo-common.css      |
|                 | - region/CA/foo-CA.css       |
+-----------------+------------------------------+

In the above example, the ``region`` dimension maps directly to a conforming ``assets`` directory structure.

Because each dimension is declared with the empty object ({}), Shaker includes all assets found within the corresponding directories (and subdirectories) when generating the corresponding rollup.

For more control over what gets included in a rollup, see the Advanced Configuration section.

Actions/Binders
##########

The ``actions`` section tells Shaker which controller actions (binders) the mojit or application is sensitive to. Shaker also analyzes which dimensions your mojits and actions are sensitive to in order to generate at the necessary rollups.

Actions at mojit level
----------------------
This is the representation for the default shaker configuration at mojit level:

::

    {
        "actions": {
            "*": {},
        },
        "order": "common-action-device-skin-region-lang"
    }

If you have any binder in your mojit, shaker will analyze it for you, creating some structure like this:

**Example**: A mojit sensitive to the ``index`` and ``show`` controller actions (binders).

::

    {
        "actions": {
            "*": {},
            "index": {},
            "show": {}
        },
        "order": "common-action-device-skin-region-lang"
    }

**Note that you don't have to write any configuration for any case if you use the default folder structure.


Actions at the app level
---------------------

The configuration at the app level is exactly the same as at the mojit level, with only one difference: you can specify which mojits you want to bundle per action. Bundling a mojit means that these mojits' assets will be included within the app rollup, avoiding to request additional rollups for those mojits.
=======
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
>>>>>>> Restructured shaker in preparation for open sourcing

**Example**: App shaker configuration bundling different mojits per action:
::

<<<<<<< HEAD
    {
        "actions": {
            "*": {
                "mojits":["mojitA","mojitB"]
            },
            "appAction1": {
                "mojits":["mojitA",",mojitB.index","mojitC"]
            },
            "appAction2": {
                "mojits":["mojitD","mojitE"]

            }
        },
        "order": "common-action-device-skin-region-lang"
    }
=======
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
>>>>>>> Restructured shaker in preparation for open sourcing


Environment Configuration
#########################

Shaker allows you to rollup your assets and deploy them in a variety of ways based on the environment context.
<<<<<<< HEAD
All that is necessary is to provide a shaker config per environment in your ``application.json`` file. A shaker config specifies what task to run and any additional settings the task depends on.

**Example:** Sample ``application.json`` shaker setup using several environments:

::

    [{
        "settings": ["master"],
        // default environment
        // by default shaker will run in dev mode
    }, {
        "settings": ["environment:test"],

        "shaker": {
            "task": "local"
        }
    }, {
        "settings": ["environment:stage"],

        "shaker": {
            "task": "s3",
            "config": {
                "client": {
                    "key": "<key>",
                    "secret": "<secret>",
                    "bucket": "<bucket>"
                }
            }
        }
    }]
=======
All that is necessary is to provide a shaker config per environment in your *application.json*. A shaker config specifies what task to run and
any additional settings the task depends on.

**Example:** Sample application.json shaker setup using several environments:

::

	[{
	    "settings": ["master"],
	    "//": default environment
	    "//": by default shaker will run in dev mode
	{
	    "settings": ["environment:test"],

	    "shaker": {
	        "task": "local"
	    }
	},
	{
	    "settings": ["environment:prod"],

	    "shaker": {
	        "task": "mobstor",
	        "config": {
	            "client": {
	                "host": "<host>",
	                "proxy": {
	                    "host": "<proxyhost>",
	                    "port": <port>
	                }
	            }
	        }
	    }
	},
	{
	    "settings": ["environment:stage"],

	    "shaker": {
	        "task": "s3",
	        "config": {
	            "client": {
	                "key": "<key>",
	                "secret": "<secret>",
	                "bucket": "<bucket>"
	            }
	        }
	    }
	}]
>>>>>>> Restructured shaker in preparation for open sourcing

To build a particular environment run the shaker command like so: ``mojito shake --context "environment:<env>"``

As we saw in the Components section, we have different deployment tasks. Next we will see how to use each based on the example application.json above.

<<<<<<< HEAD
Deploying raw (no rollups, developer mode)
------------------------------------------
``mojito shake --run``

Deploying locally (rollups, developer mode)
------------------------------------------
``mojito shake --context "environment:test" --run``

Deploying to Mobstor (Yahoo's! CDN)
------------------------------------------
``mojito shake --context "environment:prod" --run``

Deploying to  S3 (Amazon CDN)
=======
Deploying raw (no rollups, developer mode) 
------------------------------------------
``mojito shake --run``

Deploying locally (rollups, developer mode) 
------------------------------------------
``mojito shake --context "environment:test" --run``

Deploying to Mobstor (Yahoo's! CDN) 
------------------------------------------
``mojito shake --context "environment:prod" --run``

Deploying to  S3 (Amazon CDN) 
>>>>>>> Restructured shaker in preparation for open sourcing
------------------------------------------
``mojito shake --context "environment:stage" --run``

Deploying elsewhere
------------------------------------------
<<<<<<< HEAD
All tasks are actually Buildy (https://github.com/mosen/buildy) tasks. It's easy to write your own. There are many examples in the Buildy source. Simply write your custom task, drop it in the tasks directory, and reference it in the shaker config like any other task. Everything in the tasks directory will be automatically picked up.
=======
All tasks are actually Buildy (https://github.com/mosen/buildy) tasks. It's easy to write your own. There are many examples in the Buildy source. Simply write your custom task, drop it in the
tasks directory, and reference it in the shaker config like any other task. Everything in the tasks directory will be automatically picked up.
>>>>>>> Restructured shaker in preparation for open sourcing

Advanced Configuration
#########################

Include/Exclude/Replace
-----------------------
If the default directory-based rollup behavior is not desirable, or, if the assets directory is non-conforming, it's still possible to configure rollups using the include, exclude and replace settings.

<<<<<<< HEAD
- ``include`` - Include one or more paths or files. (Useful for mojit- and application-level configuration.)
- ``exclude`` - Exclude one or more paths or files. (Useful for application-level configuration.)
- ``replace`` - Replace one or more paths or files with new paths or files. (Useful for application-level configuration.)

**Example advanced configuration:**
::
    {
        "dimensions": {
            "common":{
                "include":["mycommon/"],
                "exclude":["common/common1.css"]
            },
            "device":{}
        },
        "actions":{
            "index":{}
        }
    }
=======
- ``include`` - Include one or more paths or files. (Useful for mojit- and application-level configuration.) 
- ``exclude`` - Exclude one or more paths or files. (Useful for application-level configuration.) 
- ``replace`` - Replace one or more paths or files with new paths or files. (Useful for application-level configuration.) 
>>>>>>> Restructured shaker in preparation for open sourcing


Augmenting Dimensions
---------------------
<<<<<<< HEAD
Shaker allows you to perform surgical manipulation of the rollups using augmentation. This configuration feature allows you to include/exclude files for a particular dimension which matches some criteria. For example, we want to override a special CSS file only when we are in "region:CA and in lang:en". The syntax follows the example below.

**shaker.json example for dimensions augmentation:**
::
    {
        "augments":[{
                "on": {
                    "region": "US",
                    "lang": "en",
                    "skin": "blue",
                    "device": "smartphone",
                    "action": "index"
                },
                "include":["toInclude/otherToInclude.css"],
                "exclude": ["lang/"]
            }
        ]
    }
=======

>>>>>>> Restructured shaker in preparation for open sourcing


