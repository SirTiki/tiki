define('setImmediate', function() {
	if (!window.setImmediate) {
	  window.setImmediate = function(func, args){return window.setTimeout(func, 0, args);};
	  window.clearImmediate = window.clearTimeout;
	}
	return window.setImmediate;
});