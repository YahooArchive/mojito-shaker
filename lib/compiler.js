/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/*jslint nomen: true, stupid: true, bitwise: true, plusplus: true */

var Y = require('yui').YUI({useSync: true}).use('base'),
    async = require('async'),
    crypto = require('crypto'),
    path = require('path'),
    fs = require('fs'),
    http = require('http'),
    Logger = require('./utils/logger.js').Logger,
    ShakerResources = require('./resources.js').ShakerResources,
    MAX_PARALLEL = 32,
    METADATA_FILENAME = 'shaker-meta.json',
    COMPILED_ASSETS = 'assets/compiled',
    TYPE_HIERARCHY = {
        'yui-module': 'js',
        'yui-library': 'yui-module',
        'yui-lang': 'yui-module',
        'controller': 'yui-module',
        'binder': 'yui-module',
        'addon': 'yui-module',
        'loader': 'yui-module',
        'bootstrap': 'js',
        'rollup': '*',
        'asset': '*',
        'view': 'html',
        'css': null,
        'js': null
    };

function ShakerCompiler(context, root) {
    'use strict';
    ShakerCompiler.superclass.constructor.apply(this, arguments);

    this.context = context;
    this.cwd = process.cwd();
    this.root = root || this.cwd;
    this.logger = new Logger();

    this.modules = {
        tasks: {
            csslint: require('./tasks/csslint.js').task,
            cssminify: require('./tasks/cssminify.js').task,
            cssurls: require('./tasks/cssurls.js').task,
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

ShakerCompiler.NAME = 'shakerCompiler';
ShakerCompiler.ATTRS = {};

Y.extend(ShakerCompiler, Y.Base, {
    compile: function (done) {
        'use strict';
        var self = this,
            context = this.context,
            root = this.root,
            modules = this.modules,
            logger = this.logger,
            resources,
            error,
            config;

        // remove metadata file and compiled assets directory
        error = self._removeMetadataAndCompileAssets(this.root + '/' + METADATA_FILENAME, this.root + '/' + COMPILED_ASSETS, logger);
        if (error) {
            return done(error);
        }

        // get all resources
        logger.data.startTime = new Date().getTime();
        resources = new ShakerResources(context, root, logger);
        self.resources = resources;

        config = resources.shakerConfig;

        // load addons
        self._loadAddons(config, resources.store);

        // validate configuration
        self._validateConfig(config, modules, logger);

        // initialize tasks
        self._initializeTasks(config, resources, modules);

        // initialize locations
        error = self._initializeLocations(config, resources, modules, logger);
        if (error) {
            return done(error);
        }

        // make sure that we can open as many sockets as the number of parallel resources being processed.
        http.globalAgent.maxSockets = MAX_PARALLEL;

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

    _loadAddons: function (config, store) {
        'use strict';
        if (!config.addons || !config.addons.compiler) {
            return;
        }
        var addons = {},
            shakerAddons = store.getResourceVersions({
                type: 'addon',
                subtype: 'shaker'
            });

        Y.Array.each(shakerAddons, function (addonResource) {
            var cfg = config.addons.compiler[addonResource.name];
            if (cfg) {
                addons['addon-shaker-' + addonResource.name] = {
                    fullpath: addonResource.source.fs.fullPath
                };
            }
        });
        this._yuiUseSync(addons);

        Y.Object.each(Y.mojito && Y.mojito.addons && Y.mojito.addons.shaker, function (fn, name) {
            // make a shallow copy of the config because it's going to be modified by the plugin
            this.plug(fn, Y.merge(config.addons.compiler[name]));
        }, this);
    },

    _yuiUseSync: function (addons) {
        'use strict';
        Y.applyConfig({
            useSync: true,
            modules: addons
        });
        Y.use.apply(Y, Object.keys(addons));
        Y.applyConfig({ useSync: false });
    },

    _removeMetadataAndCompileAssets: function (metadata, compiledAssets, logger) {
        'use strict';
        var files,
            i,
            relativeMetadata = path.relative(this.cwd, metadata),
            relativeCompiledAssets = path.relative(this.cwd, compiledAssets);

        if (fs.existsSync(metadata)) {
            logger.info('Removing ' + relativeMetadata);
            try {
                fs.unlinkSync(metadata);
            } catch (e1) {
                return 'Unable to remove ' + relativeMetadata + ' - ' + e1;
            }
        } else {
            // test if can write metadata
            try {
                fs.writeFileSync(metadata, '');
            } catch (e2) {
                return 'Unable to write ' + relativeMetadata + ' - ' + e2;
            }
        }

        if (fs.existsSync(compiledAssets)) {
            logger.info('Removing ' + relativeCompiledAssets);
            try {
                files = fs.readdirSync(compiledAssets);
                for (i = 0; i < files.length; i++) {
                    fs.unlinkSync(compiledAssets + '/' + files[i]);
                }
                fs.rmdirSync(compiledAssets);
            } catch (e3) {
                // if cant remove
                return 'Unable to remove ' + relativeCompiledAssets + ' - ' + e3;
            }
        }
        return false;
    },

    _validateConfig: function (config, modules, logger) {
        'use strict';
        var logType = 'Config Validation',
            VALID_OPTIONS = ['resources', 'tasks', 'routeRollups', 'locations', 'settings', 'app', 'addons'];

        logger.info('Validating Configuration:');

        // validate tasks
        if (Y.Object.isEmpty(config.tasks)) {
            config.tasks = {};
        } else {
            if (!Y.Lang.isObject(config.tasks)) {
                logger.error(logType, 'tasks option should be an object.');
                config.tasks = {};
            }

            // check if there are any unknown task types
            Y.Object.each(config.tasks, function (typeTasks, taskType) {
                if (TYPE_HIERARCHY[taskType] === undefined) {
                    logger.warn(logType, 'Ignoring unknown task type \'' + taskType + '\'.');
                    delete config.tasks[taskType];
                }
            });

            Y.Object.each(config.tasks, function (typeTasks, taskType) {

                // remove task type if falsey
                if (!typeTasks) {
                    delete config.tasks[taskType];
                    return;
                }

                if (!Y.Lang.isObject(typeTasks)) {
                    logger.error(logType, '\'' + taskType + '\' tasks should be an object. Ignoring \'' + taskType + '\' tasks.');
                    delete config.tasks[taskType];
                    return;
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

                    // check 'errorStop' option
                    if (!taskConfig.errorStop) {
                        delete taskConfig.errorStop;
                    } else if (!Y.Lang.isBoolean(taskConfig.errorStop) && !Y.Lang.isNumber(taskConfig.errorStop)) {
                        delete taskConfig.errorStop;
                        logger.warn(logType, 'errorStop option within task module \'' + taskName + '\' should be a boolean or integer. Ignoring errorStop.');
                    }

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

        // add default loader, rollup, and yui-library type tasks if not specified
        config.tasks.loader = config.tasks.loader || {
            jsminify: {}
        };
        config.tasks.rollup = config.tasks.rollup || {};
        config.tasks['yui-library'] = config.tasks['yui-library'] || {};
        config.tasks.bootstrap = config.tasks.bootstrap || {
            jsminify: {}
        };
        // add cssurls task by default unless disabled
        config.tasks.css = config.tasks.css || {};
        config.tasks.css.cssurls = config.tasks.css.cssurls === undefined ? {} : config.tasks.css.cssurls;

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

                // check 'errorStop' option
                if (!locationConfig.errorStop) {
                    delete locationConfig.errorStop;
                } else if (!Y.Lang.isBoolean(locationConfig.errorStop) && !Y.Lang.isNumber(locationConfig.errorStop)) {
                    delete locationConfig.errorStop;
                    logger.warn(logType, 'errorStop option within location module \'' + moduleName + '\' should be a boolean or integer. Ignoring errorStop.');
                }
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
                        logger.error(logType, 'Unable to load the module \'' + moduleName + '\': ' + e.message + '. Ignoring \'' + location + '\' location.');
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
                    logger.error(logType, 'Unable to find the module \'' + config.routeRollups.module + '\': ' + e.message + '. Ignoring route rollups.');
                    delete config.routeRollups;
                }
            }
        }

        // check if there are any unknown options
        Y.Object.each(config, function (optionObject, option) {
            if (VALID_OPTIONS.indexOf(option) === -1) {
                logger.warn(logType, 'Ignoring unknown option \'' + option + '\'.');
                delete config[option];
            }
        });

        logger.info(JSON.stringify(config, null, '    '));
    },

    _initializeTasks: function (config, resources, modules) {
        'use strict';
        var tasks = {};

        if (!config.tasks) {
            return;
        }

        // initialize each type tasks to include an array of tasks
        // with the actual module function
        Y.Object.each(config.tasks, function (typeTasks, type) {
            tasks[type] = [];
            Y.Object.each(typeTasks, function (taskOptions, taskName) {
                // give access to shakerConfig and resources through task options
                if (taskOptions !== false) {
                    taskOptions = Y.mix({
                        shaker: {
                            config: config,
                            Y: Y,
                            appResources: resources.appResources,
                            organizedResources: resources.organizedResources
                        }
                    }, taskOptions);
                }
                tasks[type].push({
                    task: function (resource, callback) {
                        modules.tasks[taskName](resource, taskOptions, callback);
                    },
                    options: taskOptions,
                    name: taskName
                });
            });
        });

        config.tasks = tasks;
    },

    _initializeLocations: function (config, resources, modules, logger) {
        'use strict';
        var logType = 'Location Initialization',
            error,
            appResources = resources.appResources,
            organizedResources = resources.organizedResources,
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
                modules.locations[location] = new modules.locations[location](Y.mix({
                    shaker: {
                        Y: Y,
                        config: config,
                        appResources: appResources,
                        organizedResources: organizedResources
                    }
                }, locationConfig));
                organizedResources.locations[location] = {
                    resources: {},
                    yuiConfig: modules.locations[location].yuiConfig || {}
                };

                if (!modules.locations[location].store) {
                    error = 'Location module \'' + location + '\' must have a method called \'store.\'';
                    if (config.locations[location].errorStop !== undefined) {
                        criticalError = error;
                    } else {
                        logger.error(logType, error + ' Ignoring \'' + location + '\' location.');
                    }
                    delete config.locations[location];
                }
            } catch (e) {
                error = 'Unable to construct \'' + location + '\' location module.';
                if (config.locations[location].errorStop !== undefined) {
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
        var type = resource.type,
            logType = 'Tasks';

        if (!tasks) {
            return done();
        }

        // continue looking for a less specific type task
        // if the desired type task does not exist and there
        // is a less specific type task
        while (!tasks[type] && TYPE_HIERARCHY[type]) {
            type = TYPE_HIERARCHY[type];

            if (type === '*') {
                type = resource.subtype;
                break;
            }
        }
        // exit while loop once most specific task type is determined
        // or there is no less specific task type in the tasks configuration

        async.eachSeries(tasks[type] || [], function (typeTask, taskCallback) {
            var maxErrorMessage = 'Task module \'' + typeTask.name + '\' reached the maximum number of errors allowed.',
                errorMessage = 'Error when applying task \'' + typeTask.name + '\' to ' + (resource.relativePath || resource.basename);

            if (!typeTask.options) {
                return taskCallback(null);
            }

            try {
                typeTask.task(resource, function (taskError) {
                    if (taskError) {
                        errorMessage += ': ' + taskError;
                        if (--typeTask.options.errorStop <= 0) {
                            logger.error(logType, errorMessage);
                        } else {
                            logger.warn(logType, errorMessage);
                        }
                    }
                    errorMessage = typeTask.options.errorStop <= 0 ? maxErrorMessage : null;
                    taskCallback(errorMessage);
                });
            } catch (e) {
                errorMessage += ': ' + e;
                logger.error(logType, errorMessage);
                errorMessage = --typeTask.options.errorStop <= 0 ? maxErrorMessage : null;
                taskCallback(errorMessage);
            }
        }, function (error) {
            done(error);
        });
    },

    _applyLocations: function (resource, locations, organizedResources, modules, logger, done) {
        'use strict';
        var self = this,
            locationsArray = Y.Object.keys(locations || {}),
            logType = 'Locations';

        // do not push yui-libraries or bootstrap
        if (resource.type === 'yui-library' || resource.type === 'bootstrap') {
            return done(null);
        }

        // store resource to different locations in parallel
        async.forEach(locationsArray, function (location, locationCallback) {
            var locationModule = modules.locations[location],
                maxErrorMessage = 'Location module \'' + location + '\' reached the maximum number of errors allowed.',
                errorMessage = 'Error when storing ' + (resource.relativePath || resource.basename) + ' to \'' + location + '\' location';
            // upload the resource and get new location
            try {
                // if resource has a corresponding location content then pass a resource object with the proper content
                if (resource.locationContent && resource.locationContent[location] !== undefined) {
                    resource = Y.mix({}, resource);
                    resource.content = resource.locationContent[location];
                }

                locationModule.store(resource, function (locationError, resourceLocation) {
                    if (locationError) {
                        errorMessage += ': ' + locationError;
                        if (--locations[location].errorStop <= 0) {
                            logger.error(logType, errorMessage);
                        } else {
                            logger.warn(logType, errorMessage);
                        }
                        // if resource is a loader indicate that this location has a loader error
                        if (resource.type === 'loader') {
                            organizedResources.locations[location].loaderError = true;
                        }
                    }
                    errorMessage = locations[location].errorStop <= 0 ? maxErrorMessage : null;
                    resource.locations[location] = resourceLocation;
                    locationCallback(errorMessage);
                });
            } catch (e) {
                // if resource is a loader indicate that this location has a loader error
                if (resource.type === 'loader') {
                    organizedResources.locations[location].loaderError = true;
                }
                errorMessage += ': ' + e;
                logger.error('Location', errorMessage);
                errorMessage = --locations[location].errorStop <= 0 ? maxErrorMessage : null;
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
            resourcesArray = [],
            groupNum = 0,
            numResources = 0,
            lastType;

        // Sort resources such that js and css resources are processed last, this allows for js and css resources
        // to have tasks that depend on other resources. For example css resources may have url references which need
        // to be updated, but first those references must be uploaded, such that the uploaded urls are used.
        Y.Object.each(resources, function (resource) {
            resourcesArray.push(resource);
        });
        resourcesArray.sort(function (resource1, resource2) {
            var order = ['css', 'js'],
                index1 = order.indexOf(resource1.subtype),
                index2 = order.indexOf(resource2.subtype);

            return index1 > index2 ? 1 : index1 < index2 ? -1 : 0;
        });

        // place resources into groups of array
        // each group has MAX_PARALLEL resources
        Y.Array.each(resourcesArray, function (resource) {
            // if group has MAX_PARALLEL resources then create new group
            if (resourcesGroups[groupNum].length >= MAX_PARALLEL ||
                    // if we are now just processing js or css resources,
                    // then create a new group, unless the current group is already empty.
                    (lastType !== resource.subtype && (resource.subtype === 'js' || resource.subtype === 'css')
                        && resourcesGroups[groupNum].length > 0)) {
                groupNum++;
                resourcesGroups[groupNum] = [];
            }

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
            lastType = resource.subtype;
        });

        logger.info('Applying tasks and locations to ' + numResources + ' resources');

        // apply tasks and locations to each resource in parallel
        async.eachSeries(resourcesGroups, function (resourcesGroup, resourcesGroupCallback) {
            async.forEach(resourcesGroup, function (resource, resourceCallback) {
                // if no task/location to be applied and resource is not inline then skip
                if (!config.tasks && !config.locations && !resource.inline) {
                    return resourceCallback();
                }
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
                    tasks: config.tasks,
                    locations: {}
                };

            loaderConfig.locations[location] = config.locations[location];

            Y.Object.each(resources.appResources, function (resource) {
                if (resource.locations[location]) {
                    locationMap[resource.url] = resource.locations[location];
                }
            });

            //resources.resolveResourceVersions(locationMap);
            loaderResources = resources.getLoaderResources(locationMap);

            self._tasksAndLocations(loaderConfig, loaderResources, resources.organizedResources, modules, logger, function (error) {
                locationCallback(error);
            });
        }, function (error) {
            done(error);
        });
    },

    // this method allows addons to modify the resources object that is passed the rollup module
    _preprocessRollupResources: function (organizedResources) {
        'use strict';
        return organizedResources;
    },

    _applyRollups: function (config, resources, modules, logger, done) {
        'use strict';
        var appResources = resources.appResources,
            rollupResources = {},
            organizedResources = resources.organizedResources,
            rollups,
            posl,
            nextPosl,
            poslArray,
            poslResources,
            highestPrioritySelector,
            i,
            // Get all the posls, ordered such that more specific posls are processed first.
            // This ensures that if a posl is to be deleted, its more general version hasn't been deleted.
            poslSorter = function (a, b) {
                return a.length > b.length ? -1 : a.length < b.length ? 1 : 0;
            },
            posls = Y.Object.keys(organizedResources.app).sort(poslSorter);

        resources.rollupResources = {};

        if (config.routeRollups) {
            logger.info('Applying Rollups');
            try {
                rollups = modules.rollups[config.routeRollups.module](Y.mix({
                    shaker: {
                        Y: Y,
                        appResources: appResources,
                        organizedResources: organizedResources,
                        config: config
                    }
                }, config.routeRollups), this._preprocessRollupResources(organizedResources));
            } catch (e) {
                logger.error('Rollups', '\'' + config.routeRollups.module + '\' failed, ignoring rollups: ' + e);
            }
        }

        // filter out content that don't have any particular resource that belongs to a posl
        // add rollups to organizedResources
        for (i = 0; i < posls.length; i++) {
            posl = posls[i];
            poslArray = organizedResources.app[posl].posl;
            highestPrioritySelector = poslArray[0];
            nextPosl = poslArray.slice(1).join('-');
            if (nextPosl && posls.indexOf(nextPosl) === -1) {
                posls.push(nextPosl);
                posls.sort(poslSorter);
            }
            poslResources = organizedResources.app[posl] || {};

            // check which rollups belong in posl
            poslResources.rollups = {};
            Y.Object.each(rollups && rollups[posl], function (routeRollups, route) {
                poslResources.rollups[route] = {};

                Y.Object.each(routeRollups, function (rollup, type) {
                    var belongsInPOSL = posl === '*';
                    Y.Object.each(rollup.resources, function (resource, url) {
                        belongsInPOSL |= resource.selector === highestPrioritySelector;
                    });
                    if (belongsInPOSL) {
                        poslResources.rollups[route][type] = {
                            rollups: {},
                            resources: {}
                        };
                        // create new resources for rollups and add to appResources
                        Y.Object.each(rollup.rollups, function (rollupContent, index) {
                            var rollupName = ['rollup', route, type, posl, index].join('_');
                            // make sure that the rollup does not contain any '/'
                            rollupName = rollupName.replace(/\//g, '_');
                            rollupResources[rollupName] = resources.appResources[rollupName] = {
                                basename: rollupName,
                                subtype: type,
                                type: 'rollup',
                                mime: rollup.resources[Object.keys(rollup.resources)[0]].mime,
                                url: rollupName,
                                read: function (callback) {
                                    callback(this.content);
                                }
                            };

                            if (Y.Lang.isObject(rollupContent)) {
                                rollupResources[rollupName].locationContent = rollupContent;
                            } else {
                                rollupResources[rollupName].content = rollupContent;
                            }

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
                    belongsInPOSL |= resource.selector === highestPrioritySelector;
                });
                if (!belongsInPOSL) {
                    // Make sure that the next posl exists, else copy typeResources to that posl.
                    organizedResources.app[nextPosl] = organizedResources.app[nextPosl] || {};
                    organizedResources.app[nextPosl].app = organizedResources.app[nextPosl].app || {};
                    organizedResources.app[nextPosl].app[type] = typeResources;

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
                    if (assets) {
                        Y.Object.each(assets, function (assetGroup, type) {
                            resources[type] = resources[type] || {};

                            Y.Object.each(assetGroup, function (resource, url) {
                                resources[type][url] = resource;
                            });
                        });
                    } else {
                        resources = {};
                    }

                    // check if the resources belong in posl
                    Y.Object.each(resources, function (typeResources, type) {
                        var belongsInPOSL = posl === '*';
                        Y.Object.each(typeResources, function (resource, url) {
                            belongsInPOSL |= resource.selector === highestPrioritySelector;
                        });
                        if (!belongsInPOSL) {
                            // Make sure that the next posl exists, else copy typeResources to that posl.
                            organizedResources.app[nextPosl] = organizedResources.app[nextPosl] || {};
                            organizedResources.app[nextPosl].mojits = organizedResources.app[nextPosl].mojits || {};
                            organizedResources.app[nextPosl].mojits[mojit] = organizedResources.app[nextPosl].mojits[mojit] || {};
                            organizedResources.app[nextPosl].mojits[mojit][action] = organizedResources.app[nextPosl].mojits[mojit][action] || {};
                            organizedResources.app[nextPosl].mojits[mojit][action][type] = typeResources;

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
        }

        // upload rollups
        if (!Y.Object.isEmpty(rollupResources)) {
            this._tasksAndLocations({
                tasks: config.tasks,
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
            numProcessedResources = Y.Object.size(appResources);

        // construct inline map
        organizedResources.inline = {};
        Y.Object.each(appResources, function (resource) {
            if (resource.inline || resource.typeInline) {
                organizedResources.inline[resource.url] = resource.inlineContent !== undefined ?
                        resource.inlineContent : resource.content;
            }
        });
        if (Y.Object.isEmpty(organizedResources.inline)) {
            delete organizedResources.inline;
        }

        // yui
        delete organizedResources.yui;

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
        fs.writeFile(this.root + '/' + METADATA_FILENAME, JSON.stringify(organizedResources, null, '    '), function (err) {
            logger.print('\nProcessed ' + numProcessedResources + ' resources', 'info');
            logger.print('Compilation Time: ' + ((new Date().getTime() - logger.data.startTime) / 1000) + 's', 'info');
            done(err);
        });
    }
});


exports.ShakerCompiler = ShakerCompiler;
