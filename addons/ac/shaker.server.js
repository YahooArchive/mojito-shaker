/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true, plusplus: true, regexp: true */

YUI.add('mojito-shaker-addon', function (Y, NAME) {
    'use strict';
    var PAGE_POSITIONS = ['shakerInlineCss', 'top', 'shakerTop', 'shakerInlineJs', 'bottom'];

    function ShakerAddon(command, adapter, ac) {
        var data;
        this.ac = ac;
        this.pagePositions = PAGE_POSITIONS;

        // initialize shaker global data
        this.data = adapter.req.shakerGlobal;
        if (!this.data) {
            data = this.data = {
                htmlData: {
                    title: ac.instance.config.title || 'Powered by Mojito',
                    mojito_version: Y.mojito.version
                }
            };
            adapter.req.shakerGlobal = data;
            data.context = ac.context;
            data.route = ac.url.find(adapter.req.url, adapter.req.method);
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
            var data = this.data;
            if (data.initialized) {
                return;
            }

            data.rs = rs;
            data.title = rs.shaker.title;
            data.meta = rs.shaker.meta;
            data.settings = data.meta.settings;
            data.posl = rs.selector.getPOSLFromContext(data.context);
            data.poslStr = data.posl.join("-");
            data.appResources = data.meta.app && data.meta.app[data.poslStr].app.assets;
            data.currentLocation = data.meta.currentLocation;
            data.inline = data.settings.inline ? data.meta.inline : null;
            data.rollups = data.route && data.currentLocation ? data.meta.app[data.poslStr].rollups &&
                data.meta.app[data.poslStr].rollups[data.route.name] : null;

            data.initialized = true;
        },

        /**
         * Updates the assets by adding app resources, rollups, and updating location.
         * Updates the title and creates the mojito client runtime.
         * @param {object} assets The assets to be updated by shaker.
         * @param {object} binders The binders to be used to create the mojito client runtime
         */
        run: function (assets, binders) {
            this._addYUILoader(assets, binders);
            this._addAppResources(assets);
            this._addRouteRollups(assets);
            this._filterAndUpdate(assets);
        },

        /**
         * Sets html data such as title, html_class, html_attributes
         * or settings like serveJs, serveCss, inline
         * @param {string} name The name of the property to set
         * @param {value} value The value to set the property
         */
        set: function (name, value) {
            var data = this.data,
                isSetting = name === "serveJs" || name === "serveCss" || name === "inline" ||
                    name === "serveLocation" || name === "optimizeBootstrap";

            if (isSetting) {
                // must clone settings to prevent interference between requests
                if (!data.settingCloned) {
                    data.settings = Y.clone(data.settings);
                    data.settingsCloned = true;
                }
                // merge setting with value object
                if (Y.Lang.isObject(value)) {
                    Y.mix(data.settings[name], value, true, null, 0, true);
                } else {
                    data.settings[name] = value;
                }
                return data.settings[name];
            }

            data.htmlData[name] = value;
            return value;
        },

        /**
         * Gets html data such as title, html_class, html_attributes
         * or settings like serveJs, serveCss, inline
         * @param {string} name The name of the property to get
         */
        get: function (name) {
            var data = this.data,
                isSetting = name === "serveJs" || name === "serveCss" || name === "inline" ||
                    name === "serveLocation" || name === "optimizeBootstrap";

            if (isSetting) {
                return data.settings[name];
            }

            return data.htmlData[name];
        },

        /**
         * Adds YUI script and the loader.
         * @param {object} assets The assets to be updated.
         * @param {object} binders The binders to be used to create the mojito client runtime
         */
        _addYUILoader: function (assets, binders) {
            if (!this.data.settings.serveJs) {
                return;
            }
            assets.bottom = assets.bottom || {};
            assets.bottom.js = assets.bottom.js || [];
            if (this.ac.instance.config.deploy === true && binders) {
                this.ac.assets.assets = assets;
                this.ac.deploy.constructMojitoClientRuntime(this.ac.assets, binders);
            } else {
                return;
            }

            // move js assets to the bottom if specified by settings
            if (this.data.settings.serveJs.position === "bottom") {
                Array.prototype.unshift.apply(assets.bottom.js, assets.top.js);
                assets.top.js = [];
            }
        },

        /**
         * Adds app level resources.
         * @param {object} assets The assets to be updated.
         */
        _addAppResources: function (assets) {
            var data = this.data;
            if (!data.appResources) {
                return;
            }
            Y.Array.each(PAGE_POSITIONS, function (pagePosition) {
                Y.Object.each(data.appResources[pagePosition], function (typeResources, type) {
                    if ((!data.settings.serveJs && type === "js") ||
                            (!data.settings.serveCss && type === "css")) {
                        return;
                    }
                    assets[pagePosition] = assets[pagePosition] || {};
                    assets[pagePosition][type] = assets[pagePosition][type] || [];
                    Array.prototype.unshift.apply(assets[pagePosition][type], typeResources || []);
                });
            });
        },

        /**
         * Adds route rollups.
         * @param {object} assets The assets to be updated.
         */
        _addRouteRollups: function (assets) {
            var data = this.data;
            if (!data.rollups) {
                return;
            }
            Y.Array.each(['top', 'shakerTop', 'bottom'], function (pagePosition) {
                Y.Object.each(data.rollups.assets[pagePosition], function (typeResources, type) {
                    if ((!data.settings.serveJs && type === "js") ||
                            (!data.settings.serveCss && type === "css")) {
                        return;
                    }
                    assets[pagePosition] = assets[pagePosition] || {};
                    assets[pagePosition][type] = assets[pagePosition][type] || [];
                    Array.prototype.push.apply((assets[pagePosition] || {})[type], typeResources || []);
                });
            });
        },

        /**
         * Updates the location of each resource, filters out resources already in rollup.
         * Handles comboloading.
         * @param {object} assets The assets to be updated.
         */
        _filterAndUpdate: function (assets) {
            var self = this,
                data = this.data;

            self._removeTypeAssets(assets);

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

                    comboLoad = (type === "js" && data.settings.serveJs.combo)
                        || (type === "css" && data.settings.serveCss.combo);

                    while (i < typeResources.length) {
                        // remove resource if found in rollup
                        if (data.rollups && data.rollups[type] && data.rollups[type].resources[typeResources[i]]) {
                            typeResources.splice(i, 1);
                        } else if (data.inline && data.inline[typeResources[i]] !== undefined &&
                                (position === "shakerInlineCss" || position === "shakerInlineJs")) {
                            // resource is to be inlined
                            inlineElement += data.inline[typeResources[i]].trim();
                            typeResources.splice(i, 1);
                        } else {
                            // replace asset with new location if available
                            newLocation = data.currentLocation && data.currentLocation.resources[typeResources[i]];
                            isRollup = data.rollups && data.rollups[type] && data.rollups[type].rollups.indexOf(typeResources[i]) !== -1;
                            isExternalLink = typeResources[i].indexOf("http") === 0;
                            // don't combo load rollups, or external links
                            if (comboLoad && !isRollup && !isExternalLink) {
                                // get local resource to comboload
                                if (data.settings.serveLocation === "local" || !newLocation) {
                                    comboLocalTypeResources.push(newLocation || typeResources[i]);
                                } else {
                                    // get location resources to comboload
                                    // just use the path of the url
                                    newLocation = newLocation.replace(/https?:\/\/[^\/]+/, '');
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
         * Remove any type assets as specified in the config
         * @param {object} assets The assets to be filtered.
         */
        _removeTypeAssets: function (assets) {
            var data = this.data;

            // if serving both js and css then return
            if (data.settings.serveJs && data.settings.serveCss) {
                return;
            }

            Y.Array.each(Y.Object.keys(assets), function (pagePosition) {
                if (!data.settings.serveCss) {
                    if (pagePosition === "shakerInlineCss") {
                        delete assets[pagePosition];
                    } else {
                        delete assets[pagePosition].css;
                    }
                }
                if (!data.settings.serveJs) {
                    if (pagePosition === "shakerInlineJs") {
                        delete assets[pagePosition];
                    } else {
                        delete assets[pagePosition].js;
                    }
                }
            });
        },

        /**
         * Updates the location of each resource, filters out resources already in rollup.
         * Handles comboloading.
         * @param {object} assets The assets to be updated.
         */
        _comboload: function (resourcesArray, isLocal) {
            var data = this.data,
                comboSep = "~", // default comboSep
                comboBase = "/combo~", // default comboBase
                locationComboConfig = data.currentLocation && data.currentLocation.yuiConfig && data.currentLocation.yuiConfig.groups &&
                           data.currentLocation.yuiConfig.groups.app;

            // if location is not local, then update comboBase and comboSep as specified in location's config
            if (!isLocal) {
                comboBase = (locationComboConfig && locationComboConfig.comboBase) || comboBase;
                comboSep = (locationComboConfig && locationComboConfig.comboSep) || comboSep;
            }
            // if just one resource return it, otherwise return combo url
            return resourcesArray.length === 1 ? resourcesArray[0] : comboBase + resourcesArray.join(comboSep);
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
