
===================
Shaker App Example
===================

In order to understand better how Shaker works, we are going to create simple application from scratch, 
which will cover the basic features and some advanced configuration as well.

Application overview
#####################

.. image:: images/example_app.png
  :width: 700px
  :align: right

Our application will have three main Mojits:

- ``master`` - The "parent mojit", which will be the placeholder for the other mojits
- ``primary`` - Will contain the left part of our application.
- ``secondary`` - Will be the the right part of our application.

Each mojit will be sensible to a specific set of dimensions: 

- ``device``: default, smartphone
- ``region``:  default, CA
- ``skin``: default, gray, blue

This means that for example, if we are in a mobile device, for some mojits, 
we will want to load some different CSS or just add some style on top of our default baseplate. 
Also we wanna do the same with skins, regions and with all the possible combinations. 


Application structure
#####################

In this section we will analyze with detail every little piece of our application.

master mojit
------------

This mojit will be the placeholder for the other two mojits. Let's take a look to the controller and the view:

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

As you can see, we are not including manually any CSS and we don't have any logic at all in our controller. Shaker will take care of this on runtime regarding the current context.
Note as well that we have another controller action which will be used by the binder (explained on the next paragraph).


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

Also ``master`` will be sensible to some dimensions (skin:grey, device:smartphone), so this is how the assets structure looks like:

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

Note that there is a special dimension called ``common`` which basically acts as a css-base, and shares all his css among all other dimensions (we will see at the end how everything looks like). Basically the ``master-smartphone.css`` or ``master-grey.css`` will have some style override to change the baseplate style.


primary mojit
---------------

This mojit will be the left part of our application (you can see it in the picture). We are not going to show neither controller or view, since they don't contains anything really special more than the HTML template and some dummy data to populate it. 
What it is important to shaker is which assets our Mojit contains. In this case the mojit is sensible to region and skin:

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

Note here that the names of the files doesn't matter. Only the folder structure is important.

This mojit will contain a binder which will be deployed to the client to further communication using a different entry point.

**Binder: index.js** 
::

  bind: function (node) {
            Y.one('#call').on('click', this._executeInvoke, this);
        },
        _executeInvoke:function (evt) {
            this.mojitProxy.invoke('dynamic', Y.bind(this.resultInvoke, this));
        },
        resultInvoke:function () {
            //Note that no request have been made at this point.
        }

We are including this binder so you can see that how Shaker is doing the rollups with all the client side dependencies (if deploy is set to true).

secondary mojit
----------------

This mojit will be the right part of our application. Again we will focus on the assets structure, this mojit is sensible to all the previous dimensions:

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

The names of the files doesn't matter. Only the folder structure is important.


.. note:: Remember that here we are using the folder structure convention for the assets. Shaker also allows you to configure your assets anywhere,
 but then you will need to create a ``shaker.json`` file specifying you own convention (See the appropriate section). It's important to emphasize that in the future, Shaker will probably support another ways to setup your assets.

HTMLFrame mojit
---------------

Mojito uses an "HTMLFrame" to create the skeleton of the HTML and to embedded 
all your executed mojits ( See `Using HTML Frame Mojit <http://developer.yahoo.com/cocktails/mojito/docs/code_exs/htmlframe_view.html>`_)
Shaker will need to be executed within this HTMLFrame, so basically we create a copy of the original HTMLFrame and add the little pieces we need:

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

Basically we need shaker to be executed after analyze all the dependencies 
if the application is deployed to the client, and before the assets get passed to be included in the markup.

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

Now we understand the internals of our application, let's see how it behaves on build time and on runtime.

Build time
------------
Running shaker is really simple the only thing you have to do is execute the shaker command:
  ``mojito shake``

The parameters shaker accept are simple:
  - ``--context`` - Specify the context environment which Shaker will pick up
  - ``--run`` - After execute shaker, it will run the server (exactly as ``mojito start``)

If you don't specify a context, shaker will run picking the default configuration (``[master]``).

Let's assume that we run ``mojito shake --context "environment:test" --run`` which make Shaker generate local rollups and then start the server.
This is what's Shaker is going to do step by step:

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

As you can see for each mojit and for each possible combination, Shaker generated a rollup. 
Shaker will sign the rollup with MD5 to avoid committing the same file twice.
Moreover shaker will generate the mojito core rollup for you and also all the client side rollup (if your app is set to deploy:true).

If you re in development environment, maybe you want to know what exactly is getting pushed in every rollup. To do that, just run shaker in developer mode: ``mojit shake``

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

You can see which files will be picked for each dimension combination, and also which files will be picked for client side.

.. note:: By default, every mojit will require two requests, one for the CSS rollup, and other for all the JS. You could improve the number or request bundling some mojits together, It's that we call "High coverage mojits". In order to do that you will have to create a ``shaker.json`` configuration file at the application level. For more information read the Advanced Configuration.


Runtime
----------
On runtime, when a request came, the normal work-flow will happen in mojito until the execution reach the ShakerHTMLFrame. THen our Shaker addon gets executed,
and basically is going to look at the context, see which are matched dimensions, and serve the right rollup to the client.
So if the context in a request is set to ``region:CA`` and ``device:smartphone`` Shaker will pick the rollup for those dimensions and attach it to the page.

.. note:: To create your custom dimensions (not built in mojit) you will have to set the value on that dimensions on runtime. So in this example, skin is picked from the url and passed to the context so shaker can now which value to pick up.


Shaker will allows you to bundle also css rollup at application level. In this examples we have some boiler plate css which belongs to the application level, and get shared among all mojits.

Summary
-------------
Within this section we cover some basic and advanced features of Shaker, but still can do match more!
We encourage you to read all documentation, and checkout the demo and play with it in order to fully understand Shaker and it's components.

