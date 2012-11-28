/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

libutils = require('./utils'),
libpath = require('path'),
YUI = require('yui').YUI,
Y = require('yui').YUI({useSync: true});

DEFAULT_SHAKER_CONFIG = {
    rollupConfig: {}
};

DEFAULT_APP_SHAKER_CONFIG = {
    rollupConfig: {},
    minify: true
};


ShakerCore = function (config) {
    config = config || {};
    this.logger = config.logger || new libutils.SimpleLogger(config);
    this.logger.log('[SHAKER] - Initializing ShakerCore');
    this._initResourceStore(config);
};

ShakerCore.prototype._initResourceStore = function (config) {
    var storeConfig = {};
    storeConfig.root = config.root || process.cwd();
    storeConfig.context = config.context || {};
    this.store = this.makeStore(storeConfig);
    this.logger.success('[SHAKER] - Store preloaded correctly');
    this.saveStoreConfigs(storeConfig);
};

ShakerCore.prototype.makeStore = function (cfg) {
    var store = require('mojito/lib/store.js');
    return store.createStore(cfg);
};

ShakerCore.prototype.saveStoreConfigs = function (config) {
    var appConfig = this.store.getAppConfig(config.context),
        staticHandling = appConfig.staticHandling || {};

    this.storeConfigs = {
        prefix: this.store.url.config.prefix,
        appName: staticHandling.appName,
        context: config.context || {}
    };
};
ShakerCore.prototype.getStoreConfigs = function () {
    return this.storeConfigs;
};

ShakerCore.prototype.getMojitList = function () {
    return this.store.listAllMojits();
};

ShakerCore.prototype._getPOSLFromContext = function (ctx) {
    return this.store.selector.getPOSLFromContext(ctx);
};

ShakerCore.prototype._getUsedContexts = function () {
    return this.store.selector._listUsedContexts();
};

ShakerCore.prototype.getShakerConfigByContext = function (mojitName, context) {
    context = context || {};
    var filter = {
            type:'config',
            name: 'shaker'
        },
        configResources,
        shakerConfigResource,
        config;

        if (mojitName !== 'shared') {
            filter.mojit = mojitName;
        }
        configResources = this.store.getResourceVersions(filter),
        shakerConfigResource = configResources.length ? configResources[0] : null;

        if (shakerConfigResource) {
            config = this.store.config.readConfigYCB(shakerConfigResource.source.fs.fullPath, context);
            return config.shaker || null;
        } else {
            return null;
        }
};

ShakerCore.prototype.getAppShakerConfigByContext = function (context) {
    var config = this.store.getAppConfig(context || {});
    return config.shaker || {};
};

ShakerCore.prototype.getMergedShakerConfigByContext = function (mojitName, context) {
    var appMerge;
    appMerge = Y.merge(DEFAULT_APP_SHAKER_CONFIG, this.getShakerConfigByContext(mojitName, context));
    appMerge = Y.merge(appMerge, this.getAppShakerConfigByContext(context));
    if (mojitName === 'shared'){
        return appMerge;
    } else {
        return Y.merge(appMerge, this.getShakerConfigByContext(mojitName, context));
    }
};

ShakerCore.prototype.getAppResourcesByContext = function (context) {
    var rawResources = this.store.getResources('client', context, {mojit:'shared'}),
        appResourcesFilterIterator = function (item) {
            //remove mojito Framework + app autoloads (included in the mojits already)
            return item.source.pkg.name !== 'mojito' && item.type !== 'yui-module';
        };
    return rawResources.filter(appResourcesFilterIterator);
};

ShakerCore.prototype.getMojitResourcesByContext = function (mojitName, ctx) {
    var rawResources = this.store.getResources('client', ctx, {mojit: mojitName}),
        mojitResourcesFilterIterator = function (item) {
            //remove mojito Framework + shared (app level) assets
            return !(item.source.pkg.name === 'mojito' || item.source.pkg.name === 'mojito-shaker' ||
                    (item.mojit === 'shared' && item.type === 'asset'));
        };

        return rawResources.filter(mojitResourcesFilterIterator);
};

