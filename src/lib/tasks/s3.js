var knox = require('knox'),
    State = require('buildy').State,
    Crypto = require('crypto');

/**
 * Send content to s3. Simple Buildy wrapper for knox.
 * See https://github.com/LearnBoost/knox
 *
 * Example:
 *
 * var Registry = require('../../node_modules/buildy').Registry,
 *     Queue = require('../../node_modules/buildy').Queue,
 *     reg = new Registry(),
 *     knox_config = {
            key: '<api-key-here>',
            secret: '<secret-here>',
            bucket: 'shaker'
 *     };
 *
 * reg.load(__dirname + '/s3.js'); // s3 task
 *
 * new Queue('deploy', {registry: reg})
 *     .task('files', ['s3.js'])
 *     .task('concat')
 *     .task('jsminify')
 *     .task('s3', {name: '/foo/bar/baz.js', client: knox_config})
 *     .task('write', {name: 'baz.js'})
 *     .task('inspect')
 *     .run();
 *
 * View output here: http://playground.yahoofs.com/foo/bar/baz.js
 *
 * @method s3Task
 * @param options {Object} s3 task options.
 * @param options.name {String} Resource name.
 * @param options.client {Object} s3 client (key, secret, bucket).
 * @param status {EventEmitter} Status object, handles 'complete' and 'failed' task exit statuses.
 * @param logger {winston.Logger} Logger instance, if additional logging required (other than task exit status)
 * @return {undefined}
 * @public
 */
function s3Task(options, status, logger) {
    var self = this,
        name = options.name,
        root = options && options.root || '',
        client = knox.createClient(options.client);

    // Send content to s3.
    function storeFile(filename, data) {
        if (filename.indexOf('{checksum}') > -1) {  // Replace {checksum} with md5 string
            var md5sum = Crypto.createHash('md5');
            md5sum.update(data);
            filename = filename.replace('{checksum}', md5sum.digest('hex'));
        }

        filename = '/' + filename;

        console.log(filename);

        var req = client.put(filename, {'Content-Length': data.length, 'Content-Type': 'text/plain'});

        req.on('response', function(res) {
            console.log(res.statusCode);

            if (res.statusCode === 200) {
                self._state.set(State.TYPES.STRING, data);
                status.emit('complete', 's3', req.url);
            }
            else {
                status.emit('failed', 's3', 'error sending file: ' + res.statusCode);
            }
        });
    }

    switch (this._state.get().type) {
        case State.TYPES.FILES:
            storeFile(name, self._state.get().value.join("\n"));
            break;

        case State.TYPES.STRING:
            storeFile(name, self._state.get().value);
            break;

        case State.TYPES.STRINGS:
            storeFile(name, self._state.get().value.join(""));
            break;

        case State.TYPES.UNDEFINED:
            storeFile(name, "");
            break;

        default:
            status.emit('failed', 's3', 'unrecognised input type: ' + this._type);
            break;
    }
}

exports.tasks = {
    's3' : {
        callback: s3Task
    }
};