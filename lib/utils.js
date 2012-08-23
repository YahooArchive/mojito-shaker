/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
SimpleLogger = function () {
    this.enabled = false;
};
SimpleLogger.prototype = {
    log: function () {
    },
    error: function () {
    },
    dump: function (obj, circular) {
        if (circular) {
            console.dir(obj);
        } else {
            console.log(JSON.stringify(obj, null, '\t'));
        }
    },
    debug: function () {

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
