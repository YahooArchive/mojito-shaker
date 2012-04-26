/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
YUI.add("shaker-runtime", function(Y, NAME) {

	function ShakerRuntime() {
		this._originalLoad = Y.mojito.Loader.prototype.load;
		this._originalMojitProxy = Y.mojito.MojitProxy.prototype.invoke;
		this.init();
	}
	ShakerRuntime.prototype = {
		init:function(){
			this._hookLoader();
			this._hookInvoke();

		},
		_hookLoader:function() {
			var self = this;
			Y.mojito.Loader.prototype.load = function(){
				Y.log('Loader Hooked!');
				self._onLoaderCall.apply(self,arguments);
				self._originalLoad.apply(this,arguments);
			};
		},
		_hookInvoke:function(){
			var self = this;
			Y.mojito.MojitProxy.prototype.invoke = function(){
				Y.log('Invoke Hooked!');
				self._onInvokeCall.apply(self,[this].concat(arguments));
				self._originalMojitProxy.apply(this,arguments);
			};
		},
		_onLoaderCall:function(list) {
			//Y.log(list);
		},
		_onInvokeCall:function(mojitProxy,args) {
			//console.log(arguments);
		}
	};

	Y.mojito.ShakerRuntime = Y.mojito.ShakerRuntime || new ShakerRuntime();

}, '0.0.1', {requires: []});