/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/*jslint regexp: true */
exports.task = function (resource, options, done) {
    'use strict';

    var URL_REGEX = /(\:\s*url\s*\()([^\)]+)(\))/g,
        liburl = require('url'),
        Y = options.shaker.Y,
        shakerConfig = options.shaker.config,
        locations = options.shaker.organizedResources.locations,
        appResources = options.shaker.appResources,
        getAbsoluteUrl = function (url) {
            // remove any sorrounding quotes
            url = url.replace(/(^['"])|(['"]$)/g, '');

            // get the full path of the url referenced
            return liburl.resolve(resource.url, url);
        };

    resource.locationContent = resource.locationContent || {};

    Y.Object.each(locations, function (locationMeta, location) {
        var root = (locationMeta.yuiConfig && locationMeta.yuiConfig.groups && locationMeta.yuiConfig.groups.app
            && locationMeta.yuiConfig.groups.app.root) || '/';
        // make sure root starts with '/'
        root = root[0] === '/' ? root : '/' + root;
        resource.locationContent[location] = resource.content.replace(URL_REGEX,
            function (match, start, url, end) {
                var absoluteUrl = getAbsoluteUrl(url);

                // if the corresponding resource has been uploaded, update the location
                if (appResources[absoluteUrl] && appResources[absoluteUrl].locations[location]) {
                    return start + JSON.stringify(root + appResources[absoluteUrl].locations[location]) + end;
                }

                return match;
            });
    });

    // if this resource is inlined, then any local url reference should be absolute
    resource.inlineContent = (resource.inlineContent !== undefined ?
            resource.inlineContent : resource.content).replace(URL_REGEX, function (match, start, url, end) {
        var absoluteUrl = getAbsoluteUrl(url);
        if (appResources[absoluteUrl]) {
            return start + JSON.stringify(absoluteUrl) + end;
        }
        return match;
    });

    done();
};
