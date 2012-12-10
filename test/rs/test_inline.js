/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path'),
    shaker = {};

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite({
    name: "Test Inline Resources",
    setUp : function () {
        var relRoot = 'fixtures/test_inline',
            root = libpath.join(__dirname, relRoot);
    }
});

//console.log(shaker.logger.dump(result));

suite.add(new YUITest.TestCase({

        name: "Unit Test",

        setUp: function () {
            var relRoot = 'fixtures/test_inline',
                root = libpath.join(__dirname, relRoot);

            this.shaker = this.shaker || new Shaker({root:root});
        },
        'test if we got the inline assets': function () {
            var shaker = this.shaker,
                mojitName = 'test_mojit_01',
                context = {};

            var result = shaker.shakeMojitByContext(mojitName, context);
            console.log(result);

        },
        // 'test if we got the inline assets by context': function () {
        //     var shaker = this.shaker,
        //         mojitName = 'test_mojit_01',
        //         context = {};

        //     var result = shaker.shakeMojitByContext(mojitName, context);
        //     console.log(result.inlineAssets);
        // },
        // 'test if the metadata was constructed well': function () {
        //     var shaker = this.shaker,
        //         mojitName = 'test_mojit_01',
        //         context = {};

        //     var result = shaker.bundleShakenMojit(mojitName, context, shaker.shakeMojitByContext(mojitName, context));
        //     console.log(result.inline);
        // },
        testFoo : function (){
            Assert.isTrue(true);
        }
       }));

YUITest.TestRunner.add(suite);
