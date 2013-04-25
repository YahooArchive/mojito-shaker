/*
* This test should be executed in the file's path.
*/

var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    AppSuite = require('./app-suite.js').AppSuite,
    config = require('./config.js').tests,
    Assert = YUITest.Assert,
    shakerSuite = new YUITest.TestSuite({
        name: "Shaker Tests"
    });

Y.Object.each(config.apps, function (appConfig, appName) {
    var appSuite = new AppSuite(appConfig, appName);
    shakerSuite.add(appSuite);
});

YUITest.TestRunner.add(shakerSuite);
