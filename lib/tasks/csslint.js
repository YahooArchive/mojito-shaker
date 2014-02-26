/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var linter = require('csslint').CSSLint;

exports.task = function (resource, options, done) {
    'use strict';

    var result = linter.verify(resource.content, options || null);

    done(result.messages[0] && result.messages[0].message);
};
