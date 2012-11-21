YUI_config = {bootstrap: false};

YUI().use('*', function (Y) {
    // _YUI is a reference to our fake YUI object, defined inline.
    if (typeof _YUI !== 'undefined') {
        Y.mix(YUI.Env, _YUI.Env, false, null, 0, true);
    }

    var timer,
        // Pending calls to Y.use()
        pending = [],
        // Save a copy to the original _setup YUI instance method
        setup = YUI.prototype._setup;

    YUI.prototype._setup = function () {
        var YUIinstance = this;

        // Call the original _setup method first.
        setup.apply(YUIinstance, arguments);

        // Now, customize this instance based on the value of the bootstrap
        // configuration value. Note: Since _setup is invoked multiple times,
        // we use the bootstrapFix property to avoid attaching multiple
        // callbacks to the use() method!
        if (!YUIinstance.config.bootstrap && !YUIinstance.bootstrapFix) {
            YUIinstance.bootstrapFix = true;
            
            //check if we got all request from the Loader
            Y.before(function () {
                var args = Y.Array(arguments, 0, true),
                    callback = args[args.length - 1],
                    waiting, requestonHold;


                if (args[0] === '*') {
                    Y.error('Wildcard not supported');
                }

                if (typeof callback === 'function') {
                    args.pop();
                } else {
                    Y.error('Missing callback');
                }

                waiting = YUI.SimpleLoader.getJSRequestPending() > 0;
                requestonHold = YUI.SimpleLoader.getJSRequestPending();

                if (waiting) {
                    // Queue the call.
                    pending.push([YUIinstance].concat(args).concat(callback));
                    // Do not proceed...
                    Y.log('[Y.use] '+ requestonHold +' Request pending on [' + YUIinstance.id + ']');
                    return new Y.Do.Prevent();
                } else {
                    // And proceed...
                    YUIinstance.config.bootstrap = YUIinstance.config.bootstrap || true;
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
        if (timer) {
            timer.cancel();
        }
        timer = Y.later(0, null, function () {
            var i, l, args, YUIinstance, modules;

            for (i = 0, l = pending.length; i < l; i++) {
                args = pending.shift();

                // The YUI instance is in first position...
                YUIinstance = args.shift();
                YUIinstance.use.apply(YUIinstance, args);
            }
        });
    }, YUI, 'add');

    // Copy a few things from the fake YUI object...
    YUI.OnloadHandlerQueue = _YUI.OnloadHandlerQueue;
    YUI.SimpleLoader = _YUI.SimpleLoader;

    // Process pending Y.use() calls!
    Y.each(_YUI.Env.pending, function (args) {
        var cfg = args.shift(),
            YUIinstance = YUI(cfg);
        YUIinstance.use.apply(YUIinstance, args);
    });

    // A bit of cleanup won't hurt...
    _YUI = undefined;
    delete _YUI;
});
