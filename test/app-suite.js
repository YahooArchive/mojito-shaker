var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    CompilerTests = require('./compiler-tests.js').CompilerTests;

exports.AppSuite = function (appConfig, appName) {

    var appSuite = new YUITest.TestSuite({
        name: appName
    });

    Y.Object.each(appConfig.compilation, function (compilationConfig, compilationName) {
        var compilerSuite = new CompilerTests(compilationConfig, compilationName, appName);
        appSuite.add(compilerSuite);
    });

    return appSuite;
};