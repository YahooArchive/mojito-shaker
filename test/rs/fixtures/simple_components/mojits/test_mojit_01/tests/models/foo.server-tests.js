/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */

YUI.add('test_mojit_01ModelFoo-tests', function(Y, NAME) {
    
    var suite = new YUITest.TestSuite(NAME),
        model = null,
        A = YUITest.Assert;
    
    suite.add(new YUITest.TestCase({
        
        name: 'test_mojit_01ModelFoo user tests',
        
        setUp: function() {
            model = Y.mojito.models.test_mojit_01ModelFoo;
        },
        tearDown: function() {
            model = null;
        },
        
        'test mojit model': function() {
            var called = false;
            A.isNotNull(model);
            A.isFunction(model.getData);
            model.getData(function(err, data) {
                called = true;
                A.isTrue(!err);
                A.isObject(data);
                A.areSame('data', data.some);
            });
            A.isTrue(called);
        }
        
    }));
    
    YUITest.TestRunner.add(suite);
    
}, '0.0.1', {requires: ['mojito-test', 'test_mojit_01ModelFoo']});
