/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../src/lib/core.js').ShakerCore,
    libfs = require('fs');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Shake Mojits - Default configuration");

suite.add( new YUITest.TestCase({
        name: "Shake Mojits - Default Config",
                
        setUp : function () {
            this.log = function (obj){
                console.log(JSON.stringify(obj,null,'\t'));
            };

            this._appPath = './app1/';
            this.shaker = new Shaker({root: this._appPath});

            this._mojits = [{
                                name: 'fake_mojit',
                                path: this._appPath + 'fakeMojit'
                            },
                            {
                                name: 'test_mojit_01',
                                path: this._appPath + 'mojits/test_mojit_01'
                            },
                            {
                                name: 'test_mojit_02',
                                path: this._appPath + 'mojits/test_mojit_02'
                            },
                            {
                                name: 'test_mojit_03',
                                path: this._appPath + 'mojits/test_mojit_03'
                            },
                            {
                                name: 'test_mojit_04',
                                path: this._appPath + 'mojits/test_mojit_04'
                            },
                            {
                                name: 'test_mojit_05',
                                path: this._appPath + 'mojits/test_mojit_05'
                            }
            ];
            
        },
        tearDown : function () {
            delete this.shaker;
            delete this._mojits;
        },
        /*test_mojit_only_common : function(){
            var mojitName  = this._mojits[1].name,
                mojitPath  = this._mojits[1].path,
                self = this;

			this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                self.log(data);
				self.resume(function(){
					Assert.isTrue(true);
				});
			});
			this.wait(1000);
        },
        test_mojit_only_action_dimension : function(){
            var mojitName  = this._mojits[2].name,
                mojitPath  = this._mojits[2].path,
                self = this;

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                self.log(data);
                self.resume(function(){
                    Assert.isTrue(true);
                });
            });
            this.wait(1000);
        },
        test_mojits_two_binders : function(){
            var mojitName  = this._mojits[3].name,
                mojitPath  = this._mojits[3].path,
                self = this;

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                self.log(data);
                self.resume(function(){
                    Assert.isTrue(true);
                });
            });
            this.wait(1000);
        },
        test_all_dimensions : function(){
            var mojitName  = this._mojits[4].name,
                mojitPath  = this._mojits[4].path,
                self = this;

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                self.log(data);
                self.resume(function(){
                    Assert.isTrue(true);
                });
            });
            this.wait(1000);
        }*/
        test_shaker_config_override_dimensions: function(){
            var mojitName  = this._mojits[5].name,
                mojitPath  = this._mojits[5].path,
                self = this;

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                self.log(data);
                self.resume(function(){
                    Assert.isTrue(true);
                });
            });
            this.wait(1000);
        }
        
       }));

YUITest.TestRunner.add(suite);
