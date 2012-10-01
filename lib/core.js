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
    //And preaload the resources!
    this.store.preload();
    //this.setupContextSelectors();
    this.logger.success('[SHAKER] - Store preloaded correctly');
    this.saveStoreConfigs();
};

ShakerCore.prototype.makeStore = function (cfg) {
    var store,
        storePath = require.resolve('mojito/lib/store.server.js'),
        utilsPath = require.resolve('mojito/lib/app/autoload/util.common.js');

    Y.applyConfig({
        modules: {
            'mojito-util': {
                    fullpath: utilsPath
                },
            'mojito-resource-store': {
                fullpath: storePath
            }
        }
    });
    Y.use('mojito-resource-store');
    store = new Y.mojito.ResourceStore(cfg);
    Y.applyConfig({useSync: true});
    return store;
};

ShakerCore.prototype.saveStoreConfigs = function () {
    this.storeConfigs = {
        prefix: this.store.url.config.prefix
    };
};
ShakerCore.prototype.getStoreConfigs = function () {
    return this.storeConfigs;
};

ShakerCore.prototype.getMojitList = function () {
    return this.store.listAllMojits();
};

ShakerCore.prototype._getPOSLFromContext = function (ctx) {
    return this.store.shaker.getPOSLFromContext(ctx);
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
            return !(item.source.pkg.name === 'mojito' ||
                    (item.mojit === 'shared' && item.type === 'asset'));
        };

        return rawResources.filter(mojitResourcesFilterIterator);
};

ShakerCore.prototype.getMojitDepedenciesByContext = function (mojitName, context) {
    return this.store.getMojitTypeDetails('client', context, mojitName);
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

ShakerCore.prototype.matchDependencies = function(dependencies, yuiModules) {
    var matched = {};
    Y.Object.each(dependencies, function (url, moduleName) {
        if (yuiModules[moduleName]) {
            matched[moduleName] = yuiModules[moduleName];
        }
    });
    return matched;
};

ShakerCore.prototype.bundleShakenMojit = function (mojitName, context, shakenMojit) {
    var appShakerMerge = this.getMergedShakerConfigByContext('shared', context),
        shakerConfig = Y.merge(appShakerMerge, this.getMergedShakerConfigByContext(mojitName, context)),
        bundleOptions = shakerConfig.rollupConfig,
        viewsOption = bundleOptions.fetchViews || 'default',
        controllerOption = bundleOptions.fetchController || 'default',
        controllerDependencies = Y.Object.values(shakenMojit.dependencies),
        bundleMojit = {},
        views = viewsOption === 'none' ? [] : shakenMojit.views,
        actionViews,
        js;

        Y.Object.each(shakenMojit.actions, function (obj, action) {
            //console.log(mojitName + action);
            js = bundleOptions.fetchController === 'none' ?
                    Y.Object.values(obj.dependencies) : controllerDependencies.concat(Y.Object.values(obj.dependencies));
            actionViews = viewsOption === 'default' ? views.filter(function (item) {return item.name === action;}) : views.slice(0);
            bundleMojit[action] = {
                js: js,
                css: shakenMojit.assets.filter(function (item) {return item.subtype === 'css';})
                        .concat(obj.assets),
                views: actionViews,
                assetResources: shakenMojit.assets.filter(function (item) {return item.subtype !== 'css';})
            };
        });
        //console.log(bundleMojit);
        return bundleMojit;
};

ShakerCore.prototype.shakeMojitByContext = function (mojitName, context) {
    var resources = this.getMojitResourcesByContext(mojitName,context),
        yuiModules = this.getYUIModuleNamesFromResources(resources);
        dependencies = this.getMojitDepedenciesByContext(mojitName, context),
        //controllerDependencies will contain also a reference to the used controller and modules
        controllerDependencies = this.matchDependencies(dependencies.yui.sortedPaths, yuiModules),
        mojitResources = {
            dependencies: [],
            controllers: [],
            views: [],
            models:[],
            actions:{},
            langs:[],
            assets:[]
        };
    //group all basic dependencies
    resources.forEach(function(resource){
        switch(resource.type) {
            case 'controller':
                mojitResources.controllers.push(resource);
                break;
            case 'view':
                mojitResources.views.push(resource);
                break;
            case 'model':
                mojitResources.models.push(resource);
                break;
            case 'asset':
                mojitResources.assets.push(resource);
                break;
            case 'yui-lang':
                mojitResources.langs.push(resource);
        }
    });

    //recover binders dependencies + assets per action:
    Y.Object.each(dependencies.views, function (val, key) {
        //filter assets per action
        var actionAssets = mojitResources.assets.filter(function (item) {
            return (item.source.fs.basename === key) || (item.name === key);
        });
        mojitResources.actions[key] = {
            dependencies: this.matchDependencies(val['binder-yui-sorted'], yuiModules),
            assets: actionAssets
        };
        //remove the assets per action
        //arayDiff stringify the resources, double-check this later on...
        mojitResources.assets = libutils.arrayDiff(mojitResources.assets, actionAssets);
    }, this);
    mojitResources.dependencies = controllerDependencies;
    return mojitResources;
};

ShakerCore.prototype.shakeAppResourcesByContext = function (context) {
    return this.getAppResourcesByContext(context).filter(function (item){
        return item.type === 'asset' && (item.subtype === 'css' || item.subtype === 'js');
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

ShakerCore.prototype.bundleByRoutes = function (shakenMojits, shakenApp, context) {
    var config = this.getMergedShakerConfigByContext('shared', context),
        routeBundle = config.routeBundle,
        bundleGlobal = {},
        bundleAll;

    if (!routeBundle) {
        return {};
    }
    Y.each(routeBundle, function (bundle, routeName) {
        var bundleRoute = {js:[], css: shakenApp.slice(0)};
        bundle.forEach(function (mojit) {
            var mojitParts = mojit.split('.'),
                mojitName = mojitParts[0],
                mojitAction = mojitParts[1] || 'index',
                shakenMojit = shakenMojits[mojitName] && shakenMojits[mojitName][mojitAction];
            if (shakenMojit) {
                bundleRoute.js = bundleRoute.js.concat(shakenMojit.js);
                bundleRoute.css = bundleRoute.css.concat(shakenMojit.css);
            }
        });
        bundleRoute.js = this.removeDuplicatedResources(bundleRoute.js);
        bundleRoute.css = this.removeDuplicatedResources(bundleRoute.css);

        bundleGlobal[routeName] = bundleRoute;
    }, this);
    return bundleGlobal;

};

ShakerCore.prototype.shakeAllContexts = function () {
    var contextList = this._getUsedContexts(),
        mojits = this.getMojitList(),
        shaken = {},
        mojitShaken,
        appShaken,
        mojit,
        stringContext,
        context,
        i, j;

    for (i in contextList) {
        context = contextList[i];
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
                routesBundle: this.bundleByRoutes(mojitShaken, appShaken, context)
            };
        }
    }
    return shaken;
};

ShakerCore.prototype.shakeCore = function () {
    var rawResources = this.store.getResources('client', {}, {mojit:'shared'}),
        mojitoResources = rawResources.filter(function (item) {
            return item.source.pkg.name === 'mojito';
        });
    return mojitoResources;
};

ShakerCore.prototype.run = function () {
    var shaken = {};
    shaken.app = this.shakeAllContexts();
    shaken.core = this.shakeCore();
    return shaken;
};

module.exports.ShakerCore = ShakerCore;
