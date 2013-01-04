
========
Usage
========
The Shaker recipe is one part convention and one part configuration. The convention lies on the name you put to your ``resources`` (assets, binders, controllers, etc). The configuration lies in a mojit or application's ``shaker.json`` file, which defines rollups and their contents.

We will see every feature/use-case Shaker can handle.


**Contextualize:** Context Dimensions
#####################################

First we need to understand how we can contextualize assets in Mojito, and then how we can leverage this process with Shaker.

How it works out-of-the-box in mojito
-------------------------------------

In mojito we have for every request a context. This context has properties like language, region, device, bucket, and any other synthetic dimension that we could potentially add. 

Giving a particular dimension we may want to do different things, for example, if I’m on an iPhone I may want mobile-specific CSS, or I may want to execute a different controller. In order to do that mojito has “selectors.” For every particular set of attributes on a context you can define a selector. This is what it looks like in your application.json:
::
    {
        "settings": ["device:iphone"],
        "selector": "iphone"
    }

Creating a resource sensitive to that selector is as simple as adding the selector to the filename:

- controller. ``iphone`` .common.js
- myview. ``bucket4`` .client.js
- binder. ``tablet`` .js

Properly configured, Mojito will pick the right version of your resources at run-time.

Note that in Mojito, selectors only work for js files; on CSS they will not have any effect. Shaker will take care of that, and we will in the next section how.

What Shaker do with the context.
------------------------------

Given the previous selector feature in Mojito, on the client we want to bundle the right resources, for the right context, with no performance overhead. 

At build time Shaker will analyze the application using the Mojito Store API and will generate all the possible combinations that the application is sensible to. This applies not only for JS, but for CSS as well. Moreover, we need to serve different CSS for different actions.

**Example of contextualizing for a Mojito with two actions and two possible devices:**

.. figure:: images/contextualize.png
    :figwidth: 665px
    :align: center
    :alt: Mojito with two actions and two possible devices.

In Mojito all the resources are YUI Modules, which means that in addition to knowing which resources we will pick, we can also know ahead of time the dependencies that those modules require. With those two features, we can ensure that the bundle contains exactly the resources we need.



CSS Selector Naming rules
------------------------------

After reading and understading the previous table, let's summarize the rules that Shaker will take into account to deliver the css:

- Every css file with no selector (foo.css) will be considered "common", therefor will be included in each bundle within the mojit.

- If a file has selector (foo.iphone.css), will be included when the context matches.

- If two file has the same name but different selector (foo.css, foo.iphone.css) the right one will be picked in each case. We call this versioning.

- If a file has a name which matches the name of a view, will be included only when the context and the action executed matches (serve the assets for the right actions).


Environment Configuration??
##############################

Shaker allows you to rollup your assets and deploy them in a variety of ways based on the environment context.
All that is necessary is to provide a shaker config per environment in your ``application.json`` file. A shaker config specifies what task to run and any additional settings the task depends on.

**Example:** Sample ``application.json`` shaker setup using several environments:

::

    [{
        "settings": ["master"]
    }, {
        "settings": ["environment:test"],

        "shaker": {
            "task": "local"
            "lint": false
        }
    }, {
        "settings": ["environment:stage"],

        "shaker": {
            "task": "s3",
            "images": true,
            "config": {
                "client": {
                    "key": "<key>",
                    "secret": "<secret>",
                    "bucket": "<bucket>"
                }
            }
        }
    }]

Shaker Settings
--------------------
- ``task`` - {string} Name of task to execute (local, s3). Defaults to null which runs in dev mode.
- ``compiled_dir`` - {string} Where to output Shaker generated files. Defaults to assets/compiled/.
- ``images`` - {boolean} Whether to deploy images with rollups. Useful if your CSS contains relative URLs to assets. Defaults to false.
- ``parallel`` - {integer} How many files to deploy in parallel. Defaults to 20.
- ``delay`` - {integer} Add network delay for slow hosts. Defaults to 0.
- ``lint`` - {boolean} Run lint on app files. Defaults to true.
- ``minify`` - {boolean} Minify JS and CSS. Defaults to true.
- ``config`` - {object} Object passed through to task.

To build a particular environment, run the shaker command like so: ``mojito shake --context environment:<env>``

As we saw in the Components section, we have different deployment tasks. Next we will see how to use each based on the example application.json above.

Deploying raw (no rollups, developer mode)
----------------------------------------------
``mojito shake --run``

Deploying locally (rollups, developer mode)
--------------------------------------------------
``mojito shake --context environment:test --run``

Deploying to  S3 (Amazon CDN)
----------------------------------------------------
``mojito shake --context environment:stage --run``

Deploying elsewhere
------------------------------------------
All tasks are actually Gear.js (https://github.com/yahoo/gear) tasks. It's easy to write your own. There are many examples in the Gear source. Simply write your custom task, drop it in the tasks directory, and reference it in the shaker config like any other task. Everything in the tasks directory will be automatically picked up.


Debugging Shaker
------------------------------------------


Advanced Configuration
#########################

Include/Exclude/Replace
-----------------------
If the default directory-based rollup behavior is not desirable, or if the assets directory is non-conforming, it's still possible to configure rollups using the include, exclude and replace settings.

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


Augmenting Dimensions
---------------------
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


