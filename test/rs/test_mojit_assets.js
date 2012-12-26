/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Store API");


suite.add( new YUITest.TestCase({
        name: "Store integration",

        setUp : function () {
            var relRoot = 'fixtures/test_mojit_assets',
                root = libpath.join(__dirname, relRoot);
            this.shaker = new ShakerCore({root: root});
        },
        tearDown : function () {

        },
        'test components simple mojit': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_01', {}),
                assets = result.assets;
            Assert.isTrue(assets.length === 3);
        },
        'test action assets': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_02', {}),
                assets = result.assets;
            Assert.isTrue(assets.length === 3);
        },
        'test action assets dimension (device:iphone)': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_02', {device:'iphone'}),
                assets = result.assets;
            //console.log(result);
            Assert.isTrue(assets.length === 3);
            Assert.isTrue(result.assets[0].source.fs.basename === 'base.iphone');
            Assert.isTrue(result.assets[2].source.fs.basename === 'poc');
            Assert.isNotUndefined(result.actions.index.assets);
            Assert.isTrue(result.actions.index.assets.length === 1);
            Assert.isTrue(result.actions.index.assets[0].source.fs.basename === 'index.iphone');
        }
       }));

YUITest.TestRunner.add(suite);
