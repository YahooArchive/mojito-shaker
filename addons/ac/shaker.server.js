/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint nomen: true, plusplus: true, regexp: true */

YUI.add('mojito-shaker-addon', function (Y, NAME) {
    'use strict';
    var libUrl = require('url'),
        libPath = require('path'),
        URL_REGEX = /^https?:\/\//,
        PAGE_POSITIONS = ['shakerInlineCss', 'top', 'shakerTop', 'shakerInlineJs', 'bottom'],
        SCRIPT_TAGS_REGEX = /<\/?script[^>]*>/g;

    function ShakerAddon(command, adapter, ac) {
        var data;
        this.ac = ac;

        // Initialize shaker global data.
        this.data = adapter.req.shakerGlobal;
        if (!this.data) {
            data = this.data = {
                htmlData: {
                    title: ac.config.get('title') || 'Powered by Mojito',
                    mojito_version: Y.mojito.version
                }
            };
            adapter.req.shakerGlobal = data;
            data.context = ac.context;
            data.route = ac.url.find(adapter.req.url, adapter.req.method) || {};
            data.routeName = data.route.annotations !== undefined ? data.route.annotations.name : data.route.name;
            data.frameAc = ac;
        }
        this.frameAc = this.data.frameAc;
    }

    ShakerAddon.prototype = {

        namespace: 'shaker',

        PAGE_POSITIONS: PAGE_POSITIONS,

        /**
         * This is automatically called after this is constructed. This gives access to the
         * resources store object, which is used to retrieve the shaker meta data.
         * @param {object} rs The resource store object.
         */
        setStore: function (rs) {
            var data = this.data,
                yuiConfig;

            if (data.initialized) {
                return;
            }

            // Get the yui config that will be used on the client.
            yuiConfig = rs.yui.getYUIConfig(Y.mix({
                runtime: 'client'
            }, data.context));
            data.yuiConfig = yuiConfig || {};
            data.yuiAppConfig = (yuiConfig.groups && yuiConfig.groups.app) || {};

            data.rs = rs;
            data.title = rs.shaker.title;
            data.meta = rs.shaker.meta;
            data.settings = data.meta.settings;
            data.posl = rs.selector.getPOSLFromContext(data.context);
            data.poslStr = data.posl.join("-");
            data.appResources = data.meta.app && data.meta.app[data.poslStr].app.assets;
            data.currentLocation = data.meta.currentLocation;
            data.currentLocationName = data.meta.currentLocationName;
            data.locationMap = (data.currentLocation && data.currentLocation.resources) || {};
            data.inline = data.meta.inline || {};
            data.rollups = data.currentLocation ? data.meta.app[data.poslStr].rollups &&
                data.meta.app[data.poslStr].rollups[data.routeName] : null;
            data.bootstrapEnabled = !!(data.rollups && data.rollups.js &&
                data.rollups.js.resources["yui-bootstrap--yui-bootstrap-override"] &&
                data.inline["yui-bootstrap--yui-bootstrap-inline"]);

            data.initialized = true;
        },

        /**
         * Updates the assets by adding app resources, rollups, and updating location.
         * Updates the title and creates the mojito client runtime.
         * @param {object} assets The assets to be updated by shaker.
         * @param {object} binders The binders to be used to create the mojito client runtime
         */
        run: function (assets, binders) {
            this._addRouteRollups(assets);
            this._addYUILoader(assets, binders);
            this._addBootstrap(assets);
            this._addAppResources(assets);
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
            var data = this.data,
                yuiConfig = data.yuiConfig,
                yuiAppConfig = data.yuiAppConfig,
                mojitoClientAssets = {
                    top: {
                        js: []
                    },
                    bottom: {
                        blob: []
                    }
                },
                jsPosition = data.settings.serveJs.position,
                yuiLoaderModules = ['yui-base', 'loader-base', 'loader-yui3'];

            if (!data.settings.serveJs) {
                return;
            }

            assets.shakerInlineJs = assets.shakerInlineJs || {};
            assets.shakerInlineJs.blob = assets.shakerInlineJs.blob || [];

            // construct mojito client
            if (this.ac.instance.config.deploy === true && binders) {
                this.ac.assets.assets = mojitoClientAssets;
                this.ac.deploy.constructMojitoClientRuntime(this.ac.assets, binders);
            } else {
                return;
            }

            // add yui, loader, and mojito client to assets
            assets[jsPosition] = assets[jsPosition] || {};
            assets[jsPosition].js = assets[jsPosition].js || [];

            // remove any yui modules already included in the rollups
            if (data.rollups && data.rollups.js) {
                (function () {
                    var i = 0,
                        j,
                        file,
                        modules,
                        module,
                        config,
                        isCombo,
                        files = mojitoClientAssets.top.js,
                        moduleInRollup = function (module) {
                            var i,
                                isInRollup = false;
                            Y.Array.some(yuiLoaderModules, function (yuiLoaderModule) {
                                if (data.rollups.js.resources['yui-module--' + yuiLoaderModule] &&
                                        new RegExp(yuiLoaderModule + '[\\.\\-_]').test(module)) {
                                    isInRollup = true;
                                    return true;
                                }
                            });
                            return isInRollup;
                        };

                    while (i < files.length) {
                        file = files[i];
                        isCombo = file.indexOf(yuiAppConfig.comboBase) === 0 || file.indexOf(yuiConfig.comboBase) === 0;
                        if (isCombo) {
                            config = file.indexOf(yuiAppConfig.comboBase) === 0 ? yuiAppConfig : yuiConfig;

                            file = file.substring(config.comboBase.length);
                            modules = file.split(config.comboSep);

                            j = 0;
                            while (j < modules.length) {
                                module = modules[j].split('/').pop();
                                if (moduleInRollup(module)) {
                                    modules.splice(j, 1);
                                } else {
                                    j++;
                                }
                            }
                            if (modules.length > 0) {
                                files[i] = config.comboBase + modules.join(config.comboSep);
                            } else {
                                files.splice(i, 1);
                                continue;
                            }
                        } else if (file.indexOf(yuiAppConfig.base) === 0 || file.indexOf(yuiConfig.base) === 0) {
                            module = file.split('/').pop();
                            if (moduleInRollup(module)) {
                                files.splice(i, 1);
                                continue;
                            }
                        }
                        i++;
                    }
                }());
            }

            // if the js rollup contains the yui base then the rollup must appear first
            // else the yui base and loader are added before any other js asset.
            Array.prototype[
                data.rollups && data.rollups.js && data.rollups.js.resources['yui-module--yui-base'] ? 'push' : 'unshift'
            ].apply(assets[jsPosition].js, mojitoClientAssets.top.js);

            // add mojito client
            if (data.bootstrapEnabled) {
                // add mojito client with other inline assets such that it gets merged with bootstrap
                // strip out script tags since these will be added after all inline js have been merged
                data.inline.mojitoClient = mojitoClientAssets.bottom.blob[0].replace(SCRIPT_TAGS_REGEX, '');
                assets.shakerInlineJs.blob.push('mojitoClient');
            } else {
                // add mojito client on the bottom
                assets.bottom = assets.bottom || {};
                assets.bottom.blob = assets.bottom.blob || [];
                Array.prototype.push.apply(assets.bottom.blob, mojitoClientAssets.bottom.blob);
            }

            this.ac.assets.assets = assets;
        },

        _addBootstrap: function (assets) {
            var self = this,
                data = self.data,
                // inline bootstrap contains SimpleLoader definition and a call to SimpleLoader
                inlineBootstrap = data.inline["yui-bootstrap--yui-bootstrap-inline"],
                simpleLoaderUse,
                jsUrls = [];

            if (!data.settings.serveJs) {
                return;
            }

            // add bootstrap if js rollup contains bootstrap files
            if (inlineBootstrap && data.bootstrapEnabled) {

                // determine all the js scripts in assets, and get their new location
                Y.Object.each(assets, function (positionResources, position) {
                    Y.Array.each(positionResources.js, function (path) {
                        var mappedLocation = data.locationMap[path] || path;
                        jsUrls.push(URL_REGEX.test(mappedLocation) ? mappedLocation : self._createUrl(path));
                    });
                    // empty list so that scripts dont appear on page
                    positionResources.js = [];
                });

                // construct bootstrap inline script
                if (jsUrls.length > 0) {
                    // construct list of js urls and append to SimpleLoader call
                    inlineBootstrap += "YUI.SimpleLoader.js('" + jsUrls.join("', '") + "');";
                }
                // add inline bootstrap before mojito-client inline script
                data.inline.inlineBootstrap = inlineBootstrap;
                assets.shakerInlineJs.blob.unshift('inlineBootstrap');
            }
        },

        /**
         * Adds app level resources.
         * @param {object} assets The assets to be updated.
         * @param {array} pagePositions Optional array of pagePositions to focus on.
         */
        _addAppResources: function (assets, pagePositions) {
            var data = this.data;
            if (!data.appResources) {
                return;
            }
            Y.Array.each(pagePositions || PAGE_POSITIONS, function (pagePosition) {
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
        // TODO: should js route rollup be forced to bottom when bootstrap is enabled
        _addRouteRollups: function (assets, pagePositions) {
            var data = this.data;
            if (!data.rollups) {
                return;
            }
            Y.Array.each(pagePositions || ['top', 'shakerTop', 'bottom'], function (pagePosition) {
                Y.Object.each(data.rollups.assets[pagePosition], function (typeResources, type) {
                    if ((!data.settings.serveJs && type === "js") ||
                            (!data.settings.serveCss && type === "css")) {
                        return;
                    }
                    assets[pagePosition] = assets[pagePosition] || {};
                    assets[pagePosition][type] = assets[pagePosition][type] || [];
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
            var self = this,
                data = this.data;

            self._removeTypeAssets(assets);

            Y.Object.each(assets, function (positionResources, position) {
                Y.Object.each(positionResources, function (typeResources, type) {
                    var i = 0,
                        isRollup = false,
                        isUrl = false,
                        inlineElement = "",
                        mappedLocation,
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
                        } else if (data.inline[typeResources[i]] !== undefined &&
                                (position === "shakerInlineCss" || position === "shakerInlineJs")) {
                            // resource is to be inlined
                            inlineElement += data.inline[typeResources[i]].trim();
                            typeResources.splice(i, 1);
                        } else if (type !== 'blob') {
                            // replace asset with new location if available
                            isRollup = data.rollups && data.rollups[type] && data.rollups[type].rollups.indexOf(typeResources[i]) !== -1;
                            mappedLocation = data.locationMap[typeResources[i]] || typeResources[i];
                            isUrl = URL_REGEX.test(mappedLocation);
                            // don't combo load rollups, or external links
                            if (comboLoad && !isRollup && !isUrl) {
                                // get local resource to comboload
                                if (data.settings.serveLocation === "local" || !data.locationMap[typeResources[i]]) {
                                    comboLocalTypeResources.push(mappedLocation);
                                } else {
                                    // get location resources to comboload
                                    comboLocationTypeResources.push(mappedLocation);
                                }
                                // remove resource since it will appear comboloaded
                                typeResources.splice(i, 1);
                            } else {
                                typeResources[i] = isUrl ? mappedLocation : self._createUrl(typeResources[i]);
                                i++;
                            }
                        } else {
                            i++;
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
                        typeResources.push(self._createComboUrl(comboLocalTypeResources, true));
                    }
                    if (comboLoad && comboLocationTypeResources.length !== 0) {
                        typeResources.push(self._createComboUrl(comboLocationTypeResources));
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
         * Creates a url based on a path.
         * @param {string} path The path.
         */
        _createUrl: function (path) {
            var yuiAppConfig = this.data.yuiAppConfig,
                root = yuiAppConfig.root || '/',
                base = yuiAppConfig.base || '/',
                newLocation = this.data.locationMap[path];

            if (!newLocation) {
                return path;
            }

            return libUrl.resolve(base, newLocation[0] === '/' ? newLocation : libPath.join(root, newLocation));
        },

        /**
         * Creates a combo url from an array of resources.
         * @param {array} resourcesArray The array of resources.
         * @param {object} isLocal Whether the resources are local.
         */
        _createComboUrl: function (resourcesArray, isLocal) {
            var yuiAppConfig = isLocal ? {} : this.data.yuiAppConfig,
                root = yuiAppConfig.root || '',
                comboSep = yuiAppConfig.comboSep || "~",
                comboBase = yuiAppConfig.comboBase || "/combo~";

            resourcesArray = resourcesArray.slice();
            if (root) {
                Y.Array.each(resourcesArray, function (resource, i) {
                    resourcesArray[i] = resource[0] === '/' ? resource : libPath.join(root, resource);
                });
            }

            return comboBase + resourcesArray.join(comboSep);
        }
    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-config-addon',
        'mojito-deploy-addon',
        'mojito-http-addon',
        'mojito-url-addon'
    ]
});
