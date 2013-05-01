var Y = require('yui').YUI({useSync: true}).use('base-base');
exports.rollup = function (config, resources) {
    'use strict';
    var yuiResources = resources.yui,
        mojitoResources = resources.mojito,
        rollups = {};
    Y.Object.each(resources.app, function (poslResources, posl) {
        rollups[posl] = {};
        var appResources = poslResources.app;

        // get resources for each route
        Y.Object.each(config.rollups, function (mojits, route) {
            rollups[posl][route] = {
                js: {
                    rollups: [],
                    resources: {}
                },
                css: {
                    rollups: [],
                    resources: {}
                }
            };

            // add yui resources
            Y.Object.each(yuiResources, function (yuiResource, url) {
                if (rollups[posl][route][yuiResource.subtype]) {
                    Y.Object.each(yuiResource.dependencies, function (dependency, dependencyUrl) {
                        rollups[posl][route][dependency.subtype].resources[dependencyUrl] = dependency;
                    });
                    rollups[posl][route][yuiResource.subtype].resources[url] = yuiResource;
                }
            });

            // add mojito resources
            Y.Object.each(mojitoResources, function (mojitoResource, url) {
                if (rollups[posl][route][mojitoResource.subtype]) {
                    Y.Object.each(mojitoResource.dependencies, function (dependency, dependencyUrl) {
                        rollups[posl][route][dependency.subtype].resources[dependencyUrl] = dependency;
                    });
                    rollups[posl][route][mojitoResource.subtype].resources[url] = mojitoResource;
                }
            });

            // add app resources
            Y.Object.each(appResources, function (typeResources, type) {
                Y.Object.each(typeResources, function (appResource, url) {
                    // do not add resource if it is to be inlined
                    if (rollups[posl][route][appResource.subtype] && !appResource.inline) {
                        rollups[posl][route][appResource.subtype].resources[url] = appResource;
                    }
                });
            });

            // add mojit resources
            Y.Array.each(mojits, function (mojit) {
                var mojitParts = mojit.split('.'),
                    mojitName = mojitParts[0],
                    mojitActions = mojitParts[1] ? [mojitParts[1]] : null,
                    resources = {},
                    mojitResources,
                    controller,
                    view,
                    binder,
                    assets;

                if (!poslResources.mojits[mojitName]) {
                    // TODO: perhaps a warning
                    return;
                }

                Y.Array.each(mojitActions || Y.Object.keys(poslResources.mojits[mojitName]), function (mojitAction) {
                    if (!poslResources.mojits[mojitName][mojitAction]) {
                        // TODO: perhaps a warning
                        return;
                    }

                    mojitResources = poslResources.mojits[mojitName][mojitAction];
                    controller = mojitResources.controller;
                    view = mojitResources.view;
                    binder = mojitResources.binder;
                    assets = mojitResources.assets;

                    // add view
                    //resources[view.url] = view;
                    // add controller and dependencies
                    if (controller) {
                        resources[controller.url] = controller;
                        Y.mix(resources, controller.dependencies);
                    }
                    // add binder and dependencies
                    if (binder) {
                        resources[binder.url] = binder;
                        Y.mix(resources, binder.dependencies);
                    }

                    // add assets
                    Y.Object.each(assets, function (assetGroup, type) {
                        Y.Object.each(assetGroup, function (resource, url) {
                            // do not add resource if it is to be inlined
                            if (!resource.inline) {
                                resources[url] = resource;
                            }
                        });
                    });

                    Y.Object.each(resources, function (resource, url) {
                        if (rollups[posl][route][resource.subtype]) {
                            rollups[posl][route][resource.subtype].resources[url] = resource;
                        }
                    });
                });
            });

            // rollup content for each type of rollup
            Y.Object.each(rollups[posl][route], function (rollup, type) {
                var mergedContent = '';
                Y.Object.each(rollup.resources, function (resource) {
                    // TODO: throw a warning if content is empty
                    mergedContent += resource.content ? resource.content : '';
                });
                rollup.rollups.push(mergedContent);
            });
        });
    });
    return rollups;
};
