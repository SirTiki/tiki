define('Array.forEach', function() {
	if (!Array.prototype.forEach) {
		Array.prototype.forEach = function(fun /*, thisArg */) {
			"use strict";
	
			if (this == null)
				throw new TypeError('can not convert ' + this + ' to object');
	
			var t = Object(this);
			var len = t.length >>> 0;
			if (typeof fun != 'function')
				throw new TypeError(fun + ' is not callable');
	
			var thisArg = arguments[1];
			for (var i = 0; i < len; i++) {
				if (i in t)
					fun.call(thisArg, t[i], i, t);
			}
		};
	}
});