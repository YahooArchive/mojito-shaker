/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('master', function(Y, NAME) {

/**
 * The master module.
 *
 * @module master
 */

var DIMENSIONS = {
    device: 'smartphone',
    region: 'CA',
    skin  : 'grey'
};

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
            var self = this;
            
                config = {
                    view: 'index',
                    children: {
                        primary: {
                            type: 'primary',
                            action: 'index'
                        },
                        secondary: {
                            type: 'secondary',
                            action: 'index'
                        }
                    }
                };
                
            ac.composite.execute(config, function (data, meta) {
                ac.done(data, meta);
            });
        }
    };

}, '0.0.1', {requires: ['mojito', 'mojito-assets-addon']});
