/*
 * Copyright (c) 2011-2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
/*jslint nomen: true, plusplus: true */
/*global _YUI: true */

// During the build process, the content of this file should be output in the
// same bundle as the one containing the definition of the YUI global object.
// Obviously, because of the way JavaScript code is evaluated, the definition
// of the YUI global object should appear first in that bundle (after the
// content of yui-override.js however...), followed by the following modules,
// which are all used in this file:
//   - yui-later
//   - features
//   - yui-log
//   - get
//   - loader-base
//   - loader-rollup
//   - loader-yui3
//   - oop
//   - event-custom-base
//   - array-extras
// The content of this file should appear last in that bundle.

// The purpose of this file is to fix the standard behavior of a YUI instance
// when the bootstrap config is set to false, which I consider broken. Indeed:
//     YUI({bootstrap: false}).use('xxx', function (Y) {...});
// will result in the callback being invoked immediately, even if the required
// modules are not available! The following code will prevent this from
// happening *and* will automatically invoke the callback as soon as the
// required modules become available (in case you manage the loading of your
// JavaScript bundles separately)

// For more information, please refer to: http://tiny.corp.yahoo.com/Zu7beG

// A ticket was filed against the YUI library itself to fix this behavior
// at the library level:
//   http://yuilibrary.com/projects/yui3/ticket/2531788

YUI.GlobalConfig = {

    // Disable the loader. If one of the required modules (see below) is
    // missing, I'd rather have an error (which we'll easily spot early in the
    // release process) than not noticing anything and having the loader
    // invoked for nothing...
    bootstrap: false,

    debug: false

};

// The actual list of modules needed is:
// yui-base, yui-later, event-custom-base, loader, features, array-extras
// However, it is more efficient (faster) to use the wildcard here,
// especially since we know that all those modules are available
// (they are supposed to be in the same bundle, preceding this file)

