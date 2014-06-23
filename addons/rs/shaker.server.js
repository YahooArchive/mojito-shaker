/*jslint nomen: true, regexp: true, plusplus: true */
YUI.add('addon-rs-shaker', function (Y, NAME) {
    'use strict';

    var METADATA_FILENAME = 'shaker-meta.json',
        DEFAULT_SETTINGS = {
            serveLocation: 'default',
            serveJs: {
                combo: false,
                position: 'top'
            },
            serveCss: {
                combo: false,
                position: 'top'
            },
            inline: true,
            optimizeBootstrap: true
        },
        libpath = require('path');

    function RSAddonShaker() {
        RSAddonShaker.superclass.constructor.apply(this, arguments);
    }

    RSAddonShaker.NS = 'shaker';
    RSAddonShaker.ATTRS = {};

    Y.extend(RSAddonShaker, Y.Plugin.Base, {

        initializer: function (config) {

            // do not use Shaker RS addon when running Shaker compiler
            if (process.shakerCompiler) {
                return;
            }

            this.rs = config.host;
            this.appRoot = config.appRoot;
            this.appConfig = config.host.getStaticAppConfig() || {};

            // initialize metadata
            // populate app and mojit level resources
            this._initializeMetadata();
            this._populateAppResources();

            if (this.meta.currentLocation) {
                // use own version of appConfigCache in order to modify appConfig only once per context
                this._appConfigCache = {};
                // hook into getAppConfig in order to merge the yui configuration with the location's default yui configuration
                this.afterHostMethod('getAppConfig', this.getAppConfig, this);
                // hook into yui._getAppSeedFiles in order to update the modules locations in the files returned
                this.afterHostMethod('resolveResourceVersions', this._hookGetAppSeedFiles, this);
                // hook into yui._makeYUIModuleConfig to ensure that the synthetic loader config contain the proper location paths
                this.rs.yui._makeYUIModuleConfig = this._makeYUIModuleConfig.bind(this);
                // hook into yui._processResources in order to update the url's of all application yui modules with their corresponding CDN url's.
                if (this.rs.yui._processResources) {
                    // Checking if rs.yui has a method processResources, for backward compatibility.
                    Y.Do.after(this._updateAppModuleUrls, this.rs.yui, '_processResources', this);
                }
            }
        },

        /**
         * Reads the metadata file and sets the settings and current location.
         */
        _initializeMetadata: function () {
            // read shaker metadata
            try {
                this.meta = this.rs.config.readConfigSimple(libpath.join(this.appRoot, METADATA_FILENAME));
            } catch (e) {
            }

            if (this.meta && !Y.Object.isEmpty(this.meta)) {
                Y.log('Metadata loaded correctly.', 'info', 'Shaker');
                Y.log('Preloading store', 'info', 'mojito-store');
            } else {
                this.meta = {};
                Y.log('Metadata not found.', 'warn', 'Shaker');
            }

            // initialize settings
            this.meta.settings = (this.appConfig.shaker && this.appConfig.shaker.settings) || {};
            // fill in missing settings with default
            this.meta.settings.serveJs = this.meta.settings.serveJs === undefined || this.meta.settings.serveJs === null || this.meta.settings.serveJs === true ?
                    {} : this.meta.settings.serveJs;
            this.meta.settings.serveCss = this.meta.settings.serveCss === undefined || this.meta.settings.serveCss === null || this.meta.settings.serveCss === true ?
                    {} : this.meta.settings.serveCss;
            Y.mix(this.meta.settings, DEFAULT_SETTINGS, false, null, 0, true);

            // set current location
            this.meta.currentLocation = this.meta.locations && this.meta.locations[this.meta.settings.serveLocation];

            // if there was a error uploading loaders then assets should be served by the app itself
            if (this.meta.currentLocation && this.meta.currentLocation.loaderError) {
                this.meta.currentLocation = null;
                this.rs.yui.staticHandling.serveYUIFromAppOrigin = true;
            }
            this.meta.currentLocationName = this.meta.currentLocation ? this.meta.settings.serveLocation : 'default';
        },

        /**
         * Reads the metadata file and sets the settings and current location.
         */
        _populateAppResources: function () {
            var routes,
                self = this;
            // the shaker meta data file is compressed such that resources are not duplicated
            // across posls. So all the posl need to be populated with their rollups and app level resources
            // mojit level resources are not populated since they are retrieved through @resolveMojitDetails
            if (self.meta.app) {
                routes = self.meta.app['*'].rollups ? Y.Object.keys(self.meta.app['*'].rollups) : [];
                Y.Object.each(self.meta.app, function (poslResources, poslStr) {
                    var posl = poslStr.split('-');
                    poslResources.app = poslResources.app || {};
                    poslResources.app.assets = self._positionResources(self._getAppResources(self.meta, posl));
                    // dont add rollups if no current location
                    if (!self.meta.currentLocation) {
                        return;
                    }
                    Y.Array.each(routes, function (route) {
                        var typeResources = {};
                        poslResources.rollups = poslResources.rollups || {};
                        poslResources.rollups[route] = self._getRollupResources(self.meta, posl, route);
                        typeResources.js = (poslResources.rollups[route].js && poslResources.rollups[route].js.rollups) || [];
                        typeResources.css = (poslResources.rollups[route].css && poslResources.rollups[route].css.rollups) || [];
                        // filter out rollups that are not found in the current location
                        Y.Array.each(['js', 'css'], function (type) {
                            var i,
                                typeResource;
                            for (i = 0; i < typeResources[type].length; i++) {
                                typeResource = typeResources[type][i];
                                if (!self.meta.currentLocation.resources[typeResource]) {
                                    delete typeResources[type];
                                    delete poslResources.rollups[route][type];
                                    break;
                                }
                            }
                        });
                        poslResources.rollups[route].assets = self._positionResources(typeResources);
                    });
                });

                this.onHostEvent('resolveMojitDetails', this.resolveMojitDetails, this);
            }
        },

        /**
         * Positions resources in their proper page position based on the settings
         * @param {object} resources Object containing resources group in arrays and organized
         * by type
         */
        _positionResources: function (resources) {
            var positionedResources = {
                    top: {},
                    shakerTop: {},
                    bottom: {}
                },
                shakerResources = {},
                shakerInline = {},
                resource,
                self = this;

            if (!resources) {
                return positionedResources;
            }

            // separate inline resources
            // dont separate inline resources if no inline resources or no current location
            // allow inline if default location with inline specified
            if (!Y.Object.isEmpty(self.meta.inline) && self.meta.settings.inline) {
                Y.Object.each(resources, function (typeResources, type) {
                    shakerResources[type] = [];

                    if ((!self.meta.settings.serveCss && type === 'css') ||
                            (!self.meta.settings.serveJs && type === 'js')) {
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

        /**
         * Gets a mojit's resources for a specific posl and action
         */
        _getMojitResources: function (meta, posl, mojit, action) {
            return this._getResources(posl, function (poslStr) {
                return meta.app[poslStr] && meta.app[poslStr].mojits && meta.app[poslStr].mojits[mojit] && meta.app[poslStr].mojits[mojit][action];
            });
        },

        /**
         * Gets app resources for a specific posl
         */
        _getAppResources: function (meta, posl) {
            return this._getResources(posl, function (poslStr) {
                return meta.app[poslStr] && meta.app[poslStr].app;
            });
        },

        /**
         * Gets rollup resources for a specific posl and route
         */
        _getRollupResources: function (meta, posl, route) {
            return this._getResources(posl, function (poslStr) {
                return meta.app[poslStr] && meta.app[poslStr].rollups && meta.app[poslStr].rollups[route];
            });
        },

        /**
         * Base function used to retrieve app, rollups, and mojit resources.
         * This function begins searching in the specified posl; if the resources is not found
         * in this posl, it continues searching by going in the less specific posl. This less
         * specific posl is determined by removing the highest priority selector form the posl array. This
         * selector is always the first selector. If the resource set is still not found, it continues
         * until it reaches the base posl ('*').
         * @param {array} posl The priority ordered selector list array.
         * @param {function} getMetaResources the function that retrieves a specific type of resource set.
         */
        _getResources: function (posl, getMetaResources) {
            // TODO remove resources type based on config/shaker runtime settings
            var poslStr = posl.join('-'),
                resources = {
                    css: null,
                    js: null
                },
                continueSearching = true,
                metaResources,
                type,
                typeResources;

            // if posl does not exist in meta then use default
            // posl should always exist in meta to ensure a more general posl is used instead of just jumping to '*'
            poslStr = this.meta.app[poslStr] ? poslStr : '*';

            while (continueSearching) {
                // get app or mojit resources for the posl inside the metadata
                metaResources = getMetaResources(poslStr);
                if (metaResources) {
                    // assume metaResources contains all the type resources required
                    continueSearching = false;
                    for (type in resources) {
                        if (resources.hasOwnProperty(type)) {
                            typeResources = resources[type];
                            // this resource has not been found
                            if (!typeResources) {
                                resources[type] = metaResources[type];
                            }
                            // type resource not found so must continue searching for it
                            if (!resources[type]) {
                                continueSearching = true;
                                break;
                            }
                        }
                    }
                }
                if (posl.length === 1) {
                    break;
                }
                // remove the highest priority selector from the posl and search within more general posl
                // first clone posl since the resource store may use it
                posl = Y.clone(posl);
                posl.splice(0, 1);
                poslStr = posl.join('-');
            }
            // remove type resources if empty
            for (type in resources) {
                if (resources.hasOwnProperty(type)) {
                    typeResources = resources[type];
                    if (!typeResources) {
                        //delete resources[type];
                        resources[type] = [];
                    }
                }
            }

            return resources;
        },

        /**
         * Hook into the store's getAppConfig function.
         * Gets the application configuration. This was copied from the resource store in order to
         * modify the yui config with the yui config of the cdn location
         */
        getAppConfig: function (ctx) {
            var key,
                modifiedAppConfig;

            ctx = this.rs.blendStaticContext(ctx);
            key = JSON.stringify(ctx || {});

            if (this._appConfigCache[key]) {
                return;
            }

            modifiedAppConfig = Y.Do.originalRetVal;
            // merge the application's yui config with the location's yui config, with precedence on the application's config
            modifiedAppConfig.yui = modifiedAppConfig.yui || {};
            modifiedAppConfig.yui.config = modifiedAppConfig.yui.config || {};
            Y.mix(modifiedAppConfig.yui.config, this.meta.currentLocation.yuiConfig, false, null, 0, true);

            this.rs._appConfigCache[key] = JSON.stringify(modifiedAppConfig);
            this._appConfigCache[key] = true;
            return Y.Do.AlterReturn(null, modifiedAppConfig);

        },

        /**
         * Hook into the store's resolveMojitDetails.
         * During server start time, mojito expands each mojit for each posl.
         * This function is used to set the mojit assets determined during compile time.
         */
        resolveMojitDetails: function (e) {
            var mojit = e.args.type,
                views = e.mojitDetails.views,
                posl = e.args.posl,
                self = this;

            // skip mojits not in metadata
            if (!this.meta.app['*'] || !this.meta.app['*'].mojits || !this.meta.app['*'].mojits[mojit]) {
                return;
            }

            Y.Object.each(views, function (view, action) {
                var resources = self._getMojitResources(self.meta, posl, mojit, action);
                view.assets = self._positionResources(resources);
            });
        },

        /**
         * Updates the url's of all application yui modules with their corresponding CDN url's.
         */
        _updateAppModuleUrls: function (ress) {
            var locationMap = this.meta.currentLocation.resources;
            Y.Array.each(ress, function (res) {
                if (!res.yui || !res.yui.name || !this.rs.yui.appModulesDetails[res.yui.name]) {
                    return;
                }
                var module = this.rs.yui.appModulesDetails[res.yui.name];
                if (locationMap[module.url]) {
                    module.actualUrl = locationMap[module.url];
                } else {
                    module.isLocal = true;
                    module.actualUrl = module.url;
                }
                module.url = res.yui.name;
            }.bind(this));
        },

        /**
         * Modifies the files returned by yui.getAppSeedFile to ensure that each module specified has the correct
         * basename of its new location.
         */
        _hookGetAppSeedFiles: function () {
            var locationMap = this.meta.currentLocation.resources,
                originalGetAppSeedFiles = this.rs.yui.getAppSeedFiles;

            // If rs.yui does not have a method processResources then we must process modules here,
            // for backward compatibility.
            if (!this.rs.yui._processResources) {
                Y.Object.each(this.rs.yui.appModulesDetails, function (module, name) {
                    if (locationMap[module.url]) {
                        //module.url = locationMap[module.url];
                        module.actualUrl = locationMap[module.url];
                    } else {
                        module.isLocal = true;
                        module.actualUrl = module.url;
                    }
                    module.url = name;
                });
            }

            this.rs.yui.getAppSeedFiles = function (ctx, yuiConfig) {
                var i = 0,
                    j,
                    appModules = [],
                    localModules = [],
                    module,
                    file,
                    files = originalGetAppSeedFiles.call(this, ctx, yuiConfig),
                    appGroupConfig = (yuiConfig.groups && yuiConfig.groups.app) || {};

                while (i < files.length) {
                    file = files[i];
                    if (file.indexOf(appGroupConfig.comboBase) === 0) {
                        file = file.substring(appGroupConfig.comboBase.length);
                        appModules = file.split(appGroupConfig.comboSep);
                        j = 0;
                        while (j < appModules.length) {
                            module = appModules[j].substring(appGroupConfig.root.length);
                            module = this.appModulesDetails[module];
                            if (module) {
                                if (module.isLocal) {
                                    localModules.push(module.actualUrl);
                                    appModules.splice(j, 1);
                                    continue;
                                } else {
                                    appModules[j] = appGroupConfig.root + module.actualUrl;
                                }
                            }
                            j++;
                        }
                        if (appModules.length > 0) {
                            files[i] = appGroupConfig.comboBase + appModules.join(appGroupConfig.comboSep);
                        } else {
                            files.splice(i, 1);
                            continue;
                        }
                    } else if (file.indexOf(appGroupConfig.base) === 0) {
                        module = file.substring(appGroupConfig.base.length);
                        module = this.appModulesDetails[module];
                        if (module) {
                            files[i] = appGroupConfig.base + module.actualUrl;
                        }
                    }
                    i++;
                }

                if (localModules.length > 0) {
                    files.push('/combo~' + localModules.join('~'));
                }

                return files;
            }.bind(this.rs.yui);
        },

        /**
         * Replaces yui._makeYUIModuleConfig to ensure that the synthetic loader configs contain the
         * the actual paths of the yui modules.
         */
        _makeYUIModuleConfig: function (env, res) {
            var locationMap = this.meta.currentLocation.resources,
                config = {
                    requires: (res.yui.meta && res.yui.meta.requires) || []
                };
            if ('client' === env) {
                // using relative path since the loader will do the rest
                if (locationMap[res.url]) {
                    config.path = locationMap[res.url];
                } else {
                    config.fullpath = res.url;
                    config.path = config.fullpath;
                }
            } else {
                config.fullpath = res.source.fs.fullPath;
            }
            return config;
        }
    });

    Y.namespace('mojito.addons.rs').shaker = RSAddonShaker;

}, '0.0.1', {
    requires: [
        'plugin',
        'oop',
        'addon-rs-url',
        'addon-rs-yui'
    ]
});
