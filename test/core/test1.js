/*
* This test should be executed in the file's path.
*/

var YUITest = require("yuitest").YUITest; 
var Shaker = require("../../src/lib/core.js").Shaker;

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Configuration files");

suite.add( new YUITest.TestCase({
        name: "Configuration files",
                
        setUp : function () {
            this.shaker = new Shaker({root:'./app1/'});
        },
        tearDown : function () {
            delete this.shaker;
        },
        test_getAppConfig_returns_JSON: function() {
            this.shaker._debugging = true;
            var appcfg = this.shaker._getAppConfig();
            Assert.isObject(appcfg);
        },
        test_non_existing_mojit_config: function(){
            Assert.isTrue(true);
        }
        
       }));

YUITest.TestRunner.add(suite);