YUI().use('*', function (Y) {
    'use strict';

    // _YUI is a reference to our fake YUI object, defined inline in the SRP.
    if (typeof _YUI !== 'undefined') {
        Y.mix(YUI.Env, _YUI.Env, false, null, 0, true);
    }

    var // Used to throttle calls to Y.use when new modules become available.
        timer,

        // Save a copy to the original _setup YUI instance method
        setup = YUI.prototype._setup,

        // Loader instance, used for dependency resolution. Note that we use
        // our own loader instance, and we do not use Y.Env._loader for this.
        // The reason: it does not work. Why is that? I have no idea, but
        // I like to leave the shared loader instance alone.
        loader = new Y.Loader(Y.config);

    // Pending calls to Y.use()
    YUI.Env.pendingUseCalls = [];

    // We need to keep track of YUI instances that are being created, so we can
    // update their configuration after the fact (see yui-bootstrap-inline.js)
    YUI.Env.instances = [];

    // Now, override the _setup YUI instance method. If the "bootstrap" config
    // was set to false (see docs), we override the default (broken if you ask
    // me...) use method to prevent the callback from being invoked if required
    // modules are not available.

    YUI.prototype._setup = function () {
        var YUIinstance = this;

        // Call the original _setup method first.
        setup.apply(YUIinstance, arguments);

        // Keep track of this YUI instance...
        YUI.Env.instances.push(YUIinstance);

        // Now, customize this instance based on the value of the bootstrap
        // configuration value. Note: Since _setup is invoked multiple times,
        // we use the bootstrapFix property to avoid attaching multiple
        // callbacks to the use() method!
        if (!YUIinstance.config.bootstrap && !YUIinstance.bootstrapFix) {

            YUIinstance.bootstrapFix = true;

            // Checks whether all the YUI modules listed as parameters when
            // calling Y.use() are available. If a module is missing, the
            // actual call to Y.use() will be delayed until the module
            // becomes available.

            Y.before(function () {

                // Since this YUI instance was setup, the bootstrap config
                // may have been updated. If so, do not do anything.
                // Just let YUI do its thing!
                if (YUIinstance.config.bootstrap) {
                    return;
                }

                var args = Y.Array(arguments, 0, true),
                    callback = args[args.length - 1],
                    required = [],
                    missing = [],
                    name,
                    module,
                    i,
                    l;

                if (args[0] === '*') {
                    Y.error('Wildcard not supported');
                }

                if (typeof callback === 'function') {
                    args.pop();
                } else {
                    Y.log('Missing callback: potential code smell...', 'info');
                }

                for (i = 0; i < args.length; i++) {
                    name = args[i];

                    // If the current argument is actually an alias, remove it
                    // and insert the modules that it refers to.
                    if (YUI.Env.aliases[name]) {
                        Array.prototype.splice.apply(args, [i, 1].concat(YUI.Env.aliases[name]));
                        name = args[i];
                    }

                    if (!YUI.Env.mods[name]) {
                        // The specified module must not have been bound to the
                        // YUI object just yet...
                        missing.push(name);
                    } else {
                        module = loader.moduleInfo[name];
                        if (module) {
                            // The specified module was previously added to the YUI object.
                            // Use the loader to compute the list of required modules.
                            required = required.concat(loader.getRequires(module));
                        } else {
                            // We don't know anything about this module.
                            // It must not have been added to the YUI object just yet.
                            missing.push(name);
                        }
                    }
                }

                // Weed out any duplicates...
                required = Y.Array.unique(required);

                // Figure out whether we have any missing modules in the list of required modules.
                for (i = 0, l = required.length; i < l; i++) {
                    name = required[i];
                    // Note: we ignore style sheets here, b/c we have no choice.
                    module = loader.moduleInfo[name];
                    if ((!module || module.type === 'js') && !YUI.Env.mods[name]) {
                        missing.push(name);
                    }
                }

                if (missing.length) {
                    // Queue the call.
                    YUI.Env.pendingUseCalls.push([YUIinstance].concat(args).concat(callback));
                    // Do not proceed...
                    Y.log('[Y.use] Missing modules: ' + missing.join(',') + ' [' + YUIinstance.id + ']');
                    return new Y.Do.Prevent();
                } else {
                    // Attach these modules to the YUI instance. Note: The loader
                    // should return the list of required modules already sorted.
                    // Also attach the yui-log module, or debug messages will never show...
                    YUIinstance._attach(['yui-log'].concat(required));
                    // And proceed...
                    Y.log('[Y.use] Invoking Y.use(' + args.join(',') + ') [' + YUIinstance.id + ']');
                }

            }, YUIinstance, 'use');
        }
    };

    // Checks whether the availability of a YUI module may unblock a pending
    // call to Y.use(). Note that the execution is throttled because a single
    // fuse module may contain numerous calls to YUI.add().

    Y.after(function (name, fn, version, details) {
        Y.log('Module ' + name + ' was added.');

        // Let our own loader instance know that this module was added...
        if (!loader.moduleInfo[name]) {
            loader.addModule(details || {}, name);
        }

        if (timer) {
            timer.cancel();
        }

        timer = Y.later(0, null, function () {
            var i, l, args, YUIinstance, modules;

            for (i = 0, l = (YUI.Env.pendingUseCalls || []).length; i < l; i++) {
                args = YUI.Env.pendingUseCalls.shift();

                // The YUI instance is in first position...
                YUIinstance = args.shift();

                // Output some debug information.
                modules = args.concat(); // concat dups the array so we can pop it next...
                modules.pop();
                Y.log('[YUI.add] Invoking Y.use("' + modules.join('","') + '", function () {...}) [' + YUIinstance.id + ']');

                // We're not sure whether or not the necessary modules are
                // available at this point in time, but that's ok because
                // Y.use will compute the dependencies and put this back
                // in the pending queue if needed. We won't end up in an
                // infinite loop b/c of the way this loop has been written,
                // and b/c we use shift/push to manipulate the pending queue.
                YUIinstance.use.apply(YUIinstance, args);
            }
        });

    }, YUI, 'add');

    // Apply any configuration set via `applyConfig`...

    if (_YUI.pendingApplyConfig) {
        YUI.applyConfig(_YUI.pendingApplyConfig);
    }

    // Copy a few things from the fake YUI object...

    YUI.OnloadHandlerQueue = _YUI.OnloadHandlerQueue;
    YUI.SimpleLoader = _YUI.SimpleLoader;

    // Process pending Y.use() calls!

    Y.each(_YUI.Env.pending, function (args) {
        var cfg = args.shift(),
            fakeInstance = args.shift(),
            YUIinstance = YUI(cfg);

        // Update faked YUI instance with the real methods,
        // in case the fake YUI instance keeps getting used.
        YUIinstance.mix(fakeInstance, YUIinstance, true);

        YUI.Env.instances.push(YUI);
        YUIinstance.use.apply(YUIinstance, args);
    });


    _YUI = undefined;
});
