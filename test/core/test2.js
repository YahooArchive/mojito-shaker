/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../src/lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path');

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
            this.defaultAction = '*';
            this.defaultOrder = 'common-index-device-skin-region-lang';

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
                            },
                            {
                                name: 'test_mojit_06',
                                path: this._appPath + 'mojits/test_mojit_06'
                            },
                            {
                                name: 'test_mojit_07',
                                path: this._appPath + 'mojits/test_mojit_07'
                            }
            ];
            
        },
        tearDown : function () {
            delete this.shaker;
            delete this._mojits;
        },
        test_mojit_only_common : function(){
            var mojitName  = this._mojits[1].name,
                mojitPath  = this._mojits[1].path,
                self = this;

			this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                //self.log(data);
				self.resume(function(){
					Assert.isNotUndefined(data[this.defaultAction].meta.dimensions.common);
                    Assert.isTrue(data[this.defaultAction].meta.dimensions.common.files.length === 1);
                    Assert.isTrue(libpath.basename(data[this.defaultAction].meta.dimensions.common.files[0]) == 'common.css');
				});
			});
			this.wait(1000);
        },
        test_mojit_only_action_dimension : function(){
            var mojitName  = this._mojits[2].name,
                mojitPath  = this._mojits[2].path,
                self = this;

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                var action = 'index';
                //self.log(data);
                self.resume(function(){
                    Assert.isNotUndefined(data[action].meta.dimensions.action);
                    Assert.isTrue(data[action].meta.dimensions.action[action].files.length === 1);
                    Assert.isTrue(libpath.basename(data[action].meta.dimensions.action[action].files[0]) == 'index.css');
                });
            });
            this.wait(1000);
        },
        test_mojits_two_binders : function(){
            var mojitName  = this._mojits[3].name,
                mojitPath  = this._mojits[3].path,
                self = this;

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                var b1 = 'index',
                    b2 = 'other';

                self.resume(function(){
                   Assert.isNotUndefined(data[b1]);
                   Assert.isNotUndefined(data[b1].meta.dependencies);
                   Assert.isTrue(data[b1].meta.dependencies.length == 1);
                   Assert.isTrue(libpath.basename(data[b1].meta.dependencies[0]) == 'index.js');

                   Assert.isNotUndefined(data[b2]);
                   Assert.isNotUndefined(data[b2].meta.dependencies);
                   Assert.isTrue(data[b2].meta.dependencies.length == 1);
                   Assert.isTrue(libpath.basename(data[b2].meta.dependencies[0]) == 'other.js');
                });
            });
            this.wait(1000);
        },
        test_all_dimensions : function(){
            var mojitName  = this._mojits[4].name,
                mojitPath  = this._mojits[4].path,
                self = this,
                action = 'index';

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                //self.log(data);
                self.resume(function(){
                    Assert.isNotUndefined(data[action]);
                    Assert.isTrue(data[action].meta.dimensions.common.files.length === 1);
                    Assert.isTrue(data[action].meta.dimensions.device.smartphone.files.length === 1);
                    Assert.isTrue(data[action].meta.dimensions.region.CA.files.length === 1);
                    Assert.isTrue(data[action].meta.dimensions.lang.en.files.length === 1);

                    Assert.isNotUndefined(data[action].shaken[this.defaultOrder]);
                    Assert.isTrue(data[action].shaken[this.defaultOrder].length == 3);
                });
            });
            this.wait(1000);
        },

        test_app_shaker: function(){
            var self = this;
            this.shaker.shakeApp('app', './app1/',function(data){
                self.resume(function(){
                    //self.log(shaken);
                    Assert.isTrue(data[this.defaultAction].meta.dimensions.common.files.length === 1);
                    Assert.isTrue(libpath.basename(data[this.defaultAction].meta.dimensions.common.files[0]) == 'commonassets.css');
                });
            });
        
            this.wait(3000);
        },
        test_shaker_config_override_dimensions_includes: function(){
            var mojitName  = this._mojits[5].name,
                mojitPath  = this._mojits[5].path,
                self = this,
                action = 'index';

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                //self.log(data);
                self.resume(function(){
                    Assert.isNotUndefined(data[action]);
                    Assert.isTrue(data[action].meta.dimensions.common.files.length === 1);
                    Assert.isTrue(data[action].meta.dimensions.device.iphone.files.length === 1);

                    Assert.isTrue(libpath.basename(data[action].meta.dimensions.device.iphone.files[0]) == 'iphone.css');
                    Assert.isTrue(data[action].meta.dimensions.device.ipad.files.length === 1);

                    Assert.isTrue(libpath.basename(data[action].meta.dimensions.device.ipad.files[0]) == 'ipad.css');
                });
            });
            this.wait(1000);
        },
        test_shaker_config_override_dimensions_excludes: function(){
            var mojitName  = this._mojits[6].name,
                mojitPath  = this._mojits[6].path,
                self = this,
                action = 'index';

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
               // self.log(data);
                self.resume(function(){
                    Assert.isNotUndefined(data[action]);
                    Assert.isTrue(data[action].meta.dimensions.common.files.length === 1);
                });
            });
            this.wait(1000);
        },
        test_shaker_config_augment:function(){
             var mojitName  = this._mojits[7].name,
                mojitPath  = this._mojits[7].path,
                self = this,
                action = 'index';

            this.shaker.shakeMojit(mojitName,mojitPath,function(data){
                self.resume(function(){
                    var list = data[action].shaken['common-index-smartphone-blue-US-en'];
                    //ToDo: More exhaustive checking
                    Assert.isTrue(libpath.basename(list[list.length-1]) === 'otherToInclude.css');
                    Assert.isTrue(list.length == 7);//because we remove lang!
                });
            });
            this.wait(1000);
        },
        test_todo_test: function(){
            Assert.isTrue(true);
        }
        
       }));

YUITest.TestRunner.add(suite);
