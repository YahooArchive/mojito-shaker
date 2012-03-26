var Queue = require('../../node_modules/buildy').Queue,
    Path = require('path'),
    Crypto = require('crypto');

function Rollup(files, options) {
    var opts = options || {};

    this._queue = new Queue('Rollup');
    this._queue.task('files', files);
    this._ext = files ? Path.extname(files[0]) : '.js';
    this._enable_checksum = opts.hasOwnProperty('checksum') ? opts.checksum : true;
    this._checksum = null;
}

Rollup.prototype = {
    uglify: function() {
        this._queue.task('concat');
        this._queue.task(this._ext === '.js' ? 'jsminify' : 'cssminify');

        if (this._enable_checksum) {
            this._queue.run();
            var md5sum = Crypto.createHash('md5');
            md5sum.update(this._queue._state._state);
            this._checksum = md5sum.digest('hex');
        }

        return this;
    },

    write: function(name) {
        var filename = name;

        if (this._enable_checksum) {
            filename += '_' + this._checksum;
        }

        filename += this._ext;

        this._queue.task('write', {name: filename});
        return this;
    },

    run: function() {
        this._queue.run();
        return this;
    }
};

exports.Rollup = Rollup;