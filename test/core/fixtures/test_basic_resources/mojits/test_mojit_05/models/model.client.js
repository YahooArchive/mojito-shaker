/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('test_mojit_05ModelFoo', function(Y, NAME) {

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
    Y.namespace('mojito.models')[NAME] = {

        init: function(config) {
            this.config = config;
        },

        /**
         * Method that will be invoked by the mojit controller to obtain data.
         *
         * @param callback {function(err,data)} The callback function to call when the
         *        data has been retrieved.
         */
        getData: function(callback) {
            callback(null, { some: 'data' });
        }

    };

}, '0.0.1', {requires: []});
