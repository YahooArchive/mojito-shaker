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
        switch(resource.type){
            case 'view': return this._processMuTemplate(rawData, resource);
            case 'someother': return rawData;
            default: return rawData;
        }
    },
    _processMuTemplate: function (rawData, resource) {
        var mojit = 'poc',
            action = 'index',
            json = 'helo';

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
    this._core = new ShakerCore(options);
    this._registry = new gear.Registry({dirname: path.resolve(__dirname, '../', 'node_modules', 'gear-lib', 'lib')});
    this._registry.load({tasks: {
        preprocess: this.preprocessResourceTask.bind(this),
        readResources: this.readResourcesTask.bind(this),
        raw: this.writeRawResources.bind(this)
    }});
    this._rp = new ResourceProcessor();
}

Shaker.DEFAULT_TASK = 'raw';
Shaker.TASKS_DIR = __dirname + '/tasks/'; // Tasks in this directory can be directly referenced in application.json
Shaker.ASSETS_DIR = 'assets/';
Shaker.COMPILED_DIR = Shaker.ASSETS_DIR + 'compiled/'; // Where we write the rollups
Shaker.IMAGES_DIR = Shaker.ASSETS_DIR + 'images/';

Shaker.prototype = {

    run: function (callback) {
        var shakerMeta = this._core.run(),
            self = this;
        this.processMetadata(shakerMeta, function (err, data){
            self.writeMetadata(data, callback);
        });
    },
    processMetadata: function (shakenMeta, callback) {
        var self = this,
            contextKey,
            context,
            meta = shakenMeta.app,
            mojitName,
            mojit,
            filterAssets = function(item) {return item.type === 'asset' && item.subtype === 'css';};

        var q = async.queue(function (task, callback) {
            if(task.type === 'core') {
                self.processMojitJS(task.core,[], {}, function (err, data) {
                    shakenMeta.core = data;
                    callback(err, data);
                });
            } else if (task.type === 'mojit') {
                //console.log('Analyzing mojit ' + task.mojitName + ' for context: ' + task.contextKey);
                self.processMojit(task.mojitResources, {}, function (err, data) {
                    meta[task.contextKey].mojits[task.mojitName] = data;
                    callback(err, data);
                });
            } else {
                //console.log('Analyzing app resources for context: ' + task.contextKey);
                self.processMojitCSS(task.appResources, {}, function (err, data) {
                    meta[task.contextKey].app = data;
                    callback(err, data);
                });
            }
        }, 4);
        q.drain = function (){
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
        content += 'YUI._mojito._cache.shaker.meta = \n';
        content += JSON.stringify(metadata, null, '\t');
        content += '});';
        mkdirp.sync(process.cwd() + '/autoload/compiled', 777 & (~process.umask()));
        fs.writeFileSync(process.cwd()  + '/autoload/compiled/shaker-meta.common.js', content);

        callback();
    },
    processMojitJS: function (jsResources, viewResources, shakerOptions, callback) {
        var queue = new gear.Queue({registry: this._registry}),
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
        queue.task(shakerOptions.task || Shaker.DEFAULT_TASK,
                {resources: resourceList, options: shakerOptions});

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

        queue.task(shakerOptions.task || Shaker.DEFAULT_TASK,
                {resources: resourceList, options: shakerOptions});

        queue.run(function (err, data){
            if (err) {
                callback(err);
                return;
            }else{
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
        var processed = this._rp.process(blob.result, blob.resource);
        done(null, new blob.constructor(processed, blob));
    },
    readResourcesTask: function (item, done) {
        item = item || {};
        var rawFile = fs.readFileSync(item.source.fs.fullPath, 'utf8');
        done(null, new gear.Blob(rawFile, {resource: item}));
    },
    writeRawResources:function (colected, blob, done){
        Y.use('array-extras');
        var resourcesURL = Y.Array.map(colected.resources, function (item){
            return item.url;
        });
        //TODO: Ask Stephen (GEAR author) about this result wrapper thing...
        done(null, {result:resourcesURL});
    }
};

exports.Shaker = Shaker;
