//fuse helper functions
function substitute(str, arr) {
	var i,pattern,re, n = arr.length;
	for (i = 0; i < n; i++) {
		pattern = "\\{" + i + "\\}";
		re = new RegExp(pattern, "g");
		str = str.replace(re, arr[i]);
	}
	return str;
}
	
	function readConfigFile(file){
		var fs = require('fs');
		return JSON.parse(fs.readFileSync(file));
	}
	
	function isEmpty(obj) {
    		for(var prop in obj) {
        		if(obj.hasOwnProperty(prop))
            		return false;
    		}
    		return true;
	}
	
	function arrayDiff(origin,exclude){
		if(!exclude || !exclude.length) return origin;
		return origin.filter(function(i) {return !(exclude.indexOf(i) > -1);});
	}

	function simpleMerge(obj1,obj2){
		 var obj3 = {};
   		 for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
   		 for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    		 return obj3;
	}
	
	function mergeRecursive(dest, src, typeMatch) {
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
        }
	
	function simpleClone(obj){
    		if(obj == null || typeof(obj) != 'object')
        	return obj;
	    var temp = obj.constructor(); // copy throw constructor
	    for(var key in obj)
     	   temp[key] = simpleClone(obj[key]);
	    return temp;
	}
	
	function isInList(item,list){
		if(list){
			for(var i=0;i<list.length; i++){
				if(list[i] === item)return i;
			}
		}
		return -1;
	}

module.exports.substitute = substitute;
module.exports.readConfigFile = readConfigFile;
module.exports.isEmpty = isEmpty;
module.exports.arrayDiff = arrayDiff;
module.exports.simpleMerge = simpleMerge;
module.exports.mergeRecursive = mergeRecursive;
module.exports.simpleClone = simpleClone;
module.exports.isInList = isInList;
