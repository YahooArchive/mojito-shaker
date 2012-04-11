var path = require('path'),
    utils = require('mojito/lib/management/utils'),
    fs = require('fs'),
    Queue = require('buildy').Queue,
    Registry = require('buildy').Registry,
    ShakerCore = require('./core').ShakerCore,
    async = require('async'),
    mkdirp = require('mkdirp');

function Image(name, file) {
    this._name = name;
    this._file = file;
}

Image.prototype = {
    push: function(registry, options, callback) {
        var queue = new Queue('Rollup', {registry: registry});

        queue.task('files', [this._file]);

        options.config.name = this._name;
        queue.task(options.type, options.config);

        queue.on('taskComplete', function(data) { // queueFailed, queueComplete
            if (data.task.type === options.type) {
                callback(null, data.result);
            }
        });

        queue.run();
    }
};

function Rollup(name, files) {
    this._name = name;
    this._files = files;
}

Rollup.prototype = {
    push: function(registry, options, callback) {
        var queue = new Queue('Rollup', {registry: registry});

        queue.task('files', this._files);

        if (options.concat) {
            queue.task('concat');
        }

        if (options.minify) {
            queue.task(path.extname(this._name) === '.js' ? 'jsminify' : 'cssminify');
        }

        options.config.name = this._name;
        queue.task(options.type, options.config);

        queue.on('taskComplete', function(data) { // queueFailed, queueComplete
            if (data.task.type === options.type) {
                callback(null, data.result);
            }
        });

        queue.run();
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

Shaker.TASKS_DIR = __dirname + '/tasks/';

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
        var mojit, action, dim, files, name, filtered;

        metadata.images.forEach(function(image) {
            queue.push({object: new Image(path.basename(image), image), files: metadata.images});
        });
        metadata.images.length = 0;

        queue.push({object: new Rollup('mojito_core.js', metadata.core.slice() /* Clone array */), files: metadata.core});
        metadata.core.length = 0;

        for (mojit in metadata.mojits) {
            for (action in metadata.mojits[mojit]) {
                for (dim in (files = metadata.mojits[mojit][action].shaken)) {
                    if (files[dim].length) {
                        name = mojit + '_' + action.replace('*', 'default') + '_{checksum}';
                        filtered = this._filterFiles(files[dim]);

                        if (filtered.js.length) {
                            queue.push({object: new Rollup(name + '.js', filtered.js), files: files[dim]});
                        }
                        if (filtered.css.length) {
                            queue.push({object: new Rollup(name + '.css', filtered.css), files: files[dim]});
                        }
                        files[dim].length = 0;
                    }
                }
            }
        }

        for (action in metadata.app) {
            for (dim in (files = metadata.app[action].shaken)) {
                if (files[dim].length) {
                    name = 'app_' + action.replace('*', 'default') + '_{checksum}';
                    filtered = this._filterFiles(files[dim]);

                    if (filtered.js.length) {
                        queue.push({object: new Rollup(name + '.js', filtered.js), files: files[dim]});
                    }
                    if (filtered.css.length) {
                        queue.push({object: new Rollup(name + '.css', filtered.css), files: files[dim]});
                    }
                    files[dim].length = 0;
                }
            }
        }
    },

    _filterFiles: function(files) {
        var js = [], css = [];

        files.forEach(function(file) {
            var ext = path.extname(file);

            if (ext === '.js') {
                js.push(file);
            }
            else if (ext === '.css') {
                css.push(file);
            }
        });

        return {'js': js, 'css': css};
    },

    _compileRollups: function(metadata, compressed) {
        utils.log('[SHAKER] - Compiling rollups...');

        var registry = new Registry();
        registry.load(Shaker.TASKS_DIR);

        var self = this;
        var queue = async.queue(function(item, callback) {
            setTimeout(function() {
                var options = {type: self._type, concat: self._concat, minify: self._minify, config: self._config};
                item.object.push(registry, options, function(err, url) {
                    utils.log('[SHAKER] - Pushed file ' + url);
                    item.files.push(url);
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
