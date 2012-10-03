/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
YUI.add('primaryBinderIndex', function(Y, NAME) {

/**
 * The test_mojit_01BinderIndex module.
 *
 * @module test_mojit_01BinderIndex
 */

    /**
     * Constructor for the Binder class.
     *
     * @param mojitProxy {Object} The proxy to allow the binder to interact
     *        with its owning mojit.
     *
     * @class Binder
     * @constructor
     */
    Y.namespace('mojito.binders')[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function(mojitProxy) {
            this.mojitProxy = mojitProxy;
            Y.log('Loaded binder for primary mojit!');
        },
        
        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function(node) {
            this.node = node;
            Y.one('#call').on('click',this._executeInvoke,this);
        },
        _executeInvoke:function(evt){
            this.mojitProxy.invoke('dynamic',Y.bind(this.resultInvoke,this));
        },
        resultInvoke:function(err, data, meta){
            Y.one('#main').append(data);
        }

    };

}, '0.0.1', {requires: ['mojito-client','shaker-runtime']});
