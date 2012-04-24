/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/**
 * Read file to string
 *
 * ---
 * INPUTS:
 *
 *  - FILES
 *  Read the list of files.
 *
 * OUTPUT:
 *
 *  - STRING
 *  The file content.
 * ---
 */

var State = require('buildy').State,
    path   = require('path'),
    fs     = require('fs');

/**
 * Read the file content.
 *
 * @method readTask
 * @param status {EventEmitter} Status object, handles 'complete' and 'failed' task exit statuses.
 * @param logger {winston.Logger} Logger instance, if additional logging required (other than task exit status)
 * @return {undefined}
 * @public
 */
function readTask(options, status, logger) {
    var self = this;

    function readFile(filename) {
        fs.readFile(filename, function (err, data) {
            if (err) {
                status.emit('failed', 'read', 'error reading destination file: ' + err);
            } else {
                self._state.set(State.TYPES.STRING, data);
                status.emit('complete', 'read', 'read ' + filename);
            }
        });
    }

    switch (this._state.get().type) {

    case State.TYPES.FILES:
        readFile(self._state.get().value.join("\n"));
        break;

    default:
        status.emit('failed', 'read', 'unrecognised input type: ' + this._type);
        break;
    }
}

exports.tasks = {
    'read' : {
        callback: readTask
    }
};
