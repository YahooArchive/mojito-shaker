/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

var utils = require('mojito/lib/management/utils'),
    mojitoStart = require('mojito/lib/app/commands/start'),
    ShakerCompiler = require('../lib/compiler').ShakerCompiler;

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
            if (!pair[1]) {
                utils.warn('Missing value for context key: ' + pair[0]);
            } else {
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
        if (err) {
            // disable logger to prevent further messages after a failure
            compiler.logger.log = function () {};
            utils.error('Shaker compilation failed: ' + err);
        } else {
            utils.success('Shaker compilation done.');
            if (options.run) {
                delete options.run;
                mojitoStart.run(params, options, function (err) {
                    if (err) {
                        utils.error(err);
                    } else {
                        utils.success('Mojito done.');
                    }
                });
            }
        }
    });
};
