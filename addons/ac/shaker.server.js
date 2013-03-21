/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true, plusplus: true */

YUI.add('mojito-shaker-addon', function (Y, NAME) {
    'use strict';
    var PAGE_POSITIONS = ['shakerInlineCss', 'top', 'shakerTop', 'shakerInlineJs', 'bottom'];

    function ShakerAddon(command, adapter, ac) {
        this.ac = ac;
        this.context = ac.context;
        this.route = ac.url.find(adapter.req.url, adapter.req.method);
        this._hookDone(ac, adapter);

        // initialize shaker global data
        this.shakerGlobal = ac.globals.get(NAME) || {};
        if (!this.shakerGlobal) {
            ac.globals.set(NAME, this.shakerGlobal);
        }
    }

    ShakerAddon.prototype = {

        namespace: 'shaker',

        /**
         * This is automatically called after this is constructed. This gives access to the
         * resources store object, which is used to retrieve the shaker meta data.
         * @param {object} rs The resource store object.
         */
        setStore: function (rs) {
            this.rs = rs;
            this.title = rs.shaker.title;
            this.meta = rs.shaker.meta;
            this.settings = this.meta.settings;
            this.posl = rs.selector.getPOSLFromContext(this.context);
            this.poslStr = this.posl.join("-");
            this.appResources = this.meta.app && this.meta.app[this.poslStr].app.assets;
            this.currentLocation = this.meta.currentLocation;
            this.inline = this.settings.inline ? this.meta.inline : null;
            this.rollups = this.route ? this.meta.app[this.poslStr].rollups &&
                this.meta.app[this.poslStr].rollups[this.route.name] : null;
        },

        /**
         * Updates the assets by adding app resources, rollups, and updating location.
         * Updates the title and creates the mojito client runtime.
         * @param {object} assets The assets to be updated by shaker.
         * @param {object} binders The binders to be used to create the mojito client runtime
         */
        run: function (assets, binders) {
            this.isHTMLFrame = true; // this is necessary such that _shakerDone does not do anything for the htmlframe
            this._updateTitle();
            this._initializeAssets(assets);
            this._addYUILoader(assets, binders);
            this._addAppResources(assets);
            this._addRouteRollups(assets);
            this._filterAndUpdate(assets);
        },

        /**
         * Sets the page's title. The title is stored in the shaker global object, such
         * that it can be modified by any code using the shaker addon for this request.
         * @param {string} title The updated page title.
         */
        setTitle: function (title) {
            this.shakerGlobal.title = title;
        },

        /**
         * Updates the page's title that was set by calling this.setTitle
         * @param {string} title The updated page title.
         */
        _updateTitle: function () {
            // update title if this.setTitle was called
            this.ac.instance.config.title = this.shakerGlobal.title || this.ac.instance.config.title;
        },

        /**
         * Initializes the assets such that all asset types in all asset positions are defined
         * @param {object}
         */
        _initializeAssets: function (assets) {
            Y.Array.each(PAGE_POSITIONS, function (pagePosition) {
                assets[pagePosition] = assets[pagePosition] || {};
                assets[pagePosition].css = assets[pagePosition].css || [];
                assets[pagePosition].js = assets[pagePosition].js || [];
                assets[pagePosition].blob = assets[pagePosition].blob || [];
            });
        },

        /**
         * Adds YUI script and the loader.
         * @param {object} assets The assets to be updated.
         * @param {object} binders The binders to be used to create the mojito client runtime
         */
        _addYUILoader: function (assets, binders) {
            if (this.ac.instance.config.deploy === true && binders) {
                this.ac.assets.assets = assets;
                this.ac.deploy.constructMojitoClientRuntime(this.ac.assets, binders);
            }
            // move js assets to the bottom if specified by settings
            if (this.settings.serveJs.position === "bottom") {
                Array.prototype.unshift.apply(assets.bottom.js, assets.top.js);
                assets.top.js = [];
            }
        },

        /**
         * Adds app level resources.
         * @param {object} assets The assets to be updated.
         */
        _addAppResources: function (assets) {
            var self = this;
            if (!self.appResources) {
                return;
            }
            // TODO: only focus on page positions where app assets may appear
            Y.Array.each(PAGE_POSITIONS, function (pagePosition) {
                Y.Object.each(self.appResources[pagePosition], function (typeResources, type) {
                    Array.prototype.push.apply(assets[pagePosition][type], typeResources || []);
                });
            });
        },

        /**
         * Adds route rollups.
         * @param {object} assets The assets to be updated.
         */
        _addRouteRollups: function (assets) {
            var self = this;
            if (!self.rollups) {
                return;
            }
            // TODO: only focus on page positions where rollups may appear
            Y.Array.each(PAGE_POSITIONS, function (pagePosition) {
                Y.Object.each(self.rollups.assets[pagePosition], function (typeResources, type) {
                    Array.prototype.push.apply(assets[pagePosition][type], typeResources || []);
                });
            });
        },

        /**
         * Updates the location of each resource, filters out resources already in rollup.
         * Handles comboloading.
         * @param {object} assets The assets to be updated.
         */
        _filterAndUpdate: function (assets) {
            var self = this;
            Y.Object.each(assets, function (positionResources, position) {
                Y.Object.each(positionResources, function (typeResources, type) {
                    var i = 0,
                        newLocation,
                        isRollup = false,
                        isExternalLink = false,
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
                            newLocation = self.currentLocation && self.currentLocation.resources[typeResources[i]];
                            isRollup = self.rollups && self.rollups[type] && self.rollups[type].rollups.indexOf(typeResources[i]) !== -1;
                            isExternalLink = typeResources[i].indexOf("http") === 0;
                            // don't combo load rollups, or external links
                            if (comboLoad && !isRollup && !isExternalLink) {
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
                    }
                    if (position === "shakerInlineJs" && inlineElement) {
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

        /**
         * Updates the location of each resource, filters out resources already in rollup.
         * Handles comboloading.
         * @param {object} assets The assets to be updated.
         */
        _comboload: function (resourcesArray, isLocal) {
            var comboSep = "~", // default comboSep
                comboBase = "/combo~", // default comboBase
                locationComboConfig = this.currentLocation && this.currentLocation.yuiConfig && this.currentLocation.yuiConfig.groups &&
                           this.currentLocation.yuiConfig.app;
            // if location is not local, then update comboBase and comboSep as specified in location's config
            if (!isLocal) {
                comboBase = (locationComboConfig && locationComboConfig.comboBase) || comboBase;
                comboSep = (locationComboConfig && locationComboConfig.comboSep) || comboSep;
            }
            // if just one resource return it, otherwise return combo url
            return resourcesArray.length === 1 ? resourcesArray[0] : comboBase + resourcesArray.join(comboSep);
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
        _shakerDone: function (selfContext, done, data, meta) {
            var self = this,
                args;

            // only execute if this is not the html frame and there is inline data
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
                        // add inline css to the top of the html
                        inlineElement = "<style>" + inlineElement + "</style>";
                        if (typeof data === 'string') {
                            data = inlineElement + data;
                        } else if (data instanceof Array) {
                            data.splice(0, 0, inlineElement);
                        }
                    } else if (type === "js" && inlineElement) {
                        // add inline js to the bottom of the html
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

            // restore the original arguments and call the real adapter.done with the modified data.
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
        'mojito-url-addon',
        'yahoo.addons.globals'
    ]
});
