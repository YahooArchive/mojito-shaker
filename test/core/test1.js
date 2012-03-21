/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../src/lib/core.js').Shaker,
    libfs = require('fs');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Configuration files");

suite.add( new YUITest.TestCase({
        name: "Configuration files",
                
        setUp : function () {
            this._appPath = './app1/';
            this.shaker = new Shaker({root: this._appPath});
        },
        tearDown : function () {
            delete this.shaker;
        },
        test_getAppConfig_returns_JSON: function() {
            this.shaker._debugging = true;
            var appcfg = this.shaker._getAppConfig();
            Assert.isObject(appcfg);
        },
        test_get_mojits_config_default: function(){
            var defaultFolder = this._appPath + 'mojits',
                mojits = this.shaker._getMojits(),
                listMojits = [],
                items = libfs.readdirSync(defaultFolder).filter(function(i){
                return i.charAt(0) !== '.';
            });
            for(var i in mojits){
                listMojits.push(i);
            }
            Assert.isObject(mojits);
            Assert.isTrue(listMojits.length === items.length);
        }
        
       }));

YUITest.TestRunner.add(suite);
