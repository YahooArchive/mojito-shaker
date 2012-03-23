var State = require('../../node_modules/buildy').State,fs     = require('fs');

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
        name = options.name;

    function connect() {
        /*var mobstor = require('mobstor'); // requires: ynodejs_mobstor

        function MobstorProcessor() {
            var config = {
                host: MobstorProcessor.HOST,
                proxy: MobstorProcessor.PROXY
            };
            this._client = mobstor.createClient(config);
        }

        MobstorProcessor.HOST = "playground.yahoofs.com";
        MobstorProcessor.PROXY = {
            host : "yca-proxy.corp.yahoo.com",
            port : 3128
        };

        MobstorProcessor.prototype.process = function(files) {
            return true;
        };

        module.exports.MobstorProcessor = MobstorProcessor;
        */
    }

    // Write the content to mobstor.
    function mobstorFile(filename, data) {
        self._state.set(State.TYPES.FILES, [filename]);
        status.emit('complete', 'mobstor', 'mobstor received ' + filename);
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