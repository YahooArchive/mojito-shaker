/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var libpath = require('path'),
    libvm = require('vm'),
    libfs = require('fs'),
    mime = require('mime'),
    util = require('./utils');

try {
    logger = require('mojito/lib/management/utils');
} catch (exc) {
    logger = require('mojito/management/utils');
}

var ShakerCore = function (config) {
    config = config || {};
    this._store = config.store;

    this._app = this._store.getAppConfig(null, 'application') || {};
    this._app = util.isEmpty(this._app) ? this._store.getAppConfig({}, 'definition') : this._app;
    var appConfig = this._app.staticHandling || {};

    this._prefix = '/static';
    if (typeof appConfig.prefix !== 'undefined') {
        this._prefix = appConfig.prefix ? '/' + appConfig.prefix : '';
    }

    this._root = this._store._shortRoot;
    if (typeof appConfig.appName !== 'undefined') {
        this._root = appConfig.appName;
    }

    this._files = {};
};

ShakerCore.SHAKER_CONFIG_NAME = 'shaker.json';
ShakerCore.SHAKER_MOJIT_FRAME = 'ShakerHTMLFrameMojit';
ShakerCore.SHAKER_DEFAULT_DIM_CONFIG = { // Template for default shaker config
    common: {},
    action: {},
    device: {},
    skin: {},
    region: {},
    lang: {}
};
ShakerCore.SHAKER_DEFAULT_ORDER = 'common-action-device-skin-region-lang';
ShakerCore.SHAKER_DEFAULT_ACTION_CONFIG = {
    '*': {order: ShakerCore.SHAKER_DEFAULT_ORDER}
};
ShakerCore.DEBUG = false;

ShakerCore.prototype._debug = function (f, err) { if (ShakerCore.DEBUG) {console.log(f + ': ' + err);}};

/**
*
* Return the mojits avaliable in the app regarding the app mojitPath configuration.
* This function expects application.json object as parameter.
* If not found, it takes the default folder "mojit" as container for the mojits.
* @method _getMojits
* @param {Object} The application configuration object.
* @private
* @return {Object} Return an object with the Mojit name as key and their path as value.
*
**/

ShakerCore.prototype._getMojits = function (app_config) {
    var j, mojit, folder, dir, i, mojitFolders = (app_config && app_config[0].mojitDirs) || ['mojits'],
        mojits = {},
        filter_function = function (i) {
            return i.charAt(0) !== '.'; //remove non-folder items
        };

    for (i = 0; i < mojitFolders.length; i++) {

        try {
            folder = this._store._root + '/' + mojitFolders[i];
            dir = libfs.readdirSync(folder).filter(filter_function);
            //add the mojit and his path.
            for (j = 0; j < dir.length; j++) {
                mojit = dir[j];
                if(mojit !== 'DaliProxy' && mojit !== 'HTMLFrameMojit' && mojit !== 'LazyLoad'){
                    mojits[dir[j]] = folder + '/' + dir[j];
                }
            }

        } catch (error) {
            this._debug('_getMojits' + error);
        }

    }//folders
    return mojits;
};

/**
*
* Returns a JSON Object with the shaker configuration.
* The shaker config name is given in the ShakerCore.SHAKER_CONFIG_NAME global variable.
* @method _getMojitConfig
* @param {String} The name of the mojit.
* @param {String} The path of the mojit.
* @private
* @return {Object || undefined} Return an object with the shaker configuration.
*                               If doesnt exist it returns undefined
*
**/

ShakerCore.prototype._getMojitShakerConfig = function (name, path) {
    try {
        return util.readConfigFile(path + '/' + ShakerCore.SHAKER_CONFIG_NAME);
    } catch (error) {
        this._debug('_getMojitShakerConfig:' + name + ' | ' + error);
    }
};

/**
* Take two Objects of any deep, And recursively iterate over them and concatenate the files at all child levels.
* This function defines child  as an object with an array attribute called "files".
* If the dimensions in both objects didn't match at any point the function will simply ignore them.
*
* @method _mergeConcatDimensions
* @param {Object} Object where the files are going to be concatenated..
* @param {Object} Object where the dimensions are being copied.
*
* @protected
* @return {Object} The source object will the matched dimensions files concatenated.
**/

