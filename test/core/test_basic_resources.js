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
    name: "Test shakeMojitByContext method",
    setUp : function () {
        var relRoot = 'fixtures/test_basic_resources',
            root = libpath.join(__dirname, relRoot);

        shaker = new ShakerCore({root: root});
    }
});

//console.log(shaker.logger.dump(result));

suite.add( new YUITest.TestCase({
        name: "Unit Test",
        //console.log(shaker.logger.dump(result));
        'test mojit resources: controller': function () {
            var result = shaker.shakeMojitByContext('test_mojit_01', {}),
                controller = result.controller;
            Assert.isNotUndefined(controller.module);
            Assert.isNotUndefined(controller.resource);
        },
        'test  mojit resources: controller + autoload dependencie': function () {
            var mojit = 'test_mojit_02',
                result = shaker.shakeMojitByContext(mojit, {});
            //controller check
            Assert.isNotUndefined(result.controller.module);
            Assert.isNotUndefined(result.controller.resource);
            //autoload dependency check
            Assert.isNotUndefined(result.controller.dependencies);
            Assert.isNotUndefined(result.controller.dependencies[mojit]);
        },
        'test mojit resources: view ': function () {
            var result = shaker.shakeMojitByContext('test_mojit_03', {});
            //view check
            Assert.isNotUndefined(result.views);
            Assert.isNotUndefined(result.views.index);
            Assert.isTrue(result.views.index.source.fs.basename === 'index.mu');
        },
        'test mojit resources: (controller + dep) + view + binder ': function () {
            var result = shaker.shakeMojitByContext('test_mojit_04', {});
            //binder check
            Assert.isNotUndefined(result.binders);
            Assert.isNotUndefined(result.binders['test_mojit_04_BinderIndex']);
        },
        'test mojit resources: MVC + binder': function () {
            var result = shaker.shakeMojitByContext('test_mojit_05', {});
            Assert.isNotUndefined(result.controller.dependencies);
            Assert.isNotUndefined(result.controller.dependencies['test_mojit_05ModelFoo']);
        },
        
        'test mojit resources: MVC + binder + dependencies': function () {
            var binder = 'test_mojit_06_BinderIndex',
                binderDep = 'binderDep6',
                result = shaker.shakeMojitByContext('test_mojit_06', {});

            Assert.isNotUndefined(result.binders[binder]);
            Assert.isNotUndefined(result.binders[binder].dependencies[binderDep]);
        },
        
        'test mojit resources: MVC + binder + dependencies + lang(default)': function () {
            var result = shaker.shakeMojitByContext('test_mojit_07', {});
            //console.log(shaker.logger.dump(result));
            Assert.isNotUndefined(result.langs);
            Assert.isNotUndefined(result.langs['lang/test_mojit_07']);
            //lang check
        },
        'test mojit resources: specific lang': function () {
            var result = shaker.shakeMojitByContext('test_mojit_08', {});
            Assert.isNotUndefined(result.langs);
            Assert.isNotUndefined(result.langs['lang/test_mojit_08']);
        }

       }));

YUITest.TestRunner.add(suite);
