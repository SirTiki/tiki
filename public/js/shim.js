// The sole purpose of this define is to bootstrap the define('define') call
(function() {
	var dQueue = (window.define && window.define.q) || [];
	
	window.define = function define(name, deps, ctor) {
		var args = Array.prototype.slice.call(arguments);
		args.push(define.version);
		define.q.push(args);
		if (name === 'define' || name === 'tiki.define') {
			console.debug('defining define');
			var rQueue = (window.require && window.require.q) || [];
			
			ctor = deps;
			deps = null;

			var ret = ctor();
			window.define = ret.define;
			window.require = ret.require;
			
			for (var i=0,l=dQueue.length; i<l; ++i) {
				window.define.version = dQueue[i].pop();
				window.define.apply(null, dQueue[i]);
			}

			for (i=0,l=rQueue.length; i<l; ++i) {
				window.require.apply(null, rQueue[i]);
			}
		}
	};
	window.define.q = dQueue;
	window.define.amd = true;
	
	if (typeof window.require === 'undefined') {
		window.require = function require(paths, cb) {
			require.q.push(arguments);
		};
		window.require.q = [];
	}
})();

//@ sourceURL=shim.js