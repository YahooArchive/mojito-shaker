/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
YUI.add('test_mojit_01ModelFoo', function(Y) {

/**
 * The test_mojit_01ModelFoo module.
 *
 * @module test_mojit_01
 */

    /**
     * Constructor for the test_mojit_01ModelFoo class.
     *
     * @class test_mojit_01ModelFoo
     * @constructor
     */
    Y.mojito.models.test_mojit_01ModelFoo = {

        init: function(config) {
            this.config = config;
        },

        /**
         * Method that will be invoked by the mojit controller to obtain data.
         *
         * @param callback {Function} The callback function to call when the
         *        data has been retrieved.
         */
        getData: function(callback) {
            callback({some:'data'});
        }

    };

}, '0.0.1', {requires: []});
