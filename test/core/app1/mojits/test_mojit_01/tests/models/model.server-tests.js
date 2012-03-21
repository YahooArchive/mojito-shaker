/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */

YUI.add('test_mojit_01Model-tests', function(Y) {
    
    var suite = new YUITest.TestSuite('test_mojit_01Model-tests'),
        model = null,
        A = YUITest.Assert;
    
    suite.add(new YUITest.TestCase({
        
        name: 'test_mojit_01 model user tests',
        
        setUp: function() {
            model = Y.mojito.models.test_mojit_01ModelFoo;
        },
        tearDown: function() {
            model = null;
        },
        
        'test mojit model': function() {
            A.isNotNull(model);
            A.isFunction(model.getData);
        }
        
    }));
    
    YUITest.TestRunner.add(suite);
    
}, '0.0.1', {requires: ['mojito-test', 'test_mojit_01ModelFoo']});
