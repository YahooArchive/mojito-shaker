/*
* This test should be executed in the file's path.
*/
var YUITest = require('yuitest').YUITest,
    Shaker = require('../../src/lib/core.js').Shaker,
    libfs = require('fs');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Shaker Demo");

suite.add( new YUITest.TestCase({
        name: "Demo test",
                
        setUp : function () {
            this._appPath = '../../demo/';
            this.shaker = new Shaker({root: this._appPath});
        },
        tearDown : function () {
            delete this.shaker;
        },
        testDemo: function(){
            var self = this;
            this.shaker.shakeAll(function(shaken){
                self.resume(function(){
                    console.log(JSON.stringify(shaken,null,'\t'));
                    Assert.isTrue(true);
                });
            });
        
            this.wait(3000);
        }
        /*testShaker_mojit: function(){
            var self = this;
            this.shaker.shakeMojit('master','../../demo/mojits/master',function(shaken){
                self.resume(function(){
                    console.log(JSON.stringify(shaken,null,'\t'));
                    Assert.isTrue(true);
                });
            });
        
            this.wait(3000);
        }*/
       }));

YUITest.TestRunner.add(suite);
