/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('test_mojit_06', function(Y, NAME) {

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
    Y.namespace('mojito.controllers')[NAME] = {

        init: function(config) {
        },

        /**
         * Method corresponding to the 'index' action.
         *
         * @param ac {Object} The ActionContext that provides access
         *        to the Mojito API.
         */
        index: function(ac) {
        }

    };

}, '0.0.1', {requires: ['mojito','autoloadBase','test_mojit_06ModelFoo']});
