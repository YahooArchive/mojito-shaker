/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var path = require('path'),
    mojito,
    fs = require('fs'),
    gear = require('gear'),
    async = require('async'),
    mkdirp = require('mkdirp'),
    mime = require('mime'),
    ShakerCore = require('./core').ShakerCore,
    //logger = require('./core').logger,
    utils = require('./utils');


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
        readResources: this.readResourcesTask.bind(this)}
    });
    this._rp = new ResourceProcessor();
}

Shaker.DEFAULT_TASK = 'raw';
Shaker.TASKS_DIR = __dirname + '/tasks/'; // Tasks in this directory can be directly referenced in application.json
Shaker.ASSETS_DIR = 'assets/';
Shaker.COMPILED_DIR = Shaker.ASSETS_DIR + 'compiled/'; // Where we write the rollups
Shaker.IMAGES_DIR = Shaker.ASSETS_DIR + 'images/';

Shaker.prototype = {

    run: function (callback) {
        var resourcesMeta = this._core.run();
    },
    processMetadata: function (meta) {
        var contextKey,
            context,
            mojitName,
            mojit;
    },
    processMojitJS: function (jsResources, viewResources, shakerOptions, callback) {
        var queue = new gear.Queue({registry: this._registry});
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
        .concat();

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

        queue.run(callback);
    },
    processMojitCSS: function (cssResources, shakerOptions, callback) {
        var queue = new gear.Queue({registry: this._registry});
        queue.task('readResources', cssResources)
            .task('preprocess');

         //TODO: Implement this feature
        if (shakerOptions.dataURI) {
            queue.task('processImagesCSS');
        }
        
        queue.concat();
        if (shakerOptions.minify) {
            queue.cssminify();
        }

        queue.run(callback);
    },

    preprocessResourceTask: function (options, blob, done){
        options = options || {};
        var processed = this._rp.process(blob.result, blob.resource);
        done(null, new blob.constructor(processed));
    },
    readResourcesTask: function (item, done) {
        item = item || {};
        var rawFile = fs.readFileSync(item.source.fs.fullPath, 'utf8');
        done(null, new gear.Blob(rawFile, {resource: item}));
    }
};

exports.Shaker = Shaker;
