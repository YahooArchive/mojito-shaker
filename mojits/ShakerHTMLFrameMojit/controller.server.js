/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/

YUI.add('ShakerHTMLFrameMojit', function (Y, NAME) {

    'use strict';

    Y.namespace('mojito.controllers')[NAME] = {

        index: function (ac) {
            this.__call(ac);
        },

        __call: function (ac) {

            this._renderChild(ac, function (data, meta) {
                // meta.assets from child should be piped into
                // the frame's assets before doing anything else.
                ac.assets.addAssets(meta.assets);

                if (typeof ac.shaker.data.run === 'function') {
                    ac.shaker.data.run(ac.assets.assets, meta.binders);
                } else {
                    ac.shaker.run(ac.assets.assets, meta.binders);
                }

                // we don't care much about the views specified in childs
                // and for the parent, we have a fixed one.

                meta.view = meta.view || {};

                meta.view.name = 'index';

                // 1. mixing bottom and top fragments from assets into
                //    the template data, along with title and mojito version
                //    and any other html data added through shaker
                // 2. mixing meta with child metas, along with some extra
                //    headers.
                ac.done(
                    Y.merge(ac.shaker.data.htmlData, data, ac.assets.renderLocations()),
                    Y.mojito.util.metaMerge(meta, {

                        http: {
                            headers: {
                                'content-type': ['text/html; charset="utf-8"']
                            }
                        }

                    }, true)
                );

            });

        },

        /**
         * Renders a child mojit based on a config called "child" and
         * the "assets" collection specified in the specs.
         * @method _renderChild
         * @protected
         * @param {Object} ac Action Context Object.
         * @param {Function} callback The callback.
         */
        _renderChild: function (ac, callback) {
            // Grab the "child" from the config an add it as the
            // only item in the "children" map.
            var child = ac.config.get('child'),
                cfg;

            // Map the action to the child if the action
            // is not specified as part of the child config.
            child.action = child.action || ac.action;

            // Create a config object for the composite addon
            cfg = {
                children: {
                    child: child
                },
                assets: ac.config.get('assets')
            };


            // Now execute the child as a composite
            ac.composite.execute(cfg, callback);
        }

    };

}, '0.1.0', {requires: [
    'mojito',
    'mojito-util',
    'mojito-assets-addon',
    'mojito-deploy-addon',
    'mojito-config-addon',
    'mojito-composite-addon',
    'mojito-shaker-addon'
]});
