var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    libpath = require('path'),
    ShakerResources = require('../lib/resources.js').ShakerResources,
    commonTests = require('./config.js').commonTests,
    ShakerCompiler = require('../lib/compiler').ShakerCompiler;

exports.CompilationSuite = function (compilationConfig, appSuite, shakerSuite) {

    var self = this,
        testCaseConfig = {
            name: "Compiler Tests"
        };

    this.fullName = appSuite.name + " > " + compilationConfig.name;

    this.config = compilationConfig;
    this.suite = new YUITest.TestSuite({
        name: compilationConfig.name,
        fullName: self.fullName,
        setUp: function () {
            shakerSuite.print(self.fullName);
        }
    });

    this.name = compilationConfig.name;
    this.root = appSuite.root;
    this.shakerConfig = compilationConfig.shaker;

    Y.Object.each(compilationConfig.tests, function (testConfig, testName) {
    	if (!testConfig || testConfig.disabled) {
    		return;
    	}

    	shakerSuite.addTest(self.fullName + " > " + testName);
    	testConfig = Y.Lang.isObject(testConfig) ? testConfig : {};
    	var testLocation = testConfig.test || commonTests[testName];
    		test = require(libpath.join(__dirname, testLocation)).test;
        testCaseConfig[testName] = function () {
            self.compile(function () {
                Assert = YUITest.Assert;
            	testConfig.shakerCompiler = self.shakerCompiler;
            	test(testConfig);
            });
        };
    });

    this.test = new YUITest.TestCase(testCaseConfig);
    this.suite.add(this.test);
};

exports.CompilationSuite.prototype = {
    compile: function (done) {

        if (this.shakerCompiler) {
            return done();
        }

        var self = this,
            context = this.config.context || {},
            originalGetShakerConfig = ShakerResources.prototype._getShakerConfig;

        // modify the ShakerResources _getShakerConfig prototype method to return test's config if available

    	ShakerResources.prototype._getShakerConfig = function (context) {
    		var orginalGetAppConfig = this.store.getAppConfig,
    			shakerConfig;

    		this.store.getAppConfig = function (appContext) {

    			var config = orginalGetAppConfig.apply(this, [appContext]);

    			config.shaker = self.shakerConfig || config.shaker;
    			self.config.shaker = config.shaker;
    			this.getAppConfig = orginalGetAppConfig;
    			return config;
    		};

    		shakerConfig = originalGetShakerConfig.apply(this, [context]);
    		ShakerResources.prototype._getShakerConfig = originalGetShakerConfig;
    		return shakerConfig;
    	}

        this.shakerCompiler = new ShakerCompiler(context, this.root);

        this.shakerCompiler.compile(function (err) {
            self.test.resume(function () {
                done();
            });
        });
        this.test.wait();
    }
};
