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

    var libpath = require('path');

    function RSAddonShaker() {
        RSAddonShaker.superclass.constructor.apply(this, arguments);
    }

    RSAddonShaker.NS = 'shaker';
    RSAddonShaker.ATTRS = {};

    ShakerNS = Y.namespace('mojito.shaker');

    Y.extend(RSAddonShaker, Y.Plugin.Base, {

        initializer: function(config) {
            this.rs = config.host;
            this._poslCache = {};   // context: POSL
            this.appRoot = config.appRoot;
            this.mojitoRoot = config.mojitoRoot;
            //this.afterHostMethod('preloadResourceVersions', this.populateLangSelectors, this);
            this.onHostEvent('mojitResourcesResolved', this.mojitResourcesResolved, this);

            if (!this.initilized) {
                this.meta = this.rs.config.readConfigJSON(libpath.join(this.appRoot, 'shaker-meta.json'));
                if(this.meta) {
                    Y.log('Metadata loaded correctly.','info','Shaker');
                    Y.log('Preloading store', 'info','mojito-store');
                } else {
                    Y.log('Metadata not found.','error','Shaker');
                }
            }
        },
        destructor: function() {
            // TODO:  needed to break cycle so we don't leak memory?
            this.rs = null;
        },
        mojitResourcesResolved: function (e) {
            var env = e.env,
                posl = e.posl,
                mojitName = e.mojit,
                ress = e.ress,
                strContext = posl.join('-'),
                isFrame = mojitName.indexOf('ShakerHTMLFrameMojit') !== -1,
                shakerMeta = this.meta,
                shakerBase,
                frameActionMeta,
                actionMeta,
                css,
                resource;
                
            if (!shakerMeta) {
                return;
            }

            //if the mojit is the ShakerHTMLFrame, we are going to put the common assets there.
            if (isFrame) {
                shakerBase = shakerMeta.app[strContext];
                shakerBase = shakerBase && shakerBase.app;
                frameActionMeta = {
                    css: shakerBase,
                    js: shakerMeta.core

                };
            } else {
                //I do this to check if on the nested meta we have all the info we need...
                //NOTE: May I implement a getter from the metadata?
                shakerBase = shakerMeta.app[strContext];
                shakerBase = shakerBase && shakerBase.mojits[mojitName];
            }

            for(var i in ress) {
                //ress[i].url = 'http://yahoo.com/foo.js';
                resource = ress[i];
                //we got a view, let's attach the proper assets
                if (resource.type === 'view') {
                     actionMeta =  (isFrame ? frameActionMeta: shakerBase && shakerBase[resource.name]) || {css:[], blobCSS:[]};
                     ress[i].view.assets = {
                        topShaker: {
                            css: actionMeta.css,
                            blob: actionMeta.blobCSS || []
                        }
                    };
                }
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
        }
    });
    Y.namespace('mojito.addons.rs');
    Y.mojito.addons.rs.shaker = RSAddonShaker;

}, '0.0.1', { requires: ['plugin', 'oop']});
