/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
 
YUI.add('mojito-shaker-addon', function(Y, NAME) {

    function ShakerAddon(command, adapter, ac) {
        this._ac = ac;// the future action context of the mojit (not attached yet if mojit created dynamically)
        this._adapter = adapter;// where the functions done and error live before attach them to the ac.
        this._command = command;//all the configuration for the mojit
        this._init(ac, adapter);
    }
    ShakerAddon.prototype = {
        namespace: 'shaker',
        _init:function(ac, adapter){
            this._initShaker();
            this._hookDeploy(ac, adapter);
            this._deployClient = (ac.config && ac.config.get('deploy')) ||
                                 (ac.instance.config && ac.instance.config.deploy === true);
        },
        _initShaker: function (){
            this._meta = YUI._mojito._cache.shaker ? YUI._mojito._cache.shaker.meta : {};
        },
        _hookDeploy: function (ac) {
            var originalFnc = ac.deploy.getScripts,
                proxyFnc = this._removeMojitoCalculatedAssets;
            ac.deploy.getScripts = function () {
                return proxyFnc(originalFnc.apply(this, arguments));
            };
        },
        _removeMojitoCalculatedAssets: function (calculatedAssets) {
            delete calculatedAssets.bottom;
            return calculatedAssets;
        },
        checkClienDeployment: function () {
            var ac = this._ac,
                assets = ac.assets.getAssets();
            if (!this._deployClient) {
                delete assets.bottomShaker;
            }
        },
        checkRouteBundling: function () {
            if(!this._meta.app) return;

            var ac = this._ac,
                adapter = this._adapter,
                core = this._meta.core,
                command = this._command,
                store = adapter.req.app.store,
                url = adapter.req.url,
                method = adapter.req.method,
                route = ac.url.find(url, method),
                strContext = store.selector.getPOSLFromContext(ac.context).join('-'),
                shakerApp = this._meta.app[strContext],
                shakerBundle = shakerApp.routesBundle[route.name],
                assets,
                shakerAssetsTop,
                shakerAssetsBottom;

            if (shakerBundle) {
                assets = ac.assets.getAssets();
                shakerAssetsTop = assets.topShaker;
                shakerAssetsBottom = assets.bottomShaker;
                shakerAssetsTop.css = shakerBundle.css;
                shakerAssetsBottom.js = core.concat(shakerBundle.js);
            }
                
        },
        run: function (meta) {
            this.checkClienDeployment();
            this.checkRouteBundling();
        }
    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {requires: ['mojito']});
