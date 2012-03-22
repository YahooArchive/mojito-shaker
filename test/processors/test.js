var YUITest = require('yuitest').YUITest,
    MobstorProcessor = require('../../src/processors/mobstor.js').MobstorProcessor,
    libfs = require('fs');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Configuration files");

suite.add(new YUITest.TestCase({
    name: "Configuration files",
            
    setUp : function () {
        this.processor = new MobstorProcessor();
    },
    tearDown : function () {
        delete this.processor;
    },
    test_process: function(){
        Assert.isTrue(this.processor.process());
    }
}));

YUITest.TestRunner.add(suite);
