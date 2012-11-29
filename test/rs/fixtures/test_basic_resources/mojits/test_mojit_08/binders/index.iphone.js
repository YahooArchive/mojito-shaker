/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('test_mojit_08_BinderIphoneIndex', function(Y, NAME) {

/**
 * The thirdBinderIndex module.
 *
 * @module thirdBinderIndex
 */

    /**
     * Constructor for the thirdBinderIndex class.
     *
     * @class thirdBinderIndex
     * @constructor
     */
    Y.namespace('mojito.binders')[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function(mojitProxy) {
            
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function(node) {
        }

    };

}, '0.0.1', {requires: ['mojito-client','binderDep']});
