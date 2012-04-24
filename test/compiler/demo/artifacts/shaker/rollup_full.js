/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
/**
 * The <strong>Action Context</strong> uses a mechanism called <strong><em>Addons</em></strong>
 * to provide functionality that lives both
 * on the server and/or client. Each Addon provides additional functions through a namespace
 * that is attached directly to the ac argument available in every controller function.
 * @module ActionContextAddon
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-analytics-addon', function(Y, NAME) {

    var ANALYTICS = 'anal'; // I saved 5 keystrokes!

    /**
     * <strong>Access point:</strong> <em>ac.analytics.*</em>
     * Provides an easy way to stash analytics information within child mojits
     * and retrieve them within parent after the children have been executed.
     * Data handled by this addon, however, cannot be used to augment the
     * normal data flow. IE: you cannot retrieve analytics data and then call
     * ac.done().
     * @class Analytics.common
     */
    function AnalyticsAddon(command, adapter, ac) {
        this.ac = ac;
        // our personal analytics cache
        this[ANALYTICS] = {};
        // so following addons can override (see comment below)
        this.mergeFunction = Y.mojito.util.metaMerge;
    }

    AnalyticsAddon.prototype = {

        namespace: 'analytics',

        /**
         * Allows a way for addons mixed in after this one to set an alternate
         * data merge function when analytics from multiple children are combined.
         * The default merge function is the same one used internally by Mojito
         * to merge meta data, and will be sufficient for most use cases.
         *
         * @method setMergeFunction
         * @param {function} fn user-defined merge function, which should accept
         * two objects, the first is "to", and the second is "from". this function
         * should return the merged object.
         */
        setMergeFunction: function(fn) {
            this.mergeFunction = fn;
        },

        /**
         * Store an analytic value. This function can be called multiple times
         * within a mojit, and uses a merging function to combine objects.
         *
         * @method store
         * @param {object} val should be an object bag full of whatever you wish
         */
        store: function(val) {
            // if you don't like using our internal meta merge function,
            // you can supply an AC addon that dependsOn this one, and call
            // ac.analytics.setMergeFunction(fn) within the initializer.
            this[ANALYTICS] = this.mergeFunction(this[ANALYTICS], val);
            this.ac.meta.store(ANALYTICS, this[ANALYTICS]);
        },

        /**
         * To retrieve analytics data that has been stored by child mojits, call
         * this function and provide a function, which will be called once the children
         * have been dispatched and all their analytics data has been merged.
         *
         * @method retrieve
         * @param {function} cb callback will be called with the analytics object
         * @param {object} [optional] scope scope of the callback
         */
        retrieve: function(cb, scope) {
            // mostly just deferring to the meta addon, but specifying that we only want the
            // ANALYTICS stuff off the meta
            this.ac.meta.retrieve(function(metaStash) {

                cb.call(this, metaStash[ANALYTICS]);
            }, scope);
        }
    };

    AnalyticsAddon.dependsOn = ['meta'];
    
    Y.mojito.addons.ac.analytics = AnalyticsAddon;

}, '0.1.0', {requires: ['mojito-util', 'mojito-meta-addon']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-assets-addon', function(Y, NAME) {

    var isInline;

    /**
     * <strong>Access point:</strong> <em>ac.assets.*</em>
     * Provides methods for adding HTML assets to a page.
     * @class Assets.common
     */
    function AssetsAcAddon(command, adapter, ac) {
        this.assetsRoot = command.instance.assetsRoot;
        this.assets = {};
        this.added = {};    // content: boolean
        this.mojitType = command.instance.type;
        this.context = command.context;

        // Add "assets" if they are found in the config.
        if(command.instance && command.instance.config && command.instance.config.assets){
            this.addAssets(command.instance.config.assets);
        }
    }

    AssetsAcAddon.prototype = {

        namespace: 'assets',

        /**
         * Method for adding a JS file to the page.
         * @method addCss
         * @param {string} link A URL (./local.css converts to /static/mojit_type/assets/local.css)
         * @param {string} location Either "top" or "bottom"
         */
        addCss: function(link, location){
            this.addAsset('css', (location || 'top'), link);
        },

        /**
         * Method for adding a JS file to the page.
         * @method addJs
         * @param {string} link A URL (./local.css converts to /static/mojit_type/assets/local.css)
         * @param {string} location Either "top" or "bottom"
         */
        addJs: function(link, location){
            this.addAsset('js', (location || 'bottom'), link);
        },

        /**
         * Method for adding a Blob of data to the page. This can be used
         * for adding custom "script" or "style" blocks.
         * @method addBlob
         * @param {string} content A string of data
         * @param {string} location Either "top" or "bottom"
         */
        addBlob: function(content, location){
            this.addAsset('blob', (location || 'bottom'), content);
        },
        
        addAsset: function(type, location, content) {
            if(!content){
                return;
            }
            if(content.indexOf('./')===0){
                content = this.getUrl(content.slice(2));
            }
            if (this.added[content]) {
                return;
            }
            this.added[content] = true;

            // If we have not added the files for this mojit, we should add
            // them inline now.
            if (('css' === type) && isInline(content)) {

                // We can't do this on the server, because YUI._mojito._cache is
                // a server-lifetime global, so it "tunnels" between requests.
                if ('client' === this.context.runtime) {
                    if (! YUI._mojito._cache.compiled.css.inline.added) {
                        YUI._mojito._cache.compiled.css.inline.added = {};
                    }
                    if (YUI._mojito._cache.compiled.css.inline.added[content]) {
                        // Looks like we've already added this to the DOM
                        return;
                    }
                    YUI._mojito._cache.compiled.css.inline.added[content] = true;
                }

                // Y.log('Inlining css for mojitType for the first time' + content, 'debug' , NAME);
                type = 'blob';
                content = '<style type="text/css">\n' + YUI._mojito._cache.compiled.css.inline[content] + '</style>\n';

                // Beware! "content" changes here. This is the actual CSS and not the URI of the CSS resource!!!
                if (this.added[content]) {
                    return;
                }
            }

            if (!this.assets[location]) {
                this.assets[location] = {};
            }
            if (!this.assets[location][type]) {
                this.assets[location][type] = [];
            }
            this.assets[location][type].push(content);
            //Y.log(this.assets);
        },

        addAssets: function(assets) {
            var location, type, content;
            for(location in assets){
                if(assets.hasOwnProperty(location)){

                    for(type in assets[location]){
                        if(assets[location].hasOwnProperty(type)){

                            for(content in assets[location][type]){
                                if(assets[location][type].hasOwnProperty(content)){
                                    this.addAsset(type, location, assets[location][type][content]);
                                }
                            }
                        }
                    }
                }
            }
        },

        preLoadImage: function(url) {
            var img;
            if(typeof document !== 'undefined'){
                img = new Image();
                img.src = url;
            }
        },

        preLoadImages: function(urls) {
            var i;
            for(i in urls) {
                if (urls.hasOwnProperty(i)) {
                    this.preLoadImage(urls[i]);
                }
            }
        },
        
        getUrl: function(path){
            return this.assetsRoot+'/'+path;
        },

        mixAssets: function(to, from) {
            return Y.mojito.util.metaMerge(to, from);
        },

        getAssets: function(){
            // MUST have some dedup code here
            return this.assets;
        },

        mergeMetaInto: function(meta){
            this.mixAssets(meta.assets, this.assets);
        }
    };

    isInline = function(id) {
        return YUI._mojito._cache
            && YUI._mojito._cache.compiled
            && YUI._mojito._cache.compiled.css
            && YUI._mojito._cache.compiled.css.inline
            && YUI._mojito._cache.compiled.css.inline[id];
    };

    Y.mojito.addons.ac.assets = AssetsAcAddon;

}, '0.1.0', {requires: ['mojito-util']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-composite-addon', function(Y, NAME) {

   /**
    * <strong>Access point:</strong> <em>ac.composite.*</em>
    * Provides methods for working with many Mojits.
    * @class Composite.common
    */
    function Addon(command, adapter, ac) {
        this.command = command;
        this.dispatch = ac._dispatch;
        this.ac = ac;
        this.adapter = adapter;
    }

    Addon.prototype = {

        namespace: 'composite',

        /**
         * Automatically dispatches all the children of this mojit and collects their executed values into the view
         * template, keyed by the child's name within the mojit's configuration. For example, given the mojit spec:
         *
         *
<pre>
"specs": {
    "parent": {
        "type": "MyCompositeMojit",
         "config": {
             "children": {
                 "foo": {
                     "type": "FooMojit"
                 },
                 "bar": {
                     "type": "BarMojit"
                 }
             }
         }
    }
}
</pre>
         * And given the view template:
<pre>
&lt;div id=&quot;{{mojit_view_id}}&quot;&gt;
&lt;h1&gt;{{title}}&lt;/h1&gt;
&lt;div class=&quot;fooslot&quot;&gt;
    {{{foo}}}
&lt;/div&gt;
&lt;div class=&quot;barslot&quot;&gt;
    {{{bar}}}
&lt;/div&gt;
&lt;/div&gt;
</pre>
         * And the controller:
<pre>
Y.mojito.controller = {
    index: function(ac) {
        ac.composite.done({
            template: { title: 'Hello there' } // for the view only
        });
    }
};
</pre>
         * This will execute the child intances of the "FooMojit" and "BarMojit", returning their rendered values into
         * the parent's view template, thus rendering the full parent view including the children.
         *
         * All the parent parameters are passed along to children.
         *
         * @method done
         * @param {object} opts The configuration object to be used. <em>template<em> can be used to provide additional
         * view template values.
         */
        done: function(opts) {
            var template,
                ac = this.ac,
                cfg = this.command.instance.config,
                children = cfg.children;

            opts = opts || {};

            template = opts.template || {};

            if (!children || Y.Object.size(children) === 0) {
                throw new Error("Cannot run composite mojit children because there are no children defined in the composite mojit spec.");
            }

            this.execute(cfg, function(data, meta){
                var merged = Y.merge(template, data);
                ac.done(merged, meta);

            }, this);
        },

        /**
         * This method requires an explicit config object and returns
         * a RMP compliant object via a callback.
         *
<pre>
cfg = {
    children: {
        slot-1: {
            type: "default",
            action: "index"
        },
        slot-2: {
            type: "default",
            action: "index",
            params: {
                route: {},
                url: {},
                body: {},
                file: {}
            }
        }
    },
    assets: {}
}
</pre>
         *
         * The "callback" is an object containg the child slots with its
         * rendered data.
         *
<pre>
callback({
    slot-1: <string>,
    slot-2: <string>
},
{
   http: {}
   assets: {}
})
</pre>
         *
         * @method execute
         * @param {object} cfg The configuration object to be used
         * @param {function} cb The callback that will be called
         */
        execute: function(cfg, cb){

            var ac = this.ac,
                buffer = {},
                content = {},
                meta = {};

            cfg.children = cfg.children || {};

            // check to ensure children is an Object, not an array
            if (Y.Lang.isArray(cfg.children)) {
                throw new Error("Cannot process children in the format of an array. 'children' must be an object.");
            }

            meta.children = cfg.children;
            
            buffer.__counter__ = Y.Object.size(cfg.children);

            this._dispatchChildren(cfg.children, this.command, buffer, function() {
                var name;
                // Reference the data we want from the "buffer" into our "content" obj
                // Also merge the meta we collected 
                for(name in buffer){
                    if(buffer.hasOwnProperty(name) && name !== '__counter__'){

                        content[name] = buffer[name].data || '';

                        if (buffer[name].meta) {
                            meta = Y.mojito.util.metaMerge(meta, buffer[name].meta);
                        }
                    }
                }

                // Mix in the assets given via the config
                if(cfg.assets){
                    if (! meta.assets) {
                        meta.assets = {};
                    }
                    ac.assets.mixAssets(meta.assets, cfg.assets);
                }

                cb(content, meta);
            });
        },

        _dispatchChildren: function(children, command, buffer, callback){
            //Y.log('_dispatchChildren()', 'debug', NAME);

            var childName,
                child,
                childAdapter;

            // Process deferred children before dispatching
            Y.Object.each(children, function(child, name) {
                // first off, check to see if this child's execution should be deferred
                if (child.defer) {
                    // it doesn't make sense to have a deferred child with a proxy, because the defer means to proxy it
                    // through the LazyLoad mojit
                    if (Y.Lang.isObject(child.proxy)) {
                        throw new Error("Cannot specify a child mojit spec with both 'defer' and 'proxy' configurations, because 'defer' assumes a 'proxy' to the LazyLoad mojit.");
                    }
                    // aha! that means we will give it a proxy to the LazyLoad mojit, which will handle its
                    // lazy execution on the client.
                    child.proxy = {
                        type: 'LazyLoad'
                    };
                }
                if (Y.Lang.isObject(child.proxy)) {
                    // found a proxy, replace the child with the proxy and shove the child to proxy into it
                    children[name] = child.proxy;
                    delete child.proxy;
                    if (! children[name].config) {
                        children[name].config = {};
                    }
                    // remove any defer or proxy flags so it doesn't reload infinitely
                    child.proxy = undefined;
                    child.defer = false;
                    children[name].config.proxied = child;
                }
            });

            for(childName in children){
                if (children.hasOwnProperty(childName)) {
                    child = children[childName];
                    // Create a buffer for the child
                    buffer[childName] = {name: childName, data: '', meta: {}};

                    // Make a new "command" that works in the context of this composite
                    var newCommand = {
                        instance: child,
                        // use action in child spec or default to index
                        action: child.action || 'index',
                        context: command.context,
                        params: child.params || command.params
                    };

                    childAdapter = new AdapterBuffer(buffer, childName, callback);
                    childAdapter = Y.mix(childAdapter, this.adapter);

                    this.dispatch(newCommand, childAdapter);
                }
            }
        }
    };

    function AdapterBuffer(buffer, id, callback){
        this.buffer = buffer;
        this.id = id;
        this.callback = callback;
        this.__meta = [];
    }

    AdapterBuffer.prototype = {

        done: function(data, meta) {
            this.buffer[this.id].meta = meta;
            this.buffer[this.id].data+= data;
            if(--this.buffer.__counter__ === 0){
                this.callback(); // TODO MATT LOWER-PRIORITY: Check why this can be called more than once
            }
        },

        flush: function(data, meta) {
            this.buffer[this.id].meta = meta;
            this.buffer[this.id].data+= data;
        },

        error: function(err) {
            Y.log("Error executing child mojit at '" + this.id + "':", 'error', NAME);
            if (err.message) {
                Y.log(err.message, 'error', NAME);
            } else {
                Y.log(err, 'error', NAME);
            }
            if (err.stack) {
                Y.log(err.stack, 'error', NAME);
            }
            // Pass back some empty data so we don't fail the composite
            this.done('');
        }
    };

    Y.mojito.addons.ac.composite = Addon;

}, '0.1.0', {requires: ['mojito-util', 'mojito-params-addon']});

/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-config-addon', function(Y, NAME) {

    /**
     * <strong>Access point:</strong> <em>ac.config.*</em>
     * Provides access to the Mojits configuration
     * @class Config.common
     */
    function Addon(command, adapter, ac) {
        this._config = command.instance.config;
        this._def = command.instance.definition;
    }

    Addon.prototype = {

        namespace: 'config',

        /**
         * Access config values.
         * @method get
         * @param {String} key A period separated key path to look for i.e. "get.my.value"
         * @param {Object|Array|String} def The default value to use if no match was found
         * @return {Object|Array|String}
         */
        get: function(key, def) {
            return extract(this._config, key, def);
        },

        /**
         * Access definition values.
         * @param {String} key A period separated key path to look for i.e. "get.my.value"
         * @param {Object|Array|String} def The default value to use if no match was found
         * @return {Object|Array|String}
         */
        getDefinition: function(key, def) {
            return extract(this._def, key, def);
        }

    };

    function extract(bag, key, def) {
        if(!key){
            return bag || {};
        }

        var keys = key.split('.'),
            cur  = bag,
            i;

        for(i=0; i < keys.length; i++){
            if(cur[keys[i]]){
                cur = cur[keys[i]];
            }else{
                return def;
            }
        }

        return cur;
    }

    Y.mojito.addons.ac.config = Addon;

}, '0.1.0', {requires: ['mojito']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-cookie-addon', function(Y, NAME) {

    /**
     * <strong>Access point:</strong> <em>ac.cookie.*</em>
     * This client-side cookie add-on allows you to easily use cookies. This API matches the YUI Cookie API exactly.
     * http://developer.yahoo.com/yui/3/api/Cookie.html
     * @class Cookie.client
     */
    function Addon(command, adapter, ac) {
        var cookieFns = [
            'exists',
            'get',
            'getSub',
            'getSubs',
            'remove',
            'removeSub',
            'set',
            'setSub',
            'setSubs'
        ];
        Y.Array.each(cookieFns, function(fn) {
            this[fn] = function() {
                return Y.Cookie[fn].apply(Y.Cookie, arguments);
            };
        }, this);
    }

    Addon.prototype = {

        namespace: 'cookie'

    };

    Y.mojito.addons.ac.cookie = Addon;

}, '0.1.0', {requires: ['cookie', 'mojito']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-intl-addon', function(Y, NAME) {

    /**
     * <strong>Access point:</strong> <em>ac.intl.*</em>
     * Internationalization addon
     * @class Intl.common
     */
    function IntlAddon(command, adapter, ac) {
        this.ac = ac;
    }

    IntlAddon.prototype = {

        namespace: 'intl',

        /**
         * Returns translated string
         * @method lang
         * @param label {string}
         * @return {string} translated string for label
         */
        lang: function(label) {
            //Y.log('lang(' + label + ') for ' + this.ac.type, 'debug', NAME);
            Y.Intl.setLang(this.ac.type, this.ac.context.lang);
            return Y.Intl.get(this.ac.type, label);
        },

        /**
         * returns local-specified date
         * @method formatDate
         * @param date {Date}
         * @return {string} formated data for language
         */
        formatDate: function(date) {
            //Y.log('Formatting date (' + date + ') in lang "' + this.language + '"', 'debug', NAME);
            return Y.DataType.Date.format(date, {format: "%x"});
        }

    };

    IntlAddon.dependsOn = ['config'];

    Y.mojito.addons.ac.intl = IntlAddon;

}, '0.1.0', {requires: [
    'intl',
    'datatype-date',
    'mojito',
    'mojito-config-addon'
]});

