/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/*jslint nomen:true, forin: true, continue: true, stupid: true */

var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUIFactory = require('mojito/lib/yui-sandbox.js'),
    libstore = require('mojito/lib/store.js'),
    libpath = require('path'),
    fs = require('fs'),
    bootstrap = require('./bootstrap/bootstrap.js'),
    YUI_ALIASES = require('./yui.js').ALIASES,
    DEFAULT_RESOURCES = {
        'controllers': true,
        'binders': true,
        'views': true,
        'langs': true,
        'modules': true,
        'assets': {
            js: true,
            css: true
        },
        'mojito': {
            'mojito-client': true
        },
        'yui': {
            'yui-bootstrap-override': true,
            'yui-base': true,
            'loader-base': true,
            'loader-yui3': true,
            'node': true,
            'yui-bootstrap-core': true
        },
        'bootstrap': true
    };

function ShakerResources(context, root, logger) {
    'use strict';
    this.logger = logger;
    this.cwd = process.cwd();
    this.root = root;

    this.store = this._makeStore({
        root: this.root,
        context: context,
        appConfig: {
            resourceStore: {
                lazyLangs: false,
                lazyMojits: false
            }
        }
    });

    this.context = context;
    this.shakerConfig = this._getShakerConfig(context);
    this.organizedResources = {
        app: {},
        mojito: {},
        yui: {}
    };
    this.appResources = {};
    this.loaderResources = {};

    this._mojitoResources = {};
    this._yuiResources = {};
    this._bootstrapResources = bootstrap.resources(root);

    this._getResources();
}

