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
}

Rollup.prototype = {
    _writeRollup: function(name, files, minify, callback) {
        var registry = new Registry();
        registry.load(__dirname + '/tasks/checksumwrite.js');
        var queue = new Queue('MojitoRollup', {registry: registry});

        queue.on('taskComplete', function(data) {
            if (data.task.type === 'checksumwrite') {
                callback(null, data.result);
            }
        });
        /*queue.on('queueComplete', function(data) {
        });
        queue.on('queueFailed', function(data) {
        });*/

        queue.task('files', files)
            .task('concat')
            .task(minify)
            .task('checksumwrite', {name: name})
            .run();
    },

    // Write rollup files for CSS and JS in parallel
    rollup: function(rollupcb) {
        var self = this,
            tasks = [];

        if (this._css.length) {
            tasks.push(function(callback) {
                self._writeRollup(self._name + '.css', self._css, 'cssminify', function(err, filename) {
                    callback(null, filename);
                });
            });
        }

        if (this._js.length) {
            tasks.push(function(callback) {
                self._writeRollup(self._name + '.js', self._js, 'jsminify', function(err, filename) {
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
    this._config.assets = this._config.assets || 'compiled/';
    this._config.writemeta = this._config.writemeta || false;
}

Shaker.prototype = {
    run: function(callback) {
        utils.log('[SHAKER] - Analizying application assets to Shake... ');
        var metadata = new ShakerCore({store: this._store}).shakeAll();

        if (this._config.deploy) {
            this._compress(metadata, callback);
        } else {
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
                for (item in metadata.app[action].shaken[dim]) {
                    list = metadata.app[action].shaken[dim];
                    list[item] = list[item].replace(this._store._root, this._static_root + app);
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
            rollup.rollup(function(err, filenames) {
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
        aux+= 'YUI.add("shaker/metaMojits", function(Y, NAME) { \n';
        aux+= 'YUI.namespace("_mojito._cache.shaker");\n';
        aux+= 'YUI._mojito._cache.shaker.meta = \n';
        aux += JSON.stringify(metadata,null,'\t');
        aux+= '});';

        mkdirp.mkdirp(self._store._root + '/autoload/compiled', 0777 & (~process.umask()), function(err, made) {
            fs.writeFile(self._store._root + '/autoload/compiled/shaker.server.js', aux, function(err) {
                utils.log('[SHAKER] - Writting Addon file with the metadata ');
            });
        });
    }
};

exports.Shaker = Shaker;
