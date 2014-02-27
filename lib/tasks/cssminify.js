/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var less = require('less');

exports.task = function (resource, options, done) {
    'use strict';
    options = options || {};

    // Use yuicompress by default
    options.yuicompress = options.yuicompress === undefined ? true : options.yuicompress;

    var parser = new less.Parser();

    // Need to make sure to compress since we pass options directly through to Less
    if (!options.compress && !options.yuicompress) {
        options.compress = true;
    }

    parser.parse(resource.content, function (err, tree) {
        if (err) {
            done(err.message);
        } else {
            resource.content = tree.toCSS(options);
            done(null);
        }
    });
};