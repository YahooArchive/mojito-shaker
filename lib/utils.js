/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

 colors = require('./colors');

SimpleLogger = function (config) {
    config = config || {};
    this.level = config.debugLevel || SimpleLogger.MIN_LEVEL;
};

SimpleLogger.MAX_LEVEL = 5;
SimpleLogger.MIN_LEVEL = 0;

SimpleLogger.prototype = {
    debug: function (message, level) {
        level = level || SimpleLogger.MIN_LEVEL;
        if (level <= this.level) {
            console.log(message.grey);
        }
    },
    log: function (message) {
        console.log(message.blue);
    },
    success: function (message, level) {
        level = level || SimpleLogger.MIN_LEVEL;
        if (level <= this.level) {
            console.log((message + ' ✔').green.bold);
        }
        
    },
    warn: function (message) {
        console.log(('⚠ ' + message).yellow);
    },
    error: function (message) {
        console.log(('✖ ' + message).red.bold);
    },
    dump: function (obj, circular) {
        if (circular) {
            console.dir(obj);
        } else {
            console.log(JSON.stringify(obj, null, '\t'));
        }
    },
    setDebugLevel: function (level) {
        this.level = level;
    }
};

function substitute(str, arr) {
    var i, pattern, re, n = arr.length;
    for (i = 0; i < n; i++) {
        pattern = "\\{" + i + "\\}";
        re = new RegExp(pattern, "g");
        str = str.replace(re, arr[i]);
    }
    return str;
}

function arrayDiff(origin, exclude) {
    if (!exclude || !exclude.length) {
        return origin;
    }

    return origin.filter(function (i) {
        return (exclude.indexOf(i) <= -1);
    });
}

function removeDuplicates (arr) {
            var i, len = arr.length, out = [], obj = {};
            for (i = 0; i < len; i++) {
                obj[arr[i]] = 0;
            }
            for (i in obj) {
                out.push(i);
            }
            return out;
}
module.exports.SimpleLogger = SimpleLogger;
module.exports.substitute = substitute;
module.exports.arrayDiff = arrayDiff;
module.exports.removeDuplicates = removeDuplicates;