ShakerCore.prototype.getYUIDependenciesForApp = function (ctx) {
    var item,
        store = this.store,
        shared = store.yui.getConfigShared('client', ctx),
        required = {"mojito-client": true},
        dependencies = store.yui._precomputeYUIDependencies('en', 'client', 'shared', shared.modules, required, true).paths;

     //we dont need the paths, just rewrite to true
    for (item in dependencies) {
        dependencies[item] = true;
    }
    return dependencies;
};

ShakerCore.prototype.getYUIModuleNamesFromResources = function (resources) {
    var cleanList = {};
    yuiModules = resources.forEach(function(item, key){
        if (item.yui && item.yui.name) {
            cleanList[item.yui.name] = item;
        }
    });
    return cleanList;
};

ShakerCore.prototype.matchDependencies = function(sortedNeededYui, yuiModules) {
    var matched = {};
    Y.Array.each(sortedNeededYui, function (name, index) {
        if (yuiModules[name]) {
            matched[name] = yuiModules[name];
        }
    });
    return matched;
};

ShakerCore.prototype.bundleShakenMojit = function (mojitName, context, shakenMojit) {
    var appShakerMerge = this.getMergedShakerConfigByContext('shared', context),
        shakerConfig = Y.merge(appShakerMerge, this.getMergedShakerConfigByContext(mojitName, context)),
        bundleOptions = shakerConfig.rollupConfig,
        binderOption = bundleOptions.bundleBinders !== undefined ? bundleOptions.bundleBinders : true ,
        viewsOption = bundleOptions.bundleViews,
        controllerOption = bundleOptions.bundleController,
        definitionsOption = bundleOptions.bundleDefinition,
        bundleMojit = {};
        
        if (bundleOptions.bundleAll) {
            viewsOption = controllerOption = binderOption = definitionsOption = true;
        }

        Y.Object.each(shakenMojit.views, function (viewResource, viewName) {
            var jsList = [],
                required = {};

            bundleMojit[viewName] = {js:[]};
            bundleMojit[viewName].css = shakenMojit.css.concat(viewResource.css);
            delete viewResource.css;
            //for js the order should be:  [definition??, views, controller+deps, binder+deps]

            // view
            jsList = jsList.concat(viewsOption ? viewResource : []);

            //controller + deps
            if (controllerOption) {
                jsList = jsList.concat(Y.Object.values(shakenMojit.controller.dependencies));
                required = Y.merge(required, shakenMojit.controller.required);
            }
            // binder + deps
            Y.Object.each(shakenMojit.binders, function (binder, yuiBinderName) {
                if (binderOption && binder.resource.name === viewName) {
                    jsList = jsList.concat(Y.Object.values(binder.dependencies));
                    required = Y.merge(required, binder.required);
                }
            });
            //skip definition for now

            //Assign the collected js to the bundle.
            //Note that we have to reverse for getting the right overall order of files on the rollup
            bundleMojit[viewName].js = jsList.reverse();
            bundleMojit[viewName].required = required;
        });

        return bundleMojit;
};

