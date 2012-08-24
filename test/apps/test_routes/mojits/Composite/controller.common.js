/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('Composite', function(Y, NAME) {

/**
 * The Composite module.
 *
 * @module Composite
 */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace('mojito.controllers')[NAME] = {

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
            ac.models.CompositeModelFoo.getData(function(err, data) {
                if (err) {
                    ac.error(err);
                    return;
                }
                var config = {
                    children: {
                        test:{
                            type: 'Test'
                        }
                    }
                };

              //  ac.assets.addCss('./index.css');
                ac.composite.execute(config, function (data, meta){
                    ac.done({
                        status: 'Mojito is working.',
                        data: data
                    }, meta);
                });
            });
        }

    };

}, '0.0.1', {requires: ['mojito', 'CompositeModelFoo']});
