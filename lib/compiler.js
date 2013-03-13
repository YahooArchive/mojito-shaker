var validateConfig = require('./config.js').validateConfig,
    ShakerResources = require('./resources.js').ShakerResources,
    Y = require('yui').YUI({useSync: true}).use('base-base'),
    async = require('async'),
    gear = require('gear'),
    path = require('path'),
    modules = {
        rollups: {
            mojitrollup: require('./rollups/mojitrollup.js').mojitrollup
        },
        locations: {
            local: require('./locations/local.js').local,
            mobstor: require('shaker-mobstor').mobstor
        }
    },
    typeHierarchy = {
        "yui-module": "js",
        "controller": "yui-module",
        "binder": "yui-module",
        "asset": "*",
        "addon": "yui-module",
        "view": "html"
    };

function ShakerCompiler(context) {
debugger;
    this.compile = function (done) {
        var resources = new ShakerResources(context),
            config = resources.shakerConfig;

        config.appConfig = resources.appConfig;

        applyTasks(config, resources.appResources, function (err) {
            applyRollups(config, resources.appResources, resources.organizedResources, function (err) {
                applyLocations(config.locations, config.appConfig, resources.appResources, function (err) {
                    updateLoader(config, resources, function (err) {
                        constructMetadata(config, Y.mix(resources.appResources, resources.loaderResources), resources.organizedResources);
                        done();
                    })
                });
            });
        });
    }

    /*this.run = function (done) {
        var appResources = shakerResources.appResources,
            organizedResources = shakerResources.organizedResources,
            shakerConfig = shakerResources.shakerConfig;

        shakerConfig.appConfig = shakerResources.appConfig;

        compile(shakerConfig, shakerResources, function () {
            //done();
        });
        return;

        require('fs').readFile('appResources.json', 'utf8', function (err, data) {
            appResources = JSON.parse(data);
            require('fs').readFile('organizedResources.json', 'utf8', function (err2, data2) {
                organizedResources = JSON.parse(data2);

                // link each resources' require to allResouces
                Y.Object.each(appResources, function (resource, url) {
                    Y.Object.each(resource.requires, function (requiredResource, requiredUrl) {
                        resource.requires[requiredUrl] = appResources[requiredUrl];
                    });
                    Y.Object.each(resource.dependencies, function (requiredResource, requiredUrl) {
                        resource.dependencies[requiredUrl] = appResources[requiredUrl];
                    });
                });
                // link organized resources to appResources
                Y.Object.each(organizedResources.app, function (appResources, context) {

                    Y.Object.each(appResources.app, function (typeResources, type) {
                        Y.Object.each(typeResources, function (resource, url) {
                            typeResources[url] = appResources[url];
                        });
                    });

                    Y.Object.each(appResources.mojits, function (mojit) {
                        Y.Object.each(mojit, function (mojitResources, action) {
                            var view = mojitResources.view,
                                controller = mojitResources.controller,
                                binder = mojitResources.binder,
                                assets = mojitResources.assets;

                            mojitResources.view = appResources[view.url];

                            if (controller) {
                                mojitResources.controller = appResources[controller.url];
                                Y.Object.each(controller.dependencies, function (dependency, url) {
                                    controller.dependencies[url] = appResources[url];
                                });
                            }
                            if (binder) {
                                mojitResources.binder = appResources[binder.url];
                                Y.Object.each(binder.dependencies, function (dependency, url) {
                                    binder.dependencies[url] = appResources[url];
                                });
                            }
                            Y.Object.each(assets, function (assetGroup, type) {
                                Y.Object.each(assetGroup, function (resource, url) {
                                    assetGroup[url] = appResources[url];
                                });
                            });
                        });
                    });
                });

                Y.Object.each(organizedResources.mojito, function (mojitoResource, url) {
                    organizedResources.mojito[url] = appResources[url];
                });

                compile(config, appResources, organizedResources, function () {
                    //done();
                });
            });
        });

    };*/

    function configToGearTasks(config) {
        var gearTasks = {};
        Y.Object.each(config.tasks, function (tasks, type) {
            var prevTask = 'readResource';
            gearTasks[type] = {
                tasks: {}
            };
            Y.Object.each(tasks, function (taskOptions, taskName) {
                if (taskOptions === false) {
                    return;
                }

                taskOptions = !Y.Lang.isObject(taskOptions) ? {} : taskOptions;

                gearTasks[type].tasks[taskName] = {
                    task: [taskName, taskOptions]
                };
                if (prevTask) {
                    gearTasks[type].tasks[taskName].requires = prevTask;
                }
                prevTask = taskName;
            });
            gearTasks[type].lastTask = prevTask;
        });

        return gearTasks;
    }

    // TODO: remove resources that are empty from both appResources and organized resources

    function applyTasks(config, appResources, done) {
        var count = 0;
        var registry = new gear.Registry({dirname: path.resolve(__dirname, '../', 'node_modules', 'gear-lib', 'lib')});

        registry.load({tasks: {
            'readResource': function (resource, blob, done) {
                resource.read(function (err) {
                    done(err, new gear.Blob(resource.content, {name: resource.path}));
                });
            },
            'updateResource': function (resource, blob, done) {
                resource.content = blob.result;
                done(null);
            }
        }});

        var gearTasks = configToGearTasks(config);

        // put all resources into an array, since async requires this
        var resourcesArray = [];
        Y.Object.each(appResources, function (resource) {
            resourcesArray.push(resource);
        });
        async.forEach(resourcesArray, function (resource, callback) {

            // get the most specific task type for this resource
            var type = resource.type;
            while (!gearTasks[type]) {
                type = typeHierarchy[type];
                if (!type) {
                    break;
                }
                if (type === "*") {
                    type = resource.subtype;

                    break;
                }
            }

            var queue = new gear.Queue({registry: registry});
            var newGearTasks = gearTasks[type] ? Y.clone(gearTasks[type].tasks) : {};

            //queue.read("/homes/jimenez/shaker_v4/app1/yui_modules/app-yui-module.client.js")

            queue.read("/dev/null");
            //queue.readResource(resource);
            newGearTasks['readResource'] = {
                task: ['readResource', resource]
            };
            newGearTasks['updateResource'] = {
                task: ['updateResource', resource],
                requires: gearTasks[type] && gearTasks[type].lastTask || "readResource"
            };
            /*newGearTasks['join'] = {
                requires: 'updateResource'
            }*/

            queue.tasks(newGearTasks);

            queue.run(function (err, results) {
                var error,
                    errorType,
                    errorTask,
                    errorMsg;

                if (err) {
                    console.log(err);
                    return;
                    error = err.error;
                    errorType = error.error.type ? "a " + error.error.type.toLowerCase() : "an";
                    errorTask = error.task;
                    errorMsg = "There was " + errorType + " error when applying " + errorTask + " to " + resource.path + ":\n" + error.error.message;
                    if (error.error.stop) {
                        callback(errorMsg);
                    } else {
                        console.log(errorMsg);
                    }
                }
                callback(null);
            });
        }, function (err) {
            done(err);
        });
    }

    function applyRollups(config, appResources, organizedResources, done) {
        var rollups,
            i = 0;

        Y.Object.each(config.routeRollups, function (rollupConfig, rollupName) {
            var rollupModule = modules.rollups[rollupName];
            rollups = rollupModule(rollupConfig, organizedResources);
            // merge rollups
        });

        // filter out content that don't have any particular resource that belongs to a posl
        // add rollups to organizedResources
        Y.Object.each(organizedResources.app, function (poslResources, posl) {
            var contextPOSLArray = posl.split("-"),
                minorSelector = contextPOSLArray[contextPOSLArray.length-2];

            // check which rollups belong in posl
            poslResources.rollups = {};
            Y.Object.each(rollups[posl], function (routeRollups, route) {
                poslResources.rollups[route] = {};

                Y.Object.each(routeRollups, function (rollup, type) {
                    var belongsInPOSL = posl === "*";
                    Y.Object.each(rollup.resources, function (resource, url) {
                        belongsInPOSL |= resource.selector === minorSelector;
                    });
                    if (belongsInPOSL) {
                        poslResources.rollups[route][type] = {
                            rollups: {},
                            resources: {}
                        };
                        // create new resources for rollups and add to appResources
                        Y.Array.each(rollup.rollups, function (rollupContent, index) {
                            var rollupName = ["route", type, route, posl, index].join("_");
                            appResources[rollupName] = {
                                content: rollupContent,
                                basename: rollupName,
                                subtype: type,
                                type: "rollup",
                                url: rollupName,
                                resources: rollup.resources //TODO: just for debugging
                            }
                            poslResources.rollups[route][type].rollups[rollupName] = appResources[rollupName];
                            Y.mix(poslResources.rollups[route][type].resources, rollup.resources);
                        });
                    }
                });
                if (Y.Object.isEmpty(poslResources.rollups[route])) {
                    delete poslResources.rollups[route];
                }
            });
            if (Y.Object.isEmpty(poslResources.rollups)) {
                delete poslResources.rollups;
            }

            // determine if app resources belong in posl
            Y.Object.each(poslResources.app, function (typeResources, type) {
                if (config.appResources && !config.appResources[type]) {
                    return;
                }
                var belongsInPOSL = posl === "*";
                Y.Object.each(typeResources, function (resource, url) {
                    belongsInPOSL |= resource.selector === minorSelector;
                });
                if (!belongsInPOSL) {
                    delete poslResources.app[type];
                }
            });
            if (Y.Object.isEmpty(poslResources.app)) {
                delete poslResources.app;
            }

            // determine if each mojit belongs in posl
            Y.Object.each(poslResources.mojits, function (mojitResources, mojit) {
                Y.Object.each(mojitResources, function (actionResources, action) {
                    var resources = {},
                        controller = actionResources.controller,
                        view = actionResources.view,
                        binder = actionResources.binder,
                        assets = actionResources.assets;

                    // add view
                    /*if (config.mojitResources.views) {
                        resources["js"][view.url] = view;
                    }
                    // add controller and dependencies
                    if (controller && config.mojitResources.controllers) {
                        resources["js"][controller.url] = controller;
                        Y.mix(resources["js"], controller.dependencies);
                    }
                    // add binder and dependencies
                    if (binder && config.mojitResources.binders) {
                        resources["js"][binder.url] = binder;
                        Y.mix(resources["js"], binder.dependencies);
                    }*/

                    // add assets
                    Y.Object.each(assets, function (assetGroup, type) {
                        resources[type] = resources[type] || {};

                        Y.Object.each(assetGroup, function (resource, url) {
                            resources[type][url] = resource;
                            /*// make css asset inline if specified by config
                            // TODO: delete resource if inline is empty
                            if (posl === "*" && type === "css" && config.mojitResources.inlineCss) {
                                resource.inline = true;
                            }*/
                        });
                    });

                    if (Y.Object.isEmpty(resources["js"])) {
                        delete resources["js"];
                    }

                    // check if the resources belong in posl
                    Y.Object.each(resources, function (typeResources, type) {
                        var belongsInPOSL = posl === "*";
                        Y.Object.each(typeResources, function (resource, url) {
                            belongsInPOSL |= resource.selector === minorSelector;
                        });
                        if (!belongsInPOSL) {
                            delete resources[type];
                        }
                    });
                    if (!Y.Object.isEmpty(resources)) {
                        // now resources are organized by type
                        mojitResources[action] = resources;
                    } else {
                        delete mojitResources[action];
                    }
                });
                if (Y.Object.isEmpty(mojitResources)) {
                    delete poslResources.mojits[mojit];
                }
            });
            if (Y.Object.isEmpty(poslResources.mojits)) {
                delete poslResources.mojits;
            }

        });

        done(null);
    }

    function applyLocations(locationsConfig, appConfig, resources, done) {
        var locationArray = Object.keys(locationsConfig),
            resourcesArray = [],
            i,
            crypto = require('crypto'),
            locationYUIConfigs = {};

        // place all resources into an array, since async requires this
        for (i in resources) {
            /*// skip resources that are inline
            if (resources[i].inline) {
                continue;
            }*/
            // add location attribute, which will be used to store the location after an upload
            resources[i].locations = {};
            // add a getHash function to each resource which can be used to retrive the hash of the resource
            resources[i].getHash = function () {
                var hash = crypto.createHash('md5').update(this.content).digest('hex');
                // save hash for future calls to getHash
                this.getHash = function () {
                    return hash;
                }
                return hash;
            }
            resourcesArray.push(resources[i]);
        }

        // for each location type, upload all resources and get their new locations
        async.forEach(locationArray, function (locationName, locationCallback) {
            var locationConfig = locationsConfig[locationName];
            locationConfig.appConfig = appConfig;
            var locationModule = new modules.locations[locationName](locationConfig);
            locationYUIConfigs[locationName] = locationModule.yuiConfig;
            async.forEach(resourcesArray, function (resource, resourceCallback) {
                // upload the resource and get new location
                locationModule.store(resource, function (err, resourceLocation) {
                    resource.locations[locationName] = resourceLocation;
                    resourceCallback(err);
                });
            }, function (err) {
                locationCallback(err);
            });
        }, function (err) {
            done(err, locationYUIConfigs);
        });
    }

    function constructMetadata(config, appResources, organizedResources) {
        var resources = [],
            resourcesByType = {};
            // construct final meta data file

            // construct inline map
            organizedResources.inline = {};
            Y.Object.each(appResources, function (resource) {
                if (resource.inline) {
                    organizedResources.inline[resource.url] = resource.content;
                }
            });
            if (Y.Object.isEmpty(organizedResources.inline)) {
                delete organizedResources.inline;
            }

            // mojito
            organizedResources.mojito = Object.keys(organizedResources.mojito);

            Y.Object.each(organizedResources.app, function (poslResources, posl) {

                // app
                Y.Object.each(poslResources.app, function (typeResources, type) {
                    poslResources.app[type] = Object.keys(typeResources);
                });

                // mojits
                Y.Object.each(poslResources.mojits, function (mojitResources, mojit) {
                    Y.Object.each(mojitResources, function (actionResources, action) {
                        Y.Object.each(actionResources, function (typeResources, type) {
                            actionResources[type] = Object.keys(typeResources);
                        });
                    });
                });

                // rollups
                Y.Object.each(poslResources.rollups, function (routeRollup, route) {
                    Y.Object.each(routeRollup, function (typeResources, type) {
                        routeRollup[type].rollups = Object.keys(typeResources.rollups);
                        // replace resource with true
                        Y.Object.each(routeRollup[type].resources, function (resource, id) {
                            routeRollup[type].resources[id] = true;
                        })

                    });
                });
            });

            console.log("All Resources: " + Object.keys(appResources).length);
            //console.log("Used Resources: " + Object.keys(usedResources).length);
            //console.log("Inline Resources: " + Object.keys(organizedResources.inline).length);
            //console.log("Location Resources: " + Object.keys(organizedResources.locations.local.resources).length);

// TODO check if write files, sometimes no permission
// TODO check it can write file first before compiling
require('fs').writeFile("shakerResources.json", JSON.stringify(organizedResources));

    }

    function updateLoader(config, resources, done) {
        var locations = resources.organizedResources.locations = {},
            locationsArray = Y.Object.keys(config.locations);

        // TODO loader files for different locations
        // update resource store

        // construction locations map, mapping app url to their corresponding location url
        // TODO: this needs to be in an async
        Y.Array.each(locationsArray, function (locationName) {
            var loaderResources,
                locationConfig = {};

            locations[locationName] = {
                resources: {},
                yuiConfig: {}
            };
            Y.Object.each(resources.appResources, function (resource) {
                // also upload inline file, incase disabled in runtime
                //if (!resource.inline) {
                    locations[locationName].resources[resource.url] = resource.locations[locationName];
                //}
            });

            resources.resolveResourceVersions(locations[locationName].resources);
            loaderResources = resources.getLoaderResources();

            locationConfig[locationName] = config.locations[locationName];
            // apply tasks to loader resources and upload to locations
            applyTasks(config, loaderResources, function (err) {
                applyLocations(locationConfig, config.appConfig, loaderResources, function (err, locationYUIConfigs) {
                    locations[locationName].yuiConfig = locationYUIConfigs[locationName] || {};
                    Y.Object.each(loaderResources, function (resource) {
                        locations[locationName].resources[resource.url] = resource.locations[locationName];
                    });
                    done(err);
                });
            });

        });
    }
}

exports.ShakerCompiler = ShakerCompiler;