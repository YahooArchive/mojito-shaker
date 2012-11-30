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
            this.appConfig = config.host.getStaticAppConfig() || {};
            this.shakerConfig = this.appConfig.shaker || {};

            var yuiRS = this.rs.yui;

            if (!this.initilized) {
                //first read the shaker metadata
                this.meta = this.rs.config.readConfigSimple(libpath.join(this.appRoot, 'shaker-meta.json'));

                if (this.meta && !Y.Object.isEmpty(this.meta)) {
                    Y.log('Metadata loaded correctly.','info','Shaker');
                    Y.log('Preloading store', 'info','mojito-store');
                } else {
                    Y.log('Metadata not found.','warn','Shaker');
                    return;
                }
            }
            /*
            * HOOKS AREA!:
            * We need to hook some events on the store,
            * but we will have to do different hooks depending if we are on build time or in runtime
            * The reason is that there are some hook that are not needeed on runtime or viceversa
            */

            /*
            * Either on build time or runtime we need to change the urls...
            * but only when comboCDN is enabled.
            */
            if (this.shakerConfig.comboCDN) {
                this.beforeHostMethod('resolveResourceVersions', this.resolveResourceVersions, this);
            }

            // This hooks are for runtime
            if (!process.shakerCompile) {
                //alter seed
                if (this.shakerConfig.comboCDN) {
                    Y.Do.after(this.alterAppSeedFiles, yuiRS, 'getAppSeedFiles', this);
                }
                //alter bootstrap config
                //Y.Do.after(function (){console.log(Y.Do.currentRetVal);}, yuiRS, 'getAppGroupConfig', this);

                // Augments the view with assets
                this.onHostEvent('mojitResourcesResolved', this.mojitResourcesResolved, this);
            }
        },
        destructor: function() {
            // TODO:  needed to break cycle so we don't leak memory?
            this.rs = null;
        },
        /*
        * When comboLoad is active we need  to change the seed to point to the CDN...
        * We rely on the mapping we have on the Shaker metadata
        */
        alterAppSeedFiles: function () {
            var i,
                newUrl,
                cdnUrls = this.meta.cdnModules,
                currentSeed = Y.Do.currentRetVal;

            if (!cdnUrls) {
                return;
            }

            for (i in currentSeed) {
                newUrl = cdnUrls[currentSeed[i]];
                if (newUrl) {
                    currentSeed[i] = newUrl;
                }
            }
        },
        /*
        * Change the URL's of the Store so we get the comboLoad from CDN.
        */
        resolveResourceVersions: function (cdnUrls) {
            var r,
                res,
                ress,
                m,
                mojit,
                mojits,
                meta,
                urls = {};

            //get the CDN URL mapping
            cdnUrls = cdnUrls || this.meta.cdnModules;

            if(!cdnUrls) {
                return;
            }

            //Iterate over all the resources
            mojits = this.rs.listAllMojits();
            mojits.push('shared');

            for (m = 0; m < mojits.length; m += 1) {
                mojit = mojits[m];
                ress = this.rs.getResourceVersions({mojit: mojit});
                for (r = 0; r < ress.length; r += 1) {
                    res = ress[r];
                    //CHECK ABOUT THE VIEWS HERE...
                    if (res.yui && cdnUrls[res.url]) {
                        res.url = cdnUrls[res.url];
                    }
                }
            }
        },
        /*
        * Augment the view spec with the Shaker computed assets.
        * Will be merged on the action-context module (either on the client or in the server).
        */
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

            // If the mojit is the ShakerHTMLFrame, we are going to put the common assets there.
            if (isFrame) {
                shakerBase = shakerMeta.app[strContext];
                shakerBase = shakerBase && shakerBase.app;
                frameActionMeta = {
                    css: shakerBase
                };

            } else {
                // Check if on the nested meta we have all the info we need...
                shakerBase = shakerMeta.app[strContext];
                shakerBase = shakerBase && shakerBase.mojits[mojitName];
            }

            for (var i in ress) {
                resource = ress[i];
                // we got a view, let's attach the proper assets if some
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
        }
       
    });
    Y.namespace('mojito.addons.rs');
    Y.mojito.addons.rs.shaker = RSAddonShaker;

}, '0.0.1', { requires: ['plugin', 'oop','addon-rs-url','addon-rs-yui']});
