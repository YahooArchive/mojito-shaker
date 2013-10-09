/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var parser = require('uglify-js').parser,
    uglify = require('uglify-js').uglify;

exports.task = function (resource, options, done) {
    'use strict';
    options = options || {};

    var config = options.config || {},
        source = resource.content,
        ast;

    try {
        ast = parser.parse(source, config.semicolon || false);

        if (config.mangle === undefined || config.mangle) {
            ast = uglify.ast_mangle(ast, config);
        }
        if (config.squeeze === undefined || config.squeeze) {
            ast = uglify.ast_squeeze(ast, config);
        }

        source = uglify.gen_code(ast, config);

        // Make sure minified scripts end with ';' to prevent errors when combined
        // with other minified scripts.
        if (source.substr(source.length - 1) !== ';') {
            source += ';';
        }
        resource.content = source;
    } catch (e) {
        if (options.callback) {
            options.callback(e);
        }

        done('Minify failed, file is unparseable.\nException:\n' + JSON.stringify(e));
        return;
    }

    done(null);
};
