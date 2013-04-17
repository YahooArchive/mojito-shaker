/*jslint browser: true, plusplus: true */

// This code should appear inline in the page. Its role is to allow the
// parallel download of multiple bundles containing YUI modules, and to have
// invocations of YUI().use(...) inline in the page (because modules often
// require data that is specific to a given page view) without having a huge
// blowup!

// For more information, please refer to: http://tiny.corp.yahoo.com/Zu7beG

(function () {
    'use strict';

    //-------------------------------------------------------------------------
    // Utility functions...
    //-------------------------------------------------------------------------

    function addEventListener(el, type, fn, capture) {
        if (el && el.addEventListener) {
            el.addEventListener(type, fn, capture);
        } else if (el && el.attachEvent) {
            el.attachEvent('on' + type, fn);
        }
    }

    function removeEventListener(el, type, fn, capture) {
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

    var

    //-------------------------------------------------------------------------
    // A few shorthands...
    //-------------------------------------------------------------------------

        w = window,
        d = document,

    //-------------------------------------------------------------------------
    // A simplistic queue allowing us to use a single 'load' event handler
    // and execute functions in the order they were added to the queue,
    // regardless of the browser.
    //-------------------------------------------------------------------------

        OnloadHandlerQueue = (function () {

            var queue = [];

            function onLoad() {
                // Use a setTimeout to not interfere with RTB measurements!
                setTimeout(function () {
                    var i, l;
                    for (i = 0, l = queue.length; i < l; i++) {
                        queue[i]();
                    }
                    removeEventListener(w, 'load', onLoad);
                }, 0);
            }

            addEventListener(w, 'load', onLoad);

            return {
                add: function (fn) {
                    queue.push(fn);
                }
            };

        }()),

    //-------------------------------------------------------------------------
    // A tiny JavaScript loader guaranteeing that no asset will be
    // downloaded prior to onload.
    //-------------------------------------------------------------------------

        SimpleLoader = (function () {

            var queue = [],
                windowLoaded = false;

            function flush() {
                var i, l, node,
                    s = d.getElementsByTagName('script')[0],
                    p = s.parentNode;

                for (i = 0, l = queue.length; i < l; i++) {
                    node = d.createElement('script');
                    node.type = 'text/javascript';
                    node.src = queue[i];
                    p.insertBefore(node, s);
                }

                windowLoaded = true;
                queue = [];
            }

            OnloadHandlerQueue.add(flush);

            return {

                js: function () {
                    var urls = Array.prototype.slice.call(arguments, 0);

                    queue = queue.concat(urls);

                    if (windowLoaded) {
                        flush();
                    }
                }
            };

        }()),

    //-------------------------------------------------------------------------
    // This is our fake YUI object. It contains the minimum needed to get
    // the ball rolling before the real YUI object becomes available. It
    // is only really needed if the bundle containing the definition of
    // the real YUI object is not loaded first, which may very well happen
    // since the order in which bundles are loaded cannot be controlled.
    //-------------------------------------------------------------------------

        YUI = function (cfg) {

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
        add: addEventListener,
        remove: removeEventListener
    };

    YUI.add = function (name, fn, version, details) {
        YUI.Env.mods[name] = {
            name: name,
            fn: fn,
            version: version,
            details: details || {}
        };
    };

    // Note: we support at most 1 call to `applyConfig`...
    YUI.applyConfig = function (config) {
        YUI.pendingApplyConfig = config;
    };

    //-------------------------------------------------------------------------
    // Make some of the functionality exposed in this file available to code
    // that will reside outside of this closure. Since we don't want to clobber
    // the global scope, let's just bind stuff to the YUI object. We'll have to
    // copy those things to the real YUI object once it is available!
    //-------------------------------------------------------------------------

    YUI.OnloadHandlerQueue = OnloadHandlerQueue;
    YUI.SimpleLoader = SimpleLoader;

    //-------------------------------------------------------------------------
    // Make the YUI object globally available. Note that in strict mode,
    // setting a global variable will trigger an exception...
    //-------------------------------------------------------------------------

    w.YUI = YUI;

}());