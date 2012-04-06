/*
* SHAKER!
* ToDo: Metadata here!
*/

/*Libraries*/
var libpath = require('path'),
    libvm = require('vm'),
    libfs = require('fs'),
    util = require('./utils.js');

/*GLOBAL CONFIGS*/
var SHAKER_CONFIG_NAME = 'shaker.json',
    //DEFAULT TEMPLATE SHAKER CONFIG
    SHAKER_DEFAULT_DIM_CONFIG = {
        common: {},
        action: {},
        device: {},
        skin: {},
        region: {},
        lang: {}
    },
    SHAKER_DEFAULT_ORDER = 'common-action-device-skin-region-lang',
    SHAKER_DEFAULT_ACTION_CONFIG = {
        '*': {order: SHAKER_DEFAULT_ORDER }
    };

/* SHAKER OBJECT DEFINITION */

var Shaker = function (config){
    config = config || {};
    this._store = config.store;
    this._debugging = false;
};

Shaker.prototype.constructor = Shaker;

/* LOGGING FUNCTION */
Shaker.prototype._log = function(f,err){if(this._debugging){console.log(f + ': ' + err);} };

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

Shaker.prototype._getMojits = function(app_config){
    var mojitFolders = (app_config && app_config[0].mojitDirs) || ['mojits'],
        mojits = {},
        filter_function = function(i){
            return i.charAt(0) !== '.'; //remove non-folder items
        };
        for(var i = 0; i<mojitFolders.length; i++){
        try{
            var folder = this._store._root + '/' + mojitFolders[i],
                dir = libfs.readdirSync(folder).filter(filter_function);
            //add the mojit and his path.
            for(var j = 0; j < dir.length; j++){
                mojits[dir[j]] = folder +'/'+ dir[j];
            }
        }catch(error){
            this._log('_getMojits' + error);
        }
    }//folders
    return mojits;
};

/**
*
* Returns a JSON Object with the shaker configuration.
* The shaker config name is given in the SHAKER_CONFIG_NAME global variable.
* @method _getMojitConfig
* @param {String} The name of the mojit.
* @param {String} The path of the mojit.
* @private
* @return {Object || undefined} Return an object with the shaker configuration.
*                               If doesnt exist it returns undefined
*
**/

Shaker.prototype._getMojitShakerConfig = function(name,path){
   try{
        return util.readConfigFile(path +'/'+SHAKER_CONFIG_NAME);
        
    }catch(error){
        this._log('_getMojitShakerConfig',error);
    }
};

/**
* Take two Objects of any deep, And recursively iterate over them and concatenate the files at all child levels.
* This function defines child  as an object with an array attribute called "files".
* If the dimensions in both objects didn't match at any point the function will simply ignore them.
*
* @method mergeConcatDimensions
* @param {Object} Object where the files are going to be concatenated..
* @param {Object} Object where the dimensions are being copied.
*
* @protected
* @return {Object} The source object will the matched dimensions files concatenated.
**/

Shaker.prototype.mergeConcatDimensions = function(source,giver){
    if(giver.files){//is child
        source.files = source.files ? source.files.concat(giver.files) : giver.files;
    }else{
        for(var i in giver){
            source[i] = source[i] || {};
            this.mergeConcatDimensions(source[i],giver[i]);
        }
    }
    return source;
};

Shaker.prototype.includeResources = function(includes,resources,absolutePath){
var folders = includes.filter(function(i){return libpath.extname(i) === "";}),
        files = includes.filter(function(i){return libpath.extname(i) !== "";}),
        //take all resources that are contained in the given folders
        filtered = resources.filter(function(item){
            for(var j = 0;j < folders.length; j++){
                if(item.indexOf(folders[j]) !== -1){
                    return true;
                }
            }
            return false;
        });
        //include individual files if exists if FS
        for(j=0; j<files.length; j++){
            var filePath = absolutePath + files[j];
            if(libpath.existsSync(filePath)){
                filtered.push(filePath);
            }
        }
        return filtered;
};

Shaker.prototype.excludeResources = function(excludes,resources, absPath){
    var filtered = resources.filter(function(item){
        for(var i=0; i<excludes.length; i++){
            var fullItem = absPath + excludes[i];
            //console.log('REM:' + fullItem);
            if(item.indexOf(fullItem)!== -1){
                return false;
            }
        }
        return true;
    });
    return filtered;
};

