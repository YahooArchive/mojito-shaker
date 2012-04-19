/*jshint undef:true, eqeqeq:true, curly:true, immed:true, noempty:true, white:true*/
/*global HTMLElement WebKitCSSMatrix YUI*/

/**
 * CleanSlate Mojit Router
 *
 * @class MojitRouter
 * @namespace CS
 *
 * Usage:
 * var sv = new Y.CS.MojitRouter({ mode: 'listener' });
 *
 * CONFIG OPTIONS:
 *
 * maskEdges {Boolean} slight fade out effect on scrollview Y boundaries
 */

YUI.add('mojit-c', function (Y, NAME, UNDEF) {
    /**
     * @constructor
     * @param config {Object}
     */
    function MojitRouter(config) {
    }
    
    // public interface
    MojitRouter.prototype = {
        /**
         * Show scrollbar
         *
         * @method init
         * @param config {Object} parameter configuration
         */
        init: function (config) {
        },
        destroy: function (reset) {
        
        }

    };

    Y.namespace('CS').MojitRouter = MojitRouter;

}, "0.0.1", { requires: ['node']});