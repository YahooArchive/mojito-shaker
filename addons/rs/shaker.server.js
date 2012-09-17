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
            var strContext = this.rs.selector.getPOSLFromContext(ctx),
                shakerMeta = YUI._mojito._cache.shaker && YUI._mojito._cache.shaker.meta,
                newCb = function (err, spec) {
                    //console.log('Mojit: ' + spec.type + 'action: ' + spec.action);
                    var mojitType = spec.type,
                        mojitAction = spec.action,
                        isFrame = mojitType.indexOf('HTMLFrameMojit') !== -1,
                        cssList = [], jsList = [];

                    if (shakerMeta) {
                        cssList = isFrame ? shakerMeta.app[strContext].app :
                            shakerMeta.app[strContext].mojits[mojitType][mojitAction].css;

                        jsList = isFrame ? shakerMeta.core : shakerMeta.app[strContext].mojits[mojitType][mojitAction].js;
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
