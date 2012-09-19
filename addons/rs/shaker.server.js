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
            this.appRoot = config.appRoot;
            this.mojitoRoot = config.mojitoRoot;
            //this.afterHostMethod('findResourceVersionByConvention', this.findResourceVersionByConvention, this);
            //this.beforeHostMethod('parseResourceVersion', this.parseResourceVersion, this);
            this.beforeHostMethod('expandInstanceForEnv', this.expandInstanceAssets, this);
        },

        destructor: function() {
            // TODO:  needed to break cycle so we don't leak memory?
            this.rs = null;
        },
        expandInstanceAssets: function (env, instance, ctx, cb) {
            var strContext = this.rs.selector.getPOSLFromContext(ctx).join('-'),
                shakerMeta = YUI._mojito._cache.shaker && YUI._mojito._cache.shaker.meta,
                newCb = function (err, spec) {
                    //console.log('Mojit: ' + spec.type + 'action: ' + spec.action);
                    var mojitType = spec.type || spec.base || spec.id,
                        mojitAction = spec.action,
                        isFrame = mojitType.indexOf('HTMLFrameMojit') !== -1,
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
