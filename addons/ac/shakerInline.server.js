/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

YUI.add('shaker-inline-addon', function(Y, NAME) {

    function ShakerInlineAddon(command, adapter, ac) {
        this._ac = ac; // the future action context of the mojit (not attached yet if mojit created dynamically)
        this._adapter = adapter; // where the functions done and error live before attach them to the ac.
        this._command = command; //all the configuration for the mojit
        this._init(ac, adapter);
    }

    ShakerInlineAddon.prototype = {
        namespace: 'shakerInline',

        setStore: function (rs) {
            this.rs = rs;
        },
        /*
        * getter for abstract the access of the store, since the accesors to the store may change
        * in the next version of Mojito...
        */
        getStore: function () {
            if (this.rs) {
                return this.rs;
            } else {
                // dirty fallback version to access the store
                this.rs = this._adapter.req.app.store;
                return this.rs;
            }
        },

        _init: function (ac, adapter) {
            this._hookDoneMethod(ac, adapter);
        },
        _hookDoneMethod: function (ac, adapter) {
            var self = this,
                doneMethod = adapter.done;

            adapter.done = function () {
                // We don't know for sure how many arguments we have,
                // so we have to pass through the hook references plus all the original arguments.
                self._handleDone.apply(self, [this, doneMethod].concat([].slice.apply(arguments)));
            };
        },
        /*
        * The first two arguments are the real context and method of Mojito, that we pass artificially on @_hookDoneMethod
        * The rest are the original arguments that are being passed by Mojito.
        * We have to do like this since we need to modify the arguments but we don't know how many we got.
        */
        _handleDone: function (selfContext, done, data, meta) {
            var assets = meta.assets,
                inlineShaker = assets.inlineShaker;

            if (!inlineShaker.blob) {
                inlineShaker.blob = [];
            }
            
            if (typeof data === 'string') {
                    data += inlineShaker.blob.join('');
            } else if (data instanceof Array) {
                    data.concat(inlineShaker.blob);
            }

            // Remove the inlineAssets from meta, since we just added to the view
            // (if not we would get duplicates)
            delete assets.inlineShaker;

            // Restore the original arguments and call the real ac.done with the modified data.
            args = [].slice.apply(arguments).slice(2);
            done.apply(selfContext, args);
        }
    };
    //we just add it to ac in case at some point we will have an API
    Y.mojito.addons.ac.shakerInline = ShakerInlineAddon;

}, '0.0.1', {requires: ['mojito']});
