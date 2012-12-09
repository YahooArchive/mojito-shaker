/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

YUI.add('mojito-shaker-addon', function(Y, NAME) {

    function ShakerAddon(command, adapter, ac) {
        this._ac = ac; // the future action context of the mojit (not attached yet if mojit created dynamically)
        this._adapter = adapter; // where the functions done and error live before attach them to the ac.
        this._command = command; //all the configuration for the mojit
        this._init(ac, adapter);
    }
    ShakerAddon.prototype = {
        namespace: 'shaker',
        _init:function (ac, adapter) {
            if (this._initShakerMeta()) {
                this._augmentAppAssets(ac);
            } else {
                Y.log('[SHAKER] Metadata not found. Application running without Shaker...','error');
            }
        },
        _initShakerMeta: function (){
            var shakerMeta = this._adapter.req.app.store.shaker.meta;
            this._meta = shakerMeta || {};
            return shakerMeta;
        },
        // Add here the assets at the app level
        // They have to be the first on the assets queue to preserve the order.
        _augmentAppAssets: function (ac) {
            var instance = ac.command.instance,
                action = instance.action || ac.command.action || 'index',
                viewObj = instance.views[action] || {},
                actionAssets = viewObj && viewObj.assets;

            ac.assets.addAssets(actionAssets);
            delete viewObj.assets;
        },
        checkRouteBundling: function () {
            var ac = this._ac,
                adapter = this._adapter,
                assets = ac.assets.getAssets(),
                core = this._meta.core,
                command = this._command,
                store = adapter.req.app.store,
                url = adapter.req.url,
                method = adapter.req.method,
                //get the triggered route
                route = ac.url.find(url, method),
                //get context
                strContext = store.selector.getPOSLFromContext(ac.context).join('-'),
                //check if we have a bundle for that route
                shakerApp = this._meta.app[strContext],
                shakerBundle = shakerApp.routesBundle[route.name];
                
            if (shakerBundle) {
                Y.log('Bundling entry point!','shaker');
                //if is empty for some reason...
                assets.topShaker = assets.topShaker || {js: [], css: [], blob:[]};
                assets.bottomShaker = assets.bottomShaker || {js: [], css: [], blob: []};

                //attach the assets
                assets.topShaker.css = shakerBundle.css;
                assets.bottomShaker.js = core.concat(shakerBundle.js);
            }
        },
        run: function (meta) {
            if (this._meta.app) {
                this.checkRouteBundling();
            }
        }
    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {requires: ['mojito', 'mojito-config-addon']});
