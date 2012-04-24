/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('secondary', function(Y, NAME) {

/**
 * The features module.
 *
 * @module features
 */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.mojito.controllers[NAME] = {
        init: function(config) {
           this.config = config;
         },

        /**
         * Method corresponding to the 'index' action.
         *
         * @param ac {Object} The ActionContext that provides access
         *        to the Mojito API.
         */
        index: function(ac) {
            ac.done({'title': 'secondary'});
        }

    };

}, '0.0.1', {requires: ['mojito']});