ShakerCore.prototype._mergeConcatDimensions = function (source, giver) {
    var i;
    if (giver.files) {//is child
        source.files = source.files ? source.files.concat(giver.files) : giver.files;
    } else {
        for (i in giver) {
            source[i] = source[i] || {};
            this._mergeConcatDimensions(source[i], giver[i]);
        }
    }
    return source;
};

/**
* Takes a complete list of resources, filters it by the included folders and add the files on top of that.
*
* @method _includeResources
* @param string[] List of files and folders to include
* @param string[] List of resources
* @param string AbsolutePath where the app is running.
*
* @private
* @return string[] The list of the resources to include
**/

ShakerCore.prototype._includeResources = function (includes, resources, absolutePath) {
    var j, filePath, folders = includes.filter(function (i) {return libpath.extname(i) === ""; }),
        files = includes.filter(function (i) {return libpath.extname(i) !== ""; }),
        //take all resources that are contained in the given folders
        filtered = resources.filter(function (item) {
            for (j = 0; j < folders.length; j++) {
                if (item.indexOf(folders[j]) !== -1) {
                    return true;
                }
            }

            return false;
        });
    //include individual files if exists if FS
    for (j = 0; j < files.length; j++) {
        filePath = absolutePath + files[j];
        if (libpath.existsSync(filePath)) {
            filtered.push(filePath);
        }
    }

    return filtered;
};

/**
* Takes a complete list of resources, filters it by the exluded folders and files given.
*
* @method _excludeResources
* @param string[] List of files and folders to exclude
* @param string[] List of resources
* @param string AbsolutePath where the app is running.
*
* @private
* @return string[] The list of the resources to exclude
**/
ShakerCore.prototype._excludeResources = function (excludes, resources, absPath) {
    var i, fullItem, filtered = resources.filter(function (item) {
        for (i = 0; i < excludes.length; i++) {
            fullItem = absPath + excludes[i];
            //console.log('REM:' + fullItem);
            if (item.indexOf(fullItem) !== -1) {
                return false;
            }
        }
        return true;
    });

    return filtered;
};

//TODO
ShakerCore.prototype._replaceResources = function (replaces, resources) {
    console.log('TODO: ' + replaces, resources);
};

/**
* Try to match the default dimensions with the assets folder tree.
* If founds the matching dimension-folder, It generates all children associated for that dimension.
* @method _matchDefaultDmensions
* @param {string} Assets folder where to look for the dimension-assets structure.
* @protected
* @return {Object} The dimensions matched agains the assets whith all the children.
*An empty object is returned if nothing matches.
*
**/
ShakerCore.prototype._matchDefaultDimensions = function (assetspath) {
    var dim, list, folder,
        dimensions = util.simpleClone(ShakerCore.SHAKER_DEFAULT_DIM_CONFIG), //get the default dimensions
        filter_function = function (i) {
            return i.charAt(0) !== '.' && libpath.extname(i) === '';
        },
        createEmptyDim = function (dimensions, list, dim) {
            list.forEach(function (child) {
                dimensions[dim][child] = {};
            });
        };

    for (dim in dimensions) {
        folder = assetspath + '/' + dim;
        //if the default folder exists obtain the children
        if (libpath.existsSync(folder)) {
            if (dim !== 'common') {
                list = libfs.readdirSync(folder);
                //Take the folders (filter the '.' and the files)
                list = list.filter(filter_function);
                //we add each children to the config
                createEmptyDim(dimensions, list, dim);
            }
        //if doesnt exists delete that dimension
        } else {
            //console.log('DELETE: ' + dim);
            delete dimensions[dim];
        }
    }
    return dimensions;
};

/*
* Merge the default configuration (defined on the top) with the ShakerCore.json file if founded.
* @method _mergeShakerConfig
* @param {string} the name of the mojit
* @param {string} the path of the mojit (relative to the app level)
* @param {Object} an object with the binder files
* @private
*/

ShakerCore.prototype._mergeShakerConfig = function (name, path, binders) {
    var i, default_config, shaker_config = this._getMojitShakerConfig(name, path) || {},//get ShakerCore.json
        default_dim = this._matchDefaultDimensions(path + '/assets'),
        default_actions = util.simpleClone(ShakerCore.SHAKER_DEFAULT_ACTION_CONFIG);//default '*' action

    for (i in binders) {
        default_actions[libpath.basename(binders[i], '.js')] = {};
    }

    default_config = {dimensions: default_dim, actions: default_actions};

    return util.mergeRecursive(default_config, shaker_config);
};

