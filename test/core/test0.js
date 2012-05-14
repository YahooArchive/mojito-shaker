/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path'),
    ResourceStore = require('mojito/lib/store.server');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Store API");

function isEmpty(obj){
    var key,count = 0;
    for(key in obj){count++;}
        return count === 0;
}

suite.add( new YUITest.TestCase({
        name: "Store integration",
                
        setUp : function () {
            this.log = function (obj){
                console.log(JSON.stringify(obj,null,'\t'));
            };

            var root = libpath.join(process.cwd(), 'app2');
                this.store = new ResourceStore(root);
                context = {};
                this.store.preload(context);

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
        test_app_config : function(){
            var key, count = 0, app = this.store.getAppConfig(null,'application');
            Assert.isTrue(!isEmpty(app));
        },
        test_mojit_info: function(){
            var self = this,
                instance = {
                    type: 'test_mojit_01'
            };

            this.store.expandInstance(instance, {}, function (err, data) {
                //self.log(data);
            });
            Assert.isTrue(true);
        },
        test_routes: function(){
            var self = this,
                ctx = {},
                routes = this.store.getRoutes(ctx);
            //this.log(routes);
            Assert.isFalse(isEmpty(routes));

        },
         test_info: function(){
            var self = this,
                ctx = {},
                info = this.store.getAllMojits("client",{});
            this.log(this.store);
            

        },
        test_todo_test: function(){
            Assert.isTrue(true);
        }
       }));

YUITest.TestRunner.add(suite);
