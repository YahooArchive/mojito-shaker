/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true */

YUI.add('mojito-shaker-addon', function (Y, NAME) {
    'use strict';

    function FakeAssetsAddon() {
        this.assets = {js: [], css: [], blob: []};
    }

    FakeAssetsAddon.prototype = {
        getAssets: function () {
            return this.assets;
        },
        addAsset: function (type, location, url) {
            this.assets[type].push(url);
        }
    };

    function ShakerAddon(command, adapter, ac) {
        this._ac = ac; // the future action context of the mojit (not attached yet if mojit created dynamically)
        this._adapter = adapter; // where the functions done and error live before attach them to the ac.
        this._command = command; //all the configuration for the mojit
        this._init(ac, adapter);
    }

    ShakerAddon.prototype = {

        namespace: 'shaker',

        setStore: function (rs) {
            this.rs = rs;
        },

        getStore: function () {
            if (this.rs) {
                return this.rs;
            } else {
                // dirty fallback version to access the store
                this.rs = this._adapter.req.app.store;
                return this.rs;
            }
        },

        _getFakeYUIBootstrap: function () {
            var store = this.getStore(),
                shakerRS = store.shaker,
                fakeBS = shakerRS.fakeYUIBootstrap;

            if (fakeBS) {
                return '<script>' + fakeBS + '</script>';
            } else {
                Y.log('[SHAKER] Error getting the Fake YUI BootStrap', 'error');
            }
        },

        createOptimizedBootstrapBlob: function (jsList) {
            var urls,
                tmpl;

            if (jsList && jsList.length) {
                urls = jsList.join('","');
                tmpl = '<script>YUI.SimpleLoader.js("' + urls + '");</script>';
                return tmpl;
            }
        },
        _init: function (ac, adapter) {
            // initialize will return the shaker metadata
            if (this._initializeShaker()) {
                this._augmentAppAssets(ac);
            } else {
                Y.log('[SHAKER] Metadata not found. Application running without Shaker...', 'error');
            }
        },

        _initializeShaker: function () {
            var store = this.getStore(),
                shakerRS = store.shaker,
                staticContext = store.getStaticContext(),
                appConfig = store.getAppConfig(staticContext),
                shakerConfig = appConfig && appConfig.shaker,
                shakerMeta = shakerRS.meta;

            this.shakerConfig = shakerConfig;
            this._meta = shakerMeta;

            return shakerMeta;
        },

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
                Y.log('Bundling entry point!', 'shaker');
                // If is empty for some reason...
                assets.topShaker = assets.topShaker || {js: [], css: [], blob: []};
                assets.bottomShaker = assets.bottomShaker || {js: [], css: [], blob: []};

                // Attach the assets we collect during dispatching...
                assets.topShaker.css = shakerBundle.css;
                assets.bottomShaker.js = core.concat(shakerBundle.js);
                return true;
            }
        },

        clientDeployment: function (meta) {
            var ac = this._ac,
                assets = ac.assets,
                store = this.getStore(),
                shakerConfig = this.shakerConfig || {},
                //collect assets
                mAssets = assets.getAssets(),
                collectedJSAssets = (mAssets.bottomShaker && mAssets.bottomShaker.js) || [],
                // if we have the optimizeBootstrap enabled
                // create a fake asset addon to collect the Mojito original generated deployment assets
                assetsAddon = shakerConfig.optimizeBootstrap ? new FakeAssetsAddon() : assets,
                binders = meta.binders,
                inlineDynamicaLoader,
                deployedFake;

            // If we are deploying to the client get all the assets required
            if (ac.config.get('deploy') === true) {
                ac.deploy.constructMojitoClientRuntime(assetsAddon, binders);
            }

            if (shakerConfig.optimizeBootstrap) {
                deployedFake = assetsAddon.getAssets();
                collectedJSAssets = collectedJSAssets.concat(deployedFake.js);

                inlineDynamicaLoader  = this.createOptimizedBootstrapBlob(collectedJSAssets);
                delete mAssets.bottomShaker;

                assets.addAsset('blob', 'bottomShaker', this._getFakeYUIBootstrap());
                assets.addAsset('blob', 'bottomShaker', inlineDynamicaLoader);
                assets.addAsset('blob', 'bottomShaker', deployedFake.blob);

            }
        },

        run: function (meta) {
            var routeFound;
            if (this._meta.app) {
                routeFound = this.checkRouteBundling();
            }
            this.clientDeployment(meta);
        },

        renderListAsHtmlAssets: function (list, type) {
            var i,
                data = '',
                url;

            if ('js' === type) {
                for (i = 0; i < list.length; i += 1) {
                    // TODO: Fuly escape any HTML chars in the URL to avoid trivial
                    // attribute injection attacks. See owasp-esapi reference impl.
                    url = encodeURI(list[i]);
                    data += '<script type="text/javascript" src="' +
                        url + '"></script>\n';
                }
            } else if ('css' === type) {
                for (i = 0; i < list.length; i += 1) {
                    // TODO: Escape any HTML chars in the URL to avoid trivial
                    // attribute injection attacks. See owasp-esapi reference impl.
                    url = encodeURI(list[i]);
                    data += '<link rel="stylesheet" type="text/css" href="' +
                        url + '"/>\n';
                }
            } else if ('blob' === type) {
                for (i = 0; i < list.length; i += 1) {
                    // NOTE: Giant security hole...but used by everyone who uses
                    // Mojito so there's not much we can do except tell authors of
                    // Mojito applications to _never_ use user input to generate
                    // blob content or populate config data. Whatever goes in here
                    // can't be easily encoded without the likelihood of corruption.
                    data += list[i] + '\n';
                }
            } else {
                Y.log('Unknown asset type "' + type + '". Skipped.', 'warn', NAME);
            }

            return data;
        }

    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-config-addon',
        'mojito-deploy-addon',
        'mojito-url-addon'
    ]
});
