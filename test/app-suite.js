var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    libpath = require('path'),
    CompilationSuite = require('./compilation-suite.js').CompilationSuite,
    RuntimeSuite = require('./runtime-suite.js').RuntimeSuite,
    RequestTests = require('./request-tests.js').RequestTests;

exports.AppSuite = function (appConfig, shakerSuite) {

    var appSuite = new YUITest.TestSuite({
            name: appConfig.name,
            setUp: function () {
                shakerSuite.print(this.name);
            }
        }),
        self = this;

    this.name = appConfig.name;
    this.config = appConfig;
    this.root = libpath.join(__dirname, 'apps/' + this.name);

    Y.Object.each(appConfig.compilation, function (compilationConfig, compilationName) {
        if (compilationConfig.disabled) {
            return;
        }

        compilationConfig.name = compilationName;
        var compilationSuite = new CompilationSuite(compilationConfig, self, shakerSuite);
        appSuite.add(compilationSuite.suite);
        Y.Object.each(appConfig.runtime, function (runtimeConfig, runtimeName) {
            if (runtimeConfig.disabled) {
                return;
            }
            runtimeConfig.name = runtimeName;
            var runtimeSuite = new RuntimeSuite(runtimeConfig, compilationSuite, self, shakerSuite);
            compilationSuite.suite.add(runtimeSuite.suite);
            Y.Object.each(appConfig.request, function (requestConfig, requestName) {
                if (requestConfig.disabled) {
                    return;
                }
                requestConfig.name = requestName;
                requestConfig.path = requestConfig.path || requestName;
                requestTests = new RequestTests(requestConfig, runtimeSuite, compilationSuite, self, shakerSuite);
                runtimeSuite.suite.add(requestTests.test);
            });
        });
    });

    return appSuite;
};