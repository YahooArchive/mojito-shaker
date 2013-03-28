/*jslint nomen: true, stupid: true, bitwise: true, plusplus: true */

var Y = require('yui').YUI({useSync: true}).use('base-base'),
    colors = require('./colors'),
    async = require('async'),
    crypto = require('crypto'),
    path = require('path'),
    fs = require('fs'),
    ShakerResources = require('./resources.js').ShakerResources,
    MAX_PARALLEL = 64,
    METADATA_FILENAME = 'shaker-meta.json',
    COMPILED_ASSETS = 'assets/compiled',
    validTypeTasks = [
        'css', 'js', 'yui_module', 'controller', 'binder', 'addon', 'view', 'html'
    ],
    typeHierarchy = {
        'loader': 'yui-module',
        'yui-module': 'js',
        'controller': 'yui-module',
        'binder': 'yui-module',
        'asset': '*',
        'addon': 'yui-module',
        'view': 'html'
    };

function Logger(summary) {
    'use strict';
    var messageTypes = {},
        MAX_MESSAGES = 5;
    this.summary = {};
    this.data = {};

    this.print = function (message, messageType, printSymbol) {
        if (messageType === 'error') {
            console.log(((printSymbol ? '✖ ' : '') + message).red.bold);
        } else if (messageType === 'warn') {
            console.log(((printSymbol ? '⚠ ' : '') + message).yellow);
        } else if (messageType === 'info') {
            console.log((message).blue.bold);
        } else if (messageType === 'success') {
            console.log((message + (printSymbol ? ' ✔' : '')).green.bold);
        }
    };

    this.log = function (logType, messageType, message, addToSummary) {
        messageTypes[messageType] = true;
        if (logType) {
            this.summary[logType] = this.summary[logType] || {
                error: [],
                warn: [],
                info: [],
                success: []
            };

            this.summary[logType][messageType].push(message);
            message = '[' + logType + '] ' + message;
        }

        this.print(message, messageType, true);
    };

    this.error = function (logType, message) {
        this.log(logType, 'error', message, true);
    };

    this.warn = function (logType, message) {
        this.log(logType, 'warn', message, true);
    };

    this.info = function (message) {
        this.log('', 'info', message, false);
    };

    this.printSummary = function () {
        if (messageTypes.error) {
            this.print('\nShaker compilation ended with errors:', 'error');
        } else if (messageTypes.warn) {
            this.print('\nShaker compilation ended with warnings:', 'warn');
        }
        var self = this;
        Y.Object.each(self.summary, function (typeSummary, logType) {
            var summaryType = !Y.Object.isEmpty(typeSummary.error) ? 'error' : !Y.Object.isEmpty(typeSummary.warn) ? 'warn' : !Y.Object.isEmpty(typeSummary.success) ? 'success' : 'info';
            self.print(logType, summaryType);
            Y.Object.each(typeSummary, function (messages, messagesType) {
                if (messages.length > MAX_MESSAGES) {
                    messages.splice(MAX_MESSAGES - 1, messages.length - MAX_MESSAGES + 1, (messages.length - MAX_MESSAGES + 1) + ' more...');
                }
                Y.Array.each(messages, function (message) {
                    self.print(' - ' + message, messagesType);
                });
            });
        });
    };
}

function ShakerCompiler(context) {
    'use strict';
    this.context = context;
    this.logger = new Logger();

    this.modules = {
        tasks: {
            csslint: require('./tasks/csslint.js').task,
            cssminify: require('./tasks/cssminify.js').task,
            jslint: require('./tasks/jslint.js').task,
            jsminify: require('./tasks/jsminify.js').task
        },
        rollups: {
            mojitrollup: require('./rollups/mojitrollup.js').rollup
        },
        locations: {
            local: require('./locations/local.js').location
        }
    };
}

