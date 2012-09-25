/*
 * Copyright (c) 2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/


/**
 * @module ResourceStoreAddon
 */

/**
 * @class RSAddonUrl
 * @extension ResourceStore.server
 */
YUI.add('addon-rs-shaker', function(Y, NAME) {

    function RSAddonShaker() {
        RSAddonShaker.superclass.constructor.apply(this, arguments);
    }

    RSAddonShaker.NS = 'shaker';
    RSAddonShaker.ATTRS = {};

    ShakerNS = Y.namespace('mojito.shaker');

    Y.extend(RSAddonShaker, Y.Plugin.Base, {

        initializer: function(config) {
            Y.log('Initializing Shaker Resource Store Plugin','info','Shaker');
            this.rs = config.host;
            this._poslCache = {};   // context: POSL
            this.appRoot = config.appRoot;
            this.mojitoRoot = config.mojitoRoot;
            this.afterHostMethod('preloadResourceVersions', this.populateLangSelectors, this);
            this.beforeHostMethod('expandInstanceForEnv', this.expandInstanceAssets, this);
        },
        destructor: function() {
            // TODO:  needed to break cycle so we don't leak memory?
            this.rs = null;
        },
        /*
        * The store is not going to match the lang context if
        * there is no explicit files with the lang selector
        * so we need to force for languages to be able to compute them.
        */
        populateLangSelectors: function () {
            var store = this.rs,
                selector = store.selector;

            selector._appConfigYCB.walkSettings(function(settings, config) {
                //we add the selectors in the store.
                if (settings.lang) {
                    store.selectors[config.selector || settings.lang] = true;
                }
                return true;
            });
        },
        getPOSLFromContext: function (ctx) {
            var store = this.rs,
                cacheKey,
                posl,
                p,
                part,
                parts;

            cacheKey = Y.JSON.stringify(ctx);
            posl = this._poslCache[cacheKey];
            if (!posl) {
                posl = ['*'];
                // TODO:  use rs.config for this too
                parts = store.selector._appConfigYCB.readNoMerge(ctx, {});
                for (p = 0; p < parts.length; p += 1) {
                    part = parts[p];
                    if (part.selector && store.selectors[part.selector]) {
                        posl.unshift(part.selector);
                    }
                }
                this._poslCache[cacheKey] = posl;
            }
            return Y.mojito.util.copy(posl);
        },
        expandInstanceAssets: function (env, instance, ctx, cb) {
            var strContext = this.getPOSLFromContext(ctx).join('-'),
                shakerMeta = YUI._mojito._cache.shaker && YUI._mojito._cache.shaker.meta,
                newCb = function (err, spec) {
                    //console.log(strContext);
                    //console.log('Mojit: ' + spec.type + 'action: ' + spec.action);
                    var mojitType = spec.type || spec.base || spec.id,
                        mojitAction = spec.action,
                        isFrame = mojitType.indexOf('ShakerHTMLFrameMojit') !== -1,
                        shakerBase,
                        cssList = [], jsList = [];

                    //check if we have the shaker Metadata avaliable (if not we are screwed...)
                    if (shakerMeta) {
                        //if is a type of Frame, we will ship the app stuff and the mojito core
                        if (isFrame) {
                            cssList = shakerMeta.app[strContext].app;
                            jsList = shakerMeta.core;
                        //add the css and js for the particular mojit & action
                        } else {
                            //I do this to check if on the nested meta we have all the info we need...
                            //May I implement a getter from the metadata?
                            shakerBase = shakerMeta.app[strContext];
                            shakerBase = shakerBase && shakerBase.mojits[mojitType];
                            shakerBase = shakerBase && shakerBase[mojitAction];

                            //if everything is fine we assing it the resources needed
                            cssList = shakerBase && shakerBase.css;
                            jsList = shakerBase && shakerBase.js;
                        }
                            
                    }
                    //augmenting the default config
                    spec.config.assets = spec.config.assets || {};

                    //we put here which mojits are being executed
                    //So in ShakerHTMLFrame runtime we can do the magic of bundling...
                    spec.config.assets.shakerRuntimeMeta = {
                        mojits: [mojitType + '.' + mojitAction]
                    };
                    spec.config.assets.topShaker = {
                        css: cssList
                    };

                    spec.config.assets.bottomShaker = {
                        js: jsList
                    };

                cb.call(this, err, spec);
            };
            return new Y.Do.AlterArgs(null,[env, instance, ctx, newCb]);
        }
    });
    Y.namespace('mojito.addons.rs');
    Y.mojito.addons.rs.shaker = RSAddonShaker;

}, '0.0.1', { requires: ['plugin', 'oop']});
