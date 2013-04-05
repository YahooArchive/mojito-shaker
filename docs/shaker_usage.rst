=====
Usage
=====

The Shaker recipe is one part convention and one part configuration. The convention lies
in the name you use for your ``resources`` (assets, binders, controllers, etc). The
configuration lies in a mojit or application's ``shaker.json`` file, which defines rollups
and their contents.

We will see every feature/use case that Shaker can handle. Also, to clarify more all
use cases, you can find a lot of examples here.

.. _usage-context:

Contextualize: Context Dimensions
#################################

First we need to understand how we can contextualize assets in Mojito, and then how we can
leverage this process with Shaker.

.. _context-how:

How It Works Out-of-the-Box in Mojito
-------------------------------------

In Mojito, we have a context for every request. This context has properties like language,
region, device, bucket, and any other synthetic dimension that we could potentially add.

Giving a particular dimension, we may want to do different things. For example, if I’m on
an iPhone, I may want mobile-specific CSS, or I may want to execute a different controller.
In order to do that, Mojito has *selectors*. For every particular set of attributes on a
context you can define a selector. This is what it looks like in your ``application.json``:

.. code-block:: javascript

   {
     "settings": ["device:iphone"],
     "selector": "iphone"
   }

Creating a resource sensitive to that selector is as simple as adding the selector to the
file name:

- ``controller.iphone.common.js`` - ``iphone`` is the selector
- ``myview.bucket4.client.js``    - ``bucket4`` is the selector
- ``binder.tablet.js``            - ``tablet`` is the selector

Properly configured, Mojito will pick the right version of your resources at runtime.

Note that in Mojito, selectors only work for JavaScript files; they will not have
any effect on CSS files. Shaker will take care of that, and we will show how in the
next section.
'
.. _context-do:

What Shaker Does with the Context
---------------------------------

Using Mojito's selector feature, we can bundle the right
resources for a context on the client without negatively affecting performance.

At build time, Shaker will analyze the application using the Mojito Store API and will
generate all the possible combinations that the application is aware of. This applies
not only for JavaScript, but for CSS as well. Moreover, we need to serve different CSS for
different actions.

**Example of contextualizing for a Mojito with two actions and two possible devices:**

.. figure:: images/contextualize.png
    :figwidth: 665px
    :align: center
    :alt: Mojito with two actions and two possible devices.

In Mojito, all the resources are YUI Modules, which means that in addition to knowing which
resources we will choose, we can also know in advance the dependencies that those modules
require. With those two features, we can ensure that the bundle contains exactly the
resources we need.

.. _context-js_calculation:

JavaScript Calculation
----------------------

Because we are using the YUI module pattern for our resources, at build time, we can
analyze the dependencies of a mojit for every given context and action. For example, this
is the controller module of a regular mojit:

.. code-block:: javascript

    YUI.add('Main', function(Y, NAME) {
    ...
    }, '0.0.1', {requires: ['mojito','mojito-assets-addon', 'mojito-models-addon', 'MainModelFoo']});


We know that when this mojit gets dispatched it will need a model resource called
``MainModelFoo``, so we can compute that ahead of time and serve everything rolled up.

In ``mojito@0.5.x``, a new feature was introduced where all the needed dependencies will be
fetched and combo loaded automatically for us. We can configure Shaker to serve
this combo load from a CDN (if you have a CDN which support combo loading), and even prefetch
some of the dependencies combining mojit bundles.

.. note:: If you are running an earlier version than Mojito v0.5.x, Shaker will
          automatically load the JavaScript dependencies for you.

.. _context-css_selector:

CSS Selector Naming Rules
-------------------------

After reading and understanding the previous sections, let's summarize the protocol that
Shaker follows to deliver CSS:

- Every CSS file with no selector (e.g., ``foo.css``) will be considered ``common``,
  therefore, will be included in each bundle within the mojit.
- If a file has selector (e.g., ``foo.iphone.css``), it will be included when the context
  matches.
- If two files have the same name but different selectors
  (e.g., ``foo.css``, ``foo.iphone.css``) the correct one will be chosen.
  We call this versioning.
- If a file name matches the view name, the CSS will be included only when the
  context and the executed action match (serve the assets for the right actions).

.. _context-mojit_rollups:

Generating Mojit Rollups: Shaker Metadata
-----------------------------------------

Assuming that the assets of your mojits have been named correctly (see sections above),
Shaker will be ready to analyze your application and bundle them.

When running Shaker, it will go over all the JavaScript and CSS resources for each mojit,
checking dependencies (in the case of YUI modules), and based on the context, the
configuration you provided (we will see more about those in the next section), it will
construct the list or resources that each bundle will contain.

