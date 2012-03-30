var path = require('path'),
    utils = require('mojito/lib/management/utils'),
    fs = require('fs'),
    ResourceStore = require('mojito/lib/store.server'),
    Queue = require('buildy').Queue,
    Registry = require('buildy').Registry,
    ShakerCore = require('./core').Shaker;

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

    onShake: function(shaken) {
        if (this._stage) {
            utils.log('[SHAKER] - Minifying and optimizing rollups...');
            compress(shaken, writeMetaData);
        } else {
            utils.log('[SHAKER] - Processing assets for development env.');
            this.rename(shaken, writeMetaData);
        }
    },

    rename: function(shaken,callback){
        var mojit,mojits,action,actions,dim,list,actionName,dimensions,item,
            app = path.basename(process.cwd());
        for(mojit in (mojits = shaken.mojits)){
            for(action in (actions = mojits[mojit])){
                for(dim in (dimensions = actions[action].shaken)){
                    for(item in (list = dimensions[dim])){
                        list[item] = list[item].replace('./mojits','/static');
                    }
                }
            }
        }
        for(action in (actions = shaken.app)){
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
        callback(shaken);
    }
};

function compress(shaken,callback){
            var mojit,mojits,action,actions,dim,list,actionName,dimensions,counter = 0,
                app = path.basename(process.cwd());
                wrap = function(list,mojit,action,actionName,dim){
                    var rollup = new Rollup();
                    rollup.setCSS(list);
                    // FIXME: WTF counter :(
                    rollup.processCSS('assets/r/'+mojit+'_'+actionName+'_'+dim, function(fileName){
                        if(mojit !== 'app'){
                            shaken.mojits[mojit][action].shaken[dim] = ['/static/'+app+'/'+fileName];
                        }else{
                            shaken.app[action].shaken[dim] = ['/static/'+app+'/'+fileName];
                        }
                        if(!--counter) {
                            callback(shaken);
                        }
                    });
                };

            for(mojit in (mojits = shaken.mojits)){
                for(action in (actions = mojits[mojit])){
                    for(dim in (dimensions = actions[action].shaken)){
                        list = dimensions[dim];
                        actionName = action == '*' ? 'default' : action;
                        //console.log(counter +') '+mojit+'_'+actionName+'_'+dim);
                        if(list.length) {
                            counter++;
                            wrap(list,mojit,action,actionName,dim);
                        }
                    }
                }
            }
            for(action in (actions = shaken.app)){
                for(dim in (dimensions = actions[action].shaken)){
                    list = dimensions[dim];
                    actionName = action == '*' ? 'default' : action;
                    if(list.length) {
                        counter++;
                        wrap(list,'app',action,actionName,dim);
                    }
                }
            }
        }

function writeMetaData(shaken){
    utils.log('[SHAKER] - Writing processed metadata in autoload.');
     var aux = "";
        aux+= 'YUI.add("shaker/metaMojits", function(Y, NAME) { \n';
        aux+= 'YUI.namespace("_mojito._cache.shaker");\n';
        aux+= 'YUI._mojito._cache.shaker.meta = \n';
        aux += JSON.stringify(shaken,null,'\t');
        aux+= '});';
    fs.writeFileSync('autoload/compiled/shaker/shaker-meta.server.js',aux);
}

function buildShaker(params,options,callback){
    require(process.cwd()+'/node_modules/shaker');
}

exports.Shaker = Shaker;
