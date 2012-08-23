/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Resources check");


suite.add( new YUITest.TestCase({
        name: "Store resources",
                
        setUp : function () {
            var relRoot = 'fixtures/test_mojit_resources',
                root = libpath.join(__dirname, relRoot);
            this.shaker = new ShakerCore({root: root});
        },
        tearDown : function () {
        },
        'test mojit resources: controller': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_01', {});
            Assert.isTrue(result.controllers.length === 1);
            Assert.isTrue(result.controllers[0].source.fs.basename === 'controller.common');
        },
        'test  mojit resources: controller + autoload': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_02', {});
            //controller check
            Assert.isTrue(result.controllers.length === 1);
            Assert.isTrue(result.controllers[0].source.fs.basename === 'controller.common');
            //autoload check
            Assert.isFalse(Y.Object.isEmpty(result.dependencies));
            Assert.isNotUndefined(result.dependencies['autoloadBase']);
        },
        'test mojit resources: (controller + dep) + view ': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_03', {});
            //view check
            Assert.isTrue(result.views.length === 1);
            Assert.isTrue(result.views[0].source.fs.basename === 'index.mu');
            //action check
            Assert.isFalse(Y.Object.isEmpty(result.actions));
            Assert.isNotUndefined(result.actions['index']);
        },
        'test mojit resources: (controller + dep) + view + binder ': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_04', {});
            //action check
            Assert.isFalse(Y.Object.isEmpty(result.actions));
            Assert.isNotUndefined(result.actions['index']);
            //binder check
            Assert.isNotUndefined(result.actions.index.dependencies);
            Assert.isFalse(Y.Object.isEmpty(result.actions.index.dependencies));
            Assert.isNotUndefined(result.actions.index.dependencies['test_mojit_04_BinderIndex']);
            Assert.isTrue(result.actions.index.dependencies['test_mojit_04_BinderIndex'].name === 'index');
        },
        'test mojit resources: MVC + binder': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_05', {});
            //model check
            Assert.isTrue(result.models.length === 1);
            Assert.isTrue(result.models[0].source.fs.basename === 'model.client');
        },
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
            Assert.isTrue(result.langs.length === 2);
            Assert.isTrue(result.langs[0].source.fs.basename === 'test_mojit_07');
            Assert.isTrue(result.langs[1].source.fs.basename === 'test_mojit_07_es-ES');
            Assert.isNotUndefined(result.dependencies['lang/test_mojit_07']);
        },
        'test mojit resources: langs regarding context dimensions': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_07', {lang:'es-ES'});
            Assert.isNotUndefined(result.dependencies['lang/test_mojit_07_es-ES']);
        },
        'test mojit resources: MVC + globalAppDependencies': function () {
            var result = this.shaker.shakeMojitByContext('test_mojit_08', {});
            Assert.isNotUndefined(result.dependencies['autoloadGlobal']);
        }
       }));

YUITest.TestRunner.add(suite);
