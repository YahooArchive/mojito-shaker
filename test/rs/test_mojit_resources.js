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
        'mojito resources test': function (){
            var store = this.shaker.store;
            /*
            * getMOjitTYpeDetails return only the barebones resources:
                {
                    "assets": {
                        "favicon.ico": "/static/mojito/assets/favicon.ico",
                        "mycss.css": "/static/test_mojit_08/assets/mycss.css"
                    },
                    "binders": {
                        "foo": "test_mojit_08_BinderFoo",
                        "index": "test_mojit_08_BinderIndex"
                    },
                    "models": {
                        "model": "test_mojit_08ModelFoo"
                    },
                    "views": {
                        "foo": {
                            "content-path": "/static/test_mojit_08/views/foo.mu.html",
                            "engine": "mu"
                        },
                        "index": {
                            "content-path": "/static/test_mojit_08/views/index.mu.html",
                            "engine": "mu"
                        }
                    },
                    "definition": {},
                    "defaults": {},
                    "controller": "test_mojit_08",
                    "acAddons": [
                        "poc",
                        "config",
                        "intl"
                    ],
                    "assetsRoot": "/static/test_mojit_08/assets"
                }
            */
            //var pr = store.getMojitTypeDetails('client',{},'test_mojit_08');
            //this.shaker.logger.dump(pr);

             // var ress = store.getResources('client',{}, {mojit:'test_mojit_08'});
             // console.log(ress);
            //     res,
            //     required = {},
            //     binders = {},
            //     controllers = {},
            //     langs = {};

            // for (r = 0; r < ress.length; r += 1) {
            //     res = ress[r];
            //     if (!res.yui || !res.yui.name) {
            //         continue;
            //     }
            //     if ('controller' === res.type) {
            //         controllers[res.yui.name] = store.yui._makeYUIModuleConfig('client', res);
            //         required[res.yui.name] = true;
            //     }
            //     if ('binder' === res.type) {
            //         binders[res.yui.name] = store.yui._makeYUIModuleConfig('client', res);
            //     }

            //     if ('yui-lang' === res.type) {
            //         langs[res.yui.name] = store.yui._makeYUIModuleConfig('client', res);
            //     }

            // }

            // var sorted = store.yui._precomputeYUIDependencies('en', 'client', 'test_mojit_08', controllers, required, true);
            // //store.yui._addLangsToSorted('client', sorted, 'en', langsRes);
            
            // this.shaker.logger.dump(sorted);
            var m = 'test_mojit_08';
            var ctx = {lang:'es-ES'};
            var r = this.shaker.bundleShakenMojit(m, ctx, this.shaker.shakeMojitByContext(m,ctx));
            //this.shaker.logger.dump(r);
            for (var i=0; i< r.index.js.length; i++) {
                console.log(r.index.js[i].url);
            }




        },
        /*
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
