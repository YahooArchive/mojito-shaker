/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/*jslint browser: true, plusplus: true, sloppy: true */
/*global YUI: true */

// This code should appear inline in the page. Its role is to allow the
// parallel download of multiple bundles containing YUI modules, and to have
// invocations of YUI().use(...) inline in the page (because modules often
// require data that is specific to a given page view) without having a huge
// blowup!

// For more information, please refer to: http://tiny.corp.yahoo.com/Zu7beG

(function () {

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
                windowLoaded = false,
                ie = /MSIE/.test(navigator.userAgent);

            function flush() {
                var i, l, node,
                    s = d.getElementsByTagName('script')[0],
                    p = s.parentNode,
                    pending = queue.length;

                function decrementRequestPending() {
                    var i, l, args, YUIinstance, modules;

                    if (--pending <= 0 && w.YUI) {

                        // At that point, yui-bootstrap-core.js will have
                        // executed. We can now re-enable the YUI loader
                        // by updating the global config as well as the config
                        // of every single YUI instance that has been created
                        // so far...

                        // Make sure that the instances array exists, if it doesn't then it is probably a sign that an extra YUI base
                        // was downloaded, overwriting the Env object.
                        if (!w.YUI.Env.instances) {
                            if (typeof console !== 'undefined' && typeof console.error === 'function') {
                                console.error('Shaker bootstrap failed, make sure that no extra YUI base is downloaded in addition to the one contained in the rollup.');
                            }
                            return;
                        }

                        w.YUI.applyConfig({
                            bootstrap: true
                        });

                        for (i = 0, l = w.YUI.Env.instances.length; i < l; i++) {
                            YUIinstance = w.YUI.Env.instances[i];
                            YUIinstance.applyConfig({
                                bootstrap: true
                            });
                        }

                        // Finally, we need to process any pending Y.use()
                        // calls that may still be blocked by dependencies
                        // that need to be dynamically pulled... The following
                        // code is pretty much identical to what is in
                        // yui-bootstrap-core.js, hence the lack of comments...

                        for (i = 0, l = w.YUI.Env.pendingUseCalls.length; i < l; i++) {
                            args = w.YUI.Env.pendingUseCalls.shift();
                            YUIinstance = args.shift();
                            modules = args.concat();
                            modules.pop();
                            YUIinstance.log('[YUI.add] Invoking Y.use("' + modules.join('","') + '", function () {...}) [' + YUIinstance.id + ']');
                            YUIinstance.use.apply(YUIinstance, args);
                        }
                    }
                }

                function handleReadyStateChange() {
                    if (/loaded|complete/.test(this.readyState)) {
                        this.onreadystatechange = null;
                        decrementRequestPending();
                    }
                }

                for (i = 0, l = queue.length; i < l; i++) {
                    node = d.createElement('script');

                    if (ie) {
                        node.onreadystatechange = handleReadyStateChange;
                    } else {
                        node.onload = node.onerror = decrementRequestPending;
                    }

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

        }());

    //-------------------------------------------------------------------------
    // This is our fake YUI object. It contains the minimum needed to get
    // the ball rolling before the real YUI object becomes available. It
    // is only really needed if the bundle containing the definition of
    // the real YUI object is not loaded first, which may very well happen
    // since the order in which bundles are loaded cannot be controlled.
    //-------------------------------------------------------------------------

    YUI = function (cfg) {
        var fakeInstance = {

            use: function () {
                var args = Array.prototype.slice.call(arguments);
                YUI.Env.pending.push([cfg, fakeInstance].concat(args));
            }
        };

        return fakeInstance;
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

}());
