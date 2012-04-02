define('Object.keys', function() {
	if(!Object.keys) {
		Object.keys = function(o) {
			if (o !== Object(o)) {
				throw new TypeError('Object.keys called on non-object');
			}
			
			var ret = [];
			for(var p in o) {
				if(Object.prototype.hasOwnProperty.call(o, p)) {
					ret.push(p);
				}
			}
			
			return ret;
		};
	}
});