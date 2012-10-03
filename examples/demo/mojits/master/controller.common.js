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
            var dims = ac.params.getFromUrl(),
                self = this,
                lang = ac.intl.lang();
            
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
                //ac.assets.addJs('top.js','top');
                //ac.assets.addJs('bottom.js','bottom');
                data.buttons = self.createButtons(ac, dims);
                data.language = lang.MYLANG;
                ac.done(data, meta);
            });
        },
        search: function(ac) {
            var dims = ac.params.getFromUrl(),
                self = this,
                lang = ac.intl.lang();
            
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
                //ac.assets.addJs('top.js','top');
                //ac.assets.addJs('bottom.js','bottom');
                data.buttons = self.createButtons(ac, dims);
                data.language = lang.MYLANG;
                ac.done(data, meta);
            });
        },
        createButtons: function (ac, dims) {
            var buttons = [],
                className,
                label,
                url;
            
            Y.each(Y.Object.keys(DIMENSIONS), function (dim) {
                var params = Y.merge({}, dims);
                
                className = 'nav nav-' + dim + (dims[dim] ? ' active' : '');
                params[dim] ? delete params[dim] : params[dim] = DIMENSIONS[dim];
                
                url = ac.url.make('myhtmlframe', 'index', null, 'GET', params);
                
                label = dim.substring(0,1).toUpperCase() + dim.substring(1);
                
                buttons.push('<a href="'+url+'" class="'+className+'">'+label+'</a>');
            });
            
            return buttons.join('\n');
        }
    };

}, '0.0.1', {requires: ['mojito', 'mojito-assets-addon','mojito-intl-addon']});
