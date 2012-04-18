YUI.add("shaker-runtime", function(Y, NAME) {
	var originalLoad = Y.mojito.Loader.prototype.load;

	Y.mojito.Loader.prototype.load = function(list,cb){
		
		for(var module in list){
			var item = list[module];
			if(item.indexOf('http' === 0) || item.indexOf()){
				continue;
			}
		}

		originalLoad.apply(this,arguments);
	};


}, '0.0.1', {requires: []});