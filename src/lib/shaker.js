var path = require('path'),
    utils = require('mojito/lib/management/utils'),
    fs = require('fs'),
    Queue = require('buildy').Queue,
    Registry = require('buildy').Registry,
    ShakerCore = require('./core').ShakerCore,
    async = require('async');

function Rollup() {
    this._js = [];
    this._css = [];
}

Rollup.prototype = {
    addJS: function(file) {
        this._js.push(file);
    },

    addCSS: function(file) {
        this._css.push(file);
    },

    add: function(files) {
        files.forEach(function(file) {
            var ext = path.extname(file);
            if (ext === '.js') {
                this.addJS(file);
            }
            else if (ext === '.css') {
                this.addCSS(file);
            }
        }, this);
    },

    processJS: function(name, callback) {
        if (this._js.length) {
            this._process(name, this._js, '.js', callback);
        }
        else {
            callback(true);
        }
    },

    processCSS: function(name, callback) {
        if (this._css.length) {
            this._process(name, this._css, '.css', callback);
        }
        else {
            callback(true);
        }
    },

    _process: function(name, files, ext, callback) {
        var registry = new Registry();
        registry.load(__dirname + '/tasks/checksumwrite.js');
        var queue = new Queue('MojitoRollup', {registry: registry});

        queue.on('taskComplete', function(data) {
            if (data.task.type === 'checksumwrite') {
                callback(null, data.result);
            }
        });
        /*queue.on('queueComplete', function(data) {
            callback(queue);
        });
        queue.on('queueFailed', function(data) {
            callback(queue);
        });
        this.emit('queueFailed',*/

        queue.task('files', files)
            .task('concat')
            .task(ext === '.js' ? 'jsminify' : 'cssminify')
            .task('checksumwrite', {name: name})
            .run();
    }
};

function Shaker(store) {
    this._store = store;

    this._static_root = '/static/';

    this._config = this._store.getAppConfig(null, 'definition').shaker || {};

    this._config.deploy = this._config.deploy || false;
    this._config.minify = this._config.minify || false;
    this._config.assets = this._config.assets || 'compiled/';
}

Shaker.prototype = {
    run: function(callback) {
        this._callback = callback;
        this._rollupCore();

        var shaker = new ShakerCore({store: this._store});
        utils.log('[SHAKER] - Analizying application assets to Shake... ');
        shaker.shakeAll(this.onShake.bind(this));
    },

    _rollupCore: function() {
        var rollup = new Rollup(),
            files;

        files = this._store.getRollupsApp('client', {}).srcs;

        files.forEach(function(file) {
            // Skip the app level files (Note: to override path: substr(this._root.length + 1);)
            if (this._store._root !== file.substr(0, this._store._root.length)) {
                rollup.addJS(file);
            }
        }, this);

        rollup.processJS(this._config.assets + 'mojito_core.js', function(err, filename) {
            if (filename) {
                utils.log('[SHAKER] - Created rollup for mojito-core in: ' + filename);
            }
        });
    },

    onShake: function(metadata) {
        //console.log(JSON.stringify(metadata));
        if (this._config.deploy) {
            utils.log('[SHAKER] - Minifying and optimizing rollups...');
            this.compress(metadata, this._callback);
        } else {
            utils.log('[SHAKER] - Processing assets for development env.');
            this.rename(metadata, this._callback);
        }
    },

    rename: function(metadata, callback){
        var mojit, action, dim, item, list,
            app = path.basename(this._store._root);

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

        callback(metadata, {});
    },

    _flattenMetaData: function(metadata) {
        var mojit, action, dim, flattened = [];

        for (mojit in metadata.mojits) {
            for (action in metadata.mojits[mojit]) {
                for (dim in metadata.mojits[mojit][action].shaken) {
                    flattened.push({type: 'mojit', name: mojit, action: action, dim: dim, list: metadata.mojits[mojit][action].shaken[dim]});
                }
            }
        }

        for (action in metadata.app) {
            for (dim in metadata.app[action].shaken) {
                flattened.push({type: 'app', name: 'app', action: action, dim: dim, list: metadata.app[action].shaken[dim]});
            }
        }

        return flattened;
    },

    compress: function(metadata, compresscb) {
        var app = path.basename(this._store._root),
            static_files = {},
            self = this;

        // Convert lists of intermingled JS/CSS files into separate JS/CSS rollups.
        async.forEach(this._flattenMetaData(metadata), function(item, listcb) {
            if (!item.list.length) {
                listcb();
                return;
            }
            
            var rollup = new Rollup();
            rollup.add(item.list);

            var name = self._config.assets + item.name + '_' + item.action.replace('*', 'default') + '_' + item.dim.replace('*', 'default') + '_{checksum}';

            // Write rollup files for CSS and JS in parallel
            async.parallel([
                function(callback) {    // Write CSS rollup
                    rollup.processCSS(name + '.css', function(err, filename) {
                        if (err) {
                            callback(true);
                            return;
                        }
                        var url = self._static_root + app + '/' + filename;
                        static_files[url] = self._store._root + '/' + filename;
                        callback(null, url);
                    });
                },
                function(callback) {    // Write JS rollup
                    rollup.processJS(name + '.js', function(err, filename) {
                        if (err) {
                            callback(true);
                            return;
                        }
                        var url = self._static_root + app + '/' + filename;
                        static_files[url] = self._store._root + '/' + filename;
                        callback(null, url);
                    });
                }
            ], function(err, urls) {
                item.list.length = 0;
                item.list.concat(urls);
                listcb();
            });
        }, function(err) {
            compresscb(metadata, static_files);
        });
    }
};

exports.Shaker = Shaker;
