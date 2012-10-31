/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
 
var path = require('path'),
    fs = require('fs'),
    libutils = require('./utils'),
    gear = require('gear'),
    async = require('async'),
    mkdirp = require('mkdirp'),
    mime = require('mime'),
    ShakerCore = require('./core').ShakerCore,
    //logger = require('./core').logger,
    YUI = require('yui').YUI,
    Y = require('yui').YUI({useSync: true});

//TODO: Move to another file
/**
* Every resource may have a preprocessing step depending on the type.
* For example a HandleBars template would be transformed and compiled
* This class will take a raw resource and transform in it's processed value
* @class ResourceProcessor
* @constructor
*/
function ResourceProcessor(config) {}

ResourceProcessor.prototype = {
    /**
    * This method checks the type of a resource
    * and call the right preprocessor to transform it.
    * @method process
    * @param {String} rawData string of the resource
    * @param {Object} metadata of the resource (type, name, path...)
    * @return {String} Returns transformed data regarding the type
    */
    process: function (rawData, resource) {
        switch (resource.type) {
            case 'view': return this._processMuTemplate(rawData, resource);
            case 'someother': return rawData;
            default: return rawData;
        }
    },

    /**
    * This method takes a mu template string and
    * transforms it into a mojito processed JS view
    * (which can be deployed to the client as a JS.
    * @method process
    * @param {String} rawData string of the resource
    * @param {Object} metadata of the resource (type, name, path...)
    * @return {String} Returns transformed data regarding the type
    */
    _processMuTemplate: function (rawData, resource) {
        var mojit = resource.mojit,
            action = resource.name,
            json = JSON.stringify(rawData);

        result = 'YUI.add("views/' + mojit + '/' + action + '", function (Y, NAME) {\n';
        result += '\tYUI.namespace("_mojito._cache.compiled.' + mojit + '.views");\n';
        result += '\tYUI._mojito._cache.compiled.' + mojit + '.views.' + action + ' = ' + json + ';\n';
        result += '});';
        return result;
    }
};
// Move class above eventually to another file...
//---------------------

/**
* This class is the main entry point for Shaker. It wil take care of all the postprocessing and configration:
* Set the configuration.
* Call ShakerCore to obtain all the application resources metadata.
* Process every context/mojit/bundle using GearJS
* Ouput to CDN/local all the computed rollups
* Write all shaken metadata for Shaker runtime execution.
*
* @param {Object} Options to configure Shaker through command line the values are:
*   - debug {value} :: Will execute de defined level of debugging information
*   - run :: Will run the start command after Shake
*   - context environment:{[values]} Will execute Shaker in a given context
* @class Shaker
* @constructor
*/

function Shaker (options) {
    options = options || {};
    this.root = options.root || process.cwd();
    this.logger = new libutils.SimpleLogger(options);
    this._context = options.context || {};
    //when we are in local mode we need to delete previews Shaker runs
    this.removeCompiledAssets(this.root);

    this.core = new ShakerCore(options);
    this.rp = new ResourceProcessor();
    //getting the merged config defined in app.json and in shaker.json
    this._shakerConfig = this.expandShakerConfig(this._context);

    //registrying all specific/general Shaker tasks for GearJS
    this._registry = new gear.Registry({dirname: path.resolve(__dirname, '../', 'node_modules', 'gear-lib', 'lib')});
    this._registry.load({tasks: {
        preprocess: this.preprocessResourceTask.bind(this),
        readResources: this.readResourcesTask.bind(this),
        raw: this.writeRawResources.bind(this),
        local: this.writeRollupsLocally.bind(this)
    }});
    if (this._shakerConfig.module) {
        this._registry.load({module: this._shakerConfig.module});
    }
}

//We define here some default configuration to merge when computing the rollups
Shaker.PARALLEL = 1;
Shaker.DEFAULT_TASK = 'raw';
Shaker.DEFAULT_TASK_WRITE_CONFIG = {
    compiledAssetsPath : 'assets/compiled',
    compiledName: '{checksum}'
};

