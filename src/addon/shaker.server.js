YUI.add('mojito-shaker-addon', function(Y, NAME) {
    var libfs = require('fs'),libpath = require('path');


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
        Y.log(adapter.req.app.store._staticURLs);
    }

    ShakerAddon.prototype = {
        namespace: 'shaker',
        _init:function(ac,adapter){
            this._appConfig = this._setAppConfig(ac);
            this._meta = YUI._mojito._cache.shaker.meta;
            this._deployClient = ac.config.get('deploy') === true;
            this._shakerDeploy = ac.app.config.shaker && true;
        },
        _setAppConfig: function(ac){
            var app = ac.app.config.staticHandling || {};
            app.appName = app.appName || libpath.basename(process.cwd());
            app.frameworkName = app.frameworkName || 'mojito';
            app.prefix = app.prefix || 'static';
            return app;
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
                var mojit = this._meta.mojits[mojitName],
                    mojitInAction = mojit[binder] || mojit['*'];

                return mojitInAction.shaken[sel];
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
                return this._getAppRollup(selector,action);

        },
        _diffMojits:function(loaded,hc){
            for(var i=0; i<hc.length;i++){
                        if(loaded[hc[i]]){
                            delete loaded[hc[i]];
                        }
                }
            return loaded;
        },
        shakeAll: function(meta){
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

            //get all resources
            var topjs = assets.top.js || [],
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
            for(var m in meta.children){
                var mojit = meta.children[m];
                loadedMojits[mojit.base || mojit.type] = meta.children[m].action;
            }
            //we just need to rollup the low-coverage Mojits
            noBundledMojits = this._diffMojits(loadedMojits,bundleMojits);
            //rollup non-Bundled Mojits
            rollupsMojits = this._shakeMojits(noBundledMojits,groupsJS.mojits);
            
            rollupsApp = this._shakeApp(groupsJS.app);
            allRollups = rollupsApp.concat(rollupsMojits);

            rolledCSS = allRollups.filter(function(i){return libpath.extname(i) === '.css';});
            rolledJS = allRollups.filter(function(i){return libpath.extname(i) === '.js';});
            //if deploy to true add the mojitoCore
            if(this._deployClient){
                rolledJS = mojitoCore.concat(rolledJS);
            }
            // Override. ToDo: We will need to check the dependencies at some point
            assets.bottom.js = this._shakerDeploy ? rolledJS : assets.bottom.js;

            //TODO: Add only if client side deployed!
            assets.bottom.js.push('/static/demo/autoload/compiled/shaker-meta.common.js');

            assets.top.css = (assets.top.css && assets.top.css.concat(rolledCSS)) || rolledCSS;
        }
    };

    Y.mojito.addons.ac.shaker = ShakerAddon;

}, '0.0.1', {requires: ['mojito']});