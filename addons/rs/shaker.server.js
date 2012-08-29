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
            Y.log('============== ShakerAddon =============');
            this.rs = config.host;
            this.appRoot = config.appRoot;
            this.mojitoRoot = config.mojitoRoot;
            this.afterHostMethod('findResourceVersionByConvention', this.findResourceVersionByConvention, this);
            this.beforeHostMethod('parseResourceVersion', this.parseResourceVersion, this);
            this.beforeHostMethod('expandInstanceForEnv', this.expandInstanceAssets, this);
          //this.afterHostMethod('resolveResourceVersions',this.checkShakerStatus, this);
        },

        destructor: function() {
            // TODO:  needed to break cycle so we don't leak memory?
            this.rs = null;
        },
        checkShakerStatus: function (){
            Y.later(1000,this,function (data) {
                Y.log('Shaker is checking the status of your app...');
            });
        },
        findResourceVersionByConvention: function(source, mojitType) {
            // console.log('============  shaker.server.js: findResourceVerionByConvention ========');
            // console.log(arguments);

            //We may want to Y.Do.Alter
            //for some kind of difference on buildtime vs. runtime
            //return?;
        },
        parseResourceVersion: function (source, type, subtype, mojitType) {
            // console.log('============  shaker.server.js: parseResourceVersion ========');
            // console.log(arguments);

            /*if (type === 'asset' && subtype === 'css') {
                var sourcefs = source.fs,
                    baseName = sourcefs.basename,
                    bnParts = baseName.split('.');

                if (bnParts.length !== 2) {
                    console.log('Removing: ' + baseName);
                    //there is no affinity in the file so shaker will not take care of it.
                    //if it were more than two mojito will remove it.
                    return new Y.Do.Halt(null, false);
                }
                if (bnParts[1] === 'common') {
                    //if is common we treat as it is.
                    bnParts.pop();
                }
                source.fs.basename = bnParts.join('.');
                return new Y.Do.AlterArgs(null,[source, type, subtype, mojitType]);
            }*/
        },
        expandInstanceAssets: function (env, instance, ctx, cb) {
            var strContext = this.rs.selector.getPOSLFromContext(ctx),
                shakerMeta = YUI._mojito._cache.shaker && YUI._mojito._cache.shaker.meta,
                newCb = function (err, spec) {
                    console.log('Mojit: ' + spec.type + 'action: ' + spec.action);
                    var mojitType = spec.type,
                        mojitAction = spec.action,
                        isFrame = mojitType.indexOf('HTMLFrameMojit') !== -1,
                        cssList = [], jsList = [];

                    if (shakerMeta) {
                        cssList = isFrame ? shakerMeta.app[strContext].app :
                            shakerMeta.app[strContext].mojits[mojitType][mojitAction].css;

                        jsList = isFrame ? shakerMeta.core : shakerMeta.app[strContext].mojits[mojitType][mojitAction].js;
                    }
                    spec.config = Y.merge(spec.config,{assets: {topShaker: {css: cssList}, bottomShaker: {js:jsList}}});
                    //console.log(JSON.stringify(spec.config.assets, null,'\t'));

                cb.call(this, err, spec);
            };
            //return new Y.Do.AlterArgs(null,[env, instance, ctx, newCb]);
        },
        augmentInstanceAssets: function (spec, ctx){
            var strContext = this.rs.selector.getPOSLFromContext(ctx).join('-'),
                shakerMeta = YUI._mojito._cache.shaker && YUI._mojito._cache.shaker.meta,
                mojitType = spec.type,
                mojitAction = spec.action,
                isFrame = mojitType.indexOf('HTMLFrameMojit') !== -1,
                cssList = [], jsList = [], mojitShaken;
                console.log('Expand for: ' + mojitType + ' action:' + mojitAction);
            if (shakerMeta) {
                if(isFrame) {
                    cssList = shakerMeta.app[strContext].app;
                    jsList = shakerMeta.core;
                } else {
                    mojitShaken = shakerMeta.app[strContext] &&
                                  shakerMeta.app[strContext].mojits[mojitType] &&
                                  shakerMeta.app[strContext].mojits[mojitType][mojitAction];
                    if (mojitShaken) {
                        cssList =  mojitShaken.css;
                        jsList = mojitShaken.js;
                    }
                }
                spec.config = Y.merge(spec.config,{assets: {topShaker: {css: cssList}, bottomShaker: {js:jsList}}});
            }
            
        }

    });
    Y.namespace('mojito.addons.rs');
    Y.mojito.addons.rs.shaker = RSAddonShaker;

}, '0.0.1', { requires: ['plugin', 'oop']});