/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-meta-addon', function(Y, NAME) {

    var COMMON = 'common';

    /**
     * <strong>Access point:</strong> <em>ac.meta.*</em>
     * Allows the usage of the "meta" object as a storage device, which can pass data from
     * child mojits up towards parents.
     * @class Meta.common
     */
    function MetaAddon(command, adapter, ac) {
        // this is our instance cache
        this[COMMON] = {};
    }

    MetaAddon.prototype = {

        namespace: 'meta',

        /**
         * Stores a keyed value within the meta object of the current mojit
         * execution. You can call this as many times as you like, but
         * if you use the same key, you'll override previous data. Call this within
         * child mojits when you have some data you want to make available for
         * some reason to any parents up your hierarchy.
         *
         * @method store
         * @param {string} key
         * @param {object} val
         */
        store: function(key, val) {
            this[COMMON][key] = val;
        },

        /**
         * To retrieve stashed data that has been stored by child mojits, call
         * this function and provide a function, which will be called once the children
         * have been dispatched and all their meta data has been merged.
         *
         * @method retrieve
         * @param {function} cb callback will be called with the stored merged object
         * @param {object} [optional] scope scope of the callback
         */
        retrieve: function(cb, scope) {
            this._callback = cb;
            this._cbScope = scope;
        },

        // internal to Mojito
        mergeMetaInto: function(meta) {
            var scope = this._cbScope || this;
            if (! meta[COMMON]) {
                meta[COMMON] = this[COMMON];
            } else {
                meta[COMMON] = Y.mojito.util.metaMerge(meta[COMMON], this[COMMON]);
            }
            if (this._callback) {
                this._callback.call(scope, meta[COMMON]);
            }
            return meta;
        }
    };

    MetaAddon.dependsOn = ['core'];
    
    Y.mojito.addons.ac.meta = MetaAddon;

}, '0.1.0', {requires: ['mojito-util', 'mojito-output-adapter-addon']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-output-adapter-addon', function(Y, NAME) {

    var CHARSET = 'charset="utf-8"',

        // the functions this core addon is going to attach to the ActionContext
        flush,
        done,
        error,

        // serializer container
        serializer,
        // private functions
        serialize_xml,
        serialize_json,
        sanitizeConfigCopy,
        sanitizeChildren,
        attachChildViewIdsToMetaChildren;

    /**
     * <strong>Access point:</strong> <em>ac.*</em>
     * The main API point for developers in a Controller. This addon provides the core functions
     * of the ActionContext: <em>flush</em>, <em>done</em>, and <em>error</em>.
     * @class OutputAdapter.common
     * @private
     */
    function Addon(command, adapter, ac) {
        /*
         * This plugin doesn't act the same way as the others. It attaches its functions directly onto the ActionContext.
         * Each functions is assumed that 'this' will be the actual instance of ActionContext, not the object this
         * constructor is creating, which is irrelevant in this case.
         */
        ac.flush = flush;
        ac.done = done;
        ac.error = error;
    }

    /* see action-context.common.js for docs */
    flush = function(data, meta) {
        // NOTE: 'this' is the ActionContext instance
        return this.done(data, meta, true);
    };
        
    /* see action-context.common.js for docs */
    done = function(data, meta, more) {
        // NOTE: 'this' is the ActionContext instance
        var // the name function to use on the callback
            callbackFunc = more ? 'flush' : 'done',
            instance = this.command.instance,
            adapter = this._adapter,
            action = this.command.action,
            mojitView,
            renderer = null,
            contentType;

        if(Y.Lang.isString(meta)){
            // If the meta string is a serializer set it
            if(serializer[meta]){
                meta = {
                    serialize: meta
                };
            }else{// Otherwise we think it is a template name
                meta = {
                    view: {name: meta}
                };
            }
        }

        meta = meta || {};
        meta.assets = meta.assets || {};
        meta.assets.bottom = meta.assets.bottom || {};
        meta.assets.bottom.js = meta.assets.bottom.js || [];
        meta.http = meta.http || {};
        meta.http.code = meta.http.code || 200;
        meta.http.headers = meta.http.headers || {};
        meta.view = meta.view || {};

        // Cache all tempates by default
        meta.view.cacheTemplates = true;

        if(this.app && this.app.config && this.app.config.cacheViewTemplates){
            meta.view.cacheTemplates = this.app.config.cacheViewTemplates || false;
        }

        // Check to see we need to serialize the data
        if(meta.serialize && serializer[meta.serialize]){
            // Warning: this metod can change the "meta" object
            data = serializer[meta.serialize].apply(this, [data, meta]);
            // Once we are done remove the "serialize" option so others don't use it by mistake
            delete meta.serialize;
        }

        // We want to know the view name, id, and binder used later so make sure "meta" is up-to-date
        meta.view.name = meta.view.name || action;
        meta.view.binder = meta.view.binder || meta.view.name; // TODO: Use a different binder
        mojitView = instance.views[meta.view.name];
        if (!meta.view.id) {
            meta.view.id = Y.guid();
            //DEBUGGING:  meta.view.id += '-viewId-' + this.command.instance.type + '-' + this.command.action;
        }

        // If we are given "meta.view['content-path']" use it over what we got from "instance.views"
        if(mojitView && meta.view['content-path']){
            mojitView['content-path'] = meta.view['content-path'];
        }

        // If we are given "meta.view['engine']" use it over what we got from "instance.views"
        if(mojitView && meta.view.engine){
            mojitView.engine = meta.view.engine;
        }

        // Here we ask each "thing" attached to the AC if it wants to add view "meta"
        Y.Object.each(this, function(item) {
            if (item && Y.Lang.isFunction(item.mergeMetaInto)) {
                item.mergeMetaInto(meta);
            }
        });

        contentType = meta.http.headers['content-type'];

        attachChildViewIdsToMetaChildren(meta.children, meta.binders);

        /*
         * Here we provide an easy way to return a string
         * data == 'a string of chars'
         */
        if (Y.Lang.isString(data)) {
            // if the user didn't provided a content type, we'll make it plain text
            if (! contentType) {
                meta.http.headers['content-type'] = ['text/plain; ' + CHARSET];
            }
            //Y.log('pushing to native adapter', 'info', NAME);
            adapter[callbackFunc](data, meta);
            Y.log('dispatch complete for ' + instance.instanceId, 'mojito', 'qeperf');
            return;
        }

        if (! meta.binders) {
            meta.binders = {};
        }
        meta.binders[meta.view.id] = {
            base: instance.base,
            action: action,
            config: sanitizeConfigCopy(instance.config),
            type: instance.type,
            viewId: meta.view.id,
            guid: instance.instanceId,      // DEPRECATED, use instanceId instead
            instanceId: instance.instanceId,
            // We don't use the actual config's children object, because that might not have been what was
            // actually dispatched. We get the actual children config that was dispatched through the meta
            // object.
            children: sanitizeChildren(meta.children)
        };

        // there may not be a view if this is running on the client
        if (mojitView) {

            data = data || {}; // default null data to empty view template

            // Get the YUI Module name of the Binder if we can.
            if (meta.binders[meta.view.id]) {
                meta.binders[meta.view.id].name = mojitView['binder-module'];
                meta.binders[meta.view.id].needs = mojitView['binder-yui-sorted'];
            }

            if (! contentType) {
                meta.http.headers['content-type'] = ['text/html; ' + CHARSET];
            }

            data.mojit_guid = instance.instanceId;
            data.mojit_view_id = meta.view.id;
            data.mojit_assets = this.command.instance.assetsRoot;

            // Use engine to compile template view
            Y.log('Rendering "' + meta.view.name + '" view for "' + (instance.id || '@'+instance.type) + '"', 'info', NAME);

            renderer = new Y.mojito.ViewRenderer(mojitView.engine, meta.view.id);
            renderer.render(data, instance.type, mojitView['content-path'], adapter, meta, more);

        } else {

            if (Y.Lang.isObject(data)) {
                throw new Error("Missing view template: '" + meta.view.name + "'");
            }
            adapter[callbackFunc](data, meta);
        }

        // Time marker
        Y.mojito.perf.mark('mojito', 'core_action_end['+instance.type+':'+action+"]", 'ac.done() completed for Mojit "'+instance.type+'" with action "'+action+'"');
    };

    /* see action-context.common.js for docs */
    error = function(err) {
        // NOTE: 'this' is the ActionContext instance
        this._adapter.error(err);
    };

    sanitizeConfigCopy = function(cfg) {
        var copy;
        if (! Y.Lang.isObject(cfg)) {
            return cfg;
        }
        copy = Y.mojito.util.copy(cfg);
        copy.children = sanitizeChildren(copy.children);
        return copy;
    };

    sanitizeChildren = function(children) {
        if (! Y.Lang.isObject(children)) {
            return children;
        }
        Y.Object.each(children, function(v, k) {
            // We don't want child params to be included within a mojit's configuration, because it can leak implemenation
            // details out to other execution environments. For example, the client runtime does not need to have the
            // parameters of the mojits that were used to construct the initial client DOM.
            delete children[k].params;
        });
        return children;
    };

    attachChildViewIdsToMetaChildren = function(children, binders) {
        if (! children) {
            return;
        }
        Y.Object.each(binders, function(binderData, viewId) {
            Y.Object.each(children, function(childData) {
                if (binderData.instanceId === childData.instanceId) {
                    childData.viewId = viewId;
                }
            });
        });
    };

    /*
     * @private
     * @method serialize_json
     * @param {object} data
     * @param {object} meta
     * @return {string}
     */
    serialize_json = function(data, meta){
        meta.http.headers['content-type'] = ['application/json; ' + CHARSET];
        
        try {
            return Y.JSON.stringify(data);
        } catch (err) {
            throw new Error("Expected JSON data, but there was a parse error on the string: \"" + data);
        }
        
    };

    /*
     * @private
     * @method serialize_xml
     * @param {object} data
     * @param {object} meta
     * @return {string}
     */
    serialize_xml = function(data, meta){
        // A dirty XML function I found on the interwebs
        function simpleXml(js, wraptag){
            if(js instanceof Object){
                return simpleXml(Object.keys(js).map(function(key){
                    return simpleXml(js[key], key);
                }).join('\n'), wraptag);
            }else{
                return ((wraptag)?'<'+ wraptag+'>' : '' )+js+((wraptag)?'</'+ wraptag+'>' : '' );
            }
        }

        meta.http.headers['content-type'] = ['application/xml; ' + CHARSET];
        if (Y.Lang.isObject) {
            try {
                return simpleXml(data, 'xml');
            } catch (err) {
                throw new Error("Expected XML data, but there was a parse error on the string: \"" + data);
            }
        }

        return '';
    };

    serializer = {
        json: serialize_json,
        xml: serialize_xml
    };

    Y.mojito.addons.ac.core = Addon;

}, '0.1.0', {requires: ['json-stringify', 'event-custom-base', 'mojito-view-renderer', 'mojito-util']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-params-addon', function(Y, NAME) {

    /**
     * <strong>Access point:</strong> <em>ac.params.*</em>
     * Addon that provides access to any parameters given to the system
     * @class Params.common
     */
    function Addon(command) {
        this.params = command.params || {};
    }

    Addon.prototype = {

        namespace: 'params',

        /**
         * Gets all params, keyed by 'route', 'url', 'body', and 'file'.
         * @method getAll
         * @return {object} all params
         */
        getAll: function(){
            
            return {
                route: this.getFromRoute(),
                url: this.getFromUrl(),
                body: this.getFromBody(),
                file: {} //this.getFromFiles()
            };
        },
        /**
         * Alias for 'getAll'.
         * @method all
         * @return {object} all params
         */
        all: function() {
            return this.getAll.apply(this, arguments);
        },

        /**
         * Gets all params merged into one object. Route -> URL -> Body precedence.
         * @method getFromMerged
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        getFromMerged: function(key){

            if (!this._merged) {
                this._merged = Y.merge(/*this.getFromFiles(),*/ this.getFromBody(), this.getFromUrl(), this.getFromRoute());
            }

            if (key) {
                return this._merged[key];
            }

            return this._merged;
        },
        /**
         * Alias for 'getFromMerged'.
         * @method merged
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        merged: function() {
            return this.getFromMerged.apply(this, arguments);
        },

        /**
         * Gets route parameters
         * @method getFromRoute
         * @param {string} key The name of the parameter
         * @return {string|object} param value, or all params if no key specified
         */
        getFromRoute: function(key){

            if (!this._route) {
                this._route = Y.merge(this.params.route || {});
            }

            if (key) {
                return this._route[key];
            }

            return this._route;
        },
        /**
         * Alias for 'getFromRoute'.
         * @method route
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        route: function() {
            return this.getFromRoute.apply(this, arguments);
        },


        /**
         * Gets URL parameters
         * @method getFromUrl
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        getFromUrl: function(key){

            if (!this._url) {
                this._url = Y.merge(this.params.url || {});
            }

            if (key) {
                return this._url[key];
            }

            return this._url;
        },
        /**
         * Alias for 'getFromUrl'.
         * @method url
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        url: function() {
            return this.getFromUrl.apply(this, arguments);
        },

        /**
         * Gets body parameters
         * @method getFromBody
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        getFromBody: function(key){

            if (!this._body) {
                this._body = Y.merge(this.params.body || {});
            }

            if (key) {
                return this._body[key];
            }

            return this._body;
        },
        /**
         * Alias for 'getFromBody'.
         * @method body
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        body: function() {
            return this.getFromBody.apply(this, arguments);
        },

        /**
         * Gets file parameters
         * @private
         * @method getFromFiles
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        getFromFiles: function(){
            throw new Error('The method "api.params.getFromFiles()" is not implemented yet.');
        },
        /**
         * Alias for 'getFromFiles'.
         * @method files
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        files: function() {
            return this.getFromFiles.apply(this, arguments);
        }
    };

    Y.mojito.addons.ac.params = Addon;

}, '0.1.0', {requires: ['mojito']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-partial-addon', function(Y, NAME) {

   /**
    * <strong>Access point:</strong> <em>ac.partial.*</em>
    * Provides methods for working with "actions" and "views" on the current Mojits.
    * @class Partial.common
    */
    function Addon(command, adapter, ac) {
        this.command = command;
        this.dispatch = ac._dispatch;
        this.ac = ac;
        this.adapter = adapter;
    }

    Addon.prototype = {

        namespace: 'partial',

        /**
         * This method renders the "data" provided into the "view" specified.
         * The "view" must be the name of one of the files in the current
         * Mojits "views" folder. Returns via the callback.
         *
         * @method render
         * @param {object} data
         * @param {string} view
         * @param {function} cb callback signature is function(error, result)
         * @return {void}
         */
        render: function(data, view, cb){

            var renderer,
                mojitView,
                instance = this.command.instance,
                meta = {view: {}};

            if(!instance.views[view]){
                cb('View "'+view+'" not found');
                return;
            }

            mojitView = instance.views[view];

            data = data || {}; // default null data to empty view template

            renderer = new Y.mojito.ViewRenderer(mojitView.engine);
            Y.log('Rendering "' + view + '" view for "' + (instance.id || '@'+instance.type) + '"', 'debug', NAME);
            renderer.render(data, instance.type, mojitView['content-path'], {
                buffer: '',
                flush: function(data){
                    this.buffer+=data;
                },
                done: function(data){
                    this.buffer+=data;
                    cb(null, this.buffer);
                }
            }, meta);
        },

        /**
         * This method calls the current mojit's controller with the "action"
         * given and returns its output via the callback.
         *
         * The <em>options</em> parameter is optional and may contain:
         * <dl>
         *     <dt>params</dt><dd>&lt;object&gt; must be broken out explicitly:
         *     <dl>
         *      <dt>route</dt><dd>&lt;object&gt; Map of key/value pairs.</dd>
         *      <dt>url</dt><dd>&lt;object&gt; Map of key/value pairs.</dd>
         *      <dt>body</dt><dd>&lt;object&gt; Map of key/value pairs.</dd>
         *      <dt>file</dt><dd>&lt;object&gt; Map of key/value pairs.</dd>
         *     </dl></dd>
         * </dl>
         *
         * @method invoke
         * @param {string} action name of the action to invoke
         * @param {object} options see above
         * @param {function} cb callback function to be called on completion
         * @return {void}
         */
        invoke: function(action, options, cb){

            var command;

            // If there are no options use it as the callback
            if('function' === typeof options){
                cb = options;
                options  = {};
            }
            
            command = {
                instance: {
                    base: this.command.instance.base,
                    type: this.command.instance.type
                },
                action: action,
                context: this.ac.context,
                params: options.params || this.ac.params.getAll()
            };


            this.dispatch(command, {
                data: '',
                meta: {},
                done: function(data, meta, more){
                    Y.mojito.util.metaMerge(this.meta, meta);
                    this.data+= data;

                    // Remove whatever "content-type" was set
                    delete meta.http.headers['content-type'];

                    // Remove whatever "view" was set
                    delete meta.view ;

                    if(!more){
                        cb(null, this.data, this.meta);
                    }
                },
                flush: function(data, meta){
                    this.done(data, meta, true);
                }
            });
        }
    };

    Y.mojito.addons.ac.partial = Addon;

}, '0.1.0', {requires: ['mojito-util', 'mojito-params-addon', 'mojito-view-renderer']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-url-addon', function(Y, NAME) {

    /**
     * <strong>Access point:</strong> <em>ac.url.*</em>
     * Generates URL's based on the applictions routing configuration
     * @class Url.common
     */
    function UrlAcAddon(command, adapter, ac) {
        this.maker = new Y.mojito.RouteMaker(ac.app.routes);
    }

    UrlAcAddon.prototype = {

        namespace: 'url',

        /**
         * Generates a URL from the given parameters
         * 
         * @param id {string} it to a mojit defined at the root level of the Mojito application configuration
         * @param action {string}
         * @param routeParams {object} used to lookup the route in the routing table
         * @param verb {string} GET, POST, PUT, DELETE (case insensitive)
         * @param urlParams {object} added to the looked up route as query params
         */
        make: function(base, action, routeParams, verb, urlParams){

            var url, query = base+'.'+action;

            routeParams = objectToQueryStr(routeParams);

            if (routeParams && routeParams.length) {
                query = query + '?' + routeParams;
            }

            url = this.maker.make(query, verb);

            if(urlParams){
                urlParams = objectToQueryStr(urlParams, true);

                if (urlParams && urlParams.length) {
                    url = url + '?' + urlParams;
                }
            }

            // Now we do some bad shit for iOS
            if(typeof window !== 'undefined'){
                url = Y.mojito.util.iOSUrl(url);
            }

            return url;
        },

        /**
         * Finds the first matching route from the given URL
         *
         * @method find
         * @param url {string} the URL to find a route for
         * @param verb {string} the HTTP method
         */
        find: function(url, verb){

            // Remove http://some.domain.com/ stuff
            if(url.indexOf('http://')===0){
                url = url.slice(url.indexOf('/', 7));
            }

            // Remove an query params given
            if(url.indexOf('?')>0){
                url = url.slice(0, url.indexOf('?'));
            }

            return this.maker.find(url, verb);
        }
    };

    function objectToQueryStr(obj, removeEmpty){

        // If "removeEmpty" is true we remove any params with no value.
        if(removeEmpty){
            Y.Object.each(obj, function(val, key){
                if(!val){
                    delete obj[key];
                }
            });
        }

        if (Y.Lang.isObject(obj) && Y.Object.size(obj) > 0) {
            obj = Y.QueryString.stringify(obj);
        }

        return obj;
    }

    Y.mojito.addons.ac.url = UrlAcAddon;

}, '0.1.0', {requires: [
    'querystring-stringify-simple',
    'mojito-route-maker',
    'mojito-util'
]});
/*
* Copyright (c) 2011 Yahoo! Inc. All rights reserved.
*/
/**
 * @submodule ActionContextAddon
 */
YUI.add('mojito-i13n-addon', function(Y, NAME) {

    /**
     * Processes the following part of the mojit's config:
     *
     * <code>
     * "i13n" : {
     *      "spaceid" : 12345,
     *      "page"    : { "val1" : "param1"}
     * }
     * </code>
     *
     * @method initFromConfig
     * @private
     *
     */
    function initFromConfig(command, ac, i13n) {
        var config, page, name;

        if (this.initialized) {
            return;
        }
        
        /*
        function getI13n(node) {
            var entry, children, result;

            if (typeof node.config === 'object') {

                // return the i13n config
                if (typeof node.config.i13n === 'object') {
                    return  node.config.i13n;
                }

                // traverse the configs tree
                if (typeof node.config.child === 'object') {
                    return get13n(node.config.child);
                } else if (typeof node.config.children === 'object') {
                    children = node.config.children
                    for (entry in children) {
                        if (children.hasOwnProperty(entry)) {

                            // quick pre-check to speed up the traversing
                            if (children[entry].config) {

                                // check if we have found the i13n
                                result = get13n(children[entry]);
                                if (result) {
                                    return result;
                                }
                            }
                        }
                    }
                }
            }
        }
        */
        
        // get the i13n
        //config = getI13n(ac.app.config.specs["???"]);
        config = command.instance.config.i13n || null;
        if (config) {
            this.initialized = true;
            if (typeof config.spaceid === 'number' ||
            typeof config.spaceid === 'string') {

                // stamp spaceid
                i13n.stamp.stampPageView(config.spaceid);

                // track page params
                if (typeof config.page === 'object') {
                    page = config.page;
                    for(name in page) {
                        if (page.hasOwnProperty(name)) {
                            i13n.trackPageParams(name, page[name], i13n.ULT.ULT_PRECEDENCE_DEFAULT);
                        }
                    }
                }
            }
        }
    }

    /**
     * <strong>Access point:</strong> <em>ac.i13n.*</em>
     * Instrumentation addon for link tracking and page views.
     * @class I13n.server
     */
    function I13nAddon(command, adapter, ac) {
        var req,
        self = this;

        this._ac = ac;
        this.command = command;

        if (ac.http) {
            req = ac.http.getRequest();
            if (req && req.i13n) {
                ac.i13n = req.i13n;

                // additional functionality
                ac.i13n.make = I13nAddon.prototype.make;
                ac.i13n._ac = ac;

                initFromConfig.call(this, command, ac, req.i13n);
                return;
            }
        }

        ac.i13n = this;
    }

    I13nAddon.prototype = {

        // intentionally not setting the namespace here,
        // because we will add an object manually.
        //namespace: 'i13n',

        /**
         * Provides facility to create an URL to other
         * mojits with a link tracking instrumentation.
         *
         * @method make
         * @param id {string} it to a mojit defined at the root level of the Mojito application configuration
         * @param action {string}
         * @param routeParams {object} used to lookup the route in the routing table
         * @param verb {string} GET, POST, PUT, DELETE (case insensitive)
         * @param urlParams {object} added to the looked up route as query params
         * @param i13nParams {object} parameters to be used for link tracking.
         */
        make: function(base, action, routeParams, verb, urlParams, i13nParams) {

            var result = this._ac.url.make(base, action, routeParams, verb, urlParams);

            if (result) {
                result = this.trackLink(result, i13nParams);
            }
            return result;
        },
        /**
         * Stamps the page view event.
         *
         * @method stampPageView
         * @param spaceid {number}  The spaceid to be used.
         */
        stampPageView : function() {
        },
        /**
         * Tracks a pair of page parameters as (key, value) for this request.
         *
         * @param key {string} - The page parameter name
         * @param vlaue {string} -The page parameter value
         */
        trackPageParams : function() {
        },
        /**
         * Tracks the link view and gemerates the URL
         * with the hash token appended to it.
         *
         * @link http://twiki.corp.yahoo.com/view/SDSMain/YNodeJsInstrumentation
         *
         * @method trackLink
         * @param url {string} - The link to be instrumented.
         * @param link_params {object} - parameteres
         * @param local_groups - Optional
         * @param ult_args - Optional
         *
         * @return {string} url with the hash appended to it.
         */
        trackLink : function() {
        },
        /**
         * Tracks the link view for the links taken from the user generated content
         * and hence need to be signed by B-cookie to prevent the security problems.
         *
         * @link http://twiki.corp.yahoo.com/view/SDSMain/YNodeJsInstrumentation
         *
         * @method trackUserLink
         * @param url {string} - The link to be instrumented.
         * @param link_params {object} - parameteres
         * @param local_groups - Optional
         * @param ult_args - Optional
         *
         * @return {string} url with the hash appended to it.
         */
        trackUserLink : function() {
        },
        /**
         * , ,  [, ult_args [, return_code]]
         *
         * @link http://twiki.corp.yahoo.com/view/SDSMain/YNodeJsInstrumentation
         *
         * @method trackForm
         * @param is_post_method {boolean} - true, if the method is POST
         * @param action_url {string} - the form action link to be instrumented.
         * @param link_params - {object} Tracking parameters.
         * @param ult_args - Optional
         *
         * @return {string} form action url with the hash appended to it.
         */
        trackForm : function() {
        },
        /**
         * Instrument links for tracking of the link clicks by gemerating the URL
         * with the hash token appended to it.
         *
         * @link http://twiki.corp.yahoo.com/view/SDSMain/YNodeJsInstrumentation
         *
         * @method trackClickOnly
         * @param url {string} - The link to be instrumented.
         * @param link_params {object} - parameteres
         * @param ult_args - Optional
         *
         * @return {string} url with the hash appended to it.
         */
        trackClickOnly : function() {
        },
        /**
         * Retrurn spaceid used for this request.
         *
         * @return spaceid previously set through stampPageView() or configuration.
         */
        getSpaceid : function() {
        },
        // not documented
        stampNonClassified : function() {
        },
        stampIgnore : function() {
        },
        isStamped : function() {
        }
    };

    I13nAddon.dependsOn = ['config', 'http', 'url'];
    Y.mojito.addons.ac.i13n = I13nAddon;

}, '0.1.0', {requires: [
    'mojito'
    ]});

