YUI.add("shaker-runtime", function(Y, NAME) {
	var originalLoad = Y.mojito.Loader.prototype.load;

	Y.mojito.Loader.prototype.load = function(list,cb){
		for(var module in list){
			var item = list[module];
		}
		
		originalLoad.apply(this,arguments);
	};


}, '0.0.1', {requires: []});