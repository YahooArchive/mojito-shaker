/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var Shaker = require('./lib/shaker').Shaker;

/**
 * The request contextualizer. Middleware which adds context to a request.
 * @constructor
 */
function ShakerMiddleware() {
}

ShakerMiddleware.prototype = {
    handle: function(config) {
        new Shaker(config.store).run();

        return function(req, res, next) {
            console.log('Shaker Request');
            next();
        };
    }
};


/**
 * Export a function capable of constructing a new contextualizer.
 * @param {Object} config Data to configure the new contextualizer.
 * @return {Object} The contextualizer.
 */
module.exports = function(config) {
    var middleware = new ShakerMiddleware();
    return middleware.handle(config);
};