/*
* Takes a YUI Module file and returns it's name,version,path and dependencies.
* @method _precalcModule
* @param {string} the file path of the js
* @param {Object} an object with the resources (assets files)
* @private
*/

ShakerCore.prototype._preCalcModule = function (filePath) {
    var file = libfs.readFileSync(filePath, 'utf8'),
        ctx = {
            console: {log: function () {}},
            window: {},
            document: {},
            YUI: {
                add: function (name, fn, version, meta) {
                    this.m = {
                        name: name,
                        path: filePath,
                        version: version,
                        meta: meta || {}
                    };
                }
            }
        };

    try {
        libvm.runInNewContext(file, ctx, filePath);
        return ctx.YUI.m;
    } catch (e) {
        if (e.stack.indexOf('SyntaxError:') === 0) {
            console.log('Syntax Error!');
            console.log('Some error occurred!');
        }
    }
};

/*
* Iterate over the autoloads and generates an object with all the YUI modules info and dependencies
* It relies on _preCalcModule.
* @method _precalculateAutoloads
* @params {array[strings]} list of autoload files
* @protected
*/

ShakerCore.prototype._precalculateAutoloads = function (autoloads) {
    autoloads = autoloads || {};

    var i, m, modules = {};

    for (i in autoloads) {
        m = this._preCalcModule(autoloads[i], modules);
        modules[m.name] = m;
    }

    return modules;
};

/*
* Filter the resources from a specific set of folders and files.
* For each item in resources we check if belongs to any folder, and then we add the rest of the files given.
* @method _filterResources
* @params {Object} A list of patterns (folders and files) to apply agains the resources to gerete the final list per dimension.
* @params {array[strings]} The list of all the assets.
* @params {string} The path to the mojit relative to the app level
* @protected
*/

ShakerCore.prototype._filterResources = function (patterns, resources, mojitPath) {
    var filenames = [], i, assetspath, included, afterExclude;

    for (i in resources) {
        filenames.push(resources[i]);
    }

    assetspath = mojitPath + '/assets/';
    included = this._includeResources(patterns.include, filenames, assetspath);
    afterExclude = this._excludeResources(patterns.exclude, included, assetspath);

    return afterExclude;
};


/*
* Iterates recursively over the dimensions object and matches the resources files per dimension.
* By default the shaker_dimensions will follow the folder structure and add whatever is in include/exlude
* Sample shaker_dimensions param:
*   {
*       "common":{},
*       ...
*       "region": {
*           "US": {
*               "include":["myregion/US","other/stuff.css"],
*            },
*           "CA":{}
*       },
*       ...
*   }
*
* @method _generateRecursiveShakerDimensions
* @params {Object} An object containing the set of dimensions within the folder and files to include/exclude
* @params {string[]} The list of all the resources
* @params {string} The path to the mojit relative to the app level
* @params {string} Internal use for recursion (additive path for the folder structure default)
* @protected
*/

ShakerCore.prototype._generateRecursiveShakerDimensions = function (shaker_dimensions, resources, mojitPath, prefix) {
    prefix = prefix || 'assets';

    var i, dim, res = {}, children = 0, patterns;

    for (i in (dim = shaker_dimensions)) {
        if (i !== "include" && i !== "exclude" && i !== "replace") {
            children++;
            res[i] = this._generateRecursiveShakerDimensions(dim[i], resources, mojitPath, prefix + '/' + i);
        }
    }

    if (!children) {
        patterns = {
            include : shaker_dimensions.include ? shaker_dimensions.include.concat([prefix]) : [prefix],
            exclude : shaker_dimensions.exclude || [],
            replace : shaker_dimensions.replace || []
        };
        res.files = this._filterResources(patterns, resources, mojitPath);
    }

    return res;
};

/*
* Set the action dimension separately and then calls generateRecurisveShakerDimensions for all the other dimensions.
* @method _generateShakerDimensions
* @params string Absolute path to the mojit
* @params {Object} The shaker dimensions configuration
* @params {string[]} List of resources
* @private
*/

