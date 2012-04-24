
===================
Shaker App Example
===================

To better understand how Shaker works, we are going to create simple application from scratch,
which will cover the basic features and some advanced configuration as well.

Application overview
#####################

.. image:: images/example_app.png
  :width: 700px
  :align: right

Our application will have three main mojits:

- ``master`` - The "parent mojit", which will be the placeholder for the other mojits
- ``primary`` - Will contain the left part of our application.
- ``secondary`` - Will be the the right part of our application.

Each mojit will react to a specific set of dimensions:

- ``device``: default, smartphone
- ``region``:  default, CA
- ``skin``: default, gray, blue

Thus, if we are on a mobile device, we might load different CSS. Similarly, we may load different assets according to skin and/or region. Shaker will handle all the possible combinations.


Application structure
#####################

In this section we will analyze in detail every piece of our application.

master mojit
------------

This mojit will be the placeholder for the other two mojits. Let's take a look at the controller and the view:

**controller.common.js:**
::

    index: function(ac) {

        var config = {
            children: {
                primary: {
                    type: 'primary',
                    action: 'index'
                },
                secondary: {
                    type: 'secondary',
                    action: 'index'
                }
            }
        };

        ac.composite.execute(config, function (data, meta) {
            ac.done(data, meta);
        });
    },

    dynamic:{
        ac.done('AJAX entry point!');
    }

As you can see, we are not manually including any CSS and we don't have any logic at all in our controller. Shaker takes care of this at runtime based on the current context. Note that we have another controller action which will be used by the binder (explained in the next paragraph).


**index.mu.html:**

.. code-block:: html

  <div id="doc">
    <div id="head" class="clearfix">
      ...
    </div>
    <div id="main" class="clearfix">
      {{{primary}}}
      {{{secondary}}}
    </div>
  </div>

Also ``master`` will react to various dimensions (skin:grey, device:smartphone), so this is how the asset structure looks:

.. code-block:: text
  :emphasize-lines: 4,7,10,12

  master/
     /assets/
        /common/
           master.css
        /device/
           /smartphone/
              master-smartphone.css
        /skin/
           /grey/
              master-grey.css
           /blue/
              blue.css

Note that there is a special dimension called ``common`` which basically acts as a css-base, sharing all its css among all other 
dimensions. The ``master-smartphone.css`` or ``master-grey.css`` files will have some style overrides to change the baseplate style.


primary mojit
---------------

This mojit will be the left part of our application (you can see it in the picture above). We are not going to show neither controller or view since they don't contain anything really special more than the HTML template and some dummy data to populate it. What is important to shaker is which assets our Mojit contains. In this case, the mojit is sensitive to ``region`` and ``skin``:

**Assets structure**

.. code-block:: text
  :emphasize-lines: 4,7,10,12

  primary/
     /assets/
        /common/
           primary.css
        /region/
           /CA/
              primary-CA.css
        /skin/
           /grey/
              primary-grey.css
           /blue/
              blue.css

Note: the name of the files doesn't matter. Only the folder structure is important.

This mojit will contain a binder which will be deployed to the client to further communication using a different entry point.

**Binder: index.js**
::

  bind: function (node) {
      Y.one('#call').on('click', this._executeInvoke, this);
  },

  _executeInvoke: function (evt) {
      this.mojitProxy.invoke('dynamic', Y.bind(this.resultInvoke, this));
  },

  resultInvoke: function () {
      // Note that no request have been made at this point.
  }

We are including this binder so you can see how Shaker is doing the rollups with all the client side dependencies (if ``deploy`` is set to ``true``)

secondary mojit
----------------

This mojit will be the right part of our application. This mojit reacts to all the previous dimensions:

.. code-block:: text
  :emphasize-lines: 4,7,10,13,15

  secondary/
     /assets/
        /common/
           secondary.css
        /device/
           /smartphone/
              secondary-smartphone.css
        /region/
           /CA/
             secondary-CA.css
        /skin/
           /grey/
              secondary-grey.css
           /blue/
              some-blue.css

