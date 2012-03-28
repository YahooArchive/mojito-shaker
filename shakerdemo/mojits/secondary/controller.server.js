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
            var dim = ac.params.getFromUrl();
            
            ac.assets.addCss('/static/' + NAME + '/assets/common/' + NAME + '.css');
            
            dim.device && ac.assets.addCss(this.cssPath('device',   dim.device));
            dim.region && ac.assets.addCss(this.cssPath('region', dim.region));
            dim.skin   && ac.assets.addCss(this.cssPath('skin',   dim.skin));

            ac.done();
        },
        
        cssPath: function (dim, val) {
            val || (val = dim);
            
            return '/static/' + NAME + '/assets/' + dim + '/' + val + '/' + 
                NAME + '-' + val + '.css';
        }

    };

}, '0.0.1', {requires: ['mojito']});
