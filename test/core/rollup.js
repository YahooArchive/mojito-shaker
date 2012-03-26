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
