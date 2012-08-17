/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/coreRefactor.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Store API");


suite.add( new YUITest.TestCase({
        name: "Store integration",
                
        setUp : function () {

        },
        tearDown : function () {
            
        },
        'test store api': function () {
                
        }

       }));

YUITest.TestRunner.add(suite);
