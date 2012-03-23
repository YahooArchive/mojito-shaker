var State = require('../../node_modules/buildy').State,
    mobstor = require('mobstor');

/**
 * Deploy to MObStor.
 *
 * This can only apply to single string inputs.
 *
 * @method mobstorTask
 * @param options {Object} Write task options
 * @param options.name {String} Filename to write to.
 * @param status {EventEmitter} Status object, handles 'complete' and 'failed' task exit statuses.
 * @param logger {winston.Logger} Logger instance, if additional logging required (other than task exit status)
 * @return {undefined}
 * @public
 */
function mobstorTask(options, status, logger) {
    var self = this,
        name = options.name,
        host = options.host || 'playground.yahoofs.com',
        proxy = options.proxy || {
            host : "yca-proxy.corp.yahoo.com",
            port : 3128
        },
        client = mobstor.createClient({host: host, proxy: proxy});

    // Write the content to mobstor.
    function mobstorFile(filename, data) {
        client.storeFile(filename, data, function(err, status, data) {
            if (err) {
                status.emit('failed', 'mobstor', 'error deploying file: ' + err);
            } else {
                self._state.set(State.TYPES.FILES, [filename]);
                status.emit('complete', 'mobstor', 'deployed ' + filename);
            }
        });
    }

    switch (this._state.get().type) {
        case State.TYPES.FILES:
            mobstorFile(name, self._state.get().value.join("\n"));
            break;

        case State.TYPES.STRING:
            mobstorFile(name, self._state.get().value);
            break;

        case State.TYPES.STRINGS:
            mobstorFile(name, self._state.get().value.join(""));
            break;

        case State.TYPES.UNDEFINED:
            mobstorFile(name, "");
            break;

        default:
            status.emit('failed', 'mobstor', 'unrecognised input type: ' + this._type);
            break;
    }
}

exports.tasks = {
    'mobstor' : {
        callback: mobstorTask
    }
};