ShakerCore.prototype._generateShakerDimensions = function (path, shaker_cfg, resources) {
    var action, dimensions = shaker_cfg.dimensions;
    dimensions.action = dimensions.action || {};

    for (action in shaker_cfg.actions) {
        dimensions.action[action] = {include: shaker_cfg.actions[action].include || [path + '/assets/action/' + action]  };
    }

    return this._generateRecursiveShakerDimensions(dimensions, resources, path);
};

/*
* Calculate the dependencies for a give module name
* @method _recursiveModuleCalculation
* @params {string} Module name
* @params {Object} An object with the name of the modules as key, and the path as value.
* @private
*/

ShakerCore.prototype._recursiveModuleCalculation = function (item, modules, calculatedDependencies) {
    calculatedDependencies = calculatedDependencies || {};
    var dependencies = [], req, i;

    if (modules[item]) {
        req = modules[item].meta.requires;
        for (i in req) {
            if (modules[req[i]] && !calculatedDependencies[req[i]]) {
                calculatedDependencies[req[i]] = true;
                dependencies = dependencies.concat(this._recursiveModuleCalculation(req[i], modules, calculatedDependencies));
                dependencies.push(req[i]);
            }
        }
    }

    return dependencies;
};

/*
* Calculate dependencies for a given binder
* @method _calculateBinderDependencies
* @params {string} Action being processed
* @params {string} The absolute path of the binder to analyze
* @params {Object} An object with the name of the modules as key, and the path as value.
* @private
*/

ShakerCore.prototype._calculateBinderDependencies = function (action, filePath, modules) {
    action = action || 'index';
    var i, dependencies = [], pathDeps = [],
        temp = this._preCalcModule(filePath); //Check: req = temp.meta.requires;
    modules[temp.name] = temp;
    dependencies = this._recursiveModuleCalculation(temp.name, modules);
    for (i in dependencies) {
        pathDeps.push(modules[dependencies[i]].path);
    }

    return pathDeps;
};

/*
* Given a left dimension, augment it with all the right dimensions recursively
* @method _augmentDimensionRecursive
* @params {string} Name of the left dimension, can be simple(Ej: common), or complex (common-US)
* @params {string} Name of the right dimension
* @params {Object} The dimension to be augmented, the object has this format: {files:[]}
* @params {Object} An object containing the child specific right dimensions: {US:{files:[]},CA:{files:[]}}
* @params {Object} Private argument for the recursive iteration.
* @private
*/

ShakerCore.prototype._augmentDimensionRecursive = function (left, right, origin, dimensions, nested) {
    var item, cfg = {};

    if (dimensions.files) {
        cfg.files = origin.files.concat(dimensions.files);
        return cfg;
    }

    for (item in dimensions) {
        if (!dimensions[item].nested) {
            cfg[left + '-' + item] = this._augmentDimensionRecursive(left, right, origin, dimensions[item], nested);
        }
    }

    return cfg;
};

/*
* Iterate over the left dimensions, augment it with all the right dimensions recursively
* @method _mergeDimensionsRecursive
* @params {string} Name of the left dimension to calculate (Ex: common-US-en)
* @params {string} Name of the right dimension to calculate (Ex: common-US-en)
* @params {Object} Left dimensions to get augmented
* @params {Object} Right dimensions to augment the left.
* @private
*/

ShakerCore.prototype._mergeDimensionsRecursive = function (nameLeft, nameRight, origin, dest) {
    var i, cfg = {};

    if (origin.files) {
        return this._augmentDimensionRecursive(nameLeft, nameRight, origin, dest);
    }

    for (i in origin) {
        cfg[i] = this._mergeDimensionsRecursive(i, nameRight, origin[i], dest);
    }

    return cfg;
};

/*
* Given an action a a dimensions object for a mojit, it generates
* @method _dispatchOrder
* @params {string} Name of the action
* @params {string} Name of the selector for the dimensions (Ex: common-action-device-region-lang)
* @params {Object} Dimensions object
* @params {Object} Options optional, nor really need it here.
* @private
*/

