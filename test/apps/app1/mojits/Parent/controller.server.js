YUI.add('parent-controller', function (Y, NAME) {
    'use strict';
    var mojitName = 'Parent';

    Y.namespace('mojito.controllers')[NAME] = {

        // composite child mojit
        index: function (ac) {
            ac.shaker.set('title', 'Index Page');
            console.log(mojitName + ' - Index Action');
console.log("parent");
            ac.composite.execute({
                children: {
                    'child': {
                        action: 'index',
                        type: 'Child'
                    }
                }
            }, function (data, meta) {
                data.name = mojitName;
                ac.done(data, meta);
            });
        },

        view2: function (ac) {
            console.log('Parent controller - view 2');
            // no child mojit
        },

        view2_update: function (ac) {
            // get child mojit
        }

    };

}, '0.0.1', {requires: ['mojito', 'mojito-config-addon', 'mojito-composite-addon', 'mojito-assets-addon', 'mojito-shaker-addon']});