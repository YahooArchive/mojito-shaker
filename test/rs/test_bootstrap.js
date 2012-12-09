/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path'),
    sc = {};

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite({
    name: "Test bootstrap",
    setUp : function () {
        var relRoot = 'fixtures/test_bootstrap',
            root = libpath.join(__dirname, relRoot);

        sc = new ShakerCore({root: root});
    }
});

//console.log(shaker.logger.dump(result));

suite.add( new YUITest.TestCase({
        name: "Unit Test",
        //console.log(shaker.logger.dump(result));
        'test config bootstrap is true': function () {
            var shakerConfig = sc.getAppShakerConfigByContext({});
            Assert.isTrue(shakerConfig.optimizeBootstrap);
        },
        'test inlie file augmentation': function () {
           var app = sc.getAppModuleResources();
        },
        testFoo : function (){
            Assert.isTrue(true);
        }
       }));

YUITest.TestRunner.add(suite);
