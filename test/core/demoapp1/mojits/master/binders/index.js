/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add('masterBinderIndex', function(Y, NAME) {

/**
 * The masterBinderIndex module.
 *
 * @module masterBinderIndex
 */

    /**
     * Constructor for the masterBinderIndex class.
     *
     * @class masterBinderIndex
     * @constructor
     */
    Y.namespace('mojito.binders')[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function(mojitProxy) {
            this.count = 1;
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function(node) {
            var me = this;
            this.node = node;
            Y.one('a').on('click',this.execute,this);

        },
        execute:function(){
            this.count++;
            this.mojitProxy.invoke('lazy',{c: this.count},Y.bind(this.cb,this));
        },
        cb:function(err,data,meta){
            Y.log(arguments);
        }

    };

}, '0.0.1', {requires: ['event-mouseenter', 'mojito-client','shaker-runtime']});
