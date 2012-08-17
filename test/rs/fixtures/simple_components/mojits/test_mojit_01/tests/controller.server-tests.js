/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */

YUI.add('test_mojit_01-tests', function(Y) {

    var suite = new YUITest.TestSuite('test_mojit_01-tests'),
        controller = null,
        A = YUITest.Assert;

    suite.add(new YUITest.TestCase({
        
        name: 'test_mojit_01 user tests',
        
        setUp: function() {
            controller = Y.mojito.controllers.test_mojit_01;
        },
        tearDown: function() {
            controller = null;
        },
        
        'test mojit': function() {
            var ac,
                modelData,
                assetsResults,
                doneResults;
            modelData = { x:'y' };
            ac = {
                assets: {
                    addCss: function(css) {
                        assetsResults = css;
                    }
                },
                models: {
                    test_mojit_01ModelFoo: {
                        getData: function(cb) {
                            cb(null, modelData);
                        }
                    }
                },
                done: function(data) {
                    doneResults = data;
                }
            };

            A.isNotNull(controller);
            A.isFunction(controller.index);
            controller.index(ac);
            A.areSame('./index.css', assetsResults);
            A.isObject(doneResults);
            A.areSame('Mojito is working.', doneResults.status);
            A.isObject(doneResults.data);
            A.isTrue(doneResults.data.hasOwnProperty('x'));
            A.areEqual('y', doneResults.data['x']);
            
        }
        
    }));
    
    YUITest.TestRunner.add(suite);
    
}, '0.0.1', {requires: ['mojito-test', 'test_mojit_01']});
