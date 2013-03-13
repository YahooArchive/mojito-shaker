var Y = require('yui').YUI({useSync: true}).use('base-base'),
    fs = require('fs');

function ShakerResources(context) {
    var self = this,
        store = makeStore({
            root: process.cwd(),
            context: context
        }),
        libutils = require('./utils'),
        Y = require('yui').YUI({useSync: true}),
        shakerConfig = getShakerConfig(context);


    self.shakerConfig = shakerConfig;
    self.organizedResources = {
        mojito: {},
        app: {}
    };
    self.appResources = {};
    self.loaderResources = {};

    self.appConfig = {
        appName: store.url.config.appName,
        prefix: store.url.config.prefix

    }

    getResources();

    // give each app resource a read function
    Y.Object.each(self.appResources, function (resource) {
        resource.read = function (callback) {
            fs.readFile(resource.path, 'utf8', function (err, content) {
                resource.content = content;
                callback(err);
            });
        };
    });


    // TODO remove posl if no resoruces
    //require('fs').writeFile("appResources.json", JSON.stringify(self.appResources));
    //require('fs').writeFile("organizedResources.json", JSON.stringify(self.organizedResources));



    this.resolveResourceVersions = function (resourcesMap) {
        store.resolveResourceVersions(resourcesMap);
    }

    this.getLoaderResources = function () {
        var ress,
            m,
            mojit,
            mojits= [],
            context = getStoreConfigs().context,
            yuiModules = store.yui.getYUIURLDetails(),
            seedModules,
            moduleRess = {};

        //mojito doesnt provide default lang in build time.
        context.lang = context.lang || 'en';
        seedModules = store.yui.getAppSeedFiles(context);

        function processRess(ress) {
            var r,
                res;
            for (r = 0; r < ress.length; r += 1) {
                res = ress[r];
                if (res.type === 'view') {
                    res.yui = {name: res.url};
                    moduleRess[res.url] = res;
                }
                if ('common' !== res.affinity.affinity) {
                    continue;
                }
                if (res.yui && res.yui.name) {
                    moduleRess[res.yui.name] = res;
                }
            }
            for (r = 0; r < ress.length; r += 1) {
                res = ress[r];
                if ('client' !== res.affinity.affinity) {
                    continue;
                }
                if (res.yui && res.yui.name) {
                    moduleRess[res.yui.name] = res;
                }
            }
        }

        ress = store.getResourceVersions({});
        processRess(ress);

        mojits = store.listAllMojits();
        mojits.push('shared');
        for (m = 0; m < mojits.length; m += 1) {
            mojit = mojits[m];
            ress = store.getResourceVersions({mojit: mojit});
            processRess(ress);
        }

        for (m = 0; m < seedModules.length; m += 1) {
            ress = yuiModules[seedModules[m]];

            if (ress) {
                moduleRess[seedModules[m]] = ress;
            }
        }

        // get loader resources
        for (m in moduleRess) {
            ress = moduleRess[m];
            if (m.indexOf("loader") === 0) {
                self.loaderResources[m] = {
                    basename: m,
                    url: ress.url,
                    path: ress.source.fs.fullPath,
                    type: ress.type,
                    subtype: "js",
                    selector: ress.selector,
                    rawResource: ress,
                    read: function (done) {
                        var thisResource = this;
                        store.getResourceContent(store.makeStaticHandlerDetails(thisResource.rawResource), function (err, content) {
                            thisResource.content = content.toString();
                            done(err);
                        });
                    }
                }

            }
        }
        return self.loaderResources;
    }

    function getResources() {

        var metadata = {},
            mojits = getMojits(),
            contexts = getContexts(),
            mojit,
            context,
            contextPOSL,
            contextPOSLStr,
            contextPOSLs = {},
            contextPOSLArray,
            //minorSelector,
            m,
            c,
            shakenMojit = {},
            shakenApp = {};

        // get all context POSLs
        for (c = 0; c < contexts.length; c++) {
            context = contexts[c];
            contextPOSLArray = getPOSLFromContext(context);
            contextPOSLStr = contextPOSLArray.join("-");
            if (contextPOSLs[contextPOSLStr]) {
                continue;
            }
            contextPOSLs[contextPOSLStr] = {
                context: context,
                contextPOSLStr: contextPOSLStr//,
                //minorSelector: contextPOSLArray[contextPOSLArray.length-2]
            }
        }

        for (c in contextPOSLs) {
            contextPOSL = contextPOSLs[c];
            context = contextPOSL.context;
            //minorSelector = contextPOSL.minorSelector;

            self.organizedResources.app[c] = {
                app: {},
                mojits: {}
            };
            for (m = 0; m < mojits.length; m++) {
                mojit = mojits[m];
                shakenMojit = shakeMojitByContext(mojit, context);
                addMojitResources(mojit, shakenMojit, c);//, minorSelector);
            }

            shakeAppResourcesByContext(contextPOSL);//, minorSelector);
        }

        shakeMojito();


//debugger;

        function getDependencies(resource) {
            var dependencies = {},
                dependency;

            if (resource.dependencies) {
                return resource.dependencies;
            }
            for (var dependencyUrl in resource.requires) {
                dependency = resource.requires[dependencyUrl];
                dependencies[dependency.url] = dependency;
                dependencies = Y.merge(dependencies, getDependencies(dependency));
            }
            return dependencies;
        }

        function storeYUIModule(rawResource, yuiResources) {
            var module,
                resource;

            if (self.appResources[rawResource.url]) {
                return self.appResources[rawResource.url];
            }

            resource = {
                basename: rawResource.source.fs.basename,
                url: rawResource.url,
                path: rawResource.source.fs.fullPath,
                type: rawResource.type,
                subtype: "js",
                requires: {},
                selector: rawResource.selector
            };
            self.appResources[rawResource.url] = resource;


            try  {
                module = store.yui._makeYUIModuleConfig('client', rawResource); // TODO: try catch
            } catch (e) {
                console.log("\n\n\n\n\nError: " + e);
                return resource;
            }

            for (var i in module.requires) {
                var requiredResourceName = module.requires[i];
                var requiredResource = yuiResources[requiredResourceName];
                if (requiredResource) {
                    resource.requires[requiredResource.url] = self.appResources[requiredResource.url] ||
                        storeYUIModule(requiredResource, yuiResources);
                }
            }

            resource.dependencies = getDependencies(resource);
            return resource;
        }



        function addMojitResources(mojit, shakenMojit, contextPOSL) {//, minorSelector) {
            var resource,
                mojitResources = {},
                //mojitBelongsInPOSL,
                controllerResources = [],
                //mojitBelongsInPOSL = contextPOSL === "*",
                d,
                b,
                a,
                dependencies,
                rawResource,
                action,
                assetAction;

            // Get view resources
            for (action in shakenMojit.views) {
                rawResource = shakenMojit.views[action];
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                 resource = self.appResources[rawResource.url] || {
                    basename: rawResource.source.fs.basename,
                    url: rawResource.url,
                    path: rawResource.source.fs.fullPath,
                    type: rawResource.type,
                    subtype: "html",
                    selector: rawResource.selector

                };
                self.appResources[rawResource.url] = resource;

                mojitResources[action] = {};
                if (!Y.Object.isEmpty(shakenMojit.assets)) {
                    mojitResources[action].assets = {};
                }
                mojitResources[action].view = resource;

            }

            // Get controller resources
            if (!Y.Object.isEmpty(shakenMojit.controller)) {
                rawResource = shakenMojit.controller;
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                resource = storeYUIModule(rawResource, shakenMojit.yuiResources);
                for (action in shakenMojit.views) {
                    mojitResources[action].controller = resource;
                }
            }

            // Get binder resources
            for (b in shakenMojit.binders) {
                rawResource = shakenMojit.binders[b];
                action = rawResource.name;
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                resource = storeYUIModule(rawResource, shakenMojit.yuiResources);
                mojitResources[action].binder = resource;
            }

            // Get assets resources
            for (a in shakenMojit.assets) {
                rawResource = shakenMojit.assets[a];
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                assetAction = null;
                for (action in shakenMojit.views) {
                    // check if the asset belongs to a specific action
                    if (rawResource.name.indexOf(action) === 0) {
                        assetAction = action;
                        break;
                    }
                }
                resource = self.appResources[rawResource.url] || {
                    basename: rawResource.source.fs.basename,
                    url: rawResource.url,
                    path: rawResource.source.fs.fullPath,
                    type: rawResource.type,
                    subtype: rawResource.subtype,
                    selector: rawResource.selector
                };

                var pathArray = resource.path.split("/");
                var containingDir = pathArray[pathArray.length-2];

                // determine if resource is not to be inclucded

                // make resource inline if specified by config or name
                if (resource.basename.indexOf("-void") !== -1 || containingDir.indexOf("void") !== -1) {
                    continue;
                }

                self.appResources[rawResource.url] = resource;
                if (resource.basename.indexOf("-inline") !== -1 || (resource.subtype === "css" && shakerConfig.inlineCss)
                                                       || (resource.subtype === "js" && shakerConfig.inlineJs)
                                                       || containingDir.indexOf("inline") !== -1) {
                    resource.inline = true;
                }

                if (assetAction) {
                    mojitResources[assetAction].assets[resource.subtype] = mojitResources[assetAction].assets[resource.subtype] || {};
                    mojitResources[assetAction].assets[resource.subtype][rawResource.url] = resource;
                } else {
                    for (action in shakenMojit.views) {
                        mojitResources[action].assets[resource.subtype] = mojitResources[action].assets[resource.subtype] || {};
                        mojitResources[action].assets[resource.subtype][rawResource.url] = resource;
                    }
                }
            }
            // sort assets for each action
            for (action in shakenMojit.views) {
                sortAssets(mojitResources[action]);
            }

            /*
            if (!mojitBelongsInPOSL) {
                return;
            }*/
            self.organizedResources.app[contextPOSL].mojits[mojit] = mojitResources;
        }

    }

    function getContexts() {
        return store.selector._listUsedContexts();
    }

    function getMojits() {
        return store.listAllMojits();
    }

    function getPOSLFromContext(context) {
        return store.selector.getPOSLFromContext(context);
    }

    function makeStore(cfg) {

        process.shakerCompiler = true;
        var store = require('/homes/jimenez/shaker_v4/app1/node_modules/mojito/lib/store.js');
        return store.createStore(cfg);
    }


    function getShakerConfig(context) {
        var config = store.getAppConfig(context || {});
        return config.shaker || {};
    };

    function getShakerConfigByContext(mojitName, context) {
        context = context || {};
        var filter = {
                type:'config',
                name: 'shaker'
            },
            configResources,
            shakerConfigResource,
            config;

        if (mojitName !== 'shared') {
            filter.mojit = mojitName;
        }
        configResources = store.getResourceVersions(filter),
        shakerConfigResource = configResources.length ? configResources[0] : null;

        if (shakerConfigResource) {
            config = store.config.readConfigYCB(shakerConfigResource.source.fs.fullPath, context);
            return config.shaker || null;
        } else {
            return null;
        }
    }

    function getStoreConfigs() {
        var appConfig = store.getAppConfig(context);

        return {
            prefix: store.url.config.prefix,
            appName: appConfig.staticHandling.appName,
            context: context || {}
        };
    }

    function shakeMojito () {
        var context = getStoreConfigs().context,
            rawResources = store.getResourceVersions({mojit:'shared'}),
            rawResource,
            resource,
            i;

        for (i in rawResources) {
            rawResource = rawResources[i];
            if ((rawResource.source.pkg.name === 'mojito' || rawResource.source.pkg.name === 'mojito-shaker') &&
               (rawResource.affinity.affinity === 'common' || rawResource.affinity.affinity === 'client') &&
               rawResource.source.fs.ext === '.js') {
               resource = self.appResources[rawResource.url] || {
                    basename: rawResource.source.fs.basename,
                    url: rawResource.url,
                    path: rawResource.source.fs.fullPath,
                    type: rawResource.type,
                    subtype: "js",
                    selector: rawResource.selector
                };
                self.appResources[rawResource.url] = resource;

                self.organizedResources.mojito[rawResource.url] = resource;
            }
        }
    }

    function shakeLoader() {
        var ress,
            m,
            mojit,
            mojits= [],
            context = getStoreConfigs().context,
            yuiModules = store.yui.getYUIURLDetails(),
            seedModules,
            moduleRess = {};

        //mojito doesnt provide default lang in build time.
        context.lang = context.lang || 'en';
        seedModules = store.yui.getAppSeedFiles(context);

        function processRess(ress) {
            var r,
                res;
            for (r = 0; r < ress.length; r += 1) {
                res = ress[r];
                if (res.type === 'view') {
                    res.yui = {name: res.url};
                    moduleRess[res.url] = res;
                }
                if ('common' !== res.affinity.affinity) {
                    continue;
                }
                if (res.yui && res.yui.name) {
                    moduleRess[res.yui.name] = res;
                }
            }
            for (r = 0; r < ress.length; r += 1) {
                res = ress[r];
                if ('client' !== res.affinity.affinity) {
                    continue;
                }
                if (res.yui && res.yui.name) {
                    moduleRess[res.yui.name] = res;
                }
            }
        }

        ress = store.getResourceVersions({});
        processRess(ress);

        mojits = store.listAllMojits();
        mojits.push('shared');
        for (m = 0; m < mojits.length; m += 1) {
            mojit = mojits[m];
            ress = store.getResourceVersions({mojit: mojit});
            processRess(ress);
        }

        for (m = 0; m < seedModules.length; m += 1) {
            ress = yuiModules[seedModules[m]];

            if (ress) {
                moduleRess[seedModules[m]] = ress;
            }
        }

        // get loader resources
        for (m in moduleRess) {
            ress = moduleRess[m];
            if (m.indexOf("loader") === 0) {
                self.loaderResources[m] = {
                    basename: m,
                    url: ress.url,
                    path: ress.source.fs.fullPath,
                    type: ress.type,
                    subtype: "js",
                    selector: ress.selector,
                    rawResource: ress,
                    read: function (done) {
                        var thisResource = this;
                        store.getResourceContent(store.makeStaticHandlerDetails(thisResource.rawResource), function (err, content) {
                            thisResource.content = content.toString();
                            done(err);
                        });
                    }
                }

            }
        }



        return self.loaderResources;
    }

    function getPOSLFromContext(ctx) {
        return store.selector.getPOSLFromContext(ctx);
    };

    // takes a list of resources and returns only those that match a context
    function filterResourceVersionsByContext(ctx, ress) {
        var posl = getPOSLFromContext(ctx),
            bySelector = {},    // selector: id: resource
            out = {},           // id: resource
            r,
            res,
            s,
            selector;
        for (r = 0; r < ress.length; r += 1) {
            res = ress[r];
            if (!bySelector[res.selector]) {
                bySelector[res.selector] = {};
            }
            bySelector[res.selector][res.id] = res;
        }
        for (s = posl.length; s > 0; s -= 1) {
            selector = posl[s - 1];
            for (r in bySelector[selector]) {
                if (bySelector[selector].hasOwnProperty(r)) {
                    out[r] = bySelector[selector][r];
                }
            }
        }
        return Y.Object.values(out);
    };

    function shakeMojitByContext(mojitName, context) {
        //get the resources for that mojit
        var rawResources,
            //transform yui modules on a hash object using key as yui-name
            yuiResources,
            mojitResources = {
                binders: {},
                langs:{},
                assets:{},
                views: {},
                yui_modules: {}
            };

        function getMojitResourcesByContext(mojitName, ctx) {
            var mojitResources = store.getResourceVersions({mojit: mojitName}),
                mojitResourcesFilterIterator = function (item) {
                    //remove mojito Framework + shared (app level) assets
                    return !(item.source.pkg.name === 'mojito' || item.source.pkg.name === 'mojito-shaker' ||
                             (item.mojit === 'shared' && item.type === 'asset')) &&
                           (item.affinity.affinity === 'common' || item.affinity.affinity === 'client')
                },
                sharedResources = store.getResourceVersions({mojit: 'shared'}),
                sharedResourcesFilterIterator = function (item) {
                    return !(item.source.pkg.name === 'mojito' || item.source.pkg.name === 'mojito-shaker' ||
                             item.type === 'asset') &&
                           (item.affinity.affinity === 'common' || item.affinity.affinity === 'client')
                };

            // Return the resources in the "shared" mojit too, since Mojito considers those as part of each mojit.
            mojitResources = mojitResources.filter(mojitResourcesFilterIterator);
            mojitResources = filterResourceVersionsByContext(ctx, mojitResources);
            sharedResources = sharedResources.filter(sharedResourcesFilterIterator);
            sharedResources = filterResourceVersionsByContext(ctx, sharedResources);
            return sharedResources.concat(mojitResources);
        };

        rawResources = getMojitResourcesByContext(mojitName, context);

        function getYUIModuleNamesFromResources(rawResources) {
            var cleanList = {};
            yuiModules = rawResources.forEach(function(item, key){
                if (item.yui && item.yui.name) {
                    cleanList[item.yui.name] = item;
                }
            });
            return cleanList;
        }

        mojitResources.yuiResources = getYUIModuleNamesFromResources(rawResources);

        function matchDependencies(sortedNeededYui, yuiModules) {
            var matched = {};
            Y.Array.each(sortedNeededYui, function (name, index) {
                if (yuiModules[name]) {
                    matched[name] = yuiModules[name];
                }
            });
            return matched;
        }

        // group all dependencies
        rawResources.forEach(function(rawResource) {
            if (rawResource.mojit === "shared") {
                return;
            }
            switch(rawResource.type) {
                case 'controller':
                    // we create some properties due to the way _precomputeYUIDependencies works.
                    mojitResources.controller = rawResource;
                    break;
                case 'view':
                    mojitResources.views[rawResource.name] = rawResource;
                    break;

                case 'binder':
                    mojitResources.binders[rawResource.yui.name] = rawResource;
                    break;

                case 'asset':
                    mojitResources.assets[rawResource.name] = rawResource;
                    break;
                case 'yui-lang':
                    mojitResources.langs[rawResource.yui.name] = store.yui._makeYUIModuleConfig('client', rawResource);
                    mojitResources.langs[rawResource.yui.name].lang = rawResource.yui.lang;
            }
        });

        return mojitResources;

    }

    function sortAssets(assets) {
        Y.Object.each(assets, function (typeAssets, type) {
            var sortedKeys = Object.keys(typeAssets).sort();
            Y.Array.each(sortedKeys, function (key) {
                var asset = typeAssets[key];
                delete typeAssets[key];
                typeAssets[key] = asset;
            });
        });
    }

    function shakeAppResourcesByContext(contextPOSL) {//, minorSelector) {
        var appResources,
            assets = {},
            i,
            rawResource,
            resource;
            //mojitBelongsInPOSL = contextPOSL.contextPOSLStr === "*";

        function getAppResourcesByContext(context) {
            var rawResources = store.getResourceVersions({mojit:'shared'}),
                appResourcesFilterIterator = function (item) {
                    //remove mojito Framework + app autoloads (included in the mojits already)
                    return item.source.pkg.name !== 'mojito' && item.type !== 'yui-module' &&
                           (item.affinity.affinity === 'common' || item.affinity.affinity === 'client')
                };
            rawResources = rawResources.filter(appResourcesFilterIterator);
            return filterResourceVersionsByContext(context, rawResources);
        };

        appResources = getAppResourcesByContext(contextPOSL.context);
        for (i in appResources) {
            rawResource = appResources[i];
            // get asset type resources and ignore resources under assets/compiled
            if (rawResource.type === 'asset' && rawResource.source.fs.fullPath.indexOf("assets/compiled") === -1) {
                //mojitBelongsInPOSL |= rawResource.selector === minorSelector;
                resource = self.appResources[rawResource.url] || {
                    basename: rawResource.source.fs.basename,
                    url: rawResource.url,
                    path: rawResource.source.fs.fullPath,
                    type: 'asset',
                    subtype: rawResource.subtype,
                    selector: rawResource.selector
                };

                var pathArray = resource.path.split("/");
                var containingDir = pathArray[pathArray.length-2];

                // determine if resource is not to be inclucded

                // make resource inline if specified by config or name
                if (resource.basename.indexOf("-void") !== -1 || containingDir.indexOf("void") !== -1) {
                    continue;
                }

                self.appResources[rawResource.url] = resource;
                if (resource.basename.indexOf("-inline") !== -1 || (resource.subtype === "css" && shakerConfig.inlineCss)
                                                       || (resource.subtype === "js" && shakerConfig.inlineJs)
                                                       || containingDir.indexOf("inline") !== -1) {
                    resource.inline = true;
                }
                assets[rawResource.subtype] = assets[rawResource.subtype] || {};
                assets[rawResource.subtype][rawResource.url] = resource;
            }
        }

        // sort assets
        sortAssets(assets);

        //if (mojitBelongsInPOSL) {
        self.organizedResources.app[contextPOSL.contextPOSLStr].app = assets;
        /*} else {
            delete self.organizedResources.app[contextPOSL.contextPOSLStr].app;
        }*/
    }
}


exports.ShakerResources = ShakerResources;