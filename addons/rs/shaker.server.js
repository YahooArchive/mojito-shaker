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
            Y.log('Resource Store Plugin initialized correctly.','info','Shaker');
            this.rs = config.host;
            this._poslCache = {};   // context: POSL
            this.appRoot = config.appRoot;
            this.mojitoRoot = config.mojitoRoot;
            this.afterHostMethod('preloadResourceVersions', this.populateLangSelectors, this);
            this.beforeHostMethod('expandInstanceForEnv', this.expandInstanceAssets, this);
            //this.beforeHostMethod('parseResourceVersion', this.hookClientForShaker, this);
        },
        destructor: function() {
            // TODO:  needed to break cycle so we don't leak memory?
            this.rs = null;
        },
        hookClientForShaker: function (source, type) {
            var shakerRootDir = this.rs.config.appRoot + '/node_modules/mojito-shaker/autoload',
                filename = 'shaker-output-handler.client.js';

            if (source.fs.basename === ('output-handler.client')) {
                source.fs.rootDir = shakerRootDir;
                source.fs.fullPath = shakerRootDir + '/' + filename;
            }
            
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
            return posl;
        },
        expandInstanceAssets: function (env, instance, ctx, cb) {
            var strContext = this.getPOSLFromContext(ctx).join('-'),
                shakerMeta = YUI._mojito && YUI._mojito._cache && YUI._mojito._cache.shaker && YUI._mojito._cache.shaker.meta,
                newCb = function (err, spec) {
                    //console.log(strContext);
                    //console.log('Mojit: ' + spec.type + 'action: ' + spec.action);
                    var mojitType = spec.type || spec.base || spec.id,
                        mojitAction = spec.action || 'index',
                        isFrame = mojitType.indexOf('ShakerHTMLFrameMojit') !== -1,
                        shakerBase,
                        cssList = [], jsList = [];

                    //check if we have the shaker Metadata avaliable (if not raise a metadata error)
                    if (shakerMeta) {
                        //if is a type of Frame, we will ship the app stuff and the mojito core (this go first)
                        if (isFrame) {
                            cssList = shakerMeta.app[strContext].app;
                            jsList = shakerMeta.core;

                        //is a regular mojit expand it with the metadata:
                        } else {
                            //I do this to check if on the nested meta we have all the info we need...
                            //NOTE: May I implement a getter from the metadata?
                            shakerBase = shakerMeta.app[strContext];
                            shakerBase = shakerBase && shakerBase.mojits[mojitType];
                            shakerBase = shakerBase && shakerBase[mojitAction];

                             if (shakerBase) {
                                //if everything is fine we assing it the resources needed
                                cssList = shakerBase && shakerBase.css;
                                jsList = shakerBase && shakerBase.js;
                             } else {
                                //Y.log('[SHAKER] Mojit: ' + mojitType + ' not expanded. Metadata not found','error');
                             }
                        }

                        //augment the default config
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

                    } else {
                        Y.log('[SHAKER] Metadata not found... Did you Shake?', 'error');
                        cb.call(this, err, spec);
                    }
                };

            return new Y.Do.AlterArgs(null,[env, instance, ctx, newCb]);
        }
    });
    Y.namespace('mojito.addons.rs');
    Y.mojito.addons.rs.shaker = RSAddonShaker;

}, '0.0.1', { requires: ['plugin', 'oop']});