ShakerCore.prototype._dispatchOrder = function (action, selector, dimensions, options) {
    options = options || {};
    var leftDim, rightDim, tempDim,
        parts = selector.split('-'),
        computed = 0,
        left = "",
        right = "",
        cache = {};

    if (parts.length === 1) {//single dimension
        return selector === 'action' ? dimensions.action[selector] : dimensions[selector];
    }

    if (parts.length > 1) {
        parts.push('end');//we add that for proper end of the loop.
        left = parts.shift();
        right = parts.shift();

        //we generate the first one
        while (parts.length) {
            rightDim = dimensions[right] || cache[right];
            leftDim = dimensions[left] || cache[left];

            //if left part doesnt exists, we create it empty
            if (!leftDim) {
                dimensions[left] = {files: []};
                leftDim = dimensions[left];
            }
            //if dimension exist we create the same dimension name within the dimension for fallback purposes
            if (rightDim && right !== 'action') {
                dimensions[right][right] = dimensions[right][right] || {files: []};
            }
             //if action is founded then we transform it to the actual value
            if (right === 'action') {
                right = action;
                rightDim = dimensions.action[right].files.length ? dimensions.action[right] : {files: []};
            } else if (left === 'action') {
                left = action;
                rightDim = dimensions.action[left].files.length ? dimensions.action[left] : {files: []};
            }

            if (!computed) {//we compute alone the first dimension
                cache[left] = leftDim;
                computed++;
            }
            //if doesnt exists we create it nesting it
            if (!rightDim) {
                dimensions[right] = {};
                dimensions[right][right] = {files: []};
                rightDim = dimensions[right];
            }

            tempDim =  left + '-' + right;
            cache[tempDim] = this._mergeDimensionsRecursive(left, right, leftDim, rightDim);
            computed++;
            left += "-" + right;

            //go next
            right = parts.shift();
        }
        return cache;
    }
};

/*
* Transform the meta-data from the dispatched function to get a flatten object with the dimensions list map.
* @method _shakeAction
* @params {string} Name of the Mojit
* @params {Object} Object with the meta information generated by the dimension dispatcher
* @params {Object} Internal parameter for recursive calls
*
*/

ShakerCore.prototype._shakeAction = function (name, meta, cache) {
    var item, elm, dim = meta.dimensions;

    cache = cache || {};

    for (item in dim) {
        elm = dim[item];
        meta.dimensions = elm;
        if (elm.files) {
            cache[item] = meta.binder.concat(elm.files);
        } else {
            this._shakeAction(name, meta, cache);
        }
    }

    return cache;
};


/*
* Augments the dimensions matched with the rules provided
* Augment section example under shaker.json:
* {
*    "augments":[
*        {
*            "on": {
*                "region": "US",
*                "lang": "fr"
*            }
*        }
*    ]
* }
*
* @method augmentRules
* @params {Object} Shaker configuration object
* @params {Object} Mojit shaken object with all the calculated dimensions.
* @params {string} Order of the dimensions Ex: common-region-lang
* @params {string} Absolute path for a given mojit
*/

ShakerCore.prototype._augmentRules = function (shaker_cfg, shaken, selector, mojitPath) {
    if (!shaker_cfg.augments) {
        return;
    }

    var rule, discriminants, rollup, disc, value, pos, execRule, fulfill, rollups_dimensions,
        rules = shaker_cfg.augments,
        parts = selector.split('-'),
        absPath = mojitPath + '/assets/';

    for (rule in rules) {
        discriminants = rules[rule].on;
        for (rollup in shaken) {
            rollups_dimensions = rollup.split('-');
            fulfill = true;
            for (disc in discriminants) {
                value = discriminants[disc];
                pos = util.isInList(value, rollups_dimensions);
                //if we dont found it or doesnt match the right dimension we break
                if (pos === -1 || parts[pos] !== disc) {
                    fulfill = false;
                    break;
                }
            }

            //if the rollup fulfill all the discriminants we apply the actions of the rule
            if (fulfill) {
                execRule = rules[rule];
                //ToDO: Only supporting files right now
                //Filter in the store for the actual mojit to be able to include folders.
                if (execRule.include) {
                    execRule.include.push(absPath);
                    shaken[rollup] = this._includeResources(execRule.include, shaken[rollup], absPath);
                }
                if (execRule.exclude) {
                    shaken[rollup] = this._excludeResources(execRule.exclude, shaken[rollup], absPath);
                }
                //TODO: if (execRule.replace) {
            }

        }//rollup

    }//rule
};

/*
* Takes an Object with arrays and concatenates all of them in a single one
* TODO: Bundle Client side regarding the type
* @method _bundleClientSide
* @params {Object} List of arrays
* @params {string} Type of the rollup
*
*/