Note: the name of the files doesn't matter. Only the folder structure is important.

HTMLFrame mojit
---------------

Mojito uses an "HTMLFrame" to create the skeleton of the HTML document and to embed all your executed mojits ( See `Using HTML Frame Mojit <http://developer.yahoo.com/cocktails/mojito/docs/code_exs/htmlframe_view.html>`_) Shaker will need to be executed within this HTMLFrame, so basically we create a copy of the original HTMLFrame and add the little pieces we need:

**ShakerHTMLFrame controller.server.js**

.. code-block:: js
  :emphasize-lines: 9,20

  ...
   __call: function(ac) {
    ...
     // If we are deploying to the client get all the assets required
                if (ac.config.get('deploy') === true) {
                    ac.deploy.constructMojitoClientRuntime(ac.assets,
                        meta.binders);
                }
                ac.shaker.shakeAll(meta);

                // Attach assets found in the "meta" to the page
                Y.Object.each(ac.assets.getAssets(), function(types, location) {
                ...
        }
        ...

   }, '0.1.0', {requires: [
    'mojito-assets-addon',
    'mojito-deploy-addon',
    'mojito-config-addon',
    'mojito-shaker-addon'
  ]});

We need shaker to execute after analyzing all the dependencies if the application is deployed to the client, and before the assets get passed to the markup.

Application configuration
-------------------------
We need to tell shaker how we want to do the rollups. In order to do that we have to create in ``aplication.json`` a shaker object with the correct configuration.

**Example of usage of ``shaker`` in application.json**

.. code-block:: js
  :emphasize-lines: 2,19,25,43

  [{
      "settings": ["master"],
      "//": "we set out ShakerHTMLFrame as main mojit"
      "//": this configuration is shared to all context
      "specs": {
          "htmlframe": {
              "type": "ShakerHTMLFrameMojit",
              "config": {
                  "deploy": true,
                  "title": "Shaker Demo",
                  "child": {
                      "type": "master"
                  }
              }
          }
      }
  },
  {
      "settings": ["environment:test"],
      "shaker": {
          "task": "local"
      }
  },
  {
      "settings": ["environment:stage"],

      "shaker": {
          "task": "s3",
          "images": true,
          "parallel": 8,
          "delay": 0,
          "config": {
              "client": {
                  "key": "myAmazonKey",
                  "secret": "myAmazonSecret",
                  "bucket": "shaker"
              }
          }
      }
  }
  ]

We define a different configuration for every environment. For example in the basic one ``["master"]`` we don't have any configuration, so shaker is going to assume that we are in "developer mode" which means Shaker won't do any rollups at all, It just going to include the files one by one. On the other hand, if we are in ``[stage]`` Shaker will do the rollups and upload them to the Amazon CDN (see `Deployment Configuration <shaker_usage.html#environment-configuration>`_  for more information).
In the next section we will see exactly what gets deployed for every particular case.

Shaker running on our App
##########################

Now that we understand the internals of our application, let's see how it behaves at build time and at runtime.

Build time
------------
To run shaker, execute the shaker command:
  ``mojito shake``

Shaker accepts the following commands:
  - ``--context`` - Specify the context environment which Shaker will pick up
  - ``--run`` - After execute shaker, it will run the server (exactly as ``mojito start``)

If you don't specify a context, shaker will run picking the default configuration (``[master]``).

Let's assume that we run ``mojito shake --context "environment:test" --run``. This will make Shaker generate local rollups and then start the server. Shaker will take the following steps:

  1. It will analyze all your application files, looking for Mojits and within mojits all autoloads, assets, binders, views...
  2. It will compute all the dependencies for binders, all the dimensions for assets and generate metadata information,
  3. It will take the previous metadata, concatenate, minify, and write the rollups either to local or to the cdn.
  4. It will write the metadata file as a compiled autoload, which will contain all the generated rollup paths. This file will be picked automatically on runtime.

Everything spin around this metadata file. Let's see how this file looks like for our app:

**Example: shaker-meta.common.js**

