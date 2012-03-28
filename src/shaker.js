/*
* Shaker command!
*/
var path = require('path'),
    utils = require('mojito/lib/management/utils'),
    fs = require('fs'),
	ResourceStore = require('mojito/lib/store.server'),
    Queue = require('buildy').Queue,
    Registry = require('buildy').Registry,
    Shaker = require('./lib/core').Shaker,

    run,usage,options,

/* GLOBAL */
    MODULES_BAREBONES = [];


usage =  "mojito compile {options} {type}\n" +
       "\nOPTIONS: \n" +
       "\t --rollup-mojito     :  remove all compiled files, instead of creating them\n" +
       "\t  -rm                :  short for --rollup-mojito\n" +
       "\t --output     :  send the output to a specific folder\n" +
       "\t  -rm                :  short for --output\n" +

		"\nTYPES: \n" +
		"\t all                    performs all the other types\n";

options = [
    {
        shortName: 'rm',
        longName: 'rollup-mojito',
        hasValue: false
    },
    {
        shortName: 'o',
        longName: 'output',
        hasValue: false
    },
    {
        shortName: 'st',
        longName: 'stage',
        hasValue: false
    },
    {
        shortName: 's',
        longName: 'setup',
        hasValue: false
    },
    {
        shortName: 'b',
        longName: 'build',
        hasValue: false
    }
];

function rollupMojito(params,options,callback){
	var type = params.shift(),list;
	if(!type) {
		utils.error("Please provide the type of rollup you want.", exports.usage, true);
		return;
	}
	switch(type){
		case 'full': break;
		case 'barebones': list = MODULES_BAREBONES ;break;
		case 'modules' : list = ['modules']; break;
		default: utils.error("Please provide a valid type of rollup.", exports.usage, true); return;
	}
	options.outputPath = options.output ? params.shift(): true;
	options.type = type;
	generateRollup(list,options,callback);

}

function generateRollup(list,options,callback){
	var cwd = process.cwd(),
		store = new ResourceStore(cwd),
		dest = options.outputPath || cwd+'/artifacts/shaker',
		fileName = 'rollup_'+ options.type + '.js',
		modules,rolledModules = [],rollupBody = '',
		context = {},
		filterModules = function (item){
			var moduleName = path.basename(i,'.js');
			for(var i = 0; i < list.length; i++){
				if(moduleName === list[item]) return true;
			}
			return false;
		};
	//get and filter the files from the store
	store.preload();
	var rollupMojito = (store.getRollupsApp('client', context)).srcs;
	modules = list ? rollupMojito.filter(filterModules) : rollupMojito;
	for(var j = 0; j < modules.length; j++){
		if(cwd === modules[j].substr(0, cwd.length)) {
            //skip the app level files (Note: to override path: substr(cwd.length + 1);)
            continue;
        }
        rolledModules.push(modules[j]);
        rollupBody += fs.readFileSync(modules[j], 'utf-8');
    }

    //output a file
    if(options.output){
			utils.makeDir(dest);
			fs.writeFileSync(dest+'/'+fileName, rollupBody, 'utf-8');
			callback();
    }
    //output inline
    else{
        //create mojito-core rollup
        processRollup(rolledModules, 'assets/mojito/mojito_rollup_full', '.js', function(filename) {
            transformedRollup(filename);
        });

        //shaker stuff
        var shaker = new Shaker({root: './'});
        utils.log('[SHAKER] - Analizying application assets to Shake... ');
        shaker.shakeAll(function(shaken){
            if(options.stage || options.production){
                compress(shaken,function(shaken_p){
                    utils.log('[SHAKER] - Minifying and optimizing rollups... ');
                    writeMetaData(shaken_p,callback);
                });
            }else{//dev
                rename(shaken,function(shaken_r){
                    utils.log('[SHAKER] - Processed assets for development env. ');
                    writeMetaData(shaken_r,callback);
                });
            }
        });
    }
}
function rename(shaken,callback){
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

function compress(shaken,callback){
            var mojit,mojits,action,actions,dim,list,actionName,dimensions,counter = 0,
                app = path.basename(process.cwd());
                wrap = function(list,mojit,action,actionName,dim){
                    processRollup(list,'assets/r/'+mojit+'_'+actionName+'_'+dim,'.css',function(fileName){
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

function writeMetaData(shaken,callback){
    utils.log('[SHAKER] - Writing processed metadata in autoload.');
     var aux = "";
        aux+= 'YUI.add("shaker/metaMojits", function(Y, NAME) { \n';
        aux+= 'YUI.namespace("_mojito._cache.shaker");\n';
        aux+= 'YUI._mojito._cache.shaker.meta = \n';
        aux += JSON.stringify(shaken,null,'\t');
        aux+= '});';
    fs.writeFile('autoload/compiled/shaker/shaker-meta.server.js',aux);
    callback();
}


function transformedRollup(filename) {
    utils.log('[SHAKER] - Created rollup for mojito-core in: '+filename);
}

function processRollup(files, name, ext, callback) {
    var registry = new Registry();
    registry.load(__dirname + '/lib/tasks/checksumwrite.js');

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

function buildShaker(params,options,callback){
	require(process.cwd()+'/node_modules/shaker');
}

run = function(params, options, callback){
	var context = {};
	options = options || {};

	switch(true){
		case options['rollup-mojito'] :  rollupMojito(params,options,callback); break;
		//case options.setup : setupShaker(params); break;
		case options.build : buildShaker(); break;
		default: utils.error("Please provide the type of compilation you want.", exports.usage, true);
	}
};

exports.usage = usage;
exports.options = options;
exports.run = run;