ShakerCore.prototype._bundleClientSide = function (clientDependencies, type) {
    //TODO: Create the client regarding some type
    type = type || 'full';

    var rollup = [], item, list;

    for (item in clientDependencies) {
        list = clientDependencies[item];
        rollup = rollup.concat(list);
    }

    return util.removeDuplicates(rollup);
};

/*
* Takes the resources for a given mojit, and calculates the client part,
* Which is model, controller, view, binders, and it's dependencies (with common or client affinity of course)
* @method _generateClientSideResources
* @params {string} Mojit name
* @params {Object} Action name
* @params {string} List of resources for that mojit
* @params {Object} Calculated modules dependencies (mapped name of the autoload with the url of the file).
*
*/

ShakerCore.prototype._generateClientSideResources = function (mojit, action, resources, appResources) {
    mojit = mojit || {};

    var i, fileparts, modules, mergedModules,
        models = resources.models,
        appModels = appResources.models,
        mergedModels = util.simpleMerge(models,appModels),
        autoload = resources.autoload,
        appAutoload = appResources.autoload,
        mergedAutoload = util.simpleMerge(autoload,appAutoload),
        views = resources.views,
        binders = resources.binders,
        controllerFile = resources.controller,
        controller_affinity = libpath.basename(controllerFile).split('.', 2)[1],
        clientDependencies = {controllers: [], dependencies: [], binders: [], views: []};

        mergedModules = util.simpleMerge(util.simpleMerge(mergedModels,mergedAutoload));
        for(i in mergedModules){
            if(libpath.basename(mergedModules[i]).split('.')[1] === 'server'){
                delete mergedModules[i];
            }
        }
        modules = this._precalculateAutoloads(mergedModules);

    if (action === '*') {
        return clientDependencies;
    }

    if (controller_affinity !== 'server') {
        clientDependencies.controllers.push(controllerFile);
        clientDependencies.dependencies = clientDependencies.dependencies.concat(this._calculateBinderDependencies(action,controllerFile,modules));
    }

    for (i in views) {
        fileparts = libpath.basename(views[i]).split('.', 3);
        //WE PUT ONLY ONE VIEW 
        if(fileparts[0] === action){
            clientDependencies.views.push(views[i]);
        }
    }

    for (i in binders) {
        fileparts = fileparts = libpath.basename(binders[i]).split('.');
        if (action === fileparts[0]) {
            clientDependencies.binders.push(binders[i]);
            clientDependencies.dependencies = clientDependencies.dependencies.concat(this._calculateBinderDependencies(action, binders[i], modules));
        }
    }
    clientDependencies.dependencies = util.removeDuplicates(clientDependencies.dependencies);
    return clientDependencies;
};

/*
* Main function of core, Basically it's a "facade" function which calls all the other function to get the mojit "Shaken"
* Which is model, controller, view, binders, and it's dependencies (with common or client affinity of course)
* @method _shakeMojit
* @params {string} Mojit name
* @params {Object} Mojit path
* @params {Object} The valid keys are: app (indicates that is app level)
*
*/

ShakerCore.prototype._shakeMojit = function (name, path, options) {
    options = options || {};
    options.order = options.order || ShakerCore.SHAKER_DEFAULT_ORDER;
    var actions, action, clientSideDependencies, dispatched, meta, listFiles,
        shaked = {},
        self = this,
        resources = options.app ? self._resources.app : self._resources.mojits[name],
        shaker_config = self._mergeShakerConfig(name, path, resources.binders),//we get the final merged shaker config
        dimensions = self._generateShakerDimensions(path, shaker_config, resources.assets, path),//files per dimension filtering
        order = options.order;
    for (action in (actions = shaker_config.actions)) {
        clientSideDependencies = options.app ? {} : self._generateClientSideResources(name, action, resources,self._resources.app);
        dispatched = self._dispatchOrder(action, order, dimensions);
        meta = {binder: [], dimensions: dispatched};
        listFiles = self._shakeAction(action, meta);
        self._augmentRules(shaker_config, listFiles, order, path);
        shaked[action] = {
            shaken: listFiles,
            client: self._bundleClientSide(clientSideDependencies),
            meta: {
                dimensions: dimensions,
                client: clientSideDependencies
            }
        };
    }

    return shaked;
};

