/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

var resolve = require('path').resolve,
    ShakerCompiler = require('../lib/compiler').ShakerCompiler;


// mojito@">=0.7.0" and mojito-cli installed globally or locally
function mojitoCli(cb) {
    var args = ['start'].concat(process.argv.slice(2)),
        cwd = process.cwd(),
        fn;

    try {
    	fn = require('mojito-cli');
    } catch (err) {
    	fn = require(resolve(cwd, 'node_modules/mojito-cli'));
    }

    fn(args, cwd, cb);
}

// mojito@"<0.7.0" start command
function mojitoLib(params, options, cb) {
    var fn = require('mojito/lib/app/commands/start');

    fn.run(params, options, cb);
}

// try to invoke `mojito start` for mojito@"<0.7.0" or mojito + mojito-cli
function mojitoStart(params, options, cb) {
    try {
        mojitoCli(cb);
    } catch (err) {
        console.log(err);
        try {
            mojitoLib(params, options, cb);
        } catch (er2) {
            console.error('`mojito start` could not be invoked.');
            cb(er2.message);
        }
    }
}

function done(err, msg) {
    if (err) {
        console.error(err);
    } else {
        console.log(msg || 'Mojito started');
    }
}

/**
 * Convert a CSV string into a context object.
 * @param {string} s A string of the form: 'key1:value1,key2:value2'.
 * @return {Object} The context object after conversion.
 */
function contextCsvToObject(s) {
    'use strict';
    var ctx = {},
        pairs = s.split(','),
        pair,
        i;

    for (i = 0; i < pairs.length; i += 1) {
        pair = pairs[i].split(':');
        if (pair[0]) {
            pair[0] = pair[0].trim();
            if (!pair[1]) {
                console.warn('Missing value for context key: ' + pair[0]);
            } else {
                pair[1] = pair[1].trim();
                ctx[pair[0]] = pair[1];
            }
        }
    }

    return ctx;
}

/**
 * Standard usage string export.
 */
exports.usage = '\nShaker Options:\n' +
    '  --context  A comma-separated list of key:value pairs that define the base\n' +
    '             context used to read configuration files (e.g. "environment:dev")\n' +
    '  --run      Run the Mojito server after running the Shaker compiler\n';

/**
 * Standard options list export.
 */
exports.options = [
    {
        longName: 'context',
        shortName: null,
        hasValue: true
    },
    {
        longName: 'run',
        shortName: null,
        hasValue: false
    },
    {
        longName: 'help',
        shortName: null,
        hasValue: false
    },
    {
        longName: 'debug',
        shortName: null,
        hasValue: true
    }

];

/**
 * Standard run method hook export.
 * @param {Array} params An array of optional parameters.
 * @param {object} opts Options/flags for the command.
 * @param {function} callback An optional callback to invoke on completion.
 */
exports.run = function (params, options) {
    'use strict';
    options = options || {};
    var context = {},
        compiler,
        debug = options.debug || 0;

    if (options.context) {
        context = contextCsvToObject(options.context);
    }

    if (options.help) {
        console.log(this.usage);
        return;
    }

    // shaker compiler
    process.shakerCompiler = true;

    compiler = new ShakerCompiler(context);
    compiler.compile(function (err) {
        process.shakerCompiler = false;
        if (err) {
            // disable logger to prevent further messages after a failure
            compiler.logger.log = function () {};
            console.error('Shaker compilation failed: ' + err);
        } else {
            console.log('Shaker compilation done.');
            if (options.run) {
                delete options.run;
                mojitoStart(params, options, done);
            }
        }
    });
};