Shaker.prototype = {
    /*
    * Gets the Metadata, call for processing and for the writting of the result.
    * This function is the entry point for the command line.
    * @method run
    * @param {Function} callback to the Shaker command with the results
    */
    run: function (callback) {
        this.logger.log('[SHAKER] - Analyzing Mojito App...');
        var self = this,
            masterContext = this._context,
            shakerConfig = this.expandShakerConfig(masterContext),
            shakerMeta = this.core.run();

         this.processMetadata(shakerMeta, shakerConfig, function (err, data) {
            if (err) {
                callback('Build process aborted!');
            } else {
                self.logger.log('[SHAKER] - Writting metadata...');
                self.writeMetadata(data, callback);
            }
         });
    },
    /**
    * Call ShakerCore to obtain the mergedConfig from app.json && shaker.json for a given context
    * @method expandShakerConfig
    * @param {Object} Context to get the config from
    * @return {Object} The merged shaker config
    */
    expandShakerConfig: function (context){
        var config = this.core.getMergedShakerConfigByContext('shared', context);
        config.taskConfig = Y.merge(config.taskConfig || {}, Shaker.DEFAULT_TASK_WRITE_CONFIG);
        return config;
    },
    removeCompiledAssets: function (root) {
        var path = root + '/assets/compiled';
        rmDir = function(dirPath) {
            var files;
            try {
                files = fs.readdirSync(dirPath);
            }
            catch(e) {
                return;
            }
            if (files.length > 0) {
                for (var i = 0; i < files.length; i++) {
                    var filePath = dirPath + '/' + files[i];
                    if (fs.statSync(filePath).isFile()){
                        fs.unlinkSync(filePath);
                    } else {
                        rmDir(filePath);
                    }
                }
            }
            fs.rmdirSync(dirPath);
        };
        rmDir(path);
    },
    processMetadata: function (shakenMeta, shakerConfig, callback) {
        this.logger.log('[SHAKER] - Processing Metadata...');
        var self = this,
            contextKey,
            context,
            meta = shakenMeta.app,
            mojitName,
            mojit,
            filterAssets = function(item) {return item.type === 'asset' && item.subtype === 'css';};

        var q = async.queue(function (task, callback) {
            switch(task.type) {
                case 'mojit':
                    self.processMojit(task.mojitResources, shakerConfig, task, function (err, data) {
                        self.logger.success('[SHAKER] - Context [' + task.contextKey + '] Processed Mojit: ' + task.mojitName, 1);
                        meta[task.contextKey].mojits[task.mojitName] = data;
                        callback(err, data);
                    });
                    break;

                case 'bundle':
                    self.processMojit(task.bundle, shakerConfig, task, function (err, data) {
                        self.logger.success('[SHAKER] - Context [' + task.contextKey + '] Processed Bundle', 1);
                        meta[task.contextKey].routesBundle = data;
                        callback(err, data);
                    });
                break;

                case 'app':
                    self.processMojitCSS(task.appResources, shakerConfig, task, function (err, data) {
                        self.logger.success('[SHAKER] - Context [' + task.contextKey + '] Processed App level assets', 1);
                        meta[task.contextKey].app = data;
                        callback(err, data);
                    });
                    break;

                case 'core':
                    self.processMojitJS(task.core,[], shakerConfig, task, function (err, data) {
                        self.logger.success('[SHAKER] - Processed Mojito Core', 1);
                        shakenMeta.core = data;
                        callback(err, data);
                    });
                    break;

                default: callback(); break;
            }
        },shakerConfig.parallel || Shaker.PARALLEL);

        q.drain = function(err) {
            callback(self.error, shakenMeta);
        };
        for (contextKey in meta) {
            context = meta[contextKey];
            q.push({
                contextKey: contextKey,
                context: context,
                appResources: context.app.filter(filterAssets),
                type: 'app',
                shakerMeta: meta
            });
            q.push({
                    type: 'bundle',
                    bundle: context.routesBundle,
                    contextKey: contextKey,
                    context: context,
                    shakerMeta: meta
            });

            for (mojitName in context.mojits) {
                mojit = context.mojits[mojitName];
                q.push({
                    mojitName: mojitName,
                    type: 'mojit',
                    mojitResources: mojit,
                    contextKey: contextKey,
                    context: context,
                    shakerMeta: meta
                });
            }
        }
        //Core push
        q.push({
            type: 'core',
            core: shakenMeta.core,
            shakerMeta: meta
        });
    },
    writeMetadata: function (metadata, callback){
        var self = this,
            content = "",
            file = process.cwd()  + '/shaker-meta.json';
        content += JSON.stringify(metadata, null, '\t');
        //Note: 0777 is interpreted as octal so we cant remove the 0 in front for JSLint
        //mkdirp.sync(process.cwd() + '/autoload/compiled', 0777 & (~process.umask()));
        fs.writeFileSync(file, content);
        self.logger.success('[SHAKER] - Metadata written in ' + file.magenta + '.');
        self.logger.success('[SHAKER] - Runtime ready. Returning control to mojito');
        callback(null, metadata);
    },
    processMojitJS: function (jsResources, viewResources, shakerOptions, taskMeta, callback) {

        var self = this,
            queue = new gear.Queue({registry: this._registry}),
            writeTask = shakerOptions.task || Shaker.DEFAULT_TASK,
            taskOptions = shakerOptions.taskConfig,
            resourceList = [],
            jsLintCheck = function (blob) {
                //return anything but null || false to raise an error
            };
        queue.tasks({
            //js: it may need some preprocessing
            js: {task:['readResources', jsResources]},
            compileJS: {requires: 'js', task: ['preprocess']},
            jsLint: {requires: 'compileJS', task: [shakerOptions.jslint ? 'jslint' : 'noop', {callback: jsLintCheck }]},
            //views: we need to precompile the views for sure
            views: {task: ['readResources', viewResources]},
            compileViews: {requires: 'views', task: ['preprocess']},
            //once everything is js we merge it
            join: {requires: ['jsLint', 'compileViews']}
        })
        .concat({callback: function (blob) {
            resourceList.push(blob.resource);
            return new blob.constructor(blob, {name: 'Concat for ' + (taskMeta.mojitName || taskMeta.type)});
         }});

        if (shakerOptions.replace) {
            queue.replace({
                    regex: shakerOptions.regex || '*',
                    replace: shakerOptions.replace || '',
                    flags: shakerOptions.flags || 'mg'
                });
        }

        if (shakerOptions.minify) {
            queue.jsminify();
        }
        //write the metadata
        queue.task(writeTask, {
            resources: resourceList,
            task: taskOptions,
            ext: '.js',
            name: taskOptions.compiledName + '.js'
        });

        queue.run(function (err, data) {
            if (err) {
                self.logger.error('[SHAKER] - Processing resources: ' +
                    (taskMeta.type === 'mojit' ? taskMeta.mojitName : 'App level') +
                    ' | Context: ' + taskMeta.contextKey
                );
                self.error = err;
                self.logger.dump(err);
                callback(err);
            } else {
                callback(null, data.pop().result);
            }
            
        });
    },
    processMojitCSS: function (cssResources, shakerOptions, taskMeta, callback) {
        var self = this,
            queue = new gear.Queue({registry: this._registry}),
            writeTask = shakerOptions.task || Shaker.DEFAULT_TASK,
            taskOptions = shakerOptions.taskConfig,
            resourceList = [];
        queue.task('readResources', cssResources)
            .task('preprocess');

         //TODO: Implement this feature
        if (shakerOptions.dataURI) {
            queue.task('processImagesCSS');
        }
        queue.concat({callback: function (blob){
            resourceList.push(blob.resource);
            return blob;
         }});
        
        if (shakerOptions.minify) {
            queue.cssminify();
        }
        queue.task(writeTask, {
            resources: resourceList,
            task: taskOptions,
            ext: '.css',
            name: taskOptions.compiledName + '.css'
        });

        queue.run(function (err, data) {
            if (err) {
                self.logger.error('[SHAKER] - Processing resources: ' +
                    (taskMeta.type === 'mojit' ? taskMeta.mojitName : 'App level') +
                    ' | Context: ' + taskMeta.contextKey
                );
                self.error = err;
                self.logger.dump(err);
                callback(err);
            } else {
                //ToDO: CHECK Gear way to do this
                callback(null, data.pop().result);
            }
        });
    },
    processMojit: function (shakenMojit, shakerOptions, taskMeta, callback) {
        var self = this,
            queue = {},
            processAction = function (actionRes, cbAction) {
                async.series({
                    js: function (cb) {
                        self.processMojitJS(actionRes.js, actionRes.views, shakerOptions, taskMeta, cb);
                    },
                    css: function (cb) {
                        self.processMojitCSS(actionRes.css, shakerOptions, taskMeta, cb);
                    }
                }, cbAction);
            };
        Y.Object.each(shakenMojit, function (actionResource, action) {
            self.logger.debug('[SHAKER] - Processing resources: ' +
                (taskMeta.type === 'mojit' ?
                    taskMeta.mojitName + ', action: ' + action :'App level') +
                ' | Context: ' + taskMeta.contextKey, 2);

            queue[action] = async.apply(processAction, actionResource);
        });
        async.parallel(queue, callback);
    },
//  -------============= Gear Tasks ===============-------
    preprocessResourceTask: function (options, blob, done) {
        options = options || {};
        var processed = this.rp.process(blob.result, blob.resource);
        done(null, new blob.constructor(processed, blob));
    },
    readResourcesTask: function (item, done) {
        item = item || {};
        var rawFile = fs.readFileSync(item.source.fs.fullPath, 'utf8');
        done(null, new gear.Blob(rawFile, {name: item.source.fs.fullPath, resource: item, test:[item.url]}));
    },
    writeRawResources:function (options, blob, done){
        Y.use('array-extras');
        var resourcesURL = Y.Array.map(options.resources, function (item){
            return item.url;
        });
        resourcesURL = resourcesURL.filter(function (url) {
            return path.extname(url) === '.js' || path.extname(url) === '.css';
        });
        //TODO: Ask Stephen (GEAR author) about this result wrapper thing...
        done(null, {result:resourcesURL});
    },
    writeRollupsLocally: function (options, blob, done) {
        var task = options.task,
            coreConfig = this.core.getStoreConfigs(),
            prefix = coreConfig.prefix,
            appName = coreConfig.appName,
            baseName = appName || path.basename(this.root),
            transformedUrl = path.join('/', prefix, baseName, task.compiledAssetsPath),
            fullPath = path.join(this.root, task.compiledAssetsPath, task.compiledName) + options.ext;

        blob.writeFile(fullPath, blob, 'utf8', function (err , blob) {
            var fileResult = blob.name,
                transformedURL = path.join(transformedUrl, path.basename(fileResult));
            done(null, {result: [transformedURL]});
        });
    }
};

exports.Shaker = Shaker;