/*
* This function is a wrapper for _shakeMojit
* We just set the options params to app, and call _shakeMojit
* @method _shakeApp
* @params {string} App name
* @params {Object} App path
* @params {Object} The valid keys are: app (indicates that is app level)
*
*/

ShakerCore.prototype._shakeApp = function (name, path, options) {
    name = name || 'app';//ToDO: this will work for logging purposes.
    options = options || {};
    options.app = true;
    return this._shakeMojit('app', path.slice(0, -1), options);
};

/*
* Generates all the meta-data for all mojits
* @method _shakeAllMojits
* @params {Object} List of mojits to load. Key are names and values are the absolute paths for the mojits
* @params {Object} Options to pass within the function.
*
*/

ShakerCore.prototype._shakeAllMojits = function (mojits, options) {
    var mojit, shaken = {};

    for (mojit in mojits) {
        shaken[mojit] = this._shakeMojit(mojit, mojits[mojit], options);
    }

    return shaken;
};

/*
* Removes all unnecessary meta-data
* @method cleanup
* @params {Object} Shaken meta-data
* @private
*/

ShakerCore.prototype._cleanUp = function (shaken) {
    var mojit, mojits, action, actions;

    for (mojit in (mojits = shaken.mojits)) {
        for (action in (actions = mojits[mojit])) {
            //delete actions[action].meta.dimensions;
            delete actions[action].meta;
        }
    }

    for (action in (actions = shaken.app)) {
        //delete actions[action].meta.dimensions;
        delete actions[action].meta;
    }
};

/*
* Bundle together mojits specified in the shaker.json at app level
* @method _bundleMojits
* @params {Object} Shaker metadata
* @params {Object} Options to pass within the function.
*
*/


ShakerCore.prototype._bundleMojits = function (shaken, options) {
    options = options || {};
    options.order = options.order || ShakerCore.SHAKER_DEFAULT_ORDER;

    var app = this._getMojitShakerConfig('app', this._store._root),
        action,
        loadedMojits,
        appDim,
        clientDependencies,
        mojit,
        parts,
        mojitAction,
        mojitName,
        mojitShaken,
        mojitClient,
        mojitDim,
        dispatched,
        meta,
        listFiles,
        i;

    if (!app) {
        return shaken;
    }

    for (action in app.actions) {
        loadedMojits = app.actions[action].mojits;
        appDim = shaken.app[action].meta.dimensions;
        shaken.app[action].mojits = [];
        clientDependencies = {
            controllers: [],
            binders: [],
            dependencies: [],
            views: []
        };

        for (i in loadedMojits) {
            mojit = loadedMojits[i];
            parts = mojit.split('.');
            mojitAction = parts.length > 1 ? parts[1] : '*';
            mojitName = parts[0];
            //we try to get the action given in the bundle array, if not we default to '*'
            mojitShaken = shaken.mojits[mojitName][mojitAction] || shaken.mojits[mojitName]['*'];
            mojitClient = mojitShaken.meta.client;
            mojitDim = mojitShaken.meta.dimensions;

            mojitDim.action[action] = mojitDim.action[mojitAction] || {files: []};
            shaken.app[action].mojits.push(parts[0]);

            // TODO: Refactor this, and also check the condition of binder.length!
            if(mojitClient.binders.length){
                clientDependencies.controllers = clientDependencies.controllers.concat(mojitClient.controllers);
                clientDependencies.binders = clientDependencies.binders.concat(mojitClient.binders);
                clientDependencies.dependencies = clientDependencies.dependencies.concat(mojitClient.dependencies);
                clientDependencies.views = clientDependencies.views.concat(mojitClient.views);
            }
                appDim = this._mergeConcatDimensions(appDim, mojitDim);
        }

        dispatched = this._dispatchOrder(action, options.order, appDim);
        meta = {binder: [], dimensions: dispatched};
        listFiles = this._shakeAction(action, meta);

        shaken.app[action].shaken = listFiles;
        shaken.app[action].client = this._bundleClientSide(clientDependencies);
        shaken.app[action].meta.client = clientDependencies;

    }//action

    return shaken;
};

