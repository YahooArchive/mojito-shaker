/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('primary', function(Y, NAME) {

/**
 * The leadstory module.
 *
 * @module leadstory
 */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */

    Y.mojito.controllers[NAME] = {
        init: function(config) {
           this.config  = config;
         },
        /**
         * Method corresponding to the 'index' action.
         *
         * @param ac {Object} The ActionContext that provides access
         *        to the Mojito API.
         */
        index: function(ac) {
            ac.done({"title":"primary",
                "data-action": 'filter',
                "data-params": 'f=5&q=7'
            });
        },
        dynamic: function(ac){
            //ac.done('AJAX!');
            //ac.done({title:'Dynamic done!'});

            var config = {
                    children: {
                        myThird: {
                            type: 'third',
                            action: 'index'
                        }
                    }
                };
            ac.composite.execute(config, function (data, meta) {
                ac.done(data, meta);

            });
        }

    };

}, '0.0.1', {requires: ['mojito','foo-addon']});
