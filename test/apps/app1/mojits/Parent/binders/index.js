YUI.add('parentBinderIndex', function (Y, NAME) {
	'use strict';
    Y.namespace('mojito.binders')[NAME] = {
        init: function (mojitProxy) {
            Y.one(".log").append("<div>Binder: Parent index binder executed </div>");
        },

        bind: function () {
        }
    };

}, '0.0.1', {requires: ['parent-yui-module']});
