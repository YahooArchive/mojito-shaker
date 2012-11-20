(function () {
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

var

//-----------------------------------------------------------------------------
// A few shorthands...
//-----------------------------------------------------------------------------

w = window,
d = document,
add = YUI.Env.add,
remove = YUI.Env.remove,

//-----------------------------------------------------------------------------
// A simplistic queue allowing us to use a single 'load' event handler
// and execute functions in the order they were added to the queue,
// regardless of the browser.
//-----------------------------------------------------------------------------


OnloadHandlerQueue = (function () {

    var queue = [];

    function onLoad (e) {
        // Use a setTimeout to not interfere with RTB measurements!
        setTimeout(function () {
            var i = 0, l = queue.length;
            for (; i < l; i++) {
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
// A tiny JavaScript and CSS loader guaranteeing that no asset will be
// downloaded prior to onload.
//-----------------------------------------------------------------------------

SimpleLoader = (function () {

    var queue = [],
        windowLoaded = false,
        jsRequestsPending = 0;

    function decrementRequestPending () {
        jsRequestsPending--;
    }

    function createNode (name, attrs) {
        var node = d.createElement(name), key, value;

        for (key in attrs) {
            if (attrs.hasOwnProperty(key)) {
                value = attrs[key];
                node.setAttribute(key, value);
            }
        }

        return node;
    }

    function flush () {
        var i = 0, l = queue.length, asset, node,
            head = d.getElementsByTagName('head')[0];

        for (; i < l; i++) {
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
                node.onload = decrementRequestPending;
                node.onerror = decrementRequestPending;
            } else {
                continue;
            }

            head.appendChild(node);
        }

        windowLoaded = true;
        queue = [];
    }

    function load () {
        var type = arguments[0],
            urls = Array.prototype.slice.call(arguments, 1),
            i = 0, l = urls.length;

        for (; i < l; i++) {
            jsRequestsPending++;
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
        getJSRequestPending: function (){
            return jsRequestsPending;
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
