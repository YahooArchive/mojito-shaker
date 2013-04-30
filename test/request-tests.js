var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert,
    libpath = require('path'),
    commonTests = require('./config.js').commonTests;

exports.RequestTests = function (requestConfig, runtimeSuite, compilationSuite, appSuite) {

    var self = this,
        testCaseConfig = {
            name: requestConfig.name,
            setUp: function () {
                console.log("\n==============================================================================");
                console.log(appSuite.name + " > " + compilationSuite.name + " > " + runtimeSuite.name + " > " + this.name);
                console.log("==============================================================================\n");
                self.shaker = self.getShakerConfig(runtimeSuite.config.shaker, compilationSuite.config.shaker);
            }
        };

    this.name = requestConfig.name;
    this.config = requestConfig;

    Y.Object.each(requestConfig.tests, function (testConfig, testName) {
    	if (!testConfig || testConfig.disabled) {
    		return;
    	}
    	testConfig = Y.Lang.isObject(testConfig) ? testConfig : {};
    	var testLocation = testConfig.test || commonTests[testName],
    		test = require(libpath.join(__dirname, testLocation)).test;
        testCaseConfig[testName] = function () {
            runtimeSuite.getWebPage(requestConfig.path, function (node) {
                self.test.resume(function () {
                    Assert.isNotNull(node, "Invalid html page.");
                    var url = "http://localhost:" + runtimeSuite.port + requestConfig.path;
                    test(url, node, self.shaker, {
                        test: testConfig,
                        request: requestConfig,
                        runtime: runtimeSuite.config,
                        compilation: compilationSuite.config});
                });
            });
            self.test.wait();
        };
    });

    this.test = new YUITest.TestCase(testCaseConfig);
};

exports.RequestTests.prototype.getShakerConfig = function (shakerRuntime, shakerCompilation) {
    var shaker = {};

    shaker.settings = shakerRuntime.settings;
    shaker.resources = shakerCompilation.resources;
    shaker.tasks = shakerCompilation.tasks;
    shaker.routeRollups = shakerCompilation.routeRollups;
    shaker.locations = shakerCompilation.locations;

    return shaker;
};

