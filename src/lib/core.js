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
var APP_CONFIG_FILE = 'application.json', //app config file
    SHAKER_CONFIG_NAME = 'shaker.json',
    //DEFAULT TEMPLATE SHAKER CONFIG
    SHAKER_DEFAULT_DIM_CONFIG = {
        common: {},
        action: {},
        device: {},
        skin: {},
        region: {},
        lang: {}
    },
    SHAKER_DEFAULT_ACTION_CONFIG = {
        '*': {order: 'common-action-device-skin-region-lang' }
    };

/* SHAKER OBJECT DEFINITION */

var Shaker = function (config){
    config = config || {};
    this._APP_ROOT = config.root || './'; //ROOT APP FOLDER
    this._debugging = false;
};

Shaker.prototype.constructor = Shaker;

//DEBUG TO VISUALIZE JSON OBJECTS ToDo: Remove?
Shaker.prototype.__debug = function(jsonobj,external,verbose){var obj = jsonobj || {nothing: 'nothing'};verbose && console.log(jsonobj);var js = 'var FUSE_OUTPUT=\'' + JSON.stringify(obj)+'\';';if(external)libfs.writeFile('shaker/debug/fuse/output.js',js,function(err){if(err){console.log(err)}});};

Shaker.prototype._log = function(f,err){this._debugging && console.log(f + ': ' + err)}

/*------------------------------------------*/
/**
*
* Gets the Mojito application.json configuration.
* The path from where the file is looked depends on:
*       The path defined in the constructor as APP_ROOT (which points to the app level root regarding the proccess execution)
*       The name of the file defined in the global APP_CONFIG_FILE
*
* @method _getAppConfig
* @private
* @return {Object} Return the parse JSON Object of application.json. If fails finding it returns null.
**/
Shaker.prototype._getAppConfig = function(){
    var file =  this._APP_ROOT + APP_CONFIG_FILE;
    try{
        return JSON.parse(libfs.readFileSync(file));
        
    }catch(error){
        this._log('_getAppConfig' + error);
        
    }
};

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
            var folder = this._APP_ROOT + mojitFolders[i],
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
* This function takes a path (relative to the app level) and generates a list of files within that path.
* By default option recursive is set to true. If you want files per level, change it to false
*
* @method _walkResources
* @param {String} Directory path (Relative to where the path the application is being executed).
* @param {function} Callback when finish
* @param {Object} Options to pass to the function:
*                 If recursive is true, it will return a list of all the files.
*                 If false it will return the files by level.
* @protected
* @return {string[]|| Object} Will return all the files within a given path.
**/

Shaker.prototype._walkResources = function(dir, done,options) {
    options = options || {recursive: true};
    var results = options.recursive ? [] : {files:[]},self = this;
    libfs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);//empty
        list.forEach(function(file) {
            var fpath = dir + '/' + file;
            if(file.charAt(0) == "."){//filter hidden files and folders
                if (!--pending) done(null, results);return;
            }
            libfs.stat(fpath, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    self._walkResources(fpath, function(err, res) {
                        if(options.recursive){
                            results = results.concat(res);
                        }else{
                            results[libpath.basename(fpath)] = res;
                        }
                        if (!--pending) done(null, results);
                    },options);
                }else{//is a file
                    if(util.isInList(libpath.extname(file),['.js','.css']) >= 0){//filter by extension ToDo: add option
                        if(options.recursive){
                            results.push(fpath);
                        }else{
                            results.files.push(fpath);
                        }
                    }
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};

/**
* Returns all the assets (js and css) from specific paths.
* It takes an object where the key is a string for identify the resources type;
* and the value is the path associated (relative to the app level).
*
* @method _loadMojitResources
* @param {Object} Resources bundle where key is an abstract name and value the path asociated to that.
* @param {function} Callback function to execute when we have al the results back.
* @protected
* @return {Object} Containing an array with the assets founded for the particular folder asocciated by the resource key
*
**/

Shaker.prototype._loadMojitResources = function(resourcesPath,callback){
    var pending = 0,
        resources = {},
        self = this,
        walking = function(res){
            self._walkResources(path,function(e,adata){
                resources[res] = adata;
                if(!--pending) callback(resources);
            });
        };
    for(var res in resourcesPath){
        var path = resourcesPath[res];
        pending++;
        walking(res);
    }
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
            delete dimensions[dim];
        }
    }
    return dimensions;
};

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


