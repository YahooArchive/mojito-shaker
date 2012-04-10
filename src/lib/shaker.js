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
    _pushRollup: function(name, files, options, callback) {
        var queue = new Queue('Rollup', {registry: Rollup.REGISTRY});

        queue.task('files', files);

        if (options.concat) {
            queue.task('concat');
        }

        if (options.minify) {
            queue.task(path.extname(name) === '.js' ? 'jsminify' : 'cssminify');
        }

        options.config.name = name;
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
                self._pushRollup(self._name + '.css', self._css, options, function(err, filename) {
                    callback(null, filename);
                });
            });
        }

        if (this._js.length) {
            tasks.push(function(callback) {
                self._pushRollup(self._name + '.js', self._js, options, function(err, filename) {
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

    var shaker = config.shaker || {};
    this._type = shaker.type || 'local';
    this._compile = config.shaker !== undefined;
    this._parallel = shaker.parallel || 20;
    this._delay = shaker.delay || 0;
    this._concat = shaker.concat || true;
    this._minify = shaker.minify || true;
    this._config = shaker.config || {};
    this._config.root = this._config.root || 'assets/compiled/';
    this._config.staticRoot = this._prefix + '/' + this._store._shortRoot + '/' + this._config.root;
}

Shaker.prototype = {
    run: function(callback) {
        utils.log('[SHAKER] - Analizying application assets to Shake... ');
        var metadata = new ShakerCore({store: this._store}).shakeAll();

        if (this._compile) {
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
                var options = {type: self._type, concat: self._concat, minify: self._minify, config: self._config};
                rollup.rollup(options, function(err, urls) {
                    utils.log('[SHAKER] - Pushed files ' + urls);
                    rollup._files.length = 0; // Modify the original metadata list reference
                    urls.forEach(function(url) {rollup._files.push(url);});
                    callback();
                });
            }, self._delay);
        }, this._parallel);

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
