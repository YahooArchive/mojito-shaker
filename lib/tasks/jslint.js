/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var linter = require('jslint/lib/linter');

exports.task = function (resource, options, done) {
    'use strict';
    var error,
        result;

    options = options || {};

    options.browser = true;

    // Make YUI global
    result = linter.lint("/*globals YUI */\n" + resource.content, options || {});
    if (result.errors.length > 0) {
        error = "Line " + result.errors[0].line + ", character " + result.errors[0].character + ": " + result.errors[0].reason;
    }

    done(error);
};
