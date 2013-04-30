/*
* This test should be executed in the file's path.
*/

var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    AppSuite = require('./app-suite.js').AppSuite,
    config = require('./config.js').tests,
    Assert = YUITest.Assert,

    ShakerSuite = function (config) {
        var self = this;

        this.tests = [];
        this.suite = shakerSuite = new YUITest.TestSuite({
            name: "Shaker Tests",
            tearDown: function () {
                console.log("\nTests Ran:")
                Y.Array.each(self.tests, function (test) {
                    console.log(test);
                });
            }
        });

        Y.Object.each(config.apps, function (appConfig, appName) {
            appConfig.name = appName;
            var appSuite = new AppSuite(appConfig, self);
            self.suite.add(appSuite);
        });
    };

ShakerSuite.prototype = {
    print: function (str) {
        console.log("\n==============================================================================");
        console.log(str);
        console.log("==============================================================================\n");
    },
    addTest: function (test) {
        this.tests.push(test);
    }
};


YUITest.TestRunner.add(new ShakerSuite(config).suite);
