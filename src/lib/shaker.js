var path = require('path'),
    utils = require('mojito/lib/management/utils'),
    fs = require('fs'),
    Queue = require('buildy').Queue,
    Registry = require('buildy').Registry,
    ShakerCore = require('./core').ShakerCore,
    async = require('async'),
    mkdirp = require('mkdirp');

function Rollup(name, files) {
    this._name = name;
    this._files = files;
    this._js = [];
    this._css = [];

    this._files.forEach(function(file) {
        var ext = path.extname(file);
        if (ext === '.js') {
            this._js.push(file);
        }
        else if (ext === '.css') {
            this._css.push(file);
        }
    }, this);

    if (!Rollup.REGISTRY) { // Cache registry
        Rollup.REGISTRY = new Registry();
        Rollup.REGISTRY.load(Rollup.TASKS_DIR);
    }
}

Rollup.TASKS_DIR = __dirname + '/tasks/';
Rollup.REGISTRY = null;

Rollup.prototype = {
    _pushRollup: function(options, callback) {
        var queue = new Queue('Rollup', {registry: Rollup.REGISTRY});

        queue.task('files', options.files);

        if (options.config.concat) {
            queue.task('concat');
        }

        if (options.config.minify) {
            queue.task(path.extname(options.name) === '.js' ? 'jsminify' : 'cssminify');
        }

        options.config.name = options.name;
        queue.task(options.type, options.config);

        queue.on('taskComplete', function(data) { // queueFailed, queueComplete
            if (data.task.type === options.type) {
                callback(null, data.result);
            }
        });

        queue.run();
    },

    // Push rollup files for CSS and JS in parallel
    rollup: function(options, rollupcb) {
        var self = this,
            tasks = [];

        if (this._css.length) {
            tasks.push(function(callback) {
                var cssoptions = {
                    name: self._name + '.css',
                    files: self._css,
                    type: options.type,
                    config: options.config
                };
                self._pushRollup(cssoptions, function(err, filename) {
                    callback(null, filename);
                });
            });
        }

        if (this._js.length) {
            tasks.push(function(callback) {
                var jsoptions = {
                    name: self._name + '.js',
                    files: self._js,
                    type: options.type,
                    config: options.config
                };
                self._pushRollup(jsoptions, function(err, filename) {
                    callback(null, filename);
                });
            });
        }

        async.parallel(tasks, function(err, filenames) {
            rollupcb(err, filenames);
        });
    }
};

function Shaker(store) {
    this._store = store;
    this._prefix = '/static';

    var config = this._store.getAppConfig(null, 'definition') || {},
        specs = config.specs || {},
        appConfig = specs.staticHandling || {};

    if (typeof appConfig.prefix !== 'undefined') {
        this._prefix = appConfig.prefix ? '/' + appConfig.prefix : '';
    }

    var shaker = config.shaker;
    this._type = shaker.type || 'local';
    this._config = shaker.config || {};
    this._config.compile = this._config.compile || false;
    this._config.parallel = this._config.parallel || 20;
    this._config.delay = this._config.delay || 0;
    this._config.concat = this._config.concat || true;
    this._config.minify = this._config.minify || true;
    this._config.root = this._config.root || 'assets/compiled/';
    this._config.staticRoot = this._prefix + '/' + this._store._shortRoot + '/' + this._config.root;
}

Shaker.prototype = {
    run: function(callback) {
        utils.log('[SHAKER] - Analizying application assets to Shake... ');
        var metadata = new ShakerCore({store: this._store}).shakeAll();

        if (this._config.compile) {
            this._compileRollups(metadata, callback);
        } else {
            metadata = this._rename(metadata); // TODO: rename should be unnecessary if core keeps mapping of urls -> files
            this._writeMeta(metadata);
            callback(metadata);
        }
    },

    _rename: function(metadata, callback){
        utils.log('[SHAKER] - Processing assets for development env.');

        var mojit, action, dim, item, list;

        for (mojit in metadata.mojits) {
            for (action in metadata.mojits[mojit]) {
                for (dim in metadata.mojits[mojit][action].shaken) {
                    for (item in metadata.mojits[mojit][action].shaken[dim]) {
                        list = metadata.mojits[mojit][action].shaken[dim];
                        list[item] = list[item].replace(this._store._root + '/mojits', this._prefix);
                    }
                }
            }
        }

        for (action in metadata.app) {
            for (dim in metadata.app[action].shaken) {
                for (item in (list = metadata.app[action].shaken[dim])) {
                    var aux = list[item].replace(this._store._root, this._prefix + '/' + this._store._shortRoot);
                    aux = aux.replace(this._prefix + '/' + this._store._shortRoot + '/mojits', this._prefix);
                    list[item] = aux;
                }
            }
        }

        return metadata;
    },

    _queueRollups: function(queue, metadata) {
        var mojit, action, dim, files;

        queue.push(new Rollup('mojito_core', metadata.core));

        for (mojit in metadata.mojits) {
            for (action in metadata.mojits[mojit]) {
                for (dim in (files = metadata.mojits[mojit][action].shaken)) {
                    if (files[dim].length) {
                        queue.push(new Rollup(mojit + '_' + action.replace('*', 'default') + '_{checksum}', files[dim]));
                    }
                }
            }
        }

        for (action in metadata.app) {
            for (dim in (files = metadata.app[action].shaken)) {
                if (files[dim].length) {
                    queue.push(new Rollup('app_' + action.replace('*', 'default') + '_{checksum}', files[dim]));
                }
            }
        }
    },

    _compileRollups: function(metadata, compressed) {
        utils.log('[SHAKER] - Compiling rollups...');

        var self = this;
        var queue = async.queue(function(rollup, callback) {
            setTimeout(function() {
                rollup.rollup({type: self._type, config: self._config}, function(err, urls) {
                    utils.log('[SHAKER] - Pushed files ' + urls);
                    rollup._files.length = 0; // Modify the original metadata list reference
                    urls.forEach(function(url) {rollup._files.push(url);});
                    callback();
                });
            }, self._config.delay);
        }, this._config.parallel);

        queue.drain = function() {
            self._writeMeta(metadata);
            compressed(metadata);
        };

        this._queueRollups(queue, metadata);
    },

    _writeMeta:function(metadata){
        var self = this, aux = "";
        aux += 'YUI.add("shaker/metaMojits", function(Y, NAME) {\n';
        aux += 'YUI.namespace("_mojito._cache.shaker");\n';
        aux += 'YUI._mojito._cache.shaker.meta = \n';
        aux += JSON.stringify(metadata,null,'\t');
        aux += '});';

        utils.log('[SHAKER] - Writting Addon file with the metadata');
        mkdirp.sync(self._store._root + '/autoload/compiled', 0777 & (~process.umask()));
        fs.writeFileSync(self._store._root + '/autoload/compiled/shaker.server.js', aux);
    }
};

exports.Shaker = Shaker;
