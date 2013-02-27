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
    HB = require('yui/handlebars').Handlebars,
    mime = require('mime'),
    ShakerCore = require('./core').ShakerCore,
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
            case 'view': return this._processView(rawData, resource);
            case 'someother': return rawData;
            default: return rawData;
        }
    },
    _processView: function (rawData, resource) {
        if (resource.view.engine === 'hb') {
            return this._processHbTemplate(rawData, resource);
        } else if (resource.view.engine === 'mu') {
            return this._processMuTemplate(rawData, resource);
        }
    },
    _processHbTemplate: function (rawData, resource) {
        var precompiled = HB.precompile(rawData),
            templateName = resource.url,
            moduleName = templateName,
            tmpl = 'YUI.add("' + moduleName + '", function (Y) {' +
                    'var cache = Y.namespace("Env.Mojito.Handlebars");' +
                    'cache["' + templateName +'"] = {compiled: Y.Handlebars.template('+ precompiled +')};' +
                    '}, "0.0.1", {requires: ["mojito-hb"]});';
        return tmpl;
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
//---------------------
/*
* KSPLIT: GEAR TASK
* This Task is separated since it needs to have the property type with it.
* The type define how the task will be executed
*/
var kSplitTask = function (options, blobs, done) {
    var taskMeta = options.taskMeta,
        shaker = options.self,
        Blob = blobs[0].constructor, //HACK to save the constructor
        weight = options.ksplit.weight || Shaker.DEFAULT_KSPLIT_WEIGHT,
        percentage = options.ksplit.threshold || Shaker.DEFAULT_KSPLIT_THRESHOLD,
        ratio = weight * (percentage / 100),
        totalWeight = 0,
        kbundle = [],
        buffer = '',
        kWeight,
        pkgs,
        pkgsize,
        blob,
        i;

    // Get the total weight of the bundle
    for (i in blobs) {
        blob = blobs[i];
        totalWeight += blob.result.length;
    }
    //calculate the  number of pkg we will split and the pkg size
    kWeight = totalWeight / 1000,
    pkgs = Math.floor(kWeight / weight);

    //if the remaining is big enought we will divide in +1 pkg more.
    if (kWeight % weight > ratio) {
        pkgs++;
    }
    //the final number of pkgs to split:
    pkgsize = Math.round(kWeight / pkgs) * 1000;

    shaker.logger.debug('[SHAKER] Splitting bundle | weight: ' + kWeight + 'kb, pkgs: ' + pkgs + ', size: ' + pkgsize / 1000 + 'kb');

    // decrement pkgs so when we bundle pkgs-1 we can skip the guard within the for loop
    // also we make sure we don't  do a really tiny extra pkg.
    pkgs--;

    for (i in blobs) {
        blob = blobs[i];
        buffer += blob.result;
        if (pkgs && buffer.length > pkgsize || pkgsize - buffer.length  < 5000 ) {
            // console.log('PKG Bundled!, Left: ', pkgs);
            kbundle.push(new Blob(buffer,{name: 'Bundle KSPLIT['+ pkgs +']'}));
            buffer = '';
            pkgs--;
        }
    }

    kbundle.push(new Blob(buffer,{name: 'Bundle KSPLIT['+ pkgs +']'}));

    done(null, kbundle);
};

kSplitTask.type = 'collect';

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
    process.shakerCompile = true;

    //when we are in local mode we need to delete previews Shaker runs
    this.removeCompiledResources(this.root);

    this.core = new ShakerCore(options);
    this.rp = new ResourceProcessor();

    //getting the merged config defined in app.json and in shaker.json
    this._shakerConfig = this.expandShakerConfig(this._context);

    //registrying all specific/general Shaker tasks for GearJS
    this._registry = new gear.Registry({dirname: path.resolve(__dirname, '../', 'node_modules', 'gear-lib', 'lib')});
    this._registry.load({tasks: {
        preprocess: this.preprocessResourceTask.bind(this),
        inlineCSS: this.inlineCSS.bind(this),
        inlineJS: this.inlineJS.bind(this),
        readResources: this.readResourcesTask.bind(this),
        readYUIResources: this.readYuiResourcesTask.bind(this),
        raw: this.writeRawResources.bind(this),
        local: this.writeRollupsLocally.bind(this),
        kSplit: kSplitTask
    }});

    if (this._shakerConfig.module) {
        this._registry.load({module: this._shakerConfig.module});
    }
}

