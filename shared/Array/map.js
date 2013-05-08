define('Array.map', function() {
	if (!Array.prototype.map) {
		Array.prototype.map = function(fun /*, thisArg */) {
			"use strict";

			if (this == null)
				throw new TypeError('can not convert ' + this + ' to object');

			var t = Object(this);
			var len = t.length >>> 0;
			if (typeof fun != 'function')
				throw new TypeError(fun + ' is not callable');
			
			var result = new Array(len);
			var thisArg = arguments[1];
			for (var i = 0; i < len; i++) {
				if (i in t)
					result[i] = fun.call(thisArg, t[i], i, t);
			}

			return result;
		};
	}
});