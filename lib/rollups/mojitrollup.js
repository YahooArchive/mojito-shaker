var Y = require('yui').YUI({useSync: true}).use('base-base');
exports.mojitrollup = function (config, resources) {
    var mojitoResources = resources.mojito;
    var rollups = {};
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
            }

            // add mojito resources
            Y.Object.each(mojitoResources, function (mojitoResource, url) {
                if (rollups[posl][route][mojitoResource.subtype]) {
                    rollups[posl][route][mojitoResource.subtype].resources[url] = mojitoResource;
                }
            });

            // add app resources
            Y.Object.each(appResources, function (typeResources, type) {
                Y.Object.each(typeResources, function (appResource, url) {
                    if (rollups[posl][route][appResource.subtype]) {
                        rollups[posl][route][appResource.subtype].resources[url] = appResource;
                    }
                });
            });

            // add mojit resources
            Y.Array.each(mojits, function (mojit) {
                var mojitParts = mojit.split("."),
                    mojitName = mojitParts[0],
                    mojitAction = mojitParts[1],
                    resources = {},
                    mojitResources,
                    controller,
                    view,
                    binder,
                    assets;

                if (!poslResources.mojits[mojitName] || !(poslResources.mojits[mojitName] && poslResources.mojits[mojitName][mojitAction])) {
                    // TODO: perhaps a warning
                    return;
                }

                mojitResources = poslResources.mojits[mojitName][mojitAction],
                controller = mojitResources.controller,
                view = mojitResources.view,
                binder = mojitResources.binder,
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
                        resources[url] = resource;
                    });
                });

                Y.Object.each(resources, function (resource, url) {
                    if (rollups[posl][route][resource.subtype]) {
                        rollups[posl][route][resource.subtype].resources[url] = resource;
                    }
                });
            });

            // rollup content for each type of rollup
            Y.Object.each(rollups[posl][route], function (rollup, type) {
                var mergedContent = "";
                Y.Object.each(rollup.resources, function (resource) {
                    mergedContent += resource.content;
                });
                rollup.rollups.push(mergedContent);
            });
        });
    });
    return rollups;
}
