/*jslint nomen:true, forin: true, continue: true */

var Y = require('yui').YUI({useSync: true}).use('base-base'),
    libfs = require('fs'),
    libstore = require('mojito/lib/store.js'),
    DEFAULT_RESOURCES = {
        "assets": {
            js: true,
            css: true
        },
        "controllers": true,
        "binders": true,
        "views": true,
        "langs": true,
        "mojito": true
    };

function ShakerResources(context) {
    'use strict';
    this.cwd = process.cwd();
    this.store = this._makeStore({
        root: this.cwd,
        context: context
    });


    this.context = context;
    this.shakerConfig = this._getShakerConfig(context);
    this.organizedResources = {
        mojito: {},
        app: {}
    };
    this.appResources = {};
    this.loaderResources = {};

    this._getResources();
}

ShakerResources.prototype = {

    resolveResourceVersions: function (resourcesMap) {
        'use strict';
        // empty appModulesDetails to prevent warning messages
        this.store.yui.appModulesDetails = {};
        this.store.resolveResourceVersions(resourcesMap);
    },

    getLoaderResources: function () {
        'use strict';
        var ress,
            m,
            mojit,
            mojits = [],
            yuiModules = this.store.yui.getYUIURLDetails(),
            seedModules,
            moduleRess = {};

        //mojito doesnt provide default lang in build time.
        this.context.lang = this.context.lang || 'en';
        seedModules = this.store.yui.getAppSeedFiles(this.context);

        function processRess(ress) {
            var r,
                res;
            for (r = 0; r < ress.length; r += 1) {
                res = ress[r];
                if (res.type === 'view') {
                    res.yui = {name: res.url};
                    moduleRess[res.url] = res;
                }
                if ('common' !== res.affinity.affinity) {
                    continue;
                }
                if (res.yui && res.yui.name) {
                    moduleRess[res.yui.name] = res;
                }
            }
            for (r = 0; r < ress.length; r += 1) {
                res = ress[r];
                if ('client' !== res.affinity.affinity) {
                    continue;
                }
                if (res.yui && res.yui.name) {
                    moduleRess[res.yui.name] = res;
                }
            }
        }

        ress = this.store.getResourceVersions({});
        processRess(ress);

        mojits = this.store.listAllMojits();
        mojits.push('shared');
        for (m = 0; m < mojits.length; m += 1) {
            mojit = mojits[m];
            ress = this.store.getResourceVersions({mojit: mojit});
            processRess(ress);
        }

        for (m = 0; m < seedModules.length; m += 1) {
            ress = yuiModules[seedModules[m]];

            if (ress) {
                moduleRess[seedModules[m]] = ress;
            }
        }

        // get loader resources
        for (m in moduleRess) {
            ress = moduleRess[m];
            // only add loader resources
            if (m.indexOf("loader") === 0) {
                // TODO how to filter out loaders if langs if off
                /*// skip loader if langs is off
                // or lang is a locale string but the resource is of a different locale
                if (!this.shakerConfig.resources.langs ||
                    (Y.Lang.isString(this.shakerConfig.resources.langs) &&
                    ress.url.indexOf("_") !== -1 && ress.url.indexOf(this.shakerConfig.resources.langs) === -1)) {
                    continue;
                }*/
                ress.type = "loader";
                this.loaderResources[m] = this._addResource(ress, "js");

            }
        }
        return this.loaderResources;
    },

    _addResource: function (rawResource, subtype) {
        'use strict';
        var self = this,
            resource = this.appResources[rawResource.url];

        if (resource) {
            return resource;
        }

        resource = {
            basename: rawResource.source.fs.basename,
            url: rawResource.url,
            path: rawResource.source.fs.fullPath,
            relativePath: rawResource.source.fs.fullPath.replace(self.cwd, "."),
            type: rawResource.type,
            subtype: subtype,
            selector: rawResource.selector
        };

        if (rawResource.subtype === "synthetic") {
            resource.read = function (callback) {
                self.store.getResourceContent(self.store.makeStaticHandlerDetails(rawResource), function (err, content) {
                    resource.content = content.toString();
                    callback(err);
                });
            };
        } else {
            resource.read = function (callback) {
                libfs.readFile(resource.path, 'utf8', function (err, content) {
                    resource.content = content;
                    callback(err);
                });
            };
        }

        this.appResources[rawResource.url] = resource;
        return resource;
    },

    _getResources: function () {
        'use strict';
        var self = this,
            mojits = self._getMojits(),
            contexts = self._getContexts(),
            shakenMojit = {},
            shakenApp = {},
            poslVisited = {};

        function getDependencies(resource) {
            var dependencies = {},
                dependency,
                dependencyUrl;

            if (resource.dependencies) {
                return resource.dependencies;
            }
            for (dependencyUrl in resource.requires) {
                dependency = resource.requires[dependencyUrl];
                dependencies[dependency.url] = dependency;
                dependencies = Y.merge(dependencies, getDependencies(dependency));
            }
            return dependencies;
        }

        function storeYUIModule(rawResource, yuiResources) {
            var module,
                resource,
                i,
                requiredResourceName,
                requiredResource;


            if (self.appResources[rawResource.url]) {
                return self.appResources[rawResource.url];
            }

            resource = self._addResource(rawResource, "js");
            resource.requires = {};

            try {
                module = self.store.yui._makeYUIModuleConfig('client', rawResource); // TODO: try catch
            } catch (e) {
                return resource;
            }

            for (i in module.requires) {
                requiredResourceName = module.requires[i];
                requiredResource = yuiResources[requiredResourceName];
                if (requiredResource) {
                    resource.requires[requiredResource.url] = self.appResources[requiredResource.url] ||
                        storeYUIModule(requiredResource, yuiResources);
                }
            }

            resource.dependencies = getDependencies(resource);
            return resource;
        }

        function addMojitResources(mojit, shakenMojit, poslStr) {
            var resource,
                mojitResources = {},
                controllerResources = [],
                d,
                b,
                a,
                l,
                langs = [],
                dependencies,
                rawResource,
                action,
                assetAction,
                pathArray,
                containingDir;

            // Get view resources
            for (action in shakenMojit.actions) {
                mojitResources[action] = {};
                if (!Y.Object.isEmpty(shakenMojit.assets)) {
                    mojitResources[action].assets = {};
                }
                if (shakenMojit.clientAffinity && shakenMojit.views[action]) {
                    rawResource = shakenMojit.views[action];
                    resource = self._addResource(rawResource, "html");
                    mojitResources[action].view = resource;
                }
            }

            // Get controller resources
            if (!Y.Object.isEmpty(shakenMojit.controller)) {
                rawResource = shakenMojit.controller;
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                resource = storeYUIModule(rawResource, shakenMojit.yuiResources);
                for (action in shakenMojit.actions) {
                    mojitResources[action].controller = resource;
                }
            }

            // Get binder resources
            for (b in shakenMojit.binders) {
                rawResource = shakenMojit.binders[b];
                action = rawResource.name;
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                resource = storeYUIModule(rawResource, shakenMojit.yuiResources);
                // TODO: name of binder potentially does not have correponding view?
                mojitResources[action] = mojitResources[action] || {};
                mojitResources[action].binder = resource;
            }

            // Get lang resources
            if (shakenMojit.clientAffinity) {
                for (l in shakenMojit.langs) {
                    rawResource = shakenMojit.langs[l];
                    resource = storeYUIModule(rawResource, shakenMojit.yuiResources);
                    langs.push(resource);
                }
                for (action in shakenMojit.actions) {
                    mojitResources[action].langs = langs;
                }
            }

            // Get assets resources
            // only get assets if specified in the config
            if (self.shakerConfig.resources && self.shakerConfig.resources.assets) {
                for (a in shakenMojit.assets) {
                    rawResource = shakenMojit.assets[a];

                    assetAction = null;
                    for (action in shakenMojit.actions) {
                        // check if the asset belongs to a specific action
                        if (rawResource.name.indexOf(action) === 0) {
                            assetAction = action;
                            break;
                        }
                    }

                    resource = self._addResource(rawResource, rawResource.subtype);

                    pathArray = resource.path.split("/");
                    containingDir = pathArray[pathArray.length - 2];

                    // determine if resource is not to be inclucded

                    // make resource inline if specified by config or name
                    if (resource.basename.indexOf("-void") !== -1 || containingDir.indexOf("void") !== -1) {
                        continue;
                    }

                    if (resource.basename.indexOf("-inline") !== -1 || containingDir.indexOf("inline") !== -1
                            || ((resource.subtype === "css" && self.shakerConfig.resources.assets.css === "inline")
                            || (resource.subtype === "js" && self.shakerConfig.resources.assets.js === "inline"))) {
                        resource.inline = true;
                    }

                    if (assetAction) {
                        mojitResources[assetAction].assets[resource.subtype] = mojitResources[assetAction].assets[resource.subtype] || {};
                        mojitResources[assetAction].assets[resource.subtype][rawResource.url] = resource;
                    } else {
                        for (action in shakenMojit.actions) {
                            mojitResources[action].assets[resource.subtype] = mojitResources[action].assets[resource.subtype] || {};
                            mojitResources[action].assets[resource.subtype][rawResource.url] = resource;
                        }
                    }
                }

                // sort assets for each action
                for (action in mojitResources) {
                    self._sortAssets(mojitResources[action].assets);
                }
            }

            self.organizedResources.app[poslStr].mojits[mojit] = mojitResources;
        }

        Y.Array.each(contexts, function (context) {
            var posl = self._getPOSLFromContext(context),
                poslStr = posl.join("-");

            if (poslVisited[poslStr]) {
                return;
            }

            self.organizedResources.app[poslStr] = {
                app: {},
                mojits: {}
            };

            Y.Array.each(mojits, function (mojit) {
                shakenMojit = self._shakeMojit(mojit, context);
                addMojitResources(mojit, shakenMojit, poslStr);
            });

            self._shakeApp(context, poslStr);

            poslVisited[poslStr] = true;
        });

        self._shakeMojito();
    },

    _getContexts: function () {
        'use strict';
        return this.store.selector._listUsedContexts();
    },

    _getMojits: function () {
        'use strict';
        return this.store.listAllMojits();
    },

    _getPOSLFromContext: function (context) {
        'use strict';
        return this.store.selector.getPOSLFromContext(context);
    },

    _makeStore: function (cfg) {
        'use strict';
        process.shakerCompiler = true;
        return libstore.createStore(cfg);
    },

    _getShakerConfig: function (context) {
        'use strict';
        var appConfig = this.store.getAppConfig(context || {}),
            shakerConfig = appConfig.shaker || {};

        // set default resources
        shakerConfig.resources = shakerConfig.resources === false ? false : shakerConfig.resources || {};
        if (shakerConfig.resources) {
            shakerConfig.resources = shakerConfig.resources === true || shakerConfig.resources === null ?
                    {} : shakerConfig.resources;
            // if there is no location and no tasks then only the assets resources are necessary
            if (!shakerConfig.tasks && !shakerConfig.locations) {
                shakerConfig.resources = {
                    assets: shakerConfig.resources.assets
                };
                shakerConfig.resources.assets = shakerConfig.resources.assets === false ? false : shakerConfig.resources.assets || {};
                Y.mix(shakerConfig.resources.assets, DEFAULT_RESOURCES.assets, false, null, 0, true);
            } else {
                Y.mix(shakerConfig.resources, DEFAULT_RESOURCES, false, null, 0, true);
            }
        }

        shakerConfig.app = {
            appName: this.store.url.config.appName,
            prefix: this.store.url.config.prefix
        };
        return shakerConfig;
    },

    _getStoreConfigs: function (context) {
        'use strict';
        var appConfig = this.store.getAppConfig(context);

        return {
            prefix: this.store.url.config.prefix,
            appName: appConfig.staticHandling.appName,
            context: context || {}
        };
    },

    _shakeMojito: function () {
        'use strict';
        var rawResources,
            rawResource,
            resource,
            i;

        if (!this.shakerConfig.resources || !this.shakerConfig.resources.mojito) {
            return;
        }

        rawResources = this.store.getResourceVersions({mojit: 'shared'});

        for (i in rawResources) {
            rawResource = rawResources[i];
            if ((rawResource.source.pkg.name === 'mojito' || rawResource.source.pkg.name === 'mojito-shaker') &&
                    (rawResource.affinity.affinity === 'common' || rawResource.affinity.affinity === 'client') &&
                    rawResource.source.fs.ext === '.js') {
                resource = resource = this._addResource(rawResource, "js");

                this.organizedResources.mojito[rawResource.url] = resource;
            }
        }
    },

    // takes a list of resources and returns only those that match a context
    _filterResourceVersionsByContext: function (ctx, ress) {
        'use strict';
        var posl = this._getPOSLFromContext(ctx),
            bySelector = {},    // selector: id: resource
            out = {},           // id: resource
            r,
            res,
            s,
            selector;
        for (r = 0; r < ress.length; r += 1) {
            res = ress[r];
            if (!bySelector[res.selector]) {
                bySelector[res.selector] = {};
            }
            bySelector[res.selector][res.id] = res;
        }
        for (s = posl.length; s > 0; s -= 1) {
            selector = posl[s - 1];
            for (r in bySelector[selector]) {
                if (bySelector[selector].hasOwnProperty(r)) {
                    out[r] = bySelector[selector][r];
                }
            }
        }
        return Y.Object.values(out);
    },

    _shakeMojit: function (mojitName, context) {
        'use strict';
        var self = this,
            rawResources,
            yuiResources, //transform yui modules on a hash object using key as yui-name
            mojitResources = {
                clientAffinity: false,
                actions: {},
                binders: {},
                langs: {},
                assets: {},
                views: {}
            };

        if (!self.shakerConfig.resources) {
            return mojitResources;
        }

        function getMojitResourcesByContext(mojitName, ctx) {
            var mojitResources = self.store.getResourceVersions({mojit: mojitName}),
                mojitResourcesFilterIterator = function (item) {
                    //remove mojito Framework + shared (app level) assets
                    return !(item.source.pkg.name === 'mojito' || item.source.pkg.name === 'mojito-shaker' ||
                        (item.mojit === 'shared' && item.type === 'asset')) &&
                        (item.affinity.affinity === 'common' || item.affinity.affinity === 'client');
                },
                sharedResources = self.store.getResourceVersions({mojit: 'shared'}),
                sharedResourcesFilterIterator = function (item) {
                    return !(item.source.pkg.name === 'mojito' || item.source.pkg.name === 'mojito-shaker' ||
                        item.type === 'asset') &&
                        (item.affinity.affinity === 'common' || item.affinity.affinity === 'client');
                };

            // Return the resources in the "shared" mojit too, since Mojito considers those as part of each mojit.
            mojitResources = mojitResources.filter(mojitResourcesFilterIterator);
            mojitResources = self._filterResourceVersionsByContext(ctx, mojitResources);
            sharedResources = sharedResources.filter(sharedResourcesFilterIterator);
            sharedResources = self._filterResourceVersionsByContext(ctx, sharedResources);
            return sharedResources.concat(mojitResources);
        }

        rawResources = getMojitResourcesByContext(mojitName, context);

        function getYUIModuleNamesFromResources(rawResources) {
            var cleanList = {};
            rawResources.forEach(function (item, key) {
                if (item.yui && item.yui.name) {
                    cleanList[item.yui.name] = item;
                }
            });
            return cleanList;
        }

        mojitResources.yuiResources = getYUIModuleNamesFromResources(rawResources);

        function matchDependencies(sortedNeededYui, yuiModules) {
            var matched = {};
            Y.Array.each(sortedNeededYui, function (name, index) {
                if (yuiModules[name]) {
                    matched[name] = yuiModules[name];
                }
            });
            return matched;
        }

        // group all dependencies
        rawResources.forEach(function (rawResource) {
            if (rawResource.mojit === "shared") {
                return;
            }
            switch (rawResource.type) {
            case 'controller':
                // determine affinity from controller
                mojitResources.clientAffinity = true;
                // we create some properties due to the way _precomputeYUIDependencies works.
                if (self.shakerConfig.resources.controllers) {
                    mojitResources.controller = rawResource;
                }
                break;
            case 'view':
                mojitResources.actions[rawResource.name] = true; // capture the mojit actions
                if (self.shakerConfig.resources.views) {
                    mojitResources.views[rawResource.url] = rawResource;
                }
                break;
            case 'binder':
                if (self.shakerConfig.resources.binders) {
                    mojitResources.binders[rawResource.url] = rawResource;
                }
                break;
            case 'asset':
                if (self.shakerConfig.resources.assets &&
                        ((rawResource.subtype === "js" && self.shakerConfig.resources.assets.js) ||
                        (rawResource.subtype === "css" && self.shakerConfig.resources.assets.css))) {
                    mojitResources.assets[rawResource.url] = rawResource;
                }
                break;
            case 'yui-lang':
                // TODO: langs
                if (self.shakerConfig.resources.langs === true) {
                    mojitResources.langs[rawResource.url] = rawResource;
                }
                break;
            }
        });

        return mojitResources;
    },

    _sortAssets: function (assets) {
        'use strict';
        Y.Object.each(assets, function (typeAssets, type) {
            var sortedKeys = Object.keys(typeAssets).sort();
            Y.Array.each(sortedKeys, function (key) {
                var asset = typeAssets[key];
                delete typeAssets[key];
                typeAssets[key] = asset;
            });
        });
    },

    _shakeApp: function (context, poslStr) {
        'use strict';
        var self = this,
            appResources,
            assets = {},
            i,
            rawResource,
            resource,
            pathArray,
            containingDir;

        // dont add app assets if specified by config
        if (!self.shakerConfig.resources || !self.shakerConfig.resources.assets) {
            self.organizedResources.app[poslStr].app = assets;
            return;
        }

        function getAppResourcesByContext(context, poslStr) {
            var rawResources = self.store.getResourceVersions({mojit: 'shared'}),
                appResourcesFilterIterator = function (item) {
                    //remove mojito Framework + app autoloads (included in the mojits already)
                    return item.source.pkg.name !== 'mojito' && item.type !== 'yui-module' &&
                        (item.affinity.affinity === 'common' || item.affinity.affinity === 'client');
                };
            rawResources = rawResources.filter(appResourcesFilterIterator);
            return self._filterResourceVersionsByContext(context, rawResources);
        }

        appResources = getAppResourcesByContext(context);

        for (i in appResources) {
            rawResource = appResources[i];
            // get asset type resources and ignore resources under assets/compiled
            // skip type of resource as specified by config
            if (rawResource.type === 'asset' && rawResource.source.fs.fullPath.indexOf("assets/compiled") === -1 &&
                    ((rawResource.subtype === "js" && self.shakerConfig.resources.assets.js) ||
                    (rawResource.subtype === "css" && self.shakerConfig.resources.assets.css))) {
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                resource = self._addResource(rawResource, rawResource.subtype);

                pathArray = resource.path.split("/");
                containingDir = pathArray[pathArray.length - 2];

                // determine if resource is not to be inclucded

                // make resource inline if specified by config or name
                if (resource.basename.indexOf("-void") !== -1 || containingDir.indexOf("void") !== -1) {
                    continue;
                }

                if (resource.basename.indexOf("-inline") !== -1 || (resource.subtype === "css" && self.shakerConfig.resources.assets.css === "inline")
                                                       || (resource.subtype === "js" && self.shakerConfig.resources.assets.js === "inline")
                                                       || containingDir.indexOf("inline") !== -1) {
                    resource.inline = true;
                }
                assets[rawResource.subtype] = assets[rawResource.subtype] || {};
                assets[rawResource.subtype][rawResource.url] = resource;
            }
        }

        // sort and add assets
        self._sortAssets(assets);
        self.organizedResources.app[poslStr].app = assets;
    }
};

exports.ShakerResources = ShakerResources;