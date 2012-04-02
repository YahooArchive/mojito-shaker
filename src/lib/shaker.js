var path = require('path'),
    utils = require('mojito/lib/management/utils'),
    fs = require('fs'),
    ResourceStore = require('mojito/lib/store.server'),
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

    setJS: function(files) {
        this._js = files;
    },

    processJS: function(name, callback) {
        this._process(name, this._js, '.js', callback);
    },

    addCSS: function(file) {
        this._css.push(file);
    },

    setCSS: function(files) {
        this._css = files;
    },

    processCSS: function(name, callback) {
        this._process(name, this._css, '.css', callback);
    },

    _process: function(name, files, ext, callback) {
        var registry = new Registry();
        registry.load(__dirname + '/tasks/checksumwrite.js');
        var queue = new Queue('MojitoRollup', {registry: registry});

        queue.on('taskComplete', function(data) {
            if (data.task.type === 'checksumwrite') {
                callback(data.result);
            }
        });

        queue.task('files', files)
            .task('concat')
            .task(ext === '.js' ? 'jsminify' : 'cssminify')
            .task('checksumwrite', {name: name + '_{checksum}' + ext})
            .run();
    }
};

function Shaker(options) {
    var opts = options || {};
    this._root = opts.root || process.cwd();
    this._stage = opts.stage || false;
}

Shaker.prototype = {
    run: function() {
        this.rollupMojito();

        var shaker = new ShakerCore({root: './'});
        utils.log('[SHAKER] - Analizying application assets to Shake... ');
        shaker.shakeAll(this.onShake.bind(this));
    },

    rollupMojito: function() {
        var store = new ResourceStore(this._root),
            rollup = new Rollup(),
            files;

        store.preload();
        files = store.getRollupsApp('client', {}).srcs;

        files.forEach(function(file) {
            // Skip the app level files (Note: to override path: substr(this._root.length + 1);)
            if (this._root !== file.substr(0, this._root.length)) {
                rollup.addJS(file);
            }
        }, this);

        rollup.processJS('assets/mojito/mojito_rollup_full', function(filename) {
            utils.log('[SHAKER] - Created rollup for mojito-core in: ' + filename);
        });
    },

    onShake: function(metadata) {
        if (this._stage) {
            utils.log('[SHAKER] - Minifying and optimizing rollups...');
            this.compress(metadata, this.writeMetaData);
        } else {
            utils.log('[SHAKER] - Processing assets for development env.');
            this.rename(metadata, this.writeMetaData);
        }
    },

    rename: function(metadata,callback){
        var mojit,mojits,action,actions,dim,list,actionName,dimensions,item,
            app = path.basename(process.cwd());
        for(mojit in (mojits = metadata.mojits)){
            for(action in (actions = mojits[mojit])){
                for(dim in (dimensions = actions[action].shaken)){
                    for(item in (list = dimensions[dim])){
                        list[item] = list[item].replace('./mojits','/static');
                    }
                }
            }
        }
        for(action in (actions = metadata.app)){
            for(dim in (dimensions = actions[action].shaken)){
                for(item in (list = dimensions[dim])){
                        var tmp = list[item];
                        tmp = tmp.replace('./mojits/','/static/');
                        tmp = tmp.replace('./','/static/'+app+'/');
                        //console.log(list[item] + '=>' + tmp);
                        list[item] = tmp;
                }
            }
        }
        callback(metadata);
    },

    _flattenMetaData: function(metadata) {
        var mojit, action, dim, flattened = [];

        for (mojit in metadata.mojits) {
            for (action in metadata.mojits[mojit]) {
                for (dim in metadata.mojits[mojit][action].shaken) {
                    flattened.push({type: 'mojit', name: mojit, action: action, dim: dim, list: metadata.mojits[mojit][action].shaken[dim], meta: metadata.app[action].meta});
                }
            }
        }

        for (action in metadata.app) {
            for (dim in metadata.app[action].shaken) {
                flattened.push({type: 'app', name: 'app', action: action, dim: dim, list: metadata.app[action].shaken[dim], meta: metadata.app[action].meta, app_mojits: metadata.app[action].mojits});
            }
        }

        return flattened;
    },

    compress: function(metadata, compressed) {
        var app = path.basename(this._root);

        async.forEach(this._flattenMetaData(metadata), function(item, callback) {
            if (!item.list.length) {
                callback();
                return;
            }
            
            var rollup = new Rollup();
            rollup.setCSS(item.list);
            var name = 'assets/r/' + item.name + '_' + item.action.replace('*', 'default') + '_' + item.dim.replace('*', 'default');
            rollup.processCSS(name, function(filename) {
                item.list.length = 0;
                item.list.push('/static/' + app + '/' + filename);
                callback();
            });
        }, function(err) {
            compressed(metadata);
        }.bind(this));
    },
    
    writeMetaData: function(metadata) {
        utils.log('[SHAKER] - Writing processed metadata in autoload.');
         var aux = "";
            aux+= 'YUI.add("shaker/metaMojits", function(Y, NAME) { \n';
            aux+= 'YUI.namespace("_mojito._cache.shaker");\n';
            aux+= 'YUI._mojito._cache.shaker.meta = \n';
            aux += JSON.stringify(metadata,null,'\t');
            aux+= '});';
        fs.writeFile('autoload/compiled/shaker/shaker-meta.server.js',aux);
    }
};

exports.Shaker = Shaker;
