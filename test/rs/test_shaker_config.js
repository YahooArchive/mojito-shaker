/*
* This test should be executed in the file's path.
*/

var YUITest = require('yuitest').YUITest,
    Shaker = require('../../lib/core.js').ShakerCore,
    libfs = require('fs');
    libpath = require('path');

var Assert = YUITest.Assert;
var suite = new YUITest.TestSuite("Shaker Config");


suite.add( new YUITest.TestCase({
        name: "Shaker configuration",
                
        setUp : function () {
            var relRoot = 'fixtures/test_shaker_config',
                root = libpath.join(__dirname, relRoot);
            this.shaker = new ShakerCore({root: root});
        },
        tearDown : function () {
            
        },
        'test get shaker config at mojit level': function () {
            var config = this.shaker.getShakerConfigByContext('test_mojit_01', {});
            Assert.isTrue(config.mode === 'master');
        },
        'test get shaker config at mojit level (device:iphone)': function () {
            var config = this.shaker.getShakerConfigByContext('test_mojit_01', {device:'iphone'});
            Assert.isTrue(config.mode === 'device-iphone');
        },
        'test  app shaker config by context': function () {
            var runConfig = this.shaker.getAppShakerConfigByContext({});
            Assert.isNotUndefined(runConfig.master);
        },
        'test app shaker config by context(device:iphone)': function () {
            var runConfig = this.shaker.getAppShakerConfigByContext({device: 'iphone'});
            Assert.isNotUndefined(runConfig.master);
            Assert.isNotUndefined(runConfig.device);
        },
        'test shaker file at app level': function (){
            var config = this.shaker.getShakerConfigByContext('shared', {});
            Assert.isNotUndefined(config.slave);
        },
        'test shaker file at app level (device:iphone)': function (){
            var config = this.shaker.getShakerConfigByContext('shared', {device: 'iphone'});
            Assert.isNotUndefined(config.slave);
            Assert.isNotUndefined(config.slave2);
        },
        'test get POSL dimensions': function () {
            var posl = this.shaker._getUsedContexts();
            Assert.isTrue(posl.length === 2);
        },
        'test getAllMojits': function () {
            var mojits = this.shaker.getMojitList();
            Assert.isTrue(mojits.length === 4);
            Assert.isTrue(mojits[0] === 'test_mojit_01');
        },
        'test get Merge config for app level': function (){
            var config = this.shaker.getMergedShakerConfigByContext('shared', {});
            Assert.isTrue(Y.Object.size(config) === 4);
            Assert.isTrue(config.slave === 'true');
        },
        'test get Merge config for mojit level': function (){
            var config = this.shaker.getMergedShakerConfigByContext('test_mojit_01', {});
            Assert.isTrue(Y.Object.size(config) === 5);
            Assert.isNotUndefined(config.child);
        }

       }));

YUITest.TestRunner.add(suite);
