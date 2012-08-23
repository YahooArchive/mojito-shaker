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
    bundleOptions: {}
};

DEFAULT_APP_SHAKER_CONFIG = {
};

ShakerCore = function (config) {
    config = config || {};
    this.logger = config.logger || new libutils.SimpleLogger();
    this._initResourceStore(config);
};

ShakerCore.prototype._initResourceStore = function (config) {
    config.root = config.root || process.cwd();
    config.context = config.context || {};
    this.store = this.makeStore(config);
    //And preaload the resources!
    this.store.preload();
};

ShakerCore.prototype.makeStore = function (cfg) {
    var store,
        storePath = require.resolve('mojito/lib/store.server.js');

    Y.applyConfig({
        modules: {
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
        shakerConfigResource = configResources.length ? configResources[0] : undefined;

        if (shakerConfigResource) {
            config = this.store.config.readConfigYCB(shakerConfigResource.source.fs.fullPath, context);
            return config.shaker || undefined;
        } else {
            return undefined;
        }
};

ShakerCore.prototype.getAppShakerConfigByContext = function (context) {
    var config = this.store.getAppConfig(context || {});
    return config.shaker || DEFAULT_APP_SHAKER_CONFIG;
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
    var shakerConfig = this.getShakerConfigByContext(mojitName, context) ||
                        this.getShakerConfigByContext('shared', {}) ||
                        DEFAULT_SHAKER_CONFIG,
        bundleOptions = shakerConfig.bundleOptions,
        viewsOption = bundleOptions.fetchViews || 'default',
        controllerOption = bundleOptions.fetchController || 'default',
        controllerDependencies = Y.Object.values(shakenMojit.dependencies),
        bundleMojit = {},
        views = viewsOption === 'none' ? [] : shakenMojit.views,
        js;
        
        Y.Object.each(shakenMojit.actions, function (obj, action) {
            js = bundleOptions.fetchController === 'none' ?
                    obj.dependencies : controllerDependencies.concat(Y.Object.values(obj.dependencies));
            views = viewsOption === 'default' ? views.filter(function (item){return item.name === action;}) : views;

            bundleMojit[action] = {
                js: js,
                css: shakenMojit.assets.filter(function (item) {return item.subtype === 'css';})
                        .concat(obj.assets),
                views: views,
                assetResources: shakenMojit.assets.filter(function (item) {return item.subtype !== 'css';})
            };
        });

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
        var actionAssets = mojitResources.assets.filter(function (item) {return item.name === key; });
        mojitResources.actions[key] = {
            dependencies: this.matchDependencies(val['binder-yui-sorted'], yuiModules),
            assets: actionAssets
        };
        //remove the assets per action
        mojitResources.assets = libutils.arrayDiff(mojitResources.assets, actionAssets);
    }, this);
    mojitResources.dependencies = controllerDependencies;
    return mojitResources;
};

ShakerCore.prototype.shakeAppResourcesByContext = function (context) {
    return this.getAppResourcesByContext(context);
};

ShakerCore.prototype.shakeAllContexts = function () {
    var contextList = this._getUsedContexts(),
        mojits = this.getMojitList(),
        shaken = {},
        mojitShaken,
        mojit,
        stringContext,
        context,
        i, j;

    for (i in contextList) {
        context = contextList[i];
        stringContext = this._getPOSLFromContext(context).join('-');
        mojitShaken = {};
        for (j in mojits) {
            mojit = mojits[j];
            mojitShaken[mojit] = this.bundleShakenMojit(mojit, context, this.shakeMojitByContext(mojit, context));
        }
        shaken[stringContext] = {
            mojits: mojitShaken,
            app: this.shakeAppResourcesByContext(context)
        };
    }
    return shaken;
};

ShakerCore.prototype.run = function () {
    return this.shakeAllContexts();
};

module.exports.ShakerCore = ShakerCore;
