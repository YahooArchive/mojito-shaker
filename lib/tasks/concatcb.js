/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
 var State = require('buildy').State,
    fs     = require('fs');

/**
 * Concatenate one or more files to a destination file or string.
 *
 * @param destfile {null|String} A null value will return the output instead of writing it to a filename.
 * @param sourcefiles {Array} array of files to read and concatenate.
 * @param encoding {String} source file encoding (default "utf8")
 * @return {String} Concatenated output
 */
function concatcbFilesSync(callback, destfile, sourcefiles, encoding) {
    var content  = '',
        encoding = encoding || 'utf8';

    try {
        sourcefiles.forEach(function(f) {
            // Sometimes the file contains nothing, which is substituted with a zero-length string.
            // We use synchronous file reading because usually the author intends to keep the ordering.
            content += callback(f, fs.readFileSync(f, encoding)) || '';
        });
    } catch(e) {
        throw new Error('Could not read the files to be concatenated : ' + sourcefiles.toString() + ' ' + e);
    }

    try {
        if (destfile === null) {
            return content;
        } else {
            fs.writeFileSync(dest, content, encoding);
        }
    } catch(e) {
        throw new Error('Could not write the file to be concatenated :' + destfile);
    }
}

/**
 * Concatenate the input
 *
 * This task can be performed on files or strings.
 * Asynchronous concatenation is never performed, because you would lose the intended ordering.
 *
 * The default output type is string, because it is better and
 * easier to work with the in-memory representation of the concat output.
 *
 * @param params {Object} [optional] containing "dest" property if an output file is desired. "encoding" property if not using utf8
 * @param status {EventEmitter} Status object, handles 'complete' and 'failed' task exit statuses.
 * @param logger {winston.Logger} Logger instance, if additional logging required (other than task exit status)
 */
function concatcbTask(params, status, logger) {
    var destination = params && params.dest || null,
        encoding = params && params.encoding || 'utf8',
        callback = params && params.callback || function(f, s) {return s;};

    switch (this._state.get().type) {

        case State.TYPES.STRINGS:
            this._state.set(State.TYPES.STRING, this._state.get().value.join(''));

            status.emit('complete', 'concatcb', this._state.get().value.length + ' characters.');
            break;

        case State.TYPES.FILES:
            var concatString = concatcbFilesSync(callback, destination, this._state.get().value, encoding);
            this._state.set(State.TYPES.STRING, concatString);

            status.emit('complete', 'concatcb', concatString);
            break;

        case State.TYPES.STRING:
            status.emit('complete', 'concatcb', 'did not concatenate single string');
            break;

        default:
            status.emit('failed', 'concatcb', 'unrecognised input type: ' + this._type);
            break;
    }
}

// Export the task
exports.tasks = {
    'concatcb' : {
        callback: concatcbTask
    }
};