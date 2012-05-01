/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path'),
    ResourceStore = require('mojito/lib/store.server');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Shake Mojits - Default configuration");

suite.add( new YUITest.TestCase({
        name: "Shake Mojits - Default Config",
                
        setUp : function () {
            this.log = function (obj){
                console.log(JSON.stringify(obj,null,'\t'));
            };

            var root = libpath.join(process.cwd(), 'demoapp1'),
                store = new ResourceStore(root),
                context = {};
                store.preload(context);

            this.shaker = new Shaker({store:store});
        },
        tearDown : function () {
            delete this.shaker;
            delete this._mojits;
        },
        test_shaker_All:function(){
             data = this.shaker.shakeAll();
             this.log(data);
        },
        test_todo_test: function(){
            Assert.isTrue(true);
        }
       }));

YUITest.TestRunner.add(suite);
