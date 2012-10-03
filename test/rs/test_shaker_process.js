/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/shaker.js').Shaker,
    libfs = require('fs');
    async = require('async');
    libpath = require('path');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Shaker test");





suite.add( new YUITest.TestCase({
        name: "Store resources",
                
        setUp : function () {
            var relRoot = 'fixtures/test_shaker_process',
                root = libpath.join(__dirname, relRoot);
            this.shaker = new Shaker({root: root});
        },
        tearDown : function () {
        },
        'test shaker js process default': function () {
            var self = this,
                mojit = 'test_mojit_07',
                context = {},
                shaker = this.shaker,
                core = shaker._core;
                metaMojit = core.bundleShakenMojit(mojit, context, core.shakeMojitByContext(mojit, context));
                meta = metaMojit.index;

            shaker.processMojitJS(meta.js, meta.views, {}, function (err, data) {
                self.resume(function (){
                Assert.isNull(err);
                });
            });
            this.wait(1000);
            
        },
/*
        'test shaker js process with minification': function () {
            var self = this,
                mojit = 'test_mojit_07',
                context = {},
                shaker = this.shaker,
                core = shaker._core;
                metaMojit = core.bundleShakenMojit(mojit, context, core.shakeMojitByContext(mojit, context));
                meta = metaMojit.index;

            shaker.processMojitJS(meta.js, meta.views, {minify: true}, function (err, data) {
                //core.logger.dump(' ' + data[0]);
                self.resume(function (){
                Assert.isNull(err);
                });
            });
            this.wait(1000);
        },

        'test shaker css proces default': function () {
            var self = this,
                mojit = 'test_mojit_07',
                context = {},
                shaker = this.shaker,
                core = shaker._core;
                metaMojit = core.bundleShakenMojit(mojit, context, core.shakeMojitByContext(mojit, context));
                meta = metaMojit.index;
            shaker.processMojitCSS(meta.css, {minify:true}, function (err, data) {
                self.resume(function (){
                Assert.isNull(err);
                });
            });
            this.wait(1000);
        },
        'test shaker and process mojit ': function () {
            var self = this,
                mojit = 'test_mojit_07',
                context = {},
                shaker = this.shaker,
                core = shaker._core;
                metaMojit = core.bundleShakenMojit(mojit, context, core.shakeMojitByContext(mojit, context));
                shaker.processMojit(metaMojit,{minify:true}, function (err, data) {
                    //core.logger.dump(data);
                    self.resume(function (){
                        Assert.isNull(err);
                    });
                });
                this.wait(1000);
        },
        
        'test core processing': function (){
            var self = this,
                mojit = 'test_mojit_07',
                context = {},
                shaker = this.shaker,
                core = shaker._core,
                coreResources = core.shakeCore();
                shaker.processMojitJS(coreResources,[],{}, function (err, data) {
                    self.resume(function (){
                        Assert.isNull(err);
                    });
                });
            this.wait(1000);
        }
        ,
        */
        'test broza': function (){
            Assert.isTrue(true);
        }
       }));

YUITest.TestRunner.add(suite);
