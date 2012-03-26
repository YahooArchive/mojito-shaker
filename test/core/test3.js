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
            this._m1 = 'test_mojit_02';

            this._mojits[this._m1] = this._appPath + 'mojits/test_mojit_01';
            this._mojits[this._m2] = this._appPath + 'mojits/test_mojit_02';
        },
        tearDown : function () {
            delete this.shaker;
        },
        /*
        test_shakeMojit : function(){
            var self = this;
            this.shaker.shakeMojit(this._m1, this._mojits[this._m1],function(shaken){
                self.resume(function(){
                    //console.log(JSON.stringify(shaken,null,'\t'));
                    Assert.isTrue(true);
                });
            });
		
			this.wait(3000);
        },
        test_shakeMojit_autoloadtest: function(){
            var self = this;
            this.shaker.shakeMojit(this._m2, this._mojits[this._m2],function(shaken){
                self.resume(function(){
                    console.log(JSON.stringify(shaken,null,'\t'));
                    Assert.isTrue(true);
                });
            });
        
            this.wait(3000);
        },
    
        test_app_shaker: function(){
            var self = this;
            this.shaker.shakeApp('app', './app1',function(shaken){
                self.resume(function(){
                    console.log(JSON.stringify(shaken,null,'\t'));
                    Assert.isTrue(true);
                });
            });
        
            this.wait(3000);
        },*/
        test_all_mojits_shaker: function(){
            var self = this;
            this.shaker.shakeAll(function(shaken){
                self.resume(function(){
                    console.log(JSON.stringify(shaken,null,'\t'));
                    Assert.isTrue(true);
                });
            });
        
            this.wait(3000);
        },
        test_empty: function(){
            Assert.isTrue(true);

        }
        
       }));

YUITest.TestRunner.add(suite);
