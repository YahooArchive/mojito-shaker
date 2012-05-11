/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path'),
    ResourceStore = require('mojito/lib/store.server');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Client Side Dependencies");

suite.add( new YUITest.TestCase({
        name: "Shake Mojits - Client Side - Deploy:true",
                
        setUp : function () {
            this.log = function (obj){
                console.log(JSON.stringify(obj,null,'\t'));
            };

            var root = libpath.join(process.cwd(), 'app2'),
                store = new ResourceStore(root),
                context = {};
                store.preload(context);

            this.shaker = new Shaker({store:store});
            this.shaker._resources =  this.shaker._mojitResources(store._staticURLs);

            this.defaultAction = '*';
            this.defaultOrder = 'common-index-device-skin-region-lang';

            this._mojits = [{
                                name: 'fake_mojit',
                                path: root +'/'+ 'fakeMojit'
                            },
                            {
                                name: 'test_mojit_01',
                                path: root +'/'+ 'mojits/test_mojit_01'
                            },
                            {
                                name: 'test_mojit_02',
                                path: root +'/'+ 'mojits/test_mojit_02'
                            },
                            {
                                name: 'test_mojit_03',
                                path: root +'/'+ 'mojits/test_mojit_03'
                            },
                            {
                                name: 'test_mojit_04',
                                path: root +'/'+ 'mojits/test_mojit_04'
                            },
                            {
                                name: 'test_mojit_05',
                                path: root +'/'+ 'mojits/test_mojit_05'
                            },
                            {
                                name: 'test_mojit_06',
                                path: root +'/'+ 'mojits/test_mojit_06'
                            },
                            {
                                name: 'test_mojit_07',
                                path: root +'/'+ 'mojits/test_mojit_07'
                            }
            ];
            
        },
        tearDown : function () {
            delete this.shaker;
            delete this._mojits;
        },
        test_client_controller_binder_dependencies: function() {
            var mojitName  = this._mojits[1].name,
                mojitPath  = this._mojits[1].path,
                self = this;

            var data = this.shaker._shakeMojit(mojitName,mojitPath),
                clientDefault = data[this.defaultAction].client;
                clientIndex = data['index'].client;
                clientIndexMeta = data['index'].meta.client;
            //Default action should not have any client side.
            Assert.isTrue(clientDefault.length === 0);
            Assert.isTrue(clientIndex.length === 2);
            Assert.isTrue(libpath.basename(clientIndexMeta.controllers[0]) === 'controller.common.js');
            Assert.isTrue(libpath.basename(clientIndexMeta.binders[0]) === 'index.js');
        },
        test_client_controller_affinity_dependencies: function() {
            var mojitName  = this._mojits[2].name,
                mojitPath  = this._mojits[2].path,
                self = this;

            var data = this.shaker._shakeMojit(mojitName,mojitPath),
                clientDefault = data[this.defaultAction].client;
                clientIndex = data['index'].client;
                clientIndexMeta = data['index'].meta.client;
            Assert.isTrue(clientDefault.length === 0);

            Assert.isTrue(clientIndex.length === 3);
            Assert.isTrue(libpath.basename(clientIndexMeta.controllers[0]) === 'controller.common.js');
            Assert.isTrue(libpath.basename(clientIndexMeta.binders[0]) === 'index.js');
            Assert.isTrue(libpath.basename(clientIndexMeta.dependencies[0]) === 'mojit-autoload-01.common.js');
        },
        test_client_controller_model_affinity_dependencies: function() {
            var mojitName  = this._mojits[3].name,
                mojitPath  = this._mojits[3].path,
                self = this;

            var data = this.shaker._shakeMojit(mojitName,mojitPath),
                clientDefault = data[this.defaultAction].client;
                clientIndex = data['index'].client;
                clientIndexMeta = data['index'].meta.client;

            Assert.isTrue(clientIndex.length === 4);
            Assert.isTrue(libpath.basename(clientIndexMeta.controllers[0]) === 'controller.common.js');
            Assert.isTrue(libpath.basename(clientIndexMeta.binders[0]) === 'index.js');
            Assert.isTrue(libpath.basename(clientIndexMeta.dependencies[0]) === 'mojit-autoload-01.common.js');
            Assert.isTrue(libpath.basename(clientIndexMeta.dependencies[1]) === 'test.common.js');
        },
        test_client_controller_model_affinity_app_dependencies: function() {
            var mojitName  = this._mojits[4].name,
                mojitPath  = this._mojits[4].path,
                self = this;

            var data = this.shaker._shakeMojit(mojitName,mojitPath),
                clientDefault = data[this.defaultAction].client;
                clientIndex = data['index'].client;
                clientIndexMeta = data['index'].meta.client;

            Assert.isTrue(clientIndex.length === 4);
        },
        testFinal: function () {
            Assert.isTrue(true);
        }

       }));

YUITest.TestRunner.add(suite);
