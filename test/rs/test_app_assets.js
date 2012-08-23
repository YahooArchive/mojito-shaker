/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Application Assets Test");


suite.add( new YUITest.TestCase({
        name: "Assets App",
                
        setUp : function () {
            var relRoot = 'fixtures/test_app_assets',
                root = libpath.join(__dirname, relRoot);
            this.shaker = new ShakerCore({root: root});
        },
        tearDown : function () {
            
        },
        'test app level resources': function () {
            var result = this.shaker.shakeAppResourcesByContext({});
            Assert.isTrue(result.length === 4);
        },
        'test app levle resources (device:iphone)': function () {
            var result = this.shaker.shakeAppResourcesByContext({device:'iphone'});
            Assert.isTrue(result.length === 4);
            Assert.isTrue(result[0].name === 'base');
            Assert.isTrue(result[1].name === 'global');
            Assert.isTrue(result[1].source.fs.basename === 'global.iphone');
        }
       }));

YUITest.TestRunner.add(suite);