Shaker.prototype.precalculateAutoloads = function(autoloads){
    var appPath = process.cwd()+ '/',modules = {};
    for(var i = 0; i<autoloads.length; i++){
        var m = this.preCalcModule(autoloads[i],modules);
        modules[m.name] = m;
    }
    return modules;
};

Shaker.prototype.filterResources = function(list,resources){
    var folders = list.filter(function(i){return libpath.extname(i) === "";}),
        files = list.filter(function(i){return libpath.extname(i) !== "";}),
        filtered = resources.filter(function(item){
            for(var j=0;j<folders.length;j++){
                if(item.indexOf(folders[j]) !== -1){
                    return true;
                }
            }
            return false;
        });
        return filtered.concat(files);
};

Shaker.prototype.generateRecursiveShakerDimensions = function(shaker_dimensions,resources,prefix){
    prefix = prefix || 'assets';
    var dim,res = {},children = 0;
    for(var i in (dim = shaker_dimensions)){
        if(i == "include" || i == "exclude" || i == "replace") {
            continue;
        }
        children++;
        res[i] = this.generateRecursiveShakerDimensions(dim[i],resources,prefix + '/' +i);
    }
    if(!children) {
        res.files = this.filterResources(shaker_dimensions.include || [prefix],resources);
    }
    return res;
};

Shaker.prototype.generateShakerDimensions = function(path,shaker_cfg,resources){
    var dimensions = shaker_cfg.dimensions;
    for(var action in shaker_cfg.actions){
        dimensions.action[action] = {include: shaker_cfg.actions[action].include || [path+'/assets/action/'+action]  };
    }
    return this.generateRecursiveShakerDimensions(dimensions,resources);
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

Shaker.prototype.dispatchOrder = function(action,selector,dimensions){
    var parts = selector.split('-'),
        left = "",
        right = "",
        cache = {};
        
    if(parts.length == 1){//single dimension
        return selector == 'action' ? dimensions.action[selector] : dimensions[selector];
    }
    
    if(parts.length > 1){
        parts.push('end');//we add that for proper end of the loop.
        left = parts.shift();
        right = parts.shift();
        
        while(parts.length){
            var rightDim = dimensions[right] || cache[right],
                leftDim = dimensions[left] || cache[left];
            //if left part didnt exists, then we skip it
            if(!leftDim){
                left = right;
                right = parts.shift();
                continue;
            }
             //if action is founded then we transform it to the actual value
            if(right == 'action'){
                right = action;
                rightDim = dimensions.action[right];
            }else if(left == 'action'){
                left = action;
                leftDim = dimensions.action[left];
            }
            //if rightDim is founded we compute it if not we skip it
            if(rightDim){
                cache[left+'-'+right] = this.mergeDimensionsRecursive(left,right,leftDim,rightDim);
                left+= "-"+ right;
            }
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

Shaker.prototype.shakeMojit = function(name,path,callback,options){
    var self = this,
        resourcesPath = {assets: path+'/assets',
                         autoload: path+'/autoload',
                         binders: path+'/binders'
        };
        
    this._loadMojitResources(resourcesPath,function(resources){
        var shaker_config = self._mergeShakerConfig(name,path,resources),//we get the final merged shaker config
            modules = self.precalculateAutoloads(resources.autoload),
            dimensions = self.generateShakerDimensions(path,shaker_config,resources.assets),//files per dimension filtering
            actions,
            default_order = shaker_config.actions['*'].order,
            shaked = {};
            
         for(var action in (actions = shaker_config.actions)){
            if(action == '*') continue;
            var order = actions[action].order || default_order,
                binder_dependencies = self.calculateBinderDependencies(action,path+'/binders/'+ action + '.js',modules),
                dispatched = self.dispatchOrder(action,order,dimensions),
                meta = {binder: binder_dependencies,dimensions: dispatched},
                listFiles = self.shakeAction(action,meta),
                selectors = [];
                for(var i in dispatched) selectors.push(i);
                shaked[action] = {
                    shaken: listFiles,
                    meta:{
                        selectors:selectors,
                        binder: binder_dependencies
                    }
                };
         }
         callback(shaked);

    });
};

module.exports.Shaker = Shaker;