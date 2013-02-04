// During the build process, the content of this file should be output in the
// same bundle as the one containing the definition of the YUI global object.
// Obviously, because of the way JavaScript code is evaluated, the definition
// of the YUI global object should appear first in that bundle (after the
// content of yui-override.js however...)
// The content of this file should appear last in that bundle.

// The purpose of this file is to fix the standard behavior of a YUI instance
//     YUI().use('xxx', function (Y) {...});
// will result in the callback being invoked immediately, even if the required
// modules are not available! The following code will prevent this from
// happening *and* will automatically invoke the callback as soon as the
// required modules become available (in case you manage the loading of your
// JavaScript bundles separately)

// This file is not used by shaker, the yui-fake-inline-min.js will be used instead.

// This optimization is based on the work of:
// @jlecomte for Yahoo! Search
// @rgrove (https://github.com/rgrove/lazyload/)

/*jslint nomen: true, plusplus: true, continue: true */
/*globals _YUI */

(function () {
    'use strict';

    window.YUI = function (cfg) {
        return {
            use: function () {
                var args = Array.prototype.slice.call(arguments);
                YUI.Env.pending.push([cfg].concat(args));
            }
        };
    };

    YUI.config = {
        doc: document
    };

    YUI.Env = {

        mods: {},

        pending: [],

        add: function (el, type, fn, capture) {
            if (el && el.addEventListener) {
                el.addEventListener(type, fn, capture);
            } else if (el && el.attachEvent) {
                el.attachEvent('on' + type, fn);
            }
        },

        remove: function (el, type, fn, capture) {
            if (el && el.removeEventListener) {
                try {
                    el.removeEventListener(type, fn, capture);
                } catch (ex) {
                    /* ignore */
                }
            } else if (el && el.detachEvent) {
                el.detachEvent('on' + type, fn);
            }
        }
    };

    YUI.add = function (name, fn, version, details) {
        YUI.Env.mods[name] = {
            name: name,
            fn: fn,
            version: version,
            details: details || {}
        };
    };

    YUI.applyConfig = function (config) {
        YUI.pendingApplyConfig = config;
    };

    YUI.merge = function (obj1, obj2) {
        var attr;
        for (attr in obj2) {
            if (obj2.hasOwnProperty(attr)) {
                obj1[attr] = obj2[attr];
            }
        }
    };

    YUI.onYUIReady = function () {
        var config = this.pendingApplyConfig || {},
            args = this.Env.pending.shift(),
            instance = args.shift() || YUI();

        this.merge(YUI.Env.mods, _YUI.Env.mods);
        instance.applyConfig(config);
        instance.use.apply(instance, args);
    };

    var

        //-----------------------------------------------------------------------------
        // A few shorthands...
        //-----------------------------------------------------------------------------

        w = window,
        d = document,
        add = YUI.Env.add,
        remove = YUI.Env.remove,

        //-----------------------------------------------------------------------------
        // Some basic browser sniffing...
        //-----------------------------------------------------------------------------

        ie = /MSIE/.test(navigator.userAgent),

        //-----------------------------------------------------------------------------
        // A simplistic queue allowing us to use a single 'load' event handler
        // and execute functions in the order they were added to the queue,
        // regardless of the browser.
        //-----------------------------------------------------------------------------

        OnloadHandlerQueue = (function () {

            var queue = [];

            function onLoad(e) {
                // Use a setTimeout to not interfere with RTB measurements!
                setTimeout(function () {
                    var i, l;

                    for (i = 0, l = queue.length; i < l; i++) {
                        queue[i]();
                    }

                    remove(w, 'load', onLoad);
                }, 0);
            }

            add(w, 'load', onLoad);

            return {
                add: function (fn) {
                    queue.push(fn);
                }
            };

        }()),

        //-----------------------------------------------------------------------------
        // A tiny JavaScript and CSS loader
        //-----------------------------------------------------------------------------

        SimpleLoader = (function () {

            var queue = [],
                windowLoaded = false,
                jsRequestsPending = 0;

            function decrementRequestPending() {
                jsRequestsPending--;
                if (jsRequestsPending === 0) {
                    setTimeout(function () {
                        if (typeof _YUI !== 'undefined') {
                            // Remember that we decrement jsRequestsPending
                            // on error as well! This means that _YUI may be
                            // undefined!
                            _YUI.onYUIReady();
                        }
                    }, 0);
                }
            }

            function createNode(name, attrs) {
                var node = d.createElement(name), key, value;

                for (key in attrs) {
                    if (attrs.hasOwnProperty(key)) {
                        value = attrs[key];
                        node.setAttribute(key, value);
                    }
                }

                return node;
            }

            function flush() {
                var i, l, asset, node,
                    head = d.getElementsByTagName('head')[0];

                for (i = 0, l = queue.length; i < l; i++) {
                    asset = queue[i];

                    if (asset.type === 'css') {

                        node = createNode('link', {
                            href: asset.url,
                            rel: 'stylesheet',
                            type: 'text/css'
                        });

                    } else if (asset.type === 'js') {

                        node = createNode('script', {
                            src: asset.url
                        });

                        if (ie) {
                            node.onreadystatechange = function () {
                                if (/loaded|complete/.test(this.readyState)) {
                                    this.onreadystatechange = null;
                                }
                                decrementRequestPending();
                            };
                        } else {
                            node.onload = node.onerror = decrementRequestPending;
                        }
                    } else {
                        continue;
                    }

                    head.appendChild(node);
                }

                windowLoaded = true;
                queue = [];
            }

            function load(type) {
                var urls = Array.prototype.slice.call(arguments, 1),
                    i = 0,
                    l = urls.length;

                for (i = 0; i < l; i++) {
                    if (type === 'js') {
                        jsRequestsPending++;
                    }

                    queue.push({
                        type: type,
                        url: urls[i]
                    });
                }

                if (windowLoaded) {
                    flush();
                }
            }

            OnloadHandlerQueue.add(flush);

            return {

                js: function () {
                    var args = Array.prototype.slice.call(arguments);
                    load.apply(null, ['js'].concat(args));
                },

                css: function () {
                    var args = Array.prototype.slice.call(arguments);
                    load.apply(null, ['css'].concat(args));
                }
            };

        }());

    //-----------------------------------------------------------------------------
    // Make some of the functionality exposed in this file available to code that
    // will reside outside of this closure. Since we don't want to clobber the
    // global scope, let's just bind stuff to the YUI object. We'll have to copy
    // those things to the real YUI object once it is available!
    //-----------------------------------------------------------------------------

    YUI.OnloadHandlerQueue = OnloadHandlerQueue;
    YUI.SimpleLoader = SimpleLoader;

}());
