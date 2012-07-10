/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
YUI.add('mojito-shaker-addon', function(Y, NAME) {
    var libfs = require('fs'),libpath = require('path'),
        YUI_SEED = 'http://yui.yahooapis.com/3.5.1/build/yui/yui.js';


    function filterAssets(appConfig,list){
            var app = appConfig,
                regularExp = '/' + app.prefix +'/([^/]+)/.*',
                groups = {
                    app:[],
                    core:[],
                    mojits:[]
                };
            for(var i = 0 ; i<list.length; i++){
                var item = list[i],
                    matched = item.match(regularExp),
                    type = matched && matched.pop();
                if(type){
                    switch(type){
                        case app.frameworkName: groups.core.push(matched.pop()); break;
                        case app.appName: groups.app.push(matched.pop());break;
                        default: groups.mojits.push(matched.pop());break;
                    }
                }
            }
            return groups;
    }

    function ShakerAddon(command, adapter, ac) {
        this._ac = ac;// the future action context of the mojit (not attached yet if mojit created dynamically)
        this._adapter = adapter;// where the functions done and error live before attach them to the ac.
        this._command = command;//all the configuration for the mojit
        this._init(ac,adapter);
    }

    ShakerAddon.prototype = {
        namespace: 'shaker',
        _init:function(ac,adapter){
            var shaker = this._shakerConfig = ac.app.config.shaker;
            this._appConfig = this._setAppConfig(ac);
            this._meta = YUI._mojito._cache.shaker ? YUI._mojito._cache.shaker.meta : {};
            this._deployClient = (ac.config && ac.config.get('deploy')) || ac.instance.config.deploy === true;
            this._shakerDeploy = shaker && shaker.task && shaker.task !== "raw";
            this._ssl = shaker && shaker.ssl;
            this._shakerYUI = this._deployClient && ac.app.config.upgradeYUIClient;
        },
        _setAppConfig: function(ac){
            var app = ac.app.config.staticHandling || {};
            app.appName = app.appName || libpath.basename(process.cwd());
            app.frameworkName = app.frameworkName || 'mojito';
            app.prefix = app.prefix || 'static';
            return app;
        },
        enableSSL: function (val) {
            this._ssl = val? this._ssl || val : val;
        },
        /*
        * The above two functions are meant to upgrade YUI and cleanup the clientSide
        * SHOULD BE REMOVED once Mojito gets the last version and clean the "needs" obj
        */
        _checkMojitoNeeds: function (binderMap, store) {
            var viewId, yui, binder, module, path, yuiModules = {}, yuiArray = [];
            for (viewId in binderMap) {
                    if (binderMap.hasOwnProperty(viewId)) {
                        binder = binderMap[viewId];
                        for (module in binder.needs) {
                            if (binder.needs.hasOwnProperty(module)) {
                                path = binder.needs[module];
                                // Anything we don't know about we'll assume is
                                // a YUI library module.
                                if (store.fileFromStaticHandlerURL(path)) {
                                    if(!yuiModules[module]){
                                        yuiArray.push(module);
                                    }
                                    yuiModules[module] = true;
                                }
                            }
                        }
                    }
                }
            return yuiArray;
        },
        _upgradeYUI: function(ac, meta){
            ac = ac || this._ac;
            var app = ac.app.config,
                assets = ac.assets.getAssets(),
                store = this._adapter.req.app.store,
                yui = app.yui,
                yuiInitBlob = assets.bottom.blob[0],
                seed = yui.seed || (yui.base && yui.base + 'yui/yui-min.js') || YUI_SEED,
                mojitoModules = this._checkMojitoNeeds(meta.binders, store),
                modulesStr = mojitoModules.join("',\n\t'");
                
            assets.top.js[0] = seed;//get the seed first

            //remove YUI_config since is harcoded and we dont need it
             yuiInitBlob = yuiInitBlob.replace(/YUI_config = \{.*\}\;\n/,"");
             yuiInitBlob = yuiInitBlob.replace(/\"needs\": \{([^\}]*)\}/g,'"needs":{}');

            var blobReplace = "YUI().use('" + modulesStr + "', function(Y) {\n" +
                "\tY.mojito.Loader=function(){this.load=function(n,c){c();};};";

            assets.bottom.blob[0] = yuiInitBlob.replace("YUI().use('*', function(Y) {", blobReplace);
        },
        _matchDimensions :function(selector,dimensions,action,shaken){
            action = action || '*';
            var parts = selector.split('-'),
                matched = '', aux;
                    while(parts.length){
                        aux = parts.shift();
                        if(aux === 'common'){
                            matched+= matched ? '-' + aux : aux;
                        }else if(aux === 'action'){
                            action = shaken[matched + '-' + action] ? action : '*';
                            matched+=matched? '-' + action: action;
                        }else{// common case dimensions

                            //we find a matched dimension in shaken
                            if(typeof dimensions[aux] !== 'undefined' && shaken[matched + '-' + dimensions[aux] ]){
                                matched+= matched ? '-' + dimensions[aux] : dimensions[aux];
                            }else if(shaken[matched+'-'+aux]){//if we have the default name keep going
                                matched+= matched ? '-' + aux : aux;
                                continue;
                            }else{
                                break;
                            }
                        }
                    }
                    return matched;
        },
        _matchMojitDimensions: function(mojit,binder){
            var mojitAll = this._meta.mojits[mojit],
                mojitmeta = mojitAll && (mojitAll[binder] || mojitAll['*']),
                selector = mojitmeta && this._meta.config.order,
                matched = '';

                if(selector){
                    matched = this._matchDimensions(selector,this._ac.context,binder,mojitmeta.shaken);
                    //matched = matched.replace('action',action);
                    //Y.log("Matched:" + matched);
                }//selectorMeta?
            return matched;
        },
        _getMojitRollup: function(mojitName,binder,sel){
            try{
                var rollup, mojit = this._meta.mojits[mojitName],
                    mojitInAction = mojit[binder] || mojit['*'];

                rollup = mojitInAction.shaken[sel];
                if(this._deployClient){
                    rollup = rollup.concat(mojitInAction.client);
                }
                return rollup;

            }catch(e){
                console.log('ERR founding dimension for:' + mojitName);
                return [];
            }
        },
        _shakeMojits:function(mojits,mojitsDeps){
            var binders = mojitsDeps.filter(function(i){return i.indexOf('/binders/');}),
                shaken = [],
                self = this,
                binderName;

            for(var mojit in mojits){
                binderName = mojits[mojit];
                for(var i=0; i< mojitsDeps.length;i++){
                    if(mojitsDeps[i].indexOf(mojit+'/binders/') !== -1){
                        binderName = libpath.basename(mojitsDeps[i],'.js');
                        break;
                    }
                }
                var selector = self._matchMojitDimensions(mojit,binderName);
                mojitMatchedRollups = selector ? self._getMojitRollup(mojit,binderName,selector) : [];
                shaken = shaken.concat(mojitMatchedRollups);
            }
            return shaken;
        },
        _getAppRollup: function(selector,action){
            var app = this._meta.app,
                shakedAction = app[action] || app['*'],
                rollup = shakedAction.shaken[selector].slice();
            if(this._deployClient){
                rollup = rollup.concat(shakedAction.client);
            }

            return rollup;
        },
        _shakeApp: function(appDeps){
            var action = this._ac.action,
                app = this._meta.app,
                dimensions = this._ac.context,
                shakenAction = app[action] || app['*'],
                order = this._meta.config.order,
                shaken = shakenAction.shaken,
                selector = this._matchDimensions(order,dimensions,action,shaken);
                //console.log(shaken);
                return this._getAppRollup(selector,action);

        },
        _matchLoadedMojits: function (ac, meta){
            var childName, child, mojit, children = meta.children,
                app = ac.app,
                specs = app.config.specs,
                loadedMojits = {};

            for(childName in children){
                child = children[childName];
                mojit = child.type || specs[child.base].type;
                loadedMojits[mojit] = child.action || '*';
            }
            return loadedMojits;

        },
        _diffMojits:function(loaded,hc){
            for(var i=0; i<hc.length;i++){
                    if(loaded.hasOwnProperty(hc[i])){
                        delete loaded[hc[i]];
                    }
                }
            return loaded;
        },
        sslHostRewrite: function (rollups) {
            //add the s in http
            var i;
            if (this._ssl === true) {
                for (i = 0; i<rollups.length; i++) {
                    rollups[i] = rollups[i].replace('http:','https:');
                }

            } else {
                var ycs = this._shakerConfig && this._shakerConfig.config && this._shakerConfig.config.ycs;
                if (ycs) {
                    for (i = 0; i<rollups.length; i++) {
                        rollups[i] = (rollups[i].replace(ycs, this._ssl)).replace('http:','https:');
                    }
                }
            }

        },
        run: function(meta, tunnel){
            var ac = this._ac,
                assets = ac.assets.getAssets(),
                appMeta = this._meta.app,
                mojitoCore = this._meta.core,
                bundleMojits = (appMeta[ac.action] || appMeta['*']).mojits || [],
                rolledCSS, rolledJS;

            assets.top = assets.top || {};
            assets.bottom = assets.bottom || {};
            assets.top.js = assets.top.js || [];
            assets.top.css = assets.top.css || [];
            assets.bottom.js = assets.bottom.js || [];
            assets.bottom.css = assets.bottom.css || [];

            //TODO: This feature will stay at least 'til they upgrade to YUI 3.5.1
            if(this._deployClient && this._shakerYUI){
                this._upgradeYUI(ac, meta);
            }

            //get all resources
            var coreRollup,
                topjs = assets.top.js || [],
                bottomjs = assets.bottom.js || [],
                js = topjs.concat(bottomjs),
                topcss = assets.top.css || [],
                bottomcss = assets.bottom.css | [],
                css = topcss.concat(bottomcss),

                groupsJS = filterAssets(this._appConfig,js),
                loadedMojits = {},
                rollupsMojits = [],
                rollupsApp = [],
                noBundledMojits,
                allRollups;

            //get all mojits and map the action
            loadedMojits = this._matchLoadedMojits(ac,meta);

            //we just need to rollup the low-coverage Mojits
            noBundledMojits = this._diffMojits(loadedMojits,bundleMojits);

            //rollup non-Bundled Mojits
            rollupsMojits = this._shakeMojits(noBundledMojits,groupsJS.mojits);

            //if we are in the tunnel communication, we just set the meta and finish execution fast
            if (tunnel) {
                meta.assets = {top:{css:rollupsMojits}};
                return;
            }

            rollupsApp = this._shakeApp(groupsJS.app);
            allRollups = rollupsApp.concat(rollupsMojits);

            if (this._ssl) {
                this.sslHostRewrite(allRollups);
                this._ssl = true;
                this.sslHostRewrite(mojitoCore);
            }

            rolledCSS = allRollups.filter(function(i){return libpath.extname(i) === '.css';});
            rolledJS = allRollups.filter(function(i){return libpath.extname(i) === '.js';});
            //if deploy to true add the mojitoCore
            if(this._deployClient){
                rolledJS = mojitoCore.concat(rolledJS);
                assets.bottom.js = rolledJS;
            }
            
            assets.top.css = (assets.top.css && assets.top.css.concat(rolledCSS)) || rolledCSS;
        }
    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {requires: ['mojito']});