/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-mu', function(Y, NAME){
    var CACHE = {},
        QUEUE_POOL = {}, // hash URL: contents
        // private functions
        isCached;

    /**
     * Class text.
     * @class MuAdapterClient
     * @private
     */
    function MuAdapter() {}

    /**
     * TODO DOCS
     * @method render
     * @param {object} data TODO
     * @param {string} tmpl TODO
     * @param {object} adapter TODO
     * @param {object} meta TODO
     * @param {bool} more TODO
     */
    MuAdapter.prototype.render = function(data, mojitType, tmpl, adapter, meta, more) {

        var handler,
            useCompiled = true,
            handlerArgs,
            ns = mojitType.replace(/\./g, '_');

        handler = function(id, obj) {
            var i, iC, queue = [],
                myAdapter, myMore, myData, myMeta;
            CACHE[tmpl] = obj.responseText;

			queue = QUEUE_POOL[tmpl].splice(0);
			delete QUEUE_POOL[tmpl];

			for (i = 0, iC = queue.length; i < iC; i += 1) {
                myAdapter = queue[i].adapter;
                myMore = queue[i].more;
                myData = queue[i].data;
                myMeta = queue[i].meta;

                if (myMore) {
                    myAdapter.flush(Mustache.to_html(obj.responseText, myData), myMeta);
                } else {
                    myAdapter.done(Mustache.to_html(obj.responseText, myData), myMeta);
                }
            }
        };

        if(meta && meta.view && meta.view['content-path']){
            // in this case, the view name doesn't necessarily relate to the contents
            useCompiled = false;
        }

        handlerArgs = {
		    data: data,
		    adapter: adapter,
		    meta: meta,
		    more: more
		};
		if (! QUEUE_POOL[tmpl]) {
			QUEUE_POOL[tmpl] = [handlerArgs];
		} else {
			QUEUE_POOL[tmpl].push(handlerArgs);
			return;
		}

        // Do we have a compiled template?
        if(useCompiled && isCached(meta, ns)){
            // Log we are using a compiled view
            Y.log('Using a compiled view for file "'+tmpl+'"', 'mojito', NAME);
            // If we do just hand it to the "handler"
            handler(null, {responseText: YUI._mojito._cache.compiled[ns].views[meta.view.name]});
            // We don't need to do an "io" call now so return.
            return;
        }

        // Now we do some bad shit for iOS
        if(typeof window !== 'undefined'){
            tmpl = Y.mojito.util.iOSUrl(tmpl);
        }

        /*
         * YUI has a bug that returns "failure" on "success" with "file://" calls.
         */
        if (! CACHE[tmpl]) {
            Y.io(tmpl, {
                on: {
                    complete: handler
                }
            });
        } else {
            handler(null, {responseText: CACHE[tmpl]});
        }
    };

    // TODO 2011-08-01 refactor this into app/autoload/view-renderer.common.js? (so that each view engine doesn't need to implement it itself)
    isCached = function(meta, ns) {
        // wow, what a checklist!
        return meta &&
            meta.view &&
            meta.view.name &&
            YUI._mojito._cache &&
            YUI._mojito._cache.compiled &&
            YUI._mojito._cache.compiled[ns] &&
            YUI._mojito._cache.compiled[ns].views &&
            YUI._mojito._cache.compiled[ns].views[meta.view.name];
    };

    Y.mojito.addons.viewEngines.mu = MuAdapter;

    var Mustache = (function() {
      var sRE;

      var Renderer = function() {};

      Renderer.prototype = {
        otag: "{{",
        ctag: "}}",
        pragmas: {},
        buffer: [],
        pragmas_implemented: {
          "IMPLICIT-ITERATOR": true
        },
        context: {},

        render: function(template, context, partials, in_recursion) {

          if(!in_recursion) {
            this.context = context;
            this.buffer = [];
          }

          if(!this.includes("", template)) {
            if(in_recursion) {
              return template;
            } else {
              this.send(template);
              return;
            }
          }

          template = this.render_pragmas(template);
          var html = this.render_section(template, context, partials);
          if(in_recursion) {
            return this.render_tags(html, context, partials, in_recursion);
          }

          this.render_tags(html, context, partials, in_recursion);
        },

        send: function(line) {
          if(line) {
            this.buffer.push(line);
          }
        },

        render_pragmas: function(template) {
          if(!this.includes("%", template)) {
            return template;
          }

          var that = this;
          var regex = new RegExp(this.otag + "%([\\w-]+) ?([\\w]+=[\\w]+)?" +
                this.ctag);
          return template.replace(regex, function(match, pragma, options) {
            if(!that.pragmas_implemented[pragma]) {
              throw({message:
                "This implementation of mustache doesn't understand the '" +
                pragma + "' pragma"});
            }
            that.pragmas[pragma] = {};
            if(options) {
              var opts = options.split("=");
              that.pragmas[pragma][opts[0]] = opts[1];
            }
            return "";
          });
        },

        render_partial: function(name, context, partials) {
          name = this.trim(name);
          if(!partials || partials[name] === undefined) {
            throw({message: "unknown_partial '" + name + "'"});
          }
          if(typeof(context[name]) !== "object") {
            return this.render(partials[name], context, partials, true);
          }
          return this.render(partials[name], context[name], partials, true);
        },

        render_section: function(template, context, partials) {
          if(!this.includes("#", template) && !this.includes("^", template)) {
            return template;
          }

          var that = this;

          var regex = new RegExp(this.otag + "(\\^|\\#)\\s*(.+)\\s*" + this.ctag +
                  "\n*([\\s\\S]+?)" + this.otag + "\\/\\s*\\2\\s*" + this.ctag +
                  "\\s*", "mg");


          return template.replace(regex, function(match, type, name, content) {
            var value = that.find(name, context);
            if(type === "^") {
              if(!value || (that.is_array(value) && value.length === 0)) {

                return that.render(content, context, partials, true);
              } else {
                return "";
              }
            } else if(type === "#") { // normal section
              if(that.is_array(value)) { // Enumerable, Let's loop!
                return that.map(value, function(row) {
                  return that.render(content, that.create_context(row),
                    partials, true);
                }).join("");
              } else if(that.is_object(value)) { // Object, Use it as subcontext!
                return that.render(content, that.create_context(value),
                  partials, true);
              } else if(typeof value === "function") {
                // higher order section
                return value.call(context, content, function(text) {
                  return that.render(text, context, partials, true);
                });
              } else if(value) { // boolean section
                return that.render(content, context, partials, true);
              } else {
                return "";
              }
            }
          });
        },

        render_tags: function(template, context, partials, in_recursion) {
          // tit for tat
          var that = this;

          var new_regex = function() {
            return new RegExp(that.otag + "(=|!|>|\\{|%)?([^\\/#\\^]+?)\\1?" +
              that.ctag + "+", "g");
          };

          var regex = new_regex();
          var tag_replace_callback = function(match, operator, name) {
            switch(operator) {
            case "!": // ignore comments
              return "";
            case "=": // set new delimiters, rebuild the replace regexp
              that.set_delimiters(name);
              regex = new_regex();
              return "";
            case ">": // render partial
              return that.render_partial(name, context, partials);
            case "{": // the triple mustache is unescaped
              return that.find(name, context);
            default: // escape the value
              return that.escape(that.find(name, context));
            }
          };
          var lines = template.split("\n");
          var i;
          for(i = 0; i < lines.length; i++) {
            lines[i] = lines[i].replace(regex, tag_replace_callback, this);
            if(!in_recursion) {
              this.send(lines[i]);
            }
          }

          if(in_recursion) {
            return lines.join("\n");
          }
        },

        set_delimiters: function(delimiters) {
          var dels = delimiters.split(" ");
          this.otag = this.escape_regex(dels[0]);
          this.ctag = this.escape_regex(dels[1]);
        },

        escape_regex: function(text) {
          // thank you Simon Willison
          if(!sRE) {
            var specials = [
              '/', '.', '*', '+', '?', '|',
              '(', ')', '[', ']', '{', '}', '\\'
            ];
            sRE = new RegExp(
              '(\\' + specials.join('|\\') + ')', 'g'
            );
          }
          return text.replace(sRE, '\\$1');
        },

        find: function(name, context) {
          name = this.trim(name);

          // Checks whether a value is thruthy or false or 0
          function is_kinda_truthy(bool) {
            return bool === false || bool === 0 || bool;
          }

          var value;
          if(is_kinda_truthy(context[name])) {
            value = context[name];
          } else if(is_kinda_truthy(this.context[name])) {
            value = this.context[name];
          }

          if(typeof value === "function") {
            return value.apply(context);
          }
          if(value !== undefined) {
            return value;
          }
          return "";
        },

        includes: function(needle, haystack) {
          return haystack.indexOf(this.otag + needle) !== -1;
        },

        escape: function(s) {
          s = String(s === null ? "" : s);
          return s.replace(/&(?!\w+;)|["'<>\\]/g, function(s) {
            switch(s) {
            case "&": return "&amp;";
            case "\\": return "\\\\";
            case '"': return '&quot;';
            case "'": return '&#39;';
            case "<": return "&lt;";
            case ">": return "&gt;";
            default: return s;
            }
          });
        },

        create_context: function(_context) {
          if(this.is_object(_context)) {
            return _context;
          } else {
            var iterator = ".";
            if(this.pragmas["IMPLICIT-ITERATOR"]) {
              iterator = this.pragmas["IMPLICIT-ITERATOR"].iterator;
            }
            var ctx = {};
            ctx[iterator] = _context;
            return ctx;
          }
        },

        is_object: function(a) {
          return a && typeof a === "object";
        },

        is_array: function(a) {
          return Object.prototype.toString.call(a) === '[object Array]';
        },

        trim: function(s) {
          return s.replace(/^\s*|\s*$/g, "");
        },

        map: function(array, fn) {
          if (typeof array.map === "function") {
            return array.map(fn);
          } else {
            var r = [];
            var l = array.length;
            var i;
            for(i = 0; i < l; i++) {
              r.push(fn(array[i]));
            }
            return r;
          }
        }
      };

      return({
        name: "mustache.js",
        version: "0.3.1-dev",

        to_html: function(template, view, partials, send_fun) {
          var renderer = new Renderer();
          if(send_fun) {
            renderer.send = send_fun;
          }
          renderer.render(template, view, partials);
          if(!send_fun) {
            return renderer.buffer.join("\n");
          }
        }
      });
    }());

}, '0.1.0', {requires: ['mojito-util', 'io-base']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */

/**
 * The Action Context is a key part of the Mojito framework. The <em>ac</em>, for short, gives you access
 * to the frameworks features from within a controller function. The ac is an abstraction that
 * allows you to execute mojit actions within either a server or client context.
 *
 * @module ActionContext
 */

YUI.add('mojito-action-context', function(Y, NAME) {

    var CACHE;

    /**
     * The main point of entry for all mojits into Mojito. The Action Context is
     * passed to every mojit action during execution, either on the client or
     * server. This object is the API into Mojito, can can have many plugins
     * attached the provide extra functionality.
     * @submodule ActionContext
     * @class ActionContext
     */
    function ActionContext(opts) {
        Y.log('constructing action context', 'mojito', 'qeperf');

        var self = this,
            command = opts.command,
            instance = command.instance,
            controller = opts.controller,
            models = opts.models,
            dispatch = opts.dispatch,
            adapter = opts.adapter,
            store = opts.store,
            actionFunction,
            error;

        // "init" is not an action
        if (command.action === 'init') {
            throw new Error("Cannot execute action 'init' on any mojit. This name is "
                    + "reserved by the Mojito framework.");
        }

        // we want to make these easily accessible to any functions that addons attach directly to the ac object
        // TODO: These properties should be hidden behind accessor functions.
        this.command = command;
        this.instance = instance;
        this.action = command.action;
        this.type = instance.type;
        this.context = command.context;
        this.models = models;

        // identify this as internal... users probably won't want to use it, but addons might need
        this._dispatch = dispatch;
        this._adapter = adapter;

        // deprecated this function for current users
        this.dispatch = function() {
            Y.log('ac.dispatch() will soon be deprecated to discourage it\'s usage from within controllers. If you want to dispatch a command from within an ActionContext addon, please use ac._dispatch().', 'warn', NAME);
            self._dispatch.apply(self, arguments);
        };

        // TODO: should rework to be 'getAppConfig()' and 'getAppRoutes()' and
        // not property access through a hash.
        this.app = {
            config: store.getAppConfig(this.context, 'definition'),
            routes: store.getRoutes(this.context)
        };

        // this is where the addons list is injected onto the action
        // context...yay!
        attachActionContextAddons(Y.mojito.addons.ac, command, adapter, this);

        // There is only one addon that requires the store so check for it here.
        // TODO: how can we generalize this so it's not hard-coded to only the
        // deploy add-on. Oh, and note we don't make sure that setStore is a
        // callable function ;).
        if(this.deploy){
            this.deploy.setStore(store);
        }

        Y.log('ActionContext created for "'+(instance.id || '@'+instance.type)+'/'+command.action+'"', 'mojito', NAME);

        // Grab the action here as me may change it
        actionFunction = command.action;

        // Check if the controller has the requested action
        if (! Y.Lang.isFunction(controller[actionFunction])) {
            // If the action is not found try the '__call' function
            if(Y.Lang.isFunction(controller.__call)){
                actionFunction = '__call';
            }else{
                // If there is still no joy then die
                error = new Error("No method '" + command.action + "' on controller type '" + instance.type + "'");
                error.code = 404;
                throw error;
            }
        }

        // Time marker
        Y.mojito.perf.mark('mojito', 'core_action_start['+instance.type+':'+command.action+']', 'Calling the Mojit "'+instance.type+'" with action "'+command.action+'"');

        Y.log('action context created, executing action "' + actionFunction + '"', 'mojito', 'qeperf');

        controller[actionFunction](this);
    }

// --------------------------------------------------------------------------- 
// Comments below are so generated comments for flush, done, etc. are found on
// ActionContext even though they're not really done here.
// --------------------------------------------------------------------------- 

    /**
     * Returns data in the request and allows you to carry on execution.
     * @method flush
     * @param {object|string} data The data you want return by the request
     * @param {object} meta Any meta-data required to service the request
     */

    /**
     * Returns data and closes the request.
     * @method done
     * @param {object|string} data The data you want return by the request
     * @param {object} meta Any meta-data required to service the request
     */

    /**
     * Programatically report an error to Mojito, which will handle it gracefully.
     * @method error
     * @param err {Error} A normal JavaScript Error object is expected, but you may add a "code" property to the error
     * if you want the framework to report a certain HTTP status code for the error. For example, if the status code
     * is 404, Mojito will generate a 404 page.
     */

    /**
     * This dispatch function is called one time per Mojito execution. It creates a
     * contextualized Y instance for all further internal dispatches to use. It also
     * creates the ActionContext for the mojit.
     *
     * The command has three main parts:  the "instance", the "context", and the "params".
     * <pre>
     *  command: {
     *      instance: ...see below...
     *      context: ...see below...
     *      params: ...see below...
     *  }
     * </pre>
     *
     * The "instance" is a partial instance with details of the mojit instance.
     * See `ServerStore.expandInstance()` for details of the structure and which fields
     * are required.
     *
     * The "context" is the request context.  It is built by the "contextualizer"
     * middleware.
     *
     * The "params" is a structured set of parameters to pass to the mojit.
     * <pre>
     *  params: {
     *      route: {},
     *      url: {},
     *      body: {},
     *      file: {},
     *      ...
     *  }
     * </pre>
     *
     * <pre>
     * adapter: {
     *      flush: function(data, meta){},
     *      done: function(data, meta){},
     *      error: function(err){}
     * }
     * </pre>
     *
     * @method dispatch
     * @param command {map} the "command" describing how to dispatch the mojit. see above
     * @param adapter {object} the output adapter to pass to the mojit. see above
     * @return nothing. results are passed via the adapter
     */

    /**
     * Mixes all the Action Context addons into the Action Context
     * @param ac {Y.mojito.ActionContext}
     * @param acAddons {Array} the action context addons
     * @param store {object}
     * @param command {object}
     * @param adapter {object}
     * /
    function attachActionContextAddons(ac, acAddons, store, command, adapter) {

        var mixed = {},
            processDependencies,
            createAddon,
            addonName;

        // This inner function is used to process the dependencies of on action context addon.
        // An AC addon declares its dependencies by attaching a "dependsOn" property to its
        // constructor function that points to an array of strings, which are the names of all
        // the addon namespaces that are require to be plugged before it.
        processDependencies = function(addon, name, cb) {

            var i, dep, Dependee,
                dependsOn = addon.dependsOn;

            if (Y.Lang.isArray(dependsOn)) {
                for(i in dependsOn){
                    dep = dependsOn[i];
                    if (!mixed[dep]) {
                        Dependee = acAddons[dep];
                        if (!Dependee) {
                            throw new Error("Cannot process action-context addon '" + name + "', missing dependency: '" + dep + "'");
                        }
                        processDependencies(Dependee, dep, function() {
                            createAddon(dep, Dependee, ac);
                        });
                    }
                }
            }
            cb();
        };

        createAddon = function(name, Ctor, ac) {

            var addon = new Ctor(command, adapter, ac);
            // if this is the 'deploy' addon , and it requires the resource store,
            // deliver it
            if (addon.namespace === 'deploy' && Y.Lang.isFunction(addon.setStore)) {
                addon.setStore(store);
            }

            if (addon.namespace) {
                ac[addon.namespace] = addon;
            }

            mixed[name] = true;
        };

        for(addonName in acAddons){
            if (!mixed[addonName]) {
                processDependencies(acAddons[addonName], addonName, function() {
                    createAddon(addonName, acAddons[addonName], ac);
                });
            }
        }
    }*/

    // TODO: probably should move to mojito.common.js (namespace definitions).
    if(!YUI._mojito){
        YUI._mojito = {};
    }

    if(!YUI._mojito._cache){
        YUI._mojito._cache = {};
    }

    if(!YUI._mojito._cache.addons){
        YUI._mojito._cache.addons = {};
    }

    CACHE = YUI._mojito._cache.addons;

    function attachActionContextAddons(addons, command, adapter, ac){

        var addonName,
            addon,
            dependencies = {};

        if(CACHE[ac.type]){
            dependencies = CACHE[ac.type];
        }
        else{
            for(addonName in addons){
                if(addons.hasOwnProperty(addonName)) {
                    if(!dependencies[addonName]) {
                        calculateAddonDependencies(addons[addonName], addons, dependencies);
                    }
                    dependencies[addonName] = true;
                }
            }
            CACHE[ac.type] = dependencies;
        }

        for(addonName in dependencies){
            if(dependencies.hasOwnProperty(addonName)) {
                addon = new addons[addonName](command, adapter, ac);
                if(addon.namespace) {
                    ac[addon.namespace] = addon;
                }
            }
        }
    }

    function calculateAddonDependencies(addon, addons, dependencies){

        var dep,
            dependsOn = addon.dependsOn,
            i;

        if(!Y.Lang.isArray(dependsOn)) {
            return;
        }

        for(i=0; i < dependsOn.length; i++){
            dep = dependsOn[i];
            if(! dependencies[dep]) {
                if (! addons[dep]) {
                    throw new Error(addon.prototype.namespace + " addon has invalid dependency: '" + dep + "'");
                }
                calculateAddonDependencies(addons[dep], addons, dependencies);
            }
            dependencies[dep] = true;
        }
    }

    Y.mojito.ActionContext = ActionContext;

}, '0.1.0', {requires: [
    // following are ACPs are always available
    'mojito-config-addon',
    'mojito-output-adapter-addon',
    'mojito-url-addon',
    'mojito-assets-addon',
    'mojito-cookie-addon',
    'mojito-params-addon',
    'mojito-composite-addon'
]});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-controller-context', function(Y, NAME) {

    function ControllerContext (opts) {
        this.instance = opts.instance;
        this.dispatch = opts.dispatch;
        this.store = opts.store;
        this.Y = opts.Y;
        this.shareYUIInstance = opts.appShareYUIInstance && this.instance.shareYUIInstance; 
        this.init();
    }

    ControllerContext.prototype = {

        init: function() {
            var error,
                // Not really an instance...more like constructor options...see
                // controller.init() call below.
                instance = this.instance,
                controller,
                shareYUIInstance = this.shareYUIInstance,

                // Y.mojito.controller for legacy, multi-instance. Y.mojito.controllers for shared instance
                c = this.Y.mojito.controller || this.Y.mojito.controllers[instance.controllerModuleName];

            if (!Y.Lang.isObject(c)) {
                error = new Error("Mojit controller prototype is not an object! (mojit id:'" + instance.id + "')");
                // TODO: change this to a more appropriate error code.
                error.code = 404;
                throw error;
            }

            // we make a controller instance by using the heir() function, this gives us proper
            // function scope within the controller actions
            controller = this.controller = Y.mojito.util.heir(c);

            if (Y.Lang.isFunction(controller.init)) {
                // Use the "instance" data which isn't really an "instance" to
                // provide construction parameters for the controller init().
                controller.init(instance.config);
            }

            // mix in any (new) actions (the actions namespace here would be
            // populated by the resource store...but currently unused? Could
            // this be replaced by light inheritance to the controllers here).
            Y.Object.each(this.Y.mojito.actions, function(action, actionName) {
                this.Y.log('mixing action "' + actionName + '" into controller...', 'debug', NAME);
                controller[actionName] = function() {
                    action.apply(controller, arguments);
                };
            });

            // stash the models this controller has available to be later attache to the
            // ActionContext
            this.models = {};

            Y.Object.each(this.Y.mojito.models, function(model, modelName) {

                if (!shareYUIInstance || (instance.modelYUIModuleNames && instance.modelYUIModuleNames[modelName])) {

                    // TODO: Why? There's no particular reason to inherit here.
                    var modelInstance = Y.mojito.util.heir(model);
    
                    if (Y.Lang.isFunction(modelInstance.init)) {
                        // NOTE that we use the same config here that we use to
                        // config the controller...so the 'instance.config' data
                        // is feeding both types. 
                        modelInstance.init(instance.config);
                    }

                    this.models[modelName] = modelInstance;
                }

            }, this);

        },

        invoke: function(command, adapter) {

            this.Y.log('controller context invoke() for ' + this.instance.instanceId, 'mojito', 'qeperf');

            var instance = this.instance,
                config = command.instance.config,
                // this is the action that will be executed
                action = command.action,
                ac;
            // replace the non-expanded command instance with the proper instance, that was already
            // expanded when the controller context was created
            // TODO: This may not be necessary...we did this in dispatch().
            command.instance = instance;
            // however! we want to use the most recent config, not the cached config, because that can
            // change between action executions!
            command.instance.config = config;

            // if there is no action, make 'index' the default
            // TODO: This may not be necessary...we did this in dispatch().
            if (! command.action) {
                // use instance config for default action or 'index'
                command.action = instance.action || 'index';
            }

            try {
                // TODO ac var is here to appease jslint. Should AC not
                // self-execute in constructor? NO, IT SHOULDN'T :).
                ac = new this.Y.mojito.ActionContext({
                    command: command,
                    controller: this.controller,
                    models: this.models,
                    dispatch: this.dispatch,
                    adapter: adapter,
                    store: this.store
                });

                // TODO: uncomment once above issue is repaired.
                // ac.invoke(command, adapter);  // do it this way ;)
            }
            catch(err) {
                if (adapter.error) {
                    adapter.error(err);
                }
                else {
                    this.Y.log('WARNING!! Uncaught error from dispatch on instance "' + (instance.id || '@'+instance.type) + '"', 'error', NAME);
                    this.Y.log(err.message, 'error', NAME);
                    this.Y.log(err.stack, 'error', NAME);
                }
                // TODO: should we be rethrowing the error here? We log but we
                // don't ensure callers know...but then again dispatch() may
                // need this level of isolation.
            }

            this.Y.mojito.perf.mark('mojito', 'core_dispatch_end['+(instance.id || '@'+instance.type)+':'+action+']');
        }

    };

    Y.mojito.ControllerContext = ControllerContext;

}, '0.1.0', {requires: ['mojito-action-context', 'mojito-util']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */
/**
 * This object is responsible for running mojits.
 * @class MojitoDispatcher
 * @constructor
 * @param resourceStore {ServerStore} the store to use
 * @private
 */
YUI.add('mojito-dispatcher', function(Y, NAME){

    var loader, logger, store, 
        CACHE = {
            YUI: {},
            controllerContexts: {}
        },
        // TODO remove client detection hack (bug #4809613)
        cacheControllerContext = (typeof window !== 'undefined'),
        coreYuiModules = [],
        usePrecomputed,
        appShareYUIInstance;

    /* Optimization methods from Satyen:

    ============ 1). YUI({bootstrap:false}).use("*")

    You'll get optimal performance by adding the js files (in order) to the page, and using YUI({bootstrap:false}).use("*") instead of Y.use(moduleList).

    This will stop loader from calculating dependencies and assume everything which is required is already on the page.
    Additionally adding the scripts in order will mean there's less re-sorting which needs to be done as each module gets attached.

    POTENTIAL ISSUE:
    For mojito, since you have multiple Y instances, Y.use("*") may be a concern - since it's saying "use everything currently on the page", so all your mojit instances will have all your modules attached.
    However, you could still use this for the global mojito framework Y instance, or for the shared modules (modules common to all mojits) and then use Y.use(additionalModules) for the rest.

    ============ 2). YUI({bootstrap:false}).use(sortedModuleList)
    The next step down in terms of performance would be to use YUI({bootstrap:false}).use(sortedModuleList) instead of Y.use("*"), so you still have instances with separate modules, but there's less (re)sorting required while attaching.

    ============ 3).
    You could also set the sorted list of shared modules (modules common to all mojits) as the core modules required for *ALL* your Y instances, using the "core" config property:

    http://developer.yahoo.com/yui/3/api/config.html#property_core

    It seems like 3 would be the easiest first optimization step to get in place to see if it provides benefits.
    */

    /* See docs for the dispatch function in action-context.common.js */
    function dispatch(command, adapter) {
        logger.log('dispatching command for ' + (command.instance.base || '@' + command.instance.type) + '.' + command.action, 'mojito', 'qeperf');
        var instance = command.instance,
            cc = cacheControllerContext ? CACHE.controllerContexts[instance.instanceId] : null;

        if (cc) {
            logger.log('using cached controller context: ' + instance.instanceId, 'info', NAME);
            cc.invoke(command, adapter);
            return;
        }

        logger.log('expanding partial mojit instance', 'mojito', 'qeperf');

        // Convert the command partial instance to a full instance. Note
		// "instance" here means "dictionary" that's either fully populated or
		// not. When it's expanded it contains all the data from the resource
		// store which is needed to ensure it can be invoked/dispatched.
        store.expandInstance(command.instance, command.context, function(err, instance) {

            // if there is no action, make 'index' the default
            if (! command.action) {
                // use instance config for default action or 'index'
                command.action = instance.action || 'index';
            }

            var instanceYuiCacheKey, instanceYuiCacheObj, ctxKey;

            if (err) {
                if (adapter.error) {
                    adapter.error(err);
                }
                else {
                    logger.log('WARNING!! Uncaught error from dispatch on instance "' + (command.instance.id || '@'+command.instance.type) + '"', 'error', NAME);
                    logger.log(err.message, 'error', NAME);
                    logger.log(err.stack, 'error', NAME);
                    // TODO 2011-06-20: [bug 4649669] adapter.done() so the request doesn't hang open
                }
                return;
            }

            logger.log('mojit instance expansion complete: ' + instance.instanceId, 'mojito', 'qeperf');

            // We replace the given instance with the expanded instance
            command.instance = instance;

            if (appShareYUIInstance && instance.shareYUIInstance) {
                instanceYuiCacheKey = "singleton";
            } else {
                // Generate a cache key
                // TODO 2011-06-20: [bug 4649670] Can we create this key faster? from the request contextualizer?
                instanceYuiCacheKey = [];
                for (ctxKey in command.context) {
                    if (command.context.hasOwnProperty(ctxKey) && command.context[ctxKey]) {
                        instanceYuiCacheKey.push(ctxKey+'='+command.context[ctxKey]);
                    }
                }
                instanceYuiCacheKey = instance.type+'?'+instanceYuiCacheKey.join('&');
            }

            function runMojit() {

                var moduleList = (usePrecomputed ? instance.yui.sorted : instance.yui.requires),
                    // gotta copy this or else it pollutes the client runtime
                    mojitYuiModules = Y.mojito.util.copy(moduleList);

                // We are set so log our final list and use() it
                logger.log('Dispatching an instance of "'+(instance.id || '@'+instance.type)+'/'+command.action+'" with the modules: ['+ mojitYuiModules.join(', ')+']', 'info', NAME);

                logger.log('dispatching instance of "'+ instance.instanceId +'/'+command.action+'"', 'mojito', 'qeperf');

                // Create the function that will be called in YUI().use()
                // pushing the runner function onto the tail of the YUI module listing
                mojitYuiModules.push(function(MOJIT_Y) {
                    logger.log('YUI used: ' + instance.instanceId, 'mojito', 'qeperf');

                    logger.log("Creating controller context", 'info', NAME);
                    cc = new Y.mojito.ControllerContext({
                        instance: instance,
                        Y: MOJIT_Y,
                        store: store,
                        appShareYUIInstance : appShareYUIInstance, 
                        dispatch: dispatch
                    });
                    logger.log('caching controller context: ' + instance.instanceId, 'info', NAME);
                    if (cacheControllerContext) {
                        CACHE.controllerContexts[instance.instanceId] = cc;
                    }

                    cc.invoke(command, adapter);

                });

                // Time marker
                Y.mojito.perf.mark('mojito', 'core_dispatch_start['+(instance.id || '@'+instance.type)+':'+command.action+']', 'Dispatching an instance of "'+(instance.id || '@'+instance.type)+'/'+command.action+'"');

                // Now we call YUI "use()" with our "modules" array
                // This is the same as doing; YUI().use(arrayOfModules, function(Y){});

                // Although Y.use should be asynch, it is not entirely asynch. The files are read asynch, but the loader calculations are not.
                // Putting this use statement within a setTimeout apparently prevents it from blocking the event loop,
                // but it can also execute the runner function against a different request.

                logger.log('YUI use: ' + instance.instanceId, 'mojito', 'qeperf');

                instanceYuiCacheObj.use.apply(instanceYuiCacheObj, mojitYuiModules);
            }

            function modulesLoaded(cb) {

                var groups = {},
                    groupKey = 'mojit-' + instance.type,
                    instanceYuiConfig;

                // TODO 2011-06-20: [bug 4649674] Replace the mojit groups defined in index.js's configureYUI() function with this?

                //logger.log('YUI instance creation: ' + instance.instanceId, 'mojito', 'qeperf');

                instanceYuiCacheObj = CACHE.YUI[instanceYuiCacheKey];

                if (!instanceYuiCacheObj) {

                    instanceYuiConfig = {
                        //debug: true,
                        //filter: 'debug',
                        bootstrap: (usePrecomputed ? false : true),
                        lang: command.context.langs, // This is a list of prefered "langs"
                        core: coreYuiModules
                    };                    

                    instanceYuiCacheObj = CACHE.YUI[instanceYuiCacheKey] = YUI(instanceYuiConfig);

                    logger.log('YUI instance created: ' + instance.instanceId, 'mojito', 'qeperf');
                    logger.log('Cached a YUI instance with key: "'+instanceYuiCacheKey+'"', 'mojito', NAME);
                } else {
                    logger.log('Using cached YUI instance from key:' + instanceYuiCacheKey, 'mojito', 'qeperf');
                }

                // To handle both shared and new instance instead of having if/elses.
                groups[groupKey] = instance.yui.config;
                instanceYuiCacheObj.applyConfig({groups:groups});

                cb();
            }

            // Get the cached YUI instance (if there is one)
            if (!(appShareYUIInstance && instance.shareYUIInstance)) {
                instanceYuiCacheObj = CACHE.YUI[instanceYuiCacheKey];
            }

            /*
             * We cache a YUI instance for each Mojit "type" requested.
             * Doing this gives a huge performance benefit at the
             * cost of a larger memory foot print.
             */
            if (instanceYuiCacheObj) {
                runMojit();
            } else if (! usePrecomputed) {
                modulesLoaded(runMojit);
            } else {

                logger.log('loading YUI modules for YUI instantiation: ' + instance.instanceId, 'mojito', 'qeperf');

                loader.load(instance.yui.sortedPaths, function(err) {
                    if (err) {
                        logger.log(err.message, 'error', NAME);
                        adapter.error(err);
                        return;
                    }
                    modulesLoaded(runMojit);
                });
            }
        });
    }

    /*
     * the dispatcher must receive the global logger up front, because it is loaded within a
     * Y instance that has the original Y.log function, so in order to have consistent logging,
     * the Mojito logger is passed in and we use it.
     */
    Y.mojito.Dispatcher = {

        init: function(resourceStore, coreMojitoYuiModules, globalLogger, globalLoader) {
            var appConfigNC;

            if (!resourceStore) {
                throw new Error("Mojito cannot instantiate without a resource store");
            }

            store = resourceStore;
            coreYuiModules = coreMojitoYuiModules || [];
            logger = globalLogger;
            loader = globalLoader;

            logger.log('Dispatcher created', 'debug', NAME);

            appConfigNC = store.getAppConfig({}, 'definition');

            appShareYUIInstance = (false !== appConfigNC.shareYUIInstance);
            usePrecomputed = (appConfigNC.yui && 'precomputed' === appConfigNC.yui.dependencyCalculations);

            if (! usePrecomputed) {
                coreYuiModules.push("loader");
            }

            return this;
        },

        dispatch: dispatch
    };

}, '0.1.0', { requires:['mojito-controller-context', 'mojito-util', 'mojito-resource-store-adapter']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-loader', function(Y, NAME) {

    // IE has a limit of 2048-character long URLs.
    var MAX_URL_LENGTH = 2000;


    function Loader(appConfig) {
        // Y.log('ctor()', 'mojito', NAME);
        this.appConfig = appConfig;
    }


    Loader.prototype = {

        load: function(paths, cb) {
            //Y.log('load(' + Y.Object.keys(paths).join(', ') + ')', 'mojito', NAME);
            var self = this,
                mod, scriptsToLoad = {}, loaded = 0;

            paths = paths || {};
            if (! Y.Object.size(paths)) {
                cb(null);
                return;
            }

            for (mod in paths) {
                if (paths.hasOwnProperty(mod)) {
                    if (YUI.Env.mods[mod]) {
                        continue;
                    }
                    script = paths[mod];
                    if (script) {
                        if ('.js' !== script.substr(-3).toLowerCase()) {
                            continue;
                        }
                        scriptsToLoad[script] = true;
                    }
                }
            }
            scriptsToLoad = Y.Object.keys(scriptsToLoad);
            if (! scriptsToLoad.length) {
                return cb(null);
            }
            Y.log('loading ' + scriptsToLoad.join(', '), 'mojito', NAME);
            Y.Get.script(scriptsToLoad, {
                async: true,
                onSuccess: function() {
                    var done = false;
                    // --- ON CLIENT
                    if (typeof window !== 'undefined') {
                        done = true;
                    }
                    // --- ON SERVER
                    else {
                        loaded++;
                        if (loaded === scriptsToLoad.length) {
                            done = true;
                        }
                    }
                    if (done) {
                        Y.log('SUCCESS', 'mojito', NAME);
                        cb(null);
                    }
                },
                onFailure: function() {
                    Y.log('FAILURE', 'warn', NAME);
                    var err = new Error('Failed to load URLs:  ' + scriptsToLoad.join(', '));
                    cb(err);
                }
            });

        },


        _createURLlist: function(base, list) {
            var url, urls = [],
                newPart, newLength;
            if (! list.length) {
                return [];
            }
            url = base + list.shift();
            while (list.length) {
                newPart = list.shift();
                newLength = url.length + 1 + newPart.length;
                if (newLength > MAX_URL_LENGTH) {
                    urls.push(url);
                    url = base + newPart;
                }
                else {
                    url += '&' + newPart;
                }
            }
            urls.push(url);
            return urls;
        },


        // this also pulls in dependencies
        createYuiLibComboUrl: function(modules, filter) {
            var required = {}, comboJsParts = [], comboCssParts = [],
                loader, filterDef, filterDefSearchExp,
                i, name, info, filteredPath, combo = { js:[], css:[] };
            filter = filter || 'min';

            loader = new Y.Loader({});
            for (i=0; i<modules.length; i++) {
                name = modules[i];
                required[name] = true;
            }
            loader.ignoreRegistered = true;
            loader.calculate({required:required});

            // workaround for a bug fixed in yui-3.5.0
            // http://bug.corp.yahoo.com/show_bug.cgi?id=4939364&mark=22#c22
            Object.keys(loader.moduleInfo).forEach(function(module) {
                var m = loader.moduleInfo[module];
                YUI.Env._renderedMods[module] = m;
            });

            filterDef = loader.FILTER_DEFS[filter.toUpperCase()];
            if (filterDef) {
                filterDefSearchExp = new RegExp(filterDef.searchExp);
            }

            for (i=0; i<loader.sorted.length; i++) {
                name = loader.sorted[i];
                if (('parallel' === name) || (name.indexOf('nodejs') > -1)) {
                    // not appropriate for client environment
                    continue;
                }
                info = loader.moduleInfo[name];
                if (info) {
                    filteredPath = (filterDef) ? info.path.replace(filterDefSearchExp, filterDef.replaceStr) : info.path;
                    if ('lang/datatype-date' === name) {
                        // this one is messed up
                        filteredPath = 'datatype/lang/datatype-date.js';
                    }
                    if ('js' === info.type) {
                        comboJsParts.push(loader.root + filteredPath);
                    }
                    else if ('css' === info.type) {
                        comboCssParts.push(loader.root + filteredPath);
                    }
                }
            }
            combo.js = this._createURLlist(loader.comboBase, comboJsParts);
            combo.css = this._createURLlist(loader.comboBase, comboCssParts);
            return combo;
        }


    };

    Y.mojito.Loader = Loader;

}, '0.1.0', {requires: ['get', 'mojito']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-logger', function(Y, NAME) {

    // TODO MATT 2011-06-20: [bug 4647494] Clean up the logger implementation

    var isYuiLog = /^yui/,
        LOG_LEVEL = 'info',
        logNothingAtAllEver = false,
        defaults = {
            writer: null, //assigned below
            formatter: null, //assigned below
            timestamp: true,
            level: LOG_LEVEL,
            defaultLevel: 'info',
            yui: false,
            buffer: false,
            maxBufferSize: 1024,
            order: [
                'DEBUG','MOJITO','INFO','WARN','ERROR','NONE'
            ],
            filter: {
                DEBUG: true,
                MOJITO: true,
                INFO: true,
                WARN: true,
                ERROR: true,
                NONE: true
            }
        };

    defaults.writer = function(data) {
        var i=0;
        if (!console || !console.log) {
            // not much to do if I can't console.log. Sorry, IE6
            return;
        }
        if (Y.Lang.isArray(data)) {
            // this is a flush of many logs
            for (; i<data.length; i++) {
                console.log(data[i]);
            }
        } else {
            console.log.apply(console, arguments);
        }
    };

    defaults.formatter = function(msg, lvl, source, timestamp, opts, id) {
        var ts = opts.timestamp ? '('+timestamp+') ' : '',
            code = '', stack = '';
        if (msg instanceof Error) {
            if (msg.code) {
                code = ' ' + msg.code;
            }
            if (msg.stack) {
                stack = '\n' + msg.stack;
            }
            msg = 'Error' + code + ': ' + msg.message + stack;
        } else if (Y.Lang.isObject(msg)) {
            msg = JSON.stringify(msg, null, 2);
        }
        source = source ? source + ': ' : '';
        return '[' + lvl.toUpperCase() + '] ' + ts + source + msg;
    };

    function Logger(opts, id) {
        var cnt = 0, order,
            lvl;

        this._opts = Y.merge(defaults, opts);
        this._buffer = [];

        if (id) {
            this._id = id;
        }

        order = this._opts.order || [];
        lvl = this._opts.level.toLowerCase();

        for (; cnt<order.length; cnt++) {
            this._opts.filter[order[cnt]] = true;
        }
        cnt = 0;
        while (cnt <= order.length) {
            if (order[cnt] && order[cnt].toLowerCase() !== lvl) {
                this._opts.filter[order[cnt]] = false;
            } else {
                break;
            }
            cnt++;
        }

        //Hmm... If the count is the same length as the order list we mean NONE
        if(cnt === order.length){
            logNothingAtAllEver = true;
        }

        if(this._opts.filter.DEBUG){
            if(!YUI._mojito){
                YUI._mojito = {};
            }
            YUI._mojito.DEBUG = true;
        }
    }

    Logger.prototype = {

        log: function(msg, lvl, source) {

            var level,
                isYui,
                baseLevel,
                now;

            if(logNothingAtAllEver){
                return;
            }

            now = new Date().getTime();

            // flush-fast if msg is {flush: true}
            if (Y.Lang.isObject(msg) && msg.flush === true) {
                return this.flush();
            }

            level = (lvl || this._opts.defaultLevel).toLowerCase();
            isYui = isYuiLog.test(level);
            baseLevel = isYui ? level.split('-').pop() : level;

            // the fat filter strips out log calls below current base log level
            if (! this._opts.filter[baseLevel.toUpperCase()]) {
                return;
            }

            // this strips out all YUI logs if the 'showYui' option is false
            if (isYui && ! this._opts.yui) {
                return;
            }

            if (this._opts.buffer) {
                this._buffer.push([msg, level, source, now]);
                // auto-flush buffer if breaking max buffer size
                if (Y.Object.size(this._buffer) > this._opts.maxBufferSize) {
                    this.flush();
                }
            } else {
                this._publish(msg, level, source, now);
            }
        },

        flush: function() {
            var log, logs = [];
            if (this._opts.publisher) {
                this._opts.publisher(this._buffer);
            } else {
                while (this._buffer.length) {
                    log = this._buffer.shift();
                    logs.push(this._opts.formatter(log[0], log[1], log[2], log[3], this._opts, this._id));
                }
                this._opts.writer(logs);
            }
            this._buffer = [];
        },

        setFormatter: function(f) {
            this._opts.formatter = f;
        },
        setWriter: function(w) {
            this._opts.writer = w;
        },
        setPublisher: function(p) {
            console.log('publisher set: ' + p.toString());
            this._opts.publisher = p;
        },

        _publish: function(msg, lvl, src, ts) {
            //console.log('default publisher');
            if (this._opts.publisher) {
                this._opts.publisher(msg, lvl, src, ts, this._id);
            } else {
                this._opts.writer(this._opts.formatter(msg, lvl, src, ts, this._opts, this._id));
            }
        }
    };

    Y.mojito.Logger = Logger;

}, '0.1.0', {requires: ['mojito']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */

/**
 * Client side Mojito runtime
 * @module MojitoClient
 */

/**
 * @submodule MojitoClient
 */

YUI.add('mojito-mojit-proxy', function(Y, NAME) {

    var MJT_EVT_PRFX = 'mojit:';

    // TODO MATT: [bug 4649682] Implement all these damn Dali API functions on the mojit proxy
    // (but only when as need them :-)
    var DALI_API_METHODS = [
        "broadcast", "listen", "unlisten", "closeView", "getViewNode",
        "getViewDirection", "isViewOpen", "navigate", "openView", "makeRequest",
        "refreshView", "setView", "abortRequest", "error", "getContextData",
        "getId", "getPref", "getService", "isRequestPending", "setContextData",
        "setPref"
    ];

    /**
     * The object that is given to each mojit binder to be used to interact with other mojits
     * and the mojito framework.
     * @class MojitProxy
     */
    function MojitProxy(opts) {
        // "private"
        this._action = opts.action;
        this._binder = opts.binder;
        this._base = opts.base;
        this._node = opts.node;
        this._element = opts.element;
        this._viewId = opts.viewId;
        this._instanceId = opts.instanceId;
        this._client = opts.client;
        this._store = opts.store;

        /**
         * The mojit type
         * @property type
         * @type {string}
         */
        this.type = opts.type;
        /**
         * The mojit configuration for this binder
         * @property config
         * @type {object}
         */
        this.config = opts.config;
        /**
         * The context used to generate this page
         * @property context
         * @type {object}
         */
        this.context = opts.context;

        Y.Array.each(DALI_API_METHODS, function(m) {
            if (! this[m]) {
                //Y.log('Stubbing Dali platform method: ' + m, 'debug', NAME);
                this[m] = function() {
					// Mojito is not DALI
                    throw new Error("Function not implemented: " + m);
                };
            }
        }, this);
    }


    MojitProxy.prototype = {

        /**
         * Used by mojit binders to broadcast a message between mojits.
         * @method broadcast
         * @param {String} name event name
         * @param {Object} payload the payload for the event
         * @param {object} options currently only used to specify target for
         *      broadcast. For example, to target only one child mojit for broadcast,
         *      use: {target: {slot: 'slot name', viewId: 'DOM view id'}}
         */
        broadcast: function(name, payload, options) {
            this._client.doBroadcast(MJT_EVT_PRFX + name, this._viewId, payload, options);
        },

        /**
         * Allows mojit binders to register to listen to other mojit events
         * @method listen
         * @param {String} name event name
         * @param {Function} callback called when an event is broadcastd with the event data
         */
        listen: function(name, callback) {
            this._client.doListen(MJT_EVT_PRFX+name, this._viewId, function(evt) {
                // prevent mojits from listening to their own events
                if (evt.source !== this.id) {
                    callback(evt);
                }
            });
        },

        /**
         * The opposite of the "listen" function. Deletes all callback functions from the
         * listener queue associated with this binder and event type. If event name is not
         * specified, all callbacks associated with this binder are deleted.
         * @param {String} [optional] name event name
         */
        unlisten: function(name) {
            var eventName = name ? MJT_EVT_PRFX + name : null;
            this._client.doUnlisten(this._viewId, eventName);
        },

        /**
         * This method renders the "data" provided into the "View" specified.
         * The "view" must be the name of one of the files in the current
         * Mojits "views" folder. Returns via the callback.
         *
         * @method render
         * @param {object} data
         * @param {string} view
         * @param {function(err,str)} cb
         */
        render: function(data, view, cb) {
            this._client.doRender(this, data, view, cb);
        },

        /**
         *
         * Used by the mojit binders to invoke actions on themselves within Mojito.
         * The <em>options</em> parameter is optional and may contain:
         * <dl>
         *     <dt>params</dt><dd>&lt;object&gt; must be broken out explicitly:
         *     <dl>
         *      <dt>route</dt><dd>&lt;object&gt; Map of key/value pairs.</dd>
         *      <dt>url</dt><dd>&lt;object&gt; Map of key/value pairs.</dd>
         *      <dt>body</dt><dd>&lt;object&gt; Map of key/value pairs.</dd>
         *      <dt>file</dt><dd>&lt;object&gt; Map of key/value pairs.</dd>
         *     </dl></dd>
         *     <dt>rpc</dt><dd>&lt;boolean&gt; Means that we are immediately
         *     sending the request to the server to answer the invocation.</dd>
         * </dl>
         *
         * @method invoke
         * @param {string} action name of the action to invoke
         * @param {Object} options see above
         * @param {function} cb function to be called on completion
         */
        invoke: function(action, options, cb) {
            var callback, command, instance;

            // If there are no options use it as the callback
            if('function' === typeof options){
                callback = options;
                options  = {};
            } else {
                callback = cb;
            }

            // If we don't have a callback set an empty one
            if('function' !== typeof callback){
				// TODO: this can be a constant function...not created on each
				// invoke call.
                callback = function(){};
            }

            // Make sure we have a "params" key in our "options" object
            options.params = options.params || {};

			// This is the "partial instance" which isn't an "Object instance"
			// :). At least one of base or type must be defined.
			// TODO: we don't check base vs. type here...
            instance = {
                base: this._base,
                type: this.type,
                guid: this._instanceId,     // DEPRECATED, use instanceId instead
                instanceId: this._instanceId,
                config: Y.mojito.util.copy(this.config)
            };

            // Create the command we will use to call executeAction() with
            command = {
                instance: instance,
                action: action,
                params: { // Explicitly map the params to there keys
                    route: options.params.route || {},
					// NOTE the defaulting here to drive from URL if no explicit
					// params are provided.
					// TODO: we should have an explicit override option here and
					// merge...
                    url: options.params.url || this.getFromUrl(),
                    body: options.params.body || {},
                    file: options.params.file || {}
                },
				// NOTE this isn't a standard command option per Matt. 
				// TODO: not really "proper" to be part of command object,
				// should really be somewhere else...but where?
                rpc: options.rpc || false
            };

            this._client.executeAction(command, this.getId(), callback);
        },

        /**
         * Refreshes the current DOM view for this binder without recreating the binder instance. Will call
         * the binder's onRefreshView() function when complete with the new Y.Node and HTMLElement objects.
         * @param opts [optional] <object> same as the options for invoke()
         * @param cb [optional] called after replacement and onRefreshView have been called, sends data/meta
         */
        refreshView: function(opts, cb) {
            opts = opts || {};
            if (Y.Lang.isFunction(opts)) {
                cb = opts;
                opts = {};
            }
            this._client.refreshMojitView(this, opts, cb);
        },

        /**
         * Gets URL parameters
         * @method getFromUrl
         * @param {string} key The name of the parameter required
         * @return {string|object} param value, or all params if no key specified
         */
        getFromUrl: function(key){
            if(!this.query){
                this.query = Y.QueryString.parse(window.location.href.split('?').pop());
            }

            if(key){
                return this.query[key];
            }
            
            return this.query;
        },

        /*
         * Returns the DOM Node ID for the current binder
         * @method getId
         * @return {string} YUI GUID
         */
        getId: function(){
            return this._viewId;
        },

        /**
         * Helper function to gather up details about a mojit's children from the Mojito Client
         * @method getChildren
         * @return <object> slot<string>-->child information<object>
         */
        getChildren: function() {
            return this._client._mojits[this.getId()].children;
        },

        /**
         * Clears out a child's view, calling the appropriate life cycle functions, then destroy's its binder and
         * dereferences it. Will also dereference the child from this mojit's children.
         * @method destroyChild
         * @param id <string> *Either* the slot key of the child, or the DOM view id of the child
         * @param retainNode <boolean> if true, the binder's node will remain in the dom
         */
        destroyChild: function(id, retainNode) {
            var slot, doomed, children = this.getChildren();
            if (children[id]) {
                doomed = children[id].viewId;
            } else {
                for (slot in children) {
                    if (children.hasOwnProperty(slot) && children[slot].viewId === id) {
                        doomed = id;
                    }
                }
            }
            if (! doomed) {
                throw new Error("Cannot destroy a child mojit with id '" + id + "'. Are you sure this is your child?");
            }
            this._client.destroyMojitProxy(doomed, retainNode);
            delete children[id];
            delete this.config.children[id];
        },

        /**
         * Destroys all children. (Calls destroyChild() for each child.)
         * @param retainNode <boolean> if true, the binder's node will remain in the dom
         */
        destroyChildren: function(retainNode) {
            var me = this;
            Y.Object.each(this.getChildren(), function(child, childId) {
                me.destroyChild(childId, retainNode);
            });
        },

        /**
         * Allows a binder to destroy itself and be removed from Mojito client runtime entirely.
         * @method destroySelf
         * @param retainNode <boolean> if true, the binder's node will remain in the dom
         */
        destroySelf: function(retainNode) {
            this._client.destroyMojitProxy(this.getId(), retainNode);
        },

        _destroy: function(retainNode) {
            var binder = this._binder;
            Y.log('destroying binder ' + this._viewId, 'debug', NAME);
            this.destroyChildren(retainNode);
            if (Y.Lang.isFunction(binder.destroy)) {
                // this will de-register all this binder's callbacks from any
                // listener queues
                binder.destroy.call(binder);
            }
            if (! retainNode) {
                this._node.remove(true);
            }
            this._client.doUnlisten(this._viewId);
        },

        _pause: function() {
            var binder = this._binder;
            if (Y.Lang.isFunction(binder.onPause)) {
                binder.onPause();
            }
        },

        _resume: function() {
            var binder = this._binder;
            if (Y.Lang.isFunction(binder.onResume)) {
                binder.onResume();
            }
        }

    };

    Y.mojito.MojitProxy = MojitProxy;

}, '0.1.0', {requires: ['mojito-util']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */

// Set up a global client-side Mojito namespace
if (! YUI._mojito) {
    YUI._mojito = {
        // this is initially a dummy logger object so that client code can set mutator functions
        // before the logger has actually been instantiated
        logger: {
            _logMutatorCache: {
                publisher: function() {
                    YUI._mojito._clientYlog.apply(YUI._mojito._clientY, arguments);
                }
            },
            set: function(k, v) {
                this._logMutatorCache[k] = v;
            }
        },
        // A general cache object to be used by internal mojito only
        _cache: {},
        _clientY: null,
        _clientYlog: null
    };
}

YUI.add('mojito-client', function(Y, NAME) {

    // These methods are methods that potentially make XHR calls to retrieve data from the server. When the Mojito
    // client is "paused" by calling the pause() function, all the methods below are queued as they are executed
    // instead of being fully executed. When the resume() function is called, the pause queue is flushed and all
    // the intercepted actions are taken at that time.
    var PAUSEABLE = [
            'executeAction',
            'doRender',
            'doBroadcast',
            'doListen',
            'doUnlisten'
        ],

        State = {
            PAUSED: 'paused',
            ACTIVE: 'active'
        };


    // because there is a moment during startup when we need it, cache the
    // original Y instance for use as the log platform
    YUI._mojito._clientY = Y;
    var log = function () {
        if (YUI._mojito.logger && YUI._mojito.logger.log) {
            YUI._mojito.logger.log.apply(YUI._mojito.logger, arguments);
        } else {
            YUI._mojito._clientY.log.apply(YUI._mojito._clientY, arguments);
        }
    };

    /**
     * The starting point for mojito to run in the browser. You can access one instance of the Mojito Client running
     * within the browser environment through window.YMojito.client.
     *
     * @module MojitoClient
     * @class Client
     * @constructor
     * @namespace Y.mojito
     * @param {Object} config The entire configuration object written by the server
     * to start up mojito.
     */
    function MojitoClient(config) {
        this.timeLogStack = [];
        this.yuiConsole = null;
        this._pauseQueue = [];
        if (config) {
            this.init(config);
        }
    }


    var lifecycleEvents = {};


    /**
     * Subscribe to a MojitoClient lifecycle event.
     *
     * @static
     * @param evt {string} name of event to subscribe to
     * @param cb {function(data)} callback called when the event fires
     * @return {void}
     */
    MojitoClient.subscribe = function(evt, cb) {
        if (! lifecycleEvents[evt]) {
            lifecycleEvents[evt] = [];
        }
        lifecycleEvents[evt].push(cb);
    };


    /**
     * Fires a lifecycle event.
     *
     * @private
     * @param evt {string} name of event to fire
     * @param data {object} data to pass to listeners
     * @return {void}
     */
    function fireLifecycle(evt, data) {
        var cbs = lifecycleEvents[evt],
            c;
        if (!cbs || !cbs.length) {
            return;
        }
        for (c = 0; c < cbs.length; c += 1) {
            cbs[c](data);
        }
    }


    /**
     * Fired at the beginning of the startup of MojitoClient.
     *
     * The data contains the following:
     * <dl>
     *  <dt><code>config</code></dt>
     *  <dd>the config object used to initialize the MojitoClient</dd>
     * </dl>
     *
     * Any change to the config will be picked up and used by MojitoClient.
     *
     * @event pre-init
     * @param data {object}
     */

    /**
     * Fired at the end of the startup of MojitoClient.
     *
     * @event post-init
     * @param data {object} an empty object
     */

    /**
     * Fired before the binders are attached to the page.
     *
     * The data contains the following:
     * <dl>
     *  <dt><code>binderMap</code></dt>
     *  <dd>the details of the binders to attach to the page</dd>
     *  <dt><code>parentId</code></dt>
     *  <dd>[optional] the parent binder view id to attach any children</dd>
     *  <dt><code>topLevelMojitViewId</code></dt>
     *  <dd>[optional] the topmost (root) binder view id to attach as a child to the parent</dd>
     * </dl>
     *
     * Any change to the data will be picked up and used by MojitoClient.
     *
     * @event pre-attach-binders
     * @param data {object}
     */

    /**
     * Fired after the binders are attached to the page.
     *
     * @event post-attach-binders
     * @param data {object} an empty object
     */


    MojitoClient.prototype = {

        init: function(config) {
            fireLifecycle('pre-init', {config:config});
            Y.mojito.perf.mark('mojito', 'core_client_start');
            var that = this,
                logConfig = {},
                appConfig = config.appConfig;

            // YUI Console
            if(appConfig && appConfig.yui && appConfig.yui.showConsoleInClient && !that.yuiConsole){
                YUI().use('console-filters', function(Y){
                    Y.one('body').addClass('yui3-skin-sam');
                    that.yuiConsole = new Y.Console({
                        plugins: [ Y.Plugin.ConsoleFilters ],
                        logSource: Y.Global,
                        height: 600
                    });
                    that.yuiConsole.render();
                    that.init(config);
                });
                return;
            }

            if (appConfig && appConfig.log && appConfig.log.client) {
                logConfig = appConfig.log.client;
            }
            // to allow any client code to provide global log mutators before mojito starts...
            Y.Array.each(['formatter', 'writer', 'publisher'], function(logMutator) {
                if (YUI._mojito.logger._logMutatorCache[logMutator]) {
                    logConfig[logMutator] = YUI._mojito.logger._logMutatorCache[logMutator];
                }
            });
            YUI._mojito.logger = new Y.mojito.Logger(logConfig);
            YUI._mojito.loader = new Y.mojito.Loader(appConfig);
            // push all client logs through our logger
            YUI._mojito._clientYlog = Y.log;
            Y.log = log;

            if (Y.mojito.TunnelClient) {
                this.tunnel = new Y.mojito.TunnelClient(config.appConfig);
            }

            // Make the "Resource Store" by wrapping it with the adapter
            this.resourceStore = new Y.mojito.ResourceStore(config);

            // the resource store adapter and the dispatcher must be passed the mojito logger object,
            // because they were created within a Y scope that still has reference to the original Y.log
            // function
            this.resourceStore = Y.mojito.ResourceStoreAdapter.init('client', this.resourceStore, YUI._mojito.logger);
            this.dispatcher = Y.mojito.Dispatcher.init(this.resourceStore, null, YUI._mojito.logger, YUI._mojito.loader);
            // request context from server
            this.context = config.context;
            // application configuration
            this.config = config;

            // create listener bag for mojit comms
            this._listeners = {};
            // the mojits represented in the current DOM, keyed by DOM element id
            this._mojits = {};

            Y.mojito.perf.mark('mojito', 'core_client_end', 'Mojito client library loaded');
            /* FUTURE -- perhaps only do this once a user needs it
            var singletons;
            singletons = {
                tunnel:         this.tunnel,
                resourceStore:  this.resourceStore,
                dispatcher:     this.dispatcher
            }
            fireLifecycle('made-singletons', singletons);
            // allow the event listeners to modify the singletons
            this.tunnel         = singletons.tunnel;
            this.resourceStore  = singletons.resourceStore;
            this.dispatcher     = singletons.dispatcher;
            */

            this.attachBinders(config.binderMap);

            // wrap pause-able methods
            Y.Array.each(PAUSEABLE, function(mName) {
                var me = this,
                    originalMethod = me[mName];
                this[mName] = function() {
                    // during execution of these pauseable function, we'll check to see if the client is in a paused
                    // state
                    if (me._state === State.PAUSED) {
                        // now just queue the method call with original function and args for execution on resume()
                        me._pauseQueue.push({fn: originalMethod, args: arguments});
                    } else {
                        // not paused, so go ahead and apply the function
                        originalMethod.apply(me, arguments);
                    }
                };
            }, this);

            this._state = State.ACTIVE;
            fireLifecycle('post-init', {});
        },

        /**
         * Given a set of binder information, initialize binder instances and bind them to the page.
         * @private
         * @param binderMap <object> viewId ==> binder data, contains all we need from the mojit dispatch's meta object
         * about all the binders that were executed to create the DOM addition recently added to the document
         * @param parentId <String> [optional] the parent binder view id to attach any children
         * @param topLevelMojitViewId <String> [optional] the topmost (root) binder view id to attach as a child to the
         * parent
         */
        attachBinders: function(binderMap, parentId, topLevelMojitViewId) {
            var eventData = {
                    binderMap: binderMap,
                    parentId: parentId,
                    topLevelMojitViewId: topLevelMojitViewId
                };
            fireLifecycle('pre-attach-binders', eventData);
            binderMap           = eventData.binderMap;
            parentId            = eventData.parentId;
            topLevelMojitViewId = eventData.topLevelMojitViewId;
            Y.mojito.perf.mark('mojito', 'core_binders_start');

            var context = this.context,
                me = this,
                newMojitProxies = [],
                parent, topLevelMojitObj,
                totalBinders = Y.Object.size(binderMap),
                bindersComplete = 0,
                onBinderComplete,
                // Note: This here so we can get access view meta data for each binder
                store = this.resourceStore;

            if (!totalBinders) {
                Y.mojito.perf.mark('mojito', 'core_binders_end');
                fireLifecycle('post-attach-binders', {});
                return;
            }

            onBinderComplete = function() {

                // only run the function when all binders have completed
                bindersComplete++;
                if (bindersComplete < totalBinders) {
                    return;
                }

                // now that all binders have been initialized and accounted for...

                // first, we must create the MojitClient's state of the binders before binding, in case the binders'
                // bind() function tries to do anything that includes children
                Y.Array.each(newMojitProxies, function(item) {
                    var proxy = item.proxy,
                        children = item.children;
                    // 'me' here is the MojitoClient instance.
                    me._mojits[proxy._viewId] = {
                        proxy: proxy,
                        children: children
                    };
                });

                // now we'll loop through again and do the binding, saving the handles
                Y.Array.each(newMojitProxies, function(item) {
                    var mojit = me._mojits[item.proxy.getId()],
                        proxy = item.proxy;
                    mojit.handles = bindNode(proxy._binder, proxy._node, proxy._element);
                });

                // if there is a parent to add a child to (and a topmost child to add to the parent), add new
                // top level child to parent that dispatched it
                if (parentId && topLevelMojitViewId) {
                    parent = me._mojits[parentId];
                    topLevelMojitObj = binderMap[topLevelMojitViewId];
                    if (! parent.children) {
                        parent.children = {};
                    }
                    // this is just a shallow representation of the child, not the proxy object itself. but it is enough
                    // to look up the proxy when necessary.
                    parent.children[topLevelMojitViewId] = {
                        type: topLevelMojitObj.type,
                        viewId: topLevelMojitViewId
                    };
                }
                Y.mojito.perf.mark('mojito', 'core_binders_end');
                fireLifecycle('post-attach-binders', {});
            };

            // loop over the binder map, load, use, and instantiate them
            Y.Object.each(binderMap, function(binderData, viewId) {

                // Make sure viewIds's are not bound to more than once
                if (me._mojits[viewId]) {
                    return;
                }

                if (! binderData.name) {
                    Y.log('No binder for ' + binderData.type + '.' + binderData.action, 'info', NAME);
                    onBinderComplete();
                    return;
                }

                //Y.log('loading prereqs for binder ' + Y.Object.keys(binderData.needs), 'mojito', NAME);
                YUI._mojito.loader.load(binderData.needs, function(err) {

                    var config,
                        type = binderData.type,
                        base = binderData.base,
                        binderName = binderData.name,
                        instanceId = binderData.instanceId,
                        mojitProxy,
                        binderClass,
                        children,
                        binder,
                        mojitNode,
                        element;

                    if (err) {
                        Y.log('failed to load prerequisites for binder ' + binderName, 'error', NAME);
                        onBinderComplete();
                        return;
                    }

                    // "Y.mojito.binders" is blind to all new "binders" added to the page
                    // we have to "use()" any binder name we are given to have access to it.
                    Y.use(binderData.name, function(BY) {

                        config = Y.mojito.util.copy(binderData.config);

                        element = document.getElementById(viewId);

                        if (! element) {
                            Y.log('Did not find DOM node "'+viewId+'" for binder "'
                                + binderName + '"', 'warn', NAME);
                            onBinderComplete();
                            return;
                        }

                        mojitNode = new Y.Node(element);

                        // BY reference here is the 'use()' return value...the
                        // Binder class we need to access.
                        binderClass = BY.mojito.binders[binderName];

                        binder = Y.mojito.util.heir(binderClass);

                        Y.log('Created binder "' + binderName + '" for DOM node "' + viewId + '"', 'info', NAME);

                        if (binderData.children) {
                            children = processChildren(binderData.children, binderMap);
                        }

                        // One mojitProxy per binder. The mp is how client code
                        // gets to the binder...they don't hold refs to anything
                        // but the mp. (close enough).
                        mojitProxy = new Y.mojito.MojitProxy({
                            // private
                            action: binderData.action,
                            binder: binder,
                            base: base,
                            node: mojitNode,
                            element: element,
                            viewId: viewId,
                            instanceId: instanceId,
                            client: me,
                            store: store,
                            // public
                            type: type,
                            config: config,
                            context: context
                        });

                        newMojitProxies.push({proxy: mojitProxy, children: children});

                        if (Y.Lang.isFunction(binder.init)) {
                            binder.init(mojitProxy);
                        }

                        onBinderComplete();

                    });

                });

            }, this);

        },

        /**
         * Used for binders to execute their actions through the Mojito framework through their
         * proxies.
         * @method executeAction
         * @param {Object} command must contain mojit id and action to execute
         * @param {String} viewId the view id of the current mojit, which is executing the action
         * @param {Function} cb callback to run when complete
         * @private
         */
        executeAction: function(command, viewId, cb) {

            var self = this;

            // Sending a command to dispatcher that defines our action execution
            Y.log('Executing "'+(command.instance.base||'@'+command.instance.type)+'/'+command.instance.action+'" on the client.', 'mojito', NAME);

            self.resourceStore.expandInstanceForEnv('client', command.instance, self.context, function(err, details) {

                // if there is a controller in the client type details, that means the controller exists here
                // Per Matt, "cast details.controller to Boolean" ;)
                // TODO: clean up :)
                var existsOnClient = Boolean(details.controller);

                command.context = self.context;

                // if this controller does not exist here, or we have been instructed to force an
                // RPC call, we'll go to the server
                if (! existsOnClient || command.rpc){
                    // Make the call via a fixed RPC channel
                    self.tunnel.rpc(command, new Y.mojito.OutputHandler(viewId, cb, self));
                } else{
                    // Dispatch locally
                    self.dispatcher.dispatch(command, new Y.mojito.OutputHandler(viewId, cb, self));
                }

            });

        },

        doRender: function(mp, data, view, cb) {
            if (! mp._views || ! mp._assetsRoot) {
                this.resourceStore.getType('client', mp.type, mp.context, function(err, typeInfo) {
                    if (err) {
                        cb(new Error('Failed to load mojit information for ' + mp.type));
                        return;
                    }
                    mp._views = typeInfo.views;
                    mp._assetsRoot = typeInfo.assetsRoot;
                    privateRender(mp, data, view, cb);
                });
            }
            else {
                privateRender(mp, data, view, cb);
            }

        },

        doBroadcast: function(eventId, source, payload, opts){
            opts = opts || {};
            var tgtInstId, tgtViewId,
                child = opts.target ? this._mojits[source].children[opts.target.slot] : null;
            if (opts && opts.target) {
                if (opts.target.slot && child) {
                    tgtInstId = child.instanceId;
                    // find the target of the message
                    Y.Object.each(this._mojits, function(v, k) {
                        if (v.proxy._instanceId === tgtInstId) {
                            tgtViewId = k;
                        }
                    });
                    // if there was no target found, give an error and return
                    if (! tgtViewId) {
                        Y.log('No broadcast target found for ' + opts.target.slot + ':' + tgtInstId, 'warn', NAME);
                        return;
                    }
                } else if (opts.target.viewId) {
                    tgtViewId = opts.target.viewId;
                }
            }
            if (this._listeners[eventId]) {
                Y.Array.each(this._listeners[eventId], function(listener) {
                    if (! tgtViewId || tgtViewId === listener.viewId) {
                        listener.cb({
                            data: payload,
                            source: source
                        });
                    }
                });
            }
        },

        doListen: function(eventId, viewId, callback) {
            if (! this._listeners[eventId]) {
                this._listeners[eventId] = [];
            }
            this._listeners[eventId].push({
                guid:   viewId,     // DEPRECATED, use viewId instead
                viewId: viewId,
                cb:     callback
            });
        },

        doUnlisten: function(viewId, needleEvent) {
            var listeners = this._listeners,
                eventType;

            function processListenerArray(arr, id) {
                var i = 0;
                while (i < arr.length) {
                    if (arr[i].viewId === id) {
                        arr.splice(i, 1);
                        // no increment. i is now the "next" index
                    } else {
                        i++;
                    }
                }
                return arr;
            }

            // if there is only one event to unlisten, do it quickly
            if (needleEvent) {
                processListenerArray(listeners[needleEvent], viewId);
            }
            // but if we need to unlisten to all callbacks registered by this binder,
            // we must loop over the entire listener object
            else {
                for (eventType in listeners) {
                    if (listeners.hasOwnProperty(eventType)) {
                        processListenerArray(listeners[eventType], viewId);
                    }
                }
            }
        },

        destroyMojitProxy: function(id, retainNode) {
            var parent;
            if (this._mojits[id]) {
                // TODO: activate call to unbindNode below: 
                // unbindNode(this._mojits[id].proxy._binder,
                //      this._mojits[id].handles);
                this._mojits[id].proxy._destroy(retainNode);
                delete this._mojits[id];
                // We don't manage binder children automatically, but any time a new child is added
                // or removed, we should at least give the application code a chance to stay up to
                // date if they want to. The only gap is when a mojit destroys itself. onChildDestroyed
                // is called whenever a binder is destroyed so any parents can be notified.
                parent = findParentProxy(this._mojits, id);
                if (parent && parent._binder.onChildDestroyed && Y.Lang.isFunction(parent._binder.onChildDestroyed)) {
                    parent._binder.onChildDestroyed({ id: id });
                }
            }
        },

        /**
         * Pause the Mojito Client and all mojits that are running. This will notify all binders that they have been
         * paused by calling their onPause() functions. It will prevent the immediate execution of several mojit proxy
         * operations that might cause a long process to begin (especially things that might go to the server).
         *
         * To resume, simply call .resume(). This will immediately execute all actions that occurred while Mojito was
         * paused.
         *
         * @method pause
         */
        pause: function() {
            if (this._state === State.PAUSED) {
                Y.log('Cannot "pause" the mojito client because it has already been paused.', 'warn', NAME);
                return;
            }
            this._state = State.PAUSED;
            Y.Object.each(this._mojits, function(moj) {
                moj.proxy._pause();
            });
            Y.log('Mojito Client state: ' + this._state + '.', 'info', NAME);
        },

        /**
         * Resumes the Mojito client after it has been paused (see method "pause"). If there are any queued actions that
         * were executed and cached during the pause, calling resume() will immediately execute them. All binders are
         * notified through their onResume() function that they are been resumed.
         *
         * @resume
         */
        resume: function() {
            if (this._state !== State.PAUSED) {
                Y.log('Cannot "resume" the mojito client because it was never paused.', 'warn', NAME);
                return;
            }
            Y.Array.each(this._pauseQueue, function(queuedItem) {
                var fn = queuedItem.fn,
                    args = queuedItem.args;
                fn.apply(this, args);
            }, this);
            this._pauseQueue = [];
            this._state = State.ACTIVE;
            Y.Object.each(this._mojits, function(moj) {
                moj.proxy._resume();
            });
            Y.log('Mojito Client state: ' + this._state + '.', 'info', NAME);
        },

        refreshMojitView: function(mp, opts, cb) {
            var me = this;

            mp.invoke(mp._action, opts, function(err, data, meta) {

                if (err) {
                    throw new Error(err);
                }

                /*
                 * The new markup returned from the server has all new DOM ids within it, but
                 * we don't want to use them. Before doing any DOM stuff, we are going to replace
                 * all the new view ids with our current view ids for this mojit view as well
                 * as any children that have come along for the ride.
                 */

                var idReplacements = {}, // from: to
                    metaBinderViewId, mBinder, freshBinders = {},
                    clientMojitViewId, clientMojit,
                    processMojitChildrenForIdReplacements;

                /*
                 * Recursive function used to walk down the hierarchy of children in order to replace every view id within
                 * the meta data
                 */
                processMojitChildrenForIdReplacements = function(clientChildren, metaChildren, idRepls) {
                    var metaChild, childMojitProxy, metaSubChildren, slot;
                    if (! metaChildren || ! clientChildren) {
                        return;
                    }
                    for (slot in metaChildren) {
                        if (metaChildren.hasOwnProperty(slot)) {
                            metaChild = metaChildren[slot];
                            childMojitProxy = clientChildren[slot].proxy;
                            if (childMojitProxy) {
                                metaSubChildren = meta.binders[metaChild.viewId].config.children;
                                idRepls[metaChild.viewId] = childMojitProxy.getId();
                                if (metaSubChildren) {
                                    processMojitChildrenForIdReplacements(me.mojits[childMojitProxy.getId()].children, metaSubChildren, idRepls);
                                }
                            }
                        }
                    }
                };

                for (clientMojitViewId in me._mojits) {
                    if (me._mojits.hasOwnProperty(clientMojitViewId)) {
                        clientMojit = me._mojits[clientMojitViewId];
                        for (metaBinderViewId in meta.binders) {
                            if (meta.binders.hasOwnProperty(metaBinderViewId)) {
                                mBinder = meta.binders[metaBinderViewId];
                                if (mBinder.instanceId === clientMojit.proxy._instanceId) {
                                    Y.log('matched instanceId ' + mBinder.instanceId, 'debug', NAME);
                                    idReplacements[metaBinderViewId] = clientMojitViewId;
                                    processMojitChildrenForIdReplacements(me._mojits[clientMojit.proxy.getId()].children, mBinder.children, idReplacements);
                                }
                            }
                        }
                    }
                }

                Y.Object.each(idReplacements, function(to, from) {
                    var regex = new RegExp(from, 'g');
                    data = data.replace(regex, to);
                });

                setNewMojitView(data, mp);

                // Do a "light bind" for each child, keeping track of any
                // binders that need a "full bind". We'll bind those in the
                // attachBinders call below this loop.
                Y.Object.each(meta.children, function(child, slot) {

                    var childViewId = idReplacements[child.viewId],
                        childMojit = me._mojits[childViewId],
                        childProxy, childNode, childElement, childBinder;

                    // may not be a binder for this mojit child, so there would be no mojit proxy yet
                    if (!childMojit) {
                        // this must be a new binder instance that we need to instantiate
                        freshBinders[child.viewId] = meta.binders[child.viewId];
                        return;
                    }

                    childProxy = me._mojits[childViewId].proxy;
                    childNode = mp._node.one('#' + childViewId);
                    childElement = childNode._node;
                    childBinder = childProxy._binder;

                    // set new node and element into the mojit proxy object
                    childProxy._node = childNode;
                    childProxy._element = childElement;

                    if (Y.Lang.isFunction(childBinder.onRefreshView)) {
                        childBinder.onRefreshView(childNode, childElement);
                    } else if (Y.Lang.isFunction(childBinder.bind)) {
                        childBinder.bind(childNode, childElement);
                    }
                });

                // Do a "full bind" on the new binders we tracked in the loop
                // above. These need the full treatment.
                me.attachBinders(freshBinders);

                if (cb) {
                    cb(data, meta);
                }
            });
        }

    };

    // this is the heart of mojitProxy.render(), but it needs to be a separate function
    // called once we have mojit type details
    function privateRender(mp, data, view, cb) {
        var mojitView, renderer;

        if (!mp._views || !mp._views[view]) {
            cb(new Error('View "'+view+'" not found'));
            return;
        }

        data = data || {};
        // this is presumed to be useful enough that we'll set it up for them
        data.mojit_assets = data.mojit_assets || mp._assetsRoot;

        mojitView = mp._views[view];
        renderer = new Y.mojito.ViewRenderer(mojitView.engine);
        Y.log('Rendering "' + view + '" in Binder', 'debug', NAME);
        renderer.render(data, mp.type, mojitView['content-path'], {
            buffer: '',
            flush: function(data){
                this.buffer+=data;
            },
            done: function(data){
                this.buffer+=data;
                cb(null, this.buffer);
            }
        });
    }

    function setNewMojitView(viewData, mp) {

        Y.log('setting new view on mojit ' + mp._instanceId, 'debug', NAME);

        var newNode = Y.Node.create(viewData);

        mp._node.replace(newNode);

        mp._element = document.getElementById(mp._viewId);
        mp._node = new Y.Node(mp._element);

        if (Y.Lang.isFunction(mp._binder.onRefreshView)) {
            mp._binder.onRefreshView(mp._node, mp._element);
        }
    }

    // we have to match the children by instanceId to identify them and replace their viewId with the actual viewId for the
    // binder that should be attached to it
    function processChildren(children, binderMap) {
        var name, viewId, found;
        for (name in children) {
            if (children.hasOwnProperty(name)) {
                for (viewId in binderMap) {
                    if (binderMap.hasOwnProperty(viewId) && ! found) {
                        if (binderMap[viewId].instanceId === children[name].instanceId) {
                            children[name].viewId = viewId;
                            found = true;
                        }
                    }
                }
                found = false;
            }
        }
        return children;
    }

    function bindNode(binder, node, element) {
        var handles = [];
        if (Y.Lang.isFunction(binder.bind)) {
            // Pass the "node" to the bind method
            binder.bind(node, element);
        }
        // all automatic event delegation
        if (Y.Lang.isFunction(binder.handleClick)) {
            // This code should be deferred till after the page has visibly loaded
            handles.push(Y.delegate('click', binder.handleClick, node, function(){return true;}, binder));
        }
        // TODO: add all the event delegation majic here
        Y.log('Attached ' + handles.length + ' event delegates', 'debug', NAME);
        return handles;
    }

    // TODO: complete work to call this in the destroyMojitProxy function()
    function unbindNode(binder, handles) {
        var retainBinder = false;
        if (Y.Lang.isFunction(binder.unbind)) {
            // let the binder decide whether it wants to stick around in case its node is reattached at some
            // point in the future
            retainBinder = binder.unbind.call(binder);
        }
        if (handles) {
            Y.Array.each(handles, function(handle) {
                Y.log('Detaching event handle from binder', 'debug', NAME);
                handle.detach();
            });
        }
        return retainBinder;
    }

    function findParentProxy(mojits, childId) {
        var p;
        // TODO: convert to "some" instead of each for performance. We're doing a
        // "detect" here.
        Y.Object.each(mojits, function(mojit) {
            Y.Object.each(mojit.children, function(child) {
                if (child.viewId === childId) {
                    p = mojit.proxy;
                    return true;
                }
            });
            if (p) {
                return true;
            }
        });
        return p;
    }

    Y.mojito.Client = MojitoClient;
    
}, '0.1.0', {requires: [
    'io-base',
    'event-delegate',
    'node-base',
    'querystring-stringify-simple',
    'mojito',
    'mojito-logger',
    'mojito-loader',
    'mojito-dispatcher',
    'mojito-route-maker',
    'mojito-client-store',
    'mojito-resource-store-adapter',
    'mojito-mojit-proxy',
    'mojito-tunnel-client',
    'mojito-output-handler',
    'mojito-util'
]});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */


/*
 * This is not production code. It is here to assist with user Mojit testing.
 */


YUI.add('mojito-test', function(Y, NAME) {

    function EasyMock() {
        var mock = YUITest.Mock();
        mock.expect = function() {
            Y.Array.each(arguments, function(expectation) {
                YUITest.Mock.expect(mock, expectation);
            });
            return mock;
        };
        mock.verify = function() {
            YUITest.Mock.verify(mock);
        };
        return mock;
    }

    function createMockAddon(source, name) {
        source._addons.push(name);
        source[name] = new EasyMock();
    }

    function createMockModel(source, name) {
        source.models[name] = new EasyMock();
    }

    function createMockExtra(source, ns, name) {
        var mock = new EasyMock();
        if (! source[ns]) {
            source[ns] = {};
        }
        if (! source._extras[ns]) {
            source._extras[ns] = {};
        }
        source._extras[ns][name] = mock;
        source[ns][name] = mock;
    }

    function MockActionContext(opts) {
        var mock = YUITest.Mock();
        opts = opts || {};
        mock._addons = [];
        mock.models = {};
        mock._extras = {};

        if (opts.addons) {
            Y.Array.each(opts.addons, function(addon) {
                createMockAddon(mock, addon);
            });
        }
        if (opts.models) {
            Y.Array.each(opts.models, function(model) {
                createMockModel(mock, model);
            });
        }
        if (opts.extras) {
            Y.Object.each(opts.extras, function(extras, namespace) {
                if (Y.Lang.isArray(extras)) {
                    Y.Array.each(extras, function(extra) {
                        createMockExtra(mock, namespace, extra);
                    });
                } else {
                    createMockExtra(mock, namespace, extras);
                }
            });
        }

        mock.expect = function() {
            Y.Array.each(arguments, function(expectation) {
                YUITest.Mock.expect(mock, expectation);
            });
            return mock;
        };
        mock.verify = function() {
            var i, j, mockAddon;
            YUITest.Mock.verify(mock);
            for (i=0; i<mock._addons.length; i++) {
                mockAddon = mock[mock._addons[i]];
                mockAddon.verify();
            }
            for (i in mock.models) {
                if (mock.models.hasOwnProperty(i)) {
                    mock.models[i].verify();
                }
            }
            for (i in mock._extras) {
                if (mock._extras.hasOwnProperty(i)) {
                    for (j in mock._extras[i]) {
                        if (mock._extras[i].hasOwnProperty(j)) {
                            mock._extras[i][j].verify();
                        }
                    }
                }
            }
        };
        return mock;
    }

    Y.mojito.MockActionContext = MockActionContext;
    Y.mojito.EasyMock = EasyMock;
    
}, '0.1.0', {requires: ['mojito']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito', function(Y, NAME) {

    Y.namespace('mojito');
    Y.mojito.version = '0.2';
    Y.namespace('mojito.trans');
    Y.namespace('mojito.actions');
    Y.namespace('mojito.binders');
    Y.namespace('mojito.controllers');
    Y.namespace('mojito.models');
    Y.namespace('mojito.addons');
    Y.namespace('mojito.addons.ac');
    Y.namespace('mojito.addons.viewEngines');

}, '0.1.0', {requires: ['mojito-perf']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-output-handler', function(Y, NAME) {

    var attachAssets, complete,
        loaded = {js: {}, css: {}};

    /*
     * This is an object used as the single pathway for data to leave a mojit
     * action execution. It is used as a component of the ActionContext object,
     * which uses it to call <em>done</em> and <em>flush</em> in order to complete.
     *
     * There are two versions of this object, one for the client, and one for the
     * server. This is the client version, which is much simpler than the server
     * version.
     *
     * @class OutputHandler
     * @constructor
     * @param {String} viewId The view id of the current mojit binder responsible for this action execution
     * @param {Function} cb
     * @param {Object} mojitoClient
     */
    function OutputHandler(viewId, cb, mojitoClient) {
        this.viewId = viewId;
        this.callback = cb;
        this.buffer = '';
        this.mojitoClient = mojitoClient;
    }

    OutputHandler.prototype = {

        /*
         * @method flush
         * @param data
         * @param meta
         */
        flush: function(data, meta) {
            this.done(data, meta);
        },

        /*
         * @method done
         * @param data
         * @param meta
         */
        done: function(data, meta) {
            var client = this.mojitoClient,
                viewId = this.viewId,
                callback = this.callback;
            // Add meta to the page before going on
            if (meta && meta.assets) {
                attachAssets(meta.assets, function() {
                    complete(data, meta, client, viewId, callback);
                });
            } else {
                complete(data, meta, client, viewId, callback);
            }

        },
        
        error: function(err) {
            this.callback(err);
        }

    };

    // Attach assets found in the "assets" to the page
    attachAssets = function(assets, cb){
        var toLoad = {
                css: [],
                js: []
            },
            done = {},
            blobNode = '',
            doneChecker;

        Y.Object.each(assets, function(types, location) {
            Y.Object.each(types, function(list, type) {
                var i;
                if(type === 'blob') {
                    for(i=0; i<list.length; i++){
                        blobNode += list[i];
                    }
                } else {
                    for (i=0; i<list.length; i++) {
                        if (! loaded[type][list[i]]) {
                            toLoad[type].push(list[i]);
                        }
                        loaded[type][list[i]] = true;
                    }
                }
            });
        });

        if (blobNode) {
            Y.one('head').append(blobNode);
        }

        doneChecker = function(type) {
            //Y.log('doneChecker('+type+') -- css? ' + done.css + ' -- js? ' + done.js, 'debug', NAME);
            if (type) {
                done[type] = true;
            }
            if (done.css && done.js) {
                cb();
            }
        };

        if (toLoad.css.length > 0) {
            // TODO 2011-07-21: better error detection/handling
            Y.Get.css(toLoad.css, {
                onEnd: function() {
                    doneChecker('css');
                }
            });
        }
        else {
            done.css = true;
        }
        if (toLoad.js.length > 0) {
            // TODO 2011-07-21: better error detection/handling
            Y.Get.script(toLoad.js, {
                onEnd: function() {
                    doneChecker('js');
                }
            });
        }
        else {
            done.js = true;
        }
        // in case we have neither (or either Y.Get calls return really fast)
        doneChecker();
    };

    /*
    * Handles final processing for done().
    * @param {string} data The data to pass to the callback. Usually markup or
    *     JSON.
    * @param {Object} meta The meta object from the dispatch() call.
    * @param {MojitoClient} client The client instance.
    * @param {string} viewId An optional view ID for the mojit.
    * @param {Function} callback The callback function to invoke.
    */
    complete = function(data, meta, client, viewId, callback) {
        // If we get some JSON decode it
        if(meta.http.headers['content-type']
                && meta.http.headers['content-type'][0].indexOf('application/json') === 0){
            data = Y.JSON.parse(data);
        }

        callback(null, data, meta);

        if(meta && meta.binders) {
            // DOM needs to render and return to main event loop before
            // attaching.
            setTimeout(function() {
                client.attachBinders(meta.binders, viewId, meta.view.id);
            });
        }
    };

    Y.mojito.OutputHandler = OutputHandler;

}, '0.1.0', {requires: ['mojito', 'json']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-perf', function(Y, NAME) {

    if(!YUI._mojito){
        YUI._mojito = {};
    }

    if(!YUI._mojito._perf){
        YUI._mojito._perf = {};
        YUI._mojito._perf.mojito = {};
        YUI._mojito._perf.mojito.core = {};
        YUI._mojito._perf.mojito.core.msg = 'Framework start time';
        YUI._mojito._perf.mojito.core.time = typeof MOJITO_INIT !== 'undefined' ? MOJITO_INIT : new Date().getTime();
    }

    var store = YUI._mojito._perf,
        perfEnabled = false;

    function print(group, label){
        // Logging has a big impact on performance :)
        Y.log(group+':'+label+' '+(store[group][label].time - store.mojito.core.time)+'ms', 'mojito', NAME);
    }

    Y.namespace('mojito').perf = {

        mark: function(group, label, msg){

            if(!perfEnabled){ // Global prod flag
                return;
            }

            if(!group || !label){
                return;
            }

            if(!store[group]){
                store[group] = {};
            }

            if(!msg){
                msg = '';
            }

            store[group][label] = {};
            store[group][label].msg = msg;
            store[group][label].time = new Date().getTime();

            print(group, label);
        },

        dump: function(){

            var group, label;

            //MOJITO_INIT;

            for(group in store){
                if(store.hasOwnProperty(group)){
                    for(label in store[group]){
                        if(store[group].hasOwnProperty(label)){
                            print(group, label);
                        }
                    }
                }
            }
        }
    };

});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */
/**
 * This object is responsible for running mojits.
 * @class MojitoDispatcher
 * @constructor
 * @param resourceStore {ServerStore} the store to use
 * @private
 */
YUI.add('mojito-resource-store-adapter', function(Y, NAME){

    var APP_ROOT_PATH = '',
        logger;

    Y.mojito.ResourceStoreAdapter = {

        ENV: '',

        init: function(env, resourceStore, globalLogger){

            // must be passed the Mojito logger and use it for consistent logging because the Y.log
            // within this scope has not been mutated yet
            logger = globalLogger;

            logger.log('resource store adapter init', 'mojito', NAME);
            
            APP_ROOT_PATH = resourceStore._root;

            this.ENV = env;
            this.store = resourceStore;

            this._root = resourceStore._root;
            this._staticURLs = resourceStore._staticURLs;

            return this;
        },

        expandInstance: function(instance, ctx, cb) {
            //logger.log('expandInstance', 'mojito', NAME);
            return this.expandInstanceForEnv(this.ENV, instance, ctx, cb);
        },

        expandInstanceForEnv: function(env, instance, context, callback){

            var base = {}, source = {}, self = this;

            /* this doesn't do anything yet */
//            // If we have this cached return it
//            if(this.isCached(env, instance, context)){
//                callback(this.getCached(env, instance, context));
//                return;
//            }

            if (!instance.instanceId) {
                instance.instanceId = Y.guid();
                //DEBUGGING:  instance.instanceId += '-instance-common-' + [instance.base||'', instance.type||''].join('-');
            }
            instance.guid = instance.instanceId;    // DEPRECATED, but kept in case a user is using


            // What are being asked to expand?
            if(instance.base){
                source.name = instance.base;
                source.func = this.getSpec;
            }
            else if(instance.type){
                source.name = instance.type;
                source.func = this.getType;
            }
            else{
                // We don't have any inputs so fail
                throw new Error('There was no info in the "instance" object');
            }

            // This contains the app "definition" and app config
            self.getApp(env, context, function(app){

                // Here we get either the a spec or a type
                source.func(env, source.name, context, function(err, data){
                    if (err) {
                        callback(err);
                        return;
                    }

                    // Merge the inputs from right to left (right most values win)
                    base = self.merge(app, data, instance);

                    // Ensure the "instance" has been properly resolved. If there are no specs in the application.json file,
                    // there is an error below because the instance is invalid. We should check here for a valid instance object
                    // and throw an error if it is not. This happens because someone could create a routes.json file with routes
                    // that don't route to mojit instances, and the URI router creates invalid commands, which are passed into
                    // the dispatch. -- Matt
                    if(!self.validate(base)){
                        callback({
                            message: 'Instance was not valid.',
                            stack: JSON.stringify(base,null,4)
                        });
                        return;
                    }

                    // Add the final "base" to the cache
                    self.cache(env, instance, context, base);

                    callback(null, base);
                }, self);
            });
        },

        getApp: function(env, context, callback){

            var obj = {};

            callback(obj);
        },

        getAppPath: function(){
            return APP_ROOT_PATH;
        },

        getAppConfig: function(context, name){
            return this.store.getAppConfig(context, name);
        },

        getSpec: function(env, id, context, callback, scope){

            if(!scope){
                scope = this;
            }

            scope.store.getSpec(env, id, context, callback);
        },

        getType: function(env, type, context, callback, scope){

            if(!scope){
                scope = this;
            }

            scope.store.getType(env, type, context, callback);
        },

        merge: function(){

            var obj = {}, i;

            for(i=0; i<arguments.length; i++){
                obj = Y.mojito.util.mergeRecursive(obj, arguments[i]);
            }

            return obj;
        },

        validate: function(base){

            if(!base.type || !base.yui){
                return false;
            }
            return true;
        },

        isCached: function(env, instance, context){
            return false;
        },

        getCached: function(env, instance, context){
            return {};
        },

        cache: function(env, instance, context, obj){
            return false;
        },

        getYuiConfigAllMojits: function(env, ctx){
            //logger.log('getYuiConfigAllMojits', 'warn', NAME);
            return this.store.getYuiConfigAllMojits(env, ctx);
        },

        getYuiConfigApp: function(env, ctx){
            //logger.log('getYuiConfigApp', 'warn', NAME);
            return this.store.getYuiConfigApp(env, ctx);
        },

        getYuiConfigFw: function(env, ctx){
            //logger.log('getYuiConfigFw', 'warn', NAME);
            return this.store.getYuiConfigFw(env, ctx);
        },

        serializeClientStore: function(ctx, instances){
            //logger.log('serializeClientStore', 'warn', NAME);
            return this.store.serializeClientStore(ctx, instances);
        },

        getMojitTypeDetails: function(env, ctx, mojitType, dest){
            //logger.log('getMojitTypeDetails', 'warn', NAME);
            return this.store.getMojitTypeDetails(env, ctx, mojitType, dest);
        },

        fileFromStaticHandlerURL: function(url){
            //logger.log('fileFromStaticHandlerURL', 'warn', NAME);
            return this.store.fileFromStaticHandlerURL(url);
        },

        getRoutes: function(ctx) {
            //logger.log('getRoutes', 'warn', NAME);
            return this.store.getRoutes(ctx);
        }
    };

}, '0.1.0', {requires:['mojito-util']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
/**
 * Common Library
 * @module CommonLibs
 */
/**
 * @submodule CommonLibs
 */
YUI.add('mojito-rest-lib', function(Y, NAME) {

    Y.namespace('mojito.lib');

    /**
     * The Rest module for Mojito provides an easy way to make RESTful calls to URLs
     * without messing about with Y.io.
     * @class REST
     * @namespace Y.mojito.lib
     * @static
     */
    Y.mojito.lib.REST = {

        /**
         * @private
         */
        _doRequest: function(method, url, params, config, callback) {
            // TODO: [bug 4416153] Figure out why 'params' values are attaching themselves to headers!
            var ioConfig = {
                method: method,
                data: params,
                on: {}
            };
            if (config) {
                ioConfig.headers = config.headers;
                ioConfig.timeout = config.timeout;
            }
            if (callback) {
                ioConfig.on.success = function(txid, resp) {
                    var responseObj = new ResponseObject(resp);
                    callback(null, responseObj);
                };
                ioConfig.on.failure = function(txid, resp) {
                    callback(resp);
                };
            }

            Y.io(url, ioConfig);
        },

        /**
         * Makes a RESTful GET request to specified URL
         * @method GET
         * @param {String} url RESTful URL to hit
         * @param {Object} params parameters to add to the request
         * @param {Object} config may contain 'headers' or 'timeout' values
         * @param {Function} callback called with response or error
         */
        GET: function() {
            var args = ['GET'].concat(Array.prototype.slice.call(arguments));
            this._doRequest.apply(this, args);
        },

        /**
         * Makes a RESTful POST request to specified URL
         * @method POST
         * @param {String} url RESTful URL to hit
         * @param {Object} params parameters to add to the request
         * @param {Object} config may contain 'headers' or 'timeout' values
         * @param {Function} callback called with response or error
         */
        POST: function() {
            var args = ['POST'].concat(Array.prototype.slice.call(arguments));
            this._doRequest.apply(this, args);
        },

        /**
         * Makes a RESTful PUT request to specified URL
         * @method PUT
         * @param {String} url RESTful URL to hit
         * @param {Object} params parameters to add to the request
         * @param {Object} config may contain 'headers' or 'timeout' values
         * @param {Function} callback called with response or error
         */
        PUT: function() {
            var args = ['PUT'].concat(Array.prototype.slice.call(arguments));
            this._doRequest.apply(this, args);
        },

        /**
         * Makes a RESTful DELETE request to specified URL
         * @method DELETE
         * @param {String} url RESTful URL to hit
         * @param {Object} params parameters to add to the request
         * @param {Object} config may contain 'headers' or 'timeout' values
         * @param {Function} callback called with response or error
         */
        DELETE: function() {
            var args = ['DELETE'].concat(Array.prototype.slice.call(arguments));
            this._doRequest.apply(this, args);
        },

        /**
         * Makes a RESTful HEAD request to specified URL
         * @method HEAD
         * @param {String} url RESTful URL to hit
         * @param {Object} params parameters to add to the request
         * @param {Object} config may contain 'headers' or 'timeout' values
         * @param {Function} callback called with response or error
         */
        HEAD: function() {
            var args = ['HEAD'].concat(Array.prototype.slice.call(arguments));
            this._doRequest.apply(this, args);
        }

    };

    /**
     * @private
     */
    function ResponseObject(resp) {
        this._resp = resp;
    }
    ResponseObject.prototype = {
        getStatusCode: function() {
            return this._resp.status;
        },
        getStatusMessage: function() {
            return this._resp.statusText;
        },
        getHeader: function() {
            return this._resp.getResponseHeader.apply(this._resp, arguments);
        },
        getHeaders: function() {
            return this._resp.getAllResponseHeaders();
        },
        getBody: function() {
            return this._resp.responseText;
        }
    };

}, '0.1.0', {requires: ['io', 'mojito']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-route-maker', function(Y, NAME) {

    /*
     * The route maker for reverse URL lookup
     * @class RouteMaker
     * @namespace Y.mojito
     * @param {Object} routes key value store of all routes in the system
     */
    function Maker(routes) {
        var name;
        this._routes = {};
        // TODO 2011-06-20: [bug 4647729] Cache these computed routes so we don't have to do this on each request
        for (name in routes) {
            if (routes.hasOwnProperty(name)) {
                this._routes[name] = buildRoute(name, routes[name]);
            }
        }
    }
    
    Maker.prototype = {

        /*
         * generates a URL from a route query
         * @method make
         * @param {String} query string to convert to a URL
         * @param {String} verb http method
         */
        make: function(query, verb) {
//            Y.log('make(' + query + ', ' + verb + ')', 'debug', NAME);
            verb = verb || 'GET';

            var parts = query.split('?');
            var call = parts[0];
            var params = {};
            if (parts[1]) {
                 params = Y.QueryString.parse(parts[1]);
            }
            var route = this._matchToExternal(call, params, verb, this._routes);

            if (!route) {
                throw new Error("No route match found for '" + query + "' (" + verb + ")");
            }

            var uri = route.path;

            Y.Object.each(route.query, function(v, k) {
                uri = uri.replace(':' + k, v);
                delete params[k];
            });

            if (! Y.Object.isEmpty(params)) {
                uri += '?' + Y.QueryString.stringify(params);
            }

            return uri;
        },
        
        /**
         * Finds a route for a given method+URL
         *
         * @method find
         * @param url {string} the URL to find a route for
         * @param verb {string} the HTTP method
         **/
        find: function(uri, verb) {
    //        logger.log('[UriRouter] find( ' + uri + ', ' + verb + ' )');

            verb = verb || 'GET';

            var route = this._matchToInternal(uri, verb, this._routes);
            if (!route) {
                return null;
            }

    //        logger.log('[UriRouter] found route: ' + JSON.stringify(route));

            var match = copy(route);

            // Add the extracted URI params to the query obj
            var ret = new RegExp(route.ext_match).exec(uri),
                i = 1,
                id;

            for (id in match.query) {
                if (match.query.hasOwnProperty(id)) {
                    match.query[id] = ret[i];
                    i++;
                }
            }

            // Add the fixed params to a query obj if they are not there
            for (i in match.params) {
                if (match.params.hasOwnProperty(i) && !match.query[i]) {
                    match.query[i] = match.params[i];
                }
            }

    //        logger.log('[UriRouter] returning route: ' + JSON.stringify(match));
            return match;
        },

        /**
         * For optimization. Call this to get the computed routes that can be
         * passed to the constructor to avoid recomputing the routes.
         * @return {object} computed routes
         */
        getComputedRoutes: function() {
            return this._routes;
        },
        
        /**
         * Returns a matching route for the given URI
         *
         * @param string uri
         * @param string verb
         * @private
         **/
        // TODO RIC 2011-06-20: Change function name
        _matchToInternal: function(uri, verb, routes) {
            var name;
            if (!verb) {
                verb = 'GET';
            }

            verb = verb.toUpperCase();
    //        logger.log('[UriRouter] Start Matching ...');
            for (name in routes) {
                if (routes.hasOwnProperty(name)) {
    //                logger.log('[UriRouter] testing ' + name);
                    // TODO 2011-06-20: [bug 4647732] See comment elsewhere about regexes being created... we need to stash these objects
                    // somewhere instead of creating them on every request
                    if (new RegExp(routes[name].ext_match).test(uri)
                        && routes[name].verbs
                        && routes[name].verbs.hasOwnProperty(verb)) {

                        // TODO MATT 2011-06-20: [bug 4647732] Prevent more Regex creations for the love of god
                        return doCallReplacement(routes[name], uri);
                    }
    //                logger.log('[UriRouter] ' + verb +' '+ uri +' '+ routes[name].ext_match);
                }
            }

            return false;
        },

        /*
         * @private
         **/
        _matchToExternal: function(call, params, verb, routes) {
            var match, callParts = call.split('.'),
                callId = callParts[0], callAction = callParts[1];

            Y.Object.some(routes, function(route) {
                var routeCall, routeId, routeAction,
                    wildId, wildAction;

                // it might be an exact match
                if (call === route.call && route.verbs[verb]) {
                    match = resolveParams(route, params);
                    if (match) {
                        return true;
                    }
                }

                // if we have a wild card try a match
                if ('*.*' === route.call && route.verbs[verb]) {
                    params.module = callId;
                    params.action = callAction;
                    match = resolveParams(route, params);
                    if (match) {
                        return true;
                    }
                }

                routeCall = route.call.split('.');
                routeId = routeCall[0];
                routeAction = routeCall[1];

                wildId = wild(routeId);
                if (wildId) {
                    params[wildId] = callId;
                }
                wildAction = wild(routeAction);
                if (wildAction) {
                    params[wildAction] = callAction;
                }

                // if action is wild, or action matches
                if ((wildAction || ( callAction === routeAction))
                    // if id is wild, or id matches
                    && ((wildId || ( callId === routeId)))
                    // and if the verb is correct
                    && route.verbs[verb]) {

                    // then we can try a param match
                    match = resolveParams(route, params);
                    if (match) {
                        return true;
                    }

                }


            });

            return match;
        }

    };

    function wild(it) {
        // if {it}, then it is a wildcard
        if (it.indexOf('{') === 0) {
            // so return the tru value without the {}
            return it.substring(1, it.length - 1);
        }
    }

    function resolveParams(route, params) {
//        console.log('============= resolving params for route ' + route.name);
//        console.log(params);
//        console.log('requires: ' + JSON.stringify(route.requires));
        var tester = [];

        // we don't need to do anything if this route requires no params
        if (Y.Object.size(route.requires) === 0) {
            return route;
        }

        Y.Object.each(params, function(pval, pname) {
            if (route.requires && route.requires[pname]) {
                tester.push(pname + '=' + pval);
            }
        });

        if (tester.length) {
            tester.sort();
            if (new RegExp(route.int_match).test(tester.join('&'))) {
                Y.Object.each(params, function(pval, pname) {
                    route.query[pname] = pval;
                });
                return route;
            }
        }
    }

    function buildRoute(name, route)
    {
        var i;
        if (!route.name) { route.name = name; }
        if (!route.verbs) { route.verbs = ['GET']; }

        // Checking route.verbs is changed from an array to an object by the
        // building process, so routes that have already been computed are
        // not recomputed.

        if (route.verbs.length && route.path && route.call) {
            // FUTURE: [bug 4647735] allow object params, not just string
            if (!route.params) { route.params = ''; }
            if (!route.regex) { route.regex = {}; }
            if (!route.query) { route.query = {}; }

            /*
             * Here we convert the verb array to a map for easy use later on
             **/
            var verbObj = {};
            for (i in route.verbs)
            {
                if (route.verbs.hasOwnProperty(i))
                {
                    verbObj[route.verbs[i].toUpperCase()] = true;
                }
            }
            route.verbs = verbObj;

            var path = route.path.split('/'),
                segment,
                key;

            /*
             * Here we build the matching regex for external URI's
             */
            for (segment in path)
            {
                if (path.hasOwnProperty(segment))
                {
                    if (path[segment][0] === ':')
                    {
                        key = path[segment].substr(1);

                        route.query[key] = '';

                        path[segment] = route.regex[key] ? '(' + route.regex[key] + ')': '([^\/]+)';
                    }

                    if (path[segment][0] === '*')
                    {
                        path[segment] = '(.*)';
                    }
                }
            }

            /*
             * Here we build the matching regex for internal URI's
             */
            route.requires = {};
            var matches = route.path.match(/:([^\/]+)/g);
            for (i in matches)
            {
                if (matches.hasOwnProperty(i))
                {
                    route.requires[matches[i].substr(1)] = '[^&]+';
                }
            }
            for (i in route.regex)
            {
                if (route.regex.hasOwnProperty(i)) {
                    route.requires[i] = route.regex[i];
                }
            }

            route.params = Y.QueryString.parse(route.params);

            var build = [];
            for (i in route.requires)
            {
                if (route.requires.hasOwnProperty(i))
                {
                    build.push(i + '=' + route.requires[i]);
                }
            }
            build.sort();

            /*
             * We are done so lets store the regex's for the route.
             */
            // TODO 2011-06-20: [bug 4647732] These Regexes are recreated on every request because they need to be
            // serialized and sent to the client, need to figure out a way to prevent that
            route.ext_match = '^' + path.join('\/') + '$';
            route.int_match = '^' + build.join('&') + '$';
        }

        return route;
    }
    
    var doCallReplacement = function(route, uri) {
        var uriParts = uri.substr(1).split('\/'),
            pathParts = route.path.substr(1).split('\/'),
            template = {},
            cnt = 0;

        pathParts.forEach(function(pathPart) {
            var key, val, regex;
            // process only those keyed by ':'
            if (pathPart.indexOf(':') === 0) {
                key = pathPart.substr(1);
                val = uriParts[cnt];
                template[key] = val;
                regex = new RegExp("{" + key + "}", 'g');
                if (regex.test(route.call)) {
                    route.call = route.call.replace(regex, template[key]);
                } else {
                    route.params[key] = val;
                }
            }
            cnt++;
        });
        return route;
    };
    
    var copy = function(obj) {
        var temp = null, key = '';
        if (!obj || typeof(obj) !== 'object') { return obj; }
        temp = new obj.constructor();
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                temp[key] = copy(obj[key]);
            }
        }
        return temp;
    };
    
    Y.mojito.RouteMaker = Maker;
    
}, '0.1.0', {requires: ['querystring-stringify-simple', 'querystring-parse', 'mojito-util']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-client-store', function(Y, NAME) {

    var CACHE,
        QUEUED = {},
        queue,
        flushQueue,
        retrieveFile,
        isCompiled,
        trimSlash;

    // TODO 2011-06-16:  use YUI.namespace()?  use generic caching instead?
    if(!YUI._mojito){
        YUI._mojito = {};
    }

    if(!YUI._mojito._cache){
        YUI._mojito._cache = {};
    }

    if(!YUI._mojito._cache.store){
        YUI._mojito._cache.store = {};
    }

    CACHE = YUI._mojito._cache.store;

    function ClientStore(config) {
        this.appConfig = config.appConfig;
        this.routes = config.routes;

        // This value could be an empty string so we have to do a real check
        this.staticPrefix = '/static';
        if (this.appConfig && this.appConfig.staticHandling && this.appConfig.staticHandling.hasOwnProperty('prefix')) {
            this.staticPrefix = (this.appConfig.staticHandling.prefix ? '/' + this.appConfig.staticHandling.prefix : '');
        }

        // Now we do some bad shit for iOS
        if(typeof window !== 'undefined'){
            this.staticPrefix = Y.mojito.util.iOSUrl(this.staticPrefix) + '/';
        }

        this.staticPrefix = trimSlash(this.staticPrefix);
    }

    ClientStore.prototype = {

        /*
         * TODO REVIEW [bug 4647265]
         */
        getSpec: function(env, id, context, callback){

            var parts = id.split(':'),
                typeName = parts[0],
                specName = parts[1] || 'default',
                ns = typeName.replace(/\./g, '_'),
                url;

            // This should really have the tunnelPrefix.  However, that
            // complicates offline apps (from `mojito build html5app`).
            // The mojito-handler-tunnel will be able to handle this URL
            // just fine.
            url = this.staticPrefix + '/' + typeName + '/specs/' + specName + '.json';
            url += '?' + Y.QueryString.stringify(context);

            // use the compiled version if there was one built
            if (isCompiled(ns, specName)) {
                CACHE[url] = YUI._mojito._cache.compiled[ns].specs[specName];
                callback(null, CACHE[url]);
                return;
            }

            retrieveFile(url, callback);
        },

        /*
         * TODO REVIEW [bug 4647330]
         */
        getType: function(env, type, context, callback){

            // This should really have the tunnelPrefix.  However, that
            // complicates offline apps (from `mojito build html5app`).
            // The mojito-handler-tunnel will be able to handle this URL
            // just fine.
            var url = this.staticPrefix + '/' + type + '/definition.json';
            url += '?' + Y.QueryString.stringify(context);

            retrieveFile(url, callback);
        },

        /*
         * TODO: [bug 4649703]
         */
        getAppConfig: function(context, name){
            return this.appConfig;
        },

        /*
         * TODO: [bug 4649703]
         */
        getRoutes: function(){
            return this.routes;
        }
    };

    queue = function(url, cb) {
        if (! QUEUED[url]) {
            QUEUED[url] = [];
        }
        QUEUED[url].push(cb);
    };

    flushQueue = function(url, err, data) {
        var i,
            q;
        if (QUEUED[url]) {
            // Copy cb array out into local var to prevent further flushes from
            // looping over it again.  (User-provided callbacks can take a long
            // time to run, and while they are more callbacks can get queued.)
            q = QUEUED[url].splice(0, QUEUED[url].length);
            delete QUEUED[url];
            for (i=0; i<q.length; i++) {
                q[i](err, data);
            }
        }
    };

    retrieveFile = function(url, callback) {
        // iOS has a bug that returns "failure" on "success".
        var onComplete = function(id, obj){
            CACHE[url] = {};
            try{
                CACHE[url] = JSON.parse(obj.responseText);
            } catch(err) {
                flushQueue(url, err);
                return;
            }
            flushQueue(url, null, CACHE[url]);
        };

        // use the cache first
        if(CACHE[url]){
            callback(null, CACHE[url]);
            return;
        }

        if (! QUEUED[url]) {
            Y.io(url, {
                headers: {
                    'x-mojito-header': 'tunnel'
                },
                on: {
                    complete: onComplete
                }
            });
        }
        queue(url, callback);
    };

    isCompiled = function(ns, specName) {
        return YUI._mojito._cache.compiled &&
               YUI._mojito._cache.compiled[ns] &&
               YUI._mojito._cache.compiled[ns].specs &&
               YUI._mojito._cache.compiled[ns].specs[specName];
    };

    trimSlash = function(str) {
        if ('/' === str.charAt(str.length - 1)) {
            return str.substring(0, str.length - 1);
        }
        return str;
    };

    Y.mojito.ResourceStore = ClientStore;

}, '0.1.0', {requires: ['mojito-util', 'querystring-stringify-simple']});
YUI.add('dali-bean', function(Y) {
	
	function DaliBean(obj) {

		DaliBean.superclass.constructor.call(this, {
			bubbles: true,
			emitFacade: true
		});
		
		Y.mix(this, obj);
		
		// make sure all events are published so parents that add themselves as targets
		// get called with the firing of the event. This prevents users of this class
		// having to manually call publish for each event they want to fire
		Y.Do.before(function() {
			this.publish(arguments[0].type || arguments[0]);
		}, this, "fire");
	}
	
	Y.extend(DaliBean, Y.EventTarget);
	
	Y.namespace('Dali');
	Y.Dali.Bean = DaliBean;
	
}, '1.6.3', {requires:['breg', 'oop', 'event-custom']});
YUI.add('bean-performance-watcher', function(Y) {

	var NAME = 'Bean Performance Monitor',
		b = Y.Dali.beanRegistry,
		BEAN_REGISTRY_STARTED 		= 'rstart',
        REGISTRATION_COMPLETE 		= 'rdone',
        REINITIALIZING_BEAN 		= 'reinits',
        REINITIALIZED_BEAN 			= 'reinitd',
		INITIALIZATION_COMPLETE 	= 'initd',
		INJECTION_COMPLETE 			= 'injd',
		t = {};

	var PerformanceMonitor = function() {
		
		function watcher(e) {
			var key = e.type.split(':')[1];
			var stamp = new Date().getTime();
			if (key === REINITIALIZING_BEAN) {
				t[key] = {};
				t[key][e.bean] = stamp;
			} else {
				t[key] = stamp;
			}
			if (key === REINITIALIZED_BEAN) {
				delete t[REINITIALIZING_BEAN][e.bean];
			}
		}
		
		function countObjectProperties(o) {
			var count = 0, k;
			for (k in o) {
				if (o.hasOwnProperty(k)) {
					count++;
				}
			} 
			return count;
		}
		
		function report() {
			var total = t[INJECTION_COMPLETE] - t[BEAN_REGISTRY_STARTED],
				registration = t[REGISTRATION_COMPLETE] - t[BEAN_REGISTRY_STARTED],
				initialization = t[INITIALIZATION_COMPLETE] - t[REGISTRATION_COMPLETE],
				injection = t[INJECTION_COMPLETE] - t[INITIALIZATION_COMPLETE];
			// Y.log('Registration time: ' + registration + ' ms', 'info', NAME);
			// Y.log('Initialization time: ' + initialization + ' ms', 'info', NAME);
			// Y.log('Injection time: ' + injection + ' ms (' + (injection / b._getNumberOfInjections()) + ' per injection for ' + b._getNumberOfInjections() + ' injections)', 'info', NAME);
			// Y.log('== > Total bean startup time: ' + total + ' ms', 'info', '***' + NAME + '***');
			t.total = total;
			var numBeans = countObjectProperties(b.getBeans());
			// Y.log((total / numBeans) + 'ms per bean for ' + numBeans + ' beans', 'info', NAME);
		}
		
		watcher({
			type: 'blah:' + BEAN_REGISTRY_STARTED
		});
		
		b.on(REGISTRATION_COMPLETE, watcher);
		b.on(INITIALIZATION_COMPLETE, watcher);
		b.on(INJECTION_COMPLETE, watcher);
		b.on(REINITIALIZING_BEAN, watcher);
		b.on(REINITIALIZED_BEAN, watcher);
		b.on(INJECTION_COMPLETE, report);
		
		return {
			getTime: function(name) {
				return t[name];
			},
			destroy: function() {
				b.detach();
			}
		};
	};
	PerformanceMonitor.NAME = NAME;
	
	Y.namespace('Dali.beans');
	Y.Dali.beans.PerformanceMonitor = PerformanceMonitor;
			
}, '1.6.3', {requires:['breg']});/*
 * The breg module is a place to register beans that will be injected by the 
 * BeanInitilizer module. It provides static access to methods that register beans by 
 * name, get beans, or get the name of a bean instance.
 * @module breg
 * @private
 */
YUI.add("breg", function(Y){

    var NAME = 'beanRegistry',
		BEAN_REGISTRY_STARTED 		= 'rstart',
        REGISTRATION_COMPLETE 		= 'rdone',
        REINITIALIZING_BEAN 		= 'reinits',
        REINITIALIZED_BEAN 			= 'reinitd',
		INITIALIZATION_COMPLETE 	= 'initd',
		INJECTION_COMPLETE 			= 'injd',
		
		isFunction = Y.Lang.isFunction,
		
		_bInstantiated = false,
		_initialInjectionComplete = false,
		_c = {},
        _b = {},
		_ni = 0;
		
	var DaliBeanRegistry = function() {
		DaliBeanRegistry.superclass.constructor.apply(this, arguments);
	};
	
	DaliBeanRegistry.NAME = NAME;

	function _doInject(injection, name, into, intoName) {
        // if it is a Y.Base obj and there is a setter function that matches, it gets called with the injection
		if (into.getAttrs && into.getAttrs().hasOwnProperty(name)) {
            // Y.log('setting ' + name + ' into ' + intoName, 'life', NAME);
            into.set(name, injection);
			_ni++;
		} 
		// it might also be a normal object with a normal setter
		else {
			var setter = into['set' + name.substr(0,1).toUpperCase() + name.substr(1)];
			if (setter && isFunction(setter)) {
				// Y.log('setting ' + name + ' into ' + intoName, 'life', NAME);
				setter.call(into, injection);
				_ni++;
			}
		}
	}
	
	function _inject(injectionBean, injectionBeanName, subjects) {
        var subject;
		if (injectionBean.inject === false) {
			// Y.log(injectionBeanName + " doesn't want to be injected, skipping", 'info', NAME);
			return; 
		} // ignore beans that don't want to be injected
        // inner loop is for the subjects of the injection
        for (subject in subjects) {
			if (subjects.hasOwnProperty(subject)) {
            	_doInject(injectionBean, injectionBeanName, subjects[subject], subject);
			}
        }
    }
	
	function _getInjections(subjectBean, subjectName, injectionBeans) {
		var injectionName;
		for (injectionName in injectionBeans) {
			if (injectionBeans.hasOwnProperty(injectionName)) {
				_doInject(injectionBeans[injectionName], injectionName, subjectBean, subjectName);
			}
		}
	}
	
	Y.extend(DaliBeanRegistry, Y.EventTarget, {
		
		/*
         * Called to ensure all beans refer to an instance of the bean, not the bean constructor. Loops through all
         * registered beans, and if the reference is still a Function, not an Object, it will execute the constructor
         * and replace the reference with the resulting object. After ensuring this, a notification message is sent
         * to the newly created object so it can do any internal initialization it needs.
         */
        _instantiateBeans: function() {
            var name;
			this.fire(REGISTRATION_COMPLETE);
            for (name in _c) {
                if (_c.hasOwnProperty(name)) {
                    if (isFunction(_c[name])) {
                        _b[name] = new _c[name]();
                        // Y.log('created new instance of bean: ' + name, 'life', NAME);
                    } else {
                        // Y.log(name + ' was registered as a bean object and was used as-is', 'info', NAME);
                        _b[name] = _c[name];
                    }                  
                }
            }
            _bInstantiated = true;
            // notify each bean that instantiation is complete
            this.fire(INITIALIZATION_COMPLETE);
        },
		
		_getNumberOfInjections: function() {
			return _ni;
		},
		
		initializer: function() {
			this.fire(BEAN_REGISTRY_STARTED);
		},
		
		/**
         * Called to register a bean or bean constructor with the bean registry. If this method is called
         * twice with the same bean, the last bean wins. Only one type of bean can be in the system at a
         * time.
         * @param name {String} Required identifier of this bean
         * @param bean {Object} Either a constructor Function or an instance object of a bean
         */
        registerBean: function(name, bean)  {
            // Y.log('registering bean: ' + name, 'info', NAME);
            _c[name] = bean;
			// re-initialzie and inject bean if initial registration is complete
			if (_initialInjectionComplete) {
				this.reInitializeBean(name);
			}
        },
        /**
         * If the bean system has not been instatiated yet, this will instantiate all beans! 
         * @return {Object} contains all beans, each bean is accessible by bean name
         */
        getBeans: function() {
            return _b;
        },
        /**
         * If the bean system has not been instatiated yet, this will instantiate all beans! Then one bean 
         * instance is returned by name.
         * @return {Object} the bean instance, or undefined if it is not registered
         */
        getBean: function(name) {
            return _b[name];
        },
        /**
         * Given an instance of a bean, returns the String name
         * @return {String} name of the registered bean, or undefined if it is not a registered bean
         */
        getName: function(inst) {
            var name;
            for (name in _b) {
                if (_b.hasOwnProperty(name)) {
                    if (inst === _b[name]) {
                        return name;
                    }
                }
            }
        },
		
		reInitializeBean: function(name) {
			var reinitChildBeans = false, prop, childBeanName, oldBean = _b[name];
			this.fire(REINITIALIZING_BEAN, {bean: name});
			if (oldBean && oldBean.destroy && isFunction(oldBean.destroy)) {
				reinitChildBeans = oldBean.destroy() || false;
			}
			if (reinitChildBeans) {
				for (prop in oldBean) {
					if (oldBean[prop] instanceof Function && prop.substr(0,3) === 'set') {
						childBeanName = prop.substr(3,1).toLowerCase() + prop.substr(4);
						// only re-init beans that exist (prevents normal setters from triggering reinitialization
						if (_b[childBeanName]) {
							this.reInitializeBean(childBeanName);
						}
					}
				}
			}
			delete _b[name];
			_b[name] = isFunction(_c[name]) ? new _c[name]() : _c[name];
			_getInjections(_b[name], name, _b);
			_inject(_b[name], name, _b);
			this.fire(REINITIALIZED_BEAN, {bean: name});
		},
		
		doInjection: function() {
			var injection, injectionBean, eventToFire;
			if (!_initialInjectionComplete) {
				this._instantiateBeans();
				eventToFire = INJECTION_COMPLETE;
			}
			for (injection in _b) {
		        if (_b.hasOwnProperty(injection)) {
		            injectionBean = _b[injection];
		            _inject(injectionBean, injection, _b);
		        }
		    }
			this.fire(eventToFire);
			_initialInjectionComplete = true;
		},
		
		clear: function() {
			var bname,b;
			for (bname in _b) {
				if (_b.hasOwnProperty(bname)) {
					b = _b[bname];
					if (b.destroy && isFunction(b.destroy)) { b.destroy(); }
					delete _b[bname];
					delete _c[bname];
				}
			}
			_initialInjectionComplete = false;
			_bInstantiated = false;
			_ni = 0;
		}
		
	});
	
	Y.namespace('Dali');
	Y.Dali.beanRegistry = new DaliBeanRegistry();
    
}, "1.6.3", {requires:['oop', 'event-custom']});YUI.add('io-facade', function(Y) {

	var NAME = 'ioFacade',
		Lang         = Y.Lang,
        isUndefined  = Lang.isUndefined,

        GET                 = "GET",
        PROXY_DATA_PARAM    = 'post',
        DEFAULT_PROXY_TIMEOUT = 15000,
        _proxyTimeout = null,

		txTimes = {},

        cbs = {},   // keyed by txid

        // dependencies
		_configProvider,
        _transportUtils;

	function _startClock(o){
		txTimes[o] = new Date();
		// Y.log('Beginning request timer.', 'debug', NAME);
	}
	
   
	var DefaultIoFacade = function() {
		var inst = {
			
			setTransportUtils: function(utils) {
				_transportUtils = utils;
			},
			
			setConfigProvider: function(cfgProvider) {
				_configProvider = cfgProvider;
			},
			
	          /**
	           * Executes an io request
	           * @method execute
	           * @param {String} url Url to access
	           * @param {Object} data The data to send
	           * @param {String} method GET or POST
	           * @private
	           */
	          execute:function(txid, url, data, method, cb){
                  cbs[txid] = cb;
                  data.txid = txid;

				  if (!_proxyTimeout) {
				  	  _proxyTimeout = _configProvider.getProxyTimeout() || DEFAULT_PROXY_TIMEOUT;
				  }

	              url = (method == GET) ? _transportUtils.formatUrl(url,'&__r=' +  new Date().getTime()) : url;
	
	              var cfg = {
	                  method:method,
	                  data: data,
	                  on:{
	                      success:this.handleResponse,
	                      failure:this.handleResponse,
	                      start:_startClock,
						  scope:this
	                  },
					  context: this,
	                  timeout:_proxyTimeout,
                      
                      // TODO: Refactor Dali to pass through the params instead
                      // of doing this here
                      headers : {'Content-Type' : 'application/json'}
	              };
	
	              
	
	             // Y.log('Handing off request to YUI io.', 'info', NAME);
	             //var start = timer();
	
	             var req = Y.io(url, cfg);
	             //save start time for profiling.
	
	             return req;
	          },
	  
		     /**
	          * simulate a server response
	          * @private
	          * @method simulateResponse
	          * @param {Number} id the id of the transaction
	          * @param {Object} details the details of the response
	          * @param {Boolean} badcookie Optional. If true simulate cookies turned off
	          * @private
	          */
	         _simulateResponse:function(id, details, badcookie){
	             
	             //this is needed, because this method should always be present,
	             //testing for it will fail in IE6 because of the COM+ bridge
	             details.getResponseHeader = function(){ return '';};
	             
	             if(badcookie){
	                 this.handleResponse(id, details, true);
	             }else{
	                 this.handleResponse(id, details, false);
	             }
	             
	         },

		    handleResponse : function(id, o, badcookie){
		        var time = (new Date()) - txTimes[id],
                    respData = Y.JSON.parse(o.responseText),
                    txId = respData.resps[0].txId,
				    callback = cbs[txId];
                delete cbs[txId];
		        this.fire('transactionResponse', {
		            type: 'transactionResponse',
		            id: id,
		            resp: o,
                    responseData: respData,
		            badcookie: badcookie,
		            cb: callback,
		            time: time
		        }, NAME);
		        // Y.log('Request success received, stopping timer. Length: ' + time + 'ms', 'debug', NAME);
		    }
		};
		
		return new Y.Dali.Bean(inst);
	};
	
	DefaultIoFacade.NAME = NAME;
	
	Y.Dali.beanRegistry.registerBean(NAME, DefaultIoFacade);
	
}, '1.6.3', {requires:['breg', 'dali-bean']});
YUI.add('simple-request-formatter', function(Y) {
	
    var NAME = 'reqFormatter',
		Lang         = Y.Lang,
        isString     = Lang.isString,
        isUndefined  = Lang.isUndefined,
        
        POST                = "POST",
        GET                 = "GET",
        WEB_SERVICE_HANDLER = "cfg.dali.handler.ws",
        
        // required beans
		_errorReporter,
        _transportUtils,
		
		// the request formatter itself
		SimpleRequestFormatter;
    
    /**
     * Format web service requests 
     * using var foo = function() format
     * so that reset is easier.
     * @method wsRequestFormatter
     * @for Y.Transport
     * @return {Object} the formatted request
     * @private
     */
    var _wsRequestFormatter = function(reqData){
        var handler = WEB_SERVICE_HANDLER, batchable = reqData.batchable || false;

        if(isUndefined(reqData.method)){
            //if no method is set for WS_TYPE default to GET
            reqData.method = GET;
        }

        var forcePost = false;

        switch(reqData.method.toUpperCase()){
            case POST:
                // Y.log('Formating POST data', 'info', NAME);
                forcePost = true;
                var myData = reqData.data;

                if(!isString(myData)){
                   _errorReporter.error(SimpleRequestFormatter.NAME, 'data must be a string');   
                }else{
                    reqData.data = myData;
                }
                break;
            case (GET || 'DELETE'):
                // Y.log('Formating query string for GET data', 'info', NAME);

                if(reqData.data !== undefined && isString(reqData.data)){

                    reqData.url = _transportUtils.formatUrl(reqData.url, reqData.data); 
                }
                break;
            default:
                // Y.log('passing' + reqData.method + ' request unmodified', 'warn', NAME);
        }

        return {
            handler:handler,
            data:reqData,
            batchable:batchable,
            forcepost:forcePost,
            targetId:reqData.url
        };

    };
	
	SimpleRequestFormatter = function() {
		return {
			setErrorReporter: function(it) {
				_errorReporter = it;
			},
			
			setTransportUtils: function(utils) {
				_transportUtils = utils;
			},
			
			replaceRequestFormatter: function(requestType, formatter) {
				// Y.log('Replacing request formatter to ' + formatter, 'info', NAME);
				_requestTypes[requestType] = formatter;
			},
			
			formatRequest: function(txId, req) {
	            var reqObj = req.requestObject;
	
	            reqObj = _wsRequestFormatter(reqObj, req.moduleId);
	
	            reqObj.txId = txId;
	
	            if(isUndefined(req.targetId)){
	                req.targetId = reqObj.targetId;
	            }
	
                reqObj.handler = WEB_SERVICE_HANDLER;
	
	            return reqObj;
	        }
		};
	};
	SimpleRequestFormatter.NAME = NAME;
	
	Y.Dali.beanRegistry.registerBean(NAME, SimpleRequestFormatter);
	    
}, '1.6.3', {requires:['breg']});YUI.add("request-handler", function(Y){
    
    var NAME = 'requestHandler',
		OK                  = 'ok',
        E_ABORT             = "abort",
        E_TIMEOUT           = "timeout",
        //disable types
        E_DISABLED_WITH_QUEUE   = 2,
        E_DISABLED_WITHOUT_QUEUE= 1,
        E_ENABLED               = 0,
        //error types
        E_SERVER            = 'server',
        E_RESULT_BADFORMAT = 'badformat',
		E_UNSUPPORTED = 	'unsupported',
        E_GATEWAY_TIMEOUT     = "Gateway Timeout",

        //events
        REQUEST_EV          = 'request',
        RESPONSE_EV         = 'response',
        //callback names
        FAILURE_CB          = "failure",
        ERROR               = "error",
        //YUI method shortcuts
        Lang         = Y.Lang,
        isFunction   = Lang.isFunction,
        isObject     = Lang.isObject,
        isUndefined  = Lang.isUndefined,
        isNull       = Lang.isNull,
        
        _disabled      = E_ENABLED,
        _requestProps = null,
        txId = 0,
		
        // dependencies
		_requestor,
		_modulePlatform,
        _requestFormatter,
        _serviceRegistry,
        _registrationProvider,
        _responseProcessor,
        _ioFacade,
		_errorReporter,
        _configProvider;
	
	function reportUnsupportedOperation(name) {
		_errorReporter.error(E_UNSUPPORTED, '"'+ NAME +'" does not support operation: '+ name);
	}
    
    /**
     * Adds the request to the queue for processing
     * @method _processRequest
     * @param {Object} requestObject the request Id
     * @param {Object} cb callback object
     * @param {Number} id the id of the module making the request
     * @return {Number} the id of the request for tracking
     * @private
     */
    function _processRequest(requestObject, cb, id){
        var request = {
            requestObject :requestObject,
            moduleId:id,
            originId:id
        };
    
        if(requestObject.moduleId){
            request.targetId = requestObject.moduleId;
        }
        
        // so the transport bean can fire through YUI3
        this.fire(REQUEST_EV, { type: REQUEST_EV, 
            request: request.requestObject, 
            originId: request.originId 
        }, NAME);
        
        var r = _requestFormatter.formatRequest(txId++, request);
        
        _requestor.doRequest({
			request: r,
			callback: cb,
			immediate: true,
            forcepost: requestObject.forcepost
		});
    }

    /**
      * once a request has been finished (either complete or aborted)
      * this method handles the final tasks of firing events, formatting responses
      * registering any modules found, and calling callbacks
      * @method completeRequest
      * @param {Number} txId the id of the request
      * @param {String} method the type of callback to call (error, success)
      * @param {String} result the result of the request: error, abort, ok
      * @param {String} resultDetail the resultDetails as defined in the interfaces (badcookie, badcrumb, etc)
      * @private
      */
    function completeRequest(){
		var response = arguments[0].response || {},
			method = arguments[0].method,
			result = arguments[0].result,
			cb = arguments[0].cb,
			resultDetail = arguments[0].resultDetail,
        	mods = null, 
			res = null,
			arg;
			
       	response.result = result || OK;
        response.resultDetail = resultDetail || '';
        
        // Y.log('Firing response event.', 'debug', NAME);
         
        this.fire(RESPONSE_EV, {type:RESPONSE_EV, response:response}, NAME);
        
        if(isObject(response.data)){
            res = response.data.res;
            mods = response.data.mods;
        }
        if(isObject(mods)){
            // Y.log('Module found in response.', 'debug', NAME);
            
            if(mods[0].state && mods[0].state.defer){ //this is a multiple retry situation
                // Y.log('Module is marked defered, but this request handler does not handle defers.', 'warn', NAME);
                //gave up on retries, this is a timeout
                response.status=504;
                response.statusText = E_GATEWAY_TIMEOUT;
				method = FAILURE_CB;
            }
            
            for(var j=0, mlen = mods.length; j < mlen; j++ ){
               if(mods[j].props && mods[j].props.id){ //make sure its a real module config
                   // Y.log('Registering module with platform. Not starting', 'debug', NAME);
                   _modulePlatform.registerModule(mods[j]);
               }
               
            }
        }
        
        response = _responseProcessor.createResponseObject(response);
        
        cb = response.cb || cb;
        
        if(!isUndefined(cb.argument)){
            response.argument = cb.argument; //this is to support existing code
            arg = cb.argument;
        }
        
        if(isFunction(cb[method])){
            
            // Y.log('Dispatching callbacks', 'debug', NAME);
            var defaultCallbackWrapper = Y.bind(cb[method], cb.scope || this, response, arg);
			var failureCallbackWrapper = Y.bind(cb[FAILURE_CB], cb.scope || this, response, arg);
			
            if(isObject(res)){
                
                var mgr = _serviceRegistry.getService('resourcemgr');
                mgr.load(res, {
					success: defaultCallbackWrapper,
					failure: failureCallbackWrapper
				}, _configProvider.getProxyTimeout());
            }else{
                defaultCallbackWrapper();
            }
            
        }
    }
	
	/**
     * Proccess an complete transaction
     * @private
     * @method processTransactionResponse
     * @param {Number} transactionId the IO transaction id
     * @param {Object} ioResponseObj the IO response object
     */
    function processTransactionResponse(){
        
        var bc = arguments[0].badcookie || false,
			ioResponseObj = arguments[0].resp,
            responseData = arguments[0].responseData,
			cb = arguments[0].cb,
			txId = arguments[0].id,
        	status = ioResponseObj.status,
        	rd = '', r = ERROR;

        if(status != 200 && status != 201 && status != OK){ 
            
             // Y.log('Error response recieved from server.', 'warn', NAME);
             // this is an error case
            //server failure single '=' just in case we get a '200' string
            if(status === 0){
                r = (ioResponseObj.statusText == E_TIMEOUT) ? E_TIMEOUT : E_ABORT;
            }else{
                rd = E_SERVER;
                _errorReporter.error(E_SERVER, 'A server error occured: ', {responseObject:ioResponseObj});
            }
			completeRequest.call(this, {txId: txId, method: FAILURE_CB, result: r, resultDetail:rd + ' ' + status, cb: cb});

        } else {
            //not an error
        
          // Y.log('Valid response received, processing...', 'warn', NAME);

           var responseText = ioResponseObj.responseText;    
           //now to inspect headers, this test is to support unit test cases

           var contentType = ioResponseObj.getResponseHeader('Content-Type');
           
		   if(contentType.indexOf('Multipart/Related') !==  -1){ //faster than regex
               reportUnsupportedOperation('multi-part response');
			   completeRequest.call(this, {cb:cb, method: FAILURE_CB, result: ERROR, resultDetail: E_RESULT_BADFORMAT});
			   return;
           }

           _responseProcessor.processResponse(responseData.resps[0], {cb:cb}, bc);
        }
    }
    
    var RequestHandler = function() {
		var inst = {
			setRequestor: function(requestor) {
				_requestor = requestor;
			},
			setModulePlatform: function(platform) {
				_modulePlatform = platform;
			},
			setReqFormatter: function(formatter) {
				_requestFormatter = formatter;
			},
			getRequestFormatter: function() {
				return _requestFormatter;
			},
			setServiceRegistry: function(provider) {
				_serviceRegistry = provider;
			},
			setRegistrationProvider: function(provider) {
				_registrationProvider = provider;
			},
			setResponseProcessor: function(processor) {
				if (_responseProcessor) { _responseProcessor.detach(); }
				_responseProcessor = processor;
				_responseProcessor.on('responseProcessed', completeRequest, this);
			},
			getResponseProcessor: function() {
				return _responseProcessor;
			},
			setIoFacade: function(facade) {
				if (_ioFacade) { _ioFacade.detach(); }
				_ioFacade = facade;
				_ioFacade.on('transactionResponse', processTransactionResponse, this);
			},
			getIoFacade: function() {
				return _ioFacade;
			},
			setConfigProvider: function(provider) {
				_configProvider = provider;
			},
			getConfigProvider: function() {
				return _configProvider;
			},
			setErrorReporter: function(reporter) {
				_errorReporter = reporter;
			},
			replaceRequestFormatter: function(requestType, formatter) {
				_requestFormatter.replaceRequestFormatter(requestType, formatter);
			},
			replaceResponseFormatter: function(formatter) {
				_responseProcessor.replaceResponseFormatter(formatter);
			},
			disable: function(queue) {
	            // Y.log('Disabling transport. Queue state: '+ queue, 'debug', NAME);
	            _disabled = queue ?  E_DISABLED_WITH_QUEUE :  E_DISABLED_WITHOUT_QUEUE;
	        },
	        
	        enable: function(queue) {
	            // Y.log('Enabling transport', 'debug', NAME);
	            _disabled = E_ENABLED;
	        },
	        
	        isEnabled: function() {
	            return _disabled !== E_DISABLED_WITHOUT_QUEUE;
	        },
	        
	        processRequest: _processRequest,
			
			abortRequest: function (requestId, moduleId){
				reportUnsupportedOperation('abortRequest');
			},
			
			abortModuleRequests: function (moduleId){
				reportUnsupportedOperation('abortModuleRequests');
			},		 
			
			isRequestPending : function(requestId,moduleId){
				reportUnsupportedOperation('isRequestPending');
			}		
		};
		
		return new Y.Dali.Bean(inst);
	};
	
	RequestHandler.NAME = NAME;
	
	Y.Dali.beanRegistry.registerBean(NAME, RequestHandler);
	    
}, '1.6.3', {requires:['dali-bean', 'breg']});YUI.add('requestor', function(Y) {
	
	var NAME = 'requestor',
	
		POST                = "POST",
        GET                 = "GET",
        MAXIMUM_GET_LENGTH    = 1500,
		
		//YUI method shortcuts
        Lang         = Y.Lang,
        isNull       = Lang.isNull,
		isArray		 = Lang.isArray,
		
		_requestProps = null,
		_pendingTransactions = {},
		
		// bean dependencies
		_ioFacade,
		_configProvider;
		
	/**
     * finally prepares the request (stringify) and sends it
     * to ioFacade to be sent to the server
     * @private 
     * @method doRequest
     * @param {Array} request the request or requests to be sent to the server
     * @param {Boolean} forcepost if true the request will be sent as a post, 
     *                            regardless of length
     * @return {Object} the transactionObject from io 
     */
    function doRequest(opts){
        var url = _configProvider.getProxyUrl(),
			request = opts.request,
			cb = opts.callback,
			forcepost = opts.forcepost,
			immediate = opts.immediate,
			req, rString, m;

		if (typeof forcepost === 'undefined') {
			forcepost = false;
		}
		if (typeof immediate === 'undefined') {
			immediate = false;
		}

        if(isNull(_requestProps)){
            _requestProps = {};
            _requestProps.dali = _configProvider.getDaliProperties() || {};
        }
        
		if (!isArray(request)) {
			m = request.method ? request.method : GET;
			request = [request];
		} else {
	        m = GET;
		}

        rString = Y.JSON.stringify({reqs:request, props:_requestProps});
        
        if((encodeURIComponent(rString).length > MAXIMUM_GET_LENGTH) || forcepost){
            m = POST;
        }

		if (immediate) {
			_ioFacade.execute(request[0].txId, url, rString, m, cb);
		} else {
	        req =  _ioFacade.execute(request[0].txId, url, rString, m);
	        _pendingTransactions[req.id] = {
	            ioObj : req,
	            cfg   : request,
	            forcepost:forcepost
	        };
	        return req;
		}
    }
		
	function Requestor() {
		return {
			setIoFacade: function(facade) {
				_ioFacade = facade;
			},
/*
			getIoFacade: function() {
				return _ioFacade;
			},

*/			setConfigProvider: function(provider) {
				_configProvider = provider;
			},
/*
			getConfigProvider: function() {
				return _configProvider;
			},
*/
			setDaliCrumb: function(crumb) {
				_requestProps.dali.crumb = crumb;
			},
			deletePending: function(txId) {
				delete(_pendingTransactions[txId]);
			},
			getPending: function(txId) {
				return _pendingTransactions[txId];
			},
			doRequest: doRequest
		};
	}
	
	Requestor.NAME = NAME;
	
	Y.Dali.beanRegistry.registerBean(NAME, Requestor);
	
}, '1.6.3', {requires:['json', 'breg']});
YUI.add('response-formatter', function(Y) {
	var NAME = 'respFormatter';
	
	function _defaultFormatter(resp) {
		return resp;
	}
	
	function ResponseFormatter() {
		return {
			
			formatResponse: _defaultFormatter,
			
			replaceResponseFormatter: function(formatter) {
				// Y.log('Changing GLOBAL request formatter to ' + formatter, 'warn', NAME);
	            this.formatResponse = formatter;
			}
			
		};
	}
	
	ResponseFormatter.NAME = NAME;
	
	Y.Dali.beanRegistry.registerBean(NAME, ResponseFormatter);

}, '1.6.3', {requires:['breg']});YUI.add('response-processor', function(Y) {
	
	var NAME = 'responseProcessor',
		OK                  = 'ok',
        Lang         = Y.Lang,
        isUndefined  = Lang.isUndefined,
		ERROR = 'error',
		
		//error types
        E_BROWSER           = 'browser',
        E_CRUMB             = 'crumb',
        //result detail types
        E_RESULT_NOCOOKIES = 'nocookies',
        E_RESULT_BADCRUMB  = 'badcrumb',
    
        // beans
        _responseFormatter,
		_errorReporter,
        _configProvider;
		
	/**
     * creates a mimic of the yui response object
     * for use in web service calls
     * @method createWebServiceResponseObject
     * @param {DaliResponseWs} response the response from the daliProxy
     * @return {Object} formated response object
     * @private
     */   
    function _createWebServiceResponseObject( /* DaliResponseWS */  response ){
        // Y.log('Building web service response object', 'info', NAME);
        var myData = Y.Object(response.data);

        var headerHash = false; //cache the header lookup for later after first time

        var respHeaderFlag = false; //save string replace until needed
        
        myData.getResponseHeader = function(header){

            if(!headerHash){ //don't bother processing this unless someone wants it.
                this.responseHeader = myData.responseHeader.replace('\r\n', '\n'); //to comply with yui io docs
                respHeaderFlag = true;
                var headerList = myData.responseHeader.split('\n');
                var len = headerList.length;
                headerHash = {};
                for (var i=0; i < len; i++) {
                    var tmparr = headerList[i].split(': ');
                    headerHash[tmparr[0]] = tmparr[1];
                }
            }

            return headerHash[header];
        };

        myData.getAllResponseHeaders = function(){
            if(!respHeaderFlag){
                this.responseHeader = myData.responseHeader.replace('\r\n', '\n'); //to comply with yui io docs
            }
            return this.responseHeader;
        };
        
        return Y.mix(response, myData);
    }
	
	var ResponseProcessor = function() {
		var inst = {
			setConfigProvider: function(provider) {
				_configProvider = provider;
			},
			setRespFormatter: function(formatter) {
				_responseFormatter = formatter;
			},
			setErrorReporter: function(reporter) {
				_errorReporter = reporter;
			},
			replaceResponseFormatter: function(formatter) {
				_responseFormatter.replaceResponseFormatter(formatter);
			},
			
			processResponse: function(o, metaData, badcookie){
	        
		        var txId = o.txId;
		        
		        if(isUndefined(metaData)){
		            //this will happen if the request was aborted before it was sent
		            return;
		        }
		
		        var fail = true;
		        
		        var response = {
		            data:o.data
		        };
		        
		        var result,resultDetail;
		       
		        response.cb = metaData.cb;
		        if(o.status == 200 || o.status == 201){
		            response.status = OK;
		            response.result = OK;
		            result = OK;
		            fail = false;
		        }else{
		            response.status = ERROR;
		            response.result = ERROR;
		            if(o.status == 400){ //double "=" to catch strings
		
		                var errorType = E_CRUMB,
		                message       = "Invalid crumb.";
		                resultDetail = E_RESULT_BADCRUMB;   
		                result = ERROR;
		                if(!window.navigator.cookieEnabled || badcookie == 'badcookie'){
		                    errorType = E_BROWSER;
		                    resultDetail = E_RESULT_NOCOOKIES;
		                    message      = "Cookies are disabled";
		                }
		                
		                _errorReporter.error(errorType, message);
		
		            }
		
		        }
				
		        this.fire('responseProcessed', {
					type: 'responseProcessed',
		            txId:txId, 
		            response: response, 
		            method:(fail ? 'failure' : 'success'), 
		            result:result, 
		            resultDetail:resultDetail
		        }, NAME);
		    },
			
	        createResponseObject: function(response, platform){
		        // Y.log('Building response object', 'debug', NAME);
		        
		        if(response.data && response.data.responseText){ //this will only happen for webservice responses
		            // Y.log('This looks like a proxied web service request, passing to WS formatter', 'debug', NAME);
		            return _createWebServiceResponseObject(response);
		        }else{
		            //support a wrong implementation in old daliTransport
		            //porting the mistake forward.
		
		            if(response.data){
		                if(response.data.mods){
		                    response.mods = response.data.mods; //this is for backwards compatibility
		                    response.mod = response.mods[0]; //this is the correct format
		                    delete(response.data.mods);
		                }
		
		                if(response.data.html){
		                    response.html = response.data.html;
		                    delete(response.data.html);
		                }
		                
		                if(response.data.res){
		                    response.res = response.data.res;
		                    delete(response.data.res);
		                }
		            }
		            
		            response = _responseFormatter.formatResponse(response);
		            return response; //no op.
		        }
	    	}

		};
		return new Y.Dali.Bean(inst);
	};
	   
	ResponseProcessor.NAME = NAME;
	
    Y.Dali.beanRegistry.registerBean(NAME, ResponseProcessor);

}, '1.6.3', {requires:['dali-bean', 'breg']});YUI.add('dali-transport-base', function(Y) {
	
	var NAME = 'transport',

        //YUI method shortcuts
        Lang         = Y.Lang,
        isArray      = Lang.isArray,
		
		// events
		INJECTION_COMPLETE = 'injd',
        
		// beans
        _requestHandler;
	
	var Transport = function() {
		var inst = {
			name: NAME,
			setRequestHandler: function(handler) {
				if (_requestHandler) { 
					_requestHandler.removeTarget(this);
					_requestHandler.detach(); 
				}
				_requestHandler = handler;
				// bubble up request events
				_requestHandler.addTarget(this);
			},
			getRequestHandler: function() {
				return _requestHandler;
			},
			
	        /**
	         * Disables all Ajax requests for the application. 
	         * 
	         * @method disable
	         * @param {Boolean} queue (Optional) When set to true, queues all requests while disabled. 
	         */
	        disable:function(/* boolean */ queue){
	            _requestHandler.disable(queue);
	        },
	
	        /**
	         * Enables sending of requests.    
	         * @method enable 
	         * @static
	         */
	        enable:function(){
	            _requestHandler.enable();
	        },
			
			isEnabled: function() {
				return _requestHandler.isEnabled();
			},
	        
	        makeRequest: function (data, callback, id) {
	             // Y.log('Making request...', 'info', NAME);
	             if(_requestHandler.isEnabled()){
	                 if(isArray(data) && data.length > 1){
	                     for (var i=0, len=data.length; i < len; i++) {
						 	// all arrays of requests are assumed to be batchable by default
							if (data[i].batchable === undefined) {
							 	data[i].batchable = true; 
							}
	                        _requestHandler.processRequest(data[i], callback, id);
	                     }
	                     return null; //no trackable id for an array
	                 }else{
	                     return _requestHandler.processRequest((isArray(data) ? data[0] : data), callback, id);
	                 } 
	             }else{
	                 // Y.log('Transport is disabled!', 'warn', NAME);
	                 return false;
	             }
	         },
			 
	         getMetrics:function(requestId){
	             return _requestHandler.getMetrics(requestId);
	         },
	         
	         clearMetrics:function(requestId){
	             _requestHandler.clearMetrics(requestId);
	         },
			 
	         abortRequest: function (requestId, moduleId){
	             return _requestHandler.abortRequest(requestId, moduleId);
	         },
			 
			 abortModuleRequests: function(moduleId) {
			 	return _requestHandler.abortModuleRequests(moduleId);
			 },
			 
			 isRequestPending: function(requestId, moduleId) {
			 	return _requestHandler.isRequestPending(requestId, moduleId);
			 },
			 
	        /**
	         * Sets the request formatter function for a given request type.
	         * @param {String} requestType The type of request that the formatter should handle.
	         * @param {Function} formatter The function to call to format the request.
	         * @method setRequestFormatter
	         */
	         setRequestFormatter:function(requestType, formatter) {
			 	_requestHandler.replaceRequestFormatter(requestType, formatter);
	         },
	     
	         /**
	          * Sets the response formatter function for all responses.
	          * @param {Function} formatter The function to call to format the response object.
	          * @method setResponseFormatter
	          */
	         setResponseFormatter:function(formatter){
				_requestHandler.replaceResponseFormatter(formatter);
	         },
			 
			 /**
			  * Called by the bean registry whenever this bean is reinitialized
			  */
			 destroy: function() {
			 	return true;
			 }
			  
		};
		// this will make the transport available globally if there is no Module Platform once
		// all beans have been injected
		Y.Dali.beanRegistry.on(INJECTION_COMPLETE, function() {
            if (!Y.Dali && !Y.Dali.Platform) {
                Y.namespace('Dali');
                Y.Dali.transport = new Transport();                
            }
        });
		return new Y.Dali.Bean(inst);
	};
	
	Transport.NAME = NAME;
	
	Y.Dali.beanRegistry.registerBean(NAME, Transport);
		
}, '1.6.3', {requires:['event-custom', 'breg', 'dali-bean']});YUI.add('transport-utils', function(Y) {
	var NAME = 'transportUtils';
	
	function TransportUtils() {
		return {
			formatUrl: function(url, data){
				return url + ((url.indexOf('?') === -1) ? '?' : '&') + data; 
	        }
		};
	}
	
	TransportUtils.NAME = NAME;
	
	Y.Dali.beanRegistry.registerBean(NAME, TransportUtils);
	
}, '1.6.3', {requires:['breg']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-tunnel-client', function(Y, NAME) {

    function TunnelClient(appConfig) {
        this._appConfig = appConfig;
        var errorReporter = {
                error: function(type, msg) {
                    throw new Error("TRANSPORT ERROR: " + type + " : " + msg);
                }
            },
            configProvider = {
                getProxyUrl: function() {
                    return appConfig.tunnelPrefix;
                },

                getDaliProperties: function() {
                    return {};
                },

                getProxyTimeout: function() {
                    return 10000;
                }
            };
        Y.Dali.beanRegistry.registerBean('errorReporter', errorReporter);
        Y.Dali.beanRegistry.registerBean('configProvider', configProvider);
        Y.Dali.beanRegistry.doInjection();
        this._transport = Y.Dali.beanRegistry.getBean('transport');
    }

    TunnelClient.prototype = {

        rpc: function(command, adapter) {

            // the RPC tunnel always sends JSON POST data
            command.forcepost = true;

            this._transport.makeRequest(command, {
                success: function(resp) {
                    Y.log('rpc success', 'debug', NAME);
                    adapter.done(resp.html, resp.data.meta);
                },
                failure: function() {
                    Y.log('rpc failure!', 'warn', NAME);
                    Y.log(arguments, 'warn', NAME);
                }
            });

        }
    };

    Y.mojito.TunnelClient = TunnelClient;

}, '0.1.0', {requires: ['breg', 'querystring-stringify-simple', 'mojito', 'dali-transport-base', 'request-handler', 'simple-request-formatter', 'requestor', 'io-facade', 'response-formatter', 'response-processor']});
/*
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-util', function(Y) {

    var META_AUTOCLOBBER = ['content-type'],
        META_EXCLUDE = ['view'],
        META_ATOMIC = ['content-type'];

    Y.mojito.util = {

        array: {
            remove: function(arr, from, to) {
                var rest = arr.slice((to || from) + 1 || arr.length);
                arr.length = from < 0 ? arr.length + from : from;
                return this.push.apply(arr, rest);
            },

            contains: function(a, obj) {
                var i = a.length;
                while (i--) {
                    if (a[i] === obj) {
                        return true;
                    }
                }
                return false;
            }
        },

        copy: function(obj) {
            var temp = null,
                key = '';
            if (!obj || typeof(obj) !== 'object') { return obj; }
            temp = new obj.constructor();
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    temp[key] = Y.mojito.util.copy(obj[key]);
                }
            }
            return temp;
        },

        heir: function(o) {
            function F() {}
            F.prototype = o;
            return new F();
        },

        /**
         * Used to merge meta objects into each other. Special consideration for certain headers values
         * like 'content-type'.
         * @method metaMerge
         * @private
         * @param to
         * @param from
         * @param clobber
         */
        metaMerge: function(to, from, clobber) {
            var k, tv, fv,
                internal = arguments[3];
            for (k in from) {
                if (from.hasOwnProperty(k)) {
                    if (! internal && isExcluded(k)) {
                        continue;
                    }
                    fv = from[k];
                    tv = to[k];
                    if (! tv) {
    //                    Y.log('replacing ' + k);
                        to[k] = fv;
                    } else if (Y.Lang.isArray(fv)) {
    //                    Y.log('from array ' + k);
                        if (! Y.Lang.isArray(tv)) {
                            throw new Error("Meta merge error. Type mismatch between mojit metas.");
                        }
                        if (shouldAutoClobber(k)) {
                            if (isAtomic(k)) {
                                to[k] = [fv[fv.length-1]];
                            } else {
                                to[k] = fv;
                            }
                        } else {
                            tv.push.apply(tv, fv);
                        }
                    } else if (Y.Lang.isObject(fv)) {
    //                    Y.log('from object ' + k);
                        if (Y.Lang.isObject(tv)) {
    //                        Y.log('merging ' + k);
                            to[k] = Y.mojito.util.metaMerge(tv, fv, clobber, true);
                        } else if (Y.Lang.isNull(tv) || Y.Lang.isUndefined(tv)) {
                            to[k] = fv;
                        } else {
                            throw new Error("Meta merge error. Type mismatch between mojit metas.");
                        }
                    } else if (clobber) {
    //                    Y.log('clobbering ' + k);
                        to[k] = fv;
                    }
                }
            }
            return to;
        },

        /*
         * Recursively merge properties of two objects
         *
         * @method mergeRecursive
         * @param {dest} the destination object
         * @param {src} the source object
         * @param {typeMatch} Only replace if src and dest types are the same
         */
        mergeRecursive: function(dest, src, typeMatch) {
            var p;
            for (p in src) {
                if (src.hasOwnProperty(p)) {
                    // Property in destination object set; update its value.
                    if ( src[p] && src[p].constructor === Object ) {
                        if(!dest[p]){
                            dest[p] = {};
                        }
                        dest[p] = this.mergeRecursive(dest[p], src[p]);
                    } else {
                        if(dest[p] && typeMatch){
                            if(typeof dest[p] === typeof src[p]){
                                dest[p] = src[p];
                            }
                        }
                        // only copy values that are not undefined, null and falsey values should be copied
                        else if (typeof src[p] !== 'undefined') {
                            // for null sources, we only want to copy over values that are undefined
                            if (src[p] === null) {
                                if (typeof dest[p] === 'undefined') {
                                    dest[p] = src[p];
                                }
                            } else {
                                dest[p] = src[p];
                            }
                        }
                    }
                }
            }
            return dest;
        },

        /*
         * TODO: [bug 4649708] I'm sure we can do this better
         *
         * This function trys to make the given URL relative to the
         * folder the iOS UIWebView is running in.
         */
        iOSUrl: function(url){

            // If we are not in a DOM, return
            if(typeof window === 'undefined'){
                return url;
            }

            // Now we do some bad shit for iOS
            // Basicly if we are in a UIWebView and its location is a file:// on the device
            // we have to make our URL relative to the file that was opened
            if(window.location.href.indexOf('file://') === 0 && window.location.href.indexOf('/Applications/') > 0 && window.location.href.indexOf('.app/') > 0){
                if(url.charAt(0) === '/' ){
                    url = url.slice(1);
                }
            }

            return url;
        }
    };

    function shouldAutoClobber(k) {
        return arrayContainsLowerCase(META_AUTOCLOBBER, k);
    }

    function isExcluded(k) {
        return arrayContainsLowerCase(META_EXCLUDE, k);
    }

    function isAtomic(k) {
        return arrayContainsLowerCase(META_ATOMIC, k);
    }

    function arrayContainsLowerCase(a, obj) {
        var i = a.length,
            selector = obj.toLowerCase();
        while (i--) {
            if (a[i].toLowerCase() === selector) {
                return true;
            }
        }
        return false;
    }

}, '0.1.0', {requires: ['mojito']});
/*
 * Copyright (c) 2011-2012 Yahoo! Inc. All rights reserved.
 */
YUI.add('mojito-view-renderer', function(Y) {

    /*
     * Mojito's view renderer abstraction. Will plugin in the specified view plugin to do
     * the rendering, depending on the 'type' specified.
     * @class ViewRenderer
     * @namespace Y.mojit
     * @constructor
     * @param {String} type view engine addon type to use
     */
    function Renderer(type, viewId) {
        type = type || 'mu';
        this._renderer = new (Y.mojito.addons.viewEngines[type])(viewId);
    }

    Renderer.prototype = {

        /*
         * Renders a view
         * @method render
         * @param {Object} data data to push into the view
         * @param {string} mojitType name of the mojit type
         * @param {Object} tmpl some type of template identifier for the view engine
         * @param {Object} adapter
         * @param {Object} meta
         * @param {boolean} more whether there will be more data to render later (streaming)
         */
        render: function(data, mojitType, tmpl, adapter, meta, more) {

            this._renderer.render(data, mojitType, tmpl, adapter, meta, more);

        }

    };

    Y.mojito.ViewRenderer = Renderer;

}, '0.1.0', {requries: ['mojito']});
