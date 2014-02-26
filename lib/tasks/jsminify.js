/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var uglify = require('uglify-js');

exports.task = function (resource, options, done) {
    'use strict';

    try {
        resource.content = uglify.minify(resource.content, {fromString: true}).code;

        // Make sure minified scripts end with ';' to prevent errors when combined
        // with other minified scripts.
        if (resource.content.substr(resource.content.length - 1) !== ';') {
            resource.content += ';';
        }
    } catch (e) {
        done('Minify failed: ' + e.message);
        return;
    }

    done(null);
};
