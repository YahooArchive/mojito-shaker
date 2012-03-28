/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
// $Id: $

YUI.add('HTMLFrameMojit', function(Y, NAME) {
    
    Y.mojito.controllers[NAME] = {

        index: function(ac) {
            this.__call(ac);
        },

        __call: function(ac) {

            // Grab the "child" from the config an add it as the
            // only item in the "children" map.
            var child = ac.config.get('child'), cfg;

            // Map the action to the child
            child.action = ac.action;

            // Create a config object for the composite addon
            cfg = {
                children: {
                    child: child
                },
                assets: ac.config.get('assets')
            };

            Y.log('executing HTMLFrameMojit child', 'mojito', 'qeperf');

            // Now execute the child as a composite
            ac.composite.execute(cfg, function(data, meta) {
                // Make sure we have meta
                meta.http = meta.http || {};
                meta.http.headers = meta.http.headers || {};

                // Make sure our Content-type is HTML
                meta.http.headers['content-type'] = 'text/html; charset="utf-8"';

                // Set the default data
                data.title = ac.config.get('title') || 'Powered by Mojito'+Y.mojito.version;
                data.mojito_version = Y.mojito.version;

                // Add all the assets we have been given to our local store
                ac.assets.addAssets(meta.assets);

                // If we are deploying to the client get all the assets required
                if (ac.config.get('deploy') === true) {
                    ac.deploy.constructMojitoClientRuntime(ac.assets, meta.binders);
                }
                ac.shaker.shakeAll(meta);

                Y.Object.each(ac.assets.getAssets(), function(types, location) {
                    if (! data[location]) {
                        data[location] = '';
                    }
                    Y.Object.each(types, function(assets, type) {
                        data[location] += renderListAsHtmlAssets(assets, type);
                    });
                });

                meta.view = {name:'index'};

                Y.log('HTMLFrameMojit done()', 'mojito', 'qeperf');
                ac.done(data, meta);
            });
        }
    };

    var renderListAsHtmlAssets = function(list, type) {

        var i, data = '';

        if ('js' === type) {
            for (i=0; i<list.length; i++) {
                list[i].indexOf('');
                data += '<script type="text/javascript" src="' + list[i] + '"></script>\n';
            }
        }
        else if ('css' === type) {
            for (i=0; i<list.length; i++) {
                data += '<link rel="stylesheet" type="text/css" href="' + list[i] + '"/>\n';
            }
        }
        else if ('blob' === type) {
            for (i=0; i<list.length; i++) {
                data += list[i] + '\n';
            }
        }
        else {
            Y.log('Unknown asset type "' + type + '". Skipped.', 'warn', NAME);
        }

        return data;
    };

}, '0.1.0', {requires: ['mojito-assets-addon', 'mojito-deploy-addon', 'mojito-config-addon','mojito-shaker-addon']});