.. code-block:: js
  :emphasize-lines: 3,6-7,20-21,45

  YUI.add("shaker/metaMojits", function(Y, NAME) {
  YUI.namespace("_mojito._cache.shaker");
  YUI._mojito._cache.shaker.meta =
  {
    "mojits": {
      "master": {
        "*": {
          "shaken": {
            "common": ["/static/demo/assets/compiled/master_default_c75fe0cbaaf623aea7be93e50b7f3c7f.css"],
            "common-*-smartphone-grey": ["/static/demo/assets/compiled/master_default_c7073a85504c3e292c97c059222cc051.css"],
            "common-*-device-grey-region-lang": ["/static/demo/assets/compiled/master_default_b347e1cf67ee4b5520442825ce61f26c.css"],
            ...
          },
          "client": ["/static/demo/assets/compiled/master_89d0110765d6c92d517b3bab39407c9a.client.js"],
          "meta": {
            ...
          }
        }
      },
      "primary": {
        "index": {
          "shaken": {
            "common": ["/static/demo/assets/compiled/primary_index_9eee7d6bfbc2d41a0d57ae90ff40f61a.css"],
            "common-index-device-grey-CA-lang": ["/static/demo/assets/compiled/primary_index_e1100f2ae51bde147e1dad91b3be2b70.css"],
            "common-index-device-grey-region-lang": ["/static/demo/assets/compiled/primary_index_1566cfc15fd5fc2b6add48f6d33291db.css"],
            "common-index-device-skin-CA-lang": ["/static/demo/assets/compiled/primary_index_04cb930f6f9e7f1af6879d96dd2f82ee.css"],
          },
          "client": [
            "/static/demo/assets/compiled/primary_d3d36e4c5173cb91aae507cf5ecb2ef8.client.js"
          ],
          "meta": {
            "client": {
              "models": [],
              "controllers": ["/path/to/app/demo/mojits/primary/controller.common.js"],
              "binders": ["/path/to/app/demo/mojits/primary/binders/index.js"],
              "views": [
                "/path/to/app/demo/mojits/primary/views/dynamic.mu.html",
                "/path/to/app/demo/mojits/primary/views/index.mu.html"
              ],
              "dependencies": []
            }
          }
        }
      },
      "secondary": {
        "*": {
          "shaken": {
            "common": ["/static/demo/assets/compiled/secondary_default_d139d9b8eb6d55219f3ee0f9fdabd7e2.css"
            ...
    "core": [
      "/static/demo/assets/compiled/core_54287af0374120fd75a3d7251d66eb90.common.js"
    ],
    "images": [
      ...
    ],
    "config": {
      ...
    }
  }});

As you can see for each mojit and for each possible combination, Shaker generated a rollup. Shaker signs the rollup with MD5 to avoid committing the same file twice. Moreover, Shaker generates the Mojito core rollup for you and also all the client side rollup (if your app is set to deploy:true).

During development, you may want to know what exactly gets included in every rollup. To do that, just run shaker in dev mode: ``mojit shake``

**Developer context shaker-meta.common.js**

.. code-block:: js

    YUI.add("shaker/metaMojits", function(Y, NAME) {
    YUI.namespace("_mojito._cache.shaker");
    YUI._mojito._cache.shaker.meta =
    {
        "mojits": {
            "master": {
                "*": {
                    "shaken": {
                        "common": [
                            "/static/master/assets/common/master.css"
                        ],
                        "common-*-smartphone": [
                            "/static/master/assets/common/master.css",
                            "/static/master/assets/device/smartphone/master-smartphone.css"
                        "common-*-smartphone-grey": [
                            "/static/master/assets/common/master.css",
                            "/static/master/assets/device/smartphone/master-smartphone.css",
                            "/static/master/assets/skin/grey/master-grey.css"
                        ],
                        "common-*-smartphone-skin": [
                            "/static/master/assets/common/master.css",
                            "/static/master/assets/device/smartphone/master-smartphone.css"
                        ],
                        "common-*-smartphone-grey-region-lang": [
                            "/static/master/assets/common/master.css",
                            "/static/master/assets/device/smartphone/master-smartphone.css",
                            "/static/master/assets/skin/grey/master-grey.css"
                        ],
                        ...
                    },
                    "client": [
                        "/path/to/app/demo/mojits/master/controller.common.js",
                        "/path/to/app/demo/mojits/master/views/index.mu.html"
                    ],
                    "meta": {
                       ...
                    }
                }
            },
            "primary": {
                "index": {
                    "shaken": {
                        "common": [
                            "/static/primary/assets/common/primary.css"
                        ],
                        ...
                        "common-index-device-grey-CA": [
                            "/static/primary/assets/common/primary.css",
                            "/static/primary/assets/skin/grey/primary-grey.css",
                            "/static/primary/assets/region/CA/primary-CA.css"
                        ],

                        "common-index-device-skin-CA-lang": [
                            "/static/primary/assets/common/primary.css",
                            "/static/primary/assets/region/CA/primary-CA.css"
                        ],
                        ...
                    },
                    "client": [
                        "/path/to/app/demo/mojits/primary/controller.common.js",
                        "/path/to/app/demo/mojits/primary/binders/index.js",
                        "/path/to/app/demo/mojits/primary/views/dynamic.mu.html",
                        "/path/to/app/demo/mojits/primary/views/index.mu.html"
                    ],
                    "meta": {
                    }
                }
            },
            "secondary": {
                "index": {
                    "shaken": {
                        "common": [
                            "/static/secondary/assets/common/secondary.css"
                        ],
                        ...
                        "common-index-smartphone-grey-region": [
                            "/static/secondary/assets/common/secondary.css",
                            "/static/secondary/assets/device/smartphone/secondary-smartphone.css",
                            "/static/secondary/assets/skin/grey/secondary-grey.css"
                       ],
                       ...
                        "common-index-device-skin-CA-lang": [
                            "/static/secondary/assets/common/secondary.css",
                            "/static/secondary/assets/region/CA/secondary-CA.css"
                        ],
                        "common-index-device-skin-region-lang": [
                            "/static/secondary/assets/common/secondary.css"
                        ]
                    },
                    "client": [
                        "/path/to/app/demo/mojits/secondary/controller.common.js",
                        "/path/to/app/demo/mojits/secondary/binders/index.js",
                        "/path/to/app/demo/mojits/secondary/views/index.mu.html"
                    ],
                    "meta": {
                       ...
                    }
                }
            },
        "core": [
            "/Users/diegof/node_modules/mojito/lib/app/addons/ac/analytics.common.js",
            "/Users/diegof/node_modules/mojito/lib/app/addons/ac/assets.common.js",
            ...
            "/Users/diegof/node_modules/mojito/lib/app/autoload/view-renderer.common.js"
        ],
        "images": [
            "/path/to/app/demo/assets/favicon.ico",
            ...
        ],
        "config": {
            ...
        }
    }});

You can see which files will be picked up for each dimension combination, and also which files will be picked up on the client side.

.. note:: By default, every mojit will require two requests, one for the CSS rollup, and another for all the JS. You could improve the number of requests by bundling mojits together. It's what we call "High coverage mojits". In order to do that, you will have to create a ``shaker.json`` configuration file at the application level. For more information, read the Advanced Configuration.


Runtime
----------
At runtime, the normal workflow happens in mojito until the execution reach the ShakerHTMLFrame. THen our Shaker addon gets executed, looks at the context, determines which dimensions match the request, and serves the most appropriate rollup to the client. So if the context of a request is set to ``region:CA`` and ``device:smartphone``, Shaker will pick the rollup for those dimensions and attach it to the page.

.. note:: To create custom dimensions (not built in mojit) you will have to set the value of that dimension at runtime. In this example, "skin" is picked from the url and passed to the context so Shaker can know which value to pick up.

Shaker also allows you to bundle css rollups at the application level. In this example we have some boilerplate css which belongs to the application level and gets shared among all mojits.
