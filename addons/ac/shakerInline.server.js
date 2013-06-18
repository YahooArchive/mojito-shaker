/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true */

YUI.add('shaker-inline-addon', function (Y, NAME) {
    'use strict';
    function ShakerInlineAddon(command, adapter, ac) {
        var data;
        this.ac = ac;
        this._hookDone(ac, adapter);

        // get data from shaker addon
        this.data = ac.shaker.data;
    }

    ShakerInlineAddon.prototype = {

        namespace: 'shakerInline',

        getInlineContent: function (file, mojit) {
            var data = this.data,
                appName = data.rs.url.config.appName,
                prefix = data.rs.url.config.prefix,
                url = '/' + prefix + '/' + (mojit || appName) + '/assets/' + file;

            return data.inline[url];
        },

        inlineFile: function (file, type) {
            var data = this.data,
                inlineLocation = type === "js" ? "shakerInlineJs" : type === "css" ? "shakerInlineCss" : null,
                resourcesArray,
                inlineFile;

            // ignore if no inline files or type is not to be served
            if (!data.settings.inline || (!data.settings.serveJs && type === "js") || (!data.settings.serveCss && type === "css")) {
                return;
            }

            // look for asset within application resources in order to remove it
            // this prevents the inline asset from appearing twice
            Y.Array.some(inlineLocation ? [inlineLocation] : ["shakerInlineJs", "shakerInlineCss"], function (location) {
                resourcesArray = data.appResources && data.appResources[location] && data.appResources[location].blob;
                if (resourcesArray) {
                    inlineLocation = location;
                    return true;
                }
            });
            // look for asset within resources array
            Y.Array.some(resourcesArray || [], function (url, i) {
                var filenameStart = url.lastIndexOf("/") + 1;
                if (url.indexOf(file + "-inline", filenameStart) === filenameStart) {
                    inlineFile = url;
                    // remove inline file from appResources
                    // TODO: must clone appResources to prevent interference with different requests
                    // investigate if this is a performance issue
                    if (!data.appResourcesCloned) {
                        data.appResources = Y.clone(data.appResources);
                        data.appResourcesCloned = true;
                    }

                    data.appResources[inlineLocation].blob.splice(i, 1);
                    return true;
                }
            });

            if (inlineFile) {
                this.ac.assets.addAsset("blob", inlineLocation, inlineFile);
            }
        },

        inlineCode: function (content, type) {
            if (type === "js") {
                this.ac.assets.addAsset("blob", "shakerInlineJs", "<script>" + content + "</script>");
            } else if (type === "css") {
                this.ac.assets.addAsset("blob", "shakerInlineCss", "<style>" + content + "</style>");
            }
        },

        /**
         * Hook into ac.adapter.done in order to use @_shakerDone to modify html with inline js or css
         */
        _hookDone: function (ac, adapter) {
            var self = this,
                originalDone = adapter.done;

            adapter.done = function () {
                // We don't know for sure how many arguments we have,
                // so we have to pass through the hook references plus all the original arguments.
                self._shakerDone.apply(self, [this, originalDone].concat([].slice.apply(arguments)));
            };
        },
        /*
         * The first two arguments are the real context and method of Mojito, which we pass through @_hookDone
         * The rest are the original arguments that are passed by Mojito.
         * This is necessary since we need to modify the arguments but we don't know how many we may get.
         */
        _shakerDone: function (selfContext, done, mojitData, meta) {
            var data = this.data,
                args,
                inlinePositions = [];

            if (data.settings.serveJs) {
                inlinePositions.push('shakerInlineJs');
            }
            if (data.settings.serveCss) {
                inlinePositions.push('shakerInlineCss');
            }

            // only execute if inline is on
            if (data.settings.inline) {
                Y.Array.each(inlinePositions, function (position) {
                    var positionResources = meta.assets && meta.assets[position],
                        inlineElement = "",
                        type = position === "shakerInlineCss" ? "css" : "js",
                        tmpData;

                    if (!positionResources) {
                        return;
                    }

                    Y.Array.each(positionResources.blob, function (resource) {
                        // do not add inline asset if already in rollup
                        if (data.rollups && data.rollups[type] && data.rollups[type].resources[resource]) {
                            return;
                        }
                        if (data.inline[resource]) {
                            inlineElement += data.inline[resource];
                        }
                    });

                    if (type === "css" && inlineElement) {
                        // add inline css to the top of the html
                        inlineElement = "<style>" + inlineElement + "</style>";
                        if (typeof mojitData === 'string') {
                            if (meta.dataType === 'json') {
                                tmpData = JSON.parse(mojitData);
                                tmpData.css = inlineElement;
                                mojitData = JSON.stringify(tmpData);
                            } else {
                                mojitData = inlineElement + mojitData;
                            }
                        } else if (data instanceof Array) {
                            mojitData.splice(0, 0, inlineElement);
                        }
                    } else if (type === "js" && inlineElement) {
                        // add inline js to the bottom of the html
                        inlineElement = "<script>" + inlineElement + "</script>";
                        if (typeof mojitData === 'string') {
                            if (meta.dataType === 'json') {
                                tmpData = JSON.parse(mojitData);
                                tmpData.js = inlineElement;
                                mojitData = JSON.stringify(tmpData);
                            } else {
                                mojitData = mojitData + inlineElement;
                            }
                        } else if (data instanceof Array) {
                            mojitData.push(inlineElement);
                        }
                    }
                    // empty inline resources
                    // do not delete this position (causes resources to appear twice for some reason)
                    meta.assets[position].blob = [];
                });
            }

            // restore the original arguments and call the real adapter.done with the modified data.
            args = [].slice.apply(arguments).slice(2);
            args[0] = mojitData;
            done.apply(selfContext, args);
        }
    };

    Y.mojito.addons.ac.shakerInline = ShakerInlineAddon;

}, '0.0.1', {
    requires: [
        'mojito-shaker-addon'
    ]
});
