var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert,
    libpath = require('path'),
    commonTests = require('./config.js').commonTests;

exports.RequestTests = function (requestConfig, runtimeSuite, compilationSuite, appSuite, shakerSuite) {

    var self = this,
        testCaseConfig = {
            name: requestConfig.name,
            fullName: appSuite.name + " > " + compilationSuite.name + " > " + runtimeSuite.name + " > " + requestConfig.name,
            setUp: function () {
                shakerSuite.print(this.fullName);
                self.shaker = self.getShakerConfig(runtimeSuite.config.shaker, compilationSuite.config.shaker);
            }
        };
    this.fullName = testCaseConfig.fullName;
    this.name = requestConfig.name;
    this.config = requestConfig;

    Y.Object.each(requestConfig.tests, function (testConfig, testName) {
    	if (!testConfig || testConfig.disabled) {
    		return;
    	}
    	shakerSuite.addTest(testCaseConfig.fullName + " > " + testName);
    	testConfig = Y.Lang.isObject(testConfig) ? testConfig : {};
    	var testLocation = testConfig.test || commonTests[testName],
    		test = require(libpath.join(__dirname, testLocation)).test;
        testCaseConfig[testName] = function () {
            /*if (self.fullName === "app1 > No YUI, No Bootstrap > Production Environment > /") {
                self.test.wait(999999);
            }*/
            runtimeSuite.getWebPage(requestConfig.path, function (node, content) {
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

    shaker.seed = shakerRuntime.seed;
    shaker.settings = shakerRuntime.settings;
    shaker.resources = shakerCompilation.resources;
    shaker.tasks = shakerCompilation.tasks;
    shaker.routeRollups = shakerCompilation.routeRollups;
    shaker.locations = shakerCompilation.locations;

    return shaker;
};