This information will be stored in a file called ``shaker-metadata``, which will be used
at runtime to know which bundles to serve.

**Metadata generated by Shaker for a mojit with two actions:**

.. code-block:: javascript

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

We will see in the next sections how to customize the content of the rollups (minification,
deployment to CDN, bootstrapping, etc.) through configuration.


.. _env-context:

Environment and Context Configuration
#####################################

Shaker allows you to roll up your assets and deploy them in a variety of ways based on the
environment context. For example, in production, you would like to minify your rollups and
upload them to a CDN, whereas, on your development machine, you may only want to lint
them and serve them separately.

All that is necessary is to provide a ``shaker`` configuration object for each
 environment in your ``application.json`` file. The ``shaker`` object specifies what task
to run and any additional settings the task depends on.

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
After running Shaker, start your Mojito application normally.

The following sections offer commands for deploying assets in different environments.

.. _context-deploy_raw:

Deploying Raw (No Rollups, Developer Mode)
------------------------------------------

``mojito shake``

.. _context-deploy_locally:

Deploying Locally (Rollups, Test Mode)
--------------------------------------

``mojito shake --context environment:test``

.. _context-deploy_cdn:

Deploying to S3 (Amazon CDN, Staging)
-------------------------------------

``mojito shake --context environment:stage``

.. _context-shaker_settings:

Shaker Settings
---------------

As you saw in the code example above, for every environment we can set a different
configuration for Shaker. These are some of the options we saw in the
``application.json`` example:

- ``task`` - {string} Name of task to execute (local, s3, raw, etc.). Defaults to ``raw``
  when running in development mode.
- ``lint`` - {boolean} Run lint on application files. The default is ``true``.
- ``minify`` - {boolean} Minify JS and CSS. Defaults to true.
- ``rollupConfig`` - {Object} It tells Shaker which parts to deploy to the client
  (binders, views, controllers, or all of them).

For all the options available in Shaker, see `Shaker Configuration API <./shaker_api_summary.html>`_.

.. _usage-bundling:

Bundling Mojits Together
########################

In the previous sections, we covered how Shaker works to create rollups for every mojit.
Thus, the client we will have to fetch at least one CSS rollup/request per
mojit and the request necessary for the JavaScript.

When there are too many mojits to execute, we should combine all the rollups in
one to serve all the CSS at once and remove the overhead of multiple connections. To
address this problem, Shaker defines what we call *high-coverage* mojits and
*low-coverage* mojits, which we will discuss next.

.. _bundling-hc_mojits:

High-Coverage Mojits
--------------------

Definition: Ability to define ahead of time which mojits to bundle together so we just
require one request  for the first flush of the page.

Earlier, we saw that Shaker will build rollups for every mojit and for
every possible set of configuration our application supports, which will reduce
considerably the number of requests. But if we have a lot of mojits to dispatch and flush
to the client, we will still end up doing a lot of CSS and JavaScript requests.

In this situation, Shaker allow us to define what we call high-coverage mojits.
For every route defined in our application, we can tell Shaker which mojits are most likely
to be loaded and then bundle all them together. The following is the syntax for bundling
high-coverage mojits:

.. code-block:: javascript

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

At build time, Shaker will analyze ``routeBundle`` and generate the
specific rollups for you. Note that all these rollups will be context specific, so
it ships only what we need for a given context.

.. _bundling-lc_mojits:

Low-Coverage Mojits
-------------------

Definition: Load (lazily/dynamically) a mojit with its own JavaScript and CSS bundle.


Low-coverage mojits are all the mojits which are not defined in ``routeBundle``.
Shaker has to provide as well as bundle independent mojits that may
be loaded after the page has already been rendered or when the user clicks a link
that triggers the dispatch of a new mojit.

If there are no high-coverage bundles, the default behavior is to load the mojits as
**low coverage**.

Because the Mojito v0.5.x handles the JavaScript with a local combo load, the only
problem when not specifying high-coverage mojits is the number of CSS requests
that need to be made.

.. _bundling-parts:

Bundling Parts of a Mojit: rollupConfig
---------------------------------------

Going back to the bundles, we saw which resources to take into account, how to manage the
dependencies, and how to select the right resources based on the context. We still, however,
have to define which parts are going to be included.

So, depending on the application needs, we may want to ship only the minimum amount of
JavaScript to the page (the binders and the bare-bone Mojito client code), or we may want
to ship absolutely everything (controller, binders, dependencies, views, langs, etc.).

