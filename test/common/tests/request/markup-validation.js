var Y = require('yui').YUI({useSync: true}).use('base-base'),
    YUITest = require('yuitest').YUITest,
    Assert = YUITest.Assert,
    standardValidation = require('./standard-validation').test;

exports.test = function (url, node, config) {
    // TODO: create markup test
    var shaker = getShakerConfig(config);

    standardValidation(node, shaker);
    debugger;
}

