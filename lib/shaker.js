/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
 
var path = require('path'),
    fs = require('fs'),
    gear = require('gear'),
    async = require('async'),
    mkdirp = require('mkdirp'),
    mime = require('mime'),
    ShakerCore = require('./core').ShakerCore,
    //logger = require('./core').logger,
    YUI = require('yui').YUI,
    Y = require('yui').YUI({useSync: true});

//TODO: Move to another file
function ResourceProcessor(config) {}

ResourceProcessor.prototype = {
    process: function (rawData, resource) {
        switch (resource.type) {
            case 'view': return this._processMuTemplate(rawData, resource);
            case 'someother': return rawData;
            default: return rawData;
        }
    },
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
// Move class above...
//---------------------

function Shaker (options) {
    options = options || {};
    this.root = options.root || process.cwd();

    this.removeCompiledAssets();

    this.core = new ShakerCore(options);
    this.rp = new ResourceProcessor();

    this._context = options.context || {};
    this._shakerConfig = this.expandShakerConfig(this._context);

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
Shaker.PARALLEL = 1;
Shaker.DEFAULT_TASK = 'raw';
Shaker.DEFAULT_TASK_WRITE_CONFIG = {
    compiledAssetsPath : 'assets/compiled',
    compiledName: '{checksum}'
};

Shaker.prototype = {

    run: function (callback) {
        console.log('[SHAKER] - Analyzing Mojito App...');
        var self = this,
            masterContext = this._context,
            shakerConfig = this.expandShakerConfig(masterContext),
            shakerMeta = this.core.run();
        console.log('[SHAKER] - Metadata procesed!');
        this.processMetadata(shakerMeta, shakerConfig, function (err, data) {
            self.writeMetadata(data, callback);
        });
    },
    expandShakerConfig: function (context){
        var config = this.core.getMergedShakerConfigByContext('shared', context);
        config.taskConfig = Y.merge(config.taskConfig || {}, Shaker.DEFAULT_TASK_WRITE_CONFIG);
        return config;
    },
    removeCompiledAssets: function (root) {
        
    },
    processMetadata: function (shakenMeta, shakerConfig, callback) {
        console.log('[SHAKER] - Processing Metadata...');
        var self = this,
            contextKey,
            context,
            meta = shakenMeta.app,
            mojitName,
            mojit,
            filterAssets = function(item) {return item.type === 'asset' && item.subtype === 'css';};

        var q = async.queue(function (task, callback) {
            console.log('Queueing: ' + Date.now());
            switch(task.type) {
                case 'mojit':
                    //console.log('Analyzing mojit ' + task.mojitName + ' for context: ' + task.contextKey);
                    self.processMojit(task.mojitResources, shakerConfig, function (err, data) {
                        meta[task.contextKey].mojits[task.mojitName] = data;
                        callback(err, data);
                    });
                    break;

                case 'bundle':
                //console.log('Analyzing route resources for context: ' + task.contextKey);
                    self.processMojit(task.bundle, shakerConfig, function (err, data) {
                        meta[task.contextKey].routesBundle = data;
                        callback(err, data);
                    });
                break;

                case 'app':
                    //console.log('Analyzing app resources for context: ' + task.contextKey);
                    self.processMojitCSS(task.appResources, shakerConfig, function (err, data) {
                        meta[task.contextKey].app = data;
                        callback(err, data);
                    });
                    break;

                case 'core':
                //console.log('Analyzing core for context: ' + task.contextKey);
                    self.processMojitJS(task.core,[], shakerConfig, function (err, data) {
                        shakenMeta.core = data;
                        callback(err, data);
                    });
                    break;

                default: callback(); break;
            }
        },shakerConfig.parallel || Shaker.PARALLEL);

        q.drain = function(){
            callback(null, shakenMeta);
        };
        for (contextKey in meta) {
            context = meta[contextKey];
            q.push({
                contextKey: contextKey,
                context: context,
                appResources: context.app.filter(filterAssets),
                type:'app',
                shakerMeta: meta
            });
            q.push({
                    type:'bundle',
                    bundle: context.routesBundle,
                    contextKey: contextKey,
                    context: context,
                    shakerMeta: meta
                });
            for (mojitName in context.mojits) {
                mojit = context.mojits[mojitName];
                q.push({
                    mojitName: mojitName,
                    type:'mojit',
                    mojitResources: mojit,
                    contextKey: contextKey,
                    context: context,
                    shakerMeta: meta
                });
            }
        }
        //Core push
        q.push({
            type:'core',
            core: shakenMeta.core,
            shakerMeta: meta
        });
    },
    writeMetadata: function (metadata, callback){
        var self = this,
            content = "";

        content += 'YUI.add("shaker/metaMojits", function (Y, NAME) {\n';
        content += 'YUI.namespace("_mojito._cache.shaker");\n';
        content += 'YUI._mojito._cache.shaker.meta =\n';
        content += JSON.stringify(metadata, null, '\t');
        content += '});';
        mkdirp.sync(process.cwd() + '/autoload/compiled', 777 & (~process.umask()));
        fs.writeFileSync(process.cwd()  + '/autoload/compiled/shaker-meta.common.js', content);

        callback(null, metadata);
    },
    processMojitJS: function (jsResources, viewResources, shakerOptions, callback) {
        var queue = new gear.Queue({registry: this._registry}),
            writeTask = shakerOptions.task || Shaker.DEFAULT_TASK,
            taskOptions = shakerOptions.taskConfig,
            resourceList = [];
        queue.tasks({
            //js: it may need some preprocessing
            js: {task:['readResources', jsResources]},
            compileJS: {requires: 'js', task: ['preprocess']},
            //views: we need to precompile the views for sure
            views: {task: ['readResources', viewResources]},
            compileViews: {requires: 'views', task: ['preprocess']},
            //once everything is js we merge it
            join: {requires: ['compileJS', 'compileViews']}
        })
        .concat({callback: function (blob){
            resourceList.push(blob.resource);
            return blob;
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

        queue.run(function (err, data){
            if (err) {
                callback(err);
                return;
            }
            callback(null, data.pop().result);
        });
    },
    processMojitCSS: function (cssResources, shakerOptions, callback) {
        var queue = new gear.Queue({registry: this._registry}),
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

        queue.run(function (err, data){
            if (err) {
                callback(err);
                return;
            }else{
                //ToDO: CHECK Gear way to do this
                callback(null, data.pop().result);
            }
        });
    },
    processMojit: function (shakenMojit, shakerOptions, callback) {
        var self = this,
            queue = {},
            processAction = function (actionRes, cbAction) {
                async.series({
                    js: function (cb) {
                        self.processMojitJS(actionRes.js, actionRes.views, shakerOptions, cb);
                    },
                    css: function (cb) {
                        self.processMojitCSS(actionRes.css, shakerOptions, cb);
                    }
                }, cbAction);
            };
        Y.Object.each(shakenMojit, function (actionResource, action) {
            queue[action] = async.apply(processAction, actionResource);
        });
        async.parallel(queue, callback);
    },
//  -------============= Gear Tasks ===============-------
    preprocessResourceTask: function (options, blob, done){
        options = options || {};
        var processed = this.rp.process(blob.result, blob.resource);
        done(null, new blob.constructor(processed, blob));
    },
    readResourcesTask: function (item, done) {
        item = item || {};
        var rawFile = fs.readFileSync(item.source.fs.fullPath, 'utf8');
        done(null, new gear.Blob(rawFile, {resource: item, test:[item.url]}));
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
            baseName = path.basename(this.root),
            prefix = this.core.getStoreConfigs().prefix,
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
