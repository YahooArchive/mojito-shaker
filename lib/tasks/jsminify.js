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
        comments = [],
        token = '"jsminify task: preserved comment block"',
        reMultiComments = /\/\*![\s\S]*?\*\//g,
        reTokens = new RegExp(token, 'g'),
        source = resource.content,
        ast;

    try {
        source = source.replace(reMultiComments, function (comment) {
            comments.push(comment);
            return ';' + token + ';';
        });

        ast = parser.parse(source, config.semicolon || false);

        if (config.mangle) {
            ast = uglify.ast_mangle(ast, config);
        }
        if (config.squeeze) {
            ast = uglify.ast_squeeze(ast, config);
        }

        source = uglify.gen_code(ast, config);

        source = source.replace(reTokens, function () {
            return '\n' + comments.shift() + '\n';
        });

        if (source.substr(source.length - 1) === ')') {
            source += ';';
        }
        source += '\n';
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