ShakerCore.prototype.shakeMojitByContext = function (mojitName, context) {
    var store = this.store,
        //get the resources for that mojit
        resources = this.getMojitResourcesByContext(mojitName, context),
        //transform yui modules on a hash object using key as yui-name
        yuiResources = this.getYUIModuleNamesFromResources(resources),
        mojitResources = {
            controller: {module:{},required:{},dependencies: {}},
            binders: {},
            langs:{},
            assets:[],
            views: {}
        },
        calculatedResources = {},
        assetsByAction = [],
        binderAux,
        controllerAux,
        dependencies;

    //group all dependencies
    resources.forEach(function(resource) {
        switch(resource.type) {
            case 'controller':
                // we create some properties due to the way _precomputeYUIDependencies works.
                mojitResources.controller.resource = resource;
                mojitResources.controller.module[resource.yui.name] = store.yui._makeYUIModuleConfig('client', resource);
                mojitResources.controller.required[resource.yui.name] = true;
                break;
            case 'view':
                mojitResources.views[resource.name] = resource;
                break;

            case 'binder':
                binderAux = {
                    resource: resource,
                    module:{},
                    required: {}
                };
                binderAux.required[resource.yui.name] = true;
                binderAux.module[resource.yui.name] = store.yui._makeYUIModuleConfig('client', resource);
                mojitResources.binders[resource.yui.name] = binderAux;
                break;

            case 'asset':
                //NOTE: Revisit this once we have support for sass/less
                if (resource.subtype === 'css') {
                    mojitResources.assets.push(resource);
                }
                break;
            case 'yui-lang':
                mojitResources.langs[resource.yui.name] = store.yui._makeYUIModuleConfig('client', resource);
                mojitResources.langs[resource.yui.name].lang = resource.yui.lang;
        }
    });
    //alias just for the sake of simplicity
    controllerAux = mojitResources.controller;
    
    //check if the controller exists (it may be server afinity)
    if (controllerAux.resource) {
        //call the yui precompute to resolve the mojito-yui dependencies we need for this controller.
        dependencies = store.yui._precomputeYUIDependencies('en', 'client', mojitName, controllerAux.module, controllerAux.required, true);

        // check if we need to agregate the language on the controller dependencies
        Y.Object.each(mojitResources.langs, function (langModule, yuiName) {
            if (langModule.lang === context.lang) {
                dependencies.sorted.push(yuiName);
            }
        });
        controllerAux.dependencies = this.matchDependencies(dependencies.sorted, yuiResources);
    }

    //calculate binder dependencies
    Y.Object.each(mojitResources.binders, function (binder, yuiName) {
        dependencies = store.yui._precomputeYUIDependencies('en', 'client', mojitName, binder.module, binder.required, true);
        binder.dependencies = this.matchDependencies(dependencies.sorted, yuiResources);
    }, this);

    //attach assets
    Y.Object.each(mojitResources.views, function (viewResource, viewName) {
         //filter assets per action
         var actionAssets = mojitResources.assets.filter(function (item) {
             return (item.source.fs.basename === viewName) || (item.name === viewName);
         });
         viewResource.css = actionAssets || [];
         assetsByAction = assetsByAction.concat(actionAssets);
     });
    mojitResources.css = libutils.arrayDiff(mojitResources.assets, assetsByAction);

    return mojitResources;

};

ShakerCore.prototype.shakeAppResourcesByContext = function (context) {
    return this.getAppResourcesByContext(context).filter(function (item){
        return item.type === 'asset' && item.subtype === 'css';
    });
};

ShakerCore.prototype.removeDuplicatedResources = function (resources) {
    var newResources = [],
        tempAux = {};
    resources.forEach(function (item) {
        var url = item.url;
        if (!tempAux[url]) {
            newResources.push(item);
            tempAux[url] = true;
        }
    });
    return newResources;
};

ShakerCore.prototype.bundleByRoutes = function (shakenMojits, shakenApp, config, ctx) {
    var routeBundle = config.routeBundle,
        bundleGlobal = {},
        mojitoRequired = this.getYUIDependenciesForApp(ctx),
        bundleAll;

    if (!routeBundle) {
        return {};
    }
    Y.Object.each(routeBundle, function (bundle, routeName) {
        var bundleRoute = {js:[], css: shakenApp.slice(0), required: mojitoRequired};
        bundle.forEach(function (mojit) {
            var mojitParts = mojit.split('.'),
                mojitName = mojitParts[0],
                mojitAction = mojitParts[1] || 'index',
                shakenMojit = shakenMojits[mojitName] && shakenMojits[mojitName][mojitAction];
            if (shakenMojit) {
                bundleRoute.js = bundleRoute.js.concat(shakenMojit.js);
                bundleRoute.css = bundleRoute.css.concat(shakenMojit.css);
                bundleRoute.required = Y.merge(bundleRoute.required, shakenMojit.required);
            }
        });

        bundleRoute.js = this.removeDuplicatedResources(bundleRoute.js);
        bundleRoute.css = this.removeDuplicatedResources(bundleRoute.css);

        bundleGlobal[routeName] = bundleRoute;

    }, this);
    return bundleGlobal;

};