Shaker has to provide a way to select which components you want to rollup for every mojit.
We could define this configuration at the application level, if we want to share all the
configuration across mojits, or we can define small configuration files in each mojit
to override which parts to bundle.

The configuration API will look something like:

.. code-block:: javascript

    "shaker": {
        "rollupConfig": {
              "bundleViews": false,
              "bundleController": false
        }
    }

With that, we can customize the parts we will include in the bundles. Note that Shaker
should also provide a way to bundle all components together, so offline applications have
almost no configuration.

.. _usage-inlining:

Inlining Code
#############

Sometimes we need to execute JavaScript or load CSS styles as quickly as possible to give
our users a good user experience. In Mojito v0.5.x, you can inline code using the core APIs,
but you will have to hard-code the code into your controllers, and this is not really ideal.

In Shaker, we came up with an automated way to do this. You just have to create a file with
a special the selector ``shaker-inline`` in your mojit, and this file will be inline and
served when the mojit is dispatched. Given that a mojit can have different behavior
depending on the action, inlining is also sensible to the action, so if the name of your
inline file matches an existing action in your mojit, it will be only inlined when the
action matches at runtime.

By default, the code is inlined at the bottom of the page, before the Mojito client code
is executed. If you want to inline the code right after
the HTML generated by a particular mojit, you just have to include in your controller a
dependency called ``shaker-inline``. See examples about inlining in the
`Shaker App Example <./shaker_examples.html>`_.

**Summary example:**

- ``myInline.shaker-inline.css`` - this will be inlined for any action within the mojit.
- ``mojitAction1.shaker-inline.js`` - Assuming that there is an action with his
  corresponding view called ``mojitAction1``, the code will be inlined at runtime when
  ``mojitAction1`` is executed.
- ``myInline.iphone.shaker-inline.js`` - this will be inlined when the context (in this
  case ``iphone``) matches at runtime.

.. code-block:: javascript

    YUI.add('MainController', function(Y, NAME) {
    // My controller code
    }, '0.0.1', {requires: ['mojito', 'shaker-inline-addon']});

.. _usage-bootstrap:

Dynamic & Parallel Bootstrap
############################

By default, the ``<script src=...></script>`` tag is evil! The browser must halt parsing
the HTML until the script is downloaded and executed (since the script might call
``document.write()`` or define global variables that the scripts depend on). Images and
style sheets that come after the ``script`` tag don't start downloading
until after the script has finished downloading and executing. External scripts typically
make the page load much more slowly, which is why NoScript has become so popular.

W3C introduced the ``defer`` attribute to solve the problem. If you use
``<script defer src=...></script>``, do not call ``document.write()``. A
deferred external script will start downloading immediately but won't execute until after
the page is rendered. The problem with ``defer`` is that the W3C HTML5 draft has removed
``defer`` from inlined scripts due to execution order guarantee, and also ``defer`` is not
supported in some browsers.

The alternative we suggest is to dynamically load scripts. Here is a snippet illustrating
how to dynamically load scripts:

.. code-block:: html

   <script>
     (function() {
       var script = document.createElement('script');
       script.src = '...';
       var s = document.getElementsByTagName('script')[0];
       s.parentNode.insertBefore(script, s);
     })();
   </script>

Shaker implements, as a configuration option, a mechanism that dynamically loads the
JavaScript bundles. Moreover, because we don’t control the order anymore, we implemented
a special bootstrap to make sure YUI gets bootstrapped correctly. If you want to use the
optimized bootstrap into your Mojito application, just add the option
``optimizeBootstrap: true`` in your Shaker configuration.

.. _usage-splitting:

K-Weight Splitting
##################

We have discussed **high-coverage** bundles and also **Rollup configuration**
in the previous sections. Both can result in gigantic rollups that will
require a significant amount of time to load.

Because we have dynamic script loading and a mechanism that guarantees the order, one other
feature that Shaker provide is the ability to split those bundles into chunks that
can be loaded in parallel. Shaker provides an API to define the threshold for the size of the
chunks. Then, at build time, Shaker will split the rollup so we can optimize the loading
time.

.. code-block:: javascript

    "shaker": {
        // This are the default values:
        "ksplit": {
            "weight": 100 // the kb limit for splitting
            "threshold": 20 // the percentage of threshold to split the rollup
            "":
        }
    }

The properties of ``ksplit`` specifies that Shaker should chunk files bigger than 100kb
with a margin of 20%. In other words, files will be split into pieces with a size between
80kb and 120kb. You can set ``ksplit:true`` to work with the default values.
