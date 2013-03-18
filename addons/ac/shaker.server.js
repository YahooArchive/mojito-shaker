/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true */

YUI.add('mojito-shaker-addon', function (Y, NAME) {
    'use strict';
    var self,
        PAGE_POSITIONS = ['shakerInlineCss', 'top', 'shakerTop', 'shakerInlineJs', 'bottom', 'shakerBottom'];

    function ShakerAddon(command, adapter, ac) {
        this.pagePositions = PAGE_POSITIONS;
        this.ac = ac;
        this.context = ac.context;
        this.route = ac.url.find(adapter.req.url, adapter.req.method);
        this._hookDone(ac, adapter);
        self = this;
    }

    ShakerAddon.prototype = {

        namespace: 'shaker',

        setStore: function (rs) {
            this.rs = rs;
            this.title = rs.shaker.title;
            this.meta = rs.shaker.meta;
            this.settings = this.meta.settings;
            this.posl = rs.selector.getPOSLFromContext(this.context);
            this.poslStr = this.posl.join("-")
            this.appResources = this.meta.app && this.meta.app[this.poslStr].app.assets;
            this.currentLocation = this.meta.currentLocation;
            this.rollups = this.route ? this.meta.app[this.poslStr].rollups && this.meta.app[this.poslStr].rollups[this.route.name] : null;
            this.inline = this.settings.inline ? this.meta.inline : null;
        },

        run: function (assets, binders) {
            var start = new Date().getTime();
            this.isHTMLFrame = true;
            this._getTitle(assets);
            this._initializeAssets(assets);
            this._addYUILoader(assets, binders);
            this._addAppResources(assets);
            this._addRouteRollups(assets);
            this._filterAndUpdate(assets);
            //console.log("time: " + ((new Date().getTime()) - start));
        },

        _addYUILoader: function (assets, binders) {
            if (this.ac.instance.config.deploy === true && binders) {
                self.ac.assets.assets = assets;
                self.ac.deploy.constructMojitoClientRuntime(self.ac.assets, binders);
            }
            // move js assets to the bottom if specified by settings
            if (self.settings.serveJs.position === "bottom") {
                Array.prototype.unshift.apply(assets.bottom.js, assets.top.js);
                assets.top.js = [];
            }
        },

        setTitle: function (title) {
            self.ac.assets.addBlob(title, 'shakerTitle');
        },

        _getTitle: function (assets) {
            // if the title was set, choose the last title that was set
            if (assets.shakerTitle && assets.shakerTitle.blob) {
                this.ac.instance.config.title = assets.shakerTitle.blob[assets.shakerTitle.blob.length - 1];
            }
        },

        _initializeAssets: function (assets) {
            Y.Array.each(PAGE_POSITIONS, function (pagePosition) {
                assets[pagePosition] = assets[pagePosition] || {};
                assets[pagePosition].css = assets[pagePosition].css || [];
                assets[pagePosition].js = assets[pagePosition].js || [];
                assets[pagePosition].blob = assets[pagePosition].blob || [];
            });
        },

        _addAppResources: function (assets) {
            if (!self.appResources) {
                return;
            }
            Y.Array.each(self.pagePositions, function (pagePosition) {
                Y.Object.each(self.appResources[pagePosition], function (typeResources, type) {
                    Array.prototype.push.apply(assets[pagePosition][type], typeResources || []);
                });
            });
        },

        _addRouteRollups: function (assets) {
            // add route rollups
            // do not add rollups is current location is default
            if (!self.rollups) {
                return;
            }
            Y.Array.each(self.pagePositions, function (pagePosition) {
                Y.Object.each(self.rollups.assets[pagePosition], function (typeResources, type) {
                    Array.prototype.push.apply(assets[pagePosition][type], typeResources || []);
                });
            });
        },

        _filterAndUpdate: function (assets) {
            Y.Object.each(assets, function (positionResources, position) {
                Y.Object.each(positionResources, function (typeResources, type) {
                    var i = 0,
                        newLocation,
                        isRollup = false,
                        inlineElement = "",
                        comboLocalTypeResources = [],
                        comboLocationTypeResources = [],
                        comboLoad;

                    if (type === "blob") {
                        type = position === "shakerInlineCss" ? "css" : position === "shakerInlineJs" ? "js" : type;
                    }

                    comboLoad = (type === "js" && self.settings.serveJs.combo)
                                 || (type === "css" && self.settings.serveCss.combo);

                    while (i < typeResources.length) {
                        // remove resource if found in rollup
                        if (self.rollups && self.rollups[type] && self.rollups[type].resources[typeResources[i]]) {
                            typeResources.splice(i, 1);
                        } else if (self.inline && self.inline[typeResources[i]] !== undefined) {
                            // resource is to be inlined
                            inlineElement += self.inline[typeResources[i]].trim();
                            typeResources.splice(i, 1);
                        } else {
                            // replace asset with new location if available
                            newLocation = self.currentLocation && self.currentLocation && self.currentLocation.resources[typeResources[i]];
                            isRollup = self.rollups && self.rollups[type] && self.rollups[type].rollups.indexOf(typeResources[i]) !== -1;

                            // don't combo load rollups
                            if (comboLoad && !isRollup) {
                                // get local resource to comboload
                                if (self.settings.serveLocation === "local" || !newLocation) {
                                    comboLocalTypeResources.push(newLocation || typeResources[i]);
                                } else {
                                    // get location resources to comboload
                                    comboLocationTypeResources.push(newLocation);
                                }
                                // remove resource since it will appear comboloaded
                                typeResources.splice(i, 1);
                            } else {
                                typeResources[i] = newLocation || typeResources[i];
                                i++;
                            }
                        }
                    }

                    // create inline asset
                    if (position === "shakerInlineCss" && inlineElement) {
                        typeResources.push("<style>" + inlineElement + "</style>");
                        return;
                    } else if (position === "shakerInlineJs" && inlineElement) {
                        typeResources.push("<script>" + inlineElement + "</script>");
                        return;
                    }

                    // add comboload resources
                    if (comboLoad && comboLocalTypeResources.length !== 0) {
                        typeResources.push(self._comboload(comboLocalTypeResources, true));
                    }
                    if (comboLoad && comboLocationTypeResources.length !== 0) {
                        typeResources.push(self._comboload(comboLocationTypeResources, false));
                    }
                });
            });
        },

        _comboload: function (resourcesArray, isLocal) {
            var comboSep = "~",
                comboBase = "/combo~",
                locationComboConfig = self.currentLocation && self.currentLocation.yuiConfig && self.currentLocation.yuiConfig.groups &&
                           self.currentLocation.yuiConfig.app;
            if (!isLocal) {
                comboBase = locationComboConfig && locationComboConfig.comboBase || comboBase;
                comboSep = locationComboConfig && locationComboConfig.comboSep || comboSep;
            }
            // if just one resource return it, otherwise return combo url
            return resourcesArray.length === 1 ? resourcesArray[0] : comboBase + resourcesArray.join(comboSep);
        },

        /*_mergeAssets: function (assets) {
            // place shakerInlineCss above 'top'
            Array.prototype.unshift.apply(assets.top.blob, assets.shakerInlineCss.blob || []);
            // place shakerTop below 'top'
            Y.Object.each(assets.shakerInlineCss, function (typeResource, type) {
                Array.prototype.push.apply(assets.top[type], assets.shakerTop[type] || []);
            });
            // place shakerInlineJs above 'bottom'
            Array.prototype.unshift.apply(assets.bottom.blob, assets.shakerInlineJs.blob || []);
            // place shakerBottom below 'bottom'
            Y.Object.each(assets.shakerBottom, function (typeResource, type) {
                Array.prototype.push.apply(assets.bottom[type], assets.shakerBottom[type] || []);
            });
            delete assets.shakerInlineCss;
            delete assets.shakerTop;
            delete assets.shakerInlineJs;
            delete assets.shakerBottom;
        },*/

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
        * The first two arguments are the real context and method of Mojito, that we pass artificially on @_hookDoneMethod
        * The rest are the original arguments that are being passed by Mojito.
        * We have to do like this since we need to modify the arguments but we don't know how many we got.
        */
        _shakerDone: function (selfContext, done, data, meta) {
            var self = this,
                args;

            if (!self.isHTMLFrame && self.inline) {
                Y.Array.each(["shakerInlineCss", "shakerInlineJs"], function (position) {
                    var positionResources = meta.assets[position],
                        inlineElement = "",
                        type = position === "shakerInlineCss" ? "css" : "js";

                    if (!positionResources) {
                        return;
                    }

                    Y.Array.each(positionResources.blob, function (resource) {
                        // do not add inline asset if already in rollup
                        if (self.rollups && self.rollups[type] && self.rollups[type].resources[resource]) {
                            return;
                        }
                        if (self.inline[resource]) {
                            inlineElement += self.inline[resource];
                        }
                    });

                    if (type === "css" && inlineElement) {
                        inlineElement = "<style>" + inlineElement + "</style>";
                        if (typeof data === 'string') {
                            data = inlineElement + data;
                        } else if (data instanceof Array) {
                            data.splice(0, 0, inlineElement);
                        }
                    } else if (type === "js" && inlineElement) {
                        inlineElement = "<script>" + inlineElement + "</script>";
                        if (typeof data === 'string') {
                            data += inlineElement;
                        } else if (data instanceof Array) {
                            data.push(inlineElement);
                        }
                    }
                    // empty inline resources
                    // do not delete this position (causes resources to appear twice for some reason)
                    meta.assets[position].blob = [];
                });
            }


            // Restore the original arguments and call the real ac.done with the modified data.
            args = [].slice.apply(arguments).slice(2);
            args[0] = data;
            done.apply(selfContext, args);
        }
    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-config-addon',
        'mojito-deploy-addon',
        'mojito-url-addon'
    ]
});