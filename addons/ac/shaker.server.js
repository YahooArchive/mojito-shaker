/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
YUI.add('mojito-shaker-addon', function(Y, NAME) {
    var libfs = require('fs'),libpath = require('path');

    function ShakerAddon(command, adapter, ac) {
        this._ac = ac;// the future action context of the mojit (not attached yet if mojit created dynamically)
        this._adapter = adapter;// where the functions done and error live before attach them to the ac.
        this._command = command;//all the configuration for the mojit
        this._init(ac,adapter);
    }

    ShakerAddon.prototype = {
        namespace: 'shaker',
        _init:function(ac, adapter){

        },
        run: function(meta, tunnel){
            
        }
    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {requires: ['mojito']});
