
=====
Usage
=====

The Shaker recipe is one part convention and one part configuration. The convention lies on the name you put to your ``resources`` (assets, binders, controllers, etc). The configuration lies in a mojit or application's ``shaker.json`` file, which defines rollups and their contents.

We will see every feature/use-case Shaker can handle. Also to clarify more all use-cases, you can find a lot of examples here.


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

JS Calculation
----------------
Because we are using the YUI module pattern for our resources, at build time we can analyze the dependencies of a mojit for every given context and action.
For example, this is the controller module of a regular mojit:

::

    YUI.add('Main', function(Y, NAME) {
    ...
    }, '0.0.1', {requires: ['mojito','mojito-assets-addon', 'mojito-models-addon', 'MainModelFoo']});

We know that when this mojit gets dispatched it will need a Model resource called ‘MainModelFoo’, so we can compute that ahead of time and serve everything rolled up.

In ``mojito@0.5.x`` a new feature was introduced where all the needed dependencies will be fetched and combo load automatically for us. We can configure shaker to be able to serve this comboload from CDN (if you have a CDN which support comboLoading), and even prefetch some of the dependencies combining Mojit bundles together.

**NOTE:** If you are running mojito below version 5, Shaker will take care about loading the JS dependencies automatically for you.



CSS Selector Naming rules
------------------------------

After reading and understading the previous table, let's summarize the rules that Shaker will take into account to deliver the css:

- Every css file with no selector (foo.css) will be considered "common", therefor will be included in each bundle within the mojit.

- If a file has selector (foo.iphone.css), will be included when the context matches.

- If two file has the same name but different selector (foo.css, foo.iphone.css) the right one will be picked in each case. We call this versioning.

- If a file has a name which matches the name of a view, will be included only when the context and the action executed matches (serve the assets for the right actions).


Generating mojit rollups: Shaker metadata
--------------------------------------------
Assuming that the assets of your mojits have been named correctly (see sections above), Shaker will be ready to analyze your app and bundle them.

When running Shaker, it will go over all the JS and CSS resources per mojit, checking their dependencies (in the case of YUI modules), and based on the context, the configuration you provided (we will see more about those in the next section), it will construct the list or resources that each bundle will contain.

This information will be stored in a file called shaker-metadata, which will be used on runtime to know which bundles to serve in each case.

**Metadata generated by Shaker for a mojit with two actions:**

::

    "mojits": {
        "Main": {
            "index": {
                "js": [
                    "/static/autoloadGlobal.js",
                    "/static/MainBinderIndex.js",
                    "/static/MainModelFoo.js",
                    "/static/Main.js"
                ],
                "css": [
                    "/static/Main/assets/mainBase.css",
                    "/static/Main/assets/index.css"
                ]
            },
            "other": {
                "js": [
                    "/static/MainBinderOther.js",
                    "/static/MainModelFoo.js",
                    "/static/Main.js"
                ],
                "css": [
                    "/static/Main/assets/mainBase.css",
                    "/static/Main/assets/other.css"
                ]
            }
        }
        ...
    }

We will see in the next sections how to customize the content of the rollups (minification, deployment to CDN, bootstraping, etc) throught configuration.


.. _env-context:

Environment and context configuration
######################################

Shaker allows you to rollup your assets and deploy them in a variety of ways based on the environment context. For example in production you would like to minify your rollups and upload them to cdn, whereas in your devbox you only want to lint them and serve them sepratelly.

All that is necessary is to provide a shaker config per environment in your ``application.json`` file. A shaker config specifies what task to run and any additional settings the task depends on.

**Example:** Sample ``application.json`` shaker setup using several environments:

