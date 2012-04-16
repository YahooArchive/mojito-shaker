YUI.add("shaker-runtime", function(Y, NAME) {
	var originalLoad = Y.mojito.Loader.prototype.load;
	Y.mojito.Loader.prototype.load = function(){
		console.log('Hooked Loader! :)');	
		originalLoad.apply(this,arguments);
	};


}, '0.0.1', {requires: []});