ShakerCore.prototype._buildResources = function (ignore_dir) {
    var urls = this._store._staticURLs,
        filtered = {},
        url;

    // Remove any ignored directories from store
    if (ignore_dir) {
        for (url in urls) {
            if (urls[url].indexOf(this._store._root + '/' + ignore_dir) < 0) {
                filtered[url] = urls[url];
            }
        }
        urls = filtered;
    }

    // Map files to URLs so compiler doesn't have to recreate URLs.
    this._files = {};
    for (url in urls) {
        this._files[urls[url]] = url;
    }

    this._resources = this._mojitResources(urls);
};

/*
 * Look through Mojito store for mojit assets to roll up.
 */
ShakerCore.prototype._mojitResources = function (urls) {
    var url, filename, content_type, type, base, split, mojit,
        resources = {
            'mojits': {},
            'app': {assets: {}, binders: {}, autoload: {}, models: {}},
            'images': {}
        },
        mojits = this._mojits;
    for(mojit in mojits) {
        if(mojit !== 'DaliProxy' && mojit !== 'HTMLFrameMojit' && mojit !== 'LazyLoad'){
            resources.mojits[mojit] = {assets: {}, binders: {}, autoload: {}, views: {}, models: {}};
        }
    }

    for (url in urls) {
        filename = urls[url];
        content_type = mime.lookup(filename);
        type = content_type.split('/')[0];

        if (content_type in {'application/javascript': 1, 'text/css': 1, 'text/html': 1}) {
            base = url.substring(this._prefix.length + 1);
            split = base.split('/', 2); // [mojit_name, subdir]
            if (split[0] === this._root) {
                if (split[1] in resources.app) {
                    resources.app[split[1]][url] = filename;
                }
            } else if (split[0] in resources.mojits) { // mojit
                if (split[1].indexOf('controller.') === 0) {
                    resources.mojits[split[0]].controller = filename;

                } else if (split[1] in resources.mojits[split[0]]) {  // asset type
                    resources.mojits[split[0]][split[1]][url] = filename;
                }
            }
        } else if (type === 'image') {
            resources.images[url] = filename;
        }
    }
    return resources;
};

ShakerCore.prototype._shakeImages = function (resources) {
    var image, images = [];

    for (image in resources.images) {
        images.push(resources.images[image]);
    }

    return images;
};

ShakerCore.prototype._shakeCore = function (resources) {
    var core, autoload, files = this._store.getRollupsApp('client', {}).srcs,
        shakerFrameMojit = resources.mojits[ShakerCore.SHAKER_MOJIT_FRAME] || {};
    // Skip the app level files (Note: to override path: substr(this._root.length + 1);)
    
    core = files.filter(function (file) {
        return (file.indexOf('/mojito/lib/app/') !== -1);
    }, this);
    for (autoload in shakerFrameMojit.autoload) {
        core.push(shakerFrameMojit.autoload[autoload]);
    }

    return core;
};

ShakerCore.prototype._getAppConfig = function () {
    var cfg = this._app || {};
    cfg.order = ShakerCore.SHAKER_DEFAULT_ORDER;
    return cfg;
};

/*
 * Public Interface
 */

ShakerCore.prototype.getConfig = function() {
    this._app = this._store.getAppConfig(null, 'application') || {};
    this._app = util.isEmpty(this._app) ? this._store.getAppConfig({}, 'definition') : this._app;
    return this._app.shaker || {};
};

// Static prefix for assets generated
ShakerCore.prototype.getStaticRoot = function() {
    return this._prefix + '/' + this._root + '/';
};

// Base dir of app
ShakerCore.prototype.getAppRoot = function() {
    return this._store._root;
};

// Get URL corresponding to filename
ShakerCore.prototype.getURL = function(filename) {
    return this._files[filename];
};

// App resources
ShakerCore.prototype.getFiles = function() {
    return this._files;
};

ShakerCore.prototype.run = function (options) {
    options = options || {};
    var mojits = this._mojits = this._getMojits(),
        shaken = {};

    this._buildResources(options.ignore_dir),

    shaken.mojits = this._shakeAllMojits(mojits);
    shaken.app = this._shakeApp('app', this._store._root + '/');
    shaken.core = this._shakeCore(this._resources);
    shaken.images = this._shakeImages(this._resources);
    shaken = this._bundleMojits(shaken);
    shaken.config = this._getAppConfig();
    this._cleanUp(shaken);

    return shaken;
};

module.exports.ShakerCore = ShakerCore;
module.exports.logger = logger;
