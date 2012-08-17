/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

libutils = require('./utils'),
libpath = require('path'),
YUI = require('yui').YUI,
Y = require('yui').YUI({useSync: true});

ShakerCore = function (config) {
    config = config || {};
    this.logger = config.logger || new libutils.SimpleLogger();
    this._initResourceStore(config);
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

ShakerCore.prototype._initResourceStore = function (config) {
    config.root = config.root || process.cwd();
    config.context = config.context || {};
    this.store = this.makeStore(config);
    //And preaload the resources!
    this.store.preload();
};

ShakerCore.prototype._getAllPOSL = function (stringify) {
    var buffer, i, item, posl = this.store.selector.getAllPOSLs();
    if (stringify) {
        for (i = 0; i < posl.length; i++) {
            item = posl[i];
            posl[i] = item.join('-');
        }
    }
    return posl;
};

ShakerCore.prototype._getPOSLFromContext = function (ctx) {
    return this.store.selector.getPOSLFromContext(ctx);
};

ShakerCore.prototype._getUsedContexts = function () {
    return this.store.selector._listUsedContexts();
};

ShakerCore.prototype.getMojitResourcesByContext = function (mojitName, ctx) {
    var mojitResources = {},
        rawResources,
        filteredResources,
        item,
        strCtx,
        mojitResourcesFilterIterator = function (item) {
            return !(item.source.pkg.name === 'mojito' ||
                    (item.mojit === 'shared' && item.type === 'asset'));
        };
    
        strCtx = this._getPOSLFromContext(ctx).join('-');
        rawResources = this.store.getResources('client', ctx, {mojit:mojitName});
        filteredResources = rawResources.filter(mojitResourcesFilterIterator);
        return filteredResources;
        
};

ShakerCore.prototype.shakeMojitInContext = function (mojitName, context){
    return this.store.getMojitTypeDetails('client', context, mojitName);
};










ShakerCore.prototype.runTempc = function () {
    //this.shakeMojit('primary');
    console.log('====== appRVs =======');
    this.logger.dump(this.store._appRVs);

    console.log('====== mojitsRVs =======');
    this.logger.dump(this.store._mojitRVs);

    console.log('====== appResources =======');
    this.logger.dump(this.store._appResources);

     console.log('====== mojitResources =======');
     this.logger.dump(this.store._mojitResources);
};

module.exports.ShakerCore = ShakerCore;