//We define here some default configuration to merge when computing the rollups
Shaker.PARALLEL = 1;
Shaker.DEFAULT_TASK = 'raw';

//k-split vars
Shaker.DEFAULT_KSPLIT_WEIGHT = 100;
Shaker.DEFAULT_KSPLIT_THRESHOLD = 20;

//Default task
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
            combo,
            masterContext = this._context,
            shakerConfig = this.expandShakerConfig(masterContext),
            comboCDN = shakerConfig.comboCDN,
            shakerMeta = this.core.run();

         this.processMetadata(shakerMeta, shakerConfig, function (err, processedMetadata) {
            //self.core.logger.dump(processedMetadata);
            if (err) {
                console.log(err);
                callback('Build process aborted!');
                return;
            }

            if (comboCDN) {
                self.logger.log('[SHAKER] - Process JS for ComboLoad...');
                self.processResources(processedMetadata, shakerConfig, function (err, augmentedMetadata) {
                    if (err) {
                        console.log(err);
                        callback('Build process aborted!');
                        return;
                    }
                    self.writeMetadata(augmentedMetadata, callback);
                });
            } else {
                self.writeMetadata(processedMetadata, callback);
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
    removeCompiledResources: function (root) {
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

         //remove previous shaker metadata
        try {
            fs.unlinkSync(root + '/shaker-meta.json');
        } catch (e) {
            this.logger.debug('[SHAKER] No shaker-meta to delete', 2);
        }
    },
    /*
    * In this funtion we will attach the yui modules required by the bundle
    */

    _attachYUIModuleResources: function (bundles, shakerConfig, task) {
        var filteredModules = [
            //we could add more since the overhead is really small
                'mojito',
                'mojito-client',
                'yui-base',
                'loader'
            ],
            requiredYUI,
            bundleName,
            module,
            moduleName,
            fullpath,
            newResource;

        for (bundleName in bundles) {
            requiredYUI = bundles[bundleName].required;
            for (module in requiredYUI) {
                if (filteredModules.indexOf(module) === -1) {
                    moduleName = 'yui/' + module + '/' + module;
                    this.logger.debug('[SHAKER] Adding YUI module: \'' + moduleName + '. Bundle: ' + bundleName , 2);
                    // Need that since the store doesnt support yet reading raw yui3 modules
                    try {
                        fullpath = require.resolve(moduleName);
                        newResource = {
                            synthetic: true,
                            source: {fs:{ fullPath: fullpath } }
                        };
                        bundles[bundleName].js.push(newResource);
                    } catch (e) {
                        //no big deal it means that some mojito module got thought the requires
                        this.logger.debug('[SHAKER] ' + e.message, 3);
                    }
                }
            }
        }
        return bundles;

    },
    processMetadata: function (shakenMeta, shakerConfig, callback) {
        this.logger.log('[SHAKER] - Processing Metadata...');
        var self = this,
            contextKey,
            context,
            meta = shakenMeta.app,
            mojitName,
            bundleResources,
            mojit,
            filterAssets = function(item) {return item.type === 'asset' && item.subtype === 'css';};

        var q = async.queue(function (task, callback) {
            switch (task.type) {
                case 'mojit':
                    self.processMojit(task.mojitResources, shakerConfig, task, function (err, data) {
                        self.logger.success('[SHAKER] - Context [' + task.contextKey + '] Processed Mojit: ' + task.mojitName, 1);
                        meta[task.contextKey].mojits[task.mojitName] = data;
                        callback(err, data);
                    });
                    break;

                case 'bundle':
                    bundleResources = self._attachYUIModuleResources(task.bundle, shakerConfig, task);
                    self.processMojit(bundleResources, shakerConfig, task, function (err, data) {
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

                case 'inlineShared':

                    self.processInlineBlob(task.inlineShared, shakerConfig, task, function (err, data) {
                        self.logger.success('[SHAKER] - Context [' + task.contextKey + '] Processed Shared Inline resources', 1);
                        meta[task.contextKey].inlineShared = data;
                        callback(err, data);
                    });
                    break;

                case 'core':
                    self.processMojitJS(task.core, shakerConfig, task, function (err, data) {
                        self.logger.success('[SHAKER] - Processed Mojito Core', 1);
                        shakenMeta.core = data;
                        callback(err, data);
                    });
                    break;

                default: callback(); break;
            }
        }, shakerConfig.parallel || Shaker.PARALLEL);

        //when everything is done:
        q.drain = function(err) {
            callback(self.error, shakenMeta);
        };
        // Process all metadata into the queue:
        for (contextKey in meta) {
            context = meta[contextKey];

            //app level css
            q.push({
                contextKey: contextKey,
                context: context,
                appResources: context.app.filter(filterAssets),
                type: 'app',
                shakerMeta: meta
            });

            //inlineSharedFiles
            if (!Y.Object.isEmpty(context.inlineShared)){
                q.push({
                    contextKey: contextKey,
                    context: context,
                    inlineShared: context.inlineShared,
                    type: 'inlineShared',
                    shakerMeta: meta
                });
            }

            //bundles
            q.push({
                    type: 'bundle',
                    bundle: context.routesBundle,
                    contextKey: contextKey,
                    context: context,
                    shakerMeta: meta
            });
            //mojits
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
        var content = "",
            file = process.cwd()  + '/shaker-meta.json';
        content += JSON.stringify(metadata, null, '\t');

        this.logger.log('[SHAKER] - Writting metadata...');
        fs.writeFileSync(file, content);

        this.logger.success('[SHAKER] - Metadata written in ' + file.magenta + '.');
        this.logger.success('[SHAKER] - Runtime ready. Returning control to mojito');
        callback(null, metadata);
    },
    processResources: function (shakerMeta, shakerConfig, callback) {
        if (!shakerConfig.module) {
            //do  somethign and return
            callback('[SHAKER] ComboLoading failed: No module specified.');
            return;
        }
        var self = this,
            resourcesMap = this.core.getAppModuleResources(),
            resources = [],
            urlMap = this._urlMap || {},
            storeConfigs = this.core.getStoreConfigs(),
            assetsPrefix = '/' + storeConfigs.prefix,
            queue = new gear.Queue({registry: this._registry}),
            writeTask = shakerConfig.task || Shaker.DEFAULT_TASK,
            taskOptions = shakerConfig.taskConfig,
            prefixURL = taskOptions.prefix || '',
            minify = shakerConfig.minify,
            jsminifyOptions = {config: minify && minify.js};

        resources = Y.Object.values(resourcesMap);

        queue.readYUIResources(resources);
        queue.preprocess();
        queue.jsminify(jsminifyOptions);

        queue.task( writeTask + 'auto', {
                truncatechecksum: -6,
                task: taskOptions,
                ext: '.js'
        });

        queue.run(function (err, uploadedFiles) {
            shakerMeta.cdnModules = {};
            if (err) {
                callback('CDN Upload error', shakerMeta);
                return;
            }
            Y.Array.each(uploadedFiles, function (itemResult) {
                var origUrl = itemResult.blob.resource.url,
                    fileName = itemResult.fileName || '',
                    finalUrl = fileName && prefixURL + (fileName[0] === '/' ? fileName : '/' + fileName);

                if (origUrl && finalUrl) {
                    shakerMeta.cdnModules[origUrl] = finalUrl;
                    if (!self._loaderMetadataResolved) {
                        urlMap[origUrl] = finalUrl;
                    }
                }
            });

            if (self._loaderMetadataResolved) {
                Y.Object.each(urlMap, function (cdnURL, origUrl) {
                    var finalCDN = shakerMeta.cdnModules[cdnURL];
                    if (finalCDN) {
                        urlMap[origUrl] = shakerMeta.cdnModules[cdnURL];
                    }
                });
                shakerMeta.cdnModules = urlMap;
                callback(null, shakerMeta);
            } else {
                console.log('====== SECOND PASS FOR METADATA GENERATION ======');
                self._urlMap = urlMap;
                self.core.store.resolveResourceVersions(shakerMeta.cdnModules);
                self.processResources(shakerMeta, shakerConfig, callback);
                self._loaderMetadataResolved = true;
            }
        });
    },
    _collectResults: function (blobs) {
        var collect = [],
            blob,
            i;
        for (i in blobs) {
            blob = blobs[i];
            collect = collect.concat(blob.result);
        }
        return collect;
    },
    processMojitJS: function (jsResources, shakerOptions, taskMeta, callback) {
        var self = this,
            queue = new gear.Queue({registry: this._registry}),
            writeTask = shakerOptions.task || Shaker.DEFAULT_TASK,
            taskOptions = shakerOptions.taskConfig,
            minify = shakerOptions.minify,
            jsminifyOptions = {config: minify && minify.js},
            resourceList = [],
            jsLintCheck = function (blob) {
                //return anything but null || false to raise an error
            };

        queue.tasks({
            //js: it may need some preprocessing
            js: {task:['readResources', jsResources]},
            compileJS: {requires: 'js', task: ['preprocess']},
            jsLint: {requires: 'compileJS', task: [shakerOptions.jslint ? 'jslint' : 'noop', {callback: jsLintCheck }]},
            join: {requires: ['jsLint']}
        });

        if (taskMeta.type === 'bundle' && shakerOptions.ksplit) {
            // We need to check the minifyed size if the option is enabled
            if (minify) {
                queue.jsminify(jsminifyOptions);
            }
            queue.kSplit({taskMeta: taskMeta, ksplit: shakerOptions.ksplit, self: this});
        } else  {
            queue.concat({callback: function (blob) {
                resourceList.push(blob.resource);
                return new blob.constructor(blob, {name: 'Concat for ' + (taskMeta.mojitName || taskMeta.type)});
             }});
        }

        if (shakerOptions.replace) {
            queue.replace({
                regex: shakerOptions.regex || '*',
                replace: shakerOptions.replace || '',
                flags: shakerOptions.flags || 'mg'
            });
        }

        if (minify) {
            queue.jsminify(jsminifyOptions);
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
                callback(null, self._collectResults(data));
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
                callback(null, self._collectResults(data));
            }
        });
    },
    /*
    * @processInlineBlob
    */
    processInlineBlob : function (inlineResources, shakerOptions, taskMeta, callback) {
        var self = this,
            queue = new gear.Queue({registry: this._registry}),
            writeTask = shakerOptions.task || Shaker.DEFAULT_TASK,
            taskOptions = shakerOptions.taskConfig,
            minify = shakerOptions.minify,
            jsminifyOptions = {config: minify && minify.js},
            //if is an object (we are inline key/value appShared inline)...
            inlineShared = !Y.Lang.isArray(inlineResources),
            cssList = [],
            jsList = [],
            resources = inlineResources,
            jsLintCheck = function (lint) {};

        if (inlineShared) {
            resources = Y.Object.values(inlineResources);
        }

        Y.Array.each(resources, function (resource, item) {
            if (resource.subtype === 'css') {
                cssList.push(resource);
            } else if (resource.subtype === 'js') {
                jsList.push(resource);
            }
        });
        queue.tasks({
            //js
            js: {task:['readResources', jsList]},
            compileJS: {requires: 'js', task: ['preprocess']},
            jsLint: {requires: 'compileJS', task: [shakerOptions.jslint ? 'jslint' : 'noop', {callback: jsLintCheck }]},
            jsMinify: {requires: 'jsLint', task: (minify ? ['jsminify', jsminifyOptions]: 'noop')},
            concatJS: {requires:'jsMinify', task:['concat']},
            inlineJS: {requires:'concatJS', task:['inlineJS']},
            //css
            css: {task:['readResources', cssList]},
            compileCSS: {requires: 'css', task: ['preprocess']},
            cssMinify: {requires: 'compileCSS', task: [shakerOptions.minify? 'cssminify': 'noop']},
            concatCSS: {requires:'cssMinify', task:['concat']},
            inlineCSS: {requires:'concatCSS', task: ['inlineCSS']},
            //once everything is done merge it
            join: {requires: ['inlineCSS', 'inlineJS']}
        });

        //we get the assets processed in the run callback
        queue.run(function (err, concatBlob) {
            var inline = inlineShared ? {} : [],
                name,
                blob;

            while ( (blob = concatBlob.pop()) ) {
                //we may get an empty blob is a list of resources was empty before processing it
                if (blob.resource) {
                    //when sharedInlineResources we need to asign each inlined result o its name
                    if (inlineShared) {
                        //get just the name of the resource (mojito gives: name-shaker-inline)
                        name = blob.resource.name.split('-').shift();
                        if (inlineResources[name]) {
                            inline[name] = blob.result;
                        } else {
                            //if there is no name in the inlineResources something when wrong..
                            self.logger.debug('[SHAKER] - error Processing Shared Inline: ' + name);
                        }
                    } else {
                        //it's just a regular inlining for a given mojit
                        //we just push it it to an array
                        inline.push(blob.result);
                    }
                }

            }

            callback(null, inline);
        });
    },
    processMojit: function (shakenMojit, shakerOptions, taskMeta, callback) {
        var self = this,
            queue = {},
            processAction = function (actionRes, cbAction) {
                var batch = {
                    js: function (cb) {
                        self.processMojitJS(actionRes.js, shakerOptions, taskMeta, cb);
                    },
                    css: function (cb) {
                        self.processMojitCSS(actionRes.css, shakerOptions, taskMeta, cb);
                    }
                };
                if (actionRes.inlineBlob && actionRes.inlineBlob.length) {
                    batch.blob = function (cb) {
                        self.processInlineBlob(actionRes.inlineBlob, shakerOptions, taskMeta, cb);
                    };
                }
                async.series(batch, cbAction);
            };

        Y.Object.each(shakenMojit, function (actionResource, action) {
            if (action === 'inlineBlob') return;
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
    inlineCSS: function (options, blob, done) {
        blob.type = 'css';
        var tmp = '<style>\n' + blob.result +'</style>';
        done(null, new blob.constructor(tmp, blob));
    },
    inlineJS: function (options, blob, done) {
        blob.type = 'js';
        var tmp = '<script>\n' + blob.result +'</script>';
        done(null, new blob.constructor(tmp, blob));
    },
    readResourcesTask: function (item, done) {
        item = item || {};
        var filename = item.source.fs.fullPath,
            contentReady = function (err, content) {
                if (err) {
                    done(err);
                    return;
                }
                done(null, new gear.Blob(content.toString(), {name: filename, resource: item}));
            },
            details = this.core.store.makeStaticHandlerDetails(item);
        // syntethic means that we manually created th resource
        //because is a yui module and the store doesnt support yet...
        if (item.synthetic) {
            fs.readFile(filename, contentReady);
        } else {
            this.core.store.getResourceContent(details, contentReady);
        }
    },
    // TODO Merge this with the previous somehow...
    readYuiResourcesTask: function (item, done) {
        item = item || {};
        var resName = item.yui ? item.yui.name : item.url,
            filename = resName + '_{checksum}.js',
            contentReady = function (err, content) {
                if (err) {
                    done(err);
                    return;
                }
                done(null, new gear.Blob(content.toString(), {name: filename, resource: item}));
            },
            details = this.core.store.makeStaticHandlerDetails(item);

        // syntethic means that we manually created the resource
        // because is a yui module and the store doesn't support yet...
        if (item.synthetic) {
            fs.readFile(filename, contentReady);
        } else {
            this.core.store.getResourceContent(details, contentReady);
        }
    },
    writeRawResources:function (options, blob, done) {
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
