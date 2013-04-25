YUI.add('child-controller', function (Y, NAME) {
    'use strict';
    var mojitName = "Child";
    Y.namespace('mojito.controllers')[NAME] = {

        index: function (ac) {
            console.log(mojitName + " - Index Action");
            ac.shakerInline.inlineFile('code', 'js');

            ac.done({
                name: mojitName,
                device: JSON.stringify(ac.context.device)
            });
        }
    };

}, '0.0.1', {requires: ['mojito', 'mojito-assets-addon', 'mojito-intl-addon', 'shaker-inline-addon']});