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
var Rollup = require('../../src/lib/rollup.js').Rollup,
    MobstorRollup = require('../../src/lib/mobstor.js').MobstorRollup,
    Path = require('path');

var config = {
    host: 'playground.yahoofs.com',
    proxy: {host: "yca-proxy.corp.yahoo.com", port: 3128}
};

var files = ['../../docs/_build/html/_static/jquery.js', '../../docs/_build/html/_static/default.css', '../../docs/_build/html/_static/basic.css'],
    css_files = files.filter(function(f) {return Path.extname(f) == ".css";}),
    js_files = files.filter(function(f) {return Path.extname(f) == ".js";});

new Rollup(js_files)
    .uglify()
    .write('js_rollup')
    .run();

new Rollup(css_files)
    .uglify()
    .write('css_rollup')
    .run();

new MobstorRollup(css_files, {checksum: false})
    .uglify()
    //.write('css_rollup')
    .deploy('/test/', 'css_rollup', config) // http://playground.yahoofs.com/foo/bar/baz.js
    .run();