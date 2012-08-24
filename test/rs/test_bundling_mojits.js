/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Customize Rollups");

suite.add( new YUITest.TestCase({
        name: "Customize rollups",
                
        setUp : function () {
            var relRoot = 'fixtures/test_bundling_mojits',
                root = libpath.join(__dirname, relRoot);
            this.shaker = new ShakerCore({root: root});
        },
        tearDown : function () {
            
        },
        'test default bundling': function () {
            var shakenMojit = this.shaker.shakeMojitByContext('test_mojit_07', {});
            //this.shaker.logger.dump(shakenMojit);
            var bundled = this.shaker.bundleShakenMojit('test_mojit_07', {}, shakenMojit);
            //this.shaker.logger.dump(bundled);
            Assert.isTrue(true);
        },
        'test shake all': function (){
            var r = this.shaker.shakeAllContexts();
            this.shaker.logger.dump(r['*']);
        }
       }));

YUITest.TestRunner.add(suite);
