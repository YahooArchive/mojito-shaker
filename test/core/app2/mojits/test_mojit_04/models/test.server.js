YUI.add('test_mojit_04ModelTestServer', function(Y, NAME) {
    Y.mojito.models[NAME] = {
        init: function(config) {
            this.config = config;
        },
        getData: function(callback) {
            callback(null, { some: 'data' });
        }
    };

}, '0.0.1', {requires: []});
