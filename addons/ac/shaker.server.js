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
            this._hookDeploy(ac, adapter);
            this._deployClient = (ac.config && ac.config.get('deploy')) ||
                                 (ac.instance.config && ac.instance.config.deploy === true);
                                 
        },
        _hookDeploy: function (ac) {
            var originalFnc = ac.deploy.getScripts,
                proxyFnc = this._removeMojitoCalculatedAssets,
                originalResult;
            ac.deploy.getScripts = function () {
                return proxyFnc(originalFnc.apply(this, arguments));
            };
        },
        _removeMojitoCalculatedAssets: function (calculatedAssets) {
            delete calculatedAssets.bottom;
            return calculatedAssets;
        },
        run: function (meta) {
            var ac = this._ac,
                assets = ac.assets.getAssets();
            if (!this._deployClient) {
                delete assets.bottomShaker;
            }
        }
    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {requires: ['mojito']});
