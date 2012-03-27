/*
var YUITest = require('yuitest').YUITest,
    Rollup = require('../../src/lib/rollup.js').Rollup,
    libfs = require('fs');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Configuration files");

suite.add(new YUITest.TestCase({
    name: "Configuration files",
            
    setUp : function () {
        this.rollup = new Rollup();
    },
    tearDown : function () {
        delete this.rollup;
    },
    test_process: function(){
        Assert.isTrue(true);//this.processor.process());
    }
}));

YUITest.TestRunner.add(suite);
*/
var Path = require('path'),
    Queue = require('../../node_modules/buildy').Queue,
    Registry = require('../../node_modules/buildy').Registry;

var registry = new Registry();
registry.load(__dirname + '/../../src/lib/tasks/checksumwrite.js', __dirname + '/../../src/lib/tasks/mobstor.js');

var config = {
    host: 'playground.yahoofs.com',
    proxy: {host: "yca-proxy.corp.yahoo.com", port: 3128}
};

var files = ['../../docs/_build/html/_static/jquery.js', '../../docs/_build/html/_static/default.css', '../../docs/_build/html/_static/basic.css'],
    css_files = files.filter(function(f) {return Path.extname(f) == ".css";}),
    js_files = files.filter(function(f) {return Path.extname(f) == ".js";});

var queue = new Queue('Test', {registry: registry});

queue.on('taskComplete', function(data) {
    if (data.task.type === 'checksumwrite') {
        console.log(data.result);
    }
    if (data.task.type === 'mobstor') {
        console.log(data.result);
    }
});

queue.task('files', js_files)
    .task('concat')
    .task('jsminify')
    .task('mobstor', {name: 'js_rollup_{checksum}.js', config: config})
    .task('checksumwrite', {name: 'js_rollup_{checksum}.js'})
    .run();

/*
new Rollup(css_files)
    .uglify()
    .write('css_rollup.css')
    .run();

new MobstorRollup(css_files, {checksum: false})
    .uglify()
    //.write('css_rollup')
    .deploy('/test/css_rollup_{checksum}.css', config) // http://playground.yahoofs.com/foo/bar/baz.js
    .run();
*/