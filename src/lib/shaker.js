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

        if (options.concat) {
            queue.task('concat');
        }

        if (options.minify) {
            queue.task(options.minify_task);
        }

        if (options.push) {
            queue.task(options.push.type, {name: options.name, config: options.push.config});
        }

        queue.on('taskComplete', function(data) { // queueFailed, queueComplete
            if (data.task.type === options.push.type) {
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
                    concat: true,
                    minify: true,
                    minify_task: 'cssminify',
                    push: options.push
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
                    concat: true,
                    minify: true,
                    minify_task: 'jsminify',
                    push: options.push
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

    this._static_root = '/static/';

    this._config = this._store.getAppConfig(null, 'definition').shaker || {};

    this._config.deploy = this._config.deploy || false;
    this._config.minify = this._config.minify || false;
    this._config.compile = this._config.compile || false;
    this._config.assets = this._config.assets || 'assets/compiled/';
    this._config.writemeta = this._config.writemeta || true;
    this._config.push = this._config.push || {type: 'local'};
}

Shaker.prototype = {
    run: function(callback) {
        utils.log('[SHAKER] - Analizying application assets to Shake... ');
        var metadata = new ShakerCore({store: this._store}).shakeAll();

        if (this._config.compile) {
            this._compress(metadata, callback);
        } else {
            // TODO: rename should be unnecessary if core keeps mapping of urls -> files
            metadata = this._rename(metadata);

            if (this._config.writemeta) {
                this._writeMeta(metadata);
            }

            callback(metadata);
        }
    },

    _rename: function(metadata, callback){
        var mojit, action, dim, item, list,
            app = path.basename(this._store._root);

        utils.log('[SHAKER] - Processing assets for development env.');

        // Process core

        for (mojit in metadata.mojits) {
            for (action in metadata.mojits[mojit]) {
                for (dim in metadata.mojits[mojit][action].shaken) {
                    for (item in metadata.mojits[mojit][action].shaken[dim]) {
                        list = metadata.mojits[mojit][action].shaken[dim];
                        list[item] = list[item].replace(this._store._root + '/mojits/', this._static_root);
                    }
                }
            }
        }

        for (action in metadata.app) {
            for (dim in metadata.app[action].shaken) {
                for (item in (list = metadata.app[action].shaken[dim])) {
                    var aux = list[item].replace(this._store._root, this._static_root + app);
                    aux = aux.replace(this._static_root+app+'/mojits/',this._static_root);
                    list[item] = aux;
                }
            }
        }

        return metadata;
    },

    _createRollups: function(metadata) {
        var mojit, action, dim, name, list, rollups = [];

        rollups.push(new Rollup(this._config.assets + 'mojito_core', metadata.core));

        for (mojit in metadata.mojits) {
            for (action in metadata.mojits[mojit]) {
                for (dim in metadata.mojits[mojit][action].shaken) {
                    name = this._config.assets + mojit + '_' + action.replace('*', 'default') + '_' + dim.replace('*', 'default') + '_{checksum}';
                    list = metadata.mojits[mojit][action].shaken[dim];
                    if (list.length) {
                        rollups.push(new Rollup(name, list));
                    }
                }
            }
        }

        for (action in metadata.app) {
            for (dim in metadata.app[action].shaken) {
                name = this._config.assets + 'app_' + action.replace('*', 'default') + '_' + dim.replace('*', 'default') + '_{checksum}';
                list = metadata.app[action].shaken[dim];
                if (list.length) {
                    rollups.push(new Rollup(name, list));
                }
            }
        }

        return rollups;
    },

    _compress: function(metadata, compresscb) {
        var app = path.basename(this._store._root),
            self = this;

        utils.log('[SHAKER] - Minifying and optimizing rollups...');

        // Process rollup assets
        async.forEach(this._createRollups(metadata), function(rollup, processedcb) {
            rollup.rollup({push: self._config.push}, function(err, filenames) {
                var files = rollup._files;
                var urls = filenames.map(function(filename) {
                    return self._static_root + app + '/' + filename;
                });

                // Modify the metadata list reference
                files.length = 0;
                // FIXME: files.concat(urls) is not working :(
                for (var i = 0; i < urls.length; i++) {files.push(urls[i]);}

                processedcb();
            });
        }, function(err) {
            if (self._config.writemeta) {
                self._writeMeta(metadata);
            }

            compresscb(metadata);
        });
    },

    _writeMeta:function(metadata){
        var self = this, aux = "";
        aux += 'YUI.add("shaker/metaMojits", function(Y, NAME) {\n';
        aux += 'YUI.namespace("_mojito._cache.shaker");\n';
        aux += 'YUI._mojito._cache.shaker.meta = \n';
        aux += JSON.stringify(metadata,null,'\t');
        aux += '});';

        utils.log('[SHAKER] - Writting Addon file with the metadata ');
        mkdirp.sync(self._store._root + '/autoload/compiled', 0777 & (~process.umask()));
        fs.writeFileSync(self._store._root + '/autoload/compiled/shaker.server.js', aux);
    }
};

exports.Shaker = Shaker;