ShakerCore.prototype.bundleAll = function (shakenMojits, shakenApp, config) {
    var bundleAll = {js:[], css: shakenApp.slice(0)};
    Y.Object.each(shakenMojits, function (mojit, name) {
        bundleAll.js = bundleAll.js.concat(mojit.js);
        bundleAll.css = bundleAll.css.concat(mojit.css);
    });
    bundleAll.js = this.removeDuplicatedResources(bundleAll.js);
    bundleAll.css = this.removeDuplicatedResources(bundleAll.css);

    return bundleAll;
};

ShakerCore.prototype.shakeAllContexts = function () {
    var contextList = this._getUsedContexts(),
        mojits = this.getMojitList(),
        shaken = {},
        mojitShaken,
        appShaken,
        mojit,
        config,
        stringContext,
        context,
        i, j;

    for (i in contextList) {
        context = contextList[i];
        shakerConfig = this.getMergedShakerConfigByContext('shared', context);
        stringContext = this._getPOSLFromContext(context).join('-');
        mojitShaken = {};

        //sort of caching here
        if (!shaken[stringContext]) {
            //this.logger.debug('[SHAKER] - Analyzing context:' + stringContext, 2);
            for (j in mojits) {
                mojit = mojits[j];
                mojitShaken[mojit] = this.bundleShakenMojit(mojit, context, this.shakeMojitByContext(mojit, context));
            }
            appShaken = this.shakeAppResourcesByContext(context);
            shaken[stringContext] = {
                mojits: mojitShaken,
                app: appShaken,
                routesBundle: {}
            };
            //if we have appBundle option we put there everything in there..
            if (shakerConfig.appBundle) {
                shaken[stringContext].appBundle = this.bundleAll(mojitShaken, appShaken, shakerConfig);
            //else we check for routeBundle
            } else {
                shaken[stringContext].routesBundle = this.bundleByRoutes(mojitShaken, appShaken, shakerConfig, context);
            }
        }
    }
    return shaken;
};

ShakerCore.prototype.shakeCore = function () {
    var rawResources = this.store.getResources('client', {}, {mojit:'shared'}),
        mojitoResources = rawResources.filter(function (item) {
            return (item.source.pkg.name === 'mojito' || item.source.pkg.name === 'mojito-shaker') && item.source.fs.ext === '.js';
        });
    return mojitoResources;
};

ShakerCore.prototype.getAppModuleResources = function () {
    var ress,
        m,
        mojit,
        mojits,
        store = this.store,
        context = this.getStoreConfigs().context,
        yuiModules = store.yui.getYUIURLResources(),
        seedModules,
        moduleRess = {};

    //mojito doesnt provide default lang in build time.
    context.lang = context.lang || 'en';
    seedModules = store.yui.getAppSeedFiles(context);
    
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
                if (moduleRess[res.yui.name]) {
                    Y.log('YUI Modules should have unique name per affinity. ' +
                               'Module [' + res.yui.name + '] has both common and ' +
                               'client affinity.', 'warn', 'getAppModulesResources');
                }
                moduleRess[res.yui.name] = res;
            }
        }
    }

    ress = store.getResourceVersions({});
    processRess(ress);

    mojits = store.listAllMojits();
    mojits.push('shared');
    for (m = 0; m < mojits.length; m += 1) {
        mojit = mojits[m];
        ress = store.getResourceVersions({mojit: mojit});
        processRess(ress);
    }

    for (m = 0; m < seedModules.length; m += 1) {
        ress = yuiModules[seedModules[m]];
        if (ress) {
            moduleRess[seedModules[m]] = ress;
        }
        
    }

    return moduleRess;
},

ShakerCore.prototype.run = function () {
    var shaken = {};
    shaken.app = this.shakeAllContexts();
    shaken.core = this.shakeCore();
    return shaken;
};

module.exports.ShakerCore = ShakerCore;