ShakerResources.prototype = {

    _updateLocations: function (locationMap) {
        'use strict';
        var originalProduceMeta = this.store.yui._produceMeta,
            base = '/' + this.shakerConfig.app.prefix + '/',
            self = this,
            processedLangs = {};

        // replace yui RS addon's _produceMeta function
        // this allows us to set a yui module's fullpath to the local url if we don't have a location url
        // for it. So if an asset fails to be uploaded to cdn, instead of having an incorrect cdn path,
        // it will have a full path corresponding to its local url.
        this.store.yui._produceMeta = function (name, lang, appMetaData, yuiMetaData) {
            if (!processedLangs[lang]) {
                var meta = {
                    base: JSON.parse(appMetaData.base[lang]),
                    full: appMetaData.full && JSON.parse(appMetaData.full[lang])
                };

                Y.Object.each(meta, function (subMeta) {
                    Y.Object.each(subMeta, function (module, moduleName) {
                        var url = base + module.path;
                        if (locationMap[url]) {
                            module.path = locationMap[url].split('/').pop();
                        } else {
                            delete module.path;
                            module.fullpath = url;
                        }
                    });
                });

                appMetaData.base[lang] = JSON.stringify(meta.base);
                if (meta.full) {
                    appMetaData.full[lang] = JSON.stringify(meta.full);
                }
                processedLangs[lang] = true;
            }

            return originalProduceMeta(name, lang, appMetaData, yuiMetaData);
        };

        // empty appModulesDetails to prevent warning messages
        this.store.yui.appModulesDetails = {};
        this.store.resolveResourceVersions();
        this.store.yui._produceMeta = originalProduceMeta;
    },

    resolveResourceVersions: function (resourcesMap) {
        'use strict';
        // empty appModulesDetails to prevent warning messages
        this.store.yui.appModulesDetails = {};
        this.store.resolveResourceVersions(resourcesMap);
    },

    getLoaderResources: function (locationsMap) {
        'use strict';
        var ress,
            m,
            mojit,
            mojits = [],
            yuiModules,
            seedModules,
            moduleRess = {};

        this._updateLocations(locationsMap);
        yuiModules = this.store.yui.getYUIURLDetails();

        //mojito doesnt provide default lang in build time.
        this.context.lang = this.context.lang || '';
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
            if (m.indexOf('loader') === 0) {
                // get loader only if langs are on
                // or loader is not language specific
                // or loader is specific to en_US (this is the default language so it should be included)
                if ((this.shakerConfig.resources.langs) || ress.yui.name.indexOf('_') === -1  || ress.yui.name.indexOf('_en-US') !== -1) {
                    ress.type = 'loader';
                    this.loaderResources[m] = this._addResource(ress, 'js');
                }

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
            relativePath: libpath.relative(self.cwd, rawResource.source.fs.fullPath),
            mime: rawResource.mime,
            type: rawResource.type,
            subtype: subtype,
            selector: rawResource.selector
        };

        // make sure css/js resources have a charset
        if (rawResource.type !== 'asset' || subtype === 'css' || subtype === 'js') {
            resource.mime.charset = resource.mime.charset || 'UTF-8';
        }

        if (rawResource.subtype === 'synthetic') {
            resource.read = function (callback) {
                self.store.getResourceContent(self.store.makeStaticHandlerDetails(rawResource), function (err, content) {
                    resource.content = content.toString();
                    callback(err, resource.content);
                });
            };
        } else {
            resource.read = function (callback) {
                fs.readFile(resource.path, resource.mime.charset, function (err, content) {
                    resource.content = content;
                    callback(err, content);
                });
            };
        }

        this.appResources[rawResource.url] = resource;
        return resource;
    },

    _storeYUIModule: function (rawResource, yuiResources) {
        'use strict';
        var resource,
            requiredResourceName,
            requiredResource,

            dependencies = {},
            self = this;

        function getDependencies(rawResource) {
            var dependencies = {},
                module = {};

            try {
                module = self.store.yui._makeYUIModuleConfig('client', rawResource);
            } catch (e) {
                module.requires = [];
            }

            Y.Array.each(module.requires, function (requiredModule) {
                var rawDependencies;

                // dependency is found in given yui resources list
                if (yuiResources[requiredModule]) {
                    rawDependencies = [yuiResources[requiredModule]];
                } else if (YUI_ALIASES[requiredModule]) {
                    // dependency is an alias for various yui modules
                    rawDependencies = [];
                    Y.Array.each(YUI_ALIASES[requiredModule], function (module) {
                        if (!self._yuiResources[module]) {
                            return;
                        }
                        rawDependencies.push(self._yuiResources[module].getRawResource());
                    });
                } else if (self._yuiResources[requiredModule]) {
                    // dependency is a yui module
                    rawDependencies = [self._yuiResources[requiredModule].getRawResource()];
                } else if (self._mojitoResources[requiredModule]) {
                    // dependency is a mojito module
                    rawDependencies = [self._mojitoResources[requiredModule]];
                }

                Y.Array.each(rawDependencies, function (rawDependency) {
                    var dependency;

                    if (!rawDependency) {
                        return;
                    }
                    dependency = self._storeYUIModule(rawDependency, yuiResources);
                    dependencies = Y.merge(dependencies, dependency.dependencies);
                    dependencies[dependency.url] = dependency;
                });
            });
            return dependencies;
        }

        rawResource.url = rawResource.url || 'yui-module--' + rawResource.name;


        if (self.appResources[rawResource.url]) {
            return self.appResources[rawResource.url];
        }

        resource = self._addResource(rawResource, 'js');

        resource.dependencies = getDependencies(rawResource);

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

        self.logger.info('Retrieving Application Resources');

        function addMojitResources(mojit, shakenMojit, poslStr) {
            var resource,
                mojitResources = {},
                controllerResources = [],
                d,
                b,
                a,
                l,
                m,
                langs = [],
                modules = {},
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
                    resource = self._addResource(rawResource, 'html');
                    mojitResources[action].view = resource;
                }
            }

            // Get controller resources
            if (!Y.Object.isEmpty(shakenMojit.controller)) {
                rawResource = shakenMojit.controller;
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                resource = self._storeYUIModule(rawResource, shakenMojit.yuiResources, self.appResources);
                for (action in shakenMojit.actions) {
                    mojitResources[action].controller = resource;
                }
            }

            // Get binder resources
            for (b in shakenMojit.binders) {
                rawResource = shakenMojit.binders[b];
                action = rawResource.name;
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                resource = self._storeYUIModule(rawResource, shakenMojit.yuiResources, self.appResources);
                // TODO: name of binder potentially does not have correponding view?
                mojitResources[action] = mojitResources[action] || {};
                mojitResources[action].binder = resource;
            }

            // Get lang resources
            if (shakenMojit.clientAffinity) {
                for (l in shakenMojit.langs) {
                    rawResource = shakenMojit.langs[l];
                    resource = self._storeYUIModule(rawResource, shakenMojit.yuiResources, self.appResources);
                    langs.push(resource);
                }
                for (action in shakenMojit.actions) {
                    mojitResources[action].langs = langs;
                }
            }

            // Get module resources
            for (m in shakenMojit.modules) {
                rawResource = shakenMojit.modules[m];
                resource = self._storeYUIModule(rawResource, shakenMojit.yuiResources, self.appResources);
                modules[rawResource.yui.name] = resource;
            }
            for (action in shakenMojit.actions) {
                mojitResources[action].modules = modules;
            }

            // Get assets resources
            // only get assets if specified in the config
            if (self.shakerConfig.resources && self.shakerConfig.resources.assets) {
                for (a in shakenMojit.assets) {
                    rawResource = shakenMojit.assets[a];

                    assetAction = null;
                    for (action in shakenMojit.actions) {
                        // check if the asset belongs to a specific action
                        if (rawResource.source.fs.basename.split('-')[0] === action) {
                            assetAction = action;
                            break;
                        }
                    }

                    resource = self._addResource(rawResource, rawResource.subtype);

                    pathArray = resource.path.split('/');
                    containingDir = pathArray[pathArray.length - 2];

                    // determine if resource is not to be inclucded
                    if (resource.basename.indexOf('-void') !== -1 || containingDir.indexOf('void') !== -1) {
                        // remove resource from appResources
                        delete self.appResources[resource.url];
                        continue;
                    }

                    // mark resource as manual inline if specified by name or containing directory
                    if (resource.basename.indexOf('-manual-inline') !== -1 || containingDir.indexOf('manual-inline') !== -1) {
                        resource.inline = true;
                        // manual inline resource should not be included in assets since they are added manually
                        continue;
                    } else if (resource.basename.indexOf('-inline') !== -1 || containingDir.indexOf('inline') !== -1) {
                        // mark resource as inline if specified by name or containing directory
                        resource.inline = true;
                    }
                    // mark resource as typeInline if this type of resource is specified in the config to be inlined
                    if (self.shakerConfig.resources.assets === 'inline' || self.shakerConfig.resources.assets[resource.subtype] === 'inline') {
                        resource.typeInline = true;
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

        self._getMojitoResources();
        self._getYUIResources();

        Y.Array.each(contexts, function (context) {
            var posl = self._getPOSLFromContext(context),
                poslStr = posl.join('-');

            if (poslVisited[poslStr]) {
                return;
            }

            self.organizedResources.app[poslStr] = {
                app: {},
                mojits: {},
                posl: posl
            };

            Y.Array.each(mojits, function (mojit) {
                shakenMojit = self._shakeMojit(mojit, context);
                addMojitResources(mojit, shakenMojit, poslStr);
            });

            self._shakeApp(context, poslStr);

            poslVisited[poslStr] = true;
        });

        self._shakeMojito();
        self._shakeYUI();
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
        var originalGetYUI = YUIFactory.getYUI,
            store;

        this.logger.info('Starting Resource Store');

        // hack for turning off yui logs
        YUIFactory.getYUI = function () {
            var YUI = originalGetYUI();
            YUIFactory.getYUI = originalGetYUI;
            return function (config) {
                config.debug = false;
                return YUI(config);
            };
        };

        process.shakerCompiler = true;
        store = libstore.createStore(cfg);
        return store;
    },

    _getShakerConfig: function (context) {
        'use strict';

        var appConfig = this.store.getAppConfig(context || {}),
            shakerConfig = appConfig.shaker || {},
            yuiResources;

        // set default resources
        shakerConfig.resources = shakerConfig.resources === false ? false : shakerConfig.resources || {};
        if (!Y.Lang.isObject(shakerConfig.resources) && !Y.Lang.isBoolean(shakerConfig.resources)) {
            this.logger.error('Config Validation', 'resources option should be an object. Using default resources.');
            shakerConfig.resources = {};
        }
        if (shakerConfig.resources) {
            shakerConfig.resources = shakerConfig.resources === true || shakerConfig.resources === null ?
                    {} : shakerConfig.resources;

            // initialize configuration for each type of resource
            Y.Object.each(shakerConfig.resources, function (config, resourceType) {
                if (config === true) {
                    // delete so that it is replaced by default
                    delete shakerConfig.resources[resourceType];
                } else if (config !== false) {
                    // make sure the configuration is an object
                    shakerConfig.resources[resourceType] = config || {};
                }
            });

            // if there is no location then yui and mojito resources are not necessary
            if (!shakerConfig.locations) {
                shakerConfig.resources.yui = false;
                shakerConfig.resources.mojito = false;
            }

            // if there is no location and no tasks then only the assets resources are necessary
            if (!shakerConfig.tasks && !shakerConfig.locations) {
                shakerConfig.resources = {
                    assets: shakerConfig.resources.assets || {}
                };

                Y.mix(shakerConfig.resources.assets, DEFAULT_RESOURCES.assets, false, null, 0, true);
            } else {
                // add default configuration for missing configs
                // make sure that specified yui resources appear below the default yui resources
                if (shakerConfig.resources.yui !== false) {
                    yuiResources = shakerConfig.resources.yui;
                    shakerConfig.resources.yui = {};
                }
                Y.mix(shakerConfig.resources, DEFAULT_RESOURCES, false, null, 0, true);
                Y.mix(shakerConfig.resources.yui, yuiResources, false, null, 0, true);
            }

            // if bootstrap is off remove bootstrap from yui
            if (!shakerConfig.resources.bootstrap && shakerConfig.resources.yui) {
                delete shakerConfig.resources.yui['yui-bootstrap-override'];
                delete shakerConfig.resources.yui['yui-bootstrap-core'];
            }

        }

        shakerConfig.app = {
            appName: this.store.url.config.appName,
            prefix: this.store.url.config.prefix,
            root: this.root
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
        var self = this;

        Y.Object.each(self.shakerConfig.resources.mojito, function (includeModule, mojitoModule) {
            if (!includeModule) {
                return;
            }
            var rawResource = self._mojitoResources[mojitoModule],
                resource = self._storeYUIModule(rawResource, {});
            self.organizedResources.mojito[rawResource.url] = resource;
        });
    },

    _shakeYUI: function () {
        'use strict';
        var self = this,
            resource;

        // add inline bootstrap if bootstrap is on
        if (self.shakerConfig.resources && self.shakerConfig.resources.bootstrap) {
            resource = self._addResource(self._bootstrapResources['yui-bootstrap-inline'], 'js');
            resource.inline = true;
        }

        Y.Object.each(self.shakerConfig.resources.yui, function (includeModule, yuiModule) {
            var rawResources;

            if (!includeModule) {
                return;
            }

            if (YUI_ALIASES[yuiModule]) {
                // yuiModule is an alias for various yui modules
                rawResources = [];
                Y.Array.each(YUI_ALIASES[yuiModule], function (module) {
                    rawResources.push(self._yuiResources[module].getRawResource());
                });
            } else if (self._yuiResources[yuiModule]) {
                // add yui module
                rawResources = [self._yuiResources[yuiModule].getRawResource()];
            } else if (self._bootstrapResources[yuiModule]) {
                rawResources = [self._bootstrapResources[yuiModule]];
            }

            Y.Array.each(rawResources, function (rawResource) {
                if (!rawResource) {
                    return;
                }
                resource = self._storeYUIModule(rawResource, {});
                self.organizedResources.yui[resource.url] = resource;
            });
        });
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
            // duplicates that come first have higher precedence
            bySelector[res.selector][res.url] = bySelector[res.selector][res.url] || res;
        }
        for (s = posl.length; s > 0; s -= 1) {
            selector = posl[s - 1];
            for (r in bySelector[selector]) {
                if (bySelector[selector].hasOwnProperty(r)) {
                    // duplicates that come first have higher precedence
                    out[r] = out[r] || bySelector[selector][r];
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
                modules: {},
                assets: {},
                views: {}
            };

        if (!self.shakerConfig.resources) {
            return mojitResources;
        }

        function getMojitResourcesByContext(mojitName, ctx) {
            var mojitResources = self.store.getResourceVersions({mojit: mojitName}),
                mojitResourcesFilterIterator = function (item) {
                    //remove mojito-shaker Framework + shared (app level) assets
                    return !(item.source.pkg.name === 'mojito-shaker' ||
                        (item.mojit === 'shared' && item.type === 'asset')) &&
                        (item.affinity.affinity === 'common' || item.affinity.affinity === 'client');
                },
                sharedResources = self.store.getResourceVersions({mojit: 'shared'}),
                sharedResourcesFilterIterator = function (item) {
                    return !(item.source.pkg.name === 'mojito-shaker' ||
                        item.type === 'asset') &&
                        (item.affinity.affinity === 'common' || item.affinity.affinity === 'client');
                };

            // Return the resources in the 'shared' mojit too, since Mojito considers those as part of each mojit.
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
            if (rawResource.mojit === 'shared') {
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
                if ((Y.Lang.isObject(self.shakerConfig.resources.assets) && self.shakerConfig.resources.assets[rawResource.subtype] !== false) ||
                        self.shakerConfig.resources.assets === 'inline' || self.shakerConfig.resources.assets === true) {
                    mojitResources.assets[rawResource.url] = rawResource;
                }
                break;
            case 'yui-lang':
                // TODO: langs
                if (self.shakerConfig.resources.langs === true) {
                    mojitResources.langs[rawResource.url] = rawResource;
                }
                break;
            case 'yui-module':
                if (self.shakerConfig.resources.modules === true) {
                    mojitResources.modules[rawResource.url] = rawResource;
                }
                break;
            }
        });

        return mojitResources;
    },

    // TODO: It seems like these assets might already arrive sorted from the resource store,
    // but we will keep this function to ensure that assets are sorted as expected.
    _sortAssets: function (assets) {
        'use strict';
        Y.Object.each(assets, function (typeAssets, type) {
            var sortedKeys = Object.keys(typeAssets).sort(function (a, b) {
                return typeAssets[a].basename > typeAssets[b].basename ? 1 :
                        typeAssets[a].basename < typeAssets[b].basename ? -1 : 0;
            });
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
                    return (item.affinity.affinity === 'common' || item.affinity.affinity === 'client') &&
                        (item.source.pkg.name !== 'mojito' || self.shakerConfig.resources.mojito) &&
                        (item.type !== 'yui-module' || self.shakerConfig.resources.modules);
                };
            rawResources = rawResources.filter(appResourcesFilterIterator);
            return self._filterResourceVersionsByContext(context, rawResources);
        }

        appResources = getAppResourcesByContext(context);

        for (i in appResources) {
            rawResource = appResources[i];
            // get asset type resources and ignore resources under assets/compiled
            // skip type of resource as specified by config
            if (rawResource.type === 'asset' && rawResource.source.fs.fullPath.indexOf('assets/compiled') === -1 &&
                    ((Y.Lang.isObject(self.shakerConfig.resources.assets) && self.shakerConfig.resources.assets[rawResource.subtype] !== false) ||
                        self.shakerConfig.resources.assets === 'inline' || self.shakerConfig.resources.assets === true)) {
                resource = self._addResource(rawResource, rawResource.subtype);

                pathArray = resource.path.split('/');
                containingDir = pathArray[pathArray.length - 2];

                // determine if resource is not to be included
                if (resource.basename.indexOf('-void') !== -1 || containingDir.indexOf('void') !== -1) {
                    // remove resource from appResources
                    delete self.appResources[resource.url];
                    continue;
                }
                // mark resource as manual inline if specified by name or containing directory
                if (resource.basename.indexOf('-manual-inline') !== -1 || containingDir.indexOf('manual-inline') !== -1) {
                    resource.inline = true;
                    // manual inline resource should not be included in assets since they are added manually
                    continue;
                } else if (resource.basename.indexOf('-inline') !== -1 || containingDir.indexOf('inline') !== -1) {
                    // mark resource as inline if specified by name or containing directory
                    resource.inline = true;
                }
                // mark resource as typeInline if this type of resource is specified in the config to be inlined
                if (self.shakerConfig.resources.assets === 'inline' || self.shakerConfig.resources.assets[resource.subtype] === 'inline') {
                    resource.typeInline = true;
                }

                assets[rawResource.subtype] = assets[rawResource.subtype] || {};
                assets[rawResource.subtype][rawResource.url] = resource;
            } else if ((rawResource.source.pkg.name === 'mojito' && self.shakerConfig.resources.mojito) ||
                       (rawResource.type === 'yui-module' && rawResource.subtype !== 'synthetic'
                            && rawResource.source.pkg.name !== 'mojito' && self.shakerConfig.resources.modules)) {
                self._addResource(rawResource, rawResource.subtype);
            }
        }

        // sort and add assets
        self._sortAssets(assets);
        self.organizedResources.app[poslStr].app = assets;
    },

    _getMojitoResources: function () {
        'use strict';
        var rawResources,
            rawResource,
            i,
            self = this;

        if (!self.shakerConfig.resources || !self.shakerConfig.resources.mojito) {
            return;
        }

        rawResources = self.store.getResourceVersions({mojit: 'shared'});

        for (i in rawResources) {
            rawResource = rawResources[i];
            if ((rawResource.source.pkg.name === 'mojito' || rawResource.source.pkg.name === 'mojito-shaker') &&
                    (rawResource.affinity.affinity === 'common' || rawResource.affinity.affinity === 'client') &&
                    rawResource.source.fs.ext === '.js') {
                self._mojitoResources[rawResource.name] = self._mojitoResources[rawResource.name] || rawResource;
            }
        }

        return self._mojitoResources;
    },

    _getYUIResources: function () {
        'use strict';
        var self = this,
            shakerConfig = self.shakerConfig,
            yuiMinifyConfig = shakerConfig.tasks && shakerConfig.tasks['yui-library'] && shakerConfig.tasks['yui-library'].jsminify,
            minifyYui = yuiMinifyConfig === undefined || yuiMinifyConfig,
            yuiPath = self.root + '/node_modules/',
            libWalker = require('mojito/lib/app/autoload/package-walker.server'),
            walker,
            yuiModuleConfigs = {},
            rawYuiResources = {},
            yuiResources = {};

        // use this app's yui library if it exists otherwise use Mojito's
        if (fs.existsSync(yuiPath + 'yui')) {
            yuiPath += 'yui';
        } else {
            yuiPath += 'mojito/node_modules/yui';
        }

        walker = new libWalker.BreadthFirst(yuiPath);

        if (!self.shakerConfig.resources || !self.shakerConfig.resources.yui) {
            return;
        }

        walker.walk(function (err, info) {
            if (err) {
                throw err;
            }
            var pkg = {
                    name: info.pkg.name,
                    version: info.pkg.version,
                    depth: info.depth
                },
                yuiDirs = fs.readdirSync(yuiPath);

            Y.Array.each(yuiDirs, function (yuiDir) {
                var moduleFiles,
                    res,
                    yuiModule,
                    files,
                    source;

                if (fs.statSync(yuiPath + '/' + yuiDir).isDirectory()) {
                    files = fs.readdirSync(yuiPath + '/' + yuiDir);
                    Y.Array.some(files, function (file) {
                        if (file === yuiDir + '.js') {
                            yuiModule = yuiDir;
                            return true;
                        }
                    });
                } else {
                    return;
                }

                if (yuiModule) {
                    source = {
                        fs: self.store.makeResourceFSMeta(yuiPath + '/' + yuiDir, 'bundle', '.', yuiModule + (minifyYui ? '-min' : '') + '.js', true),//me.makeResourceFSMeta(dir, dirType, subdir, file, isFile),
                        pkg: pkg
                    };

                    self._yuiResources[yuiModule] = {
                        getRawResource: function () {
                            var rawResource = null;
                            try {
                                rawResource = self.store.parseResourceVersion(source, 'yui-module', 'js', 'shared');
                            } catch (e) {
                                rawResource = {
                                    affinity: 'server',
                                    id: 'yui-module--' + yuiModule,
                                    mojit: 'shared',
                                    name: yuiModule,
                                    selector: '*',
                                    source: source,
                                    type: 'yui-module',
                                    yui: {
                                        meta: {
                                            requires: []
                                        },
                                        name: yuiModule
                                    }
                                };
                            }

                            if (rawResource) {
                                rawResource.type = 'yui-library';
                                rawResource.name = rawResource.name || yuiModule;
                                rawResource.mime = {
                                    type: 'application/javascript',
                                    charset: 'UTF-8'
                                };
                            }

                            this.getRawResource = function () {
                                return rawResource;
                            };

                            return rawResource;
                        }
                    };
                }
            });
        });

        return self._yuiResources;
    }
};

exports.ShakerResources = ShakerResources;