Shaker.prototype.replaceResources = function(replaces, resources){

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

Shaker.prototype._matchDefaultDimensions = function(assetspath){
    var dimensions = util.simpleClone(SHAKER_DEFAULT_DIM_CONFIG), //get the default dimensions
        filter_function = function(i){
            return i.charAt(0) !== '.' && libpath.extname(i) === '';
        },
        iterator = function(child){
            dimensions[dim][child] = {};
        };

    for(var dim in dimensions){
        var folder = assetspath + '/'+ dim,list;
        //if the default folder exists obtain the children
        if(libpath.existsSync(folder)){
            if(dim == 'common') continue;

            list = libfs.readdirSync(folder);
            //Take the folders (filter the '.' and the files)
            list = list.filter(filter_function);
            //we add each children to the config
            list.forEach(iterator);
        //if doesnt exists delete that dimension
        }else{
            //console.log('DELETE: ' + dim);
            delete dimensions[dim];
        }
    }
    return dimensions;
};

/*
* Merge the default configuration (defined on the top) with the shaker.json file if founded.
* @method _mergeShakerConfig
* @param {string} the name of the mojit
* @param {string} the path of the mojit (relative to the app level)
* @param {Object} an object with the resources (assets files)
* @private
*/

Shaker.prototype._mergeShakerConfig = function(name,path,resources){
    var shaker_config = this._getMojitShakerConfig(name,path) || {},//get shaker.json
    default_dim = this._matchDefaultDimensions(path + '/assets'),
    binders = resources.binders, default_config,
    default_actions = util.simpleClone(SHAKER_DEFAULT_ACTION_CONFIG);//default '*' action
    for(var i = 0; i< binders.length;i++){
        default_actions[libpath.basename(binders[i],'.js')] = {};
    }
    default_config = {dimensions: default_dim, actions: default_actions};
    return util.mergeRecursive(default_config,shaker_config);
};

/*
* Takes a YUI Module file and returns it's name,version,path and dependencies.
* @method precalcModule
* @param {string} the file path of the js
* @param {Object} an object with the resources (assets files)
* @private
*/

Shaker.prototype.preCalcModule = function(filePath) {
        var file = libfs.readFileSync(filePath, 'utf8'),
            ctx = {
                console: {log: function() {}},
                window: {},
                document: {},
                YUI: {
                    add: function(name,fn,version,meta) {
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
        }
        catch (e) {
            if (e.stack.indexOf('SyntaxError:') === 0) {
                console.log('Sintax Error!');
            console.log('Some error occurred!');}
        }
};

/*
* Iterate over the autoloads and generates an object with all the YUI modules info and dependencies
* It realies on the preCalcModule.
* @method precalculateAutoloads
* @params {array[strings]} list of autoload files
* @protected
*/
Shaker.prototype.precalculateAutoloads = function(autoloads){
    autoloads = autoloads || [];
    var appPath = process.cwd() + '/',modules = {};
    for(var i = 0; i<autoloads.length; i++){
        var m = this.preCalcModule(autoloads[i],modules);
        modules[m.name] = m;
    }
    return modules;
};

/*
* Filter the resources from a specific set of folders and files.
* For each item in resources we check if belongs to any folder, and then we add the rest of the files given.
* @method filterResources
* @params {Object} A list of patterns (folders and files) to apply agains the resources to gerete the final list per dimension.
* @params {array[strings]} The list of all the assets.
* @params {string} The path to the mojit relative to the app level
* @protected
*/

Shaker.prototype.filterResources = function(patterns,resources,mojitPath){
    var assetspath = mojitPath +'/assets/',
        included = this.includeResources(patterns.include,resources, assetspath),
        afterExclude = this.excludeResources(patterns.exclude,included,assetspath);

   return afterExclude;
};

Shaker.prototype.generateRecursiveShakerDimensions = function(shaker_dimensions,resources,mojitPath,prefix){
    prefix = prefix || 'assets';
    var dim,res = {},children = 0;
    for(var i in (dim = shaker_dimensions)){
        if(i == "include" || i == "exclude" || i == "replace") {
            continue;
        }
        children++;
        res[i] = this.generateRecursiveShakerDimensions(dim[i],resources,mojitPath,prefix + '/' + i);
    }
    if(!children) {
        var patterns = {
                include : shaker_dimensions.include ? shaker_dimensions.include.concat([prefix]) : [prefix],
                exclude : shaker_dimensions.exclude || [],
                replace : shaker_dimensions.replace || []
        };
        res.files = this.filterResources(patterns,resources,mojitPath);
    }
    return res;
};

Shaker.prototype.generateShakerDimensions = function(path,shaker_cfg,resources,mojitPath){
    var dimensions = shaker_cfg.dimensions;
    dimensions.action = dimensions.action || {};
    for(var action in shaker_cfg.actions){
        dimensions.action[action] = {include: shaker_cfg.actions[action].include || [path+'/assets/action/'+action]  };
    }
    return this.generateRecursiveShakerDimensions(dimensions,resources,mojitPath);
};

Shaker.prototype.recursiveModuleCalculation = function(item,modules){
    var dependencies = [];
    if(modules[item]){
        var req = modules[item].meta.requires;
        for(var i in req){
            if(modules[req[i]]){
                dependencies = dependencies.concat(this.recursiveModuleCalculation(req[i],modules));
                dependencies.push(req[i]);
            }
        }
    }
    return dependencies;
};

Shaker.prototype.calculateBinderDependencies = function(action,filePath,modules){
    var dependencies = [],pathDeps = [],
        temp = this.preCalcModule(filePath),
        req = temp.meta.requires;
        modules[temp.name] = temp;
        
        dependencies = this.recursiveModuleCalculation(temp.name,modules);
        for(var i in dependencies){
            pathDeps.push(modules[dependencies[i]].path);
        }
        pathDeps.push(temp.path);
        return pathDeps;
};


Shaker.prototype.augmentDimensionRecursive = function(left,right,origin,dimensions,nested){
    var cfg = {},head;
    if(dimensions.files){
        cfg.files = origin.files.concat(dimensions.files);
        return cfg;
    }
   for(var item in dimensions){
        if(!dimensions[item].nested){
            cfg[left+'-'+item] = this.augmentDimensionRecursive(left,right,origin,dimensions[item],nested);
        }
    }
    return cfg;
};

Shaker.prototype.mergeDimensionsRecursive = function(nameLeft,nameRight,origin,dest){
    var cfg = {};
    if(origin.files){
       return this.augmentDimensionRecursive(nameLeft,nameRight,origin,dest);
    }else{
        for(var i in origin){
            cfg[i] = this.mergeDimensionsRecursive(i,nameRight,origin[i],dest);
        }
    }
    return cfg;
};

Shaker.prototype.dispatchOrder = function(action,selector,dimensions,options){
    options = options || {};
    var parts = selector.split('-'),
        computed = 0,
        left = "",right = "",
        leftDim,rightDim,
        cache = {};
        
    if(parts.length == 1){//single dimension
        return selector == 'action' ? dimensions.action[selector] : dimensions[selector];
    }

    if(parts.length > 1){
        parts.push('end');//we add that for proper end of the loop.
        left = parts.shift();
        right = parts.shift();

        //we generate the first one
        while(parts.length){
            rightDim = dimensions[right] || cache[right];
            leftDim = dimensions[left] || cache[left];

            //if left part doesnt exists, we create it empty
            if(!leftDim){
                dimensions[left] = {files: []};
                leftDim = dimensions[left];
            }
            //if dimension exist we create the same dimension name within the dimension for fallback purposes
            if(rightDim && right!== 'action'){
                dimensions[right][right] = dimensions[right][right] || {files:[]};
            }
             //if action is founded then we transform it to the actual value
            if(right == 'action'){
                right = action;
                rightDim = dimensions.action[right].files.length ? dimensions.action[right] : {files:[]};
            }else if(left == 'action'){
                left = action;
                rightDim = dimensions.action[left].files.length ? dimensions.action[left] : {files:[]};
            }

            if(!computed){//we compute alone the first dimenision
                cache[left] = leftDim;
                computed++;
            }
            //if doesnt exists we create it nesting it
            if(!rightDim){
                    dimensions[right] = {};
                    dimensions[right][right] = {files:[]};
                    rightDim = dimensions[right];
            }

            var tempDim =  left+'-'+right;
            cache[tempDim] = this.mergeDimensionsRecursive(left,right,leftDim,rightDim);
            computed++;
            left+= "-" + right;

            //go next
            right = parts.shift();
        }
        return cache;
    }
};

Shaker.prototype.shakeAction = function (name,meta,cache){
    var dim = meta.dimensions;
    cache = cache || {};
    for(var item in dim){
        var elm = dim[item];meta.dimensions = elm;
        if(elm.files){
            cache[item] = meta.binder.concat(elm.files);
        }else{
            this.shakeAction(name,meta,cache);
        }
    }
    return cache;
};

Shaker.prototype._augmentRules = function(shaker_cfg,shaken,selector,mojitPath){
    if(!shaker_cfg.augments) return;

    var rules = shaker_cfg.augments,
        parts = selector.split('-'),
        absPath = mojitPath + '/assets/';
    for(var rule in rules){
        var discriminants = rules[rule].on;
        for(var rollup in shaken){
            var rollups_dimensions = rollup.split('-'),
            fulfill = true;
            for(var disc in discriminants){
                var value = discriminants[disc],
                    pos = util.isInList(value,rollups_dimensions);
                    //if we dont found it or doesnt match the right dimension we break
                    if(pos === -1 || parts[pos] !== disc){
                        fulfill = false;
                        break;
                    }
            }

            //if the rollup fulfill all the discriminants we apply the actions of the rule
            if(fulfill){
                var execRule = rules[rule];
                //ToDO: Only supporting files right now
                //Filter in the store for the actual mojit to be able to include folders.
                if(execRule.include){
                    execRule.include.push(absPath);
                    shaken[rollup] = this.includeResources(execRule.include,shaken[rollup],absPath);
                }
                if(execRule.exclude){
                    shaken[rollup] = this.excludeResources(execRule.exclude,shaken[rollup],absPath);
                }
                if(execRule.replace){
                    //ToDo!
                }
                //console.log('Augmented: ' + rollup);
                //console.log(shaken[rollup]);
            }
            //console.log('----------------------------------');

        }//rollup

    }//rule
};


Shaker.prototype._orderSelectors = function(a,b){
    var aparts = (a.split('-')).length,
                bparts = (b.split('-')).length;
                if(aparts > bparts) return 1;
                if(aparts < bparts) return -1;
                return 0;
};

Shaker.prototype.cleanSelectors = function(listSelectors){
    var finalList = [];
     while(listSelectors.length){
        var pop = listSelectors.shift(),
            founded = false;
        for(var i = 0; i< listSelectors.length;i++){
            if(listSelectors[i].indexOf(pop) === 0){
                founded = true;
                break;
            }
        }
        if(!founded){
            finalList.push(pop);
        }
    }
    return finalList;
};

Shaker.prototype.mergeSelectors = function(listSelectors){
    var dimensions = util.simpleClone(SHAKER_DEFAULT_DIM_CONFIG),
        finalSelector = [];
        for(var i = 0; i<listSelectors.length; i++){
            var list = listSelectors[i].split('-');
            for(var j = 0; j<list.length; j++){
                    dimensions[list[j]] = true;
            }
        }
        for(i in dimensions){
            if(dimensions[i] === true){
                finalSelector.push(i);
            }
        }
        return finalSelector.join('-');
};

Shaker.prototype.calculateGeneratedSelectors = function(shaken){
    var mojits,action, mojit,actions,selectors = {},mSelectors,listSelectors=[];
        iterator = function(i){
            selectors[i] = true;
        },
        order = this._orderSelectors;
    for(mojit in (mojits = shaken.mojits)){
        for(action in (actions = shaken.mojits[mojit])){
            mSelectors = actions[action].meta.order;
            mSelectors.forEach(iterator);
        }
    }
    for(action in (actions = shaken.app.actions)){
        mSelectors = actions[action].meta.order;
        mSelectors.forEach(iterator);
    }
    for(action in selectors){
        listSelectors.push(action);
    }
    listSelectors.sort(order);
    //we have the orderer list of selectors, but we need to deleted the subselectos: Exm: [common, common-action, common-action-region] => common-action-region
    return this.cleanSelectors(listSelectors);
   
};

Shaker.prototype.shakeMojit = function(name,path,callback,options){
    var self = this,
        resourcesPath = {
            assets: path+'/assets',
            autoload: path+'/autoload',
            binders: path+'/binders'
        };
    //options default
    options = options || {};
    options.order = options.order || SHAKER_DEFAULT_ORDER;

    libfs.readdir('./', function(err, list) {   // FIXME: WTF race condition!
        resources = self._resources[name];

        var shaker_config = self._mergeShakerConfig(name,path,resources),//we get the final merged shaker config
            modules = self.precalculateAutoloads(resources.autoload),
            dimensions = self.generateShakerDimensions(path,shaker_config,resources.assets,path),//files per dimension filtering
            order = options.order,
            actions,shaked = {};
        for(var action in (actions = shaker_config.actions)){
                binder_dependencies = ((action == '*') || options.skipBinders) ? []: self.calculateBinderDependencies(action,path+'/binders/'+ action + '.js',modules),
                dispatched = self.dispatchOrder(action,order,dimensions),
                meta = {binder: binder_dependencies,dimensions: dispatched},
                listFiles = self.shakeAction(action,meta),
                self._augmentRules(shaker_config,listFiles,order,path);
                shaked[action] = {
                    shaken: listFiles,
                    meta:{
                        //selectors : selectors,
                        dimensions: dimensions,
                        dependencies: binder_dependencies
                    }
                };
         }
         callback(shaked);
    });
};

Shaker.prototype.shakeApp = function(name,path,callback,options){
    options = options || {};
    options.skipBinders = true;
    this.shakeMojit('app',path.slice(0,-1),function(appShaken){
        callback(appShaken);
    },options);
};

Shaker.prototype.shakeAllMojits = function(app,mojits,callback,options){
    var self = this,
        shaken = {},
        count = 0,
        wrap = function(mojitName,mojitUrl){
            self.shakeMojit(mojit,mojits[mojit],function(shaked){
            shaken[mojitName] = shaked;
            if(!--count) callback(shaken);
            },options);
        };
    for(var mojit in mojits){
        count++;
        wrap(mojit,mojits[mojit]);
    }
};


Shaker.prototype.bundleMojits = function(shaken,options){
    options = options || {};
    var app = this._getMojitShakerConfig('app',this._store._root),
    dimensions = {};
    options.order = options.order || SHAKER_DEFAULT_ORDER;

    if(!app) return shaken;

    for(var action in app.actions){
        var loadedMojits = app.actions[action].mojits,
            appShake = shaken.app[action].shaken,
            appDim = shaken.app[action].meta.dimensions,
            originalAppShake = util.simpleClone(appShake),
            appDeps = shaken.app[action].meta.dependencies;

        for(var i in loadedMojits){
            var mojit = loadedMojits[i],
                parts = mojit.split('.'),
                mojitAction = parts.length > 1 ? parts[1] : '*',
                mojitName = parts[0];
                mojitShaken = shaken.mojits[mojitName][mojitAction],
                mojitDim = mojitShaken.meta.dimensions;
                mojitDim.action[action] = mojitDim.action[mojitAction] || {files:[]};

            appDim = this.mergeConcatDimensions(appDim,mojitDim);
            appDeps = appDeps.concat(mojitShaken.meta.dependencies);

        }
        var dispatched = this.dispatchOrder(action,options.order,appDim),
            meta = {binder: appDeps,dimensions: dispatched},
            listFiles = this.shakeAction(action,meta);
        shaken.app[action].shaken = listFiles;
        shaken.app[action].mojits = loadedMojits;
    }
    return shaken;
};

Shaker.prototype._mojitResources = function() {
    var mojits = this._store.listAllMojits('server').slice(3); // FIXME: 3

    var resources = {};
    mojits.forEach(function(mojit) {
        resources[mojit] = {assets: [], binders: [], autoload: []};
    });
    resources['app'] = {assets: [], binders: [], autoload: []};

    var exts = {'.js': 1, '.css': 1};

    for (var url in this._store._staticURLs) {
        var base = url.substring('/static/'.length);
        var split = base.split('/', 2);
        var filename = this._store._staticURLs[url];

        if (split[0] == 'shakerdemo') {
            if (split[1] in resources['app']) {
                if (libpath.extname(filename) in exts) {
                    resources['app'][split[1]].push(this._store._staticURLs[url]);
                }
            }
        }

        if (split[0] in resources) { // mojit
            if (split[1] in resources[split[0]]) {  // asset type
                if (libpath.extname(filename) in exts) {
                    resources[split[0]][split[1]].push(this._store._staticURLs[url]);
                }
            }
        }
    }

    return resources;
};

Shaker.prototype.shakeAll = function(callback,options){
    this._resources = this._mojitResources();

    options = options || {};
    var app = this._store.getAppConfig(null, 'definition'),
        mojits = this._getMojits(),
        self = this,
        shaken = {};

    this.shakeAllMojits(app,mojits,function(mojitShaken){
        self.shakeApp('app', self._store._root + '/',function(appshaken){
            shaken.mojits = mojitShaken;
            shaken.app = appshaken;
            shaken = self.bundleMojits(shaken);
            shaken.config = {order: SHAKER_DEFAULT_ORDER};
            callback(shaken);

        },options);
    },options);
};

module.exports.ShakerCore = Shaker;