::

    [{
        "settings": ["master"]
        "shaker: {
            //default configuration
        }
    }, { 
        "settings": ["environment:test"],
        "shaker": {
            "task": "local"
            "lint": false,
            "minify": true,
            "rollupConfig": {
                bundleViews: false,
                bundleController: false
            }
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

The previous configuration will give us three different types of execution environments.
To build a particular environment, run the shaker command like so: ``mojito shake --context environment:<env>`` 
After runing Shaker, start your mojito app normally.

Aligned with the example, this is the detailed

Deploying raw (no rollups, developer mode)
----------------------------------------------
``mojito shake``

Deploying locally (rollups, test mode)
--------------------------------------------------
``mojito shake --context environment:test``

Deploying to  S3 (Amazon CDN, staging)
----------------------------------------------------
``mojito shake --context environment:stage``


Shaker Settings
--------------------
As you saw in the code example above, for every environment we can set a different configuration for Shaker:
These are some of the options we saw in the application.json example:

- ``task`` - {string} Name of task to execute (local, s3, raw, ...). Defaults to ``raw`` which runs in dev mode.
- ``lint`` - {boolean} Run lint on app files. Defaults to true.
- ``minify`` - {boolean} Minify JS and CSS. Defaults to true.
- ``rollupConfig`` - {Object} It tells shaker which parts to deploy to the client (binders, views, controllers or all ot them).

To see all the options avaliable in Shaker go to the API section.



Bundling Mojits together
#######################################
 
 In the previous sections we cover how Shaker works to create rollups for every Mojit. Which means that on the client we will have to fetch at least one CSS rollup/request per Mojit plus the request necessary for the JS.
 
When the amount of Mojits to execute is big, we would like to combine all this rollups in one to serve all the styles at ones and remove the overhead of multiple connections.
In order to address this problem Shaker defines what we call ``High-coverage`` mojits and ``Low-coverage`` mojits:

High-coverage Mojits
---------------
Definition: Ability to define ahead of time which mojits to bundle together so we just require one request  for the first flush of the page.

In the section above, we saw that Shaker will build rollups for every single Mojit and for every possible set of configuration our application supports, which will reduce considerably the number of requests. But if we have a lot of mojits to dispatch and flush to the client, we will end up doing a lot of CSS and JS requests anyway. 

In this situation Shaker allow us to define what we call high-coverage mojits. 
For every route defined in our application we can tell Shaker which mojits are most likely to be loaded and then bundle all of those together. The syntax is as follows:

::

    shaker:{
        "routeBundle": {
        //we define for each route which mojits we want to bundle together
            "foo": [
                "Main.index"   
            ],
            "bar": [
                "mojitB.index",
                "mojibC.other"
            ]
        }
    }

At build time Shaker will analyze the routeBundles you want to build and will generate the specific rollups for you. Note that all this rollups will be allways context specific, so it ship only what we need for a given context.

Low-coverage Mojits
----------------------
Definition: Load at any given time (lazy/dynamic load) a mojit with its own JS and CSS bundle


Low coverage mojits are all the mojits which are not defined as inthe routeBundle (as HIGH-COVERAGE). Shaker has to provide as well bundles for independent mojits that may be loaded after the page has already rendered, or when the user clicks in a special link which triggers a new mojit dispatch.

If there is no High-Coverage bundles, the default behaviour is to load the mojits as LOW-Coverage. 

Since the new mojito handles the JS for us using a local combo load, the only problem when not defining the ``HIGH-COVERAGE`` is the amount of CSS request made.


Bundling parts of a mojit: rollupConfig
---------------------------------------

Going back to the bundles, we saw which resources to take into account, how to manage the dependencies and how to pick the right ones regarding the context. We still have to define which parts are going to be included.
    
So depending on the application needs, we may want to ship only the minimum amount of JS to the page (the binders and the Mojito client barebones) or we may want to ship absolutely everything (controller, binders, dependencies, views, langs, etc.). 

Shaker has to provide a way to select which components you want to rollup for every mojit. We could define this configuration at the app level, if we want to share all the configuration across mojits, or we can define small configuration files in each mojit for overriding which parts to bundle.
The configuration API will look something like:

::

    "shaker": {
        "rollupConfig": {
              "bundleViews": false,
              "bundleController": false
        }
    }

With that we can customize the parts we will include in the bundles. Note that Shaker should also provide a way to bundle all components together  so offline applications have almost zero configuration.

Inlining code
##############

Sometimes we need to execute JavaScript or load CSS styles as soon as possible to give to our users a good user experience. In Mojito today you can inline code using core API's, but you will have to hardcode the code into your controlers, and this is not really a good practice.

In Shaker we came up with an automated way to do this. You just have to create a file with a special the selector ``shaker-inline`` in your mojit, and this file will be inline and served when the mojit is dispatched. Given that a mojit can have different behaviour depending on the action, inlining is also sensible to the action, so if the name of your inline file matches an existing action in your mojit, it will be only inlined when on runtime the action matches.

Last feaure reagarding inlining is that by default the code is inlined at the bottom of the page, before mojito client gets executed. If you want to inline the code right after the html generated by a particular mojit, you just have to include in your controller a dependencies called ``shaker-inline``. You can find some examples about inlining in the shaker-examples section. 

**Summary example:** 

- ``myInline.shaker-inline.css`` - Will be inlined for any action within the mojit
- ``mojitAction1.shaker-inline.js`` - Assuming that there is an action with his correspondent view called mojitAction1, the code will be inlined when on runtime the mojitAction1 gets exexuted.
- ``myInline.iphone.shaker-inline.js`` - Will be inlined when the context (in this case iphone) on runtime matches.

::

    YUI.add('MainController', function(Y, NAME) {
    // My controller code
    }, '0.0.1', {requires: ['mojito', 'shaker-inline-addon']});

Dynamic & Parallel bootstrap
###########################

By default, a <script src=...></script> tag is evil! The browser must halt parsing the HTML until the script is downloaded and executed (since the script might call document.write(...) or define global variables that later scripts depend on). This means that any images and stylesheets that are after the script tag don't start downloading until after the script has finished downloading and executing. External scripts typically make the Web load much more slowly, which is why NoScript has become so popular.

W3C introduced defer to solve the problem. If you use <script defer src=...></script>, you promise not to call document.write(...). A defer external script will start downloading immediately but won't execute until after the page is rendered. The problem with defer is that W3C HTML5 draft has taken away defer on inline script due to execution order guarantee, and also defer is not supported in some browsers.
    
The alternative we have is to load scipts dynamically, here is a snippet example:
<script>
(function() {
  var script = document.createElement('script');
  script.src = '...';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(script, s);
})();
</script>

Shaker implements as a configuration option a mechanism like this to load dynamically the JS bundles. Moreover since we don’t control the order anymore, we implemented a special bootstrap to make sure YUI gets bootstrapped correctly. If you want to use the optimized bootstrap into your mojito application you just need to add the option ``optimizeBootstrap: true`` in your shaker configuration.

K-weight splitting
####################
We were talking about ``high-coverage`` bundles and also about ``Rollup configuration`` in the previous sections. Those goals can lead us to produce gigantic rollups, that will require a significant amount of time to load.

Since we have dynamic script loading and a mechanism that guarantees the order, one other feature that Shaker provide is the ability to split those bundles into chunks so we can parallelize them. Shaker will provides an API to define the threshold for the size of the chunks. Then, at build time, Shaker will split the rollup so we can optimize the loading time.

::

    "shaker": {
        // This are the default values:
        "ksplit": {
            "weight": 100 // the kb limit for spliting
            "threshold": 20 // the percentage of threshold to split the rollup
            "":
        }
    }

The properties of ``ksplit`` means that Shaker will chunk files bigger than 100kb with a margin of 20%, which means that will chunk into pieces rollups with a size beetween 80kb and 120kb. You can set ``ksplit:true`` to work with the default values.
