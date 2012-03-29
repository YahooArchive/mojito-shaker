/*
* Shaker command!
*/
var usage,
    options,
    run;

usage =  "mojito shaker {options} {type}\n" +
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

run = function(params, options, callback) {
    new Shaker(options).run();
};

exports.usage = usage;
exports.options = options;
exports.run = run;
