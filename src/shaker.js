/*
* Shaker command!
*/
var path = require('path'),
    utils = require('mojito/lib/management/utils'),
    fs = require('fs'),
	ResourceStore = require('mojito/lib/store.server'),

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
	//get an filter the files from the store
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
    	console.log(rolledModules);
    }

	
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
