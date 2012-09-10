/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('third', function(Y, NAME) {

/**
 * The third module.
 *
 * @module third
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
            var datos =  {
                some: 'Some!'
            },
            lang = ac.intl.lang();

            //ac.assets.addCss('foo.css');
           // ac.assets.addCss('./index.css');
            ac.done({
                status: 'Mojito is working.',
                data: datos,
                language: lang.OTHERLANG
            });
        }

    };

}, '0.0.1', {requires: ['mojito','mojito-intl-addon', 'thirdModelFoo']});
