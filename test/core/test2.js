/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../src/lib/core.js').Shaker,
    libfs = require('fs');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Resources FS");

suite.add( new YUITest.TestCase({
        name: "File System: Check Resources",
                
        setUp : function () {
            this._appPath = './app1/';
            this.shaker = new Shaker({root: this._appPath});

            this._mojits = {};
            this._m1 = 'test_mojit_01';
            this._mojits[this._m1] = this._appPath + 'mojits/test_mojit_01';
            
        },
        tearDown : function () {
            delete this.shaker;
        },
        test_loadMojitResources : function(){
			var resources = {assets: this._mojits[this._m1] + '/assets'},
				self = this;

			this.shaker._loadMojitResources(resources,function(r){
				self.resume(function(){
					Assert.isObject(r);
					Assert.isTrue(r.assets.length === 1);
				});
			});
			this.wait(1000);
        }
        
       }));

YUITest.TestRunner.add(suite);
