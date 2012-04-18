var YUITest = require('yuitest').YUITest,
    libfs = require('fs'),
    Path = require('path'),
    Queue = require('buildy').Queue,
    Registry = require('buildy').Registry;

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("local test");

suite.add(new YUITest.TestCase({
    name: "local test",
            
    setUp : function () {
    },

    tearDown : function () {
        delete this.rollup;
    },

    test_process: function(){
        var registry = new Registry();
        registry.load(__dirname + '/../../src/lib/tasks/local.js');

        var files = ['../../docs/_build/html/_static/jquery.js', '../../docs/_build/html/_static/default.css', '../../docs/_build/html/_static/basic.css'],
            css_files = files.filter(function(f) {return Path.extname(f) == ".css";}),
            js_files = files.filter(function(f) {return Path.extname(f) == ".js";});

        var queue = new Queue('Test', {registry: registry});

        queue.on('taskComplete', function(data) {
            if (data.task.type === 'local') {
                console.log(data.result);
            }
        });

        queue.task('files', js_files)
            .task('concat')
            .task('jsminify')
            .task('local', {name: 'js_rollup_{checksum}.js'})
            .run();

        Assert.isTrue(true);
    }
}));

YUITest.TestRunner.add(suite);
