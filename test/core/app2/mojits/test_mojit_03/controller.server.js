/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
YUI.add('test_mojit_01', function(Y) {

/**
 * The test_mojit_01 module.
 *
 * @module test_mojit_01
 */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.mojito.controller = {

        /**
         * Method corresponding to the 'index' action.
         *
         * @param ac {Object} The ActionContext that provides access
         *        to the Mojito API.
         */
        index: function(ac) {
            ac.done('Mojito is working.');
        }

    };

}, '0.0.1', {requires: ['mojito']});
