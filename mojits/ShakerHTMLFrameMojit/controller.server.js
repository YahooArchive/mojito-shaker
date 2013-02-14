/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */


/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/


YUI.add('ShakerHTMLFrameMojit', function(Y, NAME) {


    Y.namespace('mojito.controllers')[NAME] = {

        index: function(ac) {
            this.__call(ac);
        },

        __call: function(ac) {

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

            Y.log('executing ShakerHTMLFrameMojit child', 'mojito', 'qeperf');

            // Now execute the child as a composite
            ac.composite.execute(cfg, function(data, meta) {

                // Make sure we have meta
                meta.http = meta.http || {};
                meta.http.headers = meta.http.headers || {};

                // Make sure our Content-type is HTML
                meta.http.headers['content-type'] =
                    'text/html; charset="utf-8"';

                // Set the default data
                data.title = ac.config.get('title') ||
                    'Powered by Mojito ' + Y.mojito.version;
                data.mojito_version = Y.mojito.version;

                data.enableDynamicTitle = ac.config.get('enableDynamicTitle');

                // Add all the assets we have been given to our local store
                ac.assets.addAssets(meta.assets);

                // SHAKER RUNTIME!
                // NOTE: We move the deployment of the client to within Shaker addon...
                ac.shaker.run(meta);

                // Attach assets found in the "meta" to the page
                Y.Object.each(ac.assets.getAssets(), function(types, location) {
                    if (!data[location]) {
                        data[location] = '';
                    }
                    Y.Object.each(types, function(assets, type) {
                        data[location] += ac.shaker.renderListAsHtmlAssets(assets, type);
                    });
                });

                meta.view = {name: 'index'};

                Y.log('ShakerHTMLFrameMojit done()', 'mojito', 'qeperf');

                ac.done(data, meta);
            });
        }
    };

}, '0.1.0', {requires: [
    'mojito-composite-addon',
    'mojito-assets-addon',
    'mojito-config-addon',
    'mojito-shaker-addon'
]});
