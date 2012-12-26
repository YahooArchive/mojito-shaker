/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path'),
    root = "";

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite({
    name: "Test shakeMojitByContext method",
    setUp : function () {
        var relRoot = 'fixtures/test_rollupConfig';
        root = libpath.join(__dirname, relRoot);
    }
});

//console.log(shaker.logger.dump(result));

suite.add( new YUITest.TestCase({
        name: "Unit Test",

        dumpPlainResources: function (shakenResources) {
            var aux = {},
                action,
                bundle,
                resource,
                i;

            for (action in shakenResources) {
                aux[action] = {js:[], css:[]};
                bundle = shakenResources[action];
                for (i = 0; i < bundle.js.length; i++) {
                    resource = bundle.js[i];
                    aux[action].js.push(resource.source.fs.fullPath);
                }

                for (i = 0; i < bundle.css.length; i++) {
                    resource = bundle.css[i];
                    aux[action].css.push(resource.source.fs.fullPath);
                }
            }
            console.log(aux);
        },
        'test default rollup: js resources': function () {
            var mojit = 'test_mojit_01',
                context = {environment:'defaultRollup'},
                shaker = new ShakerCore({root: root}),
                result = shaker.bundleShakenMojit(mojit, context, shaker.shakeMojitByContext(mojit, context));

            
            Assert.isTrue(result.index.js.length === 2);
            Assert.isTrue(result.foo.js.length === 2);

            Assert.isTrue(result.index.js[0].name === 'binderDep');
            Assert.isTrue(result.index.js[1].id ==='binder--index');

            //this.dumpPlainResources(result);
        },
        'test include views rollup: js resources': function () {
            var mojit = 'test_mojit_01',
                context = {environment:'includeViews'},
                shaker = new ShakerCore({root: root, context:context}),
                result = shaker.bundleShakenMojit(mojit, context, shaker.shakeMojitByContext(mojit, context));

            //this.dumpPlainResources(result);
            Assert.isTrue(result.index.js.length === 3);
            Assert.isTrue(result.foo.js.length === 3);

            // Ordered: [dependencies, binder, view]
            Assert.isTrue(result.index.js[0].name === 'binderDep');
            Assert.isTrue(result.index.js[1].id === 'binder--index');
            Assert.isTrue(result.index.js[2].id === 'view--index');
        },


        'test include controller + deps, js resources': function () {
            var mojit = 'test_mojit_01',
                context = {environment:'includeController'},
                shaker = new ShakerCore({root: root, context:context}),
                result = shaker.bundleShakenMojit(mojit, context, shaker.shakeMojitByContext(mojit, context));

            //this.dumpPlainResources(result);

            Assert.isTrue(result.index.js.length === 6);
            Assert.isTrue(result.foo.js.length === 6);

            // The first two are the binder + deps tested before
            Assert.isTrue(result.index.js[0].name === 'binderDep');
            Assert.isTrue(result.index.js[1].id === 'binder--index');
            

            //controller + deps
            Assert.isTrue(result.index.js[2].id === 'yui-module--autoloadGlobal');
            Assert.isTrue(result.index.js[3].id === 'model--model');
            Assert.isTrue(result.index.js[4].id === 'addon-ac-poc');
            Assert.isTrue(result.index.js[5].id === 'controller--controller');


        },
        'test include all': function () {
            var mojit = 'test_mojit_01',
                context = {environment:'includeAll'},
                shaker = new ShakerCore({root: root, context:context}),
                result = shaker.bundleShakenMojit(mojit, context, shaker.shakeMojitByContext(mojit, context));

            // this.dumpPlainResources(result);
            Assert.isTrue(result.index.js.length === 7);
            Assert.isTrue(result.foo.js.length === 7);
        },
        'test include lang': function () {
            var mojit = 'test_mojit_01',
                context = {environment:'includeAll',lang:'es-ES'},
                shaker = new ShakerCore({root: root, context:context}),
                result = shaker.bundleShakenMojit(mojit, context, shaker.shakeMojitByContext(mojit, context));

            //this.dumpPlainResources(result);

            // The first two are the binder + deps tested before
            Assert.isTrue(result.index.js[0].name === 'binderDep');
            Assert.isTrue(result.index.js[1].id === 'binder--index');
            Assert.isTrue(result.index.js[2].id === 'yui-lang--lang/test_mojit_08_es-ES');
        },
        'test css in general': function () {
            var mojit = 'test_mojit_01',
                context = {environment:'includeAll'},
                shaker = new ShakerCore({root: root, context:context}),
                result = shaker.bundleShakenMojit(mojit, context, shaker.shakeMojitByContext(mojit, context));

            Assert.isTrue(result.index.css.length === 1);
            Assert.isTrue(result.foo.css.length === 2);

            Assert.isTrue(result.index.css[0].id === 'asset-css-mycss');
            Assert.isTrue(result.foo.css[0].id === 'asset-css-mycss');
            Assert.isTrue(result.foo.css[1].id === 'asset-css-foo');

        }
       }));

YUITest.TestRunner.add(suite);
