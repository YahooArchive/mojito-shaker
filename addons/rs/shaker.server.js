YUI.add('addon-rs-shaker', function (Y, NAME) {

    var libpath = require('path'),
        libfs = require('fs'),
        self;

    function RSAddonShaker() {
        RSAddonShaker.superclass.constructor.apply(this, arguments);
    }

    RSAddonShaker.NS = 'shaker';
    RSAddonShaker.ATTRS = {};

    Y.extend(RSAddonShaker, Y.Plugin.Base, {

        initializer: function (config) {
            self = this;
            this.rs = config.host;
            this._poslCache = {};   // context: POSL
            this.appRoot = config.appRoot;
            this.mojitoRoot = config.mojitoRoot;
            this.appConfig = config.host.getStaticAppConfig() || {};
            //this.shakerConfig = this.appConfig.shaker || {};

            var yuiRS = this.rs.yui,
                store = this.rs,
                shakerConfig = this.shakerConfig;

            // Augments the view with assets
            if (!process.shakerCompiler) {
                if (!this.initilized) {
                    //first read the shaker metadata
                    this.meta = this.rs.config.readConfigSimple(libpath.join(this.appRoot, 'shaker-meta.json'));

                    // TODO: handle no shaker-meta.json
                    if (this.meta && !Y.Object.isEmpty(this.meta)) {
                        Y.log('Metadata loaded correctly.', 'info', 'Shaker');
                        Y.log('Preloading store', 'info', 'mojito-store');
                    } else {
                        this.meta = {};
                        Y.log('Metadata not found.', 'warn', 'Shaker');
                    }
                }

                // get settings
                // TODO: validate settings
                // TODO: remove default settings
                this.meta.settings = this.appConfig.shaker && this.appConfig.shaker.settings || {
                    "serveLocation": "default",
                    "inline": false,
                    "serveJs": {
                        "combo": false,
                        "position": "bottom"
                    },
                    "serveCss": {
                        "position": "top",
                        "combo": false
                    }
                };
                // get location
                this.meta.currentLocation = this.meta.locations && this.meta.locations[this.meta.settings.serveLocation];

                // if the current location is set to something other than default
                // hook into getAppConfig in order to set custom yui configuration

                if (this.meta.currentLocation) {
                    this.rs._appConfigCache = {};
                    this.beforeHostMethod('getAppConfig', this.getAppConfig, this);
                }

                // populate meta data with app and rollup resources for each posl
                if (self.meta.app) {
                    var routes = self.meta.app["*"].rollups ? Y.Object.keys(self.meta.app["*"].rollups) : [];
                    Y.Object.each(self.meta.app, function (poslResources, poslStr) {
                        var posl = poslStr.split("-");
                        poslResources.app = poslResources.app || {};
                        poslResources.app.assets = self._positionResources(self.getAppResources(self.meta, posl));
                        Y.Array.each(routes, function (route) {
                            poslResources.rollups = poslResources.rollups || {};
                            poslResources.rollups[route] = self.getRollupResources(self.meta, posl, route);
                            var typeResources = {};
                            typeResources.js = poslResources.rollups[route].js && poslResources.rollups[route].js.rollups || [];
                            typeResources.css = poslResources.rollups[route].css && poslResources.rollups[route].css.rollups || [];
                            poslResources.rollups[route].assets = self._positionResources(typeResources);
                        });
                    });

                    this.onHostEvent('resolveMojitDetails', this.resolveMojitDetails, this);
                }
            }
            this.beforeHostMethod('resolveResourceVersions', this.resolveResourceVersions, this);


        },

        _positionResources: function (resources) {
            var positionedResources = {
                top: {},
                shakerTop: {},
                bottom: {}
            },
            shakerResources = {},
            shakerInline = {},
            resource;

            // separate inline resources
            // dont separate inline resources if no inline resources or no current location
            // allow inline if default location with inline specified
            if (!Y.Object.isEmpty(self.meta.inline) && self.meta.settings.inline) {
                Y.Object.each(resources, function (typeResources, type) {
                    shakerResources[type] = [];

                    if (!self.meta.settings.serveCss && type === "css" ||
                        !self.meta.settings.serveJs && type === "js") {
                        return;
                    }

                    shakerInline[type] = {
                        blob: []
                    };
                    Y.Array.each(typeResources, function (resource) {
                        if (self.meta.inline[resource] !== undefined) {
                            shakerInline[type].blob.push(resource);
                        } else {
                            shakerResources[type].push(resource);
                        }
                    });
                });
                positionedResources.shakerInlineCss = shakerInline.css;
                positionedResources.shakerInlineJs = shakerInline.js;
            } else {
                shakerResources = resources;
            }

            // add css assets to proper position
            if (self.meta.settings.serveCss) {
                positionedResources[self.meta.settings.serveCss.position].css = shakerResources.css || [];
            }

            // add js assets to proper position
            if (self.meta.settings.serveJs) {
                positionedResources[self.meta.settings.serveJs.position].js = shakerResources.js || [];
            }
            return positionedResources;
        },

        getAppConfig: function (ctx) {
            var appConfig,
                key,
                ycb;

            ctx = this.rs.blendStaticContext(ctx);
            key = JSON.stringify(ctx || {});

            if (this.rs._appConfigCache[key]) {
                return JSON.parse(this.rs._appConfigCache[key]);
            }

            ycb = this.rs._appConfigYCB.read(ctx);
debugger;
            appConfig = Y.mojito.util.blend(this.rs._fwConfig.appConfigBase, this.rs._config.appConfig);
            appConfig = Y.mojito.util.blend(appConfig, ycb);

            Y.mix(appConfig.yui.config, self.meta.currentLocation.yuiConfig, true, null, 0, true);/*{
                "groups": {
                    "app": {
                        "base": "/",
                        "comboBase": "/combo~",
                        "comboSep": "~",
                        "combine": true,
                        "root": "/static/app1/assets/compiled/"
                    }
                }
            }, true, null, 0, true);*/

            this.rs._appConfigCache[key] = JSON.stringify(appConfig);

            return appConfig;
        },

        getMojitResources: function (meta, posl, mojit, action) {
            return this._getResources(posl, function (poslStr) {
                return meta.app[poslStr].mojits && meta.app[poslStr].mojits[mojit] && meta.app[poslStr].mojits[mojit][action];
            });
        },

        getAppResources: function (meta, posl) {
            return this._getResources(posl, function (poslStr) {
                return meta.app[poslStr].app;
            });
        },

        getRollupResources: function (meta, posl, route) {
            return this._getResources(posl, function (poslStr) {
                return meta.app[poslStr].rollups && meta.app[poslStr].rollups[route];
            });
        },

        _getResources: function (posl, getMetaResources) {
            // TODO remove resources type based on config/shaker runtime settings
            var poslStr = posl.join("-"),
                resources = {
                    css: null,
                    js: null
                },
                continueSearching = true,
                metaResources;

            // if posl does not exist in meta then use default
            // posl should always exist in meta to ensure a more general posl is used instead of just jumping to '*'
            poslStr = this.meta.app[poslStr] ? poslStr : "*";

            while (continueSearching) {
                // get app or mojit resources for the posl inside the metadata
                metaResources = getMetaResources(poslStr);
                if (metaResources) {
                    // assume metaResources contains all the type resources required
                    continueSearching = false;
                    Y.Object.each(resources, function (typeResources, type) {
                        // this resource has not been found
                        if (!typeResources) {
                            resources[type] = metaResources[type];
                        }
                        // type resource not found so must continue searching for it
                        if (!resources[type]) {
                            continueSearching = true;
                            return;
                        }
                    });
                }
                if (posl.length === 1) {
                    break;
                }
                // remove the minor selector from the posl and search within more general posl
                posl.splice(posl.length-2, 1);
                poslStr = posl.join('-');
            }
            // remove type resources if empty
            Y.Object.each(resources, function (typeResources, type) {
                if (!typeResources) {
                    //delete resources[type];
                    resources[type] = [];
                }
            });
            return resources;
        },

        /*
        * Change the URL's of the Store so we get the comboLoad from CDN.
        */
        resolveResourceVersions: function (urlMap) {
            var r,
                res,
                ress,
                m,
                mojit,
                mojits,
                meta,
                urls = {};

            urlMap = urlMap || this.meta && this.meta.currentLocation && this.meta.currentLocation.resources;

            if(!urlMap) {
                return;
            }

            //Iterate over all the resources
            mojits = this.rs.listAllMojits();
            mojits.push('shared');

            for (m = 0; m < mojits.length; m += 1) {
                mojit = mojits[m];

                ress = this.rs.getResourceVersions({mojit: mojit});
                for (r = 0; r < ress.length; r += 1) {
                    res = ress[r];
                    //Change the url
                    if (res.yui && urlMap[res.url]) {
                        res.url = urlMap[res.url];
                    }
                }
            }
        },

        /*
        * Augment the view spec with the Shaker computed assets.
        * Will be merged on the action-context module (either on the client or in the server).
        */
        resolveMojitDetails: function (e) {
            var mojit = e.args.type,
                views = e.mojitDetails.views,
                posl = e.args.posl,
                self = this;

            // skip mojits not in metadata
            if (!this.meta.app["*"].mojits[mojit]) {
                return;
            }

            Y.Object.each(views, function (view, action) {
                var resources = self.getMojitResources(self.meta, posl, mojit, action);

                view.assets = self._positionResources(resources);
            });

        }
    });

    RSAddonShaker.appResources = {};
    Y.namespace('mojito.addons.rs').shaker = RSAddonShaker;

}, '0.0.1', {
    requires: [
        'plugin',
        'oop',
        'addon-rs-url',
        'addon-rs-yui'
    ]
});
