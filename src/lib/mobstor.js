var Util = require('util'),
    Path = require('path'),
    Queue = require('../../node_modules/buildy').Queue,
    Registry = require('../../node_modules/buildy').Registry,
    Rollup = require('./rollup.js').Rollup;

function MobstorRollup(files, options) {
    var opts = options || {};
    var registry = new Registry();
    registry.load(__dirname + '/mobstor_task.js'); // Path to mobstor task

    this._queue = new Queue('Rollup', {registry: registry});
    this._queue.task('files', files);
    this._ext = files ? Path.extname(files[0]) : '.js';
    this._enable_checksum = opts.hasOwnProperty('checksum') ? opts.checksum : true;
    this._checksum = null;
}

Util.inherits(MobstorRollup, Rollup);

MobstorRollup.prototype.deploy = function(root, name, config) {
    var filename = root + name;

    if (this._enable_checksum) {
        filename += '_' + this._checksum;
    }

    filename += this._ext;

    this._queue.task('mobstor', {name: filename, config: config});
    return this;
};

exports.MobstorRollup = MobstorRollup;