ShakerCompiler.prototype = {
    compile: function (done) {
        'use strict';
        var self = this,
            context = this.context,
            modules = this.modules,
            logger = this.logger,
            resources,
            error,
            config;

        // remove metadata file and compiled assets directory
        error = self._removeMetadataAndCompileAssets(METADATA_FILENAME, COMPILED_ASSETS, logger);
        if (error) {
            return done(error);
        }

        // get all resources
        logger.data.startTime = new Date().getTime();
        logger.info('Retrieving Application Resources');
        resources = new ShakerResources(context);
        config = resources.shakerConfig;

        // validate configuration
        self._validateConfig(config, modules, logger);

        // initialize locations
        error = self._initializeLocations(config, resources.organizedResources, modules, logger);
        if (error) {
            return done(error);
        }

        // apply tasks and locations to every resource
        self._tasksAndLocations(config, resources.appResources, resources.organizedResources, modules, logger, function (err) {
            if (err) {
                return done(err);
            }
            // update loader and apply rollups
            self._loadersAndRollups(config, resources, modules, logger, function () {
                if (err) {
                    return done(err);
                }
                // construct the metadata
                self._constructMetadata(config, resources, logger, function (err) {
                    done(err);
                });
            });
        });
    },

    _removeMetadataAndCompileAssets: function (metadata, compiledAssets, logger) {
        'use strict';
        var files,
            i;
        if (fs.existsSync(metadata)) {
            logger.info('Removing ' + metadata);
            try {
                fs.unlinkSync(metadata);
            } catch (e1) {
                return 'Unable to remove ' + metadata + ' - ' + e1;
            }
        } else {
            // test if can write metadata
            try {
                fs.writeFileSync(metadata, '');
            } catch (e2) {
                return 'Unable to write ' + metadata + ' - ' + e2;
            }
        }

        if (fs.existsSync(compiledAssets)) {
            logger.info('Removing ' + compiledAssets);
            try {
                files = fs.readdirSync(compiledAssets);
                for (i = 0; i < files.length; i++) {
                    fs.unlinkSync(compiledAssets + '/' + files[i]);
                }
                fs.rmdirSync(compiledAssets);
            } catch (e3) {
                // if cant remove
                return 'Unable to remove ' + compiledAssets + ' - ' + e3;
            }
        }
        return false;
    },

    _validateConfig: function (config, modules, logger) {
        'use strict';
        var logType = 'Config Validation';

        logger.info('Validating Configuration:');

        // validate tasks
        if (Y.Object.isEmpty(config.tasks)) {
            delete config.tasks;
        } else {
            if (!Y.Lang.isObject(config.tasks)) {
                logger.error(logType, 'tasks option should be an object. Ignoring tasks.');
                delete config.tasks;
            }
            Y.Object.each(config.tasks, function (typeTasks, taskType) {

                // remove task type if falsey
                if (!typeTasks) {
                    delete config.tasks[taskType];
                    return;
                }

                if (!Y.Lang.isObject(typeTasks)) {
                    logger.error(logType, '\'' + taskType + '\' tasks should be an object. Ignoring \'' + taskType + '\' tasks.');
                    delete config.tasks[taskType];
                }

                // initializing task modules
                Y.Object.each(typeTasks, function (taskConfig, taskName) {
                    var module = modules.tasks[taskName],
                        moduleName;

                    // remove task if set to false
                    if (taskConfig === false) {
                        delete typeTasks[taskName];
                        return;
                    }
                    typeTasks[taskName] = taskConfig = Y.Lang.isObject(taskConfig) ? taskConfig : {};

                    // load module if not a default module
                    if (!module) {
                        // module name is specified through the 'module' option if empty it is the task name
                        moduleName = taskConfig.module || 'mojito-shaker-' + taskName;
                        // load task module
                        try {
                            modules.tasks[taskName] = require(moduleName).task;
                            if (!Y.Lang.isFunction(modules.tasks[taskName])) {
                                logger.error(logType, 'Task module \'' + moduleName + '\' must have a function called \'task\'. Ignoring \'' + taskName + '\' task.');
                                delete typeTasks[taskName];
                            }
                        } catch (e) {
                            logger.error(logType, 'Unable to find the module \'' + moduleName + '\'. Ignoring \'' + taskName + '\' task.');
                            delete typeTasks[taskName];
                        }
                    }
                });
            });
        }

        // validate locations
        if (Y.Object.isEmpty(config.locations)) {
            delete config.locations;
        } else {
            if (!Y.Lang.isObject(config.locations)) {
                logger.error(logType, 'locations option should be an object. Ignoring locations.');
                delete config.locations;
            }
            Y.Object.each(config.locations, function (locationConfig, location) {
                var module = modules.locations[location],
                    moduleName;

                locationConfig.app = config.app;

                // remove location if set to false
                if (locationConfig === false) {
                    delete config.locations[location];
                    return;
                }
                config.locations[location] = locationConfig = Y.Lang.isObject(locationConfig) ? locationConfig : {};

                // load module if not a default module
                // construct module objects
                if (!module) {
                    // module name is specified through the 'module' option if empty it is the task name
                    moduleName = locationConfig.module || 'mojito-shaker-' + location;
                    // load task module
                    try {
                        modules.locations[location] = require(moduleName).location;
                        if (!modules.locations[location]) {
                            logger.error(logType, 'Location module \'' + moduleName + '\' must have a constructor called \'location\'. Ignoring \'' + location + '\' location.');
                            delete config.locations[location];
                        }
                    } catch (e) {
                        logger.error(logType, 'Unable to find the module \'' + moduleName + '\'. Ignoring \'' + location + '\' location.');
                        delete config.locations[location];
                    }
                }
            });
        }

        // validate route rollups
        if (Y.Object.isEmpty(config.routeRollups)) {
            delete config.routeRollups;
        } else {
            if (!Y.Lang.isObject(config.routeRollups)) {
                logger.error(logType, 'routeRollups option should be an object. Ignoring route rollups.');
                delete config.routeRollups;
            } else if (!config.routeRollups.module || !Y.Lang.isString(config.routeRollups.module)) {
                logger.error(logType, 'Invalid routeRollup module. The option \'module\' must be specfied. Ignoring route rollups.');
                delete config.routeRollups;
            } else if (Y.Object.isEmpty(config.locations)) {
                logger.warn(logType, 'Ignoring route rollups since no valid location was specified. There must be a location to store the rollup.');
                delete config.routeRollups;
            } else if (!modules.rollups[config.routeRollups.module]) {
                // load route rollup module
                try {
                    modules.rollups[config.routeRollups.module] = require(config.routeRollups.module).rollup;
                    if (!Y.Lang.isFunction(modules.rollups[config.routeRollups.module])) {
                        logger.error(logType, 'Rollup module \'' + config.routeRollups.module + '\' must have a function called \'rollup\'. Ignoring route rollups.');
                        delete config.routeRollups;
                    }
                } catch (e) {
                    logger.error(logType, 'Unable to find the module \'' + config.routeRollups.module + '\'. Ignoring route rollups.');
                    delete config.routeRollups;
                }
            }
        }

        logger.info(JSON.stringify(config, null, '    '));
    },

    _initializeLocations: function (config, organizedResources, modules, logger) {
        'use strict';
        var logType = 'Location Initialization',
            error,
            criticalError;

        if (Y.Object.isEmpty(config.locations)) {
            return;
        }
        logger.info('Initializing Locations');

        organizedResources.locations = {};
        Y.Object.each(config.locations, function (locationConfig, location) {
            if (criticalError) {
                return;
            }
            locationConfig.app = config.app;
            try {
                modules.locations[location] = new modules.locations[location](locationConfig);
                organizedResources.locations[location] = {
                    resources: {},
                    yuiConfig: modules.locations[location].yuiConfig || {}
                };

                if (!modules.locations[location].store) {
                    error = 'Location module \'' + location + '\' must have a method called \'store.\'';
                    if (config.locations[location].critical) {
                        criticalError = error;
                    } else {
                        logger.error(logType, error + ' Ignoring \'' + location + '\' location.');
                    }
                    delete config.locations[location];
                }
            } catch (e) {
                error = 'Unable to construct \'' + location + '\' location module.';
                if (config.locations[location].critical) {
                    criticalError = error;
                } else {
                    logger.error(logType, error + ' Ignoring \'' + location + '\' location: ' + e);
                }
                delete config.locations[location];
            }
        });

        return criticalError;
    },

    _applyTasks: function (resource, tasks, modules, logger, done) {
        'use strict';
        var typeTasks = {},
            type = resource.type,
            logType = 'Task';

        // get the most specific task type for this resource
        while (!typeTasks[type]) {
            type = typeHierarchy[type];
            if (!type) {
                break;
            }
            if (type === '*') {
                type = resource.subtype;
                break;
            }
        }

        // determine the different type tasks
        Y.Object.each(tasks, function (configTypeTasks, type) {
            typeTasks[type] = [];
            Y.Object.each(configTypeTasks, function (taskOptions, taskName) {
                typeTasks[type].push({
                    task: function (resource, options, callback) {
                        modules.tasks[taskName](resource, options, callback);
                    },
                    options: taskOptions,
                    name: taskName
                });
            });
        });

        async.eachSeries(typeTasks[type] || [], function (typeTask, taskCallback) {
            var errorMessage = 'Error when applying task \'' + typeTask.name + '\' to ' + (resource.relativePath || resource.basename);
            try {
                typeTask.task(resource, typeTask.options, function (taskError) {
                    if (taskError) {
                        errorMessage += ': ' + taskError;
                        if (typeTask.options.critical) {
                            logger.error(logType, errorMessage);
                        } else {
                            logger.warn(logType, errorMessage);
                        }
                    }
                    errorMessage = typeTask.options.critical ? errorMessage : null;
                    taskCallback(errorMessage);
                });
            } catch (e) {
                errorMessage += ': ' + e;
                logger.error(logType, errorMessage);
                errorMessage = typeTask.options.critical ? errorMessage : null;
                taskCallback(errorMessage);
            }
        }, function (error) {
            done(error);
        });
    },

    _applyLocations: function (resource, locations, organizedResources, modules, logger, done) {
        'use strict';
        var locationsArray = Y.Object.keys(locations || {}),
            logType = 'Location';

        // store resource to different locations in parallel
        async.forEach(locationsArray, function (location, locationCallback) {
            var locationModule = modules.locations[location],
                errorMessage = 'Error when storing ' + (resource.relativePath || resource.basename) + ' to \'' + location + '\' location';
            // upload the resource and get new location
            try {
                locationModule.store(resource, function (locationError, resourceLocation) {
                    if (locationError) {
                        errorMessage += ': ' + locationError;
                        if (locations[location].critical) {
                            logger.error(logType, errorMessage);
                        } else {
                            logger.warn(logType, errorMessage);
                        }
                    }
                    errorMessage = locations[location].critical ? errorMessage : null;
                    resource.locations[location] = resourceLocation;
                    locationCallback(errorMessage);
                });
            } catch (e) {
                errorMessage += ': ' + e;
                logger.error('Location', errorMessage);
                errorMessage = locations[location].critical ? errorMessage : null;
                locationCallback(errorMessage);
            }
        }, function (error) {
            // add uploaded resource to organizedResources.locations
            Y.Object.each(resource.locations, function (locationUrl, locationName) {
                organizedResources.locations[locationName].resources[resource.url] = locationUrl;
            });
            done(error);
        });
    },

    _tasksAndLocations: function (config, resources, organizedResources, modules, logger, done) {
        'use strict';
        var self = this,
            resourcesGroups = [[]],
            groupNum = 0,
            numResources = 0;

        // place resources into groups of array
        // each group has MAX_PARALLEL resources
        Y.Object.each(resources, function (resource) {
            numResources++;
            // add getChecksum function if there are locations to be applied
            if (!Y.Object.isEmpty(config.locations)) {
                resource.locations = {};
                resource.getChecksum = function () {
                    var checksum = crypto.createHash('md5').update(this.content).digest('hex');
                    // save hash for future calls to getHash
                    this.getChecksum = function () {
                        return checksum;
                    };
                    return checksum;
                };
            }

            // add resource to group
            resourcesGroups[groupNum].push(resource);

            // if group has MAX_PARALLEL resources then create new group
            if (resourcesGroups[groupNum].length >= MAX_PARALLEL) {
                groupNum++;
                resourcesGroups[groupNum] = [];
            }
        });

        logger.info('Applying tasks and locations to ' + numResources + ' resources');

        // apply tasks and locations to each resource in parallel
        async.eachSeries(resourcesGroups, function (resourcesGroup, resourcesGroupCallback) {
            async.forEach(resourcesGroup, function (resource, resourceCallback) {
                // read resource
                resource.read(function () {
                    // apply tasks in series
                    async.series({
                        applyTasks: function (callback) {
                            self._applyTasks(resource, config.tasks, modules, logger, callback);
                        },
                        applyLocations: function (callback) {
                            self._applyLocations(resource, config.locations, organizedResources, modules, logger, callback);
                        }
                    }, function (error) {
                        resourceCallback(error);
                    });
                });
            }, function (error) {
                resourcesGroupCallback(error);
            });
        }, function (error) {
            done(error);
        });
    },

    _loadersAndRollups: function (config, resources, modules, logger, done) {
        'use strict';
        var self = this;
        async.parallel({
            updateLoader: function (callback) {
                self._updateLoaders(config, resources, modules, logger, callback);
            },
            applyRollups: function (callback) {
                self._applyRollups(config, resources, modules, logger, callback);
            }
        }, function (error) {
            done(error);
        });
    },

    _updateLoaders: function (config, resources, modules, logger, done) {
        'use strict';
        var self = this,
            locationsArray = Y.Object.keys(config.locations || {});

        if (locationsArray.length === 0) {
            return done();
        }

        logger.info('Updating Loaders with Locations');

        resources.loaderResources = {};

        // construction locations map, mapping app url to their corresponding location url
        async.forEach(locationsArray, function (location, locationCallback) {
            var loaderResources,
                locationMap = {},
                // only apply jsminify and one location to loaders
                loaderConfig = {
                    tasks: {
                        loader: {
                            jsminify: {}
                        }
                    },
                    locations: {}
                };

            loaderConfig.locations[location] = config.locations[location];

            Y.Object.each(resources.appResources, function (resource) {
                if (resource.locations[location]) {
                    locationMap[resource.url] = resource.locations[location];
                }
            });

            resources.resolveResourceVersions(locationMap);
            loaderResources = resources.getLoaderResources();

            self._tasksAndLocations(loaderConfig, loaderResources, resources.organizedResources, modules, logger, function (error) {
                locationCallback(error);
            });
        }, function (error) {
            done(error);
        });
    },

    _applyRollups: function (config, resources, modules, logger, done) {
        'use strict';
        var appResources = resources.appResources,
            rollupResources = {},
            organizedResources = resources.organizedResources,
            rollups,
            i = 0;

        resources.rollupResources = {};

        if (config.routeRollups) {
            logger.info('Applying Rollups');
            try {
                rollups = modules.rollups[config.routeRollups.module](config.routeRollups, organizedResources);
            } catch (e) {
                logger.error('Rollups', '\'' + config.routeRollups.module + '\' failed, ignoring rollups: ' + e);
            }
        }

        // filter out content that don't have any particular resource that belongs to a posl
        // add rollups to organizedResources
        Y.Object.each(organizedResources.app, function (poslResources, posl) {
            var poslArray = posl.split('-'),
                minorSelector = poslArray[poslArray.length - 2];

            // check which rollups belong in posl
            poslResources.rollups = {};
            Y.Object.each(rollups && rollups[posl], function (routeRollups, route) {
                poslResources.rollups[route] = {};

                Y.Object.each(routeRollups, function (rollup, type) {
                    var belongsInPOSL = posl === '*';
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
                            var rollupName = ['route', type, route, posl, index].join('_');
                            rollupResources[rollupName] = resources.appResources[rollupName] = {
                                content: rollupContent,
                                basename: rollupName,
                                subtype: type,
                                type: 'rollup',
                                url: rollupName,
                                read: function (callback) {
                                    callback(this.content);
                                }
                            };
                            poslResources.rollups[route][type].rollups[rollupName] = rollupResources[rollupName];
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
                var belongsInPOSL = posl === '*';
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

                    // add assets
                    Y.Object.each(assets, function (assetGroup, type) {
                        resources[type] = resources[type] || {};

                        Y.Object.each(assetGroup, function (resource, url) {
                            resources[type][url] = resource;
                        });
                    });

                    if (Y.Object.isEmpty(resources.js)) {
                        delete resources.js;
                    }

                    // check if the resources belong in posl
                    Y.Object.each(resources, function (typeResources, type) {
                        var belongsInPOSL = posl === '*';
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

        // upload rollups
        if (!Y.Object.isEmpty(rollupResources)) {
            // apply only locations to rollups, there is no need to apply tasks
            this._tasksAndLocations({
                locations: config.locations
            }, rollupResources, organizedResources, modules, logger, function (error) {
                done(error);
            });
        } else {
            done();
        }
    },

    _constructMetadata: function (config, resources, logger, done) {
        'use strict';
        var appResources = resources.appResources,
            organizedResources = resources.organizedResources,
            resourcesByType = {},
            numProcessedResources = 0;

        // construct inline map
        organizedResources.inline = {};
        Y.Object.each(appResources, function (resource) {
            numProcessedResources++;
            if (resource.inline || resource.typeInline) {
                organizedResources.inline[resource.url] = resource.content;
            }
        });
        if (Y.Object.isEmpty(organizedResources.inline)) {
            delete organizedResources.inline;
        }

        // mojito
        delete organizedResources.mojito;

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
                    });
                });
            });
        });

        // print summary and write metadata
        logger.printSummary();
        fs.writeFile('shaker-meta.json', JSON.stringify(organizedResources, null, '    '), function (err) {
            logger.print('\nProcessed ' + numProcessedResources + ' resources', 'info');
            logger.print('Compilation Time: ' + ((new Date().getTime() - logger.data.startTime) / 1000) + 's', 'info');
            done(err);
        });
    }
};

exports.ShakerCompiler = ShakerCompiler;