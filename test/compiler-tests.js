var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert,
    libpath = require('path'),
    async = require('async'),
    ShakerResources = require('../lib/resources.js').ShakerResources,
    commonTests = require('./config.js').commonTests,
    ShakerCompiler = require('../lib/compiler').ShakerCompiler;

exports.CompilerTests = function (compilationConfig, compilationName, appName) {

    var self = this,
        testCaseConfig = {
            name: compilationName
        };

    this.compilationConfig = compilationConfig;
    this.appName = appName;
    this.shakerConfig = compilationConfig.shaker;

    Y.Object.each(compilationConfig.tests, function (testConfig, testName) {
    	if (!testConfig) {
    		return;
    	}
    	testConfig = Y.Lang.isObject(testConfig) ? testConfig : {};
    	var testLocation = testConfig.test || commonTests[testName];
    		test = require(libpath.join(__dirname, testLocation)).test;
        testCaseConfig[testName] = function () {
            self.compile(function () {
            	testConfig.shakerCompiler = self.shakerCompiler;
            	test(testConfig)
            });
        };
    });

    this.test = new YUITest.TestCase(testCaseConfig);

    return this.test;
};

exports.CompilerTests.prototype = {
    compile: function (done) {

        if (this.shakerCompiler) {
            return done();
        }

        var self = this,
            context = this.compilationConfig.context || {},
            root = libpath.join(__dirname, 'apps/' + this.appName),
            originalGetShakerConfig = ShakerResources.prototype._getShakerConfig;

        // modify the ShakerResources _getShakerConfig prototype method to return test's config if available
        if (this.shakerConfig) {
        	ShakerResources.prototype._getShakerConfig = function (context) {
        		var orginalGetAppConfig = this.store.getAppConfig,
        			shakerConfig;

        		this.store.getAppConfig = function (appContext) {

        			var config = orginalGetAppConfig.apply(this, [appContext]);

        			config.shaker = self.shakerConfig;
        			this.getAppConfig = orginalGetAppConfig;
        			return config;
        		};

        		shakerConfig = originalGetShakerConfig.apply(this, [context]);
        		ShakerResources.prototype._getShakerConfig = originalGetShakerConfig;
        		return shakerConfig;
        	}
        }

        this.shakerCompiler = new ShakerCompiler(context, root);

        this.shakerCompiler.compile(function (err) {
            self.test.resume(function () {
                done();
            });
        });
        this.test.wait();
    }
};
