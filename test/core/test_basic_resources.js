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
        /*
        'test mojit resources: MVC + binder + dependencies': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_06', {});
            //action check
            Assert.isFalse(Y.Object.isEmpty(result.actions));
            Assert.isNotUndefined(result.actions['index']);
            //binder check
            Assert.isNotUndefined(result.actions.index.dependencies);
            Assert.isFalse(Y.Object.isEmpty(result.actions.index.dependencies));
            Assert.isTrue(Y.Object.size(result.actions.index.dependencies) === 2);
            Assert.isNotUndefined(result.actions.index.dependencies['test_mojit_06_BinderIndex']);
            Assert.isTrue(result.actions.index.dependencies['test_mojit_06_BinderIndex'].name === 'index');
            Assert.isNotUndefined(result.actions.index.dependencies['binderDep']);
            Assert.isTrue(result.actions.index.dependencies['binderDep'].source.fs.basename === 'binderDep.client');
        },
        'test mojit resources: MVC + binder + dependencies + lang(default)': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_07', {});
            //lang check
            Assert.isTrue(result.langs.length === 3);
            Assert.isTrue(result.langs[0].source.fs.basename === 'test_mojit_07');
            Assert.isTrue(result.langs[1].source.fs.basename === 'test_mojit_07_en-US');
            Assert.isTrue(result.langs[2].source.fs.basename === 'test_mojit_07_es-ES');
            Assert.isNotUndefined(result.dependencies['lang/test_mojit_07']);
        },
        'test mojit resources: langs regarding context dimensions': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_07', {lang:'en-US'});
            //Assert.isNotUndefined(result.dependencies['lang/test_mojit_07_es-ES']);
            for(var i in result.dependencies) {
                console.log(i);
            }
        },
        'test mojit resources: MVC + globalAppDependencies': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_08', {});
            Assert.isNotUndefined(result.dependencies['autoloadGlobal']);
        },
        'test core resources': function (){
            var result = this.shaker.shakeCore();
            Assert.isTrue(result.length > 0);
        }
        */
        testFoo : function (){
            Assert.isTrue(true);
        }
       }));

YUITest.TestRunner.add(suite);
