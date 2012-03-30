/*
* Shaker command!
*/
var Shaker = require('./lib/shaker').Shaker,
    usage,
    options,
    run;

usage =  "mojito shaker {options}\n" +
       "\nOPTIONS: \n" +
       "\t --stage     :  Rollup and minify assets\n";

options = [
    {
        shortName: 'st',
        longName: 'stage',
        hasValue: false
    }
];

run = function(params, options, callback) {
    new Shaker(options).run();
};

exports.usage = usage;
exports.options = options;
exports.run = run;
