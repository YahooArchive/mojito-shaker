/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/*jslint stupid: true */
var fs = require('fs'),
    basedir = 'assets/compiled';

exports.location = function (config) {
    'use strict';
    var Y = config.shaker.Y,
        appRoot = config.app.root,
        root = '/' + config.app.prefix + '/' + config.app.appName + '/' + basedir + '/',
        files,
        i;

    this.yuiConfig = {
        'groups': {
            'app': {
                'base': '/',
                'comboBase': '/combo~',
                'comboSep': '~',
                'combine': true,
                'root': root
            }
        }
    };

    // create compiled directory under assets
    try {
        // make assets directory if does not exist
        if (!fs.existsSync(appRoot + '/assets')) {
            fs.mkdirSync(appRoot + '/assets');
        }
        fs.mkdirSync(appRoot + '/' +  basedir);
    } catch (e) {
        throw 'Unable to create ' + basedir + ' - ' + e;
    }

    this.store = function (resource, done) {
        var checksum = resource.getChecksum(),
            // replace any '.' in the basename to make sure it does not serve to add a selector to the resource
            filename = resource.basename.replace(/\./g, '_') + '_' + checksum + '.' + resource.subtype,
            filepath =  appRoot + '/' + basedir + '/' + filename;

        // check if file exists, if so do not write file
        fs.exists(filepath, function (exists) {
            if (exists) {
                done(null, filename);
            } else {
                require('fs').writeFile(filepath, resource.content, function (err) {
                    done(err, filename);
                });
            }
        });
    };
};
