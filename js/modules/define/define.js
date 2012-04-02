// define can never have any dependencies since it is the root module
define('tiki.define', function() {
	var undefined

	console.debug('tiki.define ctor');
	
	function define(name, deps, ctor) {
		console.debug('define('+name+')'/*, deps, ctor*/);
		
		var version, dependencies = null;
		switch (arguments.length) {
		case 0:
			return;
			break;
		case 1:
			// add default name to filename support
			throw new Error('define::define - name required');
			break;
		case 2:
			if (typeof name !== 'string') {
				// add default name to filename support
				throw new Error('define::define - invalid name');
				dependencies = Object.prototype.toString.call(arguments[0]) === "[object Array]" ? arguments[0] : null;
			}
			break;
		default:
			dependencies = Object.prototype.toString.call(arguments[1]) === "[object Array]" ? arguments[1] : null;
			if (typeof name !== 'string') {
				// add default name to filename support
				throw new Error('define::define - invalid name');
			}
		}
		
		if (define.version) {
			version = define.version;
			define.version = undefined;
		} else {
			name = name.split('@');
			version = name[1] || '';
			name = name[0];
		}
debugger;
		defined[name] = defined[name] || {};
		defined[name][version] = {
			ctor: arguments[arguments.length - 1]
		};
		
		if (deps) {
			defined[name][version].deps = dependencies;
		}
		console.debug('require-ready (cached): '+name+'@'+version,/*defined[name].ctor,*/'Dependencies ready: ',defined[name][version].deps);
		
		if (queue[name]) {
			for (var i=0, l=queue[name].length; i<l; ++i) {
				require.apply(null, queue[name][i]);
			}
		}
	}
	
	function require(name, cb, module) {
		var version, key;

		if (name.indexOf('@') !== -1) {
			name = name.split('@');
			version = name[1] || '';
			name = name[0];
		} else {
			version = Object.keys(defined[name]).sort(function(a,b) {return a<b;})[0];
		}

		key = name+'@'+version

		console.debug('require('+key+') - ' + (defined[name][version] ? 'defined' : ' NOT defined'));
		
		if (!cache[key]) {
			var def = defined[name][version];
			if (!def) {
				queue[key] = queue[key] || [];
				queue[key].push(arguments);
				return;
			}
			
			if (typeof def.ctor !== 'function') {
				console.debug('No construction required: ', def.ctor);
				return def.ctor;
			}
			
			var args = [],
				specials = {
					require: require,
					exports: {},
					module: {
						id: name,
						parent: arguments.callee.caller && arguments.callee.caller.arguments[2],
						filename: 'https://'+window.location.host+'/module/'+name,
						loaded: false,
						children: []
					}
					/*
					{ id: '[[name]]',
					  exports: {},
					  parent: [[module from which loaded]]
					  filename: '[[url? can we know when it's entered directly from a browser?]]',
					  loaded: [[has completed synchronous require]],
					  children: [[modules loaded from within]],
					  paths: [[when relative ids are allowed]]
					}
					*/
				},
				deps = def.deps || ["require", "exports", "module"];
			
			for (var i=0,l=deps.length; i<l; ++i) {
				if (specials.hasOwnProperty(deps[i])) {
					args[i] = specials[deps[i]];
				} else {
					args[i] = require(deps[i]);
				}
			}
			
			console.debug('Constructing: ',key);
			// Run AMD callback, assign as return value or exports object
			cache[key] = def.ctor.apply(null, args) || specials.exports;
			specials.module.loaded = true;
			console.debug('Constructed: ',key);
		}
		
		if (typeof cb === 'function') {
			cb(cache[key]);
		}
		return cache[key];
	}
	
	var cache = {}, defined = {}, queue = [],
		ret = {
			define: define,
			require: require
		};
	
	define.require = require;
	define.amd = true;
	define.defined = defined;
	
	defined.define = {
		deps: [], // not sure how to get this automatically
		ctor: arguments.callee
	};
	cache.define = ret;
	
	return ret;
});
